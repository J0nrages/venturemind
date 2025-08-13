"""
Critic Agent Engine - Review and quality assurance specialist.

The Critic agent is responsible for:
- Reviewing and validating work
- Quality assurance
- Providing constructive feedback
- Identifying improvements
- Ensuring standards compliance
- Risk assessment
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


class ReviewType(str, Enum):
    """Types of reviews."""
    CODE = "code"
    CONTENT = "content"
    DESIGN = "design"
    STRATEGY = "strategy"
    PROCESS = "process"
    SECURITY = "security"
    PERFORMANCE = "performance"
    COMPLIANCE = "compliance"
    GENERAL = "general"


class ReviewSeverity(str, Enum):
    """Severity levels for issues."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"


class ReviewAspect(str, Enum):
    """Aspects to review."""
    CORRECTNESS = "correctness"
    COMPLETENESS = "completeness"
    CLARITY = "clarity"
    EFFICIENCY = "efficiency"
    SECURITY = "security"
    MAINTAINABILITY = "maintainability"
    USABILITY = "usability"
    COMPLIANCE = "compliance"


class ReviewRequest(BaseModel):
    """Represents a review request."""
    type: ReviewType = Field(..., description="Type of review")
    subject: str = Field(..., description="What to review")
    content: Optional[str] = Field(None, description="Content to review")
    aspects: List[ReviewAspect] = Field(default_factory=list, description="Aspects to focus on")
    standards: List[str] = Field(default_factory=list, description="Standards to check against")
    context: Dict[str, Any] = Field(default_factory=dict, description="Additional context")


class ReviewFinding(BaseModel):
    """A single review finding."""
    aspect: ReviewAspect = Field(..., description="Aspect reviewed")
    severity: ReviewSeverity = Field(..., description="Issue severity")
    location: Optional[str] = Field(None, description="Location of issue")
    issue: str = Field(..., description="Issue description")
    suggestion: str = Field(..., description="Improvement suggestion")
    example: Optional[str] = Field(None, description="Example of fix")


class ReviewResult(BaseModel):
    """Complete review result."""
    overall_score: float = Field(..., description="Overall quality score (0-10)")
    summary: str = Field(..., description="Executive summary")
    strengths: List[str] = Field(default_factory=list, description="Identified strengths")
    findings: List[ReviewFinding] = Field(default_factory=list, description="Issues found")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations")
    risks: List[Dict[str, Any]] = Field(default_factory=list, description="Identified risks")
    approval_status: str = Field(..., description="Approval status")
    requires_revision: bool = Field(..., description="Whether revision is needed")
    review_metadata: Dict[str, Any] = Field(default_factory=dict, description="Review metadata")


class CriticAgent(BaseAgent):
    """
    Critic Agent - The quality assurance and review specialist of the Syna system.
    
    Specializes in:
    - Comprehensive reviews and assessments
    - Quality validation
    - Risk identification
    - Standards compliance
    - Constructive feedback
    """
    
    def _initialize(self) -> None:
        """Initialize critic-specific components."""
        self.capabilities = [
            AgentCapability.REVIEW,
            AgentCapability.ANALYSIS,
            AgentCapability.PLANNING
        ]
        
        # Review history cache
        self.review_history: List[Dict[str, Any]] = []
        
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the critic's prompt template."""
        return ChatPromptTemplate.from_messages([
            ("system", """You are the Critic Agent, responsible for thorough review and quality assurance.

Your responsibilities:
1. Review work for quality and correctness
2. Identify issues and risks
3. Provide constructive feedback
4. Ensure standards compliance
5. Suggest improvements

Review principles:
- Be thorough but constructive
- Focus on actionable feedback
- Prioritize critical issues
- Acknowledge strengths
- Provide specific examples
- Consider context and constraints

Review types: {review_types}
Severity levels: critical, high, medium, low, info

When reviewing:
1. Understand the requirements and context
2. Assess against relevant standards
3. Identify strengths and weaknesses
4. Provide specific, actionable feedback
5. Suggest concrete improvements"""),
            ("human", "{query}"),
            ("system", "Provide a comprehensive review with constructive feedback.")
        ])
    
    async def _execute_core(
        self,
        request: AgentRequest,
        messages: List[BaseMessage]
    ) -> AsyncIterator[AgentEvent]:
        """
        Core review logic.
        
        Args:
            request: The review request
            messages: Conversation history
            
        Yields:
            AgentEvent: Review events
        """
        try:
            # Update status
            self.status = AgentStatus.EXECUTING
            yield self._create_event("review_started", {
                "query": request.query
            })
            
            # Parse the review request
            review_request = self._parse_review_request(request.query)
            
            yield self._create_event("review_type_identified", {
                "type": review_request.type.value,
                "aspects": [a.value for a in review_request.aspects]
            })
            
            # Phase 1: Initial assessment
            yield self._create_event("phase", {
                "phase": "assessment",
                "message": "Performing initial assessment..."
            })
            
            initial_assessment = await self._initial_assessment(review_request)
            
            yield self._create_event("assessment_complete", {
                "scope": initial_assessment["scope"],
                "complexity": initial_assessment["complexity"]
            })
            
            # Phase 2: Detailed review
            yield self._create_event("phase", {
                "phase": "detailed_review",
                "message": f"Conducting {review_request.type.value} review..."
            })
            
            # Perform review based on type
            if review_request.type == ReviewType.CODE:
                result = await self._review_code(review_request)
            elif review_request.type == ReviewType.CONTENT:
                result = await self._review_content(review_request)
            elif review_request.type == ReviewType.SECURITY:
                result = await self._review_security(review_request)
            elif review_request.type == ReviewType.PERFORMANCE:
                result = await self._review_performance(review_request)
            elif review_request.type == ReviewType.STRATEGY:
                result = await self._review_strategy(review_request)
            else:
                result = await self._general_review(review_request)
            
            # Phase 3: Finalize review
            yield self._create_event("phase", {
                "phase": "finalization",
                "message": "Finalizing review and recommendations..."
            })
            
            result = await self._finalize_review(result, review_request)
            
            # Store in history
            self.review_history.append({
                "timestamp": datetime.utcnow().isoformat(),
                "type": review_request.type.value,
                "score": result.overall_score,
                "findings": len(result.findings)
            })
            
            # Emit the result
            yield self._create_event("review_complete", {
                "result": result.dict(),
                "overall_score": result.overall_score,
                "requires_revision": result.requires_revision
            })
            
            # Store in context
            if request.context:
                request.context.metadata["review_result"] = result.dict()
            
        except Exception as e:
            logger.error(f"Review failed: {e}", exc_info=True)
            yield self._create_event("review_failed", {
                "error": str(e)
            })
            raise
    
    def _parse_review_request(self, query: str) -> ReviewRequest:
        """
        Parse a review request.
        
        Args:
            query: User's request
            
        Returns:
            Structured review request
        """
        query_lower = query.lower()
        
        # Detect review type
        if "code" in query_lower:
            review_type = ReviewType.CODE
        elif "content" in query_lower or "document" in query_lower:
            review_type = ReviewType.CONTENT
        elif "security" in query_lower:
            review_type = ReviewType.SECURITY
        elif "performance" in query_lower:
            review_type = ReviewType.PERFORMANCE
        elif "strategy" in query_lower:
            review_type = ReviewType.STRATEGY
        elif "design" in query_lower:
            review_type = ReviewType.DESIGN
        else:
            review_type = ReviewType.GENERAL
        
        # Detect aspects to review
        aspects = []
        if "correct" in query_lower:
            aspects.append(ReviewAspect.CORRECTNESS)
        if "complete" in query_lower:
            aspects.append(ReviewAspect.COMPLETENESS)
        if "clear" in query_lower or "clarity" in query_lower:
            aspects.append(ReviewAspect.CLARITY)
        if "efficient" in query_lower or "performance" in query_lower:
            aspects.append(ReviewAspect.EFFICIENCY)
        if "secure" in query_lower or "security" in query_lower:
            aspects.append(ReviewAspect.SECURITY)
        
        # Default aspects if none specified
        if not aspects:
            aspects = [
                ReviewAspect.CORRECTNESS,
                ReviewAspect.COMPLETENESS,
                ReviewAspect.CLARITY
            ]
        
        return ReviewRequest(
            type=review_type,
            subject=query,
            aspects=aspects,
            standards=[],
            context={}
        )
    
    async def _initial_assessment(
        self,
        request: ReviewRequest
    ) -> Dict[str, Any]:
        """
        Perform initial assessment.
        
        Args:
            request: Review request
            
        Returns:
            Initial assessment
        """
        # Assess scope and complexity
        scope = "small"
        complexity = "low"
        
        if request.content:
            content_length = len(request.content)
            if content_length > 5000:
                scope = "large"
                complexity = "high"
            elif content_length > 1000:
                scope = "medium"
                complexity = "medium"
        
        return {
            "scope": scope,
            "complexity": complexity,
            "estimated_time": "5 minutes",
            "review_depth": "comprehensive"
        }
    
    async def _review_code(self, request: ReviewRequest) -> ReviewResult:
        """
        Review code.
        
        Args:
            request: Review request
            
        Returns:
            Review result
        """
        findings = []
        strengths = []
        
        # Simulate code review
        if request.content:
            # Check for common issues
            if "TODO" in request.content:
                findings.append(ReviewFinding(
                    aspect=ReviewAspect.COMPLETENESS,
                    severity=ReviewSeverity.MEDIUM,
                    location="Line with TODO",
                    issue="Incomplete implementation found",
                    suggestion="Complete TODO items before production",
                    example="// TODO: Implement error handling -> try { ... } catch (e) { ... }"
                ))
            
            if "console.log" in request.content or "print(" in request.content:
                findings.append(ReviewFinding(
                    aspect=ReviewAspect.MAINTAINABILITY,
                    severity=ReviewSeverity.LOW,
                    location="Debug statements",
                    issue="Debug statements should be removed",
                    suggestion="Use proper logging framework",
                    example="Replace console.log with logger.debug()"
                ))
            
            # Check for strengths
            if "try" in request.content or "catch" in request.content:
                strengths.append("Good error handling implementation")
            if "test" in request.content.lower():
                strengths.append("Tests included")
        
        # Calculate score
        score = 10.0 - (len(findings) * 0.5)
        score = max(0, min(10, score))
        
        return ReviewResult(
            overall_score=score,
            summary=f"Code review completed with {len(findings)} findings",
            strengths=strengths if strengths else ["Code structure appears sound"],
            findings=findings,
            recommendations=[
                "Address critical issues first",
                "Add comprehensive error handling",
                "Include unit tests for new functions"
            ],
            risks=[
                {"type": "technical", "level": "low", "description": "Minor code quality issues"}
            ],
            approval_status="approved_with_conditions" if findings else "approved",
            requires_revision=len([f for f in findings if f.severity in [ReviewSeverity.CRITICAL, ReviewSeverity.HIGH]]) > 0,
            review_metadata={
                "lines_reviewed": len(request.content.split('\n')) if request.content else 0,
                "review_time": datetime.utcnow().isoformat()
            }
        )
    
    async def _review_content(self, request: ReviewRequest) -> ReviewResult:
        """
        Review content/documentation.
        
        Args:
            request: Review request
            
        Returns:
            Review result
        """
        findings = []
        strengths = ["Content is present and formatted"]
        
        if request.content:
            # Check content quality
            word_count = len(request.content.split())
            
            if word_count < 100:
                findings.append(ReviewFinding(
                    aspect=ReviewAspect.COMPLETENESS,
                    severity=ReviewSeverity.MEDIUM,
                    issue="Content appears too brief",
                    suggestion="Expand content with more detail",
                    example="Add sections for context, examples, and references"
                ))
            
            if not any(word in request.content.lower() for word in ["example", "for instance", "such as"]):
                findings.append(ReviewFinding(
                    aspect=ReviewAspect.CLARITY,
                    severity=ReviewSeverity.LOW,
                    issue="No examples provided",
                    suggestion="Include examples to improve clarity",
                    example="Add practical examples to illustrate concepts"
                ))
        
        score = 8.0 - (len(findings) * 0.3)
        
        return ReviewResult(
            overall_score=score,
            summary="Content review completed",
            strengths=strengths,
            findings=findings,
            recommendations=[
                "Consider adding visual elements",
                "Include a summary section",
                "Review for technical accuracy"
            ],
            risks=[],
            approval_status="approved",
            requires_revision=False,
            review_metadata={"word_count": word_count if request.content else 0}
        )
    
    async def _review_security(self, request: ReviewRequest) -> ReviewResult:
        """
        Security review.
        
        Args:
            request: Review request
            
        Returns:
            Review result
        """
        findings = []
        
        # Simulate security review
        security_keywords = ["password", "token", "key", "secret", "credential"]
        
        if request.content:
            for keyword in security_keywords:
                if keyword in request.content.lower():
                    findings.append(ReviewFinding(
                        aspect=ReviewAspect.SECURITY,
                        severity=ReviewSeverity.CRITICAL,
                        location=f"Found '{keyword}'",
                        issue=f"Potential sensitive data exposure: {keyword}",
                        suggestion="Never hardcode sensitive data",
                        example="Use environment variables or secure vaults"
                    ))
        
        score = 10.0 if not findings else 3.0
        
        return ReviewResult(
            overall_score=score,
            summary="Security review completed",
            strengths=["Security review performed"] if not findings else [],
            findings=findings,
            recommendations=[
                "Implement secure coding practices",
                "Regular security audits recommended",
                "Use security scanning tools"
            ],
            risks=[
                {"type": "security", "level": "critical" if findings else "low", 
                 "description": "Potential security vulnerabilities" if findings else "No critical issues found"}
            ],
            approval_status="rejected" if findings else "approved",
            requires_revision=bool(findings),
            review_metadata={"security_checks": len(security_keywords)}
        )
    
    async def _review_performance(self, request: ReviewRequest) -> ReviewResult:
        """
        Performance review.
        
        Args:
            request: Review request
            
        Returns:
            Review result
        """
        findings = []
        
        # Simulate performance review
        if request.content:
            if "for" in request.content and "for" in request.content[request.content.index("for")+4:]:
                findings.append(ReviewFinding(
                    aspect=ReviewAspect.EFFICIENCY,
                    severity=ReviewSeverity.MEDIUM,
                    issue="Nested loops detected",
                    suggestion="Consider optimizing nested loops",
                    example="Use hash maps or better algorithms to reduce complexity"
                ))
        
        return ReviewResult(
            overall_score=7.5,
            summary="Performance review completed",
            strengths=["Code appears functional"],
            findings=findings,
            recommendations=[
                "Profile code for bottlenecks",
                "Consider caching strategies",
                "Optimize database queries"
            ],
            risks=[],
            approval_status="approved",
            requires_revision=False,
            review_metadata={"performance_score": "acceptable"}
        )
    
    async def _review_strategy(self, request: ReviewRequest) -> ReviewResult:
        """
        Strategy review.
        
        Args:
            request: Review request
            
        Returns:
            Review result
        """
        return ReviewResult(
            overall_score=8.0,
            summary="Strategic review completed",
            strengths=[
                "Clear objectives identified",
                "Approach is feasible"
            ],
            findings=[],
            recommendations=[
                "Consider alternative approaches",
                "Define success metrics",
                "Plan for contingencies"
            ],
            risks=[
                {"type": "strategic", "level": "medium", 
                 "description": "Market conditions may change"}
            ],
            approval_status="approved",
            requires_revision=False,
            review_metadata={"strategic_alignment": "good"}
        )
    
    async def _general_review(self, request: ReviewRequest) -> ReviewResult:
        """
        General review.
        
        Args:
            request: Review request
            
        Returns:
            Review result
        """
        return ReviewResult(
            overall_score=7.0,
            summary="General review completed",
            strengths=["Submission received and reviewed"],
            findings=[],
            recommendations=["Continue with current approach"],
            risks=[],
            approval_status="approved",
            requires_revision=False,
            review_metadata={}
        )
    
    async def _finalize_review(
        self,
        result: ReviewResult,
        request: ReviewRequest
    ) -> ReviewResult:
        """
        Finalize the review.
        
        Args:
            result: Initial review result
            request: Original request
            
        Returns:
            Finalized review
        """
        # Add final touches
        result.review_metadata["reviewed_at"] = datetime.utcnow().isoformat()
        result.review_metadata["review_type"] = request.type.value
        result.review_metadata["aspects_reviewed"] = [a.value for a in request.aspects]
        
        # Adjust approval status based on score
        if result.overall_score < 5:
            result.approval_status = "rejected"
            result.requires_revision = True
        elif result.overall_score < 7:
            result.approval_status = "approved_with_conditions"
        
        # Add summary recommendation
        if result.requires_revision:
            result.recommendations.insert(0, "Address critical issues before proceeding")
        else:
            result.recommendations.insert(0, "Work meets quality standards")
        
        return result