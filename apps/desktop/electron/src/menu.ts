/**
 * 应用菜单（ADR-015 P2）：autoHideMenuBar 下 Alt 唤出，补齐键盘可达性与
 * 标准入口（重载/缩放/DevTools/日志/关于/检查更新）。标签硬编码中文，与壳
 * 启动屏口径一致（壳侧无 i18n 基建）。
 */
import { app, dialog, Menu, type MenuItemConstructorOptions } from 'electron';
import { logger, getLogFilePath } from './logger';

export interface MenuHandlers {
  showMainWindow: () => void;
  checkUpdates: () => void;
  /** 复用命令面 open_log_dir（shell.openPath + 日志留痕一致） */
  openLogs: () => void;
}

function showAbout(): void {
  void dialog.showMessageBox({
    type: 'info',
    title: '关于 Agent Project Manager',
    message: `Agent Project Manager ${app.getVersion()}`,
    detail: `AI 驱动的项目管理工具（人类控制面桌面壳）\n数据目录：${process.env.APM_DATA_DIR ?? '~/.apm'}\n日志：${getLogFilePath()}`,
    buttons: ['确定'],
  });
}

export function installApplicationMenu(handlers: MenuHandlers): void {
  const template: MenuItemConstructorOptions[] = [
    {
      label: '应用',
      submenu: [
        { label: '关于 Agent Project Manager', click: showAbout },
        { label: '检查更新…', click: () => handlers.checkUpdates() },
        { type: 'separator' },
        { label: '隐藏窗口', role: 'hide' },
        { type: 'separator' },
        { label: '退出', role: 'quit' },
      ],
    },
    { label: '编辑', role: 'editMenu' },
    {
      label: '视图',
      submenu: [
        { label: '重新加载', role: 'reload' },
        { label: '强制重新加载', role: 'forceReload' },
        { label: '开发者工具', role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom', label: '实际大小' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    { label: '窗口', role: 'windowMenu' },
    {
      label: '帮助',
      submenu: [
        { label: '打开日志目录', click: () => handlers.openLogs() },
        { label: '显示主窗口', click: () => handlers.showMainWindow() },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  logger.info('应用菜单已安装（Alt 唤出）');
}
