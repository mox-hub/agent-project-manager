import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@/i18n';
import { DecisionDeckStack } from './decision-deck-stack';
import type { Decision } from './types';

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
  {
    id: 'acceptance:acc2',
    kind: 'acceptance',
    sourceId: 'acc2',
    status: 'pending',
    title: '工单 #102 单元测试覆盖率达标验收',
    detail: '测试覆盖率达到 88%',
    urgency: 'advisory',
    proposer: { type: 'human', name: 'Alice' },
    payload: { coverage: 88 },
    createdAt: new Date().toISOString(),
  },
];

describe('DecisionDeckStack（卡片堆叠、3D翻面、勾选过卡与翻页）', () => {
  it('正确渲染顶层卡片与底牌堆叠', () => {
    const onAction = vi.fn();
    const { container } = render(
      <DecisionDeckStack decisions={mockDecisions} onAction={onAction} />,
    );

    expect(screen.getByText('确认部署至预发布集群？')).toBeTruthy();
    expect(container.querySelector('.decision-deck-card-top')).toBeTruthy();
    expect(container.querySelector('.decision-deck-card-under-1')).toBeTruthy();
  });

  it('支持 3D 翻面：点击翻面查看背面证据档案，再次点击翻回正面', () => {
    const onAction = vi.fn();
    const { container } = render(
      <DecisionDeckStack decisions={mockDecisions} onAction={onAction} />,
    );

    const flipper = container.querySelector('.decision-card-flipper');
    expect(flipper?.classList.contains('is-flipped')).toBe(false);

    // 点击翻面按钮
    const flipBtn = container.querySelector('[data-ai="deck-flip"]') as HTMLElement;
    fireEvent.click(flipBtn);

    expect(flipper?.classList.contains('is-flipped')).toBe(true);

    // 翻回正面
    fireEvent.click(flipBtn);
    expect(flipper?.classList.contains('is-flipped')).toBe(false);
  });

  it('勾选通过：盖上通过印章并向右滑出，切换至下一张卡片', async () => {
    const onAction = vi.fn();
    const onIndexChange = vi.fn();
    const { container } = render(
      <DecisionDeckStack
        decisions={mockDecisions}
        onAction={onAction}
        onIndexChange={onIndexChange}
      />,
    );

    // 点击【勾选通过】
    const passBtn = container.querySelector('[data-ai="deck-pass"]') as HTMLElement;
    fireEvent.click(passBtn);

    expect(container.querySelector('.decision-stamp-passed')).toBeTruthy();

    await waitFor(
      () => {
        expect(onAction).toHaveBeenCalledWith('accept', mockDecisions[0]);
        expect(screen.getByText('工单 #102 单元测试覆盖率达标验收')).toBeTruthy();
      },
      { timeout: 2000 },
    );
  });

  it('驳回：盖上驳回印章并向左滑出，切换至下一张卡片', async () => {
    const onAction = vi.fn();
    const { container } = render(
      <DecisionDeckStack decisions={mockDecisions} onAction={onAction} />,
    );

    const rejectBtn = container.querySelector('[data-ai="deck-reject"]') as HTMLElement;
    fireEvent.click(rejectBtn);

    expect(container.querySelector('.decision-stamp-rejected')).toBeTruthy();

    await waitFor(
      () => {
        expect(onAction).toHaveBeenCalledWith('reject', mockDecisions[0], undefined);
        expect(screen.getByText('工单 #102 单元测试覆盖率达标验收')).toBeTruthy();
      },
      { timeout: 2000 },
    );
  });

  it('支持翻页（上一张 / 下一张）', () => {
    const onAction = vi.fn();
    const { container } = render(
      <DecisionDeckStack decisions={mockDecisions} onAction={onAction} />,
    );

    expect(screen.getByText('确认部署至预发布集群？')).toBeTruthy();

    // 点击下一张
    const nextBtn = container.querySelector('[data-ai="deck-next"]') as HTMLElement;
    fireEvent.click(nextBtn);

    expect(screen.getByText('工单 #102 单元测试覆盖率达标验收')).toBeTruthy();

    // 点击上一张
    const prevBtn = container.querySelector('[data-ai="deck-prev"]') as HTMLElement;
    fireEvent.click(prevBtn);

    expect(screen.getByText('确认部署至预发布集群？')).toBeTruthy();
  });

  it('全部批阅完成后展示完成状态', () => {
    const onAction = vi.fn();
    const onAllDone = vi.fn();
    const { container } = render(
      <DecisionDeckStack
        decisions={[]}
        onAction={onAction}
        onAllDone={onAllDone}
      />,
    );

    expect(container.querySelector('[data-ai="deck-back-inbox"]')).toBeTruthy();
    const backBtn = container.querySelector('[data-ai="deck-back-inbox"]') as HTMLElement;
    fireEvent.click(backBtn);
    expect(onAllDone).toHaveBeenCalled();
  });
});
