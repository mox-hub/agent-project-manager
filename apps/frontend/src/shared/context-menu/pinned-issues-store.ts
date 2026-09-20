/**
 * 工单行「固定」态共享存储 —— localStorage 持久化 + 跨实例同步。
 *
 * 此前 pinnedIds 挂在 useIssueRowMenu 的局部 useState 上：刷新即丢，
 * 同页 list 与看板两个 hook 实例也互不同步。这里收编为模块级单一 store：
 * - 写穿 localStorage（键 `apm.pinned-issues`，JSON id 数组，存取失败静默退化为内存态）；
 * - 所有 hook 实例经 useSyncExternalStore 订阅同一快照（不可变 Set，引用稳定），
 *   list / 看板 / 刷新后固定态一致。
 */

import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'apm.pinned-issues';

function load(): ReadonlySet<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

let current: ReadonlySet<string> = load();
const listeners = new Set<() => void>();

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {
    /* 存储不可用（配额/隐私模式）时退化为内存态 */
  }
}

export function getPinnedIssueIds(): ReadonlySet<string> {
  return current;
}

export function togglePinnedIssueId(id: string): void {
  const next = new Set(current);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  current = next;
  persist();
  listeners.forEach((l) => l());
}

export function subscribePinnedIssues(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** React 绑定：订阅共享固定态（跨 hook 实例与刷新持久） */
export function usePinnedIssueIds(): ReadonlySet<string> {
  return useSyncExternalStore(subscribePinnedIssues, getPinnedIssueIds);
}
