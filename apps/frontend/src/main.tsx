import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { ThemeProvider } from '@/shared/theme/theme-context'
import { ConfirmProvider } from '@/shared/confirm/confirm-provider'
import { Toaster } from '@/components/ui/sonner'
import { forwardConsole } from '@/shared/lib/logger'
import { router } from './app/router'
import './index.css'

forwardConsole()

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ConfirmProvider>
          <RouterProvider router={router} />
          <Toaster richColors position="top-right" />
        </ConfirmProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
)
