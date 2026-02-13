import { Outlet } from 'react-router-dom';

export function ShellLayout() {
  return (
    <div style={{ display: 'flex', height: '100vh' }}>
      <aside style={{ width: '200px', borderRight: '1px solid #ccc', padding: '20px' }}>
        <h3>Navigation</h3>
        <nav>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            <li><a href="/app">Projects</a></li>
            <li><a href="/app/ai">AI Hub</a></li>
            <li><a href="/app/settings">Settings</a></li>
          </ul>
        </nav>
      </aside>
      <main style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
