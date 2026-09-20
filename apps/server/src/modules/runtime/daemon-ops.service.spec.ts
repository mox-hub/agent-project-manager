/**
 * DaemonOpsService（本机 daemon 运维，standalone 限定）单测
 * 覆盖：非 standalone 一律 403、状态判定（锁优先/config 兜底/进程死亡）、
 * start 的已在运行分支与秒退防假成功（宽限观察）、stop 的进程树强杀调用。
 * 文件系统用临时目录（APM_CONFIG_PATH stub），child_process 全 mock 防真拉进程。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const spawnMock = vi.fn(() => ({ pid: 11111, unref: () => {} }));
const spawnSyncMock = vi.fn();

vi.mock('child_process', () => ({
  spawn: (...args: unknown[]) => spawnMock(...(args as [])),
  spawnSync: (...args: unknown[]) => spawnSyncMock(...(args as [])),
}));

import { DaemonOpsService } from './daemon-ops.service';

// 平台自洽（Linux CI 防 worker 自杀）：stop() 的非 win32 分支走
// process.kill(pid, 'SIGTERM')，而本 spec 的锁 pid 用测试进程自身——
// 不 mock 会在 Linux 上把 vitest worker 自己杀掉（SIGTERM）。
// 探活（signal 0）语义保留：仅测试进程自身视为存活，其余 pid 视为不存在。
const killSpy = vi.spyOn(process, 'kill').mockImplementation(((
  pid: number,
  signal?: string | number,
) => {
  if ((signal ?? 0) === 0 && pid !== process.pid) {
    throw new Error('ESRCH');
  }
  return true;
}) as unknown as typeof process.kill);

const makeService = (appMode: string | undefined) => {
  return new DaemonOpsService({
    get: (key: string) => (key === 'APP_MODE' ? appMode : undefined),
    port: 4300,
  } as never);
};

const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), 'apm-daemon-ops-'));

describe('DaemonOpsService（本机 daemon 运维）', () => {
  let dir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    dir = tmpDir();
    process.env.APM_CONFIG_PATH = path.join(dir, 'config.json');
    delete process.env.APM_CLI_ENTRY;
    return () => {
      fs.rmSync(dir, { recursive: true, force: true });
    };
  });

  it('非 standalone 模式：status/start/stop 一律 403', async () => {
    const service = makeService('cloud');
    expect(() => service.status()).toThrow(ForbiddenException);
    await expect(service.start()).rejects.toThrow(ForbiddenException);
    expect(() => service.stop()).toThrow(ForbiddenException);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('standalone：无锁且无存活 pid → running=false', () => {
    const service = makeService('standalone');
    const status = service.status();
    expect(status.running).toBe(false);
  });

  it('状态判定：锁持有者存活 → running（config.daemon.pid 兜底生效）', () => {
    // config.json 的 daemon.pid 指向测试进程自身（必然存活），锁文件陈旧指死进程
    fs.writeFileSync(
      path.join(dir, 'config.json'),
      JSON.stringify({ daemon: { pid: process.pid } }),
    );
    fs.writeFileSync(
      path.join(dir, 'runtime.lock'),
      JSON.stringify({ pid: 999999999, startedAt: '2026-09-19T00:00:00Z' }),
    );
    const service = makeService('standalone');
    const status = service.status();
    expect(status.running).toBe(true);
    expect(status.pid).toBe(process.pid);
    expect(status.logPath).toBe(path.join(dir, 'runtime.log'));
  });

  it('锁文件陈旧（持锁进程已死）且 config 无 pid → running=false', () => {
    fs.writeFileSync(
      path.join(dir, 'runtime.lock'),
      JSON.stringify({ pid: 999999999, startedAt: '2026-09-19T00:00:00Z' }),
    );
    const service = makeService('standalone');
    expect(service.status().running).toBe(false);
  });

  it('start：已在运行 → 400，不 spawn', async () => {
    fs.writeFileSync(
      path.join(dir, 'runtime.lock'),
      JSON.stringify({ pid: process.pid, startedAt: '2026-09-19T00:00:00Z' }),
    );
    const service = makeService('standalone');
    await expect(service.start()).rejects.toThrow(BadRequestException);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('start：spawn 后 daemon 秒退（锁未建立）→ 400 防假成功', async () => {
    // APM_CLI_ENTRY 指向一个存在的占位文件 → 探测命中 → spawn（mock）→ 1.5s 宽限观察
    // 发现锁不存在（spawn 被 mock，无真进程）→ BadRequest 而非假成功
    const placeholder = path.join(dir, 'entry.js');
    fs.writeFileSync(placeholder, '// stub entry');
    process.env.APM_CLI_ENTRY = placeholder;
    const service = makeService('standalone');
    await expect(service.start()).rejects.toThrow(BadRequestException);
    expect(spawnMock).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = vi.mocked(spawnMock).mock.calls[0] as [
      string,
      string[],
      { detached: boolean; env: Record<string, string> },
    ];
    expect(cmd).toBe(process.execPath);
    expect(args).toEqual([placeholder]);
    expect(opts.detached).toBe(true);
    expect(opts.env.APM_BACKEND).toBe('http://127.0.0.1:4300');
  });

  it('stop：未运行 → 400；运行中（锁 pid 存活）→ 平台强杀（win32 taskkill /T /F，Unix SIGTERM）', () => {
    const service = makeService('standalone');

    expect(() => service.stop()).toThrow(BadRequestException);

    fs.writeFileSync(
      path.join(dir, 'runtime.lock'),
      JSON.stringify({ pid: process.pid, startedAt: '2026-09-19T00:00:00Z' }),
    );
    service.stop();
    if (process.platform === 'win32') {
      expect(spawnSyncMock).toHaveBeenCalledWith(
        'taskkill',
        expect.arrayContaining(['/PID', String(process.pid), '/T', '/F']),
      );
    } else {
      expect(killSpy).toHaveBeenCalledWith(process.pid, 'SIGTERM');
    }
  });
});
