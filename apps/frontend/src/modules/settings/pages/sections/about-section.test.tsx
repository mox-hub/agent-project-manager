import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AboutSection } from './about-section';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, opts?: Record<string, unknown>) =>
      opts ? `${key}:${JSON.stringify(opts)}` : key,
  }),
}));

const { invokeMock, shellAvailable, prefsStubCount } = vi.hoisted(() => ({
  invokeMock: vi.fn(),
  shellAvailable: { value: false },
  prefsStubCount: { value: 0 },
}));

vi.mock('@/shared/types/electron-api', () => ({
  isDesktopShellAvailable: () => shellAvailable.value,
  invoke: invokeMock,
}));

// 桌面偏好卡自身行为已由 desktop-preferences-card.test.tsx 覆盖；此处只断言挂载与模式可见性
vi.mock('@/modules/desktop', () => ({
  DesktopPreferencesCard: () => {
    prefsStubCount.value += 1;
    return <div data-testid="desktop-preferences-stub" />;
  },
}));

// FavoriteToggle 依赖 Router 上下文（页头直渲染既有坑），隔离
vi.mock('@/shared/components/favorite-toggle', () => ({
  FavoriteToggle: () => <div data-testid="favorite-toggle-stub" />,
}));

beforeEach(() => {
  invokeMock.mockReset();
  shellAvailable.value = false;
  prefsStubCount.value = 0;
});

describe('AboutSection', () => {
  it('web 模式：产品卡渲染网页版徽标与降级文案，不显示版本号', () => {
    render(<AboutSection />);
    expect(screen.getByText('settings.aboutModeWeb')).toBeInTheDocument();
    expect(screen.getByText('settings.aboutVersionFallback')).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  });

  it('桌面模式：读取壳版本展示版本行并渲染桌面偏好卡', async () => {
    shellAvailable.value = true;
    invokeMock.mockResolvedValue({ version: '0.7.13' });
    render(<AboutSection />);
    const line = await screen.findByText(/settings\.aboutVersionLine/);
    expect(line.textContent).toContain('0.7.13');
    expect(screen.getByText('settings.aboutModeDesktop')).toBeInTheDocument();
    expect(screen.getByTestId('desktop-preferences-stub')).toBeInTheDocument();
  });

  it('外链指向 GitHub Releases 与仓库', () => {
    const view = render(<AboutSection />);
    const hrefs = Array.from(view.container.querySelectorAll('a[href]')).map((a) =>
      a.getAttribute('href'),
    );
    expect(hrefs).toContain('https://github.com/mox-hub/agent-project-manager/releases');
    expect(hrefs).toContain('https://github.com/mox-hub/agent-project-manager');
  });
});
