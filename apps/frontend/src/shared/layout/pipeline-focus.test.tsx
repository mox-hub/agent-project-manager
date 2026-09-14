/**
 * 管道项目聚焦（CAP-A-15）hook 测试——URL 优先 / store 兜底 / setProjectId 双写。
 * Probe 组件同时读取 usePipelineProjectFilter 与 useSearchParams，
 * 断言聚焦值与 URL search 的联动（含其他参数保留）。
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useSearchParams } from 'react-router-dom';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  usePipelineFocusStore,
  usePipelineProjectFilter,
} from './pipeline-focus';

function Probe() {
  const { focusProjectId, setProjectId } = usePipelineProjectFilter();
  const [searchParams] = useSearchParams();
  return (
    <div>
      <span data-testid="focus">{focusProjectId ?? 'null'}</span>
      <span data-testid="search">{searchParams.toString()}</span>
      <button type="button" onClick={() => setProjectId('p3')}>set-p3</button>
      <button type="button" onClick={() => setProjectId(null)}>clear</button>
    </div>
  );
}

// MemoryRouter（非 data router）：setSearchParams 走路由上下文更新，
// 不触发 react-router 内部 Request 构建（会与 MSW/undici 的 AbortSignal 冲突）
function renderProbe(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Probe />
    </MemoryRouter>,
  );
}

describe('usePipelineProjectFilter（CAP-A-15 项目聚焦）', () => {
  beforeEach(() => {
    usePipelineFocusStore.setState({ focusProjectId: null });
  });

  it('URL 无参且 store 为空 → 返回 null', () => {
    renderProbe('/');
    expect(screen.getByTestId('focus').textContent).toBe('null');
  });

  it('URL ?project=p1 → 返回 p1 并覆盖写回 store（URL 优先）', async () => {
    renderProbe('/?project=p1');
    expect(screen.getByTestId('focus').textContent).toBe('p1');
    await waitFor(() => {
      expect(usePipelineFocusStore.getState().focusProjectId).toBe('p1');
    });
  });

  it('URL 无参 + store=p2 → 返回 store 值（兜底）', () => {
    usePipelineFocusStore.setState({ focusProjectId: 'p2' });
    renderProbe('/');
    expect(screen.getByTestId('focus').textContent).toBe('p2');
  });

  it('URL 与 store 冲突时 URL 覆盖 store', async () => {
    usePipelineFocusStore.setState({ focusProjectId: 'p2' });
    renderProbe('/?project=p1');
    expect(screen.getByTestId('focus').textContent).toBe('p1');
    await waitFor(() => {
      expect(usePipelineFocusStore.getState().focusProjectId).toBe('p1');
    });
  });

  it('setProjectId 双写：store 更新 + URL 写入 ?project 且保留其他参数', () => {
    renderProbe('/?foo=1');
    fireEvent.click(screen.getByText('set-p3'));
    expect(usePipelineFocusStore.getState().focusProjectId).toBe('p3');
    expect(screen.getByTestId('search').textContent).toBe('foo=1&project=p3');
    expect(screen.getByTestId('focus').textContent).toBe('p3');
  });

  it('setProjectId(null)：清空 store 并从 URL 移除 ?project（保留其他参数）', () => {
    renderProbe('/?foo=1&project=p1');
    fireEvent.click(screen.getByText('clear'));
    expect(usePipelineFocusStore.getState().focusProjectId).toBeNull();
    expect(screen.getByTestId('search').textContent).toBe('foo=1');
    expect(screen.getByTestId('focus').textContent).toBe('null');
  });
});
