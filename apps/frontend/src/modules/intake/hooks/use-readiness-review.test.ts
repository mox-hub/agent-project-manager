import { describe, expect, it } from 'vitest';
import { parseReadinessReview } from './use-readiness-review';

describe('parseReadinessReview（CAP-P-01 五期切片 2 防御性收敛）', () => {
  it('正常 payload 收敛为六维度 + 缺口账 + verdict', () => {
    const result = parseReadinessReview({
      dimensions: [
        { key: 'goal', status: 'ready', evidence: '会前 3 分钟知道盯哪几件事', gap: '' },
        { key: 'dependency', status: 'unclear', evidence: '', gap: '排班接口未定' },
      ],
      missingInfo: [
        { item: '排班系统接口由谁提供', why: '决定是否含联调任务', howToFill: '访谈确认', blocking: true },
        { item: '', why: '空条目应被过滤' },
      ],
      verdict: 'blocked',
      summary: '目标清晰但接口未定。',
    });
    expect(result).not.toBeNull();
    expect(result?.dimensions).toHaveLength(6);
    expect(result?.dimensions.find((d) => d.key === 'goal')?.status).toBe('ready');
    expect(result?.missingInfo).toHaveLength(1);
    expect(result?.missingInfo[0].blocking).toBe(true);
    expect(result?.verdict).toBe('blocked');
  });

  it('全 ready 无缺口是合法结果（不被误判为空数据）', () => {
    const result = parseReadinessReview({
      dimensions: [
        { key: 'goal', status: 'ready', evidence: 'x', gap: '' },
        { key: 'scope', status: 'ready', evidence: 'x', gap: '' },
        { key: 'scenario', status: 'ready', evidence: 'x', gap: '' },
        { key: 'acceptance', status: 'ready', evidence: 'x', gap: '' },
        { key: 'dependency', status: 'ready', evidence: 'x', gap: '' },
        { key: 'fallback', status: 'ready', evidence: 'x', gap: '' },
      ],
      missingInfo: [],
      verdict: 'ready',
      summary: '可以开工。',
    });
    expect(result).not.toBeNull();
    expect(result?.verdict).toBe('ready');
  });

  it('AI 漏维度时按 missing 补齐六维；非法 key/status 被过滤降级', () => {
    const result = parseReadinessReview({
      dimensions: [
        { key: 'goal', status: 'ready', evidence: 'x', gap: '' },
        { key: 'bogus', status: 'ready', evidence: '', gap: '' },
        { key: 'scope', status: 'weird', evidence: '', gap: '' },
      ],
      verdict: 'excellent',
    });
    expect(result).not.toBeNull();
    expect(result?.dimensions).toHaveLength(6);
    expect(result?.dimensions.find((d) => d.key === 'scope')?.status).toBe('missing');
    expect(result?.dimensions.some((d) => d.key === 'bogus')).toBe(false);
    expect(result?.verdict).toBe('needs-clarification');
  });

  it('垃圾数据（无任何有效信号）返回 null', () => {
    expect(parseReadinessReview({})).toBeNull();
    expect(parseReadinessReview({ dimensions: 'x', missingInfo: 42 })).toBeNull();
  });
});
