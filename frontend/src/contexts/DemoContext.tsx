/**
 * Demo Context: Manages demo mode state and simulators
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface HRVData {
  current: number;
  baseline: number;
  change: number; // percentage
  status: 'normal' | 'elevated' | 'critical';
}

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  riskLevel: 'high' | 'medium' | 'low';
}

export interface InterventionRecord {
  timestamp: string;
  decision: 'Proceed' | 'Delay';
  outcome: 'Completed' | 'Delayed';
}

interface DemoState {
  isDemoMode: boolean;
  currentDay: number;
  phase: string;
  hrv: HRVData;
  activeEvents: CalendarEvent[];
  interventionHistory: InterventionRecord[];
}

interface DemoContextType {
  demoState: DemoState;
  toggleDemoMode: () => void;
  setHRV: (preset: 'normal' | 'stressed' | 'critical' | 'panic') => void;
  setCalendarEvent: (eventType: 'none' | 'board' | 'negotiation' | 'highstakes') => void;
  addIntervention: (decision: 'Proceed' | 'Delay') => void;
  setDay: (day: number) => void;
  resetDemo: () => void;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const initialHRV: HRVData = {
  current: 50,
  baseline: 50,
  change: 0,
  status: 'normal',
};

const initialState: DemoState = {
  isDemoMode: false,
  currentDay: 1,
  phase: 'Total Silence',
  hrv: initialHRV,
  activeEvents: [],
  interventionHistory: [],
};

export const DemoProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [demoState, setDemoState] = useState<DemoState>(() => {
    // Load from localStorage
    const saved = localStorage.getItem('omtobe_demo_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return initialState;
      }
    }
    return initialState;
  });

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('omtobe_demo_state', JSON.stringify(demoState));
  }, [demoState]);

  const toggleDemoMode = () => {
    setDemoState(prev => ({
      ...prev,
      isDemoMode: !prev.isDemoMode,
    }));
  };

  const setHRV = (preset: 'normal' | 'stressed' | 'critical' | 'panic') => {
    const baseline = 50;
    let current: number;
    let change: number;
    let status: 'normal' | 'elevated' | 'critical';

    switch (preset) {
      case 'stressed':
        current = 45; // -10%
        change = -10;
        status = 'elevated';
        break;
      case 'critical':
        current = 40; // -20%
        change = -20;
        status = 'critical';
        break;
      case 'panic':
        current = 35; // -30%
        change = -30;
        status = 'critical';
        break;
      case 'normal':
      default:
        current = 50;
        change = 0;
        status = 'normal';
    }

    setDemoState(prev => ({
      ...prev,
      hrv: { current, baseline, change, status },
    }));
  };

  const setCalendarEvent = (eventType: 'none' | 'board' | 'negotiation' | 'highstakes') => {
    const now = new Date();
    const startTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const endTime = new Date(now.getTime() + 60 * 60 * 1000).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });

    let events: CalendarEvent[] = [];

    switch (eventType) {
      case 'board':
        events = [
          {
            id: '1',
            title: 'Board Meeting',
            startTime,
            endTime,
            riskLevel: 'high',
          },
        ];
        break;
      case 'negotiation':
        events = [
          {
            id: '2',
            title: 'Contract Negotiation',
            startTime,
            endTime,
            riskLevel: 'high',
          },
        ];
        break;
      case 'highstakes':
        events = [
          {
            id: '3',
            title: '! High-Stakes Decision',
            startTime,
            endTime,
            riskLevel: 'high',
          },
        ];
        break;
      case 'none':
      default:
        events = [];
    }

    setDemoState(prev => ({
      ...prev,
      activeEvents: events,
    }));
  };

  const addIntervention = (decision: 'Proceed' | 'Delay') => {
    const intervention: InterventionRecord = {
      timestamp: new Date().toLocaleString(),
      decision,
      outcome: decision === 'Proceed' ? 'Completed' : 'Delayed',
    };

    setDemoState(prev => ({
      ...prev,
      interventionHistory: [intervention, ...prev.interventionHistory].slice(0, 5), // Keep last 5
    }));
  };

  const setDay = (day: number) => {
    let phase: string;
    if (day <= 2) {
      phase = 'Total Silence';
    } else if (day <= 5) {
      phase = 'Intervention Logic';
    } else if (day === 7) {
      phase = 'Reflection';
    } else {
      phase = 'Observation';
    }

    setDemoState(prev => ({
      ...prev,
      currentDay: day,
      phase,
    }));
  };

  const resetDemo = () => {
    setDemoState(initialState);
  };

  return (
    <DemoContext.Provider
      value={{
        demoState,
        toggleDemoMode,
        setHRV,
        setCalendarEvent,
        addIntervention,
        setDay,
        resetDemo,
      }}
    >
      {children}
    </DemoContext.Provider>
  );
};

export const useDemo = (): DemoContextType => {
  const context = useContext(DemoContext);
  if (!context) {
    throw new Error('useDemo must be used within DemoProvider');
  }
  return context;
};
