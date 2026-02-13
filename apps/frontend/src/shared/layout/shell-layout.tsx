import { NavLink, Outlet } from 'react-router-dom';

export function ShellLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: '200px', borderRight: '1px solid #ccc', padding: '20px' }}>
        <h3>Navigation</h3>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li>
              <NavLink
                to="/app"
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '4px 0',
                  color: isActive ? '#2563eb' : '#111827',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                })}
                end
              >
                Projects
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/app/ai"
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '4px 0',
                  color: isActive ? '#2563eb' : '#111827',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                AI Hub
              </NavLink>
            </li>
            <li>
              <NavLink
                to="/app/settings"
                style={({ isActive }) => ({
                  display: 'block',
                  padding: '4px 0',
                  color: isActive ? '#2563eb' : '#111827',
                  textDecoration: 'none',
                  fontWeight: isActive ? 600 : 400,
                })}
              >
                Settings
              </NavLink>
            </li>
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
