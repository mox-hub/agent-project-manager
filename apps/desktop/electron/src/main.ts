/**
 * Electron 主进程入口（翻译自 Tauri src-tauri/src/lib.rs 的编排职责）。
 * 启动顺序：目录/密钥（同步毫秒级）→ 窗口（品牌启动屏）→ 后台 db push →
 * 自动拉起 server → 健康检查通过 → 自动拉起 apm-runtime 守护进程 → 切换到正式页面。
 * 窗口加载源：dev 优先 vite（5173，HMR）；否则 server 静态托管的前端（同源免 CORS，
 * server 侧自带 SPA history fallback）。
 * 生命周期强化（ADR-015）：单实例锁防双开抢 ~/.apm；关窗最小化到托盘（服务保活）；
 * server/daemon 意外退出自动重启（指数退避+熔断）；渲染进程崩溃白屏自动重载。
 */
import { app, BrowserWindow, ipcMain, shell } from 'electron';
import net from 'node:net';
import path from 'node:path';
import { commandHandlers } from './commands';
import { isDevMode, resolveAppConfig } from './config';
import { bootErrorScript, bootScreenUrl, bootStatusScript } from './loading';
import { initLogger, logger } from './logger';
import { startRuntimeDaemon } from './runtime-daemon';
import {
  detectFirstInstall,
  ensureSecrets,
  initializeDirs,
  migrateLegacyUserData,
  runDbPushIfNeeded,
} from './setup';
import { createTray, hasTray } from './tray';
import { checkForUpdates, initAutoUpdater } from './updater';
import { setInitError, state, stopAllProcesses } from './state';
import { loadDesktopState, saveDesktopState } from './desktop-state';

const FRONTEND_DEV_PORT = 5173;

const config = resolveAppConfig();
// Chromium 自身 profile（缓存/LocalStorage）收敛到 ~/.apm/electron 子目录，
// 避免缓存文件污染项目数据根；官方要求在 ready 前设置，故放模块顶层
app.setPath('userData', path.join(config.userDataDir, 'electron'));

let mainWindow: BrowserWindow | null = null;
/** 区分「用户退出」与「关窗常驻」：仅 before-quit（含托盘退出/quitAndInstall）置位 */
let isQuitting = false;

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

function showMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

/** 关窗前持久化窗口位置尺寸（正常态 bounds；最大化只记还原后区域）。 */
function persistWindowBounds(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  try {
    saveDesktopState(config.userDataDir, { window_bounds: mainWindow.getNormalBounds() });
  } catch (err) {
    logger.warn(`窗口状态保存失败: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function createWindow(): void {
  const saved = loadDesktopState(config.userDataDir).window_bounds;
  const bounds =
    saved &&
    Number.isFinite(saved.x) &&
    Number.isFinite(saved.y) &&
    Number.isFinite(saved.width) &&
    Number.isFinite(saved.height) &&
    saved.width > 0 &&
    saved.height > 0
      ? saved
      : null;
  mainWindow = new BrowserWindow({
    width: bounds?.width ?? 1440,
    height: bounds?.height ?? 900,
    x: bounds?.x,
    y: bounds?.y,
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
  // 页面内导航白名单：仅本应用源（server 托管前端 / dev vite）。其余（被注入后的
  // 跳转、外链）一律转系统浏览器，防止渲染进程被劫持后整页导航到钓鱼站
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const backendBase = state.backend?.info.apiBaseUrl ?? '';
    const allowed = [backendBase, `http://localhost:${FRONTEND_DEV_PORT}`, 'about:blank'];
    if (allowed.some((base) => base && url.startsWith(base))) {
      return;
    }
    event.preventDefault();
    logger.warn(`拦截页内导航: ${url}（已转系统浏览器打开）`);
    void shell.openExternal(url);
  });
  // 渲染进程崩溃白屏自愈：直接重载；60s 内 ≥3 次熔断（防 crash loop），只报错
  let rendererCrashCount = 0;
  let rendererCrashWindowStart = 0;
  mainWindow.webContents.on('render-process-gone', (_event, details) => {
    const now = Date.now();
    if (now - rendererCrashWindowStart > 60_000) {
      rendererCrashCount = 0;
      rendererCrashWindowStart = now;
    }
    rendererCrashCount += 1;
    logger.error(`渲染进程崩溃: ${details.reason}（窗口内第 ${rendererCrashCount} 次）`);
    if (rendererCrashCount <= 3 && mainWindow && !mainWindow.isDestroyed()) {
      void mainWindow.loadURL(bootScreenUrl()).then(() => loadAppSurface());
    }
  });
  // 关闭语义（ADR-015）：托盘存在且偏好为常驻（默认）→ 隐藏窗口服务保活；否则真退出
  mainWindow.on('close', (event) => {
    persistWindowBounds();
    const closeToTray = loadDesktopState(config.userDataDir).close_to_tray !== false;
    if (!isQuitting && closeToTray && hasTray()) {
      event.preventDefault();
      mainWindow?.hide();
      logger.info('窗口已最小化到托盘（服务保活中）');
    }
  });
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
    // IPC 面轻校验（ADR-015）：命令面已有 handler 白名单，这里补参数形状防线——
    // 类型/体积上限 + 原型污染键拒绝；深递归校验不做（handler 各自按契约消费）
    if (typeof cmd !== 'string' || !cmd) {
      throw new Error('非法命令名');
    }
    if (args !== undefined) {
      if (typeof args !== 'object' || args === null || Array.isArray(args)) {
        throw new Error('命令参数必须是对象');
      }
      if (JSON.stringify(args).length > 65_536) {
        throw new Error('命令参数过大');
      }
      for (const key of Object.keys(args)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          throw new Error(`非法参数键: ${key}`);
        }
      }
    }
    const handler = (commandHandlers as Record<string, (a?: unknown) => unknown>)[cmd];
    if (!handler) {
      throw new Error(`未知命令: ${cmd}`);
    }
    return handler(args);
  });
}

function registerGlobalErrorHandlers(): void {
  // 主进程异常兜底（ADR-015）：吞掉继续跑（Electron 默认弹崩溃对话框打断用户）；
  // 记入日志供诊断包消费。进程级 crashReporter 符号化不在本轮范围。
  process.on('uncaughtException', (err) => {
    logger.error(`主进程未捕获异常: ${err.stack ?? err.message}`);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error(`主进程未处理的 Promise 拒绝: ${reason instanceof Error ? reason.stack : String(reason)}`);
  });
}

function bootstrap(): void {
  initLogger(config.logsDir);
  logger.info(
    `desktop 壳启动: mode=${isDevMode() ? 'development' : 'production'} transport=${
      process.env.APM_SERVER_TRANSPORT ?? 'utility'
    } devtools=${shouldAutoOpenDevTools() ? 'on' : 'off'} dataDir=${config.userDataDir}`,
  );

  // 旧版数据迁移（v0.6.1 %APPDATA% → ~/.apm）先行，之后首装校验才准确
  migrateLegacyUserData(config, path.join(app.getPath('appData'), 'agent-project-manager'));
  // 目录与密钥同步就绪（毫秒级）——服务启动与 db push 都依赖它们，不与后台初始化竞态
  initializeDirs(config);
  state.isFirstInstall = detectFirstInstall(config);
  if (state.isFirstInstall) {
    logger.info('首装校验：未检测到既有数据，本次为全新安装');
  }
  ensureSecrets(config);
  state.config = config;

  initAutoUpdater();
  registerIpc();
  registerGlobalErrorHandlers();
  createWindow();
  void bootstrapServer();
}

// 单实例锁（ADR-015）：双开会各自拉起 server 抢同一 ~/.apm（SQLite 锁/守护进程锁/
// 端口漂移第二套服务），必须拒绝——第二实例直接退出，并唤起已有实例窗口
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => showMainWindow());

  app.whenReady().then(() => {
    bootstrap();
    // 托盘在 bootstrap 之后创建（依赖 logger 与配置就绪）；关闭语义按 hasTray 回退
    createTray({
      showMainWindow,
      // 托盘触发检查后弹主窗口展示结果（设置页更新状态卡）
      checkUpdates: () => {
        void checkForUpdates().then(() => showMainWindow());
      },
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('before-quit', () => {
    isQuitting = true;
    // 退出时杀掉全部托管子进程（server + 守护进程），避免任务管理器残留
    void stopAllProcesses();
  });
}
