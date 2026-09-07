/**
 * 运行详情面板的纯函数层：格式化、事件条目构建、触发来源与产物聚合。
 * 全部无副作用（渲染期禁 Date.now 等，运行中 run 的时间窗右端取最后事件时间）。
 */
import type {
  ExecutionArtifactRecord,
  ExecutionRunDetail,
  ExecutionRunEvent,
  ExecutionRunRecord,
  ExecutionStepRecord,
} from '../api/execution-api';

export type RunEventKind =
  | 'user'
  | 'prompt'
  | 'context'
  | 'assistant'
  | 'thinking'
  | 'tool'
  | 'file'
  | 'usage'
  | 'result'
  | 'error'
  | 'approval'
  | 'status';

export interface RunEventEntry {
  id: string;
  kind: RunEventKind;
  /** 工具名 / 事件类型等短标题（原始值，翻译由组件按 kind 处理） */
  title?: string;
  text?: string;
  at?: string;
  durationMs?: number;
  /** 结构化详情（工具入参/产出），供右侧详情面板展示 */
  detail?: { input?: string; output?: string };
}

export type TriggerSource = 'assistant' | 'cli' | 'task' | 'api';

/** 从未知结构的 step input/output 中提取可展示文本 */
export function pickText(value: unknown, maxLen = 2000): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    return value.slice(0, maxLen) || undefined;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['text', 'content', 'summary', 'command', 'output', 'input', 'message']) {
      const candidate = obj[key];
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.slice(0, maxLen);
      }
    }
  }
  return undefined;
}

/** 17400 → '17.4K'，1700000 → '1.7M' */
export function formatTokens(n?: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

/** 详情面板用的完整文本：对象转 pretty JSON，字符串原样，超长截断 */
function pickDetail(value: unknown, maxLen = 6000): string | undefined {
  if (value == null) return undefined;
  let text: string | undefined;
  if (typeof value === 'string') {
    text = value;
  } else if (typeof value === 'object') {
    try {
      text = JSON.stringify(value, null, 2);
    } catch {
      return undefined;
    }
  } else {
    text = String(value);
  }
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return trimmed.length > maxLen ? `${trimmed.slice(0, maxLen)}\n…（已截断）` : trimmed;
}

export function formatCost(n?: number | null): string | null {
  if (n == null || !Number.isFinite(n)) return null;
  return `$${n.toFixed(2)}`;
}

/** 63000 → '1m03s'，5230 → '5.2s'，300 → '0.3s' */
export function formatDurationMs(ms?: number | null): string | null {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${totalSeconds}s`;
  return `${minutes}m${String(seconds).padStart(2, '0')}s`;
}

/** 事件相对运行开始的偏移：+00:36 */
export function formatOffset(atIso: string, startIso: string): string {
  const at = new Date(atIso).getTime();
  const start = new Date(startIso).getTime();
  if (!Number.isFinite(at) || !Number.isFinite(start)) return '+00:00';
  const diffSeconds = Math.max(0, Math.round((at - start) / 1000));
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  return `+${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function diffMs(
  start?: string | null,
  end?: string | null,
): number | undefined {
  if (!start || !end) return undefined;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : undefined;
}

/** 格式化运行用时：优先 started→completed，其次 started→terminated */
export function formatRunDuration(
  run: Pick<
    ExecutionRunRecord,
    'startedAt' | 'completedAt' | 'terminatedAt' | 'createdAt'
  >,
): string | null {
  const end = run.completedAt ?? run.terminatedAt;
  return formatDurationMs(diffMs(run.startedAt ?? run.createdAt, end));
}

function stepToEntry(step: ExecutionStepRecord): RunEventEntry {
  const at = step.startedAt ?? step.completedAt ?? undefined;
  const durationMs =
    step.duration ?? diffMs(step.startedAt, step.completedAt) ?? undefined;
  const detail = { input: pickDetail(step.input), output: pickDetail(step.output) };
  switch (step.stepType) {
    case 'tool_call':
      return {
        id: step.id,
        kind: 'tool',
        title: step.name ?? 'tool',
        text: pickText(step.input),
        at,
        durationMs,
        detail,
      };
    case 'thinking':
      return {
        id: step.id,
        kind: 'thinking',
        text: pickText(step.output) ?? pickText(step.input),
        at,
        durationMs,
        detail,
      };
    case 'approval_gate':
      return {
        id: step.id,
        kind: 'approval',
        text: pickText(step.input),
        at,
        durationMs,
        detail,
      };
    case 'error':
      return {
        id: step.id,
        kind: 'error',
        title: step.name ?? undefined,
        text: pickText(step.output) ?? pickText(step.input),
        at,
        durationMs,
        detail,
      };
    default:
      // observation / result 等：工具结果或产出
      return {
        id: step.id,
        kind: 'result',
        title: step.name ?? undefined,
        text: pickText(step.output) ?? pickText(step.input),
        at,
        durationMs,
        detail,
      };
  }
}

/** 事件 detail 中按 key 取字符串 */
function detailString(detail: unknown, key: string): string | undefined {
  if (!detail || typeof detail !== 'object') return undefined;
  const value = (detail as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value : undefined;
}

/** 守护进程路径事件 → 时间线条目（按标准化 eventType 映射，未知类型走兜底） */
function eventToEntry(event: ExecutionRunEvent): RunEventEntry {
  const at = event.timestamp ?? event.createdAt;
  const detail = (event.detail ?? null) as Record<string, unknown> | null;

  switch (event.eventType) {
    case 'execution.prompt':
      return {
        id: event.id,
        kind: 'prompt',
        text: detailString(detail, 'prompt') ?? event.summary,
        at,
        detail: { output: detailString(detail, 'prompt') ?? event.summary },
      };
    case 'execution.context':
      return {
        id: event.id,
        kind: 'context',
        title: event.summary,
        text: undefined,
        at,
        detail: detail
          ? { output: pickDetail(detail) }
          : event.summary
            ? { output: event.summary }
            : undefined,
      };
    case 'execution.thinking': {
      const content = detailString(detail, 'content') ?? event.summary;
      return {
        id: event.id,
        kind: 'thinking',
        text: content,
        at,
        detail: content ? { output: content } : undefined,
      };
    }
    case 'execution.tool.called': {
      const tool = detailString(detail, 'tool') ?? event.stepId ?? 'tool';
      const input = detail?.input;
      return {
        id: event.id,
        kind: 'tool',
        title: tool,
        text: pickText(input),
        at,
        detail: { input: pickDetail(input) ?? pickDetail(detail) },
      };
    }
    case 'execution.tool.result': {
      const tool =
        detailString(detail, 'tool') ??
        (event.stepId ? `结果 ${event.stepId}` : '工具结果');
      const output = detail?.output;
      return {
        id: event.id,
        kind: 'result',
        title: tool,
        text: event.errorCode ? event.errorCode : pickText(output),
        at,
        durationMs: undefined,
        detail: { output: pickDetail(output) },
      };
    }
    case 'execution.file.change': {
      const path =
        detailString(detail, 'path') ??
        pickText(detail?.input) ??
        event.summary;
      return {
        id: event.id,
        kind: 'file',
        title: detailString(detail, 'tool') ?? event.stepId,
        text: path,
        at,
        detail: { input: pickDetail(detail?.input) ?? pickDetail(detail), output: path },
      };
    }
    case 'execution.usage': {
      const usage = detail?.usage;
      return {
        id: event.id,
        kind: 'usage',
        text: event.summary ?? pickText(usage),
        at,
        detail: usage ? { output: pickDetail(usage) } : undefined,
      };
    }
    case 'execution.approval.requested':
      return {
        id: event.id,
        kind: 'approval',
        title: '审批请求',
        text: event.summary,
        at,
        detail: detail ? { output: pickDetail(detail) } : undefined,
      };
    case 'execution.completed':
      return {
        id: event.id,
        kind: 'result',
        title: '执行完成',
        text: event.summary,
        at,
        detail: detail ? { output: pickDetail(detail) } : undefined,
      };
    case 'execution.failed':
      return {
        id: event.id,
        kind: 'error',
        title: '执行失败',
        text: event.summary,
        at,
        detail: detail ? { output: pickDetail(detail) } : undefined,
      };
  }

  if (event.errorCode) {
    return {
      id: event.id,
      kind: 'error',
      title: event.errorCode,
      text: event.summary,
      at,
    };
  }
  if (event.status) {
    return {
      id: event.id,
      kind: 'status',
      title: event.status,
      text: event.summary,
      at,
    };
  }
  return {
    id: event.id,
    kind: 'result',
    title: event.eventType,
    text: event.summary,
    at,
  };
}

/** 详情 + 事件流水合并后的面板数据（events 由对话框层拼装） */
export type RunDetailsData = ExecutionRunDetail & { events?: ExecutionRunEvent[] };

/**
 * 事件条目构建：steps（进程内路径，结构化）优先 → events（守护进程路径）→ output.summary 兜底。
 * 事件流已含终事件（execution.completed/failed）时不再追加 output.summary 终条，避免重复。
 */
export function buildRunEventEntries(run: RunDetailsData): RunEventEntry[] {
  if (run.steps.length > 0) {
    return run.steps.map(stepToEntry);
  }

  const events = run.events ?? [];
  const entries = events.map(eventToEntry);
  const hasTerminalEvent = events.some(
    (event) =>
      event.eventType === 'execution.completed' ||
      event.eventType === 'execution.failed',
  );
  const finalSummary = pickText(run.output);
  if (finalSummary && !hasTerminalEvent) {
    entries.push({
      id: `${run.id}:final`,
      kind: 'assistant',
      text: finalSummary,
      at: run.completedAt ?? run.terminatedAt ?? undefined,
    });
  }
  return entries;
}

/** 触发来源：助理派发（input.source 标记）→ CLI → 任务 → API/其他 */
export function resolveTriggerSource(
  run: Pick<ExecutionRunRecord, 'input' | 'identitySource' | 'issueId'>,
): TriggerSource {
  const source = run.input?.source;
  if (source === 'assistant-chat' || source === 'assistant') return 'assistant';
  if (run.identitySource === 'cli') return 'cli';
  if (run.issueId) return 'task';
  return 'api';
}

/** 从 errorDetail / output.error 中提取可展示错误文本（弹窗错误横幅用） */
export function extractRunError(
  run: Pick<ExecutionRunRecord, 'errorDetail' | 'output'>,
): string | undefined {
  const detail = run.errorDetail as Record<string, unknown> | null | undefined;
  const output = run.output as Record<string, unknown> | null | undefined;
  for (const candidate of [detail?.summary, detail?.error, detail, output?.error]) {
    const text = pickText(candidate);
    if (text) return text;
  }
  return undefined;
}

/**
 * 事件流水合成伪步骤（daemon 路径 steps 表常为空时兜底时间轴）：
 * 每个事件一段，时长取至下一事件（至少 500ms）；带 stepId 的归工具行，
 * 状态/结果归模型行，errorCode 标失败红条。
 */
export function pseudoStepsFromEvents(
  runId: string,
  events: ExecutionRunEvent[],
): ExecutionStepRecord[] {
  const timed = events
    .map((event) => ({
      event,
      at: new Date(event.timestamp ?? event.createdAt).getTime(),
    }))
    .filter((x) => Number.isFinite(x.at))
    .sort((a, b) => a.at - b.at);

  return timed.map(({ event, at }, index) => {
    const nextAt = timed[index + 1]?.at;
    const endAt = nextAt != null && nextAt > at ? nextAt : at + 500;
    const isError = !!event.errorCode;
    return {
      id: event.id,
      executionRunId: runId,
      stepType: event.stepId ? 'tool_call' : event.status ? 'observation' : isError ? 'error' : 'result',
      sequence: index,
      name: event.stepId ?? undefined,
      status: isError ? 'failed' : 'completed',
      startedAt: new Date(at).toISOString(),
      completedAt: new Date(endAt).toISOString(),
      duration: endAt - at,
    };
  });
}

/** 步骤构成固定展示顺序（堆叠条与过滤 chips 共用） */
export const ENTRY_KIND_ORDER: RunEventKind[] = [
  'prompt',
  'context',
  'tool',
  'file',
  'thinking',
  'usage',
  'result',
  'approval',
  'error',
  'user',
  'assistant',
  'status',
];

/** 按条目 kind 计数（保留固定顺序、跳过零项），供步骤构成条与过滤 chips */
export function summarizeEntryKinds(
  entries: RunEventEntry[],
): Array<{ kind: RunEventKind; count: number }> {
  const counts = new Map<RunEventKind, number>();
  for (const entry of entries) {
    counts.set(entry.kind, (counts.get(entry.kind) ?? 0) + 1);
  }
  return ENTRY_KIND_ORDER.filter((kind) => counts.has(kind)).map((kind) => ({
    kind,
    count: counts.get(kind) as number,
  }));
}

export interface ArtifactSummary {
  files: number;
  commands: number;
  others: number;
  total: number;
}

/** artifacts 按 artifactType 聚合为产出 chips 数据 */
export function aggregateArtifacts(
  artifacts: ExecutionArtifactRecord[],
): ArtifactSummary {
  const summary: ArtifactSummary = { files: 0, commands: 0, others: 0, total: 0 };
  for (const artifact of artifacts) {
    summary.total += 1;
    if (artifact.artifactType === 'file_path' || artifact.artifactType === 'code_diff') {
      summary.files += 1;
    } else if (artifact.artifactType === 'command_output') {
      summary.commands += 1;
    } else {
      summary.others += 1;
    }
  }
  return summary;
}

export interface TimelineBar {
  key: string;
  leftPct: number;
  widthPct: number;
  tone: 'model' | 'tools' | 'error';
  name?: string;
}

export interface TimelineRowData {
  key: 'model' | 'tools';
  totalMs: number;
  bars: TimelineBar[];
}

function isToolStep(step: ExecutionStepRecord): boolean {
  return step.stepType === 'tool_call' || step.stepType === 'approval_gate';
}

/**
 * 双行时间轴数据：工具行（tool_call/approval_gate）与模型行（thinking/其余）。
 * 运行中的 run 没有总结束时间，右端取最后事件的完成时间，渲染期保持纯函数。
 */
export function computeTimelineRows(
  steps: ExecutionStepRecord[],
  windowStartIso: string,
  windowEndIso: string,
): TimelineRowData[] {
  const startMs = new Date(windowStartIso).getTime();
  const endMs = new Date(windowEndIso).getTime();
  const span = Math.max(1, endMs - startMs);

  const clamp = (value: number) => Math.min(100, Math.max(0, value));
  const toBar = (step: ExecutionStepRecord): TimelineBar | null => {
    const stepStart = new Date(step.startedAt ?? step.completedAt ?? '').getTime();
    if (!Number.isFinite(stepStart)) return null;
    const stepEnd =
      new Date(step.completedAt ?? '').getTime() || stepStart + 500;
    const leftPct = clamp(((stepStart - startMs) / span) * 100);
    const widthPct = clamp(((Math.max(stepEnd, stepStart + 500) - stepStart) / span) * 100);
    if (widthPct <= 0) return null;
    return {
      key: step.id,
      leftPct,
      widthPct: Math.max(widthPct, 0.8),
      tone: step.status === 'failed' ? 'error' : isToolStep(step) ? 'tools' : 'model',
      name: step.name ?? undefined,
    };
  };

  const toolBars = steps.filter(isToolStep).map(toBar).filter((b): b is TimelineBar => !!b);
  const modelBars = steps.filter((s) => !isToolStep(s)).map(toBar).filter((b): b is TimelineBar => !!b);

  const rowTotal = (bars: TimelineBar[]) =>
    Math.round((bars.reduce((sum, bar) => sum + bar.widthPct, 0) / 100) * span);

  const rows: TimelineRowData[] = [
    { key: 'model', totalMs: rowTotal(modelBars), bars: modelBars },
    { key: 'tools', totalMs: rowTotal(toolBars), bars: toolBars },
  ];
  return rows;
}
