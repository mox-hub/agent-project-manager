import {
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
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

export type I18nTranslateFn = (key: string, defaultValue?: string) => string;

export function getDefaultDisplayProperties(t?: I18nTranslateFn): ViewDisplayPropertyItem[] {
  return [
    { key: "id", label: t ? t("viewDisplay.properties.id", "ID") : "ID" },
    { key: "status", label: t ? t("viewDisplay.properties.status", "Status") : "Status" },
    { key: "assignee", label: t ? t("viewDisplay.properties.assignee", "Assignee") : "Assignee" },
    { key: "priority", label: t ? t("viewDisplay.properties.priority", "Priority") : "Priority" },
    { key: "project", label: t ? t("viewDisplay.properties.project", "Project") : "Project" },
    { key: "dueDate", label: t ? t("viewDisplay.properties.dueDate", "Due date") : "Due date" },
    { key: "milestone", label: t ? t("viewDisplay.properties.milestone", "Milestone") : "Milestone" },
    { key: "labels", label: t ? t("viewDisplay.properties.labels", "Labels") : "Labels" },
    { key: "links", label: t ? t("viewDisplay.properties.links", "Links") : "Links" },
    { key: "timeInStatus", label: t ? t("viewDisplay.properties.timeInStatus", "Time in status") : "Time in status" },
    { key: "created", label: t ? t("viewDisplay.properties.created", "Created") : "Created" },
    { key: "updated", label: t ? t("viewDisplay.properties.updated", "Updated") : "Updated" },
    { key: "aiExecution", label: t ? t("viewDisplay.properties.aiExecution", "AI State") : "AI State" },
  ];
}

export const DEFAULT_DISPLAY_PROPERTIES: ViewDisplayPropertyItem[] = getDefaultDisplayProperties();

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

export function getDefaultViewOptions(t?: I18nTranslateFn) {
  return [
    { value: "list", label: t ? t("viewDisplay.views.list", "List") : "List", icon: List },
    { value: "board", label: t ? t("viewDisplay.views.board", "Board") : "Board", icon: Kanban },
    { value: "gantt", label: t ? t("viewDisplay.views.gantt", "Gantt") : "Gantt", icon: CalendarRange },
    { value: "table", label: t ? t("viewDisplay.views.table", "Table") : "Table", icon: TableProperties },
  ];
}

export const DEFAULT_VIEW_OPTIONS = getDefaultViewOptions();

export function getDefaultGroupOptions(t?: I18nTranslateFn) {
  return [
    { value: "none", label: t ? t("viewDisplay.groupOptions.none", "No grouping") : "No grouping" },
    { value: "status", label: t ? t("viewDisplay.groupOptions.status", "Status") : "Status" },
    { value: "severity", label: t ? t("viewDisplay.groupOptions.severity", "Severity") : "Severity" },
    { value: "priority", label: t ? t("viewDisplay.groupOptions.priority", "Priority") : "Priority" },
    { value: "project", label: t ? t("viewDisplay.groupOptions.project", "Project") : "Project" },
    { value: "milestone", label: t ? t("viewDisplay.groupOptions.milestone", "Milestone") : "Milestone" },
  ];
}

export const DEFAULT_GROUP_OPTIONS = getDefaultGroupOptions();

export function getDefaultOrderOptions(t?: I18nTranslateFn) {
  return [
    { value: "priority", label: t ? t("viewDisplay.orderOptions.priority", "Priority") : "Priority" },
    { value: "dueDate", label: t ? t("viewDisplay.orderOptions.dueDate", "Due date") : "Due date" },
    { value: "created", label: t ? t("viewDisplay.orderOptions.created", "Created") : "Created" },
    { value: "updated", label: t ? t("viewDisplay.orderOptions.updated", "Updated") : "Updated" },
    { value: "title", label: t ? t("viewDisplay.orderOptions.title", "Title") : "Title" },
  ];
}

export const DEFAULT_ORDER_OPTIONS = getDefaultOrderOptions();

export function ViewDisplayPopover({
  className,
  title,
  viewMode,
  onViewModeChange,
  viewOptions,
  groupBy = "status",
  onGroupByChange,
  groupByOptions,
  subGroupBy = "none",
  onSubGroupByChange,
  subGroupByOptions,
  orderBy = "priority",
  onOrderByChange,
  orderByOptions,
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
  availableProperties,
}: ViewDisplayPopoverProps) {
  const { t } = useTranslation();

  const resolvedViewOptions = viewOptions ?? DEFAULT_VIEW_OPTIONS;
  const resolvedGroupByOptions = groupByOptions ?? DEFAULT_GROUP_OPTIONS;
  const resolvedSubGroupByOptions =
    subGroupByOptions ?? [{ value: "none", label: t("viewDisplay.groupOptions.none", "No grouping") }];
  const resolvedOrderByOptions = orderByOptions ?? DEFAULT_ORDER_OPTIONS;
  const resolvedProperties = availableProperties ?? DEFAULT_DISPLAY_PROPERTIES;

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

  const getSectionTitle = () => {
    switch (viewMode) {
      case "board":
        return t("viewDisplay.sections.boardOptions", "Board options");
      case "gantt":
        return t("viewDisplay.sections.ganttOptions", "Gantt options");
      case "table":
        return t("viewDisplay.sections.tableOptions", "Table options");
      default:
        return t("viewDisplay.sections.listOptions", "List options");
    }
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
      {resolvedViewOptions && resolvedViewOptions.length > 1 && onViewModeChange ? (
        <div className="flex w-full items-center rounded-lg bg-muted/60 p-1 border border-border/50">
          {resolvedViewOptions.map((opt) => {
            const Icon = opt.icon;
            const isActive = viewMode === opt.value;
            const label = t(`viewDisplay.views.${opt.value}`, opt.label);
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
                <span>{label}</span>
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
            <span className="text-muted-foreground font-medium">
              {t("viewDisplay.sections.grouping", "Grouping")}
            </span>
            <select
              value={groupBy}
              onChange={(e) => onGroupByChange(e.target.value)}
              className="h-7 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              {resolvedGroupByOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`viewDisplay.groupOptions.${opt.value}`, opt.label)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {onSubGroupByChange ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">
              {t("viewDisplay.sections.subGrouping", "Sub-grouping")}
            </span>
            <select
              value={subGroupBy}
              onChange={(e) => onSubGroupByChange(e.target.value)}
              className="h-7 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              {resolvedSubGroupByOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(`viewDisplay.groupOptions.${opt.value}`, opt.label)}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {onOrderByChange ? (
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground font-medium">
              {t("viewDisplay.sections.ordering", "Ordering")}
            </span>
            <div className="flex items-center gap-1">
              {onOrderDirectionToggle ? (
                <button
                  type="button"
                  onClick={onOrderDirectionToggle}
                  title={
                    orderDirection === "asc"
                      ? t("viewDisplay.orderDirections.ascPrompt", "Ascending (click to desc)")
                      : t("viewDisplay.orderDirections.descPrompt", "Descending (click to asc)")
                  }
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
                {resolvedOrderByOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(`viewDisplay.orderOptions.${opt.value}`, opt.label)}
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
            <span className="text-muted-foreground font-medium">
              {t("viewDisplay.sections.completedIssues", "Completed issues")}
            </span>
            <select
              value={completedFilter}
              onChange={(e) =>
                onCompletedFilterChange(e.target.value as "all" | "active" | "completed")
              }
              className="h-7 rounded-md border border-border bg-card px-2 text-xs font-medium text-foreground outline-none focus:border-primary"
            >
              <option value="all">{t("viewDisplay.completedFilters.all", "All")}</option>
              <option value="active">{t("viewDisplay.completedFilters.active", "Active only")}</option>
              <option value="completed">{t("viewDisplay.completedFilters.completed", "Completed only")}</option>
            </select>
          </div>
        ) : null}

        {onShowSubIssuesChange ? (
          <div className="flex items-center justify-between gap-2 py-0.5">
            <span className="text-muted-foreground font-medium">
              {t("viewDisplay.switches.showSubIssues", "Show sub-issues")}
            </span>
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
        <div className="font-semibold text-foreground">{getSectionTitle()}</div>

        {onShowEmptyGroupsChange ? (
          <div className="flex items-center justify-between gap-2 py-0.5">
            <span className="text-muted-foreground font-medium">
              {t("viewDisplay.switches.showEmptyGroups", "Show empty groups")}
            </span>
            <Switch
              size="sm"
              checked={showEmptyGroups}
              onCheckedChange={onShowEmptyGroupsChange}
            />
          </div>
        ) : null}

        {onToggleDisplayProperty ? (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-11 font-medium text-muted-foreground">
              {t("viewDisplay.sections.displayProperties", "Display properties")}
            </span>
            <div className="flex flex-wrap gap-1.5 pt-0.5">
              {resolvedProperties.map((prop) => {
                const isActive = activePropsMap[prop.key] !== false;
                const propLabel = t(`viewDisplay.properties.${prop.key}`, prop.label);
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
                    {propLabel}
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
