/**
 * IssueTypeSwitcher 交互回归（P1-18 死开关接通）：
 * - 点类型项必须发出 update 请求（Base UI Menu.Item 只有 onClick，
 *   Radix 式 onSelect 是零请求死开关，本测试防回归）
 * - 乐观更新：请求未落定前详情缓存已切换 UI
 * - 失败回滚：mutateAsync reject 后缓存恢复旧 typeId
 * - 点击当前类型：不发请求（幂等守卫）
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IssueTypeSwitcher } from './issue-type-switcher';
import type { Task } from '../api/issue-api';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const typesFixture = [
  {
    id: 'type-task',
    key: 'task',
    name: '任务',
    icon: 'Circle',
    color: '#5E6AD2',
    order: 100,
    isSystem: true,
    enabled: true,
    fieldSchema: null,
  },
  {
    id: 'type-bug',
    key: 'bug',
    name: '缺陷',
    icon: 'Bug',
    color: '#D25E6A',
    order: 200,
    isSystem: true,
    enabled: true,
    fieldSchema: null,
  },
];

vi.mock('../hooks/use-issue-types', () => ({
  useIssueTypes: () => ({ types: typesFixture }),
  useIssueTypeOf:
    () =>
    (task: { typeId?: string | null; type?: string }) =>
      typesFixture.find((ty) => ty.id === (task.typeId ?? task.type)),
}));

const mutateAsyncMock = vi.fn();

vi.mock('../hooks/use-project-tasks', () => ({
  useUpdateTask: () => ({ mutateAsync: mutateAsyncMock }),
}));

vi.mock('@/shared/components/issue-type-pill', () => ({
  IssueTypePill: () => <span data-testid="type-pill" />,
}));

vi.mock('@/shared/components/issue-type-icon', () => ({
  issueTypeIcon: () => (props: Record<string, unknown>) => (
    <svg data-testid="type-icon" {...props} />
  ),
}));

const taskFixture = { id: 't1', typeId: 'type-task', type: 'task' } as Task;

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

const renderSwitcher = () => {
  const queryClient = createQueryClient();
  queryClient.setQueryData(['task', 't1'], taskFixture);
  const onChanged = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/app/issues/t1']}>
        <IssueTypeSwitcher task={taskFixture} onChanged={onChanged} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { queryClient, onChanged };
};

const openMenuAndPick = async (name: string) => {
  const trigger = await screen.findByTestId('type-pill');
  fireEvent.click(trigger.closest('[data-slot="dropdown-menu-trigger"]') ?? trigger);
  const item = await screen.findByText(name);
  fireEvent.click(item);
  return item;
};

describe('IssueTypeSwitcher', () => {
  it('点击类型项发出 update 请求并乐观切换详情缓存', async () => {
    let resolveMutation: (value: unknown) => void = () => {};
    mutateAsyncMock.mockImplementation(
      () => new Promise((resolve) => (resolveMutation = resolve)),
    );
    const { queryClient, onChanged } = renderSwitcher();

    await openMenuAndPick('缺陷');

    await waitFor(() =>
      expect(mutateAsyncMock).toHaveBeenCalledWith({
        issueId: 't1',
        data: { typeId: 'type-bug' },
      }),
    );
    // 乐观更新：请求未 resolve 前缓存已切换 UI 数据
    expect(queryClient.getQueryData<Task>(['task', 't1'])?.typeId).toBe('type-bug');

    resolveMutation({ ...taskFixture, typeId: 'type-bug', type: 'bug' });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('切换失败回滚详情缓存为旧 typeId', async () => {
    mutateAsyncMock.mockRejectedValue(new Error('network down'));
    const { queryClient } = renderSwitcher();

    await openMenuAndPick('缺陷');

    await waitFor(() =>
      expect(queryClient.getQueryData<Task>(['task', 't1'])?.typeId).toBe('type-task'),
    );
    expect(mutateAsyncMock).toHaveBeenCalledTimes(1);
  });

  it('点击当前类型不发请求（幂等守卫）', async () => {
    mutateAsyncMock.mockResolvedValue(taskFixture);
    renderSwitcher();

    await openMenuAndPick('任务');

    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });
});
