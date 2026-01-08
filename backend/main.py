"""
Omtobe MVP v0.1: FastAPI Backend

Core Endpoints:
- POST /api/v1/state/check - Check if Brake screen should display
- POST /api/v1/decisions - Record user decision (Proceed/Delay)
- POST /api/v1/reflections - Record reflection response
- GET /api/v1/state - Get current state machine state
"""

from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List
import pytz
import logging

from state_machine import OmtobeStateMachine, DecisionType, ReflectionResponse, HRVSample, CalendarEvent
from models import User, DecisionLog, ReflectionLog, HRVBaseline, StateMachineState, Base
from integrations import (
    HealthKitIntegration,
    GoogleCalendarIntegration,
    MockHealthKitIntegration,
    MockGoogleCalendarIntegration
)
from database import engine, SessionLocal

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI app
app = FastAPI(
    title="Omtobe MVP v0.1",
    description="Mirror + Brake Decision Intervention System",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Dependency injection
def get_db():
    """Get database session."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


async def get_state_machine(user_id: str, db: Session) -> OmtobeStateMachine:
    """
    Get or create state machine for user.
    
    Args:
        user_id: User identifier
        db: Database session
        
    Returns:
        OmtobeStateMachine: State machine instance
    """
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get or create state machine state
    state = db.query(StateMachineState).filter(
        StateMachineState.user_id == user_id
    ).first()
    
    if not state:
        # Create new state
        state = StateMachineState(
            user_id=user_id,
            cycle_start_date=datetime.now(pytz.UTC),
            current_day=1,
            cooling_period_active=0
        )
        db.add(state)
        db.commit()
    
    # Initialize state machine
    sm = OmtobeStateMachine(
        user_id=user_id,
        cycle_start_date=state.cycle_start_date,
        timezone=user.timezone
    )
    
    # Restore state
    sm.cooling_period_active = bool(state.cooling_period_active)
    sm.cooling_period_start = state.cooling_period_start
    sm.decision_locked_for_event = state.decision_locked_for_event
    sm.last_brake_display_time = state.last_brake_display_time
    
    return sm


# ============================================================================
# API ENDPOINTS
# ============================================================================

@app.get("/api/v1/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "version": "0.1.0",
        "timestamp": datetime.now(pytz.UTC).isoformat()
    }


@app.post("/api/v1/users")
async def create_user(
    user_id: str,
    email: str,
    timezone: str = "UTC",
    db: Session = Depends(get_db)
):
    """
    Create new user account.
    
    Args:
        user_id: Unique user identifier
        email: User email
        timezone: User's timezone (default: UTC)
        db: Database session
        
    Returns:
        dict: User information
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.id == user_id).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="User already exists")
    
    # Create new user
    user = User(
        id=user_id,
        email=email,
        timezone=timezone
    )
    db.add(user)
    db.commit()
    
    logger.info(f"Created user: {user_id}")
    
    return {
        "user_id": user.id,
        "email": user.email,
        "timezone": user.timezone,
        "created_at": user.created_at.isoformat()
    }


@app.post("/api/v1/state/check")
async def check_brake_screen(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Check if Brake screen should be displayed.
    
    This endpoint:
    1. Fetches latest HRV data from HealthKit
    2. Fetches active high-stakes events from Google Calendar
    3. Runs state machine logic to determine if intervention needed
    
    Args:
        user_id: User identifier
        db: Database session
        
    Returns:
        dict: Brake screen display decision and event info
    """
    try:
        # Get state machine
        sm = await get_state_machine(user_id, db)
        
        # Get user for API tokens
        user = db.query(User).filter(User.id == user_id).first()
        
        # Initialize integrations (mock for MVP)
        hrv_integration = MockHealthKitIntegration()
        calendar_integration = MockGoogleCalendarIntegration()
        
        # Fetch HRV data
        latest_hrv = await hrv_integration.get_latest_hrv()
        if not latest_hrv:
            return {
                "should_display": False,
                "reason": "No HRV data available",
                "current_day": sm.current_day
            }
        
        # Fetch 7-day baseline
        baseline_samples = await hrv_integration.get_7day_baseline()
        
        # Fetch high-stakes events
        active_events = await calendar_integration.get_active_high_stakes_events()
        
        # Check if Brake screen should display
        should_display, event_id = sm.should_display_brake_screen(
            current_hrv=latest_hrv.value,
            calendar_events=active_events,
            hrv_samples=baseline_samples
        )
        
        # Update state in database
        state = db.query(StateMachineState).filter(
            StateMachineState.user_id == user_id
        ).first()
        
        if state:
            state.current_day = sm.current_day
            state.cooling_period_active = int(sm.cooling_period_active)
            state.cooling_period_start = sm.cooling_period_start
            state.decision_locked_for_event = sm.decision_locked_for_event
            state.last_brake_display_time = sm.last_brake_display_time
            db.commit()
        
        logger.info(f"Brake check for {user_id}: should_display={should_display}")
        
        return {
            "should_display": should_display,
            "event_id": event_id,
            "current_day": sm.current_day,
            "phase": sm._get_phase_name(),
            "hrv_current": latest_hrv.value,
            "hrv_baseline_mean": sm.hrv_baseline_mean,
            "timestamp": datetime.now(pytz.UTC).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error checking brake screen: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/decisions")
async def record_decision(
    user_id: str,
    decision_type: str,
    db: Session = Depends(get_db),
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """
    Record user's decision response to Brake screen.
    
    Args:
        user_id: User identifier
        decision_type: "Proceed" or "Delay"
        db: Database session
        background_tasks: Background task queue
        
    Returns:
        dict: Decision recorded and next action
    """
    try:
        # Validate decision type
        if decision_type not in ["Proceed", "Delay"]:
            raise HTTPException(status_code=400, detail="Invalid decision type")
        
        # Get state machine
        sm = await get_state_machine(user_id, db)
        
        # Handle decision
        decision_enum = DecisionType.PROCEED if decision_type == "Proceed" else DecisionType.DELAY
        result = sm.handle_brake_response(decision_enum)
        
        # Record decision in database
        decision_log = DecisionLog(
            user_id=user_id,
            timestamp=datetime.now(pytz.UTC),
            decision_type=decision_type,
            day=sm.current_day
        )
        db.add(decision_log)
        
        # Update state machine state
        state = db.query(StateMachineState).filter(
            StateMachineState.user_id == user_id
        ).first()
        
        if state:
            state.cooling_period_active = int(sm.cooling_period_active)
            state.cooling_period_start = sm.cooling_period_start
            state.decision_locked_for_event = sm.decision_locked_for_event
        
        db.commit()
        
        logger.info(f"Decision recorded for {user_id}: {decision_type}")
        
        return {
            "status": "decision_recorded",
            "decision_type": decision_type,
            "timestamp": datetime.now(pytz.UTC).isoformat(),
            "next_action": result.get("status"),
            "re_trigger_time": result.get("re_trigger_time")
        }
    
    except Exception as e:
        logger.error(f"Error recording decision: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/reflections")
async def record_reflection(
    user_id: str,
    response: str,
    db: Session = Depends(get_db)
):
    """
    Record user's reflection response on Day 7.
    
    Args:
        user_id: User identifier
        response: "Yes", "No", or "Skip"
        db: Database session
        
    Returns:
        dict: Reflection recorded and cycle reset info
    """
    try:
        # Validate response
        if response not in ["Yes", "No", "Skip"]:
            raise HTTPException(status_code=400, detail="Invalid reflection response")
        
        # Get state machine
        sm = await get_state_machine(user_id, db)
        
        # Check if it's Day 7
        if sm.current_day != 7:
            raise HTTPException(status_code=400, detail="Reflection only available on Day 7")
        
        # Handle reflection
        response_enum = ReflectionResponse[response.upper()]
        result = sm.handle_reflection_response(response_enum)
        
        # Record reflection in database
        reflection_log = ReflectionLog(
            user_id=user_id,
            timestamp=datetime.now(pytz.UTC),
            response=response,
            cycle_start_date=sm.cycle_start_date
        )
        db.add(reflection_log)
        
        # Prepare for cycle reset
        reset_result = sm.reset_cycle()
        
        # Update state machine state
        state = db.query(StateMachineState).filter(
            StateMachineState.user_id == user_id
        ).first()
        
        if state:
            state.cycle_start_date = sm.cycle_start_date
            state.current_day = sm.current_day
            state.cooling_period_active = 0
            state.cooling_period_start = None
            state.decision_locked_for_event = None
        
        db.commit()
        
        logger.info(f"Reflection recorded for {user_id}: {response}")
        
        return {
            "status": "reflection_recorded",
            "response": response,
            "timestamp": datetime.now(pytz.UTC).isoformat(),
            "cycle_reset": reset_result
        }
    
    except Exception as e:
        logger.error(f"Error recording reflection: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/state")
async def get_state(
    user_id: str,
    db: Session = Depends(get_db)
):
    """
    Get current state machine state for user.
    
    Args:
        user_id: User identifier
        db: Database session
        
    Returns:
        dict: Complete state information
    """
    try:
        sm = await get_state_machine(user_id, db)
        
        return {
            "user_id": user_id,
            "state": sm.get_state_summary(),
            "timestamp": datetime.now(pytz.UTC).isoformat()
        }
    
    except Exception as e:
        logger.error(f"Error getting state: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/decisions/history")
async def get_decision_history(
    user_id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get user's decision history.
    
    Args:
        user_id: User identifier
        limit: Maximum number of records
        db: Database session
        
    Returns:
        dict: Decision history
    """
    try:
        decisions = db.query(DecisionLog).filter(
            DecisionLog.user_id == user_id
        ).order_by(DecisionLog.timestamp.desc()).limit(limit).all()
        
        return {
            "user_id": user_id,
            "decisions": [
                {
                    "timestamp": d.timestamp.isoformat(),
                    "decision_type": d.decision_type,
                    "day": d.day
                }
                for d in decisions
            ],
            "total": len(decisions)
        }
    
    except Exception as e:
        logger.error(f"Error getting decision history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/v1/reflections/history")
async def get_reflection_history(
    user_id: str,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Get user's reflection history.
    
    Args:
        user_id: User identifier
        limit: Maximum number of records
        db: Database session
        
    Returns:
        dict: Reflection history
    """
    try:
        reflections = db.query(ReflectionLog).filter(
            ReflectionLog.user_id == user_id
        ).order_by(ReflectionLog.timestamp.desc()).limit(limit).all()
        
        return {
            "user_id": user_id,
            "reflections": [
                {
                    "timestamp": r.timestamp.isoformat(),
                    "response": r.response,
                    "cycle_start_date": r.cycle_start_date.isoformat()
                }
                for r in reflections
            ],
            "total": len(reflections)
        }
    
    except Exception as e:
        logger.error(f"Error getting reflection history: {e}")
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
