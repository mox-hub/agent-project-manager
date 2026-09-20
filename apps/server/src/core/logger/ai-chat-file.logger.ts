/**
 * AI 通信专档日志 —— 只写文件、不进控制台。
 * 记录 LLM 对话与 CLI 对话桥的完整 prompt、流式 chunk、终文/用量与错误，
 * 供排查与审计；控制台只保留关键事件（开始/结束/错误摘要）。
 * 文件：logs/ai-chat.log（JSONL，与 error.log/combined.log 同目录）；
 * 设 AI_CHAT_LOG=off 可关闭。
 */
import { createLogger, format, Logger, transports } from 'winston';

export type AiChatPhase = 'request' | 'chunk' | 'final' | 'error';

export interface AiChatLogEntry {
  phase: AiChatPhase;
  /** llm=服务端 LLM 对话；cli=CLI 对话桥 */
  source: 'llm' | 'cli';
  conversationId?: string;
  messageId?: string;
  userId?: string;
  executionRunId?: string;
  provider?: string;
  model?: string;
  /** request：完整系统提示/对话 prompt */
  instructions?: string;
  messages?: unknown;
  /** chunk：流式增量 */
  chunk?: unknown;
  /** final：完整正文与用量 */
  text?: string;
  usage?: unknown;
  status?: string;
  durationMs?: number;
  error?: string;
  [key: string]: unknown;
}

let fileLogger: Logger | null = null;

function getLogger(): Logger {
  if (!fileLogger) {
    fileLogger = createLogger({
      level: 'info',
      format: format.combine(format.timestamp(), format.json()),
      transports: [new transports.File({ filename: 'logs/ai-chat.log' })],
    });
  }
  return fileLogger;
}

export function aiChatLog(entry: AiChatLogEntry): void {
  if (process.env.AI_CHAT_LOG === 'off') return;
  getLogger().info('ai-chat', entry as Record<string, unknown>);
}
