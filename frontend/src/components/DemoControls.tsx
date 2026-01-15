/**
 * Demo Controls: Bottom panel with simulators
 * Only visible in Demo Mode
 */

import React from 'react';
import { useDemo } from '../contexts/DemoContext';
import './DemoControls.css';

interface DemoControlsProps {
  onTriggerBrake: () => void;
  onTriggerReflection: () => void;
}

export const DemoControls: React.FC<DemoControlsProps> = ({
  onTriggerBrake,
  onTriggerReflection,
}) => {
  const { demoState, setHRV, setCalendarEvent, setDay, resetDemo } = useDemo();

  return (
    <div className="demo-controls">
      {/* HRV Simulator */}
      <div className="control-section">
        <h4 className="control-title">HRV Simulator</h4>
        <div className="control-buttons">
          <button
            className={`control-btn ${demoState.hrv.change === 0 ? 'active' : ''}`}
            onClick={() => setHRV('normal')}
          >
            Normal
          </button>
          <button
            className={`control-btn ${demoState.hrv.change === -10 ? 'active' : ''}`}
            onClick={() => setHRV('stressed')}
          >
            Stressed (-10%)
          </button>
          <button
            className={`control-btn ${demoState.hrv.change === -20 ? 'active' : ''}`}
            onClick={() => setHRV('critical')}
          >
            Critical (-20%)
          </button>
          <button
            className={`control-btn ${demoState.hrv.change === -30 ? 'active' : ''}`}
            onClick={() => setHRV('panic')}
          >
            Panic (-30%)
          </button>
        </div>
      </div>

      {/* Calendar Event Simulator */}
      <div className="control-section">
        <h4 className="control-title">Calendar Events</h4>
        <div className="control-buttons">
          <button
            className={`control-btn ${demoState.activeEvents.length === 0 ? 'active' : ''}`}
            onClick={() => setCalendarEvent('none')}
          >
            No Event
          </button>
          <button
            className={`control-btn ${
              demoState.activeEvents.some(e => e.title === 'Board Meeting') ? 'active' : ''
            }`}
            onClick={() => setCalendarEvent('board')}
          >
            Board Meeting
          </button>
          <button
            className={`control-btn ${
              demoState.activeEvents.some(e => e.title === 'Contract Negotiation')
                ? 'active'
                : ''
            }`}
            onClick={() => setCalendarEvent('negotiation')}
          >
            Negotiation
          </button>
          <button
            className={`control-btn ${
              demoState.activeEvents.some(e => e.title.includes('High-Stakes')) ? 'active' : ''
            }`}
            onClick={() => setCalendarEvent('highstakes')}
          >
            High-Stakes
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="control-section">
        <h4 className="control-title">Quick Actions</h4>
        <div className="control-buttons">
          <button className="control-btn action-btn" onClick={onTriggerBrake}>
            Trigger Brake
          </button>
          <button className="control-btn action-btn" onClick={onTriggerReflection}>
            Trigger Reflection
          </button>
          <button
            className="control-btn action-btn"
            onClick={() => setDay(7)}
          >
            Jump to Day 7
          </button>
          <button
            className="control-btn action-btn"
            onClick={() => {
              setDay(1);
              resetDemo();
            }}
          >
            Reset Demo
          </button>
        </div>
      </div>

      {/* Timeline */}
      <div className="control-section timeline-section">
        <h4 className="control-title">7-Day Timeline</h4>
        <div className="timeline">
          {[1, 2, 3, 4, 5, 6, 7].map(day => (
            <button
              key={day}
              className={`timeline-day ${demoState.currentDay === day ? 'active' : ''} ${
                day <= 2 ? 'phase-silence' : day <= 5 ? 'phase-intervention' : 'phase-reflection'
              }`}
              onClick={() => setDay(day)}
            >
              {day}
            </button>
          ))}
        </div>
        <div className="timeline-legend">
          <span className="legend-item">
            <span className="legend-dot phase-silence"></span>
            Days 1-2: Silence
          </span>
          <span className="legend-item">
            <span className="legend-dot phase-intervention"></span>
            Days 3-5: Intervention
          </span>
          <span className="legend-item">
            <span className="legend-dot phase-reflection"></span>
            Day 7: Reflection
          </span>
        </div>
      </div>
    </div>
  );
};
