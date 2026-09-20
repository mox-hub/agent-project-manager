import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { ColleagueCard } from './colleague-card';
import type { OfficeColleague } from '../api/office-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockStore = vi.hoisted(() => ({
  aiPanelOpen: false,
  setAiPanelOpen: vi.fn(),
  openAssistantWithDraft: vi.fn(),
}));

vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (s: typeof mockStore) => unknown) => selector(mockStore),
}));

function colleague(overrides: Partial<OfficeColleague> = {}): OfficeColleague {
  return {
    memberId: 'ai-1',
    displayName: '小码',
    title: '全栈工程师',
    executionRole: 'coder',
    trustLevel: 2,
    trustScore: 88,
    status: 'working',
    blocking: 0,
    advisory: 0,
    capacity: {
      activeRuns: 1,
      capacityLimit: 5,
      loadPct: 20,
      weeklyTokens: 4200,
      weeklyCostUsd: 1.2,
      acceptability: 'available',
    },
    currentRun: {
      id: 'run-1',
      goal: '实现办公室接口',
      status: 'in_progress',
      taskTitle: '办公室聚合端点',
    },
    lastRunAt: '2026-09-06T08:00:00Z',
    ...overrides,
  };
}

describe('ColleagueCard', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockStore.setAiPanelOpen.mockClear();
    mockStore.openAssistantWithDraft.mockClear();
  });

  it('渲染名字、状态、执行角色与当前执行', () => {
    render(<ColleagueCard colleague={colleague()} />);
    expect(screen.getByText('小码')).toBeTruthy();
    expect(screen.getByText('office.status.working')).toBeTruthy();
    expect(screen.getByText('office.executionRole.coder')).toBeTruthy();
    expect(screen.getByText('办公室聚合端点')).toBeTruthy();
  });

  it('展示容量条文案、可接活度与本周用量', () => {
    render(<ColleagueCard colleague={colleague()} />);
    expect(
      screen.getByText(
        `office.card.capacity:${JSON.stringify({ active: 1, limit: 5 })}`,
      ),
    ).toBeTruthy();
    expect(screen.getByText('office.acceptability.available')).toBeTruthy();
    expect(screen.getByText(/office\.card\.weeklyUsage/)).toBeTruthy();
  });

  it('blocking > 0 时显示计数徽标与待决摘要', () => {
    render(
      <ColleagueCard
        colleague={colleague({ status: 'needYou', blocking: 2, advisory: 1 })}
      />,
    );
    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByText(/office\.card\.decisions:/)).toBeTruthy();
  });

  it('开聊按钮预填草稿并打开面板', () => {
    render(<ColleagueCard colleague={colleague()} />);
    fireEvent.click(screen.getByText('office.card.chat'));
    expect(mockStore.openAssistantWithDraft).toHaveBeenCalledWith(
      expect.stringContaining('小码'),
    );
    expect(mockStore.setAiPanelOpen).toHaveBeenCalledWith(true);
  });

  it('详情按钮跳成员页', () => {
    render(<ColleagueCard colleague={colleague()} />);
    fireEvent.click(screen.getByText('office.card.detail'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/members/ai-1');
  });

  it('空闲且无执行时显示空态文案', () => {
    render(
      <ColleagueCard
        colleague={colleague({
          status: 'idle',
          currentRun: null,
          lastRunAt: undefined,
        })}
      />,
    );
    expect(screen.getByText('office.card.noActiveRun')).toBeTruthy();
    expect(screen.getByText('office.card.neverRun')).toBeTruthy();
  });
});
