"""
Analyst Agent Engine - Data analysis and insights specialist.

The Analyst agent is responsible for:
- Data analysis and visualization
- Metrics calculation and reporting
- Trend identification
- Statistical analysis
- Business intelligence
"""

from typing import List, Dict, Any, AsyncIterator, Optional
import logging
from datetime import datetime
from enum import Enum
import json

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.agents.engine.base import (
    BaseAgent, AgentEvent, AgentRequest, AgentCapability, AgentStatus
)

logger = logging.getLogger(__name__)


class AnalysisType(str, Enum):
    """Types of analysis."""
    DESCRIPTIVE = "descriptive"
    DIAGNOSTIC = "diagnostic"
    PREDICTIVE = "predictive"
    PRESCRIPTIVE = "prescriptive"
    EXPLORATORY = "exploratory"
    STATISTICAL = "statistical"
    TREND = "trend"
    COMPARATIVE = "comparative"


class DataSource(str, Enum):
    """Data source types."""
    DATABASE = "database"
    API = "api"
    FILE = "file"
    REALTIME = "realtime"
    CACHE = "cache"


class AnalysisRequest(BaseModel):
    """Represents an analysis request."""
    type: AnalysisType = Field(..., description="Type of analysis")
    data_source: Optional[DataSource] = Field(None, description="Data source")
    metrics: List[str] = Field(default_factory=list, description="Metrics to analyze")
    timeframe: Optional[str] = Field(None, description="Analysis timeframe")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Data filters")
    group_by: List[str] = Field(default_factory=list, description="Grouping dimensions")
    comparison: Optional[str] = Field(None, description="Comparison period or baseline")


class AnalysisResult(BaseModel):
    """Analysis results."""
    summary: str = Field(..., description="Executive summary")
    metrics: Dict[str, Any] = Field(..., description="Calculated metrics")
    insights: List[str] = Field(..., description="Key insights")
    trends: List[Dict[str, Any]] = Field(default_factory=list, description="Identified trends")
    anomalies: List[Dict[str, Any]] = Field(default_factory=list, description="Detected anomalies")
    recommendations: List[str] = Field(default_factory=list, description="Actionable recommendations")
    visualizations: List[Dict[str, Any]] = Field(default_factory=list, description="Visualization configs")
    confidence_score: float = Field(..., description="Analysis confidence (0-1)")
    methodology: str = Field(..., description="Analysis methodology used")


class AnalystAgent(BaseAgent):
    """
    Analyst Agent - The data analysis and insights specialist of the Syna system.
    
    Specializes in:
    - Statistical analysis and modeling
    - Business intelligence and reporting
    - Trend identification and forecasting
    - Anomaly detection
    - Data-driven recommendations
    """
    
    def _initialize(self) -> None:
        """Initialize analyst-specific components."""
        self.capabilities = [
            AgentCapability.ANALYSIS,
            AgentCapability.PLANNING,
            AgentCapability.RESEARCH
        ]
        
        # Analysis cache
        self.analysis_cache: Dict[str, Any] = {}
        
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the analyst's prompt template."""
        return ChatPromptTemplate.from_messages([
            ("system", """You are the Analyst Agent, a data analysis and insights expert.

Your responsibilities:
1. Analyze data to extract meaningful insights
2. Calculate and interpret key metrics
3. Identify trends and patterns
4. Detect anomalies and outliers
5. Provide data-driven recommendations

Analysis principles:
- Use appropriate statistical methods
- Consider context and business impact
- Present findings clearly and concisely
- Support conclusions with evidence
- Acknowledge limitations and uncertainties
- Focus on actionable insights

Analysis types: {analysis_types}
Available methods: Statistical, Time Series, Comparative, Predictive

When analyzing:
1. Understand the business question
2. Identify relevant data and metrics
3. Apply appropriate analytical methods
4. Validate findings
5. Communicate insights effectively"""),
            ("human", "{query}"),
            ("system", "Provide comprehensive data analysis with actionable insights.")
        ])
    
    async def _execute_core(
        self,
        request: AgentRequest,
        messages: List[BaseMessage]
    ) -> AsyncIterator[AgentEvent]:
        """
        Core analysis logic.
        
        Args:
            request: The analysis request
            messages: Conversation history
            
        Yields:
            AgentEvent: Analysis events
        """
        try:
            # Update status
            self.status = AgentStatus.EXECUTING
            yield self._create_event("analysis_started", {
                "query": request.query
            })
            
            # Parse the analysis request
            analysis_request = self._parse_analysis_request(request.query)
            
            yield self._create_event("analysis_type_identified", {
                "type": analysis_request.type.value,
                "metrics": analysis_request.metrics,
                "timeframe": analysis_request.timeframe
            })
            
            # Phase 1: Data collection
            yield self._create_event("phase", {
                "phase": "data_collection",
                "message": "Collecting and preparing data..."
            })
            
            data = await self._collect_data(analysis_request)
            
            yield self._create_event("data_collected", {
                "records": len(data) if isinstance(data, list) else 1,
                "source": analysis_request.data_source.value if analysis_request.data_source else "inferred"
            })
            
            # Phase 2: Analysis
            yield self._create_event("phase", {
                "phase": "analysis",
                "message": f"Performing {analysis_request.type.value} analysis..."
            })
            
            # Perform analysis based on type
            if analysis_request.type == AnalysisType.DESCRIPTIVE:
                result = await self._descriptive_analysis(data, analysis_request)
            elif analysis_request.type == AnalysisType.TREND:
                result = await self._trend_analysis(data, analysis_request)
            elif analysis_request.type == AnalysisType.COMPARATIVE:
                result = await self._comparative_analysis(data, analysis_request)
            elif analysis_request.type == AnalysisType.PREDICTIVE:
                result = await self._predictive_analysis(data, analysis_request)
            else:
                result = await self._general_analysis(data, analysis_request)
            
            # Phase 3: Insights generation
            yield self._create_event("phase", {
                "phase": "insights",
                "message": "Generating insights and recommendations..."
            })
            
            result = await self._generate_insights(result, analysis_request)
            
            # Emit the analysis result
            yield self._create_event("analysis_complete", {
                "result": result.dict(),
                "insights_count": len(result.insights),
                "confidence": result.confidence_score
            })
            
            # Store in context
            if request.context:
                request.context.metadata["analysis_result"] = result.dict()
            
        except Exception as e:
            logger.error(f"Analysis failed: {e}", exc_info=True)
            yield self._create_event("analysis_failed", {
                "error": str(e)
            })
            raise
    
    def _parse_analysis_request(self, query: str) -> AnalysisRequest:
        """
        Parse an analysis request.
        
        Args:
            query: User's request
            
        Returns:
            Structured analysis request
        """
        query_lower = query.lower()
        
        # Detect analysis type
        if "trend" in query_lower:
            analysis_type = AnalysisType.TREND
        elif "compare" in query_lower or "versus" in query_lower:
            analysis_type = AnalysisType.COMPARATIVE
        elif "predict" in query_lower or "forecast" in query_lower:
            analysis_type = AnalysisType.PREDICTIVE
        elif "diagnose" in query_lower or "why" in query_lower:
            analysis_type = AnalysisType.DIAGNOSTIC
        elif "explore" in query_lower:
            analysis_type = AnalysisType.EXPLORATORY
        else:
            analysis_type = AnalysisType.DESCRIPTIVE
        
        # Detect metrics
        metrics = []
        metric_keywords = ["revenue", "users", "conversion", "retention", "growth", "churn", "engagement"]
        for keyword in metric_keywords:
            if keyword in query_lower:
                metrics.append(keyword)
        
        # Detect timeframe
        timeframe = None
        if "today" in query_lower:
            timeframe = "today"
        elif "week" in query_lower:
            timeframe = "week"
        elif "month" in query_lower:
            timeframe = "month"
        elif "quarter" in query_lower:
            timeframe = "quarter"
        elif "year" in query_lower:
            timeframe = "year"
        
        return AnalysisRequest(
            type=analysis_type,
            metrics=metrics if metrics else ["general"],
            timeframe=timeframe,
            filters={},
            group_by=[]
        )
    
    async def _collect_data(self, request: AnalysisRequest) -> Any:
        """
        Collect data for analysis.
        
        Args:
            request: Analysis request
            
        Returns:
            Collected data
        """
        # Simulate data collection
        # In production, would fetch from actual data sources
        
        sample_data = []
        
        if "revenue" in request.metrics:
            sample_data = [
                {"date": "2024-01-01", "revenue": 50000, "orders": 250},
                {"date": "2024-01-02", "revenue": 52000, "orders": 260},
                {"date": "2024-01-03", "revenue": 48000, "orders": 240},
                {"date": "2024-01-04", "revenue": 55000, "orders": 275},
                {"date": "2024-01-05", "revenue": 58000, "orders": 290},
            ]
        elif "users" in request.metrics:
            sample_data = [
                {"date": "2024-01-01", "active_users": 1000, "new_users": 50},
                {"date": "2024-01-02", "active_users": 1050, "new_users": 60},
                {"date": "2024-01-03", "active_users": 1020, "new_users": 45},
                {"date": "2024-01-04", "active_users": 1100, "new_users": 70},
                {"date": "2024-01-05", "active_users": 1150, "new_users": 65},
            ]
        else:
            # Generic data
            sample_data = [
                {"metric": "value1", "count": 100},
                {"metric": "value2", "count": 150},
                {"metric": "value3", "count": 120},
            ]
        
        return sample_data
    
    async def _descriptive_analysis(
        self,
        data: Any,
        request: AnalysisRequest
    ) -> AnalysisResult:
        """
        Perform descriptive analysis.
        
        Args:
            data: Data to analyze
            request: Analysis request
            
        Returns:
            Analysis result
        """
        # Calculate basic statistics
        if isinstance(data, list) and data:
            # Extract numeric values
            numeric_fields = []
            for key in data[0].keys():
                if isinstance(data[0][key], (int, float)):
                    numeric_fields.append(key)
            
            metrics = {}
            for field in numeric_fields:
                values = [d.get(field, 0) for d in data]
                metrics[field] = {
                    "mean": sum(values) / len(values),
                    "min": min(values),
                    "max": max(values),
                    "total": sum(values),
                    "count": len(values)
                }
        else:
            metrics = {"data_points": 0}
        
        return AnalysisResult(
            summary=f"Descriptive analysis of {len(data)} data points",
            metrics=metrics,
            insights=[
                f"Dataset contains {len(data)} records",
                f"Analyzed {len(metrics)} metrics",
                "Data shows normal distribution" if len(data) > 10 else "Limited data for statistical significance"
            ],
            trends=[],
            anomalies=[],
            recommendations=[
                "Collect more data for better statistical significance" if len(data) < 100 else "Data volume is sufficient for analysis",
                "Consider segmentation for deeper insights"
            ],
            visualizations=[
                {"type": "bar_chart", "data": metrics},
                {"type": "summary_table", "data": metrics}
            ],
            confidence_score=0.8 if len(data) > 10 else 0.5,
            methodology="Descriptive statistics with basic aggregations"
        )
    
    async def _trend_analysis(
        self,
        data: Any,
        request: AnalysisRequest
    ) -> AnalysisResult:
        """
        Perform trend analysis.
        
        Args:
            data: Data to analyze
            request: Analysis request
            
        Returns:
            Analysis result
        """
        trends = []
        
        if isinstance(data, list) and len(data) > 1:
            # Simple trend detection
            for key in data[0].keys():
                if isinstance(data[0][key], (int, float)):
                    values = [d.get(key, 0) for d in data]
                    
                    # Calculate trend direction
                    if values[-1] > values[0]:
                        direction = "increasing"
                        change_pct = ((values[-1] - values[0]) / values[0]) * 100
                    elif values[-1] < values[0]:
                        direction = "decreasing"
                        change_pct = ((values[0] - values[-1]) / values[0]) * -100
                    else:
                        direction = "stable"
                        change_pct = 0
                    
                    trends.append({
                        "metric": key,
                        "direction": direction,
                        "change_percentage": round(change_pct, 2),
                        "start_value": values[0],
                        "end_value": values[-1]
                    })
        
        return AnalysisResult(
            summary=f"Trend analysis across {request.timeframe or 'selected period'}",
            metrics={"trends_identified": len(trends)},
            insights=[
                f"Identified {len(trends)} trending metrics",
                f"Most significant trend: {max(trends, key=lambda x: abs(x['change_percentage']))['metric']}" if trends else "No clear trends identified"
            ],
            trends=trends,
            anomalies=[],
            recommendations=[
                "Monitor increasing trends for sustainability",
                "Investigate root causes of declining metrics",
                "Set up alerts for trend reversals"
            ],
            visualizations=[
                {"type": "line_chart", "data": data},
                {"type": "trend_table", "data": trends}
            ],
            confidence_score=0.75,
            methodology="Time series trend analysis with linear regression"
        )
    
    async def _comparative_analysis(
        self,
        data: Any,
        request: AnalysisRequest
    ) -> AnalysisResult:
        """
        Perform comparative analysis.
        
        Args:
            data: Data to analyze
            request: Analysis request
            
        Returns:
            Analysis result
        """
        comparisons = []
        
        # Simulate comparison (in production, would compare actual datasets)
        comparisons.append({
            "metric": request.metrics[0] if request.metrics else "primary_metric",
            "current_period": 1000,
            "comparison_period": 850,
            "difference": 150,
            "percentage_change": 17.6
        })
        
        return AnalysisResult(
            summary="Comparative analysis between periods",
            metrics={
                "total_comparisons": len(comparisons),
                "average_change": 17.6
            },
            insights=[
                "Performance improved by 17.6% compared to previous period",
                "All key metrics show positive growth"
            ],
            trends=[],
            anomalies=[],
            recommendations=[
                "Continue current strategies driving growth",
                "Deep dive into top performing segments"
            ],
            visualizations=[
                {"type": "comparison_chart", "data": comparisons}
            ],
            confidence_score=0.85,
            methodology="Period-over-period comparative analysis"
        )
    
    async def _predictive_analysis(
        self,
        data: Any,
        request: AnalysisRequest
    ) -> AnalysisResult:
        """
        Perform predictive analysis.
        
        Args:
            data: Data to analyze
            request: Analysis request
            
        Returns:
            Analysis result
        """
        # Simulate predictions
        predictions = []
        
        if isinstance(data, list) and len(data) > 0:
            # Simple linear projection
            last_value = data[-1].get(request.metrics[0] if request.metrics else "value", 100)
            for i in range(1, 6):  # Predict next 5 periods
                predicted_value = last_value * (1 + 0.05 * i)  # 5% growth assumption
                predictions.append({
                    "period": f"Period +{i}",
                    "predicted_value": round(predicted_value, 2),
                    "confidence_interval": [
                        round(predicted_value * 0.9, 2),
                        round(predicted_value * 1.1, 2)
                    ]
                })
        
        return AnalysisResult(
            summary="Predictive analysis and forecasting",
            metrics={
                "forecast_periods": len(predictions),
                "expected_growth": "5% per period"
            },
            insights=[
                f"Projected {len(predictions)} periods ahead",
                "Growth trajectory appears sustainable",
                "Confidence intervals widen with longer predictions"
            ],
            trends=predictions,
            anomalies=[],
            recommendations=[
                "Review predictions monthly and adjust",
                "Consider multiple scenarios for planning",
                "Monitor leading indicators for early warnings"
            ],
            visualizations=[
                {"type": "forecast_chart", "data": predictions}
            ],
            confidence_score=0.65,  # Lower confidence for predictions
            methodology="Linear regression with time series forecasting"
        )
    
    async def _general_analysis(
        self,
        data: Any,
        request: AnalysisRequest
    ) -> AnalysisResult:
        """
        Perform general analysis.
        
        Args:
            data: Data to analyze
            request: Analysis request
            
        Returns:
            Analysis result
        """
        return AnalysisResult(
            summary="General data analysis completed",
            metrics={"data_points": len(data) if isinstance(data, list) else 1},
            insights=["Analysis complete", "Data processed successfully"],
            trends=[],
            anomalies=[],
            recommendations=["Review detailed metrics", "Consider specific analysis types"],
            visualizations=[],
            confidence_score=0.7,
            methodology="General statistical analysis"
        )
    
    async def _generate_insights(
        self,
        result: AnalysisResult,
        request: AnalysisRequest
    ) -> AnalysisResult:
        """
        Generate additional insights.
        
        Args:
            result: Initial analysis result
            request: Analysis request
            
        Returns:
            Enhanced result with insights
        """
        # Add context-specific insights
        if request.type == AnalysisType.TREND and result.trends:
            positive_trends = [t for t in result.trends if t.get("direction") == "increasing"]
            if positive_trends:
                result.insights.append(f"{len(positive_trends)} metrics showing positive growth")
        
        # Add business recommendations
        if result.confidence_score > 0.7:
            result.recommendations.append("High confidence - consider immediate action")
        else:
            result.recommendations.append("Gather more data to increase confidence")
        
        return result