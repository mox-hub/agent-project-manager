import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
  buildInsertText,
  useEntityRefSuggestions,
  type EntityRefCandidate,
} from '../entity-ref-suggest';

/**
 * 统一实体引用子系统（v2 纪要 §13.3）：候选混排 + 插入语法构造。
 */

vi.mock('@/modules/team-member/api/team-member-api', () => ({
  suggestMentions: vi.fn(async () => [
    {
      id: 'm1',
      type: 'human',
      handle: 'alice',
      displayName: 'Alice',
      avatarUrl: null,
    },
  ]),
}));

vi.mock('@/modules/document/api/document-api', () => ({
  documentApi: {
    getList: vi.fn(async () => ({
      data: [
        {
          id: 'doc-cuid-1',
          shortId: 'D17',
          title: '验收门禁设计',
          status: 'published',
        },
      ],
      meta: { page: 1, pageSize: 5, total: 1, totalPages: 1 },
    })),
  },
}));

function renderSuggestHook(options: Parameters<typeof useEntityRefSuggestions>[0]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return renderHook(() => useEntityRefSuggestions(options), { wrapper });
}

describe('useEntityRefSuggestions', () => {
  it('成员与文档候选混排同源（成员在前）', async () => {
    const { result } = renderSuggestHook({
      query: '',
      enabled: true,
      projectId: 'proj-1',
    });
    await vi.waitFor(() => {
      expect(result.current.candidates.length).toBe(2);
    });
    expect(result.current.candidates[0]).toMatchObject({
      kind: 'member',
      handle: 'alice',
    });
    expect(result.current.candidates[1]).toMatchObject({
      kind: 'document',
      id: 'doc-cuid-1',
      shortId: 'D17',
      title: '验收门禁设计',
    });
  });

  it('enabled=false 时不取数', () => {
    const { result } = renderSuggestHook({ query: '', enabled: false });
    expect(result.current.candidates).toEqual([]);
  });
});

describe('buildInsertText', () => {
  const member: EntityRefCandidate = {
    kind: 'member',
    id: 'm1',
    handle: 'alice',
    displayName: 'Alice',
    avatarUrl: null,
    memberType: 'human',
  };
  const docWithShortId: EntityRefCandidate = {
    kind: 'document',
    id: 'doc-cuid-1',
    shortId: 'D17',
    title: '验收门禁设计',
    status: 'published',
  };
  const docWithoutShortId: EntityRefCandidate = {
    kind: 'document',
    id: 'doc-cuid-2',
    shortId: null,
    title: '旧文档',
    status: 'draft',
  };

  it('成员插入 @handle（兼容提及解析链路）', () => {
    expect(buildInsertText(member)).toBe('@alice ');
  });

  it('文档 + projectCode + shortId → apm:// 短号链接', () => {
    expect(buildInsertText(docWithShortId, { projectCode: 'apm' })).toBe(
      '[验收门禁设计](apm://apm/doc/D17) ',
    );
  });

  it('无 projectCode 或无 shortId → 降级 cuid 稳定路由', () => {
    expect(buildInsertText(docWithShortId)).toBe(
      '[验收门禁设计](/app/documents/doc-cuid-1) ',
    );
    expect(buildInsertText(docWithoutShortId, { projectCode: 'apm' })).toBe(
      '[旧文档](/app/documents/doc-cuid-2) ',
    );
  });
});
