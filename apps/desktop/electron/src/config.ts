/**
 * 桌面端应用配置（翻译自 Tauri src-tauri/src/config.rs + lib.rs create_app_config）。
 * 路径布局与 Tauri 版一致（bin/server/frontend 资源 + 用户数据目录三件套），
 * 仅用户数据根目录换为 %APPDATA%/agent-project-manager（Tauri 旧路径从未发布，无迁移负担）。
 */
import { app } from 'electron';
import path from 'node:path';

export interface AppConfig {
  serverEntry: string;
  serverCwd: string;
  frontendDist: string;
  userDataDir: string;
  logsDir: string;
  databasePath: string;
  uploadDir: string;
  jwtSecret: string;
  integrationKey: string;
  /** 打包模式指向随包分发的 node.exe；开发模式为 null（回退 Electron 内置 Node，见 setup.ts） */
  nodeExe: string | null;
  defaultPort: number;
  maxPort: number;
}

export function isDevMode(): boolean {
  return !app.isPackaged;
}

/** electron/dist → electron → apps/desktop → apps → repo root（SWC 平铺构建，__dirname 可用） */
function resolveWorkspaceRoot(): string {
  return path.resolve(__dirname, '..', '..', '..', '..');
}

export function resolveAppConfig(): AppConfig {
  const userDataDir = path.join(app.getPath('appData'), 'agent-project-manager');
  const logsDir = path.join(userDataDir, 'logs');
  const databasePath = path.join(userDataDir, 'data', 'agent-project-manager.db');
  const uploadDir = path.join(userDataDir, 'uploads');

  let serverCwd: string;
  let frontendDist: string;
  let nodeExe: string | null = null;

  if (isDevMode()) {
    const root = resolveWorkspaceRoot();
    serverCwd = path.join(root, 'apps', 'server');
    frontendDist = path.join(root, 'apps', 'frontend', 'dist');
  } else {
    // Release：运行时资产经 electron-builder extraResources 落在 <安装目录>/resources/ 下
    const resources = process.resourcesPath;
    serverCwd = path.join(resources, 'server');
    frontendDist = path.join(resources, 'frontend');
    nodeExe = path.join(resources, 'bin', process.platform === 'win32' ? 'node.exe' : 'node');
  }

  // SWC builder 以 src 为 rootDir 平铺输出，入口是 dist/main.js（非旧的 dist/src/main.js）
  const serverEntry = path.join(serverCwd, 'dist', 'main.js');

  return {
    serverEntry,
    serverCwd,
    frontendDist,
    userDataDir,
    logsDir,
    databasePath,
    uploadDir,
    jwtSecret: '',
    integrationKey: '',
    nodeExe,
    defaultPort: 4300,
    maxPort: 4399,
  };
}

export function getDatabaseUrl(config: AppConfig): string {
  return `file:${config.databasePath.replace(/\\/g, '/')}`;
}
