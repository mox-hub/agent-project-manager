import { describe, expect, it, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useSetViewingContext, type ViewingContext } from './index';

describe('useSetViewingContext', () => {
  beforeEach(() => {
    useAppStore.setState({ viewing: null });
  });

  it('上报当前查看实体到 app-store', () => {
    const { rerender } = renderHook(
      (props: { viewing: ViewingContext | null }) =>
        useSetViewingContext(props.viewing),
      {
        initialProps: {
          viewing: { type: 'task', id: 't1', title: 'A' } as ViewingContext,
        },
      },
    );

    expect(useAppStore.getState().viewing).toEqual({
      type: 'task',
      id: 't1',
      title: 'A',
    });

    // 实体切换：旧上下文被替换
    rerender({ viewing: { type: 'bug', id: 'b1' } });
    expect(useAppStore.getState().viewing).toEqual({ type: 'bug', id: 'b1' });
  });

  it('传 null 或卸载时清除', () => {
    const { rerender, unmount } = renderHook(
      (props: { viewing: ViewingContext | null }) =>
        useSetViewingContext(props.viewing),
      {
        initialProps: {
          viewing: { type: 'task', id: 't1' } as ViewingContext,
        },
      },
    );

    rerender({ viewing: null });
    expect(useAppStore.getState().viewing).toBeNull();

    rerender({ viewing: { type: 'task', id: 't2' } });
    unmount();
    expect(useAppStore.getState().viewing).toBeNull();
  });
});
