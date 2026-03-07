import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { render, type RenderOptions } from '@testing-library/react';
import { useAppStore } from '@/infrastructure/store/app-store';

/**
 * 创建测试用的 QueryClient
 * 配置为禁用重试和缓存，适合单元测试
 */
export const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
    logger: {
      log: console.log,
      warn: console.warn,
      error: () => {}, // 抑制错误日志以避免测试输出混乱
    },
  });

/**
 * QueryClient 包装器
 * 用于测试使用 TanStack Query 的 hooks
 */
interface QueryClientWrapperProps {
  children: ReactNode;
  client?: QueryClient;
}

export const QueryClientWrapper = ({
  children,
  client = createTestQueryClient(),
}: QueryClientWrapperProps) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
);

/**
 * Router 包装器
 * 用于测试使用路由的组件和页面
 */
interface RouterWrapperProps {
  children: ReactNode;
  initialEntries?: string[];
  routes?: ReturnType<typeof createMemoryRouter>['routes'];
}

export const RouterWrapper = ({
  children,
  initialEntries = ['/'],
  routes = [],
}: RouterWrapperProps) => {
  const router = createMemoryRouter(routes || [
    {
      path: '*',
      element: <>{children}</>,
    },
  ], {
    initialEntries,
  });

  return <RouterProvider router={router} />;
};

/**
 * Store 包装器
 * 用于测试使用 Zustand store 的组件
 */
interface StoreWrapperProps {
  children: ReactNode;
  initialState?: Partial<ReturnType<typeof useAppStore.getState>>;
}

export const StoreWrapper = ({ children, initialState = {} }: StoreWrapperProps) => {
  useAppStore.setState(initialState);
  return <>{children}</>;
};

/**
 * 组合包装器
 * 提供所有测试所需的 Provider
 */
interface AllProvidersProps {
  children: ReactNode;
  routerEntries?: string[];
  routes?: ReturnType<typeof createMemoryRouter>['routes'];
  storeState?: Partial<ReturnType<typeof useAppStore.getState>>;
  queryClient?: QueryClient;
}

export const AllProviders = ({
  children,
  routerEntries,
  routes,
  storeState,
  queryClient,
}: AllProvidersProps) => {
  const client = queryClient || createTestQueryClient();

  return (
    <QueryClientProvider client={client}>
      <RouterWrapper initialEntries={routerEntries} routes={routes}>
        <StoreWrapper initialState={storeState}>
          {children}
        </StoreWrapper>
      </RouterWrapper>
    </QueryClientProvider>
  );
};

/**
 * 自定义渲染函数，包含所有包装器
 */
export const renderWithProviders = (
  ui: ReactNode,
  options?: Omit<RenderOptions, 'wrapper'> & {
    routerEntries?: string[];
    routes?: ReturnType<typeof createMemoryRouter>['routes'];
    storeState?: Partial<ReturnType<typeof useAppStore.getState>>;
    queryClient?: QueryClient;
  },
) => {
  const { routerEntries, routes, storeState, queryClient, ...renderOptions } = options || {};

  return render(
    <AllProviders
      routerEntries={routerEntries}
      routes={routes}
      storeState={storeState}
      queryClient={queryClient}
    >
      {ui}
    </AllProviders>,
    {
      wrapper: ({ children }) => children,
      ...renderOptions,
    },
  );
};

/**
 * 重置测试状态
 * 应该在每个测试前调用
 */
export const resetTestState = () => {
  // 重置 store
  useAppStore.setState({
    currentUser: null,
    currentProjectId: null,
    currentTaskId: null,
    sidebarCollapsed: false,
    viewMode: 'kanban',
    aiPanelOpen: false,
  });
};
