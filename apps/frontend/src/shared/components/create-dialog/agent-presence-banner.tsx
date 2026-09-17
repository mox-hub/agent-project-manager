/**
 * AgentPresenceBanner - AI 智能体在场感知条与执行策略下拉（CAP-A-18 V2）
 *
 * 规范：当 Assignee 指派给 AI Agent（Mika 等）时平滑淡入，
 * 给予人类清晰的“AI 同事已就绪”反馈，并提供立即执行/需审批/仅建待办三档策略切换。
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Bot, Zap, Shield, Pause, ChevronDown } from 'lucide-react';
import type { Member } from '@/modules/team-member/types';
import { MemberAvatar } from '@/components/ui/property-panel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { CreateType } from './unified-create-dialog';

export type DispatchStrategy = 'immediate' | 'approval' | 'manual_dispatch';

export interface AgentPresenceBannerProps {
  assigneeId?: string;
  members: Member[];
  activeType: CreateType;
  strategy: DispatchStrategy;
  onStrategyChange: (strategy: DispatchStrategy) => void;
}

export function AgentPresenceBanner({
  assigneeId,
  members,
  activeType,
  strategy,
  onStrategyChange,
}: AgentPresenceBannerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = React.useState(false);

  const currentMember = React.useMemo(
    () => members.find((m) => m.id === assigneeId),
    [members, assigneeId],
  );

  // 仅在经办人为 AI Agent 时激活在场感知
  const isAgent = currentMember?.type === 'ai_agent';
  if (!isAgent || !currentMember) {
    return null;
  }

  const agentName = currentMember.displayName || 'AI 智能体';

  // 根据策略和实体类型动态派生感知条说明
  const feedbackText = (() => {
    if (activeType === 'bug') {
      if (strategy === 'immediate') {
        return t('unifiedCreate.agentPresence.bugImmediate', {
          agent: agentName,
          defaultValue: `创建后 ${agentName} 将调取日志并自动尝试复现。`,
        });
      }
      if (strategy === 'approval') {
        return t('unifiedCreate.agentPresence.bugApproval', {
          agent: agentName,
          defaultValue: `创建后需经审批，${agentName} 方可介入排查。`,
        });
      }
      return t('unifiedCreate.agentPresence.bugManual', {
        agent: agentName,
        defaultValue: `缺陷将录入待办，保留给 ${agentName} 后续排查。`,
      });
    }

    // 默认 task 实体
    if (strategy === 'immediate') {
      return t('unifiedCreate.agentPresence.immediate', {
        agent: agentName,
        defaultValue: `创建后 ${agentName} 会立即开始工作。`,
      });
    }
    if (strategy === 'approval') {
      return t('unifiedCreate.agentPresence.approval', {
        agent: agentName,
        defaultValue: `创建后需经审批，通过后 ${agentName} 才会工作。`,
      });
    }
    return t('unifiedCreate.agentPresence.manual', {
      agent: agentName,
      defaultValue: `仅创建待办工单，保留给 ${agentName} 等待手动派发。`,
    });
  })();

  const strategyConfig = {
    immediate: {
      label: t('unifiedCreate.dispatchStrategy.immediate', { defaultValue: '立即执行' }),
      icon: Zap,
      iconClass: 'text-accent-green',
      badgeClass: 'text-accent-green border-accent-green/30 bg-accent-green/10',
    },
    approval: {
      label: t('unifiedCreate.dispatchStrategy.approval', { defaultValue: '需审批' }),
      icon: Shield,
      iconClass: 'text-accent-yellow',
      badgeClass: 'text-accent-yellow border-accent-yellow/30 bg-accent-yellow/10',
    },
    manual_dispatch: {
      label: t('unifiedCreate.dispatchStrategy.manual', { defaultValue: '仅建待办' }),
      icon: Pause,
      iconClass: 'text-muted-foreground',
      badgeClass: 'text-muted-foreground border-border bg-muted/30',
    },
  }[strategy];

  const CurrentIcon = strategyConfig.icon;

  return (
    <div
      data-testid="agent-presence-banner"
      className="flex items-center justify-between gap-3 px-3.5 py-2 rounded-lg border border-accent-purple/20 bg-accent-purple/5 text-xs text-foreground/90 transition-all animate-in fade-in slide-in-from-top-1 duration-200"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="relative shrink-0 flex items-center justify-center size-5 rounded-full bg-accent-purple/15 text-accent-purple">
          {currentMember.avatarUrl ? (
            <MemberAvatar name={agentName} avatarUrl={currentMember.avatarUrl} size="xs" />
          ) : (
            <Bot className="size-3" />
          )}
          <span
            className={cn(
              'absolute -bottom-0.5 -right-0.5 size-1.5 rounded-full border border-card ring-1 ring-card',
              strategy === 'immediate'
                ? 'bg-accent-green animate-pulse'
                : strategy === 'approval'
                  ? 'bg-accent-yellow'
                  : 'bg-muted-foreground/60',
            )}
          />
        </div>
        <span className="truncate text-foreground/80 font-medium">{feedbackText}</span>
      </div>

      {/* 执行策略选择器 Popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          render={
            <button
              type="button"
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-11 font-medium transition-colors hover:opacity-90 shrink-0',
                strategyConfig.badgeClass,
              )}
            >
              <CurrentIcon className={cn('size-3', strategyConfig.iconClass)} />
              <span>{strategyConfig.label}</span>
              <ChevronDown className="size-2.5 opacity-60" />
            </button>
          }
        />
        <PopoverContent
          align="end"
          sideOffset={6}
          className="w-48 p-1 shadow-xl border border-border/70 bg-popover/95 backdrop-blur-md"
        >
          <div className="flex flex-col gap-0.5">
            <button
              type="button"
              onClick={() => {
                onStrategyChange('immediate');
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent',
                strategy === 'immediate' && 'bg-accent font-medium text-foreground',
              )}
            >
              <Zap className="size-3.5 text-accent-green shrink-0" />
              <div className="flex flex-col">
                <span>{t('unifiedCreate.dispatchStrategy.immediate', { defaultValue: '立即执行' })}</span>
                <span className="text-10 text-muted-foreground">落库后立即调度运行</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                onStrategyChange('approval');
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent',
                strategy === 'approval' && 'bg-accent font-medium text-foreground',
              )}
            >
              <Shield className="size-3.5 text-accent-yellow shrink-0" />
              <div className="flex flex-col">
                <span>{t('unifiedCreate.dispatchStrategy.approval', { defaultValue: '需审批' })}</span>
                <span className="text-10 text-muted-foreground">进入决策收件箱审批</span>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                onStrategyChange('manual_dispatch');
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-left transition-colors hover:bg-accent',
                strategy === 'manual_dispatch' && 'bg-accent font-medium text-foreground',
              )}
            >
              <Pause className="size-3.5 text-muted-foreground shrink-0" />
              <div className="flex flex-col">
                <span>{t('unifiedCreate.dispatchStrategy.manual', { defaultValue: '仅建待办' })}</span>
                <span className="text-10 text-muted-foreground">放入待办列手动启动</span>
              </div>
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
