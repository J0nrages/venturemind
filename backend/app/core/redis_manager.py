"""
Redis state management for WebSocket connections and conversations
"""
import json
import asyncio
from typing import Dict, List, Optional, Any, Set
from datetime import datetime, timedelta
import redis.asyncio as redis
from redis.asyncio.client import PubSub

from app.config import settings


class RedisStateManager:
    """
    Manages conversation state, agent coordination, and pub/sub for scaling WebSocket connections.
    """
    
    def __init__(self):
        self.redis: Optional[redis.Redis] = None
        self.pubsub: Optional[PubSub] = None
        self._subscribers: Dict[str, Set[asyncio.Task]] = {}
        self._connection_pool: Optional[redis.ConnectionPool] = None
        
    async def connect(self):
        """
        Initialize Redis/Valkey connection with connection pooling.
        """
        # Create connection pool for better performance
        # Note: socket_keepalive_options removed for Valkey compatibility
        self._connection_pool = redis.ConnectionPool.from_url(
            settings.redis_url,
            max_connections=settings.redis_max_connections,
            encoding="utf-8",
            decode_responses=True,
            socket_keepalive=settings.redis_socket_keepalive,
        )
        
        self.redis = redis.Redis(connection_pool=self._connection_pool)
        
        # Test connection
        await self.redis.ping()
        
        self.pubsub = self.redis.pubsub()
        
    async def disconnect(self):
        """
        Close Redis connections.
        """
        if self.pubsub:
            await self.pubsub.close()
        if self.redis:
            await self.redis.close()
    
    # Session Management
    async def save_session_state(
        self,
        session_id: str,
        state: Dict[str, Any],
        ttl: int = 3600
    ) -> bool:
        """
        Save session state with TTL.
        """
        try:
            key = f"session:{session_id}"
            await self.redis.setex(
                key,
                ttl,
                json.dumps(state)
            )
            return True
        except Exception as e:
            print(f"Error saving session state: {e}")
            return False
    
    async def get_session_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve session state.
        """
        try:
            key = f"session:{session_id}"
            data = await self.redis.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            print(f"Error getting session state: {e}")
            return None
    
    async def extend_session_ttl(self, session_id: str, ttl: int = 3600) -> bool:
        """
        Extend session TTL.
        """
        key = f"session:{session_id}"
        return await self.redis.expire(key, ttl)
    
    # Conversation Context
    async def save_conversation_context(
        self,
        conversation_id: str,
        context: Dict[str, Any],
        ttl: int = 7200
    ) -> bool:
        """
        Save conversation context for agent coordination.
        """
        try:
            key = f"context:{conversation_id}"
            await self.redis.setex(
                key,
                ttl,
                json.dumps(context)
            )
            
            # Also save to conversation history
            history_key = f"history:{conversation_id}"
            await self.redis.lpush(
                history_key,
                json.dumps({
                    "context": context,
                    "timestamp": datetime.utcnow().isoformat()
                })
            )
            await self.redis.ltrim(history_key, 0, 99)  # Keep last 100 entries
            
            return True
        except Exception as e:
            print(f"Error saving conversation context: {e}")
            return False
    
    async def get_conversation_context(
        self,
        conversation_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Retrieve conversation context.
        """
        try:
            key = f"context:{conversation_id}"
            data = await self.redis.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            print(f"Error getting conversation context: {e}")
            return None
    
    async def get_conversation_history(
        self,
        conversation_id: str,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get conversation history.
        """
        try:
            key = f"history:{conversation_id}"
            history = await self.redis.lrange(key, 0, limit - 1)
            return [json.loads(item) for item in history]
        except Exception as e:
            print(f"Error getting conversation history: {e}")
            return []
    
    # Agent State Management
    async def save_agent_state(
        self,
        agent_id: str,
        state: Dict[str, Any],
        ttl: int = 1800
    ) -> bool:
        """
        Save agent state.
        """
        try:
            key = f"agent:{agent_id}"
            await self.redis.setex(
                key,
                ttl,
                json.dumps(state)
            )
            
            # Track active agents
            await self.redis.sadd("active_agents", agent_id)
            
            return True
        except Exception as e:
            print(f"Error saving agent state: {e}")
            return False
    
    async def get_agent_state(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """
        Get agent state.
        """
        try:
            key = f"agent:{agent_id}"
            data = await self.redis.get(key)
            return json.loads(data) if data else None
        except Exception as e:
            print(f"Error getting agent state: {e}")
            return None
    
    async def get_active_agents(self) -> Set[str]:
        """
        Get list of active agents.
        """
        try:
            return await self.redis.smembers("active_agents")
        except Exception as e:
            print(f"Error getting active agents: {e}")
            return set()
    
    async def remove_agent(self, agent_id: str) -> bool:
        """
        Remove agent from active list.
        """
        try:
            await self.redis.srem("active_agents", agent_id)
            await self.redis.delete(f"agent:{agent_id}")
            return True
        except Exception as e:
            print(f"Error removing agent: {e}")
            return False
    
    # Message Queue for Agents
    async def queue_agent_message(
        self,
        agent_id: str,
        message: Dict[str, Any]
    ) -> bool:
        """
        Queue message for agent.
        """
        try:
            key = f"queue:{agent_id}"
            await self.redis.lpush(
                key,
                json.dumps({
                    **message,
                    "queued_at": datetime.utcnow().isoformat()
                })
            )
            return True
        except Exception as e:
            print(f"Error queuing message: {e}")
            return False
    
    async def get_agent_messages(
        self,
        agent_id: str,
        count: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Get queued messages for agent.
        """
        try:
            key = f"queue:{agent_id}"
            messages = []
            
            for _ in range(count):
                message = await self.redis.rpop(key)
                if message:
                    messages.append(json.loads(message))
                else:
                    break
            
            return messages
        except Exception as e:
            print(f"Error getting agent messages: {e}")
            return []
    
    # Document Locks
    async def acquire_document_lock(
        self,
        document_id: str,
        user_id: str,
        ttl: int = 300
    ) -> bool:
        """
        Acquire document lock with TTL.
        """
        try:
            key = f"lock:doc:{document_id}"
            
            # Try to set lock with NX (only if not exists)
            result = await self.redis.set(
                key,
                user_id,
                nx=True,
                ex=ttl
            )
            
            return bool(result)
        except Exception as e:
            print(f"Error acquiring document lock: {e}")
            return False
    
    async def release_document_lock(
        self,
        document_id: str,
        user_id: str
    ) -> bool:
        """
        Release document lock if owned by user.
        """
        try:
            key = f"lock:doc:{document_id}"
            
            # Check if user owns the lock
            current_owner = await self.redis.get(key)
            if current_owner == user_id:
                await self.redis.delete(key)
                return True
            
            return False
        except Exception as e:
            print(f"Error releasing document lock: {e}")
            return False
    
    async def get_document_lock_owner(
        self,
        document_id: str
    ) -> Optional[str]:
        """
        Get current lock owner.
        """
        try:
            key = f"lock:doc:{document_id}"
            return await self.redis.get(key)
        except Exception as e:
            print(f"Error getting document lock owner: {e}")
            return None
    
    # Pub/Sub for Scaling
    async def publish_to_session(
        self,
        session_id: str,
        message: Dict[str, Any]
    ) -> int:
        """
        Publish message to session channel.
        """
        try:
            channel = f"session:{session_id}"
            return await self.redis.publish(
                channel,
                json.dumps(message)
            )
        except Exception as e:
            print(f"Error publishing to session: {e}")
            return 0
    
    async def subscribe_to_session(
        self,
        session_id: str,
        callback: callable
    ) -> asyncio.Task:
        """
        Subscribe to session channel.
        """
        async def listener():
            try:
                await self.pubsub.subscribe(f"session:{session_id}")
                
                async for message in self.pubsub.listen():
                    if message["type"] == "message":
                        data = json.loads(message["data"])
                        await callback(data)
                        
            except asyncio.CancelledError:
                await self.pubsub.unsubscribe(f"session:{session_id}")
                raise
            except Exception as e:
                print(f"Error in session listener: {e}")
        
        task = asyncio.create_task(listener())
        
        # Track subscriber
        if session_id not in self._subscribers:
            self._subscribers[session_id] = set()
        self._subscribers[session_id].add(task)
        
        return task
    
    async def unsubscribe_from_session(
        self,
        session_id: str,
        task: asyncio.Task
    ):
        """
        Unsubscribe from session channel.
        """
        if session_id in self._subscribers:
            self._subscribers[session_id].discard(task)
            
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
    
    # Metrics and Analytics
    async def increment_metric(
        self,
        metric_name: str,
        value: int = 1
    ) -> int:
        """
        Increment a metric counter.
        """
        try:
            key = f"metric:{metric_name}:{datetime.utcnow().strftime('%Y%m%d')}"
            return await self.redis.incrby(key, value)
        except Exception as e:
            print(f"Error incrementing metric: {e}")
            return 0
    
    async def get_metric(
        self,
        metric_name: str,
        date: Optional[datetime] = None
    ) -> int:
        """
        Get metric value.
        """
        try:
            if date is None:
                date = datetime.utcnow()
            
            key = f"metric:{metric_name}:{date.strftime('%Y%m%d')}"
            value = await self.redis.get(key)
            return int(value) if value else 0
        except Exception as e:
            print(f"Error getting metric: {e}")
            return 0
    
    # Rate Limiting
    async def check_rate_limit(
        self,
        user_id: str,
        action: str,
        limit: int = 100,
        window: int = 60
    ) -> tuple[bool, int]:
        """
        Check if user is within rate limit.
        Returns (allowed, remaining_requests).
        """
        try:
            key = f"rate:{user_id}:{action}"
            
            # Use sliding window with Redis
            now = datetime.utcnow()
            window_start = (now - timedelta(seconds=window)).timestamp()
            
            # Remove old entries
            await self.redis.zremrangebyscore(key, 0, window_start)
            
            # Count current requests
            current_count = await self.redis.zcard(key)
            
            if current_count < limit:
                # Add new request
                await self.redis.zadd(key, {str(now.timestamp()): now.timestamp()})
                await self.redis.expire(key, window)
                return True, limit - current_count - 1
            else:
                return False, 0
                
        except Exception as e:
            print(f"Error checking rate limit: {e}")
            return True, limit  # Allow on error


# Global instance
redis_manager = RedisStateManager()