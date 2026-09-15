import type { OfficeStatus } from '@/modules/office/api/office-api';
import type { StationCard, StationProgress } from './office-to-station';
import type { PipelineLane } from '../hooks/use-pipeline-lanes';
import type { DecisionQueue } from '../hooks/use-decision-queue';

/**
 * 叙述事实快照（ARCH-AISURFACE-001 §3.3「事实与叙事分离」的事实侧）。
 *
 * ## 它是什么
 *
 * 一份**只含真实数字**的素材，交给 `surface-narration` 静默场景翻译成人话。
 * 本模块**不查询任何新数据**——输入全部是页面此刻已经渲染出来的东西
 * （工位卡 / 六站泳道 / 待办队列），输出只是把它们重排成模型好读的形状。
 *
 * 这么做有两个理由，缺一不可：
 *
 * 1. **§4.7「不造第二套数据口径」**：若改由服务端重查一遍聚合，ai-hub 里就长出了
 *    第二份口径，和 office/decision 的算法迟早各说各话。
 * 2. **叙述不可能与同屏内容矛盾**：模型拿到的事实就是屏幕上的那些数——
 *    它们本来就是同一份。这是"AI 说的话和你在屏幕上看到的一致"最省力的保证。
 *
 * ## 三条诚实纪律（本模块的 `[MUST]`）
 *
 * 1. **未就绪 ≠ 空**：数据还没取到时整组写 `null`（`colleagues` / `needsYou`），
 *    **绝不落成 0**——「查不到」被读成「一个都没有」是这块面板最危险的误读。
 * 2. **口径外不并档**：同事档位不在已知四值内时计入 `other` 单独报数，
 *    不塞进 `working` 凑数（新档位是"我不认识"，不是"他在干活"）。
 * 3. **时间只作事实陈述**：`runStartedAt` 是"从几点开始跑"，`lastProgressAt` 是
 *    "最后一句进展在几点"。**两者都不是**"卡了多久"——快照没有阻塞起始时刻，
 *    拿它俩减一下会得到一个听起来精确、实则无据的时长。这条同时写进了场景指令。
 */

export interface SurfaceSnapshotColleagues {
  total: number;
  needYou: number;
  working: number;
  suggestions: number;
  idle: number;
  /** 档位不在已知四值内的同事数——不并进任何已知档 */
  other: number;
  /** 手上挂着阻塞项（`blocking > 0`）的同事数 */
  blocked: number;
}

export interface SurfaceSnapshotRosterEntry {
  name: string;
  /** office 原样档位，不做美化 */
  status: string;
  /** 在做哪张单（工单标题优先，退化到执行目标）；无在执行时为 null */
  task: string | null;
  runStatus: string | null;
  /** 执行状态从哪来：快照还是终态事件覆写（见 `StationRun.statusSource`） */
  runStatusSource: 'snapshot' | 'event' | null;
  /** 本次执行的开跑时刻（ISO）。是"从几点开始跑"，**不是**"卡了多久" */
  runStartedAt: string | null;
  /** 运行时自报的**原话**（或执行终态文本）；只有步骤级事件时也为 null */
  lastProgress: string | null;
  /** 上面那句原话的时刻（ISO）。**不是**阻塞起始时刻 */
  lastProgressAt: string | null;
  /**
   * 最近一条**步骤级**事件的名称（`label` 原样）。
   *
   * 与 `lastProgress` 分开是因为粒度不同、可信度也不同：原话是"运行时自己说的"，
   * 步骤名只是"它走到了第几个节点"。合成一个字段会让"只有步骤级进度"（§4.6 的
   * 粒度天花板）被读成"有实时日志"——这正是本模块要防的误读。
   */
  lastStep: string | null;
  /** 上面那条步骤的序号；运行时未上报时为 null */
  lastStepSequence: number | null;
  blocking: number;
}

export interface SurfaceSnapshotNeedsYou {
  /** 服务端给出的**全量**待决数 */
  total: number;
  blocking: number;
  advisory: number;
  /** 列表只取了前 N 条时未取出的条数——不静默截断 */
  hiddenCount: number;
  top: Array<{
    id: string;
    title: string;
    urgency: string;
    /** 这条等了多久：创建时刻（ISO）；不可解析时 null */
    waitingSince: string | null;
  }>;
}

export interface SurfaceSnapshot {
  /** null = 同事数据尚未取到（**不是**"没有同事"） */
  colleagues: SurfaceSnapshotColleagues | null;
  /** 逐人一行；`colleagues` 为 null 时本数组为空 */
  roster: SurfaceSnapshotRosterEntry[];
  /** 六站；`count` / `blocked` 为 null = 该站无此口径（**不是 0**） */
  lanes: Array<{ label: string; count: number | null; blocked: number | null }>;
  /** null = 待办数据尚未取到（**不是**"没有待办"） */
  needsYou: SurfaceSnapshotNeedsYou | null;
  /** 这份快照**自身**的数据缺口，大白话，供 `honestGaps` 直接引用 */
  gaps: string[];
}

export interface SurfaceSnapshotInputs {
  stations: readonly StationCard[];
  /** 工位数据的就绪态（来自 office 查询） */
  colleaguesReady: boolean;
  lanes: readonly PipelineLane[];
  lanesPending: boolean;
  lanesError: boolean;
  queue: DecisionQueue;
  /** 待办数据的就绪态（来自 decision 查询）——未就绪时 `total` 是不可信的 0 */
  queueReady: boolean;
}

const KNOWN_STATUSES: readonly OfficeStatus[] = [
  'needYou',
  'working',
  'suggestions',
  'idle',
];

/** 取进展事件的时刻（毫秒）→ ISO；非法/缺失返回 null（不猜一个时间） */
function toIso(at: number | undefined): string | null {
  if (typeof at !== 'number' || !Number.isFinite(at)) return null;
  const date = new Date(at);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * 进展**原话**：只有「运行时自报」与「执行终态」两种形态带原文。
 * 步骤级事件（`source: 'step'`）只有序号与节点名，**没有**原话——
 * 把它的 `label` 当原话用，等于把「走到第 3 步」说成「它说了什么」。
 */
function progressText(progress: StationProgress | null): string | null {
  if (!progress || progress.source === 'step') return null;
  return progress.text;
}

/** 步骤级事件的名称与序号；非步骤事件一律 null（不拿别的形态顶上） */
function stepFacts(progress: StationProgress | null): {
  label: string | null;
  sequence: number | null;
} {
  if (!progress || progress.source !== 'step') return { label: null, sequence: null };
  return { label: progress.label, sequence: progress.sequence ?? null };
}

/**
 * 由页面既有数据派生叙述快照（**纯函数**）。
 *
 * 注意：`queue.total` 在查询未就绪时会被 `useDecisionQueue` 兜成 `0`，
 * 因此**必须**同时看 `queueReady`——只看 `total` 就会把"还没查"说成"没有待办"。
 */
export function buildSurfaceSnapshot(
  inputs: SurfaceSnapshotInputs,
): SurfaceSnapshot {
  const { stations, lanes, queue } = inputs;
  const gaps: string[] = [];

  // ── 同事态 ───────────────────────────────────────────────
  let colleagues: SurfaceSnapshotColleagues | null = null;
  const roster: SurfaceSnapshotRosterEntry[] = [];

  if (inputs.colleaguesReady) {
    const byStatus: Record<string, number> = {
      needYou: 0,
      working: 0,
      suggestions: 0,
      idle: 0,
      other: 0,
    };
    let blocked = 0;
    for (const station of stations) {
      const bucket = KNOWN_STATUSES.includes(station.status)
        ? station.status
        : 'other';
      byStatus[bucket] += 1;
      if (station.blocking > 0) blocked += 1;

      const step = stepFacts(station.progress);
      roster.push({
        name: station.displayName,
        status: station.status,
        task: station.run?.label ?? null,
        runStatus: station.run?.status ?? null,
        runStatusSource: station.run?.statusSource ?? null,
        runStartedAt: station.run?.startedAt ?? null,
        lastProgress: progressText(station.progress),
        lastProgressAt:
          station.progress && progressText(station.progress) !== null
            ? toIso(station.progress.at)
            : null,
        lastStep: step.label,
        lastStepSequence: step.sequence,
        blocking: station.blocking,
      });
    }
    colleagues = {
      total: stations.length,
      needYou: byStatus.needYou,
      working: byStatus.working,
      suggestions: byStatus.suggestions,
      idle: byStatus.idle,
      other: byStatus.other,
      blocked,
    };
  } else {
    gaps.push('同事状态还没取到，现在讲不了"谁在干什么"');
  }

  // ── 待办 ─────────────────────────────────────────────────
  const needsYou: SurfaceSnapshotNeedsYou | null = inputs.queueReady
    ? {
        total: queue.total,
        blocking: queue.blocking,
        advisory: queue.advisory,
        hiddenCount: queue.hiddenCount,
        top: queue.items.slice(0, 5).map((item) => {
          const created = Date.parse(item.createdAt);
          return {
            id: item.id,
            title: item.title,
            urgency: item.urgency,
            waitingSince: Number.isNaN(created)
              ? null
              : new Date(created).toISOString(),
          };
        }),
      }
    : null;
  if (!needsYou) {
    gaps.push('待你拍板的清单还没取到，现在讲不了"有几件事等你"');
  } else if (needsYou.hiddenCount > 0) {
    gaps.push(
      `待办共 ${needsYou.total} 件，下面只列出了最急的 ${needsYou.top.length} 件`,
    );
  }

  // ── 六站 ─────────────────────────────────────────────────
  if (inputs.lanesPending) {
    gaps.push('六站的计数还没取齐，有些站点暂时没有数字');
  } else if (inputs.lanesError) {
    gaps.push('有一部分站点的计数没取到，下面的数字是缺的');
  }
  for (const lane of lanes) {
    if (lane.blockedScopeNote) {
      gaps.push(
        `「${lane.label}」的阻塞数只覆盖${lane.blockedScopeNote}，不是全部`,
      );
    }
    if (!inputs.lanesPending && !inputs.lanesError && lane.count === null) {
      gaps.push(`「${lane.label}」这一站暂时没有计数口径`);
    }
  }

  // ── 粒度天花板（§4.6）：三种粒度必须分开说，不能笼统地"没有进展" ──
  // 有在执行的人身上，进展可能停在三个高度：原话（runtime 自报）/ 步骤级 / 只有状态。
  // 把后两种混成一句"没有逐条进展"，会让**确实在报步骤**的执行被说成毫无动静。
  const hasActiveRun = roster.some((entry) => entry.task !== null);
  const withRun = roster.filter((entry) => entry.task !== null);
  const hasWordLevel = withRun.some((entry) => entry.lastProgress !== null);
  const hasStepLevel = withRun.some((entry) => entry.lastStep !== null);
  if (hasActiveRun && !hasWordLevel) {
    gaps.push(
      hasStepLevel
        ? '进展只到步骤级（如「步骤 N · 节点名」），没有运行时逐句原话'
        : '现在只有状态级进度，没有逐条的执行进展（这是当前的数据粒度上限）',
    );
  }

  return {
    colleagues,
    roster,
    lanes: lanes.map((lane) => ({
      label: lane.label,
      count: lane.count,
      blocked: lane.blocked,
    })),
    needsYou,
    // 去重后保序：同一句话可能被多条路径推入（如窗口说明）
    gaps: [...new Set(gaps)],
  };
}

/** 快照里是否有一件可讲的事——没有就不该去调模型（省一轮 token，也不编话） */
export function snapshotHasFacts(snapshot: SurfaceSnapshot): boolean {
  if (snapshot.colleagues && snapshot.colleagues.total > 0) return true;
  if (snapshot.needsYou && snapshot.needsYou.total > 0) return true;
  if (snapshot.lanes.some((lane) => lane.count !== null && lane.count > 0)) {
    return true;
  }
  return false;
}
