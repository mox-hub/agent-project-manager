/**
 * 极简文件 + 控制台双写日志（对应 Tauri unified_logging 的壳侧角色）。
 * P2 轮转（ADR-015）：单文件超 5MB 轮转为 .1/.2/.3（保留 3 份），防长驻服务
 * 场景日志无限膨胀。写入为字节计数触发，避免每次 append 的 stat 开销。
 */
import fs from 'node:fs';
import path from 'node:path';

let logFile: string | null = null;
let writtenBytes = 0;

const MAX_LOG_BYTES = 5 * 1024 * 1024;
const MAX_ROTATED_LOGS = 3;

export function initLogger(logsDir: string): void {
  fs.mkdirSync(logsDir, { recursive: true });
  logFile = path.join(logsDir, 'desktop-main.log');
  try {
    writtenBytes = fs.statSync(logFile).size;
  } catch {
    writtenBytes = 0;
  }
}

/** 日志面板的读取目标（initLogger 前为 null，调用方按未初始化处理）。 */
export function getLogFilePath(): string {
  return logFile ?? '';
}

/** current → .1 → .2 → .3（最老删除）；Windows rename 目标存在先删。 */
function rotate(): void {
  if (!logFile) {
    return;
  }
  try {
    const oldest = `${logFile}.${MAX_ROTATED_LOGS}`;
    fs.rmSync(oldest, { force: true });
    for (let i = MAX_ROTATED_LOGS - 1; i >= 1; i--) {
      const from = `${logFile}.${i}`;
      if (fs.existsSync(from)) {
        fs.renameSync(from, `${logFile}.${i + 1}`);
      }
    }
    fs.renameSync(logFile, `${logFile}.1`);
    writtenBytes = 0;
    console.log(`[logger] 日志已轮转: ${logFile}`);
  } catch (err) {
    // 轮转失败（文件被占用等）不阻断写入，下一轮再试
    console.log(`[logger] 轮转失败（继续写入原文件）: ${err instanceof Error ? err.message : String(err)}`);
  }
}

function write(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  if (logFile) {
    try {
      if (writtenBytes >= MAX_LOG_BYTES) {
        rotate();
      }
      const buf = Buffer.from(line + '\n');
      fs.appendFileSync(logFile, buf);
      writtenBytes += buf.length;
    } catch {
      // 日志落盘失败不阻断主流程
    }
  }
}

export const logger = {
  info: (msg: string) => write('INFO', msg),
  warn: (msg: string) => write('WARN', msg),
  error: (msg: string) => write('ERROR', msg),
};
