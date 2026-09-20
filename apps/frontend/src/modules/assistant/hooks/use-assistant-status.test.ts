import { describe, expect, it } from 'vitest';
import { deriveAssistantStatus } from './use-assistant-status';
import type { DecisionSummary } from '@/modules/decision/api/decision-api';

describe('deriveAssistantStatus', () => {
  it('有阻断待决时为 needYou（优先级最高）', () => {
    const summary = { pending: 5, blocking: 2, advisory: 3 } as DecisionSummary;
    expect(deriveAssistantStatus(summary)).toEqual({
      state: 'needYou',
      pending: 5,
      blocking: 2,
      advisory: 3,
    });
  });

  it('仅 advisory 时为 suggestions', () => {
    const summary = { pending: 3, blocking: 0, advisory: 3 } as DecisionSummary;
    expect(deriveAssistantStatus(summary).state).toBe('suggestions');
  });

  it('无待决时为 idle', () => {
    const summary = { pending: 0, blocking: 0, advisory: 0 } as DecisionSummary;
    expect(deriveAssistantStatus(summary)).toEqual({
      state: 'idle',
      pending: 0,
      blocking: 0,
      advisory: 0,
    });
  });

  it('数据未到（undefined）时兜底 idle', () => {
    expect(deriveAssistantStatus(undefined)).toEqual({
      state: 'idle',
      pending: 0,
      blocking: 0,
      advisory: 0,
    });
  });
});
