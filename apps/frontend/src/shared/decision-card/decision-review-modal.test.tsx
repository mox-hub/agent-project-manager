import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@/i18n';
import { DecisionReviewModal } from './decision-review-modal';
import type { Decision } from '@/shared/decision-card/types';

const mockDecisions: Decision[] = [
  {
    id: 'approval:app1',
    kind: 'approval',
    sourceId: 'app1',
    status: 'pending',
    title: '确认部署至预发布集群？',
    detail: '准备发布 v1.2.0-rc1',
    urgency: 'blocking',
    proposer: { type: 'ai_agent', name: 'ReleaseBot' },
    payload: { version: '1.2.0-rc1' },
    createdAt: new Date().toISOString(),
  },
];

describe('DecisionReviewModal（全屏悬浮卡片堆批阅弹窗）', () => {
  it('open 为 false 时不渲染', () => {
    const onClose = vi.fn();
    const onAction = vi.fn();
    const { container } = render(
      <DecisionReviewModal
        open={false}
        onClose={onClose}
        decisions={mockDecisions}
        onAction={onAction}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('open 为 true 时全屏弹出，展示进度与顶层卡片', () => {
    const onClose = vi.fn();
    const onAction = vi.fn();
    render(
      <DecisionReviewModal
        open={true}
        onClose={onClose}
        decisions={mockDecisions}
        onAction={onAction}
      />,
    );

    // 模态框打开，展示标题与进度
    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('确认部署至预发布集群？')).toBeTruthy();

    // 点击右上角关闭按钮
    const closeBtn = screen.getByRole('button', { name: /(close|关闭)/i });
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('支持按 Escape 键退出批阅模态框', () => {
    const onClose = vi.fn();
    const onAction = vi.fn();
    render(
      <DecisionReviewModal
        open={true}
        onClose={onClose}
        decisions={mockDecisions}
        onAction={onAction}
      />,
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
