import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@/i18n';
import { AssistantDecisionStrip } from './assistant-decision-strip';
import type { Decision } from '@/shared/decision-card/types';

vi.mock('@/modules/decision/hooks/use-decision-actions', () => ({
  useDecisionActions: () => ({
    handleAction: vi.fn(),
    busyId: null,
  }),
}));

const mockDecisions: Decision[] = [
  {
    id: 'decision:cmts2m0ro004wfyz8ncop5frv',
    kind: 'approval',
    sourceId: 'app123',
    status: 'pending',
    title: '派生契约文件被手改: CLAUDE.md',
    detail: '该决策类型的主体渲染器待类型落地',
    urgency: 'blocking',
    proposer: { type: 'system', name: '系统' },
    createdAt: '2026-09-08T22:32:00.000Z',
    payload: { bindingId: 'b1', filePath: 'CLAUDE.md' },
  },
  {
    id: 'decision:cmts2m0ro004wfyz8ncop5frw',
    kind: 'acceptance',
    sourceId: 'acc456',
    status: 'pending',
    title: '验收 - 考古流水线执行达标',
    detail: '单元测试全覆盖',
    urgency: 'advisory',
    proposer: { type: 'human', name: 'Alice' },
    createdAt: '2026-09-08T22:35:00.000Z',
    payload: {},
  },
];

describe('AssistantDecisionStrip —— 伴随式卡片堆展示', () => {
  it('正确以 compact 卡片堆形式呈现，包含实体手卡堆叠舞台与顶层卡片', () => {
    const { container } = render(
      <AssistantDecisionStrip items={mockDecisions} />,
    );

    // 1. 根容器带有 compact 紧凑卡片堆样式
    expect(container.querySelector('.decision-deck-compact')).toBeTruthy();
    expect(container.querySelector('.decision-deck-stage-compact')).toBeTruthy();

    // 2. 渲染顶层卡片标题
    expect(screen.getByText('派生契约文件被手改: CLAUDE.md')).toBeTruthy();

    // 3. 渲染顶层与底牌堆叠层级
    expect(container.querySelector('.decision-deck-card-top')).toBeTruthy();
    expect(container.querySelector('.decision-deck-card-under-1')).toBeTruthy();
  });

  it('loading 为 true 时展示伴随式加载骨架', () => {
    const { container } = render(
      <AssistantDecisionStrip items={[]} loading={true} />,
    );

    expect(container.querySelector('.assistant-decision-loading')).toBeTruthy();
  });

  it('无数据且非 loading 时安全返回 null', () => {
    const { container } = render(
      <AssistantDecisionStrip items={[]} loading={false} />,
    );

    expect(container.firstChild).toBeNull();
  });
});
