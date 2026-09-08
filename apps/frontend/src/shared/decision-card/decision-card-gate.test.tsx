import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@/i18n';
import { DecisionCard } from './decision-card';
import { useExpertise } from '@/modules/decision/hooks/use-expertise';
import type { Decision } from './types';

vi.mock('@/modules/decision/hooks/use-expertise', () => ({
  useExpertise: vi.fn(),
}));

const mockUseExpertise = vi.mocked(useExpertise);

const gateDecision: Decision = {
  id: 'gate:prop1',
  kind: 'gate',
  sourceId: 'prop1',
  status: 'pending',
  title: '调研纪要已产出，确认进入需求分析？',
  detail: '调研纪要把「为谁做」写成了可对照的文档。',
  urgency: 'advisory',
  projectId: 'p1',
  projectName: '报销系统',
  proposer: { type: 'system' },
  payload: {
    type: 'playbook_gate',
    templateKey: 'software-full-cycle',
    stage: 'research',
    domain: 'acceptance',
    documentId: 'doc1',
    documentTitle: '调研纪要 · 报销系统',
    knowledge: [
      { term: '核心痛点', note: '痛点是用户愿意换工具的原因。', questionId: 'pain' },
      { term: '成功指标', note: '可度量的成功标准。', questionId: 'success' },
    ],
    mappings: [
      {
        questionId: 'pain',
        question: '他们现在最头疼的一件事是什么？',
        answerExcerpt: '报销单要贴发票找领导签字',
        term: '核心痛点',
        termNote: '痛点是用户愿意换工具的原因。',
      },
    ],
    consequences: ['若跳过调研：需求分析将缺乏依据。'],
  },
  createdAt: new Date().toISOString(),
};

const baseExpertise = (level: 'detailed' | 'terse' | 'suppressed') => ({
  domains: [],
  level: vi.fn(() => level as never),
  feedback: vi.fn().mockResolvedValue(undefined),
  isLoading: false,
});

function renderGate() {
  const onAction = vi.fn();
  const { container } = render(<DecisionCard decision={gateDecision} onAction={onAction} />);
  // data-ai 是 APM 的埋点属性（非 data-testid），统一从这里取交互点
  const ai = (id: string) => container.querySelector(`[data-ai="${id}"]`) as HTMLElement;
  return { onAction, ai };
}

describe('DecisionCard gate 知识夹层（v2 纪要 §2.2 四段式）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('detailed 档位：知识夹层默认折叠（永不主动弹开），展开=追问信号，注解可见', () => {
    const expertise = baseExpertise('detailed');
    mockUseExpertise.mockReturnValue(expertise as never);
    const { ai } = renderGate();

    expect(screen.getAllByText('调研纪要 · 报销系统').length).toBeGreaterThan(0);
    // 后果预演渲染为「· {文案}」，用正则匹配
    expect(screen.getByText(/若跳过调研：需求分析将缺乏依据/)).toBeTruthy();
    // 默认折叠：注解不可见
    expect(screen.queryByText('痛点是用户愿意换工具的原因。')).toBeNull();

    fireEvent.click(ai('gate-knowledge-toggle'));
    expect(expertise.feedback).toHaveBeenCalledWith(
      'acceptance',
      'asked',
      'decision-card:knowledge',
    );
    expect(screen.getByText('痛点是用户愿意换工具的原因。')).toBeTruthy();

    // 折叠 = 忽略一次
    fireEvent.click(ai('gate-knowledge-toggle'));
    expect(expertise.feedback).toHaveBeenLastCalledWith(
      'acceptance',
      'ignored',
      'decision-card:knowledge',
    );
  });

  it('terse 档位：只渲染术语索引，无展开按钮', () => {
    const expertise = baseExpertise('terse');
    mockUseExpertise.mockReturnValue(expertise as never);
    const { ai } = renderGate();

    expect(screen.getAllByText('核心痛点').length).toBeGreaterThan(0);
    expect(ai('gate-knowledge-toggle')).toBeNull();
    expect(ai('gate-knowledge-terse')).not.toBeNull();
  });

  it('suppressed 档位：知识层整体隐藏（术语索引不再出现），可一键恢复', () => {
    const expertise = baseExpertise('suppressed');
    mockUseExpertise.mockReturnValue(expertise as never);
    const { ai } = renderGate();

    expect(ai('gate-knowledge-toggle')).toBeNull();
    expect(ai('gate-knowledge-terse')).toBeNull();

    fireEvent.click(ai('gate-knowledge-reset'));
    expect(expertise.feedback).toHaveBeenCalledWith('acceptance', 'reset');
  });

  it('「别再解释这类」直写抑制（手动纠偏）', () => {
    const expertise = baseExpertise('detailed');
    mockUseExpertise.mockReturnValue(expertise as never);
    const { ai } = renderGate();

    fireEvent.click(ai('gate-knowledge-toggle'));
    fireEvent.click(ai('gate-knowledge-suppress'));
    expect(expertise.feedback).toHaveBeenCalledWith(
      'acceptance',
      'suppress',
      'decision-card:never-explain',
    );
  });

  it('闸门动作：通过（accept 直接上送）；驳回按钮存在', () => {
    const expertise = baseExpertise('detailed');
    mockUseExpertise.mockReturnValue(expertise as never);
    const { onAction } = renderGate();

    fireEvent.click(screen.getByRole('button', { name: /Pass gate/i }));
    expect(onAction).toHaveBeenCalledWith('accept', gateDecision);
    expect(screen.getByRole('button', { name: /Reject/i })).toBeTruthy();
  });
});
