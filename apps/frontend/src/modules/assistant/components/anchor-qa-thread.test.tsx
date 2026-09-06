import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AnchorQaThread } from './anchor-qa-thread';
import type { AnchorQaResult } from '../hooks/use-anchor-qa';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mockNavigate = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

const mockStore = vi.hoisted(() => ({
  openAssistantWithDraft: vi.fn(),
}));
vi.mock('@/infrastructure/store/app-store', () => ({
  useAppStore: (selector: (s: typeof mockStore) => unknown) =>
    selector(mockStore),
}));

const mockMutate = vi.hoisted(() => vi.fn());
vi.mock('../hooks/use-anchor-qa', () => ({
  useAnchorQa: () => ({
    mutateAsync: mockMutate,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/shared/components/markdown-view', () => ({
  MarkdownView: ({ content }: { content: string }) => (
    <div data-testid="md">{content}</div>
  ),
}));

function renderThread(overrides?: {
  onApplyAction?: (action: { action: string }) => Promise<void>;
  onOpenChange?: (open: boolean) => void;
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AnchorQaThread
        issueId="t1"
        projectId="p1"
        onApplyAction={overrides?.onApplyAction}
        onOpenChange={overrides?.onOpenChange}
      />
    </QueryClientProvider>,
  );
}

const answer: AnchorQaResult = {
  answer: '当前状态是进行中，未设截止日。',
  actions: [
    { label: '标记完成', action: 'task.update_status', params: { status: 'done' } },
  ],
};

describe('AnchorQaThread', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockStore.openAssistantWithDraft.mockClear();
    mockMutate.mockReset();
  });

  it('输入问题发送后渲染答案与白名单动作（非法动作被过滤）', async () => {
    mockMutate.mockResolvedValue(answer);
    renderThread();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: '现在什么状态？' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'assistant.anchorQa.send' }));
    await waitFor(() =>
      expect(screen.getByTestId('md').textContent).toContain('进行中'),
    );
    // 答案与动作渲染（白名单过滤逻辑在 use-anchor-qa.test 中直测）
    expect(screen.getByText('标记完成')).toBeTruthy();
  });

  it('点击动作调用落库回调并翻转为已应用', async () => {
    mockMutate.mockResolvedValue(answer);
    const onApplyAction = vi.fn().mockResolvedValue(undefined);
    renderThread({ onApplyAction });
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'q' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'assistant.anchorQa.send' }));
    await waitFor(() => screen.getByText('标记完成'));
    fireEvent.click(screen.getByText('标记完成'));
    await waitFor(() =>
      expect(screen.getByText('assistant.anchorQa.applied')).toBeTruthy(),
    );
    expect(onApplyAction).toHaveBeenCalledWith(answer.actions![0]);
  });

  it('升级出口：细聊带问答语境开面板，办公室跳 /app/office', async () => {
    mockMutate.mockResolvedValue({
      answer: '答案A',
      actions: [],
    });
    renderThread();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '问题Q' } });
    fireEvent.click(screen.getByRole('button', { name: 'assistant.anchorQa.send' }));
    await waitFor(() => screen.getByTestId('md'));

    fireEvent.click(screen.getByText('assistant.anchorQa.escalatePanel'));
    expect(mockStore.openAssistantWithDraft).toHaveBeenCalledWith(
      expect.stringContaining('问题Q'),
    );

    fireEvent.click(screen.getByText('assistant.anchorQa.escalateOffice'));
    expect(mockNavigate).toHaveBeenCalledWith('/app/office');
  });

  it('挂载不回传开合（StrictMode 下回调会致线程自毁），关闭按钮回调 onOpenChange(false)', () => {
    const onOpenChange = vi.fn();
    renderThread({ onOpenChange });
    expect(onOpenChange).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'common.close' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it('Esc 收起回调 onOpenChange(false)', () => {
    const onOpenChange = vi.fn();
    renderThread({ onOpenChange });
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });
});
