"use client";

import {
  DndContext,
  MouseSensor,
  useDraggable,
  useSensor,
} from "@dnd-kit/core";
import { useMouse } from "@uidotdev/usehooks";
import {
  addDays,
  addMonths,
  differenceInDays,
  differenceInMonths,
  format,
  formatDate,
  formatDistance,
  getDaysInMonth,
  isSameDay,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { atom, useAtom } from "jotai";
import { atom as jotaiAtom, useAtomValue } from "jotai";
import { cn } from "@/lib/utils";
import {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const draggingAtom = atom(false);
const scrollXAtom = atom(0);

export const useGanttDragging = () => useAtom(draggingAtom);
export const useGanttScrollX = () => useAtom(scrollXAtom);

export type GanttStatus = {
  id: string;
  name: string;
  color: string;
};

export type GanttFeature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status?: GanttStatus;
  owner?: {
    id: string;
    name: string;
    image?: string;
  };
  group?: {
    id: string;
    name: string;
  };
  progress?: number;
};

export type Range = "daily" | "monthly" | "quarterly";

export type TimelineData = {
  year: number;
  quarters: {
    months: {
      days: number;
    }[];
  }[];
}[];

export type GanttContextProps = {
  zoom: number;
  range: Range;
  columnWidth: number;
  sidebarWidth: number;
  headerHeight: number;
  rowHeight: number;
  timelineData: TimelineData;
  scrollRef: React.RefObject<HTMLDivElement | null>;
};

const GanttContext = createContext<GanttContextProps>({
  zoom: 100,
  range: "monthly",
  columnWidth: 50,
  sidebarWidth: 300,
  headerHeight: 60,
  rowHeight: 36,
  timelineData: [],
  scrollRef: { current: null },
});

const useGanttContext = () => useContext(GanttContext);

const createInitialTimelineData = (today: Date) => {
  const data: TimelineData = [];
  data.push(
    { year: today.getFullYear() - 1, quarters: new Array(4).fill(null) },
    { year: today.getFullYear(), quarters: new Array(4).fill(null) },
    { year: today.getFullYear() + 1, quarters: new Array(4).fill(null) }
  );

  for (const yearObj of data) {
    yearObj.quarters = new Array(4).fill(null).map((_, quarterIndex) => ({
      months: new Array(3).fill(null).map((_, monthIndex) => {
        const month = quarterIndex * 3 + monthIndex;
        return {
          days: getDaysInMonth(new Date(yearObj.year, month, 1)),
        };
      }),
    }));
  }

  return data;
};

// ============================================
// Header Components
// ============================================

export type GanttHeaderProps = {
  className?: string;
};

const MonthlyHeader: FC = () => {
  const gantt = useGanttContext();
  const columnWidth = (gantt.columnWidth * gantt.zoom) / 100;

  const totalColumns = gantt.timelineData.reduce(
    (acc, year) =>
      acc + year.quarters.reduce((qAcc) => qAcc + 3, 0),
    0
  );

  return (
    <div
      className="flex h-15 items-center border-b bg-background"
      style={{ width: totalColumns * columnWidth }}
    >
      {gantt.timelineData.flatMap((year) =>
        year.quarters.flatMap((quarter, quarterIndex) =>
          quarter.months.map((_, monthIndex) => (
            <div
              className="flex h-full items-center justify-center border-r text-xs text-muted-foreground"
              key={`${year.year}-Q${quarterIndex}-${monthIndex}`}
              style={{ width: columnWidth }}
            >
              {format(
                new Date(year.year, quarterIndex * 3 + monthIndex, 1),
                "MMM"
              )}
            </div>
          ))
        )
      )}
    </div>
  );
};

const QuarterlyHeader: FC = () => {
  const gantt = useGanttContext();
  const columnWidth = gantt.columnWidth * 3;

  return (
    <div className="flex h-15 items-center border-b bg-background">
      {gantt.timelineData.flatMap((year) =>
        year.quarters.map((_, quarterIndex) => (
          <div
            className="flex h-full items-center justify-center border-r text-xs font-medium text-muted-foreground"
            key={`${year.year}-Q${quarterIndex}`}
            style={{ width: columnWidth }}
          >
            Q{quarterIndex + 1} {year.year}
          </div>
        ))
      )}
    </div>
  );
};

const DailyHeader: FC = () => {
  const gantt = useGanttContext();
  const columnWidth = (gantt.columnWidth * gantt.zoom) / 100 / 30;

  return (
    <div className="flex h-15 items-center border-b bg-background">
      {gantt.timelineData.flatMap((year) =>
        year.quarters.flatMap((quarter) =>
          quarter.months.flatMap((month, monthIndex) =>
            Array.from({ length: month.days }).map((_, dayIndex) => (
              <div
                className={cn(
                  "flex h-full items-center justify-center border-r text-10 text-muted-foreground",
                  dayIndex === 0 && "font-medium"
                )}
                key={`${year.year}-${monthIndex}-${dayIndex}`}
                style={{ width: columnWidth }}
              >
                {dayIndex === 0
                  ? format(
                      new Date(year.year, monthIndex, dayIndex + 1),
                      "MMM d"
                    )
                  : dayIndex + 1}
              </div>
            ))
          )
        )
      )}
    </div>
  );
};

const headers: Record<Range, FC> = {
  daily: DailyHeader,
  monthly: MonthlyHeader,
  quarterly: QuarterlyHeader,
};

export const GanttHeader: FC<GanttHeaderProps> = ({ className }) => {
  const gantt = useGanttContext();
  const Header = headers[gantt.range];

  return (
    <div className={cn("shrink-0", className)}>
      <Header />
    </div>
  );
};

// ============================================
// Sidebar Components
// ============================================

export const GanttSidebarHeader: FC = () => (
  <div className="flex h-15 items-center border-b bg-background px-4 font-medium">
    <span>Issues</span>
    <span className="ml-auto text-muted-foreground">Duration</span>
  </div>
);

export type GanttSidebarItemProps = {
  feature: GanttFeature;
  onSelect?: (id: string) => void;
  className?: string;
};

export const GanttSidebarItem: FC<GanttSidebarItemProps> = ({
  feature,
  onSelect,
  className,
}) => {
  const duration = feature.endAt
    ? formatDistance(feature.startAt, feature.endAt)
    : `${formatDistance(feature.startAt, new Date())} so far`;

  return (
    <button
      className={cn(
        "flex h-9 w-full items-center gap-2 border-b px-4 text-left text-xs transition-colors hover:bg-muted/50",
        className
      )}
      onClick={() => onSelect?.(feature.id)}
      type="button"
    >
      <div
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: feature.status?.color ?? "#6B7280" }}
      />
      <span className="flex-1 truncate">{feature.name}</span>
      <span className="text-muted-foreground">{duration}</span>
    </button>
  );
};

export type GanttSidebarGroupProps = {
  children: ReactNode;
  name: string;
  className?: string;
};

export const GanttSidebarGroup: FC<GanttSidebarGroupProps> = ({
  children,
  name,
  className,
}) => (
  <div className={cn("border-b", className)}>
    <div className="flex h-8 items-center border-b px-4 text-10 font-semibold uppercase tracking-wider text-muted-foreground">
      {name}
    </div>
    {children}
  </div>
);

export type GanttSidebarProps = {
  children: ReactNode;
  className?: string;
};

export const GanttSidebar: FC<GanttSidebarProps> = ({
  children,
  className,
}) => {
  const gantt = useGanttContext();

  return (
    <div
      className={cn(
        "shrink-0 overflow-hidden border-r bg-background",
        className
      )}
      style={{ width: gantt.sidebarWidth }}
    >
      <GanttSidebarHeader />
      <div className="overflow-y-auto">{children}</div>
    </div>
  );
};

// ============================================
// Feature Item Components
// ============================================

export type GanttFeatureItemProps = GanttFeature & {
  onMove?: (id: string, startDate: Date, endDate: Date | null) => void;
  children?: ReactNode;
  className?: string;
};

const getOffset = (date: Date, timelineStart: Date, context: GanttContextProps) => {
  const columnWidth = (context.columnWidth * context.zoom) / 100;
  const startOfFn = context.range === "monthly" || context.range === "quarterly" ? startOfMonth : startOfDay;
  const diffFn = context.range === "monthly" || context.range === "quarterly" ? differenceInMonths : differenceInDays;

  const fullColumns = diffFn(startOfFn(date), startOfFn(timelineStart));

  if (context.range === "monthly" || context.range === "quarterly") {
    const dayOffset = date.getDate();
    const daysInMonth = getDaysInMonth(date);
    const pixelsPerDay = columnWidth / daysInMonth;
    return fullColumns * columnWidth + dayOffset * pixelsPerDay;
  }

  return fullColumns * columnWidth;
};

const getWidth = (startAt: Date, endAt: Date, context: GanttContextProps) => {
  const columnWidth = (context.columnWidth * context.zoom) / 100;
  const startOfFn = context.range === "monthly" || context.range === "quarterly" ? startOfMonth : startOfDay;
  const diffFn = context.range === "monthly" || context.range === "quarterly" ? differenceInMonths : differenceInDays;

  if (isSameDay(startAt, endAt)) {
    return columnWidth / 30;
  }

  if (context.range === "monthly" || context.range === "quarterly") {
    const daysInStartMonth = getDaysInMonth(startAt);
    const startOffset = daysInStartMonth - startAt.getDate();
    const endOffset = endAt.getDate();
    const fullMonths = diffFn(startOfFn(endAt), startOfFn(startAt)) - 1;

    const startPixels = startOffset * (columnWidth / daysInStartMonth);
    const endPixels = endOffset * (columnWidth / getDaysInMonth(endAt));
    const fullPixels = fullMonths * columnWidth;

    return Math.max(startPixels + endPixels + fullPixels, columnWidth / 4);
  }

  return diffFn(endAt, startAt) * columnWidth;
};

export const GanttFeatureItem: FC<GanttFeatureItemProps> = ({
  id,
  name,
  startAt,
  endAt,
  status,
  progress,
  onMove,
  children,
  className,
}) => {
  const gantt = useGanttContext();
  const timelineStart = useMemo(
    () => new Date(gantt.timelineData[0]?.year ?? 0, 0, 1),
    [gantt.timelineData]
  );

  const offset = useMemo(
    () => getOffset(startAt, timelineStart, gantt),
    [startAt, timelineStart, gantt]
  );

  const width = useMemo(
    () => getWidth(startAt, endAt, gantt),
    [startAt, endAt, gantt]
  );

  const barColor = status?.color ?? "#6B7280";
  const bgColor = `${barColor}20`;
  const progressWidth = progress ? `${Math.min(progress, 100)}%` : "100%";

  return (
    <div
      className={cn(
        "absolute top-1/2 flex h-7 -translate-y-1/2 items-center gap-2 rounded-md px-2 text-xs transition-all hover:brightness-95",
        className
      )}
      style={{
        left: offset,
        width: Math.max(width, 40),
        backgroundColor: bgColor,
        borderLeft: `3px solid ${barColor}`,
      }}
    >
      {/* Progress bar */}
      <div className="absolute inset-x-2 bottom-1 h-1 rounded-full bg-black/10">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: progressWidth,
            backgroundColor: barColor,
          }}
        />
      </div>

      {/* Content */}
      <span className="relative z-10 flex-1 truncate font-medium">{name}</span>
    </div>
  );
};

export type GanttFeatureRowProps = {
  features: GanttFeature[];
  children?: (feature: GanttFeature) => ReactNode;
  className?: string;
};

export const GanttFeatureRow: FC<GanttFeatureRowProps> = ({
  features,
  children,
  className,
}) => {
  const gantt = useGanttContext();

  return (
    <div
      className={cn("relative h-9 border-b", className)}
      style={{ minWidth: 1200 }}
    >
      {features.map((feature) =>
        children ? (
          children(feature)
        ) : (
          <GanttFeatureItem key={feature.id} {...feature} />
        )
      )}
    </div>
  );
};

export type GanttFeatureListGroupProps = {
  children: ReactNode;
  className?: string;
};

export const GanttFeatureListGroup: FC<GanttFeatureListGroupProps> = ({
  children,
  className,
}) => {
  const gantt = useGanttContext();

  return (
    <div
      className={cn("relative border-b", className)}
      style={{ minWidth: 1200 }}
    >
      {children}
    </div>
  );
};

export type GanttFeatureListProps = {
  children: ReactNode;
  className?: string;
};

export const GanttFeatureList: FC<GanttFeatureListProps> = ({
  children,
  className,
}) => (
  <div className={cn("relative", className)}>{children}</div>
);

// ============================================
// Today Marker
// ============================================

export type GanttTodayProps = {
  className?: string;
};

export const GanttToday: FC<GanttTodayProps> = ({ className }) => {
  const gantt = useGanttContext();
  const today = new Date();
  const timelineStart = new Date(gantt.timelineData[0]?.year ?? 0, 0, 1);

  const offset = useMemo(
    () => getOffset(today, timelineStart, gantt),
    [today, timelineStart, gantt]
  );

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-0 z-20 flex flex-col items-center",
        className
      )}
      style={{ left: offset }}
    >
      <div className="rounded bg-primary px-1.5 py-0.5 text-10 font-semibold text-primary-foreground">
        Today
      </div>
      <div className="h-full w-px bg-primary" />
    </div>
  );
};

// ============================================
// Provider Component
// ============================================

export type GanttProviderProps = {
  children: ReactNode;
  className?: string;
  range?: Range;
  zoom?: number;
};

export const GanttProvider: FC<GanttProviderProps> = ({
  children,
  className,
  range = "monthly",
  zoom = 100,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [timelineData] = useState(() => createInitialTimelineData(new Date()));
  const [, setScrollX] = useGanttScrollX();

  const headerHeight = 60;
  const rowHeight = 36;
  const sidebarWidth = 300;
  let columnWidth = 50;

  if (range === "monthly") {
    columnWidth = 150;
  } else if (range === "quarterly") {
    columnWidth = 100;
  }

  useEffect(() => {
    if (scrollRef.current) {
      const center = scrollRef.current.scrollWidth / 2 - scrollRef.current.clientWidth / 2;
      scrollRef.current.scrollLeft = Math.max(0, center);
      setScrollX(scrollRef.current.scrollLeft);
    }
  }, [setScrollX]);

  useEffect(() => {
    const handleScroll = () => {
      if (scrollRef.current) {
        setScrollX(scrollRef.current.scrollLeft);
      }
    };

    const element = scrollRef.current;
    element?.addEventListener("scroll", handleScroll, { passive: true });
    return () => element?.removeEventListener("scroll", handleScroll);
  }, [setScrollX]);

  const contextValue = useMemo<GanttContextProps>(
    () => ({
      zoom,
      range,
      columnWidth,
      sidebarWidth,
      headerHeight,
      rowHeight,
      timelineData,
      scrollRef,
    }),
    [zoom, range, columnWidth]
  );

  return (
    <GanttContext.Provider value={contextValue}>
      <div className={cn("relative flex h-125 overflow-hidden rounded-lg border bg-background", className)}>
        {children}
      </div>
    </GanttContext.Provider>
  );
};

// ============================================
// Timeline Component
// ============================================

export type GanttTimelineProps = {
  children: ReactNode;
  className?: string;
};

export const GanttTimeline: FC<GanttTimelineProps> = ({
  children,
  className,
}) => {
  const gantt = useGanttContext();
  const localScrollRef = useRef<HTMLDivElement | null>(null);

  // Mirror the local ref into the context-provided ref via a layout effect so
  // GanttProvider's scroll logic continues to observe the actual DOM node.
  // The Gantt context exposes a RefObject by design and expects children to
  // publish the scroll container into it; react-hooks/immutability flags any
  // mutation of a value returned from a hook, even when the wrapped API is
  // the entire contract of the provider.
  useLayoutEffect(() => {
    // eslint-disable-next-line react-hooks/immutability
    gantt.scrollRef.current = localScrollRef.current;
  });

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden">
      <GanttHeader />
      <div
        className={cn("relative flex-1 overflow-auto", className)}
        ref={localScrollRef}
      >
        {children}
        <GanttToday />
      </div>
    </div>
  );
};
