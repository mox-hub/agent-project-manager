export interface DesktopAppInfo {
  version: string;
  shell: string;
  runtime: string;
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
  /** 更新日志（GitHub Release body；available/downloaded 时携带） */
  releaseNotes?: string;
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

declare global {
  interface Window {
    /** 桌面壳桥（Electron preload 注入，ADR-014）：invoke 走主进程 desktop:command 路由 */
    __APM_DESKTOP__?: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
      /** apm:// 深链订阅（ADR-015 P2）；返回解绑函数。旧壳版本无此能力为可选 */
      onDeepLink?: (callback: (url: string) => void) => () => void;
      /** 自动更新状态实时推送（ADR-015 补记 4）；返回解绑函数。旧壳无此能力为可选 */
      onUpdateStatus?: (callback: (status: DesktopUpdateStatus) => void) => () => void;
    };
    __DESKTOP_API_BASE_URL__?: string;
  }
}

let _apiBaseUrl: string | null = null;

export function isDesktopShellAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.__APM_DESKTOP__;
}

export function setApiBaseUrl(url: string): void {
  _apiBaseUrl = url;
  window.__DESKTOP_API_BASE_URL__ = url;
}

export function getApiBaseUrl(): string | null {
  // 回落 window 全局：dev HMR 重新执行模块会把 _apiBaseUrl 归零，而 setApiBaseUrl
  // 同步写过的 window 槽不受影响；不回落会把已钉底误判成「尚未就绪」
  return _apiBaseUrl ?? window.__DESKTOP_API_BASE_URL__ ?? null;
}

export async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (!window.__APM_DESKTOP__) {
    throw new Error('桌面壳桥（__APM_DESKTOP__）不可用');
  }
  return window.__APM_DESKTOP__.invoke<T>(cmd, args);
}

/**
 * 订阅壳侧自动更新状态推送（ADR-015 补记 4）。旧壳无推送通道时返回空解绑函数、
 * 不做兜底轮询——壳与前端同安装包分发，不存在「新前端配旧壳」的组合；
 * 状态仍可靠「检查更新」按钮手动刷新。返回解绑函数，供 useEffect 清理。
 */
export function subscribeUpdateStatus(
  callback: (status: DesktopUpdateStatus) => void,
): () => void {
  const unsubscribe = window.__APM_DESKTOP__?.onUpdateStatus?.(callback);
  return unsubscribe ?? (() => undefined);
}
