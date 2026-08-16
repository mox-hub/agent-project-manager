import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectHealthScoreDialog } from './project-health-score-dialog';
import type { HealthDetailMetric } from '../../api/project-api';

const details: HealthDetailMetric[] = [
  {
    key: 'code_quality',
    label: 'Code Quality',
    score: 86,
    weight: 0.25,
    status: 'on_track',
    source: 'health_snapshot',
    available: true,
  },
  {
    key: 'documentation_coverage',
    label: 'Documentation Coverage',
    score: 0,
    weight: 0.15,
    status: 'pending',
    source: 'pending_integration',
    available: false,
  },
];

describe('ProjectHealthScoreDialog', () => {
  it('renders health details and actions', () => {
    const onRefresh = vi.fn();
    const onShare = vi.fn();

    render(
      <ProjectHealthScoreDialog
        open
        onOpenChange={vi.fn()}
        score={88}
        trend30d={4}
        details={details}
        lastEvaluatedAt="2026-03-15T00:00:00.000Z"
        onRefresh={onRefresh}
        onShare={onShare}
      />,
    );

    expect(screen.getByText('Project Health Score')).toBeTruthy();
    expect(screen.getByText('Code Quality')).toBeTruthy();
    expect(screen.getByText('Documentation Coverage')).toBeTruthy();
    expect(screen.getByText('数据源待接入（pending_integration）')).toBeTruthy();

    fireEvent.click(screen.getByText('Re-evaluate'));
    fireEvent.click(screen.getByText('Share'));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
