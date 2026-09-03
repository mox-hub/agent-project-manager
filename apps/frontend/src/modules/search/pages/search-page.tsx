/**
 * SearchPage - 全局搜索页面
 *
 * 还原参考: refers/APM/src/app/pages/SearchPage.tsx
 * 形态: 搜索栏 + 类型过滤 chips + 按类型分组结果 + 键盘导航（↑↓/Enter/Esc）
 *
 * 数据：GET /search（契约提案 v1，docs/design/api-contract-proposals.md）；
 * dev + VITE_API_MOCK=on 时由 msw handler 提供演示数据，后端实现同路由后自动切真。
 */

import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search as SearchIcon, CheckSquare, Bug, FileText, Folder,
  Target, ShieldCheck, Clock, ArrowUpRight, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from '@/hooks/useTranslation';
import { useSearch } from '../hooks/use-search';
import type { SearchResultType, SearchHit } from '../api/search-api';

// ⚠️ MOCK DATA ─────────────────────────────────────────────────────────────────

// 模块加载时取一次当前时间，避免渲染期调用 impure Date.now()
const NOW = Date.now();

const TYPE_CONFIG: Record<SearchResultType, { label: string; icon: React.ElementType; color: string }> = {
  task:       { label: 'Task',       icon: CheckSquare, color: 'text-accent-blue'   },
  bug:        { label: 'Bug',        icon: Bug,         color: 'text-accent-red'    },
  document:   { label: 'Document',   icon: FileText,    color: 'text-accent-yellow' },
  project:    { label: 'Project',    icon: Folder,      color: 'text-accent-purple' },
  milestone:  { label: 'Milestone',  icon: Target,      color: 'text-accent-green'  },
  acceptance: { label: 'Acceptance', icon: ShieldCheck, color: 'text-primary'       },
};

const TYPE_ORDER: SearchResultType[] = ['task', 'bug', 'document', 'project', 'milestone', 'acceptance'];

// 搜索建议种子（纯 UI 引导，非数据；历史记录可后续接 localStorage）
const RECENT_SEARCHES = ['OAuth2', 'rate limiting', 'mobile', 'stripe'];

// ── Page ─────────────────────────────────────────────────────────────────────

export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SearchResultType | 'all'>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // 250ms 防抖后走 /search（msw mock 或真实后端）
  const [debouncedQuery, setDebouncedQuery] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 250);
    return () => clearTimeout(timer);
  }, [query]);
  const { data, isFetching } = useSearch(debouncedQuery, typeFilter);
  const results = data?.items ?? [];

  // Group results by type
  const grouped = TYPE_ORDER.reduce<Record<string, SearchHit[]>>((acc, type) => {
    const group = results.filter(r => r.type === type);
    if (group.length) acc[type] = group;
    return acc;
  }, {});

  const flatResults = Object.values(grouped).flat();

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, flatResults.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && flatResults[activeIndex]) navigate(flatResults[activeIndex].path);
    if (e.key === 'Escape') setQuery('');
  };

  const relativeDate = (d: string) => {
    const diff = NOW - new Date(d).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return 'today';
    if (days === 1) return 'yesterday';
    return `${days}d ago`;
  };

  return (
    <div className="flex flex-col h-full overflow-auto bg-background" data-ai-page="search.search.main">
      {/* Search bar */}
      <div className="px-6 py-5 border-b border-border shrink-0">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              ref={inputRef}
              placeholder={t('shell.searchPlaceholder') || 'Search everything...'}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
              onKeyDown={handleKeyDown}
              className="flex h-12 w-full rounded-md border border-input bg-input-background px-3 pl-10 py-1 text-base transition-[color,background-color,border-color,box-shadow] outline-hidden placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
              data-ai-component="search.input"
              data-ai-role="input"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  onClick={() => setQuery('')}
                  className="text-muted-foreground hover:text-foreground"
                  data-ai-action="search.clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <FavoriteToggle label={t('nav.search') || 'Search'} />
            </div>
          </div>

          {/* Recent searches */}
          {!query && RECENT_SEARCHES.length > 0 && (
            <div className="flex items-center gap-2 mt-3">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              {RECENT_SEARCHES.map(s => (
                <button
                  key={s}
                  onClick={() => setQuery(s)}
                  className="text-xs text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted px-2.5 py-1 rounded-full transition-colors"
                  data-ai-action="search.recent"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Type filters */}
          {query && (
            <div className="flex items-center gap-1.5 mt-3 flex-wrap">
              <Button
                variant={typeFilter === 'all' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTypeFilter('all')}
                data-ai-action="search.filter"
              >
                All
              </Button>
              {TYPE_ORDER.map(type => {
                const cfg = TYPE_CONFIG[type];
                const Icon = cfg.icon;
                const count = results.filter(r => r.type === type).length;
                return (
                  <Button
                    key={type}
                    variant={typeFilter === type ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setTypeFilter(type)}
                    data-ai-action="search.filter"
                  >
                    <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                    {cfg.label}
                    {count > 0 && <Badge variant="outline" className="ml-0.5 px-1 text-10">{count}</Badge>}
                  </Button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto p-6">
          {query.length === 0 ? (
            <div className="text-center py-16">
              <SearchIcon className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground">{t('help.searchHint') || 'Search across tasks, bugs, documents, projects, milestones and acceptances'}</p>
            </div>
          ) : isFetching ? (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground">Searching…</p>
            </div>
          ) : flatResults.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-sm text-muted-foreground">未找到匹配结果</p>
            </div>
          ) : (
            <div className="space-y-5">
              {TYPE_ORDER.map(type => {
                const group = grouped[type];
                if (!group) return null;
                const cfg = TYPE_CONFIG[type];
                const Icon = cfg.icon;
                return (
                  <div key={type}>
                    <div className="flex items-center gap-2 mb-2">
                      <Icon className={cn('w-3.5 h-3.5', cfg.color)} />
                      <span className="text-10 font-semibold text-muted-foreground uppercase tracking-wider">{cfg.label}</span>
                      <span className="text-10 text-muted-foreground/50">({group.length})</span>
                    </div>
                    <div className="space-y-0.5">
                      {group.map((r, groupIdx) => {
                        // 计算全局扁平索引：前序分组的结果总数 + 组内偏移
                        const prefixCount = TYPE_ORDER
                          .slice(0, TYPE_ORDER.indexOf(type))
                          .reduce((sum, t) => sum + (grouped[t]?.length ?? 0), 0);
                        const flatIdx = prefixCount + groupIdx;
                        const isActive = flatIdx === activeIndex;
                        return (
                          <button
                            key={r.id}
                            onClick={() => navigate(r.path)}
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left transition-colors',
                              isActive ? 'bg-muted/60' : 'hover:bg-muted/40'
                            )}
                            data-ai-action="search.open-result"
                          >
                            <Icon className={cn('w-4 h-4 shrink-0', cfg.color)} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{r.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{r.subtitle}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-10 text-muted-foreground/50">{relativeDate(r.updatedAt)}</span>
                              <ArrowUpRight className={cn('w-3.5 h-3.5', isActive ? 'text-muted-foreground' : 'text-muted-foreground/30')} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
