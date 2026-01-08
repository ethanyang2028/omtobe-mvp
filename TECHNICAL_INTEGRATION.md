# Omtobe MVP v0.1: Technical Integration Guide

## Frontend-Backend Communication Protocol

### Overview

The frontend implements a strict polling-based architecture that communicates with the backend through two primary endpoints:

1. **GET /api/v1/state** - State polling (every 60 seconds)
2. **POST /api/v1/decision** - Decision recording (immediate on user action)

This protocol ensures **zero proactive notifications** while maintaining real-time intervention capability.

---

## Polling Strategy

### GET /api/v1/state - State Check (Every 60 Seconds)

**Purpose**: Determine if intervention is needed and get current state machine status.

**Frontend Implementation**:
```typescript
// App.tsx - State polling loop
const checkState = async () => {
  try {
    const response: StateResponse = await apiClient.getState();
    const state = response.state;

    // Update local state
    setAppState(prev => ({
      ...prev,
      currentDay: state.current_day,
      phase: state.phase,
    }));

    // Check if intervention is ready
    const brakeCheck: StateCheckResponse = await apiClient.checkBrakeScreen();

    if (brakeCheck.should_display && appState.screen === 'void') {
      // Transition to brake screen
      setAppState(prev => ({
        ...prev,
        screen: 'brake',
      }));
    }
  } catch (error) {
    console.error('Error checking state:', error);
  }
};

// Poll every 60 seconds
stateCheckIntervalRef.current = setInterval(checkState, 60000);
```

**Response Structure**:
```json
{
  "user_id": "user_123",
  "state": {
    "user_id": "user_123",
    "current_day": 4,
    "cycle_start_date": "2024-01-03T00:00:00Z",
    "cooling_period_active": false,
    "decision_locked": false,
    "hrv_baseline_mean": 50.1,
    "hrv_baseline_std_dev": 5.2,
    "phase": "Intervention Logic"
  },
  "timestamp": "2024-01-09T15:30:00Z"
}
```

**State Interpretation**:
- `current_day`: 1-7 (which day of the cycle)
- `phase`: "Total Silence" | "Intervention Logic" | "Preparation" | "Reflection"
- `cooling_period_active`: Whether user is in 20-min cooling period
- `decision_locked`: Whether decision is locked for current event

---

## Intervention Trigger

### POST /api/v1/state/check - Brake Screen Decision

**Purpose**: Check if Brake screen should be displayed based on HRV + Calendar.

**Frontend Call**:
```typescript
const brakeCheck: StateCheckResponse = await apiClient.checkBrakeScreen();

if (brakeCheck.should_display) {
  // Immediately transition to brake screen
  setAppState(prev => ({
    ...prev,
    screen: 'brake',
  }));
}
```

**Response Structure**:
```json
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

**Trigger Conditions**:
1. **Day 3-5**: Only during "Intervention Logic" phase
2. **HRV Drop**: Current HRV ≤ (baseline × 0.8) = 20% drop
3. **High-Stakes Event**: Active calendar event with trigger keywords
4. **No Cooling Period**: Not currently in 20-minute cooling period
5. **No Decision Lock**: Decision not already locked for this event

---

## Decision Recording

### POST /api/v1/decisions - Record User Decision

**Purpose**: Record user's response to Brake screen (Proceed or Delay).

**Frontend Implementation**:
```typescript
// BrakeScreen.tsx - Handle button click
const handleClick = async (decision: 'Proceed' | 'Delay') => {
  setIsSubmitting(true);
  try {
    await apiClient.recordDecision(decision);
    onDecision(decision); // Callback to close brake screen
  } catch (error) {
    console.error('Failed to record decision:', error);
    setIsSubmitting(false);
  }
};
```

**Request**:
```json
{
  "user_id": "user_123",
  "decision_type": "Proceed" | "Delay"
}
```

**Response**:
```json
{
  "status": "decision_recorded",
  "decision_type": "Proceed",
  "timestamp": "2024-01-09T15:30:00Z",
  "next_action": "decision_locked" | "cooling_period_activated",
  "re_trigger_time": "2024-01-09T15:50:00Z"  // Only if Delay
}
```

**Backend Behavior**:

**If "Proceed"**:
- Decision is locked for this event
- No further interventions for this event
- Frontend returns to void
- User can proceed with decision

**If "Delay"**:
- Cooling period activated (20 minutes)
- No interventions during cooling period
- After 20 minutes: Brake screen re-displays automatically
- User must confirm again

---

## Reflection Flow

### GET /api/v1/state - Detect Day 7

**Purpose**: Detect when Day 7 reflection should be displayed.

**Frontend Implementation**:
```typescript
const checkReflection = async () => {
  try {
    const state = await apiClient.getState();

    if (state.state.current_day === 7) {
      // Check if it's 09:00 AM local time
      const now = new Date();
      if (now.getHours() === 9 && now.getMinutes() < 5) {
        setAppState(prev => ({
          ...prev,
          screen: 'reflection',
        }));
      }
    }
  } catch (error) {
    console.error('Error checking reflection:', error);
  }
};

// Check every minute
reflectionCheckRef.current = setInterval(checkReflection, 60000);
```

### POST /api/v1/reflections - Record Reflection Response

**Purpose**: Record user's reflection response and trigger cycle reset.

**Request**:
```json
{
  "user_id": "user_123",
  "response": "Yes" | "No" | "Skip"
}
```

**Response**:
```json
{
  "status": "reflection_recorded",
  "response": "Yes",
  "timestamp": "2024-01-09T09:00:00Z",
  "cycle_reset": {
    "status": "cycle_reset",
    "new_cycle_start": "2024-01-10T00:00:00Z",
    "current_day": 1
  }
}
```

**Backend Behavior**:
- Record reflection response (only timestamp + response)
- Automatically reset cycle to Day 1
- Set new cycle_start_date to current time
- Clear all state (cooling_period, decision_locked, etc.)

---

## Frontend State Machine

### Screen State Transitions

```
┌─────────────┐
│   VOID      │  (Default state when not intervening)
│ (Invisible) │
└──────┬──────┘
       │
       │ GET /api/v1/state/check
       │ should_display = true
       │
       ▼
┌─────────────┐
│   BRAKE     │  (Intervention screen)
│  (Visible)  │
└──────┬──────┘
       │
       ├─ POST /api/v1/decision (Proceed)
       │  └─ Lock decision, return to VOID
       │
       └─ POST /api/v1/decision (Delay)
          └─ Wait 20 min, re-check, possibly return to BRAKE
```

### Reflection State Transition

```
┌─────────────┐
│   VOID      │  (Day 6 or earlier)
└──────┬──────┘
       │
       │ Day 7, 09:00 AM
       │
       ▼
┌─────────────┐
│ REFLECTION  │  (Reflection screen)
└──────┬──────┘
       │
       │ POST /api/v1/reflections
       │
       ▼
┌─────────────┐
│   VOID      │  (Cycle reset to Day 1)
└─────────────┘
```

---

## Error Handling

### Network Errors

**Frontend Strategy**:
```typescript
try {
  const response = await apiClient.checkBrakeScreen();
  // Process response
} catch (error) {
  console.error('Error checking brake screen:', error);
  // Fail silently - don't show error UI
  // Retry on next polling interval
}
```

**Principle**: Never show error messages to user. Errors are logged silently and retried automatically.

### API Timeouts

**Timeout Configuration**:
- All API calls: 10-second timeout
- If timeout: Retry on next polling interval
- If persistent: Continue without intervention (safety-first)

---

## Performance Optimization

### Polling Intervals

| Endpoint | Interval | Reason |
|----------|----------|--------|
| GET /api/v1/state | 60 seconds | Balanced responsiveness vs. load |
| GET /api/v1/state (Day 7) | 60 seconds | Detect reflection time |
| POST /api/v1/decision | Immediate | Real-time decision recording |

### Debouncing

**Decision Recording**:
- Only one decision can be submitted per Brake screen display
- Prevent accidental double-clicks
- Disable buttons during submission

**State Polling**:
- Only one state check can be in-flight at a time
- Prevent race conditions
- Queue subsequent checks

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React)                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ App Component                                        │  │
│  │ - Manages screen state (void/brake/reflection)      │  │
│  │ - Polls GET /api/v1/state every 60 seconds         │  │
│  │ - Handles screen transitions                        │  │
│  └──────────────────────────────────────────────────────┘  │
│           │                                                 │
│           ├─ BrakeScreen (when should_display = true)      │
│           │  └─ POST /api/v1/decision on button click      │
│           │                                                 │
│           └─ ReflectionScreen (Day 7, 09:00 AM)            │
│              └─ POST /api/v1/reflections on response       │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ HTTP/REST
                       │
┌──────────────────────▼──────────────────────────────────────┐
│                    BACKEND (FastAPI)                        │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ State Machine                                        │  │
│  │ - 7-day cycle management                            │  │
│  │ - HRV baseline computation                          │  │
│  │ - Calendar event filtering                          │  │
│  │ - Cooling period management                         │  │
│  └──────────────────────────────────────────────────────┘  │
│           │                                                 │
│           ├─ GET /api/v1/state                             │
│           │  └─ Return current state + phase               │
│           │                                                 │
│           ├─ POST /api/v1/state/check                      │
│           │  └─ Check HRV + Calendar, return intervention  │
│           │                                                 │
│           ├─ POST /api/v1/decision                         │
│           │  └─ Record decision, manage state              │
│           │                                                 │
│           └─ POST /api/v1/reflections                      │
│              └─ Record reflection, reset cycle             │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Integrations                                         │  │
│  │ - Apple HealthKit (HRV data)                        │  │
│  │ - Google Calendar (Event filtering)                 │  │
│  │ - Database (Decision/Reflection logs)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing Checklist

### Unit Tests

- [ ] State machine transitions (Day 1-7)
- [ ] HRV threshold calculation (20% drop)
- [ ] Calendar event filtering (keywords)
- [ ] Cooling period countdown
- [ ] Decision locking

### Integration Tests

- [ ] Frontend polling loop
- [ ] Brake screen display trigger
- [ ] Decision recording flow
- [ ] Reflection detection and recording
- [ ] Cycle reset

### E2E Tests

- [ ] Complete 7-day cycle
- [ ] HRV drop + calendar event → Brake screen
- [ ] User clicks "Delay" → 20-min wait → Re-trigger
- [ ] User clicks "Proceed" → Decision locked
- [ ] Day 7, 09:00 AM → Reflection screen
- [ ] Reflection response → Cycle reset to Day 1

---

## Deployment Checklist

- [ ] Backend deployed to Vercel/AWS
- [ ] Frontend deployed to Vercel/CloudFront
- [ ] Database configured (PostgreSQL)
- [ ] HealthKit OAuth configured
- [ ] Google Calendar OAuth configured
- [ ] Environment variables set
- [ ] HTTPS enforced
- [ ] CORS configured
- [ ] Rate limiting enabled
- [ ] Monitoring/logging enabled
- [ ] Error tracking (Sentry) configured

---

## Troubleshooting

### Brake screen not displaying

**Check**:
1. Is backend returning `should_display: true`?
2. Is frontend polling GET /api/v1/state/check?
3. Is current day 3-5?
4. Is HRV drop ≥ 20%?
5. Is there an active high-stakes event?

### Decision not being recorded

**Check**:
1. Is POST /api/v1/decision being called?
2. Is user ID being sent?
3. Is decision_type valid ("Proceed" or "Delay")?
4. Is backend returning 200 OK?

### Reflection screen not appearing

**Check**:
1. Is current day 7?
2. Is local time 09:00 AM?
3. Is frontend polling GET /api/v1/state?
4. Is reflection detection logic running?

---

## Future Enhancements

1. **WebSocket Integration**: Replace polling with real-time push
2. **Offline Mode**: Cache state locally, sync when online
3. **Analytics**: Track intervention rates, decision patterns
4. **Custom Interventions**: Allow users to customize questions
5. **Mobile Apps**: Native iOS/Android implementations
