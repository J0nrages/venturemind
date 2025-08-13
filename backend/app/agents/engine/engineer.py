"""
Engineer Agent Engine - Code development and technical implementation specialist.

The Engineer agent is responsible for:
- Writing and reviewing code
- Debugging and optimization
- System architecture design
- Technical documentation
- API integration
"""

from typing import List, Dict, Any, AsyncIterator, Optional
import logging
from datetime import datetime
from enum import Enum

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.agents.engine.base import (
    BaseAgent, AgentEvent, AgentRequest, AgentCapability, AgentStatus
)

logger = logging.getLogger(__name__)


class ProgrammingLanguage(str, Enum):
    """Supported programming languages."""
    PYTHON = "python"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"
    GO = "go"
    RUST = "rust"
    JAVA = "java"
    CPP = "cpp"
    SQL = "sql"
    BASH = "bash"


class CodeTask(str, Enum):
    """Types of coding tasks."""
    IMPLEMENT = "implement"
    DEBUG = "debug"
    REVIEW = "review"
    OPTIMIZE = "optimize"
    REFACTOR = "refactor"
    TEST = "test"
    DOCUMENT = "document"
    INTEGRATE = "integrate"


class CodeRequest(BaseModel):
    """Represents a coding request."""
    task: CodeTask = Field(..., description="Type of coding task")
    description: str = Field(..., description="Task description")
    language: Optional[ProgrammingLanguage] = Field(None, description="Programming language")
    context: Optional[str] = Field(None, description="Additional context or existing code")
    requirements: List[str] = Field(default_factory=list, description="Specific requirements")
    constraints: List[str] = Field(default_factory=list, description="Constraints or limitations")


class CodeOutput(BaseModel):
    """Represents code output."""
    code: str = Field(..., description="Generated or modified code")
    language: ProgrammingLanguage = Field(..., description="Programming language")
    explanation: str = Field(..., description="Explanation of the code")
    tests: Optional[str] = Field(None, description="Test code if applicable")
    documentation: Optional[str] = Field(None, description="Documentation or comments")
    complexity: str = Field(default="medium", description="Code complexity assessment")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")


class EngineerAgent(BaseAgent):
    """
    Engineer Agent - The technical implementation specialist of the Syna system.
    
    Specializes in:
    - Code generation and modification
    - Debugging and troubleshooting
    - Performance optimization
    - System design and architecture
    - Technical documentation
    """
    
    def _initialize(self) -> None:
        """Initialize engineer-specific components."""
        self.capabilities = [
            AgentCapability.CODING,
            AgentCapability.ANALYSIS,
            AgentCapability.REVIEW,
            AgentCapability.INTEGRATION
        ]
        
        # Code patterns and best practices cache
        self.patterns_cache: Dict[str, Any] = {}
        
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the engineer's prompt template."""
        return ChatPromptTemplate.from_messages([
            ("system", """You are the Engineer Agent, an expert software developer and technical architect.

Your responsibilities:
1. Write clean, efficient, and maintainable code
2. Debug and fix issues in existing code
3. Optimize performance and resource usage
4. Design robust system architectures
5. Create comprehensive technical documentation

Engineering principles:
- Follow SOLID principles and design patterns
- Write self-documenting code with clear naming
- Include appropriate error handling
- Consider security implications
- Optimize for readability and maintainability
- Write testable code

Supported languages: {languages}
Available tasks: {tasks}

When coding:
1. Understand requirements thoroughly
2. Consider edge cases and error scenarios
3. Follow language-specific best practices
4. Include helpful comments
5. Suggest tests when appropriate"""),
            ("human", "{query}"),
            ("system", "Provide high-quality code that follows best practices.")
        ])
    
    async def _execute_core(
        self,
        request: AgentRequest,
        messages: List[BaseMessage]
    ) -> AsyncIterator[AgentEvent]:
        """
        Core engineering logic.
        
        Args:
            request: The engineering request
            messages: Conversation history
            
        Yields:
            AgentEvent: Engineering events
        """
        try:
            # Update status
            self.status = AgentStatus.EXECUTING
            yield self._create_event("engineering_started", {
                "query": request.query
            })
            
            # Parse the code request
            code_request = self._parse_code_request(request.query)
            
            yield self._create_event("task_identified", {
                "task": code_request.task.value,
                "language": code_request.language.value if code_request.language else "auto-detect"
            })
            
            # Execute based on task type
            if code_request.task == CodeTask.IMPLEMENT:
                output = await self._implement_code(code_request)
            elif code_request.task == CodeTask.DEBUG:
                output = await self._debug_code(code_request)
            elif code_request.task == CodeTask.REVIEW:
                output = await self._review_code(code_request)
            elif code_request.task == CodeTask.OPTIMIZE:
                output = await self._optimize_code(code_request)
            elif code_request.task == CodeTask.REFACTOR:
                output = await self._refactor_code(code_request)
            elif code_request.task == CodeTask.TEST:
                output = await self._write_tests(code_request)
            else:
                output = await self._general_coding(code_request)
            
            # Emit the code output
            yield self._create_event("code_generated", {
                "output": output.dict(),
                "lines_of_code": len(output.code.split('\n')),
                "language": output.language.value
            })
            
            # Store in context for other agents
            if request.context:
                request.context.metadata["code_output"] = output.dict()
            
            yield self._create_event("engineering_complete", {
                "task": code_request.task.value,
                "success": True
            })
            
        except Exception as e:
            logger.error(f"Engineering failed: {e}", exc_info=True)
            yield self._create_event("engineering_failed", {
                "error": str(e)
            })
            raise
    
    def _parse_code_request(self, query: str) -> CodeRequest:
        """
        Parse a coding request.
        
        Args:
            query: User's request
            
        Returns:
            Structured code request
        """
        # Detect task type
        query_lower = query.lower()
        
        if "debug" in query_lower or "fix" in query_lower:
            task = CodeTask.DEBUG
        elif "review" in query_lower:
            task = CodeTask.REVIEW
        elif "optimize" in query_lower or "performance" in query_lower:
            task = CodeTask.OPTIMIZE
        elif "refactor" in query_lower:
            task = CodeTask.REFACTOR
        elif "test" in query_lower:
            task = CodeTask.TEST
        else:
            task = CodeTask.IMPLEMENT
        
        # Detect language
        language = None
        for lang in ProgrammingLanguage:
            if lang.value in query_lower:
                language = lang
                break
        
        # If no language detected, try common patterns
        if not language:
            if "api" in query_lower or "backend" in query_lower:
                language = ProgrammingLanguage.PYTHON
            elif "frontend" in query_lower or "react" in query_lower:
                language = ProgrammingLanguage.TYPESCRIPT
            elif "script" in query_lower:
                language = ProgrammingLanguage.PYTHON
        
        return CodeRequest(
            task=task,
            description=query,
            language=language,
            requirements=[],
            constraints=[]
        )
    
    async def _implement_code(self, request: CodeRequest) -> CodeOutput:
        """
        Implement new code.
        
        Args:
            request: Code request
            
        Returns:
            Code output
        """
        prompt = f"""
Task: Implement the following
Description: {request.description}
Language: {request.language.value if request.language else 'Choose appropriate language'}

Requirements:
{chr(10).join(f'- {req}' for req in request.requirements) if request.requirements else 'None specified'}

Please provide:
1. Complete, working code
2. Clear explanation
3. Any necessary imports or dependencies
4. Example usage if applicable
"""
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=prompt)])
            
            # Parse response
            code = self._extract_code(response.content)
            explanation = self._extract_explanation(response.content)
            
            return CodeOutput(
                code=code,
                language=request.language or ProgrammingLanguage.PYTHON,
                explanation=explanation,
                documentation=self._generate_docs(code),
                complexity=self._assess_complexity(code),
                suggestions=[]
            )
            
        except Exception as e:
            logger.error(f"Code implementation failed: {e}")
            return CodeOutput(
                code="# Error generating code",
                language=request.language or ProgrammingLanguage.PYTHON,
                explanation=f"Failed to generate code: {str(e)}",
                complexity="unknown",
                suggestions=["Please refine your request and try again"]
            )
    
    async def _debug_code(self, request: CodeRequest) -> CodeOutput:
        """
        Debug existing code.
        
        Args:
            request: Code request with problematic code
            
        Returns:
            Fixed code output
        """
        prompt = f"""
Task: Debug and fix the following code
Problem: {request.description}

Code to debug:
{request.context or 'No code provided'}

Please:
1. Identify the issue(s)
2. Provide fixed code
3. Explain what was wrong and how you fixed it
"""
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return CodeOutput(
            code=self._extract_code(response.content),
            language=request.language or ProgrammingLanguage.PYTHON,
            explanation=response.content,
            suggestions=["Add error handling", "Write tests to prevent regression"]
        )
    
    async def _review_code(self, request: CodeRequest) -> CodeOutput:
        """
        Review code for improvements.
        
        Args:
            request: Code request with code to review
            
        Returns:
            Review output
        """
        prompt = f"""
Task: Review the following code
Code:
{request.context or request.description}

Please provide:
1. Code quality assessment
2. Security concerns if any
3. Performance considerations
4. Suggested improvements
5. Best practices violations if any
"""
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        # Extract suggestions from response
        suggestions = self._extract_suggestions(response.content)
        
        return CodeOutput(
            code=request.context or "",  # Return original code
            language=request.language or ProgrammingLanguage.PYTHON,
            explanation=response.content,
            suggestions=suggestions,
            complexity=self._assess_complexity(request.context or "")
        )
    
    async def _optimize_code(self, request: CodeRequest) -> CodeOutput:
        """
        Optimize code for performance.
        
        Args:
            request: Code request
            
        Returns:
            Optimized code
        """
        prompt = f"""
Task: Optimize the following code for performance
Code:
{request.context or request.description}

Focus on:
1. Time complexity improvements
2. Space complexity improvements
3. Resource usage optimization
4. Parallelization opportunities
"""
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return CodeOutput(
            code=self._extract_code(response.content),
            language=request.language or ProgrammingLanguage.PYTHON,
            explanation="Performance optimizations applied:\n" + response.content,
            suggestions=["Profile the code to verify improvements", "Consider caching strategies"]
        )
    
    async def _refactor_code(self, request: CodeRequest) -> CodeOutput:
        """
        Refactor code for better structure.
        
        Args:
            request: Code request
            
        Returns:
            Refactored code
        """
        prompt = f"""
Task: Refactor the following code
Code:
{request.context or request.description}

Focus on:
1. Improving code structure
2. Applying design patterns
3. Enhancing readability
4. Reducing duplication
"""
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return CodeOutput(
            code=self._extract_code(response.content),
            language=request.language or ProgrammingLanguage.PYTHON,
            explanation="Refactoring applied:\n" + response.content,
            suggestions=["Update tests after refactoring", "Document the new structure"]
        )
    
    async def _write_tests(self, request: CodeRequest) -> CodeOutput:
        """
        Write tests for code.
        
        Args:
            request: Code request
            
        Returns:
            Test code
        """
        prompt = f"""
Task: Write comprehensive tests
Code to test:
{request.context or request.description}

Include:
1. Unit tests
2. Edge cases
3. Error scenarios
4. Integration tests if applicable
"""
        
        response = await self.llm.ainvoke([HumanMessage(content=prompt)])
        
        return CodeOutput(
            code=self._extract_code(response.content),
            language=request.language or ProgrammingLanguage.PYTHON,
            explanation="Test coverage:\n" + response.content,
            tests=self._extract_code(response.content),
            suggestions=["Run tests with coverage report", "Add performance tests"]
        )
    
    async def _general_coding(self, request: CodeRequest) -> CodeOutput:
        """
        Handle general coding requests.
        
        Args:
            request: Code request
            
        Returns:
            Code output
        """
        return await self._implement_code(request)
    
    def _extract_code(self, text: str) -> str:
        """
        Extract code blocks from text.
        
        Args:
            text: Text containing code
            
        Returns:
            Extracted code
        """
        # Look for code blocks
        if "```" in text:
            parts = text.split("```")
            for i, part in enumerate(parts):
                if i % 2 == 1:  # Odd indices are code blocks
                    # Remove language identifier if present
                    lines = part.split('\n')
                    if lines and lines[0].strip().isalpha():
                        return '\n'.join(lines[1:])
                    return part
        
        # Return as-is if no code blocks found
        return text
    
    def _extract_explanation(self, text: str) -> str:
        """
        Extract explanation from response.
        
        Args:
            text: Response text
            
        Returns:
            Explanation
        """
        # Remove code blocks to get explanation
        if "```" in text:
            parts = text.split("```")
            explanation_parts = [parts[i] for i in range(len(parts)) if i % 2 == 0]
            return ' '.join(explanation_parts).strip()
        return text
    
    def _extract_suggestions(self, text: str) -> List[str]:
        """
        Extract suggestions from text.
        
        Args:
            text: Review text
            
        Returns:
            List of suggestions
        """
        suggestions = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if line.startswith('-') or line.startswith('*') or line.startswith('•'):
                suggestions.append(line[1:].strip())
        
        return suggestions[:10]  # Limit to 10 suggestions
    
    def _generate_docs(self, code: str) -> str:
        """
        Generate documentation for code.
        
        Args:
            code: Code to document
            
        Returns:
            Documentation
        """
        # Simple documentation generation
        lines = code.split('\n')
        if lines:
            return f"Code implementation with {len(lines)} lines"
        return "No documentation generated"
    
    def _assess_complexity(self, code: str) -> str:
        """
        Assess code complexity.
        
        Args:
            code: Code to assess
            
        Returns:
            Complexity assessment
        """
        lines = code.split('\n')
        line_count = len(lines)
        
        if line_count < 20:
            return "low"
        elif line_count < 100:
            return "medium"
        else:
            return "high"