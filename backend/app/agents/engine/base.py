"""
Base Agent abstract class for Syna agent system.

This provides the foundation for all agent implementations,
defining the core interface and common functionality.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, AsyncIterator, Callable
from enum import Enum
from datetime import datetime
import uuid
import logging
from pydantic import BaseModel, Field

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
from langchain_core.language_models import BaseLLM
from langchain_core.tools import BaseTool
from langchain_core.prompts import ChatPromptTemplate
from langgraph.checkpoint.base import BaseCheckpointSaver

logger = logging.getLogger(__name__)


class AgentStatus(str, Enum):
    """Agent execution status."""
    IDLE = "idle"
    THINKING = "thinking"
    EXECUTING = "executing"
    WAITING_APPROVAL = "waiting_approval"
    COMPLETED = "completed"
    FAILED = "failed"
    INTERRUPTED = "interrupted"


class AgentCapability(str, Enum):
    """Agent capabilities that can be composed."""
    PLANNING = "planning"
    RESEARCH = "research"
    WRITING = "writing"
    CODING = "coding"
    ANALYSIS = "analysis"
    SCHEDULING = "scheduling"
    OPERATIONS = "operations"
    REVIEW = "review"
    INTEGRATION = "integration"
    MEMORY_ACCESS = "memory_access"


class AgentContext(BaseModel):
    """Context passed to agents during execution."""
    conversation_id: str = Field(..., description="Current conversation ID")
    thread_id: str = Field(..., description="Current thread ID")
    user_id: str = Field(..., description="User ID making the request")
    project_id: Optional[str] = Field(None, description="Associated project ID")
    parent_task_id: Optional[str] = Field(None, description="Parent task ID if part of a task graph")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context metadata")
    memory: Dict[str, Any] = Field(default_factory=dict, description="Agent memory/state")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Context creation time")


class AgentRequest(BaseModel):
    """Request to an agent."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Request ID")
    query: str = Field(..., description="User query or task description")
    context: AgentContext = Field(..., description="Execution context")
    tools: List[str] = Field(default_factory=list, description="Available tools for this request")
    max_iterations: int = Field(default=10, description="Maximum iterations allowed")
    require_approval: bool = Field(default=False, description="Whether actions require approval")
    stream: bool = Field(default=True, description="Whether to stream responses")


class AgentResponse(BaseModel):
    """Response from an agent."""
    id: str = Field(..., description="Response ID matching request")
    status: AgentStatus = Field(..., description="Final status")
    result: Optional[str] = Field(None, description="Final result or output")
    actions_taken: List[Dict[str, Any]] = Field(default_factory=list, description="Actions performed")
    tools_used: List[str] = Field(default_factory=list, description="Tools that were used")
    tokens_used: int = Field(default=0, description="Total tokens consumed")
    duration_ms: int = Field(default=0, description="Execution duration in milliseconds")
    error: Optional[str] = Field(None, description="Error message if failed")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional response metadata")


class AgentEvent(BaseModel):
    """Event emitted during agent execution."""
    type: str = Field(..., description="Event type")
    agent_id: str = Field(..., description="Agent emitting the event")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    data: Dict[str, Any] = Field(default_factory=dict, description="Event data")


class BaseAgent(ABC):
    """
    Abstract base class for all Syna agents.
    
    Each agent is an autonomous entity capable of:
    - Processing natural language requests
    - Using tools to accomplish tasks
    - Maintaining state and memory
    - Collaborating with other agents
    - Streaming progress updates
    """
    
    def __init__(
        self,
        agent_id: str,
        name: str,
        description: str,
        llm: BaseLLM,
        tools: Optional[List[BaseTool]] = None,
        capabilities: Optional[List[AgentCapability]] = None,
        checkpoint_saver: Optional[BaseCheckpointSaver] = None,
        **kwargs
    ):
        """
        Initialize a base agent.
        
        Args:
            agent_id: Unique identifier for the agent
            name: Human-readable name
            description: Agent's purpose and capabilities
            llm: Language model to use
            tools: Available tools for the agent
            capabilities: List of agent capabilities
            checkpoint_saver: For saving/restoring state
            **kwargs: Additional agent-specific configuration
        """
        self.agent_id = agent_id
        self.name = name
        self.description = description
        self.llm = llm
        self.tools = tools or []
        self.capabilities = capabilities or []
        self.checkpoint_saver = checkpoint_saver
        self.config = kwargs
        
        # State management
        self.status = AgentStatus.IDLE
        self.current_request: Optional[AgentRequest] = None
        self.event_callbacks: List[Callable[[AgentEvent], None]] = []
        
        # Initialize agent-specific components
        self._initialize()
    
    @abstractmethod
    def _initialize(self) -> None:
        """Initialize agent-specific components."""
        pass
    
    @abstractmethod
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the agent's prompt template."""
        pass
    
    @abstractmethod
    async def _execute_core(
        self,
        request: AgentRequest,
        messages: List[BaseMessage]
    ) -> AsyncIterator[AgentEvent]:
        """
        Core execution logic for the agent.
        
        Args:
            request: The agent request
            messages: Conversation history
            
        Yields:
            AgentEvent: Events during execution
        """
        pass
    
    async def execute(self, request: AgentRequest) -> AsyncIterator[AgentEvent]:
        """
        Execute an agent request.
        
        Args:
            request: The request to process
            
        Yields:
            AgentEvent: Events during execution including final response
        """
        self.current_request = request
        self.status = AgentStatus.THINKING
        start_time = datetime.utcnow()
        
        try:
            # Emit start event
            yield self._create_event("start", {
                "request_id": request.id,
                "query": request.query
            })
            
            # Build message history
            messages = self._build_messages(request)
            
            # Execute core logic
            async for event in self._execute_core(request, messages):
                yield event
            
            # Calculate duration
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            
            # Set final status
            self.status = AgentStatus.COMPLETED
            
            # Emit completion event
            yield self._create_event("complete", {
                "request_id": request.id,
                "status": self.status,
                "duration_ms": duration_ms
            })
            
        except Exception as e:
            logger.error(f"Agent {self.agent_id} failed: {e}", exc_info=True)
            self.status = AgentStatus.FAILED
            
            yield self._create_event("error", {
                "request_id": request.id,
                "error": str(e)
            })
        
        finally:
            self.current_request = None
            self.status = AgentStatus.IDLE
    
    def _build_messages(self, request: AgentRequest) -> List[BaseMessage]:
        """Build message list from request and context."""
        messages = []
        
        # Add system message with agent role
        system_prompt = f"""You are {self.name}, an AI agent with the following capabilities:
{self.description}

Current context:
- Conversation ID: {request.context.conversation_id}
- User ID: {request.context.user_id}
- Timestamp: {request.context.timestamp}
"""
        messages.append(SystemMessage(content=system_prompt))
        
        # Add memory context if available
        if request.context.memory:
            memory_content = "Previous context:\n"
            for key, value in request.context.memory.items():
                memory_content += f"- {key}: {value}\n"
            messages.append(SystemMessage(content=memory_content))
        
        # Add the user query
        messages.append(HumanMessage(content=request.query))
        
        return messages
    
    def _create_event(self, event_type: str, data: Dict[str, Any]) -> AgentEvent:
        """Create an agent event."""
        event = AgentEvent(
            type=event_type,
            agent_id=self.agent_id,
            data=data
        )
        
        # Notify callbacks
        for callback in self.event_callbacks:
            try:
                callback(event)
            except Exception as e:
                logger.error(f"Event callback failed: {e}")
        
        return event
    
    def add_event_callback(self, callback: Callable[[AgentEvent], None]) -> None:
        """Add an event callback."""
        self.event_callbacks.append(callback)
    
    def remove_event_callback(self, callback: Callable[[AgentEvent], None]) -> None:
        """Remove an event callback."""
        if callback in self.event_callbacks:
            self.event_callbacks.remove(callback)
    
    async def interrupt(self) -> None:
        """Interrupt current execution."""
        if self.status in [AgentStatus.THINKING, AgentStatus.EXECUTING]:
            self.status = AgentStatus.INTERRUPTED
            logger.info(f"Agent {self.agent_id} interrupted")
    
    async def approve_action(self, action_id: str, approved: bool) -> None:
        """
        Approve or reject a pending action.
        
        Args:
            action_id: The action to approve/reject
            approved: Whether the action is approved
        """
        if self.status == AgentStatus.WAITING_APPROVAL:
            # This will be implemented by specific agents that support approval
            logger.info(f"Action {action_id} {'approved' if approved else 'rejected'}")
    
    def get_capabilities(self) -> List[AgentCapability]:
        """Get agent capabilities."""
        return self.capabilities
    
    def has_capability(self, capability: AgentCapability) -> bool:
        """Check if agent has a specific capability."""
        return capability in self.capabilities
    
    def get_status(self) -> AgentStatus:
        """Get current agent status."""
        return self.status
    
    def get_tools(self) -> List[BaseTool]:
        """Get available tools."""
        return self.tools
    
    def add_tool(self, tool: BaseTool) -> None:
        """Add a tool to the agent."""
        if tool not in self.tools:
            self.tools.append(tool)
    
    def remove_tool(self, tool: BaseTool) -> None:
        """Remove a tool from the agent."""
        if tool in self.tools:
            self.tools.remove(tool)
    
    def __repr__(self) -> str:
        return f"<{self.__class__.__name__} id='{self.agent_id}' name='{self.name}'>"