/**
 * EnvironmentInstallService 单测（CAP-A-30 环境自足，GAP-T-70）。
 *
 * 覆盖安装作业状态机：runner 解析（随包 node+npm 优先 / stub 模式）、白名单
 * 422、同工具并发 409、成功/失败终态与日志、失败后释放并发位、超时强杀、
 * 作业查询与未知 jobId。child_process 全 mock 防真拉进程（环境 spec 同解）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type SpawnBehavior = {
  code?: number;
  stdout?: string;
  stderr?: string;
  error?: Error;
  hang?: boolean;
};

const spawnMock = vi.fn();
const spawnSyncMock = vi.fn((): { status: number | null } => ({ status: 0 }));

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...(args as [])),
  spawnSync: (...args: unknown[]) => spawnSyncMock(...(args as [])),
}));

import { EnvironmentInstallService } from './environment-install.service';

function spawnOnceWith(behavior: SpawnBehavior) {
  spawnMock.mockImplementation(() => {
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof vi.fn>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = vi.fn();
    queueMicrotask(() => {
      if (behavior.hang) return;
      if (behavior.error) {
        proc.emit('error', behavior.error);
        return;
      }
      if (behavior.stdout)
        proc.stdout.emit('data', Buffer.from(behavior.stdout));
      if (behavior.stderr)
        proc.stderr.emit('data', Buffer.from(behavior.stderr));
      proc.emit('close', behavior.code ?? 0);
    });
    return proc;
  });
}

/** 常驻构造：spawn 挂起（作业停在 running，用例自行推进） */
function makeServiceWithHangingSpawn(): EnvironmentInstallService {
  spawnOnceWith({ hang: true });
  return new EnvironmentInstallService();
}

let toolsDir: string;

beforeEach(() => {
  spawnMock.mockReset();
  toolsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ordo-env-install-'));
  process.env.ORDO_TOOLS_DIR = toolsDir;
  delete process.env.ORDO_ENV_INSTALL_STUB;
  process.env.ORDO_BUNDLED_NODE = 'C:\\bundled\\node.exe';
  process.env.ORDO_BUNDLED_NPM_CLI = 'C:\\bundled\\npm\\bin\\npm-cli.js';
});

afterEach(() => {
  delete process.env.ORDO_TOOLS_DIR;
  delete process.env.ORDO_ENV_INSTALL_STUB;
  delete process.env.ORDO_BUNDLED_NODE;
  delete process.env.ORDO_BUNDLED_NPM_CLI;
  fs.rmSync(toolsDir, { recursive: true, force: true });
});

describe('EnvironmentInstallService（AI CLI 按需安装作业）', () => {
  it('start：随包 runner 拼对参数（npm-cli + --prefix toolsDir + 白名单包名），PATH 前插 toolsDir', () => {
    spawnOnceWith({ hang: true });
    const service = new EnvironmentInstallService();

    const job = service.start('claude-code');

    expect(job.status).toBe('running');
    expect(job.package).toBe('@anthropic-ai/claude-code');
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [command, args, options] = spawnMock.mock.calls[0] as [
      string,
      string[],
      { env: Record<string, string> },
    ];
    expect(command).toBe('C:\\bundled\\node.exe');
    expect(args).toEqual([
      'C:\\bundled\\npm\\bin\\npm-cli.js',
      'install',
      '-g',
      '--no-audit',
      '--no-fund',
      '--prefix',
      toolsDir,
      '@anthropic-ai/claude-code',
    ]);
    expect(options.env.PATH.startsWith(toolsDir)).toBe(true);
  });

  it('安装成功：close 0 → succeeded 终态带日志，并发位释放', async () => {
    spawnOnceWith({ code: 0, stdout: 'added 1 package' });
    const service = new EnvironmentInstallService();

    const job = service.start('codex');
    await vi.waitFor(() => {
      expect(service.getJob(job.jobId)?.status).toBe('succeeded');
    });

    const done = service.getJob(job.jobId)!;
    expect(done.status).toBe('succeeded');
    expect(done.exitCode).toBe(0);
    expect(done.log).toContain('added 1 package');
    expect(done.finishedAt).toBeTruthy();
    // 并发位已释放：同工具可再次发起
    expect(() => service.start('codex')).not.toThrow();
  });

  it('安装失败：close 非零 → failed 带 error 与日志；失败后可重试', async () => {
    spawnOnceWith({ code: 1, stderr: 'npm ERR! network' });
    const service = new EnvironmentInstallService();

    const job = service.start('opencode');
    await vi.waitFor(() => {
      expect(service.getJob(job.jobId)?.status).toBe('failed');
    });

    const done = service.getJob(job.jobId)!;
    expect(done.status).toBe('failed');
    expect(done.exitCode).toBe(1);
    expect(done.error).toContain('exited with code 1');
    expect(done.log).toContain('npm ERR! network');
    expect(() => service.start('opencode')).not.toThrow();
  });

  it('白名单外工具（zcode/node/git）422 不可代装', () => {
    const service = makeServiceWithHangingSpawn();
    for (const tool of ['zcode', 'node', 'git'] as const) {
      expect(() => service.start(tool)).toThrowError(/not installable/);
    }
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('同工具并发安装 409；不同工具互不影响', () => {
    const service = makeServiceWithHangingSpawn();
    service.start('claude-code');
    expect(() => service.start('claude-code')).toThrowError(/already running/);
    expect(() => service.start('codex')).not.toThrow();
  });

  it('无可用安装器（bundled 与系统 npm 皆缺）→ 422', () => {
    delete process.env.ORDO_BUNDLED_NODE;
    delete process.env.ORDO_BUNDLED_NPM_CLI;
    spawnSyncMock.mockReturnValue({ status: 1 });
    const service = new EnvironmentInstallService();
    expect(() => service.start('claude-code')).toThrowError(
      /No installer available/,
    );
  });

  it('10 分钟超时：强杀子进程并置 failed', async () => {
    vi.useFakeTimers();
    try {
      const service = makeServiceWithHangingSpawn();
      const job = service.start('claude-code');

      const assertion = vi.waitFor(
        () => {
          expect(service.getJob(job.jobId)?.status).toBe('failed');
        },
        { timeout: 60_000 },
      );
      await vi.advanceTimersByTimeAsync(10 * 60_000 + 1000);
      await assertion;

      const done = service.getJob(job.jobId)!;
      expect(done.status).toBe('failed');
      expect(done.error).toContain('timed out');
      expect(spawnMock.mock.results[0]?.value.kill).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('getJob 未知 jobId 返回 null（controller 层转 404）', () => {
    const service = new EnvironmentInstallService();
    expect(service.getJob('nope')).toBeNull();
  });
});
