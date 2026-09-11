/**
 * Dock 栏设置子页 —— 底部协同交互面的个性化配置。
 *
 * 三部分（自上而下）：
 * ① 实时预览：内嵌**完整 Dock 栏本体**（同一个 `BottomDock`，仅切到预览定位态），
 *    下方任何配置改动即时反映在预览里，无需离开页面反复确认；
 * ② 功能按钮：勾选显示哪些全局操作，并用上下箭头调整它们在 Dock 中的排列顺序；
 * ③ 常驻 AI 助手：选择哪些 AI 同事常驻在 Dock 右侧，一个不屏蔽 = 全部展示。
 *
 * 持久化走 app-store（zustand persist），与侧边栏的 `sidebarItemVisibility` 同款机制——
 * 属设备级 UI 偏好，不进后端配置。改动即时生效并落盘，无「保存」按钮。
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { PageShell } from '@/components/ui/page-shell';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  ChevronDown,
  ChevronUp,
  Eye,
  LayoutList,
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

  return (
    <PageShell
      variant="standard"
      icon={LayoutList}
      iconColor="text-accent-blue"
      title={t('settings.dock')}
      className="bg-background text-foreground"
      contentClassName="space-y-6"
    >
      <DockPreviewCard />
      <DockActionsCard />
      <DockAiColleaguesCard />
      {/* 设置页不在 ShellLayout 内，预览里的「新建」需要一个就近的宿主 */}
      <GlobalCreateDialog />
    </PageShell>
  );
}

/** 实时预览：内嵌完整 Dock 栏本体，配置改动即时可见 */
function DockPreviewCard() {
  const { t } = useTranslation();

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Eye size={16} className="text-accent-purple" />
          <CardTitle className="text-base">{t('settings.dockPreviewTitle')}</CardTitle>
        </div>
        <CardDescription>{t('settings.dockPreviewDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {/*
          内嵌真实 Dock（preview 态仅换定位）：上方留出 pt-14 容纳悬浮指标徽章
          （它以 absolute bottom-full 锚定在 Dock 容器顶部之外）。
          不设 overflow-hidden——Dock 胶囊带 shadow-2xl，裁切会削掉磨砂投影。
        */}
        <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 pb-6 pt-14">
          <BottomDock preview />
        </div>
      </CardContent>
    </Card>
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
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <LayoutList size={16} className="text-accent-blue" />
          <CardTitle className="text-base">{t('settings.dockActionsTitle')}</CardTitle>
        </div>
        <CardDescription>{t('settings.dockActionsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
                  size="sm"
                  checked={visible}
                  onCheckedChange={(checked) => setDockItemVisible(id, checked)}
                  aria-label={`${t(DOCK_ITEM_LABEL_KEYS[id])} ${t('settings.dockVisible')}`}
                  data-testid={`dock-visible-${id}`}
                />
              </li>
            );
          })}
        </ul>

        <div className="flex justify-end">
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
      </CardContent>
    </Card>
  );
}

/** 常驻 AI 助手：勾选 = 展示在 Dock；全部取消勾选后 Dock 仍保留 Sparkles 快捷呼出 */
function DockAiColleaguesCard() {
  const { t } = useTranslation();
  const { colleagues } = useDockAiColleagues();
  const hiddenIds = useAppStore((s) => s.dockHiddenAssistantIds);
  const setHiddenIds = useAppStore((s) => s.setDockHiddenAssistantIds);

  const visibleCount = colleagues.filter((c) => !hiddenIds.includes(c.id)).length;

  const setVisible = (id: string, visible: boolean) => {
    setHiddenIds(
      visible ? hiddenIds.filter((x) => x !== id) : [...hiddenIds, id],
    );
  };

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-accent-purple" />
            <CardTitle className="text-base">{t('settings.dockAiTitle')}</CardTitle>
          </div>
          {hiddenIds.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setHiddenIds([])}
              data-testid="dock-ai-show-all"
            >
              {t('settings.dockAiAll')}
            </Button>
          )}
        </div>
        <CardDescription>{t('settings.dockAiDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {colleagues.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.dockAiEmpty')}</p>
        ) : (
          <>
            <ul className="divide-y divide-border rounded-lg border border-border">
              {colleagues.map((colleague) => {
                const visible = !hiddenIds.includes(colleague.id);
                const Icon = colleague.icon;
                return (
                  <li key={colleague.id} className="flex items-center gap-3 p-3">
                    <span
                      className={cn(
                        'flex size-8 shrink-0 items-center justify-center rounded-full border border-border/70',
                        colleague.bgColor,
                        colleague.color,
                      )}
                    >
                      <Icon className="size-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          'block truncate text-sm',
                          visible ? 'text-foreground' : 'text-muted-foreground',
                        )}
                      >
                        {colleague.name}
                      </span>
                      {colleague.title && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {colleague.title}
                        </span>
                      )}
                    </span>
                    <Switch
                      size="sm"
                      checked={visible}
                      onCheckedChange={(checked) => setVisible(colleague.id, checked)}
                      aria-label={`${colleague.name} ${t('settings.dockVisible')}`}
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
      </CardContent>
    </Card>
  );
}
