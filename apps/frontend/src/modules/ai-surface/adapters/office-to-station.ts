import type { RuntimeUsagePayload } from '@apm/shared/events/domain-events';
import type {
  OfficeAcceptability,
  OfficeColleague,
  OfficeStatus,
} from '@/modules/office/api/office-api';
import type { SurfaceFeedItem } from '../hooks/use-surface-feed';

/**
 * 工位卡适配器：office 口径 + 投影层进展 → AI 表面的工位视图模型。
 *
 * ## 为什么需要它（ARCH-AISURFACE-001 §4.7「不造第二套数据口径」）
 *
 * AI 表面原先把「同事在干什么」写成了 `AgentPersona` 这一**自造口径**：
 * `status: 'reasoning'`、`statusText: '正在推演 CAP-P-01 任务原子拆解路径'`、
 * `tokensUsed: 42800`、`specialties: ['PRD解构']`——这些字段在服务端**全部不存在**，
 * 是硬编码在组件里的表演。本适配器把工位卡改为消费既有服务（`GET /office/summary`，
 * 即办公室页面用的同一份聚合）叠加投影层的真实进展事件，**不新增任何数据源**。
 *
 * ## 诚实边界：三个刻意的不作为
 *
 * 1. **不推算百分比**：只透传 `capacity.loadPct`（服务端算好的）；不据 token 数反推进度。
 * 2. **不编状态语义**：`status` 原样透传 `OfficeStatus` 四值（needYou/working/suggestions/idle），
 *    不再映射成「reasoning/auditing」这类听上去更聪明的自造档位。
 * 3. **不造叙述**：`progress.text` 一律来自运行时上报的原文（`summary`）或步骤事件
 *    的字段（`sequence`/`stepLabel`/`status`）；无事件时**返回 null**，由组件显示
 *    「已派发，暂无进展事件」——宁可显示无数据，不显示像数据的假话。
 *    唯一例外是步骤分支的**排版**（`步骤 3 · 编译` 的连接符）——那是格式，不是事实。
 *
 * 另注：`trustScore` / `budgetUsagePct` 等在 office 口径里本就是可选的，缺就留
 * `undefined`，由组件渲染成 `—`；**不用默认值兜底**（99.2 这种兜底值正是原实现的问题）。
 */

/** 进展来源：区分「运行时原话」「步骤事件」「执行终态」三种形态，格式化留给组件 */
export type StationProgress =
  | {
      /** 运行时自报的原文（`runtime.execution.event` 的 `summary`）——诚实粒度的天花板 */
      source: 'runtime';
      text: string;
      at: number;
      eventName: string;
    }
  | {
      /** 步骤事件：只有序号/名称/状态，没有叙述 */
      source: 'step';
      sequence?: number;
      label: string;
      status?: string;
      at: number;
      eventName: string;
    }
  | {
      /**
       * 执行终态（`runtime.execution.result` 的 `summary`）——终态压过在途进展。
       *
       * 为什么不是"谁新谁赢"：一次执行只有**一个**终态，终态之后这个 run 不再有未来。
       * 因此即便某条 `runtime.execution.event` 因投递延迟**晚于**终态到达，它描述的也是
       * 已经结束的过程——拿它盖住终态，会让"干完了的活"继续显示"正在写第 12 个文件"。
       */
      source: 'result';
      text: string;
      /**
       * 终态值（completed / failed / cancelled）。
       * 可选且**无默认**：契约上 `status` 必有，但万一缺席，编一个 'completed'
       * 就是把"不知道"说成"干完了"——宁可整个不显示。
       */
      status?: string;
      /** CLI 上报的真实用量；**未上报则 undefined**，由组件决定不显示 */
      usage?: RuntimeUsagePayload;
      /** 产物/证据条数（列表长度这一事实，非推算） */
      artifactCount?: number;
      evidenceCount?: number;
      at: number;
      eventName: string;
    };

export interface StationRun {
  id: string;
  /** 展示名：优先工单标题，退化到本次执行的目标（与 ColleagueCard 同规则） */
  label: string;
  /** 执行状态原样透传，不做语义美化 */
  status: string;
  /**
   * `status` 从哪来：
   * - `snapshot` —— office 快照（冷启动抓取，可能已滞后）
   * - `event` —— 终态事件（`runtime.execution.result`）覆写，比快照新
   *
   * 两者不一致时以事件为准（事件是后到的增量），但**必须把来源带到 UI**：
   * 否则读者无从判断这个 status 是"刚确认的"还是"几分钟前抓的"。
   */
  statusSource: 'snapshot' | 'event';
  /**
   * 本次执行的开跑时刻（office 快照字段，ISO）。
   *
   * 只做**事实陈述**用（"从 14:20 开始跑"），**不是**"卡了多久"——快照没有阻塞起始
   * 时刻，拿开跑时刻减一下会得到一个听起来精确、实则无据的时长。
   */
  startedAt?: string;
}

export interface StationCapacity {
  activeRuns: number;
  capacityLimit: number;
  loadPct: number;
  acceptability: OfficeAcceptability;
  /** 本周消耗——与办公室页面同一口径，标签必须写明「本周」 */
  weeklyTokens: number;
  weeklyCostUsd: number;
  /** 预算已用百分比：**仅项目域**（带 projectId 查询）才有；无预算就 undefined */
  budgetUsagePct?: number;
}

export interface StationCard {
  memberId: string;
  displayName: string;
  avatarUrl?: string;
  title?: string;
  status: OfficeStatus;
  /** 阻塞待决数（红点）*/
  blocking: number;
  /** 非阻塞待决数 */
  advisory: number;
  /** 服务端未给分时保持 undefined——组件渲染 `—` */
  trustScore?: number;
  currentProvider?: string;
  lastRunAt?: string;
  run: StationRun | null;
  /** 实时进展；无事件时为 null（组件必须显式显示"暂无进展事件"）*/
  progress: StationProgress | null;
  capacity: StationCapacity;
}

/** 终态事件 → 进展视图。终态是"这个 run 的最后一句真话"，故单独成支且优先。 */
function toResultProgress(item: SurfaceFeedItem): StationProgress | null {
  if (typeof item.dataText !== 'string') return null;
  const detail = item.detail ?? {};
  return {
    source: 'result',
    text: item.dataText,
    status: item.status,
    // 一律「有才带」：detail 里没有这个键就是没上报，不造默认值
    usage: detail.usage as RuntimeUsagePayload | undefined,
    artifactCount:
      typeof detail.artifactCount === 'number' ? detail.artifactCount : undefined,
    evidenceCount:
      typeof detail.evidenceCount === 'number' ? detail.evidenceCount : undefined,
    at: item.at,
    eventName: item.eventName,
  };
}

/**
 * 从投影层取某次执行的**最新真实进展**。
 *
 * `items` 在 store 里是新→旧排列（`[item, ...items]`），故首个匹配即为最新。
 * 优先级：**执行终态 > 运行时原话 > 步骤事件**。
 *
 * 终态为何排最前（而非按时间取最新）：一次执行只有一个终态，终态之后该 run
 * 不再有未来；延迟到达的在途事件描述的是**已经结束的过程**，拿它盖住终态会让
 * 干完的活继续显示"正在写入…"。其余两级按时间取最新，前者信息量大且是原文。
 */
export function pickStationProgress(
  items: SurfaceFeedItem[],
  runId: string,
): StationProgress | null {
  const candidates = items.filter((item) => item.subjectId === runId);
  if (candidates.length === 0) return null;

  const result = candidates.find((item) => item.kind === 'result');
  if (result) {
    const progress = toResultProgress(result);
    if (progress) return progress;
  }

  const runtime = candidates.find(
    (item) => item.kind === 'runtimeEvent' && typeof item.dataText === 'string',
  );
  if (runtime?.dataText) {
    return {
      source: 'runtime',
      text: runtime.dataText,
      at: runtime.at,
      eventName: runtime.eventName,
    };
  }

  const step = candidates.find((item) => item.kind === 'step' && item.stepLabel);
  if (step?.stepLabel) {
    return {
      source: 'step',
      sequence: step.sequence,
      label: step.stepLabel,
      status: step.status,
      at: step.at,
      eventName: step.eventName,
    };
  }

  return null;
}

/** 单个同事 → 工位卡视图模型（纯函数）*/
export function toStationCard(
  colleague: OfficeColleague,
  items: SurfaceFeedItem[],
): StationCard {
  const run = colleague.currentRun;
  const progress = run ? pickStationProgress(items, run.id) : null;

  // 终态合并：快照是冷启动抓的，终态事件是之后到的增量——两者对同一次执行的
  // status 说法不一致时，以事件为准（它更新），并把来源带出去供 UI 标注。
  const terminalFromEvent =
    progress?.source === 'result' && progress.status ? progress.status : null;

  return {
    memberId: colleague.memberId,
    displayName: colleague.displayName,
    avatarUrl: colleague.avatarUrl,
    title: colleague.title ?? colleague.executionRole,
    status: colleague.status,
    blocking: colleague.blocking,
    advisory: colleague.advisory,
    trustScore: colleague.trustScore,
    currentProvider: colleague.currentProvider,
    lastRunAt: colleague.lastRunAt,
    run: run
      ? {
          id: run.id,
          label: run.taskTitle ?? run.goal,
          status: terminalFromEvent ?? run.status,
          statusSource: terminalFromEvent ? 'event' : 'snapshot',
          startedAt: run.startedAt,
        }
      : null,
    progress,
    capacity: {
      activeRuns: colleague.capacity.activeRuns,
      capacityLimit: colleague.capacity.capacityLimit,
      loadPct: colleague.capacity.loadPct,
      acceptability: colleague.capacity.acceptability,
      weeklyTokens: colleague.capacity.weeklyTokens,
      weeklyCostUsd: colleague.capacity.weeklyCostUsd,
      budgetUsagePct: colleague.capacity.budgetUsagePct,
    },
  };
}

/** 同事列表 → 工位卡列表（纯函数）*/
export function toStationCards(
  colleagues: OfficeColleague[],
  items: SurfaceFeedItem[],
): StationCard[] {
  return colleagues.map((colleague) => toStationCard(colleague, items));
}
