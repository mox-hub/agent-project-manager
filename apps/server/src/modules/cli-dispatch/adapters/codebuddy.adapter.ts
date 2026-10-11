/**
 * CodeBuddy CLI Adapter（腾讯 @tencent-ai/codebuddy-code，Claude Code 兼容接口）
 *
 * 协议真相（官方 headless/cli-reference 文档级确认，cnb.cool/codebuddy/codebuddy-code，
 * 2026-10-11；未实机采样——本机未安装，实机真 turn 验收列余留）：
 * - 版本探测：`codebuddy --version`（cli-reference 未列但 commander 系标准 flag，
 *   探测失败仅落 unavailable 不炸）
 * - 非交互入口：`codebuddy -p <prompt>`（--print 同义；支持 stdin 管道）
 * - 全权限：**headless 必需 `-y/--dangerously-skip-permissions`**（官方文档：不带则
 *   文件/命令/网络操作被阻断）；HIGH/CRITICAL 命令仍可能提示（完全放行需
 *   CODEBUDDY_IS_SANDBOX=1 环境变量，不默认注入——由用户 provider env 自行决定）
 * - `--output-format stream-json`：**Claude Code 风格信封** system(init)/assistant/
 *   user(tool_result)/result(带统计)；后台任务额外 system 事件 task_started/
 *   task_progress{usage:{total_tokens,tool_uses,duration_ms}}/task_updated/task_notification
 *   （本 adapter 只消费 init 共同面，task_* 作未知形态忽略不猜）
 * - usage：assistant.message.usage / result.usage（Claude 口径直读）
 * - 会话续接：`-c/--continue` / `-r/--resume <UUID>`（先从 JSON 输出回读 session_id）
 * - allowedTools：`--allowedTools "Bash(git log:*),Read"` 逗号语法与 claude 相同
 *   （能力位 true，透传口径同 ClaudeCodeAdapter）
 * - 已知边界：prompt 走 -p argv，Windows shell:true 链路受 cmd.exe ~8K 命令行上限约束
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

export class CodeBuddyAdapter implements CliAdapter {
  getProviderId(): 'codebuddy' {
    return 'codebuddy';
  }

  getCapabilities(): CliAdapterCapabilities {
    return CLI_ADAPTER_CAPABILITIES.codebuddy;
  }

  async detect(commandPath?: string): Promise<DetectResult> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    return new Promise((resolve) => {
      const proc = spawn(commandPath?.trim() || 'codebuddy', ['--version'], {
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
              errorOutput || 'codebuddy command not found or failed to execute',
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

    const args: string[] = [
      '--print',
      '--output-format',
      'stream-json',
      // headless 必需：不带 -y 时文件/命令/网络操作被官方阻断
      '--dangerously-skip-permissions',
    ];
    if (input.sessionId) {
      args.push('--resume', input.sessionId);
    }
    if (input.model) {
      args.push('--model', input.model);
    }
    if (input.allowedTools && input.allowedTools.length > 0) {
      args.push('--allowedTools', input.allowedTools.join(','));
    }
    args.push('--prompt', input.prompt);

    return { cmd: 'codebuddy', args, env };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    // Claude 风格共同面；task_* 等外围 system 事件由核按未知形态忽略
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
    return finalizeClaudeCompatibleResult(stdout, exitCode, 'CodeBuddy');
  }
}
