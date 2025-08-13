"""
Writer Agent Engine - Content creation and documentation specialist.

The Writer agent is responsible for:
- Creating written content (reports, documentation, articles)
- Editing and improving existing text
- Formatting and structuring documents
- Maintaining consistent tone and style
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


class WritingStyle(str, Enum):
    """Writing styles available."""
    PROFESSIONAL = "professional"
    CASUAL = "casual"
    TECHNICAL = "technical"
    CREATIVE = "creative"
    ACADEMIC = "academic"
    MARKETING = "marketing"
    JOURNALISTIC = "journalistic"


class DocumentType(str, Enum):
    """Types of documents the writer can create."""
    REPORT = "report"
    ARTICLE = "article"
    DOCUMENTATION = "documentation"
    EMAIL = "email"
    PROPOSAL = "proposal"
    BLOG_POST = "blog_post"
    PRESENTATION = "presentation"
    README = "readme"
    USER_GUIDE = "user_guide"


class WritingTask(BaseModel):
    """Represents a writing task."""
    type: DocumentType = Field(..., description="Type of document")
    topic: str = Field(..., description="Topic or subject")
    audience: str = Field(..., description="Target audience")
    style: WritingStyle = Field(default=WritingStyle.PROFESSIONAL)
    length: Optional[str] = Field(None, description="Desired length")
    outline: Optional[List[str]] = Field(None, description="Document outline")
    keywords: List[str] = Field(default_factory=list, description="Keywords to include")
    requirements: List[str] = Field(default_factory=list, description="Specific requirements")


class WrittenContent(BaseModel):
    """Represents written content output."""
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Main content")
    summary: str = Field(..., description="Executive summary")
    sections: List[Dict[str, str]] = Field(default_factory=list, description="Document sections")
    metadata: Dict[str, Any] = Field(default_factory=dict)
    word_count: int = Field(..., description="Total word count")
    reading_time: int = Field(..., description="Estimated reading time in minutes")


class WriterAgent(BaseAgent):
    """
    Writer Agent - The content creation specialist of the Syna system.
    
    Specializes in:
    - Content generation and editing
    - Document structuring and formatting
    - Maintaining consistent tone and style
    - Creating various types of written materials
    """
    
    def _initialize(self) -> None:
        """Initialize writer-specific components."""
        self.capabilities = [
            AgentCapability.WRITING,
            AgentCapability.REVIEW,
            AgentCapability.ANALYSIS
        ]
        
        # Writing context cache
        self.context_cache: Dict[str, Any] = {}
        
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the writer's prompt template."""
        return ChatPromptTemplate.from_messages([
            ("system", """You are the Writer Agent, an expert at creating high-quality written content.

Your responsibilities:
1. Create clear, engaging, and well-structured content
2. Adapt writing style to match the audience and purpose
3. Ensure accuracy and consistency throughout documents
4. Format content appropriately for the medium
5. Edit and refine text for clarity and impact

Writing principles:
- Know your audience and write for them
- Start with a clear structure and outline
- Use appropriate tone and vocabulary
- Include relevant examples and evidence
- Ensure logical flow between sections
- Proofread for grammar and clarity

Available writing styles: {styles}
Document types you can create: {doc_types}

When writing:
1. Understand the requirements and constraints
2. Research the topic if needed
3. Create an outline or structure
4. Write clear, concise content
5. Review and refine the output"""),
            ("human", "{query}"),
            ("system", "Create the requested written content following best practices.")
        ])
    
    async def _execute_core(
        self,
        request: AgentRequest,
        messages: List[BaseMessage]
    ) -> AsyncIterator[AgentEvent]:
        """
        Core writing logic.
        
        Args:
            request: The writing request
            messages: Conversation history
            
        Yields:
            AgentEvent: Writing events
        """
        try:
            # Update status
            self.status = AgentStatus.EXECUTING
            yield self._create_event("writing_started", {
                "query": request.query
            })
            
            # Parse the writing task
            task = self._parse_writing_task(request.query)
            
            yield self._create_event("task_parsed", {
                "document_type": task.type,
                "style": task.style,
                "audience": task.audience
            })
            
            # Phase 1: Planning
            yield self._create_event("phase", {
                "phase": "planning",
                "message": "Creating document outline..."
            })
            
            outline = await self._create_outline(task)
            
            yield self._create_event("outline_created", {
                "sections": len(outline),
                "outline": outline
            })
            
            # Phase 2: Writing
            yield self._create_event("phase", {
                "phase": "writing",
                "message": "Writing content..."
            })
            
            content = await self._write_content(task, outline)
            
            # Phase 3: Editing
            yield self._create_event("phase", {
                "phase": "editing",
                "message": "Reviewing and refining..."
            })
            
            final_content = await self._edit_content(content, task)
            
            # Calculate metrics
            word_count = len(final_content.content.split())
            reading_time = max(1, word_count // 200)  # Average reading speed
            
            final_content.word_count = word_count
            final_content.reading_time = reading_time
            
            # Emit the final content
            yield self._create_event("writing_complete", {
                "content": final_content.dict(),
                "word_count": word_count,
                "reading_time": reading_time
            })
            
            # Store in context for other agents
            if request.context:
                request.context.metadata["written_content"] = final_content.dict()
            
        except Exception as e:
            logger.error(f"Writing failed: {e}", exc_info=True)
            yield self._create_event("writing_failed", {
                "error": str(e)
            })
            raise
    
    def _parse_writing_task(self, query: str) -> WritingTask:
        """
        Parse a writing request into a structured task.
        
        Args:
            query: User's writing request
            
        Returns:
            Structured writing task
        """
        # Simple parsing - in production, use NLP or LLM
        task = WritingTask(
            type=DocumentType.ARTICLE,  # Default
            topic=query,
            audience="general",
            style=WritingStyle.PROFESSIONAL
        )
        
        # Check for document type keywords
        query_lower = query.lower()
        for doc_type in DocumentType:
            if doc_type.value.replace("_", " ") in query_lower:
                task.type = doc_type
                break
        
        # Check for style indicators
        if "technical" in query_lower:
            task.style = WritingStyle.TECHNICAL
        elif "creative" in query_lower:
            task.style = WritingStyle.CREATIVE
        elif "academic" in query_lower:
            task.style = WritingStyle.ACADEMIC
        elif "marketing" in query_lower or "sales" in query_lower:
            task.style = WritingStyle.MARKETING
        
        return task
    
    async def _create_outline(self, task: WritingTask) -> List[str]:
        """
        Create a document outline.
        
        Args:
            task: Writing task
            
        Returns:
            Document outline
        """
        if task.outline:
            return task.outline
        
        # Generate outline based on document type
        if task.type == DocumentType.REPORT:
            outline = [
                "Executive Summary",
                "Introduction",
                "Methodology",
                "Findings",
                "Analysis",
                "Recommendations",
                "Conclusion"
            ]
        elif task.type == DocumentType.ARTICLE:
            outline = [
                "Introduction",
                "Main Points",
                "Supporting Evidence",
                "Conclusion"
            ]
        elif task.type == DocumentType.DOCUMENTATION:
            outline = [
                "Overview",
                "Getting Started",
                "Features",
                "Usage",
                "Examples",
                "API Reference",
                "Troubleshooting"
            ]
        elif task.type == DocumentType.PROPOSAL:
            outline = [
                "Executive Summary",
                "Problem Statement",
                "Proposed Solution",
                "Implementation Plan",
                "Timeline",
                "Budget",
                "Conclusion"
            ]
        else:
            # Generic outline
            outline = [
                "Introduction",
                "Main Content",
                "Conclusion"
            ]
        
        return outline
    
    async def _write_content(
        self,
        task: WritingTask,
        outline: List[str]
    ) -> WrittenContent:
        """
        Write the actual content.
        
        Args:
            task: Writing task
            outline: Document outline
            
        Returns:
            Written content
        """
        # Format the prompt
        prompt = self._create_prompt()
        
        writing_prompt = f"""
Create a {task.type.value} about: {task.topic}

Target audience: {task.audience}
Writing style: {task.style.value}
Document outline:
{chr(10).join(f'- {section}' for section in outline)}

Requirements:
{chr(10).join(f'- {req}' for req in task.requirements) if task.requirements else 'None specified'}

Keywords to include: {', '.join(task.keywords) if task.keywords else 'None specified'}

Please write comprehensive content following this structure.
"""
        
        try:
            # Generate content using LLM
            response = await self.llm.ainvoke([HumanMessage(content=writing_prompt)])
            
            # Parse response into structured content
            content = WrittenContent(
                title=self._extract_title(task.topic),
                content=response.content,
                summary=self._generate_summary(response.content),
                sections=self._parse_sections(response.content, outline),
                metadata={
                    "type": task.type.value,
                    "style": task.style.value,
                    "audience": task.audience,
                    "created_at": datetime.utcnow().isoformat()
                },
                word_count=0,  # Will be calculated later
                reading_time=0  # Will be calculated later
            )
            
            return content
            
        except Exception as e:
            logger.error(f"Content generation failed: {e}")
            # Return basic content as fallback
            return WrittenContent(
                title=task.topic,
                content=f"Content about {task.topic}",
                summary="Summary pending",
                sections=[],
                metadata={},
                word_count=0,
                reading_time=0
            )
    
    async def _edit_content(
        self,
        content: WrittenContent,
        task: WritingTask
    ) -> WrittenContent:
        """
        Edit and refine content.
        
        Args:
            content: Initial content
            task: Writing task
            
        Returns:
            Edited content
        """
        # In production, this would use LLM for editing
        # For now, just return the content with minor processing
        
        # Clean up whitespace
        content.content = " ".join(content.content.split())
        
        # Ensure summary exists
        if not content.summary:
            content.summary = self._generate_summary(content.content)
        
        return content
    
    def _extract_title(self, topic: str) -> str:
        """
        Extract or generate a title.
        
        Args:
            topic: Topic description
            
        Returns:
            Document title
        """
        # Simple title extraction
        if len(topic) < 100:
            return topic.title()
        else:
            # Take first sentence or phrase
            sentences = topic.split(".")
            return sentences[0].strip().title()
    
    def _generate_summary(self, content: str) -> str:
        """
        Generate a summary of the content.
        
        Args:
            content: Full content
            
        Returns:
            Summary
        """
        # Simple summary - take first 200 characters
        if len(content) > 200:
            summary = content[:200].rsplit(" ", 1)[0] + "..."
        else:
            summary = content
        
        return summary
    
    def _parse_sections(
        self,
        content: str,
        outline: List[str]
    ) -> List[Dict[str, str]]:
        """
        Parse content into sections.
        
        Args:
            content: Full content
            outline: Expected sections
            
        Returns:
            List of sections
        """
        sections = []
        
        # Try to find section headers in content
        for section_name in outline:
            # Look for section header
            if section_name.lower() in content.lower():
                sections.append({
                    "name": section_name,
                    "content": f"Content for {section_name}"  # Placeholder
                })
        
        return sections