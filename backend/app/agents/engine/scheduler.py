"""
Scheduler Agent Engine - Time management and scheduling specialist.

The Scheduler agent is responsible for:
- Calendar management and scheduling
- Meeting coordination
- Deadline tracking
- Task prioritization
- Time optimization
- Reminder management
"""

from typing import List, Dict, Any, AsyncIterator, Optional
import logging
from datetime import datetime, timedelta
from enum import Enum

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_core.prompts import ChatPromptTemplate
from pydantic import BaseModel, Field

from app.agents.engine.base import (
    BaseAgent, AgentEvent, AgentRequest, AgentCapability, AgentStatus
)

logger = logging.getLogger(__name__)


class ScheduleTask(str, Enum):
    """Types of scheduling tasks."""
    SCHEDULE_MEETING = "schedule_meeting"
    FIND_TIME = "find_time"
    SET_REMINDER = "set_reminder"
    BLOCK_TIME = "block_time"
    RESCHEDULE = "reschedule"
    CANCEL = "cancel"
    CHECK_AVAILABILITY = "check_availability"
    OPTIMIZE_CALENDAR = "optimize_calendar"


class EventType(str, Enum):
    """Types of calendar events."""
    MEETING = "meeting"
    TASK = "task"
    REMINDER = "reminder"
    BLOCK = "block"
    DEADLINE = "deadline"
    RECURRING = "recurring"


class Priority(str, Enum):
    """Priority levels."""
    URGENT = "urgent"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ScheduleRequest(BaseModel):
    """Represents a scheduling request."""
    task: ScheduleTask = Field(..., description="Type of scheduling task")
    event_type: EventType = Field(default=EventType.MEETING, description="Type of event")
    title: str = Field(..., description="Event title")
    description: Optional[str] = Field(None, description="Event description")
    duration: int = Field(default=30, description="Duration in minutes")
    participants: List[str] = Field(default_factory=list, description="Participants")
    priority: Priority = Field(default=Priority.MEDIUM, description="Priority level")
    preferred_times: List[str] = Field(default_factory=list, description="Preferred time slots")
    constraints: List[str] = Field(default_factory=list, description="Scheduling constraints")
    recurring: Optional[Dict[str, Any]] = Field(None, description="Recurrence pattern")


class ScheduleResult(BaseModel):
    """Scheduling operation result."""
    success: bool = Field(..., description="Whether scheduling succeeded")
    event_id: Optional[str] = Field(None, description="Created event ID")
    scheduled_time: Optional[str] = Field(None, description="Scheduled time")
    duration: int = Field(..., description="Duration in minutes")
    conflicts: List[Dict[str, Any]] = Field(default_factory=list, description="Scheduling conflicts")
    suggestions: List[Dict[str, Any]] = Field(default_factory=list, description="Alternative time suggestions")
    calendar_summary: Dict[str, Any] = Field(default_factory=dict, description="Calendar overview")
    optimization_tips: List[str] = Field(default_factory=list, description="Calendar optimization suggestions")


class SchedulerAgent(BaseAgent):
    """
    Scheduler Agent - The time management specialist of the Syna system.
    
    Specializes in:
    - Intelligent scheduling and calendar management
    - Meeting optimization
    - Time blocking and focus time
    - Deadline and reminder management
    - Schedule conflict resolution
    """
    
    def _initialize(self) -> None:
        """Initialize scheduler-specific components."""
        self.capabilities = [
            AgentCapability.SCHEDULING,
            AgentCapability.PLANNING,
            AgentCapability.MEMORY_ACCESS
        ]
        
        # Mock calendar data
        self.calendar: Dict[str, List[Dict[str, Any]]] = {}
        self.reminders: List[Dict[str, Any]] = []
        
    def _create_prompt(self) -> ChatPromptTemplate:
        """Create the scheduler's prompt template."""
        return ChatPromptTemplate.from_messages([
            ("system", """You are the Scheduler Agent, an expert at time management and calendar optimization.

Your responsibilities:
1. Schedule meetings and events efficiently
2. Find optimal time slots for activities
3. Manage reminders and deadlines
4. Resolve scheduling conflicts
5. Optimize calendar for productivity

Scheduling principles:
- Respect time zones and working hours
- Consider participant availability
- Group similar activities when possible
- Build in buffer time between meetings
- Protect focus time for deep work
- Balance meeting load across days

Available tasks: {tasks}
Priority levels: urgent, high, medium, low

When scheduling:
1. Check availability and constraints
2. Find optimal time slots
3. Consider participant preferences
4. Avoid conflicts and overlaps
5. Suggest alternatives when needed"""),
            ("human", "{query}"),
            ("system", "Handle the scheduling request efficiently.")
        ])
    
    async def _execute_core(
        self,
        request: AgentRequest,
        messages: List[BaseMessage]
    ) -> AsyncIterator[AgentEvent]:
        """
        Core scheduling logic.
        
        Args:
            request: The scheduling request
            messages: Conversation history
            
        Yields:
            AgentEvent: Scheduling events
        """
        try:
            # Update status
            self.status = AgentStatus.EXECUTING
            yield self._create_event("scheduling_started", {
                "query": request.query
            })
            
            # Parse the scheduling request
            schedule_request = self._parse_schedule_request(request.query)
            
            yield self._create_event("request_parsed", {
                "task": schedule_request.task.value,
                "event_type": schedule_request.event_type.value,
                "duration": schedule_request.duration,
                "priority": schedule_request.priority.value
            })
            
            # Phase 1: Check availability
            yield self._create_event("phase", {
                "phase": "availability_check",
                "message": "Checking calendar availability..."
            })
            
            availability = await self._check_availability(schedule_request)
            
            if not availability["available"]:
                yield self._create_event("conflicts_found", {
                    "conflicts": availability["conflicts"]
                })
            
            # Phase 2: Find optimal time
            yield self._create_event("phase", {
                "phase": "optimization",
                "message": "Finding optimal time slot..."
            })
            
            optimal_slot = await self._find_optimal_slot(schedule_request, availability)
            
            # Phase 3: Schedule event
            yield self._create_event("phase", {
                "phase": "scheduling",
                "message": "Creating calendar event..."
            })
            
            # Execute based on task type
            if schedule_request.task == ScheduleTask.SCHEDULE_MEETING:
                result = await self._schedule_meeting(schedule_request, optimal_slot)
            elif schedule_request.task == ScheduleTask.FIND_TIME:
                result = await self._find_time(schedule_request)
            elif schedule_request.task == ScheduleTask.SET_REMINDER:
                result = await self._set_reminder(schedule_request)
            elif schedule_request.task == ScheduleTask.OPTIMIZE_CALENDAR:
                result = await self._optimize_calendar(schedule_request)
            else:
                result = await self._general_scheduling(schedule_request, optimal_slot)
            
            # Emit the result
            yield self._create_event("scheduling_complete", {
                "result": result.dict(),
                "success": result.success
            })
            
            # Store in context
            if request.context:
                request.context.metadata["schedule_result"] = result.dict()
            
        except Exception as e:
            logger.error(f"Scheduling failed: {e}", exc_info=True)
            yield self._create_event("scheduling_failed", {
                "error": str(e)
            })
            raise
    
    def _parse_schedule_request(self, query: str) -> ScheduleRequest:
        """
        Parse a scheduling request.
        
        Args:
            query: User's request
            
        Returns:
            Structured schedule request
        """
        query_lower = query.lower()
        
        # Detect task type
        if "schedule" in query_lower and "meeting" in query_lower:
            task = ScheduleTask.SCHEDULE_MEETING
        elif "find time" in query_lower or "when can" in query_lower:
            task = ScheduleTask.FIND_TIME
        elif "remind" in query_lower:
            task = ScheduleTask.SET_REMINDER
        elif "reschedule" in query_lower:
            task = ScheduleTask.RESCHEDULE
        elif "cancel" in query_lower:
            task = ScheduleTask.CANCEL
        elif "optimize" in query_lower:
            task = ScheduleTask.OPTIMIZE_CALENDAR
        else:
            task = ScheduleTask.SCHEDULE_MEETING
        
        # Detect priority
        priority = Priority.MEDIUM
        if "urgent" in query_lower or "asap" in query_lower:
            priority = Priority.URGENT
        elif "high priority" in query_lower:
            priority = Priority.HIGH
        elif "low priority" in query_lower:
            priority = Priority.LOW
        
        # Detect duration
        duration = 30  # Default 30 minutes
        if "hour" in query_lower:
            if "2 hour" in query_lower or "two hour" in query_lower:
                duration = 120
            elif "half hour" in query_lower:
                duration = 30
            else:
                duration = 60
        elif "15 min" in query_lower:
            duration = 15
        elif "45 min" in query_lower:
            duration = 45
        
        return ScheduleRequest(
            task=task,
            title=query[:50],  # Use first 50 chars as title
            duration=duration,
            priority=priority
        )
    
    async def _check_availability(
        self,
        request: ScheduleRequest
    ) -> Dict[str, Any]:
        """
        Check calendar availability.
        
        Args:
            request: Schedule request
            
        Returns:
            Availability information
        """
        # Simulate availability check
        now = datetime.utcnow()
        conflicts = []
        
        # Check for conflicts in mock calendar
        date_key = now.strftime("%Y-%m-%d")
        if date_key in self.calendar:
            existing_events = self.calendar[date_key]
            for event in existing_events:
                # Simple overlap check
                conflicts.append({
                    "event": event["title"],
                    "time": event["time"],
                    "duration": event.get("duration", 30)
                })
        
        return {
            "available": len(conflicts) == 0,
            "conflicts": conflicts,
            "free_slots": self._find_free_slots(now, request.duration)
        }
    
    def _find_free_slots(
        self,
        start_date: datetime,
        duration: int
    ) -> List[Dict[str, str]]:
        """
        Find available time slots.
        
        Args:
            start_date: Start searching from this date
            duration: Required duration in minutes
            
        Returns:
            List of free slots
        """
        free_slots = []
        
        # Generate sample free slots
        for day in range(5):  # Next 5 days
            date = start_date + timedelta(days=day)
            
            # Morning slots
            free_slots.append({
                "date": date.strftime("%Y-%m-%d"),
                "time": "09:00",
                "duration": duration,
                "quality": "high"  # Morning = high quality
            })
            
            # Afternoon slots
            free_slots.append({
                "date": date.strftime("%Y-%m-%d"),
                "time": "14:00",
                "duration": duration,
                "quality": "medium"
            })
            
            if day < 2:  # Only show evening slots for next 2 days
                free_slots.append({
                    "date": date.strftime("%Y-%m-%d"),
                    "time": "16:30",
                    "duration": duration,
                    "quality": "low"
                })
        
        return free_slots[:10]  # Return max 10 slots
    
    async def _find_optimal_slot(
        self,
        request: ScheduleRequest,
        availability: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Find the optimal time slot.
        
        Args:
            request: Schedule request
            availability: Availability information
            
        Returns:
            Optimal slot information
        """
        free_slots = availability.get("free_slots", [])
        
        if not free_slots:
            return None
        
        # Score slots based on various factors
        scored_slots = []
        for slot in free_slots:
            score = 0
            
            # Priority bonus
            if request.priority == Priority.URGENT:
                # Prefer earlier slots for urgent items
                if slot["date"] == datetime.utcnow().strftime("%Y-%m-%d"):
                    score += 10
            
            # Quality score
            if slot["quality"] == "high":
                score += 5
            elif slot["quality"] == "medium":
                score += 3
            
            # Add score to slot
            slot["score"] = score
            scored_slots.append(slot)
        
        # Sort by score and return best
        scored_slots.sort(key=lambda x: x["score"], reverse=True)
        return scored_slots[0] if scored_slots else None
    
    async def _schedule_meeting(
        self,
        request: ScheduleRequest,
        optimal_slot: Optional[Dict[str, Any]]
    ) -> ScheduleResult:
        """
        Schedule a meeting.
        
        Args:
            request: Schedule request
            optimal_slot: Optimal time slot
            
        Returns:
            Schedule result
        """
        if not optimal_slot:
            return ScheduleResult(
                success=False,
                duration=request.duration,
                suggestions=await self._get_alternative_suggestions(request),
                optimization_tips=["Consider reducing meeting frequency", "Try async communication"]
            )
        
        # Create event
        event_id = f"evt_{datetime.utcnow().timestamp()}"
        scheduled_time = f"{optimal_slot['date']} {optimal_slot['time']}"
        
        # Add to calendar
        date_key = optimal_slot["date"]
        if date_key not in self.calendar:
            self.calendar[date_key] = []
        
        self.calendar[date_key].append({
            "id": event_id,
            "title": request.title,
            "time": optimal_slot["time"],
            "duration": request.duration,
            "priority": request.priority.value,
            "participants": request.participants
        })
        
        return ScheduleResult(
            success=True,
            event_id=event_id,
            scheduled_time=scheduled_time,
            duration=request.duration,
            conflicts=[],
            suggestions=[],
            calendar_summary={
                "total_events_today": len(self.calendar.get(date_key, [])),
                "next_available": self._get_next_available_slot()
            },
            optimization_tips=[
                "Block focus time before/after meetings",
                "Consider batching similar meetings"
            ]
        )
    
    async def _find_time(self, request: ScheduleRequest) -> ScheduleResult:
        """
        Find available time slots.
        
        Args:
            request: Schedule request
            
        Returns:
            Available times
        """
        availability = await self._check_availability(request)
        free_slots = availability.get("free_slots", [])
        
        return ScheduleResult(
            success=True,
            duration=request.duration,
            suggestions=[
                {
                    "time": f"{slot['date']} {slot['time']}",
                    "quality": slot["quality"],
                    "available": True
                }
                for slot in free_slots[:5]
            ],
            calendar_summary={
                "free_slots_found": len(free_slots)
            },
            optimization_tips=[
                "Morning slots tend to have higher productivity",
                "Avoid back-to-back meetings when possible"
            ]
        )
    
    async def _set_reminder(self, request: ScheduleRequest) -> ScheduleResult:
        """
        Set a reminder.
        
        Args:
            request: Schedule request
            
        Returns:
            Reminder result
        """
        reminder_id = f"rem_{datetime.utcnow().timestamp()}"
        
        self.reminders.append({
            "id": reminder_id,
            "title": request.title,
            "time": datetime.utcnow() + timedelta(hours=1),  # Default 1 hour from now
            "priority": request.priority.value
        })
        
        return ScheduleResult(
            success=True,
            event_id=reminder_id,
            scheduled_time=(datetime.utcnow() + timedelta(hours=1)).isoformat(),
            duration=0,
            calendar_summary={
                "active_reminders": len(self.reminders)
            },
            optimization_tips=[
                "Set reminders for important deadlines",
                "Use recurring reminders for habits"
            ]
        )
    
    async def _optimize_calendar(self, request: ScheduleRequest) -> ScheduleResult:
        """
        Optimize calendar schedule.
        
        Args:
            request: Schedule request
            
        Returns:
            Optimization results
        """
        optimizations = [
            "Batch similar meetings on same days",
            "Create 'No Meeting' blocks for deep work",
            "Add buffer time between back-to-back meetings",
            "Move low-priority meetings to less productive hours",
            "Convert some meetings to async communication"
        ]
        
        return ScheduleResult(
            success=True,
            duration=0,
            calendar_summary={
                "total_meetings_week": 15,
                "average_daily_meetings": 3,
                "focus_time_available": "40%"
            },
            optimization_tips=optimizations
        )
    
    async def _general_scheduling(
        self,
        request: ScheduleRequest,
        optimal_slot: Optional[Dict[str, Any]]
    ) -> ScheduleResult:
        """
        Handle general scheduling requests.
        
        Args:
            request: Schedule request
            optimal_slot: Optimal slot
            
        Returns:
            Schedule result
        """
        return await self._schedule_meeting(request, optimal_slot)
    
    async def _get_alternative_suggestions(
        self,
        request: ScheduleRequest
    ) -> List[Dict[str, Any]]:
        """
        Get alternative scheduling suggestions.
        
        Args:
            request: Schedule request
            
        Returns:
            Alternative suggestions
        """
        return [
            {
                "option": "Split into multiple shorter meetings",
                "benefit": "Better engagement and retention"
            },
            {
                "option": "Convert to async discussion",
                "benefit": "More flexible participation"
            },
            {
                "option": "Schedule for next week",
                "benefit": "More availability options"
            }
        ]
    
    def _get_next_available_slot(self) -> str:
        """
        Get the next available time slot.
        
        Returns:
            Next available slot description
        """
        # Simple mock implementation
        next_slot = datetime.utcnow() + timedelta(hours=2)
        return next_slot.strftime("%Y-%m-%d %H:%M")