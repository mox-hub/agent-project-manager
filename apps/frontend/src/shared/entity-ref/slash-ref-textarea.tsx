'use client';

/**
 * SlashRefTextarea - `/` 触发全局实体引用补全的文本域（CAP-A-23）。
 *
 * 实现 MarkdownInputProps 协议（value/onChange/placeholder/rows/autoFocus/
 * onKeyDown/className/ref），作为 MarkdownEditor 默认输入件、MarkdownLiveEditor
 * 活跃块输入件。光标前出现 `/query` 词元（行首或空白符之后，URL 中的斜杠不误触发）
 * 时弹出统一候选弹层：任务/Bug/文档走 searchApi（命中带现成 apmRef 引用串）、
 * 成员走 suggestMentions；↑↓/Enter/Tab/Esc 键盘导航，选中以
 * `[标题](apm://…)`（成员 `@handle ` 语法糖）插入并恢复光标，渲染侧由
 * apm-ref-chip 呈现为胶囊 + hover 预览。菜单关闭时按键语义完全透传
 * （评论 mod+Enter 提交、描述区 Esc 失焦不受影响）。
 */
import { Button } from '@/components/ui/button';
import {
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
  type Ref,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import { AutoSizeTextarea } from '@/components/ui/property-panel';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';
import { suggestMentions } from '@/modules/team-member/api/team-member-api';
import {
  searchApi,
  type SearchHit,
  type SearchResultType,
} from '@/modules/search/api/search-api';
import { getEntityIcon } from '@/shared/entity-icons/entity-icons';

/** `/` 词元：行首或空白符后的斜杠 + 非空白非斜杠串（捕获组 = query） */
const TOKEN_RE = /(?:^|\s)\/([^\s/]*)$/;

const FILTERS = [
  { key: 'all', labelKey: 'entityRef.slash.filterAll' },
  { key: 'task', labelKey: 'entityRef.slash.filterTask' },
  { key: 'bug', labelKey: 'entityRef.slash.filterBug' },
  { key: 'document', labelKey: 'entityRef.slash.filterDocument' },
  { key: 'member', labelKey: 'entityRef.slash.filterMember' },
] as const;

type SlashRefFilter = (typeof FILTERS)[number]['key'];

type HitCandidate = { kind: 'hit'; hit: SearchHit };
type MemberCandidate = {
  kind: 'member';
  id: string;
  handle: string;
  displayName: string;
  avatarUrl: string | null;
  memberType: string;
};
type SlashCandidate = HitCandidate | MemberCandidate;

const HIT_ICON: Record<SearchResultType, ComponentType<{ className?: string }>> = {
  task: getEntityIcon('issue').icon,
  bug: getEntityIcon('bug').icon,
  document: getEntityIcon('document').icon,
  project: getEntityIcon('project').icon,
  milestone: getEntityIcon('milestone').icon,
  acceptance: getEntityIcon('acceptance').icon,
};

/** markdown 链接标题不允许裸 ]：标题里的方括号剥掉，防链接结构被标题撑破 */
const sanitizeTitle = (title: string) => title.replace(/[[\]]/g, '');

export function buildSlashInsertText(candidate: SlashCandidate): string {
  if (candidate.kind === 'member') {
    return `@${candidate.handle} `;
  }
  // apmRef 由后端产出（短号 + 项目代码齐备才非 null）；无引用串的命中
  // 在候选侧已过滤，此处是类型收窄的兜底
  const href = candidate.hit.apmRef ?? candidate.hit.path;
  return `[${sanitizeTitle(candidate.hit.title)}](${href}) `;
}

export interface SlashRefTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  autoFocus?: boolean;
  onKeyDown?: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  className?: string;
  ref?: Ref<HTMLTextAreaElement>;
  style?: React.CSSProperties;
}

export function SlashRefTextarea({
  value,
  onChange,
  placeholder,
  rows = 3,
  autoFocus,
  onKeyDown,
  className,
  ref,
  style,
}: SlashRefTextareaProps) {
  const { t } = useTranslation();
  const innerRef = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [filter, setFilter] = useState<SlashRefFilter>('all');
  const [activeIndex, setActiveIndex] = useState(0);

  useImperativeHandle(ref, () => innerRef.current!, []);

  const searchEnabled = query !== null && query !== '' && filter !== 'member';
  const membersEnabled =
    query !== null &&
    query !== '' &&
    (filter === 'all' || filter === 'member');

  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['slash-ref-search', query, filter],
    queryFn: ({ signal }) =>
      searchApi.search(
        {
          q: query ?? '',
          types:
            filter === 'task' || filter === 'bug' || filter === 'document'
              ? [filter]
              : undefined,
          limit: 8,
        },
        { signal },
      ),
    enabled: searchEnabled,
    staleTime: 15 * 1000,
  });

  const { data: membersData, isLoading: membersLoading } = useQuery({
    queryKey: ['slash-ref-members', query],
    queryFn: () => suggestMentions(query ?? '', 4),
    enabled: membersEnabled,
    staleTime: 15 * 1000,
  });

  const items = useMemo<SlashCandidate[]>(() => {
    if (query === null) return [];
    const members: SlashCandidate[] = (membersData ?? [])
      .filter((m) => m.handle)
      .map((m) => ({
        kind: 'member' as const,
        id: m.id,
        handle: m.handle,
        displayName: m.displayName,
        avatarUrl: m.avatarUrl,
        memberType: m.type,
      }));
    if (filter === 'member') return members;
    // 无 apmRef 的命中（如未绑定项目的 inbox 工单、缺短号存量行）不进候选：
    // 全局引用系统只产稳定引用，不降级插裸路径链接
    const hits: SlashCandidate[] = (searchData?.items ?? [])
      .filter((h) => h.apmRef)
      .map((hit) => ({ kind: 'hit' as const, hit }));
    return [...members, ...hits];
  }, [query, filter, searchData, membersData]);

  const detectToken = (text: string, caret: number) => {
    const upToCaret = text.slice(0, caret);
    const match = TOKEN_RE.exec(upToCaret);
    setQuery(match ? match[1] : null);
    setActiveIndex(0);
  };

  /** 词元里 `/` 的绝对位置（match[0] 前导空白符不参与替换） */
  const tokenStart = (text: string, caret: number): number | null => {
    const match = TOKEN_RE.exec(text.slice(0, caret));
    if (!match) return null;
    return match.index + match[0].length - match[1].length - 1;
  };

  const applySelection = (candidate: SlashCandidate) => {
    const el = innerRef.current;
    const caret = el?.selectionStart ?? value.length;
    const start = tokenStart(value, caret);
    if (start === null) return;
    const inserted = buildSlashInsertText(candidate);
    const next = value.slice(0, start) + inserted + value.slice(caret);
    onChange(next);
    setQuery(null);
    requestAnimationFrame(() => {
      const pos = start + inserted.length;
      el?.focus();
      el?.setSelectionRange(pos, pos);
    });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (query !== null) {
      if (e.key === 'ArrowDown' && items.length > 0) {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % items.length);
        return;
      }
      if (e.key === 'ArrowUp' && items.length > 0) {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
        return;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && items.length > 0) {
        e.preventDefault();
        applySelection(items[activeIndex]);
        return;
      }
      if (e.key === 'Escape') {
        // 菜单开着时 Esc 只关菜单，不冒泡（防误关所在对话框/描述块）
        e.preventDefault();
        e.stopPropagation();
        setQuery(null);
        return;
      }
    }
    onKeyDown?.(e);
  };

  const menuVisible = query !== null;
  const showHintRow = menuVisible && (query ?? '') === '';
  const isLoading = searchLoading || membersLoading;

  return (
    <div className="relative">
      <AutoSizeTextarea
        ref={innerRef}
        value={value}
        rows={rows}
        autoFocus={autoFocus}
        placeholder={placeholder}
        onChange={(e) => {
          onChange(e.target.value);
          detectToken(e.target.value, e.target.selectionStart ?? 0);
        }}
        onClick={(e) =>
          detectToken(
            e.currentTarget.value,
            e.currentTarget.selectionStart ?? 0,
          )
        }
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // 延迟关闭以允许点击列表项
          setTimeout(() => setQuery(null), 150);
        }}
        className={className}
        style={style}
      />
      {menuVisible && (
        <div className="absolute inset-x-0 top-full z-modal mt-1 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-xs">
          <div className="flex items-center gap-0.5 overflow-x-auto border-b border-border/60 px-1.5 py-1">
            {FILTERS.map((f) => (
              <Button variant="ghost"
                key={f.key}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setFilter(f.key);
                  setActiveIndex(0);
                }}
                className={cn(
                  'shrink-0 rounded-full px-2 py-0.5 text-2xs transition-colors',
                  filter === f.key
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/60',
                )}
              >
                {t(f.labelKey)}
              </Button>
            ))}
          </div>
          {showHintRow ? (
            <div className="px-2.5 py-2 text-xs text-muted-foreground">
              {t('entityRef.slash.hint')}
            </div>
          ) : items.length === 0 ? (
            <div className="px-2.5 py-2 text-xs text-muted-foreground">
              {isLoading ? t('entityRef.slash.searching') : t('entityRef.slash.empty')}
            </div>
          ) : (
            <ul className="max-h-56 overflow-y-auto py-1">
              {items.map((candidate, i) => (
                <li key={`${candidate.kind}-${candidate.kind === 'hit' ? candidate.hit.id : candidate.id}`}>
                  <Button variant="ghost"
                    type="button"
                    className={cn(
                      'flex w-full items-center gap-2 px-2 py-1.5 text-left text-sm',
                      i === activeIndex ? 'bg-accent-blue/10' : 'hover:bg-muted/60',
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      applySelection(candidate);
                    }}
                    onMouseEnter={() => setActiveIndex(i)}
                  >
                    {candidate.kind === 'member' ? (
                      <>
                        <MemberAvatar
                          member={{
                            type: candidate.memberType as 'human' | 'ai_agent',
                            displayName: candidate.displayName,
                            handle: candidate.handle,
                            avatarUrl: candidate.avatarUrl,
                            isOnline: false,
                          }}
                          size="xs"
                          showBadge={false}
                        />
                        <span className="truncate">{candidate.displayName}</span>
                        <span className="text-2xs truncate text-muted-foreground">
                          @{candidate.handle}
                        </span>
                      </>
                    ) : (
                      <>
                        {(() => {
                          const Icon = HIT_ICON[candidate.hit.type];
                          return <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
                        })()}
                        <span className="truncate">{candidate.hit.title}</span>
                        <span className="ml-auto shrink-0 truncate text-2xs text-muted-foreground">
                          {candidate.hit.subtitle}
                        </span>
                      </>
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
