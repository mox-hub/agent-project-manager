/**
 * 动作栏 AI 概率底色（CAP-A-27 扩展批：裁决卡片接入 JEV）渲染契约：
 * - 有判定：按置信度比例自左填充底色，<0.7 转黄、其余紫（与 ConfidenceBar 同规则）
 * - 无判定（存量旧卡）/畸形 options：零渲染且卡片照常加载——绝不阻断、不造「AI 失败」噪音
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { DecisionCard } from './decision-card';
import type { Decision } from './types';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

function makeDecision(payload: Record<string, unknown>): Decision {
  return {
    id: 'acceptance:acc1',
    kind: 'acceptance',
    sourceId: 'acc1',
    status: 'in_review',
    title: '验收 - 模拟CLI测试任务',
    urgency: 'advisory',
    proposer: { type: 'system' },
    payload,
    createdAt: new Date().toISOString(),
  };
}

function fillOf(container: HTMLElement): HTMLElement | null {
  return container.querySelector<HTMLElement>('[data-ai-option-fill]');
}

describe('DecisionCard 动作栏 AI 概率底色', () => {
  it('有判定：按置信度比例填充紫色底色 + 百分比徽注（高置信）', () => {
    const { container } = render(
      <DecisionCard
        decision={makeDecision({
          completionType: 'artifact',
          aiJudge: {
            options: { accept: 0.86, reject: 0.1, waive: 0.04 },
            optionsChoice: 'accept',
            confidence: 0.9,
            advisory: true,
          },
        })}
        onAction={vi.fn()}
      />,
    );

    const fill = fillOf(container);
    expect(fill).not.toBeNull();
    expect(fill).toHaveAttribute('data-ai-option-fill', '0.86');
    expect(fill).toHaveStyle({ width: '86%' });
    expect(fill).toHaveClass('bg-accent-purple-light');

    const passBtn = screen.getByText('decision.action.pass').closest('button');
    expect(passBtn).not.toBeNull();
    expect(passBtn).toContainElement(fill);

    const badge = screen.getByText('86%');
    expect(badge).toHaveAttribute('data-ai-option-probability', '0.86');
    expect(badge).toHaveClass('text-accent-purple');
  });

  it('低置信（<0.7）底色与徽注转黄', () => {
    const { container } = render(
      <DecisionCard
        decision={makeDecision({
          aiJudge: { options: { accept: 0.55, reject: 0.3, waive: 0.15 } },
        })}
        onAction={vi.fn()}
      />,
    );

    expect(fillOf(container)).toHaveClass('bg-accent-yellow-light');
    expect(screen.getByText('55%')).toHaveClass('text-accent-yellow');
  });

  it('每个按钮各自取自己的选项概率（豁免键取 waive 分布）', () => {
    const { container } = render(
      <DecisionCard
        decision={makeDecision({
          aiJudge: { options: { accept: 0.2, reject: 0.3, waive: 0.75 } },
        })}
        onAction={vi.fn()}
      />,
    );

    const waiveBtn = screen
      .getByText('decision.action.waive')
      .closest('button') as HTMLElement;
    expect(
      waiveBtn.querySelector('[data-ai-option-fill]'),
    ).toHaveAttribute('data-ai-option-fill', '0.75');
    // 其他按钮同样有各自的底色层
    expect(container.querySelectorAll('[data-ai-option-fill]')).toHaveLength(3);
  });

  it('存量旧卡（无 aiJudge）：无底色无徽注，按钮照常渲染（正常加载）', () => {
    const { container } = render(
      <DecisionCard
        decision={makeDecision({
          completionType: 'artifact',
          priority: 'medium',
          completionEvidence: null,
        })}
        onAction={vi.fn()}
      />,
    );

    expect(fillOf(container)).toBeNull();
    expect(container.querySelector('[data-ai-option-probability]')).toBeNull();
    expect(screen.getByText('decision.action.pass')).toBeInTheDocument();
    expect(screen.getByText('decision.action.reject')).toBeInTheDocument();
    expect(screen.getByText('decision.action.waive')).toBeInTheDocument();
  });

  it('畸形 aiJudge（options 为数组/缺失）按无判定处理，不抛错', () => {
    const { container } = render(
      <DecisionCard
        decision={makeDecision({
          aiJudge: { options: [0.9, 0.1], confidence: 0.9 },
        })}
        onAction={vi.fn()}
      />,
    );

    expect(fillOf(container)).toBeNull();
    expect(screen.getByText('decision.action.pass')).toBeInTheDocument();
  });
});
