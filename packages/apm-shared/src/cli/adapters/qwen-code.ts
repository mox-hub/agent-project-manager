/**
 * Qwen Code Adapter（QwenLM/qwen-code，Gemini fork 但信封已分化为 Claude 风格）
 *
 * 协议真相（官方 headless/commands 文档 + 源码 top-level-options.ts 级确认，2026-10-11；
 * 未实机采样——本机未安装，实机真 turn 验收列余留）：
 * - 版本探测：`qwen --version`
 * - 非交互入口：`qwen -p <prompt>`（支持 stdin 管道）
 * - 全权限：`--yolo`（qwen 侧仍是推荐用法，未废弃）；`--approval-mode` 值闭集
 *   plan/default/auto-edit/auto/yolo（注意连字符 auto-edit，与 gemini 的 auto_edit 不同）
 * - `--output-format stream-json`：stdout 为 NDJSON 事件流，**Claude Code 风格信封**：
 *   `{type:"system",subtype:"session_start",uuid,session_id,model}` →
 *   `{type:"assistant",message:{role,content[],usage}}` →
 *   `{type:"user",message:{role,content:[tool_result]}}` →
 *   终行 `{type:"result",subtype:"success",is_error,duration_ms,result,usage,stats}`
 * - usage：result.usage 直读（Claude 口径 input_tokens/output_tokens）+
 *   stats.models.<m>.tokens.total 旁证
 * - 会话续接：`--resume <sessionId>` / `--continue`（会话存 ~/.qwen/projects/...）
 * - 已知边界：prompt 走 -p argv，Windows shell:true 链路受 cmd.exe ~8K 命令行上限约束；
 *   tool_result.content 超 64KiB 官方截断为头尾预览（qwen 侧行为，时间线观察接受）
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

/** --approval-mode 合法值闭集（连字符 auto-edit 是 qwen 侧拼写） */
const QWEN_APPROVAL_MODES = new Set(['plan', 'default', 'auto-edit', 'auto', 'yolo']);

export class QwenCodeAdapter implements CliAdapter {
  getProviderId(): 'qwen-code' {
    return 'qwen-code';
  }

  getCapabilities(): CliAdapterCapabilities {
    return CLI_ADAPTER_CAPABILITIES['qwen-code'];
  }

  async detect(): Promise<DetectResult> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    return new Promise((resolve) => {
      const proc = spawn('qwen', ['--version'], { env, shell: true });
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
            error: errorOutput || 'qwen command not found or failed to execute',
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

    const requested = input.permissionMode?.trim();
    const mode = requested && QWEN_APPROVAL_MODES.has(requested) ? requested : 'yolo';

    const args: string[] = ['--output-format', 'stream-json', '--approval-mode', mode];
    if (input.sessionId) {
      args.push('--resume', input.sessionId);
    }
    if (input.model) {
      args.push('--model', input.model);
    }
    args.push('--prompt', input.prompt);

    return { cmd: 'qwen', args, env };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    // qwen 信封即 Claude 风格共同面（session_start/assistant/user/result），无外围事件
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
    return finalizeClaudeCompatibleResult(stdout, exitCode, 'Qwen Code');
  }
}
