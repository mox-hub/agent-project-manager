/**
 * OpenAI Codex CLI Adapter
 * 命令模板: codex exec --json [<prompt>]
 * 解析 JSON 事件流
 */

import { spawn } from 'child_process';
import {
  CliAdapter,
  CliExecutionInput,
  StreamEmitter,
} from './cli-adapter.interface';

export class CodexAdapter implements CliAdapter {
  getProviderId(): 'codex' {
    return 'codex';
  }

  async detect(): Promise<{
    available: boolean;
    version?: string;
    error?: string;
  }> {
    return new Promise((resolve) => {
      const proc = spawn('codex', ['--version'], { shell: true });

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
            error: errorOutput || 'Command not found or failed to execute',
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
    const args: string[] = ['exec', '--json', '--non-interactive'];

    if (input.model) {
      args.push('--model', input.model);
    }

    if (input.allowedTools && input.allowedTools.length > 0) {
      args.push('--allow', input.allowedTools.join(','));
    }

    if (input.timeout) {
      args.push('--timeout', input.timeout.toString());
    }

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    return {
      cmd: 'codex',
      args,
      env,
    };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    try {
      const data = JSON.parse(line);
      const type = data.type as string;

      switch (type) {
        case 'text':
        case 'text_delta':
          if (data.content) {
            emit.token?.(data.content);
          }
          break;

        case 'tool_call':
        case 'tool_use':
          if (data.name) {
            emit.step?.({
              stepType: 'tool_call',
              name: data.name,
              input: data.input || {},
              status: 'running',
            });
          }
          break;

        case 'tool_output':
        case 'tool_result':
          emit.step?.({
            stepType: 'observation',
            name: data.tool_call_id || 'tool_result',
            output: { result: data.output || data.result },
            status: 'completed',
          });
          break;

        case 'thinking':
          if (data.content) {
            emit.step?.({
              stepType: 'thinking',
              name: 'thinking',
              output: { thinking: data.content },
              status: 'completed',
            });
          }
          break;

        case 'error':
          emit.step?.({
            stepType: 'error',
            name: 'codex_error',
            input: { message: data.message || data.error },
            status: 'failed',
          });
          break;

        case 'approval_required':
          emit.approvalNeeded?.({
            requestedAction: data.action || 'Unknown action',
            actionType: 'tool_call',
            riskLevel: data.risk_level || 'write',
            reason: data.reason,
          });
          break;

        case 'status':
          if (data.message) {
            emit.step?.({
              stepType: 'observation',
              name: 'status',
              output: { message: data.message },
              status: 'completed',
            });
          }
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
    const lines = stdout.split('\n').filter(Boolean);
    const finalOutput: string[] = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        if (
          (data.type === 'text' || data.type === 'text_delta') &&
          data.content
        ) {
          finalOutput.push(data.content);
        }

        if (data.type === 'completed' || data.type === 'finished') {
          artifacts.push({
            type: 'result',
            name: 'codex_execution',
            content: data.summary || JSON.stringify(data, null, 2),
          });
        }
      } catch {
        if (line.trim()) {
          finalOutput.push(line);
        }
      }
    }

    if (exitCode !== 0) {
      return {
        status: 'failed',
        artifacts,
        error: `Codex CLI exited with code ${exitCode}`,
        output: { stdout, exitCode },
      };
    }

    return {
      status: 'completed',
      artifacts,
      output: { response: finalOutput.join('') },
    };
  }
}
