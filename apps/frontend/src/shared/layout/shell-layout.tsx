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
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  LayoutGrid,
  HelpCircle,
  Sun,
  Moon,
  LayoutDashboard,
  Bot,
  Bell,
  Plug,
  GitBranch,
  TerminalSquare,
  Settings,
  PanelLeftOpen,
  PanelRight,
  PanelRightClose,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  ArrowLeftRight,
  BarChart3,
  FileText,
  CheckSquare,
  AlertCircle,
  CheckCircle,
  Sparkles,
  Zap,
  Plus,
  Search,
} from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';
import { TabBar } from '@/components/ui/tab-bar';
import { NotificationPopover } from '@/components/ui/notification-popover';
import { Badge } from '@/components/ui/badge';
import { TabsProvider } from '@/shared/tabs/tabs-context';
import { ProjectDetailNav } from '@/modules/project/components/dashboard/project-detail-nav';
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
  const navigate = useNavigate();
  const location = useLocation();
  const { logout, roles } = useAuth();
  const {
    sidebarCollapsed,
    toggleSidebar,
  } = useAppStore();
  const { mode, toggleTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useState(true);

  // Navigation groups with translations - 新增搜索和通知选项置顶
  const NAV_GROUPS = useMemo(() => [
    {
      label: t('shell.utilities'),
      items: [
        { to: '/app/search', icon: Search, label: t('nav.search') },
        { to: '/app/notifications', icon: Bell, label: t('nav.notifications') },
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
      ],
    },
    {
      label: t('shell.aiTools'),
      items: [
        { to: '/app/ai', icon: Sparkles, label: 'AI' },
        { to: '/app/repositories', icon: GitBranch, label: t('git.title') },
        // Terminal导航已废弃 - Terminal功能已并入Runtime模块的terminal capability
        // 暂时保留快捷方式但禁用导航
        { to: '/app/integrations', icon: Plug, label: t('integration.title') },
      ],
    },
    {
      label: t('shell.system'),
      items: [
        { to: '/app/settings', icon: Settings, label: t('nav.settings') },
        { to: '/app/help', icon: HelpCircle, label: t('nav.help') },
      ],
    },
  ], [t]);

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
      return location.pathname === '/app/projects' || location.pathname.startsWith('/app/projects/');
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
    return location.pathname === to || location.pathname.startsWith(to + '/');
  };

  // isProjectDetailRoute matches /app/projects/:projectId/* routes EXCEPT /app/projects/dashboard
  const isProjectDetailRoute = /^\/app\/projects\/(?!dashboard$)[^/]+(\/(board|milestones|team|settings))?$/.test(
    location.pathname,
  );

  // Get current projectId from URL for ProjectDetailNav
  const currentProjectId = (() => {
    const match = location.pathname.match(/^\/app\/projects\/(?!dashboard$)([^/]+)/);
    return match ? match[1] : null;
  })();

  // Fetch real project data
  const { data: currentProject } = useProjectDetail(currentProjectId || undefined);

  // Mock projects for sidebar list (will be replaced with real data later)
  const mockProjects = [
    { id: 'p1', name: 'AgentPM Platform', healthStatus: 'on_track' as const },
    { id: 'p2', name: 'AI Code Reviewer', healthStatus: 'at_risk' as const },
    { id: 'p3', name: 'Data Pipeline v2', healthStatus: 'off_track' as const },
  ];

  // Use real project data for sidebar if available, otherwise use mock
  const sidebarProjects = currentProject
    ? [{ id: currentProject.id, name: currentProject.name, healthStatus: 'on_track' as const }]
    : mockProjects;

  const getHealthColor = (health: string) => {
    if (health === 'on_track') return 'bg-emerald-500';
    if (health === 'at_risk') return 'bg-amber-500';
    return 'bg-red-500';
  };

  const getProjectPath = (projectId: string) => {
    const currentPath = location.pathname;
    const match = currentPath.match(/\/projects\/[^/]+\/(board|milestones|team|settings)/);
    if (match) return `/app/projects/${projectId}/${match[1]}`;
    return `/app/projects/${projectId}`;
  };

  const commandItems = useMemo<CommandPaletteItem[]>(
    () => [
      { id: "cmd-projects", label: t('shell.openProjects'), to: "/app/projects", shortcut: "G P", group: t('shell.navigation'), keywords: ["project", "projects"] },
      { id: "cmd-dashboard", label: t('shell.openDashboard'), to: "/app/projects/dashboard", shortcut: "G D", group: t('shell.navigation'), keywords: ["dashboard"] },
      { id: "cmd-tasks", label: t('shell.openTasks'), to: "/app/tasks", shortcut: "G T", group: t('shell.navigation'), keywords: ["task", "tasks"] },
      { id: "cmd-bugs", label: t('shell.openBugs'), to: "/app/bugs", shortcut: "G B", group: t('shell.navigation'), keywords: ["bug", "bugs"] },
      { id: "cmd-documents", label: t('shell.openDocuments'), to: "/app/documents", shortcut: "G O", group: t('shell.navigation'), keywords: ["docs", "documents"] },
      { id: "cmd-ai", label: t('shell.openAiSpace'), to: "/app/ai", shortcut: "G A", group: t('shell.navigation'), keywords: ["ai", "assistant"] },
      { id: "cmd-ai-management", label: t('shell.openAiManagement'), to: "/app/ai/management", shortcut: "G M", group: t('shell.navigation'), keywords: ["ai", "management"] },
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
              sidebarCollapsed ? 'w-[68px]' : 'w-56',
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
                  <div className="w-10 h-10 rounded-xl bg-sidebar-primary flex items-center justify-center shrink-0 shadow-sm">
                    <Zap className="w-6 h-6 text-sidebar-primary-foreground" />
                  </div>
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

              {/* Navigation */}
              <nav className="shrink-0">
                {NAV_GROUPS.map((group, groupIndex) => (
                  <div key={group.label}>
                    {/* Group Label */}
                    {!sidebarCollapsed && (
                      <div className="px-4 py-2 mt-1">
                        <p className="text-[11px] text-sidebar-foreground/40 font-semibold uppercase tracking-wider">
                          {group.label}
                        </p>
                      </div>
                    )}

                    {/* Group Items */}
                    <div className="px-3 py-1 space-y-0.5">
                      {group.items.map(({ to, icon: Icon, label }) => (
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
                                  ? 'justify-center aspect-square p-2.5 w-10'
                                  : 'gap-3 px-3 py-2.5',
                              )}
                              onClick={() => setMobileSidebarOpen(false)}
                            >
                              <Icon className="w-5 h-5 shrink-0" />
                              {!sidebarCollapsed && <span>{label}</span>}
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

              {/* Projects Section */}
              <div className="flex-1 overflow-y-auto px-3">
                {!sidebarCollapsed ? (
                  <>
                    {/* Projects header */}
                    <div className="w-full flex items-center gap-2 px-2 py-2 text-sm text-sidebar-foreground/50">
                      <button
                        onClick={() => setProjectsExpanded(!projectsExpanded)}
                        className="flex items-center gap-2 hover:text-sidebar-foreground transition-colors"
                        aria-label={t('shell.toggleProjects')}
                      >
                        {projectsExpanded ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        <span className="uppercase tracking-wider text-[11px] font-semibold">{t('nav.projects')}</span>
                      </button>
                      <button
                        onClick={() => navigate('/app/projects')}
                        className="ml-auto hover:text-sidebar-foreground p-1 rounded hover:bg-sidebar-accent transition-colors"
                        aria-label={t('project.create')}
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Project list */}
                    {projectsExpanded && (
                      <div className="space-y-0.5">
                        {mockProjects.map((project) => {
                          const isProjectActive = location.pathname.startsWith(`/app/projects/${project.id}`);
                          return (
                            <NavLink
                              key={project.id}
                              to={getProjectPath(project.id)}
                              className={cn(
                                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors group',
                                isProjectActive
                                  ? 'bg-sidebar-accent text-sidebar-foreground'
                                  : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground',
                              )}
                              onClick={() => setMobileSidebarOpen(false)}
                            >
                              <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', getHealthColor(project.healthStatus))} />
                              <span className="truncate">{project.name}</span>
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                      /* Collapsed state - show project dots */
                  <div className="space-y-1 py-2">
                    {mockProjects.map((project) => (
                      <Tooltip key={project.id}>
                        <TooltipTrigger asChild>
                          <NavLink
                            to={getProjectPath(project.id)}
                            className={cn(
                              'flex items-center justify-center py-2.5 rounded-lg transition-colors',
                              location.pathname.startsWith(`/app/projects/${project.id}`)
                                ? 'bg-sidebar-accent'
                                : 'hover:bg-sidebar-accent/80',
                              'aspect-square w-10',
                            )}
                            onClick={() => setMobileSidebarOpen(false)}
                          >
                            <div className={cn('w-2.5 h-2.5 rounded-full', getHealthColor(project.healthStatus))} />
                          </NavLink>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          {project.name}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                )}
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
            <div className="flex flex-1 items-center justify-center p-3 pt-0 pl-0 bg-sidebar">
              <div className="h-full w-full overflow-hidden rounded-xl bg-background shadow-lg border border-border/50">
                {/* Project Context Bar (only on project sub-routes, excluding /app/projects/dashboard) */}
                {isProjectDetailRoute && currentProjectId && (
                  <div className="h-10 flex items-center bg-sidebar px-4 shrink-0 border-b border-sidebar-border">
                    <div className="flex items-center gap-1.5 text-xs text-sidebar-foreground/70 mr-3">
                      <NavLink
                        to="/app/projects"
                        className="hover:text-sidebar-foreground transition-colors no-underline"
                      >
                        {t('nav.projects')}
                      </NavLink>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-sidebar-foreground font-medium">{currentProject?.name || t('project.title')}</span>
                    </div>
                    <div className="h-3 w-px bg-sidebar-border mr-2" />
                    <ProjectDetailNav projectId={currentProjectId} />
                    <div className="ml-auto flex items-center gap-2">
                      <ProjectSidebarToggleButton />
                      <Badge
                        variant="outline"
                        className={cn(
                          'h-5 rounded-full px-2.5 text-[10px] font-medium',
                          currentProject?.healthScore && currentProject.healthScore >= 80
                            ? 'border-accent-green/30 bg-accent-green-light text-accent-green'
                            : currentProject?.healthScore && currentProject.healthScore >= 60
                              ? 'border-accent-yellow/30 bg-accent-yellow-light text-accent-yellow'
                              : 'border-accent-red/30 bg-accent-red-light text-accent-red'
                        )}
                      >
                        <div className={cn(
                          'w-1.5 h-1.5 rounded-full mr-1',
                          currentProject?.healthScore && currentProject.healthScore >= 80
                            ? 'bg-accent-green'
                            : currentProject?.healthScore && currentProject.healthScore >= 60
                              ? 'bg-accent-yellow'
                              : 'bg-accent-red'
                        )} />
                        {currentProject?.healthScore ?? '—'} · {currentProject?.healthStatus || t('common.unknown')}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Page content */}
                <ScrollArea className="flex h-full w-full min-w-0 flex-1">
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

function ProjectSidebarToggleButton() {
  const sidebar = useProjectSidebar();
  if (!sidebar) return null;
  const { hidden, toggle } = sidebar;
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      title={hidden ? 'Show sidebar' : 'Hide sidebar'}
      aria-label={hidden ? 'Show sidebar' : 'Hide sidebar'}
      data-ai-component="shell.project-sidebar.toggle"
      data-ai-action="shell.project-sidebar.toggle.click"
      className="text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
    >
      {hidden ? <PanelRight className="w-3.5 h-3.5" /> : <PanelRightClose className="w-3.5 h-3.5" />}
    </Button>
  );
}
