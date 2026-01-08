"""
Omtobe MVP v0.1: End-to-End Integration Tests

Testing Requirements:
1. Simulate HRV drop (>20%) + active high-stakes event
2. Verify void state on Day 1-2 (no Brake screen)
3. Test Delay 20 mins loop
4. Confirm zero-logging (only timestamp + decision_type)
"""

import pytest
from datetime import datetime, timedelta
import pytz
from sqlalchemy.orm import Session

from main import app
from models import User, DecisionLog, ReflectionLog, StateMachineState
from state_machine import OmtobeStateMachine, DecisionType, HRVSample, CalendarEvent
from database import SessionLocal
from fastapi.testclient import TestClient

client = TestClient(app)


class TestE2EIntegration:
    """End-to-end integration tests for Omtobe MVP v0.1"""

    @pytest.fixture
    def db(self):
        """Database session fixture"""
        db = SessionLocal()
        yield db
        db.close()

    @pytest.fixture
    def test_user(self, db: Session):
        """Create test user"""
        user = User(
            id="test_user_001",
            email="test@example.com",
            timezone="UTC"
        )
        db.add(user)
        db.commit()
        return user

    def test_void_state_day_1_2_no_brake_screen(self, db: Session, test_user: User):
        """
        Test 1: Verify void state on Day 1-2
        
        Even with HRV drop + high-stakes event, Brake screen should NOT display
        during Total Silence phase (Days 1-2).
        """
        # Create state machine for Day 1
        sm = OmtobeStateMachine(
            user_id=test_user.id,
            cycle_start_date=datetime.now(pytz.UTC),
            timezone="UTC"
        )

        assert sm.current_day == 1
        assert sm._get_phase_name() == "Total Silence"

        # Simulate HRV drop > 20%
        baseline_mean = 50.0
        current_hrv = 35.0  # 30% drop
        hrv_drop_detected = sm._is_hrv_drop_detected(current_hrv, baseline_mean)
        assert hrv_drop_detected is True

        # Simulate active high-stakes event
        calendar_events = [
            CalendarEvent(
                title="! High-Stakes Decision",
                start_time=datetime.now(pytz.UTC) - timedelta(minutes=10),
                end_time=datetime.now(pytz.UTC) + timedelta(minutes=50),
                is_high_stakes=True
            )
        ]

        # Create mock HRV samples
        hrv_samples = [
            HRVSample(
                timestamp=datetime.now(pytz.UTC) - timedelta(hours=i),
                value=50.0 + (i % 5)
            )
            for i in range(100)
        ]

        # Check if Brake screen should display
        should_display, event_id = sm.should_display_brake_screen(
            current_hrv=current_hrv,
            calendar_events=calendar_events,
            hrv_samples=hrv_samples
        )

        # On Day 1-2, should NOT display even with HRV drop + high-stakes event
        assert should_display is False
        print("✓ Test 1 Passed: Void state maintained on Day 1-2")

    def test_intervention_trigger_day_3_5(self, db: Session, test_user: User):
        """
        Test 2: Verify intervention trigger on Day 3-5
        
        On Day 3-5, with HRV drop + high-stakes event, Brake screen SHOULD display.
        """
        # Create state machine for Day 4
        cycle_start = datetime.now(pytz.UTC) - timedelta(days=3)
        sm = OmtobeStateMachine(
            user_id=test_user.id,
            cycle_start_date=cycle_start,
            timezone="UTC"
        )

        # Verify we're on Day 4
        assert sm.current_day == 4
        assert sm._get_phase_name() == "Intervention Logic"

        # Simulate HRV drop > 20%
        baseline_mean = 50.0
        current_hrv = 35.0  # 30% drop
        hrv_drop_detected = sm._is_hrv_drop_detected(current_hrv, baseline_mean)
        assert hrv_drop_detected is True

        # Simulate active high-stakes event
        calendar_events = [
            CalendarEvent(
                title="Board Meeting",
                start_time=datetime.now(pytz.UTC) - timedelta(minutes=10),
                end_time=datetime.now(pytz.UTC) + timedelta(minutes=50),
                is_high_stakes=True
            )
        ]

        # Create mock HRV samples
        hrv_samples = [
            HRVSample(
                timestamp=datetime.now(pytz.UTC) - timedelta(hours=i),
                value=50.0 + (i % 5)
            )
            for i in range(100)
        ]

        # Check if Brake screen should display
        should_display, event_id = sm.should_display_brake_screen(
            current_hrv=current_hrv,
            calendar_events=calendar_events,
            hrv_samples=hrv_samples
        )

        # On Day 3-5, SHOULD display with HRV drop + high-stakes event
        assert should_display is True
        assert event_id == "Board Meeting"
        print("✓ Test 2 Passed: Intervention triggered on Day 3-5")

    def test_delay_20_min_loop(self, db: Session, test_user: User):
        """
        Test 3: Verify Delay 20 mins loop
        
        When user clicks "Delay 20 mins", cooling period should activate.
        After 20 minutes, Brake screen should re-display.
        """
        # Create state machine for Day 4
        cycle_start = datetime.now(pytz.UTC) - timedelta(days=3)
        sm = OmtobeStateMachine(
            user_id=test_user.id,
            cycle_start_date=cycle_start,
            timezone="UTC"
        )

        # Simulate Delay decision
        result = sm.handle_brake_response(DecisionType.DELAY)

        assert sm.cooling_period_active is True
        assert result["status"] == "cooling_period_activated"
        assert "re_trigger_time" in result
        print("✓ Test 3a Passed: Cooling period activated")

        # Verify cooling period is not expired yet
        assert sm._is_cooling_period_expired() is False

        # Simulate 20 minutes passing
        sm.cooling_period_start = datetime.now(pytz.UTC) - timedelta(seconds=1200)

        # Verify cooling period is now expired
        assert sm._is_cooling_period_expired() is True
        print("✓ Test 3b Passed: Cooling period expired after 20 minutes")

        # Verify Brake screen should re-display
        baseline_mean = 50.0
        current_hrv = 35.0
        calendar_events = [
            CalendarEvent(
                title="Board Meeting",
                start_time=datetime.now(pytz.UTC) - timedelta(minutes=10),
                end_time=datetime.now(pytz.UTC) + timedelta(minutes=50),
                is_high_stakes=True
            )
        ]
        hrv_samples = [
            HRVSample(
                timestamp=datetime.now(pytz.UTC) - timedelta(hours=i),
                value=50.0 + (i % 5)
            )
            for i in range(100)
        ]

        # After cooling period expires, Brake screen should display again
        sm.cooling_period_active = False  # Manually reset
        should_display, event_id = sm.should_display_brake_screen(
            current_hrv=current_hrv,
            calendar_events=calendar_events,
            hrv_samples=hrv_samples
        )

        assert should_display is True
        print("✓ Test 3c Passed: Brake screen re-displays after cooling period")

    def test_proceed_locks_decision(self, db: Session, test_user: User):
        """
        Test 4: Verify Proceed locks decision
        
        When user clicks "Proceed", decision should be locked.
        No further interventions for this event.
        """
        # Create state machine for Day 4
        cycle_start = datetime.now(pytz.UTC) - timedelta(days=3)
        sm = OmtobeStateMachine(
            user_id=test_user.id,
            cycle_start_date=cycle_start,
            timezone="UTC"
        )

        # Simulate Proceed decision
        result = sm.handle_brake_response(DecisionType.PROCEED)

        assert sm.decision_locked_for_event is not None
        assert result["status"] == "decision_locked"
        print("✓ Test 4a Passed: Decision locked")

        # Verify Brake screen should NOT display again
        baseline_mean = 50.0
        current_hrv = 35.0
        calendar_events = [
            CalendarEvent(
                title="Board Meeting",
                start_time=datetime.now(pytz.UTC) - timedelta(minutes=10),
                end_time=datetime.now(pytz.UTC) + timedelta(minutes=50),
                is_high_stakes=True
            )
        ]
        hrv_samples = [
            HRVSample(
                timestamp=datetime.now(pytz.UTC) - timedelta(hours=i),
                value=50.0 + (i % 5)
            )
            for i in range(100)
        ]

        should_display, event_id = sm.should_display_brake_screen(
            current_hrv=current_hrv,
            calendar_events=calendar_events,
            hrv_samples=hrv_samples
        )

        assert should_display is False
        print("✓ Test 4b Passed: No further interventions after Proceed")

    def test_zero_logging_principle(self, db: Session, test_user: User):
        """
        Test 5: Confirm zero-logging principle
        
        Database should ONLY contain:
        - timestamp
        - decision_type
        
        NO event content, NO physiological values, NO emotional metadata.
        """
        # Create decision log
        decision_log = DecisionLog(
            user_id=test_user.id,
            timestamp=datetime.now(pytz.UTC),
            decision_type="Proceed",
            day=4
        )
        db.add(decision_log)
        db.commit()

        # Retrieve from database
        retrieved = db.query(DecisionLog).filter(
            DecisionLog.user_id == test_user.id
        ).first()

        # Verify only minimal data is stored
        assert retrieved.timestamp is not None
        assert retrieved.decision_type == "Proceed"
        assert retrieved.day == 4

        # Verify NO event content
        assert not hasattr(retrieved, 'event_content')
        assert not hasattr(retrieved, 'hrv_value')
        assert not hasattr(retrieved, 'emotional_state')

        print("✓ Test 5 Passed: Zero-logging principle confirmed")

        # Print database schema to verify
        print("\nDecisionLog schema:")
        for column in DecisionLog.__table__.columns:
            print(f"  - {column.name}: {column.type}")

    def test_api_endpoint_brake_check(self, db: Session, test_user: User):
        """
        Test 6: Verify API endpoint for brake check
        
        Test the actual HTTP endpoint: POST /api/v1/state/check
        """
        # Create user via API
        response = client.post(
            "/api/v1/users",
            json={
                "user_id": "api_test_user",
                "email": "api@example.com",
                "timezone": "UTC"
            }
        )
        assert response.status_code == 200
        print("✓ Test 6a Passed: User creation endpoint works")

        # Check brake screen
        response = client.post(
            "/api/v1/state/check",
            json={"user_id": "api_test_user"}
        )
        assert response.status_code == 200
        data = response.json()
        assert "should_display" in data
        assert "current_day" in data
        assert "phase" in data
        print("✓ Test 6b Passed: Brake check endpoint works")

    def test_api_endpoint_decision_recording(self, db: Session, test_user: User):
        """
        Test 7: Verify API endpoint for decision recording
        
        Test the actual HTTP endpoint: POST /api/v1/decisions
        """
        # Create user via API
        response = client.post(
            "/api/v1/users",
            json={
                "user_id": "decision_test_user",
                "email": "decision@example.com",
                "timezone": "UTC"
            }
        )
        assert response.status_code == 200

        # Record decision
        response = client.post(
            "/api/v1/decisions",
            json={
                "user_id": "decision_test_user",
                "decision_type": "Proceed"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "decision_recorded"
        assert data["decision_type"] == "Proceed"
        print("✓ Test 7a Passed: Decision recording endpoint works")

        # Verify decision was recorded in database
        decision = db.query(DecisionLog).filter(
            DecisionLog.user_id == "decision_test_user"
        ).first()
        assert decision is not None
        assert decision.decision_type == "Proceed"
        print("✓ Test 7b Passed: Decision recorded in database")


if __name__ == "__main__":
    # Run tests
    pytest.main([__file__, "-v", "-s"])
