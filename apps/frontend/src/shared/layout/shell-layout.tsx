import { NavLink, Outlet } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { useAppStore } from '@/infrastructure/store/app-store';
import { eventClient } from '@/infrastructure/event-client';
import { NotificationButton } from '@/modules/notification/components/notification-button';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FolderKanban,
  LogOut,
  PlusSquare,
  LayoutGrid,
  HelpCircle,
  Sun,
  Moon,
  LayoutDashboard,
  Tags,
  Bot,
  TerminalSquare,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
  Menu,
  X,
  ChevronDown,
  SlidersHorizontal,
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
  { id: 'ai_space', label: 'AI Space', to: '/app/ai', icon: Bot },
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
          className="flex w-full items-center justify-between px-3 pb-1 text-left text-[11px] uppercase tracking-wider text-sidebar-foreground/50 hover:text-sidebar-foreground"
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
                      'group flex items-center rounded-md px-3 py-2 text-sm no-underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring',
                      collapsed ? 'justify-center px-2' : 'gap-3',
                      isActive
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    )
                  }
                >
                  <Icon size={16} className="shrink-0" aria-hidden="true" />
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
      />
      <section className="fixed left-1/2 top-1/2 z-[60] w-[460px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-content-border bg-content-bg p-4 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="m-0 text-xl font-semibold text-content-text">Customize sidebar</h3>
          <button
            type="button"
            className="rounded-md p-1 text-content-text-muted hover:bg-content-bg-secondary hover:text-content-text"
            onClick={onClose}
            aria-label="Close customize sidebar"
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
              <select
                value={selected}
                onChange={(event) => onItemVisibilityChange(item.id, event.target.value as SidebarDisplayMode)}
                className="h-8 rounded-md border border-content-border bg-content-bg px-2 text-sm text-content-text"
              >
                {SIDEBAR_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function ShellLayout() {
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

  const sidebarBadges = useMemo<Record<string, number>>(
    () => ({
      inbox: 0,
      dashboard: 0,
      projects: 0,
      ai_space: 0,
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

  return (
    <>
      <div className="flex h-screen bg-background text-foreground font-sans" data-ai-component="layout.shell" data-ai-role="content">
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
          'fixed inset-y-0 left-0 z-40 w-72 border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 md:relative md:translate-x-0 md:transition-[width]',
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          sidebarCollapsed ? 'md:w-[72px]' : 'md:w-60 md:min-w-[240px]',
        )}
        aria-label="主导航"
        data-ai-component="layout.sidebar"
        data-ai-role="nav"
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sidebar-primary to-green-700">
              <FolderKanban size={16} className="text-white" aria-hidden="true" />
            </div>

            {!sidebarCollapsed ? <span className="text-base font-semibold">Moxhub</span> : null}
            {!sidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setCustomizeSidebarOpen(true)}
                className="rounded-md bg-transparent p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="Customize sidebar"
                data-ai-component="layout.sidebar.customize"
                data-ai-action="layout.sidebar.customize.click"
                data-ai-role="jump"
              >
                <SlidersHorizontal size={16} aria-hidden="true" />
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="ml-auto rounded-md bg-transparent p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:hidden"
              aria-label="关闭移动侧栏"
            >
              <X size={16} aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={toggleSidebar}
              className="ml-auto hidden rounded-md bg-transparent p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:inline-flex"
              aria-label={sidebarCollapsed ? '展开侧栏' : '折叠侧栏'}
              aria-expanded={!sidebarCollapsed}
              data-ai-component="layout.sidebar.toggle"
              data-ai-action="layout.sidebar.toggle.click"
              data-ai-role="jump"
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={16} aria-hidden="true" />
              ) : (
                <PanelLeftClose size={16} aria-hidden="true" />
              )}
            </button>

            {!sidebarCollapsed ? (
              <button
                type="button"
                onClick={toggleTheme}
                className="rounded-md bg-transparent p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label={mode === 'light' ? '切换到深色模式' : '切换到浅色模式'}
                data-ai-component="layout.sidebar.theme-toggle"
                data-ai-action="layout.sidebar.theme-toggle.click"
                data-ai-role="select"
              >
                {mode === 'light' ? (
                  <Moon size={16} aria-hidden="true" />
                ) : (
                  <Sun size={16} aria-hidden="true" />
                )}
              </button>
            ) : null}
          </div>

          <nav className="flex-1 overflow-auto pb-2" aria-label="侧栏菜单">
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
          </nav>

          <div className="border-t border-sidebar-border p-2">
            <div className={cn('flex items-center gap-2', sidebarCollapsed ? 'flex-col' : '')}>
              <button
                type="button"
                className="rounded-md bg-transparent p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                aria-label="帮助"
              >
                <HelpCircle size={18} aria-hidden="true" />
              </button>

              <NotificationButton />

              {!sidebarCollapsed ? (
                <button
                  type="button"
                  className="rounded-md bg-transparent p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  aria-label="新建"
                >
                  <PlusSquare size={18} aria-hidden="true" />
                </button>
              ) : null}
            </div>

            {currentUser ? (
              <div
                className={cn(
                  'mt-2 flex items-center gap-2',
                  sidebarCollapsed ? 'justify-center' : '',
                )}
              >
                {!sidebarCollapsed ? (
                  <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-md bg-sidebar-accent px-2 py-1">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-700 text-xs font-semibold text-white">
                      {(currentUser.displayName || currentUser.username || '?')
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <span className="truncate text-sm">
                      {currentUser.displayName || currentUser.username}
                    </span>
                  </div>
                ) : null}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => logout()}
                  disabled={isLoading}
                  className={cn(
                    'p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                    sidebarCollapsed ? 'w-full' : '',
                  )}
                  aria-label="退出登录"
                  data-ai-component="layout.sidebar.logout"
                  data-ai-action="layout.sidebar.logout.click"
                  data-ai-role="danger"
                >
                  <LogOut size={16} aria-hidden="true" />
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-3 py-2 md:hidden">
          <button
            type="button"
            className="rounded-md bg-transparent p-2 text-foreground/70 hover:bg-muted hover:text-foreground"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="打开侧栏"
            aria-expanded={mobileSidebarOpen}
          >
            <Menu size={18} aria-hidden="true" />
          </button>
          <span className="text-sm font-medium">Moxhub</span>
        </div>

        <div className="flex w-full min-w-0 flex-1 overflow-auto">
          <Outlet />
        </div>
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
  );
}
