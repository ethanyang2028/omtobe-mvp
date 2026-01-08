# Omtobe MVP v0.1: Backend Architecture

## Overview

The Omtobe backend implements a production-grade FastAPI application that manages the 7-day state machine, integrates with Apple HealthKit and Google Calendar, and maintains minimal data persistence.

## Architecture Layers

### 1. State Machine Layer (`state_machine.py`)

**Responsibility**: Core decision intervention logic

**Key Classes**:
- `OmtobeStateMachine`: Main state machine orchestrator
- `HRVSample`: HRV data structure
- `CalendarEvent`: Calendar event data structure
- `DecisionLog`: Decision record
- `ReflectionLog`: Reflection response record

**Key Methods**:
- `should_display_brake_screen()`: Determines if intervention needed
- `handle_brake_response()`: Processes user decision (Proceed/Delay)
- `handle_reflection_response()`: Processes Day 7 reflection
- `reset_cycle()`: Resets to Day 1

**State Management**:
- Tracks current day (1-7)
- Manages cooling period (20 minutes)
- Locks decisions per event
- Computes HRV baseline (7-day rolling)

### 2. Data Models Layer (`models.py`)

**Database Schema**:

```
users
├── id (PK)
├── email
├── timezone
├── healthkit_token
├── calendar_token
└── created_at

decision_logs
├── id (PK)
├── user_id (FK)
├── timestamp
├── decision_type (Proceed/Delay)
├── day (1-7)
└── created_at

reflection_logs
├── id (PK)
├── user_id (FK)
├── timestamp
├── response (Yes/No/Skip)
├── cycle_start_date
└── created_at

hrv_baselines
├── id (PK)
├── user_id (FK)
├── cycle_start_date
├── baseline_mean
├── baseline_std_dev
├── sample_count
└── created_at

state_machine_states
├── id (PK)
├── user_id (FK, unique)
├── cycle_start_date
├── current_day
├── cooling_period_active
├── cooling_period_start
├── decision_locked_for_event
├── last_brake_display_time
└── updated_at
```

**Data Minimization Principle**:
- `decision_logs`: Only timestamp + decision_type (no content)
- `reflection_logs`: Only timestamp + response (no follow-up data)
- No emotional metadata
- No decision content
- No behavioral profiling

### 3. Integration Layer (`integrations.py`)

**HealthKit Integration**:
- Fetches HRV samples from Apple HealthKit
- Computes 7-day rolling baseline
- Detects 20% drop threshold
- Methods:
  - `get_hrv_samples()`: Fetch HRV data for date range
  - `get_latest_hrv()`: Get most recent sample
  - `get_7day_baseline()`: Get 7-day data

**Google Calendar Integration**:
- Fetches calendar events
- Filters for high-stakes events (keywords: "Board", "Negotiation", "Review", "High-Stakes", "!" prefix)
- Detects active events
- Methods:
  - `get_high_stakes_events()`: Fetch filtered events
  - `get_active_high_stakes_events()`: Get currently active events

**Mock Integrations** (for development):
- `MockHealthKitIntegration`: Generates realistic HRV patterns
- `MockGoogleCalendarIntegration`: Generates mock high-stakes events

### 4. API Layer (`main.py`)

**Endpoints**:

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/health` | Health check |
| POST | `/api/v1/users` | Create user account |
| POST | `/api/v1/state/check` | Check if Brake screen should display |
| POST | `/api/v1/decisions` | Record user decision |
| POST | `/api/v1/reflections` | Record reflection response |
| GET | `/api/v1/state` | Get current state |
| GET | `/api/v1/decisions/history` | Get decision history |
| GET | `/api/v1/reflections/history` | Get reflection history |

**Request/Response Examples**:

**Check Brake Screen**:
```bash
POST /api/v1/state/check
{
  "user_id": "user_123"
}

Response:
{
  "should_display": true,
  "event_id": "Board Meeting",
  "current_day": 4,
  "phase": "Intervention Logic",
  "hrv_current": 35.2,
  "hrv_baseline_mean": 50.1,
  "timestamp": "2024-01-09T15:30:00Z"
}
```

**Record Decision**:
```bash
POST /api/v1/decisions
{
  "user_id": "user_123",
  "decision_type": "Delay"
}

Response:
{
  "status": "decision_recorded",
  "decision_type": "Delay",
  "timestamp": "2024-01-09T15:30:00Z",
  "next_action": "cooling_period_activated",
  "re_trigger_time": "2024-01-09T15:50:00Z"
}
```

**Record Reflection**:
```bash
POST /api/v1/reflections
{
  "user_id": "user_123",
  "response": "Yes"
}

Response:
{
  "status": "reflection_recorded",
  "response": "Yes",
  "timestamp": "2024-01-09T15:30:00Z",
  "cycle_reset": {
    "status": "cycle_reset",
    "new_cycle_start": "2024-01-10T00:00:00Z",
    "current_day": 1
  }
}
```

## Data Flow

### Brake Screen Decision Flow

```
1. Frontend calls POST /api/v1/state/check
   ↓
2. Backend fetches:
   - Latest HRV from HealthKit
   - 7-day HRV baseline
   - Active high-stakes calendar events
   ↓
3. State machine evaluates:
   - Is it Day 3-5? (Intervention Logic phase)
   - Is HRV ≤ (baseline × 0.8)? (20% drop)
   - Is there an active high-stakes event?
   ↓
4. If all conditions met:
   - Return should_display: true
   - Frontend displays Brake screen
   ↓
5. User clicks "Delay" or "Proceed"
   - Frontend calls POST /api/v1/decisions
   - Backend records decision
   - If "Delay": Activate 20-min cooling period
   - If "Proceed": Lock decision for this event
   ↓
6. If "Delay" and 20 mins elapsed:
   - Brake screen re-displays
   - User must confirm again
```

### Reflection Flow

```
1. Day 7, 09:00 AM local time
   ↓
2. Frontend calls GET /api/v1/state
   - Checks if should_display_reflection_screen()
   ↓
3. If true:
   - Frontend displays reflection screen
   - Question: "In the past 7 days, did pausing help?"
   - Buttons: "Yes", "No", "Skip"
   ↓
4. User responds
   - Frontend calls POST /api/v1/reflections
   - Backend records response (only: timestamp + response)
   ↓
5. Backend automatically resets:
   - cycle_start_date = now
   - current_day = 1
   - cooling_period_active = false
   - decision_locked = null
   ↓
6. New 7-day cycle begins
```

## Deployment Architecture

### Development Environment

```
omtobe_mvp/
├── backend/
│   ├── main.py (FastAPI app)
│   ├── state_machine.py (Core logic)
│   ├── models.py (Database models)
│   ├── integrations.py (HealthKit/Calendar)
│   ├── database.py (DB config)
│   └── requirements.txt
├── frontend/
│   └── (React app - see FRONTEND_ARCHITECTURE.md)
└── shared/
    └── (Shared types/constants)
```

### Production Deployment

**Recommended Stack**:
- **Backend**: FastAPI on AWS Lambda or EC2
- **Database**: PostgreSQL on AWS RDS
- **Cache**: Redis for state machine state
- **API Gateway**: AWS API Gateway or CloudFlare
- **Monitoring**: CloudWatch + Datadog

**Environment Variables**:
```
DATABASE_URL=postgresql://user:pass@host:5432/omtobe
HEALTHKIT_CLIENT_ID=...
HEALTHKIT_CLIENT_SECRET=...
GOOGLE_CALENDAR_CLIENT_ID=...
GOOGLE_CALENDAR_CLIENT_SECRET=...
JWT_SECRET=...
LOG_LEVEL=INFO
```

## Security Considerations

### OAuth Integration

- HealthKit and Google Calendar use OAuth 2.0 for authentication
- Tokens are stored encrypted in database
- Tokens are refreshed automatically before expiry
- User can revoke access at any time

### Data Privacy

- No decision content is logged
- No emotional metadata is collected
- Only minimal timestamps and decision types
- User can request data deletion (GDPR compliance)
- All data is encrypted at rest and in transit

### API Security

- All endpoints require user authentication (JWT)
- Rate limiting on state/check endpoint (prevent abuse)
- CORS configured for frontend domain only
- HTTPS enforced in production

## Testing Strategy

### Unit Tests

- Test state machine logic with various HRV/calendar scenarios
- Test decision handling (Proceed/Delay)
- Test cooling period expiry
- Test cycle reset

### Integration Tests

- Test API endpoints with mock integrations
- Test database operations
- Test state persistence

### End-to-End Tests

- Test complete flow: HRV drop → Brake screen → Decision → Cooling period → Re-trigger
- Test Day 7 reflection and cycle reset
- Test with real HealthKit/Calendar data (staging)

## Performance Optimization

### Caching

- Cache HRV baseline for 1 hour (reduces HealthKit API calls)
- Cache calendar events for 30 minutes
- Cache user state in Redis for instant access

### Database Indexing

- Index on (user_id, timestamp) for decision logs
- Index on (user_id, day) for daily queries
- Index on (user_id, cycle_start_date) for cycle queries

### API Optimization

- Batch HRV sample fetching (reduce API calls)
- Async/await for all I/O operations
- Connection pooling for database

## Monitoring & Logging

### Key Metrics

- Brake screen display rate (per user, per day)
- Decision distribution (Proceed vs Delay)
- Cooling period re-trigger rate
- API response times
- Error rates

### Logging

- All state machine transitions logged
- All API requests logged (with user_id, endpoint, response time)
- All database operations logged
- Errors logged with full stack trace

## Next Steps

1. Implement real HealthKit OAuth integration
2. Implement real Google Calendar OAuth integration
3. Add comprehensive unit tests
4. Add API rate limiting
5. Deploy to staging environment
6. Conduct user testing with real HRV data
