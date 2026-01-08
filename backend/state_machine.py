"""
Omtobe State Machine: 7-Day Decision Intervention System

Core Logic:
- Day 1-2: Total Silence (baseline collection)
- Day 3-5: Intervention Logic (HRV + Calendar trigger)
- Day 7: One-Question Reflection
- Day 8: Auto-reset to Day 1
"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List, Tuple
from enum import Enum
from dataclasses import dataclass
import pytz


class DecisionType(str, Enum):
    """Decision types recorded in the system."""
    PROCEED = "Proceed"
    DELAY = "Delay"


class ReflectionResponse(str, Enum):
    """Reflection responses on Day 7."""
    YES = "Yes"
    NO = "No"
    SKIP = "Skip"


@dataclass
class HRVSample:
    """Single HRV measurement from Apple HealthKit."""
    timestamp: datetime
    value: float  # Heart Rate Variability in milliseconds


@dataclass
class CalendarEvent:
    """High-stakes calendar event from Google Calendar."""
    title: str
    start_time: datetime
    end_time: datetime
    is_high_stakes: bool  # True if contains trigger keywords or '!' prefix


@dataclass
class DecisionLog:
    """Minimal decision record: timestamp + type only."""
    timestamp: datetime
    decision_type: DecisionType


@dataclass
class ReflectionLog:
    """Reflection response record."""
    timestamp: datetime
    response: ReflectionResponse
    cycle_start_date: datetime


class OmtobeStateMachine:
    """
    7-Day State Machine for Omtobe MVP v0.1
    
    Constraints:
    - HRV Threshold: 20% below 7-day rolling baseline
    - Calendar Filter: "Board", "Negotiation", "Review", "High-Stakes", or "!" prefix
    - Reset: Day 7 reflection triggers reset to Day 1
    - Delay Logic: Re-trigger Brake screen exactly 20 mins after Delay click
    - Persistence: Only timestamp + decision_type (no content logging)
    """
    
    TRIGGER_KEYWORDS = {"board", "negotiation", "review", "high-stakes"}
    HRV_THRESHOLD_PERCENT = 0.20  # 20% drop threshold
    COOLING_PERIOD_SECONDS = 1200  # 20 minutes
    REFLECTION_HOUR = 9  # 09:00 AM local time
    
    def __init__(self, user_id: str, cycle_start_date: Optional[datetime] = None, timezone: str = "UTC"):
        """
        Initialize state machine for a user.
        
        Args:
            user_id: Unique user identifier
            cycle_start_date: Start of current 7-day cycle (defaults to now)
            timezone: User's timezone for reflection timing
        """
        self.user_id = user_id
        self.cycle_start_date = cycle_start_date or datetime.now(pytz.UTC)
        self.timezone = pytz.timezone(timezone)
        
        # State tracking
        self.current_day = self._calculate_day()
        self.hrv_baseline_mean: Optional[float] = None
        self.hrv_baseline_std_dev: Optional[float] = None
        self.cooling_period_active = False
        self.cooling_period_start: Optional[datetime] = None
        self.decision_locked_for_event: Optional[str] = None  # Event ID
        self.last_brake_display_time: Optional[datetime] = None
    
    def _calculate_day(self) -> int:
        """
        Calculate which day (1-7) the user is currently in.
        
        Returns:
            int: Day number (1-7)
        """
        now = datetime.now(pytz.UTC)
        days_elapsed = (now - self.cycle_start_date).days
        day = (days_elapsed % 7) + 1
        return day
    
    def _is_high_stakes_event(self, event: CalendarEvent) -> bool:
        """
        Check if calendar event matches high-stakes criteria.
        
        Criteria:
        - Title contains "Board", "Negotiation", "Review", "High-Stakes" (case-insensitive)
        - Title starts with "!" prefix
        
        Args:
            event: CalendarEvent to check
            
        Returns:
            bool: True if event is high-stakes
        """
        title_lower = event.title.lower()
        
        # Check for trigger keywords
        if any(keyword in title_lower for keyword in self.TRIGGER_KEYWORDS):
            return True
        
        # Check for "!" prefix
        if event.title.startswith("!"):
            return True
        
        return False
    
    def _compute_hrv_baseline(self, hrv_samples: List[HRVSample]) -> Tuple[float, float]:
        """
        Compute 7-day rolling baseline mean and std dev.
        
        Args:
            hrv_samples: List of HRV samples from past 7 days
            
        Returns:
            Tuple[float, float]: (mean, std_dev)
        """
        if not hrv_samples:
            return 0.0, 0.0
        
        values = [sample.value for sample in hrv_samples]
        mean = sum(values) / len(values)
        
        # Calculate standard deviation
        variance = sum((x - mean) ** 2 for x in values) / len(values)
        std_dev = variance ** 0.5
        
        return mean, std_dev
    
    def _is_hrv_drop_detected(self, current_hrv: float, baseline_mean: float) -> bool:
        """
        Check if current HRV is 20% below baseline mean.
        
        Args:
            current_hrv: Current HRV sample value
            baseline_mean: 7-day rolling baseline mean
            
        Returns:
            bool: True if HRV drop detected
        """
        if baseline_mean == 0:
            return False
        
        threshold = baseline_mean * (1 - self.HRV_THRESHOLD_PERCENT)
        return current_hrv <= threshold
    
    def _is_active_high_stakes_event(
        self,
        calendar_events: List[CalendarEvent],
        current_time: datetime
    ) -> Optional[CalendarEvent]:
        """
        Check if any high-stakes event is currently active.
        
        Args:
            calendar_events: List of calendar events
            current_time: Current time
            
        Returns:
            Optional[CalendarEvent]: Active high-stakes event, or None
        """
        for event in calendar_events:
            if self._is_high_stakes_event(event):
                if event.start_time <= current_time <= event.end_time:
                    return event
        
        return None
    
    def should_display_brake_screen(
        self,
        current_hrv: float,
        calendar_events: List[CalendarEvent],
        hrv_samples: List[HRVSample]
    ) -> Tuple[bool, Optional[str]]:
        """
        Determine if Brake screen should be displayed.
        
        Logic:
        - Day 1-2: Never (Total Silence)
        - Day 3-5: Only if HRV drop + high-stakes event overlap
        - Day 6: Never (prepare for reflection)
        - Day 7: Never (reflection screen instead)
        
        Args:
            current_hrv: Current HRV sample
            calendar_events: List of calendar events
            hrv_samples: Historical HRV samples for baseline
            
        Returns:
            Tuple[bool, Optional[str]]: (should_display, event_id)
        """
        # Phase 1: Total Silence (Days 1-2)
        if self.current_day in [1, 2]:
            return False, None
        
        # Phase 2: Intervention Logic (Days 3-5)
        if self.current_day in [3, 4, 5]:
            # Check if cooling period is active
            if self.cooling_period_active:
                if self._is_cooling_period_expired():
                    self.cooling_period_active = False
                else:
                    return False, None
            
            # Check if decision is locked for this event
            if self.decision_locked_for_event:
                return False, None
            
            # Compute HRV baseline
            baseline_mean, baseline_std_dev = self._compute_hrv_baseline(hrv_samples)
            self.hrv_baseline_mean = baseline_mean
            self.hrv_baseline_std_dev = baseline_std_dev
            
            # Check for HRV drop
            hrv_drop_detected = self._is_hrv_drop_detected(current_hrv, baseline_mean)
            
            # Check for active high-stakes event
            active_event = self._is_active_high_stakes_event(
                calendar_events,
                datetime.now(pytz.UTC)
            )
            
            # Both conditions must be true
            if hrv_drop_detected and active_event:
                self.last_brake_display_time = datetime.now(pytz.UTC)
                return True, active_event.title
        
        # Day 6 and 7: No intervention
        return False, None
    
    def should_display_reflection_screen(self, user_timezone: str) -> bool:
        """
        Determine if reflection screen should be displayed on Day 7.
        
        Displays at 09:00 AM local time.
        
        Args:
            user_timezone: User's timezone string
            
        Returns:
            bool: True if should display reflection screen
        """
        if self.current_day != 7:
            return False
        
        # Get current time in user's timezone
        tz = pytz.timezone(user_timezone)
        now_local = datetime.now(tz)
        
        # Check if current hour is 9 AM
        return now_local.hour == self.REFLECTION_HOUR
    
    def handle_brake_response(self, response: DecisionType) -> Dict:
        """
        Handle user's response to Brake screen.
        
        Args:
            response: DecisionType.PROCEED or DecisionType.DELAY
            
        Returns:
            Dict: State update information
        """
        timestamp = datetime.now(pytz.UTC)
        
        if response == DecisionType.DELAY:
            # Activate cooling period
            self.cooling_period_active = True
            self.cooling_period_start = timestamp
            
            return {
                "status": "cooling_period_activated",
                "re_trigger_time": (timestamp + timedelta(seconds=self.COOLING_PERIOD_SECONDS)).isoformat(),
                "decision_log": {
                    "timestamp": timestamp.isoformat(),
                    "decision_type": DecisionType.DELAY
                }
            }
        
        elif response == DecisionType.PROCEED:
            # Lock decision for this event
            self.decision_locked_for_event = self.last_brake_display_time
            
            return {
                "status": "decision_locked",
                "message": "No further interventions for this event",
                "decision_log": {
                    "timestamp": timestamp.isoformat(),
                    "decision_type": DecisionType.PROCEED
                }
            }
    
    def _is_cooling_period_expired(self) -> bool:
        """
        Check if 20-minute cooling period has expired.
        
        Returns:
            bool: True if cooling period is over
        """
        if not self.cooling_period_start:
            return False
        
        elapsed = (datetime.now(pytz.UTC) - self.cooling_period_start).total_seconds()
        return elapsed >= self.COOLING_PERIOD_SECONDS
    
    def handle_reflection_response(self, response: ReflectionResponse) -> Dict:
        """
        Handle user's reflection response on Day 7.
        
        After reflection, system automatically resets to Day 1 at next 00:00 UTC.
        
        Args:
            response: ReflectionResponse (YES, NO, or SKIP)
            
        Returns:
            Dict: Reflection log and reset information
        """
        timestamp = datetime.now(pytz.UTC)
        
        # Calculate next cycle start (Day 8, 00:00 UTC)
        next_cycle_start = (self.cycle_start_date + timedelta(days=7)).replace(
            hour=0, minute=0, second=0, microsecond=0
        )
        
        return {
            "status": "reflection_recorded",
            "reflection_log": {
                "timestamp": timestamp.isoformat(),
                "response": response,
                "cycle_start_date": self.cycle_start_date.isoformat()
            },
            "next_cycle_start": next_cycle_start.isoformat(),
            "message": "Cycle will reset to Day 1 at next 00:00 UTC"
        }
    
    def reset_cycle(self) -> Dict:
        """
        Reset state machine to Day 1 of new cycle.
        
        Called automatically at Day 8, 00:00 UTC.
        
        Returns:
            Dict: Reset confirmation
        """
        self.cycle_start_date = datetime.now(pytz.UTC)
        self.current_day = 1
        self.cooling_period_active = False
        self.cooling_period_start = None
        self.decision_locked_for_event = None
        self.last_brake_display_time = None
        
        return {
            "status": "cycle_reset",
            "new_cycle_start": self.cycle_start_date.isoformat(),
            "current_day": self.current_day
        }
    
    def get_state_summary(self) -> Dict:
        """
        Get current state machine summary.
        
        Returns:
            Dict: Complete state information
        """
        return {
            "user_id": self.user_id,
            "current_day": self.current_day,
            "cycle_start_date": self.cycle_start_date.isoformat(),
            "cooling_period_active": self.cooling_period_active,
            "decision_locked": self.decision_locked_for_event is not None,
            "hrv_baseline_mean": self.hrv_baseline_mean,
            "hrv_baseline_std_dev": self.hrv_baseline_std_dev,
            "phase": self._get_phase_name()
        }
    
    def _get_phase_name(self) -> str:
        """Get human-readable phase name."""
        if self.current_day in [1, 2]:
            return "Total Silence"
        elif self.current_day in [3, 4, 5]:
            return "Intervention Logic"
        elif self.current_day == 6:
            return "Preparation"
        elif self.current_day == 7:
            return "Reflection"
        else:
            return "Unknown"
