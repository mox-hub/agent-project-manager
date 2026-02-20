import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Theme } from '@radix-ui/themes'
import { router } from './app/router'
import '@radix-ui/themes/styles.css'
import './index.css'

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
      <Theme appearance="dark" accentColor="violet" grayColor="slate" panelBackground="solid">
        <RouterProvider router={router} />
      </Theme>
    </QueryClientProvider>
  </StrictMode>,
)
