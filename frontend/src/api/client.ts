/**
 * Omtobe API Client
 * 
 * Minimal HTTP client for communicating with FastAPI backend.
 * Handles all state machine interactions.
 */

import axios, { AxiosInstance } from 'axios';

interface StateCheckResponse {
  should_display: boolean;
  event_id?: string;
  current_day: number;
  phase: string;
  hrv_current?: number;
  hrv_baseline_mean?: number;
  timestamp: string;
}

interface DecisionResponse {
  status: string;
  decision_type: string;
  timestamp: string;
  next_action: string;
  re_trigger_time?: string;
}

interface ReflectionResponse {
  status: string;
  response: string;
  timestamp: string;
  cycle_reset: {
    status: string;
    new_cycle_start: string;
    current_day: number;
  };
}

interface StateResponse {
  user_id: string;
  state: {
    user_id: string;
    current_day: number;
    cycle_start_date: string;
    cooling_period_active: boolean;
    decision_locked: boolean;
    hrv_baseline_mean: number | null;
    hrv_baseline_std_dev: number | null;
    phase: string;
  };
  timestamp: string;
}

class OmtobeAPIClient {
  private client: AxiosInstance;
  private userId: string | null = null;

  constructor(baseURL: string = '/api/v1') {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Load userId from localStorage
    const stored = localStorage.getItem('omtobe_user_id');
    if (stored) {
      this.userId = stored;
    }
  }

  /**
   * Set user ID for all subsequent requests
   */
  setUserId(userId: string): void {
    this.userId = userId;
    localStorage.setItem('omtobe_user_id', userId);
  }

  /**
   * Get stored user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  /**
   * Create new user
   */
  async createUser(
    userId: string,
    email: string,
    timezone: string = 'UTC'
  ): Promise<any> {
    const response = await this.client.post('/users', {
      user_id: userId,
      email,
      timezone,
    });
    this.setUserId(userId);
    return response.data;
  }

  /**
   * Check if Brake screen should display
   */
  async checkBrakeScreen(): Promise<StateCheckResponse> {
    if (!this.userId) {
      throw new Error('User ID not set');
    }

    const response = await this.client.post('/state/check', {
      user_id: this.userId,
    });
    return response.data;
  }

  /**
   * Record user decision (Proceed or Delay)
   */
  async recordDecision(decisionType: 'Proceed' | 'Delay'): Promise<DecisionResponse> {
    if (!this.userId) {
      throw new Error('User ID not set');
    }

    const response = await this.client.post('/decisions', {
      user_id: this.userId,
      decision_type: decisionType,
    });
    return response.data;
  }

  /**
   * Record reflection response on Day 7
   */
  async recordReflection(response: 'Yes' | 'No' | 'Skip'): Promise<ReflectionResponse> {
    if (!this.userId) {
      throw new Error('User ID not set');
    }

    const apiResponse = await this.client.post('/reflections', {
      user_id: this.userId,
      response,
    });
    return apiResponse.data;
  }

  /**
   * Get current state machine state
   */
  async getState(): Promise<StateResponse> {
    if (!this.userId) {
      throw new Error('User ID not set');
    }

    const response = await this.client.get('/state', {
      params: {
        user_id: this.userId,
      },
    });
    return response.data;
  }

  /**
   * Get decision history
   */
  async getDecisionHistory(limit: number = 100): Promise<any> {
    if (!this.userId) {
      throw new Error('User ID not set');
    }

    const response = await this.client.get('/decisions/history', {
      params: {
        user_id: this.userId,
        limit,
      },
    });
    return response.data;
  }

  /**
   * Get reflection history
   */
  async getReflectionHistory(limit: number = 100): Promise<any> {
    if (!this.userId) {
      throw new Error('User ID not set');
    }

    const response = await this.client.get('/reflections/history', {
      params: {
        user_id: this.userId,
        limit,
      },
    });
    return response.data;
  }
}

export const apiClient = new OmtobeAPIClient();
export type { StateCheckResponse, DecisionResponse, ReflectionResponse, StateResponse };
