export interface DesktopAppInfo {
  version: string;
  tauri: string;
  rust: string;
  os: string;
  apiBaseUrl: string;
  frontendUrl: string;
  dataPath: string;
  logPath: string;
  mode: 'development' | 'production';
  /** 首装校验：true = ~/.apm 无既有数据（全新安装）；false = 升级安装 */
  isFirstInstall: boolean;
}

export interface BackendInfo {
  port: number;
  apiBaseUrl: string;
  pid: number;
}

export interface BackendStatus {
  running: boolean;
  info?: BackendInfo;
}

export interface FrontendInfo {
  port: number;
  url: string;
  pid: number;
}

export interface FrontendStatus {
  running: boolean;
  info?: FrontendInfo;
}

export interface DesktopActionResult {
  ok: boolean;
  error?: string;
}

/** 壳侧跨 origin 持久化的会话状态（desktop-state.json；键名与前端 localStorage 键对齐） */
export interface DesktopPersistentState {
  access_token?: string;
  'apm-workspace-id'?: string;
  onboarding_completed?: boolean;
  /** 关窗行为（ADR-015）：true（默认）= 最小化到托盘服务保活；false = 关窗即退出 */
  close_to_tray?: boolean;
  /** 主窗口位置与尺寸（正常态），下次启动恢复 */
  window_bounds?: { x: number; y: number; width: number; height: number };
}

/** 壳侧自动更新状态（electron-updater；ADR-015。dev/未打包恒 idle） */
export interface DesktopUpdateStatus {
  state: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  progress?: number;
  error?: string;
}

export interface RuntimeDaemonStatus {
  running: boolean;
  pid?: number;
  startedAt?: string;
  configPath: string;
  workspaceRoots: string[];
}

/** 壳托管进程的角色化监控行（get_process_stats；无监听/未采到字段缺省） */
export interface DesktopProcessStat {
  role: 'shell' | 'backend' | 'daemon' | 'frontend-dev';
  pid: number;
  running: boolean;
  port?: number;
  memoryMB?: number;
  transport?: string;
  startedAt?: string;
}

export interface DesktopLogLine {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'RAW';
  message: string;
}

export interface DesktopLogSnapshot {
  lines: DesktopLogLine[];
  counts: { INFO: number; WARN: number; ERROR: number; RAW: number };
  truncated: boolean;
  filePath: string;
}

export interface TauriAPI {
  getAppInfo: () => Promise<DesktopAppInfo>;
  getBackendStatus: () => Promise<BackendStatus>;
  startBackend: () => Promise<BackendInfo>;
  stopBackend: () => Promise<DesktopActionResult>;
  restartBackend: () => Promise<BackendInfo>;
  openLogDir: () => Promise<DesktopActionResult>;
  initApp: () => Promise<void>;
}

export interface DesktopAPI {
  setApiBaseUrl: (url: string) => void;
  getApiBaseUrl: () => string | null;
}

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
        /** apm:// 深链订阅（ADR-015 P2）；返回解绑函数。旧壳版本无此能力为可选 */
        onDeepLink?: (callback: (url: string) => void) => () => void;
      };
    };
    __DESKTOP_API_BASE_URL__?: string;
  }
}

let _apiBaseUrl: string | null = null;

export function isTauriAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.__TAURI__;
}

export function setApiBaseUrl(url: string): void {
  _apiBaseUrl = url;
  window.__DESKTOP_API_BASE_URL__ = url;
}

export function getApiBaseUrl(): string | null {
  return _apiBaseUrl;
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!window.__TAURI__) {
    throw new Error('Tauri API 不可用');
  }
  return window.__TAURI__.core.invoke<T>(cmd, args);
}
