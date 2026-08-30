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
}

export interface SearchResponse {
  items: SearchHit[];
  total: number;
}

export const searchApi = {
  search: (params: { q: string; types?: SearchResultType[]; limit?: number }) =>
    api.get<SearchResponse>('/search', params),
};
