/**
 * GrillInterview 组件测试：草稿发起 → 追问交互（选项/自由输入）→ 摘要确认 → 降级
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GrillInterview } from './grill-interview';

const mockMutate = vi.hoisted(() => vi.fn());
const mockReset = vi.hoisted(() => vi.fn());

vi.mock('@/modules/assistant/hooks/use-grill', () => ({
  useGrill: vi.fn(() => ({
    mutate: mockMutate,
    reset: mockReset,
    isPending: false,
    isError: false,
    error: null,
  })),
}));

import { useGrill } from '@/modules/assistant/hooks/use-grill';

const DRAFT_PLACEHOLDER = /想给我们小组做一个记录会议决定的小工具/;

function renderGrill(props: Partial<Parameters<typeof GrillInterview>[0]> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const merged = {
    onConfirm: vi.fn(),
    onFallback: vi.fn(),
    confirmPending: false,
    ...props,
  };
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <GrillInterview {...merged} />
    </QueryClientProvider>,
  );
  return { ...utils, ...merged };
}

/** 让 mockMutate 的 onSuccess 触发，模拟一轮 AI 返回 */
function mockGrillRespond(result: Record<string, unknown>) {
  mockMutate.mockImplementationOnce((_input, opts) => {
    opts?.onSuccess?.(result);
  });
}

async function startWithDraft(user: ReturnType<typeof userEvent.setup>, draft: string) {
  await user.type(screen.getByPlaceholderText(DRAFT_PLACEHOLDER), draft);
  await user.click(screen.getByRole('button', { name: /开始拷问/ }));
}

describe('GrillInterview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('草稿态：输入一句话后点开始，携带 draft 与空历史发起追问', async () => {
    const user = userEvent.setup();
    renderGrill();

    await startWithDraft(user, '做个会议纪要工具');

    expect(mockMutate).toHaveBeenCalledWith(
      { draft: '做个会议纪要工具', history: [] },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('追问态：渲染问题与猜测选项，点选项后带累积历史继续', async () => {
    const user = userEvent.setup();
    mockGrillRespond({
      kind: 'question',
      question: '它给谁用？',
      choices: [{ key: 'a', label: '小团队', sub: '10 人以内', guess: true }],
    });
    renderGrill();

    await startWithDraft(user, '会议纪要');
    await screen.findByText('它给谁用？');

    const choice = await screen.findByRole('button', { name: /小团队/ });
    mockGrillRespond({ kind: 'question', question: '这一期做到哪？', choices: [] });
    await user.click(choice);

    expect(mockMutate).toHaveBeenLastCalledWith(
      {
        draft: '会议纪要',
        history: [{ question: '它给谁用？', answer: '小团队' }],
      },
      expect.anything(),
    );
    await screen.findByText('这一期做到哪？');
  });

  it('自由输入：文本框回车发送已答内容', async () => {
    const user = userEvent.setup();
    mockGrillRespond({ kind: 'question', question: '它给谁用？', choices: [] });
    renderGrill();

    await startWithDraft(user, '会议纪要');
    const input = await screen.findByPlaceholderText('用自己的话回答，回车发送');
    await user.type(input, '给我们小组{Enter}');

    expect(mockMutate).toHaveBeenLastCalledWith(
      { draft: '会议纪要', history: [{ question: '它给谁用？', answer: '给我们小组' }] },
      expect.anything(),
    );
  });

  it('收敛：done 摘要渲染确认卡，点创建项目回调 onConfirm', async () => {
    const user = userEvent.setup();
    mockGrillRespond({
      kind: 'done',
      summary: {
        name: '会议纪要库',
        description: '记录会议决定的工具',
        goals: ['不再丢结论'],
        users: ['小组'],
        scope: ['决定登记'],
        nonGoals: ['不做语音转写'],
        constraints: [],
        acceptanceHints: ['能检索历史决定'],
      },
    });
    const props = { onConfirm: vi.fn(), onFallback: vi.fn() };
    renderGrill(props);

    await startWithDraft(user, '会议纪要');
    await screen.findByDisplayValue('会议纪要库');

    expect(screen.getByText('决定登记')).toBeInTheDocument();
    expect(screen.getByText('不做语音转写')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /创建项目/ }));
    expect(props.onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ name: '会议纪要库', goals: ['不再丢结论'] }),
    );
  });

  it('降级：改用手动填写触发 onFallback', async () => {
    const user = userEvent.setup();
    const props = { onConfirm: vi.fn(), onFallback: vi.fn() };
    renderGrill(props);
    await user.click(screen.getByRole('button', { name: /改用手动填写/ }));
    expect(props.onFallback).toHaveBeenCalled();
  });
});
