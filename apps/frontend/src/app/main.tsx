import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ErrorBoundary } from '@/shared/components/error-boundary';
import { restoreDesktopSession } from '@/shared/lib/desktop-session';
import { router } from './router';
// Buffer polyfill 必须先于业务模块（gray-matter 依赖裸 Buffer 全局）
import '../polyfills';
import '../index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 桌面模式：壳侧镜像（token/工作区/引导标记）先恢复进 localStorage 再挂载路由，
// 避免 AuthGuard 用漂移后 origin 的空 localStorage 误判未登录。Web 模式为 no-op。
void restoreDesktopSession().finally(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
});
