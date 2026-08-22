/**
 * SearchPage - 全局搜索页面
 *
 * 还原参考: refers/APM/src/app/pages/SearchPage.tsx
 * 形态: 搜索栏 + 类型过滤 chips + 按类型分组结果 + 键盘导航（↑↓/Enter/Esc）
 *
 * ⚠️ MOCK DATA：当前搜索结果来自静态示例数据（无真实 API），
 * 顶层容器标记 data-mock="true"，接入真实搜索 API 后移除。
 */

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

// ⚠️ MOCK DATA ─────────────────────────────────────────────────────────────────
type SearchResultType = 'task' | 'bug' | 'document' | 'project' | 'milestone' | 'acceptance';

interface SearchResult {
  id: string;
  type: SearchResultType;
  title: string;
  subtitle: string;
  path: string;
  updatedAt: string;
}

const ALL_RESULTS: SearchResult[] = [
  // Tasks
  { id: 't1', type: 'task',       title: 'Implement OAuth2 login',         subtitle: 'AgentPM Core · In Progress',    path: '/app/tasks',       updatedAt: '2026-07-22' },
  { id: 't2', type: 'task',       title: 'Optimize dashboard load time',   subtitle: 'AgentPM Core · Done',           path: '/app/tasks',       updatedAt: '2026-07-20' },
  { id: 't3', type: 'task',       title: 'Integrate Stripe checkout',      subtitle: 'Payment Module · Blocked',      path: '/app/tasks',       updatedAt: '2026-07-21' },
  { id: 't4', type: 'task',       title: 'Add rate limiting middleware',   subtitle: 'Infrastructure · Todo',         path: '/app/tasks',       updatedAt: '2026-07-22' },
  { id: 't5', type: 'task',       title: 'Responsive UI for mobile',       subtitle: 'Frontend · Failed',             path: '/app/tasks',       updatedAt: '2026-07-19' },
  { id: 't6', type: 'task',       title: 'Implement full-text search',     subtitle: 'Search Module · Done',          path: '/app/tasks',       updatedAt: '2026-07-18' },
  { id: 't7', type: 'task',       title: 'Real-time notifications via WS', subtitle: 'Notifications · In Review',    path: '/app/tasks',       updatedAt: '2026-07-22' },
  { id: 't8', type: 'task',       title: 'CSV/Excel export feature',       subtitle: 'Reports · Todo',                path: '/app/tasks',       updatedAt: '2026-07-21' },
  // Bugs
  { id: 'b1', type: 'bug',        title: 'Safari localStorage token leak', subtitle: 'P0 · Auth Module · Open',      path: '/app/bugs',        updatedAt: '2026-07-22' },
  { id: 'b2', type: 'bug',        title: 'Dashboard crashes on IE11',      subtitle: 'P2 · Frontend · Resolved',     path: '/app/bugs',        updatedAt: '2026-07-19' },
  { id: 'b3', type: 'bug',        title: 'CSV export encoding broken',     subtitle: 'P1 · Reports · In Progress',   path: '/app/bugs',        updatedAt: '2026-07-21' },
  // Documents
  { id: 'd1', type: 'document',   title: 'OAuth2 Integration Spec',        subtitle: 'Specification · Published',    path: '/app/documents',   updatedAt: '2026-07-15' },
  { id: 'd2', type: 'document',   title: 'API Rate Limiting Design',       subtitle: 'Design · Draft',               path: '/app/documents',   updatedAt: '2026-07-20' },
  { id: 'd3', type: 'document',   title: 'Mobile UX Guidelines',           subtitle: 'Guide · Published',            path: '/app/documents',   updatedAt: '2026-07-18' },
  { id: 'd4', type: 'document',   title: 'Q3 Sprint Retrospective',        subtitle: 'Retrospective · Published',    path: '/app/documents',   updatedAt: '2026-07-12' },
  // Projects
  { id: 'p1', type: 'project',    title: 'AgentPM Platform',               subtitle: '24 tasks · on track',          path: '/app/projects/p1', updatedAt: '2026-07-20' },
  { id: 'p2', type: 'project',    title: 'Payment Integration',            subtitle: '18 tasks · at risk',           path: '/app/projects/p2', updatedAt: '2026-07-20' },
  { id: 'p3', type: 'project',    title: 'AI Code Reviewer',               subtitle: '12 tasks · on track',          path: '/app/projects/p3', updatedAt: '2026-07-20' },
  // Milestones
  { id: 'm1', type: 'milestone',  title: 'Phase 1: Core Features',        subtitle: 'AgentPM Core · On Track',      path: '/app/projects/p1/milestones', updatedAt: '2026-07-20' },
  { id: 'm2', type: 'milestone',  title: 'Phase 2: Growth',               subtitle: 'AgentPM Core · Upcoming',      path: '/app/projects/p1/milestones', updatedAt: '2026-07-20' },
  { id: 'm3', type: 'milestone',  title: 'v1.0 Release',                  subtitle: 'AgentPM Core · At Risk',       path: '/app/projects/p1/milestones', updatedAt: '2026-07-18' },
  // Acceptances
  { id: 'ac1', type: 'acceptance', title: 'User Auth Flow Acceptance',     subtitle: 'In Progress · 5/8 passed',     path: '/app/acceptance/ac1', updatedAt: '2026-07-22' },
  { id: 'ac2', type: 'acceptance', title: 'Dashboard Performance Acceptance', subtitle: 'Passed · 6/6 criteria',    path: '/app/acceptance/ac2', updatedAt: '2026-07-20' },
];

const RECENT_SEARCHES = ['OAuth2', 'rate limiting', 'mobile', 'stripe'];

// 模块加载时取一次当前时间，避免渲染期调用 impure Date.now()
const NOW = Date.now();

const TYPE_CONFIG: Record<SearchResultType, { label: string; icon: React.ElementType; color: string }> = {
  task:       { label: 'Task',       icon: CheckSquare, color: 'text-blue-500'    },
  bug:        { label: 'Bug',        icon: Bug,         color: 'text-red-500'     },
  document:   { label: 'Document',   icon: FileText,    color: 'text-amber-500'   },
  project:    { label: 'Project',    icon: Folder,      color: 'text-violet-500'  },
  milestone:  { label: 'Milestone',  icon: Target,      color: 'text-emerald-500' },
  acceptance: { label: 'Acceptance', icon: ShieldCheck, color: 'text-primary'     },
};

const TYPE_ORDER: SearchResultType[] = ['task', 'bug', 'document', 'project', 'milestone', 'acceptance'];

// ── Page ─────────────────────────────────────────────────────────────────────

export function SearchPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<SearchResultType | 'all'>('all');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const results = query.trim()
    ? ALL_RESULTS.filter(r => {
        if (typeFilter !== 'all' && r.type !== typeFilter) return false;
        const q = query.toLowerCase();
        return r.title.toLowerCase().includes(q) || r.subtitle.toLowerCase().includes(q);
      })
    : [];

  // Group results by type
  const grouped = TYPE_ORDER.reduce<Record<string, SearchResult[]>>((acc, type) => {
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
    <div className="flex flex-col h-full overflow-auto bg-background" data-mock="true" data-ai-page="search.search.main">
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
              className="flex h-12 w-full rounded-md border border-input bg-input-background px-3 pl-10 py-1 text-base transition-[color,background-color,border-color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"
              data-ai-component="search.input"
              data-ai-role="input"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                data-ai-action="search.clear"
              >
                <X className="w-4 h-4" />
              </button>
            )}
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
