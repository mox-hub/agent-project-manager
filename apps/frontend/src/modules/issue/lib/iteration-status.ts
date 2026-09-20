/**
 * 迭代状态推导（P1-19：迭代只读→可用）
 *
 * 最终口径（产品默认：日期自动推导 + 手动覆盖）：
 * - `status === 'cancelled'`（已取消）是唯一无法由日期区间推导出的手动终态，
 *   **手动覆盖优先于日期推导**——即使日期显示进行中也按已取消展示；
 * - 其余情况按**日历天（本地时区）**推导：
 *   - 今天 < 开始天 → 待启动（pending）
 *   - 开始天 ≤ 今天 ≤ 结束天 → 进行中（active）——当天开始/当天结束均算进行中
 *   - 今天 > 结束天 → 已结束（completed）
 * - 日期缺失/无法解析（脏数据）时回落后端手动 status 映射，兜底 pending。
 *
 * 为什么不完全「手动 status 优先」：后端 create 强制写 `status='planned'`，
 * 无法区分「系统默认值」与「用户意图」；若无条件手动优先，则日期已开始的
 * 迭代仍显示「待启动」（即本次要修的 bug）。planned/active/completed 与
 * 日期推导三段一一对应，故仅 cancelled 作为手动覆盖点。
 */

/** 规范化四态（待启动 / 进行中 / 已结束 / 已取消） */
export type DerivedIterationStatus =
  | 'pending'
  | 'active'
  | 'completed'
  | 'cancelled';

export interface IterationStatusInput {
  startDate?: string | null;
  endDate?: string | null;
  /** 后端手动状态：'planned' | 'active' | 'completed' | 'cancelled'（可能缺失） */
  status?: string | null;
}

/** 本地时区的「天序号」：yyyy * 10000 + mm * 100 + dd，规避 date-only 字符串的 UTC 解析偏差 */
function dayNumber(date: Date): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

function toDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** 手动 status 字符串 → 规范化四态（脏数据/日期缺失时的兜底映射） */
function fromManualStatus(status: string | null | undefined): DerivedIterationStatus {
  const normalized = (status ?? '').toLowerCase();
  if (normalized === 'active') return 'active';
  if (normalized === 'completed') return 'completed';
  if (normalized === 'cancelled') return 'cancelled';
  return 'pending';
}

export function deriveIterationStatus(
  input: IterationStatusInput,
  now: Date = new Date(),
): DerivedIterationStatus {
  // 手动终态优先：cancelled 无法由日期推导
  if ((input.status ?? '').toLowerCase() === 'cancelled') return 'cancelled';

  const start = toDate(input.startDate);
  const end = toDate(input.endDate);

  if (start && end) {
    const today = dayNumber(now);
    if (today < dayNumber(start)) return 'pending';
    if (today > dayNumber(end)) return 'completed';
    return 'active';
  }

  // 日期不全（脏数据兜底）：回落手动 status 映射
  return fromManualStatus(input.status);
}

/**
 * 规范化四态 → 展示 tone（i18n 键复用既有 `project.milestonesPage.status.*`，无新增 locale 键）。
 * badgeClass/barClass 语义色与里程碑页既有徽标口径一致。
 */
export const ITERATION_STATUS_TONE: Record<
  DerivedIterationStatus,
  { labelKey: string; badgeClass: string; barClass: string }
> = {
  pending: {
    labelKey: 'project.milestonesPage.status.planned',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    barClass: 'bg-muted/30 border-border',
  },
  active: {
    labelKey: 'project.milestonesPage.status.inProgress',
    badgeClass: 'bg-accent-blue-light text-accent-blue border-accent-blue/30',
    barClass: 'bg-accent-blue/15 border-accent-blue/30',
  },
  completed: {
    labelKey: 'project.milestonesPage.status.completed',
    badgeClass: 'bg-accent-green-light text-accent-green border-accent-green/30',
    barClass: 'bg-accent-green/10 border-accent-green/30',
  },
  cancelled: {
    labelKey: 'project.milestonesPage.status.cancelled',
    badgeClass: 'bg-muted text-muted-foreground border-border',
    barClass: 'bg-muted/30 border-border',
  },
};
