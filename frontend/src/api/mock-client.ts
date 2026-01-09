/**
 * Omtobe Mock API Client
 * 
 * Simulates backend responses for demonstration purposes.
 * Uses localStorage to persist state across sessions.
 */

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

class OmtobeMockClient {
  private userId: string | null = null;
  private cycleStartDate: Date;
  private lastBrakeTime: number = 0;
  private coolingPeriodActive: boolean = false;

  constructor() {
    const stored = localStorage.getItem('omtobe_user_id');
    if (stored) {
      this.userId = stored;
    }

    const storedCycleStart = localStorage.getItem('omtobe_cycle_start');
    this.cycleStartDate = storedCycleStart ? new Date(storedCycleStart) : new Date();
  }

  /**
   * Set user ID for all subsequent requests
   */
  setUserId(userId: string): void {
    this.userId = userId;
    localStorage.setItem('omtobe_user_id', userId);
    localStorage.setItem('omtobe_cycle_start', new Date().toISOString());
    this.cycleStartDate = new Date();
  }

  /**
   * Get stored user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Calculate current day in 7-day cycle
   */
  private getCurrentDay(): number {
    const now = new Date();
    const daysDiff = Math.floor(
      (now.getTime() - this.cycleStartDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return (daysDiff % 7) + 1;
  }

  /**
   * Get current phase
   */
  private getCurrentPhase(): string {
    const day = this.getCurrentDay();
    if (day <= 2) return 'TOTAL_SILENCE';
    if (day <= 5) return 'INTERVENTION_LOGIC';
    return 'REFLECTION';
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; version: string }> {
    return {
      status: 'healthy',
      version: '0.1.0',
    };
  }

  /**
   * Create new user
   */
  async createUser(
    userId: string,
    email: string,
    timezone: string = 'UTC'
  ): Promise<any> {
    this.setUserId(userId);
    return {
      status: 'user_created',
      user_id: userId,
      email,
      timezone,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Check if Brake screen should display
   */
  async checkBrakeScreen(): Promise<StateCheckResponse> {
    const day = this.getCurrentDay();
    const phase = this.getCurrentPhase();

    // 模拟：Day 3-5 时有 30% 概率显示 Brake 屏幕
    const shouldDisplay = phase === 'INTERVENTION_LOGIC' && Math.random() < 0.3;

    if (shouldDisplay) {
      this.lastBrakeTime = Date.now();
    }

    return {
      should_display: shouldDisplay,
      event_id: shouldDisplay ? 'mock_event_001' : undefined,
      current_day: day,
      phase,
      hrv_current: 45 + Math.random() * 15,
      hrv_baseline_mean: 60,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Record user decision (Proceed or Delay)
   */
  async recordDecision(decisionType: 'Proceed' | 'Delay'): Promise<DecisionResponse> {
    const decision = {
      status: 'decision_recorded',
      decision_type: decisionType,
      timestamp: new Date().toISOString(),
      next_action: decisionType === 'Delay' ? 'wait_20_mins' : 'proceed_with_decision',
      re_trigger_time: decisionType === 'Delay' ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : undefined,
    };

    // 保存到 localStorage
    const decisions = JSON.parse(localStorage.getItem('omtobe_decisions') || '[]');
    decisions.push({
      timestamp: decision.timestamp,
      decision_type: decisionType,
    });
    localStorage.setItem('omtobe_decisions', JSON.stringify(decisions));

    return decision;
  }

  /**
   * Record reflection response on Day 7
   */
  async recordReflection(response: 'Yes' | 'No' | 'Skip'): Promise<ReflectionResponse> {
    const reflection = {
      status: 'reflection_recorded',
      response,
      timestamp: new Date().toISOString(),
      cycle_reset: {
        status: 'cycle_reset_initiated',
        new_cycle_start: new Date().toISOString(),
        current_day: 1,
      },
    };

    // 保存到 localStorage
    const reflections = JSON.parse(localStorage.getItem('omtobe_reflections') || '[]');
    reflections.push({
      timestamp: reflection.timestamp,
      response,
    });
    localStorage.setItem('omtobe_reflections', JSON.stringify(reflections));

    // 重置周期
    localStorage.setItem('omtobe_cycle_start', new Date().toISOString());
    this.cycleStartDate = new Date();

    return reflection;
  }

  /**
   * Get current state machine state
   */
  async getState(): Promise<StateResponse> {
    const day = this.getCurrentDay();
    const phase = this.getCurrentPhase();

    return {
      user_id: this.userId || 'unknown',
      state: {
        user_id: this.userId || 'unknown',
        current_day: day,
        cycle_start_date: this.cycleStartDate.toISOString(),
        cooling_period_active: this.coolingPeriodActive,
        decision_locked: false,
        hrv_baseline_mean: 60,
        hrv_baseline_std_dev: 5,
        phase,
      },
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get decision history
   */
  async getDecisionHistory(limit: number = 100): Promise<any> {
    const decisions = JSON.parse(localStorage.getItem('omtobe_decisions') || '[]');
    return {
      decisions: decisions.slice(-limit),
      total: decisions.length,
    };
  }

  /**
   * Get reflection history
   */
  async getReflectionHistory(limit: number = 100): Promise<any> {
    const reflections = JSON.parse(localStorage.getItem('omtobe_reflections') || '[]');
    return {
      reflections: reflections.slice(-limit),
      total: reflections.length,
    };
  }
}

export const mockApiClient = new OmtobeMockClient();
export type { StateCheckResponse, DecisionResponse, ReflectionResponse, StateResponse };
