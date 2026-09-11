import { describe, expect, it } from 'vitest';
import { getEventVisual, toActivityChanges } from './activity-display';
import type { ActivityItem } from './api/activity-api';

function buildActivity(overrides: Partial<ActivityItem>): ActivityItem {
  return {
    id: 'a1',
    entityType: 'task',
    entityId: 'i1',
    type: 'status_changed',
    createdAt: '2026-09-11T00:00:00.000Z',
    actor: null,
    reactions: [],
    ...overrides,
  };
}

describe('toActivityChanges', () => {
  it('数组原样返回（含空数组）', () => {
    const changes = [{ field: 'status', oldValue: 'todo', newValue: 'done' }];
    expect(toActivityChanges(changes)).toBe(changes);
    expect(toActivityChanges([])).toEqual([]);
  });

  it('对象/标量/空值一律回落空数组，保证展示层数组方法可用', () => {
    expect(toActivityChanges({ from: null, to: 'New Task' })).toEqual([]);
    expect(toActivityChanges({ changes: [{ field: 'status' }] })).toEqual([]);
    expect(toActivityChanges('status')).toEqual([]);
    expect(toActivityChanges(null)).toEqual([]);
    expect(toActivityChanges(undefined)).toEqual([]);
  });
});

/**
 * 回归（2026-09-11）：工单详情页 `activity.changes?.find is not a function`。
 * 存量迁移行的 changes 是对象形状，前端不能因此把整页打白。
 */
describe('getEventVisual —— 脏 changes 不得抛错', () => {
  it('changes 为对象（存量迁移形状）时安全回落兜底图标', () => {
    const activity = buildActivity({
      type: 'status_changed',
      changes: { from: null, to: 'New Task' } as unknown as ActivityItem['changes'],
    });

    expect(() => getEventVisual(activity)).not.toThrow();
    expect(getEventVisual(activity).icon).toBeTruthy();
  });

  it('changes 为数组且含 status 变更时仍取到语义图标（正常流不受影响）', () => {
    const activity = buildActivity({
      type: 'status_changed',
      changes: [{ field: 'status', oldValue: 'todo', newValue: 'done' }],
    });

    // done → 成功语义（tone: success），证明 value 仍被正确读取
    expect(getEventVisual(activity).tone).toBe('success');
  });

  it('changes 缺失时同样安全', () => {
    const activity = buildActivity({ type: 'status_changed', changes: null });
    expect(() => getEventVisual(activity)).not.toThrow();
  });
});
