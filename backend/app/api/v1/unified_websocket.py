"""
Unified WebSocket endpoint for all real-time communication
Handles conversation, agent, document, and system channels
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, Optional, Any
import json
import jwt
import logging
import asyncio
from datetime import datetime
from enum import Enum

from app.core.auth import User
from app.core.websocket_manager import websocket_manager, ConnectionType

logger = logging.getLogger(__name__)

class ChannelType(str, Enum):
    CONVERSATION = "conversation"
    AGENT = "agent" 
    DOCUMENT = "document"
    SYSTEM = "system"
    PREFETCH = "prefetch"

unified_router = APIRouter()

class UnifiedConnectionManager:
    """
    Manages unified WebSocket connections with channel-based routing
    """
    
    def __init__(self):
        # Track connections and their subscriptions
        self.connections: Dict[str, WebSocket] = {}
        self.subscriptions: Dict[str, Set[str]] = {}  # connection_id -> set of channels
        self.authenticated_users: Dict[str, User] = {}
        self.context_connections: Dict[str, Set[str]] = {}  # context_id -> connection_ids
        
    async def connect(self, websocket: WebSocket, session_id: str, user: Optional[User] = None):
        """Accept and register WebSocket connection"""
        await websocket.accept()
        
        connection_id = f"unified_{session_id}"
        self.connections[connection_id] = websocket
        self.subscriptions[connection_id] = set()
        
        if user:
            self.authenticated_users[connection_id] = user
            logger.info(f"✅ Authenticated connection: {connection_id} (user: {user.email})")
        else:
            logger.info(f"👤 Anonymous connection: {connection_id}")
            
        return connection_id
    
    async def disconnect(self, connection_id: str):
        """Clean up connection"""
        if connection_id in self.connections:
            del self.connections[connection_id]
        
        if connection_id in self.subscriptions:
            del self.subscriptions[connection_id]
            
        if connection_id in self.authenticated_users:
            del self.authenticated_users[connection_id]
            
        # Remove from context connections
        for context_id, conn_ids in list(self.context_connections.items()):
            conn_ids.discard(connection_id)
            if not conn_ids:
                del self.context_connections[context_id]
                
        logger.info(f"🔌 Disconnected: {connection_id}")
    
    async def subscribe(self, connection_id: str, channel: str, context_id: Optional[str] = None):
        """Subscribe connection to a channel"""
        if connection_id in self.subscriptions:
            channel_key = f"{channel}:{context_id}" if context_id else channel
            self.subscriptions[connection_id].add(channel_key)
            
            # Track context connections
            if context_id:
                if context_id not in self.context_connections:
                    self.context_connections[context_id] = set()
                self.context_connections[context_id].add(connection_id)
                
            logger.info(f"📡 {connection_id} subscribed to {channel_key}")
    
    async def unsubscribe(self, connection_id: str, channel: str, context_id: Optional[str] = None):
        """Unsubscribe connection from a channel"""
        if connection_id in self.subscriptions:
            channel_key = f"{channel}:{context_id}" if context_id else channel
            self.subscriptions[connection_id].discard(channel_key)
            
            # Clean up context connections
            if context_id and context_id in self.context_connections:
                self.context_connections[context_id].discard(connection_id)
                if not self.context_connections[context_id]:
                    del self.context_connections[context_id]
                    
            logger.info(f"📡 {connection_id} unsubscribed from {channel_key}")
    
    async def send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """Send message to specific connection"""
        if connection_id in self.connections:
            try:
                await self.connections[connection_id].send_json(message)
                return True
            except Exception as e:
                logger.error(f"Failed to send to {connection_id}: {e}")
                await self.disconnect(connection_id)
        return False
    
    async def broadcast_to_channel(
        self, 
        channel: str, 
        message: Dict[str, Any],
        context_id: Optional[str] = None,
        exclude_connection: Optional[str] = None
    ):
        """Broadcast message to all connections subscribed to a channel"""
        channel_key = f"{channel}:{context_id}" if context_id else channel
        
        tasks = []
        for conn_id, channels in self.subscriptions.items():
            if conn_id != exclude_connection and channel_key in channels:
                tasks.append(self.send_to_connection(conn_id, message))
                
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def broadcast_to_context(
        self,
        context_id: str,
        message: Dict[str, Any],
        exclude_connection: Optional[str] = None
    ):
        """Broadcast message to all connections in a context"""
        if context_id in self.context_connections:
            tasks = []
            for conn_id in self.context_connections[context_id]:
                if conn_id != exclude_connection:
                    tasks.append(self.send_to_connection(conn_id, message))
                    
            if tasks:
                await asyncio.gather(*tasks, return_exceptions=True)
    
    def get_user(self, connection_id: str) -> Optional[User]:
        """Get authenticated user for connection"""
        return self.authenticated_users.get(connection_id)

# Global manager instance
unified_manager = UnifiedConnectionManager()

async def validate_token(token: str) -> Optional[User]:
    """Validate JWT token for WebSocket connections - supports Supabase tokens"""
    if not token or token == "anonymous":
        return None
    
    try:
        # For Supabase tokens, we need to decode without verification
        # since we don't have the Supabase JWT secret in the backend
        # In production, you'd validate against Supabase's public key
        
        # Decode without verification for development
        # WARNING: This is insecure and should only be used in development
        decoded = jwt.decode(token, options={"verify_signature": False})
        
        # Extract user info from Supabase token
        user_id = decoded.get("sub")  # Supabase uses 'sub' for user ID
        email = decoded.get("email")
        
        if not user_id:
            logger.warning("No user ID in token")
            return None
        
        user = User(
            id=user_id,
            email=email or "unknown@example.com",
            is_active=True
        )
        logger.info(f"Token validated for user: {user.email}")
        return user
    except Exception as e:
        logger.warning(f"Token validation failed: {e}")
        return None

@unified_router.websocket("/unified/{session_id}")
async def unified_websocket(websocket: WebSocket, session_id: str):
    """
    Unified WebSocket endpoint for all real-time communication
    Supports multiple channels: conversation, agent, document, system, prefetch
    """
    logger.info(f"🔌 Unified WebSocket connection attempt: {session_id}")
    
    # Validate authentication (read token from query params for WebSocket compatibility)
    authenticated_user = None
    try:
        query_params = dict(websocket.query_params)
        token = query_params.get("token")
    except Exception:
        token = None
    
    if token:
        authenticated_user = await validate_token(token)
    
    # Accept connection
    connection_id = await unified_manager.connect(websocket, session_id, authenticated_user)
    
    try:
        # Send welcome message
        await websocket.send_json({
            "id": session_id,
            "channel": "system",
            "type": "connection_established",
            "payload": {
                "session_id": session_id,
                "authenticated": authenticated_user is not None,
                "user": {
                    "id": authenticated_user.id,
                    "email": authenticated_user.email
                } if authenticated_user else None
            },
            "timestamp": datetime.now().isoformat()
        })
        
        # Message processing loop
        while True:
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                await handle_message(connection_id, message, unified_manager)
                
            except json.JSONDecodeError as e:
                await websocket.send_json({
                    "id": "error",
                    "channel": "system",
                    "type": "error",
                    "payload": {"message": "Invalid JSON format"},
                    "timestamp": datetime.now().isoformat()
                })
                
    except WebSocketDisconnect:
        await unified_manager.disconnect(connection_id)
        logger.info(f"🔌 WebSocket disconnected: {session_id}")
        
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        await unified_manager.disconnect(connection_id)
        try:
            await websocket.close(code=1011, reason=str(e))
        except:
            pass

async def handle_message(connection_id: str, message: Dict[str, Any], manager: UnifiedConnectionManager):
    """Route messages based on channel and type"""
    channel = message.get("channel")
    msg_type = message.get("type")
    payload = message.get("payload", {})
    context_id = message.get("contextId")
    
    logger.info(f"📨 Message: {msg_type} on {channel} (context: {context_id})")
    
    # System channel handlers
    if channel == "system":
        if msg_type == "ping":
            await manager.send_to_connection(connection_id, {
                "id": message.get("id"),
                "channel": "system",
                "type": "pong",
                "payload": {},
                "timestamp": datetime.now().isoformat()
            })
            
        elif msg_type == "subscribe":
            sub_channel = payload.get("channel")
            sub_context = payload.get("contextId")
            await manager.subscribe(connection_id, sub_channel, sub_context)
            # Acknowledge to avoid frontend retries
            await manager.send_to_connection(connection_id, {
                "id": message.get("id"),
                "channel": "system",
                "type": "subscribed",
                "payload": {"channel": sub_channel, "contextId": sub_context},
                "timestamp": datetime.now().isoformat()
            })
            
        elif msg_type == "unsubscribe":
            unsub_channel = payload.get("channel")
            unsub_context = payload.get("contextId")
            await manager.unsubscribe(connection_id, unsub_channel, unsub_context)
            await manager.send_to_connection(connection_id, {
                "id": message.get("id"),
                "channel": "system",
                "type": "unsubscribed",
                "payload": {"channel": unsub_channel, "contextId": unsub_context},
                "timestamp": datetime.now().isoformat()
            })
            
        elif msg_type == "authenticate":
            # Already handled during connection
            await manager.send_to_connection(connection_id, {
                "id": message.get("id"),
                "channel": "system",
                "type": "authenticated",
                "payload": {"status": "success"},
                "timestamp": datetime.now().isoformat()
            })
    
    # Conversation channel handlers
    elif channel == "conversation":
        if msg_type == "user_message":
            # Get user context
            user = manager.get_user(connection_id)
            
            # Process with agent system (placeholder)
            response_content = f"Received: {payload.get('content', '')}"
            
            # Send AI response
            # Ensure context_id present; if missing, fallback to broadcast to the connection
            target_message = {
                "id": message.get("id"),
                "channel": "conversation",
                "type": "ai_message",
                "payload": {
                    "content": response_content,
                    "sender": "assistant"
                },
                "contextId": context_id,
                "timestamp": datetime.now().isoformat()
            }
            if context_id:
                await manager.broadcast_to_context(context_id, target_message)
            else:
                await manager.send_to_connection(connection_id, target_message)
    
    # Agent channel handlers
    elif channel == "agent":
        agent_id = message.get("agentId")
        
        if msg_type == "agent_pause":
            # Delegate to websocket_manager for agent control
            await websocket_manager.pause_agent(agent_id)
            
        elif msg_type == "agent_resume":
            await websocket_manager.resume_agent(agent_id)
            
        # Broadcast agent status to context
        await manager.broadcast_to_context(context_id, {
            "id": message.get("id"),
            "channel": "agent",
            "type": msg_type,
            "payload": payload,
            "agentId": agent_id,
            "contextId": context_id,
            "timestamp": datetime.now().isoformat()
        })
    
    # Document channel handlers
    elif channel == "document":
        if msg_type == "document_edit":
            # Broadcast to all users in the same document context
            await manager.broadcast_to_context(
                context_id,
                message,
                exclude_connection=connection_id
            )
    
    # Prefetch channel handlers
    elif channel == "prefetch":
        if msg_type == "analyze_for_prefetch":
            # Delegate to websocket_manager for prefetch analysis
            await websocket_manager.handle_analyze_for_prefetch(connection_id, message)
    
    else:
        logger.warning(f"Unknown channel: {channel}")