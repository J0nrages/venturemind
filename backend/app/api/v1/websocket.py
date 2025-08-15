"""
WebSocket endpoints for real-time communication.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set, Optional
import json
import logging
from datetime import datetime

from app.core.auth import decode_token, User

logger = logging.getLogger(__name__)

websocket_router = APIRouter()

# Connection manager for WebSocket clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
        self.authenticated_users: Dict[str, User] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str, user: Optional[User] = None):
        logger.info(f"🔗 [websocket.py:24] ConnectionManager.connect() called for client: {client_id}")
        try:
            logger.info(f"🔗 [websocket.py:26] Attempting websocket.accept() for client: {client_id}")
            await websocket.accept()
            logger.info(f"✅ [websocket.py:28] WebSocket accepted successfully for client: {client_id}")
            
            if client_id not in self.active_connections:
                self.active_connections[client_id] = set()
            self.active_connections[client_id].add(websocket)
            
            if user:
                self.authenticated_users[client_id] = user
                logger.info(f"✅ [websocket.py:35] Authenticated client {client_id} (user: {user.email}) connected")
            else:
                logger.info(f"✅ [websocket.py:37] Anonymous client {client_id} connected")
                
        except Exception as e:
            logger.error(f"❌ [websocket.py:40] ConnectionManager.connect() failed for client {client_id}")
            logger.error(f"❌ [websocket.py:41] Error type: {type(e).__name__}")
            logger.error(f"❌ [websocket.py:42] Error message: {str(e)}")
            import traceback
            logger.error(f"❌ [websocket.py:44] Full traceback:\n{traceback.format_exc()}")
            raise
    
    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        
        if client_id in self.authenticated_users:
            del self.authenticated_users[client_id]
        
        logger.info(f"Client {client_id} disconnected")
    
    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                await connection.send_text(message)
    
    async def broadcast(self, message: str):
        for connections in self.active_connections.values():
            for connection in connections:
                await connection.send_text(message)
    
    def get_user(self, client_id: str) -> Optional[User]:
        return self.authenticated_users.get(client_id)


manager = ConnectionManager()


async def validate_websocket_token(token: str) -> Optional[User]:
    """
    Validate JWT token for WebSocket connections.
    Based on Supabase best practices for WebSocket authentication.
    """
    if not token or token == "anonymous":
        return None
    
    try:
        # Decode and validate the JWT token
        token_data = decode_token(token)
        
        # Create user object from token data
        user = User(
            id=token_data.user_id,
            email=token_data.email or "unknown@example.com",
            is_active=True
        )
        
        logger.info(f"WebSocket JWT validated for user: {user.email}")
        return user
        
    except Exception as e:
        logger.warning(f"WebSocket JWT validation failed: {e}")
        return None


@websocket_router.websocket("/conversation/{session_id}")
async def websocket_conversation(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time conversation streaming.
    Supports optional JWT authentication via query parameter.
    """
    logger.info(f"🔌 [websocket.py:96] WebSocket connection attempt for session: {session_id}")
    client_id = f"session_{session_id}"
    
    try:
        logger.info(f"🔍 [websocket.py:101] Extracting query parameters for session: {session_id}")
        # Extract token from query parameters (Supabase recommended approach)
        query_params = dict(websocket.query_params)
        token = query_params.get("token")
        logger.info(f"🔑 [websocket.py:103] Token received: {'present' if token else 'none'}")
        
        logger.info(f"🔐 [websocket.py:106] Starting authentication validation for session: {session_id}")
        # Validate authentication if token provided
        authenticated_user = None
        if token:
            authenticated_user = await validate_websocket_token(token)
            if authenticated_user:
                logger.info(f"✅ [websocket.py:110] WebSocket authenticated for user: {authenticated_user.email}")
            else:
                logger.warning(f"⚠️ [websocket.py:112] WebSocket authentication failed for session: {session_id}")
        else:
            logger.info(f"👤 [websocket.py:114] WebSocket connecting anonymously for session: {session_id}")
        
        logger.info(f"🔗 [websocket.py:116] Attempting manager.connect() for session: {session_id}")
        await manager.connect(websocket, client_id, authenticated_user)
        logger.info(f"✅ [websocket.py:117] WebSocket connected for session {session_id}")
        
        # Send welcome message with authentication status
        welcome_payload = {
            "session_id": session_id, 
            "client_id": client_id,
            "authenticated": authenticated_user is not None
        }
        
        if authenticated_user:
            welcome_payload["user"] = {
                "id": authenticated_user.id,
                "email": authenticated_user.email
            }
        
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "payload": welcome_payload,
            "timestamp": datetime.now().isoformat()
        }))
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                logger.info(f"📨 WebSocket message received: {message.get('type')} from session {session_id}")
                
                # Process message based on type
                if message.get("type") == "ping":
                    # Respond to heartbeat
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "payload": {},
                        "timestamp": "2025-01-01T00:00:00Z"
                    }))
                
                elif message.get("type") == "join_document":
                    document_id = message.get("payload", {}).get("document_id")
                    logger.info(f"User joining document: {document_id}")
                    
                    # Broadcast user joined
                    await websocket.send_text(json.dumps({
                        "type": "user_joined",
                        "payload": {
                            "user_id": message.get("user_id"),
                            "session_id": message.get("session_id"),
                            "user_info": {"name": "User"}
                        },
                        "timestamp": "2025-01-01T00:00:00Z"
                    }))
                
                elif message.get("type") == "leave_document":
                    document_id = message.get("payload", {}).get("document_id")
                    logger.info(f"User leaving document: {document_id}")
                    
                    # Broadcast user left
                    await websocket.send_text(json.dumps({
                        "type": "user_left",
                        "payload": {
                            "user_id": message.get("user_id"),
                            "session_id": message.get("session_id")
                        },
                        "timestamp": "2025-01-01T00:00:00Z"
                    }))
                
                elif message.get("type") == "message":
                    # Get authenticated user for this connection
                    current_user = manager.get_user(client_id)
                    user_context = {
                        "authenticated": current_user is not None,
                        "user_id": current_user.id if current_user else None,
                        "email": current_user.email if current_user else None
                    }
                    
                    # TODO: Process user message through agent system with user context
                    response = {
                        "type": "agent_response",
                        "content": f"WebSocket message received and processed for {'authenticated' if current_user else 'anonymous'} user",
                        "agent": "assistant",
                        "user_context": user_context,
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send_text(json.dumps(response))
                
                else:
                    logger.info(f"📨 Unhandled WebSocket message type: {message.get('type')}")
                
            except json.JSONDecodeError as e:
                logger.error(f"❌ Invalid JSON received: {e}")
                await websocket.send_text(json.dumps({
                    "type": "error",
                    "payload": {"message": "Invalid JSON format"},
                    "timestamp": "2025-01-01T00:00:00Z"
                }))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
        logger.info(f"🔌 WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket error for session {session_id}: {e}")
        logger.error(f"❌ Error type: {type(e).__name__}")
        logger.error(f"❌ Error details: {str(e)}")
        manager.disconnect(websocket, client_id)
        try:
            await websocket.close(code=1011, reason=f"Server error: {str(e)}")
        except Exception as close_error:
            logger.error(f"❌ Failed to close WebSocket: {close_error}")
            pass


@websocket_router.websocket("/test/{session_id}")
async def websocket_test(websocket: WebSocket, session_id: str):
    """
    Ultra-simple test WebSocket endpoint to debug connection issues.
    """
    logger.info(f"🧪 [websocket.py:234] TEST WebSocket function called for session: {session_id}")
    
    try:
        logger.info(f"🔗 [websocket.py:237] Attempting websocket.accept() for session: {session_id}")
        await websocket.accept()
        logger.info(f"✅ [websocket.py:239] TEST WebSocket connected and accepted for session {session_id}")
        
        logger.info(f"📤 [websocket.py:241] Sending test message for session: {session_id}")
        await websocket.send_text('{"type":"test","message":"Hello WebSocket!"}')
        
        logger.info(f"🔌 [websocket.py:244] Closing WebSocket for session: {session_id}")
        await websocket.close()
        logger.info(f"✅ [websocket.py:246] TEST WebSocket closed successfully for session {session_id}")
        
    except Exception as e:
        logger.error(f"❌ [websocket.py:248] TEST WebSocket failed for session {session_id}")
        logger.error(f"❌ [websocket.py:249] Error type: {type(e).__name__}")
        logger.error(f"❌ [websocket.py:250] Error message: {str(e)}")
        logger.error(f"❌ [websocket.py:251] Error args: {e.args}")
        import traceback
        logger.error(f"❌ [websocket.py:253] Full traceback:\n{traceback.format_exc()}")
        raise


@websocket_router.websocket("/agent/{run_id}")
async def websocket_agent_run(websocket: WebSocket, run_id: str):
    """
    WebSocket endpoint for streaming agent execution updates.
    """
    client_id = f"run_{run_id}"
    await manager.connect(websocket, client_id)
    
    try:
        # TODO: Stream agent execution updates
        await websocket.send_text(json.dumps({
            "type": "status",
            "status": "running",
            "message": "Agent execution started"
        }))
        
        while True:
            data = await websocket.receive_text()
            # Handle client messages if needed
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, client_id)