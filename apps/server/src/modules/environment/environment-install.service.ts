/**
 * AI CLI 按需安装作业服务（CAP-A-30 环境自足，2026-10-17）。
 *
 * 用户在引导环境步对未安装的 npm 系 AI CLI 点「一键安装」：以受控 prefix
 * （用户数据目录 tools/，不碰系统全局）跑 `npm install -g <pkg>`，作业状态机
 * 记录 running/succeeded/failed 与日志尾部供前端轮询。
 *
 * 纪律：
 * - 包名服务端白名单（不收任意 npm spec，前端传 tool key）；
 * - runner 解析顺序：随包 node + npm（壳注入 ORDO_BUNDLED_NODE/ORDO_BUNDLED_NPM_CLI）
 *   → 系统 npm（PATH）；两者皆缺抛结构化错误回落手动指引；
 * - 测试/e2e 零网络：ORDO_ENV_INSTALL_STUB=1 时用假 runner 走完整状态机；
 * - 作业在内存（单实例 server），每工具并发幂等（running 中重复发起 409）。
 */

import {
  ConflictException,
  Injectable,
  Logger,
  UnprocessableEntityException,
} from '@nestjs/common';
import { spawn, spawnSync, type ChildProcess } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  EnvironmentInstallJobDto,
  EnvironmentToolKey,
} from './dto/environment.dto';

/** 可代装的 npm 包白名单（tool key → npm 包名；zcode 无公开包不收录） */
export const INSTALLABLE_PACKAGES: Partial<Record<EnvironmentToolKey, string>> =
  {
    'claude-code': '@anthropic-ai/claude-code',
    codex: '@openai/codex',
    opencode: 'opencode-ai',
  };

const INSTALL_TIMEOUT_MS = 10 * 60_000;
/** 日志尾部上限（字符）——避免一次失控安装把内存与响应体撑爆 */
const LOG_TAIL_LIMIT = 16_000;

type JobStatus = 'running' | 'succeeded' | 'failed';

interface JobRecord {
  jobId: string;
  tool: EnvironmentToolKey;
  pkg: string;
  status: JobStatus;
  startedAt: string;
  finishedAt: string | null;
  exitCode: number | null;
  error: string | null;
  log: string;
  child?: ChildProcess;
  timer?: NodeJS.Timeout;
}

export interface InstallRunnerSpec {
  command: string;
  args: string[];
  shell: boolean;
}

@Injectable()
export class EnvironmentInstallService {
  private readonly logger = new Logger(EnvironmentInstallService.name);
  private readonly jobs = new Map<string, JobRecord>();
  private readonly runningByTool = new Map<EnvironmentToolKey, string>();

  listInstallable(): EnvironmentToolKey[] {
    return Object.keys(INSTALLABLE_PACKAGES) as EnvironmentToolKey[];
  }

  /** 作业查询；不存在返回 null（前端据此回落「作业已过期」提示） */
  getJob(jobId: string): EnvironmentInstallJobDto | null {
    const job = this.jobs.get(jobId);
    if (!job) return null;
    return this.toDto(job);
  }

  /**
   * 发起安装。返回作业 DTO（status=running）。
   * @throws UnprocessableEntityException 工具不在白名单 / 安装器缺失
   * @throws ConflictException 同工具已有作业进行中
   */
  start(tool: EnvironmentToolKey): EnvironmentInstallJobDto {
    const pkg = INSTALLABLE_PACKAGES[tool];
    if (!pkg) {
      throw new UnprocessableEntityException(
        `Tool ${tool} is not installable (not in whitelist)`,
      );
    }
    if (this.runningByTool.has(tool)) {
      throw new ConflictException(
        `An install job for ${tool} is already running`,
      );
    }

    const runner = this.resolveRunner();
    if (!runner) {
      throw new UnprocessableEntityException(
        'No installer available: bundled npm missing and system npm not found',
      );
    }
    const toolsDir = this.resolveToolsDir();
    fs.mkdirSync(toolsDir, { recursive: true });

    const jobId = `env-install-${tool}-${Date.now().toString(36)}`;
    const job: JobRecord = {
      jobId,
      tool,
      pkg,
      status: 'running',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      exitCode: null,
      error: null,
      log: '',
    };
    this.jobs.set(jobId, job);
    this.runningByTool.set(tool, jobId);

    this.logger.log(`环境安装作业启动: ${tool} → ${pkg} prefix=${toolsDir}`);
    const child = spawn(
      runner.command,
      [...runner.args, '--prefix', toolsDir, pkg],
      {
        shell: runner.shell,
        env: {
          ...process.env,
          // 安装产物 shim 目录入 PATH：安装完成即可被后续探测与派发命中
          PATH: `${toolsDir}${path.delimiter}${process.env.PATH ?? ''}`,
        },
        windowsHide: true,
      },
    );
    job.child = child;

    const appendLog = (chunk: Buffer) => {
      job.log = (job.log + chunk.toString()).slice(-LOG_TAIL_LIMIT);
    };
    child.stdout?.on('data', appendLog);
    child.stderr?.on('data', appendLog);
    child.on('error', (err: Error) => {
      this.finish(job, 'failed', null, err.message);
    });
    child.on('close', (code) => {
      if (code === 0) {
        this.finish(job, 'succeeded', 0, null);
      } else {
        this.finish(
          job,
          'failed',
          code,
          `npm install exited with code ${code}`,
        );
      }
    });

    job.timer = setTimeout(() => {
      this.logger.warn(`环境安装作业超时: ${tool}`);
      child.kill();
      this.finish(job, 'failed', null, 'Install timed out (10m)');
    }, INSTALL_TIMEOUT_MS);

    return this.toDto(job);
  }

  /**
   * runner 解析：随包 node+npm（打包模式，壳注入 env）→ 系统 npm（dev/裁剪包）。
   * npm install -g 与 --prefix 组合把包装进 toolsDir，不要求管理员权限。
   * @returns null = 无可用安装器（上层 422 回落手动指引）
   */
  private resolveRunner(): InstallRunnerSpec | null {
    if (process.env.ORDO_ENV_INSTALL_STUB === '1') {
      // 测试专用假 runner：零网络走完状态机（e2e/spec）
      return {
        command: process.platform === 'win32' ? 'cmd' : 'sh',
        args:
          process.platform === 'win32'
            ? ['/d', '/s', '/c', 'echo stub-install-ok']
            : ['-c', 'echo stub-install-ok'],
        shell: false,
      };
    }
    const bundledNode = process.env.ORDO_BUNDLED_NODE;
    const bundledNpmCli = process.env.ORDO_BUNDLED_NPM_CLI;
    if (bundledNode && bundledNpmCli) {
      return {
        command: bundledNode,
        args: [bundledNpmCli, 'install', '-g', '--no-audit', '--no-fund'],
        shell: false,
      };
    }
    // dev / 裁剪包回落：系统 PATH 的 npm（spawn shell:true 让 Windows 解析 npm.cmd）
    const probe = spawnSync('npm', ['--version'], {
      shell: true,
      timeout: 8000,
    });
    if (probe.status !== 0) {
      return null;
    }
    return {
      command: 'npm',
      args: ['install', '-g', '--no-audit', '--no-fund'],
      shell: true,
    };
  }

  private resolveToolsDir(): string {
    return (
      process.env.ORDO_TOOLS_DIR ?? path.join(os.homedir(), '.ordo', 'tools')
    );
  }

  private finish(
    job: JobRecord,
    status: Exclude<JobStatus, 'running'>,
    exitCode: number | null,
    error: string | null,
  ): void {
    if (job.status !== 'running') return;
    if (job.timer) clearTimeout(job.timer);
    job.status = status;
    job.exitCode = exitCode;
    job.error = error;
    job.finishedAt = new Date().toISOString();
    this.runningByTool.delete(job.tool);
    this.logger.log(
      `环境安装作业结束: ${job.tool} ${status}${error ? ` (${error})` : ''}`,
    );
  }

  private toDto(job: JobRecord): EnvironmentInstallJobDto {
    return {
      jobId: job.jobId,
      tool: job.tool,
      package: job.pkg,
      status: job.status,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      exitCode: job.exitCode,
      error: job.error,
      log: job.log,
    };
  }
}
