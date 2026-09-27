import { api } from '@/infrastructure/api-client';

// 契约：docs/design/api-contract-proposals.md §1 Search（前端优先落地版：扁平 items，前端分组）
export type SearchResultType =
  | 'task'
  | 'bug'
  | 'document'
  | 'project'
  | 'milestone'
  | 'acceptance';

export interface SearchHit {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  path: string;
  updatedAt: string;
  /** 所属项目 ID（项目命中时为 null） */
  projectId: string | null;
  /**
   * apm:// 实体引用串（apm://{projectCode}/{kind}/{shortId}，全局引用系统
   * CAP-A-23 插入用）；缺 projectCode/shortId 时为 null——不自行拼装
   */
  apmRef: string | null;
}

export interface SearchResponse {
  items: SearchHit[];
  total: number;
}

export const searchApi = {
  search: (
    params: { q: string; types?: SearchResultType[]; limit?: number },
    options?: { signal?: AbortSignal },
  ) => api.get<SearchResponse>('/search', params, options),
};
