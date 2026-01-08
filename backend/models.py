"""
Database Models for Omtobe MVP v0.1

Principles:
- Minimal data collection: Only timestamp + decision_type
- No content logging, no emotional metadata
- Preserves user digital sovereignty
"""

from datetime import datetime
from sqlalchemy import Column, String, DateTime, Enum, Integer, Float, ForeignKey, Index
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import enum

Base = declarative_base()


class User(Base):
    """User account model."""
    __tablename__ = "users"
    
    id = Column(String(255), primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    timezone = Column(String(50), default="UTC")
    healthkit_token = Column(String(500), nullable=True)  # OAuth token for HealthKit
    calendar_token = Column(String(500), nullable=True)  # OAuth token for Google Calendar
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    decision_logs = relationship("DecisionLog", back_populates="user")
    reflection_logs = relationship("ReflectionLog", back_populates="user")
    hrv_baselines = relationship("HRVBaseline", back_populates="user")
    
    def __repr__(self):
        return f"<User {self.id}>"


class DecisionLog(Base):
    """
    Minimal decision record: timestamp + type only.
    
    Constraints:
    - No decision content
    - No event details
    - No emotional metadata
    - Only: timestamp + decision_type (Proceed/Delay)
    """
    __tablename__ = "decision_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    decision_type = Column(String(20), nullable=False)  # "Proceed" or "Delay"
    day = Column(Integer, nullable=False)  # Which day (1-7) of the cycle
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="decision_logs")
    
    # Index for efficient queries
    __table_args__ = (
        Index("ix_user_timestamp", "user_id", "timestamp"),
        Index("ix_user_day", "user_id", "day"),
    )
    
    def __repr__(self):
        return f"<DecisionLog {self.user_id} {self.decision_type} at {self.timestamp}>"


class ReflectionLog(Base):
    """
    Reflection response record on Day 7.
    
    Constraints:
    - Only records: timestamp + response (Yes/No/Skip)
    - No follow-up questions
    - No content logging
    """
    __tablename__ = "reflection_logs"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.utcnow)
    response = Column(String(20), nullable=False)  # "Yes", "No", or "Skip"
    cycle_start_date = Column(DateTime, nullable=False)  # Start date of the 7-day cycle
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="reflection_logs")
    
    # Index for efficient queries
    __table_args__ = (
        Index("ix_user_cycle", "user_id", "cycle_start_date"),
    )
    
    def __repr__(self):
        return f"<ReflectionLog {self.user_id} {self.response} at {self.timestamp}>"


class HRVBaseline(Base):
    """
    7-day HRV baseline for each cycle.
    
    Used to compute the 20% drop threshold for high-stress detection.
    """
    __tablename__ = "hrv_baselines"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False)
    cycle_start_date = Column(DateTime, nullable=False)  # Start of 7-day cycle
    baseline_mean = Column(Float, nullable=False)  # Mean HRV value
    baseline_std_dev = Column(Float, nullable=False)  # Standard deviation
    sample_count = Column(Integer, nullable=False)  # Number of HRV samples
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user = relationship("User", back_populates="hrv_baselines")
    
    # Index for efficient queries
    __table_args__ = (
        Index("ix_user_cycle_baseline", "user_id", "cycle_start_date"),
    )
    
    def __repr__(self):
        return f"<HRVBaseline {self.user_id} mean={self.baseline_mean:.2f}>"


class StateMachineState(Base):
    """
    Current state machine state for each user.
    
    Stores transient state that doesn't need to be persisted to database,
    but is useful for quick lookups.
    """
    __tablename__ = "state_machine_states"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(255), ForeignKey("users.id"), nullable=False, unique=True)
    cycle_start_date = Column(DateTime, nullable=False)
    current_day = Column(Integer, nullable=False)
    cooling_period_active = Column(Integer, default=0)  # 0 or 1 (boolean)
    cooling_period_start = Column(DateTime, nullable=True)
    decision_locked_for_event = Column(String(500), nullable=True)
    last_brake_display_time = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<StateMachineState {self.user_id} day={self.current_day}>"


# Enum definitions for type safety
class DecisionTypeEnum(str, enum.Enum):
    PROCEED = "Proceed"
    DELAY = "Delay"


class ReflectionResponseEnum(str, enum.Enum):
    YES = "Yes"
    NO = "No"
    SKIP = "Skip"
