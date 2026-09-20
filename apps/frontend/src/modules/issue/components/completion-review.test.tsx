import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CompletionReview } from './completion-review';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string | { defaultValue?: string }) => {
      if (typeof defaultValue === 'string') return defaultValue;
      return defaultValue?.defaultValue ?? key;
    },
  }),
}));

// acceptanceApi 委托到可控 mock：acceptCompletion 仅允许显式动作触发，挂载绝不能自发请求
const acceptCompletionMock = vi.fn();
const rejectCompletionMock = vi.fn();

vi.mock('@/modules/acceptance/api/acceptance-api', () => ({
  acceptanceApi: {
    acceptCompletion: (...args: unknown[]) => acceptCompletionMock(...args),
    rejectCompletion: (...args: unknown[]) => rejectCompletionMock(...args),
  },
  // 与真实实现同口径：非终态即活契约
  isActiveAcceptance: (a: { status: string }) =>
    !['passed', 'failed', 'waived'].includes(a.status),
  extractFailures: () => null,
}));

vi.mock('@/modules/auth/hooks/use-auth', () => ({
  useAuth: () => ({ currentUser: { id: 'user-1' } }),
}));

vi.mock('@/modules/acceptance/components/acceptance-form-dialog', () => ({
  AcceptanceFormDialog: () => null,
}));

vi.mock('@/modules/acceptance/components/acceptance-draft-dialog', () => ({
  AcceptanceDraftDialog: () => null,
}));

const activeAcceptance = {
  id: 'acc-1',
  issueId: 't1',
  title: '验收契约 A',
  status: 'in_review',
  completionType: 'pr',
  completionEvidence: { prUrl: 'https://github.com/x/y/pull/1', state: 'OPEN' },
  criteria: [],
} as Parameters<typeof CompletionReview>[0]['acceptances'][number];

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderCompletionReview = () =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter initialEntries={['/app/issues/t1']}>
        <CompletionReview issueId="t1" acceptances={[activeAcceptance]} />
      </MemoryRouter>
    </QueryClientProvider>,
  );

describe('CompletionReview', () => {
  it('does not POST accept-completion on mount; accept fires only on explicit button click', async () => {
    acceptCompletionMock.mockReset().mockResolvedValue(activeAcceptance);
    rejectCompletionMock.mockReset().mockResolvedValue(activeAcceptance);

    renderCompletionReview();

    // 挂载渲染完成（接收按钮 = 显式入口可见），此期间绝不能有 accept 请求
    expect(await screen.findByRole('button', { name: 'acceptance.accept' })).toBeTruthy();
    // 排空微任务队列后再断言，排除「渲染后异步补发」的可能
    await waitFor(() => expect(screen.getByRole('button', { name: 'acceptance.reject' })).toBeTruthy());
    expect(acceptCompletionMock).not.toHaveBeenCalled();
    expect(rejectCompletionMock).not.toHaveBeenCalled();

    // 显式点击「接收」→ 恰好一次 accept-completion，携带当前用户
    fireEvent.click(screen.getByRole('button', { name: 'acceptance.accept' }));
    await waitFor(() => expect(acceptCompletionMock).toHaveBeenCalledTimes(1));
    expect(acceptCompletionMock).toHaveBeenCalledWith('acc-1', undefined, 'user-1');
    expect(rejectCompletionMock).not.toHaveBeenCalled();
  });
});
