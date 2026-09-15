import { describe, expect, it, beforeEach } from 'vitest';
import { act, render, screen } from '@testing-library/react';
import { DomainEventTypes } from '@apm/shared/events/domain-events';
import { SurfaceLiveness } from './surface-liveness';
import { normalizeSurfaceEvent, useSurfaceFeedStore } from '../hooks/use-surface-feed';

/**
 * 面级信号灯的诚实性守卫（ARCH-AISURFACE-001 §4.1 断连 / §3.1 诚实粒度）。
 *
 * 四条不变量：断线必须显式报、乱序丢弃必须可见、新鲜度只在连接时给、
 * 不出现任何推算出来的数字。
 */

beforeEach(() => {
  act(() => {
    useSurfaceFeedStore.getState().reset();
    useSurfaceFeedStore.getState().setConnected(false);
  });
});

const push = (eventName: string, payload: unknown, at: number) => {
  const item = normalizeSurfaceEvent(eventName, payload, at);
  if (item) act(() => useSurfaceFeedStore.getState().push(item));
};

describe('SurfaceLiveness', () => {
  it('未连接：显式报「实时已断开」，不假绿', () => {
    render(<SurfaceLiveness />);

    expect(screen.getByText('实时已断开')).toBeInTheDocument();
    // 「实时」是精确匹配：不含「实时已断开」——避免"断线也显示实时"
    expect(screen.queryByText('实时')).not.toBeInTheDocument();
  });

  it('已连接且有事件：报「实时」并给出最近事件时刻', () => {
    push(DomainEventTypes.ExecutionRunCreated, { executionRunId: 'run-1' }, Date.now());
    act(() => useSurfaceFeedStore.getState().setConnected(true));

    render(<SurfaceLiveness />);

    expect(screen.getByText('实时')).toBeInTheDocument();
    expect(screen.getByText(/最近事件/)).toBeInTheDocument();
    expect(screen.queryByText('实时已断开')).not.toBeInTheDocument();
  });

  it('乱序丢弃计数显式可见（不静默吞掉）', () => {
    push(
      DomainEventTypes.ExecutionRunUpdated,
      { executionRunId: 'run-1', newStatus: 'running' },
      2000,
    );
    // 迟到事件：同实体更旧的时刻 → 丢弃并计数
    push(
      DomainEventTypes.ExecutionRunUpdated,
      { executionRunId: 'run-1', newStatus: 'failed' },
      1000,
    );
    act(() => useSurfaceFeedStore.getState().setConnected(true));

    render(<SurfaceLiveness />);

    expect(screen.getByText('乱序丢弃 1')).toBeInTheDocument();
  });

  it('断开时不显示新鲜度——否则"最后事件很新"会被读成"现在是活的"', () => {
    push(DomainEventTypes.ExecutionRunCreated, { executionRunId: 'run-1' }, Date.now());
    act(() => useSurfaceFeedStore.getState().setConnected(false));

    render(<SurfaceLiveness />);

    expect(screen.getByText('实时已断开')).toBeInTheDocument();
    expect(screen.queryByText(/最近事件/)).not.toBeInTheDocument();
  });
});
