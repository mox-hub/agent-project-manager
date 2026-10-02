import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { NavStatusDot } from '@/components/semantic/nav-status-dot';
import type { Tone } from '@/components/ui/tone';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { readHistoryIdx, resolveBackSteps } from '@/shared/lib/history-back';
import { useGitToolStatus } from '@/modules/git/hooks/use-git-tool';
import {
  pickRepresentativeRegistrations,
  useRuntimeRegistrations,
} from '@/shared/runtime/runtime-api';
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

/**
 * 业务层产出的状态点描述（渲染交给 `@/components/semantic/nav-status-dot`）。
 *
 * 状态色链路遵 §19.5 的分工：这里只做**业务层映射**（导航状态 → tone），
 * tone → class 由 `components/ui/tone.ts` 唯一持有，本文件不得出现颜色字面量。
 *   loading = default（灰 + 动画）    ok = success（绿，就绪）
 *   down    = danger（红，不可用·需处理）  idle = default（灰，未接入或无人在线——中性，非错误）
 *
 * §8.5#4 要求「不得只靠颜色传达状态」，故 `label` 必填——它是颜色之外的第二信号。
 * 新增状态点前先确认该状态有真实数据源（§9.1 禁假常量），再由本文件的映射块选档。
 */
interface NavDot {
  tone: Tone;
  label: string;
  loading?: boolean;
}

interface SettingsNavItemLinkProps {
  item: RenderedNavItem;
  dot?: NavDot;
}

function SettingsNavItemLink({ item, dot }: SettingsNavItemLinkProps) {
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
      {dot && <NavStatusDot tone={dot.tone} label={dot.label} loading={dot.loading} />}
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
  const { data: registrations, isLoading: runtimeLoading } = useRuntimeRegistrations();

  const groups = useMemo<RenderedNavGroup[]>(
    () =>
      SETTINGS_NAV_GROUPS.map((group) => ({
        label: t(group.labelKey),
        items: group.items.map((item) => ({ ...item, label: t(item.labelKey) })),
      })),
    [t],
  );

  // 在线机器数：按设备去重（同一设备多注册只算一台），与运行时页同口径
  const runtimeOnlineCount = useMemo(
    () =>
      pickRepresentativeRegistrations(registrations ?? []).filter(
        (machine) => machine.status === 'online',
      ).length,
    [registrations],
  );

  // 业务层映射：status → tone + 文案（§19.5 上层；tone → class 由语义组件内的 tone.ts 负责）
  const gitDot: NavDot = gitStatusLoading
    ? { tone: 'default', label: t('settings.gitChecking'), loading: true }
    : gitStatus?.available
      ? { tone: 'success', label: t('settings.gitAvailable') }
      : {
          tone: 'danger',
          label: gitStatus?.error
            ? t('settings.gitUnavailableError', { error: gitStatus.error })
            : t('settings.gitUnavailable'),
        };

  const runtimeDot: NavDot = runtimeLoading
    ? { tone: 'default', label: t('settings.runtimeChecking'), loading: true }
    : runtimeOnlineCount > 0
      ? { tone: 'success', label: t('settings.runtimeNavOnline', { n: runtimeOnlineCount }) }
      : { tone: 'default', label: t('settings.runtimeNavOffline') };

  const dotByStatus: Record<'git' | 'runtime', NavDot> = {
    git: gitDot,
    runtime: runtimeDot,
  };

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
  // 故按 resolveBackSteps 的差值一次性跨出设置页（步数含跨出的那一步）。
  const entryHistoryIdxRef = useRef<number | null>(null);
  useEffect(() => {
    if (entryHistoryIdxRef.current === null) {
      entryHistoryIdxRef.current = readHistoryIdx();
    }
  }, []);

  // 返回应用：能回溯到进入前的业务页面则一步跨回，否则回到项目首页
  const handleBackToApp = () => {
    const steps = resolveBackSteps(readHistoryIdx(), entryHistoryIdxRef.current ?? 0);
    if (steps === null) {
      navigate('/app/projects');
      return;
    }
    navigate(-steps);
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
                <p className="mb-1 px-3 text-2xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map((item) => (
                    <SettingsNavItemLink
                      key={item.to}
                      item={item}
                      dot={item.status ? dotByStatus[item.status] : undefined}
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
        <ScrollArea className="h-full w-full" contentClassName="pb-14">
          <Outlet />
        </ScrollArea>
      </main>
    </div>
  );
}
