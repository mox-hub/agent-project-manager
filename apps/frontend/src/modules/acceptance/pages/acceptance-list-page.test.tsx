/**
 * 验收中心列表页测试——管道项目聚焦（CAP-A-15）消费断言：
 * 聚焦项目时（?project=<id>）列表查询携带 projectId；无聚焦不携带。
 * hooks 层 mock（useAcceptanceList spy），i18n 走键名直读。
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AcceptanceListPage } from './acceptance-list-page';
import { usePipelineFocusStore } from '@/shared/layout/pipeline-focus';

vi.mock('react-i18next', () => ({
  // 第二参数可能是 fallback 字符串或插值对象（如 {count} 复数）：对象时回退 key
  useTranslation: () => ({
    t: (key: string, opts?: string | Record<string, unknown>) =>
      typeof opts === 'string' ? opts : key,
    i18n: { language: 'zh-CN' },
  }),
  initReactI18next: { type: '3rdParty', init: () => {} },
}));

vi.mock('@/shared/confirm/use-confirm', () => ({
  useConfirm: () => async () => true,
}));

const acceptanceListSpy = vi.fn();
vi.mock('../hooks/use-acceptance', () => ({
  useAcceptanceList: (params?: Record<string, unknown>) => {
    acceptanceListSpy(params);
    return {
      data: {
        items: [],
        meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
      },
      isLoading: false,
    };
  },
  // AcceptanceFormDialog 等组件消费的其余 hooks 一并补空实现
  useCreateAcceptance: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAcceptance: () => ({ mutate: vi.fn(), isPending: false }),
  useAcceptanceDetail: () => ({ data: undefined, isLoading: false }),
  useAcceptancesByTask: () => ({ data: [], isLoading: false }),
}));

function renderPage(route = '/app/acceptance') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[route]}>
        <AcceptanceListPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('AcceptanceListPage 管道项目聚焦（CAP-A-15）', () => {
  beforeEach(() => {
    acceptanceListSpy.mockClear();
    // 管道项目聚焦 store 为模块级单例：逐用例重置，避免 URL 覆盖写回互相污染
    usePipelineFocusStore.setState({ focusProjectId: null });
  });

  it('无聚焦时列表查询不携带 projectId', () => {
    renderPage();
    expect(acceptanceListSpy).toHaveBeenCalledWith(
      expect.objectContaining({ status: undefined, projectId: undefined }),
    );
  });

  it('聚焦项目时（?project=p1）列表查询携带 projectId（URL 优先）', () => {
    renderPage('/app/acceptance?project=p1');
    expect(acceptanceListSpy).toHaveBeenCalledWith(
      expect.objectContaining({ projectId: 'p1' }),
    );
  });
});
