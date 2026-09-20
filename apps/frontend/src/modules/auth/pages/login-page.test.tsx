import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LoginPage } from './login-page';

/**
 * 登录页错误文案定向映射（P1-4）：
 * api-client 拦截器把后端错误信封转成顶层 code 的 ApiClientError，
 * 页面必须据此映射 auth.errors.invalidCredentials，而非笼统的 loginFailed。
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const loginMock = vi.hoisted(() => vi.fn());
vi.mock('../hooks/use-auth', () => ({
  useAuth: () => ({ login: loginMock, isLoading: false }),
}));

// Logo 依赖 window.matchMedia（jsdom 未实现），本测试不关注品牌展示
vi.mock('@/components/brand/logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <LoginPage />
    </MemoryRouter>,
  );

/** 填写合法表单并提交，返回捕获的 mutation onError 回调 */
const submitAndGetOnError = () => {
  renderPage();
  fireEvent.change(screen.getByLabelText('auth.username'), {
    target: { value: 'admin' },
  });
  fireEvent.change(screen.getByLabelText('auth.password'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button'));

  expect(loginMock).toHaveBeenCalledTimes(1);
  const options = loginMock.mock.calls[0][1] as { onError: (e: unknown) => void };
  expect(typeof options.onError).toBe('function');
  return options.onError;
};

describe('LoginPage 错误文案映射', () => {
  beforeEach(() => {
    loginMock.mockClear();
  });

  it('凭证错误（INVALID_CREDENTIALS）应映射到 auth.errors.invalidCredentials', async () => {
    const onError = submitAndGetOnError();

    await act(async () => {
      onError({ code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' });
    });

    expect(
      screen.getByText('auth.errors.invalidCredentials'),
    ).toBeInTheDocument();
  });

  it('账号停用（USER_INACTIVE）应映射到 auth.errors.userInactive', async () => {
    const onError = submitAndGetOnError();

    await act(async () => {
      onError({ code: 'USER_INACTIVE', message: 'User is inactive' });
    });

    expect(screen.getByText('auth.errors.userInactive')).toBeInTheDocument();
  });

  it('未识别错误码应优先展示后端 message 而非误报凭证错误', async () => {
    const onError = submitAndGetOnError();

    await act(async () => {
      onError({ code: 'INTERNAL_ERROR', message: 'boom' });
    });

    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(
      screen.queryByText('auth.errors.invalidCredentials'),
    ).not.toBeInTheDocument();
  });
});
