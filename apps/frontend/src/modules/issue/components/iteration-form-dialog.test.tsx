import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IterationFormDialog } from './iteration-form-dialog';
import type { IterationRef } from '../api/issue-api';

// i18n mock（照抄 batch-update-issues-dialog 模式：defaultValue 直通）
const translate = (key: string, defaultValue?: string) =>
  typeof defaultValue === 'string' ? defaultValue : key;

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: translate }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

const createIterationMock = vi.fn();
const updateIterationMock = vi.fn();
vi.mock('../api/issue-api', () => ({
  taskApi: {
    createIteration: (...args: unknown[]) => createIterationMock(...args),
    updateIteration: (...args: unknown[]) => updateIterationMock(...args),
  },
}));

const asApi = <T,>(value: object) => value as T;

/** ui/form 的 FormLabel 经 FormControl slot 关联（label for 指向容器 div），
 * getByLabelText 不可用；按 FormLabel 文本定位 FormItem 容器内的 input */
function inputByLabel(label: string): HTMLInputElement {
  const item = screen
    .getByText(label)
    .closest('[data-slot="form-item"]');
  const input = item?.querySelector('input');
  if (!input) throw new Error(`input not found for label: ${label}`);
  return input as HTMLInputElement;
}

function renderDialog(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

describe('IterationFormDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createIterationMock.mockResolvedValue(asApi<IterationRef>({ id: 'it-new' }));
    updateIterationMock.mockResolvedValue(asApi<IterationRef>({ id: 'it-1' }));
  });

  it('创建模式：填写名称与起止日期后提交，调用 createIteration（projectId 注入 body）', async () => {
    const onOpenChange = vi.fn();
    renderDialog(
      <IterationFormDialog
        open
        onOpenChange={onOpenChange}
        projectId="proj-1"
      />,
    );

    fireEvent.change(inputByLabel('迭代名称'), {
      target: { value: 'Sprint 1' },
    });
    fireEvent.change(inputByLabel('开始日期'), {
      target: { value: '2026-06-01' },
    });
    fireEvent.change(inputByLabel('结束日期'), {
      target: { value: '2026-06-14' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() => {
      expect(createIterationMock).toHaveBeenCalledTimes(1);
    });
    expect(createIterationMock).toHaveBeenCalledWith('proj-1', {
      name: 'Sprint 1',
      startDate: '2026-06-01',
      endDate: '2026-06-14',
    });
    expect(updateIterationMock).not.toHaveBeenCalled();
    // 成功后关闭对话框
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('编辑模式：回填既有值，提交调用 updateIteration(iteration.id)', async () => {
    const iteration = asApi<IterationRef>({
      id: 'it-1',
      name: 'Sprint 0',
      status: 'planned',
      startDate: '2026-05-01',
      endDate: '2026-05-14',
    });
    const onOpenChange = vi.fn();
    renderDialog(
      <IterationFormDialog
        open
        onOpenChange={onOpenChange}
        projectId="proj-1"
        iteration={iteration}
      />,
    );

    expect(inputByLabel('迭代名称')).toHaveValue('Sprint 0');

    fireEvent.change(inputByLabel('迭代名称'), {
      target: { value: 'Sprint 0 改' },
    });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));

    await waitFor(() => {
      expect(updateIterationMock).toHaveBeenCalledTimes(1);
    });
    expect(updateIterationMock).toHaveBeenCalledWith('it-1', {
      name: 'Sprint 0 改',
      startDate: '2026-05-01',
      endDate: '2026-05-14',
    });
    expect(createIterationMock).not.toHaveBeenCalled();
  });

  it('名称为空提交被校验拦截，不发起请求', async () => {
    renderDialog(
      <IterationFormDialog open onOpenChange={vi.fn()} projectId="proj-1" />,
    );

    fireEvent.change(inputByLabel('开始日期'), {
      target: { value: '2026-06-01' },
    });
    fireEvent.change(inputByLabel('结束日期'), {
      target: { value: '2026-06-14' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() => {
      expect(screen.getByText('迭代名称必填')).toBeInTheDocument();
    });
    expect(createIterationMock).not.toHaveBeenCalled();
  });

  it('结束日期早于开始日期被校验拦截', async () => {
    renderDialog(
      <IterationFormDialog open onOpenChange={vi.fn()} projectId="proj-1" />,
    );

    fireEvent.change(inputByLabel('迭代名称'), {
      target: { value: 'Sprint X' },
    });
    fireEvent.change(inputByLabel('开始日期'), {
      target: { value: '2026-06-10' },
    });
    fireEvent.change(inputByLabel('结束日期'), {
      target: { value: '2026-06-01' },
    });
    fireEvent.click(screen.getByRole('button', { name: '创建' }));

    await waitFor(() => {
      expect(
        screen.getByText('结束日期不能早于开始日期'),
      ).toBeInTheDocument();
    });
    expect(createIterationMock).not.toHaveBeenCalled();
  });
});
