"""
Ops Agent Engine - System operations and deployment specialist.

The Ops agent is responsible for:
- System monitoring and health checks
- Deployment and rollback operations
- Infrastructure management
- Performance monitoring
- Incident response
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


class OpsTask(str, Enum):
    """Types of operations tasks."""
    DEPLOY = "deploy"
    ROLLBACK = "rollback"
    MONITOR = "monitor"
    HEALTH_CHECK = "health_check"
    SCALE = "scale"
    BACKUP = "backup"
    RESTORE = "restore"
    CONFIGURE = "configure"
    INCIDENT = "incident"
    MAINTENANCE = "maintenance"


class SystemStatus(str, Enum):
    """System status levels."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    WARNING = "warning"
    CRITICAL = "critical"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"


class OpsRequest(BaseModel):
    """Represents an operations request."""
    task: OpsTask = Field(..., description="Type of ops task")
    target: str = Field(..., description="Target system or service")
    environment: str = Field(default="development", description="Target environment")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Task parameters")
    priority: str = Field(default="normal", description="Priority level")
    dry_run: bool = Field(default=True, description="Whether to perform dry run")


class OpsReport(BaseModel):
    """Operations execution report."""
    task: OpsTask = Field(..., description="Task performed")
    status: SystemStatus = Field(..., description="System status")
    success: bool = Field(..., description="Whether operation succeeded")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="System metrics")
    actions_taken: List[str] = Field(default_factory=list, description="Actions performed")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations")
    logs: List[str] = Field(default_factory=list, description="Operation logs")
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class OpsAgent(BaseAgent):
    """
    Ops Agent - The operations and infrastructure specialist of the Syna system.
    
    Specializes in:
    - System deployment and maintenance
    - Monitoring and alerting
    - Incident response
    - Performance optimization
    - Infrastructure as Code
    """
    
    def _initialize(self) -> None:
        """Initialize ops-specific components."""
        self.capabilities = [
            AgentCapability.OPERATIONS,
            AgentCapability.ANALYSIS,
            AgentCapability.INTEGRATION
        ]
        
        # System state cache
        self.system_state: Dict[str, Any] = {}
        
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the ops agent's prompt template."""
        return ChatPromptTemplate.from_messages([
            ("system", """You are the Ops Agent, responsible for system operations and infrastructure management.

Your responsibilities:
1. Deploy and manage applications
2. Monitor system health and performance
3. Respond to incidents and alerts
4. Optimize infrastructure resources
5. Ensure system reliability and uptime

Operations principles:
- Safety first - always validate before making changes
- Use Infrastructure as Code when possible
- Implement proper monitoring and alerting
- Document all operations procedures
- Plan for failure and have rollback strategies
- Follow security best practices

Available tasks: {tasks}
Environments: development, staging, production

When performing operations:
1. Assess the current state
2. Plan the operation carefully
3. Validate prerequisites
4. Execute with monitoring
5. Verify success and document"""),
            ("human", "{query}"),
            ("system", "Execute the operation safely and provide detailed feedback.")
        ])
    
    async def _execute_core(
        self,
        request: AgentRequest,
        messages: List[BaseMessage]
    ) -> AsyncIterator[AgentEvent]:
        """
        Core operations logic.
        
        Args:
            request: The ops request
            messages: Conversation history
            
        Yields:
            AgentEvent: Operations events
        """
        try:
            # Update status
            self.status = AgentStatus.EXECUTING
            yield self._create_event("ops_started", {
                "query": request.query
            })
            
            # Parse the ops request
            ops_request = self._parse_ops_request(request.query)
            
            yield self._create_event("task_identified", {
                "task": ops_request.task.value,
                "target": ops_request.target,
                "environment": ops_request.environment,
                "dry_run": ops_request.dry_run
            })
            
            # Phase 1: Pre-checks
            yield self._create_event("phase", {
                "phase": "pre_checks",
                "message": "Running pre-operation checks..."
            })
            
            pre_check_result = await self._run_pre_checks(ops_request)
            
            if not pre_check_result["passed"]:
                yield self._create_event("pre_check_failed", {
                    "issues": pre_check_result["issues"]
                })
                return
            
            # Phase 2: Execute operation
            yield self._create_event("phase", {
                "phase": "execution",
                "message": f"Executing {ops_request.task.value}..."
            })
            
            # Execute based on task type
            if ops_request.task == OpsTask.DEPLOY:
                report = await self._deploy(ops_request)
            elif ops_request.task == OpsTask.MONITOR:
                report = await self._monitor(ops_request)
            elif ops_request.task == OpsTask.HEALTH_CHECK:
                report = await self._health_check(ops_request)
            elif ops_request.task == OpsTask.SCALE:
                report = await self._scale(ops_request)
            elif ops_request.task == OpsTask.INCIDENT:
                report = await self._handle_incident(ops_request)
            else:
                report = await self._general_ops(ops_request)
            
            # Phase 3: Post-operation verification
            yield self._create_event("phase", {
                "phase": "verification",
                "message": "Verifying operation results..."
            })
            
            verification = await self._verify_operation(ops_request, report)
            report.success = verification["success"]
            
            # Emit the report
            yield self._create_event("ops_complete", {
                "report": report.dict(),
                "success": report.success
            })
            
            # Store in context
            if request.context:
                request.context.metadata["ops_report"] = report.dict()
            
        except Exception as e:
            logger.error(f"Operations failed: {e}", exc_info=True)
            yield self._create_event("ops_failed", {
                "error": str(e)
            })
            raise
    
    def _parse_ops_request(self, query: str) -> OpsRequest:
        """
        Parse an operations request.
        
        Args:
            query: User's request
            
        Returns:
            Structured ops request
        """
        query_lower = query.lower()
        
        # Detect task type
        if "deploy" in query_lower:
            task = OpsTask.DEPLOY
        elif "rollback" in query_lower:
            task = OpsTask.ROLLBACK
        elif "monitor" in query_lower:
            task = OpsTask.MONITOR
        elif "health" in query_lower or "status" in query_lower:
            task = OpsTask.HEALTH_CHECK
        elif "scale" in query_lower:
            task = OpsTask.SCALE
        elif "incident" in query_lower or "alert" in query_lower:
            task = OpsTask.INCIDENT
        else:
            task = OpsTask.HEALTH_CHECK
        
        # Detect environment
        environment = "development"
        if "production" in query_lower or "prod" in query_lower:
            environment = "production"
        elif "staging" in query_lower:
            environment = "staging"
        
        # Detect target
        target = "system"
        if "api" in query_lower:
            target = "api"
        elif "database" in query_lower or "db" in query_lower:
            target = "database"
        elif "frontend" in query_lower:
            target = "frontend"
        
        return OpsRequest(
            task=task,
            target=target,
            environment=environment,
            dry_run=environment == "production"  # Always dry-run in production first
        )
    
    async def _run_pre_checks(self, request: OpsRequest) -> Dict[str, Any]:
        """
        Run pre-operation checks.
        
        Args:
            request: Ops request
            
        Returns:
            Pre-check results
        """
        issues = []
        
        # Check environment
        if request.environment == "production" and not request.dry_run:
            issues.append("Production operations require approval")
        
        # Check system state
        if self.system_state.get("maintenance_mode"):
            issues.append("System is in maintenance mode")
        
        # Check dependencies
        # In production, would check actual system dependencies
        
        return {
            "passed": len(issues) == 0,
            "issues": issues,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _deploy(self, request: OpsRequest) -> OpsReport:
        """
        Handle deployment operations.
        
        Args:
            request: Ops request
            
        Returns:
            Operations report
        """
        actions = []
        logs = []
        
        if request.dry_run:
            actions.append(f"[DRY RUN] Would deploy {request.target} to {request.environment}")
            logs.append("Dry run mode - no actual changes made")
        else:
            actions.append(f"Deploying {request.target} to {request.environment}")
            actions.append("Running pre-deployment tests")
            actions.append("Building deployment artifacts")
            actions.append("Updating configuration")
            actions.append("Starting deployment")
            logs.append(f"Deployment initiated at {datetime.utcnow().isoformat()}")
        
        return OpsReport(
            task=request.task,
            status=SystemStatus.HEALTHY,
            success=True,
            metrics={
                "deployment_time": "2m 15s",
                "services_updated": 3,
                "health_checks_passed": True
            },
            actions_taken=actions,
            recommendations=[
                "Monitor application logs for next 30 minutes",
                "Verify all health checks are passing",
                "Update deployment documentation"
            ],
            logs=logs
        )
    
    async def _monitor(self, request: OpsRequest) -> OpsReport:
        """
        Monitor system status.
        
        Args:
            request: Ops request
            
        Returns:
            Monitoring report
        """
        # Simulate monitoring
        metrics = {
            "cpu_usage": "45%",
            "memory_usage": "62%",
            "disk_usage": "38%",
            "active_connections": 127,
            "response_time_avg": "145ms",
            "error_rate": "0.02%",
            "uptime": "15d 7h 23m"
        }
        
        # Determine status based on metrics
        status = SystemStatus.HEALTHY
        recommendations = []
        
        if float(metrics["cpu_usage"].rstrip("%")) > 80:
            status = SystemStatus.WARNING
            recommendations.append("Consider scaling up CPU resources")
        
        if float(metrics["error_rate"].rstrip("%")) > 1:
            status = SystemStatus.DEGRADED
            recommendations.append("Investigate error rate increase")
        
        return OpsReport(
            task=request.task,
            status=status,
            success=True,
            metrics=metrics,
            actions_taken=["Collected system metrics", "Analyzed performance data"],
            recommendations=recommendations,
            logs=[f"Monitoring snapshot at {datetime.utcnow().isoformat()}"]
        )
    
    async def _health_check(self, request: OpsRequest) -> OpsReport:
        """
        Perform health checks.
        
        Args:
            request: Ops request
            
        Returns:
            Health check report
        """
        checks = {
            "api_endpoint": "healthy",
            "database_connection": "healthy",
            "cache_service": "healthy",
            "queue_service": "healthy",
            "storage_service": "healthy"
        }
        
        # Check for issues
        all_healthy = all(status == "healthy" for status in checks.values())
        
        return OpsReport(
            task=request.task,
            status=SystemStatus.HEALTHY if all_healthy else SystemStatus.DEGRADED,
            success=True,
            metrics=checks,
            actions_taken=["Performed health checks on all services"],
            recommendations=[] if all_healthy else ["Investigate unhealthy services"],
            logs=[f"Health check completed at {datetime.utcnow().isoformat()}"]
        )
    
    async def _scale(self, request: OpsRequest) -> OpsReport:
        """
        Handle scaling operations.
        
        Args:
            request: Ops request
            
        Returns:
            Scaling report
        """
        scale_action = request.parameters.get("action", "up")
        scale_factor = request.parameters.get("factor", 2)
        
        actions = []
        if request.dry_run:
            actions.append(f"[DRY RUN] Would scale {request.target} {scale_action} by {scale_factor}x")
        else:
            actions.append(f"Scaling {request.target} {scale_action}")
            actions.append(f"Current instances: 2")
            actions.append(f"Target instances: {2 * scale_factor if scale_action == 'up' else 1}")
            actions.append("Updating load balancer configuration")
        
        return OpsReport(
            task=request.task,
            status=SystemStatus.HEALTHY,
            success=True,
            metrics={
                "current_instances": 2,
                "target_instances": 2 * scale_factor if scale_action == "up" else 1,
                "estimated_cost_change": f"+${scale_factor * 50}/month"
            },
            actions_taken=actions,
            recommendations=[
                "Monitor resource utilization after scaling",
                "Review auto-scaling policies"
            ],
            logs=[f"Scaling operation at {datetime.utcnow().isoformat()}"]
        )
    
    async def _handle_incident(self, request: OpsRequest) -> OpsReport:
        """
        Handle incident response.
        
        Args:
            request: Ops request
            
        Returns:
            Incident report
        """
        actions = [
            "Acknowledged incident",
            "Gathered initial diagnostics",
            "Identified affected services",
            "Initiated mitigation procedures",
            "Notified on-call team"
        ]
        
        return OpsReport(
            task=request.task,
            status=SystemStatus.WARNING,
            success=True,
            metrics={
                "incident_severity": "P2",
                "affected_users": "~500",
                "time_to_acknowledge": "2m",
                "estimated_resolution": "30m"
            },
            actions_taken=actions,
            recommendations=[
                "Continue monitoring affected services",
                "Prepare post-incident review",
                "Update status page"
            ],
            logs=[
                f"Incident detected at {datetime.utcnow().isoformat()}",
                "Initial response initiated",
                "Mitigation in progress"
            ]
        )
    
    async def _general_ops(self, request: OpsRequest) -> OpsReport:
        """
        Handle general operations.
        
        Args:
            request: Ops request
            
        Returns:
            Operations report
        """
        return OpsReport(
            task=request.task,
            status=SystemStatus.HEALTHY,
            success=True,
            metrics={},
            actions_taken=[f"Executed {request.task.value} operation"],
            recommendations=[],
            logs=[f"Operation completed at {datetime.utcnow().isoformat()}"]
        )
    
    async def _verify_operation(
        self,
        request: OpsRequest,
        report: OpsReport
    ) -> Dict[str, Any]:
        """
        Verify operation results.
        
        Args:
            request: Original request
            report: Operation report
            
        Returns:
            Verification results
        """
        # In production, would perform actual verification
        return {
            "success": True,
            "checks_passed": ["service_health", "connectivity", "performance"],
            "timestamp": datetime.utcnow().isoformat()
        }