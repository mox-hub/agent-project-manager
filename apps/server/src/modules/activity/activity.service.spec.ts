import { normalizeActivityChanges } from './activity.service';

/**
 * 回归（2026-09-11）：工单详情页报 `activity.changes?.find is not a function`。
 * 迁移脚本把旧 `TaskActivity.detail`（对象形状）整段灌进了 `changes` 列，
 * 未归一化直接透出会让前端数组方法抛错并把整页打白。
 */
describe('normalizeActivityChanges', () => {
  it('新数据：已是数组则原样返回（含空数组）', () => {
    const changes = [
      { field: 'status', oldValue: 'todo', newValue: 'doing' },
      { field: 'priority', oldValue: 'low', newValue: 'high' },
    ];
    expect(normalizeActivityChanges(changes)).toBe(changes);
    expect(normalizeActivityChanges([])).toEqual([]);
  });

  it('存量迁移数据：旧包装对象 { changes: [...] } 取出内层数组（救回历史信息）', () => {
    const nested = [{ field: 'status', newValue: 'done' }];
    expect(normalizeActivityChanges({ changes: nested })).toEqual(nested);
  });

  it('更早的对象形状 { from, to } 无法解释，归为 null', () => {
    expect(normalizeActivityChanges({ from: null, to: 'New Task' })).toBeNull();
  });

  it('内层 changes 不是数组时同样归为 null', () => {
    expect(
      normalizeActivityChanges({ changes: { field: 'status' } }),
    ).toBeNull();
    expect(normalizeActivityChanges({ changes: null })).toBeNull();
  });

  it('null / undefined 保持 null（与 nullable 契约一致）', () => {
    expect(normalizeActivityChanges(null)).toBeNull();
    expect(normalizeActivityChanges(undefined)).toBeNull();
  });

  it('标量等不可解释的形状归为 null', () => {
    expect(normalizeActivityChanges('status')).toBeNull();
    expect(normalizeActivityChanges(42)).toBeNull();
    expect(normalizeActivityChanges(true)).toBeNull();
    // 数组也是对象，但已被前分支接住，不应误判
    expect(normalizeActivityChanges(['status'])).toEqual(['status']);
  });
});
