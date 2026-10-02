/**
 * 信任等级面板 —— 办公室页「信任等级」入口内容（CAP-B-07 三级分级授权）。
 * 由设置页「AI 执行中心」信任 tab 迁移（2026-10-02 UI 收口，原 tab 数据源
 * 为 TODO 空实现仅剩静态说明）：三级等级定义卡 + 红线说明，纯展示无门禁联动。
 */
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Eye, Shield, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { MEMBER_TRUST_TIERS, type MemberTrustTierDef } from '@/shared/member/types';

/** 等级图标：与 team-member TrustLevelBadge 同源口径（观察者/协助者/受托者） */
export const TRUST_TIER_ICON: Record<number, typeof ShieldCheck> = {
  1: Eye,
  2: Shield,
  3: ShieldCheck,
};

/** 等级文字色：黄/蓝/绿（与 TrustLevelBadge 底色口径一致） */
export const TRUST_TIER_TEXT_COLOR: Record<number, string> = {
  1: 'text-accent-yellow',
  2: 'text-accent-blue',
  3: 'text-accent-green',
};

/** 等级定义卡：等级名 + 一句话定位 + 该级放权清单（静态展示，无门禁联动）；
 *  三列并排形态依赖弹层宽档（Dialog size="wide"，宪法 §10.8）——窄容器下会挤压断行，勿降档使用 */
function TrustTierCard({ tier }: { tier: MemberTrustTierDef }) {
  const { t } = useTranslation();
  const Icon = TRUST_TIER_ICON[tier.level];
  return (
    <Card surface="flat">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon size={16} className={TRUST_TIER_TEXT_COLOR[tier.level]} />
          {t(tier.labelKey)}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xs text-muted-foreground">{t(tier.descKey)}</p>
        <div className="mt-3 space-y-1.5">
          <h4 className="text-3xs font-medium uppercase tracking-wider text-muted-foreground">
            {t('trust.delegationTitle')}
          </h4>
          {tier.allowKeys.map((key) => (
            <div key={key} className="flex items-start gap-1.5 text-xs">
              <CheckCircle2 className="mt-0.5 size-3 shrink-0 text-accent-green" />
              <span className="text-foreground">{t(key)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/** 红线说明条：任何等级都永远须人确认（静态展示，不做门禁联动） */
function TrustRedlineNote() {
  const { t } = useTranslation();
  const redlines = [
    'trust.redlinePublish',
    'trust.redlineDelete',
    'trust.redlineSpending',
    'trust.redlineMembers',
  ];
  return (
    <div className="rounded-lg border border-accent-red/30 bg-accent-red/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium text-accent-red">
        <AlertTriangle className="size-4 shrink-0" />
        {t('trust.redlineTitle')}
      </p>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {redlines.map((key) => (
          <span key={key}>· {t(key)}</span>
        ))}
      </div>
      <p className="mt-2 text-3xs text-muted-foreground/80">{t('trust.redlineNote')}</p>
    </div>
  );
}

/** 组合面板：三级定义卡三列网格 + 红线说明（办公室页入口弹层内容，须配 Dialog size="wide"） */
export function TrustTiersPanel({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid gap-3 sm:grid-cols-3">
        {MEMBER_TRUST_TIERS.map((tier) => (
          <TrustTierCard key={tier.level} tier={tier} />
        ))}
      </div>
      <TrustRedlineNote />
    </div>
  );
}
