/**
 * Demo Dashboard: Left sidebar showing system status
 * Only visible in Demo Mode
 */

import React from 'react';
import { useDemo } from '../contexts/DemoContext';
import './DemoDashboard.css';

export const DemoDashboard: React.FC = () => {
  const { demoState } = useDemo();

  const getHRVStatusColor = () => {
    switch (demoState.hrv.status) {
      case 'normal':
        return '#51cf66';
      case 'elevated':
        return '#ffd43b';
      case 'critical':
        return '#ff6b6b';
      default:
        return '#888888';
    }
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high':
        return '#ff6b6b';
      case 'medium':
        return '#ffd43b';
      case 'low':
        return '#51cf66';
      default:
        return '#888888';
    }
  };

  return (
    <div className="demo-dashboard">
      {/* System Status */}
      <div className="dashboard-section">
        <h3 className="section-title">System Status</h3>
        <div className="status-grid">
          <div className="status-item">
            <span className="status-label">Current Day</span>
            <span className="status-value">{demoState.currentDay}/7</span>
          </div>
          <div className="status-item">
            <span className="status-label">Phase</span>
            <span className="status-value">{demoState.phase}</span>
          </div>
        </div>
      </div>

      {/* HRV Monitor */}
      <div className="dashboard-section">
        <h3 className="section-title">HRV Monitor</h3>
        <div className="hrv-display">
          <div className="hrv-main">
            <div className="hrv-value" style={{ color: getHRVStatusColor() }}>
              {demoState.hrv.current} ms
            </div>
            <div className="hrv-change" style={{ color: getHRVStatusColor() }}>
              {demoState.hrv.change >= 0 ? '+' : ''}
              {demoState.hrv.change}%
            </div>
          </div>
          <div className="hrv-details">
            <div className="hrv-detail-item">
              <span>Baseline:</span>
              <span>{demoState.hrv.baseline} ms</span>
            </div>
            <div className="hrv-detail-item">
              <span>Status:</span>
              <span style={{ color: getHRVStatusColor(), textTransform: 'capitalize' }}>
                {demoState.hrv.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar Events */}
      <div className="dashboard-section">
        <h3 className="section-title">Active Events</h3>
        {demoState.activeEvents.length === 0 ? (
          <div className="empty-state">No active events</div>
        ) : (
          <div className="events-list">
            {demoState.activeEvents.map(event => (
              <div key={event.id} className="event-item">
                <div className="event-title">{event.title}</div>
                <div className="event-time">
                  {event.startTime} - {event.endTime}
                </div>
                <div
                  className="event-risk"
                  style={{ color: getRiskLevelColor(event.riskLevel) }}
                >
                  {event.riskLevel.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Intervention History */}
      <div className="dashboard-section">
        <h3 className="section-title">Recent Interventions</h3>
        {demoState.interventionHistory.length === 0 ? (
          <div className="empty-state">No interventions yet</div>
        ) : (
          <div className="history-list">
            {demoState.interventionHistory.map((record, index) => (
              <div key={index} className="history-item">
                <div className="history-time">{record.timestamp}</div>
                <div className="history-decision">
                  Decision: <strong>{record.decision}</strong>
                </div>
                <div className="history-outcome">Outcome: {record.outcome}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
