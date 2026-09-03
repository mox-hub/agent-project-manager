/**
 * daemon：本地 runtime 守护进程生命周期
 *   apm daemon start|stop|status|logs
 */
import { Command } from 'commander';
import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import {
  getBackend,
  getConfigPath,
  getProfile,
  readConfig,
  writeConfig,
} from '@apm/shared';
import { isProcessAlive, readLockHolderPid } from '../runtime/lock';
import { buildContext, out } from '../context';

function runtimeBinPath(): string {
  return path.join(__dirname, '..', 'runtime', 'index.js');
}

function runtimeLogPath(): string {
  return path.join(path.dirname(getConfigPath()), 'runtime.log');
}

function runtimeLockPath(): string {
  return path.join(path.dirname(getConfigPath()), 'runtime.lock');
}

/** 活跃守护进程 pid：锁文件优先（单实例权威），config.daemon.pid 兜底 */
function activeDaemonPid(config: ReturnType<typeof readConfig>): number | null {
  const lockPid = readLockHolderPid(runtimeLockPath());
  if (lockPid && isProcessAlive(lockPid)) return lockPid;
  const cfgPid = config.daemon?.pid;
  if (cfgPid && isProcessAlive(cfgPid)) return cfgPid;
  return null;
}

export function registerDaemonCommands(program: Command): void {
  const daemon = program.command('daemon').description('本地 runtime 守护进程');

  daemon
    .command('start')
    .description('启动守护进程（后台运行，日志写入 ~/.apm/runtime.log）')
    .option('--backend <url>', '后端地址（同时写入配置）')
    .option('--foreground', '前台运行（调试用）')
    .action((opts: { backend?: string; foreground?: boolean }, cmd: Command) => {
      const config = readConfig();
      if (opts.backend) {
        const profile = getProfile(config);
        profile.backend = opts.backend;
        writeConfig(config);
      }
      const backend = getBackend(config, opts.backend);
      if (!backend) {
        console.error('未配置后端地址：apm config set backend <url> 或 --backend <url>');
        process.exit(4);
      }
      const runningPid = activeDaemonPid(config);
      if (runningPid) {
        console.log(`守护进程已在运行（pid=${runningPid}）`);
        return;
      }
      const bin = runtimeBinPath();
      if (!fs.existsSync(bin)) {
        console.error(`守护进程入口不存在：${bin}`);
        process.exit(1);
      }

      if (opts.foreground) {
        const child = spawn(process.execPath, [bin], {
          stdio: 'inherit',
          env: { ...process.env, APM_CONFIG_PATH: getConfigPath() },
        });
        console.log(`守护进程前台运行中（pid=${child.pid}，Ctrl+C 退出）`);
        return;
      }

      const logFile = runtimeLogPath();
      fs.mkdirSync(path.dirname(logFile), { recursive: true });
      const logFd = fs.openSync(logFile, 'a');
      const child = spawn(process.execPath, [bin], {
        detached: true,
        stdio: ['ignore', logFd, logFd],
        env: { ...process.env, APM_CONFIG_PATH: getConfigPath() },
      });
      child.unref();
      config.daemon = config.daemon ?? {};
      config.daemon.pid = child.pid;
      config.daemon.startedAt = new Date().toISOString();
      writeConfig(config);
      console.log(`守护进程已启动（pid=${child.pid}，日志=${logFile}）`);
    });

  daemon
    .command('stop')
    .description('停止守护进程')
    .action(() => {
      const config = readConfig();
      const pid = activeDaemonPid(config);
      if (!pid) {
        console.log('没有运行中的守护进程');
        return;
      }
      if (process.platform === 'win32') {
        spawnSync('taskkill', ['/PID', String(pid), '/T', '/F']);
      } else {
        try {
          process.kill(pid, 'SIGTERM');
        } catch {
          // already gone
        }
      }
      // 进程退出后清掉自己的锁（防陈旧锁残留，下次启动走接管路径也不受影响）
      try {
        const lockPid = readLockHolderPid(runtimeLockPath());
        if (lockPid === pid) fs.rmSync(runtimeLockPath(), { force: true });
      } catch {
        // ignore
      }
      delete config.daemon?.pid;
      writeConfig(config);
      console.log(`守护进程已停止（pid=${pid}）`);
    });

  daemon
    .command('status')
    .description('查看守护进程状态')
    .action((_o: unknown, cmd: Command) => {
      const ctx = buildContext(cmd);
      const d = ctx.config.daemon ?? null;
      const pid = activeDaemonPid(ctx.config);
      out(ctx, {
        running: pid !== null,
        pid,
        runtimeId: ctx.config.runtime?.runtimeId ?? null,
        runtimeSessionId: d?.runtimeSessionId ?? null,
        startedAt: d?.startedAt ?? null,
        logFile: runtimeLogPath(),
      });
    });

  daemon
    .command('logs')
    .description('查看守护进程日志（尾部）')
    .option('--tail <n>', '显示行数', '100')
    .action((opts: { tail: string }) => {
      const logFile = runtimeLogPath();
      if (!fs.existsSync(logFile)) {
        console.log('暂无日志');
        return;
      }
      const lines = fs
        .readFileSync(logFile, 'utf8')
        .split('\n')
        .filter(Boolean)
        .slice(-Number(opts.tail));
      console.log(lines.join('\n'));
    });
}
