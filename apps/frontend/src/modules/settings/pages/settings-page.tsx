import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useGitToolStatus } from '@/modules/git/hooks/use-git-tool';
import { useTerminalStatus } from '@/modules/runtime/hooks/use-terminal-status';
import { ArrowLeft, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SETTINGS_NAV_GROUPS, type SettingsNavItem } from '../settings-nav';

interface RenderedNavItem extends SettingsNavItem {
  label: string;
}

interface RenderedNavGroup {
  label: string;
  items: RenderedNavItem[];
}

function GitStatusIndicator({
  status,
  isLoading,
}: {
  status?: { available?: boolean; error?: string };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <span className="flex h-2 w-2">
        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-muted-foreground opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground" />
      </span>
    );
  }

  if (!status) {
    return <span className="h-2 w-2 rounded-full bg-accent-red" />;
  }

  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full',
        status.available ? 'bg-accent-green' : 'bg-accent-yellow'
      )}
    />
  );
}

function TerminalStatusIndicator({
  status,
  isLoading,
}: {
  status?: { available?: boolean };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <span className="flex h-2 w-2">
        <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-muted-foreground opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-muted-foreground" />
      </span>
    );
  }

  if (!status) {
    return <span className="h-2 w-2 rounded-full bg-accent-red" />;
  }

  return (
    <span
      className={cn(
        'h-2 w-2 rounded-full',
        status.available ? 'bg-accent-green' : 'bg-accent-red'
      )}
    />
  );
}

interface SettingsNavItemLinkProps {
  item: RenderedNavItem;
  gitStatus?: { available?: boolean; error?: string };
  gitStatusLoading: boolean;
  terminalStatus?: { available?: boolean };
  terminalStatusLoading: boolean;
}

function SettingsNavItemLink({
  item,
  gitStatus,
  gitStatusLoading,
  terminalStatus,
  terminalStatusLoading,
}: SettingsNavItemLinkProps) {
  const Icon = item.icon;

  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-accent-blue/10 text-accent-blue'
            : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
        )
      }
    >
      <Icon size={16} className="shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.status === 'git' && (
        <GitStatusIndicator status={gitStatus} isLoading={gitStatusLoading} />
      )}
      {item.status === 'terminal' && (
        <TerminalStatusIndicator status={terminalStatus} isLoading={terminalStatusLoading} />
      )}
    </NavLink>
  );
}

/**
 * 设置页布局：左侧分组式侧边栏（返回应用 + 搜索 + 分组导航），
 * 右侧通过 <Outlet /> 渲染各设置子路由（见 sections/ 目录）。
 */
export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const { data: gitStatus, isLoading: gitStatusLoading } = useGitToolStatus();
  const { data: terminalStatus, isLoading: terminalStatusLoading } = useTerminalStatus();

  const groups = useMemo<RenderedNavGroup[]>(
    () =>
      SETTINGS_NAV_GROUPS.map((group) => ({
        label: t(group.labelKey),
        items: group.items.map((item) => ({ ...item, label: t(item.labelKey) })),
      })),
    [t],
  );

  // 搜索过滤：按菜单项名称 / 路径过滤，过滤后为空的分组整体隐藏
  const visibleGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(query) || item.to.toLowerCase().includes(query),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, searchQuery]);

  // 记录进入设置页时的历史索引（布局跨子路由切换不卸载，值只记录一次）。
  // 子页切换会不断压入历史记录，navigate(-1) 只会回到上一个设置子页，
  // 因此按「当前索引 - 进入时索引」的差值一次性跳回设置页之前的页面。
  const entryHistoryIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (entryHistoryIdxRef.current === null) {
      entryHistoryIdxRef.current =
        (window.history.state as { idx?: number } | null)?.idx ?? 0;
    }
  }, []);

  // 返回应用：能回溯到进入前的页面则回退，否则回到项目首页
  const handleBackToApp = () => {
    const currentIdx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    const entryIdx = entryHistoryIdxRef.current ?? 0;
    if (entryIdx > 0 && currentIdx >= entryIdx) {
      navigate(-Math.max(1, currentIdx - entryIdx));
    } else {
      navigate('/app/projects');
    }
  };

  return (
    <div
      className="flex h-screen w-full overflow-hidden bg-background text-foreground"
      data-ai-page={CORE_AI_PAGE_IDS.settings}
      data-ai-component="settings.global-settings"
      data-ai-role="page"
    >
      {/* 左侧分组菜单栏 */}
      <aside className="flex w-64 shrink-0 flex-col border-r border-border bg-muted/20">
        {/* 返回应用 */}
        <div className="shrink-0 border-b border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToApp}
            className="w-full justify-start gap-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            data-ai-component="settings.global-settings.back"
            data-ai-action="settings.global-settings.back.click"
          >
            <ArrowLeft size={16} />
            {t('settings.backToApp')}
          </Button>
        </div>

        {/* 搜索框 */}
        <div className="shrink-0 px-3 pt-3 pb-1">
          <div className="relative">
            <Search
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={t('settings.searchPlaceholder')}
              className="h-9 pl-8 text-sm"
              data-ai-component="settings.search"
            />
          </div>
        </div>

        {/* 分组菜单 */}
        <div className="flex-1 overflow-y-auto px-2 pb-3 pt-2">
          {visibleGroups.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {t('settings.searchNoResults')}
            </div>
          ) : (
            visibleGroups.map((group) => (
              <div key={group.label} className="mb-4 last:mb-0">
                <p className="mb-1 px-3 text-11 font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <SettingsNavItemLink
                      key={item.to}
                      item={item}
                      gitStatus={gitStatus}
                      gitStatusLoading={gitStatusLoading}
                      terminalStatus={terminalStatus}
                      terminalStatusLoading={terminalStatusLoading}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* 右侧内容区：子路由子页（PageShell + PageHeader + 卡片内容） */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <ScrollArea className="h-full w-full">
          <Outlet />
        </ScrollArea>
      </main>
    </div>
  );
}
