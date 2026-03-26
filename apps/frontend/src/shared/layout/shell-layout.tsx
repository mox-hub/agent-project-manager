import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { useAppStore } from '@/infrastructure/store/app-store';
import { eventClient } from '@/infrastructure/event-client';
import { CommandPaletteProvider, type CommandPaletteItem } from '@/shared/command-palette/command-palette-provider';
import { cn } from '@/lib/utils';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  FolderKanban,
  LogOut,
  Plus,
  LayoutGrid,
  HelpCircle,
  Sun,
  Moon,
  LayoutDashboard,
  Tags,
  Bot,
  Bell,
  Plug,
  GitBranch,
  TerminalSquare,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ChevronDown,
  SlidersHorizontal,
  ArrowLeftRight,
  BarChart3,
  FileText,
} from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';

type SidebarRole = {
  id: string;
  scopeType: string;
  projectId?: string;
  role: string;
};

type SidebarItem = {
  id: string;
  label: string;
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
  visible?: (roles: SidebarRole[]) => boolean;
};

const PRIMARY_ITEMS: SidebarItem[] = [
  { id: 'inbox', label: 'Inbox', to: '/app', icon: LayoutGrid, end: true },
  { id: 'dashboard', label: 'Dashboard', to: '/app/projects/dashboard', icon: LayoutDashboard },
];

const WORKSPACE_ITEMS: SidebarItem[] = [
  { id: 'projects', label: 'Projects', to: '/app/projects', icon: FolderKanban, end: true },
  { id: 'documents', label: 'Documents', to: '/app/documents', icon: FileText },
  { id: 'ai_space', label: 'AI Space', to: '/app/ai', icon: Bot },
  { id: 'analytics', label: 'Analytics', to: '/app/analytics', icon: BarChart3 },
  { id: 'notifications', label: 'Notifications', to: '/app/notifications', icon: Bell },
  { id: 'integrations', label: 'Integrations', to: '/app/integrations', icon: Plug },
  { id: 'repositories', label: 'Repositories', to: '/app/repositories', icon: GitBranch },
  { id: 'terminal', label: 'Terminal', to: '/app/terminal', icon: TerminalSquare },
];

function hasPrivilegedRole(roles: SidebarRole[]): boolean {
  const privileged = new Set(['admin', 'owner', 'maintainer']);
  return roles.some((entry) => privileged.has(entry.role.toLowerCase()));
}

const SYSTEM_ITEMS: SidebarItem[] = [
  { id: 'settings', label: 'Settings', to: '/app/settings', icon: Settings, end: true },
  {
    id: 'metadata',
    label: 'Metadata',
    to: '/app/settings/metadata',
    icon: Tags,
    visible: (roles) => roles.length === 0 || hasPrivilegedRole(roles),
  },
];

function SidebarSection({
  id,
  title,
  items,
  collapsed,
  isExpanded,
  onToggle,
  onNavigate,
}: {
  id: 'primary' | 'workspace' | 'system';
  title: string;
  items: SidebarItem[];
  collapsed: boolean;
  isExpanded: boolean;
  onToggle: (section: 'primary' | 'workspace' | 'system') => void;
  onNavigate: () => void;
}) {
  if (items.length === 0) {
    return null;
  }

  const canShowItems = collapsed ? true : isExpanded;

  return (
    <section className="mt-3" aria-label={title}>
      {!collapsed ? (
        <button
          type="button"
          onClick={() => onToggle(id)}
          className="flex w-full items-center justify-between px-3 pb-1 text-left text-[10px] font-medium uppercase tracking-[0.08em] text-sidebar-foreground/55 hover:text-sidebar-foreground"
          aria-expanded={isExpanded}
          aria-controls={`sidebar-section-${id}`}
        >
          <span>{title}</span>
          <ChevronDown
            size={14}
            className={cn('transition-transform', isExpanded ? 'rotate-0' : '-rotate-90')}
          />
        </button>
      ) : null}

      {canShowItems ? (
        <ul id={`sidebar-section-${id}`} className="m-0 list-none px-1 py-0">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <NavLink
                  to={item.to}
                  end={item.end}
                  title={collapsed ? item.label : undefined}
                  onClick={onNavigate}
                  data-ai-component={`layout.sidebar.item.${item.id}`}
                  data-ai-action={`layout.sidebar.item.${item.id}.jump`}
                  data-ai-role="jump"
                className={({ isActive }) =>
                  cn(
                      'group flex items-center text-sm no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      collapsed
                        ? 'mx-auto h-10 w-10 justify-center rounded-xl p-0'
                        : 'gap-3 rounded-lg px-3 py-2',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground shadow-sm'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/75 hover:text-sidebar-accent-foreground',
                    )
                  }
                >
                  {collapsed ? (
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg border transition-colors',
                        'border-sidebar-border/50 bg-sidebar-accent/45 text-sidebar-foreground',
                        'group-hover:bg-sidebar-accent group-hover:text-sidebar-accent-foreground',
                      )}
                    >
                      <Icon size={16} className="shrink-0" aria-hidden="true" />
                    </span>
                  ) : (
                    <Icon size={16} className="shrink-0" aria-hidden="true" />
                  )}
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </NavLink>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}

type SidebarDisplayMode = 'always' | 'badged' | 'hidden';

const SIDEBAR_MODE_OPTIONS: Array<{ value: SidebarDisplayMode; label: string }> = [
  { value: 'always', label: 'Always show' },
  { value: 'badged', label: 'Show when badged' },
  { value: 'hidden', label: "Don't show" },
];

function SidebarCustomizePanel({
  open,
  onClose,
  badgeStyle,
  onBadgeStyleChange,
  itemVisibility,
  onItemVisibilityChange,
}: {
  open: boolean;
  onClose: () => void;
  badgeStyle: 'count' | 'dot';
  onBadgeStyleChange: (style: 'count' | 'dot') => void;
  itemVisibility: Record<string, SidebarDisplayMode>;
  onItemVisibilityChange: (itemId: string, mode: SidebarDisplayMode) => void;
}) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
        aria-label="Close sidebar customization"
        data-ai-component="layout.sidebar.customize.backdrop"
        data-ai-action="layout.sidebar.customize.backdrop.click"
        data-ai-role="jump"
      />
      <section
        className="fixed left-1/2 top-1/2 z-[60] w-[460px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-content-border bg-content-bg p-4 shadow-2xl motion-enter"
        data-ai-component="layout.sidebar.customize.panel"
        data-ai-role="panel"
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="m-0 text-xl font-semibold text-content-text">Customize sidebar</h3>
          <button
            type="button"
            className="rounded-md p-1 text-content-text-muted hover:bg-content-bg-secondary hover:text-content-text"
            onClick={onClose}
            aria-label="Close customize sidebar"
            data-ai-component="layout.sidebar.customize.close"
            data-ai-action="layout.sidebar.customize.close.click"
            data-ai-role="jump"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mb-5 rounded-lg border border-content-border bg-content-bg-secondary/40 p-3">
          <div className="mb-2 text-sm font-medium text-content-text">Default badge style</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm',
                badgeStyle === 'count'
                  ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                  : 'border-content-border text-content-text-secondary hover:bg-content-bg-secondary',
              )}
              onClick={() => onBadgeStyleChange('count')}
              data-ai-component="layout.sidebar.customize.badge-style.count"
              data-ai-action="layout.sidebar.customize.badge-style.count.click"
              data-ai-role="select"
            >
              Count
            </button>
            <button
              type="button"
              className={cn(
                'rounded-md border px-3 py-1.5 text-sm',
                badgeStyle === 'dot'
                  ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                  : 'border-content-border text-content-text-secondary hover:bg-content-bg-secondary',
              )}
              onClick={() => onBadgeStyleChange('dot')}
              data-ai-component="layout.sidebar.customize.badge-style.dot"
              data-ai-action="layout.sidebar.customize.badge-style.dot.click"
              data-ai-role="select"
            >
              Dot
            </button>
          </div>
        </div>

        <CustomizeGroup
          title="Personal"
          items={PRIMARY_ITEMS}
          itemVisibility={itemVisibility}
          onItemVisibilityChange={onItemVisibilityChange}
        />
        <CustomizeGroup
          title="Workspace"
          items={WORKSPACE_ITEMS}
          itemVisibility={itemVisibility}
          onItemVisibilityChange={onItemVisibilityChange}
          className="mt-4"
        />
        <CustomizeGroup
          title="System"
          items={SYSTEM_ITEMS}
          itemVisibility={itemVisibility}
          onItemVisibilityChange={onItemVisibilityChange}
          className="mt-4"
        />
      </section>
    </>
  );
}

function CustomizeGroup({
  title,
  items,
  itemVisibility,
  onItemVisibilityChange,
  className,
}: {
  title: string;
  items: SidebarItem[];
  itemVisibility: Record<string, SidebarDisplayMode>;
  onItemVisibilityChange: (itemId: string, mode: SidebarDisplayMode) => void;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-2 text-sm font-medium text-content-text">{title}</div>
      <div className="rounded-lg border border-content-border bg-content-bg-secondary/20 p-2">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = itemVisibility[item.id] ?? 'always';
          return (
            <div key={item.id} className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-content-bg-secondary/60">
              <div className="flex items-center gap-2 text-content-text">
                <Icon size={14} className="text-content-text-muted" />
                <span className="text-sm">{item.label}</span>
              </div>
              <NativeSelect
                value={selected}
                onChange={(event) => onItemVisibilityChange(item.id, event.target.value as SidebarDisplayMode)}
                className="h-8"
                data-ai-component={`layout.sidebar.customize.visibility.${item.id}`}
                data-ai-action={`layout.sidebar.customize.visibility.${item.id}.change`}
                data-ai-role="select"
              >
                {SIDEBAR_MODE_OPTIONS.map((option) => (
                  <NativeSelectOption key={option.value} value={option.value}>
                    {option.label}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ShellLayout() {
  const navigate = useNavigate();
  const { logout, isLoading, roles } = useAuth();
  const {
    currentUser,
    sidebarCollapsed,
    toggleSidebar,
    sidebarSections,
    toggleSidebarSection,
    sidebarItemVisibility,
    setSidebarItemVisibility,
    sidebarBadgeStyle,
    setSidebarBadgeStyle,
  } = useAppStore();
  const { mode, toggleTheme } = useTheme();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [customizeSidebarOpen, setCustomizeSidebarOpen] = useState(false);
  const [floatingActionsOpen, setFloatingActionsOpen] = useState(false);

  const sidebarBadges = useMemo<Record<string, number>>(
    () => ({
      inbox: 0,
      dashboard: 0,
      projects: 0,
      documents: 0,
      ai_space: 0,
      analytics: 0,
      notifications: 0,
      integrations: 0,
      repositories: 0,
      terminal: 0,
      settings: 0,
      metadata: 0,
    }),
    [],
  );

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || '';
    if (wsUrl && !eventClient.isConnected()) {
      eventClient.connect(wsUrl);
    }
  }, []);

  useEffect(() => {
    if (!mobileSidebarOpen) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileSidebarOpen(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileSidebarOpen]);

  const visiblePrimaryItems = useMemo(
    () =>
      PRIMARY_ITEMS.filter((item) => {
        if (item.visible && !item.visible(roles)) return false;
        const mode = sidebarItemVisibility[item.id] ?? 'always';
        if (mode === 'hidden') return false;
        if (mode === 'badged') return (sidebarBadges[item.id] ?? 0) > 0;
        return true;
      }),
    [roles, sidebarBadges, sidebarItemVisibility],
  );
  const visibleWorkspaceItems = useMemo(
    () =>
      WORKSPACE_ITEMS.filter((item) => {
        if (item.visible && !item.visible(roles)) return false;
        const mode = sidebarItemVisibility[item.id] ?? 'always';
        if (mode === 'hidden') return false;
        if (mode === 'badged') return (sidebarBadges[item.id] ?? 0) > 0;
        return true;
      }),
    [roles, sidebarBadges, sidebarItemVisibility],
  );
  const visibleSystemItems = useMemo(
    () =>
      SYSTEM_ITEMS.filter((item) => {
        if (item.visible && !item.visible(roles)) return false;
        const mode = sidebarItemVisibility[item.id] ?? 'always';
        if (mode === 'hidden') return false;
        if (mode === 'badged') return (sidebarBadges[item.id] ?? 0) > 0;
        return true;
      }),
    [roles, sidebarBadges, sidebarItemVisibility],
  );

  const floatingActions: Array<{
    id: string;
    label: string;
    icon: typeof HelpCircle;
    onClick: () => void;
    role: 'jump' | 'submit' | 'danger' | 'select';
  }> = [
    {
      id: 'quick-create',
      label: '新建项目',
      icon: Plus,
      onClick: () => {
        navigate('/app/projects');
        setFloatingActionsOpen(false);
      },
      role: 'submit',
    },
    {
      id: 'notifications',
      label: '通知中心',
      icon: Bell,
      onClick: () => {
        navigate('/app/notifications');
        setFloatingActionsOpen(false);
      },
      role: 'jump',
    },
    {
      id: 'help',
      label: '设置与帮助',
      icon: HelpCircle,
      onClick: () => {
        navigate('/app/settings');
        setFloatingActionsOpen(false);
      },
      role: 'jump',
    },
    {
      id: 'theme-toggle',
      label: mode === 'light' ? '深色模式' : '浅色模式',
      icon: mode === 'light' ? Moon : Sun,
      onClick: () => {
        toggleTheme();
        setFloatingActionsOpen(false);
      },
      role: 'select',
    },
    {
      id: 'sidebar-customize',
      label: '侧栏自定义',
      icon: SlidersHorizontal,
      onClick: () => {
        setCustomizeSidebarOpen(true);
        setFloatingActionsOpen(false);
      },
      role: 'jump',
    },
    {
      id: 'logout',
      label: '退出登录',
      icon: LogOut,
      onClick: () => {
        logout();
        setFloatingActionsOpen(false);
      },
      role: 'danger',
    },
  ];
  const isFloatingActionsOpen = floatingActionsOpen;
  const commandItems = useMemo<CommandPaletteItem[]>(
    () => [
      { id: "cmd-projects", label: "打开 Projects", to: "/app/projects", shortcut: "G P", group: "导航", keywords: ["project", "projects"] },
      { id: "cmd-dashboard", label: "打开 Dashboard", to: "/app/projects/dashboard", shortcut: "G D", group: "导航", keywords: ["dashboard"] },
      { id: "cmd-documents", label: "打开 Documents", to: "/app/documents", shortcut: "G O", group: "导航", keywords: ["docs", "documents"] },
      { id: "cmd-ai", label: "打开 AI Space", to: "/app/ai", shortcut: "G A", group: "导航", keywords: ["ai", "assistant"] },
      { id: "cmd-analytics", label: "打开 Analytics", to: "/app/analytics", shortcut: "G N", group: "导航", keywords: ["analytics", "metrics"] },
      { id: "cmd-terminal", label: "打开 Terminal", to: "/app/terminal", shortcut: "G T", group: "导航", keywords: ["terminal", "shell"] },
      { id: "cmd-settings", label: "打开 Settings", to: "/app/settings", shortcut: "G S", group: "导航", keywords: ["settings"] },
      {
        id: "cmd-theme",
        label: mode === "light" ? "切换到深色模式" : "切换到浅色模式",
        group: "操作",
        shortcut: "T",
        keywords: ["theme", "dark", "light"],
        onSelect: () => toggleTheme(),
      },
      {
        id: "cmd-logout",
        label: "退出登录",
        group: "操作",
        shortcut: "L",
        keywords: ["logout", "sign out"],
        onSelect: () => logout(),
      },
    ],
    [logout, mode, toggleTheme],
  );

  return (
    <CommandPaletteProvider initialCommands={commandItems}>
      <>
      <div className="flex h-screen overflow-hidden bg-background text-foreground" data-ai-component="layout.shell" data-ai-role="content">
      {mobileSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="关闭侧栏"
        />
      ) : null}

        <aside
          className={cn(
          'fixed inset-y-0 left-0 z-40 w-64 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:relative md:translate-x-0 md:transition-[width]',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          sidebarCollapsed ? 'md:w-[64px]' : 'md:w-64 md:min-w-[256px]',
        )}
        aria-label="主导航"
        data-ai-component="layout.sidebar"
        data-ai-role="nav"
      >
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute -right-3 top-4 z-30 hidden h-7 w-7 items-center justify-center rounded-full border border-content-border bg-content-bg text-content-text shadow-sm transition-colors hover:bg-content-bg-secondary md:inline-flex"
          aria-label={sidebarCollapsed ? '展开侧栏' : '折叠侧栏'}
          aria-expanded={!sidebarCollapsed}
          data-ai-component="layout.sidebar.toggle"
          data-ai-action="layout.sidebar.toggle.click"
          data-ai-role="jump"
        >
          {sidebarCollapsed ? (
            <PanelLeftOpen size={14} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={14} aria-hidden="true" />
          )}
        </button>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
              <FolderKanban size={16} className="text-white" aria-hidden="true" />
            </div>

            {!sidebarCollapsed ? <span className="text-base font-semibold">AgentPM</span> : null}

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="ml-auto rounded-md bg-transparent p-1 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
              aria-label="关闭移动侧栏"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          <ScrollArea className="flex-1 pb-2" aria-label="侧栏菜单">
            <SidebarSection
              id="primary"
              title="Primary"
              items={visiblePrimaryItems}
              collapsed={sidebarCollapsed}
              isExpanded={sidebarSections.primary}
              onToggle={toggleSidebarSection}
              onNavigate={() => setMobileSidebarOpen(false)}
            />
            <SidebarSection
              id="workspace"
              title="Workspace"
              items={visibleWorkspaceItems}
              collapsed={sidebarCollapsed}
              isExpanded={sidebarSections.workspace}
              onToggle={toggleSidebarSection}
              onNavigate={() => setMobileSidebarOpen(false)}
            />
            <SidebarSection
              id="system"
              title="System"
              items={visibleSystemItems}
              collapsed={sidebarCollapsed}
              isExpanded={sidebarSections.system}
              onToggle={toggleSidebarSection}
              onNavigate={() => setMobileSidebarOpen(false)}
            />
          </ScrollArea>

          {/* FROZEN-UI: keep current FAB + identity panel implementation/style unchanged for Figma replication scope. */}
          <div className="relative p-2">
            {isFloatingActionsOpen ? (
              <button
                type="button"
                className="fixed inset-0 z-10 bg-transparent"
                onClick={() => setFloatingActionsOpen(false)}
                aria-label="关闭快捷操作面板"
                data-ai-component="layout.sidebar.fab.backdrop"
                data-ai-action="layout.sidebar.fab.backdrop.click"
                data-ai-role="jump"
              />
            ) : null}

            <div className="relative z-20 flex items-end justify-start">
              <div className="relative shrink-0">
                {isFloatingActionsOpen ? (
                  <div className="absolute bottom-14 left-0 z-30 flex flex-col items-start gap-2">
                    {floatingActions.map((action) => {
                      const ActionIcon = action.icon;
                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={action.onClick}
                          disabled={action.id === 'logout' && isLoading}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-content-border bg-content-bg text-content-text shadow-md transition-colors hover:bg-content-bg-secondary disabled:opacity-50"
                          title={action.label}
                          aria-label={action.label}
                          data-ai-component={`layout.sidebar.fab.action.${action.id}`}
                          data-ai-action={`layout.sidebar.fab.action.${action.id}.click`}
                          data-ai-role={action.role}
                        >
                          <ActionIcon size={15} aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={() => setFloatingActionsOpen((previous) => !previous)}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-content-border bg-content-bg text-content-text shadow-md transition-all hover:bg-content-bg-secondary"
                  aria-label={isFloatingActionsOpen ? '收起快捷操作' : '展开快捷操作'}
                  aria-expanded={isFloatingActionsOpen}
                  data-ai-component="layout.sidebar.fab.trigger"
                  data-ai-action="layout.sidebar.fab.trigger.click"
                  data-ai-role="jump"
                >
                  {isFloatingActionsOpen ? (
                    <X size={16} aria-hidden="true" />
                  ) : (
                    <Plus size={16} aria-hidden="true" />
                  )}
                </button>
              </div>

              {isFloatingActionsOpen ? (
                <div
                  className="ml-3 min-w-[220px] rounded-xl border border-content-border bg-content-bg p-3 shadow-lg motion-enter"
                  data-ai-component="layout.sidebar.fab.identity-panel"
                  data-ai-role="panel"
                >
                  <div className="rounded-lg border border-content-border bg-content-bg-secondary p-2">
                    <p className="m-0 text-[11px] uppercase tracking-wide text-content-text-muted">Enterprise</p>
                    <p className="mt-1 text-sm font-medium text-content-text">Moxhub Workspace</p>
                  </div>

                  <div className="mt-2 rounded-lg border border-content-border bg-content-bg-secondary p-2">
                    <p className="m-0 text-[11px] uppercase tracking-wide text-content-text-muted">User</p>
                    <p className="mt-1 text-sm font-medium text-content-text">
                      {currentUser?.displayName || currentUser?.username || 'Unknown User'}
                    </p>
                    <p className="mt-1 truncate text-xs text-content-text-secondary">
                      {currentUser?.email || 'No email bound'}
                    </p>
                  </div>

                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      className="inline-flex h-8 items-center gap-1 rounded-full border border-content-border bg-content-bg px-3 text-xs text-content-text-secondary transition-colors hover:bg-content-bg-secondary hover:text-content-text"
                      onClick={() => {
                        navigate('/app/projects/dashboard');
                        setFloatingActionsOpen(false);
                      }}
                      data-ai-component="layout.sidebar.fab.identity-panel.quick-switch"
                      data-ai-action="layout.sidebar.fab.identity-panel.quick-switch.click"
                      data-ai-role="jump"
                    >
                      <ArrowLeftRight size={12} aria-hidden="true" />
                      快捷切换
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border bg-background px-3 py-2 md:hidden">
          <button
            type="button"
            className="rounded-md bg-transparent p-2 text-foreground/70 hover:bg-muted hover:text-foreground"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="打开侧栏"
            aria-expanded={mobileSidebarOpen}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <span className="text-sm font-medium">AgentPM</span>
        </div>

        <ScrollArea className="flex w-full min-w-0 flex-1">
          <Outlet />
        </ScrollArea>
      </main>
      </div>
      <SidebarCustomizePanel
        open={customizeSidebarOpen}
        onClose={() => setCustomizeSidebarOpen(false)}
        badgeStyle={sidebarBadgeStyle}
        onBadgeStyleChange={setSidebarBadgeStyle}
        itemVisibility={sidebarItemVisibility}
        onItemVisibilityChange={setSidebarItemVisibility}
      />
      </>
    </CommandPaletteProvider>
  );
}
