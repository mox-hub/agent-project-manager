/**
 * 运行事件流 —— 相对时间戳 + 类型图标 + 内容（文本走 Markdown）+ 右侧耗时，
 * 顶部搜索框过滤本次运行（对照运行详情设计稿下部）。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Activity,
  Bot,
  Brain,
  CheckCircle2,
  FilePenLine,
  Search,
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
  assistant: Bot,
  thinking: Brain,
  tool: Wrench,
  result: CheckCircle2,
  error: XCircle,
  approval: ShieldCheck,
  status: Activity,
};

const KIND_ICON_CLASS: Record<RunEventKind, string> = {
  user: 'bg-accent-purple-light text-accent-purple',
  assistant: 'bg-accent-green-light text-accent-green',
  thinking: 'bg-accent-blue-light text-accent-blue',
  tool: 'bg-accent-blue-light text-accent-blue',
  result: 'bg-muted/60 text-content-text-secondary',
  error: 'bg-accent-red-light text-accent-red',
  approval: 'bg-accent-yellow-light text-accent-yellow',
  status: 'bg-muted/60 text-content-text-secondary',
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
    entry.kind === 'user' || entry.kind === 'assistant' || entry.kind === 'thinking';

  return (
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1.5 text-xs font-medium text-content-text">
        {entry.kind === 'tool' ? (
          <>
            <span className="text-content-text-secondary">{entry.title}</span>
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
      {entry.text ? (
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
  className,
}: {
  entries: RunEventEntry[];
  windowStart?: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return entries;
    return entries.filter(
      (entry) =>
        entry.title?.toLowerCase().includes(keyword) ||
        entry.text?.toLowerCase().includes(keyword),
    );
  }, [entries, search]);

  return (
    <div className={cn('flex min-h-0 flex-col', className)}>
      <div className="relative shrink-0 px-4 pb-2 pt-3">
        <Search className="absolute left-6.5 top-1/2 size-3.5 -translate-y-1/2 text-content-text-muted" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('runDetails.searchPlaceholder')}
          className="pl-8 text-xs"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
        <ScrollArea className="h-full w-full">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-xs text-content-text-muted">
              {t('runDetails.empty')}
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2.5 px-2 py-2.5">
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
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
