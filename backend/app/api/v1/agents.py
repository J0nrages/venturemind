"""
Agent execution and management endpoints.
"""

from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel
from enum import Enum
from datetime import datetime

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