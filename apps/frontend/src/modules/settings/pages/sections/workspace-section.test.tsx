import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceSection } from './workspace-section';

// i18n mock 仅透传键名，断言直接对着键写
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

// PageShell 内嵌 PageHeader（依赖收藏/标签页上下文），本测试只关注区块内容
vi.mock('@/components/semantic/page-shell', () => ({
  PageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock('@/shared/components/favorite-toggle', () => ({
  FavoriteToggle: () => <span data-testid="favorite-toggle" />,
}));

// Switch 底为 base-ui，jsdom 交互不便；替成语义等价的受控 checkbox
vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    disabled,
    onChange,
    ...rest
  }: {
    checked?: boolean;
    disabled?: boolean;
    onChange?: (e: { target: { checked: boolean } }) => void;
  }) => (
    <input
      type="checkbox"
      role="switch"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onChange?.({ target: { checked: e.target.checked } })}
      {...rest}
    />
  ),
}));

const authState = { isAdmin: true };
vi.mock('@/modules/auth/hooks/use-auth', () => ({
  useAuth: () => ({ isAdmin: authState.isAdmin }),
}));

const listState: { data?: { enabled: boolean; workspaces: unknown[] }; isLoading?: boolean } = {};
vi.mock('@/modules/workspace/hooks/use-public-workspace-list', () => ({
  usePublicWorkspaceList: () => ({
    data: listState.data,
    isLoading: listState.isLoading ?? false,
  }),
}));

const mutateSpy = vi.fn();
vi.mock('@/modules/workspace/hooks/use-public-workspace-setting', () => ({
  useSetPublicWorkspaceList: () => ({ mutate: mutateSpy, isPending: false }),
}));

beforeEach(() => {
  authState.isAdmin = true;
  listState.data = { enabled: false, workspaces: [] };
  listState.isLoading = false;
  mutateSpy.mockClear();
});

describe('WorkspaceSection（设置·工作区可见性）', () => {
  it('关闭态（默认）：开关未勾选，显示关闭提示', () => {
    render(<WorkspaceSection />);
    expect(screen.getByRole('switch')).toHaveProperty('checked', false);
    expect(
      screen.getByText('settings.workspaceVisibilityOffHint'),
    ).toBeTruthy();
  });

  it('开启态：开关勾选，提示带上可见工作区数量', () => {
    listState.data = {
      enabled: true,
      workspaces: [
        { id: 'default', name: '默认工作区', isDefault: true },
        { id: 'ws-a', name: 'A 空间' },
      ],
    };
    render(<WorkspaceSection />);
    expect(screen.getByRole('switch')).toHaveProperty('checked', true);
    expect(
      screen.getByText('settings.workspaceVisibilityOnHint'),
    ).toBeTruthy();
  });

  it('管理员拨动开关：调用 setPublicList 并带上目标值', () => {
    render(<WorkspaceSection />);
    fireEvent.click(screen.getByRole('switch'));
    expect(mutateSpy).toHaveBeenCalledWith({ enabled: true });
  });

  it('非管理员：开关禁用并提示仅管理员可改', () => {
    authState.isAdmin = false;
    render(<WorkspaceSection />);
    expect(screen.getByRole('switch')).toHaveProperty('disabled', true);
    expect(
      screen.getByText('settings.workspaceVisibilityAdminOnly'),
    ).toBeTruthy();
  });

  it('加载态：不渲染开关，渲染读取中提示', () => {
    listState.isLoading = true;
    render(<WorkspaceSection />);
    expect(screen.queryByRole('switch')).toBeNull();
    expect(
      screen.getByText('settings.workspaceVisibilityLoading'),
    ).toBeTruthy();
  });

  it('安全边界提示恒在（只公开名称、不暴露库路径）', () => {
    render(<WorkspaceSection />);
    expect(
      screen.getByText('settings.workspaceVisibilitySecurityNote'),
    ).toBeTruthy();
  });
});
