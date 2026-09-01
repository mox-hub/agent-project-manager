/**
 * 框架无关的 CLI 子进程执行器（自 server cli-executor.service 抽取并修复 prompt 传递）
 *
 * - spawn 子进程 + readline 逐行喂给 adapter.parseStream
 * - prompt 注入：adapter.buildCommand 返回 stdinData 时写入 stdin；否则依赖 args
 * - 超时 kill、进程树 kill（Windows taskkill /T）
 */

import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import {
  CliAdapter,
  CliExecutionInput,
  CommandBuildResult,
  ParseResult,
  StreamEmitter,
} from './adapters/interface';

export interface RunnerCallbacks {
  onToken?: (token: string) => void;
  onStep?: (step: Parameters<NonNullable<StreamEmitter['step']>>[0]) => void;
  onApprovalNeeded?: (
    req: Parameters<NonNullable<StreamEmitter['approvalNeeded']>>[0],
  ) => void;
  /** 追加环境变量（如 APM_EXECUTION_ID） */
  env?: Record<string, string>;
}

export interface RunnerResult {
  status: 'completed' | 'failed';
  stdout: string;
  stderr: string;
  parse: ParseResult;
}

/** Windows 下用 taskkill /T 杀整棵进程树，POSIX 下 SIGTERM */
export function killProcessTree(proc: ChildProcess): void {
  if (!proc.pid) return;
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/PID', String(proc.pid), '/T', '/F']);
      return;
    } catch {
      // fallthrough
    }
  }
  try {
    proc.kill('SIGTERM');
  } catch {
    // already exited
  }
}

/**
 * 启动 CLI 子进程并返回 { proc, promise }。
 * 调用方可用 proc 做取消、await promise 取结果。
 */
export function runCliProcess(
  adapter: CliAdapter,
  input: CliExecutionInput,
  callbacks: RunnerCallbacks = {},
): { proc: ChildProcess; promise: Promise<RunnerResult> } {
  if (!input.prompt?.trim()) {
    throw new Error('prompt 缺失，无法执行 CLI');
  }

  const built = adapter.buildCommand(input) as CommandBuildResult;
  const { cmd, args, env, stdinData } = built;

  const proc = spawn(cmd, args, {
    cwd: input.workspaceRoot,
    env: { ...env, ...(callbacks.env ?? {}) },
    shell: true,
  });

  let stdout = '';
  let stderr = '';

  const promise = new Promise<RunnerResult>((resolve) => {
    const emitter: StreamEmitter = {
      token: callbacks.onToken,
      step: callbacks.onStep,
      approvalNeeded: callbacks.onApprovalNeeded,
    };

    const rl = readline.createInterface({
      input: proc.stdout!,
      crlfDelay: Infinity,
    });
    rl.on('line', (line) => {
      stdout += line + '\n';
      try {
        adapter.parseStream(line, emitter);
      } catch {
        // 单行解析失败不影响整体
      }
    });

    proc.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString();
    });

    let timeoutId: NodeJS.Timeout | undefined;
    if (input.timeout && input.timeout > 0) {
      timeoutId = setTimeout(() => {
        killProcessTree(proc);
      }, input.timeout);
    }

    proc.on('close', (code: number | null) => {
      if (timeoutId) clearTimeout(timeoutId);
      const parse = adapter.parseFinalResult(stdout, code ?? 0);
      resolve({ status: parse.status, stdout, stderr, parse });
    });
    proc.on('error', (err: Error) => {
      if (timeoutId) clearTimeout(timeoutId);
      resolve({
        status: 'failed',
        stdout,
        stderr,
        parse: { status: 'failed', artifacts: [], error: err.message },
      });
    });

    // prompt 注入：stdinData 写入后关闭 stdin
    if (stdinData) {
      try {
        proc.stdin?.write(stdinData);
        proc.stdin?.end();
      } catch {
        // stdin 已关闭
      }
    }
  });

  return { proc, promise };
}
