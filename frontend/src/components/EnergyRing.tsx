/**
 * Energy Ring Component: Glowing circular button for mindful intervention
 * 
 * Design Philosophy:
 * - Circular energy ring with subtle pulsing halo
 * - Represents a "digital talisman" or "energy barrier"
 * - Invites users to take control during high-stress moments
 * - Minimal, elegant, non-intrusive
 */

import React, { useState } from 'react';
import './EnergyRing.css';

interface EnergyRingProps {
  onClick: () => void;
  isLoading?: boolean;
}

export const EnergyRing: React.FC<EnergyRingProps> = ({ onClick, isLoading = false }) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div className="energy-ring-container">
      {/* Outer pulsing halo */}
      <div className={`energy-halo ${isHovering ? 'halo-active' : ''}`} />

      {/* Main ring button */}
      <button
        className={`energy-ring ${isHovering ? 'ring-active' : ''} ${isLoading ? 'ring-loading' : ''}`}
        onClick={onClick}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        disabled={isLoading}
        aria-label="Activate mindful intervention"
      >
        {/* Inner glow effect */}
        <div className="ring-inner-glow" />

        {/* Icon: Simplified meditation/protection symbol */}
        <svg
          className="ring-icon"
          viewBox="0 0 24 24"
          width="32"
          height="32"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Outer circle */}
          <circle cx="12" cy="12" r="10" />

          {/* Inner circle */}
          <circle cx="12" cy="12" r="6" />

          {/* Center dot */}
          <circle cx="12" cy="12" r="2" fill="currentColor" />

          {/* Meditation rays */}
          <line x1="12" y1="2" x2="12" y2="4" />
          <line x1="12" y1="20" x2="12" y2="22" />
          <line x1="2" y1="12" x2="4" y2="12" />
          <line x1="20" y1="12" x2="22" y2="12" />
        </svg>

        {/* Loading spinner (optional) */}
        {isLoading && <div className="ring-spinner" />}
      </button>

      {/* Text label below */}
      <div className="energy-label">
        <p className="energy-text">Feeling decision pressure?</p>
        <p className="energy-subtext">Click to enter Focus Mode</p>
      </div>
    </div>
  );
};

export default EnergyRing;
