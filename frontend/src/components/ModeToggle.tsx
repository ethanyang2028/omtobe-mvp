/**
 * Mode Toggle: Switch between Demo and Production modes
 */

import React from 'react';
import { useDemo } from '../contexts/DemoContext';
import './ModeToggle.css';

export const ModeToggle: React.FC = () => {
  const { demoState, toggleDemoMode } = useDemo();

  const handleToggle = () => {
    toggleDemoMode();
    
    // Show toast notification
    const message = demoState.isDemoMode
      ? 'Switched to Production Mode'
      : 'Switched to Demo Mode';
    
    showToast(message);
  };

  const showToast = (message: string) => {
    const toast = document.createElement('div');
    toast.className = 'mode-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  };

  return (
    <div className="mode-toggle">
      <button
        className={`mode-btn ${!demoState.isDemoMode ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={!demoState.isDemoMode}
      >
        Production
      </button>
      <button
        className={`mode-btn ${demoState.isDemoMode ? 'active' : ''}`}
        onClick={handleToggle}
        disabled={demoState.isDemoMode}
      >
        Demo
      </button>
    </div>
  );
};
