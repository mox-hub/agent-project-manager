import { useState, useRef, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Search, Sun, Moon, Plus, Send, X, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppDockItem, AppDockSeparator } from '@/components/ui/app-dock';
import { DockUserPopover } from './dock-user-popover';
import { DockMetricBadge } from './dock-metric-badge';
import { STATUS_DOT_CLASS, useDockAiColleagues, type DockAiColleague } from './use-dock-ai-colleagues';
import { useAppStore, type DockItemId } from '@/infrastructure/store/app-store';
import { DOCK_ROOT_ATTR, isWithinAiCollabSurface } from '@/shared/lib/floating-layers';
import { useTheme } from '@/shared/theme/theme-context';
import { useUnreadNotificationsCount } from '@/modules/notification/hooks/use-notifications';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';

export type { DockAiColleague };

export interface BottomDockProps {
  /**
   * 预览态：取消 `fixed` 定位，改为随容器排布，供设置页「Dock 栏」内嵌展示。
   * 交互保持真实（所见即所得）——预览里点按钮就是真操作，便于直接试用配置结果。
   */
  preview?: boolean;
}

export function BottomDock({ preview = false }: BottomDockProps = {}) {
  const { t } = useTranslation();
  const isMac =
    typeof navigator !== 'undefined' && navigator.platform.toUpperCase().includes('MAC');
  const navigate = useNavigate();
  const { mode, toggleTheme } = useTheme();
  const openAssistantWithDraft = useAppStore((s) => s.openAssistantWithDraft);
  const setAiPanelOpen = useAppStore((s) => s.setAiPanelOpen);
  const openCreateDialog = useAppStore((s) => s.openCreateDialog);
  const dockItems = useAppStore((s) => s.dockItems);
  const dockHiddenAssistantIds = useAppStore((s) => s.dockHiddenAssistantIds);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  // 可供协同的 AI 同事清单（与「设置 · Dock 栏」共用同一数据源）
  const { colleagues: aiColleagues } = useDockAiColleagues();

  // 展开状态：是否变形展开为 Prompt 输入框
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [selectedColleagueId, setSelectedColleagueId] = useState<string>('assistant');
  const inputRef = useRef<HTMLInputElement>(null);

  // 派生当前选中的 AI 同事
  const selectedColleague = useMemo(() => {
    return aiColleagues.find((c) => c.id === selectedColleagueId) || aiColleagues[0];
  }, [aiColleagues, selectedColleagueId]);

  // 常驻配置：隐藏名单为空 = 全部展示（默认）
  const visibleColleagues = useMemo(
    () => aiColleagues.filter((c) => !dockHiddenAssistantIds.includes(c.id)),
    [aiColleagues, dockHiddenAssistantIds],
  );

  // Sparkles 快捷呼出的默认角色：优先第一个常驻同事，常驻配置失效时回落主助手
  const defaultColleagueId = visibleColleagues[0]?.id ?? aiColleagues[0]?.id ?? 'assistant';

  // 退出展开：默认同时关闭 AI 对话面板（按 Esc、点 X 或点外部均同步关闭）
  const handleClosePrompt = useCallback(
    (closePanel = true) => {
      setIsPromptOpen(false);
      setPromptText('');
      if (closePanel) {
        setAiPanelOpen(false);
      }
    },
    [setAiPanelOpen],
  );

  // 展开时自动聚焦输入框
  useEffect(() => {
    if (isPromptOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isPromptOpen]);

  // 点击「AI 协同交互面」之外的区域才收起输入栏并关闭对话面板。
  // 判定不能用 dockContainerRef.contains()——对话浮窗与决策侧栏都在 Dock 容器之外，
  // 那样会把「点对话面板内部（含其按钮、决策侧栏收起按钮）」误判为外部点击，连带关闭主窗口。
  useEffect(() => {
    if (!isPromptOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!isWithinAiCollabSurface(e.target)) {
        handleClosePrompt(true);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPromptOpen, handleClosePrompt]);

  // 处理 Prompt 发送：打通系统现有的 AI 助手对话机制
  const handleSendPrompt = () => {
    const trimmed = promptText.trim();
    if (!trimmed) return;

    // 唤起主助手并注入用户输入的 Prompt
    const isMainAssistant =
      selectedColleague.id === 'assistant' ||
      selectedColleague.name === t('assistant.personaName');
    const fullDraft = isMainAssistant
      ? trimmed
      : `[@${selectedColleague.name}] ${trimmed}`;
    openAssistantWithDraft(fullDraft);

    // 发送后平滑收起 Dock 输入栏，但保持上方 AI 对话面板开启（closePanel = false）以查看实时回复
    handleClosePrompt(false);
  };

  // 全局命令面板快捷触发
  const handleOpenSearch = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  /**
   * Dock 功能按钮注册表：渲染由 store 的 `dockItems`（可见项 + 顺序）驱动，
   * 设置页「Dock 栏」可增删与排序（见 settings/pages/sections/dock-section.tsx）。
   */
  const dockActions: Record<
    DockItemId,
    {
      label: string;
      node: ReactNode;
      badge?: number | string;
      badgeTone?: 'destructive' | 'primary' | 'warning';
      onClick: () => void;
    }
  > = {
    create: {
      label: t('dock.new'),
      node: <Plus className="size-4" />,
      // 统一创建面板（6 类：任务/缺陷/文档/项目/里程碑/AI 创建），由 ShellLayout 全局挂载
      onClick: () => openCreateDialog({ type: 'task' }),
    },
    search: {
      label: `${t('dock.search')} (${isMac ? '⌘K' : 'Ctrl+K'})`,
      node: <Search className="size-4" />,
      onClick: handleOpenSearch,
    },
    notifications: {
      label: t('nav.notifications'),
      node: <Bell className="size-4" />,
      badge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined,
      badgeTone: 'destructive',
      onClick: () => navigate('/app/notifications'),
    },
    theme: {
      label: mode === 'dark' ? t('dock.lightMode') : t('dock.darkMode'),
      node:
        mode === 'dark' ? (
          <Sun className="size-4 text-accent-yellow" />
        ) : (
          <Moon className="size-4" />
        ),
      onClick: toggleTheme,
    },
  };

  return (
    <div
      {...{ [DOCK_ROOT_ATTR]: '' }}
      className={cn(
        'select-none',
        // 预览态需保留定位上下文：上方指标徽章以 absolute bottom-full 锚定于此
        preview
          ? 'relative mx-auto w-fit'
          : 'fixed bottom-4 left-1/2 -translate-x-1/2 z-40',
      )}
    >
      {/* 1. 悬浮在 Dock 上方的双轨成本与执行微徽章 (常驻 / 变形响应) */}
      <DockMetricBadge
        isPromptOpen={isPromptOpen}
        activeModel={selectedColleague.name}
      />

      {/* 2. 可平滑形变的 Dock 主体容器 */}
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className={cn(
          'relative flex h-12 items-center rounded-full border border-border/70 shadow-2xl backdrop-blur-xl',
          'transition-colors duration-200',
          isPromptOpen
            ? 'w-144 max-w-[calc(100vw-2rem)] bg-popover/95 px-2 py-1.5 ring-2 ring-accent-purple/20'
            : 'w-auto bg-popover/85 px-2.5 py-1',
        )}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isPromptOpen ? (
            // ================= 状态 B：展开后的 Prompt 输入栏 =================
            <motion.div
              key="prompt-bar"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="flex w-full items-center gap-2"
            >
              {/* 左侧：选中的 AI 角色真实头像（带真实在线状态点） */}
              <div className="relative shrink-0 pl-1">
                <div
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full shadow-xs border border-border/60 overflow-hidden',
                    selectedColleague.bgColor,
                    selectedColleague.color,
                  )}
                  title={`当前受托角色：${selectedColleague.name} (${selectedColleague.title || 'AI 同事'})`}
                >
                  {selectedColleague.avatarUrl ? (
                    <MemberAvatar
                      member={{
                        type: 'ai_agent',
                        displayName: selectedColleague.name,
                        avatarUrl: selectedColleague.avatarUrl,
                      }}
                      size="sm"
                      showBadge={false}
                    />
                  ) : (
                    (() => {
                      const Icon = selectedColleague.icon;
                      return <Icon className="size-4" />;
                    })()
                  )}
                </div>
                {/* 真实呼吸状态指示点 */}
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 size-2 rounded-full',
                    STATUS_DOT_CLASS[selectedColleague.status] || STATUS_DOT_CLASS.idle,
                  )}
                  aria-hidden="true"
                />
              </div>

              {/* 中间：Prompt 输入框 */}
              <div className="flex-1 min-w-0">
                <input
                  ref={inputRef}
                  type="text"
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendPrompt();
                    } else if (e.key === 'Escape') {
                      handleClosePrompt(true);
                    }
                  }}
                  placeholder={selectedColleague.placeholder}
                  className="w-full bg-transparent px-2 text-xs text-foreground placeholder:text-content-text-muted focus:outline-hidden"
                />
              </div>

              {/* 右侧操作：发送按钮 + 收起按钮 (点击同步关闭上方 AI 面板) */}
              <div className="flex items-center gap-1 shrink-0 pr-0.5">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={handleSendPrompt}
                  disabled={!promptText.trim()}
                  className={cn(
                    'flex size-8 items-center justify-center rounded-full transition-all shadow-xs',
                    promptText.trim()
                      ? 'bg-foreground text-background hover:bg-foreground/90'
                      : 'bg-muted text-content-text-muted cursor-not-allowed',
                  )}
                  title="发送指令 (Enter)"
                >
                  <Send className="size-3.5 translate-x-px -translate-y-px" />
                </motion.button>

                <button
                  type="button"
                  onClick={() => handleClosePrompt(true)}
                  className="flex size-7 items-center justify-center rounded-full text-content-text-muted hover:bg-accent hover:text-foreground transition-colors"
                  title="收起并关闭 (Esc)"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            </motion.div>
          ) : (
            // ================= 状态 A：常规模式 Dock 栏 =================
            <motion.div
              key="standard-dock"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 whitespace-nowrap"
            >
              {/* ① 人类控制面：定制化工作区 & 真实身份 Popover */}
              <DockUserPopover />

              <AppDockSeparator />

              {/* ② 常用全局操作（可见项与顺序由「设置 · Dock 栏」决定） */}
              {dockItems.map((id) => {
                const action = dockActions[id];
                if (!action) return null;
                return (
                  <AppDockItem
                    key={id}
                    label={action.label}
                    badge={action.badge}
                    badgeTone={action.badgeTone}
                    onClick={action.onClick}
                    data-testid={`dock-item-${id}`}
                  >
                    {action.node}
                  </AppDockItem>
                );
              })}

              {dockItems.length > 0 && <AppDockSeparator />}

              {/* ③ AI 协同执行面：Sparkles 快捷呼出 | 真实 AI 成员头像群 */}
              <div className="flex items-center gap-1.5 pl-0.5 pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedColleagueId(defaultColleagueId);
                    setIsPromptOpen(true);
                    setAiPanelOpen(true);
                  }}
                  className="flex size-7 items-center justify-center rounded-full text-accent-purple hover:bg-accent/60 transition-colors"
                  title="点击呼出 AI 快捷指令栏与对话面板"
                >
                  <Sparkles className="size-4 text-accent-yellow" />
                </button>

                {visibleColleagues.length > 0 && (
                  <div className="h-4 w-px bg-border/60" aria-hidden="true" />
                )}

                {/* AI 同事头像群（真实数据接入，支持点击指定角色直接展开针对该角色的 Prompt 输入；
                    展示哪些同事由「设置 · Dock 栏」的常驻配置决定，未配置 = 全部展示） */}
                <div className="flex items-center gap-1.5">
                  {visibleColleagues.map((colleague) => {
                    const isCustomAvatar = Boolean(colleague.avatarUrl);
                    const Icon = colleague.icon;
                    const statusDotColor =
                      STATUS_DOT_CLASS[colleague.status] || STATUS_DOT_CLASS.idle;

                    return (
                      <motion.button
                        key={colleague.id}
                        type="button"
                        whileHover={{ scale: 1.15, y: -2 }}
                        whileTap={{ scale: 0.92 }}
                        onClick={() => {
                          setSelectedColleagueId(colleague.id);
                          setIsPromptOpen(true);
                          setAiPanelOpen(true);
                        }}
                        className={cn(
                          'relative flex size-7.5 items-center justify-center rounded-full border border-border/70 shadow-2xs transition-all overflow-hidden',
                          colleague.bgColor,
                          colleague.color,
                        )}
                        title={`点击向 [${colleague.name}] 发送指令 · 状态: ${colleague.status}`}
                      >
                        {isCustomAvatar ? (
                          <MemberAvatar
                            member={{
                              type: 'ai_agent',
                              displayName: colleague.name,
                              avatarUrl: colleague.avatarUrl,
                            }}
                            size="xs"
                            showBadge={false}
                          />
                        ) : (
                          <Icon className="size-3.5" />
                        )}
                        {/* 真实状态指示点 */}
                        <span
                          className={cn('absolute -bottom-0.5 -right-0.5 size-2 rounded-full', statusDotColor)}
                          aria-hidden="true"
                        />
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
