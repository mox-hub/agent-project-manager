/**
 * PropertyPanel - 通用属性面板组件
 * 从 unified-create-dialog 抽出，供详情页等场景复用
 *
 * 包含:
 * - Capsule / CapsuleSelect / DateCapsuleField (Linear 风格下拉胶囊)
 * - AutoSizeTextarea (自适应高度 textarea)
 * - PropertyRow / PropsCard (属性行 + 折叠卡片)
 * - SuggestionsCard (建议面板)
 * - MemberAvatar (成员头像)
 * - SubTaskCard (子任务输入卡片 + SmallCaps 内部组件)
 */
import * as React from 'react';
import { useState, forwardRef, type ComponentType, type SVGProps } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Loader2 as Loader2Icon,
  AlertCircle as AlertCircleIcon,
  CheckCircle as CheckCircleIcon,
  XCircle as XCircleIcon,
  X,
  Plus,
  Calendar as CalendarIcon,
  Tag as TagIcon,
  User as UserIcon,
  ListTodo,
  Sparkles,
  type LucideProps,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SidebarPanel } from './sidebar-panel';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DatePicker } from '@/components/ui/date-picker';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';

// ============================================================================
// Local icon fallbacks (Linear-style status icons)
// ============================================================================

const Circle = forwardRef<SVGSVGElement, SVGProps<SVGSVGElement> & { className?: string }>(
  (props, ref) => (
    <svg ref={ref} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
);
Circle.displayName = 'Circle';

export const PropertyPanelIcons = {
  Circle,
  Loader2: Loader2Icon,
  AlertCircle: AlertCircleIcon,
  CheckCircle: CheckCircleIcon,
  XCircle: XCircleIcon,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Plus,
  Calendar: CalendarIcon,
  Tag: TagIcon,
  User: UserIcon,
  ListTodo,
  Sparkles,
};

// ============================================================================
// MemberAvatar
// ============================================================================

export function MemberAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <Avatar size="sm" className="shrink-0">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback>{name[0]?.toUpperCase() ?? '?'}</AvatarFallback>
      </Avatar>
    );
  }
  return (
    <Avatar size="sm" className="shrink-0">
      <AvatarFallback className="bg-primary/15 text-primary text-9 font-semibold">
        {name[0]?.toUpperCase() ?? '?'}
      </AvatarFallback>
    </Avatar>
  );
}

// ============================================================================
// Capsule - 只读胶囊
// ============================================================================

export function Capsule({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 max-w-32.5 h-6 px-2.5 rounded-full border border-border bg-transparent text-xs font-medium text-muted-foreground whitespace-nowrap transition-colors hover:bg-accent hover:text-foreground hover:border-border/80',
        active && 'bg-accent border-border text-foreground',
        className,
      )}
    >
      <span className="overflow-hidden text-ellipsis max-w-22.5 truncate">{children}</span>
      <ChevronDown className="size-3 opacity-50 shrink-0" />
    </button>
  );
}

// ============================================================================
// DateCapsuleField - 日期胶囊（基于 DatePicker 组合，2026-08 收敛手写弹层）
// ============================================================================

export function DateCapsuleField({
  value,
  onChange,
  placeholder = 'None',
  clearLabel = 'Clear due date',
}: {
  value: string;
  onChange: (v: string) => void;
  /** 空值占位文案（调用方传 i18n） */
  placeholder?: string;
  /** footer 清除按钮文案（调用方传 i18n） */
  clearLabel?: string;
}) {
  const dateValue = value ? new Date(value + 'T00:00:00') : undefined;
  return (
    <DatePicker
      value={dateValue}
      onValueChange={(d) => {
        if (!d) {
          onChange('');
          return;
        }
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        onChange(`${yyyy}-${mm}-${dd}`);
      }}
      popoverAlign="end"
      formatDate={(d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
      trigger={
        <button type="button" className={cn(
          'inline-flex items-center gap-1.5 max-w-32.5 h-6 px-2.5 rounded-full border border-border bg-transparent text-xs font-medium text-muted-foreground whitespace-nowrap transition-colors hover:bg-accent hover:text-foreground hover:border-border/80',
          value && 'bg-accent border-border text-foreground',
        )}>
          <CalendarIcon className="size-3 shrink-0 opacity-70" />
          <span className="overflow-hidden text-ellipsis max-w-22.5 truncate">
            {value
              ? dateValue!.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : placeholder}
          </span>
          <ChevronDown className="size-3 opacity-50 shrink-0" />
        </button>
      }
      footer={
        value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="w-full text-xs text-muted-foreground hover:text-foreground py-1 px-2 rounded hover:bg-accent transition-colors"
          >
            {clearLabel}
          </button>
        ) : null
      }
    />
  );
}

// ============================================================================
// CapsuleSelect - 可下拉选择胶囊
// ============================================================================

export interface CapsuleSelectOption {
  value: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
}

export function CapsuleSelect({
  value,
  options,
  onChange,
  active,
  placeholder = 'None',
  contentClassName,
}: {
  value: string;
  options: CapsuleSelectOption[];
  onChange: (v: string) => void;
  active?: boolean;
  placeholder?: string;
  contentClassName?: string;
}) {
  const current = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 max-w-32.5 h-6 px-2.5 rounded-full border border-border bg-transparent text-xs font-medium text-muted-foreground whitespace-nowrap transition-colors hover:bg-accent hover:text-foreground hover:border-border/80',
            active && 'bg-accent border-border text-foreground',
          )}
        >
          {current?.icon}
          <span className="overflow-hidden text-ellipsis max-w-22.5 truncate">
            {current?.label ?? placeholder}
          </span>
          <ChevronDown className="size-3 opacity-50 shrink-0" />
        </button>
      } />
      <PopoverContent
        align="end"
        sideOffset={4}
        className={cn('w-50 p-1 max-h-65 overflow-y-auto', contentClassName)}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors',
              !value && 'bg-accent',
            )}
          >
            <span className="text-muted-foreground italic">{placeholder}</span>
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors',
                value === opt.value && 'bg-accent',
              )}
            >
              {opt.icon}
              <span className="flex-1 text-left">{opt.label}</span>
              {value === opt.value && <Check className="size-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// AutoSizeTextarea
// ============================================================================

export function AutoSizeTextarea({
  rows = 1,
  className,
  ...props
}: React.ComponentProps<'textarea'> & { rows?: number }) {
  return (
    <Textarea
      rows={rows}
      className={cn(
        'field-sizing-content bg-transparent dark:bg-transparent [background-color:transparent] !border-0 shadow-none px-0.5 py-0 rounded-none focus-visible:ring-0 focus-visible:border-transparent min-h-0 resize-none',
        className,
      )}
      {...props}
    />
  );
}

// ============================================================================
// PropertyRow - 属性行
// ============================================================================

export function PropertyRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg min-h-8 hover:bg-muted/40 transition-colors">
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ============================================================================
// PropsCard - 可折叠属性卡片
// ============================================================================

export function PropsCard({
  title,
  collapsed,
  onToggleCollapse,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}) {
  return (
    <SidebarPanel title={title} collapsed={collapsed} onToggle={onToggleCollapse}>
      {children}
    </SidebarPanel>
  );
}

// ============================================================================
// SuggestionsCard
// ============================================================================

export interface SuggestionsItem {
  label: string;
  icon: ComponentType<LucideProps>;
  color: string;
}

const DEFAULT_SUGGESTIONS: SuggestionsItem[] = [
  { label: 'High priority', icon: AlertCircleIcon, color: 'text-orange-500' },
  { label: 'Tag: frontend', icon: TagIcon, color: 'text-blue-500' },
  { label: 'Assign me', icon: UserIcon, color: 'text-violet-500' },
  { label: 'Today', icon: CalendarIcon, color: 'text-emerald-500' },
];

export function SuggestionsCard({
  collapsed,
  onToggle,
  items = DEFAULT_SUGGESTIONS,
  title = 'Suggestions',
}: {
  collapsed: boolean;
  onToggle: () => void;
  items?: SuggestionsItem[];
  /** 面板标题（调用方传 i18n，默认英文 Suggestions） */
  title?: string;
}) {
  return (
    <SidebarPanel
      title={title}
      icon={<Sparkles className="size-3" />}
      iconClassName="text-accent-purple"
      collapsed={collapsed}
      onToggle={onToggle}
    >
      <div className="flex flex-col gap-0.5">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.label}
              type="button"
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <Icon className={cn('size-3.5', it.color)} />
              <span className="flex-1 text-left">{it.label}</span>
            </button>
          );
        })}
      </div>
    </SidebarPanel>
  );
}

// ============================================================================
// SubTaskCard - 子任务输入卡片
// ============================================================================

function SmallCaps({
  icon: Icon,
  label,
  onClick,
}: {
  icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 h-5.5 px-2 rounded-full border border-border bg-transparent text-11 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Icon className="size-3" />
      <span>{label}</span>
    </button>
  );
}

export function SubTaskCard({
  open,
  onOpen,
  onClose,
  onSave,
  isSaving,
  title,
  desc,
  onTitleChange,
  onDescChange,
  smallChips,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onSave?: () => void;
  isSaving?: boolean;
  title: string;
  desc: string;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
  smallChips?: { icon: ComponentType<SVGProps<SVGSVGElement> & { className?: string }>; label: string; onClick?: () => void }[];
}) {
  if (!open) {
    return (
      <div className="px-4 py-3 border-t border-border/40 bg-card/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors w-full px-1 py-1"
        >
          <Plus className="size-3.5" />
          <span>Add sub-task</span>
        </button>
      </div>
    );
  }
  return (
    <div className="px-4 py-3 border-t border-border/40 bg-card/80 backdrop-blur-sm">
      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ListTodo className="size-3.5" />
            <span>Sub-task</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="关闭"
          >
            <X className="size-3" />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <AutoSizeTextarea
            autoFocus
            rows={1}
            placeholder="Sub-task title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full text-sm font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
          <AutoSizeTextarea
            rows={1}
            placeholder="Add description…"
            value={desc}
            onChange={(e) => onDescChange(e.target.value)}
            className="w-full text-xs font-normal placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
        </div>
        {smallChips && smallChips.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {smallChips.map((c, i) => (
              <SmallCaps key={`${c.label}-${i}`} icon={c.icon} label={c.label} onClick={c.onClick} />
            ))}
          </div>
        )}
        {onSave && (
          <div className="px-4 pb-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-7 px-3 rounded-md text-xs text-muted-foreground hover:bg-accent transition-colors"
            >
              取消
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!title.trim() || isSaving}
              className="h-7 px-3 rounded-md text-xs bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSaving ? <Loader2Icon className="size-3 animate-spin" /> : '保存子任务'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}