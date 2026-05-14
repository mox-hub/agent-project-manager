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
