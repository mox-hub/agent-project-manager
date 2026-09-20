/**
 * 本机 daemon 运维（standalone 限定）
 *
 * 浏览器控制面没有桌面壳桥（ADR-015），无法从页面拉起本机守护进程；
 * server 在 standalone 模式（与用户同机）下经本机文件系统与进程表代管：
 * 状态=runtime.lock 持有者探活（config.daemon.pid 兜底），启动=detached spawn
 * CLI runtime 入口，停止=Windows taskkill /T /F（Unix SIGTERM）。
 * daemon 自带单实例锁防双开；非 standalone 模式一律 403（远程部署无权操纵用户机器）。
 */
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@/core/config/config.service';
import { spawn, spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface LocalDaemonStatus {
  running: boolean;
  pid: number | null;
  startedAt: string | null;
  logPath: string;
}

interface ApmConfigFile {
  daemon?: { pid?: number; startedAt?: string };
}

@Injectable()
export class DaemonOpsService {
  private readonly logger = new Logger(DaemonOpsService.name);

  constructor(private readonly configService: ConfigService) {}

  /** standalone 才开放：远程部署形态下 server 无权操纵访问者的本机进程 */
  assertLocalMode(): void {
    const mode =
      this.configService.get('APP_MODE') ?? process.env.APP_MODE ?? '';
    if (mode !== 'standalone') {
      throw new ForbiddenException(
        '本机 daemon 运维仅 standalone 模式开放（APP_MODE=standalone）',
      );
    }
  }

  private configDir(): string {
    const configured = process.env.APM_CONFIG_PATH;
    if (configured) return path.dirname(configured);
    return path.join(os.homedir(), '.apm');
  }

  private lockPath(): string {
    return path.join(this.configDir(), 'runtime.lock');
  }

  private logPath(): string {
    return path.join(this.configDir(), 'runtime.log');
  }

  private daemonEntryCandidates(): string[] {
    const candidates: string[] = [];
    if (process.env.APM_CLI_ENTRY) {
      candidates.push(process.env.APM_CLI_ENTRY);
    }
    // dev/standalone 布局：apps/server → ../cli/dist/runtime/index.js
    for (const base of [process.cwd(), __dirname]) {
      candidates.push(
        path.resolve(base, '../../cli/dist/runtime/index.js'),
        path.resolve(base, '../cli/dist/runtime/index.js'),
      );
    }
    return candidates;
  }

  private static isAlive(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  private readLockPid(): { pid: number; startedAt: string | null } | null {
    try {
      const parsed = JSON.parse(fs.readFileSync(this.lockPath(), 'utf8')) as {
        pid?: number;
        startedAt?: string;
      };
      return typeof parsed?.pid === 'number'
        ? { pid: parsed.pid, startedAt: parsed.startedAt ?? null }
        : null;
    } catch {
      return null;
    }
  }

  private readConfigFileDaemonPid(): number | null {
    try {
      const parsed = JSON.parse(
        fs.readFileSync(path.join(this.configDir(), 'config.json'), 'utf8'),
      ) as ApmConfigFile;
      return typeof parsed?.daemon?.pid === 'number' ? parsed.daemon.pid : null;
    } catch {
      return null;
    }
  }

  /** 活跃 daemon pid：锁文件优先（单实例权威），config.daemon.pid 兜底（与 CLI 判定一致） */
  private activePid(): { pid: number; startedAt: string | null } | null {
    const lock = this.readLockPid();
    if (lock && DaemonOpsService.isAlive(lock.pid)) return lock;
    const cfgPid = this.readConfigFileDaemonPid();
    if (cfgPid && DaemonOpsService.isAlive(cfgPid)) {
      return { pid: cfgPid, startedAt: null };
    }
    return null;
  }

  status(): LocalDaemonStatus {
    this.assertLocalMode();
    const active = this.activePid();
    return {
      running: !!active,
      pid: active?.pid ?? null,
      startedAt: active?.startedAt ?? null,
      logPath: this.logPath(),
    };
  }

  async start(): Promise<LocalDaemonStatus> {
    this.assertLocalMode();
    const running = this.activePid();
    if (running) {
      throw new BadRequestException(
        `守护进程已在运行（pid=${running.pid}），如需重启请先停止`,
      );
    }

    const entry = this.daemonEntryCandidates().find((p) => {
      try {
        return fs.existsSync(p);
      } catch {
        return false;
      }
    });
    if (!entry) {
      throw new NotFoundException(
        '未找到守护进程入口（apps/cli/dist/runtime/index.js），请先构建 @apm/cli 或设置 APM_CLI_ENTRY',
      );
    }

    const port = this.configService.port;
    fs.mkdirSync(this.configDir(), { recursive: true });
    const logFd = fs.openSync(this.logPath(), 'a');
    const child = spawn(process.execPath, [entry], {
      detached: true,
      stdio: ['ignore', logFd, logFd],
      env: {
        ...process.env,
        APM_BACKEND: `http://127.0.0.1:${port}`,
        APM_CONFIG_PATH: path.join(this.configDir(), 'config.json'),
      },
    });
    child.unref();
    this.logger.log(`本机 daemon 已拉起（pid=${child.pid}，entry=${entry}）`);

    // 宽限观察：入口损坏/锁冲突时进程秒退，避免给前端假成功
    await new Promise((resolve) => setTimeout(resolve, 1500));
    const status = this.status();
    if (!status.running) {
      throw new BadRequestException(
        '守护进程启动后立即退出（单实例锁冲突或入口损坏），请查看 ~/.apm/runtime.log',
      );
    }
    return status;
  }

  stop(): { ok: true } {
    this.assertLocalMode();
    const active = this.activePid();
    if (!active) {
      throw new BadRequestException('没有运行中的守护进程');
    }
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/PID', String(active.pid), '/T', '/F']);
    } else {
      try {
        process.kill(active.pid, 'SIGTERM');
      } catch {
        // already gone
      }
    }
    this.logger.log(`本机 daemon 已停止（pid=${active.pid}）`);
    return { ok: true };
  }
}
