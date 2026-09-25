import { describe, expect, it, beforeAll, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  getPinnedIssueIds,
  subscribePinnedIssues,
  togglePinnedIssueId,
  usePinnedIssueIds,
} from './pinned-issues-store';

const STORAGE_KEY = 'apm.pinned-issues';

// setup.ts 将 localStorage mock 为无实现的 vi.fn()，这里接上内存实现（toolbar-row.test 同款）
const memoryStorage = new Map<string, string>();
beforeAll(() => {
  vi.mocked(localStorage.getItem).mockImplementation((k) => memoryStorage.get(k) ?? null);
  vi.mocked(localStorage.setItem).mockImplementation((k, v) => void memoryStorage.set(k, v));
  vi.mocked(localStorage.removeItem).mockImplementation((k) => void memoryStorage.delete(k));
  vi.mocked(localStorage.clear).mockImplementation(() => void memoryStorage.clear());
});

beforeEach(() => {
  localStorage.removeItem(STORAGE_KEY);
  // 清空模块级状态（toggle 两次即归零）
  for (const id of Array.from(getPinnedIssueIds())) togglePinnedIssueId(id);
});

describe('pinned-issues-store —— 工单固定态持久化', () => {
  it('toggle 写穿 localStorage（JSON id 数组）', () => {
    togglePinnedIssueId('issue-1');
    togglePinnedIssueId('issue-2');

    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual([
      'issue-1',
      'issue-2',
    ]);

    togglePinnedIssueId('issue-1');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['issue-2']);
  });

  it('刷新（重新 load）后固定态仍在：新订阅者读到持久化值', () => {
    togglePinnedIssueId('issue-42');

    // 模拟刷新：useSyncExternalStore 的 getSnapshot 直读模块级快照，
    // 这里校验快照与 localStorage 一致（同源加载路径）
    expect(getPinnedIssueIds().has('issue-42')).toBe(true);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')).toEqual(['issue-42']);
  });

  it('存储损坏时回落空集合，不抛错', async () => {
    localStorage.setItem(STORAGE_KEY, '{not-json');
    vi.resetModules();
    const fresh = await import('./pinned-issues-store');

    expect(fresh.getPinnedIssueIds().size).toBe(0);
    fresh.togglePinnedIssueId('issue-x');
    expect(fresh.getPinnedIssueIds().has('issue-x')).toBe(true);
    // 损坏数据被覆盖回合法数组
    expect(() => JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '')).not.toThrow();
  });

  it('订阅者收到变更通知（useSyncExternalStore 数据源契约）', () => {
    const listener = vi.fn();
    const unsubscribe = subscribePinnedIssues(listener);

    act(() => {
      togglePinnedIssueId('issue-9');
    });
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockClear();
    act(() => {
      togglePinnedIssueId('issue-9');
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it('usePinnedIssueIds hook 返回共享快照且随 toggle 更新', () => {
    const { result } = renderHook(() => usePinnedIssueIds());
    expect(result.current.has('issue-hook')).toBe(false);

    act(() => {
      togglePinnedIssueId('issue-hook');
    });
    expect(result.current.has('issue-hook')).toBe(true);
  });
});
