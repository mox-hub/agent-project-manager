/**
 * 单实例锁行为：原子创建、双开拒绝、释放、陈旧锁接管
 */
import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { acquireRuntimeLock, readLockHolderPid } from './lock';

const dirs: string[] = [];

function tmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'apm-lock-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('acquireRuntimeLock', () => {
  it('首次获取成功并写入持有者 pid', () => {
    const dir = tmpDir();
    const lock = acquireRuntimeLock(dir);
    expect(readLockHolderPid(lock.lockPath)).toBe(process.pid);
    lock.release();
  });

  it('持有者存活时二次获取抛错', () => {
    const dir = tmpDir();
    const lock = acquireRuntimeLock(dir);
    expect(() =>
      acquireRuntimeLock(dir, { isAlive: () => true }),
    ).toThrow(/只允许一个实例/);
    lock.release();
  });

  it('release 后可重新获取', () => {
    const dir = tmpDir();
    const lock = acquireRuntimeLock(dir);
    lock.release();
    const again = acquireRuntimeLock(dir);
    again.release();
  });

  it('陈旧锁（持有者已死）自动接管', () => {
    const dir = tmpDir();
    const lockPath = path.join(dir, 'runtime.lock');
    fs.writeFileSync(lockPath, JSON.stringify({ pid: 999999999 }));
    const lock = acquireRuntimeLock(dir, { isAlive: () => false });
    expect(readLockHolderPid(lockPath)).toBe(process.pid);
    lock.release();
  });

  it('损坏的锁文件视为陈旧并接管', () => {
    const dir = tmpDir();
    const lockPath = path.join(dir, 'runtime.lock');
    fs.writeFileSync(lockPath, 'not-json');
    const lock = acquireRuntimeLock(dir);
    expect(readLockHolderPid(lockPath)).toBe(process.pid);
    lock.release();
  });
});
