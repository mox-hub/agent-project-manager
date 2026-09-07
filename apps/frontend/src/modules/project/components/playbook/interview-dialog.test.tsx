import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
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
    render(
      <MemoryRouter>
        <InterviewDialog projectId="p1" stage={stage} open onOpenChange={() => {}} />
      </MemoryRouter>,
    );
    return { mutate };
  }

  it('渲染全部必答问题，未答完提交按钮禁用', async () => {
    const user = userEvent.setup();
    const { mutate } = setup();

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

  it('全部作答提交：按问题顺序携带答案，成功后展示对照翻译与收件箱入口', async () => {
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

    render(
      <MemoryRouter>
        <InterviewDialog projectId="p1" stage={stage} open onOpenChange={() => {}} />
      </MemoryRouter>,
    );

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
});
