"""
Atomic operations for agent coordination using Redis/Valkey Lua scripts
"""
from typing import Optional, Dict, Any, List
import json
from app.core.redis_manager import redis_manager


class AtomicOperations:
    """
    Atomic operations for critical multi-agent coordination.
    Uses Lua scripts for guaranteed atomicity.
    """
    
    def __init__(self):
        self.scripts: Dict[str, str] = {}
        self._register_scripts()
    
    def _register_scripts(self):
        """
        Register Lua scripts for atomic operations.
        """
        
        # Atomic agent task assignment
        self.scripts['assign_task'] = """
        local agent_id = KEYS[1]
        local task_key = KEYS[2]
        local task_data = ARGV[1]
        local ttl = ARGV[2]
        
        -- Check if agent is available
        local agent_state = redis.call('HGET', 'agent:' .. agent_id, 'status')
        if agent_state ~= 'active' and agent_state ~= 'idle' then
            return {false, 'Agent not available'}
        end
        
        -- Check if agent already has a task
        local current_task = redis.call('HGET', 'agent:' .. agent_id, 'current_task')
        if current_task then
            return {false, 'Agent busy'}
        end
        
        -- Atomically assign task
        redis.call('HSET', 'agent:' .. agent_id, 'current_task', task_key)
        redis.call('HSET', 'agent:' .. agent_id, 'status', 'working')
        redis.call('SETEX', task_key, ttl, task_data)
        redis.call('LPUSH', 'agent:' .. agent_id .. ':tasks', task_key)
        
        return {true, 'Task assigned'}
        """
        
        # Atomic document edit with conflict detection
        self.scripts['document_edit'] = """
        local doc_id = KEYS[1]
        local user_id = ARGV[1]
        local version = ARGV[2]
        local edit_data = ARGV[3]
        local ttl = ARGV[4]
        
        -- Check document version
        local current_version = redis.call('HGET', 'doc:' .. doc_id, 'version')
        if current_version and tonumber(current_version) > tonumber(version) then
            return {false, 'Version conflict', current_version}
        end
        
        -- Check if document is locked by another user
        local lock_owner = redis.call('GET', 'lock:doc:' .. doc_id)
        if lock_owner and lock_owner ~= user_id then
            return {false, 'Document locked', lock_owner}
        end
        
        -- Apply edit atomically
        local new_version = tonumber(version) + 1
        redis.call('HSET', 'doc:' .. doc_id, 'version', new_version)
        redis.call('HSET', 'doc:' .. doc_id, 'last_editor', user_id)
        redis.call('HSET', 'doc:' .. doc_id, 'updated_at', ARGV[5])
        
        -- Store edit in history
        local history_key = 'doc:' .. doc_id .. ':history'
        redis.call('LPUSH', history_key, edit_data)
        redis.call('LTRIM', history_key, 0, 99)  -- Keep last 100 edits
        
        -- Set document lock with TTL
        redis.call('SETEX', 'lock:doc:' .. doc_id, ttl, user_id)
        
        return {true, 'Edit applied', new_version}
        """
        
        # Atomic agent coordination for multi-agent tasks
        self.scripts['coordinate_agents'] = """
        local task_id = KEYS[1]
        local coordinator_id = ARGV[1]
        local agent_ids = cjson.decode(ARGV[2])
        local task_data = ARGV[3]
        
        -- Check all agents are available
        local unavailable = {}
        for i, agent_id in ipairs(agent_ids) do
            local status = redis.call('HGET', 'agent:' .. agent_id, 'status')
            if status ~= 'active' and status ~= 'idle' then
                table.insert(unavailable, agent_id)
            end
        end
        
        if #unavailable > 0 then
            return {false, 'Agents unavailable', cjson.encode(unavailable)}
        end
        
        -- Create coordination group
        redis.call('HSET', 'coord:' .. task_id, 'coordinator', coordinator_id)
        redis.call('HSET', 'coord:' .. task_id, 'agents', ARGV[2])
        redis.call('HSET', 'coord:' .. task_id, 'task', task_data)
        redis.call('HSET', 'coord:' .. task_id, 'status', 'active')
        
        -- Assign task to all agents
        for i, agent_id in ipairs(agent_ids) do
            redis.call('HSET', 'agent:' .. agent_id, 'coordination_group', task_id)
            redis.call('HSET', 'agent:' .. agent_id, 'status', 'coordinating')
            redis.call('SADD', 'coord:' .. task_id .. ':members', agent_id)
        end
        
        return {true, 'Coordination established', task_id}
        """
        
        # Atomic rate limiting with sliding window
        self.scripts['rate_limit'] = """
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local current_time = tonumber(ARGV[3])
        
        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', key, 0, current_time - window)
        
        -- Count current requests
        local current = redis.call('ZCARD', key)
        
        if current < limit then
            -- Add new request
            redis.call('ZADD', key, current_time, current_time)
            redis.call('EXPIRE', key, window)
            return {true, limit - current - 1}
        else
            return {false, 0}
        end
        """
        
        # Atomic message ordering for agent communication
        self.scripts['ordered_message'] = """
        local channel = KEYS[1]
        local message = ARGV[1]
        local sender = ARGV[2]
        local timestamp = ARGV[3]
        
        -- Get and increment message sequence
        local sequence = redis.call('HINCRBY', channel .. ':meta', 'sequence', 1)
        
        -- Create ordered message
        local ordered_msg = cjson.encode({
            sequence = sequence,
            sender = sender,
            message = message,
            timestamp = timestamp
        })
        
        -- Store in ordered list
        redis.call('ZADD', channel .. ':messages', sequence, ordered_msg)
        
        -- Publish to subscribers
        redis.call('PUBLISH', channel, ordered_msg)
        
        -- Trim old messages (keep last 1000)
        local count = redis.call('ZCARD', channel .. ':messages')
        if count > 1000 then
            redis.call('ZREMRANGEBYRANK', channel .. ':messages', 0, count - 1001)
        end
        
        return {true, sequence}
        """
    
    async def assign_task_to_agent(
        self,
        agent_id: str,
        task_id: str,
        task_data: Dict[str, Any],
        ttl: int = 3600
    ) -> tuple[bool, str]:
        """
        Atomically assign task to agent.
        """
        if not redis_manager.redis:
            return False, "Redis not connected"
        
        script = redis_manager.redis.register_script(self.scripts['assign_task'])
        result = await script(
            keys=[agent_id, f"task:{task_id}"],
            args=[json.dumps(task_data), ttl]
        )
        
        return result[0], result[1]
    
    async def apply_document_edit(
        self,
        doc_id: str,
        user_id: str,
        version: int,
        edit_data: Dict[str, Any],
        ttl: int = 300
    ) -> tuple[bool, str, Optional[int]]:
        """
        Atomically apply document edit with conflict detection.
        """
        if not redis_manager.redis:
            return False, "Redis not connected", None
        
        from datetime import datetime
        
        script = redis_manager.redis.register_script(self.scripts['document_edit'])
        result = await script(
            keys=[doc_id],
            args=[
                user_id,
                version,
                json.dumps(edit_data),
                ttl,
                datetime.utcnow().isoformat()
            ]
        )
        
        return result[0], result[1], result[2] if len(result) > 2 else None
    
    async def coordinate_agents(
        self,
        task_id: str,
        coordinator_id: str,
        agent_ids: List[str],
        task_data: Dict[str, Any]
    ) -> tuple[bool, str, Optional[str]]:
        """
        Atomically coordinate multiple agents for a task.
        """
        if not redis_manager.redis:
            return False, "Redis not connected", None
        
        # Load cjson for Lua
        script_with_cjson = """
        local cjson = require('cjson')
        """ + self.scripts['coordinate_agents']
        
        script = redis_manager.redis.register_script(script_with_cjson)
        result = await script(
            keys=[task_id],
            args=[
                coordinator_id,
                json.dumps(agent_ids),
                json.dumps(task_data)
            ]
        )
        
        return result[0], result[1], result[2] if len(result) > 2 else None
    
    async def check_rate_limit_atomic(
        self,
        key: str,
        limit: int,
        window: int
    ) -> tuple[bool, int]:
        """
        Atomic rate limiting with sliding window.
        """
        if not redis_manager.redis:
            return True, limit  # Allow if Redis is down
        
        from time import time
        
        script = redis_manager.redis.register_script(self.scripts['rate_limit'])
        result = await script(
            keys=[key],
            args=[limit, window, int(time())]
        )
        
        return result[0], result[1]
    
    async def send_ordered_message(
        self,
        channel: str,
        message: str,
        sender: str
    ) -> tuple[bool, Optional[int]]:
        """
        Send message with guaranteed ordering.
        """
        if not redis_manager.redis:
            return False, None
        
        from datetime import datetime
        
        # Load cjson for Lua
        script_with_cjson = """
        local cjson = require('cjson')
        """ + self.scripts['ordered_message']
        
        script = redis_manager.redis.register_script(script_with_cjson)
        result = await script(
            keys=[channel],
            args=[
                message,
                sender,
                datetime.utcnow().isoformat()
            ]
        )
        
        return result[0], result[1] if len(result) > 1 else None


# Global instance
atomic_ops = AtomicOperations()