export interface DesktopAppInfo {
  version: string;
  node: string;
  electron: string;
  chrome: string;
  apiBaseUrl: string;
  dataPath: string;
  logPath: string;
  mode: 'development' | 'packaged';
}

export interface DesktopActionResult {
  ok: boolean;
  error?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      getAppInfo: () => Promise<DesktopAppInfo>;
      openLogDir: () => Promise<DesktopActionResult>;
      restartBackend: () => Promise<DesktopActionResult>;
    };
  }
}
