import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bell,
  Search,
  Sun,
  Moon,
  Plus,
  Send,
  X,
  Sparkles,
  Bot,
  Terminal,
  ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { AppDockItem, AppDockSeparator } from '@/components/ui/app-dock';
import { DockUserPopover } from './dock-user-popover';
import { DockMetricBadge } from './dock-metric-badge';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useTheme } from '@/shared/theme/theme-context';
import { useUnreadNotificationsCount } from '@/modules/notification/hooks/use-notifications';
import { useOfficeSummary } from '@/modules/office/hooks/use-office-summary';
import { useAssistantStatus } from '@/modules/assistant/hooks/use-assistant-status';
import { MemberAvatar } from '@/modules/team-member/components/member-avatar';
import { cn } from '@/lib/utils';

export interface DockAiColleague {
  id: string;
  name: string;
  title?: string;
  avatarUrl?: string | null;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  status: 'needYou' | 'working' | 'suggestions' | 'idle';
  placeholder: string;
}

const STATUS_DOT_CLASS: Record<string, string> = {
  needYou: 'bg-accent-red animate-pulse ring-2 ring-popover',
  working: 'bg-accent-blue animate-pulse ring-2 ring-popover',
  suggestions: 'bg-accent-yellow ring-2 ring-popover',
  idle: 'bg-accent-green ring-2 ring-popover',
};

export function BottomDock() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleTheme } = useTheme();
  const openAssistantWithDraft = useAppStore((s) => s.openAssistantWithDraft);
  const setAiPanelOpen = useAppStore((s) => s.setAiPanelOpen);
  const storeProjectId = useAppStore((s) => s.currentProjectId);
  const { data: unreadCount = 0 } = useUnreadNotificationsCount();

  // 当前激活的项目 ID（优先从路由路径提取，其次取 store 中的 currentProjectId）
  const routeProjectId = (() => {
    const match = location.pathname.match(/\/app\/projects\/([^/]+)/);
    return match ? match[1] : null;
  })();
  const activeProjectId = routeProjectId || storeProjectId || undefined;

  // 接入真实数据：获取当前项目/工作区的真实 AI 团队摘要与主助手状态
  const { data: officeSummary } = useOfficeSummary(activeProjectId);
  const assistantStatus = useAssistantStatus(activeProjectId);

  // 动态生成可供协同的 AI 同事清单（真实成员优先，缺省优雅兜底）
  const aiColleagues: DockAiColleague[] = useMemo(() => {
    const mainColleagueName = t('assistant.personaName') || '主协同助手';
    const mainAssistant: DockAiColleague = {
      id: 'assistant',
      name: mainColleagueName,
      title: t('assistant.personaRole') || '主协同助手',
      avatarUrl: null,
      icon: Bot,
      color: 'text-accent-purple',
      bgColor: 'bg-accent-purple-light',
      status: assistantStatus.state,
      placeholder: `向${mainColleagueName}提问或安排任务...`,
    };

    const realList = officeSummary?.colleagues ?? [];
    if (realList.length === 0) {
      return [
        mainAssistant,
        {
          id: 'executor',
          name: '执行守护专员',
          title: '终端与代码执行',
          avatarUrl: null,
          icon: Terminal,
          color: 'text-accent-blue',
          bgColor: 'bg-accent-blue-light',
          status: 'idle' as const,
          placeholder: '指派终端命令、Git 或代码执行任务...',
        },
        {
          id: 'auditor',
          name: '验收审计员',
          title: '门禁与契约审计',
          avatarUrl: null,
          icon: ShieldCheck,
          color: 'text-accent-green',
          bgColor: 'bg-accent-green-light',
          status: 'idle' as const,
          placeholder: '请求检查验收门禁、契约与审计状态...',
        },
      ];
    }

    const items: DockAiColleague[] = realList.map((c, index) => {
      const colorSchemes = [
        { color: 'text-accent-purple', bgColor: 'bg-accent-purple-light', icon: Bot },
        { color: 'text-accent-blue', bgColor: 'bg-accent-blue-light', icon: Terminal },
        { color: 'text-accent-green', bgColor: 'bg-accent-green-light', icon: ShieldCheck },
      ];
      const scheme = colorSchemes[index % colorSchemes.length];

      return {
        id: c.memberId,
        name: c.displayName,
        title: c.title || c.executionRole || 'AI 同事',
        avatarUrl: c.avatarUrl ?? null,
        icon: scheme.icon,
        color: scheme.color,
        bgColor: scheme.bgColor,
        status: c.status,
        placeholder: `向 [${c.displayName}] 提问或安排任务...`,
      };
    });

    const hasMain = items.some((item) => item.name === mainColleagueName);
    return hasMain ? items : [mainAssistant, ...items];
  }, [officeSummary?.colleagues, assistantStatus.state, t]);

  // 展开状态：是否变形展开为 Prompt 输入框
  const [isPromptOpen, setIsPromptOpen] = useState(false);
  const [promptText, setPromptText] = useState('');
  const [selectedColleagueId, setSelectedColleagueId] = useState<string>('assistant');
  const inputRef = useRef<HTMLInputElement>(null);
  const dockContainerRef = useRef<HTMLDivElement>(null);

  // 派生当前选中的 AI 同事
  const selectedColleague = useMemo(() => {
    return aiColleagues.find((c) => c.id === selectedColleagueId) || aiColleagues[0];
  }, [aiColleagues, selectedColleagueId]);

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

  // 点击外部收起展开的 Prompt 输入框，同时关闭对话面板
  useEffect(() => {
    if (!isPromptOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dockContainerRef.current &&
        !dockContainerRef.current.contains(e.target as Node)
      ) {
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
    const isMac = navigator.platform.toUpperCase().includes('MAC');
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      code: 'KeyK',
      ctrlKey: !isMac,
      metaKey: isMac,
      bubbles: true,
    });
    window.dispatchEvent(event);
  };

  return (
    <div
      ref={dockContainerRef}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 select-none"
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

              {/* ② 常用全局操作 */}
              <AppDockItem
                label={t('nav.issues') ? `新建 (${t('nav.issues')})` : '新建'}
                onClick={() => navigate('/app/issues?create=true')}
              >
                <Plus className="size-4" />
              </AppDockItem>

              <AppDockItem
                label={`命令与搜索 (${navigator.platform.toUpperCase().includes('MAC') ? '⌘K' : 'Ctrl+K'})`}
                onClick={handleOpenSearch}
              >
                <Search className="size-4" />
              </AppDockItem>

              <AppDockItem
                label={t('nav.notifications')}
                badge={unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount) : undefined}
                badgeTone="destructive"
                onClick={() => navigate('/app/notifications')}
              >
                <Bell className="size-4" />
              </AppDockItem>

              <AppDockItem
                label={mode === 'dark' ? '浅色模式' : '深色模式'}
                onClick={toggleTheme}
              >
                {mode === 'dark' ? (
                  <Sun className="size-4 text-accent-yellow" />
                ) : (
                  <Moon className="size-4" />
                )}
              </AppDockItem>

              <AppDockSeparator />

              {/* ③ AI 协同执行面：Sparkles 快捷呼出 | 真实 AI 成员头像群 */}
              <div className="flex items-center gap-1.5 pl-0.5 pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedColleagueId(aiColleagues[0].id);
                    setIsPromptOpen(true);
                    setAiPanelOpen(true);
                  }}
                  className="flex size-7 items-center justify-center rounded-full text-accent-purple hover:bg-accent/60 transition-colors"
                  title="点击呼出 AI 快捷指令栏与对话面板"
                >
                  <Sparkles className="size-4 text-accent-yellow" />
                </button>

                <div className="h-4 w-px bg-border/60" aria-hidden="true" />

                {/* AI 同事头像群（真实数据接入，支持点击指定角色直接展开针对该角色的 Prompt 输入） */}
                <div className="flex items-center gap-1.5">
                  {aiColleagues.map((colleague) => {
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
