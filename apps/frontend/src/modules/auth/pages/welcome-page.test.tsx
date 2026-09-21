import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WelcomePage } from './welcome-page';

/**
 * 欢迎页（CAP-A-22）：身份工牌数据来源——注册流 state 优先，
 * /auth/me 兜底；成员编号由 user id 尾 8 位大写派生。
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const useAuthMock = vi.hoisted(() => vi.fn());
vi.mock('../hooks/use-auth', () => ({
  useAuth: useAuthMock,
}));

vi.mock('@/components/brand/logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));

const renderPage = (state?: { registeredAt?: string }) =>
  render(
    <MemoryRouter
      initialEntries={[{ pathname: '/welcome', state }]}
    >
      <WelcomePage />
    </MemoryRouter>,
  );

describe('WelcomePage 身份工牌', () => {
  it('展示 /auth/me 的显示名与 id 尾 8 位大写编号', () => {
    useAuthMock.mockReturnValue({
      currentUser: { id: 'cmcx12345678abcd', displayName: '张三' },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('auth.journeyTitle')).toBeInTheDocument();
    // 显示名同时出现在工牌姓名位与签名位
    expect(screen.getAllByText('张三').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/5678ABCD/)).toBeInTheDocument();
    // 直访无注册时间：Time 行隐藏
    expect(screen.queryByText(/auth.badgeTimeLabel/)).not.toBeInTheDocument();
  });

  it('注册流 state 携带注册时间时展示 Time 行（YYYY/MM/DD）', () => {
    useAuthMock.mockReturnValue({
      currentUser: { id: 'u1', displayName: '李四' },
      isLoading: false,
    });

    renderPage({ registeredAt: '2026-09-20T00:00:00.000Z' });

    expect(screen.getByText(/2026\/09\/20/)).toBeInTheDocument();
  });

  it('me 未返回时以占位名渲染不崩溃', () => {
    useAuthMock.mockReturnValue({ currentUser: null, isLoading: true });

    renderPage();

    // 占位名同样出现在姓名位与签名位
    expect(screen.getAllByText('auth.badgePlaceholderName').length).toBeGreaterThanOrEqual(1);
  });
});
