/** 优雅关闭宽限：postMessage shutdown 后等守护进程收尾（socket 断开/锁释放），超时强杀 */
const GRACEFUL_DAEMON_SHUTDOWN_TIMEOUT_MS = 3_000;

/**
 * apm-runtime 守护进程托管（CAP-A-14 体验切片：运行时自动启动 + 手动控制）。
 *
 * AI 执行面（守护进程）此前不随包、也不被壳拉起——设置页「机器列表」永远为空，
 * 用户也无控件可启动。现随包分发 apps/cli 产物，由壳在 server 健康后自动拉起：
 *   utilityProcess.fork(cliEntry) + env(APM_BACKEND, APM_CONFIG_PATH)
 * 配置文件重定向到 ~/.apm/desktop/apm-config.json：数据根与手动 CLI 同为 ~/.apm，
 * 但配置与单实例锁收敛在 desktop/ 子目录——手动 CLI 的锁在配置文件同目录
 * （~/.apm/runtime.lock，见 apps/cli/src/runtime/lock.ts），子目录隔离后互不干扰。
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

/**
 * 接管上一代壳残留的孤儿守护进程。
 *
 * 壳崩溃/被强杀时 before-quit 清理不执行——utilityProcess 守护进程是独立 OS 进程，
 * 会孤儿化存活并持有 ~/.apm/desktop/ 的 runtime.lock，导致下次启动锁冲突必失败。
 * 该锁在 desktop/ 子目录（手动 CLI 的锁在 ~/.apm 根），持有者只可能是壳拉起的
 * 守护进程，因此活着即可判定孤儿、安全终止。持锁方已死（陈旧
 * 锁）则仅清锁——这一分支守护进程自身的 stale 锁接管也能处理，这里提前做省一次
 * 失败重启。
 */
function reapOrphanDaemon(config: AppConfig): void {
  const lockPath = path.join(path.dirname(config.apmConfigPath), 'runtime.lock');
  let holder: { pid?: number } | null = null;
  try {
    holder = JSON.parse(fs.readFileSync(lockPath, 'utf-8')) as { pid?: number };
  } catch {
    return;
  }
  const pid = holder?.pid;
  if (typeof pid !== 'number' || pid <= 0 || pid === process.pid) {
    return;
  }
  let alive = false;
  try {
    process.kill(pid, 0);
    alive = true;
  } catch {
    // 已死：清掉陈旧锁即可
  }
  logger.warn(
    `发现上一代守护进程锁（pid=${pid}，${alive ? '孤儿存活，接管终止' : '已死，清理陈旧锁'}）`,
  );
  if (alive) {
    try {
      process.kill(pid);
    } catch {
      // 竞态退出——无碍
    }
    // 等待进程退出（同步等待，fork 必须在锁释放后进行）
    const deadline = Date.now() + 5000;
    while (Date.now() < deadline) {
      try {
        process.kill(pid, 0);
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 100);
      } catch {
        break;
      }
    }
  }
  fs.rmSync(lockPath, { force: true });
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

const MAX_DAEMON_CONSECUTIVE_CRASHES = 5;
const DAEMON_RESTART_MAX_DELAY_MS = 30_000;
let daemonCrashCount = 0;

/**
 * 守护进程意外退出自动重拉（ADR-015 自愈）：指数退避 + 熔断防 crash loop；
 * 后端已不在（壳退出中/后端也崩了）则放弃——后端恢复链路会经 start_all_services
 * 重新走全量启动。
 */
function scheduleDaemonRestart(reason: string): void {
  daemonCrashCount += 1;
  if (daemonCrashCount > MAX_DAEMON_CONSECUTIVE_CRASHES) {
    logger.error(
      `守护进程连续崩溃 ${daemonCrashCount} 次，已停止自动重拉（防 crash loop）——请检查日志或手动启动`,
    );
    return;
  }
  const delay = Math.min(1000 * 2 ** (daemonCrashCount - 1), DAEMON_RESTART_MAX_DELAY_MS);
  logger.warn(`守护进程意外退出（${reason}），${delay}ms 后自动重拉（第 ${daemonCrashCount} 次自愈）`);
  setTimeout(() => {
    if (!state.backend || state.daemon) {
      return; // 后端已停或已被手动/其他路径拉起
    }
    startRuntimeDaemon(state.backend.info.port)
      .then(({ pid }) => logger.info(`守护进程自动重拉成功: pid=${pid}`))
      .catch((err) =>
        logger.error(
          `守护进程自动重拉失败: ${err instanceof Error ? err.message : String(err)}`,
        ),
      );
  }, delay);
}

export async function startRuntimeDaemon(backendPort: number): Promise<{ pid: number }> {
  const config = state.config;
  if (state.daemon) {
    throw new Error('守护进程已在运行');
  }
  assertCliEntry(config);
  // 先接管上一代壳的孤儿/陈旧锁，再fork——否则锁冲突必失败
  reapOrphanDaemon(config);
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
        // 优雅优先（P2）：daemon 的 cli 入口经 parentPort 桥接到 SIGTERM 同一 shutdown
        // 路径（socket.close + 锁释放）；Windows kill() 无 SIGTERM，超时强杀兜底
        try {
          proc.postMessage({ type: 'apm:shutdown' });
        } catch {
          // 进程已死，exit 事件即达
        }
        const killTimer = setTimeout(() => proc.kill(), GRACEFUL_DAEMON_SHUTDOWN_TIMEOUT_MS);
        proc.once('exit', () => clearTimeout(killTimer));
      }),
  };

  proc.once('exit', (code) => {
    // 用户 stop 的路径已在 stop() 里先置空 state；走到这里 = 意外退出（锁冲突/注册失败/崩溃）
    if (state.daemon === handle) {
      state.daemon = null;
      scheduleDaemonRestart(`exit code=${code ?? 'unknown'}, pid=${handle.pid}`);
    }
    logger.warn(
      `守护进程退出: code=${code ?? 'unknown'} sawOutput=${sawOutput} pid=${handle.pid}`,
    );
  });

  state.daemon = handle;
  daemonCrashCount = 0; // 手动启动或自动重拉成功都视为恢复

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
