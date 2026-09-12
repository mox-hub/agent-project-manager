/**
 * apm-runtime 守护进程托管（CAP-A-14 体验切片：运行时自动启动 + 手动控制）。
 *
 * AI 执行面（守护进程）此前不随包、也不被壳拉起——设置页「机器列表」永远为空，
 * 用户也无控件可启动。现随包分发 apps/cli 产物，由壳在 server 健康后自动拉起：
 *   utilityProcess.fork(cliEntry) + env(APM_BACKEND, APM_CONFIG_PATH)
 * 配置文件重定向到 userData/apm-config.json，与用户手动安装的 CLI（~/.apm）互不干扰；
 * 守护进程自带的单实例锁也落该目录，双开天然被拒。
 * 注册端点为 Public（无需用户凭证），守护进程上线即出现在设置页机器列表。
 */
import fs from 'node:fs';
import path from 'node:path';
import { utilityProcess, type UtilityProcess } from 'electron';
import type { AppConfig } from './config';
import { logger } from './logger';
import { state, type RuntimeDaemonHandle } from './state';

interface RuntimeConfigShape {
  runtime?: { workspaceRoots?: string[] } & Record<string, unknown>;
  daemon?: Record<string, unknown>;
}

export function readApmRuntimeConfig(config: AppConfig): RuntimeConfigShape {
  try {
    return JSON.parse(fs.readFileSync(config.apmConfigPath, 'utf-8')) as RuntimeConfigShape;
  } catch {
    return {};
  }
}

/** 守护进程的 AI 执行工作根目录（初始化向导「工作目录」步骤写入，守护进程每次启动读取）。 */
export function readWorkspaceRoots(config: AppConfig): string[] {
  return readApmRuntimeConfig(config).runtime?.workspaceRoots ?? [];
}

export function writeWorkspaceRoots(config: AppConfig, roots: string[]): string[] {
  const cleaned = [...new Set(roots.map((r) => r.trim()).filter(Boolean))];
  const current = readApmRuntimeConfig(config);
  const next: RuntimeConfigShape = {
    ...current,
    runtime: { ...current.runtime, workspaceRoots: cleaned },
  };
  fs.mkdirSync(path.dirname(config.apmConfigPath), { recursive: true });
  fs.writeFileSync(config.apmConfigPath, JSON.stringify(next, null, 2));
  logger.info(`守护进程工作目录已更新: ${cleaned.join(', ') || '(空)'}`);
  return cleaned;
}

function assertCliEntry(config: AppConfig): void {
  if (fs.existsSync(config.cliEntry)) {
    return;
  }
  if (config.nodeExe === null) {
    throw new Error(`未找到守护进程入口（${config.cliEntry}）。请先构建 CLI：pnpm --filter @apm/cli build`);
  }
  throw new Error(`未找到守护进程入口（${config.cliEntry}）。安装包可能不完整，请重新安装。`);
}

function pipeLog(source: NodeJS.ReadableStream | null, tag: string, onFirstOutput?: () => void): void {
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

export async function startRuntimeDaemon(backendPort: number): Promise<{ pid: number }> {
  const config = state.config;
  if (state.daemon) {
    throw new Error('守护进程已在运行');
  }
  assertCliEntry(config);
  // 配置文件就位：守护进程首启会把 runtimeId/deviceSecret 等写回同一文件
  if (!fs.existsSync(config.apmConfigPath)) {
    writeWorkspaceRoots(config, readWorkspaceRoots(config));
  }

  const env = {
    ...process.env,
    APM_BACKEND: `http://127.0.0.1:${backendPort}`,
    APM_CONFIG_PATH: config.apmConfigPath,
    NODE_ENV: 'production',
  };
  logger.info(`启动守护进程: entry=${config.cliEntry} backend=${env.APM_BACKEND}`);

  const proc: UtilityProcess = utilityProcess.fork(config.cliEntry, [], {
    cwd: path.dirname(config.cliEntry),
    env,
    stdio: 'pipe',
    serviceName: 'apm-runtime-daemon',
  });

  let sawOutput = false;
  pipeLog(proc.stdout, 'daemon:stdout', () => {
    sawOutput = true;
  });
  pipeLog(proc.stderr, 'daemon:stderr', () => {
    sawOutput = true;
  });

  const startedAt = new Date().toISOString();
  const handle: RuntimeDaemonHandle = {
    pid: proc.pid ?? 0,
    startedAt,
    sawOutput: () => sawOutput,
    stop: () =>
      new Promise((resolve) => {
        proc.once('exit', () => resolve());
        proc.kill();
      }),
  };

  proc.once('exit', (code) => {
    // 用户 stop 的路径已在 stop() 里先置空 state；走到这里 = 意外退出（锁冲突/注册失败/崩溃）
    if (state.daemon === handle) {
      state.daemon = null;
    }
    logger.warn(
      `守护进程退出: code=${code ?? 'unknown'} sawOutput=${sawOutput} pid=${handle.pid}`,
    );
  });

  state.daemon = handle;

  // 宽限观察：fork 后短暂窗口内即退（单实例锁冲突/入口损坏）则直接报错，不给前端假成功
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (!state.daemon) {
    throw new Error(
      `守护进程启动后立即退出（exit code 见日志${sawOutput ? '' : '，且无任何输出——常见于文件被占用或入口损坏'}）`,
    );
  }
  logger.info(`守护进程已启动: pid=${handle.pid}`);
  return { pid: handle.pid };
}

export async function stopRuntimeDaemon(): Promise<{ ok: boolean }> {
  if (state.daemon) {
    const handle = state.daemon;
    state.daemon = null;
    await handle.stop();
    logger.info('守护进程已停止');
  }
  return { ok: true };
}

export function getRuntimeDaemonStatus(): {
  running: boolean;
  pid?: number;
  startedAt?: string;
  configPath: string;
  workspaceRoots: string[];
} {
  const config = state.config;
  const daemon = state.daemon;
  return {
    running: !!daemon,
    pid: daemon?.pid,
    startedAt: daemon?.startedAt,
    configPath: config.apmConfigPath,
    workspaceRoots: readWorkspaceRoots(config),
  };
}
