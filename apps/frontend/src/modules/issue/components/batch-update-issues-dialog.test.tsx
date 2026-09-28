import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BatchUpdateIssuesDialog } from './batch-update-issues-dialog';

// i18n mock（照抄 tasks-page 模式 + 支持 {{var}} 插值，供汇总 toast 断言）
const translate = (
  key: string,
  defaultValue?: string | Record<string, unknown>,
  options?: Record<string, unknown>,
) => {
  let template =
    typeof defaultValue === 'string'
      ? defaultValue
      : ((defaultValue as { defaultValue?: string } | null)?.defaultValue ?? key);
  const opts = defaultValue !== null && typeof defaultValue === 'object' ? defaultValue : options;
  if (opts && typeof opts === 'object') {
    for (const [k, v] of Object.entries(opts)) {
      template = template.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), String(v));
    }
  }
  return template;
};

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

// taskApi.update 委托到可控 mock：全成/部分失败场景分别注入
const updateMock = vi.fn();
vi.mock('../api/issue-api', () => ({
  taskApi: { update: (...args: unknown[]) => updateMock(...args) },
}));

vi.mock('@/modules/team-member/hooks', () => ({
  useMembers: () => ({
    data: {
      items: [
        { id: 'm1', displayName: 'Alice', handle: 'alice', type: 'human' },
        { id: 'm2', displayName: 'BuildBot', handle: 'buildbot', type: 'ai_agent' },
      ],
    },
  }),
}));

const toastSuccess = vi.fn();
const toastWarning = vi.fn();
const toastError = vi.fn();
vi.mock('@/components/ui/toast', () => ({
  toast: {
    success: (...args: unknown[]) => toastSuccess(...(args as [])),
    warning: (...args: unknown[]) => toastWarning(...(args as [])),
    error: (...args: unknown[]) => toastError(...(args as [])),
  },
}));

const issues = [
  { id: 't1', title: 'First issue', shortId: 'T-01' },
  { id: 't2', title: 'Second issue', shortId: 'T-02' },
  { id: 't3', title: 'Third issue', shortId: 'T-03' },
];

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderDialog = (props: Partial<Parameters<typeof BatchUpdateIssuesDialog>[0]> = {}) =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <BatchUpdateIssuesDialog
        open
        onOpenChange={props.onOpenChange ?? vi.fn()}
        issues={props.issues ?? issues}
        onCompleted={props.onCompleted}
      />
    </QueryClientProvider>,
  );

beforeEach(() => {
  updateMock.mockReset();
  toastSuccess.mockClear();
  toastWarning.mockClear();
  toastError.mockClear();
});

describe('BatchUpdateIssuesDialog（P1-12 批量修改）', () => {
  it('keeps the apply button disabled until at least one field is chosen', () => {
    renderDialog();
    expect(screen.getByRole('button', { name: '应用到 3 条' })).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'in_progress' } });
    expect(screen.getByRole('button', { name: '应用到 3 条' })).toHaveProperty('disabled', false);
  });

  it('patches each selected issue via PATCH /issues/:id and reports total success', async () => {
    updateMock.mockResolvedValue({ id: 'ok' });
    const onCompleted = vi.fn();
    renderDialog({ onCompleted });

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'in_progress' } });
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } });
    fireEvent.click(screen.getByRole('button', { name: '应用到 3 条' }));

    await waitFor(() => {
      expect(updateMock).toHaveBeenCalledTimes(3);
    });
    expect(updateMock).toHaveBeenCalledWith('t2', { status: 'in_progress', priority: 'high' });
    expect(toastSuccess).toHaveBeenCalledWith('已更新 3 条工单');
    expect(toastWarning).not.toHaveBeenCalled();
    expect(toastError).not.toHaveBeenCalled();
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('reports per-item failures in the summary toast when the network partially fails', async () => {
    updateMock.mockImplementation((issueId: string) =>
      issueId === 't2' ? Promise.reject(new Error('网络错误')) : Promise.resolve({ id: issueId }),
    );

    renderDialog();

    fireEvent.change(screen.getByLabelText('Assignee'), { target: { value: 'm1' } });
    fireEvent.click(screen.getByRole('button', { name: '应用到 3 条' }));

    await waitFor(() => {
      expect(toastWarning).toHaveBeenCalled();
    });
    const message = String(toastWarning.mock.calls[0][0]);
    expect(message).toContain('已更新 2 条、失败 1 条');
    // 弱网部分失败不静默：失败项逐条列出（shortId + 原因）
    expect(message).toContain('T-02');
    expect(message).toContain('网络错误');
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it('falls back to error toast when every patch fails', async () => {
    updateMock.mockRejectedValue(new Error('服务器错误'));

    renderDialog();

    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'done' } });
    fireEvent.click(screen.getByRole('button', { name: '应用到 3 条' }));

    await waitFor(() => {
      expect(toastError).toHaveBeenCalled();
    });
    const message = String(toastError.mock.calls[0][0]);
    expect(message).toContain('失败 3 条');
  });
});
