/**
 * 桌面端应用配置（翻译自 Tauri src-tauri/src/config.rs + lib.rs create_app_config）。
 * 路径布局与 Tauri 版一致（bin/server/frontend 资源 + 用户数据目录三件套）。
 * 用户数据根固定在 ~/.apm（与手动 CLI 的 config.json 同根）：项目数据（库/日志/上传/
 * 密钥/会话状态）全部收敛于此，升级安装数据天然保留；守护进程配置与单实例锁放
 * ~/.apm/desktop/ 子目录——锁文件 runtime.lock 若落 ~/.apm 根会与手动 CLI 守护进程
 * 的锁互抢（CLI 锁 = 配置文件同目录，见 apps/cli/src/runtime/lock.ts）。
 */
import { app } from 'electron';
import os from 'node:os';
import path from 'node:path';

export interface AppConfig {
  serverEntry: string;
  serverCwd: string;
  frontendDist: string;
  /** apm-runtime 守护进程入口（apps/cli 构建产物）；dev 未构建时报可操作错误 */
  cliEntry: string;
  userDataDir: string;
  logsDir: string;
  databasePath: string;
  uploadDir: string;
  /** 守护进程配置文件（APM_CONFIG_PATH 指向）——与用户手动 CLI 的 ~/.apm 隔离 */
  apmConfigPath: string;
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
  // APM_DATA_DIR 仅测试/CI 隔离用（e2e-shell.mjs 指向临时目录，避免污染真实 ~/.apm）；
  // 生产路径恒为 ~/.apm（用户主目录固定，不受安装位置影响）
  const userDataDir = process.env.APM_DATA_DIR ?? path.join(os.homedir(), '.apm');
  const logsDir = path.join(userDataDir, 'logs');
  const databasePath = path.join(userDataDir, 'data', 'agent-project-manager.db');
  const uploadDir = path.join(userDataDir, 'uploads');

  let serverCwd: string;
  let frontendDist: string;
  let cliEntry: string;
  let nodeExe: string | null = null;

  if (isDevMode()) {
    const root = resolveWorkspaceRoot();
    serverCwd = path.join(root, 'apps', 'server');
    frontendDist = path.join(root, 'apps', 'frontend', 'dist');
    cliEntry = path.join(root, 'apps', 'cli', 'dist', 'runtime', 'index.js');
  } else {
    // Release：运行时资产经 electron-builder extraResources 落在 <安装目录>/resources/ 下
    const resources = process.resourcesPath;
    serverCwd = path.join(resources, 'server');
    frontendDist = path.join(resources, 'frontend');
    cliEntry = path.join(resources, 'cli', 'dist', 'runtime', 'index.js');
    nodeExe = path.join(resources, 'bin', process.platform === 'win32' ? 'node.exe' : 'node');
  }

  // SWC builder 以 src 为 rootDir 平铺输出，入口是 dist/main.js（非旧的 dist/src/main.js）
  const serverEntry = path.join(serverCwd, 'dist', 'main.js');

  return {
    serverEntry,
    serverCwd,
    frontendDist,
    cliEntry,
    userDataDir,
    logsDir,
    databasePath,
    uploadDir,
    apmConfigPath: path.join(userDataDir, 'desktop', 'apm-config.json'),
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
