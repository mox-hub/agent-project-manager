import { describe, expect, it } from 'vitest';
import { normalizeActions } from './use-anchor-qa';

/** 动作白名单：只放行三种就地落库动作，形状收敛（label 兜底 / params 字符串化 / 最多 2 条） */

describe('normalizeActions', () => {
  it('过滤白名单外动作并收敛形状', () => {
    const result = normalizeActions([
      { label: '标记完成', action: 'task.update_status', params: { status: 'done' } },
      { label: '删除', action: 'task.delete', params: {} },
      '垃圾数据',
    ]);
    expect(result).toEqual([
      { label: '标记完成', action: 'task.update_status', params: { status: 'done' } },
    ]);
  });

  it('label 缺失回落 action 名，params 值字符串化，最多 2 条', () => {
    const result = normalizeActions([
      { action: 'task.update_priority', params: { priority: 3 } },
      { action: 'task.update_due_date', params: { dueDate: '2026-09-10' } },
      { label: '第三条', action: 'task.update_status', params: { status: 'todo' } },
    ]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      label: 'task.update_priority',
      action: 'task.update_priority',
      params: { priority: '3' },
    });
    expect(result[1].params.dueDate).toBe('2026-09-10');
  });

  it('非数组/空输入返回空数组', () => {
    expect(normalizeActions(undefined)).toEqual([]);
    expect(normalizeActions('nope')).toEqual([]);
  });
});
