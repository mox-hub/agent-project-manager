/**
 * tabs-registry 覆盖率守卫测试。
 *
 * 契约：ShellLayout 内承载的每个页面路由（router.tsx /app children，剔除重定向）
 * 都必须能被 matchTabRoute 解析出配置——新增页面若漏注册，本测试红。
 * 独立全屏路由（/app/settings、/app/workspaces/new）不经 TabBar，不在覆盖范围。
 */
import { describe, expect, it } from 'vitest';
import { matchTabRoute } from './tabs-registry';

/** router.tsx /app 下所有实际渲染页面的路由（重定向路由不进列表） */
const SHELL_PAGE_ROUTES: Array<{
  path: string;
  /** 已知豁免：路由存在但不注册标签页（一次性页/退役中页面），须附原因 */
  skip?: string;
}> = [
  { path: '/app' },
  { path: '/app/projects' },
  { path: '/app/projects/dashboard' },
  { path: '/app/projects/proj-1' },
  { path: '/app/projects/proj-1/issues' },
  { path: '/app/projects/proj-1/milestones' },
  { path: '/app/projects/proj-1/profile' },
  { path: '/app/projects/proj-1/playbook' },
  { path: '/app/projects/proj-1/team' },
  { path: '/app/projects/proj-1/settings' },
  { path: '/app/projects/proj-1/init', skip: '一次性引导页，注册表 hidden 不建标签页' },
  { path: '/app/executions' },
  { path: '/app/workflows' },
  { path: '/app/workflows/wf-1' },
  { path: '/app/releases' },
  { path: '/app/releases/rel-1' },
  { path: '/app/issues' },
  { path: '/app/issues/issue-1' },
  { path: '/app/bugs' },
  { path: '/app/bugs/bug-1' },
  { path: '/app/office' },
  { path: '/app/ai-surface' },
  { path: '/app/ai-surface/replay' },
  { path: '/app/intake' },
  { path: '/app/members' },
  { path: '/app/members/member-1' },
  { path: '/app/teams' },
  { path: '/app/teams/team-1' },
  { path: '/app/acceptance' },
  { path: '/app/acceptance/acc-1' },
  { path: '/app/delivery' },
  { path: '/app/help' },
  { path: '/app/decisions', skip: 'v0.7.4 合流：决策收件箱并入通知中心，页面退役不注册' },
  { path: '/app/notifications' },
  { path: '/app/search', skip: 'v0.7.4：全局搜索退役改悬浮面板，路由重定向不注册' },
  { path: '/app/repositories' },
  { path: '/app/repositories/repo-1' },
  { path: '/app/repositories/repo-1/settings' },
  { path: '/app/analytics' },
  { path: '/app/admin' },
  { path: '/app/documents' },
  { path: '/app/documents/new' },
  { path: '/app/documents/doc-1' },
  { path: '/app/documents/doc-1/edit' },
  { path: '/app/design-system' },
];

describe('matchTabRoute 标签页注册覆盖率', () => {
  it('ShellLayout 下每个页面路由都可解析出标签页配置（豁免项除外）', () => {
    const unresolved = SHELL_PAGE_ROUTES.filter(
      (r) => !r.skip && matchTabRoute(r.path) === null,
    );
    expect(unresolved.map((r) => r.path)).toEqual([]);
  });

  it('豁免清单不允许无理由：skip 必须带原因且路由确实无配置或有 hidden', () => {
    for (const { path, skip } of SHELL_PAGE_ROUTES) {
      if (!skip) continue;
      const config = matchTabRoute(path);
      const ok = config === null || config.hidden === true;
      expect(ok, `${path}: 豁免原因「${skip}」与注册表现状不符`).toBe(true);
    }
  });

  it('每个已注册配置都带标题或 i18n key 与图标', () => {
    for (const { path } of SHELL_PAGE_ROUTES) {
      const config = matchTabRoute(path);
      if (!config || config.hidden) continue;
      expect(config.title ?? config.titleKey, `${path}: title`).toBeTruthy();
      expect(config.icon, `${path}: icon`).toBeTruthy();
    }
  });

  it('项目初始化页 hidden：不建标签页', () => {
    expect(matchTabRoute('/app/projects/proj-1/init')?.hidden).toBe(true);
  });

  it('项目子页签获得独立默认标题（不再与详情页共用）', () => {
    expect(matchTabRoute('/app/projects/proj-1/milestones')?.titleKey).toBe(
      'project.detail.milestones',
    );
    expect(matchTabRoute('/app/projects/proj-1/issues')?.titleKey).toBe('project.detail.tasks');
    expect(matchTabRoute('/app/projects/proj-1/team')?.titleKey).toBe('project.team.title');
  });

  it('文档新建/编辑态有独立标题', () => {
    expect(matchTabRoute('/app/documents/new')?.titleKey).toBe('document.tab.new');
    expect(matchTabRoute('/app/documents/doc-1/edit')?.titleKey).toBe('document.tab.edit');
  });

  it('回放演示页与盯盘面标题可区分', () => {
    expect(matchTabRoute('/app/ai-surface/replay')?.titleKey).toBe('nav.aiSurfaceReplay');
    expect(matchTabRoute('/app/ai-surface')?.titleKey).toBe('nav.aiSurface');
  });

  it('工作流/发版详情路由命中前缀规则', () => {
    expect(matchTabRoute('/app/workflows/wf-1')?.titleKey).toBe('nav.workflow');
    expect(matchTabRoute('/app/releases/rel-1')?.titleKey).toBe('nav.releases');
  });
});
