/**
 * Claude Code 兼容信封解析核
 *
 * cursor-agent / qwen-code / codebuddy / grok（streaming-messages-json）四家的
 * stream-json 输出均为 Claude Code 风格信封（type: system/assistant/user/result，
 * session_id 贯穿），差异只在各自的外围事件（cursor 的 tool_call、codebuddy 的
 * task_*、qwen/grok 的 stats 附加字段）。本核收敛共同面，外围事件由各家
 * parseStream 自行处理后再回落到此。
 *
 * 协议依据：
 * - cursor-agent：本机 2026.07.16-899851b 安装产物源码级采样（result 条件携带 usage）
 * - qwen-code / codebuddy / grok：官方 headless/cli-reference 文档（docs 级确认，
 *   实机真 turn 验收列余留）
 */

import type { StreamEmitter } from './cli-adapter.interface';
import { extractCliUsage, type CliUsage } from './cli-adapter.interface';

export interface ClaudeCompatibleResultLine {
  type: 'result';
  subtype?: string;
  is_error?: boolean;
  result?: string;
  session_id?: string;
  usage?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface ClaudeCompatibleCollectResult {
  resultLine?: ClaudeCompatibleResultLine;
  failedLine?: ClaudeCompatibleResultLine;
  assistantTexts: string[];
}

/** 逐行解析 NDJSON，摘取 result 终行与 assistant 文本（parseFinalResult 用） */
export function collectClaudeCompatibleResult(
  stdout: string,
): ClaudeCompatibleCollectResult {
  const assistantTexts: string[] = [];
  let resultLine: ClaudeCompatibleResultLine | undefined;
  let failedLine: ClaudeCompatibleResultLine | undefined;

  for (const line of stdout.split('\n')) {
    if (!line.trim()) continue;
    let data: Record<string, unknown>;
    try {
      data = JSON.parse(line) as Record<string, unknown>;
    } catch {
      continue;
    }
    if (data.type === 'result') {
      resultLine = data as ClaudeCompatibleResultLine;
      if (data.is_error === true) failedLine = resultLine;
    } else if (data.type === 'assistant') {
      const message = data.message as Record<string, unknown> | undefined;
      const content = message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            block &&
            typeof block === 'object' &&
            (block as Record<string, unknown>).type === 'text' &&
            typeof (block as Record<string, unknown>).text === 'string'
          ) {
            assistantTexts.push(
              (block as Record<string, unknown>).text as string,
            );
          }
        }
      } else if (typeof content === 'string') {
        assistantTexts.push(content);
      }
    }
  }

  return { resultLine, failedLine, assistantTexts };
}

/** 共同面流解析：system(init) / assistant(文本+usage) / user(tool_result) / result(usage) */
export function parseClaudeCompatibleStream(
  line: string,
  emit: StreamEmitter,
): void {
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
    case 'system': {
      const subtype = data.subtype as string | undefined;
      if (subtype === 'init' || subtype === 'session_start') {
        emit.step?.({
          stepType: 'observation',
          name: 'session_init',
          output: {
            sessionId: data.session_id,
            model: data.model,
            providerEnvelope: subtype,
          },
          status: 'completed',
        });
      }
      break;
    }
    case 'assistant': {
      const message = data.message as Record<string, unknown> | undefined;
      if (message?.usage) {
        const usage = extractCliUsage(message);
        if (usage) emit.usage?.(usage);
      }
      const content = message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            block &&
            typeof block === 'object' &&
            (block as Record<string, unknown>).type === 'text' &&
            typeof (block as Record<string, unknown>).text === 'string'
          ) {
            emit.token?.((block as Record<string, unknown>).text as string);
          } else if (
            block &&
            typeof block === 'object' &&
            (block as Record<string, unknown>).type === 'tool_use'
          ) {
            // tool_use 内容块（claude 系信封的工具调用载体）：转时间线 tool_call
            const name =
              typeof (block as Record<string, unknown>).name === 'string'
                ? ((block as Record<string, unknown>).name as string)
                : 'tool_use';
            emit.step?.({
              stepType: 'tool_call',
              name,
              input: {
                tool: name,
                input: (block as Record<string, unknown>).input,
              },
              status: 'running',
            });
          }
        }
      } else if (typeof content === 'string') {
        emit.token?.(content);
      }
      break;
    }
    case 'user': {
      // user 信封在 stream 里承载 tool_result（Claude 语义）——仅作时间线观察
      const message = data.message as Record<string, unknown> | undefined;
      const content = message?.content;
      if (Array.isArray(content)) {
        for (const block of content) {
          if (
            block &&
            typeof block === 'object' &&
            (block as Record<string, unknown>).type === 'tool_result'
          ) {
            emit.step?.({
              stepType: 'observation',
              name:
                (typeof (block as Record<string, unknown>).tool_use_id ===
                  'string' &&
                  ((block as Record<string, unknown>).tool_use_id as string)) ||
                'tool_result',
              output: { output: (block as Record<string, unknown>).content },
              status: 'completed',
            });
          }
        }
      }
      break;
    }
    case 'result': {
      const usage = extractCliUsage(data);
      if (usage) emit.usage?.(usage);
      break;
    }
    default:
      break;
  }
}

/** parseFinalResult 共同面：result 终行判定 + usage 提取 + assistant 文本兜底 */
export function finalizeClaudeCompatibleResult(
  stdout: string,
  exitCode: number,
  cliLabel: string,
): {
  status: 'completed' | 'failed';
  artifacts: Array<{ type: string; name: string; content?: string }>;
  error?: string;
  output?: Record<string, unknown>;
  usage?: CliUsage;
} {
  const { resultLine, failedLine, assistantTexts } =
    collectClaudeCompatibleResult(stdout);
  const usage = resultLine ? extractCliUsage(resultLine) : undefined;

  // 失败判定不依赖 exitCode 单一信号：流内 is_error result 与缺终行同样落 failed
  const failed = exitCode !== 0 || !!failedLine || !resultLine;
  if (failed) {
    const responseText = resultLine?.result ?? assistantTexts.join('');
    return {
      status: 'failed',
      artifacts: responseText
        ? [{ type: 'result', name: 'execution_summary', content: responseText }]
        : [],
      error: failedLine
        ? (failedLine.result ??
          `result 事件 is_error=true（subtype=${failedLine.subtype ?? 'unknown'}）`)
        : resultLine
          ? `${cliLabel} CLI exited with code ${exitCode}`
          : `${cliLabel} stream-json 输出缺少 result 终行（exit=${exitCode}）`,
      output: { stdout, exitCode, sessionId: resultLine?.session_id },
      usage,
    };
  }

  const response = resultLine?.result ?? assistantTexts.join('');
  return {
    status: 'completed',
    artifacts: response
      ? [{ type: 'result', name: 'execution_summary', content: response }]
      : [],
    output: {
      response,
      sessionId: resultLine?.session_id,
      subtype: resultLine?.subtype,
    },
    usage,
  };
}
