import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TrustTiersPanel } from './trust-tiers-panel';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('TrustTiersPanel', () => {
  it('渲染三级等级定义卡与红线说明', () => {
    render(<TrustTiersPanel />);
    // 三级定义卡：等级名 + 定位 + 放权清单（键名经 t 直出）
    expect(screen.getByText('trust.tier1.name')).toBeTruthy();
    expect(screen.getByText('trust.tier2.name')).toBeTruthy();
    expect(screen.getByText('trust.tier3.name')).toBeTruthy();
    expect(screen.getAllByText('trust.delegationTitle')).toHaveLength(3);
    expect(screen.getAllByText('trust.tier1.allow1')).toHaveLength(1);
    // 红线说明条：标题 + 四条红线
    expect(screen.getByText('trust.redlineTitle')).toBeTruthy();
    expect(screen.getByText('· trust.redlinePublish')).toBeTruthy();
    expect(screen.getByText('· trust.redlineMembers')).toBeTruthy();
  });
});
