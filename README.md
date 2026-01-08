# Omtobe MVP v0.1

**Mirror + Brake System for High-Stakes Decision Makers**

A minimalist decision intervention system that detects high-stress moments and provides a single, focused intervention: "Does this decision need to be finalized NOW?"

## Core Concept

Omtobe implements a 7-day state machine that:

1. **Days 1-2: Total Silence** - Establishes HRV baseline, collects calendar patterns
2. **Days 3-5: Intervention Logic** - Triggers "Brake" screen when HRV drops 20% AND high-stakes event is active
3. **Day 7: One-Question Reflection** - Asks "Did pausing help?" then resets cycle

## Key Constraints

- **Zero Proactive Interaction**: System is completely silent unless high-stress event detected
- **No Spiritual Language**: Cognitive-science-based terminology only
- **Minimal Data Collection**: Only timestamp + decision type recorded (no content, no emotions)
- **Single Question**: When intervention occurs, only one question is asked
- **20-Minute Cooling Period**: Mandatory pause before re-confirmation

## Architecture

```
omtobe_mvp/
├── backend/                    # FastAPI backend
│   ├── main.py                # FastAPI app + API endpoints
│   ├── state_machine.py       # 7-day state machine logic
│   ├── models.py              # Database models (SQLAlchemy)
│   ├── integrations.py        # HealthKit + Google Calendar
│   ├── database.py            # Database configuration
│   └── requirements.txt
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── api/client.ts      # API client
│   │   ├── components/
│   │   │   ├── BrakeScreen.tsx
│   │   │   └── ReflectionScreen.tsx
│   │   ├── App.tsx            # Main app
│   │   └── main.tsx
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── vercel.json                # Vercel deployment config
├── BACKEND_ARCHITECTURE.md    # Backend design docs
├── FRONTEND_ARCHITECTURE.md   # Frontend design docs
└── README.md
```

## Quick Start

### Backend

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Run development server
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000

# API will be available at http://localhost:8000
# Docs at http://localhost:8000/docs
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# App will be available at http://localhost:5173
```

### Full Stack (with Vercel)

```bash
# Deploy to Vercel
vercel deploy

# This will:
# 1. Deploy backend as serverless function at /api
# 2. Deploy frontend as static site
# 3. Route /api/* to backend, everything else to frontend
```

## API Endpoints

### State Management

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/users` | POST | Create user account |
| `/api/v1/state/check` | POST | Check if Brake screen should display |
| `/api/v1/state` | GET | Get current state machine state |

### Decision Recording

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/decisions` | POST | Record user decision (Proceed/Delay) |
| `/api/v1/decisions/history` | GET | Get decision history |

### Reflection

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/v1/reflections` | POST | Record reflection response (Yes/No/Skip) |
| `/api/v1/reflections/history` | GET | Get reflection history |

## Data Model

### Minimal Data Collection

**Decision Log**:
```json
{
  "timestamp": "2024-01-09T15:30:00Z",
  "decision_type": "Proceed" | "Delay",
  "day": 1-7
}
```

**Reflection Log**:
```json
{
  "timestamp": "2024-01-09T09:00:00Z",
  "response": "Yes" | "No" | "Skip",
  "cycle_start_date": "2024-01-03T00:00:00Z"
}
```

**Principle**: No decision content, no emotional metadata, no behavioral profiling. Only timestamps and choices.

## Design Philosophy

### Digital Void

The frontend embodies absolute minimalism:
- Black background (#000000)
- White text (#ffffff)
- Zero distractions when not intervening
- Single focal point when intervention needed
- No animations except subtle loading indicator

### State Machine

The backend implements a precise 7-day rhythm:
- Day 1-2: Baseline collection (silent)
- Day 3-5: Active monitoring (intervene on dual trigger)
- Day 7: Reflection + reset
- Cycle repeats automatically

### Intervention Logic

Brake screen displays only when **both** conditions are met:
1. **HRV Drop**: Current HRV ≤ (7-day baseline × 0.8)
2. **High-Stakes Event**: Active calendar event with trigger keywords ("Board", "Negotiation", "Review", "High-Stakes", or "!" prefix)

## Integration Points

### Apple HealthKit

- Fetches HRV samples (Heart Rate Variability)
- Computes 7-day rolling baseline
- Detects 20% drop threshold

### Google Calendar

- Fetches calendar events
- Filters for high-stakes events by keyword
- Detects currently active events

### Mock Integrations

For development, mock integrations generate realistic data:
- `MockHealthKitIntegration`: Generates HRV patterns
- `MockGoogleCalendarIntegration`: Generates mock events

## Testing

### Unit Tests

```bash
cd backend
pytest tests/
```

### Integration Tests

```bash
cd frontend
npm run test
```

### E2E Tests

```bash
# With real backend
npm run test:e2e
```

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel deploy

# Set environment variables in Vercel dashboard:
# - DATABASE_URL
# - HEALTHKIT_CLIENT_ID
# - HEALTHKIT_CLIENT_SECRET
# - GOOGLE_CALENDAR_CLIENT_ID
# - GOOGLE_CALENDAR_CLIENT_SECRET
```

### Docker

```bash
# Build backend image
docker build -t omtobe-backend ./backend

# Run backend
docker run -p 8000:8000 omtobe-backend

# Build frontend image
docker build -t omtobe-frontend ./frontend

# Run frontend
docker run -p 3000:3000 omtobe-frontend
```

### AWS Lambda + CloudFront

```bash
# Deploy backend to Lambda
serverless deploy

# Deploy frontend to CloudFront
aws s3 sync frontend/dist s3://omtobe-frontend/
```

## Security

### OAuth Integration

- HealthKit and Google Calendar use OAuth 2.0
- Tokens stored encrypted in database
- Automatic token refresh
- User can revoke access anytime

### Data Privacy

- No decision content logged
- No emotional metadata collected
- Only timestamps and decision types
- GDPR compliant (user can request deletion)
- All data encrypted at rest and in transit

### API Security

- JWT authentication on all endpoints
- Rate limiting on state/check endpoint
- CORS configured for frontend domain only
- HTTPS enforced in production

## Monitoring & Logging

### Key Metrics

- Brake screen display rate
- Decision distribution (Proceed vs Delay)
- Cooling period re-trigger rate
- API response times
- Error rates

### Logging

- All state machine transitions logged
- All API requests logged
- All database operations logged
- Errors logged with stack trace

## Performance

### Polling Strategy

- Check brake screen every 30 seconds
- Check reflection screen every 1 minute
- Debounced API calls
- Cached user state in localStorage

### Database Optimization

- Indexed on (user_id, timestamp)
- Indexed on (user_id, day)
- Indexed on (user_id, cycle_start_date)

### Frontend Bundle

- Minimal dependencies (React, Axios only)
- No UI framework bloat
- Tree-shaking enabled
- Gzip compression

## Roadmap

### v0.2

- [ ] Real HealthKit OAuth integration
- [ ] Real Google Calendar OAuth integration
- [ ] Comprehensive unit tests
- [ ] API rate limiting
- [ ] User analytics dashboard

### v0.3

- [ ] Push notifications for Day 7 reflection
- [ ] Customizable intervention questions
- [ ] Decision history visualization
- [ ] Settings panel (timezone, notification preferences)
- [ ] Offline mode with sync

### v1.0

- [ ] Multi-language support
- [ ] Advanced analytics
- [ ] Team/organizational features
- [ ] Integration with other health platforms (Oura, Whoop)
- [ ] Mobile apps (iOS, Android)

## Contributing

We welcome contributions! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

MIT License - See LICENSE file for details

## Contact

For questions or feedback, please reach out to the Omtobe team.

---

**Omtobe: Mirror + Brake for High-Stakes Decisions**

*Because sometimes the best decision is to pause.*
.
