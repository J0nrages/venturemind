"""
FastAPI endpoints for threaded chat functionality
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from uuid import UUID
import uuid

from app.core.auth import get_current_user, get_optional_user
from app.services.thread_summarization import ThreadSummarizationService
from app.core.redis_manager import redis_manager
from app.core.websocket_manager import websocket_manager
from supabase import create_client
from app.config import settings
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1", tags=["threading"])

# Initialize Supabase client
supabase = create_client(
    settings.supabase_url,
    settings.supabase_service_key or settings.supabase_anon_key
)


@router.post("/messages/{message_id}/archive")
async def archive_message(
    message_id: str,
    current_user = Depends(get_current_user)
):
    """Archive a message (soft delete)"""
    try:
        # Update message in database
        result = supabase.table('conversation_messages').update({
            'archived_at': 'now()',
            'archived_by': str(current_user.id)
        }).eq('id', message_id).eq('user_id', str(current_user.id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Broadcast archive event via WebSocket
        await websocket_manager.send_to_user(str(current_user.id), {
            "type": "message_archived",
            "message_id": message_id,
            "content": {
                "archived_by": str(current_user.id)
            },
            "timestamp": "now()"
        })
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Failed to archive message {message_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/{message_id}/restore")
async def restore_message(
    message_id: str,
    current_user = Depends(get_current_user)
):
    """Restore an archived message"""
    try:
        # Update message in database
        result = supabase.table('conversation_messages').update({
            'archived_at': None,
            'archived_by': None
        }).eq('id', message_id).eq('user_id', str(current_user.id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Message not found")
        
        # Broadcast restore event via WebSocket
        await websocket_manager.send_to_user(str(current_user.id), {
            "type": "message_restored",
            "message_id": message_id,
            "content": {
                "restored_by": str(current_user.id)
            },
            "timestamp": "now()"
        })
        
        return {"success": True}
        
    except Exception as e:
        logger.error(f"Failed to restore message {message_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/reply")
async def create_reply(
    data: dict,
    current_user = Depends(get_current_user)
):
    """Create a reply to a specific message"""
    try:
        reply_to_message_id = data.get("replyToMessageId")
        content = data.get("content")
        quoted_text = data.get("quotedText")
        
        if not reply_to_message_id or not content:
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Get the parent message to determine thread context
        parent_result = supabase.table('conversation_messages').select(
            'thread_id, user_id'
        ).eq('id', reply_to_message_id).single().execute()
        
        if not parent_result.data:
            raise HTTPException(status_code=404, detail="Parent message not found")
        
        parent_message = parent_result.data
        
        # Create reply message
        reply_data = {
            'user_id': str(current_user.id),
            'content': content,
            'sender': 'user',
            'document_updates': [],
            'context_confidence': 0,
            'thread_id': parent_message['thread_id'],
            'reply_to_message_id': reply_to_message_id,
            'quoted_text': quoted_text
        }
        
        result = supabase.table('conversation_messages').insert(reply_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create reply")
        
        reply_message = result.data[0]
        
        # Broadcast reply creation via WebSocket
        await websocket_manager.send_to_user(str(current_user.id), {
            "type": "reply_created",
            "message_id": reply_message['id'],
            "thread_id": reply_message['thread_id'],
            "content": {
                "reply_to_message_id": reply_to_message_id,
                "quoted_text": quoted_text,
                "content": content,
                "sender": "user"
            }
        })
        
        return {"message": reply_message}
        
    except Exception as e:
        logger.error(f"Failed to create reply: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/messages/branch")
async def create_branch(
    data: dict,
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """Create a new thread branch from selected text"""
    try:
        parent_message_id = data.get("parentMessageId")
        selected_text = data.get("selectedText")
        initial_message = data.get("initialMessage")
        
        if not all([parent_message_id, selected_text, initial_message]):
            raise HTTPException(status_code=400, detail="Missing required fields")
        
        # Generate IDs
        new_thread_id = str(uuid.uuid4())
        job_id = str(uuid.uuid4())
        
        # Create branch message
        branch_data = {
            'user_id': str(current_user.id),
            'content': initial_message,
            'sender': 'user',
            'document_updates': [],
            'context_confidence': 0,
            'thread_id': new_thread_id,
            'parent_message_id': parent_message_id,
            'branch_context': selected_text,
            'thread_title': 'Analyzing context...',
            'thread_title_status': 'pending',
            'summarization_job_id': job_id,
            'message_order': 0
        }
        
        result = supabase.table('conversation_messages').insert(branch_data).execute()
        
        if not result.data:
            raise HTTPException(status_code=500, detail="Failed to create branch")
        
        branch_message = result.data[0]
        
        # Queue summarization job
        summarization_context = {
            "messageId": branch_message['id'],
            "threadId": new_thread_id,
            "selectedText": selected_text,
            "initialMessage": initial_message,
            "parentMessageId": parent_message_id,
            "userId": str(current_user.id)
        }
        
        await ThreadSummarizationService.queue_summarization_job(
            job_id, summarization_context
        )
        
        # Broadcast branch creation via WebSocket
        await websocket_manager.send_to_user(str(current_user.id), {
            "type": "branch_created",
            "content": {
                "new_thread_id": new_thread_id,
                "parent_message_id": parent_message_id,
                "branch_context": selected_text,
                "created_by": str(current_user.id),
                "initial_message": initial_message
            }
        })
        
        return {
            "message": branch_message,
            "job_id": job_id
        }
        
    except Exception as e:
        logger.error(f"Failed to create branch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/threads")
async def get_threads(
    limit: int = 20,
    status: str = "active",
    current_user = Depends(get_optional_user)
):
    """Get conversation threads for current user"""
    try:
        # For development - if no user, return empty list or mock data
        if not current_user:
            return {"threads": []}
            
        query = supabase.table('conversation_threads').select('*').eq(
            'user_id', str(current_user.id)
        ).eq('status', status).order(
            'last_activity_at', desc=True
        ).limit(limit)
        
        result = query.execute()
        
        return {"threads": result.data or []}
        
    except Exception as e:
        logger.error(f"Failed to get threads: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/threads/{thread_id}")
async def get_thread(
    thread_id: str,
    current_user = Depends(get_current_user)
):
    """Get specific thread details"""
    try:
        result = supabase.table('conversation_threads').select('*').eq(
            'id', thread_id
        ).eq('user_id', str(current_user.id)).single().execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        return {"thread": result.data}
        
    except Exception as e:
        logger.error(f"Failed to get thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/threads/{thread_id}/messages")
async def get_thread_messages(
    thread_id: str,
    include_archived: bool = False,
    current_user = Depends(get_current_user)
):
    """Get messages for a specific thread"""
    try:
        query = supabase.table('conversation_messages').select('*').eq(
            'thread_id', thread_id
        ).eq('user_id', str(current_user.id)).order('message_order')
        
        if not include_archived:
            query = query.is_('archived_at', 'null')
        
        result = query.execute()
        
        return {"messages": result.data or []}
        
    except Exception as e:
        logger.error(f"Failed to get thread messages for {thread_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/threads/{thread_id}")
async def update_thread(
    thread_id: str,
    data: dict,
    current_user = Depends(get_current_user)
):
    """Update thread metadata"""
    try:
        # Only allow updating title and status
        allowed_fields = ['title', 'status']
        update_data = {k: v for k, v in data.items() if k in allowed_fields}
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No valid fields to update")
        
        update_data['updated_at'] = 'now()'
        
        result = supabase.table('conversation_threads').update(
            update_data
        ).eq('id', thread_id).eq('user_id', str(current_user.id)).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Broadcast thread update via WebSocket
        await websocket_manager.send_to_user(str(current_user.id), {
            "type": "thread_updated",
            "thread_id": thread_id,
            "content": {
                "updates": update_data
            }
        })
        
        return {"thread": result.data[0]}
        
    except Exception as e:
        logger.error(f"Failed to update thread {thread_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/queue/summarization")
async def queue_summarization(
    data: dict,
    current_user = Depends(get_current_user)
):
    """Queue a thread summarization job"""
    try:
        job_id = data.get("jobId")
        context = data.get("context", {})
        
        if not job_id or not context:
            raise HTTPException(status_code=400, detail="Missing job_id or context")
        
        # Verify the user owns the message being summarized
        message_id = context.get("messageId")
        if message_id:
            result = supabase.table('conversation_messages').select('user_id').eq(
                'id', message_id
            ).single().execute()
            
            if not result.data or result.data['user_id'] != str(current_user.id):
                raise HTTPException(status_code=403, detail="Access denied")
        
        # Queue the job
        success = await ThreadSummarizationService.queue_summarization_job(
            job_id, context
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to queue job")
        
        return {"success": True, "job_id": job_id}
        
    except Exception as e:
        logger.error(f"Failed to queue summarization: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/summarization/{job_id}/status")
async def get_summarization_status(
    job_id: str,
    current_user = Depends(get_current_user)
):
    """Get status of a summarization job"""
    try:
        # Check agent state in Redis
        agent_state = await redis_manager.get_agent_state("summarization_agent")
        
        status = "unknown"
        if agent_state and agent_state.get("current_job") == job_id:
            status = agent_state.get("status", "unknown")
        
        return {
            "job_id": job_id,
            "status": status,
            "agent_state": agent_state
        }
        
    except Exception as e:
        logger.error(f"Failed to get job status for {job_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))