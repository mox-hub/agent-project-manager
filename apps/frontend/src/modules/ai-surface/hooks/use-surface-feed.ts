import { useEffect, useMemo } from 'react';
import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';
import {
  DomainEventTypes,
  type AcceptanceCreatedPayload,
  type AiWorkflowUpdatePayload,
  type ApprovalRequestCreatedPayload,
  type ExecutionApprovalNeededPayload,
  type ExecutionRunCreatedPayload,
  type ExecutionRunUpdatedPayload,
  type ExecutionStepCreatedPayload,
  type ExecutionStepUpdatedPayload,
  type ReleaseApprovedPayload,
  type RuntimeDispatchChangedPayload,
  type RuntimeUsagePayload,
} from '@apm/shared/events/domain-events';
import { eventClient } from '@/infrastructure/event-client';
import { createLogger } from '@/shared/lib/logger';

/**
 * 面级投影层（设计纪要 ARCH-AISURFACE-001 §4.1）。
 *
 * 领域事件（WS）→ 归一化 SurfaceFeedItem → 环形缓冲 store → 盯盘组件消费。
 *
 * 三条纪律：
 * 1. **不生产文案**：feed 项只带结构化字段，展示文案由组件经 `t()` 渲染，
 *    避免把 UI 拷贝塞进 store 造成 i18n 债。唯一例外是 `dataText`——它承载
 *    运行时上报的原样文本（如 runtime.execution.event.summary），属数据非文案。
 * 2. **不伪造数字**：本层只搬运事件里真实存在的字段，**不计算百分比、不推速率**。
 *    诚实粒度（§3.1）在此层生效：有多少字段给多少字段。
 * 3. **快照 + 增量双轨**：本层只管 WS 增量；冷启动快照仍由 React Query
 *    （office summary / executions）供给，二者在组件层汇合，见 §4.1。
 */

const log = createLogger({ prefix: 'SurfaceFeed' });

/** 环形缓冲容量上限——防 chunk 级高频事件洪水（§六 风险表） */
export const SURFACE_FEED_CAPACITY = 200;

export type SurfaceFeedKind =
  | 'run'
  | 'step'
  | 'runtimeEvent'
  /** 执行终态（`runtime.execution.result`）——携带 CLI 上报的真实用量 */
  | 'result'
  | 'approval'
  | 'acceptance'
  | 'release'
  | 'workflow';

export interface SurfaceFeedItem {
  /** 去重键（`${eventName}:${事件内唯一 id}`） */
  id: string;
  kind: SurfaceFeedKind;
  /** 事件发生时刻（epoch ms）——迟到判定与"数据滞后"标注的依据 */
  at: number;
  /** 来源事件名——工位卡 hover 溯源要回答"你这数字哪来的"（§3.1） */
  eventName: string;
  projectId?: string;
  /** 归属实体（executionRunId / approvalId / acceptanceId / releaseId） */
  subjectId?: string;
  /** 状态值（如 in_progress / approved）；无则省略，组件据此决定是否显示 */
  status?: string;
  /** 上一状态（仅 execution.run.updated 提供） */
  previousStatus?: string;
  /** 步骤序号（仅 execution.step.created 提供） */
  sequence?: number;
  /** 步骤类型/名称（execution.step.updated 的两个发布方之一提供） */
  stepLabel?: string;
  /** 运行时上报的原样文本（数据，非 UI 文案） */
  dataText?: string;
  /** token/成本等真实数值字段（有才带，绝不推算） */
  detail?: Record<string, unknown>;
}

interface SurfaceFeedState {
  items: SurfaceFeedItem[];
  /** WS 连接态——断开时组件须显式展示"实时已断开，数据可能滞后"（§4.1 断连） */
  connected: boolean;
  /** 最近一次收到事件时刻（epoch ms）；用于"数据滞后 Ns"标注 */
  lastEventAt: number | null;
  /** 因乱序（迟到）被丢弃的条数——显式可见，不静默 */
  staleDropped: number;
  /** 各运行时最后心跳时刻（epoch ms），key = runtimeId */
  runtimeHeartbeat: Record<string, number>;
  push: (item: SurfaceFeedItem) => void;
  setConnected: (connected: boolean) => void;
  markHeartbeat: (runtimeId: string, at: number) => void;
  reset: () => void;
}

/** 乱序防御水位：key = `${kind}:${subjectId}` → 已见最大 at */
const watermarks = new Map<string, number>();

function watermarkKey(item: SurfaceFeedItem): string | null {
  return item.subjectId ? `${item.kind}:${item.subjectId}` : null;
}

export const useSurfaceFeedStore = create<SurfaceFeedState>((set) => ({
  items: [],
  connected: false,
  lastEventAt: null,
  staleDropped: 0,
  runtimeHeartbeat: {},
  push: (item) =>
    set((state) => {
      const key = watermarkKey(item);
      if (key) {
        const seen = watermarks.get(key);
        // 迟到事件防御：同实体已见过更新时刻的事件 → 本条是乱序旧闻，丢弃并计数。
        // 不静默吞掉：staleDropped 递增，可被 UI 展示（§4.1 "带时间戳防乱序"）。
        if (seen !== undefined && item.at < seen) {
          log.debug(
            `dropped stale ${item.eventName} (${item.at} < ${seen})`,
          );
          return { staleDropped: state.staleDropped + 1 };
        }
        watermarks.set(key, item.at);
      }
      // 去重：同 id 只留一条
      if (state.items.some((existing) => existing.id === item.id)) {
        return state;
      }
      const items = [item, ...state.items];
      if (items.length > SURFACE_FEED_CAPACITY) {
        items.length = SURFACE_FEED_CAPACITY;
      }
      return { items, lastEventAt: Math.max(state.lastEventAt ?? 0, item.at) };
    }),
  setConnected: (connected) => set({ connected }),
  markHeartbeat: (runtimeId, at) =>
    set((state) => ({
      runtimeHeartbeat: { ...state.runtimeHeartbeat, [runtimeId]: at },
    })),
  reset: () => {
    watermarks.clear();
    set({
      items: [],
      lastEventAt: null,
      staleDropped: 0,
      runtimeHeartbeat: {},
    });
  },
}));

// ---------- 归一化（纯函数，可单测） ----------

function toMillis(value: unknown, fallback: number): number {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return fallback;
}

/**
 * 事件 → feed 项。无法/无需进 feed 的事件（如心跳）返回 null。
 *
 * 防御式取值：`execution.step.updated` 存在两个形状不一致的发布方
 * （见 shared domain-events 注释），所有字段一律按可选处理。
 */
export function normalizeSurfaceEvent(
  eventName: string,
  payload: unknown,
  now = Date.now(),
): SurfaceFeedItem | null {
  if (!payload || typeof payload !== 'object') return null;
  const p = payload as Record<string, unknown>;

  const base = { eventName, at: now };

  switch (eventName) {
    case DomainEventTypes.ExecutionRunCreated: {
      const d = p as ExecutionRunCreatedPayload;
      return {
        ...base,
        id: `${eventName}:${d.executionRunId}`,
        kind: 'run',
        subjectId: d.executionRunId,
        projectId: d.projectId ?? undefined,
      };
    }

    case DomainEventTypes.ExecutionRunUpdated: {
      const d = p as ExecutionRunUpdatedPayload;
      return {
        ...base,
        id: `${eventName}:${d.executionRunId}:${d.newStatus}`,
        kind: 'run',
        subjectId: d.executionRunId,
        status: d.newStatus,
        previousStatus: d.previousStatus ?? undefined,
      };
    }

    case DomainEventTypes.ExecutionCompleted: {
      const runId = typeof p.executionRunId === 'string' ? p.executionRunId : undefined;
      return {
        ...base,
        id: `${eventName}:${runId ?? 'unknown'}`,
        kind: 'run',
        subjectId: runId,
        status: 'completed',
      };
    }

    case DomainEventTypes.ExecutionStepCreated: {
      const d = p as ExecutionStepCreatedPayload;
      return {
        ...base,
        id: `${eventName}:${d.stepId}`,
        kind: 'step',
        subjectId: d.executionRunId,
        sequence: d.sequence,
      };
    }

    case DomainEventTypes.ExecutionStepUpdated: {
      const d = p as ExecutionStepUpdatedPayload;
      const label = d.stepName ?? d.stepType;
      return {
        ...base,
        // 两个发布方形状不一：以 status + (stepId|label) 组键，缺 id 时退化到时间戳防串
        id: `${eventName}:${d.stepId ?? label ?? 'anon'}:${d.status}:${now}`,
        kind: 'step',
        subjectId: d.executionRunId,
        status: d.status,
        stepLabel: label,
      };
    }

    case DomainEventTypes.RuntimeExecutionEvent: {
      const runId =
        typeof p.executionRunId === 'string' ? p.executionRunId : undefined;
      const timestamp = p.timestamp;
      return {
        ...base,
        at: toMillis(timestamp, now),
        id: `${eventName}:${runId ?? 'unknown'}:${toMillis(timestamp, now)}:${String(p.eventType ?? '')}`,
        kind: 'runtimeEvent',
        subjectId: runId,
        status: typeof p.status === 'string' ? p.status : undefined,
        dataText: typeof p.summary === 'string' ? p.summary : undefined,
        detail:
          p.detail && typeof p.detail === 'object'
            ? (p.detail as Record<string, unknown>)
            : undefined,
      };
    }

    /**
     * 执行终态 + CLI 真实成本。这是**执行终态与 token/成本的唯一上行通道**：
     * `usage` 由守护进程在终事件里上报，服务端据此落 AIUsageLog，本层只搬运。
     *
     * 早先本分支缺失 → 该事件到达客户端后被 default 分支静默丢弃，于是
     * 「本次执行花了多少 token/多少钱」在表面上根本不存在（工位卡只能显示
     * office 的**本周**聚合口径）。补齐后 detail.usage 才有值可读。
     */
    case DomainEventTypes.RuntimeExecutionResult: {
      const runId =
        typeof p.executionRunId === 'string' ? p.executionRunId : undefined;
      // usage 是「有/没有」而非「有/为 0」：未上报时字段缺席，**不补 0 兜底**
      // （补 0 会把"没上报"说成"没花钱"，与 §4.7 不伪造同罪）
      const rawUsage = p.usage;
      const usage =
        rawUsage && typeof rawUsage === 'object'
          ? (rawUsage as RuntimeUsagePayload)
          : undefined;
      const detail: Record<string, unknown> = {};
      if (usage) detail.usage = usage;
      // 计数是「列表长度」这一事实本身，非推算值；空数组不进 detail（不写 0）
      if (Array.isArray(p.artifacts) && p.artifacts.length > 0) {
        detail.artifactCount = p.artifacts.length;
      }
      if (Array.isArray(p.evidence) && p.evidence.length > 0) {
        detail.evidenceCount = p.evidence.length;
      }
      if (p.error) detail.hasError = true;
      return {
        ...base,
        at: toMillis(p.timestamp, now),
        // 一次执行只有一个终态 → 以 run 为键天然幂等，重复投递不会产生第二条
        id: `${eventName}:${runId ?? 'unknown'}`,
        kind: 'result',
        subjectId: runId,
        status: typeof p.status === 'string' ? p.status : undefined,
        dataText: typeof p.summary === 'string' ? p.summary : undefined,
        detail: Object.keys(detail).length > 0 ? detail : undefined,
      };
    }

    case DomainEventTypes.ExecutionApprovalNeeded: {
      const d = p as ExecutionApprovalNeededPayload;
      return {
        ...base,
        id: `${eventName}:${d.approvalId}`,
        kind: 'approval',
        subjectId: d.executionRunId,
        projectId: d.projectId,
        status: 'needed',
      };
    }

    case DomainEventTypes.ApprovalRequestCreated: {
      const d = p as ApprovalRequestCreatedPayload;
      return {
        ...base,
        id: `${eventName}:${d.approvalRequestId}`,
        kind: 'approval',
        subjectId: d.executionRunId ?? d.approvalRequestId,
        projectId: d.projectId,
        status: 'pending',
        dataText: d.requestedAction,
        detail: d.riskLevel ? { riskLevel: d.riskLevel } : undefined,
      };
    }

    case DomainEventTypes.ApprovalResolved:
    case DomainEventTypes.ApprovalCancelled: {
      const id =
        typeof p.approvalRequestId === 'string'
          ? p.approvalRequestId
          : typeof p.executionRunId === 'string'
            ? p.executionRunId
            : undefined;
      return {
        ...base,
        id: `${eventName}:${id ?? 'unknown'}`,
        kind: 'approval',
        subjectId: id,
        projectId: typeof p.projectId === 'string' ? p.projectId : undefined,
        status: typeof p.status === 'string' ? p.status : undefined,
      };
    }

    case DomainEventTypes.AcceptanceCreated: {
      const d = p as AcceptanceCreatedPayload;
      return {
        ...base,
        id: `${eventName}:${d.acceptanceId}`,
        kind: 'acceptance',
        subjectId: d.acceptanceId,
        projectId: d.projectId ?? undefined,
        status: 'created',
        dataText: d.title,
      };
    }

    case DomainEventTypes.AcceptanceResolved:
    case DomainEventTypes.AcceptanceDeleted: {
      const id =
        typeof p.acceptanceId === 'string' ? p.acceptanceId : undefined;
      return {
        ...base,
        id: `${eventName}:${id ?? 'unknown'}`,
        kind: 'acceptance',
        subjectId: id,
        projectId: typeof p.projectId === 'string' ? p.projectId : undefined,
        status:
          typeof p.status === 'string'
            ? p.status
            : eventName === DomainEventTypes.AcceptanceDeleted
              ? 'deleted'
              : undefined,
      };
    }

    case DomainEventTypes.ReleaseCreated: {
      const id = typeof p.releaseId === 'string' ? p.releaseId : undefined;
      return {
        ...base,
        id: `${eventName}:${id ?? 'unknown'}`,
        kind: 'release',
        subjectId: id,
        projectId: typeof p.projectId === 'string' ? p.projectId : undefined,
        status: 'created',
      };
    }

    case DomainEventTypes.ReleaseApproved: {
      const d = p as ReleaseApprovedPayload;
      return {
        ...base,
        id: `${eventName}:${d.releaseId}`,
        kind: 'release',
        subjectId: d.releaseId,
        status: 'approved',
      };
    }

    case DomainEventTypes.AiWorkflowUpdate: {
      const d = p as AiWorkflowUpdatePayload;
      return {
        ...base,
        at: toMillis(d.at, now),
        id: `${eventName}:${d.workflowRunId}:${d.status}`,
        kind: 'workflow',
        subjectId: d.workflowRunId,
        status: d.status,
      };
    }

    // 心跳不进 feed（环境信号，非事件流）；由 markHeartbeat 单独记账
    case DomainEventTypes.RuntimeHeartbeat:
      return null;

    default:
      return null;
  }
}

/**
 * 订阅面级事件并写入 store。在 ai-surface 页挂载一次。
 *
 * 覆盖三类来源：
 * - 治理族（execution/approval/acceptance/release）——S1 网关补转发后才会到达
 * - 聚合通道 `runtime.dispatch.changed`——裹着 runtime 族 6 事件，拆包后归一化
 * - 心跳——不进 feed，只更新 runtimeLiveness
 */
export function useSurfaceFeedSubscription(): void {
  useEffect(() => {
    if (!eventClient.isConnected()) {
      eventClient.connect(import.meta.env.VITE_WS_URL || undefined);
    }

    const store = useSurfaceFeedStore.getState();
    store.setConnected(eventClient.isConnected());

    // 聚合通道：{ source, payload } → 按 source 还原为原始事件名再归一化，
    // 保证 feed 项上的 eventName 是"这条数据到底来自哪个事件"（溯源诚实）。
    const onDispatchChanged = (payload: unknown) => {
      const wrapped = payload as RuntimeDispatchChangedPayload | undefined;
      const source = wrapped?.source;
      if (typeof source !== 'string') return;
      const item = normalizeSurfaceEvent(source, wrapped?.payload);
      if (item) useSurfaceFeedStore.getState().push(item);
    };

    // 治理族逐事件订阅
    const governanceEvents = [
      DomainEventTypes.ExecutionRunCreated,
      DomainEventTypes.ExecutionRunUpdated,
      DomainEventTypes.ExecutionCompleted,
      DomainEventTypes.ExecutionStepCreated,
      DomainEventTypes.ExecutionStepUpdated,
      DomainEventTypes.ExecutionApprovalNeeded,
      DomainEventTypes.ApprovalRequestCreated,
      DomainEventTypes.ApprovalResolved,
      DomainEventTypes.ApprovalCancelled,
      DomainEventTypes.AcceptanceCreated,
      DomainEventTypes.AcceptanceResolved,
      DomainEventTypes.AcceptanceDeleted,
      DomainEventTypes.ReleaseCreated,
      DomainEventTypes.ReleaseApproved,
      DomainEventTypes.AiWorkflowUpdate,
    ] as const;

    const handlers = governanceEvents.map((eventName) => {
      const handler = (payload: unknown) => {
        const item = normalizeSurfaceEvent(eventName, payload);
        if (item) useSurfaceFeedStore.getState().push(item);
      };
      eventClient.on(eventName, handler);
      return { eventName, handler };
    });

    const onHeartbeat = (payload: unknown) => {
      const p = payload as { runtimeId?: unknown; timestamp?: unknown };
      if (typeof p?.runtimeId !== 'string') return;
      useSurfaceFeedStore
        .getState()
        .markHeartbeat(p.runtimeId, toMillis(p.timestamp, Date.now()));
    };

    const onConnected = () => useSurfaceFeedStore.getState().setConnected(true);
    const onDisconnected = () =>
      useSurfaceFeedStore.getState().setConnected(false);

    eventClient.on(DomainEventTypes.RuntimeDispatchChanged, onDispatchChanged);
    eventClient.on(DomainEventTypes.RuntimeHeartbeat, onHeartbeat);
    eventClient.on('connected', onConnected);
    eventClient.on('disconnected', onDisconnected);

    return () => {
      handlers.forEach(({ eventName, handler }) =>
        eventClient.off(eventName, handler),
      );
      eventClient.off(DomainEventTypes.RuntimeDispatchChanged, onDispatchChanged);
      eventClient.off(DomainEventTypes.RuntimeHeartbeat, onHeartbeat);
      eventClient.off('connected', onConnected);
      eventClient.off('disconnected', onDisconnected);
    };
  }, []);
}

// ---------- 消费选择器 ----------

/** 按项目过滤的 feed 项（projectId 为空 = 全域） */
export function useSurfaceFeedItems(projectId?: string): SurfaceFeedItem[] {
  // ⚠️ zustand v5 以 `Object.is` 比较选择器结果。选择器里直接 `filter` 会**每次
  // 返回新数组**，React 判定"状态变了"→ 重渲染 → 再 filter → 无限循环。
  // 因此只选稳定引用（items 本身），派生物放 useMemo。本文件其余选择器同理。
  const items = useSurfaceFeedStore((state) => state.items);
  return useMemo(
    () =>
      projectId ? items.filter((item) => item.projectId === projectId) : items,
    [items, projectId],
  );
}

/** 连接态 + 数据新鲜度——组件据此展示"实时已断开 / 数据滞后 Ns" */
export function useSurfaceFreshness(): {
  connected: boolean;
  lastEventAt: number | null;
  staleDropped: number;
} {
  // 返回对象字面量 → 必须 useShallow 做浅比较，否则每次渲染都是新引用（同上）
  return useSurfaceFeedStore(
    useShallow((state) => ({
      connected: state.connected,
      lastEventAt: state.lastEventAt,
      staleDropped: state.staleDropped,
    })),
  );
}
