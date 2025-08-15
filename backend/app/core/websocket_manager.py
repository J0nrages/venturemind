"""
WebSocket Connection Manager for multi-agent orchestration
"""
from typing import Dict, Set, Optional, Any
from fastapi import WebSocket, WebSocketDisconnect
import json
import asyncio
from datetime import datetime, timedelta
import uuid
from enum import Enum
import logging

logger = logging.getLogger(__name__)

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
        
        # Prefetch analysis cache
        self.prefetch_cache: Dict[str, Dict[str, Any]] = {}

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
    
    async def handle_message(self, connection_id: str, message: Dict[str, Any]):
        """
        Handle incoming WebSocket messages with prefetch analysis support.
        """
        message_type = message.get('type')
        
        if message_type == 'analyze_for_prefetch':
            await self.handle_analyze_for_prefetch(connection_id, message)
        elif message_type == 'conversation_message':
            await self.handle_conversation_message(connection_id, message)
        # Add other message type handlers as needed
    
    async def handle_analyze_for_prefetch(self, connection_id: str, message_data: Dict[str, Any]):
        """
        Handle prefetch analysis requests from frontend listeners.
        """
        try:
            agent_id = message_data.get('agent_id')
            content = message_data.get('content', {})
            message_text = content.get('message', '')
            context_id = content.get('context_id')
            
            if not agent_id or not message_text:
                return
            
            # Get agent from existing registry (placeholder - would use actual agent registry)
            # agent = get_registry().get_agent_instance(agent_id)
            
            # For now, simulate agent analysis
            await self._run_prefetch_analysis_simulation(connection_id, agent_id, message_text, context_id)
            
        except Exception as e:
            logger.error(f"Prefetch analysis failed: {e}")
    
    async def _run_prefetch_analysis_simulation(self, connection_id: str, agent_id: str, message_text: str, context_id: str):
        """
        Simulate agent analysis and trigger prefetch if needed.
        In production, this would execute actual agent analysis.
        """
        try:
            # Simulate analysis based on message content
            confidence = 0.0
            actions = []
            
            # Simple keyword-based analysis for different agent types
            message_lower = message_text.lower()
            
            if agent_id == 'planner':
                if any(word in message_lower for word in ['plan', 'timeline', 'roadmap', 'schedule', 'milestone']):
                    confidence = 0.8
                    actions = ['fetch_project_templates', 'fetch_planning_tools']
            elif agent_id == 'researcher':
                if any(word in message_lower for word in ['research', 'market', 'competitor', 'analyze', 'study']):
                    confidence = 0.75
                    actions = ['fetch_market_data', 'fetch_research_templates']
            elif agent_id == 'analyst':
                if any(word in message_lower for word in ['metrics', 'performance', 'data', 'analytics', 'dashboard']):
                    confidence = 0.7
                    actions = ['fetch_metrics', 'fetch_analysis_tools']
            
            # Only proceed if confidence is high enough
            if confidence > 0.6:
                prefetch_data = await self._execute_prefetch_actions(agent_id, actions, context_id)
                
                # Send results back to frontend
                await self.send_to_connection(connection_id, {
                    "type": "agent:prefetch_complete",
                    "agent_id": agent_id,
                    "context_id": context_id,
                    "confidence": confidence,
                    "actions": actions,
                    "data": prefetch_data,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
        except Exception as e:
            logger.error(f"Prefetch analysis failed for {agent_id}: {e}")
    
    async def _execute_prefetch_actions(self, agent_id: str, actions: list, context_id: str) -> Dict[str, Any]:
        """
        Execute specific prefetch actions based on agent type.
        """
        prefetch_data = {}
        
        for action in actions:
            if action == 'fetch_project_templates' and agent_id == 'planner':
                # Simulate fetching planning templates
                prefetch_data['templates'] = [
                    {'name': 'Sprint Planning', 'type': 'agile'},
                    {'name': 'Product Roadmap', 'type': 'strategic'},
                    {'name': 'Feature Planning', 'type': 'development'}
                ]
            elif action == 'fetch_market_data' and agent_id == 'researcher':
                # Simulate fetching market research data
                prefetch_data['market_data'] = {
                    'trends': ['AI adoption increasing', 'Remote work stabilizing'],
                    'competitors': ['Company A', 'Company B'],
                    'opportunities': ['Market gap in mobile solutions']
                }
            elif action == 'fetch_metrics' and agent_id == 'analyst':
                # Simulate fetching analytics data
                prefetch_data['metrics'] = {
                    'performance': {'cpu': '45%', 'memory': '67%'},
                    'business': {'revenue': '$125k', 'growth': '12%'},
                    'user': {'active_users': 1250, 'retention': '85%'}
                }
        
        # Cache prefetched data
        cache_key = f"{agent_id}_{context_id}"
        self.prefetch_cache[cache_key] = {
            'data': prefetch_data,
            'timestamp': datetime.utcnow(),
            'expires_at': datetime.utcnow() + timedelta(minutes=30)
        }
        
        return prefetch_data
    
    def get_prefetch_data(self, agent_id: str, context_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached prefetch data for agent workstream spawning.
        """
        cache_key = f"{agent_id}_{context_id}"
        cached = self.prefetch_cache.get(cache_key)
        
        if cached and cached['expires_at'] > datetime.utcnow():
            return cached['data']
        elif cached:
            # Remove expired cache
            del self.prefetch_cache[cache_key]
        
        return None
    
    async def handle_conversation_message(self, connection_id: str, message: Dict[str, Any]):
        """
        Handle conversation messages and route to appropriate handlers.
        """
        # Broadcast to session participants
        connection = self._connections.get(connection_id)
        if connection:
            await self.broadcast_to_session(
                connection.session_id,
                {
                    "type": "conversation_message",
                    "content": message.get('content'),
                    "contextId": message.get('contextId'),
                    "sender": connection.user_id,
                    "timestamp": datetime.utcnow().isoformat()
                },
                exclude_connection=connection_id
            )

# Global instance
websocket_manager = WebSocketManager()

def get_websocket_manager() -> WebSocketManager:
    """Get the global WebSocket manager instance."""
    return websocket_manager