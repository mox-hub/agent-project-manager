/**
 * ZCode CLI Adapter（headless 协议校准版）
 *
 * 与 packages/apm-shared/src/cli/adapters/zcode.ts 单源镜像（server 进程内执行路径）。
 * 协议真相（zcode v0.16.9 实测采样 + 源码对照，2026-09-26；采样记录见 GAP-T-47）：
 * - 非交互入口 `-p <text>`：prompt 是选项参数（位置参数是子命令名），**无 stdin 通道**
 * - goal 模式派发 = `-p "/goal <objective>"`（与 `--target` 语义等价，后者与 -p 互斥）
 * - `--output-format stream-json`：stdout 为 NDJSON 事件流，每行信封
 *   `{type, eventId, sessionId, seq, timestamp(ms), traceId, turnId?, payload}`，
 *   终行 `{type:"result", sessionId, response, usage?, projection, eventCount}`（此后无事件）
 * - 事件 type 闭集：session.created/session.resumed/turn.started/turn.completed/turn.failed/
 *   message.upserted/model.streaming{kind:"text_delta"|...}/tool.updated{kind:"started"|"progress"|"result"|"error"}/
 *   permission.requested/workflow.run.progress/session.updated(catch-all)
 * - usage：`{inputTokens, outputTokens, totalTokens, ..., source:"provider"}`，无美元成本字段
 * - 退出码：0 成功 / 1 错误 / 130 SIGINT / 143 SIGTERM；诊断走 stderr，stdout 恒为协议输出
 * - headless 默认权限模式 = yolo，无交互审批面；派发前治理门禁由 APM 侧承担
 * - 环境阻塞记录：桌面壳外的 standalone 进程若无可用的 api-key 型 provider，zcode 以
 *   turn.failed（model_creation: "Select a model before continuing"）失败——本 adapter
 *   诚实落 failed，不伪造成功；实机全链验收前置 = 终端执行 `zcode login` 后复测
 */

import { spawn } from 'child_process';
import { createHash } from 'crypto';
import { writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import {
  CliAdapter,
  CliExecutionInput,
  DetectResult,
  StreamEmitter,
  extractCliUsage,
  CliUsage,
  CommandBuildResult,
} from './cli-adapter.interface';

/** 超过该长度的 prompt 转投 --attach 临时文件（shell 直启 8K / 直启 32K 的安全留白） */
const ZCODE_PROMPT_INLINE_LIMIT = 24_000;

const ATTACH_BOOTSTRAP_PROMPT =
  '请阅读附件中的完整任务说明并严格执行；附件内容就是本次任务的全部要求，不要等待后续输入。';

interface ZcodeEntryResolution {
  entryPath?: string;
  command: string;
}

/** 解析 zcode 入口：env.ZCODE_ENTRY 指向 .cjs/.mjs/.js 时返回 entryPath（node 直启） */
function resolveZcodeEntry(env: Record<string, string>): ZcodeEntryResolution {
  const entry = (env.ZCODE_ENTRY ?? '').trim();
  if (!entry) return { command: 'zcode' };
  if (/\.(cjs|mjs|js)$/i.test(entry))
    return { entryPath: entry, command: 'zcode' };
  return { command: entry };
}

export class ZCodeAdapter implements CliAdapter {
  getProviderId(): 'zcode' {
    return 'zcode';
  }

  async detect(commandPath?: string): Promise<DetectResult> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
    // DB commandPath 覆盖优先；其次 env.ZCODE_ENTRY；缺省 PATH 命令名
    const resolved = commandPath?.trim() || env.ZCODE_ENTRY?.trim() || '';
    const entryPath =
      resolved && /\.(cjs|mjs|js)$/i.test(resolved) ? resolved : undefined;
    const command = resolved && !entryPath ? resolved : 'zcode';

    const spawnCmd = entryPath ? process.execPath : command;
    const spawnArgs = entryPath ? [entryPath, '--version'] : ['--version'];

    return new Promise((resolve) => {
      const proc = spawn(spawnCmd, spawnArgs, {
        env,
        shell: !entryPath,
      });

      let version = '';
      let errorOutput = '';

      proc.stdout?.on('data', (data: Buffer) => {
        version += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code: number | null) => {
        if (code === 0 && version.trim()) {
          resolve({ available: true, version: version.trim() });
        } else {
          resolve({
            available: false,
            error:
              errorOutput || 'zcode command not found or failed to execute',
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
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }

    // 权限模式：input 优先，其次 provider env 覆盖（ZCODE_HEADLESS_MODE），缺省 yolo
    const mode = (
      input.permissionMode ??
      env.ZCODE_HEADLESS_MODE ??
      'yolo'
    ).trim();

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
    if (input.sessionId) {
      args.push('--resume', input.sessionId);
    }

    const { entryPath, command } = resolveZcodeEntry(env);
    if (entryPath) {
      // node 直启：免 cmd.exe 8K 命令行上限与特殊字符改写（见文件头注）
      return {
        cmd: process.execPath,
        args: [entryPath, ...args],
        env,
        shell: false,
      };
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
          output: {
            sessionId: data.sessionId,
            resumed: type === 'session.resumed',
          },
          status: 'completed',
        });
        break;
      case 'model.streaming': {
        if (
          payload.kind === 'text_delta' &&
          typeof payload.delta === 'string' &&
          payload.delta
        ) {
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
            : (((error as Record<string, unknown> | undefined)?.message as
                string | undefined) ?? 'turn failed');
        emit.step?.({
          stepType: 'error',
          name: 'turn_failed',
          input: { message, turnPhase: payload.turnPhase },
          status: 'failed',
        });
        break;
      }
      case 'permission.requested':
        emit.approvalNeeded?.({
          requestedAction:
            (payload.toolName as string) ??
            (payload.action as string) ??
            'Unknown action',
          actionType: 'tool_call',
          riskLevel: 'write',
          reason: payload.reason as string | undefined,
        });
        break;
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
        artifacts.push({
          type: 'result',
          name: 'execution_summary',
          content: response,
        });
      }
    }

    // 实测：zcode 进程可能以 exit 0 结束但流内为 turn.failed（model_creation 阶段失败），
    // 因此失败判定不依赖 exitCode 单一信号
    const failed = exitCode !== 0 || !!failedLine || !resultLine;
    if (failed) {
      const rawError = failedLine
        ? ((failedLine.payload as Record<string, unknown> | undefined)?.error ??
          'turn failed')
        : undefined;
      const message =
        typeof rawError === 'string'
          ? rawError
          : (((rawError as Record<string, unknown> | undefined)?.message as
              string | undefined) ??
            (resultLine
              ? `zcode CLI exited with code ${exitCode}`
              : `zcode stream-json 输出缺少 result 终行（exit=${exitCode}）`));
      return {
        status: 'failed',
        artifacts,
        error: message,
        output: { stdout, exitCode, projection: resultLine?.projection },
        usage,
      };
    }

    return {
      status: 'completed',
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
