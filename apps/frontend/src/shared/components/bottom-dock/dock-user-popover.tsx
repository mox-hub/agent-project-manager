import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layers, Check, Plus, ArrowUpRight, LogOut, Settings, Database } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  getCurrentWorkspaceId,
  switchWorkspace,
  workspaceApi,
} from '@/modules/workspace/api/workspace-api';
import { cn } from '@/lib/utils';

/**
 * DockUserPopover - 为底部 Dock 定制的工作区与用户中枢
 * 精致紧凑的桌面级弹窗设计，去臃肿化，专注工作区切换与核心身份操作
 */
export function DockUserPopover() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { currentUser: storeUser } = useAppStore();
  const { currentUser: authUser, logout, roles } = useAuth();
  const currentUser = authUser || storeUser;
  const activeWorkspaceId = getCurrentWorkspaceId();

  const { data: workspaceRes } = useQuery({
    queryKey: ['workspaces-list'],
    queryFn: () => workspaceApi.list(),
    staleTime: 60 * 1000,
  });
  const workspaces = workspaceRes?.workspaces ?? [];
  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const initialLetter = (
    currentUser?.displayName ||
    currentUser?.username ||
    'U'
  )[0]?.toUpperCase();

  const isGlobalAdmin = roles.some(
    (r) => r.scopeType === 'global' && r.role === 'admin',
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="账号与工作区菜单"
          className={cn(
            'group flex items-center gap-2 py-1 pl-1 pr-2.5 rounded-full transition-all duration-150',
            'hover:bg-accent/70 text-foreground active:scale-95',
            open && 'bg-accent/80 shadow-xs',
          )}
        >
          <div className="relative">
            <Avatar className="size-7 ring-1 ring-border/70 group-hover:ring-border transition-all">
              {currentUser?.avatarUrl && (
                <AvatarImage
                  src={currentUser.avatarUrl}
                  alt={currentUser?.displayName || currentUser?.username || 'User'}
                />
              )}
              <AvatarFallback className="text-11 bg-primary text-primary-foreground font-semibold">
                {initialLetter}
              </AvatarFallback>
            </Avatar>
            {/* 在线指示绿点 */}
            <span
              className="absolute -bottom-0.5 -right-0.5 size-2 rounded-full bg-accent-green ring-2 ring-popover"
              aria-hidden="true"
            />
          </div>

          <div className="flex flex-col text-left">
            <span className="text-xs font-semibold text-foreground max-w-24 truncate leading-tight">
              {currentWorkspace?.name ?? '默认空间'}
            </span>
            <span className="text-10 text-content-text-muted leading-tight">
              工作区路由
            </span>
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        side="top"
        align="start"
        sideOffset={14}
        className="w-72 p-2 overflow-hidden shadow-2xl rounded-2xl border-border/80 bg-popover/95 backdrop-blur-2xl"
      >
        {/* 1. 一体化紧凑身份条：头像 + 姓名/角色 + 快捷设置与登出 */}
        <div className="flex items-center gap-2.5 rounded-xl bg-accent/40 px-3 py-2 border border-border/40">
          <Avatar className="size-8 ring-1 ring-border/60 shrink-0">
            {currentUser?.avatarUrl && (
              <AvatarImage
                src={currentUser.avatarUrl}
                alt={currentUser?.displayName || currentUser?.username || 'User'}
              />
            )}
            <AvatarFallback className="text-11 bg-primary text-primary-foreground font-semibold">
              {initialLetter}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-xs truncate text-foreground leading-snug">
              {currentUser?.displayName || currentUser?.username || 'User'}
            </div>
            <div className="text-10 text-content-text-muted truncate">
              {isGlobalAdmin ? '全局管理员' : '协作者'} · 在线
            </div>
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                navigate('/app/settings');
                setOpen(false);
              }}
              title="偏好设置"
              className="flex size-6.5 items-center justify-center rounded-lg text-content-text-muted hover:bg-accent hover:text-foreground transition-colors"
            >
              <Settings className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                logout();
              }}
              title="退出登录"
              className="flex size-6.5 items-center justify-center rounded-lg text-content-text-muted hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>

        {/* 2. 工作区空间列表区 */}
        <div className="mt-2 px-1">
          <div className="flex items-center justify-between pb-1.5 pt-1 px-1">
            <span className="text-10 font-bold uppercase tracking-wider text-content-text-muted flex items-center gap-1.5">
              <Database className="size-3 text-accent-purple" />
              <span>工作区切换</span>
              <span className="rounded-full bg-accent px-1.5 py-0.2 text-10 font-mono text-foreground">
                {workspaces.length}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                navigate('/app/workspaces/new');
                setOpen(false);
              }}
              className="flex items-center gap-1 text-10 font-medium text-accent-purple hover:underline"
            >
              <Plus className="size-3" />
              <span>新建</span>
            </button>
          </div>

          <div className="max-h-44 overflow-y-auto space-y-1 pr-0.5">
            {workspaces.map((ws) => {
              const isActive = ws.id === activeWorkspaceId;
              return (
                <button
                  key={ws.id}
                  type="button"
                  onClick={() => {
                    if (!isActive) switchWorkspace(ws.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'group/ws flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-all text-left border',
                    isActive
                      ? 'bg-accent/80 border-accent-purple/40 text-foreground shadow-2xs font-medium'
                      : 'border-transparent text-content-text-secondary hover:bg-accent/40 hover:text-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-lg transition-colors',
                      isActive
                        ? 'bg-accent-purple text-primary-foreground'
                        : 'bg-muted/70 text-content-text-muted group-hover/ws:text-foreground',
                    )}
                  >
                    <Layers className="size-3.5" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs leading-tight font-medium">
                      {ws.name}
                    </div>
                    <div className="text-10 text-content-text-muted font-mono leading-tight truncate">
                      {ws.slug || ws.id.slice(0, 8)}
                    </div>
                  </div>

                  {isActive && (
                    <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-accent-green-light text-accent-green">
                      <Check className="size-3" strokeWidth={2.5} />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. 底部极简仪表盘快捷入口 */}
        <div className="mt-2 pt-1 border-t border-border/50 px-1">
          <button
            type="button"
            onClick={() => {
              navigate('/app/projects/dashboard');
              setOpen(false);
            }}
            className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs text-content-text-muted hover:bg-accent hover:text-foreground transition-colors"
          >
            <span className="text-11">进入项目仪表盘</span>
            <ArrowUpRight className="size-3.5 text-content-text-muted" />
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
