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
  | 'assistant'
  | 'thinking'
  | 'tool'
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
    for (const key of ['text', 'content', 'summary', 'command', 'output', 'input']) {
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
  switch (step.stepType) {
    case 'tool_call':
      return {
        id: step.id,
        kind: 'tool',
        title: step.name ?? 'tool',
        text: pickText(step.input),
        at,
        durationMs,
      };
    case 'thinking':
      return {
        id: step.id,
        kind: 'thinking',
        text: pickText(step.output) ?? pickText(step.input),
        at,
        durationMs,
      };
    case 'approval_gate':
      return { id: step.id, kind: 'approval', text: pickText(step.input), at, durationMs };
    case 'error':
      return {
        id: step.id,
        kind: 'error',
        title: step.name ?? undefined,
        text: pickText(step.output) ?? pickText(step.input),
        at,
        durationMs,
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
      };
  }
}

function eventToEntry(event: ExecutionRunEvent): RunEventEntry {
  if (event.errorCode) {
    return {
      id: event.id,
      kind: 'error',
      title: event.errorCode,
      text: event.summary,
      at: event.timestamp ?? event.createdAt,
    };
  }
  if (event.status) {
    return {
      id: event.id,
      kind: 'status',
      title: event.status,
      text: event.summary,
      at: event.timestamp ?? event.createdAt,
    };
  }
  return {
    id: event.id,
    kind: 'result',
    title: event.eventType,
    text: event.summary,
    at: event.timestamp ?? event.createdAt,
  };
}

/** 详情 + 事件流水合并后的面板数据（events 由对话框层拼装） */
export type RunDetailsData = ExecutionRunDetail & { events?: ExecutionRunEvent[] };

/**
 * 事件条目构建：steps（进程内路径，结构化）优先 → events（守护进程路径）→ output.summary 兜底。
 * events 路径末尾若 run.output 有 summary，追加一条 assistant 终条。
 */
export function buildRunEventEntries(run: RunDetailsData): RunEventEntry[] {
  if (run.steps.length > 0) {
    return run.steps.map(stepToEntry);
  }

  const entries = (run.events ?? []).map(eventToEntry);
  const finalSummary = pickText(run.output);
  if (finalSummary) {
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
