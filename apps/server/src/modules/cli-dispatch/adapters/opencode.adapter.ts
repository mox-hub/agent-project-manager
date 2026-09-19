/**
 * OpenCode CLI Adapter（anomalyco/opencode）
 *
 * 协议：`opencode run --format json`（NDJSON 事件流）。
 * 事件采样与解析口径见 packages/apm-shared/src/cli/adapters/opencode.ts（单源），
 * 本文件为 server 侧镜像实现（接口不含 usage 回调，与既有双轨结构一致）。
 */

import { spawn } from 'child_process';
import {
  CliAdapter,
  CliExecutionInput,
  CommandBuildResult,
  StreamEmitter,
} from './cli-adapter.interface';

export class OpenCodeAdapter implements CliAdapter {
  getProviderId(): 'opencode' {
    return 'opencode';
  }

  async detect(commandPath?: string): Promise<{
    available: boolean;
    version?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const proc = spawn(commandPath ?? 'opencode', ['--version'], {
        shell: true,
      });

      let version = '';
      let errorOutput = '';

      proc.stdout?.on('data', (data: Buffer) => {
        version += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code: number) => {
        if (code === 0 && version.trim()) {
          resolve({
            available: true,
            version: version.trim(),
          });
        } else {
          resolve({
            available: false,
            error:
              errorOutput || 'opencode command not found or failed to execute',
          });
        }
      });

      proc.on('error', (err: Error) => {
        resolve({
          available: false,
          error: err.message,
        });
      });

      setTimeout(() => {
        proc.kill();
        resolve({
          available: false,
          error: 'Detection timeout',
        });
      }, 5000);
    });
  }

  buildCommand(input: CliExecutionInput): CommandBuildResult {
    const args: string[] = ['run', '--format', 'json'];

    if (input.sessionId) {
      args.push('--session', input.sessionId);
    }

    if (input.model) {
      args.push('--model', input.model);
    }

    args.push(input.prompt);

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    return {
      cmd: 'opencode',
      args,
      env,
    };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    let event: {
      type?: string;
      part?: {
        type?: string;
        text?: string;
        tool?: string;
        state?: unknown;
        reason?: string;
      };
      error?: { name?: string; data?: { message?: string } };
    };
    try {
      event = JSON.parse(line);
    } catch {
      if (line.trim()) {
        emit.token?.(line);
      }
      return;
    }

    switch (event.type) {
      case 'text':
        if (event.part?.text) {
          emit.token?.(event.part.text);
        }
        break;

      case 'step_start':
        emit.step?.({
          stepType: 'observation',
          name: 'step',
          status: 'running',
        });
        break;

      case 'step_finish':
        emit.step?.({
          stepType: 'observation',
          name: `step:${event.part?.reason ?? 'stop'}`,
          status: 'completed',
        });
        break;

      case 'tool':
        emit.step?.({
          stepType: 'tool_call',
          name: event.part?.tool ?? 'tool',
          input: event.part?.state as Record<string, unknown> | undefined,
          status: 'running',
        });
        break;

      case 'error': {
        const message =
          event.error?.data?.message ?? event.error?.name ?? 'unknown error';
        emit.step?.({
          stepType: 'error',
          name: 'opencode_error',
          input: { message },
          status: 'failed',
        });
        break;
      }
    }
  }

  parseFinalResult(
    stdout: string,
    exitCode: number,
  ): {
    status: 'completed' | 'failed';
    artifacts: Array<{ type: string; name: string; content?: string }>;
    error?: string;
    output?: Record<string, unknown>;
  } {
    const artifacts: Array<{ type: string; name: string; content?: string }> =
      [];
    let finalText = '';

    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as {
          type?: string;
          part?: { text?: string };
        };
        if (event.type === 'text' && event.part?.text) {
          finalText += (finalText ? '\n' : '') + event.part.text;
        }
      } catch {
        // 非 JSON 行忽略（--format json 模式下 stdout 应为纯事件流）
      }
    }

    if (exitCode !== 0) {
      return {
        status: 'failed',
        artifacts,
        error: `opencode CLI exited with code ${exitCode}`,
        output: { stdout, exitCode },
      };
    }

    if (finalText) {
      artifacts.push({
        type: 'result',
        name: 'execution_summary',
        content: finalText,
      });
    } else if (stdout.trim()) {
      artifacts.push({
        type: 'result',
        name: 'opencode_output',
        content: stdout,
      });
    }

    return {
      status: 'completed',
      artifacts,
      output: { stdout },
    };
  }
}
