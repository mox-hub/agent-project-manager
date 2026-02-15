import { NavLink, Outlet } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { useAppStore } from '@/infrastructure/store/app-store';
import { eventClient } from '@/infrastructure/event-client';
import { NotificationButton } from '@/modules/notification/components/notification-button';
import { FolderKanban, Sparkles, Settings, LogOut, Search } from 'lucide-react';
import { colors, radii, spacing, typography, shadows } from '@/shared/theme/tokens';
import { Button } from '@/shared/ui/button';

export function ShellLayout() {
  const { logout, isLoading } = useAuth();
  const { currentUser } = useAppStore();

  // Connect event client on mount
  useEffect(() => {
    const wsUrl = import.meta.env.VITE_WS_URL || '';
    if (wsUrl && !eventClient.isConnected()) {
      eventClient.connect(wsUrl);
    }
    return () => {
      // Don't disconnect on unmount, let it stay connected
    };
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: '#020617',
        color: '#e5e7eb',
        fontFamily:
          '-apple-system,BlinkMacSystemFont,system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif',
      }}
    >
      <aside
        style={{
          width: '240px',
          borderRight: '1px solid #111827',
          padding: '16px 12px',
          background:
            'radial-gradient(circle at top left, #020617 0, #020617 40%, #000000 100%)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '4px 8px',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: radii.sm,
              background:
                'conic-gradient(from 180deg at 50% 50%, #22c55e 0deg, #22c55e 90deg, #3b82f6 180deg, #a855f7 270deg, #22c55e 360deg)',
              boxShadow: shadows.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <FolderKanban size={16} color="#020617" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '13px', fontWeight: 600 }}>Agent Project Manager</span>
            <span style={{ fontSize: '11px', color: '#6b7280' }}>Workspace</span>
          </div>
        </div>

        <nav>
          <div
            style={{
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: '#6b7280',
              padding: '0 8px 4px',
            }}
          >
            Main
          </div>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <li>
              <NavLink
                to="/app"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: isActive ? colors.textPrimary : colors.textSecondary,
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? colors.surface : 'transparent',
                  fontSize: typography.sm,
                  transition: 'all 0.2s ease',
                })}
                end
              >
                <FolderKanban size={16} />
                <span>Projects</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: typography.xs,
                    color: colors.textMuted,
                  }}
                >
                  ⌘1
                </span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/app/ai"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: isActive ? colors.textPrimary : colors.textSecondary,
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? colors.surface : 'transparent',
                  fontSize: typography.sm,
                  transition: 'all 0.2s ease',
                })}
              >
                <Sparkles size={16} />
                <span>AI Hub</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: typography.xs,
                    color: colors.textMuted,
                  }}
                >
                  ⌘2
                </span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/app/settings"
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.sm}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  color: isActive ? colors.textPrimary : colors.textSecondary,
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? colors.surface : 'transparent',
                  fontSize: typography.sm,
                  transition: 'all 0.2s ease',
                })}
              >
                <Settings size={16} />
                <span>Settings</span>
                <span
                  style={{
                    marginLeft: 'auto',
                    fontSize: typography.xs,
                    color: colors.textMuted,
                  }}
                >
                  ⌘3
                </span>
              </NavLink>
            </li>
          </ul>
        </nav>

        <div
          style={{
            marginTop: 'auto',
            fontSize: '11px',
            color: '#6b7280',
            padding: '8px',
          }}
        >
          <div style={{ marginBottom: 4 }}>My teams</div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 6px',
                borderRadius: 6,
                cursor: 'default',
              }}
            >
              <span
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  backgroundColor: '#0ea5e9',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: '12px', color: '#e5e7eb' }}>Moxhub</span>
            </div>
          </div>
        </div>
      </aside>

      <main
        style={{
          flex: 1,
          padding: '12px 24px 24px',
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 0 8px',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <div style={{ fontSize: '13px', color: '#6b7280' }}>Projects</div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: '12px',
                color: '#9ca3af',
              }}
            >
              <span>Search</span>
              <span
                style={{
                  borderRadius: radii.sm,
                  border: `1px solid ${colors.borderStrong}`,
                  padding: `${spacing.xs}px ${spacing.sm}px`,
                  fontSize: typography.xs,
                  backgroundColor: colors.surface,
                }}
              >
                ⌘K
              </span>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '12px',
              color: '#9ca3af',
            }}
          >
            <NotificationButton />

            {/* AI 入口占位 */}
            <Button
              variant="secondary"
              size="sm"
              title="AI Hub (Coming soon)"
              disabled
              style={{ opacity: 0.5 }}
            >
              <Sparkles size={16} />
            </Button>

            {currentUser && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: spacing.sm,
                  padding: `${spacing.xs}px ${spacing.md}px`,
                  borderRadius: radii.md,
                  border: `1px solid ${colors.borderStrong}`,
                  backgroundColor: colors.surface,
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: radii.sm,
                    background:
                      'linear-gradient(135deg, #22c55e, #22c55e 40%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: typography.xs,
                    fontWeight: 600,
                    color: '#020617',
                    boxShadow: shadows.sm,
                  }}
                >
                  {currentUser.displayName?.charAt(0).toUpperCase() ||
                    currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ color: '#e5e7eb', fontSize: '12px' }}>
                    {currentUser.displayName || currentUser.username}
                  </span>
                  {currentUser.email && (
                    <span style={{ color: '#6b7280', fontSize: '11px' }}>
                      {currentUser.email}
                    </span>
                  )}
                </div>
              </div>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => logout()}
              disabled={isLoading}
              leftIcon={<LogOut size={14} />}
            >
              {isLoading ? 'Signing out...' : 'Logout'}
            </Button>
          </div>
        </header>

        <div
          style={{
            borderRadius: radii.lg,
            border: `1px solid ${colors.borderSubtle}`,
            background: colors.surface,
            boxShadow: shadows.lg,
            padding: `${spacing.xl}px 0 ${spacing.lg}px`,
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
