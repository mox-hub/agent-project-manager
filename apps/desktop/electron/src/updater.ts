/**
 * 自动更新（electron-updater + GitHub Releases feed，ADR-015 推翻 ADR-014「不自动更新」边界）。
 * 消费端策略：打包模式启动 30s 后静默首轮检查（避开冷启动窗口）；下载自动进行；
 * 下载完成弹窗询问立即重启安装，未确认则退出时自动安装。dev / 未打包无 app-update.yml，
 * 直接禁用（ initialized=false，检查请求优雅返回 idle）。
 * 发布端（latest.yml + 安装包上传 GitHub Releases）待 CI 接线；feed 缺失时更新检查
 * 落 error 状态，不影响主流程。代码签名未启用（单独裁决），更新分发风险与首装一致。
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
  error?: string;
}

let status: UpdateStatus = { state: 'idle' };
let initialized = false;
let installPromptOpen = false;

function setStatus(next: UpdateStatus): void {
  status = next;
  logger.info(
    `更新状态: ${next.state}${next.version ? ` v${next.version}` : ''}${
      next.progress !== undefined ? ` ${next.progress}%` : ''
    }${next.error ? ` (${next.error})` : ''}`,
  );
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
  autoUpdater.on('update-available', (it) => setStatus({ state: 'available', version: it.version }));
  autoUpdater.on('update-not-available', (it) =>
    setStatus({ state: 'not-available', version: it.version }),
  );
  autoUpdater.on('download-progress', (p) =>
    setStatus({ state: 'downloading', progress: Math.round(p.percent) }),
  );
  autoUpdater.on('update-downloaded', (it) => {
    setStatus({ state: 'downloaded', version: it.version });
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
