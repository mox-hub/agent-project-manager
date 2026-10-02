/**
 * Dock 栏设置子页 —— 底部协同交互面的个性化配置。
 *
 * 三部分（自上而下）：
 * ① 实时预览：内嵌**完整 Dock 栏本体**（同一个 `BottomDock`，仅切到预览定位态），
 *    下方任何配置改动即时反映在预览里，无需离开页面反复确认；
 * ② 功能按钮：勾选显示哪些全局操作，并用上下箭头调整它们在 Dock 中的排列顺序；
 * ③ 常驻 AI 助手：选择哪些 AI 同事常驻在 Dock 右侧，一个不屏蔽 = 全部展示；
 *    **默认助手（小周）固定首位且不可关闭**——它是主协同助手，必须始终在场。
 *
 * 持久化走 app-store（zustand persist），与侧边栏的 `sidebarItemVisibility` 同款机制——
 * 属设备级 UI 偏好，不进后端配置。改动即时生效并落盘，无「保存」按钮。
 */
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageShell } from '@/components/semantic/page-shell';
import { SettingsHeader } from '@/components/semantic/settings-header';
import { SectionScrubber } from '@/components/semantic/section-scrubber';
import { SettingsSectionCard } from '@/components/semantic/settings-section-card';
import { SettingsFieldRow } from '@/components/semantic/settings-field-row';
import { nodeToText } from '@/components/semantic/page-header';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Eye,
  LayoutList,
  PanelBottom,
  Plus,
  RotateCcw,
  Search,
  SunMoon,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DOCK_ITEM_IDS,
  useAppStore,
  type DockItemId,
} from '@/infrastructure/store/app-store';
import { BottomDock } from '@/shared/components/bottom-dock';
import { useDockAiColleagues } from '@/shared/components/bottom-dock/use-dock-ai-colleagues';
import { GlobalCreateDialog } from '@/shared/components/global-create-dialog';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';

const DOCK_ITEM_ICONS: Record<DockItemId, LucideIcon> = {
  create: Plus,
  search: Search,
  notifications: Bell,
  theme: SunMoon,
};

const DOCK_ITEM_LABEL_KEYS: Record<DockItemId, string> = {
  create: 'settings.dockItemCreate',
  search: 'settings.dockItemSearch',
  notifications: 'settings.dockItemNotifications',
  theme: 'settings.dockItemTheme',
};

/** Dock 栏设置子页：功能按钮显隐与排序 + 常驻 AI 助手 */
export function DockSettingsSection() {
  const { t } = useTranslation();

  // scrubber 栏目清单：useMemo 稳定引用
  const sections = useMemo(
    () => [
      { id: 'dock-preview', label: t('settings.dockPreviewTitle') },
      { id: 'dock-display', label: t('settings.dockDisplayTitle') },
      { id: 'dock-actions', label: t('settings.dockActionsTitle') },
      { id: 'dock-ai', label: t('settings.dockAiTitle') },
    ],
    [t],
  );

  return (
    <PageShell
      variant="standard"
      className="bg-background text-foreground"
      contentClassName="gap-4"
    >
      <SettingsHeader
        icon={LayoutList}
        tone="blue"
        title={t('settings.dock')}
        description={t('settings.dockDesc')}
        actions={<FavoriteToggle label={nodeToText(t('settings.dock')).trim()} />}
        scrubber={<SectionScrubber sections={sections} />}
      />
      <DockPreviewCard />
      <DockDisplayCard />
      <DockActionsCard />
      <DockAiColleaguesCard />
      {/* 设置页不在 ShellLayout 内，预览里的「新建」需要一个就近的宿主 */}
      <GlobalCreateDialog />
    </PageShell>
  );
}

/** 显示方式：常驻显示 / 自动隐藏（平时只留徽章栏贴底，鼠标靠近才浮出） */
function DockDisplayCard() {
  const { t } = useTranslation();
  const dockAlwaysVisible = useAppStore((s) => s.dockAlwaysVisible);
  const setDockAlwaysVisible = useAppStore((s) => s.setDockAlwaysVisible);

  return (
    <SettingsSectionCard
      id="dock-display"
      icon={PanelBottom}
      tone="green"
      title={t('settings.dockDisplayTitle')}
      description={t('settings.dockDisplayDesc')}
    >
      <SettingsFieldRow
        title={t('settings.dockAlwaysVisible')}
        description={t('settings.dockAlwaysVisibleDesc')}
        control={
          <Switch
            checked={dockAlwaysVisible}
            onCheckedChange={setDockAlwaysVisible}
            aria-label={t('settings.dockAlwaysVisible')}
            data-testid="dock-always-visible"
          />
        }
      />
    </SettingsSectionCard>
  );
}

/** 实时预览：内嵌完整 Dock 栏本体，配置改动即时可见 */
function DockPreviewCard() {
  const { t } = useTranslation();

  return (
    <SettingsSectionCard
      id="dock-preview"
      icon={Eye}
      tone="purple"
      title={t('settings.dockPreviewTitle')}
      description={t('settings.dockPreviewDesc')}
    >
      <p className="mb-3 text-xs text-content-text-muted">{t('settings.dockPreviewAlwaysOn')}</p>
        {/*
          内嵌真实 Dock（preview 态仅换定位）：上方留出 pt-14 容纳悬浮指标徽章
          （它以 absolute bottom-full 锚定在 Dock 容器顶部之外）。
          不设 overflow-hidden——Dock 胶囊带投影（宪法 §3.6 唯一档 shadow-xs），裁切会削掉磨砂投影。
        */}
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 pb-6 pt-14">
          <BottomDock preview />
        </div>
    </SettingsSectionCard>
  );
}

/** 功能按钮：显隐开关 + 顺序调整（顺序即 Dock 中从左到右的排列） */
function DockActionsCard() {
  const { t } = useTranslation();
  const dockItems = useAppStore((s) => s.dockItems);
  const setDockItemVisible = useAppStore((s) => s.setDockItemVisible);
  const moveDockItem = useAppStore((s) => s.moveDockItem);
  const resetDockSettings = useAppStore((s) => s.resetDockSettings);

  return (
    <SettingsSectionCard
      id="dock-actions"
      icon={LayoutList}
      tone="blue"
      title={t('settings.dockActionsTitle')}
      description={t('settings.dockActionsDesc')}
    >
      <ul className="divide-y divide-border rounded-lg border border-border">
          {DOCK_ITEM_IDS.map((id) => {
            const Icon = DOCK_ITEM_ICONS[id];
            const visible = dockItems.includes(id);
            const index = dockItems.indexOf(id);
            return (
              <li key={id} className="flex items-center gap-3 p-3">
                <span
                  className={cn(
                    'flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground',
                    visible && 'bg-accent-blue-light text-accent-blue',
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <span
                  className={cn(
                    'flex-1 text-sm',
                    visible ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {t(DOCK_ITEM_LABEL_KEYS[id])}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  disabled={!visible || index <= 0}
                  onClick={() => moveDockItem(id, -1)}
                  title={t('settings.dockMoveUp')}
                  aria-label={t('settings.dockMoveUp')}
                  data-testid={`dock-move-up-${id}`}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="size-7 p-0"
                  disabled={!visible || index === dockItems.length - 1}
                  onClick={() => moveDockItem(id, 1)}
                  title={t('settings.dockMoveDown')}
                  aria-label={t('settings.dockMoveDown')}
                  data-testid={`dock-move-down-${id}`}
                >
                  <ChevronDown className="size-4" />
                </Button>
                <Switch
                  checked={visible}
                  onCheckedChange={(checked) => setDockItemVisible(id, checked)}
                  aria-label={`${t(DOCK_ITEM_LABEL_KEYS[id])} ${t('settings.dockVisible')}`}
                  data-testid={`dock-visible-${id}`}
                />
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={resetDockSettings}
            data-testid="dock-reset"
          >
            <RotateCcw className="size-3.5" />
            {t('settings.dockReset')}
          </Button>
        </div>
    </SettingsSectionCard>
  );
}

/**
 * 常驻 AI 助手：勾选 = 展示在 Dock；全部取消勾选后 Dock 仍保留 Sparkles 快捷呼出。
 * 默认助手（小周）固定首位且不可关闭——它是主协同助手，列表里必须始终在场。
 */
function DockAiColleaguesCard() {
  const { t } = useTranslation();
  const { colleagues } = useDockAiColleagues();
  const hiddenIds = useAppStore((s) => s.dockHiddenAssistantIds);
  const setHiddenIds = useAppStore((s) => s.setDockHiddenAssistantIds);

  // 默认助手置顶：列表顺序即用户先看到谁；sort 稳定，不扰乱其余同事的相对次序
  const orderedColleagues = useMemo(
    () => [...colleagues].sort((a, b) => Number(b.isMain) - Number(a.isMain)),
    [colleagues],
  );

  // 默认助手永远计入「已常驻」，不受隐藏名单影响
  const visibleCount = colleagues.filter(
    (c) => c.isMain || !hiddenIds.includes(c.id),
  ).length;

  const setVisible = (id: string, visible: boolean) => {
    setHiddenIds(
      visible ? hiddenIds.filter((x) => x !== id) : [...hiddenIds, id],
    );
  };

  return (
    <SettingsSectionCard
      id="dock-ai"
      icon={Users}
      tone="purple"
      title={t('settings.dockAiTitle')}
      description={t('settings.dockAiDesc')}
      actions={
        hiddenIds.length > 0 ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => setHiddenIds([])}
            data-testid="dock-ai-show-all"
          >
            {t('settings.dockAiAll')}
          </Button>
        ) : undefined
      }
    >
        {colleagues.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.dockAiEmpty')}</p>
        ) : (
          <>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {orderedColleagues.map((colleague) => {
                // 默认助手永远视为已常驻，且开关禁用（不可手动关闭）
                const locked = colleague.isMain;
                const visible = locked || !hiddenIds.includes(colleague.id);
                return (
                  <li key={colleague.id} className="flex items-center gap-3 p-3">
                    {/* 与成员管理页同源：成员信息里有真实头像就显示真实头像 */}
                    <MemberAvatar
                      member={{
                        type: 'ai_agent',
                        displayName: colleague.name,
                        avatarUrl: colleague.avatarUrl,
                      }}
                      size="md"
                      showBadge={false}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'flex items-center gap-1.5 truncate text-sm',
                          visible ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {colleague.name}
                        {locked && (
                          <span
                            className="shrink-0 rounded-full bg-accent-purple-light px-1.5 text-3xs font-semibold text-accent-purple"
                            title={t('settings.dockAiDefaultLocked')}
                            data-testid={`dock-ai-default-badge-${colleague.id}`}
                          >
                            {t('settings.dockAiDefaultBadge')}
                          </span>
                        )}
                      </span>
                      {colleague.title && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {colleague.title}
                        </span>
                      )}
                    </span>
                    <Switch
                      checked={visible}
                      disabled={locked}
                      onCheckedChange={(checked) => setVisible(colleague.id, checked)}
                      aria-label={
                        locked
                          ? `${colleague.name} ${t('settings.dockAiDefaultLocked')}`
                          : `${colleague.name} ${t('settings.dockVisible')}`
                      }
                      data-testid={`dock-ai-visible-${colleague.id}`}
                    />
                  </li>
                );
              })}
            </ul>
            <p className="mt-3 text-xs text-muted-foreground">
              {t('settings.dockAiPinned', { count: visibleCount })}
            </p>
          </>
        )}
    </SettingsSectionCard>
  );
}
