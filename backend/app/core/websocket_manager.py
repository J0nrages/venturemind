"""
WebSocket Connection Manager for multi-agent orchestration
"""
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from datetime import datetime
import uuid
from enum import Enum

class ConnectionType(Enum):
    USER = "user"
    AGENT = "agent"
    OBSERVER = "observer"

class WebSocketConnection:
    def __init__(
        self,
        websocket: WebSocket,
        connection_id: str,
        session_id: str,
        connection_type: ConnectionType,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None
    ):
        self.websocket = websocket
        self.connection_id = connection_id
        self.session_id = session_id
        self.connection_type = connection_type
        self.user_id = user_id
        self.agent_id = agent_id
        self.connected_at = datetime.utcnow()
        self.last_ping = datetime.utcnow()
        self.metadata: Dict[str, Any] = {}

class WebSocketManager:
    """
    Manages WebSocket connections for multi-agent orchestration.
    Handles user connections, agent connections, and inter-agent communication.
    """
    
    def __init__(self):
        # Connection pools
        self._connections: Dict[str, WebSocketConnection] = {}
        self._sessions: Dict[str, Set[str]] = {}  # session_id -> connection_ids
        self._user_connections: Dict[str, Set[str]] = {}  # user_id -> connection_ids
        self._agent_connections: Dict[str, str] = {}  # agent_id -> connection_id
        
        # Message queues for paused agents
        self._message_queues: Dict[str, asyncio.Queue] = {}
        
        # Agent states
        self._agent_states: Dict[str, Dict[str, Any]] = {}
        
        # Document locks for collaborative editing
        self._document_locks: Dict[str, str] = {}  # document_id -> user_id
        
        # Background tasks
        self._background_tasks: Set[asyncio.Task] = set()

    async def connect(
        self,
        websocket: WebSocket,
        session_id: str,
        connection_type: ConnectionType,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None
    ) -> str:
        """
        Register a new WebSocket connection.
        """
        await websocket.accept()
        
        connection_id = str(uuid.uuid4())
        connection = WebSocketConnection(
            websocket=websocket,
            connection_id=connection_id,
            session_id=session_id,
            connection_type=connection_type,
            user_id=user_id,
            agent_id=agent_id
        )
        
        # Store connection
        self._connections[connection_id] = connection
        
        # Add to session
        if session_id not in self._sessions:
            self._sessions[session_id] = set()
        self._sessions[session_id].add(connection_id)
        
        # Track by user
        if user_id:
            if user_id not in self._user_connections:
                self._user_connections[user_id] = set()
            self._user_connections[user_id].add(connection_id)
        
        # Track agent connections
        if agent_id:
            self._agent_connections[agent_id] = connection_id
            self._agent_states[agent_id] = {
                "status": "connected",
                "paused": False,
                "current_task": None
            }
        
        # Notify session participants
        await self.broadcast_to_session(
            session_id,
            {
                "type": "connection_joined",
                "connection_type": connection_type.value,
                "user_id": user_id,
                "agent_id": agent_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_connection=connection_id
        )
        
        # Start heartbeat
        task = asyncio.create_task(self._heartbeat(connection_id))
        self._background_tasks.add(task)
        task.add_done_callback(self._background_tasks.discard)
        
        return connection_id

    async def disconnect(self, connection_id: str):
        """
        Handle WebSocket disconnection.
        """
        if connection_id not in self._connections:
            return
        
        connection = self._connections[connection_id]
        
        # Clean up session
        if connection.session_id in self._sessions:
            self._sessions[connection.session_id].discard(connection_id)
            if not self._sessions[connection.session_id]:
                del self._sessions[connection.session_id]
        
        # Clean up user connections
        if connection.user_id and connection.user_id in self._user_connections:
            self._user_connections[connection.user_id].discard(connection_id)
            if not self._user_connections[connection.user_id]:
                del self._user_connections[connection.user_id]
        
        # Clean up agent connections
        if connection.agent_id:
            if connection.agent_id in self._agent_connections:
                del self._agent_connections[connection.agent_id]
            if connection.agent_id in self._agent_states:
                self._agent_states[connection.agent_id]["status"] = "disconnected"
        
        # Release document locks
        for doc_id, user_id in list(self._document_locks.items()):
            if user_id == connection.user_id:
                del self._document_locks[doc_id]
        
        # Notify session participants
        await self.broadcast_to_session(
            connection.session_id,
            {
                "type": "connection_left",
                "connection_type": connection.connection_type.value,
                "user_id": connection.user_id,
                "agent_id": connection.agent_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_connection=connection_id
        )
        
        # Remove connection
        del self._connections[connection_id]

    async def send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """
        Send message to specific connection.
        """
        if connection_id not in self._connections:
            return False
        
        connection = self._connections[connection_id]
        try:
            await connection.websocket.send_json(message)
            return True
        except Exception as e:
            print(f"Error sending to connection {connection_id}: {e}")
            await self.disconnect(connection_id)
            return False

    async def broadcast_to_session(
        self,
        session_id: str,
        message: Dict[str, Any],
        exclude_connection: Optional[str] = None
    ):
        """
        Broadcast message to all connections in a session.
        """
        if session_id not in self._sessions:
            return
        
        # Send to all connections in parallel
        tasks = []
        for conn_id in self._sessions[session_id]:
            if conn_id != exclude_connection:
                tasks.append(self.send_to_connection(conn_id, message))
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)

    async def send_to_agent(self, agent_id: str, message: Dict[str, Any]):
        """
        Send message to specific agent.
        """
        if agent_id not in self._agent_connections:
            # Queue message if agent is not connected
            if agent_id not in self._message_queues:
                self._message_queues[agent_id] = asyncio.Queue()
            await self._message_queues[agent_id].put(message)
            return False
        
        connection_id = self._agent_connections[agent_id]
        
        # Check if agent is paused
        if self._agent_states.get(agent_id, {}).get("paused"):
            if agent_id not in self._message_queues:
                self._message_queues[agent_id] = asyncio.Queue()
            await self._message_queues[agent_id].put(message)
            return True
        
        return await self.send_to_connection(connection_id, message)

    async def pause_agent(self, agent_id: str):
        """
        Pause an agent's message processing.
        """
        if agent_id in self._agent_states:
            self._agent_states[agent_id]["paused"] = True
            
            # Notify agent
            await self.send_to_agent(agent_id, {
                "type": "control",
                "action": "pause",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            return True
        return False

    async def resume_agent(self, agent_id: str):
        """
        Resume an agent's message processing.
        """
        if agent_id in self._agent_states:
            self._agent_states[agent_id]["paused"] = False
            
            # Send queued messages
            if agent_id in self._message_queues:
                queue = self._message_queues[agent_id]
                while not queue.empty():
                    message = await queue.get()
                    await self.send_to_agent(agent_id, message)
            
            # Notify agent
            await self.send_to_agent(agent_id, {
                "type": "control",
                "action": "resume",
                "timestamp": datetime.utcnow().isoformat()
            })
            
            return True
        return False

    async def acquire_document_lock(self, document_id: str, user_id: str) -> bool:
        """
        Acquire lock for document editing.
        """
        if document_id in self._document_locks:
            return self._document_locks[document_id] == user_id
        
        self._document_locks[document_id] = user_id
        return True

    async def release_document_lock(self, document_id: str, user_id: str) -> bool:
        """
        Release document lock.
        """
        if document_id in self._document_locks and self._document_locks[document_id] == user_id:
            del self._document_locks[document_id]
            return True
        return False

    async def route_agent_message(
        self,
        from_agent: str,
        to_agent: str,
        message: Dict[str, Any]
    ):
        """
        Route message between agents.
        """
        enriched_message = {
            **message,
            "from_agent": from_agent,
            "to_agent": to_agent,
            "routed_at": datetime.utcnow().isoformat()
        }
        
        await self.send_to_agent(to_agent, enriched_message)

    async def _heartbeat(self, connection_id: str):
        """
        Send periodic heartbeat to keep connection alive.
        """
        while connection_id in self._connections:
            try:
                await asyncio.sleep(30)  # Ping every 30 seconds
                await self.send_to_connection(connection_id, {
                    "type": "ping",
                    "timestamp": datetime.utcnow().isoformat()
                })
            except:
                break

    def get_session_info(self, session_id: str) -> Dict[str, Any]:
        """
        Get information about a session.
        """
        if session_id not in self._sessions:
            return {"active": False}
        
        connections = []
        for conn_id in self._sessions[session_id]:
            if conn_id in self._connections:
                conn = self._connections[conn_id]
                connections.append({
                    "connection_id": conn_id,
                    "type": conn.connection_type.value,
                    "user_id": conn.user_id,
                    "agent_id": conn.agent_id,
                    "connected_at": conn.connected_at.isoformat()
                })
        
        return {
            "active": True,
            "connections": connections,
            "agent_states": {
                agent_id: state
                for agent_id, state in self._agent_states.items()
                if any(
                    self._connections.get(conn_id, None) and 
                    self._connections[conn_id].session_id == session_id
                    for conn_id in [self._agent_connections.get(agent_id)]
                    if conn_id
                )
            }
        }

# Global instance
websocket_manager = WebSocketManager()