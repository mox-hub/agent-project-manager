/**
 * Electron 主进程入口（翻译自 Tauri src-tauri/src/lib.rs 的编排职责）。
 * 启动顺序：目录/密钥（同步毫秒级）→ 窗口（品牌启动屏）→ 后台 db push →
 * 自动拉起 server → 健康检查通过 → 自动拉起 apm-runtime 守护进程 → 切换到正式页面。
 * 窗口加载源：dev 优先 vite（5173，HMR）；否则 server 静态托管的前端（同源免 CORS，
 * server 侧自带 SPA history fallback）。
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import net from 'node:net';
import path from 'node:path';
import { commandHandlers } from './commands';
import { isDevMode, resolveAppConfig } from './config';
import { bootErrorScript, bootScreenUrl, bootStatusScript } from './loading';
import { initLogger, logger } from './logger';
import { startRuntimeDaemon } from './runtime-daemon';
import { ensureSecrets, initializeDirs, runDbPushIfNeeded } from './setup';
import { setInitError, state, stopAllProcesses } from './state';

const FRONTEND_DEV_PORT = 5173;

let mainWindow: BrowserWindow | null = null;

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

/**
 * 启动屏阶段文案。did-finish-load 前先缓冲（data URL 文档尚未就绪），就绪后直通
 * executeJavaScript 原地更新——不重新 loadURL，避免闪屏。
 */
let bootScreenReady = false;
let bootStatus = { message: '正在启动…', detail: '' };

function setBootStatus(message: string, detail = ''): void {
  bootStatus = { message, detail };
  if (bootScreenReady && mainWindow) {
    void mainWindow.webContents.executeJavaScript(bootStatusScript(message, detail), true);
  }
}

function showBootError(message: string, detail = ''): void {
  logger.error(`${message}${detail ? `: ${detail}` : ''}`);
  if (mainWindow) {
    void mainWindow.webContents.executeJavaScript(bootErrorScript(message, detail), true);
  }
}

/** 调试模式：dev 自动开；打包版经 --devtools 参数或 APM_DESKTOP_DEBUG=1 打开（v0.6.1 体验切片）。 */
function shouldAutoOpenDevTools(): boolean {
  return (
    isDevMode() ||
    process.argv.includes('--devtools') ||
    process.env.APM_DESKTOP_DEBUG === '1'
  );
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    show: false,
    title: 'Agent Project Manager',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // contextIsolation / sandbox / no-nodeIntegration 均为 Electron 默认安全基线，显式声明防回归
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.once('ready-to-show', () => mainWindow?.show());
  mainWindow.webContents.once('did-finish-load', () => {
    bootScreenReady = true;
    setBootStatus(bootStatus.message, bootStatus.detail);
  });
  // F12 / Ctrl+Shift+I 随时开关 DevTools（打包版调试模式入口，命令面另有 toggle_devtools）
  mainWindow.webContents.on('before-input-event', (_event, input) => {
    const isF12 = input.type === 'keyDown' && input.key === 'F12';
    const isDevToolsChord =
      input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i';
    if (isF12 || isDevToolsChord) {
      const wc = mainWindow?.webContents;
      if (wc) {
        if (wc.isDevToolsOpened()) {
          wc.closeDevTools();
        } else {
          wc.openDevTools({ mode: 'detach' });
        }
      }
    }
  });
  mainWindow.loadURL(bootScreenUrl());
  mainWindow.on('closed', () => {
    mainWindow = null;
    bootScreenReady = false;
  });
}

async function loadAppSurface(): Promise<void> {
  const win = mainWindow;
  if (!win) {
    return;
  }
  let target: string;
  if (isDevMode() && (await portInUse(FRONTEND_DEV_PORT))) {
    target = `http://localhost:${FRONTEND_DEV_PORT}`;
  } else if (state.backend) {
    target = state.backend.info.apiBaseUrl;
  } else {
    throw new Error('无可用的前端加载源（server 未启动且开发服务器未运行）');
  }
  await win.loadURL(target);
  logger.info(`窗口已加载: ${target}`);
}

/** server 健康后自动拉起 apm-runtime 守护进程；失败仅记日志，不阻断主流程（设置页可手动重试）。 */
async function autoStartRuntimeDaemon(): Promise<void> {
  const port = state.backend?.info.port;
  if (!port) {
    return;
  }
  try {
    await startRuntimeDaemon(port);
  } catch (err) {
    logger.warn(
      `守护进程自动启动失败（不影响本地服务主流程）: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

async function bootstrapServer(): Promise<void> {
  try {
    setBootStatus('正在准备数据目录…');
    try {
      runDbPushIfNeeded(state.config);
      setInitError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setInitError(message);
      logger.error(`应用初始化失败: ${message}`);
    }

    if (state.initError) {
      throw new Error(`应用初始化失败: ${state.initError}`);
    }

    setBootStatus('正在启动本地服务…', '首次启动需要初始化数据库，可能需要一小会儿');
    await commandHandlers.start_all_services();

    setBootStatus('正在连接 AI 执行运行时…');
    await autoStartRuntimeDaemon();

    setBootStatus('正在加载界面…');
    await loadAppSurface();
    logger.info('应用启动完成');
  } catch (err) {
    showBootError(err instanceof Error ? err.message : String(err), `数据目录：${state.config.userDataDir}\n日志：${state.config.logsDir}`);
  }
}

function registerIpc(): void {
  ipcMain.handle('desktop:command', (_event, cmd: string, args?: Record<string, unknown>) => {
    const handler = (commandHandlers as Record<string, (a?: unknown) => unknown>)[cmd];
    if (!handler) {
      throw new Error(`未知命令: ${cmd}`);
    }
    return handler(args);
  });
}

app.whenReady().then(() => {
  const config = resolveAppConfig();
  initLogger(config.logsDir);
  logger.info(
    `desktop 壳启动: mode=${isDevMode() ? 'development' : 'production'} transport=${
      process.env.APM_SERVER_TRANSPORT ?? 'utility'
    } devtools=${shouldAutoOpenDevTools() ? 'on' : 'off'}`,
  );

  // 目录与密钥同步就绪（毫秒级）——服务启动与 db push 都依赖它们，不与后台初始化竞态
  initializeDirs(config);
  ensureSecrets(config);
  state.config = config;

  registerIpc();
  createWindow();
  void bootstrapServer();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('before-quit', () => {
  // 退出时杀掉全部托管子进程（server + 守护进程），避免任务管理器残留
  void stopAllProcesses();
});
