import { useEffect, useState } from 'react'
import './App.css'

function App() {
  const [health, setHealth] = useState<{ status: string } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
    const url = `${baseUrl ?? ''}/_api/health`

    fetch(url)
      .then(async r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return (await r.json()) as { status: string }
      })
      .then(setHealth)
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
  }, [])

  return (
    <>
      <h1>Agent Project Manager</h1>
      <div className="card">
        <h2>Backend health</h2>
        {health ? (
          <pre>{JSON.stringify(health, null, 2)}</pre>
        ) : error ? (
          <pre style={{ color: 'crimson' }}>{error}</pre>
        ) : (
          <p>Checking...</p>
        )}
      </div>
    </>
  )
}

export default App
