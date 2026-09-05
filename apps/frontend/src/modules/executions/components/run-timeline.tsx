/**
 * 运行时间轴 —— 模型/工具双行活动条（对照运行详情设计稿中部）。
 * 纯展示组件，数据由 computeTimelineRows 计算。
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import type { ExecutionStepRecord } from '../api/execution-api';
import {
  computeTimelineRows,
  formatDurationMs,
  type TimelineRowData,
} from './run-details-format';

const BAR_TONE_CLASS: Record<TimelineRowData['bars'][number]['tone'], string> = {
  model: 'bg-accent-green',
  tools: 'bg-accent-blue',
  error: 'bg-accent-red',
};

const ROW_LABEL_KEY = {
  model: 'runDetails.timeline.model',
  tools: 'runDetails.timeline.tools',
} as const;

function TimelineTrack({ row }: { row: TimelineRowData }) {
  if (row.bars.length === 0) {
    return (
      <div className="h-2.5 flex-1 rounded-full bg-muted/50" />
    );
  }
  return (
    <div className="relative h-2.5 flex-1 rounded-full bg-muted/50">
      {row.bars.map((bar) => (
        <span
          key={bar.key}
          title={bar.name}
          className={cn(
            'absolute inset-y-0 rounded-full',
            BAR_TONE_CLASS[bar.tone],
          )}
          style={{ left: `${bar.leftPct}%`, width: `${bar.widthPct}%` }}
        />
      ))}
    </div>
  );
}

export function RunTimeline({
  steps,
  windowStart,
  windowEnd,
  className,
}: {
  steps: ExecutionStepRecord[];
  windowStart: string;
  windowEnd: string;
  className?: string;
}) {
  const { t } = useTranslation();
  const rows = computeTimelineRows(steps, windowStart, windowEnd);

  return (
    <div className={cn('space-y-1.5', className)}>
      {rows.map((row) => (
        <div key={row.key} className="flex items-center gap-3">
          <div className="w-10 shrink-0 text-right">
            <p className="text-11 text-content-text-secondary">
              {t(ROW_LABEL_KEY[row.key])}
            </p>
            {row.totalMs > 0 ? (
              <p className="text-10 text-content-text-muted">
                {formatDurationMs(row.totalMs)}
              </p>
            ) : null}
          </div>
          <TimelineTrack row={row} />
        </div>
      ))}
    </div>
  );
}
