/**
 * tabs-registry.ts - 标签页注册表（集中管理）
 *
 * 所有路由的标签页显示规则统一在此注册：
 * - EXACT：静态路由的精确匹配（title + 图标 + 是否固定）
 * - PREFIX_RULES：动态/子页面路由的前缀匹配（如 /app/projects/:id、/app/tasks/:taskId）
 *
 * 由 TabsProvider 在路由变化时调用 matchTabRoute(path) 生成标签页，避免各页面散落注册。
 */

import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  AlertCircle,
  FileText,
  BarChart3,
  Bell,
  GitBranch,
  HelpCircle,
  CheckCircle,
  Search,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

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
}

/** 精确匹配的静态路由 */
const EXACT_ROUTES: Record<string, TabRouteConfig> = {
  '/app': { titleKey: 'nav.projects', icon: FolderKanban },
  '/app/projects': { titleKey: 'nav.projects', icon: FolderKanban },
  '/app/projects/dashboard': { titleKey: 'nav.dashboard', icon: LayoutDashboard, pinnedByDefault: true },
  '/app/tasks': { titleKey: 'nav.tasks', icon: CheckSquare },
  '/app/bugs': { titleKey: 'task.bug.title', icon: AlertCircle },
  '/app/documents': { titleKey: 'document.title', icon: FileText },
  '/app/analytics': { titleKey: 'nav.analytics', icon: BarChart3 },
  '/app/notifications': { titleKey: 'nav.notifications', icon: Bell },
  '/app/acceptance': { titleKey: 'nav.acceptance', icon: CheckCircle },
  '/app/repositories': { titleKey: 'nav.repositories', icon: GitBranch },
  '/app/search': { titleKey: 'nav.search', icon: Search },
  '/app/help': { titleKey: 'nav.help', icon: HelpCircle },
  '/app/admin': { titleKey: 'nav.admin', icon: ShieldCheck },
};

/**
 * 子页面 / 前缀规则。
 * 按「最长前缀优先」匹配；命中后子页面获得独立的默认标题（不再与主页面共用名称）。
 */
const PREFIX_RULES: Array<{ prefix: string; config: TabRouteConfig }> = [
  { prefix: '/app/projects/', config: { titleKey: 'project.title', icon: FolderKanban } },
  { prefix: '/app/tasks/', config: { titleKey: 'task.detailDrawer.title', icon: CheckSquare } },
  { prefix: '/app/bugs/', config: { titleKey: 'task.bug.title', icon: AlertCircle } },
  { prefix: '/app/acceptance/', config: { titleKey: 'nav.acceptance', icon: CheckCircle } },
  { prefix: '/app/documents/', config: { titleKey: 'document.title', icon: FileText } },
  { prefix: '/app/repositories/', config: { titleKey: 'nav.repositories', icon: GitBranch } },
  // team-member 模块暂无 i18n key，使用静态标题占位（tabs-context 支持 title 回退）
  { prefix: '/app/members/', config: { title: '成员', icon: User } },
  { prefix: '/app/teams/', config: { title: '团队', icon: Users } },
].sort((a, b) => b.prefix.length - a.prefix.length);

/**
 * 根据路径查找标签页显示配置。
 * 先精确匹配静态路由，再按最长前缀匹配子页面路由。
 */
export function matchTabRoute(path: string): TabRouteConfig | null {
  if (EXACT_ROUTES[path]) {
    return EXACT_ROUTES[path];
  }

  for (const { prefix, config } of PREFIX_RULES) {
    if (path.startsWith(prefix)) {
      return config;
    }
  }

  return null;
}
