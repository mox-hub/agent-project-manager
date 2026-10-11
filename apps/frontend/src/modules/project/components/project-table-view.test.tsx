/**
 * ProjectTableView 行为级测试（CAP-A-29 / GAP-T-66）
 * 覆盖：行点击回调 / 列显隐过滤（displayMenu 同源）/ 空数据空态。
 * 视觉词表走 status-visuals 静态兜底（useStatusVisualMap 整桩为空 Map）。
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProjectTableView } from './project-table-view';
import type { Project } from '../api/project-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/modules/core-config/hooks/use-status-visual-map', () => ({
  useStatusVisualMap: () => new Map(),
}));

const buildProject = (overrides: Partial<Project>): Project =>
  ({
    id: overrides.name === 'Alpha' ? 'p1' : 'p2',
    name: overrides.name ?? 'project',
    status: 'active',
    workflowStatus: 'in_progress',
    healthStatus: 'on_track',
    healthScore: 88,
    priority: 'high',
    progress: 42,
    updatedAt: '2026-01-02T00:00:00Z',
    ...overrides,
  }) as Project;

const projects: Project[] = [
  buildProject({ name: 'Alpha' }),
  buildProject({ name: 'Beta' }),
];

describe('ProjectTableView（CAP-A-29 表格视图）', () => {
  it('renders project rows and reports row clicks', () => {
    const onProjectClick = vi.fn();
    render(<ProjectTableView projects={projects} onProjectClick={onProjectClick} />);

    expect(screen.getByText('Alpha')).toBeTruthy();
    expect(screen.getByText('Beta')).toBeTruthy();

    fireEvent.click(screen.getByText('Alpha'));
    expect(onProjectClick).toHaveBeenCalledTimes(1);
    expect(onProjectClick.mock.calls[0][0].name).toBe('Alpha');
  });

  it('hides columns excluded by visibleColumns (displayMenu 同源)', () => {
    render(
      <ProjectTableView
        projects={projects}
        visibleColumns={['icon', 'name', 'status']}
      />,
    );

    // status 列在列集合内，health/priority 列被隐藏（表头文案 = i18n 键）
    expect(screen.getByText('project.columns.status')).toBeTruthy();
    expect(screen.queryByText('project.columns.health')).toBeNull();
    expect(screen.queryByText('project.columns.priority')).toBeNull();
  });

  it('renders the empty content when no projects', () => {
    render(<ProjectTableView projects={[]} />);
    expect(screen.getByText('project.messages.noProjects')).toBeTruthy();
  });
});
