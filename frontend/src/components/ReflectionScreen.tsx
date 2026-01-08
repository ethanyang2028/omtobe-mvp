/**
 * ReflectionScreen Component
 * 
 * Displayed on Day 7 at 09:00 AM local time.
 * Single question: "In the past 7 days, did pausing help?"
 * Three options: Yes, No, Skip
 */

import React, { useState } from 'react';
import { apiClient } from '../api/client';
import './ReflectionScreen.css';

interface ReflectionScreenProps {
  onReflection: (response: 'Yes' | 'No' | 'Skip') => void;
  isLoading?: boolean;
}

export const ReflectionScreen: React.FC<ReflectionScreenProps> = ({
  onReflection,
  isLoading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClick = async (response: 'Yes' | 'No' | 'Skip') => {
    setIsSubmitting(true);
    try {
      await apiClient.recordReflection(response);
      onReflection(response);
    } catch (error) {
      console.error('Failed to record reflection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="reflection-screen">
      <div className="reflection-background" />

      <div className="reflection-container">
        {/* Question */}
        <div className="reflection-question">
          <h1>In the past 7 days, did pausing help?</h1>
        </div>

        {/* Buttons */}
        <div className="reflection-buttons">
          <button
            className="reflection-button reflection-button--yes"
            onClick={() => handleClick('Yes')}
            disabled={isSubmitting || isLoading}
          >
            Yes
          </button>

          <button
            className="reflection-button reflection-button--no"
            onClick={() => handleClick('No')}
            disabled={isSubmitting || isLoading}
          >
            No
          </button>

          <button
            className="reflection-button reflection-button--skip"
            onClick={() => handleClick('Skip')}
            disabled={isSubmitting || isLoading}
          >
            Skip
          </button>
        </div>

        {/* Loading state */}
        {(isSubmitting || isLoading) && (
          <div className="reflection-loading">
            <span className="loading-indicator" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReflectionScreen;
