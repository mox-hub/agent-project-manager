/**
 * 本机进程监控数据源（CAP-A-14 可观测性切片）。
 * 挂载期间轮询壳命令 get_process_stats（默认 5s），组件卸载即停——
 * 采集要走 OS 内建命令（tasklist/netstat），不挂在全局常驻轮询上。
 */
import { useCallback, useEffect, useState } from 'react';
import {
  invoke,
  isTauriAvailable,
  type DesktopProcessStat,
} from '@/shared/types/electron-api';

export function useProcessStats(intervalMs = 5000) {
  const [processes, setProcesses] = useState<DesktopProcessStat[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isTauriAvailable()) {
      setIsLoading(false);
      return;
    }
    try {
      const result = await invoke<{ processes: DesktopProcessStat[] }>('get_process_stats');
      setProcesses(result.processes);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isTauriAvailable()) {
      setIsLoading(false);
      return;
    }
    void refresh();
    const timer = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(timer);
  }, [refresh, intervalMs]);

  return { processes, isLoading, error, refresh };
}
