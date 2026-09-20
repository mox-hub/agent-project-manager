import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import i18n from '@/i18n';
import { DecisionCardShell } from './decision-card-shell';
import type { Decision } from './types';

beforeAll(async () => {
  await i18n.changeLanguage('zh-CN');
});

const testDecision: Decision = {
  id: 'decision:cmts2m0ro004wfyz8ncop5frv',
  kind: 'approval',
  sourceId: 'app123',
  status: 'pending',
  title: '验收 - 项目考古：ces 测试项目',
  detail: '完成证据尚未采集',
  urgency: 'blocking',
  proposer: { type: 'system', name: '系统' },
  createdAt: '2026-09-08T10:48:57.000Z',
  payload: { info: 'test-payload' },
};

describe('DecisionCardShell 排版与无换行规范', () => {
  it('正面头部按三行分层排布：第1行标签/翻面，第2行编号/时间，第3行全宽标题', () => {
    const onAction = vi.fn();
    const { container } = render(
      <DecisionCardShell decision={testDecision} onAction={onAction} />,
    );

    const frontFace = container.querySelector('.decision-card-face-front') as HTMLElement;
    expect(frontFace).toBeTruthy();

    // 1. 标题渲染并带有 w-full 与 break-words
    const titleEl = frontFace.querySelector('h3');
    expect(titleEl).toBeTruthy();
    expect(titleEl?.textContent).toBe('验收 - 项目考古：ces 测试项目');
    expect(titleEl?.className).toContain('w-full');
    expect(titleEl?.className).toContain('break-words');

    // 2. 决策编号渲染在第 2 行独立节点，带有 monospace 且禁止换行
    const shortIdEl = frontFace.querySelector('.font-mono.select-all');
    expect(shortIdEl).toBeTruthy();
    expect(shortIdEl?.textContent?.trim()).toBe('#cmts2m0ro004wfyz8ncop5frv');
    expect(shortIdEl?.className).toContain('whitespace-nowrap');
    expect(shortIdEl?.className).toContain('shrink-0');

    // 3. 提案人标签与阻断标签均具备 whitespace-nowrap 与 shrink-0
    const proposerText = screen.getByText('系统');
    expect(proposerText.className).toContain('whitespace-nowrap');
    const proposerPill = proposerText.closest('span[class*="inline-flex"]');
    expect(proposerPill?.className).toContain('whitespace-nowrap');
    expect(proposerPill?.className).toContain('shrink-0');

    const urgencyText = screen.getByText('执行暂停');
    expect(urgencyText.className).toContain('whitespace-nowrap');
    const urgencyChip = urgencyText.closest('span[class*="inline-flex"]');
    expect(urgencyChip?.className).toContain('whitespace-nowrap');
    expect(urgencyChip?.className).toContain('shrink-0');

    // 4. 翻面按钮具备 whitespace-nowrap 与 shrink-0
    const flipBtn = frontFace.querySelector('button[title*="翻面"]') as HTMLElement;
    expect(flipBtn).toBeTruthy();
    expect(flipBtn.className).toContain('whitespace-nowrap');
    expect(flipBtn.className).toContain('shrink-0');
  });

  it('动作栏按钮均具备 whitespace-nowrap，禁止在小宽度下折行', () => {
    const onAction = vi.fn();
    const { container } = render(
      <DecisionCardShell decision={testDecision} onAction={onAction} />,
    );

    const actionBtns = container.querySelectorAll('button[class*="flex-1"]');
    expect(actionBtns.length).toBeGreaterThan(0);
    actionBtns.forEach((btn) => {
      expect(btn.className).toContain('whitespace-nowrap');
    });
  });

  it('背面档案标头排布分层：标题与翻回正面按钮禁止换行，编号置于第二行', () => {
    const onAction = vi.fn();
    const { container } = render(
      <DecisionCardShell decision={testDecision} onAction={onAction} isFlipped={true} />,
    );

    const backFace = container.querySelector('.decision-card-face-back');
    expect(backFace).toBeTruthy();

    // 背面编号在第二行
    const backShortId = backFace?.querySelector('.font-mono.select-all');
    expect(backShortId).toBeTruthy();
    expect(backShortId?.textContent?.trim()).toBe('#cmts2m0ro004wfyz8ncop5frv');
    expect(backShortId?.className).toContain('whitespace-nowrap');

    // 翻回正面按钮
    const flipFrontBtns = backFace?.querySelectorAll('button');
    expect(flipFrontBtns && flipFrontBtns.length > 0).toBe(true);
    flipFrontBtns?.forEach((btn) => {
      expect(btn.className).toContain('whitespace-nowrap');
      expect(btn.className).toContain('shrink-0');
    });
  });

  it('快捷键 F 触发 3D 翻面', () => {
    const onAction = vi.fn();
    const onFlipChange = vi.fn();
    const { container } = render(
      <DecisionCardShell
        decision={testDecision}
        onAction={onAction}
        onFlipChange={onFlipChange}
      />,
    );

    const scene = container.querySelector('.decision-card-scene') as HTMLElement;
    fireEvent.keyDown(scene, { key: 'f' });
    expect(onFlipChange).toHaveBeenCalledWith(true);
  });

  it('CAP-C-04：approvalStale 时头部渲染醒目「批准基于旧版本」徽标；否则不渲染', () => {
    const onAction = vi.fn();
    const { container } = render(
      <DecisionCardShell
        decision={{ ...testDecision, approvalStale: true }}
        onAction={onAction}
      />,
    );

    const badge = container.querySelector('[data-decision-approval-stale]') as HTMLElement;
    expect(badge).toBeTruthy();
    // 徽标文案（zh-CN）与防折行约束
    expect(badge.textContent).toContain('内容已变更');
    expect(badge.textContent).toContain('批准基于旧版本');
    expect(badge.className).toContain('whitespace-nowrap');
    // 无过期 → 不渲染徽标（不出现空标记）
    const clean = render(
      <DecisionCardShell decision={testDecision} onAction={onAction} />,
    );
    expect(
      clean.container.querySelector('[data-decision-approval-stale]'),
    ).toBeNull();
  });
});
