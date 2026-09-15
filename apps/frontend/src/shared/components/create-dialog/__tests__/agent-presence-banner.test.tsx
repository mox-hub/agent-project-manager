/**
 * AgentPresenceBanner 单元测试（CAP-A-18 V2）
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AgentPresenceBanner } from '../agent-presence-banner';
import type { Member } from '@/modules/team-member/types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: { defaultValue?: string; agent?: string }) => {
      if (opts?.defaultValue) {
        return opts.defaultValue.replace('{agent}', opts.agent || '');
      }
      return key;
    },
  }),
}));

const mockMembers: Member[] = [
  {
    id: 'u-1',
    type: 'human',
    displayName: '张工',
    handle: 'zhang',
    avatarUrl: null,
  } as unknown as Member,
  {
    id: 'agent-mika',
    type: 'ai_agent',
    displayName: 'Mika',
    handle: 'mika',
    avatarUrl: null,
  } as unknown as Member,
];

describe('AgentPresenceBanner (CAP-A-18 V2)', () => {
  it('人类成员或未指派时不渲染感知条', () => {
    const { container: c1 } = render(
      <AgentPresenceBanner
        assigneeId="u-1"
        members={mockMembers}
        activeType="task"
        strategy="immediate"
        onStrategyChange={vi.fn()}
      />,
    );
    expect(c1.firstChild).toBeNull();

    const { container: c2 } = render(
      <AgentPresenceBanner
        assigneeId=""
        members={mockMembers}
        activeType="task"
        strategy="immediate"
        onStrategyChange={vi.fn()}
      />,
    );
    expect(c2.firstChild).toBeNull();
  });

  it('指派给 AI Agent 时，展示立即执行在场文案与策略徽标', () => {
    render(
      <AgentPresenceBanner
        assigneeId="agent-mika"
        members={mockMembers}
        activeType="task"
        strategy="immediate"
        onStrategyChange={vi.fn()}
      />,
    );
    expect(screen.getByTestId('agent-presence-banner')).toBeInTheDocument();
    expect(screen.getByText('创建后 Mika 会立即开始工作。')).toBeInTheDocument();
    expect(screen.getByText('立即执行')).toBeInTheDocument();
  });

  it('策略为「需审批」与「仅建待办」时，自适应呈现对应业务文案', () => {
    const { rerender } = render(
      <AgentPresenceBanner
        assigneeId="agent-mika"
        members={mockMembers}
        activeType="task"
        strategy="approval"
        onStrategyChange={vi.fn()}
      />,
    );
    expect(screen.getByText('创建后需经审批，通过后 Mika 才会工作。')).toBeInTheDocument();
    expect(screen.getByText('需审批')).toBeInTheDocument();

    rerender(
      <AgentPresenceBanner
        assigneeId="agent-mika"
        members={mockMembers}
        activeType="task"
        strategy="manual_dispatch"
        onStrategyChange={vi.fn()}
      />,
    );
    expect(screen.getByText('仅创建待办工单，保留给 Mika 等待手动派发。')).toBeInTheDocument();
    expect(screen.getByText('仅建待办')).toBeInTheDocument();
  });

  it('缺陷 Bug 实体时，展现自动复现排查引导文案', () => {
    render(
      <AgentPresenceBanner
        assigneeId="agent-mika"
        members={mockMembers}
        activeType="bug"
        strategy="immediate"
        onStrategyChange={vi.fn()}
      />,
    );
    expect(screen.getByText('创建后 Mika 将调取日志并自动尝试复现。')).toBeInTheDocument();
  });

  it('点击策略下拉弹出 Popover 并触发 onStrategyChange 切换', () => {
    const onStrategyChange = vi.fn();
    render(
      <AgentPresenceBanner
        assigneeId="agent-mika"
        members={mockMembers}
        activeType="task"
        strategy="immediate"
        onStrategyChange={onStrategyChange}
      />,
    );
    fireEvent.click(screen.getByText('立即执行'));
    const approvalOption = screen.getByText('进入决策收件箱审批');
    expect(approvalOption).toBeInTheDocument();
    fireEvent.click(approvalOption);
    expect(onStrategyChange).toHaveBeenCalledWith('approval');
  });
});
