"""
Thread summarization service using Redis queues and WebSocket updates
"""

import asyncio
import json
import uuid
from typing import Dict, Any, Optional
from datetime import datetime

from app.core.redis_manager import redis_manager
from app.core.websocket_manager import websocket_manager
from app.services.gemini_service import GeminiService
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class ThreadSummarizationService:
    """
    Handles async thread title/summary generation using existing Redis infrastructure.
    """
    
    QUEUE_NAME = "summarization_agent"
    
    @classmethod
    async def queue_summarization_job(
        cls,
        job_id: str,
        context: Dict[str, Any]
    ) -> bool:
        """
        Queue a thread summarization job using existing Redis message queue.
        """
        try:
            job_data = {
                "job_id": job_id,
                "type": "thread_summarization", 
                "context": context,
                "created_at": datetime.utcnow().isoformat(),
                "status": "queued"
            }
            
            # Use existing Redis queue system
            success = await redis_manager.queue_agent_message(
                cls.QUEUE_NAME,
                job_data
            )
            
            if success:
                logger.info(f"Queued summarization job {job_id}")
                
                # Broadcast job started via WebSocket
                await cls._broadcast_status_update(
                    context.get("userId"),
                    context.get("messageId"), 
                    context.get("threadId"),
                    "started",
                    {"job_id": job_id}
                )
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to queue summarization job {job_id}: {e}")
            return False
    
    @classmethod
    async def process_summarization_queue(cls) -> int:
        """
        Process queued summarization jobs. Returns number of jobs processed.
        """
        processed_count = 0
        
        try:
            # Get jobs from Redis queue
            jobs = await redis_manager.get_agent_messages(cls.QUEUE_NAME, count=5)
            
            for job_data in jobs:
                try:
                    await cls._process_single_job(job_data)
                    processed_count += 1
                    
                except Exception as e:
                    logger.error(f"Failed to process job {job_data.get('job_id')}: {e}")
                    await cls._mark_job_failed(job_data)
                    
        except Exception as e:
            logger.error(f"Error processing summarization queue: {e}")
            
        return processed_count
    
    @classmethod
    async def _process_single_job(cls, job_data: Dict[str, Any]) -> None:
        """
        Process a single summarization job.
        """
        job_id = job_data.get("job_id")
        context = job_data.get("context", {})
        
        message_id = context.get("messageId")
        thread_id = context.get("threadId")
        user_id = context.get("userId")
        selected_text = context.get("selectedText", "")
        initial_message = context.get("initialMessage", "")
        parent_message_id = context.get("parentMessageId")
        
        logger.info(f"Processing summarization job {job_id} for thread {thread_id}")
        
        # Update agent state to show we're processing
        await redis_manager.save_agent_state(cls.QUEUE_NAME, {
            "status": "processing",
            "current_job": job_id,
            "message_id": message_id,
            "thread_id": thread_id
        })
        
        # Broadcast processing status
        await cls._broadcast_status_update(
            user_id, message_id, thread_id, "processing", 
            {"job_id": job_id}
        )
        
        try:
            # Generate title and summary using Gemini
            title, summary = await cls._generate_thread_summary(
                selected_text, initial_message, context
            )
            
            # Update database via Supabase (you could also use direct DB connection)
            await cls._update_message_title(message_id, title, summary)
            
            # Broadcast completion
            await cls._broadcast_status_update(
                user_id, message_id, thread_id, "completed",
                {"title": title, "summary": summary, "job_id": job_id}
            )
            
            logger.info(f"Completed summarization job {job_id}: '{title}'")
            
        except Exception as e:
            logger.error(f"Summarization failed for job {job_id}: {e}")
            await cls._mark_job_failed(job_data)
            raise
    
    @classmethod 
    async def _generate_thread_summary(
        cls,
        selected_text: str,
        initial_message: str,
        context: Dict[str, Any]
    ) -> tuple[str, str]:
        """
        Generate thread title and summary using Gemini.
        """
        user_id = context.get("userId")
        
        # Initialize Gemini service for this user
        gemini = GeminiService(user_id)
        
        prompt = f"""
        Based on this conversation context, generate a concise thread title (3-8 words) and brief summary.

        Selected text that prompted the branch: "{selected_text}"
        
        Initial message in new thread: "{initial_message}"
        
        Instructions:
        1. Create a title that captures the main topic or question being explored
        2. Keep title between 3-8 words
        3. Create a 1-2 sentence summary of what this discussion branch is about
        4. Focus on the intent and topic, not just the content
        
        Respond in this exact JSON format:
        {{
            "title": "Concise Topic Title",
            "summary": "Brief 1-2 sentence summary of this discussion branch."
        }}
        """
        
        try:
            response = await gemini.generate_content(prompt)
            result = json.loads(response.content)
            
            title = result.get("title", "Discussion").strip()
            summary = result.get("summary", "").strip()
            
            # Fallback if parsing fails
            if not title:
                title = cls._generate_fallback_title(selected_text, initial_message)
            
            return title, summary
            
        except Exception as e:
            logger.warning(f"Gemini summarization failed, using fallback: {e}")
            title = cls._generate_fallback_title(selected_text, initial_message)
            summary = f"Discussion about: {selected_text[:100]}..."
            return title, summary
    
    @classmethod
    def _generate_fallback_title(cls, selected_text: str, initial_message: str) -> str:
        """
        Generate a simple fallback title when AI fails.
        """
        # Try to extract key terms from selected text
        words = selected_text.split()[:4]  # First 4 words
        if len(words) >= 2:
            return " ".join(words).title()
        
        # Fall back to initial message
        words = initial_message.split()[:3]  # First 3 words
        if len(words) >= 2:
            return " ".join(words).title()
            
        return "Discussion"
    
    @classmethod
    async def _update_message_title(
        cls,
        message_id: str,
        title: str,
        summary: str
    ) -> None:
        """
        Update message with generated title and summary.
        """
        # This would typically use your database service
        # For now, using Supabase via the existing pattern
        
        from supabase import create_client
        
        supabase = create_client(
            settings.supabase_url,
            settings.supabase_service_key or settings.supabase_anon_key
        )
        
        try:
            result = supabase.table('conversation_messages').update({
                'thread_title': title,
                'thread_summary': summary,
                'thread_title_status': 'completed'
            }).eq('id', message_id).execute()
            
            logger.info(f"Updated message {message_id} with title: '{title}'")
            
        except Exception as e:
            logger.error(f"Failed to update message {message_id}: {e}")
            raise
    
    @classmethod
    async def _mark_job_failed(cls, job_data: Dict[str, Any]) -> None:
        """
        Mark a job as failed and update the message.
        """
        context = job_data.get("context", {})
        message_id = context.get("messageId")
        thread_id = context.get("threadId")
        user_id = context.get("userId")
        job_id = job_data.get("job_id")
        
        try:
            # Update message with failed status
            await cls._update_message_title(
                message_id,
                "Discussion",  # Fallback title
                ""
            )
            
            # Update message status to failed
            from supabase import create_client
            supabase = create_client(
                settings.supabase_url,
                settings.supabase_service_key or settings.supabase_anon_key
            )
            
            supabase.table('conversation_messages').update({
                'thread_title_status': 'failed'
            }).eq('id', message_id).execute()
            
            # Broadcast failure
            await cls._broadcast_status_update(
                user_id, message_id, thread_id, "failed",
                {"error": "Summarization failed", "job_id": job_id}
            )
            
        except Exception as e:
            logger.error(f"Failed to mark job as failed: {e}")
    
    @classmethod
    async def _broadcast_status_update(
        cls,
        user_id: str,
        message_id: str,
        thread_id: str,
        status: str,
        data: Dict[str, Any]
    ) -> None:
        """
        Broadcast summarization status update via WebSocket.
        """
        try:
            message = {
                "type": f"summarization_{status}",
                "message_id": message_id,
                "thread_id": thread_id,
                "content": data,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Use existing WebSocket manager to broadcast to user
            await websocket_manager.send_to_user(user_id, message)
            
        except Exception as e:
            logger.error(f"Failed to broadcast status update: {e}")


# Background worker function
async def run_summarization_worker():
    """
    Background worker that processes summarization queue.
    Run this as a background task in your FastAPI app.
    """
    logger.info("Starting thread summarization worker")
    
    while True:
        try:
            processed = await ThreadSummarizationService.process_summarization_queue()
            
            if processed > 0:
                logger.info(f"Processed {processed} summarization jobs")
            
            # Wait before next cycle
            await asyncio.sleep(5)  # Process every 5 seconds
            
        except Exception as e:
            logger.error(f"Summarization worker error: {e}")
            await asyncio.sleep(10)  # Wait longer on error