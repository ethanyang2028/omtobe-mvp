/**
 * BrakeScreen Component
 * 
 * Design Protocol: The Zen Minimalist UI
 * 
 * Visual Principles:
 * - Pure black void (#000000) on OLED screens
 * - System fonts (Inter/San Francisco) with increased letter-spacing
 * - Soft gray text (#A1A1AA) to reduce cognitive load
 * - Ghost buttons only (0.5px borders, no fill)
 * - 1.5s fade-in entrance animation
 * - Zero data visualization (no HRV curves, no stress metrics)
 * - Full-screen intervention overlay
 * 
 * Core Philosophy:
 * "We don't let users analyze data. We let them examine their hearts."
 */

import React, { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import './BrakeScreen.css';

interface BrakeScreenProps {
  onDecision: (decision: 'Proceed' | 'Delay') => void;
  isLoading?: boolean;
}

export const BrakeScreen: React.FC<BrakeScreenProps> = ({
  onDecision,
  isLoading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Trigger fade-in animation on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleClick = async (decision: 'Proceed' | 'Delay') => {
    setIsSubmitting(true);
    try {
      await apiClient.recordDecision(decision);
      onDecision(decision);
    } catch (error) {
      console.error('Failed to record decision:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`brake-screen ${isVisible ? 'brake-screen--visible' : ''}`}>
      {/* Pure void background */}
      <div className="brake-void" />

      {/* Content container: Centered, minimal */}
      <div className="brake-container">
        {/* Single question: The only focal point */}
        <div className="brake-question">
          <h1>Is this decision required to be finalized NOW?</h1>
        </div>

        {/* Decision buttons: Equal weight, ghost style */}
        <div className="brake-buttons">
          <button
            className="brake-button brake-button--delay"
            onClick={() => handleClick('Delay')}
            disabled={isSubmitting || isLoading}
            aria-label="Delay decision for 20 minutes"
          >
            Delay 20 mins
          </button>

          <button
            className="brake-button brake-button--proceed"
            onClick={() => handleClick('Proceed')}
            disabled={isSubmitting || isLoading}
            aria-label="Proceed with decision"
          >
            Proceed
          </button>
        </div>

        {/* Subtle loading indicator */}
        {isSubmitting && (
          <div className="brake-loading">
            <span className="loading-dot" />
          </div>
        )}
      </div>
    </div>
  );
};

export default BrakeScreen;
