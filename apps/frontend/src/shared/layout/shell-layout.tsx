import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { useAppStore } from '@/infrastructure/store/app-store';

export function ShellLayout() {
  const { logout, isLoading } = useAuth();
  const { currentUser } = useAppStore();

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
              width: 24,
              height: 24,
              borderRadius: '8px',
              background:
                'conic-gradient(from 180deg at 50% 50%, #22c55e 0deg, #22c55e 90deg, #3b82f6 180deg, #a855f7 270deg, #22c55e 360deg)',
            }}
          />
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
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  color: isActive ? '#f9fafb' : '#e5e7eb',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? '#111827' : 'transparent',
                  fontSize: '13px',
                })}
                end
              >
                <span>Projects</span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
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
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  color: isActive ? '#f9fafb' : '#e5e7eb',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? '#111827' : 'transparent',
                  fontSize: '13px',
                })}
              >
                <span>AI Hub</span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
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
                  justifyContent: 'space-between',
                  padding: '6px 8px',
                  borderRadius: '6px',
                  color: isActive ? '#f9fafb' : '#e5e7eb',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                  backgroundColor: isActive ? '#111827' : 'transparent',
                  fontSize: '13px',
                })}
              >
                <span>Settings</span>
                <span
                  style={{
                    fontSize: '11px',
                    color: '#9ca3af',
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
                  borderRadius: 999,
                  border: '1px solid #1f2937',
                  padding: '2px 6px',
                  fontSize: '11px',
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
            {currentUser && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '4px 8px',
                  borderRadius: 999,
                  border: '1px solid #1f2937',
                  backgroundColor: '#020617',
                }}
              >
                <div
                  style={{
                    width: 20,
                    height: 20,
                    borderRadius: '999px',
                    background:
                      'linear-gradient(135deg, #22c55e, #22c55e 40%, #3b82f6 100%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: '#020617',
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

            <button
              type="button"
              onClick={() => logout()}
              disabled={isLoading}
              style={{
                padding: '4px 10px',
                borderRadius: 999,
                border: '1px solid #1f2937',
                backgroundColor: '#020617',
                color: '#e5e7eb',
                fontSize: '11px',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              {isLoading ? 'Signing out...' : 'Logout'}
            </button>
          </div>
        </header>

        <div
          style={{
            borderRadius: '16px',
            border: '1px solid #111827',
            background:
              'radial-gradient(circle at top left, #020617 0, #020617 40%, #020617 100%)',
            boxShadow: '0 18px 40px rgba(15,23,42,0.6)',
            padding: '16px 0 12px',
          }}
        >
          <Outlet />
        </div>
      </main>
    </div>
  );
}
