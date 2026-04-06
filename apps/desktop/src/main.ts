import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import { spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import path from 'node:path';

type DesktopAppInfo = {
  version: string;
  node: string;
  electron: string;
  chrome: string;
  apiBaseUrl: string;
  dataPath: string;
  logPath: string;
  mode: 'development' | 'packaged';
};

type RuntimeAssets = {
  serverEntry: string;
  serverCwd: string;
  frontendDistDir: string;
};

const DEFAULT_PORT = 4300;
const MAX_PORT = 4399;
const HEALTH_TIMEOUT_MS = 30_000;
const HEALTH_POLL_MS = 500;
const BACKEND_SHUTDOWN_GRACE_MS = 6_000;

const isDev = !app.isPackaged || process.env.APM_ELECTRON_DEV === '1';

let mainWindow: BrowserWindow | null = null;
let backendProcess: ChildProcess | null = null;
let backendPort = DEFAULT_PORT;
let backendApiBaseUrl = '';
let backendShutdownRequested = false;
let backendRestarting = false;
let isQuitting = false;

let runtimeAssets: RuntimeAssets;
let userDataDir: string;
let logsDir: string;
let logFilePath: string;
let databasePath: string;
let uploadDir: string;
let jwtSecret: string;
let integrationEncryptionKey: string;

function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function appendMainLog(message: string): void {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  try {
    ensureDir(path.dirname(logFilePath));
    fs.appendFileSync(logFilePath, line, 'utf8');
  } catch {
    // Ignore logging failures; do not block app startup.
  }
}

function getWorkspaceRoot(): string {
  return path.resolve(__dirname, '../../..');
}

function resolveRuntimeAssets(): RuntimeAssets {
  if (isDev) {
    const workspaceRoot = getWorkspaceRoot();
    return {
      serverEntry: path.join(workspaceRoot, 'apps', 'server', 'dist', 'src', 'main.js'),
      serverCwd: path.join(workspaceRoot, 'apps', 'server'),
      frontendDistDir: path.join(workspaceRoot, 'apps', 'frontend', 'dist'),
    };
  }

  const resourcesRoot = process.resourcesPath;
  return {
    serverEntry: path.join(resourcesRoot, 'server', 'dist', 'src', 'main.js'),
    serverCwd: path.join(resourcesRoot, 'server'),
    frontendDistDir: path.join(resourcesRoot, 'frontend'),
  };
}

function getOrCreateJwtSecret(): string {
  const configDir = path.join(userDataDir, 'config');
  const secretFile = path.join(configDir, 'jwt-secret.txt');
  ensureDir(configDir);

  if (fs.existsSync(secretFile)) {
    return fs.readFileSync(secretFile, 'utf8').trim();
  }

  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(secretFile, secret, 'utf8');
  return secret;
}

function normalizeAes256Key(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
}

function getOrCreateIntegrationEncryptionKey(): string {
  const configDir = path.join(userDataDir, 'config');
  const keyFile = path.join(configDir, 'integration-encryption-key.txt');
  ensureDir(configDir);

  if (fs.existsSync(keyFile)) {
    const existing = fs.readFileSync(keyFile, 'utf8').trim();
    if (existing.length === 32) {
      return existing;
    }
  }

  const raw = crypto.randomBytes(48).toString('base64url');
  const normalized = normalizeAes256Key(raw);
  fs.writeFileSync(keyFile, normalized, 'utf8');
  return normalized;
}

function getSqliteDatabaseUrl(dbPath: string): string {
  return `file:${dbPath.replace(/\\/g, '/')}`;
}

function verifyWritableFile(filePath: string): void {
  ensureDir(path.dirname(filePath));
  fs.appendFileSync(filePath, '');
}

function runStartupSelfChecks(assets: RuntimeAssets): void {
  if (!fs.existsSync(assets.serverEntry)) {
    throw new Error(`未找到后端入口文件: ${assets.serverEntry}`);
  }

  const seedFile = path.join(assets.serverCwd, 'dist', 'prisma', 'seed.js');
  if (!fs.existsSync(seedFile)) {
    throw new Error(`未找到 seed 脚本: ${seedFile}`);
  }

  const indexFile = path.join(assets.frontendDistDir, 'index.html');
  if (!fs.existsSync(indexFile)) {
    throw new Error(`未找到前端构建产物: ${indexFile}`);
  }

  ensureDir(userDataDir);
  ensureDir(logsDir);
  ensureDir(uploadDir);

  verifyWritableFile(logFilePath);
  verifyWritableFile(databasePath);
}

type NodeRunOptions = {
  title: string;
  args: string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
};

async function runNodeProcess(options: NodeRunOptions): Promise<void> {
  appendMainLog(`执行步骤: ${options.title}`);

  await new Promise<void>((resolve, reject) => {
    const proc = spawn(process.execPath, options.args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });

    proc.stdout?.on('data', (chunk) => {
      appendMainLog(`[${options.title}:stdout] ${chunk.toString().trimEnd()}`);
    });
    proc.stderr?.on('data', (chunk) => {
      appendMainLog(`[${options.title}:stderr] ${chunk.toString().trimEnd()}`);
    });

    proc.once('error', (error) => {
      reject(new Error(`${options.title} 启动失败: ${String(error)}`));
    });

    proc.once('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${options.title} 失败: code=${String(code)}, signal=${String(signal)}`,
        ),
      );
    });
  });
}

function resolvePrismaCliEntry(): string | null {
  const entry = path.join(
    runtimeAssets.serverCwd,
    'node_modules',
    'prisma',
    'build',
    'index.js',
  );
  return fs.existsSync(entry) ? entry : null;
}

async function runDatabaseBootstrap(): Promise<void> {
  const baseEnv: NodeJS.ProcessEnv = {
    ...process.env,
    APP_MODE: 'standalone',
    NODE_ENV: 'production',
    DATABASE_URL: getSqliteDatabaseUrl(databasePath),
    PRISMA_CLIENT_ENGINE_TYPE: 'library',
    RUST_LOG: process.env.RUST_LOG ?? 'info',
  };

  const prismaCliEntry = resolvePrismaCliEntry();
  if (!prismaCliEntry) {
    throw new Error('未找到 Prisma CLI，请重新打包桌面应用后重试');
  }

  const schemaPath = path.join(runtimeAssets.serverCwd, 'prisma', 'schema.prisma');
  await runNodeProcess({
    title: 'prisma-db-push',
    args: [
      prismaCliEntry,
      'db',
      'push',
      '--schema',
      schemaPath,
      '--skip-generate',
      '--accept-data-loss',
    ],
    cwd: runtimeAssets.serverCwd,
    env: baseEnv,
  });

  const seedScript = path.join(runtimeAssets.serverCwd, 'dist', 'prisma', 'seed.js');
  await runNodeProcess({
    title: 'prisma-seed',
    args: [seedScript],
    cwd: runtimeAssets.serverCwd,
    env: baseEnv,
  });
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

async function pickBackendPort(start = DEFAULT_PORT, end = MAX_PORT): Promise<number> {
  for (let port = start; port <= end; port += 1) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`无法分配后端端口（范围 ${start}-${end}）`);
}

function requestHealth(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const req = http.get(url, (res) => {
      res.resume();
      resolve((res.statusCode ?? 500) < 400);
    });

    req.setTimeout(2500, () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => resolve(false));
  });
}

async function waitForBackendHealth(baseUrl: string): Promise<void> {
  const startedAt = Date.now();
  const candidates = [`${baseUrl}/_api/health`, `${baseUrl}/_api/health/health`];

  while (Date.now() - startedAt < HEALTH_TIMEOUT_MS) {
    for (const endpoint of candidates) {
      const ok = await requestHealth(endpoint);
      if (ok) {
        return;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_POLL_MS));
  }

  throw new Error('后端健康检查超时');
}

function wireBackendLogs(proc: ChildProcess): void {
  proc.stdout?.on('data', (chunk) => {
    appendMainLog(`[server:stdout] ${chunk.toString().trimEnd()}`);
  });
  proc.stderr?.on('data', (chunk) => {
    appendMainLog(`[server:stderr] ${chunk.toString().trimEnd()}`);
  });
}

async function startBackend(): Promise<void> {
  backendPort = await pickBackendPort();
  backendApiBaseUrl = `http://127.0.0.1:${backendPort}`;

  const allowedOrigins = [
    `http://127.0.0.1:${backendPort}`,
    `http://localhost:${backendPort}`,
  ].join(',');

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ELECTRON_RUN_AS_NODE: '1',
    APP_MODE: 'standalone',
    NODE_ENV: 'production',
    PORT: String(backendPort),
    DATABASE_URL: getSqliteDatabaseUrl(databasePath),
    JWT_SECRET: jwtSecret,
    FRONTEND_DIST_DIR: runtimeAssets.frontendDistDir,
    UPLOAD_DIR: uploadDir,
    INTEGRATION_ENCRYPTION_KEY: integrationEncryptionKey,
    ALLOWED_ORIGINS: allowedOrigins,
    PRISMA_CLIENT_ENGINE_TYPE: 'library',
  };

  appendMainLog(
    `启动后端: port=${backendPort}, entry=${runtimeAssets.serverEntry}, cwd=${runtimeAssets.serverCwd}`,
  );

  backendShutdownRequested = false;
  const proc = spawn(process.execPath, [runtimeAssets.serverEntry], {
    cwd: runtimeAssets.serverCwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  backendProcess = proc;

  wireBackendLogs(proc);

  proc.on('exit', (code, signal) => {
    appendMainLog(
      `后端进程退出: code=${String(code)}, signal=${String(signal)}, expected=${String(
        backendShutdownRequested,
      )}, restarting=${String(backendRestarting)}`,
    );

    backendProcess = null;

    if (!backendShutdownRequested && !backendRestarting && !isQuitting) {
      void dialog.showMessageBox({
        type: 'error',
        title: '后端进程已退出',
        message: '本地服务异常退出，请点击“重启后端”或重启应用。',
      });
    }
  });

  await waitForBackendHealth(backendApiBaseUrl);
  appendMainLog('后端健康检查通过');
}

async function stopBackend(): Promise<void> {
  const proc = backendProcess;
  if (!proc) {
    return;
  }

  backendShutdownRequested = true;

  await new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      resolve();
    };

    const forceTimer = setTimeout(() => {
      appendMainLog('后端进程未在宽限期内退出，执行强制关闭');
      proc.kill('SIGKILL');
      done();
    }, BACKEND_SHUTDOWN_GRACE_MS);

    proc.once('exit', () => {
      clearTimeout(forceTimer);
      done();
    });

    proc.kill('SIGTERM');
  });

  backendProcess = null;
}

async function restartBackend(): Promise<void> {
  if (backendRestarting) {
    return;
  }

  backendRestarting = true;
  appendMainLog('收到重启后端请求');

  try {
    await stopBackend();
    await startBackend();
    if (mainWindow && !mainWindow.isDestroyed()) {
      await mainWindow.loadURL(backendApiBaseUrl);
    }
  } finally {
    backendRestarting = false;
  }
}

function getDesktopAppInfo(): DesktopAppInfo {
  return {
    version: app.getVersion(),
    node: process.versions.node,
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    apiBaseUrl: backendApiBaseUrl,
    dataPath: userDataDir,
    logPath: logsDir,
    mode: isDev ? 'development' : 'packaged',
  };
}

function registerIpcHandlers(): void {
  ipcMain.handle('desktop:get-app-info', async () => getDesktopAppInfo());

  ipcMain.handle('desktop:open-log-dir', async () => {
    const error = await shell.openPath(logsDir);
    if (error) {
      appendMainLog(`打开日志目录失败: ${error}`);
      return { ok: false, error };
    }
    return { ok: true };
  });

  ipcMain.handle('desktop:restart-backend', async () => {
    try {
      await restartBackend();
      return { ok: true };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      appendMainLog(`重启后端失败: ${message}`);
      return { ok: false, error: message };
    }
  });
}

async function createMainWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  await mainWindow.loadURL(backendApiBaseUrl);
}

async function bootstrap(): Promise<void> {
  app.setName('Agent Project Manager');
  app.setAppUserModelId('com.agentpm.app');

  runtimeAssets = resolveRuntimeAssets();
  userDataDir = app.getPath('userData');
  logsDir = path.join(userDataDir, 'logs');
  logFilePath = path.join(logsDir, 'desktop-main.log');
  databasePath = path.join(userDataDir, 'data', 'agent-project-manager.db');
  uploadDir = path.join(userDataDir, 'uploads');
  jwtSecret = getOrCreateJwtSecret();
  integrationEncryptionKey = getOrCreateIntegrationEncryptionKey();

  appendMainLog(
    `Desktop bootstrap: mode=${isDev ? 'development' : 'packaged'}, userData=${userDataDir}`,
  );

  runStartupSelfChecks(runtimeAssets);
  await runDatabaseBootstrap();
  registerIpcHandlers();
  await startBackend();
  await createMainWindow();
}

app.on('before-quit', () => {
  isQuitting = true;
});

app.whenReady().then(async () => {
  try {
    await bootstrap();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appendMainLog(`启动失败: ${message}`);
    dialog.showErrorBox('启动失败', message);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', async () => {
  if (BrowserWindow.getAllWindows().length === 0 && backendApiBaseUrl) {
    await createMainWindow();
  }
});

app.on('will-quit', async (event) => {
  event.preventDefault();
  await stopBackend();
  app.exit();
});
