"""
Agent execution and management endpoints.
"""

from typing import List, Optional, Dict, Any, AsyncIterator
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from enum import Enum
from datetime import datetime
import json
import logging

from app.services.gemini_service import (
    gemini_service, 
    GenerationRequest, 
    GenerationResponse, 
    StreamingEvent
)
from app.core.auth import get_current_active_user, get_optional_user, User

logger = logging.getLogger(__name__)
router = APIRouter()


class AgentType(str, Enum):
    PLANNER = "planner"
    RESEARCHER = "researcher"
    WRITER = "writer"
    ENGINEER = "engineer"
    OPS = "ops"
    ANALYST = "analyst"
    SCHEDULER = "scheduler"
    CRITIC = "critic"


class AutonomyLevel(str, Enum):
    SUGGEST = "suggest"
    DRAFT = "draft"
    EXECUTE = "execute"


class AgentRequest(BaseModel):
    agent_type: AgentType
    input: str
    context: Optional[Dict[str, Any]] = None
    autonomy_level: AutonomyLevel = AutonomyLevel.DRAFT
    budget: Optional[Dict[str, Any]] = None


class AgentResponse(BaseModel):
    id: str
    agent_type: AgentType
    status: str  # pending, running, completed, failed
    result: Optional[Any] = None
    error: Optional[str] = None
    execution_time: Optional[float] = None
    token_usage: Optional[Dict[str, int]] = None


class AgentRun(BaseModel):
    id: str
    agent_type: AgentType
    status: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    input: str
    output: Optional[Any] = None
    steps: List[Dict[str, Any]] = []
    token_usage: Optional[Dict[str, int]] = None


@router.get("/", response_model=List[Dict[str, Any]])
async def list_agents():
    """List all available agents and their capabilities."""
    return [
        {
            "type": agent.value,
            "name": agent.value.capitalize(),
            "description": f"{agent.value.capitalize()} agent for Syna",
            "available": True
        }
        for agent in AgentType
    ]


@router.post("/execute", response_model=AgentResponse)
async def execute_agent(request: AgentRequest, background_tasks: BackgroundTasks):
    """Execute an agent with the given input."""
    # TODO: Implement actual agent execution
    return AgentResponse(
        id="dummy_run_id",
        agent_type=request.agent_type,
        status="completed",
        result={"message": f"{request.agent_type.value} agent executed successfully"},
        execution_time=1.23,
        token_usage={"input": 100, "output": 200}
    )


@router.get("/runs/{run_id}", response_model=AgentRun)
async def get_agent_run(run_id: str):
    """Get details of a specific agent run."""
    # TODO: Implement run retrieval
    raise HTTPException(status_code=404, detail="Run not found")


@router.get("/runs", response_model=List[AgentRun])
async def list_agent_runs(
    agent_type: Optional[AgentType] = None,
    status: Optional[str] = None,
    limit: int = 20
):
    """List recent agent runs."""
    # TODO: Implement run listing
    return []


@router.post("/runs/{run_id}/cancel")
async def cancel_agent_run(run_id: str):
    """Cancel a running agent execution."""
    # TODO: Implement run cancellation
    return {"message": f"Run {run_id} cancelled"}


@router.post("/runs/{run_id}/approve")
async def approve_agent_action(run_id: str, approved: bool = True):
    """Approve or reject an agent action that requires approval."""
    # TODO: Implement approval logic
    return {
        "run_id": run_id,
        "approved": approved,
        "message": "Action approved" if approved else "Action rejected"
    }


@router.post("/generate", response_model=GenerationResponse)
async def generate_content(
    request: GenerationRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Generate content using Gemini with agentic capabilities.
    
    Features:
    - Tool calling and function execution
    - Business context integration
    - Rate limiting and security
    - Streaming support available via /generate/stream
    """
    try:
        # Set user context
        if current_user:
            request.user_id = current_user.id
            
            # Initialize Gemini for user
            initialized = await gemini_service.initialize_for_user(current_user.id)
            if not initialized:
                raise HTTPException(
                    status_code=400,
                    detail="Gemini service not available. Please configure your API key in settings."
                )
        else:
            # Use system-wide Gemini if no user authentication
            if not await gemini_service.initialize_for_user("system"):
                raise HTTPException(
                    status_code=503,
                    detail="AI service temporarily unavailable"
                )
        
        # Generate content
        response = await gemini_service.generate_content(request)
        
        logger.info(
            f"Generated content for user {request.user_id or 'anonymous'}: "
            f"{len(response.content)} chars, {len(response.tools_used)} tools used"
        )
        
        return response
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Content generation failed: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail="Content generation failed"
        )


@router.post("/generate/stream")
async def generate_content_stream(
    request: GenerationRequest,
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Generate content with streaming responses.
    
    Returns Server-Sent Events with real-time updates including:
    - Thinking process
    - Tool calls and execution
    - Progressive content generation
    - Final results
    """
    async def event_generator() -> AsyncIterator[str]:
        try:
            # Set user context
            if current_user:
                request.user_id = current_user.id
                
                # Initialize Gemini for user
                initialized = await gemini_service.initialize_for_user(current_user.id)
                if not initialized:
                    yield f"data: {json.dumps({'type': 'error', 'data': {'error': 'Gemini service not available'}})}\n\n"
                    return
            else:
                # Use system-wide Gemini if no user authentication
                if not await gemini_service.initialize_for_user("system"):
                    yield f"data: {json.dumps({'type': 'error', 'data': {'error': 'AI service temporarily unavailable'}})}\n\n"
                    return
            
            # Stream content generation
            async for event in gemini_service.generate_content_stream(request):
                event_data = {
                    "type": event.type,
                    "data": event.data,
                    "timestamp": event.timestamp.isoformat()
                }
                yield f"data: {json.dumps(event_data)}\n\n"
            
            # Send completion signal
            yield "data: [DONE]\n\n"
            
        except Exception as e:
            logger.error(f"Streaming generation failed: {e}", exc_info=True)
            error_event = {
                "type": "error",
                "data": {"error": "Streaming generation failed"},
                "timestamp": datetime.utcnow().isoformat()
            }
            yield f"data: {json.dumps(error_event)}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )