/**
 * ModeShuttleButton - 智能体穿梭模式切换按钮（CAP-A-18 V2）
 *
 * 位于创建面板底部，采用系统默认 AI 紫色系配色（accent-purple），
 * 并具备柔和呼吸感微光动效，在手动表单与智能体澄清/拆解模式间无缝穿梭。
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeftRight, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ModeShuttleButtonProps {
  mode: 'manual' | 'ai';
  onToggle: () => void;
  className?: string;
  disabled?: boolean;
}

export function ModeShuttleButton({
  mode,
  onToggle,
  className,
  disabled,
}: ModeShuttleButtonProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      data-testid="mode-shuttle-button"
      title={mode === 'manual' ? '切换到智能体对话与需求拆解' : '返回手动表单精准录入'}
      className={cn(
        'group relative inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-300 select-none overflow-hidden shrink-0',
        // 系统默认 AI 配色（紫色系）+ 柔和呼吸微光
        'border border-accent-purple/40 bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20',
        'shadow-xs hover:shadow-sm',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent-purple/60',
        mode === 'ai' && 'bg-accent-purple/20 border-accent-purple/60 shadow-sm',
        className,
      )}
    >
      {/* 呼吸微光小光标 */}
      <span className="relative flex size-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-purple opacity-75 duration-1000" />
        <span className="relative inline-flex rounded-full size-2 bg-accent-purple" />
      </span>

      {mode === 'manual' ? (
        <>
          <ArrowLeftRight className="size-3.5 text-accent-purple transition-transform group-hover:scale-110" />
          <span>{t('unifiedCreate.shuttle.toAi', { defaultValue: '切换到智能体' })}</span>
        </>
      ) : (
        <>
          <Sparkles className="size-3.5 text-accent-purple animate-spin-slow" />
          <span>{t('unifiedCreate.shuttle.toManual', { defaultValue: '返回手动编辑' })}</span>
        </>
      )}
    </button>
  );
}
