import { describe, expect, it } from 'vitest';
import { parseDecompositionReview } from './use-decomposition-review';

describe('parseDecompositionReview（CAP-P-01 五期切片 3 防御性收敛）', () => {
  it('正常 payload 收敛：逐任务评估 + 覆盖度 + verdict', () => {
    const result = parseDecompositionReview({
      tasks: [
        { index: 0, granularity: 'ok', reason: '', suggestion: '', testability: 'ok' },
        { index: 1, granularity: 'too-big', reason: '40h 超三天', suggestion: '按交付物拆三份', testability: 'weak' },
      ],
      coverage: { uncovered: ['导入失败重试策略'], orphans: [2] },
      verdict: 'needs-review',
      summary: '第二个任务过大。',
    });
    expect(result).not.toBeNull();
    expect(result?.tasks).toHaveLength(2);
    expect(result?.tasks[1].granularity).toBe('too-big');
    expect(result?.tasks[1].testability).toBe('weak');
    expect(result?.coverage.uncovered).toEqual(['导入失败重试策略']);
    expect(result?.coverage.orphans).toEqual([2]);
    expect(result?.verdict).toBe('needs-review');
  });

  it('脏数据降级：非法 index 行丢弃、非法枚举回落、非法孤儿过滤', () => {
    const result = parseDecompositionReview({
      tasks: [
        { index: 'zero', granularity: 'ok' },
        { index: 1, granularity: 'huge', testability: 'maybe' },
        { index: 3, granularity: 'too-small', testability: 'weak' },
      ],
      coverage: { uncovered: ['', '有效需求点'], orphans: [0.5, 2] },
      verdict: 'perfect',
      summary: '',
    });
    expect(result).not.toBeNull();
    expect(result?.tasks.map((t) => t.index)).toEqual([1, 3]);
    expect(result?.tasks[0].granularity).toBe('ok');
    expect(result?.tasks[0].testability).toBe('ok');
    expect(result?.coverage.uncovered).toEqual(['有效需求点']);
    expect(result?.coverage.orphans).toEqual([2]);
    expect(result?.verdict).toBe('needs-review');
  });

  it('垃圾数据（无任何有效信号）返回 null', () => {
    expect(parseDecompositionReview({})).toBeNull();
    expect(parseDecompositionReview({ tasks: 'all' })).toBeNull();
  });
});
