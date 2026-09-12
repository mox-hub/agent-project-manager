/**
 * 后端进程编排（翻译自 Tauri src-tauri/src/backend.rs）。
 * 承载双路径（ADR-014 E① 实验项）：
 *   'utility'（默认）— Electron utilityProcess 直接跑 server dist，复用内置 Node，省 ~75MB 随包 node.exe。
 *   'node' — spawn 随包 node.exe（与 Tauri 已冒烟路径同构，回退用）。
 * 经环境变量 APM_SERVER_TRANSPORT=node 切换。
 */
import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import http from 'node:http';
import path from 'node:path';
import { utilityProcess } from 'electron';
import type { AppConfig } from './config';
import { getDatabaseUrl } from './config';
import { logger } from './logger';

const HEALTH_CHECK_TIMEOUT_MS = 30_000;
const HEALTH_CHECK_POLL_MS = 500;

export type ServerTransport = 'utility' | 'node';

export function resolveTransport(): ServerTransport {
  return process.env.APM_SERVER_TRANSPORT === 'node' ? 'node' : 'utility';
}

export interface ServerHandle {
  pid: number;
  /** 进程是否产出过任何 stdout/stderr——fork 静默失败（如杀毒软件短暂锁文件）的判定依据 */
  sawOutput: () => boolean;
  stop: () => Promise<void>;
  /**
   * 订阅「未经 stop() 的退出」= 崩溃（ADR-015 自愈依据）。stop() 内部退出不算。
   */
  onUnexpectedExit: (callback: () => void) => void;
}

export function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    const done = (available: boolean) => {
      socket.destroy();
      resolve(available);
    };
    socket.setTimeout(100);
    socket.on('connect', () => done(false));
    socket.on('error', () => done(true));
    socket.on('timeout', () => done(true));
  });
}

export async function pickBackendPort(start: number, end: number): Promise<number> {
  for (let port = start; port <= end; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`无法分配后端端口（范围 ${start}-${end}）`);
}

/** 轮询 /_api/health 直到通过或超时（30s / 500ms，与 Tauri 版一致）。 */
export function waitForBackendHealth(apiBaseUrl: string): Promise<void> {
  const startedAt = Date.now();
  return new Promise((resolve, reject) => {
    const attempt = () => {
      if (Date.now() - startedAt > HEALTH_CHECK_TIMEOUT_MS) {
        reject(new Error('后端健康检查超时'));
        return;
      }
      const req = http.get(`${apiBaseUrl}/_api/health`, { timeout: 2000 }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
        } else {
          setTimeout(attempt, HEALTH_CHECK_POLL_MS);
        }
      });
      req.on('timeout', () => req.destroy());
      req.on('error', () => setTimeout(attempt, HEALTH_CHECK_POLL_MS));
    };
    attempt();
  });
}

function buildServerEnv(config: AppConfig, port: number): NodeJS.ProcessEnv {
  const allowedOrigins = `http://127.0.0.1:${port},http://localhost:${port}`;
  return {
    ...process.env,
    PORT: String(port),
    DATABASE_URL: getDatabaseUrl(config),
    JWT_SECRET: config.jwtSecret,
    FRONTEND_DIST_DIR: config.frontendDist,
    UPLOAD_DIR: config.uploadDir,
    INTEGRATION_ENCRYPTION_KEY: config.integrationKey,
    ALLOWED_ORIGINS: allowedOrigins,
    PRISMA_CLIENT_ENGINE_TYPE: 'library',
    NODE_ENV: 'production',
    APP_MODE: 'standalone',
    // 工作区注册表指向用户数据目录：默认按 server cwd 解析会落进安装目录，
    // 升级覆盖安装时随 resources 重写而丢失用户工作区注册（安装冒烟实证）
    WORKSPACE_REGISTRY_PATH: path.join(config.userDataDir, 'workspaces.json'),
  };
}

function pipeLog(
  source: NodeJS.ReadableStream | null,
  tag: string,
  onFirstOutput?: () => void,
): void {
  if (!source) {
    return;
  }
  let sawFirst = false;
  source.setEncoding('utf-8');
  source.on('data', (chunk: string) => {
    if (!sawFirst) {
      sawFirst = true;
      onFirstOutput?.();
    }
    for (const line of chunk.split(/\r?\n/)) {
      if (line.trim()) {
        logger.info(`[${tag}] ${line}`);
      }
    }
  });
}

export function startServerProcess(
  config: AppConfig,
  port: number,
  transport: ServerTransport,
): ServerHandle {
  const env = buildServerEnv(config, port);
  logger.info(
    `启动后端: port=${port} entry=${config.serverEntry} cwd=${config.serverCwd} transport=${transport}`,
  );

  let sawOutput = false;
  const markOutput = () => {
    sawOutput = true;
  };

  if (transport === 'utility') {
    const proc = utilityProcess.fork(config.serverEntry, [], {
      cwd: config.serverCwd,
      env,
      stdio: 'pipe',
      serviceName: 'apm-server',
    });
    pipeLog(proc.stdout, 'backend:stdout', markOutput);
    pipeLog(proc.stderr, 'backend:stderr', markOutput);
    let stopped = false;
    let onUnexpectedExit: (() => void) | null = null;
    proc.on('exit', () => {
      if (!stopped) {
        onUnexpectedExit?.();
      }
    });
    return {
      pid: proc.pid ?? 0,
      sawOutput: () => sawOutput,
      stop: () =>
        new Promise((resolve) => {
          stopped = true;
          proc.on('exit', () => resolve());
          proc.kill();
        }),
      onUnexpectedExit: (callback) => {
        onUnexpectedExit = callback;
      },
    };
  }

  const child: ChildProcess = spawn(config.nodeExe ?? 'node', [config.serverEntry], {
    cwd: config.serverCwd,
    env,
    stdio: ['ignore', 'pipe', 'pipe'],
    windowsHide: true,
  });
  pipeLog(child.stdout, 'backend:stdout', markOutput);
  pipeLog(child.stderr, 'backend:stderr', markOutput);
  let stopped = false;
  let onUnexpectedExit: (() => void) | null = null;
  child.once('exit', () => {
    if (!stopped) {
      onUnexpectedExit?.();
    }
  });
  return {
    pid: child.pid ?? 0,
    sawOutput: () => sawOutput,
    stop: () =>
      new Promise((resolve) => {
        stopped = true;
        child.once('exit', () => resolve());
        child.kill();
      }),
    onUnexpectedExit: (callback) => {
      onUnexpectedExit = callback;
    },
  };
}