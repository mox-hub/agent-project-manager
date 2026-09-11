import { describe, expect, it, afterEach } from 'vitest';
import { readHistoryIdx, resolveBackSteps } from './history-back';

describe('resolveBackSteps', () => {
  // 历史布局：[idx0 业务页] [idx1 设置页入口] [idx2.. 设置页内部子页]
  it('未在设置页内切换子页：回退 1 步（跨出设置页）', () => {
    expect(resolveBackSteps(1, 1)).toBe(1);
  });

  it('切换过 1 个设置分页：回退 2 步（跳过该设置分页，回到业务页）', () => {
    expect(resolveBackSteps(2, 1)).toBe(2);
  });

  it('切换过多个设置分页：步数随内部切换次数递增，始终落在业务页', () => {
    expect(resolveBackSteps(3, 1)).toBe(3);
    expect(resolveBackSteps(7, 1)).toBe(7);
  });

  it('回归：旧公式 currentIdx - entryIdx 会少退一步（曾致返回落到上一个设置分页）', () => {
    // 历史 2 步深时旧实现得 1，只能回到 idx1（上一个设置分页）而非 idx0（业务页）
    expect(2 - 1).toBe(1);
    expect(resolveBackSteps(2, 1)).toBe(2);
  });

  it('入口索引为 0（直接打开/刷新在设置页）返回 null，由调用方回落默认页面', () => {
    expect(resolveBackSteps(0, 0)).toBeNull();
    expect(resolveBackSteps(3, 0)).toBeNull();
  });

  it('索引异常（当前比入口还靠前）返回 null，不做不可信回退', () => {
    expect(resolveBackSteps(0, 2)).toBeNull();
  });
});

describe('readHistoryIdx', () => {
  const original = window.history.state;

  afterEach(() => {
    window.history.replaceState(original, '');
  });

  it('无 idx 字段时为 0', () => {
    window.history.replaceState({}, '');
    expect(readHistoryIdx()).toBe(0);
  });

  it('读取 React Router 写入的 idx', () => {
    window.history.replaceState({ idx: 4, key: 'k1' }, '');
    expect(readHistoryIdx()).toBe(4);
  });

  it('idx 非数字（脏数据）时回落 0', () => {
    window.history.replaceState({ idx: 'oops' }, '');
    expect(readHistoryIdx()).toBe(0);
  });
});
