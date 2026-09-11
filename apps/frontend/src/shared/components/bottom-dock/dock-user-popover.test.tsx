import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DockUserPopover } from './dock-user-popover';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));

vi.mock('@/modules/workspace/api/workspace-api', () => ({
  getCurrentWorkspaceId: () => 'w1',
  switchWorkspace: vi.fn(),
  workspaceApi: { list: vi.fn().mockResolvedValue({ workspaces: [] }) },
}));

const { authState } = vi.hoisted(() => ({
  authState: { currentUser: null as Record<string, unknown> | null },
}));

vi.mock('@/modules/auth/hooks/use-auth', () => ({
  useAuth: () => ({ currentUser: authState.currentUser, logout: vi.fn(), roles: [] }),
}));

function renderPopover() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <DockUserPopover />
    </QueryClientProvider>,
  );
}

/** Dock 用户头像区（trigger 按钮） */
function avatarChip(): HTMLElement {
  return screen.getByLabelText('账号与工作区菜单');
}

beforeEach(() => {
  authState.currentUser = {
    id: 'u1',
    username: 'zhou',
    displayName: '小周',
    avatarUrl: null,
  };
});

/**
 * 回归（2026-09-11）：Dock 用户头像此前把 `currentUser.avatarUrl` 直接塞给 `<img src>`。
 * 头像选择器的内置项存的是**哨兵串**（`nice-avatar:alex` / `avvvatars:claude-code`）而非 URL，
 * 于是选了内置头像的用户在 Dock 上看到的是坏图。现统一交给 `MemberAvatar` 归一处理。
 */
describe('DockUserPopover 用户头像', () => {
  it('成员信息里有真实 URL → 渲染真实图片', () => {
    authState.currentUser = {
      id: 'u1',
      username: 'zhou',
      displayName: '小周',
      avatarUrl: 'https://cdn.example.com/me.png',
    };
    renderPopover();

    expect(
      document.querySelector('img[src="https://cdn.example.com/me.png"]'),
    ).not.toBeNull();
  });

  it('内置「人类插画」哨兵值不渲染 <img>（此前会坏图），改用生成式头像', () => {
    authState.currentUser = {
      id: 'u1',
      username: 'zhou',
      displayName: '小周',
      avatarUrl: 'nice-avatar:alex',
    };
    renderPopover();

    expect(avatarChip().querySelector('img')).toBeNull();
    expect(avatarChip().querySelector('svg')).not.toBeNull();
  });

  it('内置「AI 几何」哨兵值同样不渲染 <img>', () => {
    authState.currentUser = {
      id: 'u1',
      username: 'zhou',
      displayName: '小周',
      avatarUrl: 'avvvatars:claude-code',
    };
    renderPopover();

    expect(avatarChip().querySelector('img')).toBeNull();
    expect(avatarChip().querySelector('svg')).not.toBeNull();
  });

  it('没有头像时不渲染 <img>，回落双表面生成式头像', () => {
    renderPopover();

    expect(avatarChip().querySelector('img')).toBeNull();
    expect(avatarChip().querySelector('svg')).not.toBeNull();
  });
});

/**
 * 回归（2026-09-11）：触发元素原用 Radix 的 `asChild`，而 base-ui 只认 `render`——
 * 于是渲染出「base-ui 的 <button> 套作者的 <button>」的非法结构（React 有明确告警），
 * 同时 TS 一直报 asChild 不存在。改用 `render` 后此用例守住「点击仍能开合」的行为。
 */
describe('DockUserPopover 触发元素', () => {
  it('触发元素是单个按钮，且点击可开合浮层', () => {
    renderPopover();

    const chip = avatarChip();
    expect(chip.tagName).toBe('BUTTON');

    fireEvent.click(chip);
    // 浮层内容出现（身份条里的角色文案）
    expect(screen.getByText(/全局管理员|协作者/)).toBeTruthy();
  });

  it('结构里不存在嵌套按钮', () => {
    renderPopover();

    expect(avatarChip().querySelector('button')).toBeNull();
  });
});
