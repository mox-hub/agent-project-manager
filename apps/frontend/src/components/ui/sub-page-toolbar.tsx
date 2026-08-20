import type { ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  PanelRight,
  PanelRightClose,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HeaderActionButton } from "./header-action-button";
import { SegmentedControl, type SegmentedTone } from "./segmented-control";

export interface SubPageBreadcrumb {
  label: ReactNode;
  to?: string;
}

export interface SubPageTabItem {
  value: string;
  label: string;
  icon?: LucideIcon;
  /** 激活滑块高亮色调（页面按需传入） */
  tone?: SegmentedTone;
}

export interface SubPagePager {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** 当前位置计数，如 "3/12"，缺省显示 "—" */
  position?: ReactNode;
}

export interface SubPageSidebarToggle {
  open: boolean;
  onToggle: () => void;
}

interface SubPageToolbarProps {
  aiId?: string;
  className?: string;
  /** 最左返回按钮，默认 navigate(-1) */
  onBack?: () => void;
  backLabel?: string;
  /** 层级面包屑，ChevronRight 分隔，可点项为 Link，末项高亮 */
  breadcrumbs?: SubPageBreadcrumb[];
  /** 居中子页签（SegmentedControl rect 滑块，与 ToolbarRow 同款） */
  tabs?: {
    value: string;
    onChange: (value: string) => void;
    items: SubPageTabItem[];
  };
  /** 翻页器：同集合内浏览上一/下一实体（如项目内任务） */
  pager?: SubPagePager;
  /** 自定义按钮组（HeaderActionButton 实例 / Badge 等） */
  actions?: ReactNode;
  /** 最后一个固定按钮：展开/收起右侧边栏；无右侧面板的页面不传 */
  sidebar?: SubPageSidebarToggle;
}

/**
 * 二级子页面工具栏：返回按钮 + 面包屑（左）、居中子页签（中）、
 * 翻页器 + 自定义按钮组 + 侧栏开关（右）。单行、无上下分界线，布局与 ToolbarRow 一致。
 */
export function SubPageToolbar({
  aiId,
  className,
  onBack,
  backLabel = "Back",
  breadcrumbs,
  tabs,
  pager,
  actions,
  sidebar,
}: SubPageToolbarProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-6 py-2 md:px-7",
        className,
      )}
      data-ai-component={aiId ? `${aiId}.sub-page-toolbar` : "ui.sub-page-toolbar"}
      data-ai-role="nav"
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <HeaderActionButton
          variant="ghost"
          icon={ArrowLeft}
          label={backLabel}
          onClick={onBack ?? (() => navigate(-1))}
          data-ai-component={aiId ? `${aiId}.back-button` : undefined}
          data-ai-action={aiId ? `${aiId}.back-button.click` : undefined}
        />
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex min-w-0 items-center gap-1 text-xs" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, index) => {
              const isLast = index === breadcrumbs.length - 1;
              return (
                <span key={index} className="flex min-w-0 items-center gap-1">
                  {index > 0 ? <ChevronRight className="size-3 shrink-0 text-muted-foreground/60" aria-hidden /> : null}
                  {crumb.to && !isLast ? (
                    <Link
                      to={crumb.to}
                      className="truncate text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className={cn("truncate", isLast ? "font-medium text-foreground" : "text-muted-foreground")}>
                      {crumb.label}
                    </span>
                  )}
                </span>
              );
            })}
          </nav>
        ) : null}
      </div>

      {tabs ? (
        <div className="justify-self-center">
          <SegmentedControl
            variant="rect"
            value={tabs.value}
            onChange={tabs.onChange}
            options={tabs.items.map((item) => {
              const Icon = item.icon;
              return {
                value: item.value,
                label: item.label,
                icon: Icon ? <Icon className="size-3.5" strokeWidth={1.75} /> : undefined,
                tone: item.tone,
              };
            })}
          />
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center justify-end gap-2">
        {pager ? (
          <div className="flex items-center gap-1" data-ai-component={aiId ? `${aiId}.pager` : undefined}>
            <HeaderActionButton
              variant="ghost"
              icon={ChevronLeft}
              label="Previous"
              disabled={!pager.hasPrev}
              onClick={pager.onPrev}
            />
            <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">
              {pager.position ?? "—"}
            </span>
            <HeaderActionButton
              variant="ghost"
              icon={ChevronRight}
              label="Next"
              disabled={!pager.hasNext}
              onClick={pager.onNext}
            />
          </div>
        ) : null}
        {actions}
        {sidebar ? (
          <HeaderActionButton
            variant="outline"
            icon={sidebar.open ? PanelRightClose : PanelRight}
            label={sidebar.open ? "Hide sidebar" : "Show sidebar"}
            aria-pressed={sidebar.open}
            onClick={sidebar.onToggle}
            data-ai-component={aiId ? `${aiId}.sidebar-toggle` : undefined}
            data-ai-action={aiId ? `${aiId}.sidebar-toggle.click` : undefined}
          />
        ) : null}
      </div>
    </header>
  );
}
