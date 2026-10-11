/**
 * Grok CLI Adapter（xAI 官方 Grok Build，github.com/xai-org/grok-build，Rust 单二进制）
 *
 * 协议真相（官方 headless/sessions user-guide 字段级保真文档确认，2026-10-11；
 * 未实机采样——本机未安装，实机真 turn 验收列余留。npm 上的 grok/grok-cli 均为
 * 社区无关包，本 adapter 只面向 xAI 官方 `grok`）：
 * - 版本探测：`grok --version`
 * - 非交互入口：`grok -p <prompt>`（-p = --single；另有 --prompt-file 触发 headless）
 * - 全权限：`--yolo`（Auto-approve all tool executions；等价
 *   --permission-mode bypassPermissions）
 * - 输出格式四选：plain/json/streaming-json/streaming-messages-json——本 adapter 选
 *   **streaming-messages-json（Claude Messages wire 兼容信封）**：system(subtype:init,
 *   session_id,model) → assistant(content: text/thinking/tool_use) → user(tool_result) →
 *   result(subtype:success, is_error, duration_ms, num_turns, result, usage, modelUsage,
 *   session_id)
 * - usage：result.usage.{input_tokens[未缓存部分],cache_read_input_tokens,
 *   cache_creation_input_tokens,output_tokens,reasoning_tokens,total_tokens} + 顶层
 *   total_cost_usd（extractCliUsage 兼容读取）
 * - 会话续接：`-r/--resume <ID或标题>` / `-c/--continue`（sessionId 从 result 终行回读；
 *   -s/--session-id 是新建指定 ID 语义，不用于续接）
 * - 已知边界：prompt 走 -p argv，Windows shell:true 链路受 cmd.exe ~8K 命令行上限约束
 *   （--prompt-file 长提示词通道留待实机采样后启用）
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
import {
  finalizeClaudeCompatibleResult,
  parseClaudeCompatibleStream,
} from './claude-compatible';

export class GrokAdapter implements CliAdapter {
  getProviderId(): 'grok' {
    return 'grok';
  }

  getCapabilities(): CliAdapterCapabilities {
    return CLI_ADAPTER_CAPABILITIES.grok;
  }

  async detect(commandPath?: string): Promise<DetectResult> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    return new Promise((resolve) => {
      const proc = spawn(commandPath?.trim() || 'grok', ['--version'], {
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
            error: errorOutput || 'grok command not found or failed to execute',
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

    // 权限模式：plan 透传为 --permission-mode plan（只读规划档），其余全放行 --yolo
    const mode = input.permissionMode?.trim();
    const args: string[] = [
      '--output-format',
      'streaming-messages-json',
      ...(mode === 'plan' ? ['--permission-mode', 'plan'] : ['--yolo']),
    ];
    if (input.sessionId) {
      args.push('--resume', input.sessionId);
    }
    if (input.model) {
      args.push('--model', input.model);
    }
    args.push('--prompt', input.prompt);

    return { cmd: 'grok', args, env };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    // Claude Messages 兼容信封：system(init)/assistant(text+tool_use)/user(tool_result)/
    // result(usage+total_cost_usd) 全部落共同面
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
    return finalizeClaudeCompatibleResult(stdout, exitCode, 'Grok CLI');
  }
}
