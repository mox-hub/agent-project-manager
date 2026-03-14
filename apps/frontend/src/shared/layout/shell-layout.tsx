import { NavLink, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { useAppStore } from '@/infrastructure/store/app-store';
import { eventClient } from '@/infrastructure/event-client';
import { NotificationButton } from '@/modules/notification/components/notification-button';
import { Button } from '@/components/ui/button';
import {
  FolderKanban,
  LogOut,
  Search,
  PlusSquare,
  LayoutGrid,
  ChevronDown,
  HelpCircle,
  Sun,
  Moon,
  LayoutDashboard,
  Tags,
} from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';

export function ShellLayout() {
  const { logout, isLoading } = useAuth();
  const { currentUser } = useAppStore();
  const { mode, toggleTheme } = useTheme();

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || '';
    if (wsUrl && !eventClient.isConnected()) {
      eventClient.connect(wsUrl);
    }
  }, []);

  return (
    <div className="flex h-screen font-sans">
      {/* Sidebar */}
      <aside className="flex w-60 min-w-[240px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        {/* Logo + Search + New */}
        <div className="flex items-center gap-2 border-b border-sidebar-border px-4 py-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-sidebar-primary to-green-700">
            <FolderKanban size={16} className="text-white" />
          </div>
          <span className="text-base font-semibold">Moxhub</span>
          <button
            type="button"
            onClick={toggleTheme}
            className="ml-auto rounded-md bg-transparent p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {mode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            type="button"
            className="rounded-md bg-transparent p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title="Search"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            className="rounded-md bg-transparent p-1 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title="New"
          >
            <PlusSquare size={16} />
          </button>
        </div>

        {/* Inbox, My issues */}
        <nav className="px-1 py-2">
          <ul className="list-none m-0 p-0">
            <li>
              <NavLink
                to="/app"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-1.5 text-sm no-underline transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
              >
                <LayoutGrid size={16} />
                Inbox
              </NavLink>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/60 no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LayoutGrid size={16} />
                My issues
              </a>
            </li>
          </ul>
        </nav>

        {/* Workspace */}
        <div className="flex-1 overflow-auto px-1">
          <button
            type="button"
            className="flex w-full items-center justify-between rounded-md px-3 py-1.5 text-xs uppercase tracking-wider text-sidebar-foreground/60 hover:bg-sidebar-accent"
          >
            Workspace
            <ChevronDown size={14} />
          </button>
          <ul className="list-none m-0 p-0">
            <li>
              <NavLink
                to="/app/projects"
                end
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-1.5 text-sm no-underline transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
              >
                <FolderKanban size={16} />
                Projects
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/app/projects/dashboard"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-1.5 text-sm no-underline transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
              >
                <LayoutDashboard size={16} />
                Dashboard
              </NavLink>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/60 no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LayoutGrid size={16} />
                Views
              </a>
            </li>
            <li>
              <a
                href="#"
                className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/60 no-underline hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <LayoutGrid size={16} />
                More…
              </a>
            </li>
            <li>
              <NavLink
                to="/app/settings/metadata"
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md px-3 py-1.5 text-sm no-underline transition-colors ${
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
              >
                <Tags size={16} />
                Metadata
              </NavLink>
            </li>
          </ul>

          <div className="mt-4 px-3 text-xs uppercase tracking-wider text-sidebar-foreground/60">
            Favorites
          </div>
          <ul className="list-none m-0 p-0">
            <li>
              <NavLink
                to="/app"
                className={({ isActive }) =>
                  `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm no-underline ${
                    isActive ? 'bg-sidebar-accent' : ''
                  }`}
              >
                <span className="w-5 text-center">★</span>
                <span className="truncate overflow-hidden">agent-project-manager</span>
              </NavLink>
            </li>
          </ul>

          <div className="mt-4 px-3 text-xs uppercase tracking-wider text-sidebar-foreground/60">
            Your teams
          </div>
          <ul className="list-none m-0 p-0">
            <li>
              <div className="flex cursor-default items-center gap-2 rounded-md px-3 py-1.5">
                <span className="h-5 w-5 shrink-0 rounded-md bg-sky-500" />
                <span className="text-sm">Moxhub</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Bottom: Help, User, Logout */}
        <div className="flex items-center gap-2 border-t border-sidebar-border p-3">
          <button
            type="button"
            className="rounded-md bg-transparent p-2 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            title="Help"
          >
            <HelpCircle size={18} />
          </button>
          <NotificationButton />
          {currentUser && (
            <>
              <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-md bg-sidebar-accent px-2 py-1">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-pink-700 text-xs font-semibold text-white">
                  {(currentUser.displayName || currentUser.username || '?').charAt(0).toUpperCase()}
                </div>
                <span className="truncate text-sm">
                  {currentUser.displayName || currentUser.username}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                disabled={isLoading}
                className="p-2 text-sidebar-foreground/60"
              >
                <LogOut size={16} />
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-background text-foreground">
        <div className="flex flex-1 w-full min-w-0 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
