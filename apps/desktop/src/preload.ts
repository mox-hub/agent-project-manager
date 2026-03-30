import { contextBridge, ipcRenderer } from 'electron';

export type DesktopAppInfo = {
  version: string;
  node: string;
  electron: string;
  chrome: string;
  apiBaseUrl: string;
  dataPath: string;
  logPath: string;
  mode: 'development' | 'packaged';
};

export type DesktopActionResult = {
  ok: boolean;
  error?: string;
};

const electronAPI = {
  getAppInfo: () =>
    ipcRenderer.invoke('desktop:get-app-info') as Promise<DesktopAppInfo>,
  openLogDir: () =>
    ipcRenderer.invoke('desktop:open-log-dir') as Promise<DesktopActionResult>,
  restartBackend: () =>
    ipcRenderer.invoke(
      'desktop:restart-backend',
    ) as Promise<DesktopActionResult>,
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
