import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Clock3, Percent } from 'lucide-react';
import type { ProfileResponse } from '../../api/profile-api';

/** 90 天未刷新视为过期（与 dashboard profile-health 同一口径） */
const STALE_MS = 90 * 24 * 3600 * 1000;

/** 派生健康指标（模块级辅助函数：时钟读取不进组件渲染体） */
function deriveHealth(profile: ProfileResponse): {
  avgConfidence: number | null;
  staleSlots: number;
  filledSlots: number;
} {
  const now = Date.now();
  const consolidated = profile.slots.flatMap((s) => s.atoms);
  const avgConfidence =
    consolidated.length > 0
      ? Math.round(
          (consolidated.reduce((sum, a) => sum + a.confidence, 0) /
            consolidated.length) *
            100,
        )
      : null;
  const staleSlots = profile.slots.filter(
    (s) =>
      s.filled &&
      s.lastRefreshedAt &&
      now - new Date(s.lastRefreshedAt).getTime() > STALE_MS,
  ).length;
  const filledSlots = profile.slots.filter((s) => s.filled).length;
  return { avgConfidence, staleSlots, filledSlots };
}

/**
 * 档案页顶部健康条（v2 纪要 §4.4「档案健康落 dashboard + 档案页顶部」）：
 * 生效原子平均置信度 + 过期槽位计数，纯派生自 profile 聚合数据，零额外请求。
 */
export function ProfileHealthChips({ profile }: { profile: ProfileResponse }) {
  const { t } = useTranslation();
  const { avgConfidence, staleSlots, filledSlots } = deriveHealth(profile);

  if (filledSlots === 0) return null;

  return (
    <div className="flex items-center gap-1.5" data-ai="profile.health-chips">
      {avgConfidence !== null ? (
        <Badge
          variant="outline"
          className="gap-1 text-10"
          title={t('project.profilePage.avgConfidence')}
        >
          <Percent className="size-3" />
          {t('project.profilePage.avgConfidence')} {avgConfidence}%
        </Badge>
      ) : null}
      {staleSlots > 0 ? (
        <Badge
          className="gap-1 rounded-full border border-accent-yellow/40 bg-accent-yellow-light text-10 text-accent-yellow"
          title={t('project.profilePage.staleHint')}
        >
          <Clock3 className="size-3" />
          {t('project.profilePage.staleSlots', { n: staleSlots })}
        </Badge>
      ) : null}
    </div>
  );
}
