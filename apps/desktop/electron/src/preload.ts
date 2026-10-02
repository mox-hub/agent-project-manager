/**
 * preload：向前端暴露 desktop IPC 契约。
 *
 * 前端抽象层 apps/frontend/src/shared/types/electron-api.ts 声明并消费
 * `window.__APM_DESKTOP__.invoke(cmd, args)`——本仓库自定义的壳桥契约（Electron 壳
 * 唯一实现；早期曾以 __TAURI__ 命名随 Tauri 壳迁移，ADR-014 定版 Electron 后更名）。
 * onDeepLink（ADR-015 P2）：apm:// 深链经主进程转发，返回解绑函数。
 * onUpdateStatus（ADR-015 补记 4）：自动更新状态实时推送，设置页消费。
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('__APM_DESKTOP__', {
  invoke: <T>(cmd: string, args?: Record<string, unknown>): Promise<T> =>
    ipcRenderer.invoke('desktop:command', cmd, args),
  onDeepLink: (callback: (url: string) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, url: string) => callback(url);
    ipcRenderer.on('desktop:deep-link', listener);
    return () => {
      ipcRenderer.removeListener('desktop:deep-link', listener);
    };
  },
  onUpdateStatus: (callback: (status: unknown) => void): (() => void) => {
    const listener = (_event: IpcRendererEvent, status: unknown) => callback(status);
    ipcRenderer.on('desktop:update-status', listener);
    return () => {
      ipcRenderer.removeListener('desktop:update-status', listener);
    };
  },
});
