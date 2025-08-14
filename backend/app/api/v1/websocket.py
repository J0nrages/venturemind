"""
WebSocket endpoints for real-time communication.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import Dict, Set
import json
import logging

logger = logging.getLogger(__name__)

websocket_router = APIRouter()

# Connection manager for WebSocket clients
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, client_id: str):
        await websocket.accept()
        if client_id not in self.active_connections:
            self.active_connections[client_id] = set()
        self.active_connections[client_id].add(websocket)
        logger.info(f"Client {client_id} connected")
    
    def disconnect(self, websocket: WebSocket, client_id: str):
        if client_id in self.active_connections:
            self.active_connections[client_id].discard(websocket)
            if not self.active_connections[client_id]:
                del self.active_connections[client_id]
        logger.info(f"Client {client_id} disconnected")
    
    async def send_personal_message(self, message: str, client_id: str):
        if client_id in self.active_connections:
            for connection in self.active_connections[client_id]:
                await connection.send_text(message)
    
    async def broadcast(self, message: str):
        for connections in self.active_connections.values():
            for connection in connections:
                await connection.send_text(message)


manager = ConnectionManager()


@websocket_router.websocket("/conversation/{thread_id}")
async def websocket_conversation(websocket: WebSocket, thread_id: str, token: str = None):
    """
    WebSocket endpoint for real-time conversation streaming.
    """
    client_id = f"thread_{thread_id}"
    
    try:
        await manager.connect(websocket, client_id)
        logger.info(f"✅ WebSocket connected for thread {thread_id}")
        
        # Send welcome message
        await websocket.send_text(json.dumps({
            "type": "connection_established",
            "payload": {"thread_id": thread_id, "client_id": client_id},
            "timestamp": "2025-01-01T00:00:00Z"
        }))
        
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            
            try:
                message = json.loads(data)
                logger.info(f"📨 WebSocket message received: {message.get('type')} from thread {thread_id}")
                
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
                    # TODO: Process user message through agent system
                    response = {
                        "type": "agent_response",
                        "content": "WebSocket message received and processed",
                        "agent": "assistant",
                        "timestamp": "2025-01-01T00:00:00Z"
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
        logger.info(f"🔌 WebSocket disconnected for thread {thread_id}")
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}")
        manager.disconnect(websocket, client_id)
        try:
            await websocket.close(code=1011, reason=f"Server error: {str(e)}")
        except:
            pass


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