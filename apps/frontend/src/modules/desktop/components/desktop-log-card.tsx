/**
 * 本机服务日志面板（CAP-A-14 可观测性切片，桌面模式专属）。
 * desktop-main.log 尾部窗口的就地检索器：级别筛选+计数、搜索、复制、清空、
 * 跟随最新（自动轮询 + 贴底滚动）。web 模式渲染 null（与 LocalDaemonCard 同门槛）。
 */
import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, Copy, ScrollText, Search, Trash2 } from 'lucide-react';
import { isTauriAvailable } from '@/shared/types/electron-api';
import { useDesktopLogs, type LogLevelFilter } from '../hooks/use-desktop-logs';
import { SectionCard } from '@/components/ui/section-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from '@/components/ui/toast';

const LEVEL_FILTERS: LogLevelFilter[] = ['ALL', 'INFO', 'WARN', 'ERROR'];

const LEVEL_CLASS: Record<string, string> = {
  INFO: 'text-accent-blue',
  WARN: 'text-accent-yellow',
  ERROR: 'text-destructive',
  RAW: 'text-muted-foreground',
};

export function DesktopLogCard() {
  const { t } = useTranslation();
  const {
    snapshot,
    error,
    autoRefresh,
    setAutoRefresh,
    levelFilter,
    setLevelFilter,
    search,
    setSearch,
    filteredLines,
    copyToClipboard,
    clearLogs,
  } = useDesktopLogs();

  const listRef = useRef<HTMLDivElement>(null);

  // 跟随最新：新数据/切筛选时贴底；手动上滚查阅历史时暂停自动轮询的贴底感由开关控制
  useEffect(() => {
    if (autoRefresh && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [snapshot, autoRefresh, levelFilter, search]);

  if (!isTauriAvailable()) {
    return null;
  }

  const counts = snapshot?.counts;
  const total = snapshot?.lines.length ?? 0;
  const shown = filteredLines.length;

  const handleCopy = async () => {
    const ok = await copyToClipboard();
    if (ok) {
      toast(t('settings.desktopLogCopied'));
    } else {
      toast.error(t('settings.desktopLogCopyFailed'));
    }
  };

  const handleClear = async () => {
    await clearLogs();
    toast(t('settings.desktopLogCleared'));
  };

  const jumpToLatest = () => {
    setAutoRefresh(true);
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      }
    });
  };

  return (
    <SectionCard
      icon={ScrollText}
      iconColor="text-accent-purple"
      title={t('settings.desktopLogTitle')}
      description={t('settings.desktopLogDesc')}
      actions={
        <div className="flex items-center gap-1.5">
          <div className="mr-1 flex items-center gap-1.5">
            <Switch
              id="desktop-log-follow"
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <Label htmlFor="desktop-log-follow" className="text-xs text-muted-foreground">
              {t('settings.desktopLogFollow')}
            </Label>
          </div>
          <Button size="sm" variant="outline" onClick={() => void handleCopy()}>
            <Copy className="mr-1 size-3.5" />
            {t('settings.desktopLogCopy')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void handleClear()}>
            <Trash2 className="mr-1 size-3.5" />
            {t('settings.desktopLogClear')}
          </Button>
        </div>
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="relative min-w-52 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('settings.desktopLogSearch')}
            className="h-8 pl-8 text-xs"
          />
        </div>
        <div className="flex items-center gap-1">
          {LEVEL_FILTERS.map((level) => {
            const active = levelFilter === level;
            const count =
              level === 'ALL' ? total : (counts?.[level as keyof NonNullable<typeof counts>] ?? 0);
            return (
              <button
                key={level}
                type="button"
                aria-pressed={active}
                onClick={() => setLevelFilter(level)}
                className={`rounded-md border px-2 py-1 font-mono text-xs transition-colors ${
                  active
                    ? 'border-border bg-accent text-accent-foreground'
                    : 'border-transparent text-muted-foreground hover:bg-accent/50'
                }`}
              >
                {level} {count}
              </button>
            );
          })}
        </div>
      </div>

      {error ? <p className="mb-2 text-xs text-destructive">{error}</p> : null}

      <div
        ref={listRef}
        className="max-h-80 overflow-y-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-xs leading-5"
      >
        {shown === 0 ? (
          <p className="py-6 text-center text-muted-foreground">
            {t('settings.desktopLogEmpty')}
          </p>
        ) : (
          filteredLines.map((line, index) => (
            <div key={index} className="whitespace-pre-wrap break-all">
              {line.level !== 'RAW' ? (
                <>
                  <span className="text-muted-foreground/70">{line.timestamp}</span>{' '}
                  <span className={`font-semibold ${LEVEL_CLASS[line.level]}`}>{line.level}</span>{' '}
                </>
              ) : null}
              <span>{line.message}</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {t('settings.desktopLogShown', { shown, total })}
        </span>
        <Button size="sm" variant="ghost" onClick={jumpToLatest}>
          <ArrowDown className="mr-1 size-3.5" />
          {t('settings.desktopLogJumpLatest')}
        </Button>
      </div>
    </SectionCard>
  );
}
