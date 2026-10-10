/**
 * EnvironmentService 单测（2026-10-03 引导改版切片，GAP-T-65）。
 *
 * 覆盖：node/git spawn `--version` 探测（成功/非零退出/超时）、AI CLI 复用
 * cli-provider detectAll 的结果映射、探测链故障整批诚实降级（不阻塞 node/git）。
 * child_process 全 mock 防真拉进程（daemon-ops.service.spec 同解）。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventEmitter } from 'events';

type SpawnBehavior = {
  code?: number;
  stdout?: string;
  stderr?: string;
  error?: Error;
  hang?: boolean;
};

const spawnMock = vi.fn();

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...(args as [])),
}));

import { EnvironmentService } from './environment.service';

/** 伪造 ChildProcess：stdout/stderr EventEmitter + close/error 异步派发 */
function mockSpawnWith(behavior: Record<string, SpawnBehavior>) {
  spawnMock.mockImplementation((command: string) => {
    const proc = new EventEmitter() as EventEmitter & {
      stdout: EventEmitter;
      stderr: EventEmitter;
      kill: ReturnType<typeof vi.fn>;
    };
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.kill = vi.fn();
    queueMicrotask(() => {
      const b = behavior[command] ?? { code: 0, stdout: '' };
      if (b.hang) return;
      if (b.error) {
        proc.emit('error', b.error);
        return;
      }
      if (b.stdout) proc.stdout.emit('data', Buffer.from(b.stdout));
      if (b.stderr) proc.stderr.emit('data', Buffer.from(b.stderr));
      proc.emit('close', b.code ?? 0);
    });
    return proc;
  });
}

/** CliProviderService 只用到 detectAll——直给 duck-type 桩，不走 DI 容器 */
function makeService(detectAll: ReturnType<typeof vi.fn>): EnvironmentService {
  return new EnvironmentService({ detectAll } as never);
}

beforeEach(() => {
  spawnMock.mockReset();
});

describe('EnvironmentService（本地基础环境检测）', () => {
  it('node/git 探测可用并透出版本；AI CLI 映射 detectAll 结果', async () => {
    mockSpawnWith({
      node: { code: 0, stdout: 'v22.14.0\n' },
      git: { code: 0, stdout: 'git version 2.47.0' },
    });
    const detectAll = vi.fn().mockResolvedValue([
      {
        providerId: 'claude-code',
        available: true,
        version: '1.0.9',
        error: undefined,
      },
      {
        providerId: 'codex',
        available: false,
        version: undefined,
        error: 'Command not found',
      },
      {
        providerId: 'zcode',
        available: true,
        version: '0.7.14',
        error: undefined,
      },
      {
        providerId: 'opencode',
        available: false,
        version: undefined,
        error: null,
      },
    ]);
    const service = makeService(detectAll);

    const report = await service.check();

    expect(report.tools).toHaveLength(6);
    expect(report.tools[0]).toEqual({
      key: 'node',
      installed: true,
      version: 'v22.14.0',
      error: null,
    });
    expect(report.tools[1]).toEqual({
      key: 'git',
      installed: true,
      version: 'git version 2.47.0',
      error: null,
    });
    expect(report.tools[2]).toEqual({
      key: 'claude-code',
      installed: true,
      version: '1.0.9',
      error: null,
    });
    expect(report.tools[3]).toMatchObject({ key: 'codex', installed: false });
    expect(report.checkedAt).toBeTruthy();
  });

  it('命令非零退出（未安装/不可执行）→ installed=false 带 error', async () => {
    mockSpawnWith({
      node: { code: 0, stdout: 'v22.14.0' },
      git: { code: 1, stderr: 'git: command not found' },
    });
    const detectAll = vi.fn().mockResolvedValue([]);
    const service = makeService(detectAll);

    const report = await service.check();

    const git = report.tools.find((tool) => tool.key === 'git');
    expect(git).toMatchObject({
      key: 'git',
      installed: false,
      version: null,
      error: 'git: command not found',
    });
  });

  it('spawn 抛错（ENOENT 等）→ installed=false，不炸整个端点', async () => {
    mockSpawnWith({
      node: { error: new Error('spawn node ENOENT') },
      git: { code: 0, stdout: 'git version 2.47.0' },
    });
    const detectAll = vi.fn().mockResolvedValue([]);
    const service = makeService(detectAll);

    const report = await service.check();

    expect(report.tools.find((tool) => tool.key === 'node')).toMatchObject({
      installed: false,
      error: 'spawn node ENOENT',
    });
  });

  it('探测挂起 5s 超时：kill 并报 Detection timeout', async () => {
    vi.useFakeTimers();
    try {
      mockSpawnWith({
        node: { hang: true },
        git: { code: 0, stdout: 'git version 2.47.0' },
      });
      const detectAll = vi.fn().mockResolvedValue([]);
      const service = makeService(detectAll);

      const pending = service.check();
      const assertion = expect(pending).resolves.toMatchObject({
        tools: [
          { key: 'node', installed: false, error: 'Detection timeout' },
          { key: 'git', installed: true },
        ],
      });
      await vi.advanceTimersByTimeAsync(5100);
      await assertion;
      expect(spawnMock).toHaveBeenCalled();
      const killed = (
        spawnMock.mock.results[0]?.value as { kill: ReturnType<typeof vi.fn> }
      ).kill;
      expect(killed).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('AI CLI 探测链故障：四个 CLI 整批诚实降级，node/git 结果不受阻塞', async () => {
    mockSpawnWith({
      node: { code: 0, stdout: 'v22.14.0' },
      git: { code: 0, stdout: 'git version 2.47.0' },
    });
    const detectAll = vi.fn().mockRejectedValue(new Error('db down'));
    const service = makeService(detectAll);

    const report = await service.check();

    const aiTools = report.tools.filter(
      (tool) => !['node', 'git'].includes(tool.key),
    );
    expect(aiTools).toHaveLength(4);
    for (const tool of aiTools) {
      expect(tool).toMatchObject({
        installed: false,
        error: 'Detection unavailable',
      });
    }
    expect(report.tools.find((tool) => tool.key === 'node')?.installed).toBe(
      true,
    );
  });
});
