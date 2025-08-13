"""
Server-Sent Events (SSE) endpoint for real-time updates
"""
from fastapi import APIRouter, Request, Query
from fastapi.responses import StreamingResponse
from typing import Optional, AsyncGenerator
import asyncio
import json
from datetime import datetime

router = APIRouter()


async def event_generator(user_id: Optional[str] = None) -> AsyncGenerator:
    """
    Generate SSE events for the client
    """
    # Send initial connection event
    yield f"data: {json.dumps({'type': 'connection', 'message': 'Connected to SSE', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
    
    # Keep connection alive with heartbeat
    while True:
        try:
            # Send heartbeat every 30 seconds
            await asyncio.sleep(30)
            yield f"data: {json.dumps({'type': 'heartbeat', 'timestamp': datetime.utcnow().isoformat()})}\n\n"
        except asyncio.CancelledError:
            break
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"
            break


@router.get("/events")
async def sse_endpoint(
    request: Request,
    user_id: Optional[str] = Query(None, description="User ID for filtering events")
):
    """
    SSE endpoint for real-time event streaming
    """
    return StreamingResponse(
        event_generator(user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "X-Accel-Buffering": "no",  # Disable Nginx buffering
        }
    )