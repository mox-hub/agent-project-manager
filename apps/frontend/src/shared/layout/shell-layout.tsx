import { NavLink, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { useAppStore } from '@/infrastructure/store/app-store';
import { eventClient } from '@/infrastructure/event-client';
import { NotificationButton } from '@/modules/notification/components/notification-button';
import {
  FolderKanban,
  Sparkles,
  Settings,
  LogOut,
  Search,
  PlusSquare,
  LayoutGrid,
  ChevronDown,
  HelpCircle,
  Sun,
  Moon,
  LayoutDashboard,
} from 'lucide-react';
import { useTheme } from '@/shared/theme/theme-context';
import { Button } from '@/shared/ui/button';

export function ShellLayout() {
  const { logout, isLoading } = useAuth();
  const { currentUser } = useAppStore();
  const { theme, mode, toggleTheme } = useTheme();
  const { colors, typography, spacing, radii } = theme;

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || '';
    if (wsUrl && !eventClient.isConnected()) {
      eventClient.connect(wsUrl);
    }
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        fontFamily: typography.fontFamily,
      }}
    >
      {/* Sidebar */}
      <aside
        style={{
          width: 240,
          minWidth: 240,
          backgroundColor: colors.sidebar.bg,
          borderRight: `1px solid ${colors.sidebar.border}`,
          display: 'flex',
          flexDirection: 'column',
          color: colors.sidebar.text,
        }}
      >
        {/* Logo + Search + New */}
        <div
          style={{
            padding: `${spacing.md}px ${spacing.lg}px`,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            borderBottom: `1px solid ${colors.sidebar.border}`,
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: radii.sm,
              background: `linear-gradient(135deg, ${colors.sidebar.accent}, #15803d)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <FolderKanban size={16} color="#fff" />
          </div>
          <span style={{ fontSize: typography.fontSize.md, fontWeight: typography.fontWeight.semibold }}>
            Moxhub
          </span>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              marginLeft: 'auto',
              padding: spacing.xs,
              border: 'none',
              background: 'transparent',
              color: colors.sidebar.textMuted,
              cursor: 'pointer',
              borderRadius: radii.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title={mode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {mode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button
            type="button"
            style={{
              padding: spacing.xs,
              border: 'none',
              background: 'transparent',
              color: colors.sidebar.textMuted,
              cursor: 'pointer',
              borderRadius: radii.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Search"
          >
            <Search size={16} />
          </button>
          <button
            type="button"
            style={{
              padding: spacing.xs,
              border: 'none',
              background: 'transparent',
              color: colors.sidebar.textMuted,
              cursor: 'pointer',
              borderRadius: radii.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="New"
          >
            <PlusSquare size={16} />
          </button>
        </div>

        {/* Inbox, My issues */}
        <nav style={{ padding: `${spacing.sm}px ${spacing.xs}px` }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li>
              <NavLink
                to="/app"
                end
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: isActive ? colors.sidebar.text : colors.sidebar.textMuted,
                  textDecoration: 'none',
                  fontSize: typography.fontSize.sm,
                  fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
                  backgroundColor: isActive ? colors.sidebar.active : 'transparent',
                  transition: 'background-color 0.15s, color 0.15s',
                })}
              >
                <LayoutGrid size={16} />
                Inbox
              </NavLink>
            </li>
            <li>
              <a
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: colors.sidebar.textMuted,
                  textDecoration: 'none',
                  fontSize: typography.fontSize.sm,
                }}
              >
                <LayoutGrid size={16} />
                My issues
              </a>
            </li>
          </ul>
        </nav>

        {/* Workspace */}
        <div style={{ padding: `0 ${spacing.xs}px`, flex: 1, minHeight: 0 }}>
          <button
            type="button"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: `${spacing.sm}px ${spacing.md}px`,
              border: 'none',
              background: 'transparent',
              color: colors.sidebar.textDim,
              fontSize: typography.fontSize.xs,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            Workspace
            <ChevronDown size={14} />
          </button>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li>
              <NavLink
                to="/app/projects"
                end
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: isActive ? colors.sidebar.text : colors.sidebar.textMuted,
                  textDecoration: 'none',
                  fontSize: typography.fontSize.sm,
                  fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
                  backgroundColor: isActive ? colors.sidebar.active : 'transparent',
                  transition: 'background-color 0.15s, color 0.15s',
                })}
              >
                <FolderKanban size={16} />
                Projects
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/app/projects/dashboard"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: isActive ? colors.sidebar.text : colors.sidebar.textMuted,
                  textDecoration: 'none',
                  fontSize: typography.fontSize.sm,
                  fontWeight: isActive ? typography.fontWeight.medium : typography.fontWeight.normal,
                  backgroundColor: isActive ? colors.sidebar.active : 'transparent',
                  transition: 'background-color 0.15s, color 0.15s',
                })}
              >
                <LayoutDashboard size={16} />
                Dashboard
              </NavLink>
            </li>
            <li>
              <a
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: colors.sidebar.textMuted,
                  textDecoration: 'none',
                  fontSize: typography.fontSize.sm,
                }}
              >
                <LayoutGrid size={16} />
                Views
              </a>
            </li>
            <li>
              <a
                href="#"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.md,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: colors.sidebar.textMuted,
                  textDecoration: 'none',
                  fontSize: typography.fontSize.sm,
                }}
              >
                <LayoutGrid size={16} />
                More…
              </a>
            </li>
          </ul>

          <div
            style={{
              marginTop: spacing.lg,
              padding: `0 ${spacing.md}px`,
              fontSize: typography.fontSize.xs,
              color: colors.sidebar.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}
          >
            Favorites
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li>
              <NavLink
                to="/app"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: isActive ? colors.sidebar.text : colors.sidebar.textMuted,
                  textDecoration: 'none',
                  fontSize: typography.fontSize.sm,
                  backgroundColor: isActive ? colors.sidebar.active : 'transparent',
                })}
              >
                <span style={{ width: 20, textAlign: 'center' }}>★</span>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  agent-project-manager
                </span>
              </NavLink>
            </li>
          </ul>

          <div
            style={{
              marginTop: spacing.lg,
              padding: `0 ${spacing.md}px`,
              fontSize: typography.fontSize.xs,
              color: colors.sidebar.textDim,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: spacing.xs,
            }}
          >
            Your teams
          </div>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            <li>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  cursor: 'default',
                }}
              >
                <span
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: radii.sm,
                    backgroundColor: '#0ea5e9',
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: typography.fontSize.sm }}>Moxhub</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Bottom: Help, User, Logout */}
        <div
          style={{
            padding: spacing.md,
            borderTop: `1px solid ${colors.sidebar.border}`,
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
          }}
        >
          <button
            type="button"
            style={{
              padding: spacing.sm,
              border: 'none',
              background: 'transparent',
              color: colors.sidebar.textMuted,
              cursor: 'pointer',
              borderRadius: radii.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Help"
          >
            <HelpCircle size={18} />
          </button>
          <NotificationButton />
          {currentUser && (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.xs}px ${spacing.sm}px`,
                  borderRadius: radii.md,
                  backgroundColor: colors.sidebar.hover,
                  flex: 1,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ec4899, #db2777)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: typography.fontSize.xs,
                    fontWeight: typography.fontWeight.semibold,
                    color: '#fff',
                    flexShrink: 0,
                  }}
                >
                  {(currentUser.displayName || currentUser.username || '?').charAt(0).toUpperCase()}
                </div>
                <span
                  style={{
                    fontSize: typography.fontSize.sm,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentUser.displayName || currentUser.username}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => logout()}
                disabled={isLoading}
                style={{
                  color: colors.sidebar.textMuted,
                  padding: spacing.sm,
                }}
              >
                <LogOut size={16} />
              </Button>
            </>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          backgroundColor: colors.content.bg,
          color: colors.content.text,
        }}
      >
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
