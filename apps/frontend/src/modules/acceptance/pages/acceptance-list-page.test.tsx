/**
 * 验收中心列表页测试：列表查询参数与绑定关系展示。
 * hooks 层 mock（useAcceptanceList spy），i18n 走键名直读。
 */
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AcceptanceListPage } from './acceptance-list-page';

// 可变列表 stub：hoisted 块内仅用内置类型断言（禁引用文件内标识符的类型工具）
const stubs = vi.hoisted(() => ({
  listItems: [] as Array<Record<string, unknown>>,
}));

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
        items: stubs.listItems,
        meta: { page: 1, pageSize: 20, total: stubs.listItems.length, totalPages: 1 },
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

describe('AcceptanceListPage 列表查询', () => {
  beforeEach(() => {
    acceptanceListSpy.mockClear();
    stubs.listItems = [];
  });

  it('列表查询不携带 projectId（项目过滤回归页内自治，聚焦已废弃）', () => {
    renderPage();
    const query = acceptanceListSpy.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(query.projectId).toBeUndefined();
    expect(query.status).toBeUndefined();
  });
});

describe('AcceptanceListPage 绑定关系展示', () => {
  beforeEach(() => {
    acceptanceListSpy.mockClear();
    stubs.listItems = [];
  });

  it('列表行渲染项目名与任务名（issue 关联摘要；回归 task→issue 字段错位）', () => {
    stubs.listItems = [
      {
        id: 'a1',
        status: 'in_review',
        title: '验收契约一',
        issue: {
          id: 'i1',
          title: '登录页改造',
          status: 'in_progress',
          projectId: 'p1',
          project: { id: 'p1', name: 'APM 主站' },
        },
      },
    ];
    renderPage();
    // 卡片视图：项目名与任务名均直出实际名称，而非关联 ID 或占位符
    expect(screen.getByText('APM 主站')).toBeTruthy();
    expect(screen.getByText('登录页改造')).toBeTruthy();
  });

  it('关联缺失时行内不出现项目名/任务名占位', () => {
    stubs.listItems = [
      { id: 'a2', status: 'draft', title: '无关联契约', issue: null },
    ];
    renderPage();
    expect(screen.getByText('无关联契约')).toBeTruthy();
    expect(screen.queryByText('APM 主站')).toBeNull();
    expect(screen.queryByText('登录页改造')).toBeNull();
  });
});
