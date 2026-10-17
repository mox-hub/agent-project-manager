/**
 * Cursor Agent CLI Adapter（cursor-agent，Claude 兼容信封族）
 *
 * 协议真相（本机 2026.07.16-899851b 安装产物源码级采样 + `--help` 实测，2026-10-11；
 * 官方文档 cursor.com/docs/cli 与本机版本存在滞后——usage 字段以本机产物为准）：
 * - 版本探测：`cursor-agent --version`（实测输出 `2026.07.16-899851b`）
 * - 非交互入口：`-p/--print` 旗标 + prompt 为**位置参数**（`cursor-agent -p [flags] <prompt>`）
 * - 全权限：`--yolo`（= -f/--force，Force allow commands）；`--trust` 免工作区信任提示
 *   （headless 专用）；`--mode plan` 为只读规划档（Ordo permissionMode='plan' 映射）
 * - `--output-format stream-json`：stdout 为 NDJSON 事件流，**Claude Code 兼容信封**
 *   `{type:"system",subtype:"init",session_id,model,permissionMode,cwd,apiKeySource}` →
 *   `{type:"user"}` → `{type:"assistant",message:{role,content:[{type:"text",text}]},session_id}` →
 *   `{type:"tool_call",subtype:"started"|"completed",call_id,tool_call,session_id,timestamp_ms}` →
 *   终行 `{type:"result",subtype:"success",is_error,duration_ms,duration_api_ms,result,
 *   session_id,request_id,usage?}`（usage 条件携带：本机产物 Se?{usage:Se}，字段
 *   input_tokens/output_tokens/cache_read_tokens/cache_creation_input_tokens）
 * - 会话续接：`--resume [chatId]`（session_id 从 result 终行回读）
 * - 已知边界：prompt 走 argv（无 stdin/attach 通道实证），Windows shell:true 链路受
 *   cmd.exe ~8K 命令行上限约束；auth 未登录无法实跑真 turn，全链验收列实机余留
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
  StreamEmitter,
} from './interface';
import {
  finalizeClaudeCompatibleResult,
  parseClaudeCompatibleStream,
} from './claude-compatible';

export class CursorAgentAdapter implements CliAdapter {
  getProviderId(): 'cursor-agent' {
    return 'cursor-agent';
  }

  getCapabilities(): CliAdapterCapabilities {
    return CLI_ADAPTER_CAPABILITIES['cursor-agent'];
  }

  async detect(): Promise<DetectResult> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    return new Promise((resolve) => {
      const proc = spawn('cursor-agent', ['--version'], { env, shell: true });
      let version = '';
      let errorOutput = '';
      proc.stdout?.on('data', (d: Buffer) => {
        version += d.toString();
      });
      proc.stderr?.on('data', (d: Buffer) => {
        errorOutput += d.toString();
      });
      proc.on('close', (code: number | null) => {
        if (code === 0 && version.trim()) {
          resolve({ available: true, version: version.trim() });
        } else {
          resolve({
            available: false,
            error: errorOutput || 'cursor-agent command not found or failed to execute',
          });
        }
      });
      proc.on('error', (err: Error) =>
        resolve({ available: false, error: err.message }),
      );
      setTimeout(() => {
        proc.kill();
        resolve({ available: false, error: 'Detection timeout' });
      }, 5000);
    });
  }

  buildCommand(input: CliExecutionInput): CommandBuildResult {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }

    const args: string[] = ['-p', '--output-format', 'stream-json'];
    // 权限模式：plan=只读规划档；其余（含缺省）全放行 yolo
    if (input.permissionMode?.trim() === 'plan') {
      args.push('--mode', 'plan');
    } else {
      args.push('--yolo');
    }
    args.push('--trust');
    if (input.sessionId) {
      args.push('--resume', input.sessionId);
    }
    if (input.model) {
      args.push('--model', input.model);
    }
    // prompt 为位置参数（官方 usage：agent -p [flags] <prompt>）
    args.push(input.prompt);

    return { cmd: 'cursor-agent', args, env };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    if (!line.trim()) return;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(line) as Record<string, unknown>;
    } catch {
      return;
    }
    // cursor 外围事件：tool_call{started|completed}（Claude 信封没有的独立事件形态）
    if (data.type === 'tool_call') {
      const subtype = data.subtype as string | undefined;
      const toolCall = data.tool_call as Record<string, unknown> | undefined;
      // 官方文档：tool_call 载荷为 readToolCall/writeToolCall/function{name,arguments}
      // 等形态——名称槽位不定，逐候选回退，全缺回落 call_id
      const pickName = (...candidates: unknown[]): string => {
        for (const c of candidates) {
          if (typeof c === 'string' && c) return c;
        }
        return typeof data.call_id === 'string' && data.call_id
          ? data.call_id
          : 'tool_call';
      };
      const fn = toolCall?.function as Record<string, unknown> | undefined;
      const name = pickName(toolCall?.toolName, toolCall?.name, fn?.name);
      if (subtype === 'started') {
        emit.step?.({
          stepType: 'tool_call',
          name,
          input: { tool: name, input: toolCall },
          status: 'running',
        });
      } else if (subtype === 'completed') {
        emit.step?.({
          stepType: 'observation',
          name,
          output: { output: toolCall },
          status: 'completed',
        });
      }
      return;
    }
    // 共同面（system init / assistant / user tool_result / result usage）
    parseClaudeCompatibleStream(line, emit);
  }

  parseFinalResult(
    stdout: string,
    exitCode: number,
  ): {
    status: 'completed' | 'failed';
    artifacts: Array<{ type: string; name: string; content?: string }>;
    error?: string;
    output?: Record<string, unknown>;
    usage?: CliUsage;
  } {
    return finalizeClaudeCompatibleResult(stdout, exitCode, 'Cursor CLI');
  }
}
