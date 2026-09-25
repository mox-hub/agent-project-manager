/**
 * 双窗编排（CAP-A-14 登录态紧凑窗口切片）。
 *
 * Electron 无运行时 titleBarStyle 切换 API（窗口形态创建时定死），认证面
 * （/login·/register·/welcome）的「紧凑小窗 + 隐藏标题栏」由独立认证窗承载：
 * - 主窗（正常形态）：工作台，深链/托盘/崩溃自愈等主体职责不变；
 * - 认证窗（1040×700 无边框 + WCO 窗口控制钮）：仅承载认证面，与主窗共享
 *   同一 session（localStorage/token 天然互通），进出认证面经 set_compact_mode 切窗。
 */
import { BrowserWindow, shell } from 'electron';
import net from 'node:net';
import path from 'node:path';
import { isDevMode } from './config';
import { bootScreenUrl } from './loading';
import { logger } from './logger';
import { state } from './state';

export const FRONTEND_DEV_PORT = 5173;

/**
 * 认证窗尺寸：贴住翻转认证卡（max-w-4xl=896 + p-6 呼吸边距 48）；
 * 高 = 卡 min-h-130(520) + 垂直边距与 boot 页余量。
 */
export const AUTH_WINDOW_WIDTH = 944;
export const AUTH_WINDOW_HEIGHT = 620;

export function portInUse(port: number): Promise<boolean> {
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

/** 前端加载源：dev 优先 vite（HMR），否则 server 托管（同源免 CORS + SPA history fallback） */
export async function resolveFrontendTarget(): Promise<string> {
  if (isDevMode() && (await portInUse(FRONTEND_DEV_PORT))) {
    return `http://localhost:${FRONTEND_DEV_PORT}`;
  }
  if (state.backend) {
    return state.backend.info.apiBaseUrl;
  }
  throw new Error('无可用的前端加载源（server 未启动且开发服务器未运行）');
}

/** 认证窗期间的崩溃白屏自愈：回 boot 屏再重载前端（与主窗同策略） */
function reloadAuthWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) {
    return;
  }
  void win
    .loadURL(bootScreenUrl())
    .then(() => resolveFrontendTarget())
    .then((target) => win.loadURL(target))
    .catch((err: unknown) => {
      logger.error(`认证窗重载失败: ${err instanceof Error ? err.message : String(err)}`);
    });
}

/**
 * webContents 安全基线与自愈（主窗/认证窗共用）：外链转系统浏览器、
 * 渲染进程崩溃重载（60s 内 ≥3 次熔断）、F12/Ctrl+Shift+I DevTools。
 */
export function hardenWebContents(
  win: BrowserWindow,
  onCrashReload: (win: BrowserWindow) => void,
): void {
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => {
    const backendBase = state.backend?.info.apiBaseUrl ?? '';
    const allowed = [backendBase, `http://localhost:${FRONTEND_DEV_PORT}`, 'about:blank'];
    if (allowed.some((base) => base && url.startsWith(base))) {
      return;
    }
    event.preventDefault();
    logger.warn(`拦截页内导航: ${url}（已转系统浏览器打开）`);
    void shell.openExternal(url);
  });
  let crashCount = 0;
  let crashWindowStart = 0;
  win.webContents.on('render-process-gone', (_event, details) => {
    const now = Date.now();
    if (now - crashWindowStart > 60_000) {
      crashCount = 0;
      crashWindowStart = now;
    }
    crashCount += 1;
    logger.error(
      `渲染进程崩溃（${win === state.authWindow ? '认证窗' : '主窗'}）: ${details.reason}（窗口内第 ${crashCount} 次）`,
    );
    if (crashCount <= 3 && !win.isDestroyed()) {
      onCrashReload(win);
    }
  });
  // F12 / Ctrl+Shift+I 随时开关 DevTools（打包版调试模式入口，命令面另有 toggle_devtools）
  win.webContents.on('before-input-event', (_event, input) => {
    const isF12 = input.type === 'keyDown' && input.key === 'F12';
    const isDevToolsChord =
      input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i';
    if (isF12 || isDevToolsChord) {
      const wc = win.webContents;
      if (wc.isDevToolsOpened()) {
        wc.closeDevTools();
      } else {
        wc.openDevTools({ mode: 'detach' });
      }
    }
  });
}

/** 认证窗（紧凑无边框）：形态创建时定死；WCO 提供原生最小化/关闭钮，拖动由前端认证卡片承担 */
export function createAuthWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: AUTH_WINDOW_WIDTH,
    height: AUTH_WINDOW_HEIGHT,
    show: false,
    center: true,
    title: 'Agent Project Manager',
    autoHideMenuBar: true,
    resizable: false,
    maximizable: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: '#00000000', symbolColor: '#94a3b8', height: 36 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // contextIsolation / sandbox / no-nodeIntegration 均为 Electron 默认安全基线，显式声明防回归
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  state.authWindow = win;
  hardenWebContents(win, reloadAuthWindow);
  // 关闭语义与主窗一致（ADR-015）：托盘常驻默认开 → 隐藏窗口服务保活（认证中服务仍在拉起）；
  // isQuitting 守卫防 before-quit 退出路径被 preventDefault 阻断
  win.on('close', (event) => {
    if (!state.isQuitting) {
      event.preventDefault();
      win.hide();
      logger.info('认证窗已隐藏（服务保活中，可从托盘唤回）');
    }
  });
  win.on('closed', () => {
    if (state.authWindow === win) {
      state.authWindow = null;
    }
  });
  return win;
}

/**
 * 主窗工厂（main.ts 注册）：认证窗启动的进程（壳侧无会话镜像）主窗从未创建，
 * 登录成功切回时必须现建主窗——否则销毁认证窗后所有窗口归零，window-all-closed
 * → app.quit() 会把整个应用带退（实机「启动即闪退」根因）。
 */
let mainWindowFactory: (() => BrowserWindow) | null = null;

export function registerMainWindowFactory(factory: () => BrowserWindow): void {
  mainWindowFactory = factory;
}

/**
 * 退出紧凑态防抖：认证面之间的路由切换（boot→login）会先卸载旧页发 false、
 * 再挂载新页发 true——立即执行会切回大窗再重载认证窗（闪窗+初始化重跑）。
 * false 延迟执行，期间 true 到来即取消。
 */
const COMPACT_EXIT_DEBOUNCE_MS = 250;
let pendingCompactExit: NodeJS.Timeout | null = null;

function exitCompactSurface(): void {
  pendingCompactExit = null;
  if (state.isQuitting) {
    return;
  }
  const auth = state.authWindow;
  if (!auth) {
    return;
  }
  state.authWindow = null;
  let main = BrowserWindow.getAllWindows().find((w) => w !== auth && !w.isDestroyed());
  if (!main && mainWindowFactory) {
    main = mainWindowFactory();
    logger.info('主窗不存在（认证窗启动进程），已现建主窗');
  }
  void (async () => {
    try {
      if (main) {
        const target = await resolveFrontendTarget();
        await main.loadURL(target);
        main.show();
        main.focus();
        logger.info(`已回到主窗: ${target}`);
      }
    } finally {
      // loadURL 失败也必须销毁认证窗：state.authWindow 已置空，留着即成不可达的隐藏窗
      auth.destroy();
    }
  })();
}

/**
 * 认证面进出切窗（前端 set_compact_mode 命令的实现体）。
 * 进入：隐藏主窗（登录前大窗不得可见），开认证窗加载前端并显示；
 * 退出：主窗重载前端（登录态已更新）并显示（无主窗则经工厂现建），认证窗销毁。
 * 两端幂等（重复进入/退出直接返回）。
 */
export async function switchAuthSurface(enabled: boolean): Promise<void> {
  if (enabled) {
    if (pendingCompactExit) {
      clearTimeout(pendingCompactExit);
      pendingCompactExit = null;
    }
    const existing =
      state.authWindow && !state.authWindow.isDestroyed() ? state.authWindow : null;
    // 进入认证面：主窗隐藏让位小窗。壳侧 token 镜像可能早于前端会话失效
    // （desktop-state.json 有 access_token 但前端已 401 跳登录）——主窗以主窗
    // 启动却停在认证面，不隐藏则大窗残留在登录页后面（实机「登录前大窗出现」根因）
    for (const win of BrowserWindow.getAllWindows()) {
      if (win !== existing) {
        win.hide();
      }
    }
    if (existing) {
      return;
    }
    const auth = createAuthWindow();
    const target = await resolveFrontendTarget();
    await auth.loadURL(target);
    auth.show();
    logger.info(`认证窗已显示（紧凑模式）: ${target}`);
    return;
  }
  // 退出：防抖执行（认证面间路由切换的 false→true 连发只算一次，且被 true 取消）
  if (pendingCompactExit) {
    return;
  }
  pendingCompactExit = setTimeout(() => exitCompactSurface(), COMPACT_EXIT_DEBOUNCE_MS);
}
