import { NavLink, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
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
} from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';

type SidebarItem = {
  label: string;
  to: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  end?: boolean;
};

const PRIMARY_ITEMS: SidebarItem[] = [
  { label: 'Inbox', to: '/app', icon: LayoutGrid, end: true },
  { label: 'Dashboard', to: '/app/projects/dashboard', icon: LayoutDashboard },
];

const WORKSPACE_ITEMS: SidebarItem[] = [
  { label: 'Projects', to: '/app/projects', icon: FolderKanban, end: true },
  { label: 'AI Space', to: '/app/ai', icon: Bot },
  { label: 'Terminal', to: '/app/terminal', icon: TerminalSquare },
];

const SYSTEM_ITEMS: SidebarItem[] = [
  { label: 'Settings', to: '/app/settings', icon: Settings, end: true },
  { label: 'Metadata', to: '/app/settings/metadata', icon: Tags },
];

function SidebarSection({
  title,
  items,
  collapsed,
}: {
  title: string;
  items: SidebarItem[];
  collapsed: boolean;
}) {
  return (
    <section className="mt-3">
      {!collapsed ? (
        <div className="px-3 pb-1 text-[11px] uppercase tracking-wider text-sidebar-foreground/50">{title}</div>
      ) : null}
      <ul className="m-0 list-none px-1 py-0">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center rounded-md px-3 py-2 text-sm no-underline transition-colors',
                    collapsed ? 'justify-center px-2' : 'gap-3',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  )
                }
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed ? <span className="truncate">{item.label}</span> : null}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ShellLayout() {
  const { logout, isLoading } = useAuth();
  const { currentUser, sidebarCollapsed, toggleSidebar } = useAppStore();
  const { mode, toggleTheme } = useTheme();

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || '';
    if (wsUrl && !eventClient.isConnected()) {
      eventClient.connect(wsUrl);
    }
  }, []);

  return (
    <div className="flex h-screen font-sans">
      <aside
        className={cn(
          'flex flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200',
          sidebarCollapsed ? 'w-[72px]' : 'w-60 min-w-[240px]',
        )}
      >
        <div className="flex items-center gap-2 border-b border-sidebar-border px-3 py-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sidebar-primary to-green-700">
            <FolderKanban size={16} className="text-white" />
          </div>

          {!sidebarCollapsed ? <span className="text-base font-semibold">Moxhub</span> : null}

          <button
            type="button"
            onClick={toggleSidebar}
            className={cn(
              'rounded-md bg-transparent p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
              sidebarCollapsed ? 'ml-auto' : 'ml-auto',
            )}
            title={sidebarCollapsed ? '展开侧栏' : '折叠侧栏'}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>

          {!sidebarCollapsed ? (
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md bg-transparent p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            >
              {mode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>
          ) : null}
        </div>

        <div className="flex-1 overflow-auto pb-2">
          <SidebarSection title="Primary" items={PRIMARY_ITEMS} collapsed={sidebarCollapsed} />
          <SidebarSection title="Workspace" items={WORKSPACE_ITEMS} collapsed={sidebarCollapsed} />
          <SidebarSection title="System" items={SYSTEM_ITEMS} collapsed={sidebarCollapsed} />
        </div>

        <div className="border-t border-sidebar-border p-2">
          <div className={cn('flex items-center gap-2', sidebarCollapsed ? 'flex-col' : '')}>
            <button
              type="button"
              className="rounded-md bg-transparent p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              title="Help"
            >
              <HelpCircle size={18} />
            </button>

            <NotificationButton />

            {!sidebarCollapsed ? (
              <button
                type="button"
                className="rounded-md bg-transparent p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                title="Create"
              >
                <PlusSquare size={18} />
              </button>
            ) : null}
          </div>

          {currentUser ? (
            <div className={cn('mt-2 flex items-center gap-2', sidebarCollapsed ? 'justify-center' : '')}>
              {!sidebarCollapsed ? (
                <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-md bg-sidebar-accent px-2 py-1">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-700 text-xs font-semibold text-white">
                    {(currentUser.displayName || currentUser.username || '?').charAt(0).toUpperCase()}
                  </div>
                  <span className="truncate text-sm">{currentUser.displayName || currentUser.username}</span>
                </div>
              ) : null}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                disabled={isLoading}
                className={cn('p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground', sidebarCollapsed ? 'w-full' : '')}
                title="Logout"
              >
                <LogOut size={16} />
              </Button>
            </div>
          ) : null}
        </div>
      </aside>

      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
        <div className="flex w-full min-w-0 flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
