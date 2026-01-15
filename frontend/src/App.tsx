/**
 * Omtobe MVP v0.2: Main Application with Demo Mode and Energy Ring
 */

import React, { useEffect, useState, useRef } from 'react';
import { BrakeScreen } from './components/BrakeScreen';
import { ReflectionScreen } from './components/ReflectionScreen';
import { DemoDashboard } from './components/DemoDashboard';
import { DemoControls } from './components/DemoControls';
import { ModeToggle } from './components/ModeToggle';
import { EnergyRing } from './components/EnergyRing';
import { DemoProvider, useDemo } from './contexts/DemoContext';
import { mockApiClient as apiClient, StateCheckResponse, StateResponse } from './api/mock-client';
import './App.css';

type ScreenState = 'void' | 'brake' | 'reflection' | 'onboarding';

interface AppState {
  screen: ScreenState;
  userId: string | null;
  currentDay: number;
  phase: string;
}

const AppContent: React.FC = () => {
  const { demoState, addIntervention, setDay, setHRV, setCalendarEvent } = useDemo();
  
  const [appState, setAppState] = useState<AppState>({
    screen: 'void',
    userId: null,
    currentDay: 1,
    phase: 'Total Silence',
  });

  const [isLoading, setIsLoading] = useState(false);
  const stateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reflectionCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize app - skip onboarding, go directly to DigitalVoid
  useEffect(() => {
    const initApp = async () => {
      try {
        const storedUserId = localStorage.getItem('omtobe_user_id');
        
        // Always go to void screen (DigitalVoid) for immediate user experience
        setAppState(prev => ({
          ...prev,
          userId: storedUserId || 'guest_user',
          screen: 'void',
        }));

        await apiClient.healthCheck();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initApp();
  }, []);

  // Handle demo mode toggle
  useEffect(() => {
    if (demoState.isDemoMode && appState.screen === 'onboarding') {
      setAppState(prev => ({
        ...prev,
        userId: 'demo_user',
        screen: 'void',
      }));
    }
  }, [demoState.isDemoMode, appState.screen]);

  // Sync demo state to app state
  useEffect(() => {
    if (demoState.isDemoMode) {
      setAppState(prev => ({
        ...prev,
        currentDay: demoState.currentDay,
        phase: demoState.phase,
      }));
    }
  }, [demoState.isDemoMode, demoState.currentDay, demoState.phase]);

  // Auto-trigger brake screen in demo mode
  useEffect(() => {
    if (
      demoState.isDemoMode &&
      demoState.hrv.change <= -20 &&
      demoState.activeEvents.length > 0 &&
      demoState.currentDay >= 3 &&
      demoState.currentDay <= 5 &&
      appState.screen === 'void'
    ) {
      // Automatically trigger brake screen
      setTimeout(() => {
        setAppState(prev => ({
          ...prev,
          screen: 'brake',
        }));
      }, 500);
    }
  }, [
    demoState.isDemoMode,
    demoState.hrv.change,
    demoState.activeEvents.length,
    demoState.currentDay,
    appState.screen,
  ]);

  // Start monitoring once user is set (production mode only)
  useEffect(() => {
    if (!appState.userId || appState.screen === 'onboarding' || demoState.isDemoMode) {
      return;
    }

    const checkState = async () => {
      try {
        const response: StateResponse = await apiClient.getState();
        const state = response.state;

        setAppState(prev => ({
          ...prev,
          currentDay: state.current_day,
          phase: state.phase,
        }));

        const brakeCheck: StateCheckResponse = await apiClient.checkBrakeScreen();

        if (brakeCheck.should_display && appState.screen === 'void') {
          setAppState(prev => ({
            ...prev,
            screen: 'brake',
          }));
        }
      } catch (error) {
        console.error('Error checking state:', error);
      }
    };

    checkState();
    stateCheckIntervalRef.current = setInterval(checkState, 60000);

    return () => {
      if (stateCheckIntervalRef.current) {
        clearInterval(stateCheckIntervalRef.current);
      }
    };
  }, [appState.userId, appState.screen, demoState.isDemoMode]);

  // Check for reflection screen on Day 7
  useEffect(() => {
    if (!appState.userId || appState.screen === 'onboarding' || demoState.isDemoMode) {
      return;
    }

    const checkReflection = async () => {
      try {
        const state = await apiClient.getState();

        if (state.state.current_day === 7) {
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

    reflectionCheckRef.current = setInterval(checkReflection, 60000);

    return () => {
      if (reflectionCheckRef.current) {
        clearInterval(reflectionCheckRef.current);
      }
    };
  }, [appState.userId, appState.screen, demoState.isDemoMode]);

  const handleBrakeDecision = (decision: 'Proceed' | 'Delay') => {
    // Record in demo mode
    if (demoState.isDemoMode) {
      addIntervention(decision);
    }

    setAppState(prev => ({
      ...prev,
      screen: 'void',
    }));

    if (decision === 'Delay') {
      setTimeout(() => {
        apiClient.checkBrakeScreen().then(response => {
          if (response.should_display && appState.screen === 'void') {
            setAppState(prev => ({
              ...prev,
              screen: 'brake',
            }));
          }
        });
      }, 1200000);
    }
  };

  const handleReflection = (response: 'Yes' | 'No' | 'Skip') => {
    setAppState(prev => ({
      ...prev,
      screen: 'void',
      currentDay: 1,
    }));

    if (demoState.isDemoMode) {
      setDay(1);
    }
  };

  const handleOnboarding = async (userId: string, email: string) => {
    setIsLoading(true);
    try {
      await apiClient.createUser(
        userId,
        email,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );
      setTimeout(() => {
        setAppState(prev => ({
          ...prev,
          userId,
          screen: 'void',
        }));
        setIsLoading(false);
      }, 500);
    } catch (error) {
      console.error('Failed to create user:', error);
      setIsLoading(false);
      alert('Failed to create user. Please try again.');
    }
  };

  const handleMindfulIntervention = () => {
    // Trigger panic mode (-30% HRV) + high-risk event + brake screen
    setHRV('panic');
    setCalendarEvent('board');
    
    // Ensure we're on intervention days (Day 3-5)
    if (demoState.currentDay < 3 || demoState.currentDay > 5) {
      setDay(3);
    }
    
    // Trigger brake screen
    setTimeout(() => {
      setAppState(prev => ({
        ...prev,
        screen: 'brake',
      }));
    }, 300);
  };

  const renderScreen = () => {
    switch (appState.screen) {
      case 'brake':
        return (
          <BrakeScreen
            onDecision={handleBrakeDecision}
            isLoading={isLoading}
          />
        );

      case 'reflection':
        return (
          <ReflectionScreen
            onReflection={handleReflection}
            isLoading={isLoading}
          />
        );

      case 'onboarding':
        return (
          <OnboardingScreen
            onComplete={handleOnboarding}
            isLoading={isLoading}
          />
        );

      case 'void':
      default:
        return (
          <DigitalVoid
            state={appState}
            onTestBrake={() => setAppState(prev => ({ ...prev, screen: 'brake' }))}
            onTestReflection={() => setAppState(prev => ({ ...prev, screen: 'reflection' }))}
            isDemoMode={demoState.isDemoMode}
            onMindfulIntervention={handleMindfulIntervention}
          />
        );
    }
  };

  return (
    <div className={`app ${demoState.isDemoMode ? 'demo-mode' : ''}`}>
      <ModeToggle />
      {demoState.isDemoMode && <DemoDashboard />}
      <div
        className="main-content"
        style={{
          marginLeft: demoState.isDemoMode ? '280px' : '0',
          marginBottom: demoState.isDemoMode ? '200px' : '0',
        }}
      >
        {renderScreen()}
      </div>
      {demoState.isDemoMode && (
        <DemoControls
          onTriggerBrake={() => setAppState(prev => ({ ...prev, screen: 'brake' }))}
          onTriggerReflection={() => setAppState(prev => ({ ...prev, screen: 'reflection' }))}
        />
      )}
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <DemoProvider>
      <AppContent />
    </DemoProvider>
  );
};

const DigitalVoid: React.FC<{
  state: AppState;
  onTestBrake?: () => void;
  onTestReflection?: () => void;
  isDemoMode: boolean;
  onMindfulIntervention?: () => void;
}> = ({ state, onTestBrake, onTestReflection, isDemoMode, onMindfulIntervention }) => {
  return (
    <div className="digital-void" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: isDemoMode ? 10 : 1,
    }}>
      <div
        style={{
          textAlign: 'center',
          position: 'relative',
        }}
      >
        <div style={{ fontSize: '20px', letterSpacing: '0.05em', color: '#666666' }}>
          Omtobe is listening
        </div>
        <div style={{ fontSize: '14px', marginTop: '12px', color: '#444444' }}>
          Day {state.currentDay} of 7
        </div>

        {/* Energy Ring: Mindful Intervention Entry Point (v0.2) */}
        {onMindfulIntervention && (
          <EnergyRing onClick={onMindfulIntervention} />
        )}

        {!isDemoMode && (
          <div style={{ marginTop: '60px', display: 'flex', gap: '16px', justifyContent: 'center', fontSize: '12px', color: '#555555' }}>
            <span>Debug Mode</span>
            <button
              onClick={onTestBrake}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                border: '0.5px solid #444444',
                borderRadius: '0',
                backgroundColor: 'transparent',
                color: '#555555',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(100, 100, 100, 0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Brake
            </button>

            <button
              onClick={onTestReflection}
              style={{
                padding: '6px 12px',
                fontSize: '11px',
                border: '0.5px solid #444444',
                borderRadius: '0',
                backgroundColor: 'transparent',
                color: '#555555',
                cursor: 'pointer',
                letterSpacing: '0.02em',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'rgba(100, 100, 100, 0.1)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Reflection
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const OnboardingScreen: React.FC<{
  onComplete: (userId: string, email: string) => void;
  isLoading: boolean;
}> = ({ onComplete, isLoading }) => {
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (userId.trim() && email.trim()) {
      onComplete(userId, email);
    }
  };

  return (
    <div className="onboarding-screen">
      <div className="onboarding-container">
        <h1>Omtobe</h1>
        <p className="onboarding-subtitle">Mirror + Brake for High-Stakes Decisions</p>

        <form onSubmit={handleSubmit} className="onboarding-form">
          <div className="form-group">
            <label htmlFor="userId">User ID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              placeholder="your_id"
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              disabled={isLoading}
              required
            />
          </div>

          <button type="submit" disabled={isLoading} className="onboarding-button">
            {isLoading ? 'Creating Account...' : 'Start'}
          </button>
        </form>

        <p className="onboarding-info">
          Omtobe will remain silent until a high-stress moment is detected.
        </p>
      </div>
    </div>
  );
};

export default App;
