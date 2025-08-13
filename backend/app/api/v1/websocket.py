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
async def websocket_conversation(websocket: WebSocket, thread_id: str):
    """
    WebSocket endpoint for real-time conversation streaming.
    """
    client_id = f"thread_{thread_id}"
    await manager.connect(websocket, client_id)
    
    try:
        while True:
            # Receive message from client
            data = await websocket.receive_text()
            message = json.loads(data)
            
            # Process message based on type
            if message.get("type") == "message":
                # TODO: Process user message through agent system
                response = {
                    "type": "agent_response",
                    "content": "This is a placeholder response",
                    "agent": "assistant"
                }
                await websocket.send_text(json.dumps(response))
            
            elif message.get("type") == "ping":
                # Respond to ping
                await websocket.send_text(json.dumps({"type": "pong"}))
            
    except WebSocketDisconnect:
        manager.disconnect(websocket, client_id)
        logger.info(f"WebSocket disconnected for thread {thread_id}")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        manager.disconnect(websocket, client_id)


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