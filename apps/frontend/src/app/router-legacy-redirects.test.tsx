import { describe, expect, it, vi } from 'vitest';
import { matchRoutes, Navigate } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
// 注意：真实导入路由表（本文件不 mock ./router，区别于 router.test.tsx），
// 仅做路由匹配的结构断言（matchRoutes 纯数据、不渲染组件树，绕开 AuthGuard/ShellLayout 依赖）。
import { router } from './router';

// @lobehub/icons 的 re-export 链经 peer 依赖 @lobehub/ui 牵出 emoji-mart 的 JSON
// 原生 ESM import（vitest 不做 tree-shake），与 ai-management-section.test.tsx 同款 stub 隔离
vi.mock('@lobehub/icons', () => {
  const make = () => {
    const Comp = () => <svg />;
    (Comp as unknown as { Color: typeof Comp }).Color = Comp;
    return Comp;
  };
  return {
    OpenAI: make(),
    Claude: make(),
    Gemini: make(),
    DeepSeek: make(),
    Zhipu: make(),
    ClaudeCode: make(),
    Codex: make(),
    Cursor: make(),
    OpenCode: make(),
  };
});

const routes = (router as unknown as { routes: RouteObject[] }).routes;

/** 匹配 pathname 并返回命中链的叶子 match（断言失败即抛出） */
function leafMatchOf(pathname: string) {
  const matches = matchRoutes(routes, pathname);
  expect(matches, `${pathname} 应能命中路由`).not.toBeNull();
  const leaf = matches?.[matches.length - 1];
  expect(leaf, `${pathname} 命中链不应为空`).toBeDefined();
  return { matches: matches!, leaf: leaf! };
}

describe('legacy /app/dashboard 路由兜底', () => {
  it('/app/dashboard 命中 /app 下的 dashboard 重定向路由，而非顶层 * 兜底', () => {
    const { matches, leaf } = leafMatchOf('/app/dashboard');
    expect(leaf.route.path).toBe('dashboard');
    // 父级应为 /app 分支（旧问题是整段无匹配、落到顶层 * 兜底错误页）
    const parent = matches[matches.length - 2];
    expect(parent?.route.path).toBe('/app');
  });

  it('/app/dashboard 的重定向目标为工作台 /app/projects/dashboard', () => {
    const { leaf } = leafMatchOf('/app/dashboard');
    expect(leaf.route.element).toEqual(
      <Navigate to="/app/projects/dashboard" replace />,
    );
  });

  it('重定向目标 /app/projects/dashboard 是注册过的合法路由（全局工作台）', () => {
    const { matches, leaf } = leafMatchOf('/app/projects/dashboard');
    expect(leaf.route.path).toBe('dashboard');
    const parent = matches[matches.length - 2];
    expect(parent?.route.path).toBe('projects');
  });
});
