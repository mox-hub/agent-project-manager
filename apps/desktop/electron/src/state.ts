/**
 * 壳内运行时状态（承接旧 Tauri 壳 state.rs）。
 * Electron main 为单线程事件循环，无需 Rust 侧的锁原语。
 * 注意：IPC 契约字段一律 camelCase（前端 shared/types/electron-api.ts 的接口形状）——
 * 旧壳 Rust 结构体输出 snake_case，与前端类型错位（dev 下被 vite proxy 掩盖），
 * Electron 侧按前端契约正确返回。
 */
import type { BrowserWindow } from 'electron';
import type { ServerHandle } from './backend';
import type { AppConfig } from './config';

export interface RuntimeDaemonHandle {
  pid: number;
  startedAt: string;
  /** 进程是否产出过任何输出（启动即退的排障依据，同 ServerHandle.sawOutput） */
  sawOutput: () => boolean;
  stop: () => Promise<void>;
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

export interface AppState {
  config: AppConfig;
  backend: { handle: ServerHandle; info: BackendInfo } | null;
  frontend: { handle: ServerHandle; info: FrontendInfo } | null;
  /** apm-runtime 守护进程托管句柄（AI 执行面，随 server 启动自动拉起） */
  daemon: RuntimeDaemonHandle | null;
  /** 初始化（db push 等）失败的最新错误；null = 未失败。前端 init 页经 getInitStatus 消费。 */
  initError: string | null;
  /** 首装校验：true = ~/.apm 无既有密钥与数据库（全新安装）。启动时迁移与 ensureSecrets 之间检测。 */
  isFirstInstall: boolean;
  /**
   * 认证窗（登录态紧凑小窗，CAP-A-14 切片）：非 null = 前端正处认证面
   * （/login·/register·/welcome），认证面由独立紧凑无边框窗承载（形态创建时定死，
   * Electron 无运行时 titleBarStyle 切换 API），主窗此时隐藏。
   */
  authWindow: BrowserWindow | null;
  /** 退出中标志（before-quit / powerMonitor.shutdown 置位）：窗口 close 不再转托盘隐藏 */
  isQuitting: boolean;
}

export const state: AppState = {
  config: null as unknown as AppConfig,
  backend: null,
  frontend: null,
  daemon: null,
  initError: null,
  isFirstInstall: false,
  authWindow: null,
  isQuitting: false,
};

export function setInitError(error: string | null): void {
  state.initError = error;
}

export function stopAllProcesses(): Promise<void[]> {
  const stops: Array<Promise<void>> = [];
  if (state.backend) {
    stops.push(state.backend.handle.stop());
    state.backend = null;
  }
  if (state.frontend) {
    stops.push(state.frontend.handle.stop());
    state.frontend = null;
  }
  if (state.daemon) {
    stops.push(state.daemon.stop());
    state.daemon = null;
  }
  return Promise.all(stops);
}
