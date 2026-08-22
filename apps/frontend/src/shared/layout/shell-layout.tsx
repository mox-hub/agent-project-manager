import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { useAppStore } from '@/infrastructure/store/app-store';
import { eventClient } from '@/infrastructure/event-client';
import { CommandPaletteProvider, type CommandPaletteItem } from '@/shared/command-palette/command-palette-provider';
import { FloatingActions } from '@/shared/components/floating-actions';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  FolderKanban,
  LayoutGrid,
  HelpCircle,
  Sun,
  Moon,
  LayoutDashboard,
  Bell,
  GitBranch,
  TerminalSquare,
  Settings,
  PanelLeftOpen,
  Menu,
  X,
  ArrowLeftRight,
  BarChart3,
  Briefcase,
  FileText,
  KanbanSquare,
  Milestone,
  Users,
  UsersRound,
  CheckSquare,
  AlertCircle,
  CheckCircle,
  Zap,
  Search,
  Palette,
  ListTree,
} from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';
import { FAVORITE_FALLBACK_ICON, PAGE_REGISTRY } from '@/shared/layout/page-registry';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { Logo } from '@/components/brand/logo';
import { TabBar } from '@/components/ui/tab-bar';
import { NotificationPopover } from '@/components/ui/notification-popover';
import { Badge } from '@/components/ui/badge';
import { TabsProvider } from '@/shared/tabs/tabs-context';
import {
  ProjectSidebarProvider,
  useProjectSidebar,
  PROJECT_SIDEBAR_DEFAULT_WIDTH,
  PROJECT_SIDEBAR_MIN_WIDTH,
  PROJECT_SIDEBAR_MAX_WIDTH,
} from '@/modules/project/components/dashboard/project-sidebar-context';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { ErrorBoundary } from '@/shared/components/error-boundary';
import { PageErrorFallback } from '@/shared/components/page-error-fallback';
import { useTranslation } from '@/hooks/useTranslation';

export function ShellLayout() {
  const { t } = useTranslation();
  const location = useLocation();
  const { logout, roles } = useAuth();
  const {
    sidebarCollapsed,
    toggleSidebar,
  } = useAppStore();
  const favoritePages = useAppStore((s) => s.favoritePages);
  const { mode, toggleTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  // Navigation groups with translations - 新增搜索和通知选项置顶
  const favoriteGroup = useMemo(() => {
    if (favoritePages.length === 0) return [];
    return [
      {
        label: t('shell.favorites'),
        items: favoritePages.map((fav) => {
          const registered = PAGE_REGISTRY[fav.path];
          return {
            to: fav.path,
            icon: registered?.icon ?? FAVORITE_FALLBACK_ICON,
            color: registered?.color,
            label: registered?.labelKey
              ? t(registered.labelKey)
              : registered?.label ?? fav.label,
          };
        }),
      },
    ];
  }, [favoritePages, t]);

  const NAV_GROUPS = useMemo(() => [
    {
      label: t('shell.utilities'),
      items: [
        { to: '/app/search', icon: Search, label: t('nav.search') },
        { to: '/app/notifications', icon: Bell, label: t('nav.notifications'), count: 0 },
      ],
    },
    {
      label: t('shell.main'),
      items: [
        { to: '/app/projects/dashboard', icon: LayoutDashboard, label: t('nav.dashboard') },
        { to: '/app/projects', icon: FolderKanban, label: t('nav.projects') },
        { to: '/app/tasks', icon: CheckSquare, label: t('nav.tasks') },
        { to: '/app/bugs', icon: AlertCircle, label: t('task.bug.title') },
        { to: '/app/acceptance', icon: CheckCircle, label: t('nav.acceptance') },
        { to: '/app/documents', icon: FileText, label: t('document.title') },
        { to: '/app/repositories', icon: GitBranch, label: t('git.title') },
        { to: '/app/members', icon: Users, label: t('nav.members') },
        { to: '/app/teams', icon: UsersRound, label: t('nav.teams') },
      ],
    },
    // AI 页面与集成页面已迁入设置页（/app/settings/ai、/app/settings/integrations），
    // 原 "AI Tools" 分组仅剩 Git 仓库，已并入 main 分组
    {
      label: t('shell.system'),
      items: [
        { to: '/app/settings', icon: Settings, label: t('nav.settings') },
        { to: '/app/help', icon: HelpCircle, label: t('nav.help') },
        ...(import.meta.env.DEV
          ? [
              { to: '/app/design-system', icon: Palette, label: 'Design System', capsule: 'dev' },
              { to: '/app/delivery', icon: ListTree, label: 'Delivery', capsule: 'dev' },
            ]
          : []),
      ],
    },
    // 收藏分区移到最下方
    ...favoriteGroup,
  ], [favoriteGroup, t]);

  useEffect(() => {
    if (!eventClient.isConnected()) {
      eventClient.connect(import.meta.env.VITE_WS_URL || undefined);
    }
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileSidebarOpen]);

  // Determine if a nav item is "active" even under sub-paths
  const isNavActive = (to: string) => {
    if (to === '/app/projects') {
      // 仪表盘（/app/projects/dashboard）有独立菜单项，不应联动高亮“项目”
      return (
        location.pathname === '/app/projects' ||
        (location.pathname.startsWith('/app/projects/') &&
          !location.pathname.startsWith('/app/projects/dashboard'))
      );
    }
    if (to === '/app/tasks') {
      return location.pathname === '/app/tasks' || location.pathname.startsWith('/app/tasks');
    }
    if (to === '/app/bugs') {
      return location.pathname === '/app/bugs' || location.pathname.startsWith('/app/bugs');
    }
    if (to === '/app/settings') {
      return location.pathname === '/app/settings' || location.pathname.startsWith('/app/settings');
    }
    if (to === '/app/executions') {
      return location.pathname === '/app/executions' || location.pathname.startsWith('/app/executions');
    }
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  // isProjectDetailRoute matches /app/projects/:projectId/* routes EXCEPT /app/projects/dashboard
  const isProjectDetailRoute = /^\/app\/projects\/(?!dashboard$)[^/]+(\/(board|milestones|team|settings|roles))?$/.test(
    location.pathname,
  );

  // Get current projectId from URL for ProjectDetailNav
  const currentProjectId = (() => {
    const match = location.pathname.match(/^\/app\/projects\/(?!dashboard$)([^/]+)/);
    return match ? match[1] : null;
  })();

  // Fetch real project data
  const { data: currentProject } = useProjectDetail(currentProjectId || undefined);

  const commandItems = useMemo<CommandPaletteItem[]>(
    () => [
      { id: "cmd-projects", label: t('shell.openProjects'), to: "/app/projects", shortcut: "G P", group: t('shell.navigation'), keywords: ["project", "projects"] },
      { id: "cmd-dashboard", label: t('shell.openDashboard'), to: "/app/projects/dashboard", shortcut: "G D", group: t('shell.navigation'), keywords: ["dashboard"] },
      { id: "cmd-tasks", label: t('shell.openTasks'), to: "/app/tasks", shortcut: "G T", group: t('shell.navigation'), keywords: ["task", "tasks"] },
      { id: "cmd-bugs", label: t('shell.openBugs'), to: "/app/bugs", shortcut: "G B", group: t('shell.navigation'), keywords: ["bug", "bugs"] },
      { id: "cmd-documents", label: t('shell.openDocuments'), to: "/app/documents", shortcut: "G O", group: t('shell.navigation'), keywords: ["docs", "documents"] },
      { id: "cmd-members", label: t('shell.openMembers'), to: "/app/members", shortcut: "G E", group: t('shell.navigation'), keywords: ["member", "members", "team"] },
      { id: "cmd-teams", label: t('shell.openTeams'), to: "/app/teams", shortcut: "G M", group: t('shell.navigation'), keywords: ["team", "teams"] },
      { id: "cmd-ai", label: t('shell.openAiSpace'), to: "/app/settings/ai", shortcut: "G A", group: t('shell.navigation'), keywords: ["ai", "assistant"] },
      { id: "cmd-ai-management", label: t('shell.openAiManagement'), to: "/app/settings/ai", shortcut: "G M", group: t('shell.navigation'), keywords: ["ai", "management"] },
      { id: "cmd-agents", label: t('shell.openAgents') || 'Open Agent Management', to: "/app/settings/ai/agents", shortcut: "G G", group: t('shell.navigation'), keywords: ["agent", "agents", "mcp"] },
      { id: "cmd-analytics", label: t('shell.openAnalytics'), to: "/app/analytics", shortcut: "G N", group: t('shell.navigation'), keywords: ["analytics", "metrics"] },
      // Terminal命令已废弃 - Terminal功能已并入Runtime模块
      { id: "cmd-settings", label: t('shell.openSettings'), to: "/app/settings", shortcut: "G S", group: t('shell.navigation'), keywords: ["settings"] },
      { id: "cmd-help", label: t('shell.openHelp'), to: "/app/help", shortcut: "G H", group: t('shell.navigation'), keywords: ["help", "docs"] },
      {
        id: "cmd-theme",
        label: mode === "light" ? t('shell.switchToDark') : t('shell.switchToLight'),
        group: t('common.actions'),
        shortcut: "T",
        keywords: ["theme", "dark", "light"],
        onSelect: () => toggleTheme(),
      },
      {
        id: "cmd-logout",
        label: t('shell.logout'),
        group: t('common.actions'),
        shortcut: "L",
        keywords: ["logout", "sign out"],
        onSelect: () => logout(),
      },
    ],
    [logout, mode, toggleTheme, t],
  );

  return (
    <CommandPaletteProvider initialCommands={commandItems}>
      <ShellSidebarProvider>
        <TabsProvider>
        <div className="flex h-screen overflow-hidden bg-background text-foreground" data-ai-component="layout.shell" data-ai-role="content">
          {/* Mobile sidebar backdrop */}
          {mobileSidebarOpen ? (
            <button
              type="button"
              className="fixed inset-0 z-30 bg-black/40 md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
              aria-label={t('shell.closeSidebar')}
            />
          ) : null}

          {/* Sidebar - 移除分割线 */}
          <aside
            className={cn(
              'flex flex-col h-full bg-sidebar transition-all duration-200',
              mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:relative',
              sidebarCollapsed ? 'w-17' : 'w-56',
            )}
            aria-label={t('shell.mainNav')}
            data-ai-component="layout.sidebar"
            data-ai-role="nav"
          >
            <TooltipProvider>
              {/* Logo / App Header */}
              <div className="flex items-center h-14 px-4 shrink-0 gap-3">
                <button
                  onClick={toggleSidebar}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity flex-1 min-w-0"
                  aria-label="Toggle sidebar"
                >
                  <Logo size="lg" variant="framed" tone="auto" className="shrink-0" ariaLabel="Agent Project Manager" />
                  {!sidebarCollapsed && (
                    <span className="text-base font-semibold text-sidebar-foreground truncate">{t('shell.appName')}</span>
                  )}
                </button>
                {!sidebarCollapsed && (
                  <div className="shrink-0">
                    <NotificationPopover />
                  </div>
                )}
              </div>

              {/* 可滚动内容区：主导航 + 项目列表（页签固定/收藏过多时可滚动） */}
              <div className="flex-1 min-h-0 overflow-y-auto">
              {/* Navigation */}
              <nav className="py-1">
                {NAV_GROUPS.map((group, groupIndex) => (
                  <div key={group.label}>
                    {/* Group Label */}
                    {!sidebarCollapsed && (
                      <div className="px-3 pt-2 pb-1 mt-0.5">
                        <p className="text-11 text-sidebar-foreground/40 font-semibold uppercase tracking-wider">
                          {group.label}
                        </p>
                      </div>
                    )}

                    {/* Group Items */}
                    <div className="px-2.5 py-0.5 space-y-0.5">
                      {group.items.map(({ to, icon: Icon, label, color, capsule, count }) => (
                        <Tooltip key={to}>
                          <TooltipTrigger asChild>
                            <NavLink
                              to={to}
                              end={to !== '/app/projects'}
                              className={cn(
                                'flex items-center rounded-lg text-sm transition-colors',
                                isNavActive(to)
                                  ? 'bg-sidebar-accent text-sidebar-foreground font-medium'
                                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground',
                                sidebarCollapsed
                                  ? 'justify-center aspect-square p-2 w-9'
                                  : 'gap-2 px-2.5 py-1.5',
                              )}
                              onClick={() => setMobileSidebarOpen(false)}
                            >
                              <Icon
                                className="w-4 h-4 shrink-0"
                                style={color ? { color } : undefined}
                              />
                              {!sidebarCollapsed && (
                                <>
                                  <span className="flex-1 truncate">{label}</span>
                                  {typeof count === 'number' && count > 0 && (
                                    <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-10 font-semibold text-primary-foreground tabular-nums">
                                      {count > 99 ? '99+' : count}
                                    </span>
                                  )}
                                  {capsule && (
                                    <span className="inline-flex items-center rounded-full border px-1.5 py-px text-10 font-medium uppercase tracking-wide bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800">
                                      {capsule}
                                    </span>
                                  )}
                                </>
                              )}
                            </NavLink>
                          </TooltipTrigger>
                          {sidebarCollapsed && (
                            <TooltipContent side="right">{label}</TooltipContent>
                          )}
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
              </div>

              {/* Sidebar Toggle Button - Only show when collapsed */}
              {sidebarCollapsed && (
                <div className="shrink-0 px-3 py-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={toggleSidebar}
                        className="flex w-full items-center justify-center aspect-square p-2.5 rounded-lg text-sidebar-foreground/60 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground transition-colors"
                        aria-label={t('shell.expandSidebar')}
                      >
                        <PanelLeftOpen className="w-5 h-5 shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {t('shell.expandSidebar')}
                    </TooltipContent>
                  </Tooltip>
                </div>
              )}
            </TooltipProvider>
          </aside>

          {/* Main content area */}
          <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-sidebar">
            {/* TabBar - 与侧边栏统一 */}
            <div className="bg-sidebar">
              <TabBar />
            </div>

            {/* Mobile header */}
            <div className="flex items-center gap-2 border-b border-sidebar-border bg-sidebar px-3 py-2 md:hidden">
              <button
                type="button"
                className="rounded-md bg-transparent p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                onClick={() => setMobileSidebarOpen(true)}
                aria-label={t('shell.openSidebar')}
                aria-expanded={mobileSidebarOpen}
              >
                <Menu size={18} aria-hidden="true" />
              </button>
              <span className="text-sm font-medium text-sidebar-foreground">{t('shell.appName')}</span>
            </div>

            {/* Content area with rounded rectangle - 只有页面内容在圆角矩形内 */}
            <div className="flex flex-1 overflow-hidden p-3 pt-0 pl-0 bg-sidebar">
              <div className="h-full w-full overflow-hidden rounded-xl bg-background shadow-lg border border-border/50">
                {/* Project Context Bar (only on project sub-routes, excluding /app/projects/dashboard) */}
                {isProjectDetailRoute && currentProjectId && (
                  <ProjectContextBar projectId={currentProjectId} project={currentProject} />
                )}

                {/* Page content */}
                <ScrollArea className="h-full w-full">
                  <ErrorBoundary fallback={<PageErrorFallback />}>
                    <Outlet />
                  </ErrorBoundary>
                </ScrollArea>
              </div>
            </div>
          </main>

          {/* Floating Actions - bottom left corner */}
          <FloatingActions theme={mode} onToggleTheme={toggleTheme} />
        </div>
      </TabsProvider>
      </ShellSidebarProvider>
    </CommandPaletteProvider>
  );
}

function ShellSidebarProvider({ children }: { children: ReactNode }) {
  const [hidden, setHidden] = useState(false);
  const [width, setWidth] = useState(PROJECT_SIDEBAR_DEFAULT_WIDTH);
  return (
    <ProjectSidebarProvider
      value={{
        hidden,
        setHidden,
        toggle: () => setHidden((v) => !v),
        width,
        setWidth,
        minWidth: PROJECT_SIDEBAR_MIN_WIDTH,
        maxWidth: PROJECT_SIDEBAR_MAX_WIDTH,
      }}
    >
      {children}
    </ProjectSidebarProvider>
  );
}

/** 项目子路由上下文栏：面包屑 + 居中子页签 + 健康度徽章 + 侧栏开关（SubPageToolbar） */
function ProjectContextBar({
  projectId,
  project,
}: {
  projectId: string;
  project: { name?: string; healthScore?: number; healthStatus?: string } | undefined;
}) {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const sidebar = useProjectSidebar();

  const tabs = useMemo(
    () => [
      { value: 'overview', label: t('project.detail.overview'), icon: BarChart3 },
      { value: 'board', label: t('project.detail.board'), icon: KanbanSquare },
      { value: 'milestones', label: t('project.detail.milestones'), icon: Milestone },
      { value: 'team', label: t('project.detail.team'), icon: Users },
      { value: 'roles', label: t('project.detail.roles', '执行角色'), icon: Briefcase },
      { value: 'settings', label: t('nav.settings'), icon: Settings },
    ],
    [t],
  );

  const activeTab = useMemo(() => {
    const match = location.pathname.match(/^\/app\/projects\/[^/]+\/([^/]+)/);
    const sub = match?.[1];
    return sub && tabs.some((tab) => tab.value === sub) ? sub : 'overview';
  }, [location.pathname, tabs]);

  return (
    <SubPageToolbar
      aiId="shell.project-context"
      className="bg-sidebar"
      breadcrumbs={[
        { label: t('nav.projects'), to: '/app/projects' },
        { label: project?.name || t('project.title') },
      ]}
      tabs={{
        value: activeTab,
        onChange: (value) =>
          navigate(value === 'overview' ? `/app/projects/${projectId}` : `/app/projects/${projectId}/${value}`),
        items: tabs,
      }}
      actions={
        <Badge
          variant="outline"
          className={cn(
            'h-5 rounded-full px-2.5 text-10 font-medium',
            project?.healthScore && project.healthScore >= 80
              ? 'border-accent-green/30 bg-accent-green-light text-accent-green'
              : project?.healthScore && project.healthScore >= 60
                ? 'border-accent-yellow/30 bg-accent-yellow-light text-accent-yellow'
                : 'border-accent-red/30 bg-accent-red-light text-accent-red'
          )}
        >
          <div className={cn(
            'w-1.5 h-1.5 rounded-full mr-1',
            project?.healthScore && project.healthScore >= 80
              ? 'bg-accent-green'
              : project?.healthScore && project.healthScore >= 60
                ? 'bg-accent-yellow'
                : 'bg-accent-red'
          )} />
          {project?.healthScore ?? '—'} · {project?.healthStatus || t('common.unknown')}
        </Badge>
      }
      sidebar={sidebar ? { open: !sidebar.hidden, onToggle: sidebar.toggle } : undefined}
    />
  );
}
