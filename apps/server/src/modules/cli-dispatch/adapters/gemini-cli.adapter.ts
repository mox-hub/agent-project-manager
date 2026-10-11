/**
 * Gemini CLI Adapter（google-gemini/gemini-cli，原生信封族）
 *
 * 协议真相（官方 headless/cli-reference/session-management 文档级确认，2026-10-11；
 * 未实机采样——本机未安装，实机真 turn 验收列余留）：
 * - 版本探测：`gemini --version`
 * - 非交互入口：`gemini -p <prompt>`（-p 强制 non-interactive；非 TTY 自动 headless）
 * - 全权限：`--approval-mode yolo`（`--yolo/-y` 已标记 Deprecated 不用；值闭集
 *   default/auto_edit/yolo/plan，APM permissionMode 合法值映射、非法回落 yolo）
 * - `--output-format stream-json`：stdout 为 NDJSON 事件流，**原生信封（非 Claude 风格）**：
 *   `{type:"init",session_id?,model}` → `{type:"message",role,content,delta?}` →
 *   `{type:"tool_use",tool_id,tool_name,parameters}` → `{type:"tool_result",tool_id,output}` →
 *   `{type:"error",severity,message}` → 终行 `{type:"result",stats,session_id,duration_ms,response?}`
 * - usage：result.stats.models.<model>.tokens.{input_tokens,output_tokens,total_tokens,cached}
 *   （多模型求和映射为统一口径；无美元成本字段）
 * - 退出码：0 成功 / 1 错误 / 42 输入错误 / 53 turn 超限
 * - 会话续接：`-r/--resume <latest|索引|UUID>`（无 --continue；session_id 从 result 终行回读）
 * - 已知边界：prompt 走 `-p` argv，Windows shell:true 链路受 cmd.exe ~8K 命令行上限约束
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
} from './cli-adapter.interface';

/** --approval-mode 合法值闭集（auto_edit 下划线是 gemini 侧拼写，与 qwen 的 auto-edit 不同） */
const GEMINI_APPROVAL_MODES = new Set(['default', 'auto_edit', 'yolo', 'plan']);

/** result.stats.models.<m>.tokens 求和映射统一 usage 口径 */
function usageFromGeminiStats(
  resultLine: Record<string, unknown>,
): CliUsage | undefined {
  const stats = resultLine.stats as Record<string, unknown> | undefined;
  const models = stats?.models as
    Record<string, Record<string, unknown>> | undefined;
  if (!models || typeof models !== 'object') return undefined;
  let input = 0;
  let output = 0;
  let total = 0;
  let seen = false;
  for (const entry of Object.values(models)) {
    const tokens = entry?.tokens as Record<string, unknown> | undefined;
    if (!tokens) continue;
    seen = true;
    if (typeof tokens.input_tokens === 'number') input += tokens.input_tokens;
    if (typeof tokens.output_tokens === 'number')
      output += tokens.output_tokens;
    if (typeof tokens.total_tokens === 'number') total += tokens.total_tokens;
  }
  if (!seen) return undefined;
  return {
    promptTokens: input,
    completionTokens: output,
    totalTokens: total || input + output,
  };
}

export class GeminiCliAdapter implements CliAdapter {
  getProviderId(): 'gemini-cli' {
    return 'gemini-cli';
  }

  getCapabilities(): CliAdapterCapabilities {
    return CLI_ADAPTER_CAPABILITIES['gemini-cli'];
  }

  async detect(commandPath?: string): Promise<DetectResult> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    return new Promise((resolve) => {
      const proc = spawn(commandPath?.trim() || 'gemini', ['--version'], {
        env,
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
      proc.on('close', (code: number | null) => {
        if (code === 0 && version.trim()) {
          resolve({ available: true, version: version.trim() });
        } else {
          resolve({
            available: false,
            error:
              errorOutput || 'gemini command not found or failed to execute',
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

    // 权限模式：合法值闭集内透传，非法/缺省回落 yolo（--yolo 已废弃不用）
    const requested = input.permissionMode?.trim();
    const mode =
      requested && GEMINI_APPROVAL_MODES.has(requested) ? requested : 'yolo';

    const args: string[] = [
      '--output-format',
      'stream-json',
      '--approval-mode',
      mode,
    ];
    if (input.sessionId) {
      args.push('--resume', input.sessionId);
    }
    if (input.model) {
      args.push('--model', input.model);
    }
    args.push('--prompt', input.prompt);

    return { cmd: 'gemini', args, env };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    if (!line.trim()) return;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(line) as Record<string, unknown>;
    } catch {
      // stdout 恒为协议输出；非 JSON 行不属于任何已知形态，忽略不猜
      return;
    }
    const type = data.type as string;

    switch (type) {
      case 'init':
        emit.step?.({
          stepType: 'observation',
          name: 'session_init',
          output: { sessionId: data.session_id, model: data.model },
          status: 'completed',
        });
        break;
      case 'message': {
        // assistant 文本（content 或 delta 形态都收）
        if (data.role === 'assistant' || data.delta !== undefined) {
          const text =
            typeof data.delta === 'string'
              ? data.delta
              : typeof data.content === 'string'
                ? data.content
                : undefined;
          if (text) emit.token?.(text);
        }
        break;
      }
      case 'tool_use':
        emit.step?.({
          stepType: 'tool_call',
          name:
            (typeof data.tool_name === 'string' && data.tool_name) ||
            (typeof data.tool_id === 'string' && data.tool_id) ||
            'tool_use',
          input: { tool: data.tool_name, input: data.parameters },
          status: 'running',
        });
        break;
      case 'tool_result':
        emit.step?.({
          stepType: 'observation',
          name:
            (typeof data.tool_id === 'string' && data.tool_id) || 'tool_result',
          output: { output: data.output },
          status: 'completed',
        });
        break;
      case 'error':
        emit.step?.({
          stepType: 'error',
          name: 'cli_error',
          input: { message: data.message, severity: data.severity },
          status: 'failed',
        });
        break;
      case 'result':
        break; // 终行口径在 parseFinalResult
      default:
        break;
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
    usage?: CliUsage;
  } {
    const artifacts: Array<{ type: string; name: string; content?: string }> =
      [];
    const messageTexts: string[] = [];
    let resultLine: Record<string, unknown> | undefined;

    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }
      if (data.type === 'result') {
        resultLine = data;
      } else if (
        data.type === 'message' &&
        data.role === 'assistant' &&
        typeof data.content === 'string'
      ) {
        messageTexts.push(data.content);
      }
    }

    const usage = resultLine ? usageFromGeminiStats(resultLine) : undefined;
    const response =
      (typeof resultLine?.response === 'string' && resultLine.response) ||
      messageTexts.join('');
    const errored =
      exitCode !== 0 || !resultLine || resultLine.error !== undefined;

    if (errored) {
      const errorField = resultLine?.error as
        Record<string, unknown> | undefined;
      return {
        status: 'failed',
        artifacts: response
          ? [{ type: 'result', name: 'execution_summary', content: response }]
          : [],
        error:
          (typeof errorField?.message === 'string' && errorField.message) ||
          (resultLine
            ? `gemini CLI exited with code ${exitCode}`
            : `gemini stream-json 输出缺少 result 终行（exit=${exitCode}）`),
        output: { stdout, exitCode, sessionId: resultLine?.session_id },
        usage,
      };
    }

    if (response) {
      artifacts.push({
        type: 'result',
        name: 'execution_summary',
        content: response,
      });
    }
    return {
      status: 'completed',
      artifacts,
      output: {
        response,
        sessionId: resultLine?.session_id,
        durationMs: resultLine?.duration_ms,
      },
      usage,
    };
  }
}
