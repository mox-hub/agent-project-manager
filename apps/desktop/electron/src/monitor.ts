/**
 * 本机可观测性采集（CAP-A-14 可观测性双面板切片）。
 *
 * ①进程监控：只看壳自己托管的进程（桌面壳 / 本地服务 / AI 执行守护进程 / dev 前端），
 *   端口与内存用 OS 内建命令采集（win32: tasklist + netstat -ano；unix: ps + lsof），
 *   不引入第三方依赖。采集失败或进程不在 → 字段缺省 / running=false，诚实降级不炸面板。
 *   守护进程拉起的 CLI 孙代进程不枚举——OS 侧无可靠父子归属且开销大，留二期。
 * ②服务日志：desktop-main.log（壳 + backend:stdout/stderr + daemon:stdout/stderr 都经
 *   logger 落这个文件）的 tail 读取、行解析与清空；级别计数按返回窗口统计。
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import net from 'node:net';
import { isDevMode } from './config';
import { getLogFilePath } from './logger';
import { state } from './state';

export type ProcessRole = 'shell' | 'backend' | 'daemon' | 'frontend-dev';

export interface ProcessStat {
  role: ProcessRole;
  pid: number;
  running: boolean;
  /** TCP 监听端口；无监听（壳/守护进程）或未采到为 undefined */
  port?: number;
  /** 工作集内存 MB；采集失败为 undefined */
  memoryMB?: number;
  /** backend 承载路径（utility/node） */
  transport?: string;
  startedAt?: string;
}

const BOOT_TIME = new Date();
const EXEC_TIMEOUT_MS = 4000;

function execCommand(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      cmd,
      args,
      { timeout: EXEC_TIMEOUT_MS, windowsHide: true, encoding: 'utf-8' },
      (err, stdout) => {
        if (err) {
          reject(err);
        } else {
          resolve(stdout);
        }
      },
    );
  });
}

function portInUse(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(200);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => resolve(false));
    socket.on('timeout', () => resolve(false));
  });
}

/** tasklist CSV 行 → { pid → memoryMB }；内存列形如 "565,832 K"（千分位/单位随区域，剔非数字按 KB 折算）。 */
function parseTasklist(output: string): Map<number, number> {
  const memByPid = new Map<number, number>();
  for (const line of output.split(/\r?\n/)) {
    const cols = line
      .trim()
      .replace(/^"|"$/g, '')
      .split('","');
    if (cols.length < 5) {
      continue;
    }
    const pid = Number(cols[1]);
    const kb = Number(cols[4].replace(/\D/g, ''));
    if (Number.isInteger(pid) && pid > 0 && Number.isFinite(kb)) {
      memByPid.set(pid, Math.round(kb / 1024));
    }
  }
  return memByPid;
}

/** netstat -ano → { pid → LISTENING 端口 }（监听多端口的进程只留最小端口，面板展示口径）。 */
function parseNetstat(output: string): Map<number, number> {
  const portByPid = new Map<number, number>();
  for (const line of output.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5 || parts[3] !== 'LISTENING') {
      continue;
    }
    const port = Number(parts[1].split(':').pop());
    const pid = Number(parts[4]);
    if (Number.isInteger(port) && port > 0 && Number.isInteger(pid) && pid > 0) {
      const known = portByPid.get(pid);
      if (known === undefined || port < known) {
        portByPid.set(pid, port);
      }
    }
  }
  return portByPid;
}

/** unix 兜底：ps 全表 → { pid → memoryMB }。 */
function parsePs(output: string): Map<number, number> {
  const memByPid = new Map<number, number>();
  for (const line of output.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) {
      continue;
    }
    const pid = Number(parts[0]);
    const kb = Number(parts[1]);
    if (Number.isInteger(pid) && pid > 0 && Number.isFinite(kb)) {
      memByPid.set(pid, Math.round(kb / 1024));
    }
  }
  return memByPid;
}

/** unix 兜底：lsof 监听表 → { pid → 端口 }。失败不阻断（字段缺省）。 */
async function collectListenPortsUnix(): Promise<Map<number, number>> {
  try {
    const output = await execCommand('lsof', ['-nP', '-iTCP', '-sTCP:LISTEN']);
    const portByPid = new Map<number, number>();
    for (const line of output.split(/\r?\n/).slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 9) {
        continue;
      }
      const pid = Number(parts[1]);
      const port = Number(parts[8].split(':').pop());
      if (Number.isInteger(pid) && pid > 0 && Number.isInteger(port) && port > 0) {
        portByPid.set(pid, port);
      }
    }
    return portByPid;
  } catch {
    return new Map();
  }
}

interface OsSample {
  memByPid: Map<number, number>;
  portByPid: Map<number, number>;
  sampled: boolean;
}

async function sampleOsProcesses(): Promise<OsSample> {
  if (process.platform === 'win32') {
    try {
      const [tasklist, netstat] = await Promise.all([
        execCommand('tasklist', ['/FO', 'CSV', '/NH']),
        execCommand('netstat', ['-ano']),
      ]);
      return { memByPid: parseTasklist(tasklist), portByPid: parseNetstat(netstat), sampled: true };
    } catch {
      return { memByPid: new Map(), portByPid: new Map(), sampled: false };
    }
  }
  try {
    const [ps, portByPid] = await Promise.all([
      execCommand('ps', ['-axo', 'pid=,rss=']),
      collectListenPortsUnix(),
    ]);
    return { memByPid: parsePs(ps), portByPid, sampled: true };
  } catch {
    return { memByPid: new Map(), portByPid: new Map(), sampled: false };
  }
}

/** 面板数据源：壳托管进程的角色化清单（stopped 行也返回，前端灰显）。 */
export async function getProcessStats(): Promise<ProcessStat[]> {
  const backend = state.backend;
  const daemon = state.daemon;
  const pids = [backend?.info.pid, daemon?.pid].filter(
    (pid): pid is number => typeof pid === 'number' && pid > 0,
  );
  const sample = pids.length > 0 ? await sampleOsProcesses() : { memByPid: new Map(), portByPid: new Map(), sampled: false };
  // 采样失败时无法证伪存活，按托管态如实呈现（内存/端口缺省）
  const isLive = (pid: number) => (sample.sampled ? sample.memByPid.has(pid) : true);

  const stats: ProcessStat[] = [
    {
      role: 'shell',
      pid: process.pid,
      running: true,
      memoryMB: Math.round(process.memoryUsage().rss / (1024 * 1024)),
      startedAt: BOOT_TIME.toISOString(),
    },
    {
      role: 'backend',
      pid: backend?.info.pid ?? 0,
      running: !!backend && isLive(backend.info.pid),
      port: backend?.info.port,
      memoryMB: backend && isLive(backend.info.pid) ? sample.memByPid.get(backend.info.pid) : undefined,
      transport: backend ? (process.env.APM_SERVER_TRANSPORT === 'node' ? 'node' : 'utility') : undefined,
    },
    {
      role: 'daemon',
      pid: daemon?.pid ?? 0,
      running: !!daemon && isLive(daemon.pid),
      memoryMB: daemon && isLive(daemon.pid) ? sample.memByPid.get(daemon.pid) : undefined,
      startedAt: daemon?.startedAt,
    },
  ];

  if (isDevMode()) {
    stats.push({
      role: 'frontend-dev',
      pid: 0,
      running: await portInUse(5173),
      port: 5173,
    });
  }
  return stats;
}

// ---------- 服务日志面板 ----------

export interface DesktopLogLine {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'RAW';
  message: string;
}

export interface DesktopLogSnapshot {
  lines: DesktopLogLine[];
  counts: { INFO: number; WARN: number; ERROR: number; RAW: number };
  /** tail 窗口截断标记：日志总量超出读取窗口 */
  truncated: boolean;
  filePath: string;
}

const LOG_TAIL_BYTES = 512 * 1024;
const LOG_LINE_RE = /^\[([^\]]+)\] \[(INFO|WARN|ERROR)\] (.*)$/;

function parseLogLine(raw: string): DesktopLogLine {
  const match = LOG_LINE_RE.exec(raw);
  if (!match) {
    return { timestamp: '', level: 'RAW', message: raw };
  }
  return { timestamp: match[1], level: match[2] as DesktopLogLine['level'], message: match[3] };
}

/** 读日志尾部（默认 500 行，上限 2000）：只读文件末 512KB，不整读无轮转的大文件。 */
export async function getDesktopLogs(tail = 500): Promise<DesktopLogSnapshot> {
  const filePath = getLogFilePath();
  const empty: DesktopLogSnapshot = {
    lines: [],
    counts: { INFO: 0, WARN: 0, ERROR: 0, RAW: 0 },
    truncated: false,
    filePath,
  };
  const limit = Math.min(Math.max(tail, 50), 2000);
  let stat;
  try {
    stat = await fs.stat(filePath);
  } catch {
    return empty;
  }
  if (stat.size <= 0) {
    return empty;
  }
  const start = Math.max(0, stat.size - LOG_TAIL_BYTES);
  let text: string;
  try {
    const handle = await fs.open(filePath, 'r');
    try {
      const length = stat.size - start;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, start);
      text = buffer.toString('utf-8');
    } finally {
      await handle.close();
    }
  } catch {
    return empty;
  }
  const rawLines = text.split(/\r?\n/).filter((line) => line.trim());
  if (start > 0 && rawLines.length > 0) {
    rawLines.shift(); // 窗口起点的半行丢弃
  }
  const lines = rawLines.slice(-limit).map(parseLogLine);
  const counts = { INFO: 0, WARN: 0, ERROR: 0, RAW: 0 };
  for (const line of lines) {
    counts[line.level] += 1;
  }
  return { lines, counts, truncated: start > 0 || rawLines.length > limit, filePath };
}

/** 清空日志（写入方只有壳主进程自身，truncate 安全）；复制导出走面板的复制按钮。 */
export async function clearDesktopLogs(): Promise<void> {
  await fs.writeFile(getLogFilePath(), '', 'utf-8');
}
