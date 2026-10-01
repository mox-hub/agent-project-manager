import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RunIsolationBadge, RunIsolationBadgeFromMetadata } from './run-isolation-badge';

// i18n mock 仅透传键名，断言直接对着键写（backups-section.test.tsx 同款）
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const worktreeMeta = {
  mode: 'worktree' as const,
  worktreePath: 'E:\\repo\\.apm\\worktrees\\abcd1234',
  branch: 'apm/exec/abcd1234',
  baseRef: 'basesha123456',
  projectRoot: 'E:\\repo',
  preparedAt: '2026-10-01T00:00:00.000Z',
};

const sharedRootMeta = {
  mode: 'shared-root' as const,
  reason: 'not-git-repo',
};

describe('RunIsolationBadge（G5-b 执行隔离徽标两态）', () => {
  it('worktree 态：中性徽标「隔离执行·短分支」，tooltip 带全分支与路径', () => {
    render(<RunIsolationBadge isolation={worktreeMeta} />);

    const badge = screen.getByText('runDetails.isolation.worktreeBadge', {
      exact: false,
    });
    expect(badge).toBeTruthy();
    // 透传键名模式下插值仍生效（i18n mock 只透传 t，键名含插值结果？——
    // 本 mock 的 t 不做插值，直接断言键名与 title 的键名
    const host = badge.closest('span[title]');
    expect(host?.getAttribute('title')).toContain(
      'runDetails.isolation.worktreeTooltip',
    );
  });

  it('shared-root 态：琥珀徽标「未隔离·共享目录」+ reason tooltip', () => {
    const { container } = render(
      <RunIsolationBadge isolation={sharedRootMeta} />,
    );

    expect(
      screen.getByText('runDetails.isolation.sharedRootBadge'),
    ).toBeTruthy();
    const host = container.querySelector('span[title]');
    expect(host?.getAttribute('title')).toBe(
      'runDetails.isolation.reason.not-git-repo',
    );
    // 琥珀语义色（降级显眼原则）
    expect(host?.className).toContain('accent-yellow');
  });

  it('worktree 已清理（cleanedAt）徽标仍中性展示（信息行另行处理）', () => {
    render(
      <RunIsolationBadge
        isolation={{ ...worktreeMeta, cleanedAt: '2026-10-02T00:00:00.000Z' }}
      />,
    );
    expect(
      screen.getByText('runDetails.isolation.worktreeBadge', { exact: false }),
    ).toBeTruthy();
  });
});

describe('RunIsolationBadgeFromMetadata（metadata 解析容错）', () => {
  it('metadata 含合法 isolation 时渲染徽标', () => {
    render(<RunIsolationBadgeFromMetadata metadata={{ isolation: worktreeMeta }} />);
    expect(
      screen.getByText('runDetails.isolation.worktreeBadge', { exact: false }),
    ).toBeTruthy();
  });

  it('无 metadata / 形状不符 / mode 非法时不渲染（老执行零影响）', () => {
    const { container: c1 } = render(<RunIsolationBadgeFromMetadata metadata={null} />);
    expect(c1.querySelector('span')).toBeNull();

    const { container: c2 } = render(
      <RunIsolationBadgeFromMetadata metadata={{ isolation: { mode: 'bogus' } }} />,
    );
    expect(c2.querySelector('span')).toBeNull();

    const { container: c3 } = render(
      <RunIsolationBadgeFromMetadata metadata={{ other: 1 }} />,
    );
    expect(c3.querySelector('span')).toBeNull();
  });
});
