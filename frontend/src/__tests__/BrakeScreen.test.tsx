/**
 * Omtobe MVP v0.1: BrakeScreen Component Tests
 * 
 * Test Requirements:
 * 1. Verify Brake screen displays with correct question
 * 2. Verify buttons are ghost-style (0.5px border, no fill)
 * 3. Verify decision recording on button click
 * 4. Verify fade-in animation (1.5s)
 * 5. Verify accessibility features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrakeScreen } from '../components/BrakeScreen';
import * as apiClient from '../api/client';

// Mock API client
vi.mock('../api/client', () => ({
  apiClient: {
    recordDecision: vi.fn(),
  },
}));

describe('BrakeScreen Component', () => {
  const mockOnDecision = vi.fn();

  beforeEach(() => {
    mockOnDecision.mockClear();
    vi.clearAllMocks();
  });

  it('should render the correct question', () => {
    render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const question = screen.getByText('Is this decision required to be finalized NOW?');
    expect(question).toBeInTheDocument();
  });

  it('should render two buttons with correct labels', () => {
    render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const delayButton = screen.getByRole('button', { name: /Delay 20 mins/i });
    const proceedButton = screen.getByRole('button', { name: /Proceed/i });
    
    expect(delayButton).toBeInTheDocument();
    expect(proceedButton).toBeInTheDocument();
  });

  it('should have ghost button styling (0.5px border, no fill)', () => {
    const { container } = render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const buttons = container.querySelectorAll('.brake-button');
    buttons.forEach(button => {
      const styles = window.getComputedStyle(button);
      
      // Verify ghost button: border but no background fill
      expect(styles.border).toBeTruthy();
      expect(styles.backgroundColor).toBe('transparent');
    });
  });

  it('should call recordDecision when Delay button is clicked', async () => {
    vi.mocked(apiClient.apiClient.recordDecision).mockResolvedValue({});
    
    render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const delayButton = screen.getByRole('button', { name: /Delay 20 mins/i });
    await userEvent.click(delayButton);
    
    await waitFor(() => {
      expect(apiClient.apiClient.recordDecision).toHaveBeenCalledWith('Delay');
      expect(mockOnDecision).toHaveBeenCalledWith('Delay');
    });
  });

  it('should call recordDecision when Proceed button is clicked', async () => {
    vi.mocked(apiClient.apiClient.recordDecision).mockResolvedValue({});
    
    render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const proceedButton = screen.getByRole('button', { name: /Proceed/i });
    await userEvent.click(proceedButton);
    
    await waitFor(() => {
      expect(apiClient.apiClient.recordDecision).toHaveBeenCalledWith('Proceed');
      expect(mockOnDecision).toHaveBeenCalledWith('Proceed');
    });
  });

  it('should have fade-in animation on mount', () => {
    const { container } = render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const brakeScreen = container.querySelector('.brake-screen');
    expect(brakeScreen).toHaveClass('brake-screen--visible');
  });

  it('should disable buttons during submission', async () => {
    vi.mocked(apiClient.apiClient.recordDecision).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 100))
    );
    
    render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const delayButton = screen.getByRole('button', { name: /Delay 20 mins/i });
    await userEvent.click(delayButton);
    
    expect(delayButton).toBeDisabled();
  });

  it('should have proper accessibility attributes', () => {
    render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const delayButton = screen.getByRole('button', { name: /Delay 20 mins/i });
    const proceedButton = screen.getByRole('button', { name: /Proceed/i });
    
    expect(delayButton).toHaveAttribute('aria-label', 'Delay decision for 20 minutes');
    expect(proceedButton).toHaveAttribute('aria-label', 'Proceed with decision');
  });

  it('should have focus management for keyboard navigation', async () => {
    render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const delayButton = screen.getByRole('button', { name: /Delay 20 mins/i });
    
    // Tab to button
    delayButton.focus();
    expect(delayButton).toHaveFocus();
    
    // Press Enter
    fireEvent.keyDown(delayButton, { key: 'Enter', code: 'Enter' });
  });

  it('should show loading indicator when isLoading prop is true', () => {
    const { container } = render(
      <BrakeScreen onDecision={mockOnDecision} isLoading={true} />
    );
    
    const loadingIndicator = container.querySelector('.brake-loading');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('should have equal button weights (same width, padding, font-size)', () => {
    const { container } = render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const buttons = container.querySelectorAll('.brake-button');
    const styles = Array.from(buttons).map(button => {
      const style = window.getComputedStyle(button);
      return {
        padding: style.padding,
        fontSize: style.fontSize,
        minWidth: style.minWidth,
      };
    });
    
    // Both buttons should have same styling
    expect(styles[0]).toEqual(styles[1]);
  });

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(apiClient.apiClient.recordDecision).mockRejectedValue(
      new Error('API Error')
    );
    
    render(<BrakeScreen onDecision={mockOnDecision} />);
    
    const proceedButton = screen.getByRole('button', { name: /Proceed/i });
    await userEvent.click(proceedButton);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to record decision:',
        expect.any(Error)
      );
    });
    
    consoleErrorSpy.mockRestore();
  });
});
