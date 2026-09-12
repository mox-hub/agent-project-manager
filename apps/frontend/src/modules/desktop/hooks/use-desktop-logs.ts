/**
 * 本机服务日志面板数据源（CAP-A-14 可观测性切片）。
 * 轮询壳命令 get_desktop_logs 读 desktop-main.log 尾部窗口（默认 3s，可暂停），
 * 级别筛选与搜索为前端内存过滤；清空调壳命令 truncate。
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  invoke,
  isTauriAvailable,
  type DesktopLogLine,
  type DesktopLogSnapshot,
} from '@/shared/types/electron-api';

export type LogLevelFilter = 'ALL' | 'INFO' | 'WARN' | 'ERROR';

const DEFAULT_TAIL = 500;

export function formatLogLine(line: DesktopLogLine): string {
  if (line.level === 'RAW') {
    return line.message;
  }
  return `[${line.timestamp}] [${line.level}] ${line.message}`;
}

export function useDesktopLogs(intervalMs = 3000) {
  const [snapshot, setSnapshot] = useState<DesktopLogSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [levelFilter, setLevelFilter] = useState<LogLevelFilter>('ALL');
  const [search, setSearch] = useState('');

  const refresh = useCallback(async () => {
    if (!isTauriAvailable()) {
      return;
    }
    try {
      const result = await invoke<DesktopLogSnapshot>('get_desktop_logs', {
        tail: DEFAULT_TAIL,
      });
      setSnapshot(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, []);

  useEffect(() => {
    if (!isTauriAvailable()) {
      return;
    }
    // 首拉挂宏任务：effect 体内直接调 fetch 会触发同步级联渲染（react-hooks/set-state-in-effect）
    const first = setTimeout(() => void refresh(), 0);
    if (!autoRefresh) {
      return () => clearTimeout(first);
    }
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(timer);
    };
  }, [refresh, autoRefresh, intervalMs]);

  const filteredLines = useMemo(() => {
    const all = snapshot?.lines ?? [];
    const needle = search.trim().toLowerCase();
    return all.filter((line) => {
      if (levelFilter !== 'ALL' && line.level !== levelFilter) {
        return false;
      }
      if (needle && !line.message.toLowerCase().includes(needle)) {
        return false;
      }
      return true;
    });
  }, [snapshot, levelFilter, search]);

  const copyToClipboard = useCallback(async () => {
    const text = filteredLines.map(formatLogLine).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      return false;
    }
  }, [filteredLines]);

  const clearLogs = useCallback(async () => {
    if (!isTauriAvailable()) {
      return;
    }
    await invoke('clear_desktop_logs');
    await refresh();
  }, [refresh]);

  return {
    snapshot,
    error,
    autoRefresh,
    setAutoRefresh,
    levelFilter,
    setLevelFilter,
    search,
    setSearch,
    filteredLines,
    copyToClipboard,
    clearLogs,
    refresh,
  };
}
