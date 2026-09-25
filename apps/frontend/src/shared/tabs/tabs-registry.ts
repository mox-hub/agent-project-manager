/**
 * tabs-registry.ts - 标签页注册表（集中管理）
 *
 * 所有路由的标签页显示规则统一在此注册：
 * - EXACT：静态路由的精确匹配（title + 图标 + 是否固定）
 * - SUFFIX_RULES：动态详情路由的结尾段匹配（比前缀更具体，如项目子页 /milestones、文档 /edit）
 * - PREFIX_RULES：动态/子页面路由的前缀匹配（如 /app/projects/:id、/app/issues/:issueId）
 *
 * 由 TabsProvider 在路由变化时调用 matchTabRoute(path) 生成标签页，避免各页面散落注册。
 * ShellLayout 内承载的每个页面路由都必须在此可解析（100% 覆盖），独立全屏路由
 * （/app/settings、/app/workspaces/new）不经 TabBar，无需注册。
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  BarChart3,
  Bell,
  Building2,
  ClipboardList,
  HelpCircle,
  ListTree,
  Palette,
  Settings,
  Sparkles,
  UserCog,
} from 'lucide-react';
import { getEntityIcon } from '@/shared/entity-icons/entity-icons';

/** 单个标签页路由的显示配置 */
export interface TabRouteConfig {
  /** i18n key（渲染时实时解析） */
  titleKey?: string;
  /** 无 i18n key 的静态标题 */
  title?: string;
  icon?: LucideIcon;
  /** 默认固定（可选） */
  pinnedByDefault?: boolean;
  /** 是否可关闭（默认 true） */
  closable?: boolean;
  /** 命中也不建标签页（一次性引导页等，路由注释承诺不进 tabbar 的页面在此声明） */
  hidden?: boolean;
}

/** 实体标签页图标统一从 entity-icons 注册表取（规范 v0 第二批铺开） */
const entityIcon = (kind: Parameters<typeof getEntityIcon>[0]) => getEntityIcon(kind).icon;

/** 精确匹配的静态路由 */
const EXACT_ROUTES: Record<string, TabRouteConfig> = {
  '/app/ai-surface': { titleKey: 'nav.aiSurface', icon: Sparkles },
  // 回放演示与盯盘面同模块不同页：必须有独立标题，否则与盯盘面标签难以区分
  '/app/ai-surface/replay': { titleKey: 'nav.aiSurfaceReplay', icon: Sparkles },
  '/app': { titleKey: 'nav.projects', icon: entityIcon('project') },
  '/app/projects': { titleKey: 'nav.projects', icon: entityIcon('project') },
  '/app/projects/dashboard': { titleKey: 'nav.dashboard', icon: LayoutDashboard, pinnedByDefault: true },
  '/app/issues': { titleKey: 'nav.tasks', icon: entityIcon('issue') },
  '/app/bugs': { titleKey: 'task.bug.title', icon: entityIcon('bug') },
  '/app/documents': { titleKey: 'document.title', icon: entityIcon('document') },
  '/app/documents/new': { titleKey: 'document.tab.new', icon: entityIcon('document') },
  '/app/analytics': { titleKey: 'nav.analytics', icon: BarChart3 },
  '/app/notifications': { titleKey: 'nav.notifications', icon: Bell },
  '/app/acceptance': { titleKey: 'nav.acceptance', icon: entityIcon('acceptance') },
  '/app/repositories': { titleKey: 'nav.repositories', icon: entityIcon('repository') },
  '/app/executions': { titleKey: 'nav.executions', icon: entityIcon('execution') },
  '/app/workflows': { titleKey: 'nav.workflow', icon: entityIcon('workflow') },
  '/app/releases': { titleKey: 'nav.releases', icon: entityIcon('release') },
  '/app/office': { titleKey: 'nav.office', icon: Building2 },
  '/app/intake': { titleKey: 'nav.intake', icon: entityIcon('document') },
  '/app/members': { titleKey: 'nav.members', icon: entityIcon('member') },
  '/app/teams': { titleKey: 'nav.teams', icon: entityIcon('team') },
  '/app/delivery': { titleKey: 'nav.delivery', icon: ListTree },
  '/app/help': { titleKey: 'nav.help', icon: HelpCircle },
  // admin 域非验收实体：ShieldCheck 三方重叠裁决改用 UserCog（规范 v0）
  '/app/admin': { titleKey: 'nav.admin', icon: UserCog },
  // DEV-only 页面（design-system/delivery）无 nav 语义键的用静态标题
  '/app/design-system': { title: 'Design System', icon: Palette },
};

/**
 * 动态路由的结尾段规则：比 PREFIX_RULES 更具体，先于前缀匹配。
 * 用于区分同一动态前缀下的不同子页（项目子页签、文档编辑态）与隐藏一次性页面。
 */
const SUFFIX_RULES: Array<{ suffix: string; config: TabRouteConfig }> = [
  // 项目初始化引导页：一次性页面，路由表注释即承诺「不进 tabbar」
  { suffix: '/init', config: { hidden: true } },
  // 文档编辑态与新建态：不再与文档列表共用标题
  { suffix: '/edit', config: { titleKey: 'document.tab.edit', icon: entityIcon('document') } },
  // 项目子页签：独立默认标题（图标对齐 project-detail-tabs 分段控件口径）
  { suffix: '/milestones', config: { titleKey: 'project.detail.milestones', icon: entityIcon('milestone') } },
  { suffix: '/issues', config: { titleKey: 'project.detail.tasks', icon: entityIcon('issue') } },
  { suffix: '/profile', config: { titleKey: 'project.detail.profile', icon: entityIcon('project') } },
  { suffix: '/playbook', config: { titleKey: 'project.playbookPage.title', icon: ClipboardList } },
  { suffix: '/team', config: { titleKey: 'project.team.title', icon: entityIcon('team') } },
  { suffix: '/settings', config: { titleKey: 'nav.settings', icon: Settings } },
].sort((a, b) => b.suffix.length - a.suffix.length);

/**
 * 子页面 / 前缀规则。
 * 按「最长前缀优先」匹配；命中后子页面获得独立的默认标题（不再与主页面共用名称）。
 */
const PREFIX_RULES: Array<{ prefix: string; config: TabRouteConfig }> = [
  // 项目详情落地页（概览）：实体名由详情页 updateTabByPath 回写覆盖
  { prefix: '/app/projects/', config: { titleKey: 'project.detail.overview', icon: entityIcon('project') } },
  { prefix: '/app/issues/', config: { titleKey: 'task.detailDrawer.title', icon: entityIcon('issue') } },
  { prefix: '/app/bugs/', config: { titleKey: 'task.bug.title', icon: entityIcon('bug') } },
  { prefix: '/app/acceptance/', config: { titleKey: 'nav.acceptance', icon: entityIcon('acceptance') } },
  { prefix: '/app/documents/', config: { titleKey: 'document.title', icon: entityIcon('document') } },
  { prefix: '/app/repositories/', config: { titleKey: 'nav.repositories', icon: entityIcon('repository') } },
  { prefix: '/app/executions/', config: { titleKey: 'nav.executions', icon: entityIcon('execution') } },
  { prefix: '/app/workflows/', config: { titleKey: 'nav.workflow', icon: entityIcon('workflow') } },
  { prefix: '/app/releases/', config: { titleKey: 'nav.releases', icon: entityIcon('release') } },
  // team-member 模块暂无 i18n key，使用静态标题占位（tabs-context 支持 title 回退）；
  // member/team 图标按注册表口径（member=Users 复数、team=UsersRound）
  { prefix: '/app/members/', config: { title: '成员', icon: entityIcon('member') } },
  { prefix: '/app/teams/', config: { title: '团队', icon: entityIcon('team') } },
].sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * 根据路径查找标签页显示配置。
 * 先精确匹配静态路由，再按结尾段匹配子页路由，最后按最长前缀匹配。
 */
export function matchTabRoute(path: string): TabRouteConfig | null {
  if (EXACT_ROUTES[path]) {
    return EXACT_ROUTES[path];
  }

  for (const { suffix, config } of SUFFIX_RULES) {
    if (path.endsWith(suffix)) {
      return config;
    }
  }

  for (const { prefix, config } of PREFIX_RULES) {
    if (path.startsWith(prefix)) {
      return config;
    }
  }

  return null;
}
