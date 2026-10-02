import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdjustTrustDialog } from './adjust-trust-dialog';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const mocks = vi.hoisted(() => ({
  patch: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@/infrastructure/api-client', () => ({
  api: { patch: mocks.patch },
}));

vi.mock('@/components/ui/toast', () => ({
  toast: { success: mocks.success, error: mocks.error },
}));

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  const onOpenChange = vi.fn();
  const utils = render(
    <QueryClientProvider client={qc}>
      <AdjustTrustDialog
        memberId="ai-1"
        memberName="小码"
        currentLevel={2}
        open
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>,
  );
  return { invalidateSpy, onOpenChange, ...utils };
}

function tierOption(labelKey: string) {
  // 选项行：等级名 + 描述 + 单选圆点同处一个 button
  return screen.getByRole('button', { name: new RegExp(labelKey) });
}

describe('AdjustTrustDialog', () => {
  beforeEach(() => {
    mocks.patch.mockReset();
    mocks.success.mockClear();
    mocks.error.mockClear();
  });

  it('渲染三级选项、红线说明与当前等级预选', () => {
    setup();
    expect(screen.getByText('trust.adjustTitle:{"name":"小码"}')).toBeTruthy();
    expect(screen.getByText('trust.tier1.name')).toBeTruthy();
    expect(screen.getByText('trust.tier2.name')).toBeTruthy();
    expect(screen.getByText('trust.tier3.name')).toBeTruthy();
    expect(screen.getByText('trust.redlineNote')).toBeTruthy();
  });

  it('选择新等级保存发 PATCH 并失效 office/members 查询', async () => {
    mocks.patch.mockResolvedValueOnce({});
    const { invalidateSpy, onOpenChange } = setup();
    fireEvent.click(tierOption('trust.tier3.name'));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(mocks.patch).toHaveBeenCalledWith('/members/ai-1', { trustLevel: 3 });
    });
    const keys = invalidateSpy.mock.calls.map((c) => c[0]?.queryKey);
    expect(keys).toContainEqual(['office']);
    expect(keys).toContainEqual(['members']);
    expect(mocks.success).toHaveBeenCalledWith('trust.adjustSaved');
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('保存失败 toast 报错且不关闭对话框', async () => {
    mocks.patch.mockRejectedValueOnce(new Error('boom'));
    const { onOpenChange } = setup();
    fireEvent.click(tierOption('trust.tier1.name'));
    fireEvent.click(screen.getByRole('button', { name: 'common.save' }));
    await waitFor(() => {
      expect(mocks.error).toHaveBeenCalledWith('trust.adjustFailed');
    });
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
