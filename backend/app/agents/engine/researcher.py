"""
Researcher Agent Engine - Information gathering and analysis specialist.

The Researcher agent is responsible for:
- Web searching and information retrieval
- Documentation lookup and analysis
- Fact-checking and verification
- Knowledge synthesis and summarization
"""

from typing import List, Dict, Any, AsyncIterator, Optional
import json
import logging
from datetime import datetime

from langchain_core.messages import BaseMessage, HumanMessage, AIMessage
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import BaseTool
from langchain.tools import DuckDuckGoSearchRun
from langchain_community.tools import WikipediaQueryRun
from langchain_community.utilities import WikipediaAPIWrapper
from pydantic import BaseModel, Field

from app.agents.engine.base import (
    BaseAgent, AgentEvent, AgentRequest, AgentCapability, AgentStatus
)

logger = logging.getLogger(__name__)


class ResearchResult(BaseModel):
    """Represents a research finding."""
    source: str = Field(..., description="Source of the information")
    url: Optional[str] = Field(None, description="URL if available")
    title: str = Field(..., description="Title or heading")
    content: str = Field(..., description="Content or summary")
    relevance_score: float = Field(default=0.0, description="Relevance score (0-1)")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ResearchReport(BaseModel):
    """Complete research report."""
    query: str = Field(..., description="Original research query")
    summary: str = Field(..., description="Executive summary of findings")
    findings: List[ResearchResult] = Field(..., description="Detailed findings")
    conclusions: List[str] = Field(..., description="Key conclusions")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations if applicable")
    sources_count: int = Field(..., description="Number of sources consulted")
    confidence_score: float = Field(..., description="Overall confidence in findings (0-1)")


class ResearcherAgent(BaseAgent):
    """
    Researcher Agent - The information specialist of the Syna system.
    
    Specializes in:
    - Information retrieval and synthesis
    - Web search and documentation lookup
    - Fact-checking and verification
    - Knowledge organization and summarization
    """
    
    def _initialize(self) -> None:
        """Initialize researcher-specific components."""
        self.capabilities = [
            AgentCapability.RESEARCH,
            AgentCapability.ANALYSIS,
            AgentCapability.MEMORY_ACCESS
        ]
        
        # Initialize search tools if not provided
        if not self.tools:
            self.tools = self._create_default_tools()
        
        # Cache for search results
        self.search_cache: Dict[str, List[Dict]] = {}
        
    def _create_default_tools(self) -> List[BaseTool]:
        """Create default research tools."""
        tools = []
        
        try:
            # Web search tool
            search_tool = DuckDuckGoSearchRun()
            tools.append(search_tool)
        except Exception as e:
            logger.warning(f"Could not initialize web search: {e}")
        
        try:
            # Wikipedia tool
            wikipedia_wrapper = WikipediaAPIWrapper(
                top_k_results=3,
                doc_content_chars_max=4000
            )
            wikipedia_tool = WikipediaQueryRun(api_wrapper=wikipedia_wrapper)
            tools.append(wikipedia_tool)
        except Exception as e:
            logger.warning(f"Could not initialize Wikipedia tool: {e}")
        
        return tools
    
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the researcher's prompt template."""
        return ChatPromptTemplate.from_messages([
            ("system", """You are the Researcher Agent, an expert at finding, analyzing, and synthesizing information.

Your responsibilities:
1. Search for relevant information from multiple sources
2. Verify facts and cross-reference information
3. Synthesize findings into clear, actionable insights
4. Identify knowledge gaps and uncertainties
5. Provide well-sourced, accurate information

Research principles:
- Always cite your sources
- Distinguish between facts and opinions
- Note confidence levels in your findings
- Highlight conflicting information when found
- Prioritize recent and authoritative sources

Available tools: {tools}

When researching:
1. Start with a broad search to understand the topic
2. Deep dive into specific aspects
3. Cross-reference information from multiple sources
4. Synthesize findings into a coherent narrative
5. Draw conclusions and make recommendations"""),
            ("human", "{query}"),
            ("system", "Conduct thorough research on this topic and provide comprehensive findings.")
        ])
    
    async def _execute_core(
        self,
        request: AgentRequest,
        messages: List[BaseMessage]
    ) -> AsyncIterator[AgentEvent]:
        """
        Core research logic.
        
        Args:
            request: The research request
            messages: Conversation history
            
        Yields:
            AgentEvent: Research events
        """
        try:
            # Update status
            self.status = AgentStatus.EXECUTING
            yield self._create_event("research_started", {
                "query": request.query,
                "tools_available": [tool.name for tool in self.tools]
            })
            
            # Phase 1: Initial search
            yield self._create_event("phase", {
                "phase": "initial_search",
                "message": "Conducting initial search..."
            })
            
            search_results = await self._conduct_search(request.query)
            
            if search_results:
                yield self._create_event("search_results", {
                    "count": len(search_results),
                    "sources": [r.get("source", "unknown") for r in search_results]
                })
            
            # Phase 2: Deep dive on specific aspects
            yield self._create_event("phase", {
                "phase": "deep_dive",
                "message": "Analyzing findings in detail..."
            })
            
            # Use LLM to analyze search results
            analysis = await self._analyze_findings(request.query, search_results)
            
            # Phase 3: Synthesis
            yield self._create_event("phase", {
                "phase": "synthesis",
                "message": "Synthesizing information..."
            })
            
            # Create research report
            report = await self._create_report(request.query, search_results, analysis)
            
            # Emit the complete report
            yield self._create_event("research_complete", {
                "report": report
            })
            
            # Store in context for other agents
            if request.context:
                request.context.metadata["research_report"] = report
            
        except Exception as e:
            logger.error(f"Research failed: {e}", exc_info=True)
            yield self._create_event("research_failed", {
                "error": str(e)
            })
            raise
    
    async def _conduct_search(self, query: str) -> List[Dict[str, Any]]:
        """
        Conduct searches using available tools.
        
        Args:
            query: Search query
            
        Returns:
            List of search results
        """
        # Check cache first
        if query in self.search_cache:
            logger.info(f"Using cached results for: {query}")
            return self.search_cache[query]
        
        results = []
        
        for tool in self.tools:
            try:
                if hasattr(tool, 'run'):
                    # Synchronous tool
                    result = tool.run(query)
                elif hasattr(tool, 'arun'):
                    # Asynchronous tool
                    result = await tool.arun(query)
                else:
                    continue
                
                # Parse and structure the result
                if isinstance(result, str):
                    results.append({
                        "source": tool.name,
                        "content": result,
                        "timestamp": datetime.utcnow().isoformat()
                    })
                elif isinstance(result, dict):
                    result["source"] = tool.name
                    results.append(result)
                elif isinstance(result, list):
                    for item in result:
                        if isinstance(item, dict):
                            item["source"] = tool.name
                            results.append(item)
                
            except Exception as e:
                logger.warning(f"Search tool {tool.name} failed: {e}")
        
        # Cache results
        self.search_cache[query] = results
        
        return results
    
    async def _analyze_findings(
        self,
        query: str,
        search_results: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Analyze search results using LLM.
        
        Args:
            query: Original query
            search_results: Raw search results
            
        Returns:
            Analysis dictionary
        """
        if not search_results:
            return {
                "summary": "No search results found.",
                "key_points": [],
                "confidence": 0.0
            }
        
        # Prepare context for LLM
        context = f"Research Query: {query}\n\nSearch Results:\n"
        for i, result in enumerate(search_results[:10], 1):  # Limit to top 10
            context += f"\n{i}. Source: {result.get('source', 'Unknown')}\n"
            context += f"   Content: {result.get('content', '')[:500]}...\n"
        
        analysis_prompt = f"""{context}

Based on these search results, provide:
1. A comprehensive summary of the findings
2. Key points and insights
3. Any conflicting information found
4. Confidence level in the findings (0-1)
5. Gaps in the available information"""
        
        try:
            response = await self.llm.ainvoke([HumanMessage(content=analysis_prompt)])
            
            # Parse the response (in production, use structured output)
            return {
                "summary": response.content,
                "key_points": self._extract_key_points(response.content),
                "confidence": 0.8  # Would be extracted from LLM response
            }
        except Exception as e:
            logger.error(f"Analysis failed: {e}")
            return {
                "summary": "Analysis failed",
                "key_points": [],
                "confidence": 0.0
            }
    
    def _extract_key_points(self, text: str) -> List[str]:
        """
        Extract key points from text.
        
        Args:
            text: Text to extract from
            
        Returns:
            List of key points
        """
        # Simple extraction - in production, use NLP
        lines = text.split('\n')
        key_points = []
        
        for line in lines:
            line = line.strip()
            if line and (
                line.startswith('-') or
                line.startswith('•') or
                line.startswith('*') or
                (len(line) > 20 and len(line) < 200)
            ):
                # Clean up the line
                if line[0] in ['-', '•', '*']:
                    line = line[1:].strip()
                key_points.append(line)
        
        return key_points[:10]  # Limit to top 10 points
    
    async def _create_report(
        self,
        query: str,
        search_results: List[Dict[str, Any]],
        analysis: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a structured research report.
        
        Args:
            query: Original query
            search_results: Raw search results
            analysis: Analysis results
            
        Returns:
            Research report dictionary
        """
        # Structure findings
        findings = []
        for result in search_results[:10]:
            findings.append({
                "source": result.get("source", "Unknown"),
                "url": result.get("url"),
                "title": result.get("title", "Untitled"),
                "content": result.get("content", "")[:500],
                "relevance_score": 0.8,  # Would be calculated
                "timestamp": result.get("timestamp", datetime.utcnow().isoformat()),
                "metadata": result.get("metadata", {})
            })
        
        # Create report
        report = {
            "query": query,
            "summary": analysis.get("summary", ""),
            "findings": findings,
            "conclusions": analysis.get("key_points", []),
            "recommendations": [],  # Would be generated based on findings
            "sources_count": len(search_results),
            "confidence_score": analysis.get("confidence", 0.5),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        return report