import { Eye, Shield, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import {
  MEMBER_TRUST_TIERS,
  normalizeTrustLevel,
  type MemberTrustTier,
} from '@/shared/member/types';

export interface TrustLevelBadgeProps {
  /** 信任等级 1-3（三级口径，兼容旧 0-4 存量归一）；null 显示未评估 */
  level?: number | null;
  size?: 'sm' | 'md';
  className?: string;
}

/** 三级等级视觉：观察者=黄（谨慎）/ 协助者=蓝（常规）/ 受托者=绿（受托） */
const TIER_STYLE: Record<MemberTrustTier, string> = {
  1: 'bg-accent-yellow/10 text-accent-yellow',
  2: 'bg-accent-blue/10 text-accent-blue',
  3: 'bg-accent-green/10 text-accent-green',
};

const TIER_ICON: Record<MemberTrustTier, typeof ShieldCheck> = {
  1: Eye,
  2: Shield,
  3: ShieldCheck,
};

/** 信任等级徽标：三级分级授权口径（观察者/协助者/受托者），只显等级不显分数 */
export function TrustLevelBadge({ level, size = 'sm', className }: TrustLevelBadgeProps) {
  const { t } = useTranslation();
  const tier = normalizeTrustLevel(level);

  if (tier === null) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-muted text-muted-foreground',
          size === 'sm' ? 'h-5 px-1.5 text-10' : 'h-6 px-2 text-xs',
          className,
        )}
      >
        <ShieldCheck className="size-3" />
        {t('trust.unrated')}
      </span>
    );
  }

  const def = MEMBER_TRUST_TIERS[tier - 1];
  const Icon = TIER_ICON[tier];

  return (
    <span
      title={t(def.labelKey)}
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        TIER_STYLE[tier],
        size === 'sm' ? 'h-5 px-1.5 text-10' : 'h-6 px-2 text-xs',
        className,
      )}
    >
      <Icon className="size-3" />
      {t(def.labelKey)}
    </span>
  );
}
