"""
Database Configuration for Omtobe MVP v0.1

Uses SQLite for MVP development, can be upgraded to PostgreSQL for production.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os

# Database URL
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "sqlite:///./omtobe.db"  # SQLite for MVP
)

# Create engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {},
    echo=False
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
