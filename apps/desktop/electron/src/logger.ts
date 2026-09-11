/**
 * 极简文件 + 控制台双写日志（对应 Tauri unified_logging 的壳侧角色）。
 * v0.6.1 不做轮转（与 Tauri 版边界一致）。
 */
import fs from 'node:fs';
import path from 'node:path';

let logFile: string | null = null;

export function initLogger(logsDir: string): void {
  fs.mkdirSync(logsDir, { recursive: true });
  logFile = path.join(logsDir, 'desktop-main.log');
}

function write(level: 'INFO' | 'WARN' | 'ERROR', message: string): void {
  const line = `[${new Date().toISOString()}] [${level}] ${message}`;
  console.log(line);
  if (logFile) {
    try {
      fs.appendFileSync(logFile, line + '\n');
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
