import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RegisterPage } from './register-page';

/**
 * 注册页（CAP-A-22 换壳）：校验流、成功流（存 token → 桌面镜像 →
 * 进欢迎页 /welcome）与邮箱冲突流。
 */

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const navigateMock = vi.hoisted(() => vi.fn());
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}));

const authApiMock = vi.hoisted(() => ({
  previewRegisterInvite: vi.fn(),
  register: vi.fn(),
}));
vi.mock('../api/auth-api', () => ({
  authApi: authApiMock,
}));

const persistTokenToShellMock = vi.hoisted(() => vi.fn());
vi.mock('@/shared/lib/desktop-session', () => ({
  persistTokenToShell: persistTokenToShellMock,
}));

// 测试 setup 把 localStorage mock 成无实现 vi.fn()——断言持久化须自接内存实现
const tokenStore = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => tokenStore.get(k) ?? null,
  setItem: (k: string, v: string) => void tokenStore.set(k, v),
  removeItem: (k: string) => void tokenStore.delete(k),
  clear: () => void tokenStore.clear(),
});

vi.mock('@/components/brand/logo', () => ({
  Logo: () => <div data-testid="logo" />,
}));

vi.mock('@/shared/components/language-switcher', () => ({
  LanguageSwitcher: () => <div data-testid="language-switcher" />,
}));

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/register']}>
      <RegisterPage />
    </MemoryRouter>,
  );

const fillValidForm = () => {
  renderPage();
  fireEvent.change(screen.getByPlaceholderText('name@example.com'), {
    target: { value: 'new@example.com' },
  });
  fireEvent.change(screen.getByPlaceholderText('auth.displayNamePlaceholder'), {
    target: { value: '张三' },
  });
  fireEvent.change(screen.getByPlaceholderText('auth.passwordHint'), {
    target: { value: 'password123' },
  });
  fireEvent.change(screen.getByPlaceholderText('auth.confirmPasswordPlaceholder'), {
    target: { value: 'password123' },
  });
};

beforeEach(() => {
  tokenStore.clear();
  navigateMock.mockClear();
  authApiMock.register.mockReset();
  persistTokenToShellMock.mockClear();
});

describe('RegisterPage', () => {
  it('密码不足 8 位：本地拦截并提示，不调注册接口', async () => {
    fillValidForm();
    fireEvent.change(screen.getByPlaceholderText('auth.passwordHint'), {
      target: { value: 'short' },
    });
    fireEvent.change(screen.getByPlaceholderText('auth.confirmPasswordPlaceholder'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.registerSubmit' }));

    expect(await screen.findByText('auth.passwordTooShort')).toBeInTheDocument();
    expect(authApiMock.register).not.toHaveBeenCalled();
  });

  it('两次密码不一致：本地拦截并提示', async () => {
    fillValidForm();
    fireEvent.change(screen.getByPlaceholderText('auth.confirmPasswordPlaceholder'), {
      target: { value: 'different123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'auth.registerSubmit' }));

    expect(await screen.findByText('auth.passwordMismatch')).toBeInTheDocument();
    expect(authApiMock.register).not.toHaveBeenCalled();
  });

  it('注册成功：存 token + 桌面镜像 + 携注册时间跳 /welcome', async () => {
    authApiMock.register.mockResolvedValue({
      accessToken: 'token-abc',
      user: { id: 'u1', username: 'new', displayName: '张三' },
    });
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'auth.registerSubmit' }));

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledTimes(1);
    });
    expect(authApiMock.register).toHaveBeenCalledWith({
      email: 'new@example.com',
      password: 'password123',
      displayName: '张三',
      inviteToken: undefined,
    });
    expect(localStorage.getItem('access_token')).toBe('token-abc');
    expect(persistTokenToShellMock).toHaveBeenCalledWith('token-abc');
    const [to, options] = navigateMock.mock.calls[0];
    expect(to).toBe('/welcome');
    expect((options as { state: { registeredAt?: string } }).state.registeredAt).toBeTruthy();
  });

  it('邮箱已注册（409）：映射 auth.errors.emailAlreadyRegistered', async () => {
    authApiMock.register.mockRejectedValue({ code: 'EMAIL_ALREADY_REGISTERED' });
    fillValidForm();
    fireEvent.click(screen.getByRole('button', { name: 'auth.registerSubmit' }));

    expect(
      await screen.findByText('auth.errors.emailAlreadyRegistered'),
    ).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalled();
  });
});
