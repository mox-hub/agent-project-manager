import { useQuery } from '@tanstack/react-query';
import { searchApi, type SearchResultType } from '../api/search-api';

/** 全局搜索（提案契约 v1）。q 为空或过短时不发起请求。 */
export function useSearch(query: string, type: SearchResultType | 'all' = 'all') {
  const q = query.trim();
  return useQuery({
    queryKey: ['search', q, type],
    queryFn: () =>
      searchApi.search({
        q,
        types: type === 'all' ? undefined : [type],
        limit: 50,
      }),
    enabled: q.length > 0,
    staleTime: 30_000,
  });
}
