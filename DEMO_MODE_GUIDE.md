# Omtobe MVP v0.1 - Demo Mode Guide

## Overview

Demo Mode is a visual demonstration layer designed for investors, partners, and stakeholders to understand Omtobe's value proposition. It provides real-time visualization of the "Mirror + Brake" system without requiring actual HealthKit or Google Calendar integration.

## Key Features

### 1. **Mode Toggle** (Top Right)
- **Production Mode**: Minimal "Digital Void" interface for real users
- **Demo Mode**: Visual dashboard with simulator controls for demonstrations

### 2. **System Status Dashboard** (Left Sidebar)

#### Current State
- **Current Day**: Shows progress through 7-day cycle
- **Phase**: Displays current state machine phase
  - Day 1-2: "Total Silence"
  - Day 3-5: "Intervention Logic"
  - Day 7: "Reflection"

#### HRV Monitor
- **Current HRV**: Real-time heart rate variability (ms)
- **Change %**: Percentage change from baseline
- **Baseline**: 7-day rolling average
- **Status**: Visual indicator (Normal/Stressed/Critical/Panic)

#### Active Events
- Lists high-risk calendar events currently active
- Shows event name, time, and risk level

#### Recent Interventions
- Timeline of brake screen interactions
- Shows decision type (Delay/Proceed) and timestamp

### 3. **Control Panel** (Bottom)

#### HRV Simulator
- **Normal**: HRV at baseline (0% change)
- **Stressed (-10%)**: Mild stress simulation
- **Critical (-20%)**: Triggers intervention threshold
- **Panic (-30%)**: Severe stress simulation

#### Calendar Events
- **No Event**: Clear all events
- **Board Meeting**: High-stakes board meeting
- **Negotiation**: Critical negotiation scenario
- **High-Stakes**: Generic high-risk event

#### Quick Actions
- **Trigger Brake**: Manually trigger brake screen
- **Trigger Reflection**: Manually trigger Day 7 reflection
- **Jump to Day 7**: Fast-forward to reflection day
- **Reset Demo**: Reset all demo state to Day 1

#### 7-Day Timeline
- Visual progress indicator
- Click any day (1-7) to jump to that day
- Active day highlighted

## How to Use for Demonstrations

### Scenario 1: Show Intervention Logic

1. **Switch to Demo Mode** (top right toggle)
2. **Set up stress scenario**:
   - Click "Critical (-20%)" to simulate HRV drop
   - Click "Board Meeting" to add high-risk event
   - Click "3" on timeline to enter intervention period
3. **Observe automatic trigger**: System automatically shows brake screen
4. **Demonstrate decision flow**: Click "Delay 20 mins" or "Proceed"
5. **Show intervention history**: Check left sidebar for logged interaction

### Scenario 2: Show 7-Day Cycle

1. **Start at Day 1**: Click "1" on timeline
2. **Explain silence period**: Days 1-2 show no intervention
3. **Enter intervention period**: Click "3" to show active monitoring
4. **Jump to reflection**: Click "Jump to Day 7" or click "7" on timeline
5. **Trigger reflection screen**: Click "Trigger Reflection"

### Scenario 3: Show Data Sovereignty

1. **Point to minimal logging**: Only timestamp + decision type in interventions
2. **Emphasize zero content**: No calendar content, no HRV details logged
3. **Show local storage**: All demo data stays in browser localStorage

## Technical Architecture

### Frontend Components

- **DemoContext.tsx**: React Context managing demo state
- **DemoDashboard.tsx**: Left sidebar with system status
- **DemoControls.tsx**: Bottom control panel with simulators
- **ModeToggle.tsx**: Production/Demo mode switcher

### State Management

Demo state stored in React Context:
```typescript
{
  isDemoMode: boolean,
  currentDay: 1-7,
  phase: string,
  hrv: { current, baseline, change, status },
  activeEvents: Event[],
  interventions: Intervention[]
}
```

### Persistence

- Demo state persists in localStorage
- Survives page refreshes
- Reset with "Reset Demo" button

## Design Philosophy

Demo Mode maintains the "Digital Void" aesthetic while adding necessary context:

- **Minimal Color Palette**: Dark grays (#1a1a1a, #2a2a2a) with blue accent (#4a9eff)
- **Typography**: System fonts with increased letter-spacing
- **Borders**: Subtle 1px borders (#444444)
- **Animations**: Smooth transitions (0.2-0.3s ease)
- **Layout**: Non-intrusive sidebars that don't obscure core experience

## Production Mode

When switched to Production Mode:
- All demo UI elements hidden
- Returns to pure "Digital Void" interface
- Test buttons available for manual testing
- Real API integration (when backend deployed)

## Deployment

Demo Mode is fully deployed at:
- **Primary**: https://omtobe.app
- **Vercel**: https://omtobe-mvp.vercel.app

## Future Enhancements

Potential additions for v0.2:
- Export demo session as video/GIF
- Preset demo scenarios (one-click setup)
- Annotation mode for presentations
- Screen recording integration
- Investor presentation template

## Support

For questions or issues:
- GitHub: https://github.com/ethanyang2028/omtobe-mvp
- Documentation: See FRONTEND_ARCHITECTURE.md and BACKEND_ARCHITECTURE.md
