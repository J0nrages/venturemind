"""
Planner Agent Engine - Orchestrates complex tasks and creates execution plans.

The Planner agent is responsible for:
- Breaking down complex requests into subtasks
- Creating task dependency graphs
- Orchestrating multi-agent workflows
- Managing task priorities and sequences
"""

from typing import List, Dict, Any, AsyncIterator, Optional
import json
import logging
from datetime import datetime

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
from pydantic import BaseModel, Field

from app.agents.engine.base import (
    BaseAgent, AgentEvent, AgentRequest, AgentCapability, AgentStatus
)

logger = logging.getLogger(__name__)


class TaskNode(BaseModel):
    """Represents a single task in the execution plan."""
    id: str = Field(..., description="Unique task identifier")
    name: str = Field(..., description="Task name")
    description: str = Field(..., description="Detailed task description")
    agent: str = Field(..., description="Agent responsible for this task")
    dependencies: List[str] = Field(default_factory=list, description="IDs of tasks this depends on")
    priority: int = Field(default=1, description="Task priority (1-5, 5 being highest)")
    estimated_duration: int = Field(default=60, description="Estimated duration in seconds")
    requires_approval: bool = Field(default=False, description="Whether task requires approval")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional task metadata")


class ExecutionPlan(BaseModel):
    """Complete execution plan for a request."""
    id: str = Field(..., description="Plan identifier")
    goal: str = Field(..., description="Overall goal of the plan")
    tasks: List[TaskNode] = Field(..., description="List of tasks to execute")
    estimated_total_duration: int = Field(..., description="Total estimated duration in seconds")
    parallel_execution: bool = Field(default=True, description="Whether tasks can run in parallel")
    created_at: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class PlannerAgent(BaseAgent):
    """
    Planner Agent - The strategic orchestrator of the Syna system.
    
    Specializes in:
    - Task decomposition and planning
    - Multi-agent coordination
    - Workflow optimization
    - Strategic decision making
    """
    
    def _initialize(self) -> None:
        """Initialize planner-specific components."""
        self.capabilities = [
            AgentCapability.PLANNING,
            AgentCapability.ANALYSIS,
            AgentCapability.SCHEDULING
        ]
        
        # Parser for structured output
        self.plan_parser = JsonOutputParser(pydantic_object=ExecutionPlan)
    
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the planner's prompt template."""
        return ChatPromptTemplate.from_messages([
            ("system", """You are the Planner Agent, responsible for breaking down complex requests into actionable tasks.

Your role is to:
1. Analyze the user's request and understand the goal
2. Decompose it into specific, actionable tasks
3. Identify dependencies between tasks
4. Assign appropriate agents to each task
5. Estimate time and resources needed

Available agents and their specialties:
- planner: Task decomposition and workflow orchestration (yourself)
- researcher: Information gathering, web search, documentation lookup
- writer: Content creation, documentation, reports
- engineer: Code development, technical implementation
- ops: System operations, deployments, infrastructure
- analyst: Data analysis, metrics, insights
- scheduler: Time management, calendar operations, reminders
- critic: Review, validation, quality assurance

When creating a plan, consider:
- Task dependencies and optimal execution order
- Which tasks can run in parallel
- Which tasks might need approval before execution
- Realistic time estimates for each task

{format_instructions}"""),
            ("human", "{query}"),
            ("system", "Create a comprehensive execution plan for this request.")
        ])
    
    async def _execute_core(
        self,
        request: AgentRequest,
        messages: List[BaseMessage]
    ) -> AsyncIterator[AgentEvent]:
        """
        Core planning logic.
        
        Args:
            request: The planning request
            messages: Conversation history
            
        Yields:
            AgentEvent: Planning events
        """
        try:
            # Update status
            self.status = AgentStatus.THINKING
            yield self._create_event("thinking", {
                "message": "Analyzing request and creating execution plan..."
            })
            
            # Create the prompt
            prompt = self._create_prompt()
            format_instructions = self.plan_parser.get_format_instructions()
            
            # Format the prompt with the query
            formatted_prompt = prompt.format_messages(
                query=request.query,
                format_instructions=format_instructions
            )
            
            # Generate the plan
            response = await self.llm.ainvoke(formatted_prompt)
            
            # Parse the response
            try:
                plan = self.plan_parser.parse(response.content)
            except Exception as parse_error:
                # Fallback to creating a simple plan
                logger.warning(f"Failed to parse structured plan: {parse_error}")
                plan = self._create_fallback_plan(request.query, response.content)
            
            # Validate and optimize the plan
            plan = self._optimize_plan(plan)
            
            # Emit the plan
            yield self._create_event("plan_created", {
                "plan": plan.dict() if isinstance(plan, ExecutionPlan) else plan
            })
            
            # If streaming, emit task details
            if request.stream:
                for task in plan.tasks if isinstance(plan, ExecutionPlan) else plan.get("tasks", []):
                    yield self._create_event("task_planned", {
                        "task": task.dict() if hasattr(task, 'dict') else task
                    })
            
            # Store plan in context for other agents
            if request.context:
                request.context.metadata["execution_plan"] = plan.dict() if isinstance(plan, ExecutionPlan) else plan
            
            # Emit completion
            yield self._create_event("planning_complete", {
                "total_tasks": len(plan.tasks) if isinstance(plan, ExecutionPlan) else len(plan.get("tasks", [])),
                "estimated_duration": plan.estimated_total_duration if isinstance(plan, ExecutionPlan) else 0,
                "plan_id": plan.id if isinstance(plan, ExecutionPlan) else plan.get("id", "unknown")
            })
            
        except Exception as e:
            logger.error(f"Planning failed: {e}", exc_info=True)
            yield self._create_event("planning_failed", {
                "error": str(e)
            })
            raise
    
    def _create_fallback_plan(self, query: str, llm_response: str) -> Dict[str, Any]:
        """
        Create a simple fallback plan when structured parsing fails.
        
        Args:
            query: Original user query
            llm_response: Raw LLM response
            
        Returns:
            Simple plan dictionary
        """
        return {
            "id": f"plan_{datetime.utcnow().timestamp()}",
            "goal": query,
            "tasks": [
                {
                    "id": "task_1",
                    "name": "Execute Request",
                    "description": query,
                    "agent": "researcher",  # Default to researcher for general tasks
                    "dependencies": [],
                    "priority": 3,
                    "estimated_duration": 120,
                    "requires_approval": False,
                    "metadata": {"llm_response": llm_response}
                }
            ],
            "estimated_total_duration": 120,
            "parallel_execution": False,
            "created_at": datetime.utcnow().isoformat()
        }
    
    def _optimize_plan(self, plan: Any) -> Any:
        """
        Optimize the execution plan for efficiency.
        
        Args:
            plan: The initial plan
            
        Returns:
            Optimized plan
        """
        if not isinstance(plan, ExecutionPlan):
            return plan
        
        # Sort tasks by priority and dependencies
        sorted_tasks = self._topological_sort(plan.tasks)
        plan.tasks = sorted_tasks
        
        # Identify parallel execution opportunities
        plan.parallel_execution = self._can_parallelize(plan.tasks)
        
        # Update total duration estimate
        if plan.parallel_execution:
            # Calculate critical path duration
            plan.estimated_total_duration = self._calculate_critical_path_duration(plan.tasks)
        else:
            # Sum all task durations
            plan.estimated_total_duration = sum(
                task.estimated_duration for task in plan.tasks
            )
        
        return plan
    
    def _topological_sort(self, tasks: List[TaskNode]) -> List[TaskNode]:
        """
        Sort tasks based on dependencies (topological sort).
        
        Args:
            tasks: List of tasks to sort
            
        Returns:
            Sorted list of tasks
        """
        # Create adjacency list
        task_map = {task.id: task for task in tasks}
        in_degree = {task.id: len(task.dependencies) for task in tasks}
        adj_list = {task.id: [] for task in tasks}
        
        for task in tasks:
            for dep in task.dependencies:
                if dep in adj_list:
                    adj_list[dep].append(task.id)
        
        # Find tasks with no dependencies
        queue = [tid for tid, degree in in_degree.items() if degree == 0]
        sorted_tasks = []
        
        while queue:
            # Sort by priority for tasks at the same level
            queue.sort(key=lambda x: task_map[x].priority, reverse=True)
            current = queue.pop(0)
            sorted_tasks.append(task_map[current])
            
            # Reduce in-degree for dependent tasks
            for neighbor in adj_list[current]:
                in_degree[neighbor] -= 1
                if in_degree[neighbor] == 0:
                    queue.append(neighbor)
        
        # Check for cycles
        if len(sorted_tasks) != len(tasks):
            logger.warning("Circular dependencies detected in plan")
            return tasks  # Return original order if cycle detected
        
        return sorted_tasks
    
    def _can_parallelize(self, tasks: List[TaskNode]) -> bool:
        """
        Determine if tasks can be executed in parallel.
        
        Args:
            tasks: List of tasks
            
        Returns:
            True if parallel execution is possible
        """
        # Check if there are any tasks without dependencies
        # or multiple tasks at the same dependency level
        levels = {}
        for task in tasks:
            level = len(task.dependencies)
            if level not in levels:
                levels[level] = []
            levels[level].append(task)
        
        # If any level has multiple tasks, parallel execution is possible
        return any(len(tasks) > 1 for tasks in levels.values())
    
    def _calculate_critical_path_duration(self, tasks: List[TaskNode]) -> int:
        """
        Calculate the critical path duration for parallel execution.
        
        Args:
            tasks: List of tasks
            
        Returns:
            Duration of the critical path in seconds
        """
        task_map = {task.id: task for task in tasks}
        durations = {}
        
        def get_duration(task_id: str) -> int:
            if task_id in durations:
                return durations[task_id]
            
            task = task_map[task_id]
            if not task.dependencies:
                durations[task_id] = task.estimated_duration
            else:
                max_dep_duration = max(
                    get_duration(dep) for dep in task.dependencies
                    if dep in task_map
                ) if task.dependencies else 0
                durations[task_id] = max_dep_duration + task.estimated_duration
            
            return durations[task_id]
        
        # Calculate duration for all tasks
        for task in tasks:
            get_duration(task.id)
        
        # Return the maximum duration
        return max(durations.values()) if durations else 0