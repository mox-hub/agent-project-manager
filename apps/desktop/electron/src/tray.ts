/**
 * 系统托盘（ADR-015）：关窗最小化到托盘、server/守护进程保活——PM 工具的核心价值
 * 是本地服务常驻（AI 执行面跑长任务），窗口不应绑死服务生命周期。
 * 图标经 scripts/gen-icon.mjs 生成（electron/assets/tray.png，随包分发）；图标缺失时
 * 托盘禁用，关闭语义自动回退「关窗即退出」。
 */
import { Menu, Tray, app, nativeImage } from 'electron';
import path from 'node:path';
import { logger } from './logger';

let tray: Tray | null = null;

/** dev: electron/assets（__dirname=electron/dist）；prod: resources/app/electron/assets，相对深度一致 */
export function resolveTrayIconPath(): string {
  return path.resolve(__dirname, '..', 'assets', 'tray.png');
}

export function hasTray(): boolean {
  return tray !== null;
}

export function createTray(handlers: {
  showMainWindow: () => void;
  checkUpdates: () => void;
}): Tray | null {
  if (tray) {
    return tray;
  }
  const icon = nativeImage.createFromPath(resolveTrayIconPath());
  if (icon.isEmpty()) {
    logger.warn(`托盘图标缺失（${resolveTrayIconPath()}），托盘禁用，关窗即退出`);
    return null;
  }
  tray = new Tray(icon);
  tray.setToolTip('Agent Project Manager');
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: '显示主窗口', click: () => handlers.showMainWindow() },
      { label: '检查更新', click: () => handlers.checkUpdates() },
      { type: 'separator' },
      {
        label: '退出',
        click: () => {
          app.quit();
        },
      },
    ]),
  );
  tray.on('double-click', () => handlers.showMainWindow());
  logger.info('系统托盘已创建（关窗最小化到托盘）');
  return tray;
}

export function destroyTray(): void {
  tray?.destroy();
  tray = null;
}
