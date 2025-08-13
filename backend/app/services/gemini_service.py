"""
Gemini AI service with agentic capabilities and tool calling.

This service provides:
- Secure Gemini API integration
- Tool calling and function execution
- Streaming responses
- Business context integration
"""

import json
import logging
from typing import Dict, List, Any, Optional, AsyncIterator, Callable
from datetime import datetime, timedelta
import asyncio

import google.generativeai as genai
from google.generativeai.types import GenerateContentResponse
from pydantic import BaseModel, Field
import importlib

from app.config import settings

# Conditional imports for agentic capabilities
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    from langchain_core.tools import BaseTool
    from langchain_core.messages import BaseMessage, HumanMessage, AIMessage, SystemMessage
    LANGCHAIN_AVAILABLE = True
except ImportError:
    LANGCHAIN_AVAILABLE = False
    BaseTool = None
    BaseMessage = None

try:
    from app.agents.tools.base_tools import get_base_tools
    BASE_TOOLS_AVAILABLE = True
except ImportError:
    BASE_TOOLS_AVAILABLE = False

logger = logging.getLogger(__name__)


class GenerationConfig(BaseModel):
    """Configuration for content generation."""
    temperature: float = Field(default=0.7, ge=0.0, le=2.0)
    top_p: float = Field(default=0.95, ge=0.0, le=1.0)
    top_k: int = Field(default=40, ge=1, le=100)
    max_output_tokens: int = Field(default=2048, ge=1, le=8192)
    candidate_count: int = Field(default=1, ge=1, le=8)


class FunctionCall(BaseModel):
    """Represents a function call from Gemini."""
    name: str
    args: Dict[str, Any]


class GenerationRequest(BaseModel):
    """Request for content generation."""
    prompt: str = Field(..., min_length=1, max_length=10000)
    model: str = Field(default="gemini-2.0-flash-exp")
    config: GenerationConfig = Field(default_factory=GenerationConfig)
    tools: List[str] = Field(default_factory=list)
    context: Optional[Dict[str, Any]] = None
    user_id: Optional[str] = None
    conversation_id: Optional[str] = None


class GenerationResponse(BaseModel):
    """Response from content generation."""
    content: str
    confidence: float = Field(ge=0.0, le=1.0)
    reasoning: str
    function_calls: List[FunctionCall] = Field(default_factory=list)
    tools_used: List[str] = Field(default_factory=list)
    token_usage: Dict[str, int] = Field(default_factory=dict)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class StreamingEvent(BaseModel):
    """Streaming event during generation."""
    type: str  # thinking, tool_call, content, complete, error
    data: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class GeminiService:
    """
    Gemini AI service with agentic capabilities.
    
    Features:
    - Secure API key management
    - Tool calling with automatic execution
    - Streaming responses
    - Rate limiting and safety checks
    - Business context integration
    """
    
    def __init__(self):
        self.api_key: Optional[str] = None
        self.client: Optional[ChatGoogleGenerativeAI] = None
        self.tools: Dict[str, BaseTool] = {}
        self.rate_limits: Dict[str, List[datetime]] = {}
        self._initialize_tools()
    
    def _initialize_tools(self) -> None:
        """Initialize available tools."""
        if BASE_TOOLS_AVAILABLE and LANGCHAIN_AVAILABLE:
            # Use full agentic tool system
            base_tools = get_base_tools(include_memory=True)
            for tool in base_tools:
                self.tools[tool.name] = tool
        else:
            # Fallback to basic tool descriptions
            self.tools = {
                "web_search": {"name": "web_search", "description": "Search the web for information"},
                "calculator": {"name": "calculator", "description": "Perform calculations"},
                "datetime": {"name": "datetime", "description": "Get current date/time"},
            }
    
    def _add_business_tools(self) -> None:
        """Add business-specific tools for Syna."""
        # TODO: Add document management, strategic planning, analytics tools
        pass
    
    async def initialize_for_user(self, user_id: str) -> bool:
        """
        Initialize Gemini service for a specific user.
        
        Args:
            user_id: User ID to get API key for
            
        Returns:
            True if initialization successful
        """
        try:
            # Try to get user's API key from database
            # TODO: Implement user API key retrieval from Supabase
            user_api_key = None
            
            # Fall back to system API key
            api_key = user_api_key or settings.gemini_api_key
            
            if not api_key:
                logger.warning(f"No Gemini API key available for user {user_id}")
                return False
            
            # Configure Gemini
            genai.configure(api_key=api_key)
            
            # Initialize LangChain client if available
            if LANGCHAIN_AVAILABLE:
                self.client = ChatGoogleGenerativeAI(
                    model="gemini-2.0-flash-exp",
                    google_api_key=api_key,
                    temperature=0.7,
                )
            else:
                # Use native Gemini client as fallback
                self.model = genai.GenerativeModel("gemini-2.0-flash-exp")
            
            self.api_key = api_key
            logger.info(f"Gemini service initialized for user {user_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize Gemini for user {user_id}: {e}")
            return False
    
    def _check_rate_limit(self, user_id: str, limit: int = 100, window_minutes: int = 60) -> bool:
        """Check if user is within rate limits."""
        now = datetime.utcnow()
        window_start = now - timedelta(minutes=window_minutes)
        
        if user_id not in self.rate_limits:
            self.rate_limits[user_id] = []
        
        # Remove old requests
        self.rate_limits[user_id] = [
            req_time for req_time in self.rate_limits[user_id]
            if req_time > window_start
        ]
        
        # Check limit
        if len(self.rate_limits[user_id]) >= limit:
            return False
        
        # Add current request
        self.rate_limits[user_id].append(now)
        return True
    
    def _create_tool_schemas(self, tool_names: List[str]) -> List[Dict[str, Any]]:
        """Create tool schemas for Gemini function calling."""
        schemas = []
        
        if LANGCHAIN_AVAILABLE and BASE_TOOLS_AVAILABLE:
            # Use full agentic tool schemas
            for tool_name in tool_names:
                if tool_name in self.tools and hasattr(self.tools[tool_name], 'name'):
                    tool = self.tools[tool_name]
                    
                    schema = {
                        "name": tool.name,
                        "description": tool.description,
                        "parameters": {
                            "type": "object",
                            "properties": {},
                            "required": []
                        }
                    }
                    
                    # Add parameter schema if available
                    if hasattr(tool, 'args_schema') and tool.args_schema:
                        for field_name, field in tool.args_schema.__fields__.items():
                            schema["parameters"]["properties"][field_name] = {
                                "type": "string",
                                "description": field.field_info.description or ""
                            }
                            if field.required:
                                schema["parameters"]["required"].append(field_name)
                    
                    schemas.append(schema)
        else:
            # Fallback basic tools
            basic_tools = {
                "web_search": {
                    "name": "web_search",
                    "description": "Search the web for current information",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {"type": "string", "description": "Search query"}
                        },
                        "required": ["query"]
                    }
                },
                "calculator": {
                    "name": "calculator",
                    "description": "Perform mathematical calculations",
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "expression": {"type": "string", "description": "Mathematical expression"}
                        },
                        "required": ["expression"]
                    }
                }
            }
            
            for tool_name in tool_names:
                if tool_name in basic_tools:
                    schemas.append(basic_tools[tool_name])
        
        return schemas
    
    async def _execute_function_call(self, function_call: FunctionCall) -> str:
        """Execute a function call and return the result."""
        try:
            if LANGCHAIN_AVAILABLE and BASE_TOOLS_AVAILABLE:
                # Use full agentic tool execution
                if function_call.name not in self.tools:
                    return f"Error: Tool '{function_call.name}' not found"
                
                tool = self.tools[function_call.name]
                
                # Execute the tool
                if asyncio.iscoroutinefunction(tool._run):
                    result = await tool._run(**function_call.args)
                else:
                    result = tool._run(**function_call.args)
                
                return str(result)
            else:
                # Fallback basic tool execution
                if function_call.name == "web_search":
                    query = function_call.args.get("query", "")
                    return f"Web search results for '{query}': [Simulated results - integrate with actual search API]"
                
                elif function_call.name == "calculator":
                    expression = function_call.args.get("expression", "")
                    try:
                        # Safe evaluation for basic math
                        result = eval(expression, {"__builtins__": {}}, {})
                        return str(result)
                    except:
                        return "Error: Invalid mathematical expression"
                
                elif function_call.name == "datetime":
                    return datetime.utcnow().isoformat()
                
                else:
                    return f"Error: Tool '{function_call.name}' not implemented"
            
        except Exception as e:
            logger.error(f"Error executing function {function_call.name}: {e}")
            return f"Error executing {function_call.name}: {str(e)}"
    
    def _build_system_prompt(self, context: Optional[Dict[str, Any]] = None) -> str:
        """Build system prompt with business context."""
        base_prompt = """You are Syna AI, an intelligent business assistant with agentic capabilities.

You help users with:
- Business planning and strategy
- Document management and analysis
- Data analysis and insights
- Task planning and execution
- Strategic decision making

You have access to various tools to help accomplish tasks. When you need to use a tool, 
call the appropriate function with the correct parameters.

Be helpful, accurate, and proactive. Always explain your reasoning and suggest next steps."""

        if context:
            base_prompt += f"\n\nCurrent context:\n{json.dumps(context, indent=2)}"
        
        return base_prompt
    
    async def generate_content(self, request: GenerationRequest) -> GenerationResponse:
        """
        Generate content using Gemini with tool calling support.
        
        Args:
            request: Generation request
            
        Returns:
            Generated response with tool calls
        """
        if not self.client:
            raise ValueError("Gemini service not initialized")
        
        # Check rate limits
        if request.user_id and not self._check_rate_limit(request.user_id):
            raise ValueError("Rate limit exceeded")
        
        try:
            # Build messages
            messages = [
                SystemMessage(content=self._build_system_prompt(request.context)),
                HumanMessage(content=request.prompt)
            ]
            
            # Configure model with tools if requested
            model_kwargs = {
                "temperature": request.config.temperature,
                "top_p": request.config.top_p,
                "max_output_tokens": request.config.max_output_tokens,
            }
            
            # Add tools if requested
            function_calls = []
            tools_used = []
            
            if request.tools:
                tool_schemas = self._create_tool_schemas(request.tools)
                model_kwargs["functions"] = tool_schemas
            
            # Generate initial response
            response = await self.client.ainvoke(messages, **model_kwargs)
            content = response.content
            
            # Handle function calls if present
            if hasattr(response, 'additional_kwargs') and 'function_call' in response.additional_kwargs:
                func_call_data = response.additional_kwargs['function_call']
                function_call = FunctionCall(
                    name=func_call_data['name'],
                    args=json.loads(func_call_data['arguments'])
                )
                
                # Execute function call
                tool_result = await self._execute_function_call(function_call)
                function_calls.append(function_call)
                tools_used.append(function_call.name)
                
                # Add tool result to conversation and get final response
                messages.extend([
                    AIMessage(content="", additional_kwargs={"function_call": func_call_data}),
                    HumanMessage(content=f"Tool result: {tool_result}")
                ])
                
                # Generate final response with tool results
                final_response = await self.client.ainvoke(messages, **model_kwargs)
                content = final_response.content
            
            # Calculate confidence (simplified heuristic)
            confidence = min(0.9, len(content) / 100.0) if content else 0.1
            
            return GenerationResponse(
                content=content,
                confidence=confidence,
                reasoning="Generated using Gemini 2.0 with tool calling",
                function_calls=function_calls,
                tools_used=tools_used,
                token_usage={"input": 100, "output": len(content.split())},  # Approximate
                metadata={
                    "model": request.model,
                    "temperature": request.config.temperature,
                    "user_id": request.user_id,
                    "conversation_id": request.conversation_id
                }
            )
            
        except Exception as e:
            logger.error(f"Content generation failed: {e}")
            raise
    
    async def generate_content_stream(
        self, 
        request: GenerationRequest
    ) -> AsyncIterator[StreamingEvent]:
        """
        Generate content with streaming support.
        
        Args:
            request: Generation request
            
        Yields:
            StreamingEvent: Events during generation
        """
        if not self.client:
            raise ValueError("Gemini service not initialized")
        
        try:
            # Emit start event
            yield StreamingEvent(
                type="thinking",
                data={"message": "Processing your request..."}
            )
            
            # Generate content (non-streaming for now, but can be enhanced)
            response = await self.generate_content(request)
            
            # Emit tool calls if any
            for func_call in response.function_calls:
                yield StreamingEvent(
                    type="tool_call",
                    data={
                        "tool": func_call.name,
                        "args": func_call.args
                    }
                )
            
            # Emit content
            yield StreamingEvent(
                type="content",
                data={
                    "content": response.content,
                    "confidence": response.confidence
                }
            )
            
            # Emit completion
            yield StreamingEvent(
                type="complete",
                data={
                    "tools_used": response.tools_used,
                    "token_usage": response.token_usage
                }
            )
            
        except Exception as e:
            logger.error(f"Streaming generation failed: {e}")
            yield StreamingEvent(
                type="error",
                data={"error": str(e)}
            )


# Global service instance
gemini_service = GeminiService()