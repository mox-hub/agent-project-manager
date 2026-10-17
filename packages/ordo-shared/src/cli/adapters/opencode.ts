/**
 * OpenCode CLI Adapter（anomalyco/opencode）
 *
 * 协议：`opencode run --format json`（NDJSON 事件流，每行一个 JSON 事件）。
 * 事件包络经本机 opencode 1.18.18 实跑采样（2026-09-19，OpenCode Go 网关）：
 *   {"type":"step_start","timestamp":…,"sessionID":"ses_…","part":{"type":"step-start",…}}
 *   {"type":"text","timestamp":…,"sessionID":"ses_…","part":{"type":"text","text":"OK",…}}
 *   {"type":"step_finish","timestamp":…,"sessionID":"ses_…","part":{"reason":"stop",
 *     "tokens":{"total":11787,"input":11751,"output":3,"reasoning":33,
 *               "cache":{"write":0,"read":0}},"cost":0.01130745,…}}
 *   {"type":"error","timestamp":…,"sessionID":"ses_…","error":{"name":"…","data":{"message":"…"}}}
 *
 * 口径：part.tokens.total = input + output + reasoning；completion 侧 = output + reasoning。
 * 工具调用事件形态未在采样中出现，按 part.type === 'tool' 宽松映射（待工具型任务实跑校准）。
 * 权限策略沿用 opencode 全局配置；无人值守放行可经 CLI_PROVIDER_CONFIG.env 注入
 * OPENCODE_PERMISSION 或在派发配置中加 --auto（危险，默认不加）。
 */

import { spawn } from 'child_process';
import {
  CliAdapter,
  CliAdapterCapabilities,
  CliExecutionInput,
  CLI_ADAPTER_CAPABILITIES,
  CliUsage,
  CommandBuildResult,
  DetectResult,
  ParseResult,
  StreamEmitter,
} from './interface';

interface OpenCodePart {
  type?: string;
  text?: string;
  tool?: string;
  state?: unknown;
  reason?: string;
  cost?: number;
  tokens?: {
    total?: number;
    input?: number;
    output?: number;
    reasoning?: number;
  };
}

interface OpenCodeEvent {
  type?: string;
  sessionID?: string;
  part?: OpenCodePart;
  error?: { name?: string; data?: { message?: string } };
}

/** 从 step_finish 的 part 提取用量（opencode 字段名不带 _tokens 后缀，extractCliUsage 不适用） */
function usageFromPart(part: OpenCodePart): CliUsage | undefined {
  const t = part.tokens;
  if (!t || typeof t !== 'object') return undefined;
  const promptTokens = typeof t.input === 'number' ? t.input : 0;
  const reasoning = typeof t.reasoning === 'number' ? t.reasoning : 0;
  const completionTokens =
    (typeof t.output === 'number' ? t.output : 0) + reasoning;
  const totalTokens =
    typeof t.total === 'number' ? t.total : promptTokens + completionTokens;
  return {
    promptTokens,
    completionTokens,
    totalTokens,
    ...(typeof part.cost === 'number' ? { costUsd: part.cost } : {}),
  };
}

export class OpenCodeAdapter implements CliAdapter {
  getProviderId(): 'opencode' {
    return 'opencode';
  }

  getCapabilities(): CliAdapterCapabilities {
    return CLI_ADAPTER_CAPABILITIES.opencode;
  }

  async detect(commandPath?: string): Promise<DetectResult> {
    return new Promise((resolve) => {
      const proc = spawn(commandPath ?? 'opencode', ['--version'], {
        shell: true,
      });

      let version = '';
      let errorOutput = '';

      proc.stdout?.on('data', (d: Buffer) => {
        version += d.toString();
      });
      proc.stderr?.on('data', (d: Buffer) => {
        errorOutput += d.toString();
      });

      proc.on('close', (code: number) => {
        if (code === 0 && version.trim()) {
          resolve({ available: true, version: version.trim() });
        } else {
          resolve({
            available: false,
            error:
              errorOutput ||
              'opencode command not found or failed to execute',
          });
        }
      });

      proc.on('error', (err: Error) => {
        resolve({ available: false, error: err.message });
      });

      setTimeout(() => {
        proc.kill();
        resolve({ available: false, error: 'Detection timeout' });
      }, 5000);
    });
  }

  buildCommand(input: CliExecutionInput): CommandBuildResult {
    const args: string[] = ['run', '--format', 'json'];
    if (input.sessionId) args.push('--session', input.sessionId);
    if (input.model) args.push('--model', input.model);
    // prompt 作 positional 放最后（yargs array positional，后续 token 会被并入消息）
    args.push(input.prompt);

    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }

    return { cmd: 'opencode', args, env };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    let event: OpenCodeEvent;
    try {
      event = JSON.parse(line) as OpenCodeEvent;
    } catch {
      if (line.trim()) emit.token?.(line);
      return;
    }

    switch (event.type) {
      case 'text': {
        const text = event.part?.text;
        if (text) emit.token?.(text);
        break;
      }
      case 'step_start':
        emit.step?.({
          stepType: 'observation',
          name: 'step',
          status: 'running',
        });
        break;
      case 'step_finish': {
        const part = event.part ?? {};
        emit.step?.({
          stepType: 'observation',
          name: `step:${part.reason ?? 'stop'}`,
          status: 'completed',
        });
        const usage = usageFromPart(part);
        if (usage) emit.usage?.(usage);
        break;
      }
      case 'tool': {
        emit.step?.({
          stepType: 'tool_call',
          name: event.part?.tool ?? 'tool',
          input: event.part?.state as Record<string, unknown> | undefined,
          status: 'running',
        });
        break;
      }
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
      default:
        break;
    }
  }

  parseFinalResult(stdout: string, exitCode: number): ParseResult {
    const artifacts: Array<{ type: string; name: string; content?: string }> =
      [];
    let usage: CliUsage | undefined;
    let finalText = '';

    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      let event: OpenCodeEvent;
      try {
        event = JSON.parse(line) as OpenCodeEvent;
      } catch {
        continue;
      }
      if (event.type === 'text' && event.part?.text) {
        finalText += (finalText ? '\n' : '') + event.part.text;
      }
      if (event.type === 'step_finish' && event.part) {
        usage = usageFromPart(event.part) ?? usage;
      }
    }

    if (exitCode !== 0) {
      return {
        status: 'failed',
        artifacts,
        error: `opencode CLI exited with code ${exitCode}`,
        output: { stdout, exitCode },
        usage,
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

    return { status: 'completed', artifacts, output: { stdout }, usage };
  }
}
