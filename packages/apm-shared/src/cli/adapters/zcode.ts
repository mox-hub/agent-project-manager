/**
 * ZCode CLI Adapter（headless 协议校准版，自 server 迁移后重写）
 *
 * 协议真相（zcode v0.16.9 实测采样 + 源码对照，2026-09-26；采样记录见 GAP-T-47）：
 * - 非交互入口 `-p <text>`：prompt 是选项参数（位置参数是子命令名），**无 stdin 通道**
 * - goal 模式派发 = `-p "/goal <objective>"`（与 `--target` 语义等价，后者与 -p 互斥）
 * - `--output-format stream-json`：stdout 为 NDJSON 事件流，每行信封
 *   `{type, eventId, sessionId, seq, timestamp(ms), traceId, turnId?, payload}`，
 *   终行 `{type:"result", sessionId, response, usage?, projection, eventCount}`（此后无事件）
 * - 事件 type 闭集：session.created/session.resumed/turn.started/turn.completed/turn.failed/
 *   message.upserted/model.streaming{kind:"text_delta"|...}/tool.updated{kind:"started"|"progress"|"result"|"error"}/
 *   permission.requested/workflow.run.progress/session.updated(catch-all)
 * - usage：`{inputTokens, outputTokens, totalTokens, cacheReadTokens, ..., source:"provider"}`，
 *   无美元成本字段
 * - 退出码：0 成功 / 1 错误 / 130 SIGINT / 143 SIGTERM；诊断与进度走 stderr，stdout 恒为协议输出
 * - headless 默认权限模式 = yolo（源码 DEFAULT_HEADLESS_PROMPT_MODE），headless 无交互审批面；
 *   派发前的治理门禁（信任/验收/blocks）由 APM 侧承担
 * - 环境阻塞记录：桌面壳外的 standalone 进程若无可用的 api-key 型 provider，zcode 以
 *   turn.failed（model_creation: "Select a model before continuing"）失败——账号型 provider
 *   由桌面宿主经 app-server 协议推送物化，裸进程不可达。本 adapter 诚实落 failed，不伪造成功；
 *   实机全链验收前置 = 终端执行 `zcode login`（或配置 api-key 型 provider）后复测
 *
 * prompt 传递与 Windows 命令行限制：
 * - 入口为 .cjs/.mjs/.js 时用 process.execPath 直启（shell:false，CreateProcess 上限 32K），
 *   绕开 cmd.exe shell 路径的 ~8K 上限与特殊字符改写；入口为 PATH 命令名时回退 shell:true
 * - 超长 prompt（>24K 字符）写临时文件经 `--attach` 兜底，`-p` 只携带引导语
 */

import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  CliAdapter,
  CliAdapterCapabilities,
  CliExecutionInput,
  CLI_ADAPTER_CAPABILITIES,
  CliUsage,
  CommandBuildResult,
  StreamEmitter,
  extractCliUsage,
} from './interface';

/** 超过该长度的 prompt 转投 --attach 临时文件（shell 直启 8K / 直启 32K 的安全留白） */
const ZCODE_PROMPT_INLINE_LIMIT = 24_000;

const ATTACH_BOOTSTRAP_PROMPT =
  '请阅读附件中的完整任务说明并严格执行；附件内容就是本次任务的全部要求，不要等待后续输入。';

/** 解析 zcode 入口：env.ZCODE_ENTRY 指向 .cjs/.mjs/.js 时返回 {entryPath}（node 直启） */
function resolveZcodeEntry(env: Record<string, string>): {
  entryPath?: string;
  command: string;
} {
  const entry = (env.ZCODE_ENTRY ?? '').trim();
  if (!entry) return { command: 'zcode' };
  if (/\.(cjs|mjs|js)$/i.test(entry)) return { entryPath: entry, command: 'zcode' };
  // 非脚本后缀（PATH 上的可执行/命令名）：按普通命令走 shell 解析
  return { command: entry };
}

export class ZCodeAdapter implements CliAdapter {
  getProviderId(): 'zcode' {
    return 'zcode';
  }

  getCapabilities(): CliAdapterCapabilities {
    return CLI_ADAPTER_CAPABILITIES.zcode;
  }

  async detect(): Promise<{ available: boolean; version?: string; error?: string }> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) env[key] = value;
    }
    const { entryPath, command } = resolveZcodeEntry(env);
    const spawnCmd = entryPath ? process.execPath : command;
    const spawnArgs = entryPath ? [entryPath, '--version'] : ['--version'];
    return new Promise((resolve) => {
      const proc = spawn(spawnCmd, spawnArgs, {
        env,
        shell: !entryPath,
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
        if (code === 0 && version.trim()) resolve({ available: true, version: version.trim() });
        else
          resolve({
            available: false,
            error: errorOutput || 'zcode command not found or failed to execute',
          });
      });
      proc.on('error', (err: Error) => resolve({ available: false, error: err.message }));
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

    // 权限模式：input 优先，其次 provider env 覆盖，缺省 yolo（zcode headless 自身默认）
    const mode = (input.permissionMode ?? env.ZCODE_HEADLESS_MODE ?? 'yolo').trim();

    let prompt = input.prompt;
    const args: string[] = [];

    if (prompt.length > ZCODE_PROMPT_INLINE_LIMIT) {
      const attachFile = join(
        tmpdir(),
        `apm-zcode-${createHash('sha1').update(prompt).digest('hex').slice(0, 16)}.md`,
      );
      writeFileSync(attachFile, prompt, 'utf8');
      prompt = ATTACH_BOOTSTRAP_PROMPT;
      args.push('--attach', attachFile);
    }

    args.push('-p', prompt, '--output-format', 'stream-json', '--mode', mode);
    if (input.sessionId) args.push('--resume', input.sessionId);

    const { entryPath, command } = resolveZcodeEntry(env);
    if (entryPath) {
      // node 直启：免 cmd.exe 8K 命令行上限与特殊字符改写（见文件头注）
      return { cmd: process.execPath, args: [entryPath, ...args], env, shell: false };
    }
    return { cmd: command, args, env };
  }

  parseStream(line: string, emit: StreamEmitter): void {
    if (!line.trim()) return;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(line);
    } catch {
      // stdout 恒为协议输出；非 JSON 行不属于任何已知形态，忽略不猜
      return;
    }
    const type = data.type as string;

    if (type === 'result') {
      // 终行：流式阶段只发 usage；响应文本/会话 id 由 parseFinalResult 收口
      const usage = extractCliUsage(data);
      if (usage) emit.usage?.(usage);
      return;
    }

    const payload = (data.payload ?? {}) as Record<string, unknown>;
    switch (type) {
      case 'session.created':
      case 'session.resumed':
        emit.step?.({
          stepType: 'observation',
          name: 'session_init',
          output: { sessionId: data.sessionId, resumed: type === 'session.resumed' },
          status: 'completed',
        });
        break;
      case 'model.streaming': {
        if (payload.kind === 'text_delta' && typeof payload.delta === 'string' && payload.delta) {
          emit.token?.(payload.delta);
        }
        break;
      }
      case 'tool.updated': {
        const kind = payload.kind as string | undefined;
        const toolName =
          typeof payload.toolName === 'string' ? payload.toolName : undefined;
        if (kind === 'started' && toolName) {
          emit.step?.({
            stepType: 'tool_call',
            name: toolName,
            input: { tool: toolName, input: payload.input },
            status: 'running',
          });
        } else if (kind === 'result') {
          emit.step?.({
            stepType: 'observation',
            name: toolName ?? (payload.toolCallId as string) ?? 'tool_result',
            output: { output: payload.output },
            status: 'completed',
          });
        } else if (kind === 'error') {
          emit.step?.({
            stepType: 'error',
            name: toolName ?? 'tool_error',
            input: { message: payload.error },
            status: 'failed',
          });
        }
        break;
      }
      case 'turn.completed': {
        const resultType = payload.resultType as string | undefined;
        emit.step?.({
          stepType: 'result',
          name: 'turn_completed',
          output: {
            resultType,
            tokenCount: payload.tokenCount,
            duration: payload.duration,
          },
          status: resultType === 'success' ? 'completed' : 'failed',
        });
        const usage = extractCliUsage(payload);
        if (usage) emit.usage?.(usage);
        break;
      }
      case 'turn.failed': {
        const error = payload.error;
        const message =
          typeof error === 'string'
            ? error
            : ((error as Record<string, unknown> | undefined)?.message as string | undefined) ??
              'turn failed';
        emit.step?.({
          stepType: 'error',
          name: 'turn_failed',
          input: { message, turnPhase: payload.turnPhase },
          status: 'failed',
        });
        break;
      }
      case 'permission.requested':
        // headless 无交互审批面：仅作时间线记录（能力位 approval=false，默认通道不可达）
        emit.approvalNeeded?.({
          requestedAction:
            (payload.toolName as string) ?? (payload.action as string) ?? 'Unknown action',
          actionType: 'tool_call',
          riskLevel: 'write',
          reason: payload.reason as string | undefined,
        });
        break;
      default:
        // session.updated catch-all / workflow.run.progress / checkpoint 等不映射，避免噪声
        break;
    }
  }

  parseFinalResult(stdout: string, exitCode: number) {
    const artifacts: Array<{ type: string; name: string; content?: string }> = [];
    let usage: CliUsage | undefined;
    let resultLine: Record<string, unknown> | undefined;
    let failedLine: Record<string, unknown> | undefined;

    for (const line of stdout.split('\n')) {
      if (!line.trim()) continue;
      let data: Record<string, unknown>;
      try {
        data = JSON.parse(line);
      } catch {
        continue;
      }
      if (data.type === 'result') {
        resultLine = data;
        usage = extractCliUsage(data) ?? usage;
      } else if (data.type === 'turn.failed') {
        failedLine = data;
      }
    }

    if (resultLine) {
      const response = resultLine.response as string | undefined;
      if (response) {
        artifacts.push({ type: 'result', name: 'execution_summary', content: response });
      }
    }

    const failed = exitCode !== 0 || !!failedLine || !resultLine;
    if (failed) {
      const rawError = failedLine
        ? ((failedLine.payload as Record<string, unknown> | undefined)?.error ??
          'turn failed')
        : undefined;
      const message =
        typeof rawError === 'string'
          ? rawError
          : ((rawError as Record<string, unknown> | undefined)?.message as string | undefined) ??
            (resultLine
              ? `zcode CLI exited with code ${exitCode}`
              : `zcode stream-json 输出缺少 result 终行（exit=${exitCode}）`);
      return {
        status: 'failed' as const,
        artifacts,
        error: message,
        output: { stdout, exitCode, projection: resultLine?.projection },
        usage,
      };
    }

    return {
      status: 'completed' as const,
      artifacts,
      output: {
        response: (resultLine?.response as string) ?? '',
        projection: resultLine?.projection,
        sessionId: resultLine?.sessionId,
      },
      usage,
    };
  }
}
