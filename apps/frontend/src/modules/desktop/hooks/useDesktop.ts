import { useState, useEffect, useCallback } from 'react';
import {
  invoke,
  isTauriAvailable,
  type DesktopAppInfo,
  type BackendInfo,
  type BackendStatus,
  type FrontendInfo,
  type FrontendStatus,
  type DesktopActionResult,
  type RuntimeDaemonStatus,
  setApiBaseUrl,
} from '@/shared/types/electron-api';

export interface UseDesktopReturn {
  appInfo: DesktopAppInfo | null;
  backendStatus: BackendStatus | null;
  frontendStatus: FrontendStatus | null;
  daemonStatus: RuntimeDaemonStatus | null;
  isLoading: boolean;
  error: string | null;
  isDesktop: boolean;
  getAppInfo: () => Promise<void>;
  startBackend: () => Promise<void>;
  stopBackend: () => Promise<void>;
  restartBackend: () => Promise<void>;
  startFrontend: () => Promise<void>;
  stopFrontend: () => Promise<void>;
  startAllServices: () => Promise<void>;
  stopAllServices: () => Promise<void>;
  openLogDir: () => Promise<void>;
  startDaemon: () => Promise<void>;
  stopDaemon: () => Promise<void>;
  chooseWorkspaceRoot: () => Promise<string | null>;
  addWorkspaceRoot: (root: string) => Promise<void>;
  removeWorkspaceRoot: (root: string) => Promise<void>;
  toggleDevtools: () => Promise<void>;
}

export function useDesktop(): UseDesktopReturn {
  const [appInfo, setAppInfo] = useState<DesktopAppInfo | null>(null);
  const [backendStatus, setBackendStatus] = useState<BackendStatus | null>(null);
  const [frontendStatus, setFrontendStatus] = useState<FrontendStatus | null>(null);
  const [daemonStatus, setDaemonStatus] = useState<RuntimeDaemonStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isDesktop = isTauriAvailable();

  const getBackendStatus = useCallback(async () => {
    if (!isDesktop) return;
    try {
      const status = await invoke<BackendStatus>('get_backend_status');
      setBackendStatus(status);
      if (status.running && status.info?.apiBaseUrl) {
        setApiBaseUrl(status.info.apiBaseUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [isDesktop]);

  const getFrontendStatus = useCallback(async () => {
    if (!isDesktop) return;
    try {
      const status = await invoke<FrontendStatus>('get_frontend_status');
      setFrontendStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [isDesktop]);

  const getAppInfo = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setError(null);
      const info = await invoke<DesktopAppInfo>('get_app_info');
      setAppInfo(info);
      if (info.apiBaseUrl) {
        setApiBaseUrl(info.apiBaseUrl);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [isDesktop]);

  const startBackend = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setIsLoading(true);
      setError(null);
      const info = await invoke<BackendInfo>('start_backend');
      setBackendStatus({ running: true, info });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop]);

  const stopBackend = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<DesktopActionResult>('stop_backend');
      if (!result.ok) {
        setError(result.error || '停止后端失败');
      } else {
        setBackendStatus({ running: false });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop]);

  const restartBackend = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setIsLoading(true);
      setError(null);
      const info = await invoke<BackendInfo>('restart_backend');
      setBackendStatus({ running: true, info });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop]);

  const startFrontend = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setIsLoading(true);
      setError(null);
      const info = await invoke<FrontendInfo>('start_frontend');
      setFrontendStatus({ running: true, info });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop]);

  const stopFrontend = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setIsLoading(true);
      setError(null);
      const result = await invoke<DesktopActionResult>('stop_frontend');
      if (!result.ok) {
        setError(result.error || '停止前端失败');
      } else {
        setFrontendStatus({ running: false });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop]);

  const startAllServices = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setIsLoading(true);
      setError(null);
      await invoke<DesktopActionResult>('start_all_services');
      // 刷新状态
      await getBackendStatus();
      await getFrontendStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop, getBackendStatus, getFrontendStatus]);

  const stopAllServices = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setIsLoading(true);
      setError(null);
      await invoke<DesktopActionResult>('stop_all_services');
      setBackendStatus({ running: false });
      setFrontendStatus({ running: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop]);

  const openLogDir = useCallback(async () => {
    if (!isDesktop) return;
    try {
      await invoke<DesktopActionResult>('open_log_dir');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [isDesktop]);

  const getDaemonStatus = useCallback(async () => {
    if (!isDesktop) return;
    try {
      const status = await invoke<RuntimeDaemonStatus>('get_runtime_daemon_status');
      setDaemonStatus(status);
    } catch {
      // 守护进程命令在旧壳版本可能不存在——状态保持 null，UI 按不支持处理
    }
  }, [isDesktop]);

  const startDaemon = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setIsLoading(true);
      setError(null);
      await invoke<{ pid: number }>('start_runtime_daemon');
      await getDaemonStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop, getDaemonStatus]);

  const stopDaemon = useCallback(async () => {
    if (!isDesktop) return;
    try {
      setIsLoading(true);
      setError(null);
      await invoke<DesktopActionResult>('stop_runtime_daemon');
      await getDaemonStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, [isDesktop, getDaemonStatus]);

  const chooseWorkspaceRoot = useCallback(async (): Promise<string | null> => {
    if (!isDesktop) return null;
    const result = await invoke<{ path: string | null }>('choose_directory', {
      title: '选择 AI 执行的工作目录',
    });
    return result.path;
  }, [isDesktop]);

  const addWorkspaceRoot = useCallback(
    async (root: string) => {
      const current = daemonStatus?.workspaceRoots ?? [];
      const { roots } = await invoke<{ roots: string[] }>('set_workspace_roots', {
        roots: [...current, root],
      });
      setDaemonStatus((prev) => (prev ? { ...prev, workspaceRoots: roots } : prev));
    },
    [daemonStatus],
  );

  const removeWorkspaceRoot = useCallback(
    async (root: string) => {
      const current = daemonStatus?.workspaceRoots ?? [];
      const { roots } = await invoke<{ roots: string[] }>('set_workspace_roots', {
        roots: current.filter((r) => r !== root),
      });
      setDaemonStatus((prev) => (prev ? { ...prev, workspaceRoots: roots } : prev));
    },
    [daemonStatus],
  );

  const toggleDevtools = useCallback(async () => {
    if (!isDesktop) return;
    await invoke<DesktopActionResult>('toggle_devtools');
  }, [isDesktop]);

  useEffect(() => {
    if (isDesktop) {
      getAppInfo();
      getBackendStatus();
      getFrontendStatus();
      getDaemonStatus();
      // 定期刷新状态
      const interval = setInterval(() => {
        getBackendStatus();
        getFrontendStatus();
        getDaemonStatus();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isDesktop, getAppInfo, getBackendStatus, getFrontendStatus, getDaemonStatus]);

  return {
    appInfo,
    backendStatus,
    frontendStatus,
    daemonStatus,
    isLoading,
    error,
    isDesktop,
    getAppInfo,
    startBackend,
    stopBackend,
    restartBackend,
    startFrontend,
    stopFrontend,
    startAllServices,
    stopAllServices,
    openLogDir,
    startDaemon,
    stopDaemon,
    chooseWorkspaceRoot,
    addWorkspaceRoot,
    removeWorkspaceRoot,
    toggleDevtools,
  };
}
