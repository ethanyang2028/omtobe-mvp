/**
 * Omtobe MVP v0.1: Main Application
 * 
 * Technical Integration Points:
 * - GET /api/v1/state: Poll every 60 seconds
 * - POST /api/v1/decision: Send immediately on user action
 * - State transitions: void → brake → void (or reflection)
 * 
 * Design Philosophy: Digital Void
 * - Invisible when not intervening
 * - Full-screen intervention when needed
 * - Zero proactive notifications
 */

import React, { useEffect, useState, useRef } from 'react';
import { BrakeScreen } from './components/BrakeScreen';
import { ReflectionScreen } from './components/ReflectionScreen';
import { mockApiClient as apiClient, StateCheckResponse, StateResponse } from './api/mock-client';
import './App.css';

type ScreenState = 'void' | 'brake' | 'reflection' | 'onboarding';

interface AppState {
  screen: ScreenState;
  userId: string | null;
  currentDay: number;
  phase: string;
}

export const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>({
    screen: 'void',
    userId: null,
    currentDay: 1,
    phase: 'Total Silence',
  });

  const [isLoading, setIsLoading] = useState(false);
  const stateCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reflectionCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize app
  useEffect(() => {
    const initApp = async () => {
      try {
        // Check if user already exists
        const storedUserId = localStorage.getItem('omtobe_user_id');

        if (storedUserId) {
          apiClient.setUserId(storedUserId);
          setAppState(prev => ({
            ...prev,
            userId: storedUserId,
            screen: 'void',
          }));
        } else {
          // Show onboarding
          setAppState(prev => ({
            ...prev,
            screen: 'onboarding',
          }));
        }

        // Health check
        await apiClient.healthCheck();
      } catch (error) {
        console.error('Failed to initialize app:', error);
      }
    };

    initApp();
  }, []);

  // Start monitoring once user is set
  useEffect(() => {
    if (!appState.userId || appState.screen === 'onboarding') {
      return;
    }

    /**
     * Poll GET /api/v1/state every 60 seconds
     * Check if INTERVENTION_READY status is returned
     */
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
        // Note: Backend should return a status field indicating INTERVENTION_READY
        // For now, we use the brake screen check endpoint
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

    // Initial check
    checkState();

    // Poll every 60 seconds
    stateCheckIntervalRef.current = setInterval(checkState, 60000);

    return () => {
      if (stateCheckIntervalRef.current) {
        clearInterval(stateCheckIntervalRef.current);
      }
    };
  }, [appState.userId, appState.screen]);

  // Check for reflection screen on Day 7
  useEffect(() => {
    if (!appState.userId || appState.screen === 'onboarding') {
      return;
    }

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

    return () => {
      if (reflectionCheckRef.current) {
        clearInterval(reflectionCheckRef.current);
      }
    };
  }, [appState.userId, appState.screen]);

  /**
   * Handle brake decision
   * POST /api/v1/decision is called inside BrakeScreen component
   * This callback clears the intervention state
   */
  const handleBrakeDecision = (decision: 'Proceed' | 'Delay') => {
    // Clear brake screen and return to void
    setAppState(prev => ({
      ...prev,
      screen: 'void',
    }));

    if (decision === 'Delay') {
      // After 20 minutes, check again
      setTimeout(() => {
        apiClient.checkBrakeScreen().then(response => {
          if (response.should_display && appState.screen === 'void') {
            setAppState(prev => ({
              ...prev,
              screen: 'brake',
            }));
          }
        });
      }, 1200000); // 20 minutes
    }
  };

  /**
   * Handle reflection response
   */
  const handleReflection = (response: 'Yes' | 'No' | 'Skip') => {
    // Close reflection screen and return to void
    setAppState(prev => ({
      ...prev,
      screen: 'void',
      currentDay: 1, // Reset to Day 1 after reflection
    }));
  };

  /**
   * Handle onboarding
   */
  const handleOnboarding = async (userId: string, email: string) => {
    setIsLoading(true);
    try {
      await apiClient.createUser(
        userId,
        email,
        Intl.DateTimeFormat().resolvedOptions().timeZone
      );
      // Delay state update to ensure smooth transition
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

  // Render appropriate screen
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
        return <DigitalVoid state={appState} />;
    }
  };

  return <div className="app">{renderScreen()}</div>;
};

/**
 * Digital Void: Invisible UI when not intervening
 */
const DigitalVoid: React.FC<{ state: AppState }> = ({ state }) => {
  return (
    <div className="digital-void">
      <div style={{
        position: 'fixed',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '14px', letterSpacing: '0.05em', color: '#333333' }}>
          Omtobe is listening
        </div>
        <div style={{ fontSize: '11px', marginTop: '8px', color: '#222222' }}>
          Day {state.currentDay} of 7
        </div>
      </div>
    </div>
  );
};

/**
 * Onboarding Screen
 */
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
