import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { aiOptionProbability } from './decision-card-shell';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe('aiOptionProbability（CAP-A-27 扩展批：决策卡选项概率映射）', () => {
  it('判定键 approve 映射到卡动作键 accept', () => {
    expect(
      aiOptionProbability(
        { approve: 0.7, reject: 0.2, needs_more_info: 0.1 },
        'accept',
      ),
    ).toBe(0.7);
    expect(
      aiOptionProbability(
        { approve: 0.7, reject: 0.2, needs_more_info: 0.1 },
        'reject',
      ),
    ).toBe(0.2);
  });

  it('同键名场景（accept/reject 直判）直接命中', () => {
    expect(aiOptionProbability({ accept: 0.9, reject: 0.1 }, 'accept')).toBe(0.9);
  });

  it('无判定 / 无对应键 / 非数值 → null（调用方不渲染零噪音）', () => {
    expect(aiOptionProbability(null, 'accept')).toBeNull();
    expect(aiOptionProbability(undefined, 'accept')).toBeNull();
    expect(aiOptionProbability({ approve: 0.7 }, 'waive')).toBeNull();
    expect(
      aiOptionProbability({ approve: 'high' } as unknown as Record<string, number>, 'accept'),
    ).toBeNull();
  });

  it('概率截断到 [0,1]', () => {
    expect(aiOptionProbability({ approve: 1.5 }, 'accept')).toBe(1);
    expect(aiOptionProbability({ approve: -0.2 }, 'accept')).toBe(0);
  });
});
