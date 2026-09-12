/**
 * desktop IPC 命令面（翻译自 Tauri src-tauri/src/commands/mod.rs，13 命令一比一）。
 * 命令名沿用 Tauri snake_case（前端 invoke('get_backend_status') 字面参数不变）；
 * 返回数据字段名一律 camelCase（前端接口契约，见 state.ts 顶部说明）。
 */
import { BrowserWindow, dialog, shell } from 'electron';
import fs from 'node:fs';
import net from 'node:net';
import pkg from '../../package.json';
import {
  pickBackendPort,
  resolveTransport,
  startServerProcess,
  waitForBackendHealth,
} from './backend';
import { isDevMode, type AppConfig } from './config';
import {
  clearDesktopStateKeys,
  loadDesktopState,
  saveDesktopState,
  type DesktopPersistentState,
} from './desktop-state';
import { logger } from './logger';
import {
  getRuntimeDaemonStatus,
  readWorkspaceRoots,
  startRuntimeDaemon,
  stopRuntimeDaemon,
  writeWorkspaceRoots,
} from './runtime-daemon';
import { initializeDirs, resolveNodeExe, runDbPushIfNeeded } from './setup';
import { state, setInitError, type BackendInfo, type FrontendInfo } from './state';

const FRONTEND_DEV_PORT = 5173;

interface InitStatus {
  error: string | null;
}

interface AppInfo {
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

interface ActionResult {
  ok: boolean;
  error?: string;
}

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(200);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => resolve(false));
  });
}

function assertInitDone(): void {
  if (state.initError) {
    throw new Error(`初始化未完成: ${state.initError}`);
  }
}

function assertServerEntryExists(): void {
  if (!fs.existsSync(state.config.serverEntry)) {
    throw new Error(`未找到后端入口文件: ${state.config.serverEntry}`);
  }
}

async function startBackendInternal(): Promise<BackendInfo> {
  if (state.backend) {
    throw new Error('后端已在运行');
  }
  assertInitDone();
  assertServerEntryExists();

  const config: AppConfig = state.config;
  const port = await pickBackendPort(config.defaultPort, config.maxPort);
  const transport = resolveTransport();

  try {
    const { handle } = await startAndWaitHealth(config, port, transport);
    const apiBaseUrl = `http://127.0.0.1:${port}`;
    const info: BackendInfo = { port, apiBaseUrl, pid: handle.pid };
    state.backend = { handle, info };
    logger.info(`后端启动成功: ${apiBaseUrl}`);
    return info;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // utility 承载偶发静默失败（实测：强杀重启后杀毒软件短暂锁 dist 文件，fork 后零输出）——
    // 未产出任何日志即健康检查失败时，自动降级 node 路径重试一次
    if (transport === 'utility' && !(err as Error & { sawOutput?: boolean }).sawOutput) {
      const { handle: fallback } = await startAndWaitHealth(config, port, 'node');
      const apiBaseUrl = `http://127.0.0.1:${port}`;
      const info: BackendInfo = { port, apiBaseUrl, pid: fallback.pid };
      state.backend = { handle: fallback, info };
      logger.warn(`utility 承载失败（${message}），已降级 node 承载并启动成功: ${apiBaseUrl}`);
      return info;
    }
    throw new Error(`后端启动失败: ${message}`);
  }
}

async function startAndWaitHealth(config: AppConfig, port: number, transport: 'utility' | 'node') {
  if (transport === 'node') {
    // 路径 A 需要可用 node 运行时（打包模式=随包 node.exe，缺失即报可操作错误）
    resolveNodeExe(config);
  }
  const handle = startServerProcess(config, port, transport);
  const apiBaseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForBackendHealth(apiBaseUrl);
  } catch (err) {
    const sawOutput = handle.sawOutput();
    await handle.stop();
    const wrapped = new Error(
      `后端健康检查失败: ${err instanceof Error ? err.message : String(err)}`,
    ) as Error & { sawOutput: boolean };
    wrapped.sawOutput = sawOutput;
    throw wrapped;
  }
  return { handle };
}

export const commandHandlers = {
  async get_app_info(): Promise<AppInfo> {
    return {
      version: pkg.version,
      tauri: `electron@${process.versions.electron}`,
      rust: `node@${process.versions.node}`,
      os: process.platform,
      apiBaseUrl: state.backend?.info.apiBaseUrl ?? '',
      frontendUrl: state.frontend?.info.url ?? '',
      dataPath: state.config.userDataDir,
      logPath: state.config.logsDir,
      mode: isDevMode() ? 'development' : 'production',
    };
  },

  async get_init_status(): Promise<InitStatus> {
    return { error: state.initError };
  },

  async get_backend_status() {
    const backend = state.backend;
    return { running: !!backend, info: backend?.info };
  },

  async get_frontend_status() {
    const frontend = state.frontend;
    if (frontend) {
      return { running: true, info: frontend.info };
    }
    // 开发模式：vite dev server（5173）由开发者自行运行，探测可用性即视为 running
    if (isDevMode() && (await portInUse(FRONTEND_DEV_PORT))) {
      return {
        running: true,
        info: {
          port: FRONTEND_DEV_PORT,
          url: `http://localhost:${FRONTEND_DEV_PORT}`,
          pid: 0,
        } satisfies FrontendInfo,
      };
    }
    return { running: false };
  },

  async start_backend(): Promise<BackendInfo> {
    return startBackendInternal();
  },

  async stop_backend(): Promise<ActionResult> {
    if (state.backend) {
      await state.backend.handle.stop();
      state.backend = null;
      logger.info('后端已停止');
    }
    return { ok: true };
  },

  async restart_backend(): Promise<BackendInfo> {
    if (state.backend) {
      await state.backend.handle.stop();
      state.backend = null;
    }
    return startBackendInternal();
  },

  async start_frontend(): Promise<FrontendInfo> {
    if (state.frontend) {
      throw new Error('前端已在运行');
    }
    if (!isDevMode()) {
      // 生产模式：前端由窗口直接加载 server 托管页面，无独立前端进程
      throw new Error('生产模式前端由应用内嵌，无需单独启动');
    }
    if (!(await portInUse(FRONTEND_DEV_PORT))) {
      throw new Error(
        `未检测到前端开发服务器（端口 ${FRONTEND_DEV_PORT}）。请先在仓库根目录运行 pnpm dev。`,
      );
    }
    // vite 由开发者进程持有，壳不接管其生命周期
    return { port: FRONTEND_DEV_PORT, url: `http://localhost:${FRONTEND_DEV_PORT}`, pid: 0 };
  },

  async stop_frontend(): Promise<ActionResult> {
    if (state.frontend) {
      await state.frontend.handle.stop();
      state.frontend = null;
    }
    return { ok: true };
  },

  async start_all_services(): Promise<ActionResult> {
    // 开发模式下 vite 由开发者自行启动（pnpm dev），壳只托管 server——与 Tauri 版
    // 「壳拉起 vite」不同，见 README dev 工作流说明。
    await startBackendInternal();
    return { ok: true };
  },

  async stop_all_services(): Promise<ActionResult> {
    if (state.backend) {
      await state.backend.handle.stop();
      state.backend = null;
    }
    if (state.frontend) {
      await state.frontend.handle.stop();
      state.frontend = null;
    }
    logger.info('所有服务已停止');
    return { ok: true };
  },

  async open_log_dir(): Promise<ActionResult> {
    const logPath = state.config.logsDir;
    fs.mkdirSync(logPath, { recursive: true });
    const err = await shell.openPath(logPath);
    if (err) {
      throw new Error(`打开日志目录失败: ${err}`);
    }
    logger.info(`已打开日志目录: ${logPath}`);
    return { ok: true };
  },

  async init_app(): Promise<ActionResult> {
    // 与启动时的后台初始化走同一条 setup 路径；失败写回 initError 供 init 页展示
    try {
      initializeDirs(state.config);
      runDbPushIfNeeded(state.config);
      setInitError(null);
      logger.info('应用初始化完成');
      return { ok: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`应用初始化失败: ${message}`);
      setInitError(message);
      throw new Error(message);
    }
  },

  // ---------- 会话跨 origin 持久化（动态端口漂移下 localStorage 隔离的兜底） ----------

  async get_desktop_state(): Promise<DesktopPersistentState> {
    return loadDesktopState(state.config.userDataDir);
  },

  async set_desktop_state(args?: Partial<DesktopPersistentState>): Promise<DesktopPersistentState> {
    return saveDesktopState(state.config.userDataDir, args ?? {});
  },

  async clear_desktop_state(args?: { keys?: string[] }): Promise<DesktopPersistentState> {
    return clearDesktopStateKeys(
      state.config.userDataDir,
      args?.keys ?? ['access_token', 'apm-workspace-id', 'onboarding_completed'],
    );
  },

  // ---------- apm-runtime 守护进程（AI 执行面） ----------

  async get_runtime_daemon_status(): Promise<ReturnType<typeof getRuntimeDaemonStatus>> {
    return getRuntimeDaemonStatus();
  },

  async start_runtime_daemon(): Promise<{ pid: number }> {
    const port = state.backend?.info.port;
    if (!port) {
      throw new Error('后端未运行，守护进程无从注册——请先启动本地服务');
    }
    return startRuntimeDaemon(port);
  },

  async stop_runtime_daemon(): Promise<ActionResult> {
    await stopRuntimeDaemon();
    return { ok: true };
  },

  async get_workspace_roots(): Promise<{ roots: string[] }> {
    return { roots: readWorkspaceRoots(state.config) };
  },

  async set_workspace_roots(args?: { roots?: string[] }): Promise<{ roots: string[] }> {
    return { roots: writeWorkspaceRoots(state.config, args?.roots ?? []) };
  },

  /** 原生目录选择器（初始化向导「工作目录」步骤）；取消返回 null。 */
  async choose_directory(args?: { title?: string }): Promise<{ path: string | null }> {
    const win = BrowserWindow.getAllWindows()[0];
    const result = await dialog.showOpenDialog(win, {
      title: args?.title ?? '选择工作目录',
      properties: ['openDirectory', 'createDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { path: null };
    }
    return { path: result.filePaths[0] };
  },

  async toggle_devtools(): Promise<ActionResult> {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      return { ok: false };
    }
    if (win.webContents.isDevToolsOpened()) {
      win.webContents.closeDevTools();
    } else {
      win.webContents.openDevTools({ mode: 'detach' });
    }
    return { ok: true };
  },
};

export type DesktopCommand = keyof typeof commandHandlers;
