/**
 * 「即将发版」区（CAP-K-03 批三）：列表页内容区顶部的计划告示条。
 * 数据口径 = 未发布（draft/gated/approved/publishing）且填了 plannedAt 的发版，
 * 按计划时间升序取前 5 条；逾期红 tone + 「逾期 N 天 / N 天后」；
 * 无数据整块不渲染（不发骨架、不发空态）。
 */
import { useTranslation } from 'react-i18next';
import { CalendarClock } from 'lucide-react';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { RELEASE_STATUS_VISUALS, statusLabelKey } from '../release-status-meta';
import type { ReleaseRecord } from '../api/release-api';
import { cn } from '@/lib/utils';

/** 即将发版排序键：未发布且有计划时间的行，按计划时间升序 */
function byPlannedAsc(a: ReleaseRecord, b: ReleaseRecord) {
  return (
    new Date(a.plannedAt ?? 0).getTime() - new Date(b.plannedAt ?? 0).getTime()
  );
}

export function collectUpcomingReleases(
  releases: ReleaseRecord[],
  now = new Date(),
): ReleaseRecord[] {
  return releases
    .filter(
      (r) =>
        r.status !== 'released' &&
        r.status !== 'failed' &&
        !!r.plannedAt,
    )
    .sort(byPlannedAsc)
    .slice(0, 5);
}

function PlannedMeta({ release }: { release: ReleaseRecord }) {
  const { t } = useTranslation();
  const planned = release.plannedAt ? new Date(release.plannedAt) : null;
  if (!planned || isNaN(planned.getTime())) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  const diffDays = Math.floor(
    (planned.getTime() - new Date().setHours(0, 0, 0, 0)) / dayMs,
  );
  const overdue = diffDays < 0;
  return (
    <span
      className={cn(
        'shrink-0 whitespace-nowrap text-xs',
        overdue ? 'font-medium text-accent-red' : 'text-muted-foreground',
      )}
    >
      {planned.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      <span className="ml-1.5 text-2xs">
        {overdue
          ? t('release.upcoming.overdue', { days: Math.abs(diffDays) })
          : diffDays === 0
            ? t('release.upcoming.today')
            : t('release.upcoming.inDays', { days: diffDays })}
      </span>
    </span>
  );
}

export function ReleaseUpcomingSection({
  releases,
  onItemClick,
}: {
  releases: ReleaseRecord[];
  onItemClick: (release: ReleaseRecord) => void;
}) {
  const { t } = useTranslation();
  const upcoming = collectUpcomingReleases(releases);
  if (upcoming.length === 0) return null;

  return (
    <section
      aria-label={t('release.upcoming.title')}
      className="mb-3 rounded-md border border-border bg-muted/30 px-3 py-2"
    >
      <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-content-text">
        <CalendarClock className="size-3.5 text-accent-blue" />
        {t('release.upcoming.title')}
      </p>
      <ul className="divide-y divide-border/60">
        {upcoming.map((r) => {
          const visual = RELEASE_STATUS_VISUALS[r.status];
          return (
            <li key={r.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 py-1.5 text-left transition-colors duration-fast hover:bg-muted/50"
                onClick={() => onItemClick(r)}
              >
                <StatusIconFrame
                  icon={visual.icon}
                  tone={visual.tone}
                  size="xs"
                  spin={r.status === 'publishing'}
                  title={t(statusLabelKey(r.status))}
                />
                <span className="shrink-0 whitespace-nowrap font-mono text-xs font-medium text-muted-foreground/70">
                  v{r.version}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs">
                  {r.name || t('release.upcoming.unnamed')}
                </span>
                <PlannedMeta release={r} />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
