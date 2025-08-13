"""
Base tools available to all agents.

Provides common functionality like search, data manipulation,
and integration with external services.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime
import json
import logging

from langchain_core.tools import BaseTool, StructuredTool
from langchain_core.pydantic_v1 import BaseModel, Field
from langchain_community.tools import DuckDuckGoSearchRun
from langchain_community.utilities import WikipediaAPIWrapper

logger = logging.getLogger(__name__)


class SearchInput(BaseModel):
    """Input for search tool."""
    query: str = Field(..., description="Search query")
    max_results: int = Field(default=5, description="Maximum results to return")


class CalculationInput(BaseModel):
    """Input for calculation tool."""
    expression: str = Field(..., description="Mathematical expression to evaluate")


class DateTimeInput(BaseModel):
    """Input for datetime operations."""
    operation: str = Field(..., description="Operation: now, format, parse, diff")
    date_string: Optional[str] = Field(None, description="Date string to parse")
    format: Optional[str] = Field(None, description="Date format")


class JSONInput(BaseModel):
    """Input for JSON operations."""
    operation: str = Field(..., description="Operation: parse, stringify, validate")
    data: str = Field(..., description="JSON data or Python object string")


def create_search_tool() -> BaseTool:
    """
    Create a web search tool.
    
    Returns:
        Search tool
    """
    try:
        search = DuckDuckGoSearchRun()
        
        def search_wrapper(query: str, max_results: int = 5) -> str:
            """Search the web for information."""
            try:
                result = search.run(query)
                # Limit results
                lines = result.split('\n')
                limited = '\n'.join(lines[:max_results])
                return limited
            except Exception as e:
                return f"Search failed: {str(e)}"
        
        return StructuredTool.from_function(
            func=search_wrapper,
            name="web_search",
            description="Search the web for current information",
            args_schema=SearchInput
        )
    except Exception as e:
        logger.warning(f"Could not create search tool: {e}")
        return None


def create_wikipedia_tool() -> BaseTool:
    """
    Create a Wikipedia search tool.
    
    Returns:
        Wikipedia tool
    """
    try:
        wikipedia = WikipediaAPIWrapper(
            top_k_results=3,
            doc_content_chars_max=4000
        )
        
        def wikipedia_wrapper(query: str, max_results: int = 3) -> str:
            """Search Wikipedia for information."""
            try:
                result = wikipedia.run(query)
                return result
            except Exception as e:
                return f"Wikipedia search failed: {str(e)}"
        
        return StructuredTool.from_function(
            func=wikipedia_wrapper,
            name="wikipedia_search",
            description="Search Wikipedia for detailed information",
            args_schema=SearchInput
        )
    except Exception as e:
        logger.warning(f"Could not create Wikipedia tool: {e}")
        return None


def create_calculation_tool() -> BaseTool:
    """
    Create a calculation tool for basic math.
    
    Returns:
        Calculation tool
    """
    def calculate(expression: str) -> str:
        """Perform mathematical calculations."""
        try:
            # Safe evaluation of mathematical expressions
            # In production, use a proper math parser
            allowed_names = {
                "abs": abs,
                "round": round,
                "min": min,
                "max": max,
                "sum": sum,
                "len": len,
            }
            
            # Remove potentially dangerous operations
            if any(op in expression for op in ["import", "exec", "eval", "__"]):
                return "Error: Invalid expression"
            
            result = eval(expression, {"__builtins__": {}}, allowed_names)
            return str(result)
        except Exception as e:
            return f"Calculation error: {str(e)}"
    
    return StructuredTool.from_function(
        func=calculate,
        name="calculator",
        description="Perform mathematical calculations",
        args_schema=CalculationInput
    )


def create_datetime_tool() -> BaseTool:
    """
    Create a datetime manipulation tool.
    
    Returns:
        DateTime tool
    """
    def datetime_operation(
        operation: str,
        date_string: Optional[str] = None,
        format: Optional[str] = None
    ) -> str:
        """Perform datetime operations."""
        try:
            if operation == "now":
                return datetime.utcnow().isoformat()
            
            elif operation == "format" and date_string:
                dt = datetime.fromisoformat(date_string)
                fmt = format or "%Y-%m-%d %H:%M:%S"
                return dt.strftime(fmt)
            
            elif operation == "parse" and date_string:
                fmt = format or "%Y-%m-%d"
                dt = datetime.strptime(date_string, fmt)
                return dt.isoformat()
            
            else:
                return f"Unknown operation: {operation}"
                
        except Exception as e:
            return f"DateTime error: {str(e)}"
    
    return StructuredTool.from_function(
        func=datetime_operation,
        name="datetime_tool",
        description="Perform datetime operations",
        args_schema=DateTimeInput
    )


def create_json_tool() -> BaseTool:
    """
    Create a JSON manipulation tool.
    
    Returns:
        JSON tool
    """
    def json_operation(operation: str, data: str) -> str:
        """Perform JSON operations."""
        try:
            if operation == "parse":
                obj = json.loads(data)
                return json.dumps(obj, indent=2)
            
            elif operation == "stringify":
                # Assume data is a Python dict string
                obj = eval(data, {"__builtins__": {}}, {})
                return json.dumps(obj)
            
            elif operation == "validate":
                try:
                    json.loads(data)
                    return "Valid JSON"
                except:
                    return "Invalid JSON"
            
            else:
                return f"Unknown operation: {operation}"
                
        except Exception as e:
            return f"JSON error: {str(e)}"
    
    return StructuredTool.from_function(
        func=json_operation,
        name="json_tool",
        description="Parse, stringify, and validate JSON",
        args_schema=JSONInput
    )


def create_memory_tool(memory_store: Dict[str, Any]) -> BaseTool:
    """
    Create a memory storage tool.
    
    Args:
        memory_store: Dictionary to store memory
        
    Returns:
        Memory tool
    """
    class MemoryInput(BaseModel):
        operation: str = Field(..., description="Operation: store, retrieve, list, clear")
        key: Optional[str] = Field(None, description="Memory key")
        value: Optional[str] = Field(None, description="Value to store")
    
    def memory_operation(
        operation: str,
        key: Optional[str] = None,
        value: Optional[str] = None
    ) -> str:
        """Manage agent memory."""
        try:
            if operation == "store" and key and value:
                memory_store[key] = value
                return f"Stored: {key}"
            
            elif operation == "retrieve" and key:
                return memory_store.get(key, "Not found")
            
            elif operation == "list":
                return json.dumps(list(memory_store.keys()))
            
            elif operation == "clear":
                memory_store.clear()
                return "Memory cleared"
            
            else:
                return f"Invalid operation: {operation}"
                
        except Exception as e:
            return f"Memory error: {str(e)}"
    
    return StructuredTool.from_function(
        func=memory_operation,
        name="memory_tool",
        description="Store and retrieve information in memory",
        args_schema=MemoryInput
    )


def get_base_tools(include_memory: bool = True) -> List[BaseTool]:
    """
    Get all base tools.
    
    Args:
        include_memory: Whether to include memory tool
        
    Returns:
        List of base tools
    """
    tools = []
    
    # Add search tools
    search_tool = create_search_tool()
    if search_tool:
        tools.append(search_tool)
    
    wikipedia_tool = create_wikipedia_tool()
    if wikipedia_tool:
        tools.append(wikipedia_tool)
    
    # Add utility tools
    tools.append(create_calculation_tool())
    tools.append(create_datetime_tool())
    tools.append(create_json_tool())
    
    # Add memory tool
    if include_memory:
        memory_store = {}
        tools.append(create_memory_tool(memory_store))
    
    return tools


def get_tools_for_capability(capability: str) -> List[BaseTool]:
    """
    Get tools appropriate for a specific capability.
    
    Args:
        capability: Agent capability
        
    Returns:
        List of relevant tools
    """
    base_tools = get_base_tools()
    
    if capability == "research":
        # Research agents get all search tools
        return base_tools
    
    elif capability == "analysis":
        # Analysts get calculation and data tools
        return [t for t in base_tools if t.name in ["calculator", "json_tool", "datetime_tool"]]
    
    elif capability == "planning":
        # Planners get datetime and memory tools
        return [t for t in base_tools if t.name in ["datetime_tool", "memory_tool"]]
    
    else:
        # Default: basic tools
        return [t for t in base_tools if t.name in ["calculator", "datetime_tool"]]