/**
 * Claude Code CLI Adapter（自 server 迁移，buildCommand 修复 prompt 经 stdin 注入）
 * 命令模板: claude --print --output-format stream-json --input-format stream-json
 */

import { spawn } from 'child_process';
import {
  CliAdapter,
  CliExecutionInput,
  CommandBuildResult,
  StreamEmitter,
} from './interface';

export class ClaudeCodeAdapter implements CliAdapter {
  getProviderId(): 'claude-code' {
    return 'claude-code';
  }

  async detect(): Promise<{ available: boolean; version?: string; error?: string }> {
    return new Promise((resolve) => {
      const proc = spawn('claude', ['--version'], { shell: true });
      let version = '';
      let errorOutput = '';
      proc.stdout?.on('data', (d: Buffer) => { version += d.toString(); });
      proc.stderr?.on('data', (d: Buffer) => { errorOutput += d.toString(); });
      proc.on('close', (code: number) => {
        if (code === 0 && version.trim()) resolve({ available: true, version: version.trim() });
        else resolve({ available: false, error: errorOutput || 'Command not found or failed to execute' });
      });
      proc.on('error', (err: Error) => resolve({ available: false, error: err.message }));
      setTimeout(() => { proc.kill(); resolve({ available: false, error: 'Detection timeout' }); }, 5000);
    });
  }

  buildCommand(input: CliExecutionInput): CommandBuildResult {
    const args: string[] = [
      '--print',
      '--output-format',
      'stream-json',
      '--input-format',
      'stream-json',
      '--verbose',
    ];
    if (input.sessionId) args.push('--resume', input.sessionId);
    if (input.model) args.push('--model', input.model);
    if (input.allowedTools && input.allowedTools.length > 0) {
      args.push('--allowedTools', input.allowedTools.join(','));
    }
    if (input.maxTokens) args.push('--max-tokens', input.maxTokens.toString());

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }

    // 修复 prompt 传递：stream-json 输入模式下 prompt 必须经 stdin NDJSON 送达
    const stdinData = JSON.stringify({
      type: 'user',
      message: { role: 'user', content: input.prompt },
    });

    return { cmd: 'claude', args, env, stdinData };
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
                if (block.type === 'text' && block.text) emit.token?.(block.text);
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
              input: { tool: data.tool.name, input: data.tool.input },
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
      if (line.trim() && !line.startsWith('{')) emit.token?.(line);
    }
  }

  parseFinalResult(stdout: string, exitCode: number) {
    const artifacts: Array<{ type: string; name: string; content?: string }> = [];
    const finalOutput: string[] = [];
    for (const line of stdout.split('\n').filter(Boolean)) {
      try {
        const data = JSON.parse(line);
        if (data.type === 'assistant' && data.message?.content) {
          const content = data.message.content;
          if (Array.isArray(content)) {
            for (const block of content) {
              if (block.type === 'text' && block.text) finalOutput.push(block.text);
            }
          }
        }
        if (data.type === 'result' && data.subtype === 'finished') {
          artifacts.push({ type: 'result', name: 'execution_summary', content: data.content || '' });
        }
      } catch {
        if (line.trim()) finalOutput.push(line);
      }
    }
    if (exitCode !== 0) {
      return { status: 'failed' as const, artifacts, error: `Claude CLI exited with code ${exitCode}`, output: { stdout, exitCode } };
    }
    return { status: 'completed' as const, artifacts, output: { response: finalOutput.join('\n') } };
  }
}
