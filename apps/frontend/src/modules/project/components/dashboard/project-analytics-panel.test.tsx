import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectAnalyticsPanel, type AnalyticsModulesState } from './project-analytics-panel';
import type { ProjectAnalytics } from '../../api/project-api';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

vi.stubGlobal('ResizeObserver', ResizeObserverMock);

const analytics: ProjectAnalytics = {
  deliveryTimeline: [
    { date: '2026-03-01', healthScore: 80, deliveryScore: 76, completionRate: 76 },
    { date: '2026-03-08', healthScore: 84, deliveryScore: 81, completionRate: 81 },
  ],
  workloadDistribution: [
    { key: 'u1', label: 'Alice', value: 55 },
    { key: 'u2', label: 'Bob', value: 45 },
  ],
  aiRiskDistribution: [
    { key: 'overdue_risk', label: 'Overdue Risk', value: 35 },
    { key: 'blocked_risk', label: 'Blocked Risk', value: 20 },
  ],
  aiComplexityDistribution: [
    { key: 'complexity', label: 'Complexity', value: 70 },
    { key: 'velocity_signal', label: 'Velocity Signal', value: 45 },
  ],
};

describe('ProjectAnalyticsPanel', () => {
  it('renders default charts', () => {
    render(
      <ProjectAnalyticsPanel
        analytics={analytics}
        modules={{ delivery: true, aiRisk: true, workload: true }}
        onModulesChange={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Delivery Efficiency').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('AI Risk Distribution')).toBeTruthy();
    expect(screen.getAllByText('Workload Balance').length).toBeGreaterThanOrEqual(2);
  });

  it('shows empty state when all modules disabled', () => {
    const onModulesChange = vi.fn();
    render(
      <ProjectAnalyticsPanel
        analytics={analytics}
        modules={{ delivery: false, aiRisk: false, workload: false }}
        onModulesChange={onModulesChange}
      />,
    );

    expect(screen.getByText('已关闭全部模块，请至少启用一个图表模块。')).toBeTruthy();
  });

  it('triggers module toggle callback', () => {
    let modules: AnalyticsModulesState = { delivery: true, aiRisk: false, workload: false };
    const onModulesChange = vi.fn((value: AnalyticsModulesState) => {
      modules = value;
    });

    render(<ProjectAnalyticsPanel analytics={analytics} modules={modules} onModulesChange={onModulesChange} />);
    fireEvent.click(screen.getByLabelText('AI Risk & Complexity'));
    expect(onModulesChange).toHaveBeenCalled();
  });
});
