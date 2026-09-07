/**
 * Claude Code CLI Adapter（自 server 迁移，buildCommand 修复 prompt 经 stdin 注入）
 * 命令模板: claude --print --output-format stream-json --input-format stream-json
 */

import { spawn } from 'child_process';
import {
  CliAdapter,
  CliExecutionInput,
  CliUsage,
  CommandBuildResult,
  StreamEmitter,
  extractCliUsage,
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
        case 'system':
          // init：会话初始化（模型/工具集），作为时间线首条上下文事件
          if (data.subtype === 'init') {
            emit.step?.({
              stepType: 'observation',
              name: 'session_init',
              output: {
                model: data.model,
                tools: data.tools,
                cwd: data.cwd,
                sessionId: data.session_id,
              },
              status: 'completed',
            });
          } else if (data.subtype === 'thinking' && data.content) {
            // 兼容旧骨架约定
            emit.step?.({
              stepType: 'thinking',
              name: 'thinking',
              output: { thinking: data.content },
              status: 'completed',
            });
          }
          break;
        case 'assistant': {
          // 真实 stream-json：text/thinking/tool_use 块都在 assistant.message.content 内
          if (data.message?.usage) {
            const usage = extractCliUsage(data.message);
            if (usage) emit.usage?.(usage);
          }
          if (data.message?.content) {
            const content = data.message.content;
            if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type === 'text' && block.text) {
                  emit.token?.(block.text);
                } else if (block.type === 'thinking' && block.thinking) {
                  emit.step?.({
                    stepType: 'thinking',
                    name: 'thinking',
                    output: { thinking: block.thinking },
                    status: 'completed',
                  });
                } else if (block.type === 'tool_use' && block.name) {
                  emit.step?.({
                    stepType: 'tool_call',
                    name: block.name,
                    input: {
                      tool: block.name,
                      ...(block.input ?? {}),
                    },
                    status: 'running',
                  });
                }
              }
            } else if (typeof content === 'string') {
              emit.token?.(content);
            }
          }
          break;
        }
        case 'user': {
          // 工具结果以 user 消息回传：content 块 type=tool_result
          if (Array.isArray(data.message?.content)) {
            for (const block of data.message.content) {
              if (block.type === 'tool_result') {
                emit.step?.({
                  stepType: 'observation',
                  name: block.tool_use_id || 'tool_result',
                  output: { content: block.content },
                  status: block.is_error ? 'failed' : 'completed',
                });
              }
            }
          }
          break;
        }
        // 兼容顶层简写形态（旧骨架约定/其他 provider 风格）
        case 'tool_use':
        case 'tool_call':
          if (data.tool?.name || data.name) {
            emit.step?.({
              stepType: 'tool_call',
              name: data.tool?.name ?? data.name,
              input: { tool: data.tool?.name ?? data.name, ...(data.input ?? data.tool?.input ?? {}) },
              status: 'running',
            });
          }
          break;
        case 'tool_result':
        case 'tool_output':
          emit.step?.({
            stepType: 'observation',
            name: data.tool_use_id || 'tool_result',
            output: { content: data.content ?? data.output ?? data.result },
            status: 'completed',
          });
          break;
        case 'thinking':
          if (data.content || data.thinking) {
            emit.step?.({
              stepType: 'thinking',
              name: 'thinking',
              output: { thinking: data.content ?? data.thinking },
              status: 'completed',
            });
          }
          break;
        case 'result': {
          // 终事件：usage（input/output tokens + 顶层 total_cost_usd）
          const usage = extractCliUsage(data);
          if (usage) emit.usage?.(usage);
          if (data.subtype === 'tool_result') {
            emit.step?.({
              stepType: 'observation',
              name: data.tool_use_id || 'tool_result',
              output: { content: data.content },
              status: 'completed',
            });
          }
          break;
        }
        case 'error':
          emit.step?.({
            stepType: 'error',
            name: 'cli_error',
            input: { message: data.error },
            status: 'failed',
          });
          break;
        case 'pending':
        case 'approval_required':
          if (data.approval_required || data.action) {
            const req = data.approval_required ?? data;
            emit.approvalNeeded?.({
              requestedAction: req.action || 'Unknown action',
              actionType: 'tool_call',
              riskLevel: req.risk_level || 'write',
              reason: req.reason,
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
    let usage: CliUsage | undefined;
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
        if (data.type === 'result') {
          // 真实终事件：subtype=success/error_*，最终文本在 result 字段
          usage = extractCliUsage(data) ?? usage;
          const resultText =
            typeof data.result === 'string' ? data.result : data.content;
          if (resultText) {
            artifacts.push({ type: 'result', name: 'execution_summary', content: resultText });
          }
        }
      } catch {
        if (line.trim()) finalOutput.push(line);
      }
    }
    if (exitCode !== 0) {
      return { status: 'failed' as const, artifacts, error: `Claude CLI exited with code ${exitCode}`, output: { stdout, exitCode }, usage };
    }
    return { status: 'completed' as const, artifacts, output: { response: finalOutput.join('\n') }, usage };
  }
}
