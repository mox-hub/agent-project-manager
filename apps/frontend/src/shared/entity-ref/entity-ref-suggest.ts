'use client';

import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { documentApi } from '@/modules/document/api/document-api';
import { suggestMentions } from '@/modules/team-member/api/team-member-api';

/**
 * 统一实体引用子系统——候选源（契约与文档知识层 v2 纪要 §13.3）。
 *
 * 同一触发符 `@`、同一候选列表（成员/文档混排同源）、同一插入语法；
 * 渲染侧与 apm-ref-chip 共用同一 chip 形态与 preview card。
 * @人 = apm:// 引用中 kind=member 的语法糖：成员插入 `@handle `（兼容
 * 后端提及解析链路），文档插入 markdown 链接（apm:// 短号形态优先，
 * 列表契约未带 shortId 时降级 cuid 路由——两者都指向稳定标识）。
 */

export interface MemberCandidate {
  kind: 'member';
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  memberType: string;
}

export interface DocumentCandidate {
  kind: 'document';
  id: string;
  shortId: string | null;
  title: string;
  status: string;
}

export type EntityRefCandidate = MemberCandidate | DocumentCandidate;

export interface EntityRefSuggestOptions {
  query: string;
  enabled: boolean;
  /** 文档候选搜索范围（不传则不出文档候选） */
  projectId?: string;
  /** apm:// 短号链接的项目代码（不传则文档插入降级 cuid 路由） */
  projectCode?: string;
  memberLimit?: number;
}

export function useEntityRefSuggestions(options: EntityRefSuggestOptions) {
  const { query, enabled, projectId, memberLimit = 6 } = options;

  const membersQuery = useQuery({
    queryKey: ['entity-ref-members', query],
    queryFn: () => suggestMentions(query, memberLimit),
    enabled,
    staleTime: 30 * 1000,
  });

  const documentsQuery = useQuery({
    queryKey: ['entity-ref-documents', query, projectId],
    queryFn: () =>
      documentApi.getList({ q: query || undefined, projectId, pageSize: 5 }),
    enabled: enabled && !!projectId,
    staleTime: 30 * 1000,
  });

  const candidates = useMemo<EntityRefCandidate[]>(() => {
    const members: EntityRefCandidate[] = (membersQuery.data ?? [])
      .filter((m) => m.handle)
      .map((m) => ({
        kind: 'member' as const,
        id: m.id,
        handle: m.handle,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        memberType: m.type,
      }));
    const page = documentsQuery.data;
    const rawDocs = Array.isArray(page) ? page : page?.data;
    const documents: EntityRefCandidate[] = (rawDocs ?? []).map((d) => ({
      kind: 'document' as const,
      id: d.id,
      // 列表契约暂无 shortId；带上后 buildInsertText 自动切 apm:// 形态
      shortId: (d as { shortId?: string | null }).shortId ?? null,
      title: d.title,
      status: d.status,
    }));
    return [...members, ...documents];
  }, [membersQuery.data, documentsQuery.data]);

  return {
    candidates,
    isLoading: membersQuery.isLoading || documentsQuery.isLoading,
  };
}

/** 插入文本构造：成员 `@handle `；文档 markdown 链接（apm:// 优先）。 */
export function buildInsertText(
  candidate: EntityRefCandidate,
  ctx: { projectCode?: string } = {},
): string {
  if (candidate.kind === 'member') {
    return `@${candidate.handle} `;
  }
  if (ctx.projectCode && candidate.shortId) {
    return `[${candidate.title}](apm://${ctx.projectCode}/doc/${candidate.shortId}) `;
  }
  return `[${candidate.title}](/app/documents/${candidate.id}) `;
}
