import { useState } from 'react';
import { useAuth } from '../hooks/use-auth';

export function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { login, isLoading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      login({ username, password });
    } catch (err: any) {
      setError(err?.response?.data?.error?.message || 'Login failed');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <form onSubmit={handleSubmit} style={{ width: '300px' }}>
        <h1>Agent Project Manager</h1>
        <h2>Login</h2>
        {error && <div style={{ color: 'red', marginBottom: '10px' }}>{error}</div>}
        <div style={{ marginBottom: '10px' }}>
          <label>
            Username:
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              style={{ width: '100%', padding: '5px' }}
            />
          </label>
        </div>
        <div style={{ marginBottom: '10px' }}>
          <label>
            Password:
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '5px' }}
            />
          </label>
        </div>
        <button type="submit" disabled={isLoading} style={{ width: '100%', padding: '10px' }}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
}
