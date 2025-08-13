"""
Supervisor Orchestration - Main orchestrator for multi-agent workflows.

The Supervisor is responsible for:
- Routing requests to appropriate agents
- Managing agent collaboration
- Handling interruptions and approvals
- Maintaining conversation state
- Coordinating complex workflows
"""

from typing import Dict, List, Any, Optional, TypedDict, Annotated, Sequence
from enum import Enum
import logging
from datetime import datetime
import asyncio

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.language_models import BaseLLM
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolInvocation
from langgraph.checkpoint.memory import MemorySaver
from pydantic import BaseModel, Field

from app.agents.engine.registry import get_registry
from app.agents.engine.base import (
    AgentRequest, AgentResponse, AgentContext,
    AgentCapability, AgentStatus
)

logger = logging.getLogger(__name__)


class SupervisorAction(str, Enum):
    """Actions the supervisor can take."""
    ROUTE_TO_AGENT = "route_to_agent"
    REQUEST_APPROVAL = "request_approval"
    GATHER_MORE_INFO = "gather_more_info"
    COMPLETE = "complete"
    INTERRUPT = "interrupt"
    DELEGATE = "delegate"
    ESCALATE = "escalate"


class ConversationState(TypedDict):
    """State for the conversation graph."""
    messages: Sequence[BaseMessage]
    current_agent: Optional[str]
    task_queue: List[Dict[str, Any]]
    completed_tasks: List[Dict[str, Any]]
    context: Dict[str, Any]
    approval_pending: Optional[Dict[str, Any]]
    interrupt_reason: Optional[str]
    final_output: Optional[str]
    metadata: Dict[str, Any]


class SupervisorDecision(BaseModel):
    """Supervisor's decision on how to proceed."""
    action: SupervisorAction = Field(..., description="Action to take")
    agent: Optional[str] = Field(None, description="Agent to route to")
    reason: str = Field(..., description="Reasoning for the decision")
    task: Optional[Dict[str, Any]] = Field(None, description="Task details")
    requires_approval: bool = Field(False, description="Whether approval is needed")
    confidence: float = Field(0.0, description="Confidence in decision (0-1)")


class Supervisor:
    """
    Main orchestrator for multi-agent workflows.
    
    Manages the flow of tasks between agents and handles
    complex orchestration scenarios.
    """
    
    def __init__(
        self,
        llm: BaseLLM,
        checkpointer: Optional[MemorySaver] = None,
        max_iterations: int = 50,
        **kwargs
    ):
        """
        Initialize the supervisor.
        
        Args:
            llm: Language model for decision making
            checkpointer: State persistence
            max_iterations: Maximum workflow iterations
            **kwargs: Additional configuration
        """
        self.llm = llm
        self.checkpointer = checkpointer or MemorySaver()
        self.max_iterations = max_iterations
        self.config = kwargs
        
        # Agent registry
        self.registry = get_registry()
        
        # Build the workflow graph
        self.graph = self._build_graph()
        self.app = self.graph.compile(checkpointer=self.checkpointer)
    
    def _build_graph(self) -> StateGraph:
        """
        Build the supervisor workflow graph.
        
        Returns:
            Configured state graph
        """
        workflow = StateGraph(ConversationState)
        
        # Add nodes
        workflow.add_node("supervisor", self._supervisor_node)
        workflow.add_node("route_agent", self._route_to_agent_node)
        workflow.add_node("approval", self._approval_node)
        workflow.add_node("gather_info", self._gather_info_node)
        workflow.add_node("finalize", self._finalize_node)
        
        # Add edges
        workflow.set_entry_point("supervisor")
        
        # Conditional routing from supervisor
        workflow.add_conditional_edges(
            "supervisor",
            self._supervisor_router,
            {
                SupervisorAction.ROUTE_TO_AGENT: "route_agent",
                SupervisorAction.REQUEST_APPROVAL: "approval",
                SupervisorAction.GATHER_MORE_INFO: "gather_info",
                SupervisorAction.COMPLETE: "finalize",
                SupervisorAction.INTERRUPT: END,
            }
        )
        
        # Routes back to supervisor after agent execution
        workflow.add_edge("route_agent", "supervisor")
        workflow.add_edge("approval", "supervisor")
        workflow.add_edge("gather_info", "supervisor")
        workflow.add_edge("finalize", END)
        
        return workflow
    
    async def _supervisor_node(self, state: ConversationState) -> ConversationState:
        """
        Supervisor decision node.
        
        Analyzes the current state and decides what to do next.
        
        Args:
            state: Current conversation state
            
        Returns:
            Updated state
        """
        logger.info("Supervisor analyzing state...")
        
        # Get the last message
        last_message = state["messages"][-1] if state["messages"] else None
        
        # Check if we have pending approval
        if state.get("approval_pending"):
            logger.info("Approval pending, waiting for decision...")
            return state
        
        # Check if we should complete
        if self._should_complete(state):
            logger.info("Task complete, finalizing...")
            state["metadata"]["action"] = SupervisorAction.COMPLETE
            return state
        
        # Make a decision
        decision = await self._make_decision(state)
        
        # Update state based on decision
        state["metadata"]["last_decision"] = decision.dict()
        state["metadata"]["action"] = decision.action
        
        if decision.agent:
            state["current_agent"] = decision.agent
        
        if decision.task:
            state["task_queue"].append(decision.task)
        
        if decision.requires_approval:
            state["approval_pending"] = {
                "agent": decision.agent,
                "task": decision.task,
                "reason": decision.reason
            }
        
        logger.info(f"Supervisor decision: {decision.action} -> {decision.agent}")
        
        return state
    
    async def _route_to_agent_node(self, state: ConversationState) -> ConversationState:
        """
        Route to and execute an agent.
        
        Args:
            state: Current state
            
        Returns:
            Updated state with agent response
        """
        agent_id = state.get("current_agent")
        if not agent_id:
            logger.error("No agent specified for routing")
            return state
        
        logger.info(f"Routing to agent: {agent_id}")
        
        # Get the agent
        agent = self.registry.get_agent_instance(agent_id)
        if not agent:
            logger.error(f"Agent {agent_id} not found")
            state["messages"].append(
                AIMessage(content=f"Error: Agent {agent_id} not available")
            )
            return state
        
        # Prepare the request
        task = state["task_queue"][-1] if state["task_queue"] else {}
        query = task.get("query", state["messages"][-1].content if state["messages"] else "")
        
        request = AgentRequest(
            query=query,
            context=AgentContext(
                conversation_id=state.get("metadata", {}).get("conversation_id", "default"),
                thread_id=state.get("metadata", {}).get("thread_id", "default"),
                user_id=state.get("metadata", {}).get("user_id", "default"),
                metadata=state.get("context", {})
            )
        )
        
        # Execute the agent
        try:
            events = []
            async for event in agent.execute(request):
                events.append(event)
                
                # Check for completion event
                if event.type == "complete" or event.type.endswith("_complete"):
                    result = event.data.get("result") or event.data.get("report") or event.data.get("content")
                    if result:
                        # Add agent response to messages
                        state["messages"].append(
                            AIMessage(
                                content=str(result),
                                name=agent_id
                            )
                        )
                        
                        # Mark task as complete
                        if state["task_queue"]:
                            completed_task = state["task_queue"].pop()
                            completed_task["completed_by"] = agent_id
                            completed_task["result"] = result
                            state["completed_tasks"].append(completed_task)
            
            # Store events in metadata
            state["metadata"][f"{agent_id}_events"] = [e.dict() for e in events]
            
        except Exception as e:
            logger.error(f"Agent {agent_id} execution failed: {e}")
            state["messages"].append(
                AIMessage(content=f"Agent {agent_id} encountered an error: {str(e)}")
            )
        
        return state
    
    async def _approval_node(self, state: ConversationState) -> ConversationState:
        """
        Handle approval requests.
        
        Args:
            state: Current state
            
        Returns:
            Updated state
        """
        approval = state.get("approval_pending")
        if not approval:
            return state
        
        logger.info(f"Requesting approval for: {approval}")
        
        # In production, this would interact with a UI or external system
        # For now, auto-approve with a flag
        auto_approve = self.config.get("auto_approve", False)
        
        if auto_approve:
            logger.info("Auto-approving request")
            state["approval_pending"] = None
            state["messages"].append(
                SystemMessage(content=f"Approved: {approval['reason']}")
            )
        else:
            # Mark as waiting for approval
            state["interrupt_reason"] = f"Approval required: {approval['reason']}"
            state["metadata"]["action"] = SupervisorAction.INTERRUPT
        
        return state
    
    async def _gather_info_node(self, state: ConversationState) -> ConversationState:
        """
        Gather additional information.
        
        Args:
            state: Current state
            
        Returns:
            Updated state
        """
        logger.info("Gathering additional information...")
        
        # Determine what information is needed
        info_needed = state.get("metadata", {}).get("info_needed", "context")
        
        # Add a message requesting information
        state["messages"].append(
            AIMessage(content=f"I need more information about: {info_needed}")
        )
        
        return state
    
    async def _finalize_node(self, state: ConversationState) -> ConversationState:
        """
        Finalize the workflow.
        
        Args:
            state: Current state
            
        Returns:
            Final state
        """
        logger.info("Finalizing workflow...")
        
        # Compile final output
        completed_tasks = state.get("completed_tasks", [])
        
        if completed_tasks:
            summary = "Completed tasks:\n"
            for task in completed_tasks:
                summary += f"- {task.get('query', 'Task')}: {task.get('completed_by', 'Unknown')}\n"
            
            state["final_output"] = summary
        else:
            state["final_output"] = "Workflow completed"
        
        # Add final message
        state["messages"].append(
            AIMessage(content=state["final_output"])
        )
        
        return state
    
    def _supervisor_router(self, state: ConversationState) -> str:
        """
        Route based on supervisor decision.
        
        Args:
            state: Current state
            
        Returns:
            Next node name
        """
        action = state.get("metadata", {}).get("action", SupervisorAction.COMPLETE)
        return action
    
    async def _make_decision(self, state: ConversationState) -> SupervisorDecision:
        """
        Make a decision on what to do next.
        
        Args:
            state: Current state
            
        Returns:
            Supervisor decision
        """
        # Build context for decision
        messages = state.get("messages", [])
        last_message = messages[-1] if messages else None
        completed_tasks = state.get("completed_tasks", [])
        
        # Create decision prompt
        prompt = ChatPromptTemplate.from_messages([
            ("system", """You are a supervisor orchestrating multiple AI agents.

Available agents:
- planner: Creates execution plans and breaks down complex tasks
- researcher: Finds information and conducts research
- writer: Creates written content and documentation
- engineer: Writes code and handles technical tasks
- ops: Handles operations and deployments
- analyst: Analyzes data and provides insights
- scheduler: Manages time and schedules
- critic: Reviews and provides feedback

Your job is to:
1. Understand the user's request
2. Decide which agent(s) should handle it
3. Route tasks appropriately
4. Ensure quality results

Current context:
- Completed tasks: {completed_count}
- Pending tasks: {pending_count}

Respond with your decision in this format:
Action: [route_to_agent/request_approval/gather_more_info/complete]
Agent: [agent_name if routing]
Reason: [Your reasoning]
Confidence: [0.0-1.0]"""),
            MessagesPlaceholder(variable_name="messages"),
            ("human", "What should we do next?")
        ])
        
        # Format prompt
        formatted = prompt.format_messages(
            completed_count=len(completed_tasks),
            pending_count=len(state.get("task_queue", [])),
            messages=messages[-5:] if len(messages) > 5 else messages  # Last 5 messages
        )
        
        # Get LLM decision
        try:
            response = await self.llm.ainvoke(formatted)
            
            # Parse response
            decision = self._parse_decision(response.content)
            
        except Exception as e:
            logger.error(f"Decision making failed: {e}")
            decision = SupervisorDecision(
                action=SupervisorAction.COMPLETE,
                reason=f"Error making decision: {str(e)}",
                confidence=0.0
            )
        
        return decision
    
    def _parse_decision(self, response: str) -> SupervisorDecision:
        """
        Parse LLM response into a decision.
        
        Args:
            response: LLM response text
            
        Returns:
            Parsed decision
        """
        lines = response.strip().split('\n')
        
        action = SupervisorAction.COMPLETE
        agent = None
        reason = "No reason provided"
        confidence = 0.5
        
        for line in lines:
            line_lower = line.lower()
            
            if "action:" in line_lower:
                if "route" in line_lower or "agent" in line_lower:
                    action = SupervisorAction.ROUTE_TO_AGENT
                elif "approval" in line_lower:
                    action = SupervisorAction.REQUEST_APPROVAL
                elif "info" in line_lower or "gather" in line_lower:
                    action = SupervisorAction.GATHER_MORE_INFO
                elif "complete" in line_lower or "done" in line_lower:
                    action = SupervisorAction.COMPLETE
            
            elif "agent:" in line_lower:
                # Extract agent name
                parts = line.split(":")
                if len(parts) > 1:
                    agent = parts[1].strip().lower()
            
            elif "reason:" in line_lower:
                parts = line.split(":", 1)
                if len(parts) > 1:
                    reason = parts[1].strip()
            
            elif "confidence:" in line_lower:
                try:
                    parts = line.split(":")
                    if len(parts) > 1:
                        confidence = float(parts[1].strip())
                except:
                    pass
        
        return SupervisorDecision(
            action=action,
            agent=agent,
            reason=reason,
            confidence=confidence
        )
    
    def _should_complete(self, state: ConversationState) -> bool:
        """
        Check if the workflow should complete.
        
        Args:
            state: Current state
            
        Returns:
            True if should complete
        """
        # Check iteration limit
        iteration = state.get("metadata", {}).get("iteration", 0)
        if iteration >= self.max_iterations:
            return True
        
        # Check if all tasks are complete
        if not state.get("task_queue") and state.get("completed_tasks"):
            return True
        
        # Check for explicit completion signal
        if state.get("metadata", {}).get("complete", False):
            return True
        
        return False
    
    async def run(
        self,
        messages: List[BaseMessage],
        config: Optional[Dict[str, Any]] = None
    ) -> ConversationState:
        """
        Run the supervisor workflow.
        
        Args:
            messages: Initial messages
            config: Runtime configuration
            
        Returns:
            Final state
        """
        initial_state: ConversationState = {
            "messages": messages,
            "current_agent": None,
            "task_queue": [],
            "completed_tasks": [],
            "context": {},
            "approval_pending": None,
            "interrupt_reason": None,
            "final_output": None,
            "metadata": config or {}
        }
        
        # Run the graph
        final_state = await self.app.ainvoke(initial_state)
        
        return final_state