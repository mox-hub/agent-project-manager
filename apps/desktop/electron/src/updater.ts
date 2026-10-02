/**
 * 自动更新（electron-updater + GitHub Releases feed，ADR-015 推翻 ADR-014「不自动更新」边界）。
 * 消费端策略：打包模式启动 30s 后静默首轮检查（避开冷启动窗口）；下载自动进行；
 * 下载完成弹窗询问立即重启安装，未确认则退出时自动安装。dev / 未打包无 app-update.yml，
 * 直接禁用（ initialized=false，检查请求优雅返回 idle）。
 * 发布端 = desktop-release.yml（tag v* → draft Release：exe+blockmap+latest.yml → 人工
 * Publish）；feed 缺失时更新检查落 error 状态，不影响主流程。代码签名未启用（单独裁决）。
 * 状态广播：main.ts 注册 broadcaster（activeWindow → webContents.send），设置页实时
 * 消费进度；releaseNotes 取 Release body 随状态透传。
 */
import { app, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import { logger } from './logger';

export interface UpdateStatus {
  state:
    | 'idle'
    | 'checking'
    | 'available'
    | 'not-available'
    | 'downloading'
    | 'downloaded'
    | 'error';
  /** 检测到/已下载的新版本号 */
  version?: string;
  /** 下载进度（0-100） */
  progress?: number;
  /** 更新日志（GitHub Release body；update-available/downloaded 时携带） */
  releaseNotes?: string;
  error?: string;
}

let status: UpdateStatus = { state: 'idle' };
let initialized = false;
let installPromptOpen = false;

/** 状态广播回调（main.ts 注入；updater 不反向依赖窗口层） */
let broadcaster: ((status: UpdateStatus) => void) | null = null;
/** 下载进度高频事件节流（同状态同进度流合并，150ms 内只广播一帧；状态切换不节流） */
let lastProgressSentAt = 0;

export function setUpdateStatusBroadcaster(fn: (status: UpdateStatus) => void): void {
  broadcaster = fn;
}

function broadcast(next: UpdateStatus): void {
  if (!broadcaster) {
    return;
  }
  if (next.state === 'downloading' && status.state === 'downloading') {
    const now = Date.now();
    if (now - lastProgressSentAt < 150) {
      return;
    }
    lastProgressSentAt = now;
  }
  broadcaster(next);
}

/** electron-updater 的 releaseNotes 三形态（string / ReleaseNoteInfo[] / null）归一为文本。 */
function normalizeReleaseNotes(notes: unknown): string | undefined {
  if (typeof notes === 'string' && notes.trim()) {
    return notes;
  }
  if (Array.isArray(notes)) {
    const joined = notes
      .map((it) => (typeof it === 'string' ? it : (it as { note?: string }).note ?? ''))
      .filter(Boolean)
      .join('\n\n');
    return joined || undefined;
  }
  return undefined;
}

function setStatus(next: UpdateStatus): void {
  status = next;
  logger.info(
    `更新状态: ${next.state}${next.version ? ` v${next.version}` : ''}${
      next.progress !== undefined ? ` ${next.progress}%` : ''
    }${next.error ? ` (${next.error})` : ''}`,
  );
  broadcast(next);
}

/** 下载完成后询问立即重启安装；重复弹窗防抖（多事件竞态）。 */
async function askInstall(version: string): Promise<void> {
  if (installPromptOpen) {
    return;
  }
  installPromptOpen = true;
  try {
    const { response } = await dialog.showMessageBox({
      type: 'info',
      message: `新版本 ${version} 已下载完成`,
      detail: '立即重启并安装？也可以稍后退出应用时自动完成安装。',
      buttons: ['立即重启安装', '稍后'],
      defaultId: 0,
      cancelId: 1,
    });
    if (response === 0) {
      // 触发 before-quit → 托管子进程清理 → NSIS 静默换装
      autoUpdater.quitAndInstall();
    }
  } finally {
    installPromptOpen = false;
  }
}

export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    logger.info('开发模式，自动更新禁用');
    return;
  }
  initialized = true;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => setStatus({ state: 'checking' }));
  autoUpdater.on('update-available', (it) =>
    setStatus({
      state: 'available',
      version: it.version,
      releaseNotes: normalizeReleaseNotes(it.releaseNotes),
    }),
  );
  autoUpdater.on('update-not-available', (it) =>
    setStatus({ state: 'not-available', version: it.version }),
  );
  autoUpdater.on('download-progress', (p) =>
    setStatus({ state: 'downloading', progress: Math.round(p.percent) }),
  );
  autoUpdater.on('update-downloaded', (it) => {
    setStatus({
      state: 'downloaded',
      version: it.version,
      releaseNotes: normalizeReleaseNotes(it.releaseNotes),
    });
    void askInstall(it.version ?? '未知版本');
  });
  autoUpdater.on('error', (err) => setStatus({ state: 'error', error: err.message }));

  setTimeout(() => {
    void checkForUpdates();
  }, 30_000);
}

/** 手动/自动检查入口；未初始化（dev）返回 idle，异常落 error 状态不抛出。 */
export async function checkForUpdates(): Promise<UpdateStatus> {
  if (!initialized) {
    return { state: 'idle' };
  }
  // 重入防御：检查/下载进行中（含已下载待装）再触发会抛错并把进行中状态误覆盖成 error
  if (
    status.state === 'checking' ||
    status.state === 'downloading' ||
    status.state === 'downloaded'
  ) {
    return status;
  }
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    setStatus({ state: 'error', error: err instanceof Error ? err.message : String(err) });
  }
  return status;
}

export function getUpdateStatus(): UpdateStatus {
  return status;
}
