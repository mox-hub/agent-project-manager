import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { cn } from '@/lib/utils';

import { Bot } from 'lucide-react';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export interface GanttChartItem {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  status?: string;
  priority?: string;
  colorClassName?: string;
  meta?: string;
  isAiExecuting?: boolean;
  aiExecutionSummary?: string;
}

export interface GanttDateRange {
  startDate: string;
  endDate: string;
}

export type GanttScale = 'day' | 'week' | 'month';

export interface GanttChartProps {
  items: GanttChartItem[];
  onItemClick?: (itemId: string) => void;
  onItemDateChange?: (itemId: string, range: GanttDateRange) => Promise<void> | void;
  readonly?: boolean;
  className?: string;
  emptyMessage?: string;
  leftColumnTitle?: string;
  scale?: GanttScale;
  onScaleChange?: (scale: GanttScale) => void;
}

type DragMode = 'move' | 'resize-start' | 'resize-end';

interface DragState {
  itemId: string;
  mode: DragMode;
  startX: number;
  initialStart: Date;
  initialEnd: Date;
  currentStart?: Date;
  currentEnd?: Date;
}

function parseDateOnly(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function dayDiff(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / MS_PER_DAY);
}

function getMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getBarColorClass(item: GanttChartItem): string {
  if (item.colorClassName) return item.colorClassName;
  if (item.status === 'done') return 'bg-accent-green';
  if (item.status === 'in_progress') return 'bg-accent-blue';
  if (item.status === 'in_review') return 'bg-accent-yellow';
  if (item.priority === 'critical' || item.priority === 'high') return 'bg-accent-red';
  return 'bg-muted-foreground';
}

export function GanttChart({
  items,
  onItemClick,
  onItemDateChange,
  readonly = false,
  className,
  emptyMessage = 'No timeline data to display',
  leftColumnTitle = 'Item',
  scale = 'day',
  onScaleChange,
}: GanttChartProps) {
  const [internalScale, setInternalScale] = useState<GanttScale>(scale);
  const currentScale = onScaleChange ? scale : internalScale;
  const setScale = onScaleChange ?? setInternalScale;

  const dayWidth = currentScale === 'month' ? 14 : currentScale === 'week' ? 20 : 28;

  const [draftRanges, setDraftRanges] = useState<Record<string, { start: Date; end: Date }>>({});
  const dragStateRef = useRef<DragState | null>(null);

  const normalizedItems = useMemo(() => {
    return items
      .map((item) => {
        const start = parseDateOnly(item.startDate);
        const end = parseDateOnly(item.endDate);
        if (!start || !end) return null;
        const safeStart = start <= end ? start : end;
        const safeEnd = start <= end ? end : start;
        return {
          ...item,
          start: draftRanges[item.id]?.start ?? safeStart,
          end: draftRanges[item.id]?.end ?? safeEnd,
        };
      })
      .filter((item): item is GanttChartItem & { start: Date; end: Date } => item !== null);
  }, [items, draftRanges]);

  const timeline = useMemo(() => {
    if (normalizedItems.length === 0) {
      return null;
    }
    const starts = normalizedItems.map((item) => item.start.getTime());
    const ends = normalizedItems.map((item) => item.end.getTime());
    const minDate = new Date(Math.min(...starts));
    const maxDate = new Date(Math.max(...ends));
    const start = addDays(minDate, -3);
    const end = addDays(maxDate, 3);
    const days: Date[] = [];
    for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
      days.push(cursor);
    }
    return { start, end, days };
  }, [normalizedItems]);

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const drag = dragStateRef.current;
      if (!drag) return;
      const deltaDays = Math.round((event.clientX - drag.startX) / dayWidth);
      if (!Number.isFinite(deltaDays)) return;
      if (deltaDays === 0) return;

      let nextStart = drag.initialStart;
      let nextEnd = drag.initialEnd;

      if (drag.mode === 'move') {
        nextStart = addDays(drag.initialStart, deltaDays);
        nextEnd = addDays(drag.initialEnd, deltaDays);
      } else if (drag.mode === 'resize-start') {
        nextStart = addDays(drag.initialStart, deltaDays);
        if (nextStart > drag.initialEnd) nextStart = drag.initialEnd;
      } else {
        nextEnd = addDays(drag.initialEnd, deltaDays);
        if (nextEnd < drag.initialStart) nextEnd = drag.initialStart;
      }

      dragStateRef.current = {
        ...drag,
        currentStart: nextStart,
        currentEnd: nextEnd,
      };

      setDraftRanges((prev) => ({
        ...prev,
        [drag.itemId]: { start: nextStart, end: nextEnd },
      }));
    };

    const handlePointerUp = () => {
      const drag = dragStateRef.current;
      if (!drag) return;
      dragStateRef.current = null;
      const range =
        (drag.currentStart && drag.currentEnd
          ? { start: drag.currentStart, end: drag.currentEnd }
          : draftRanges[drag.itemId]) ?? null;
      if (!range || !onItemDateChange) return;

      Promise.resolve(
        onItemDateChange(drag.itemId, {
          startDate: formatDateOnly(range.start),
          endDate: formatDateOnly(range.end),
        }),
      ).catch(() => {
        setDraftRanges((prev) => {
          const next = { ...prev };
          delete next[drag.itemId];
          return next;
        });
      });
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [draftRanges, onItemDateChange, dayWidth]);

  if (!timeline || normalizedItems.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/50 p-6 text-center text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const totalWidth = timeline.days.length * dayWidth;
  const today = parseDateOnly(new Date().toISOString());
  const todayOffset = today ? dayDiff(timeline.start, today) : -1;

  const startDrag = (
    event: ReactPointerEvent<HTMLDivElement>,
    item: { id: string; start: Date; end: Date },
    mode: DragMode,
  ) => {
    if (readonly) return;
    event.preventDefault();
    event.stopPropagation();
    dragStateRef.current = {
      itemId: item.id,
      mode,
      startX: event.clientX,
      initialStart: item.start,
      initialEnd: item.end,
    };
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border border-border bg-background',
        className,
      )}
    >
      <div className="overflow-x-auto">
        <div className="min-w-230">
          <div className="sticky top-0 z-20 flex border-b border-border bg-background">
            <div className="flex w-60 min-w-60 items-center justify-between border-r border-border bg-muted/50 px-3 py-2 text-sm font-semibold text-foreground">
              <span>{leftColumnTitle}</span>
              <div className="flex items-center gap-1">
                {(['day', 'week', 'month'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setScale(s)}
                    className={cn(
                      'rounded px-1.5 py-0.5 text-10 font-medium transition-colors',
                      currentScale === s
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {s === 'day' ? '日' : s === 'week' ? '周' : '月'}
                  </button>
                ))}
              </div>
            </div>
            <div className="relative" style={{ width: `${totalWidth}px` }}>
              <div className="flex h-11.5">
                {timeline.days.map((day) => (
                  <div
                    key={day.toISOString()}
                    className="border-r border-border px-1 py-1 text-center text-10 leading-tight text-muted-foreground"
                    style={{ width: `${dayWidth}px` }}
                  >
                    <div>{day.getUTCDate()}</div>
                    {day.getUTCDate() === 1 ? (
                      <div className="text-10 uppercase">{getMonthLabel(day).split(' ')[0]}</div>
                    ) : null}
                  </div>
                ))}
              </div>
              {todayOffset >= 0 && todayOffset <= timeline.days.length ? (
                <div
                  className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-accent-red"
                  style={{ left: `${todayOffset * dayWidth}px` }}
                />
              ) : null}
            </div>
          </div>

          {normalizedItems.map((item) => {
            const offsetDays = dayDiff(timeline.start, item.start);
            const durationDays = Math.max(1, dayDiff(item.start, item.end) + 1);
            const left = offsetDays * dayWidth;
            const width = durationDays * dayWidth;
            const isAi = item.isAiExecuting;

            return (
              <div
                key={item.id}
                className="flex border-b border-border/40 last:border-b-0 hover:bg-muted/30"
              >
                <button
                  type="button"
                  onClick={() => onItemClick?.(item.id)}
                  className="flex w-60 min-w-60 items-center gap-2 border-r border-border px-3 py-2 text-left"
                >
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      isAi ? 'bg-accent-purple ring-2 ring-accent-purple/30 animate-pulse' : getBarColorClass(item),
                    )}
                  />
                  <span className="truncate text-sm text-foreground">{item.title}</span>
                  {item.meta ? (
                    <span className="truncate text-xs text-muted-foreground">{item.meta}</span>
                  ) : null}
                </button>

                <div className="relative h-11" style={{ width: `${totalWidth}px` }}>
                  <div className="absolute inset-0 flex">
                    {timeline.days.map((day) => (
                      <div
                        key={`${item.id}-${day.toISOString()}`}
                        className="border-r border-border/40"
                        style={{ width: `${dayWidth}px` }}
                      />
                    ))}
                  </div>
                  <div
                    role="button"
                    tabIndex={0}
                    data-testid={`gantt-bar-${item.id}`}
                    onClick={() => onItemClick?.(item.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        onItemClick?.(item.id);
                      }
                    }}
                    onPointerDown={(event) => startDrag(event, item, 'move')}
                    className={cn(
                      'absolute top-1/2 flex h-6 -translate-y-1/2 items-center overflow-hidden rounded px-2 text-xs text-white shadow-xs transition-all',
                      isAi ? 'bg-accent-purple ring-1 ring-accent-purple/40 animate-pulse' : getBarColorClass(item),
                      readonly ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing',
                    )}
                    style={{ left: `${left}px`, width: `${width}px` }}
                  >
                    {!readonly ? (
                      <div
                        data-testid={`gantt-handle-start-${item.id}`}
                        className="absolute inset-y-0 left-0 w-2 cursor-ew-resize"
                        onPointerDown={(event) => startDrag(event, item, 'resize-start')}
                      />
                    ) : null}
                    {isAi ? <Bot className="mr-1 size-3 shrink-0 animate-pulse text-white" /> : null}
                    <span className="truncate">{item.title}</span>
                    {!readonly ? (
                      <div
                        data-testid={`gantt-handle-end-${item.id}`}
                        className="absolute inset-y-0 right-0 w-2 cursor-ew-resize"
                        onPointerDown={(event) => startDrag(event, item, 'resize-end')}
                      />
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
