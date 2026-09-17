import { describe, expect, it, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { DomainEventTypes } from '@apm/shared/events/domain-events';
import {
  SURFACE_FEED_CAPACITY,
  normalizeSurfaceEvent,
  useSurfaceFeedItems,
  useSurfaceFeedStore,
  useSurfaceFreshness,
} from './use-surface-feed';

/**
 * 面级投影层（ARCH-AISURFACE-001 §4.1）。
 *
 * 三条不变量钉在测试里：
 * 1. **不伪造**：归一化只搬运事件里真实存在的字段；心跳/包装通道/未知事件一律不进 feed。
 * 2. **乱序可见**：迟到事件被丢弃但必须计数（staleDropped），不静默。
 * 3. **选择器稳定**：v5 以 Object.is 比较，选择器返回新引用 = 无限重渲染（回归守卫）。
 */

beforeEach(() => {
  useSurfaceFeedStore.getState().reset();
  useSurfaceFeedStore.getState().setConnected(false);
});

describe('normalizeSurfaceEvent', () => {
  it('执行过程：run 创建/状态流转 带 previousStatus', () => {
    const created = normalizeSurfaceEvent(
      DomainEventTypes.ExecutionRunCreated,
      { executionRunId: 'run-1', projectId: 'p-1' },
      1000,
    );
    expect(created).toMatchObject({
      id: `${DomainEventTypes.ExecutionRunCreated}:run-1`,
      kind: 'run',
      subjectId: 'run-1',
      projectId: 'p-1',
      at: 1000,
    });

    const updated = normalizeSurfaceEvent(
      DomainEventTypes.ExecutionRunUpdated,
      { executionRunId: 'run-1', previousStatus: 'queued', newStatus: 'running' },
      2000,
    );
    expect(updated).toMatchObject({
      kind: 'run',
      status: 'running',
      previousStatus: 'queued',
    });
  });

  it('步骤：两个发布方形状不一致时都按可选处理', () => {
    const shapeA = normalizeSurfaceEvent(
      DomainEventTypes.ExecutionStepUpdated,
      { executionRunId: 'run-1', stepId: 'st-1', status: 'running', stepName: '编译' },
      1000,
    );
    expect(shapeA).toMatchObject({ kind: 'step', status: 'running', stepLabel: '编译' });

    const shapeB = normalizeSurfaceEvent(
      DomainEventTypes.ExecutionStepUpdated,
      { executionRunId: 'run-1', stepType: 'build', status: 'completed' },
      1000,
    );
    expect(shapeB).toMatchObject({ kind: 'step', status: 'completed', stepLabel: 'build' });
  });

  it('运行时事件：只带真实存在的字段，缺字段就不带（不推算百分比）', () => {
    const item = normalizeSurfaceEvent(
      DomainEventTypes.RuntimeExecutionEvent,
      {
        executionRunId: 'run-1',
        eventType: 'tool_use',
        status: 'running',
        summary: 'npm test 通过 42 项',
        timestamp: '2026-09-14T00:00:00.000Z',
        detail: { tokens: 1234 },
      },
      Date.parse('2026-09-14T00:00:00.000Z'),
    );
    expect(item).toMatchObject({
      kind: 'runtimeEvent',
      dataText: 'npm test 通过 42 项',
      detail: { tokens: 1234 },
    });
    expect(item?.at).toBe(Date.parse('2026-09-14T00:00:00.000Z'));

    // 无 summary 时不凭空造 dataText
    const bare = normalizeSurfaceEvent(
      DomainEventTypes.RuntimeExecutionEvent,
      { executionRunId: 'run-1', eventType: 'heartbeat' },
      1000,
    );
    expect(bare?.dataText).toBeUndefined();
    expect(bare?.detail).toBeUndefined();
  });

  it('执行终态：终态与真实用量进 detail，未上报就缺席（不补 0）', () => {
    const item = normalizeSurfaceEvent(
      DomainEventTypes.RuntimeExecutionResult,
      {
        executionRunId: 'run-1',
        status: 'completed',
        summary: '任务执行完成',
        usage: {
          promptTokens: 900,
          completionTokens: 100,
          totalTokens: 1000,
          costUsd: 0.42,
        },
        artifacts: [
          { type: 'file', ref: 'a.ts' },
          { type: 'file', ref: 'b.ts' },
        ],
        timestamp: '2026-09-15T00:00:00.000Z',
      },
      Date.parse('2026-09-15T00:00:00.000Z'),
    );

    expect(item).toMatchObject({
      id: `${DomainEventTypes.RuntimeExecutionResult}:run-1`,
      kind: 'result',
      subjectId: 'run-1',
      status: 'completed',
      dataText: '任务执行完成',
      detail: { usage: { totalTokens: 1000, costUsd: 0.42 }, artifactCount: 2 },
    });
    // at 取事件自带 timestamp（真实发生时刻），而非归一化时的 now
    expect(item?.at).toBe(Date.parse('2026-09-15T00:00:00.000Z'));

    // 未上报 usage、产物为空数组 → detail 一个键都不带（补 0 会把"没上报"说成"没花钱"）
    const bare = normalizeSurfaceEvent(
      DomainEventTypes.RuntimeExecutionResult,
      {
        executionRunId: 'run-2',
        status: 'failed',
        summary: '编译失败',
        artifacts: [],
        timestamp: '2026-09-15T00:00:00.000Z',
      },
      1000,
    );
    expect(bare?.detail).toBeUndefined();
    expect(bare?.status).toBe('failed');
  });

  it('审批 / 验收 / 发版 / 工作流各自归位', () => {
    expect(
      normalizeSurfaceEvent(
        DomainEventTypes.ApprovalRequestCreated,
        { approvalRequestId: 'ap-1', executionRunId: 'run-1', projectId: 'p-1', riskLevel: 'high' },
        1000,
      ),
    ).toMatchObject({ kind: 'approval', status: 'pending', detail: { riskLevel: 'high' } });

    expect(
      normalizeSurfaceEvent(
        DomainEventTypes.AcceptanceDeleted,
        { acceptanceId: 'ac-1' },
        1000,
      ),
    ).toMatchObject({ kind: 'acceptance', status: 'deleted' });

    expect(
      normalizeSurfaceEvent(
        DomainEventTypes.ReleaseApproved,
        { releaseId: 'rel-1' },
        1000,
      ),
    ).toMatchObject({ kind: 'release', status: 'approved' });

    expect(
      normalizeSurfaceEvent(
        DomainEventTypes.AiWorkflowUpdate,
        { workflowRunId: 'wf-1', status: 'running', at: '2026-09-14T00:00:00.000Z' },
        1000,
      ),
    ).toMatchObject({ kind: 'workflow', status: 'running' });
  });

  it('心跳 / 聚合包装通道 / 未知事件 / 非对象载荷都不进 feed', () => {
    expect(
      normalizeSurfaceEvent(DomainEventTypes.RuntimeHeartbeat, { runtimeId: 'rt-1' }, 1000),
    ).toBeNull();
    // runtime.dispatch.changed 是包装器，本身不是 feed 项（其内层由订阅层拆包）
    expect(
      normalizeSurfaceEvent(
        DomainEventTypes.RuntimeDispatchChanged,
        { source: 'runtime.execution.event', payload: {} },
        1000,
      ),
    ).toBeNull();
    expect(normalizeSurfaceEvent('nope.unknown', { a: 1 }, 1000)).toBeNull();
    expect(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunCreated, null, 1000)).toBeNull();
    expect(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunCreated, 'x', 1000)).toBeNull();
  });
});

describe('useSurfaceFeedStore', () => {
  const push = (item: ReturnType<typeof normalizeSurfaceEvent>) => {
    if (item) useSurfaceFeedStore.getState().push(item);
  };

  it('同 id 去重，最新在前', () => {
    const payload = { executionRunId: 'run-1', projectId: 'p-1' };
    push(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunCreated, payload, 1000));
    push(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunCreated, payload, 1000));
    expect(useSurfaceFeedStore.getState().items).toHaveLength(1);

    push(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunCreated, { executionRunId: 'run-2' }, 1500));
    expect(useSurfaceFeedStore.getState().items.map((i) => i.subjectId)).toEqual(['run-2', 'run-1']);
  });

  it('执行终态以 run 为键去重——重复投递不产生第二条', () => {
    const payload = {
      executionRunId: 'run-1',
      status: 'completed',
      summary: '任务执行完成',
      timestamp: '2026-09-15T00:00:00.000Z',
    };
    push(normalizeSurfaceEvent(DomainEventTypes.RuntimeExecutionResult, payload, 1000));
    push(normalizeSurfaceEvent(DomainEventTypes.RuntimeExecutionResult, payload, 1000));

    const items = useSurfaceFeedStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].kind).toBe('result');
  });

  it('迟到事件被丢弃但计数可见（不静默）', () => {
    const key = { executionRunId: 'run-1' };
    push(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunUpdated, { ...key, newStatus: 'running' }, 2000));
    push(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunUpdated, { ...key, newStatus: 'failed' }, 1000));

    const state = useSurfaceFeedStore.getState();
    expect(state.staleDropped).toBe(1);
    expect(state.items).toHaveLength(1);
    expect(state.items[0].status).toBe('running');
    // 水位不被旧事件拉回
    push(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunUpdated, { ...key, newStatus: 'queued' }, 1500));
    expect(useSurfaceFeedStore.getState().staleDropped).toBe(2);
  });

  it('环形缓冲封顶，保留最新', () => {
    for (let i = 0; i < SURFACE_FEED_CAPACITY + 5; i += 1) {
      push(
        normalizeSurfaceEvent(
          DomainEventTypes.ApprovalResolved,
          { approvalRequestId: `ap-${i}` },
          1000 + i,
        ),
      );
    }
    const state = useSurfaceFeedStore.getState();
    expect(state.items).toHaveLength(SURFACE_FEED_CAPACITY);
    expect(state.items[0].subjectId).toBe(`ap-${SURFACE_FEED_CAPACITY + 4}`);
    expect(state.lastEventAt).toBe(1000 + SURFACE_FEED_CAPACITY + 4);
  });

  it('reset 清空缓冲与水位', () => {
    push(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunCreated, { executionRunId: 'run-1' }, 2000));
    useSurfaceFeedStore.getState().reset();
    expect(useSurfaceFeedStore.getState().items).toEqual([]);
    // 水位已清 → 旧时刻事件重新被接受（reset 后是全新会话）
    push(normalizeSurfaceEvent(DomainEventTypes.ExecutionRunCreated, { executionRunId: 'run-1' }, 1000));
    expect(useSurfaceFeedStore.getState().items).toHaveLength(1);
  });
});

describe('消费选择器引用稳定性（zustand v5 Object.is 回归守卫）', () => {
  beforeEach(() => {
    const push = (e: string, p: unknown, at: number) => {
      const item = normalizeSurfaceEvent(e, p, at);
      if (item) useSurfaceFeedStore.getState().push(item);
    };
    push(DomainEventTypes.ExecutionRunCreated, { executionRunId: 'run-1', projectId: 'p-1' }, 1000);
    push(DomainEventTypes.ExecutionRunCreated, { executionRunId: 'run-2', projectId: 'p-2' }, 1001);
  });

  it('useSurfaceFeedItems：过滤结果按项目收敛，无关状态变更不换引用', () => {
    const { result, rerender } = renderHook(({ projectId }) => useSurfaceFeedItems(projectId), {
      initialProps: { projectId: 'p-1' as string | undefined },
    });
    expect(result.current.map((i) => i.subjectId)).toEqual(['run-1']);

    // 只改连接态（items 未变）→ 必须返回同一引用，否则即无限重渲染
    const before = result.current;
    act(() => useSurfaceFeedStore.getState().setConnected(true));
    rerender({ projectId: 'p-1' });
    expect(result.current).toBe(before);

    // 切到全域 = 直接给 items 本身（稳定引用）
    rerender({ projectId: undefined });
    expect(result.current).toBe(useSurfaceFeedStore.getState().items);
  });

  it('useSurfaceFreshness：无关状态变更不换引用', () => {
    const { result, rerender } = renderHook(() => useSurfaceFreshness());
    const before = result.current;

    // 心跳只动 runtimeHeartbeat，三字段未变 → useShallow 必须保留旧对象
    act(() => useSurfaceFeedStore.getState().markHeartbeat('rt-1', 1234));
    rerender();
    expect(result.current).toBe(before);

    // 真正变化时才换
    act(() => useSurfaceFeedStore.getState().setConnected(true));
    rerender();
    expect(result.current).not.toBe(before);
    expect(result.current.connected).toBe(true);
  });
});
