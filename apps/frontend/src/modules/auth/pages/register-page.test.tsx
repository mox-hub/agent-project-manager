import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './register-page';

/**
 * 注册页错误文案定向映射（P1-3）：
 * 邮箱已注册（409 / EMAIL_ALREADY_REGISTERED）必须显示
 * auth.errors.emailAlreadyRegistered，而非笼统的「注册失败，请稍后再试」。
 * 后端契约：register 冲突抛 BusinessException(EMAIL_ALREADY_REGISTERED, 409)，
 * api-client 拦截器把它转成顶层 code/status 的 ApiClientError。
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const registerMock = vi.hoisted(() => vi.fn());
const previewRegisterInviteMock = vi.hoisted(() => vi.fn());
vi.mock('../api/auth-api', () => ({
  authApi: {
    register: registerMock,
    previewRegisterInvite: previewRegisterInviteMock,
  },
}));

// Logo 依赖 window.matchMedia（jsdom 未实现），本测试不关注品牌展示
vi.mock('@/components/brand/logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));

const renderPage = () =>
  render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );

const fillAndSubmit = () => {
  renderPage();
  fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
    target: { value: 'taken@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('密码（至少 8 位）'), {
    target: { value: 'password123' },
  });
  fireEvent.change(screen.getByPlaceholderText('确认密码'), {
    target: { value: 'password123' },
  });
  fireEvent.click(screen.getByRole('button'));

  expect(registerMock).toHaveBeenCalledTimes(1);
};

describe('RegisterPage 错误文案映射', () => {
  beforeEach(() => {
    registerMock.mockReset();
    previewRegisterInviteMock.mockResolvedValue({
      inviterName: '',
      email: null,
      status: 'pending',
      expiresAt: '',
    });
  });

  it('409 + EMAIL_ALREADY_REGISTERED 应映射到 auth.errors.emailAlreadyRegistered', async () => {
    registerMock.mockRejectedValueOnce({
      code: 'EMAIL_ALREADY_REGISTERED',
      status: 409,
      message: '该邮箱已注册',
    });
    fillAndSubmit();

    await screen.findByText('auth.errors.emailAlreadyRegistered');
  });

  it('仅 409（旧信封 CONFLICT）也应映射到定向文案', async () => {
    registerMock.mockRejectedValueOnce({
      code: 'CONFLICT',
      status: 409,
      message: '该邮箱已注册',
    });
    fillAndSubmit();

    await screen.findByText('auth.errors.emailAlreadyRegistered');
  });

  it('其他错误应回退展示后端 message，而非误报邮箱已注册', async () => {
    registerMock.mockRejectedValueOnce({
      code: 'FORBIDDEN',
      status: 403,
      message: '注册已关闭，请向管理员索取邀请',
    });
    fillAndSubmit();

    await screen.findByText('注册已关闭，请向管理员索取邀请');
    expect(
      screen.queryByText('auth.errors.emailAlreadyRegistered'),
    ).not.toBeInTheDocument();
  });
});
