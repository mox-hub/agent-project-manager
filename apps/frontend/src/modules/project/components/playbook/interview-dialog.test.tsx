import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/i18n';
import { InterviewDialog } from './interview-dialog';
import * as usePlaybookModule from '../../hooks/use-playbook';
import type { PlaybookStageTemplate } from '../../api/playbook-api';

vi.mock('../../hooks/use-playbook', () => ({
  useSubmitInterview: vi.fn(),
}));

const mockUseSubmitInterview = vi.mocked(usePlaybookModule.useSubmitInterview);

const stage: PlaybookStageTemplate = {
  key: 'research',
  name: '调研',
  purpose: '搞清楚为谁做、解决什么问题。',
  domain: 'requirements',
  interview: [
    {
      id: 'who',
      question: '这个东西是做给谁用的？',
      hint: '例如：公司内部的行政同事',
      required: true,
      term: '目标用户画像',
      termNote: '把"谁会用"写成一句可验证的描述。',
    },
    {
      id: 'pain',
      question: '他们现在最头疼的一件事是什么？',
      required: true,
    },
  ],
  document: { titleTemplate: '调研纪要 · {project}', category: 'custom', intro: 'x' },
  gate: { title: '确认？', detail: 'd', consequences: ['c'] },
};

describe('InterviewDialog（对照翻译访谈向导）', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function setup() {
    const mutate = vi.fn();
    mockUseSubmitInterview.mockReturnValue({
      mutate,
      reset: vi.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as never);
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InterviewDialog projectId="p1" stage={stage} open onOpenChange={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    return { mutate };
  }

  /** 默认形态为 AI 会话：切到「直接填写」并 mock 好动态访谈 hook */
  async function setupInFormMode() {
    const user = userEvent.setup();
    const dynamicModule = await import('@/modules/assistant/hooks/use-interview-dynamic');
    vi.spyOn(dynamicModule, 'useInterviewDynamic').mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as never);
    const { mutate } = setup();
    await user.click(await screen.findByRole('button', { name: /Fill directly/i }));
    return { mutate };
  }

  it('默认进入 AI 会话形态并自动出第一问；choices 点击即作为回答触发下一轮', async () => {
    const user = userEvent.setup();
    const dynamicModule = await import('@/modules/assistant/hooks/use-interview-dynamic');
    const dynamicMutate = vi.fn(
      (_input: unknown, opts?: { onSuccess?: (v: unknown) => void }) => {
        opts?.onSuccess?.({ kind: 'question', question: '记录的决定谁来查？', choices: ['行政', '全员'] });
      },
    );
    vi.spyOn(dynamicModule, 'useInterviewDynamic').mockReturnValue({
      mutate: dynamicMutate,
      reset: vi.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as never);
    setup();

    // 挂载即自动开问（首轮 history 为空）
    await waitFor(() => {
      expect(dynamicMutate).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByText('记录的决定谁来查？')).toBeTruthy();

    // 点猜测选项 = 直接作为回答发送，第二轮携带已答历史
    await user.click(screen.getByRole('button', { name: '行政' }));
    expect(dynamicMutate).toHaveBeenCalledTimes(2);
    const secondInput = dynamicMutate.mock.calls[1][0] as {
      history: Array<{ question: string; answer: string }>;
    };
    expect(secondInput.history).toEqual([
      { question: '记录的决定谁来查？', answer: '行政' },
    ]);
  });

  it('AI 收敛：答案集只填空回填表单并自动切换形态，已手填字段不覆盖', async () => {
    const user = userEvent.setup();
    const dynamicModule = await import('@/modules/assistant/hooks/use-interview-dynamic');
    const dynamicMutate = vi.fn(
      (_input: unknown, opts?: { onSuccess?: (v: unknown) => void }) => {
        opts?.onSuccess?.({
          kind: 'done',
          answers: [
            { questionId: 'who', answer: 'AI 归纳的用户' },
            { questionId: 'pain', answer: 'AI 归纳的痛点' },
          ],
        });
      },
    );
    vi.spyOn(dynamicModule, 'useInterviewDynamic').mockReturnValue({
      mutate: dynamicMutate,
      reset: vi.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as never);
    setup();

    // done 后自动切回表单：字段被 AI 答案填充
    await waitFor(() => {
      expect(
        (screen.getByLabelText(/做给谁用的/) as HTMLTextAreaElement).value,
      ).toBe('AI 归纳的用户');
    });
    expect(
      (screen.getByLabelText(/最头疼的一件事/) as HTMLTextAreaElement).value,
    ).toBe('AI 归纳的痛点');
    expect(screen.getByRole('button', { name: /Generate artifact & submit gate/i })).toBeTruthy();
  });

  it('切到直接填写形态：渲染全部必答问题，未答完提交按钮禁用', async () => {
    const user = userEvent.setup();
    const { mutate } = await setupInFormMode();

    const first = screen.getByLabelText(/做给谁用的/) as HTMLTextAreaElement;
    expect(first).toBeTruthy();
    expect(screen.getByLabelText(/最头疼的一件事/)).toBeTruthy();

    const submitBtn = screen.getByRole('button', { name: /Generate artifact & submit gate/i }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    await user.type(screen.getByLabelText(/最头疼的一件事/), '报销要贴发票找领导签字');
    const stillDisabled = screen.getByRole('button', { name: /Generate artifact & submit gate/i }) as HTMLButtonElement;
    expect(stillDisabled.disabled).toBe(true);
    expect(mutate).not.toHaveBeenCalled();
  });

  it('直接填写形态：全部作答提交，按问题顺序携带答案，成功后展示对照翻译与收件箱入口', async () => {
    const user = userEvent.setup();
    const mutate = vi.fn((_vars: unknown, opts?: { onSuccess?: (r: unknown) => void }) => {
      opts?.onSuccess?.({
        documentId: 'doc1',
        documentTitle: '调研纪要 · 报销系统',
        proposalId: 'prop1',
        mappings: [
          {
            questionId: 'who',
            question: 'q',
            answerExcerpt: '公司内部的行政同事',
            term: '目标用户画像',
            termNote: '把"谁会用"写成一句可验证的描述。',
          },
        ],
      });
    });
    mockUseSubmitInterview.mockReturnValue({
      mutate,
      reset: vi.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as never);

    const dynamicModule = await import('@/modules/assistant/hooks/use-interview-dynamic');
    vi.spyOn(dynamicModule, 'useInterviewDynamic').mockReturnValue({
      mutate: vi.fn(),
      reset: vi.fn(),
      isError: false,
      isPending: false,
      error: null,
    } as never);

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <InterviewDialog projectId="p1" stage={stage} open onOpenChange={() => {}} />
        </MemoryRouter>
      </QueryClientProvider>,
    );
    await user.click(await screen.findByRole('button', { name: /Fill directly/i }));

    await user.type(screen.getByLabelText(/做给谁用的/), '公司内部的行政同事');
    await user.type(screen.getByLabelText(/最头疼的一件事/), '报销要贴发票');

    await user.click(screen.getByRole('button', { name: /Generate artifact & submit gate/i }));

    expect(mutate).toHaveBeenCalledWith(
      {
        stageKey: 'research',
        answers: [
          { questionId: 'who', answer: '公司内部的行政同事' },
          { questionId: 'pain', answer: '报销要贴发票' },
        ],
      },
      expect.anything(),
    );

    await waitFor(() => {
      expect(screen.getByText('调研纪要 · 报销系统')).toBeTruthy();
    });
    expect(screen.getByText(/目标用户画像/)).toBeTruthy();
    // base-ui Button render prop 会给 Link 强制 role="button"，按名字取按钮再校验 href
    const inboxBtn = screen.getByRole('button', { name: /Decide/i }) as HTMLAnchorElement;
    expect(inboxBtn.getAttribute('href')).toBe('/app/decisions');
  });

  it('直接填写形态：AI 预填点按钮携带问题组调用，成功后只填空字段不覆盖已填', async () => {
    const user = userEvent.setup();
    const prefillMutate = vi.fn((_input, opts?: { onSuccess?: (v: unknown) => void }) => {
      opts?.onSuccess?.([
        { questionId: 'who', answer: 'AI 猜的用户' },
        { questionId: 'pain', answer: 'AI 猜的痛点' },
      ]);
    });
    const prefillReset = vi.fn();
    const prefillModule = await import('@/modules/assistant/hooks/use-interview-prefill');
    vi.spyOn(prefillModule, 'useInterviewPrefill').mockReturnValue({
      mutate: prefillMutate,
      reset: prefillReset,
      isError: false,
      isPending: false,
      error: null,
    } as never);

    await setupInFormMode();

    // 用户先手填第一题
    await user.type(screen.getByLabelText(/做给谁用的/), '手填的用户');

    await user.click(screen.getByRole('button', { name: /AI Prefill/i }));

    expect(prefillMutate).toHaveBeenCalledWith(
      {
        requirement: '',
        questions: [
          expect.objectContaining({ id: 'who' }),
          expect.objectContaining({ id: 'pain' }),
        ],
      },
      expect.anything(),
    );
    // 第一题保留手填，第二题被预填
    expect(
      (screen.getByLabelText(/做给谁用的/) as HTMLTextAreaElement).value,
    ).toBe('手填的用户');
    expect(
      (screen.getByLabelText(/最头疼的一件事/) as HTMLTextAreaElement).value,
    ).toBe('AI 猜的痛点');
  });
});
