/**
 * preload：向前端暴露 desktop IPC 契约。
 *
 * 前端抽象层 apps/frontend/src/shared/types/electron-api.ts 声明并消费
 * `window.__TAURI__.core.invoke(cmd, args)`——这是本仓库自定义的壳桥契约（非 Tauri
 * 官方 API），Electron 侧按同形状实现即可让前端零改动。
 * onDeepLink（ADR-015 P2）：apm:// 深链经主进程转发，返回解绑函数。
 */
import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron';

contextBridge.exposeInMainWorld('__TAURI__', {
  core: {
    invoke: <T>(cmd: string, args?: Record<string, unknown>): Promise<T> =>
      ipcRenderer.invoke('desktop:command', cmd, args),
    onDeepLink: (callback: (url: string) => void): (() => void) => {
      const listener = (_event: IpcRendererEvent, url: string) => callback(url);
      ipcRenderer.on('desktop:deep-link', listener);
      return () => {
        ipcRenderer.removeListener('desktop:deep-link', listener);
      };
    },
  },
});
