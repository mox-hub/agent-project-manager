/**
 * 守护进程本机单实例锁：配置目录下 runtime.lock。
 * `wx` 原子创建防双开竞态；持锁进程死亡后允许接管陈旧锁；
 * release 仅删除自己持有的锁（不误删接管者的新锁）。
 */
import * as fs from 'fs';
import * as path from 'path';

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

/** 读取锁文件中的持有者 pid（文件缺失/损坏返回 null） */
export function readLockHolderPid(lockPath: string): number | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(lockPath, 'utf8')) as {
      pid?: number;
    };
    return typeof parsed?.pid === 'number' ? parsed.pid : null;
  } catch {
    return null;
  }
}

export interface RuntimeLock {
  /** 释放锁（仅对锁文件里仍是自己 pid 时生效） */
  release: () => void;
  /** 锁文件路径 */
  lockPath: string;
}

export function acquireRuntimeLock(
  dir: string,
  opts: { isAlive?: (pid: number) => boolean } = {},
): RuntimeLock {
  const lockPath = path.join(dir, 'runtime.lock');
  const isAlive = opts.isAlive ?? isProcessAlive;
  const pid = process.pid;

  const tryCreate = (): RuntimeLock => {
    const fd = fs.openSync(lockPath, 'wx');
    try {
      fs.writeFileSync(
        fd,
        JSON.stringify({ pid, startedAt: new Date().toISOString() }),
      );
    } finally {
      fs.closeSync(fd);
    }
    return {
      lockPath,
      release: () => {
        try {
          const current = JSON.parse(
            fs.readFileSync(lockPath, 'utf8'),
          ) as { pid?: number };
          if (current?.pid === pid) {
            fs.rmSync(lockPath, { force: true });
          }
        } catch {
          // 锁已被接管或删除——不动他人的新锁
        }
      },
    };
  };

  try {
    return tryCreate();
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'EEXIST') {
      throw err;
    }
  }

  // 锁已存在：读持有者 pid 判活
  let holderPid = 0;
  try {
    holderPid =
      (JSON.parse(fs.readFileSync(lockPath, 'utf8')) as { pid?: number })
        .pid ?? 0;
  } catch {
    // 损坏的锁文件视为陈旧
  }
  if (holderPid && isAlive(holderPid)) {
    throw new Error(
      `本机已有守护进程在运行（pid=${holderPid}，锁=${lockPath}），同一台机器只允许一个实例`,
    );
  }
  // 陈旧锁（持有者已死/不可读）：接管
  fs.rmSync(lockPath, { force: true });
  return tryCreate();
}
