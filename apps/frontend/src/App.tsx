import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './App.css'
import { useDesktop } from '@/modules/desktop'
import { setApiBaseUrl } from '@/shared/types/electron-api'
import { useTranslation } from 'react-i18next'

function App() {
  const navigate = useNavigate()
  const { backendStatus, frontendStatus, startAllServices, isDesktop, isLoading } = useDesktop()
  const [initError, setInitError] = useState<string | null>(null)
  const { t } = useTranslation()

  const backendReady = backendStatus?.running && backendStatus?.info?.apiBaseUrl
  const frontendReady = frontendStatus?.running && frontendStatus?.info?.url
  const allReady = backendReady && frontendReady

  const handleStartAll = async () => {
    setInitError(null)
    try {
      await startAllServices()
    } catch (err) {
      setInitError(err instanceof Error ? err.message : String(err))
    }
  }

  // First load: auto start all services
  useEffect(() => {
    if (isDesktop && !backendStatus?.running && !frontendStatus?.running && !isLoading) {
      handleStartAll()
    }
  }, [isDesktop, backendStatus, frontendStatus, isLoading, handleStartAll])

  useEffect(() => {
    if (allReady && backendStatus?.info?.apiBaseUrl) {
      setApiBaseUrl(backendStatus.info.apiBaseUrl)
      navigate('/app', { replace: true })
    }
  }, [allReady, backendStatus, navigate])

  if (!isDesktop) {
    navigate('/app', { replace: true })
    return null
  }

  const renderServiceStatus = (
    name: string,
    status: { running: boolean; info?: { port?: number; url?: string; pid?: number } }
  ) => (
    <div className="flex items-center justify-between p-3 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${status.running ? 'bg-green-500' : 'bg-gray-400'}`} />
        <span className="text-sm font-medium">{name}</span>
      </div>
      {status.running && status.info && (
        <div className="text-xs text-muted-foreground font-mono">
          {status.info.port && <span className="mr-2">{t("app.status.port")}: {status.info.port}</span>}
          {status.info.url && <span className="mr-2">{t("app.status.url")}: {status.info.url}</span>}
          {status.info.pid && <span>{t("app.status.pid")}: {status.info.pid}</span>}
        </div>
      )}
      {!status.running && <span className="text-xs text-muted-foreground">{t("app.status.notRunning")}</span>}
    </div>
  )

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mb-4 flex h-16 w-16 mx-auto items-center justify-center rounded-2xl bg-blue-600">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
            </svg>
          </div>
          <h1 className="mb-2 text-2xl font-bold text-gray-900">Agent Project Manager</h1>
          <p className="text-sm text-gray-500">
            {allReady
              ? t("app.status.allReady")
              : backendReady
                ? t("app.status.backendReady")
                : frontendReady
                  ? t("app.status.frontendReady")
                  : t("app.status.initializing")}
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {renderServiceStatus(t("app.service.frontend"), frontendStatus || { running: false })}
          {renderServiceStatus(t("app.service.backend"), backendStatus || { running: false })}
        </div>

        {initError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 p-3">
            <p className="text-sm text-red-600">{initError}</p>
          </div>
        )}

        {!allReady && (
          <button
            onClick={handleStartAll}
            disabled={isLoading}
            className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? t("app.action.starting") : t("app.action.startAll")}
          </button>
        )}

        {allReady && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm text-green-600">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {t("app.status.servicesReady")}
            </div>
          </div>
        )}

        <p className="mt-4 text-center text-xs text-gray-400">
          AgentPM Desktop v0.1.0 - Tauri 2
        </p>
      </div>
    </div>
  )
}

export default App
