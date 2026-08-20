import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Plus,
  Bell,
  HelpCircle,
  Sun,
  Moon,
  Settings,
  Play,
  SlidersHorizontal,
  Circle,
  Bot,
  X,
  Layers,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppStore } from '@/infrastructure/store/app-store';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import {
  getCurrentWorkspaceId,
  switchWorkspace,
  workspaceApi,
} from '@/modules/workspace/api/workspace-api';

interface FloatingActionsProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function FloatingActions({ theme, onToggleTheme }: FloatingActionsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { currentUser } = useAppStore();
  const activeWorkspaceId = getCurrentWorkspaceId();

  const { data: workspaceRes } = useQuery({
    queryKey: ['workspaces-list'],
    queryFn: () => workspaceApi.list(),
    staleTime: 60 * 1000,
  });
  const workspaces = workspaceRes?.workspaces ?? [];

  // 未读通知数量（可从通知系统获取）
  const unreadCount = 3;

  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const menuButtons = [
    {
      icon: Plus,
      label: '新建项目',
      onClick: () => {
        navigate('/app/projects');
        setIsOpen(false);
      },
    },
    {
      icon: Bell,
      label: '通知中心',
      badge: unreadCount,
      onClick: () => {
        navigate('/app/notifications');
        setIsOpen(false);
      },
    },
    {
      icon: HelpCircle,
      label: '帮助中心',
      onClick: () => {
        navigate('/app/settings');
        setIsOpen(false);
      },
    },
    {
      icon: theme === 'dark' ? Sun : Moon,
      label: theme === 'dark' ? '浅色模式' : '深色模式',
      onClick: () => {
        onToggleTheme();
      },
    },
    {
      icon: Settings,
      label: '系统设置',
      onClick: () => {
        navigate('/app/settings');
        setIsOpen(false);
      },
    },
    {
      icon: SlidersHorizontal,
      label: '侧栏自定义',
      onClick: () => {
        setIsOpen(false);
      },
    },
  ];

  return (
    <div ref={menuRef} className="fixed bottom-4 left-4 z-50 flex items-end gap-3">
      {/* 点击外部遮罩 */}
      {isOpen && (
        <button
          type="button"
          className={cn(
            'fixed inset-0 z-[-1]',
            theme === 'dark' ? 'bg-black/40' : 'bg-black/20',
          )}
          onClick={() => setIsOpen(false)}
          aria-label="关闭快捷面板"
        />
      )}

      {/* 左侧快捷操作按钮组 - 垂直排列，无背景 */}
      {isOpen && (
        <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-left-2 duration-200">
          {menuButtons.map((button, index) => (
            <div key={index} className="relative">
              <button
                type="button"
                onClick={button.onClick}
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                  'hover:scale-110 active:scale-95 shadow-md hover:shadow-lg',
                  theme === 'dark'
                    ? 'bg-neutral-800/90 hover:bg-neutral-700 text-neutral-300 hover:text-white border border-neutral-700 hover:border-neutral-600'
                    : 'bg-white/90 backdrop-blur-sm border border-border/60 hover:border-border text-muted-foreground hover:text-foreground',
                )}
                title={button.label}
              >
                <button.icon className="w-4 h-4" />
              </button>
              {/* 通知徽章 */}
              {button.badge && button.badge > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-semibold">
                  {button.badge}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 右侧工作区信息卡片 */}
      {isOpen && (
        <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-2 duration-200">
          {/* 状态胶囊区域 - 位于用户卡片正上方，左右并列 */}
          <div className="flex items-center gap-2">
            {/* 在线状态胶囊 */}
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                'hover:scale-105',
                theme === 'dark'
                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-200',
              )}
            >
              <Circle className="w-2 h-2 fill-current" />
              <span>在线</span>
            </button>

            {/* Agent在线状态胶囊 */}
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
                'hover:scale-105',
                theme === 'dark'
                  ? 'bg-violet-500/20 hover:bg-violet-500/30 text-violet-400 border border-violet-500/30'
                  : 'bg-violet-50 hover:bg-violet-100 text-violet-600 border border-violet-200',
              )}
            >
              <Bot className="w-3 h-3" />
              <span>Agent在线</span>
            </button>
          </div>

          {/* 用户信息卡片 */}
          <div
            className={cn(
              'w-72 rounded-xl overflow-hidden shadow-2xl',
              theme === 'dark'
                ? 'bg-neutral-900 border border-neutral-800'
                : 'bg-card border border-border',
            )}
          >
            {/* Workspace Section */}
            <div
              className={cn(
                'px-5 pt-4 pb-3',
                theme === 'dark' ? 'bg-neutral-800/50' : 'bg-accent/30',
              )}
            >
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5 font-semibold">
                工作区
              </div>
              <div className="max-h-44 space-y-0.5 overflow-y-auto">
                {workspaces.map((ws) => {
                  const active = ws.id === activeWorkspaceId;
                  return (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => {
                        if (!active) switchWorkspace(ws.id);
                        setIsOpen(false);
                      }}
                      className={cn(
                        'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                        active
                          ? theme === 'dark'
                            ? 'bg-neutral-700/70 text-neutral-100'
                            : 'bg-accent/70 text-foreground'
                          : theme === 'dark'
                            ? 'hover:bg-neutral-800 text-neutral-300'
                            : 'hover:bg-accent/60 text-muted-foreground',
                      )}
                    >
                      <Layers className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1 truncate">{ws.name}</span>
                      {active && <Check className="w-3 h-3 shrink-0 text-emerald-500" />}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => {
                    navigate('/app/workspaces/new');
                    setIsOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    theme === 'dark'
                      ? 'hover:bg-neutral-800 text-neutral-300'
                      : 'hover:bg-accent/60 text-muted-foreground',
                  )}
                >
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span>新建工作区…</span>
                </button>
              </div>
              <p className="mt-2 text-[10px] text-muted-foreground">
                工作区之间数据完全隔离，切换后需重新登录
              </p>
            </div>

            {/* User Section */}
            <div
              className={cn(
                'px-5 py-4',
                theme === 'dark' ? 'bg-neutral-800/30' : 'bg-accent/20',
              )}
            >
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2.5 font-semibold">
                User
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="w-9 h-9 rounded-full shadow-sm">
                  {currentUser?.avatarUrl ? (
                    <AvatarImage src={currentUser.avatarUrl} alt={currentUser?.displayName || currentUser?.username || 'User'} />
                  ) : null}
                  <AvatarFallback className={cn(
                    'font-semibold text-white',
                    theme === 'dark'
                      ? 'bg-gradient-to-br from-violet-600 to-indigo-700'
                      : 'bg-gradient-to-br from-violet-500 to-indigo-600',
                  )}>
                    {(currentUser?.displayName || currentUser?.username || 'U')[0]?.toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">
                    {currentUser?.displayName || currentUser?.username || 'User'}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {currentUser?.email || 'user@example.com'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Switch Button */}
            <div className={cn('p-4', theme === 'dark' ? 'bg-neutral-900' : 'bg-card')}>
              <button
                onClick={() => {
                  navigate('/app/projects/dashboard');
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg',
                  'text-xs font-medium transition-colors',
                  theme === 'dark'
                    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700 hover:border-neutral-600'
                    : 'bg-accent hover:bg-accent/80 text-foreground border border-border/50',
                )}
              >
                <Play size={14} className="fill-current" />
                <span>项目仪表盘</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 主触发按钮 - 圆形按钮 */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-12 h-12 rounded-full flex items-center justify-center',
          'transition-all duration-200 hover:scale-105 active:scale-95',
          theme === 'dark'
            ? 'bg-neutral-800 hover:bg-neutral-700 shadow-lg ring-4 ring-neutral-800/50'
            : 'bg-primary hover:bg-primary/90 shadow-xl ring-4 ring-primary/20',
          isOpen && 'scale-95',
        )}
        aria-label={isOpen ? '收起快捷面板' : '展开快捷面板'}
      >
        {isOpen ? (
          <X
            className={cn(
              'w-5 h-5 transition-colors',
              theme === 'dark' ? 'text-neutral-300' : 'text-primary-foreground',
            )}
          />
        ) : (
          <Avatar className={cn(
            'w-9 h-9 border-2',
            theme === 'dark' ? 'border-neutral-700 shadow-lg' : 'border-white shadow-inner',
          )}>
            {currentUser?.avatarUrl ? (
              <AvatarImage src={currentUser.avatarUrl} alt={currentUser?.displayName || currentUser?.username || 'User'} />
            ) : null}
            <AvatarFallback className={cn(
              'font-bold text-white text-xs',
              theme === 'dark'
                ? 'bg-gradient-to-br from-violet-600 to-indigo-700'
                : 'bg-gradient-to-br from-violet-500 to-indigo-600',
            )}>
              {(currentUser?.displayName || currentUser?.username || 'U')[0]?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        )}
      </button>
    </div>
  );
}
