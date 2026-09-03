/**
 * ZCode CLI Adapter (配置驱动骨架)
 *
 * TODO: 待 zcode headless 文档公开后校准协议解析
 * 当前实现按 claude 兼容协议做解析骨架
 */

import { spawn } from 'child_process';
import {
  CliAdapter,
  CliExecutionInput,
  StreamEmitter,
} from './cli-adapter.interface';

export class ZCodeAdapter implements CliAdapter {
  getProviderId(): 'zcode' {
    return 'zcode';
  }

  async detect(): Promise<{
    available: boolean;
    version?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const proc = spawn('zcode', ['--version'], { shell: true });

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
              errorOutput || 'zcode command not found or failed to execute',
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

  buildCommand(input: CliExecutionInput): {
    cmd: string;
    args: string[];
    env: Record<string, string>;
  } {
    const args: string[] = ['--output-format', 'json', '--no-interactive'];

    if (input.sessionId) {
      args.push('--session', input.sessionId);
    }

    if (input.model) {
      args.push('--model', input.model);
    }

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    return {
      cmd: 'zcode',
      args,
      env,
    };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    try {
      const data = JSON.parse(line);
      const type = data.type as string;

      switch (type) {
        case 'assistant':
        case 'text':
          if (data.content || data.text) {
            emit.token?.(data.content || data.text);
          }
          break;

        case 'tool_call':
        case 'tool_use':
          if (data.tool?.name) {
            emit.step?.({
              stepType: 'tool_call',
              name: data.tool.name,
              input: data.tool.input,
              status: 'running',
            });
          }
          break;

        case 'result':
        case 'tool_result':
          emit.step?.({
            stepType: 'observation',
            name: data.tool_use_id || 'tool_result',
            output: data.content || data.result,
            status: 'completed',
          });
          break;

        case 'error':
          emit.step?.({
            stepType: 'error',
            name: 'zcode_error',
            input: { message: data.error || data.message },
            status: 'failed',
          });
          break;

        case 'pending':
        case 'approval_required':
          emit.approvalNeeded?.({
            requestedAction: data.action || 'Unknown action',
            actionType: 'tool_call',
            riskLevel: data.risk_level || 'write',
            reason: data.reason,
          });
          break;
      }
    } catch {
      if (line.trim() && !line.startsWith('{')) {
        emit.token?.(line);
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

    if (exitCode !== 0) {
      return {
        status: 'failed',
        artifacts,
        error: `zcode CLI exited with code ${exitCode}`,
        output: { stdout, exitCode },
      };
    }

    try {
      const data = JSON.parse(stdout);
      artifacts.push({
        type: 'result',
        name: 'zcode_execution',
        content:
          typeof data === 'string' ? data : JSON.stringify(data, null, 2),
      });
    } catch {
      if (stdout.trim()) {
        artifacts.push({
          type: 'result',
          name: 'zcode_output',
          content: stdout,
        });
      }
    }

    return {
      status: 'completed',
      artifacts,
      output: { stdout },
    };
  }
}
