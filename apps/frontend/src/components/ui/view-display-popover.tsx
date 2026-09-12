import {
  type ReactNode,
} from "react";
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  CalendarRange,
  Kanban,
  List,
  TableProperties,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "./switch";

export interface ViewDisplayPropertyItem {
  key: string;
  label: string;
}

export const DEFAULT_DISPLAY_PROPERTIES: ViewDisplayPropertyItem[] = [
  { key: "id", label: "ID" },
  { key: "status", label: "Status" },
  { key: "assignee", label: "Assignee" },
  { key: "priority", label: "Priority" },
  { key: "project", label: "Project" },
  { key: "dueDate", label: "Due date" },
  { key: "milestone", label: "Milestone" },
  { key: "labels", label: "Labels" },
  { key: "links", label: "Links" },
  { key: "timeInStatus", label: "Time in status" },
  { key: "created", label: "Created" },
  { key: "updated", label: "Updated" },
  { key: "aiExecution", label: "AI State" },
];

export interface ViewDisplayPopoverProps {
  className?: string;
  title?: ReactNode;

  /** 视图模式切换（如 list / board / gantt / table） */
  viewMode?: string;
  onViewModeChange?: (mode: string) => void;
  viewOptions?: Array<{
    value: string;
    label: string;
    icon?: LucideIcon;
  }>;

  /** 主分组 */
  groupBy?: string;
  onGroupByChange?: (value: string) => void;
  groupByOptions?: Array<{ value: string; label: string }>;

  /** 次级分组（可选） */
  subGroupBy?: string;
  onSubGroupByChange?: (value: string) => void;
  subGroupByOptions?: Array<{ value: string; label: string }>;

  /** 排序字段与排序方向 */
  orderBy?: string;
  onOrderByChange?: (value: string) => void;
  orderByOptions?: Array<{ value: string; label: string }>;
  orderDirection?: "asc" | "desc";
  onOrderDirectionToggle?: () => void;

  /** 完成项显示控制：all / active / completed */
  completedFilter?: "all" | "active" | "completed";
  onCompletedFilterChange?: (filter: "all" | "active" | "completed") => void;

  /** 显示子工单开关 */
  showSubIssues?: boolean;
  onShowSubIssuesChange?: (show: boolean) => void;

  /** 显示空分组开关 */
  showEmptyGroups?: boolean;
  onShowEmptyGroupsChange?: (show: boolean) => void;

  /** 展示属性胶囊开/关 */
  displayProperties?: Record<string, boolean>;
  onToggleDisplayProperty?: (propertyKey: string) => void;
  availableProperties?: ViewDisplayPropertyItem[];
}

export const DEFAULT_VIEW_OPTIONS = [
  { value: "list", label: "List", icon: List },
  { value: "board", label: "Board", icon: Kanban },
  { value: "gantt", label: "Gantt", icon: CalendarRange },
  { value: "table", label: "Table", icon: TableProperties },
];

export const DEFAULT_GROUP_OPTIONS = [
  { value: "none", label: "No grouping" },
  { value: "status", label: "Status" },
  { value: "severity", label: "Severity" },
  { value: "priority", label: "Priority" },
  { value: "project", label: "Project" },
  { value: "milestone", label: "Milestone" },
];

export const DEFAULT_ORDER_OPTIONS = [
  { value: "priority", label: "Priority" },
  { value: "dueDate", label: "Due date" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "title", label: "Title" },
];

export function ViewDisplayPopover({
  className,
  title,
  viewMode,
  onViewModeChange,
  viewOptions = DEFAULT_VIEW_OPTIONS,
  groupBy = "status",
  onGroupByChange,
  groupByOptions = DEFAULT_GROUP_OPTIONS,
  subGroupBy = "none",
  onSubGroupByChange,
  subGroupByOptions = [{ value: "none", label: "No grouping" }],
  orderBy = "priority",
  onOrderByChange,
  orderByOptions = DEFAULT_ORDER_OPTIONS,
  orderDirection = "desc",
  onOrderDirectionToggle,
  completedFilter = "all",
  onCompletedFilterChange,
  showSubIssues = true,
  onShowSubIssuesChange,
  showEmptyGroups = false,
  onShowEmptyGroupsChange,
  displayProperties,
  onToggleDisplayProperty,
  availableProperties = DEFAULT_DISPLAY_PROPERTIES,
}: ViewDisplayPopoverProps) {
  const activePropsMap = displayProperties ?? {
    id: true,
    status: true,
    assignee: true,
    priority: true,
    project: true,
    dueDate: true,
    labels: true,
    created: true,
    aiExecution: true,
  };

  return (
    <div
      className={cn(
        "flex w-72 flex-col gap-3 p-3.5 text-xs text-foreground select-none",
        className,
      )}
      data-ai-component="view-display-popover"
    >
      {/* 顶部可选标题或视图切换分段器 */}
      {viewOptions && viewOptions.length > 1 && onViewModeChange ? (
        <div className="flex w-full items-center rounded-lg bg-muted/60 p-1 border border-border/50">
          {viewOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = viewMode === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onViewModeChange(opt.value)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md py-1 text-11 font-medium transition-all",
                  isActive
                    ? "bg-card text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {Icon ? <Icon className="size-3.5 shrink-0" strokeWidth={1.75} /> : null}
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>
      ) : title ? (
        <div className="text-xs font-semibold text-foreground">{title}</div>
      ) : null}

      {/* Grouping / Sub-grouping / Ordering */}
      <div className="flex flex-col gap-2 pt-1 border-t border-border/40">
        {onGroupByChange ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Grouping</span>
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value)}
              className="h-7 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              {groupByOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {onSubGroupByChange ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Sub-grouping</span>
            <select
              value={subGroupBy}
              onChange={(e) => onSubGroupByChange(e.target.value)}
              className="h-7 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              {subGroupByOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {onOrderByChange ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Ordering</span>
            <div className="flex items-center gap-1">
              {onOrderDirectionToggle ? (
                <button
                  type="button"
                  onClick={onOrderDirectionToggle}
                  title={orderDirection === "asc" ? "Ascending (click to desc)" : "Descending (click to asc)"}
                  className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  {orderDirection === "asc" ? (
                    <ArrowUpWideNarrow className="size-3.5" />
                  ) : (
                    <ArrowDownWideNarrow className="size-3.5" />
                  )}
                </button>
              ) : null}
              <select
                value={orderBy}
                onChange={(e) => onOrderByChange(e.target.value)}
                className="h-7 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
              >
                {orderByOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
      </div>

      {/* Completed issues & Show sub-issues */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
        {onCompletedFilterChange ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">Completed issues</span>
            <select
              value={completedFilter}
              onChange={(e) =>
                onCompletedFilterChange(e.target.value as "all" | "active" | "completed")
              }
              className="h-7 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              <option value="all">All</option>
              <option value="active">Active only</option>
              <option value="completed">Completed only</option>
            </select>
          </div>
        ) : null}

        {onShowSubIssuesChange ? (
          <div className="flex items-center justify-between gap-2 py-0.5">
            <span className="text-muted-foreground font-medium">Show sub-issues</span>
            <Switch
              size="sm"
              checked={showSubIssues}
              onCheckedChange={onShowSubIssuesChange}
            />
          </div>
        ) : null}
      </div>

      {/* Display Options & Properties */}
      <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
        <div className="font-semibold text-foreground">
          {viewMode === "board" ? "Board options" : "List options"}
        </div>

        {onShowEmptyGroupsChange ? (
          <div className="flex items-center justify-between gap-2 py-0.5">
            <span className="text-muted-foreground font-medium">Show empty groups</span>
            <Switch
              size="sm"
              checked={showEmptyGroups}
              onCheckedChange={onShowEmptyGroupsChange}
            />
          </div>
        ) : null}

        {onToggleDisplayProperty ? (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-11 font-medium text-muted-foreground">Display properties</span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {availableProperties.map((prop) => {
                const isActive = activePropsMap[prop.key] !== false;
                return (
                  <button
                    key={prop.key}
                    type="button"
                    onClick={() => onToggleDisplayProperty(prop.key)}
                    className={cn(
                      "inline-flex items-center rounded-full px-2.5 py-0.5 text-11 font-medium transition-all",
                      isActive
                        ? "bg-secondary text-foreground shadow-2xs border border-border"
                        : "bg-muted/20 text-muted-foreground/60 border border-border/40 hover:bg-muted/40 hover:text-foreground",
                    )}
                  >
                    {prop.key === "aiExecution" && (
                      <span className="mr-1 inline-block size-1.5 rounded-full bg-accent-purple" />
                    )}
                    {prop.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
