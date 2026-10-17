/**
 * 桌面端应用配置（由旧 Tauri 壳 config.rs + lib.rs create_app_config）。
 * 路径布局与旧壳一致（bin/server/frontend 资源 + 用户数据目录三件套）。
 * 用户数据根固定在 ~/.ordo（与手动 CLI 的 config.json 同根）：项目数据（库/日志/上传/
 * 密钥/会话状态）全部收敛于此，升级安装数据天然保留；守护进程配置与单实例锁放
 * ~/.ordo/desktop/ 子目录——锁文件 runtime.lock 若落 ~/.ordo 根会与手动 CLI 守护进程
 * 的锁互抢（CLI 锁 = 配置文件同目录，见 apps/cli/src/runtime/lock.ts）。
 */
import { app } from 'electron';
import os from 'node:os';
import path from 'node:path';

export interface AppConfig {
  serverEntry: string;
  serverCwd: string;
  frontendDist: string;
  /** ordo-runtime 守护进程入口（apps/cli 构建产物）；dev 未构建时报可操作错误 */
  cliEntry: string;
  userDataDir: string;
  logsDir: string;
  databasePath: string;
  uploadDir: string;
  /** 守护进程配置文件（ORDO_CONFIG_PATH 指向）——与用户手动 CLI 的 ~/.ordo 隔离 */
  ordoConfigPath: string;
  jwtSecret: string;
  integrationKey: string;
  /** 打包模式指向随包分发的 node.exe；开发模式为 null（回退 Electron 内置 Node，见 setup.ts） */
  nodeExe: string | null;
  /** 随包 MinGit 的 git.exe 目录（resources/git/cmd）；dev/非 win 为 null（CAP-A-30） */
  bundledGitBinDir: string | null;
  /** 随包 npm CLI 入口（resources/bin/npm/bin/npm-cli.js）；dev 为 null（CAP-A-30） */
  bundledNpmCli: string | null;
  /** AI CLI 按需安装落点（用户数据目录 tools/，受控 prefix 不碰系统全局，CAP-A-30） */
  toolsDir: string;
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
  // ORDO_DATA_DIR 仅测试/CI 隔离用（e2e-shell.mjs 指向临时目录，避免污染真实 ~/.ordo）；
  // 生产路径恒为 ~/.ordo（用户主目录固定，不受安装位置影响）
  const userDataDir = process.env.ORDO_DATA_DIR ?? path.join(os.homedir(), '.ordo');
  const logsDir = path.join(userDataDir, 'logs');
  const databasePath = path.join(userDataDir, 'data', 'ordo.db');
  const uploadDir = path.join(userDataDir, 'uploads');

  let serverCwd: string;
  let frontendDist: string;
  let cliEntry: string;
  let nodeExe: string | null = null;
  let bundledGitBinDir: string | null = null;
  let bundledNpmCli: string | null = null;

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
    // 环境自足随包（CAP-A-30）：MinGit 仅 Windows 发行版随包（打包目标 x64 nsis）
    if (process.platform === 'win32') {
      bundledGitBinDir = path.join(resources, 'git', 'cmd');
      bundledNpmCli = path.join(resources, 'bin', 'npm', 'bin', 'npm-cli.js');
    }
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
    ordoConfigPath: path.join(userDataDir, 'desktop', 'ordo-config.json'),
    jwtSecret: '',
    integrationKey: '',
    nodeExe,
    bundledGitBinDir,
    bundledNpmCli,
    toolsDir: path.join(userDataDir, 'tools'),
    defaultPort: 4300,
    maxPort: 4399,
  };
}

/**
 * 环境自足注入（CAP-A-30）：随包 git/node/npm 目录前插派发链 PATH，并把随包
 * 资产路径经 ORDO_BUNDLED_* 告知 server（其按需安装作业据此拼 npm 命令）。
 * server/守护进程拉起的一切子进程（AI CLI、git、安装器）由此免预装可用；
 * dev 模式随包项为 null，仅注入 toolsDir（安装走用户数据目录约定不变）。
 */
export function withBundledEnv(
  config: Pick<
    AppConfig,
    'nodeExe' | 'bundledGitBinDir' | 'bundledNpmCli' | 'toolsDir'
  >,
  env: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const prependDirs = [
    config.bundledGitBinDir,
    config.nodeExe ? path.dirname(config.nodeExe) : null,
    config.toolsDir,
  ].filter((dir): dir is string => !!dir);
  const pathKey = process.platform === 'win32' ? 'Path' : 'PATH';
  const resolved: NodeJS.ProcessEnv = { ...env };
  const existingPath = resolved[pathKey] ?? resolved.PATH ?? '';
  // PATH/Path 混写双键会让 Windows 子进程 env 块行为未定义——统一保留单键
  delete resolved.PATH;
  delete resolved.Path;
  resolved[pathKey] = `${prependDirs.join(path.delimiter)}${path.delimiter}${existingPath}`;
  if (config.nodeExe) resolved.ORDO_BUNDLED_NODE = config.nodeExe;
  if (config.bundledNpmCli) resolved.ORDO_BUNDLED_NPM_CLI = config.bundledNpmCli;
  resolved.ORDO_TOOLS_DIR = config.toolsDir;
  return resolved;
}

export function getDatabaseUrl(config: AppConfig): string {
  return `file:${config.databasePath.replace(/\\/g, '/')}`;
}
