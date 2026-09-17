import { useMemo, useState } from 'react';
import {
  Archive,
  Bell,
  Check,
  CheckCheck,
  Clock,
  ExternalLink,
  Filter,
  Inbox,
  Layers,
  Search,
  Settings2,
  Sparkles,
  Star,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { IconStack } from '@/components/ui/icon-stack';
import { PageShell } from '@/components/ui/page-shell';
import { SkeletonCard } from '@/components/ui/skeleton';
import { AsyncState } from '@/components/ui/async-state';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { DecisionCard } from '@/shared/decision-card/decision-card';
import { DecisionReviewModal } from '@/modules/decision/components/decision-review-modal';
import { NotificationSettingsDialog } from '../components/notification-settings-dialog';
import { InboxItemRow } from '../components/inbox-item-row';
import { useActionableInbox } from '../hooks/use-actionable-inbox';
import type { ActionableInboxItem, InboxTab } from '../types/inbox';

export function NotificationCenterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const {
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    typeFilter,
    setTypeFilter,
    items,
    counts,
    isLoading,
    isError,
    refetch,
    clearItem,
    restoreItem,
    snoozeItem,
    clearAllCurrent,
    markAllRead,
    rawDecisions,
    handleDecisionAction,
    busyDecisionId,
  } = useActionableInbox();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // 当前选中的条目
  const selectedItem = useMemo(() => {
    if (!selectedId) return items[0] || null;
    return items.find((i) => i.id === selectedId) || items[0] || null;
  }, [items, selectedId]);

  const handleSelectItem = (item: ActionableInboxItem) => {
    setSelectedId(item.id);
  };

  const tabs: { key: InboxTab; label: string; icon: typeof Star; count?: number }[] = [
    { key: 'important', label: '重要', icon: Star, count: counts.important },
    { key: 'other', label: '其他', icon: Inbox, count: counts.other },
    { key: 'snoozed', label: '稍后', icon: Clock, count: counts.snoozed },
    { key: 'cleared', label: '已清理', icon: CheckCheck, count: counts.cleared },
  ];

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.notificationCenter}>
      <div className="flex min-h-0 flex-1">
        {/* ── 左栏：分类 Tab + 工具栏 + 高密度收件箱列表 ── */}
        <aside className="flex w-[480px] shrink-0 flex-col border-r border-border bg-background">
          {/* 1. 顶部标题栏 */}
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-foreground">Notifications</h1>
                <FavoriteToggle label="Notifications" />
              </div>
              <div className="flex items-center gap-1">
                {/* 快速审阅弹窗按钮（保留用户强诉求的决策卡批量审阅功能） */}
                {rawDecisions.length > 0 && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-7 gap-1.5 rounded-full px-2.5 text-xs font-semibold shadow-xs"
                    onClick={() => setReviewModalOpen(true)}
                    title="快速审阅待办决策"
                  >
                    <Layers className="size-3.5" />
                    <span>快速审阅</span>
                    <span className="rounded-full bg-primary-foreground/25 px-1.5 py-0.2 font-mono text-10 leading-none">
                      {rawDecisions.length}
                    </span>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full"
                  aria-label="通知设置"
                  title="通知设置"
                  data-ai-component="notification.settings-button"
                  onClick={() => setSettingsOpen(true)}
                >
                  <Settings2 size={14} className="text-muted-foreground" />
                </Button>
              </div>
            </div>
          </div>

          <NotificationSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

          {/* 2. 顶栏四大 GTD 分类 Tab（重要 / 其他 / 稍后 / 已清理） */}
          <div className="flex items-center border-b border-border px-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.key);
                    setSelectedId(null);
                  }}
                  className={cn(
                    'relative flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px',
                    isActive
                      ? 'border-primary text-foreground font-semibold'
                      : 'border-transparent text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Icon className={cn('size-3.5', isActive ? 'text-primary' : 'text-muted-foreground')} />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span
                      className={cn(
                        'ml-0.5 rounded-full px-1.5 py-0.2 font-mono text-10 leading-tight',
                        tab.key === 'important'
                          ? 'bg-accent-red text-white'
                          : 'bg-muted text-content-text-muted',
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* 3. 工具栏（搜索、筛选、一键清理、全部已读） */}
          <div className="flex items-center justify-between gap-2 border-b border-border/80 px-3 py-2 bg-muted/20">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              {/* 筛选菜单 */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="size-7 shrink-0 text-muted-foreground">
                    <Filter className="size-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-36 text-xs">
                  <DropdownMenuItem onClick={() => setTypeFilter('all')}>
                    全部类型
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('decision')}>
                    仅决策待办
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('agent')}>
                    仅 AI 同事
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTypeFilter('issue')}>
                    仅工单任务
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* 搜索框 */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索条目、工单或 Agent..."
                  className="h-7 pl-7 text-xs bg-background"
                />
              </div>
            </div>

            {/* 批量动作 */}
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                onClick={markAllRead}
                title="全部标记为已读"
              >
                <Check className="mr-1 size-3.5" />
                全部已读
              </Button>

              {activeTab !== 'cleared' && items.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs font-medium border-border/80 shadow-2xs hover:bg-muted"
                  onClick={clearAllCurrent}
                  title="全部清理当前视图"
                >
                  <CheckCheck className="size-3.5 text-accent-green" />
                  全部清理
                </Button>
              )}
            </div>
          </div>

          {/* 4. 高密度列表区 */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            {isLoading ? (
              <div className="flex flex-col gap-2 p-3">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : isError ? (
              <div className="p-4">
                <AsyncState error="加载收件箱失败" onRetry={refetch}>{null}</AsyncState>
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                variant="page"
                className="m-8"
                visual={
                  <IconStack aria-hidden="true" className="text-accent-blue">
                    <Sparkles className="size-5 text-accent-blue" />
                  </IconStack>
                }
                title={activeTab === 'important' ? '全部处理完毕 (Inbox Zero)' : '暂无相关条目'}
                description={
                  activeTab === 'important'
                    ? '太棒了！当前没有任何阻塞待你拍板的事项。'
                    : '已清理或被稍后提醒的条目会保存在对应视图。'
                }
              />
            ) : (
              <div className="divide-y divide-border/40">
                {items.map((item) => (
                  <InboxItemRow
                    key={item.id}
                    item={item}
                    isSelected={selectedItem?.id === item.id}
                    onSelect={handleSelectItem}
                    onClear={clearItem}
                    onRestore={restoreItem}
                    onSnooze={snoozeItem}
                    onToggleRead={() => {}}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 5. 底部产品核心心智横幅（对应截图字幕） */}
          <div className="border-t border-border/70 px-4 py-2 bg-muted/15 flex items-center justify-between text-xs text-content-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-accent-green animate-pulse" />
              待确认事项自动进入「收件箱」
            </span>
            <span>{items.length} 项</span>
          </div>
        </aside>

        {/* ── 右栏：选中项的就地拍板决策卡 / 通知详情联动 ── */}
        <section className="flex min-w-0 flex-1 flex-col overflow-y-auto bg-muted/10">
          {selectedItem?.sourceKind === 'decision' && selectedItem.rawDecision ? (
            <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-6">
              <div className="mb-4 flex w-full items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-accent-yellow-light text-accent-yellow px-2 py-0.5 text-xs font-semibold border border-accent-yellow/20">
                    决策中心 · 就地拍板
                  </span>
                  <span className="text-xs text-content-text-muted">
                    审核完毕将自动归入「已清理」
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setReviewModalOpen(true)}
                  className="h-7 gap-1.5 text-xs text-primary hover:text-primary"
                >
                  <Layers className="size-3.5" />
                  <span>多卡集中批阅</span>
                </Button>
              </div>

              {/* 核心现实卡片直接渲染（五段式文法就地拍板） */}
              <div className="w-full">
                <DecisionCard
                  decision={selectedItem.rawDecision}
                  busy={busyDecisionId === selectedItem.rawDecision.id}
                  onAction={handleDecisionAction}
                  variant="vertical"
                />
              </div>
            </div>
          ) : selectedItem ? (
            <div className="mx-auto w-full max-w-2xl px-6 py-8">
              <div className="rounded-xl border border-border/80 bg-background p-6 shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-blue-light text-accent-blue">
                      <Bell className="size-5 text-accent-blue" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {selectedItem.title}
                      </h2>
                      <div className="mt-1 flex items-center gap-2 text-xs text-content-text-muted">
                        <span>{selectedItem.actor?.name || '系统动态'}</span>
                        <span>·</span>
                        <span>{new Date(selectedItem.createdAt).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 text-xs"
                      onClick={() => clearItem(selectedItem.id)}
                    >
                      <Check className="size-3.5" />
                      清理归档
                    </Button>
                  </div>
                </div>

                {selectedItem.subtitle && (
                  <div className="mt-6 rounded-lg bg-muted/40 p-4 text-sm text-foreground/90 leading-relaxed">
                    {selectedItem.subtitle}
                  </div>
                )}

                {/* 关联上下文卡片 */}
                {selectedItem.issueId && (
                  <div className="mt-6 flex items-center justify-between rounded-lg border border-border/80 p-3 bg-muted/10">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-content-text-muted">关联工单：</span>
                      <span className="text-xs font-medium text-foreground">
                        {selectedItem.issueTitle || selectedItem.issueId}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 gap-1 text-xs text-primary hover:text-primary"
                      onClick={() => navigate(`/app/tasks/${selectedItem.issueId}`)}
                    >
                      <span>打开工单</span>
                      <ExternalLink className="size-3" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8">
              <EmptyState
                title="选择一项查看详情"
                description="点击左侧列表中的任意条目，右侧将展开决策卡片或关联上下文。"
              />
            </div>
          )}
        </section>
      </div>

      {/* 全屏多卡集中快速审阅弹窗（保留现有的决策卡快速审阅功能） */}
      <DecisionReviewModal
        open={reviewModalOpen}
        onClose={() => setReviewModalOpen(false)}
        decisions={rawDecisions}
        busyId={busyDecisionId}
        onAction={handleDecisionAction}
      />
    </PageShell>
  );
}
