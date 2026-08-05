/**
 * Claude Code CLI Adapter
 * 命令模板: claude --print --output-format stream-json --input-format stream-json
 * 解析 NDJSON 行的 type: 'assistant'|'tool_use'|'result'
 */

import { spawn, ChildProcess } from 'child_process';
import * as readline from 'readline';
import { CliAdapter, CliExecutionInput, StreamEmitter } from './cli-adapter.interface';

export class ClaudeCodeAdapter implements CliAdapter {
  getProviderId(): 'claude-code' {
    return 'claude-code';
  }

  async detect(): Promise<{ available: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      const proc = spawn('claude', ['--version'], { shell: true });

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

  buildCommand(input: CliExecutionInput): { cmd: string; args: string[]; env: Record<string, string> } {
    const args: string[] = ['--print', '--output-format', 'stream-json', '--input-format', 'stream-json'];

    if (input.sessionId) {
      args.push('--resume', input.sessionId);
    }

    if (input.model) {
      args.push('--model', input.model);
    }

    if (input.allowedTools && input.allowedTools.length > 0) {
      args.push('--allowedTools', input.allowedTools.join(','));
    }

    if (input.maxTokens) {
      args.push('--max-tokens', input.maxTokens.toString());
    }

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    return {
      cmd: 'claude',
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
          if (data.message?.content) {
            const content = data.message.content;
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type === 'text' && block.text) {
                  emit.token?.(block.text);
                }
              }
            } else if (typeof content === 'string') {
              emit.token?.(content);
            }
          }
          break;

        case 'tool_use':
          if (data.tool?.name) {
            emit.step?.({
              stepType: 'tool_call',
              name: data.tool.name,
              input: {
                tool: data.tool.name,
                input: data.tool.input,
              },
              status: 'running',
            });
          }
          break;

        case 'result':
          if (data.subtype === 'tool_result') {
            emit.step?.({
              stepType: 'observation',
              name: data.tool_use_id || 'tool_result',
              output: { result: data.content },
              status: 'completed',
            });
          }
          break;

        case 'error':
          emit.step?.({
            stepType: 'error',
            name: 'cli_error',
            input: { message: data.error },
            status: 'failed',
          });
          break;

        case 'pending':
          if (data.approval_required) {
            emit.approvalNeeded?.({
              requestedAction: data.approval_required.action || 'Unknown action',
              actionType: 'tool_call',
              riskLevel: data.approval_required.risk_level || 'write',
              reason: data.approval_required.reason,
            });
          }
          break;

        case 'system':
          if (data.subtype === 'thinking' && data.content) {
            emit.step?.({
              stepType: 'thinking',
              name: 'thinking',
              output: { thinking: data.content },
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

  parseFinalResult(stdout: string, exitCode: number): {
    status: 'completed' | 'failed';
    artifacts: Array<{ type: string; name: string; content?: string }>;
    error?: string;
    output?: Record<string, unknown>;
  } {
    const artifacts: Array<{ type: string; name: string; content?: string }> = [];
    const lines = stdout.split('\n').filter(Boolean);
    let finalOutput: string[] = [];

    for (const line of lines) {
      try {
        const data = JSON.parse(line);

        if (data.type === 'assistant' && data.message?.content) {
          const content = data.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text) {
                finalOutput.push(block.text);
              }
            }
          }
        }

        if (data.type === 'result') {
          if (data.subtype === 'finished') {
            artifacts.push({
              type: 'result',
              name: 'execution_summary',
              content: data.content || '',
            });
          }
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
        error: `Claude CLI exited with code ${exitCode}`,
        output: { stdout, exitCode },
      };
    }

    return {
      status: 'completed',
      artifacts,
      output: { response: finalOutput.join('\n') },
    };
  }
}
