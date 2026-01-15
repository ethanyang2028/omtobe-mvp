# Omtobe MVP v0.1: Demo Mode Design

## Overview

Demo Mode is designed for investors, partners, and stakeholders to understand how Omtobe works without requiring real HealthKit/Calendar integration.

---

## Design Principles

1. **Clear Distinction**: Demo mode should be visually distinct from production mode
2. **Full Functionality**: All features should be demonstrable
3. **Easy Toggle**: One-click switch between demo and production
4. **Professional**: Maintain the "Digital Void" aesthetic while adding visibility

---

## Features

### 1. Mode Toggle Switch

**Location**: Top-right corner (small, unobtrusive)

**Design**:
```
[Demo Mode] ←→ [Production Mode]
```

**Behavior**:
- Click to toggle between modes
- Saves preference to localStorage
- Shows toast notification on switch

---

### 2. Demo Dashboard (Left Sidebar)

**Visibility**: Only visible in Demo Mode

**Components**:

#### A. System Status
- Current Day: X/7
- Phase: "Total Silence" / "Intervention Logic" / "Reflection"
- Time in Phase: XX hours

#### B. Physiological Monitor
- **HRV Status**: 
  - Current: XX ms
  - Baseline: XX ms
  - Change: ±XX%
  - Visual indicator: Green (normal) / Yellow (elevated) / Red (critical)

#### C. Calendar Events
- **Active Events**:
  - Event title
  - Start/End time
  - Risk level: High / Medium / Low

#### D. Intervention History
- Last 5 interventions:
  - Timestamp
  - Decision: Proceed / Delay
  - Outcome: Completed / Delayed

---

### 3. Simulator Controls (Bottom Panel)

**Visibility**: Only visible in Demo Mode

**Controls**:

#### A. HRV Simulator
```
[Baseline: 50ms] [Current: 50ms]

[Normal] [Stressed (-10%)] [Critical (-20%)] [Panic (-30%)]
```

**Behavior**:
- Click buttons to simulate HRV changes
- Automatically triggers intervention logic if threshold met

#### B. Calendar Event Simulator
```
[No Event] [Board Meeting] [Negotiation] [High-Stakes Decision]
```

**Behavior**:
- Click to simulate active calendar event
- Shows event details in Calendar Events panel

#### C. Quick Actions
```
[Trigger Brake Now] [Trigger Reflection] [Reset to Day 1] [Advance to Day 7]
```

**Behavior**:
- Instant state changes for demonstration
- Bypasses normal timing logic

---

### 4. Visual Timeline (Center Bottom)

**Visibility**: Only visible in Demo Mode

**Design**:
```
Day 1-2: Total Silence ████░░░░░░░░░░░░░░░░
Day 3-5: Intervention   ░░░░████████████░░░░
Day 7:   Reflection     ░░░░░░░░░░░░░░░░████
```

**Behavior**:
- Shows current position in 7-day cycle
- Highlights active phase
- Click to jump to specific day (for demo)

---

## Layout

```
┌─────────────────────────────────────────────────────────┐
│  Omtobe                          [Demo Mode ←→ Prod]    │
├──────────┬──────────────────────────────────────────────┤
│          │                                               │
│  DEMO    │                                               │
│  DASH    │          MAIN CONTENT AREA                    │
│  BOARD   │          (Brake / Reflection / Void)          │
│          │                                               │
│  Status  │                                               │
│  HRV     │                                               │
│  Events  │                                               │
│  History │                                               │
│          │                                               │
├──────────┴──────────────────────────────────────────────┤
│  SIMULATOR CONTROLS                                      │
│  [HRV] [Calendar] [Quick Actions]                        │
├──────────────────────────────────────────────────────────┤
│  TIMELINE: Day 1-2 ████ | Day 3-5 ████████ | Day 7 ██   │
└──────────────────────────────────────────────────────────┘
```

---

## Color Scheme (Demo Mode)

To distinguish from production's pure black:

- **Background**: #0a0a0a (very dark gray, not pure black)
- **Dashboard Panel**: #1a1a1a (slightly lighter)
- **Text**: #888888 (medium gray)
- **Accent**: #4a9eff (blue for demo indicators)
- **Warning**: #ff6b6b (red for critical HRV)
- **Success**: #51cf66 (green for normal HRV)

---

## Responsive Design

### Desktop (> 1024px)
- Full layout with sidebar and bottom panels

### Tablet (768px - 1024px)
- Collapsible sidebar
- Simplified simulator controls

### Mobile (< 768px)
- Floating toggle button
- Drawer-style dashboard
- Stacked simulator controls

---

## Implementation Plan

### Phase 1: Core Components
- [ ] Mode toggle switch
- [ ] Demo dashboard layout
- [ ] Basic styling

### Phase 2: Data Visualization
- [ ] HRV monitor with live updates
- [ ] Calendar events display
- [ ] Intervention history log

### Phase 3: Simulators
- [ ] HRV simulator with presets
- [ ] Calendar event simulator
- [ ] Quick action buttons

### Phase 4: Timeline
- [ ] Visual timeline component
- [ ] Interactive day selection
- [ ] Phase highlighting

### Phase 5: Integration
- [ ] Connect simulators to state machine
- [ ] Trigger real interventions
- [ ] Save demo preferences

---

## User Stories

### Investor Demo
1. Toggle to Demo Mode
2. See dashboard showing "Day 1/7 - Total Silence"
3. Click "Critical (-20%)" HRV button
4. Click "Board Meeting" calendar button
5. Watch Brake Screen appear automatically
6. Click "Delay 20 mins"
7. See intervention logged in history
8. Advance to Day 7
9. See Reflection Screen appear

### Partner Walkthrough
1. Start in Production Mode (pure void)
2. Toggle to Demo Mode
3. Explain each dashboard component
4. Demonstrate HRV threshold triggering
5. Show calendar event filtering
6. Review intervention history
7. Walk through 7-day cycle timeline

---

## Technical Notes

### State Management
- Use React Context for demo mode state
- Separate demo state from production state
- Clear demo state when switching to production

### Data Persistence
- Save mode preference to localStorage
- Save demo state for session continuity
- Clear on explicit reset

### Performance
- Lazy load demo components
- Only render when in demo mode
- Optimize re-renders with React.memo

---

## Success Metrics

- [ ] Investors can understand product in < 5 minutes
- [ ] All features are demonstrable without real data
- [ ] Toggle between modes is seamless
- [ ] Demo mode maintains "Digital Void" aesthetic
- [ ] Production mode remains completely clean

---

**Next Steps**: Implement Phase 1 components
