/**
 * Electron 主进程入口（翻译自 Tauri src-tauri/src/lib.rs 的编排职责）。
 * 启动顺序：目录/密钥（同步毫秒级）→ 窗口（loading 页）→ 后台 db push →
 * 自动拉起 server → 健康检查通过后窗口切换到正式页面。
 * 窗口加载源：dev 优先 vite（5173，HMR）；否则 server 静态托管的前端（同源免 CORS，
 * server 侧自带 SPA history fallback）。
 */
import { app, BrowserWindow, ipcMain } from 'electron';
import net from 'node:net';
import path from 'node:path';
import { commandHandlers } from './commands';
import { isDevMode, resolveAppConfig } from './config';
import { initLogger, logger } from './logger';
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

function pageUrl(title: string, detail: string): string {
  const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<title>${title}</title><style>
body{font-family:system-ui,sans-serif;background:#0d1117;color:#e6edf3;display:flex;
min-height:100vh;align-items:center;justify-content:center;margin:0}
main{text-align:center;max-width:560px;padding:32px}
h1{font-size:18px;font-weight:600;margin:0 0 12px}
p{font-size:13px;line-height:1.7;color:#8b949e;white-space:pre-wrap;word-break:break-all;margin:0}
.spin{width:28px;height:28px;margin:0 auto 20px;border:3px solid #30363d;
border-top-color:#58a6ff;border-radius:50%;animation:s 1s linear infinite}
@keyframes s{to{transform:rotate(360deg)}}
.hidden{display:none}</style></head>
<body><main><div class="spin${detail ? ' hidden' : ''}"></div>
<h1>${title}</h1><p>${detail}</p></main></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
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
  mainWindow.loadURL(pageUrl('正在启动 Agent Project Manager…', ''));
  mainWindow.on('closed', () => {
    mainWindow = null;
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

function showFatalError(message: string): void {
  logger.error(message);
  const win = mainWindow;
  if (!win) {
    return;
  }
  void win.loadURL(
    pageUrl('启动失败', `${message}\n\n可点击托盘/日志目录查看 desktop-main.log 排查。\n数据目录：${state.config.userDataDir}`),
  );
}

async function bootstrapServer(): Promise<void> {
  try {
    try {
      runDbPushIfNeeded(state.config);
      setInitError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setInitError(message);
      logger.error(`应用初始化失败: ${message}`);
    }

    if (!state.initError) {
      await commandHandlers.start_all_services();
    }
    await loadAppSurface();
    logger.info('应用启动完成');
  } catch (err) {
    showFatalError(err instanceof Error ? err.message : String(err));
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
    }`,
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
  // 退出时杀掉全部托管子进程，避免 server 在任务管理器残留（kill() 为终止信号即返回）
  void stopAllProcesses();
});
