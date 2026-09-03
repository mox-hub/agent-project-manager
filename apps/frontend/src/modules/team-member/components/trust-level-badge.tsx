import { ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { MEMBER_TRUST_LEVEL_LABELS } from '@/shared/member/types';

export interface TrustLevelBadgeProps {
  /** 信任等级 0-4；null 显示未评估 */
  level?: number | null;
  score?: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

const LEVEL_STYLES = [
  'bg-muted text-muted-foreground',
  'bg-accent-red/10 text-accent-red',
  'bg-accent-yellow/10 text-accent-yellow',
  'bg-accent-blue/10 text-accent-blue',
  'bg-accent-green/10 text-accent-green',
];

/** 信任等级徽标：L0-L4 五档语义色，附带信任分 */
export function TrustLevelBadge({ level, score, size = 'sm', className }: TrustLevelBadgeProps) {
  if (level === null || level === undefined) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground',
          size === 'sm' ? 'h-5 px-1.5 text-10' : 'h-6 px-2 text-xs',
          className,
        )}
      >
        <ShieldCheck className="size-3" />
        未评估
      </span>
    );
  }

  const clamped = Math.max(0, Math.min(4, level));

  return (
    <span
      title={score !== null && score !== undefined ? `信任分 ${score}` : undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        LEVEL_STYLES[clamped],
        size === 'sm' ? 'h-5 px-1.5 text-10' : 'h-6 px-2 text-xs',
        className,
      )}
    >
      <ShieldCheck className="size-3" />
      {MEMBER_TRUST_LEVEL_LABELS[clamped]}
      {score !== null && score !== undefined && (
        <span className="opacity-70">{score}</span>
      )}
    </span>
  );
}
