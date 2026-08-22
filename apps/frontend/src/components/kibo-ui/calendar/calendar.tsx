"use client";

import { getDay, getDaysInMonth, isSameDay } from "date-fns";
import { atom, useAtom } from "jotai";
import { Check, ChevronLeftIcon, ChevronRightIcon, ChevronsUpDown } from "lucide-react";
import {
  createContext,
  memo,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type CalendarState = {
  month: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
  year: number;
};

const monthAtom = atom(new Date().getMonth() as CalendarState["month"]);
const yearAtom = atom(new Date().getFullYear());

export const useCalendarMonth = () => useAtom(monthAtom);
export const useCalendarYear = () => useAtom(yearAtom);

type CalendarContextProps = {
  locale: Intl.LocalesArgument;
  startDay: number;
};

const CalendarContext = createContext<CalendarContextProps>({
  locale: "en-US",
  startDay: 0,
});

export type Status = {
  id: string;
  name: string;
  color: string;
};

export type Feature = {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  status?: Status;
  owner?: {
    id: string;
    name: string;
    image?: string;
  };
};

type ComboboxProps = {
  value: string;
  setValue: (value: string) => void;
  data: {
    value: string;
    label: string;
  }[];
  labels: {
    button: string;
    empty: string;
    search: string;
  };
  className?: string;
};

export const monthsForLocale = (
  localeName: Intl.LocalesArgument,
  monthFormat: Intl.DateTimeFormatOptions["month"] = "long"
) => {
  const format = new Intl.DateTimeFormat(localeName, { month: monthFormat }).format;
  return [...new Array(12).keys()].map((m) => format(new Date(Date.UTC(2021, m, 2))));
};

export const daysForLocale = (
  locale: Intl.LocalesArgument,
  startDay: number
) => {
  const weekdays: string[] = [];
  const baseDate = new Date(2024, 0, startDay);

  for (let i = 0; i < 7; i++) {
    weekdays.push(new Intl.DateTimeFormat(locale, { weekday: "short" }).format(baseDate));
    baseDate.setDate(baseDate.getDate() + 1);
  }

  return weekdays;
};

const Combobox = ({
  value,
  setValue,
  data,
  labels,
  className,
}: ComboboxProps) => {
  const [open, setOpen] = useState(false);

  const displayLabel = value ? data.find((item) => item.value === value)?.label : labels.button;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn("inline-flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted", className)}
        onClick={() => setOpen(!open)}
      >
        {displayLabel}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-50 p-0">
        <Command>
          <CommandInput placeholder={labels.search} />
          <CommandList>
            <CommandEmpty>{labels.empty}</CommandEmpty>
            <CommandGroup>
              {data.map((item) => (
                <CommandItem
                  key={item.value}
                  onClick={() => {
                    setValue(item.value === value ? "" : item.value);
                    setOpen(false);
                  }}
                  selected={item.value === value}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      item.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {item.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

type OutOfBoundsDayProps = {
  day: number;
};

const OutOfBoundsDay = ({ day }: OutOfBoundsDayProps) => (
  <div className="h-9 w-9 p-0 text-muted-foreground">{day}</div>
);

export type CalendarBodyProps = {
  features: Feature[];
  children: (props: { feature: Feature }) => ReactNode;
};

export const CalendarBody = ({ features, children }: CalendarBodyProps) => {
  const [month] = useCalendarMonth();
  const [year] = useCalendarYear();
  const { startDay } = useContext(CalendarContext);

  const currentMonthDate = useMemo(
    () => new Date(year, month, 1),
    [year, month]
  );
  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonthDate),
    [currentMonthDate]
  );
  const firstDay = useMemo(
    () => (getDay(currentMonthDate) - startDay + 7) % 7,
    [currentMonthDate, startDay]
  );

  const prevMonthData = useMemo(() => {
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevMonthYear = month === 0 ? year - 1 : year;
    const prevMonthDays = getDaysInMonth(new Date(prevMonthYear, prevMonth, 1));
    const prevMonthDaysArray = Array.from(
      { length: prevMonthDays },
      (_, i) => i + 1
    );
    return { prevMonthDays, prevMonthDaysArray };
  }, [month, year]);

  const nextMonthData = useMemo(() => {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextMonthYear = month === 11 ? year + 1 : year;
    const nextMonthDays = getDaysInMonth(new Date(nextMonthYear, nextMonth, 1));
    const nextMonthDaysArray = Array.from(
      { length: nextMonthDays },
      (_, i) => i + 1
    );
    return { nextMonthDaysArray };
  }, [month, year]);

  const featuresByDay = useMemo(() => {
    const result: { [day: number]: Feature[] } = {};
    for (let day = 1; day <= daysInMonth; day++) {
      result[day] = features.filter((feature) => {
        return isSameDay(new Date(feature.endAt), new Date(year, month, day));
      });
    }
    return result;
  }, [features, daysInMonth, year, month]);

  const days: ReactNode[] = [];

  for (let i = 0; i < firstDay; i++) {
    const day = prevMonthData.prevMonthDaysArray[prevMonthData.prevMonthDays - firstDay + i];
    if (day) {
      days.push(<OutOfBoundsDay day={day} key={`prev-${i}`} />);
    }
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const featuresForDay = featuresByDay[day] || [];

    days.push(
      <div className="min-h-20 border-b border-r p-1" key={`current-${day}`}>
        <div className="mb-1 text-xs font-medium">{day}</div>
        {featuresForDay.slice(0, 3).map((feature) => children({ feature }))}
        {featuresForDay.length > 3 && (
          <div className="text-10 text-muted-foreground">
            +{featuresForDay.length - 3} more
          </div>
        )}
      </div>
    );
  }

  const remainingDays = 7 - ((firstDay + daysInMonth) % 7);
  if (remainingDays < 7) {
    for (let i = 0; i < remainingDays; i++) {
      const day = nextMonthData.nextMonthDaysArray[i];
      if (day) {
        days.push(<OutOfBoundsDay day={day} key={`next-${i}`} />);
      }
    }
  }

  return (
    <div className="grid grid-cols-7">
      {days.map((day, index) => (
        <div key={index}>{day}</div>
      ))}
    </div>
  );
};

export type CalendarDatePickerProps = {
  className?: string;
  children: ReactNode;
};

export const CalendarDatePicker = ({
  className,
  children,
}: CalendarDatePickerProps) => (
  <div className={cn("flex items-center gap-2", className)}>{children}</div>
);

export type CalendarMonthPickerProps = {
  className?: string;
};

export const CalendarMonthPicker = ({ className }: CalendarMonthPickerProps) => {
  const [month, setMonth] = useCalendarMonth();
  const { locale } = useContext(CalendarContext);

  const monthData = useMemo(() => {
    return monthsForLocale(locale).map((month, index) => ({
      value: index.toString(),
      label: month,
    }));
  }, [locale]);

  return (
    <Combobox
      className={className}
      data={monthData}
      labels={{ button: "Select month", empty: "No month found", search: "Search month" }}
      setValue={(value) => setMonth(Number.parseInt(value, 10) as CalendarState["month"])}
      value={month.toString()}
    />
  );
};

export type CalendarYearPickerProps = {
  className?: string;
  start: number;
  end: number;
};

export const CalendarYearPicker = ({
  className,
  start,
  end,
}: CalendarYearPickerProps) => {
  const [year, setYear] = useCalendarYear();

  const yearData = Array.from({ length: end - start + 1 }, (_, i) => ({
    value: (start + i).toString(),
    label: (start + i).toString(),
  }));

  return (
    <Combobox
      className={className}
      data={yearData}
      labels={{ button: "Select year", empty: "No year found", search: "Search year" }}
      setValue={(value) => setYear(Number.parseInt(value, 10))}
      value={year.toString()}
    />
  );
};

export type CalendarDatePaginationProps = {
  className?: string;
};

export const CalendarDatePagination = ({ className }: CalendarDatePaginationProps) => {
  const [month, setMonth] = useCalendarMonth();
  const [year, setYear] = useCalendarYear();

  const handlePreviousMonth = useCallback(() => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth((month - 1) as CalendarState["month"]);
    }
  }, [month, year, setMonth, setYear]);

  const handleNextMonth = useCallback(() => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth((month + 1) as CalendarState["month"]);
    }
  }, [month, year, setMonth, setYear]);

  const monthName = useMemo(() => {
    return new Date(year, month, 1).toLocaleDateString("en-US", { month: "long" });
  }, [month, year]);

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        className="h-8 w-8 p-0"
        size="icon"
        variant="ghost"
        onClick={handlePreviousMonth}
      >
        <ChevronLeftIcon className="h-4 w-4" />
      </Button>
      <span className="text-sm font-medium">
        {monthName} {year}
      </span>
      <Button
        className="h-8 w-8 p-0"
        size="icon"
        variant="ghost"
        onClick={handleNextMonth}
      >
        <ChevronRightIcon className="h-4 w-4" />
      </Button>
    </div>
  );
};

export type CalendarDateProps = {
  children: ReactNode;
};

export const CalendarDate = ({ children }: CalendarDateProps) => (
  <div className="flex items-center gap-4 p-4">{children}</div>
);

export type CalendarHeaderProps = {
  className?: string;
};

export const CalendarHeader = ({ className }: CalendarHeaderProps) => {
  const { locale, startDay } = useContext(CalendarContext);

  const daysData = useMemo(() => {
    return daysForLocale(locale, startDay);
  }, [locale, startDay]);

  return (
    <div className={cn("grid grid-cols-7 bg-muted/50", className)}>
      {daysData.map((day) => (
        <div className="p-2 text-center text-xs font-medium uppercase" key={day}>
          {day}
        </div>
      ))}
    </div>
  );
};

export type CalendarFeatureItemProps = {
  feature: Feature;
  className?: string;
};

export const CalendarFeatureItem = memo(
  ({ feature, className }: CalendarFeatureItemProps) => (
    <div
      className={cn(
        "mb-1 truncate rounded px-1 py-0.5 text-10 text-white",
        className
      )}
      style={{ backgroundColor: feature.status?.color ?? "#6B7280" }}
    >
      {feature.name}
    </div>
  )
);

CalendarFeatureItem.displayName = "CalendarFeatureItem";

export type CalendarProviderProps = {
  locale?: Intl.LocalesArgument;
  startDay?: number;
  children: ReactNode;
  className?: string;
};

export const CalendarProvider = ({
  locale = "en-US",
  startDay = 0,
  children,
  className,
}: CalendarProviderProps) => (
  <CalendarContext.Provider value={{ locale, startDay }}>
    <div className={cn("rounded-lg border bg-background", className)}>{children}</div>
  </CalendarContext.Provider>
);
