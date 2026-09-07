/**
 * 运行事件流 —— 相对时间戳 + 类型图标 + 内容（文本走 Markdown）+ 右侧耗时，
 * 顶部搜索框 + 类型过滤 chips；条目可点选，选中后由外层渲染右侧详情面板。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  BookOpen,
  Bot,
  Brain,
  CheckCircle2,
  ChevronRight,
  Coins,
  FilePenLine,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  SquareTerminal,
  User,
  Wrench,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MarkdownView } from '@/shared/components/markdown-view';
import {
  formatDurationMs,
  formatOffset,
  summarizeEntryKinds,
  type RunEventEntry,
  type RunEventKind,
} from './run-details-format';

/** 按工具名关键词取图标（Bash/Write/Skill…），未知工具回退扳手 */
function resolveToolIcon(title?: string): LucideIcon {
  const name = (title ?? '').toLowerCase();
  if (name.includes('bash') || name.includes('command')) return SquareTerminal;
  if (name.includes('write') || name.includes('edit') || name.includes('patch')) return FilePenLine;
  if (name.includes('skill')) return Sparkles;
  return Wrench;
}

const KIND_ICON: Record<RunEventKind, LucideIcon> = {
  user: User,
  prompt: Send,
  context: BookOpen,
  assistant: Bot,
  thinking: Brain,
  tool: Wrench,
  file: FilePenLine,
  usage: Coins,
  result: CheckCircle2,
  error: XCircle,
  approval: ShieldCheck,
  status: Activity,
};

const KIND_ICON_CLASS: Record<RunEventKind, string> = {
  user: 'bg-accent-purple-light text-accent-purple',
  prompt: 'bg-accent-purple-light text-accent-purple',
  context: 'bg-accent-blue-light text-accent-blue',
  assistant: 'bg-accent-green-light text-accent-green',
  thinking: 'bg-accent-blue-light text-accent-blue',
  tool: 'bg-accent-blue-light text-accent-blue',
  file: 'bg-accent-green-light text-accent-green',
  usage: 'bg-accent-orange-light text-accent-orange',
  result: 'bg-muted/60 text-content-text-secondary',
  error: 'bg-accent-red-light text-accent-red',
  approval: 'bg-accent-yellow-light text-accent-yellow',
  status: 'bg-muted/60 text-content-text-secondary',
};

/** 过滤 chips 文案键：status/assistant/user 归为「状态」不单列 */
const KIND_FILTER_KEYS: Partial<Record<RunEventKind, string>> = {
  prompt: 'runDetails.filter.prompt',
  context: 'runDetails.filter.context',
  tool: 'runDetails.filter.tool',
  file: 'runDetails.filter.file',
  thinking: 'runDetails.filter.thinking',
  usage: 'runDetails.filter.usage',
  result: 'runDetails.filter.result',
  approval: 'runDetails.filter.approval',
  error: 'runDetails.filter.error',
};

function Glyph({ icon: Icon }: { icon: LucideIcon }) {
  return <Icon className="size-3.5" />;
}

function EntryIcon({ entry }: { entry: RunEventEntry }) {
  // 小写查找后经 prop 传入（渲染期禁止大写局部组件变量）
  const icon =
    entry.kind === 'tool' ? resolveToolIcon(entry.title) : KIND_ICON[entry.kind];
  return (
    <span
      className={cn(
        'flex size-6 shrink-0 items-center justify-center rounded-lg',
        KIND_ICON_CLASS[entry.kind],
      )}
    >
      <Glyph icon={icon} />
    </span>
  );
}

function EntryBody({ entry }: { entry: RunEventEntry }) {
  const { t } = useTranslation();
  const isProse =
    entry.kind === 'user' ||
    entry.kind === 'prompt' ||
    entry.kind === 'assistant' ||
    entry.kind === 'thinking';

  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 text-xs font-medium text-content-text">
        {entry.kind === 'tool' ? (
          <>
            {/* 工具/命令行：mono + >_ 前缀（对照设计稿 Bash 行） */}
            <span className="select-none text-content-text-muted">&gt;_</span>
            <span className="truncate font-mono text-content-text-secondary">
              {entry.title}
            </span>
            {!entry.text ? (
              <span className="font-normal text-content-text-muted">
                {t('runDetails.event.tool')}
              </span>
            ) : null}
          </>
        ) : (
          <span className="text-content-text-secondary">
            {t(`runDetails.event.${entry.kind}`)}
          </span>
        )}
      </p>
      {entry.text && entry.kind !== 'tool' ? (
        isProse ? (
          <MarkdownView content={entry.text} className="mt-1 text-xs" />
        ) : (
          <p className="mt-0.5 truncate font-mono text-11 text-content-text-muted">
            {entry.text}
          </p>
        )
      ) : null}
    </div>
  );
}

export function RunEventList({
  entries,
  windowStart,
  selectedId,
  onSelect,
  className,
}: {
  entries: RunEventEntry[];
  windowStart?: string;
  selectedId?: string | null;
  onSelect?: (entry: RunEventEntry | null) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<RunEventKind | null>(null);

  const kindCounts = useMemo(() => summarizeEntryKinds(entries), [entries]);

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    return entries.filter((entry) => {
      if (kindFilter && entry.kind !== kindFilter) return false;
      if (!keyword) return true;
      return (
        entry.title?.toLowerCase().includes(keyword) ||
        entry.text?.toLowerCase().includes(keyword)
      );
    });
  }, [entries, search, kindFilter]);

  const selectable = (entry: RunEventEntry) =>
    !!(entry.detail?.input || entry.detail?.output);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      {/* 工具栏单行：搜索 + 步骤数 + 右对齐类型过滤 chips */}
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 py-2.5">
        <div className="relative w-64 max-w-full">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-content-text-muted" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t('runDetails.searchPlaceholder')}
            className="pl-8 text-xs"
          />
        </div>
        <span className="shrink-0 whitespace-nowrap text-11 text-content-text-muted">
          {t('runDetails.stepCount', { count: filtered.length })}
        </span>
        {kindCounts.length > 0 ? (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-1">
            {kindCounts.map(({ kind, count }) => {
              const active = kindFilter === kind;
              return (
                <button
                  key={kind}
                  type="button"
                  onClick={() => setKindFilter(active ? null : kind)}
                  className={cn(
                    'flex items-center gap-1 rounded px-1.5 py-0.5 text-11 transition-colors',
                    active
                      ? cn('font-medium', KIND_ICON_CLASS[kind])
                      : 'text-content-text-muted hover:bg-muted/60 hover:text-content-text-secondary',
                  )}
                >
                  {KIND_FILTER_KEYS[kind]
                    ? t(KIND_FILTER_KEYS[kind] as string)
                    : t(`runDetails.event.${kind}`)}
                  <span className="font-mono">{count}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
        <ScrollArea className="h-full w-full">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-xs text-content-text-muted">
              {t('runDetails.empty')}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((entry) => {
                const selected = selectedId === entry.id;
                const clickable = selectable(entry) && !!onSelect;
                return (
                  <li
                    key={entry.id}
                    className={cn(
                      'group flex items-start gap-2.5 border-l-2 px-2 py-2.5 transition-colors',
                      selected
                        ? 'border-l-primary bg-primary/5'
                        : 'border-l-transparent hover:bg-muted/30',
                      clickable && 'cursor-pointer',
                    )}
                    onClick={() => {
                      if (!clickable) return;
                      onSelect?.(selected ? null : entry);
                    }}
                  >
                    {windowStart && entry.at ? (
                      <span className="w-12 shrink-0 pt-1 font-mono text-10 text-content-text-muted">
                        {formatOffset(entry.at, windowStart)}
                      </span>
                    ) : (
                      <span className="w-12 shrink-0" />
                    )}
                    <EntryIcon entry={entry} />
                    <EntryBody entry={entry} />
                    {entry.durationMs != null ? (
                      <span className="shrink-0 pt-1 text-10 text-content-text-muted">
                        {formatDurationMs(entry.durationMs)}
                      </span>
                    ) : null}
                    {clickable ? (
                      <ChevronRight
                        className={cn(
                          'size-3.5 shrink-0 text-content-text-muted/40 transition-colors group-hover:text-content-text-muted',
                          selected && 'text-primary',
                        )}
                      />
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
