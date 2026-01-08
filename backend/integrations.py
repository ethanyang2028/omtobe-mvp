"""
External API Integrations for Omtobe MVP v0.1

- Apple HealthKit: HRV data collection
- Google Calendar: High-stakes event detection
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict
import httpx
import json
from dataclasses import dataclass
import pytz


@dataclass
class HRVSample:
    """Single HRV measurement from Apple HealthKit."""
    timestamp: datetime
    value: float  # Heart Rate Variability in milliseconds


@dataclass
class CalendarEvent:
    """High-stakes calendar event from Google Calendar."""
    event_id: str
    title: str
    start_time: datetime
    end_time: datetime


class HealthKitIntegration:
    """
    Apple HealthKit Integration for HRV data collection.
    
    Note: In production, this would use Apple's HealthKit framework on iOS.
    For MVP, we simulate with mock data or use a proxy service.
    """
    
    def __init__(self, access_token: str):
        """
        Initialize HealthKit integration.
        
        Args:
            access_token: OAuth token from Apple HealthKit
        """
        self.access_token = access_token
        self.base_url = "https://api.healthkit.apple.com"  # Placeholder
        self.client = httpx.AsyncClient()
    
    async def get_hrv_samples(
        self,
        start_date: datetime,
        end_date: datetime,
        limit: int = 1000
    ) -> List[HRVSample]:
        """
        Fetch HRV samples from HealthKit for a date range.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            limit: Maximum number of samples to return
            
        Returns:
            List[HRVSample]: HRV measurements
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        params = {
            "start_date": start_date.isoformat(),
            "end_date": end_date.isoformat(),
            "limit": limit,
            "data_type": "HKQuantityTypeIdentifierHeartRateVariabilitySDNN"
        }
        
        try:
            response = await self.client.get(
                f"{self.base_url}/v1/samples",
                headers=headers,
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            
            data = response.json()
            samples = []
            
            for item in data.get("samples", []):
                sample = HRVSample(
                    timestamp=datetime.fromisoformat(item["timestamp"]),
                    value=float(item["value"])
                )
                samples.append(sample)
            
            return samples
        
        except httpx.HTTPError as e:
            print(f"HealthKit API error: {e}")
            return []
    
    async def get_latest_hrv(self) -> Optional[HRVSample]:
        """
        Fetch the most recent HRV sample.
        
        Returns:
            Optional[HRVSample]: Latest HRV measurement, or None if unavailable
        """
        now = datetime.now(pytz.UTC)
        one_hour_ago = now - timedelta(hours=1)
        
        samples = await self.get_hrv_samples(one_hour_ago, now, limit=1)
        return samples[0] if samples else None
    
    async def get_7day_baseline(self) -> List[HRVSample]:
        """
        Fetch 7-day HRV data for baseline calculation.
        
        Returns:
            List[HRVSample]: HRV samples from past 7 days
        """
        now = datetime.now(pytz.UTC)
        seven_days_ago = now - timedelta(days=7)
        
        return await self.get_hrv_samples(seven_days_ago, now, limit=10000)


class GoogleCalendarIntegration:
    """
    Google Calendar Integration for high-stakes event detection.
    
    Filters events by keywords: "Board", "Negotiation", "Review", "High-Stakes", or "!" prefix.
    """
    
    TRIGGER_KEYWORDS = {"board", "negotiation", "review", "high-stakes"}
    
    def __init__(self, access_token: str):
        """
        Initialize Google Calendar integration.
        
        Args:
            access_token: OAuth token from Google Calendar API
        """
        self.access_token = access_token
        self.base_url = "https://www.googleapis.com/calendar/v3"
        self.client = httpx.AsyncClient()
    
    def _is_high_stakes_event(self, event_title: str) -> bool:
        """
        Check if event title matches high-stakes criteria.
        
        Args:
            event_title: Event title from Google Calendar
            
        Returns:
            bool: True if event is high-stakes
        """
        title_lower = event_title.lower()
        
        # Check for trigger keywords
        if any(keyword in title_lower for keyword in self.TRIGGER_KEYWORDS):
            return True
        
        # Check for "!" prefix
        if event_title.startswith("!"):
            return True
        
        return False
    
    async def get_high_stakes_events(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[CalendarEvent]:
        """
        Fetch high-stakes events from Google Calendar.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            
        Returns:
            List[CalendarEvent]: High-stakes events
        """
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        params = {
            "timeMin": start_date.isoformat(),
            "timeMax": end_date.isoformat(),
            "maxResults": 100,
            "singleEvents": True,
            "orderBy": "startTime"
        }
        
        try:
            response = await self.client.get(
                f"{self.base_url}/calendars/primary/events",
                headers=headers,
                params=params,
                timeout=10.0
            )
            response.raise_for_status()
            
            data = response.json()
            high_stakes_events = []
            
            for item in data.get("items", []):
                title = item.get("summary", "")
                
                # Filter for high-stakes events only
                if self._is_high_stakes_event(title):
                    event = CalendarEvent(
                        event_id=item["id"],
                        title=title,
                        start_time=datetime.fromisoformat(
                            item["start"].get("dateTime", item["start"].get("date"))
                        ),
                        end_time=datetime.fromisoformat(
                            item["end"].get("dateTime", item["end"].get("date"))
                        )
                    )
                    high_stakes_events.append(event)
            
            return high_stakes_events
        
        except httpx.HTTPError as e:
            print(f"Google Calendar API error: {e}")
            return []
    
    async def get_active_high_stakes_events(self) -> List[CalendarEvent]:
        """
        Fetch currently active high-stakes events.
        
        Returns:
            List[CalendarEvent]: Events that are currently happening
        """
        now = datetime.now(pytz.UTC)
        one_day_later = now + timedelta(days=1)
        
        events = await self.get_high_stakes_events(now, one_day_later)
        
        # Filter for currently active events
        active_events = [
            event for event in events
            if event.start_time <= now <= event.end_time
        ]
        
        return active_events


class MockHealthKitIntegration:
    """
    Mock HealthKit integration for testing and development.
    
    Generates realistic HRV data patterns.
    """
    
    def __init__(self):
        """Initialize mock integration."""
        pass
    
    async def get_hrv_samples(
        self,
        start_date: datetime,
        end_date: datetime,
        limit: int = 1000
    ) -> List[HRVSample]:
        """
        Generate mock HRV samples.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            limit: Maximum number of samples
            
        Returns:
            List[HRVSample]: Mock HRV measurements
        """
        import random
        
        samples = []
        current = start_date
        
        # Generate samples every 5 minutes
        while current <= end_date and len(samples) < limit:
            # Baseline around 50ms with natural variation
            base_value = 50 + random.gauss(0, 5)
            value = max(20, base_value)  # Ensure positive values
            
            sample = HRVSample(
                timestamp=current,
                value=value
            )
            samples.append(sample)
            current += timedelta(minutes=5)
        
        return samples
    
    async def get_latest_hrv(self) -> Optional[HRVSample]:
        """Get latest mock HRV sample."""
        now = datetime.now(pytz.UTC)
        one_hour_ago = now - timedelta(hours=1)
        
        samples = await self.get_hrv_samples(one_hour_ago, now, limit=1)
        return samples[0] if samples else None
    
    async def get_7day_baseline(self) -> List[HRVSample]:
        """Get 7-day mock HRV data."""
        now = datetime.now(pytz.UTC)
        seven_days_ago = now - timedelta(days=7)
        
        return await self.get_hrv_samples(seven_days_ago, now, limit=10000)


class MockGoogleCalendarIntegration:
    """
    Mock Google Calendar integration for testing and development.
    
    Generates realistic high-stakes events.
    """
    
    def __init__(self):
        """Initialize mock integration."""
        pass
    
    async def get_high_stakes_events(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[CalendarEvent]:
        """
        Generate mock high-stakes events.
        
        Args:
            start_date: Start of date range
            end_date: End of date range
            
        Returns:
            List[CalendarEvent]: Mock high-stakes events
        """
        events = []
        
        # Generate some mock events
        mock_events = [
            ("Board Meeting", 10, 11),
            ("Negotiation with Partner", 14, 15),
            ("Performance Review", 15, 16),
            ("! Critical Decision", 16, 17),
        ]
        
        for title, hour, end_hour in mock_events:
            event_start = start_date.replace(hour=hour, minute=0, second=0)
            event_end = start_date.replace(hour=end_hour, minute=0, second=0)
            
            if start_date <= event_start <= end_date:
                event = CalendarEvent(
                    event_id=f"mock_{title.replace(' ', '_')}",
                    title=title,
                    start_time=event_start,
                    end_time=event_end
                )
                events.append(event)
        
        return events
    
    async def get_active_high_stakes_events(self) -> List[CalendarEvent]:
        """Get currently active mock events."""
        now = datetime.now(pytz.UTC)
        one_day_later = now + timedelta(days=1)
        
        events = await self.get_high_stakes_events(now, one_day_later)
        
        # Filter for currently active events
        active_events = [
            event for event in events
            if event.start_time <= now <= event.end_time
        ]
        
        return active_events
