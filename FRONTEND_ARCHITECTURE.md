# Omtobe MVP v0.1: Frontend Architecture

## Design Philosophy: Digital Void

The frontend embodies the principle of **absolute minimalism**. When not intervening, the system is invisible—a true "digital void." When intervention is needed, a single, focused screen appears with zero distractions.

### Core Principles

1. **Zero Proactive UI**: No notifications, no badges, no status indicators unless intervention is needed
2. **Single Question**: When intervention occurs, only one question is asked
3. **Binary or Ternary Choice**: Users make simple, deliberate choices
4. **Black Void**: Pure black background (#000000) with minimal visual elements
5. **No Animations**: Except for subtle loading indicators; no gratuitous motion
6. **Accessibility First**: Full keyboard navigation, focus management, reduced motion support

## Component Architecture

### File Structure

```
frontend/
├── src/
│   ├── api/
│   │   └── client.ts          # API client for backend communication
│   ├── components/
│   │   ├── BrakeScreen.tsx    # Main intervention screen
│   │   ├── BrakeScreen.css
│   │   ├── ReflectionScreen.tsx # Day 7 reflection screen
│   │   └── ReflectionScreen.css
│   ├── App.tsx                # Main app component
│   ├── App.css
│   ├── main.tsx               # React entry point
│   └── vite-env.d.ts
├── index.html                 # HTML entry point
├── vite.config.ts             # Vite configuration
├── tsconfig.json              # TypeScript configuration
└── package.json
```

## Components

### 1. BrakeScreen Component

**Purpose**: Display the main intervention screen when high-stress event is detected.

**Props**:
- `eventId?: string` - Optional event identifier to display context
- `onDecision: (decision: 'Proceed' | 'Delay') => void` - Callback when user makes decision
- `isLoading?: boolean` - Show loading state

**UI Elements**:
- Single question: "Does this decision need to be finalized NOW?"
- Optional event context display
- Two buttons: "Delay 20 min" and "Proceed"
- Subtle loading indicator

**Styling**:
- Black background with 98% opacity
- White text (Georgia serif for question)
- Two button styles:
  - "Delay 20 min": Outlined button (gray border, light text)
  - "Proceed": Filled button (white background, black text)
- Responsive design (mobile-first)
- Accessibility: Focus rings, disabled states, keyboard navigation

### 2. ReflectionScreen Component

**Purpose**: Display on Day 7 at 09:00 AM for end-of-cycle reflection.

**Props**:
- `onReflection: (response: 'Yes' | 'No' | 'Skip') => void` - Callback when user responds
- `isLoading?: boolean` - Show loading state

**UI Elements**:
- Single question: "In the past 7 days, did pausing help?"
- Three buttons: "Yes", "No", "Skip"
- Subtle loading indicator

**Styling**:
- Same black void aesthetic as BrakeScreen
- Three button styles:
  - "Yes": Filled button (white background, black text)
  - "No": Outlined button (gray border, light text)
  - "Skip": Subtle button (dark border, muted text)
- Responsive design

### 3. App Component

**Purpose**: Main application orchestrator.

**State Management**:
```typescript
type ScreenState = 'void' | 'brake' | 'reflection' | 'onboarding';

interface AppState {
  screen: ScreenState;
  userId: string | null;
  currentDay: number;
  phase: string;
  brakeEventId?: string;
}
```

**Lifecycle**:
1. **Initialization**: Check for stored user ID, show onboarding if needed
2. **Monitoring**: Poll backend every 30 seconds for brake screen trigger
3. **Intervention**: Display BrakeScreen when triggered
4. **Reflection**: Display ReflectionScreen on Day 7 at 09:00 AM
5. **Recovery**: Return to void after decision/reflection

**Key Methods**:
- `handleBrakeDecision()`: Process user's brake decision
  - If "Proceed": Close screen, lock decision
  - If "Delay": Close screen, wait 20 minutes, re-check
- `handleReflection()`: Process reflection response
  - Record response, reset to Day 1
- `handleOnboarding()`: Create new user account

### 4. DigitalVoid Component

**Purpose**: Minimal UI when system is not intervening.

**Display**:
- Current day (1-7)
- Current phase name
- Very low opacity (0.3) to be nearly invisible

**Philosophy**: The system should be "invisible" when not needed.

### 5. OnboardingScreen Component

**Purpose**: Initial user setup.

**Form Fields**:
- User ID (text input)
- Email (email input)

**Behavior**:
- Creates user account via API
- Stores user ID in localStorage
- Transitions to void state

## API Client

### OmtobeAPIClient Class

**Responsibility**: Minimal HTTP client for backend communication.

**Key Methods**:

| Method | Purpose |
|--------|---------|
| `healthCheck()` | Verify backend is running |
| `createUser()` | Create new user account |
| `checkBrakeScreen()` | Check if intervention needed |
| `recordDecision()` | Record user's brake decision |
| `recordReflection()` | Record reflection response |
| `getState()` | Get current state machine state |
| `getDecisionHistory()` | Get user's decision history |
| `getReflectionHistory()` | Get user's reflection history |

**Error Handling**:
- All methods throw on HTTP errors
- Errors are caught and logged in components
- User-facing error messages shown via alerts

## Styling Strategy

### Design System

**Colors**:
- Background: `#000000` (pure black)
- Text: `#ffffff` (pure white)
- Accents: `#cccccc`, `#999999`, `#666666` (grays)
- Borders: `#444444`, `#333333` (dark grays)

**Typography**:
- Serif (Georgia): Headlines and questions
- System fonts: UI text and buttons
- Font sizes: 0.875rem to 2.5rem
- Letter spacing: 0.02em to 0.05em (subtle)

**Spacing**:
- Gaps: 0.5rem to 3rem
- Padding: 1rem to 2rem
- Margins: 0 to 2rem

**Interactions**:
- Hover: Subtle background color change
- Active: Darker background
- Focus: 2px outline with 2px offset
- Disabled: 50% opacity

### Responsive Design

**Breakpoints**:
- Mobile: < 480px
- Tablet: 480px - 768px
- Desktop: > 768px

**Adjustments**:
- Font sizes scale down on mobile
- Button layout changes to column on mobile
- Padding reduces on mobile
- Full-width buttons on mobile

### Accessibility

**Features**:
- Full keyboard navigation (Tab, Enter, Space)
- Focus rings on all interactive elements
- ARIA labels on buttons
- Disabled state management
- Reduced motion support (`prefers-reduced-motion`)
- Color contrast meets WCAG AA standards

## State Flow

### Brake Screen Flow

```
1. App initializes
   ↓
2. Poll backend every 30 seconds
   ↓
3. If should_display == true:
   - Switch to 'brake' screen
   - Display BrakeScreen component
   ↓
4. User clicks button:
   - "Delay 20 min": Record decision, wait 20 min, re-check
   - "Proceed": Record decision, lock decision, return to void
   ↓
5. Return to void
```

### Reflection Flow

```
1. Day 7, 09:00 AM local time
   ↓
2. Check if should_display_reflection_screen()
   ↓
3. If true:
   - Switch to 'reflection' screen
   - Display ReflectionScreen component
   ↓
4. User responds:
   - "Yes", "No", or "Skip"
   - Record response
   ↓
5. Backend resets cycle to Day 1
   ↓
6. Return to void
```

## Performance Optimization

### Polling Strategy

- Check brake screen every 30 seconds (not too aggressive)
- Check reflection screen every 1 minute
- Debounce API calls to prevent race conditions
- Cache user state in localStorage

### Bundle Size

- Minimal dependencies (React, React DOM, Axios only)
- No UI framework bloat
- CSS-in-JS avoided (plain CSS files)
- Tree-shaking enabled in Vite

### Network Optimization

- Gzip compression enabled
- Lazy loading for components (if needed)
- API responses are minimal JSON
- No unnecessary data transfers

## Testing Strategy

### Unit Tests

- Test API client methods
- Test component rendering
- Test state transitions
- Test event handlers

### Integration Tests

- Test full brake screen flow
- Test full reflection flow
- Test onboarding flow
- Test state persistence

### E2E Tests

- Test complete user journey
- Test with real backend
- Test on multiple devices/browsers
- Test accessibility

## Deployment

### Build Process

```bash
npm run build
# Outputs to: dist/
```

### Vercel Deployment

- Frontend: Deployed as static site
- Backend: Deployed as serverless function
- Routing: Configured in `vercel.json`

### Environment Variables

```
VITE_API_BASE_URL=https://api.example.com
```

## Future Enhancements

1. **Analytics**: Track brake screen displays, decision rates, reflection responses
2. **Customization**: Allow users to customize question text, button labels
3. **Notifications**: Optional push notifications for Day 7 reflection
4. **History Dashboard**: View past decisions and reflections
5. **Settings**: Timezone adjustment, notification preferences
6. **Offline Mode**: Cache state locally, sync when online
