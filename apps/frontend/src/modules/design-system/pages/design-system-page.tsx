import * as React from 'react'
import { useState } from 'react'
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BarChart3,
  Bell,
  Bookmark,
  BookOpen,
  Bot,
  Briefcase,
  Bug,
  CalendarRange,
  Building2,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronRight,
  ChevronsUp,
  Circle,
  ClipboardCheck,
  Clock,
  Code2,
  Copy,
  Download,
  Edit2,
  ExternalLink,
  FileText,
  Flag,
  FlaskConical,
  FolderKanban,
  GitBranch,
  Home,
  Info,
  Kanban,
  Layers,
  LayoutDashboard,
  LayoutGrid,
  List,
  ListTree,
  Loader,
  Loader2,
  Mail,
  Minus,
  MoreHorizontal,
  Palette,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  Tag,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Slider } from '@/components/ui/slider'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { AvatarPickerField } from '@/components/ui/avatar-picker-field'
import { TrustLevelBadge } from '@/modules/team-member/components/trust-level-badge'
import { MentionTextarea } from '@/modules/team-member/components/mention-textarea'
import { MentionRenderer } from '@/modules/team-member/components/mention-renderer'
import { ActivityHeatmap } from '@/components/ui/activity-heatmap'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Combobox,
  ComboboxContent,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { ButtonGroup, ButtonGroupText } from '@/components/ui/button-group'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { Kbd, KbdGroup } from '@/components/ui/kbd'
import { Spinner } from '@/components/ui/spinner'
import { StatusPill } from '@/components/ui/status-pill'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { Calendar } from '@/components/ui/calendar'
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from '@/components/ui/input-otp'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@/components/ui/input-group'
import { NativeSelect } from '@/components/ui/native-select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AspectRatio } from '@/components/ui/aspect-ratio'
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarLabel,
  MenubarSeparator,
  MenubarTrigger,
} from '@/components/ui/menubar'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { PageHeader } from '@/components/ui/page-header'
import { PageShell } from '@/components/ui/page-shell'
import { HeaderActionButton } from '@/components/ui/header-action-button'
import { ToolbarRow, useToolbarViews, type ToolbarViewStyleOption } from '@/components/ui/toolbar-row'
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar'
import { SectionCard } from '@/components/ui/section-card'
import { StatCard } from '@/components/ui/stat-card'
import { StatsCard } from '@/components/ui/stats-card'
import { IconMetric } from '@/components/ui/icon-metric'
import { DataTableShell } from '@/components/ui/data-table-shell'
import { EmptyState } from '@/components/ui/empty-state'
import { AsyncState } from '@/components/ui/async-state'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { cn } from '@/lib/utils'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartTooltip,
  XAxis,
  YAxis,
} from 'recharts'

const SECTIONS = [
  { id: 'colors', label: 'Color Tokens', group: 'Tokens' },
  { id: 'typography', label: 'Typography', group: 'Tokens' },
  { id: 'spacing', label: 'Spacing', group: 'Tokens' },
  { id: 'radius', label: 'Border Radius', group: 'Tokens' },
  { id: 'shadows', label: 'Shadows', group: 'Tokens' },
  { id: 'buttons', label: 'Buttons', group: 'Primitives' },
  { id: 'badges', label: 'Badges', group: 'Primitives' },
  { id: 'tags', label: 'Tags / Chips', group: 'Primitives' },
  { id: 'avatars', label: 'Avatars', group: 'Primitives' },
  { id: 'cards', label: 'Cards', group: 'Primitives' },
  { id: 'forms', label: 'Forms', group: 'Primitives' },
  { id: 'alerts', label: 'Alerts', group: 'Primitives' },
  { id: 'progress', label: 'Progress', group: 'Primitives' },
  { id: 'tabs', label: 'Tabs', group: 'Primitives' },
  { id: 'accordion', label: 'Accordion', group: 'Primitives' },
  { id: 'table', label: 'Table', group: 'Primitives' },
  { id: 'tooltip', label: 'Tooltip & Menu', group: 'Primitives' },
  { id: 'overlays', label: 'Overlays', group: 'Primitives' },
  { id: 'popover', label: 'Popover & Combobox', group: 'Primitives' },
  { id: 'breadcrumb', label: 'Breadcrumb', group: 'Primitives' },
  { id: 'button-group', label: 'Button Group', group: 'Primitives' },
  { id: 'toggle', label: 'Toggle & Segmented', group: 'Primitives' },
  { id: 'kbd', label: 'Kbd', group: 'Primitives' },
  { id: 'spinner', label: 'Spinner', group: 'Primitives' },
  { id: 'status-pill', label: 'Status Pill', group: 'Primitives' },
  { id: 'pagination', label: 'Pagination', group: 'Primitives' },
  { id: 'calendar', label: 'Calendar', group: 'Primitives' },
  { id: 'input-otp', label: 'Input OTP', group: 'Primitives' },
  { id: 'input-group', label: 'Input Group', group: 'Primitives' },
  { id: 'native-select', label: 'Native Select', group: 'Primitives' },
  { id: 'scroll-area', label: 'Scroll Area', group: 'Primitives' },
  { id: 'aspect-ratio', label: 'Aspect Ratio', group: 'Primitives' },
  { id: 'menubar', label: 'Menubar', group: 'Primitives' },
  { id: 'collapsible', label: 'Collapsible', group: 'Primitives' },
  { id: 'skeleton', label: 'Skeleton', group: 'Primitives' },
  { id: 'empty', label: 'Empty States', group: 'Primitives' },
  { id: 'stat-tiles', label: 'Stat Tiles', group: 'Primitives' },
  { id: 'charts', label: 'Charts', group: 'Primitives' },
  { id: 'page-header', label: 'Page Header', group: 'App Components' },
  { id: 'toolbar', label: 'Toolbar Row', group: 'App Components' },
  { id: 'sub-page-toolbar', label: 'Sub Page Toolbar', group: 'App Components' },
  { id: 'task-atoms', label: 'Task Atoms', group: 'App Components' },
  { id: 'task-rows', label: 'Task Rows', group: 'App Components' },
  { id: 'create-card', label: 'Create / CTA', group: 'App Components' },
  { id: 'delivery-row', label: 'Delivery Row', group: 'App Components' },
  { id: 'doc-cards', label: 'Document Cards', group: 'App Components' },
  { id: 'command', label: 'Command Palette', group: 'App Components' },
  { id: 'page-layout', label: 'Page Layout', group: 'App Components' },
  { id: 'stat-cards', label: 'Stat Cards', group: 'App Components' },
  { id: 'loading-states', label: 'Loading & Empty', group: 'App Components' },
]

const SECTION_GROUPS = ['Tokens', 'Primitives', 'App Components']

/** SubPageToolbar 演示：返回 + 面包屑 + 居中页签 + 翻页器/按钮组/侧栏开关 */
function SubPageToolbarDemo({ withPager, withSidebar }: { withPager?: boolean; withSidebar?: boolean }) {
  const [tab, setTab] = React.useState('overview');
  const [sidebarOpen, setSidebarOpen] = React.useState(true);
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <SubPageToolbar
        breadcrumbs={[
          { label: 'Projects', to: '/app/projects' },
          { label: 'Nebula Core' },
          { label: 'Board' },
        ]}
        tabs={{
          value: tab,
          onChange: setTab,
          items: [
            { value: 'overview', label: 'Overview', icon: BarChart3 },
            { value: 'board', label: 'Board', icon: Kanban, tone: 'blue' as const },
            { value: 'milestones', label: 'Milestones', icon: CalendarRange, tone: 'purple' as const },
          ],
        }}
        pager={
          withPager
            ? { hasPrev: true, hasNext: true, onPrev: () => {}, onNext: () => {}, position: '3/12' }
            : undefined
        }
        actions={<HeaderActionButton icon={Plus} label="New Item" variant="outline" />}
        sidebar={withSidebar ? { open: sidebarOpen, onToggle: () => setSidebarOpen((v) => !v) } : undefined}
      />
      <div className="px-6 py-4 text-xs text-muted-foreground">
        tab: {tab}
        {withSidebar ? ` · sidebar: ${sidebarOpen ? 'open' : 'hidden'}` : ''} — 返回按钮默认 history back；面包屑中间层可点击
      </div>
    </div>
  );
}

/** ToolbarRow 交互演示：真实组件 + 本地状态，可切换/添加视图、打开各下拉 */
function ToolbarRowDemo({ demoKey, styleOptions }: { demoKey: string; styleOptions: ToolbarViewStyleOption[] }) {
  const [styleValue, setStyleValue] = React.useState(styleOptions[0]?.value ?? 'list');
  const [status, setStatus] = React.useState('all');
  const [query, setQuery] = React.useState('');
  const toolbar = useToolbarViews({
    key: `design-system-${demoKey}`,
    defaults: [{ id: 'default', name: 'Default View', icon: 'list', builtIn: true, snapshot: {} }],
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <ToolbarRow
        views={toolbar.views}
        activeViewId={toolbar.activeViewId}
        onSelectView={toolbar.selectView}
        onCreateView={toolbar.createView}
        onUpdateView={toolbar.updateView}
        onDeleteView={toolbar.deleteView}
        viewStyle={{ value: styleValue, onChange: setStyleValue, options: styleOptions }}
        filterMenu={{
          badge: status !== 'all' ? 1 : 0,
          search: { value: query, onChange: setQuery, placeholder: 'Search…' },
          items: [
            { type: 'label', label: 'Status' },
            ...['all', 'todo', 'in progress', 'done'].map((value) => ({
              id: `st-${value}`,
              type: 'checkbox' as const,
              label: value === 'all' ? 'All' : value.replace('in progress', 'In Progress').replace('done', 'Done').replace('todo', 'Todo'),
              checked: status === value,
              onSelect: () => setStatus(value),
            })),
          ],
        }}
        displayMenu={{
          items: [
            { type: 'label', label: 'Density' },
            { id: 'd-comfortable', type: 'checkbox', label: 'Comfortable', checked: true },
            { id: 'd-compact', type: 'checkbox', label: 'Compact' },
          ],
        }}
        downloadMenu={{
          items: [
            { type: 'label', label: 'Export' },
            { id: 'csv', type: 'item', label: 'CSV', disabled: true },
            { id: 'json', type: 'item', label: 'JSON', disabled: true },
          ],
        }}
      />
      <div className="px-6 py-4 text-xs text-muted-foreground">
        style: {styleValue} · status: {status}{query ? ` · query: "${query}"` : ''} — 点击已激活视图胶囊可重命名/换图标/删除，"+" 新建视图会快照当前状态
      </div>
    </div>
  );
}

const COLOR_GROUPS = [
  { label: 'Base', tokens: [
    { name: '--background', tw: 'bg-background' },
    { name: '--foreground', tw: 'bg-foreground' },
    { name: '--border', tw: 'bg-border' },
    { name: '--ring', tw: 'bg-ring' },
  ]},
  { label: 'Brand', tokens: [
    { name: '--primary', tw: 'bg-primary' },
    { name: '--primary-foreground', tw: 'bg-primary-foreground' },
    { name: '--secondary', tw: 'bg-secondary' },
    { name: '--secondary-foreground', tw: 'bg-secondary-foreground' },
  ]},
  { label: 'Surface', tokens: [
    { name: '--card', tw: 'bg-card' },
    { name: '--muted', tw: 'bg-muted' },
    { name: '--accent', tw: 'bg-accent' },
    { name: '--popover', tw: 'bg-popover' },
  ]},
  { label: 'Semantic', tokens: [
    { name: '--destructive', tw: 'bg-destructive' },
    { name: '--destructive-foreground', tw: 'bg-destructive-foreground' },
  ]},
  { label: 'Charts', tokens: [
    { name: '--chart-1', tw: 'bg-chart-1' },
    { name: '--chart-2', tw: 'bg-chart-2' },
    { name: '--chart-3', tw: 'bg-chart-3' },
    { name: '--chart-4', tw: 'bg-chart-4' },
    { name: '--chart-5', tw: 'bg-chart-5' },
  ]},
  { label: 'Sidebar', tokens: [
    { name: '--sidebar', tw: 'bg-sidebar' },
    { name: '--sidebar-accent', tw: 'bg-sidebar-accent' },
    { name: '--sidebar-primary', tw: 'bg-sidebar-primary' },
  ]},
]

const RADIUS_VALUES = [
  { label: 'sm', cls: 'rounded-sm', value: '~6px' },
  { label: 'md', cls: 'rounded-md', value: '~8px' },
  { label: 'lg', cls: 'rounded-lg', value: '0.625rem' },
  { label: 'xl', cls: 'rounded-xl', value: '~14px' },
  { label: '2xl', cls: 'rounded-2xl', value: '1rem' },
  { label: 'full', cls: 'rounded-full', value: '9999px' },
]

const SHADOW_VALUES = [
  { label: 'shadow-sm', cls: 'shadow-sm' },
  { label: 'shadow', cls: 'shadow' },
  { label: 'shadow-md', cls: 'shadow-md' },
  { label: 'shadow-lg', cls: 'shadow-lg' },
  { label: 'shadow-xl', cls: 'shadow-xl' },
  { label: 'shadow-2xl', cls: 'shadow-2xl' },
]

const SPACING_SCALE = [1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32, 40, 48, 64]

const CHART_DATA = [
  { month: 'Jan', value: 42, bugs: 8, revenue: 12400 },
  { month: 'Feb', value: 68, bugs: 14, revenue: 18900 },
  { month: 'Mar', value: 55, bugs: 6, revenue: 15300 },
  { month: 'Apr', value: 80, bugs: 20, revenue: 24100 },
  { month: 'May', value: 73, bugs: 11, revenue: 21700 },
  { month: 'Jun', value: 91, bugs: 4, revenue: 28400 },
]

const PIE_DATA = [
  { name: 'Done', value: 44, fill: 'hsl(var(--chart-2, 190 65% 48%))' },
  { name: 'In Progress', value: 28, fill: 'hsl(var(--chart-1, 25 80% 54%))' },
  { name: 'In Review', value: 16, fill: 'hsl(var(--chart-4, 60 75% 65%))' },
  { name: 'Open', value: 12, fill: 'hsl(var(--chart-3, 230 50% 42%))' },
]

type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled'
type Priority = 'urgent' | 'high' | 'medium' | 'low'
type Severity = 'critical' | 'high' | 'medium' | 'low'

const STATUS_CFG: Record<TaskStatus, { label: string; Icon: React.ElementType; color: string; bg: string }> = {
  todo: { label: 'Todo', Icon: Circle, color: 'text-slate-500', bg: 'bg-slate-100 dark:bg-slate-800' },
  in_progress: { label: 'In Progress', Icon: Loader, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/60' },
  in_review: { label: 'In Review', Icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/60' },
  done: { label: 'Done', Icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/60' },
  canceled: { label: 'Canceled', Icon: XCircle, color: 'text-slate-400', bg: 'bg-muted' },
}

const PRIORITY_CFG: Record<Priority, { label: string; Icon: React.ElementType; color: string }> = {
  urgent: { label: 'Urgent', Icon: ChevronsUp, color: 'text-red-500' },
  high: { label: 'High', Icon: ArrowUp, color: 'text-orange-500' },
  medium: { label: 'Medium', Icon: Minus, color: 'text-blue-500' },
  low: { label: 'Low', Icon: ArrowDown, color: 'text-slate-400' },
}

const SEVERITY_CFG: Record<Severity, { label: string; bar: string; text: string }> = {
  critical: { label: 'Critical', bar: 'bg-red-500', text: 'text-red-600 dark:text-red-400' },
  high: { label: 'High', bar: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400' },
  medium: { label: 'Medium', bar: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
  low: { label: 'Low', bar: 'bg-slate-300', text: 'text-slate-500' },
}

const MILESTONE_COLORS = [
  { bg: 'bg-blue-50 dark:bg-blue-950/50', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  { bg: 'bg-violet-50 dark:bg-violet-950/50', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  { bg: 'bg-emerald-50 dark:bg-emerald-950/50', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  { bg: 'bg-amber-50 dark:bg-amber-950/50', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
]

const ACCEPT_STAGES: Record<string, { label: string; color: string; bg: string }> = {
  unit: { label: 'Unit Test', color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40' },
  internal: { label: 'Internal', color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40' },
  dev: { label: 'Dev Team', color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40' },
  pm: { label: 'PM', color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40' },
  client: { label: 'Client', color: 'text-slate-600', bg: 'bg-slate-50 dark:bg-slate-800' },
}

function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-6">{children}</section>
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-foreground mb-4 pb-2 border-b border-border flex items-center gap-2">
      {children}
    </h2>
  )
}

function SubLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-10 font-semibold text-muted-foreground uppercase tracking-wider mb-3">{children}</p>
  )
}

function TokenLabel({ name }: { name: string }) {
  const [copied, setCopied] = React.useState(false)
  const copy = () => { navigator.clipboard.writeText(name); setCopied(true); setTimeout(() => setCopied(false), 1200) }
  return (
    <button onClick={copy} className="flex items-center gap-1 text-10 text-muted-foreground hover:text-foreground font-mono group transition-colors">
      <span>{name}</span>
      {copied
        ? <Check className="w-2.5 h-2.5 text-emerald-500" />
        : <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />}
    </button>
  )
}

function StatusChip({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <div className={cn('w-5.5 h-5.5 rounded-md flex items-center justify-center shrink-0', cfg.bg)} title={cfg.label}>
      <cfg.Icon className={cn('w-3.5 h-3.5', cfg.color, status === 'in_progress' && 'animate-spin')}
        style={status === 'in_progress' ? { animationDuration: '2s' } : undefined} />
    </div>
  )
}

function PriorityIcon({ priority }: { priority: Priority }) {
  const cfg = PRIORITY_CFG[priority]
  return <cfg.Icon className={cn('w-3.5 h-3.5 shrink-0', cfg.color)} title={cfg.label} />
}

function MilestonePill({ name, idx = 0 }: { name: string; idx?: number }) {
  const c = MILESTONE_COLORS[idx % 4]
  return (
    <span className={cn('inline-flex items-center text-10 font-medium px-2 py-0.5 rounded-full border whitespace-nowrap truncate', c.bg, c.text, c.border)}>
      {name}
    </span>
  )
}

function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center text-10 px-1.5 py-0.5 rounded-sm font-medium whitespace-nowrap"
      style={{ backgroundColor: color + '22', color }}>
      {name}
    </span>
  )
}

function ProgressRing({ done, total, size = 14 }: { done: number; total: number; size?: number }) {
  const r = (size - 2.5) / 2
  const circ = 2 * Math.PI * r
  const ratio = total > 0 ? done / total : 0
  const stroke = ratio === 1 ? '#10B981' : ratio > 0 ? '#3B82F6' : '#94A3B8'
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground/20" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={stroke} strokeWidth="2.2"
        strokeDasharray={`${ratio * circ} ${circ}`} strokeLinecap="round" />
    </svg>
  )
}

function SubtaskBadge({ done, total }: { done: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-border bg-muted/60 text-10 font-medium text-muted-foreground shrink-0 ml-1.5">
      <ProgressRing done={done} total={total} />
      <span>{done}/{total}</span>
    </span>
  )
}

function AssigneeAvatar({ initials, color }: { initials?: string; color?: string }) {
  if (!initials) {
    return (
      <div className="w-5.5 h-5.5 rounded-full bg-muted flex items-center justify-center shrink-0">
        <User className="h-3 w-3 text-muted-foreground/40" />
      </div>
    )
  }
  return (
    <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-white text-9 font-semibold shrink-0"
      style={{ backgroundColor: color || '#6366F1' }}>
      {initials}
    </div>
  )
}

function AvatarPickerShowcase() {
  const [value, setValue] = useState<string | null>(null)
  return (
    <div className="space-y-2 max-w-md">
      <AvatarPickerField value={value} onValueChange={setValue} />
      <div className="text-10 text-muted-foreground">当前值: {value ?? '（未选择）'}</div>
    </div>
  )
}

function MentionShowcase() {
  const [text, setText] = useState('这个任务交给 @claude-coder 处理，@alice 负责评审。')
  return (
    <div className="space-y-2 max-w-lg">
      <MentionTextarea value={text} onChange={setText} rows={2} placeholder="输入 @ 提及成员…" />
      <div className="rounded-md border border-border p-2 text-sm">
        <MentionRenderer text={text} />
      </div>
    </div>
  )
}

function ActivityHeatmapShowcase() {
  const data = Array.from({ length: 91 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (90 - i))
    const seed = Math.sin(i * 12.9898) * 43758.5453
    const count = Math.floor(Math.abs(seed % 1) * 8) - 4
    return { date: d.toISOString().slice(0, 10), count: Math.max(0, count) }
  })
  return <ActivityHeatmap data={data} days={91} className="max-w-lg" />
}

function SeverityBar({ severity }: { severity: Severity }) {
  const cfg = SEVERITY_CFG[severity]
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn('w-1 h-5 rounded-full shrink-0', cfg.bar)} />
      <span className={cn('text-xs font-medium', cfg.text)}>{cfg.label}</span>
    </div>
  )
}

function AcceptPill({ stage, passed }: { stage: string; passed: boolean | null }) {
  const cfg = ACCEPT_STAGES[stage]
  if (passed === null) {
    return (
      <span className="inline-flex items-center text-10 px-2 py-0.5 rounded border border-dashed border-border text-muted-foreground/50">
        {cfg.label}
      </span>
    )
  }
  if (passed) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-10 px-2 py-0.5 rounded border border-transparent', cfg.bg, cfg.color)}>
        <Check className="w-2.5 h-2.5" /> {cfg.label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-10 px-2 py-0.5 rounded border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
      <X className="w-2.5 h-2.5" /> {cfg.label}
    </span>
  )
}

function AgentPill({ name, status }: { name: string; status: 'active' | 'contributed' | 'idle' | 'not_used' }) {
  const colors: Record<string, string> = {
    active: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400',
    contributed: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400',
    idle: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400',
    not_used: 'bg-muted text-muted-foreground border-border',
  }
  return (
    <span className={cn('inline-flex items-center text-10 font-medium px-2 py-0.5 rounded border', colors[status])}>
      {name}
    </span>
  )
}

export function DesignSystemPage() {
  const [activeSection, setActiveSection] = React.useState('colors')
  const [sliderVal, setSliderVal] = React.useState(40)
  const [groupCollapsed, setGroupCollapsed] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [alertOpen, setAlertOpen] = React.useState(false)
  const [segValue, setSegValue] = React.useState<string>('list')
  const [ownerValue, setOwnerValue] = React.useState('')

  const scrollTo = (id: string) => {
    setActiveSection(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const grouped = SECTION_GROUPS.map((g) => ({
    label: g,
    items: SECTIONS.filter((s) => s.group === g),
  }))

  return (
    <div className="flex h-full overflow-hidden bg-background">

      <aside className="w-48 shrink-0 border-r border-border overflow-y-auto">
        <div className="px-4 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">Design System</span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-9 font-bold bg-violet-500 text-white uppercase tracking-wide">
              DEV
            </span>
          </div>
          <p className="text-10 text-muted-foreground mt-0.5">Tokens · Components · Patterns</p>
        </div>
        <nav className="p-2 space-y-3">
          {grouped.map((g) => (
            <div key={g.label}>
              <p className="px-2.5 pb-1 text-9 font-bold text-muted-foreground/50 uppercase tracking-widest">{g.label}</p>
              {g.items.map((s) => (
                <button
                  key={s.id}
                  onClick={() => scrollTo(s.id)}
                  className={cn(
                    'w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors',
                    activeSection === s.id
                      ? 'bg-accent text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget
          for (const s of SECTIONS) {
            const node = document.getElementById(s.id)
            if (node && node.offsetTop - el.scrollTop < 120) setActiveSection(s.id)
          }
        }}
      >
        <div className="max-w-4xl mx-auto px-8 py-6 space-y-12">

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-foreground">Design System</h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-10 font-bold bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400 border border-violet-200 dark:border-violet-800 uppercase tracking-wider">
                <Zap className="w-2.5 h-2.5" /> DEV MODE
              </span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              AgentPM design tokens, primitives, and app-level component patterns.
            </p>
          </div>

          <SectionAnchor id="colors">
            <SectionTitle>Color Tokens</SectionTitle>
            <div className="space-y-6">
              {COLOR_GROUPS.map((group) => (
                <div key={group.label}>
                  <SubLabel>{group.label}</SubLabel>
                  <div className="grid grid-cols-4 gap-3">
                    {group.tokens.map((t) => (
                      <div key={t.name} className="flex flex-col gap-1.5">
                        <div className={cn('h-12 rounded-lg border border-border/50', t.tw)} />
                        <TokenLabel name={t.name} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div>
                <SubLabel>Semantic States</SubLabel>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Success', bg: 'bg-emerald-500', name: 'emerald-500' },
                    { label: 'Warning', bg: 'bg-amber-500', name: 'amber-500' },
                    { label: 'Error', bg: 'bg-red-500', name: 'red-500' },
                    { label: 'Info', bg: 'bg-blue-500', name: 'blue-500' },
                  ].map((c) => (
                    <div key={c.name} className="flex flex-col gap-1.5">
                      <div className={cn('h-12 rounded-lg', c.bg)} />
                      <span className="text-10 text-muted-foreground font-mono">{c.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="typography">
            <SectionTitle>Typography</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Font Families</SubLabel>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <p className="text-10 text-muted-foreground font-mono mb-2">Inter — sans-serif</p>
                    <p className="text-2xl font-light">The quick brown fox</p>
                    <p className="text-sm text-muted-foreground">ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789</p>
                  </div>
                  <div className="p-4 rounded-lg border border-border bg-muted/20">
                    <p className="text-10 text-muted-foreground font-mono mb-2">JetBrains Mono — monospace</p>
                    <p className="font-mono text-xl font-light">const x = 42;</p>
                    <p className="font-mono text-sm text-muted-foreground">npm run build --watch</p>
                  </div>
                </div>
              </div>
              <div>
                <SubLabel>Type Scale</SubLabel>
                <div className="space-y-3 p-4 rounded-lg border border-border">
                  {[
                    { cls: 'text-4xl', label: 'text-4xl', sample: 'Display Heading' },
                    { cls: 'text-3xl', label: 'text-3xl', sample: 'Page Title' },
                    { cls: 'text-2xl', label: 'text-2xl', sample: 'Section Header' },
                    { cls: 'text-xl', label: 'text-xl', sample: 'Card Title' },
                    { cls: 'text-lg', label: 'text-lg', sample: 'Group Label' },
                    { cls: 'text-base', label: 'text-base', sample: 'Body Text' },
                    { cls: 'text-sm', label: 'text-sm', sample: 'Secondary Text' },
                    { cls: 'text-xs', label: 'text-xs', sample: 'Caption / Label' },
                  ].map(({ cls, label, sample }) => (
                    <div key={cls} className="flex items-baseline gap-4">
                      <code className="w-20 text-10 text-muted-foreground shrink-0">{label}</code>
                      <span className={cn(cls, 'text-foreground leading-none')}>{sample}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Font Weights</SubLabel>
                <div className="flex flex-wrap gap-4 p-4 rounded-lg border border-border">
                  {[
                    { cls: 'font-light', label: 'Light (300)' },
                    { cls: 'font-normal', label: 'Regular (400)' },
                    { cls: 'font-medium', label: 'Medium (500)' },
                    { cls: 'font-semibold', label: 'Semibold (600)' },
                    { cls: 'font-bold', label: 'Bold (700)' },
                  ].map(({ cls, label }) => (
                    <div key={cls} className="flex flex-col gap-1">
                      <span className={cn(cls, 'text-lg text-foreground')}>Ag</span>
                      <span className="text-10 text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="spacing">
            <SectionTitle>Spacing Scale</SectionTitle>
            <div className="space-y-2">
              {SPACING_SCALE.map((n) => (
                <div key={n} className="flex items-center gap-4">
                  <code className="w-8 text-10 text-muted-foreground text-right shrink-0">{n}</code>
                  <div className="h-5 bg-primary/20 rounded-sm border border-primary/30" style={{ width: `${n * 4}px` }} />
                  <span className="text-10 text-muted-foreground">{n * 4}px</span>
                </div>
              ))}
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="radius">
            <SectionTitle>Border Radius</SectionTitle>
            <div className="flex flex-wrap gap-6">
              {RADIUS_VALUES.map(({ cls, value }) => (
                <div key={cls} className="flex flex-col items-center gap-2">
                  <div className={cn('w-16 h-16 bg-primary/15 border-2 border-primary/40', cls)} />
                  <code className="text-10 text-foreground font-mono">{cls}</code>
                  <span className="text-10 text-muted-foreground">{value}</span>
                </div>
              ))}
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="shadows">
            <SectionTitle>Shadows</SectionTitle>
            <div className="flex flex-wrap gap-8">
              {SHADOW_VALUES.map(({ label, cls }) => (
                <div key={cls} className="flex flex-col items-center gap-3">
                  <div className={cn('w-20 h-20 rounded-xl bg-card border border-border', cls)} />
                  <code className="text-10 text-muted-foreground">{label}</code>
                </div>
              ))}
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="buttons">
            <SectionTitle>Buttons</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>Variants</SubLabel>
                <div className="flex flex-wrap gap-3">
                  <Button variant="default">Default</Button>
                  <Button variant="secondary">Secondary</Button>
                  <Button variant="outline">Outline</Button>
                  <Button variant="ghost">Ghost</Button>
                  <Button variant="destructive">Destructive</Button>
                  <Button variant="link">Link</Button>
                </div>
              </div>
              <div>
                <SubLabel>Sizes</SubLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <Button size="lg">Large</Button>
                  <Button size="default">Default</Button>
                  <Button size="sm">Small</Button>
                  <Button size="icon"><Settings /></Button>
                </div>
              </div>
              <div>
                <SubLabel>With Icons</SubLabel>
                <div className="flex flex-wrap gap-3">
                  <Button><Plus /> New Item</Button>
                  <Button variant="outline"><Mail /> Send</Button>
                  <Button variant="secondary"><Star /> Favorite</Button>
                  <Button variant="destructive"><Trash2 /> Delete</Button>
                </div>
              </div>
              <div>
                <SubLabel>States</SubLabel>
                <div className="flex flex-wrap gap-3">
                  <Button>Active</Button>
                  <Button disabled>Disabled</Button>
                  <Button disabled><Loader2 className="animate-spin" /> Loading…</Button>
                  <Button variant="outline" disabled>Disabled Outline</Button>
                </div>
              </div>
              <div>
                <SubLabel>Icon toolbar</SubLabel>
                <div className="flex gap-1 p-2 rounded-lg border border-border bg-muted/20 w-fit">
                  {[Edit2, Trash2, Star, Bell, Settings].map((Icon, i) => (
                    <Button key={i} variant="ghost" size="icon"><Icon className="w-4 h-4" /></Button>
                  ))}
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="badges">
            <SectionTitle>Badges</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>System Variants</SubLabel>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">Default</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                </div>
              </div>
              <div>
                <SubLabel>Status Labels</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Active', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800' },
                    { label: 'In Progress', cls: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800' },
                    { label: 'In Review', cls: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800' },
                    { label: 'Done', cls: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-400 dark:border-violet-800' },
                    { label: 'Blocked', cls: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800' },
                    { label: 'Canceled', cls: 'bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700' },
                  ].map(({ label, cls }) => (
                    <span key={label} className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border', cls)}>{label}</span>
                  ))}
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="tags">
            <SectionTitle>Tags / Chips</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>Label Tags (color-coded)</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Frontend', color: '#3B82F6' },
                    { name: 'Backend', color: '#10B981' },
                    { name: 'Design', color: '#8B5CF6' },
                    { name: 'Bug', color: '#EF4444' },
                    { name: 'CI/CD', color: '#F59E0B' },
                    { name: 'Docs', color: '#EC4899' },
                    { name: 'API', color: '#14B8A6' },
                    { name: 'Security', color: '#F97316' },
                  ].map(({ name, color }) => (
                    <LabelChip key={name} name={name} color={color} />
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Closeable Tags</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {['React', 'TypeScript', 'Tailwind', 'Vite', 'Radix UI'].map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground text-xs font-medium border border-border">
                      <Tag className="w-2.5 h-2.5" />
                      {tag}
                      <button className="ml-0.5 hover:text-destructive transition-colors">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  <button className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-dashed border-border text-muted-foreground text-xs hover:border-primary hover:text-primary transition-colors">
                    <Plus className="w-2.5 h-2.5" /> Add tag
                  </button>
                </div>
              </div>
              <div>
                <SubLabel>Milestone Pills</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {['Phase 1 · Core UI', 'Phase 2 · Intelligence', 'Phase 3 · Quality', 'v1.0 Release'].map((m, i) => (
                    <MilestonePill key={m} name={m} idx={i} />
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Category Chips</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: '需求文档', Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800' },
                    { label: '设计文档', Icon: Palette, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40', border: 'border-violet-200 dark:border-violet-800' },
                    { label: 'API文档', Icon: Code2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
                    { label: '测试文档', Icon: CheckSquare, color: 'text-orange-600', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-800' },
                    { label: '用户指南', Icon: BookOpen, color: 'text-cyan-600', bg: 'bg-cyan-50 dark:bg-cyan-950/40', border: 'border-cyan-200 dark:border-cyan-800' },
                  ].map(({ label, Icon, color, bg, border }) => (
                    <span key={label} className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-medium', bg, border)}>
                      <Icon className={cn('w-3 h-3', color)} />
                      <span className={color}>{label}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="avatars">
            <SectionTitle>Avatars</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>Sizes</SubLabel>
                <div className="flex items-end gap-4">
                  {[{ cls: 'size-6', text: '6' }, { cls: 'size-8', text: '8' }, { cls: 'size-10', text: '10' }, { cls: 'size-12', text: '12' }, { cls: 'size-16', text: '16' }].map(({ cls, text }) => (
                    <div key={cls} className="flex flex-col items-center gap-2">
                      <Avatar className={cls}>
                        <AvatarFallback className={cn('text-10 font-semibold', cls)}>AK</AvatarFallback>
                      </Avatar>
                      <span className="text-10 text-muted-foreground">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Color Variants + Stacked Group</SubLabel>
                <div className="flex items-center gap-4 flex-wrap">
                  {[
                    { i: 'AK', bg: 'bg-violet-500' }, { i: 'BM', bg: 'bg-blue-500' },
                    { i: 'CR', bg: 'bg-emerald-500' }, { i: 'DS', bg: 'bg-amber-500' },
                    { i: 'EL', bg: 'bg-red-500' }, { i: 'FM', bg: 'bg-pink-500' },
                  ].map(({ i, bg }) => (
                    <Avatar key={i}>
                      <AvatarFallback className={cn(bg, 'text-white text-xs font-semibold')}>{i}</AvatarFallback>
                    </Avatar>
                  ))}
                  <div className="flex -space-x-2 ml-2">
                    {['AK', 'BM', 'CR', 'DS'].map((i, idx) => (
                      <Avatar key={i} className="size-8 ring-2 ring-background" style={{ zIndex: 4 - idx }}>
                        <AvatarFallback className="text-10 font-semibold bg-primary text-primary-foreground">{i}</AvatarFallback>
                      </Avatar>
                    ))}
                    <Avatar className="size-8 ring-2 ring-background">
                      <AvatarFallback className="text-10 font-semibold bg-muted text-muted-foreground">+4</AvatarFallback>
                    </Avatar>
                  </div>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="member-identity">
            <SectionTitle>Member Identity</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>AvatarPickerField（内置头像 + 自定义 URL）</SubLabel>
                <AvatarPickerShowcase />
              </div>
              <div>
                <SubLabel>TrustLevelBadge（信任等级 L0-L4）</SubLabel>
                <div className="flex items-center gap-2 flex-wrap">
                  <TrustLevelBadge level={null} />
                  {[0, 1, 2, 3, 4].map((level) => (
                    <TrustLevelBadge key={level} level={level} score={40 + level * 15} />
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>MentionTextarea / MentionRenderer（@ 提及）</SubLabel>
                <MentionShowcase />
              </div>
              <div>
                <SubLabel>ActivityHeatmap（活跃热力图）</SubLabel>
                <ActivityHeatmapShowcase />
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="cards">
            <SectionTitle>Cards</SectionTitle>
            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Basic Card</CardTitle>
                  <CardDescription className="text-xs">Header + content pattern.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Uses <code className="font-mono text-11 bg-muted px-1 rounded">bg-card</code> and <code className="font-mono text-11 bg-muted px-1 rounded">rounded-xl</code>.</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Card with Footer</CardTitle>
                  <CardDescription className="text-xs">Action footer row.</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Footer holds primary and secondary actions.</p>
                </CardContent>
                <CardFooter className="gap-2">
                  <Button size="sm">Confirm</Button>
                  <Button size="sm" variant="outline">Cancel</Button>
                </CardFooter>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">Total Tasks</p>
                      <p className="text-3xl font-semibold mt-1">248</p>
                      <p className="text-xs text-emerald-600 mt-1">+12% from last week</p>
                    </div>
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Elevated Card</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Progress value={72} />
                  <Progress value={45} className="[&>div]:bg-amber-500" />
                  <Progress value={18} className="[&>div]:bg-red-500" />
                </CardContent>
              </Card>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="forms">
            <SectionTitle>Forms</SectionTitle>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <SubLabel>Text Inputs</SubLabel>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-i1" className="text-xs">Default</Label>
                  <Input id="ds-i1" placeholder="Enter a value…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-i2" className="text-xs">With Icon</Label>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <Input id="ds-i2" className="pl-8" placeholder="Search…" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-i3" className="text-xs">Disabled</Label>
                  <Input id="ds-i3" disabled placeholder="Not editable" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ds-ta" className="text-xs">Textarea</Label>
                  <Textarea id="ds-ta" placeholder="Write a description…" rows={3} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Select</Label>
                  <Select>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Choose…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="a">Option Alpha</SelectItem>
                      <SelectItem value="b">Option Beta</SelectItem>
                      <SelectItem value="c">Option Gamma</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-6">
                <div className="space-y-3">
                  <SubLabel>Checkboxes</SubLabel>
                  {['Notifications enabled', 'Auto-save drafts', 'Disabled option'].map((lbl, i) => (
                    <div key={lbl} className="flex items-center gap-2">
                      <Checkbox id={`chk-${i}`} defaultChecked={i < 2} disabled={i === 2} />
                      <Label htmlFor={`chk-${i}`} className={cn('text-xs cursor-pointer', i === 2 && 'opacity-50')}>{lbl}</Label>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <SubLabel>Switches</SubLabel>
                  {[
                    { label: 'Email notifications', checked: true },
                    { label: 'Push notifications', checked: false },
                    { label: 'Disabled', checked: false, disabled: true },
                  ].map(({ label, checked, disabled }) => (
                    <div key={label} className="flex items-center justify-between">
                      <Label className={cn('text-xs', disabled && 'opacity-50')}>{label}</Label>
                      <Switch defaultChecked={checked} disabled={disabled} />
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <SubLabel>Radio Group</SubLabel>
                  <RadioGroup>
                    {['Alpha', 'Beta', 'Gamma'].map((v) => (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem name="ds-radio" value={v.toLowerCase()} id={`r-${v}`} defaultChecked={v === 'Beta'} />
                        <Label htmlFor={`r-${v}`} className="text-xs cursor-pointer">{v}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-3">
                  <SubLabel>Slider</SubLabel>
                  <Slider min={0} max={100} value={sliderVal} onChange={(e) => setSliderVal(Number(e.target.value))} />
                  <p className="text-xs text-muted-foreground">Value: {sliderVal}</p>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="alerts">
            <SectionTitle>Alerts</SectionTitle>
            <div className="max-w-2xl space-y-3">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Information</AlertTitle>
                <AlertDescription>This is an informational alert for neutral messages.</AlertDescription>
              </Alert>
              <Alert className="border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 [&>svg]:text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle className="text-emerald-800 dark:text-emerald-300">Success</AlertTitle>
                <AlertDescription className="text-emerald-700 dark:text-emerald-400">Operation completed. Changes have been saved.</AlertDescription>
              </Alert>
              <Alert className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 [&>svg]:text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="text-amber-800 dark:text-amber-300">Warning</AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-400">This action may have unintended consequences.</AlertDescription>
              </Alert>
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>Something went wrong. Check the console for details.</AlertDescription>
              </Alert>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="progress">
            <SectionTitle>Progress</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>Progress Bars</SubLabel>
                <div className="space-y-3">
                  {[
                    { v: 100, label: '100% — Complete', cls: '' },
                    { v: 72, label: '72% — Good', cls: '' },
                    { v: 45, label: '45% — Midway', cls: '[&>div]:bg-amber-500' },
                    { v: 18, label: '18% — Critical', cls: '[&>div]:bg-red-500' },
                    { v: 0, label: '0% — Not started', cls: '' },
                  ].map(({ v, label, cls }) => (
                    <div key={label} className="flex items-center gap-4">
                      <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
                      <Progress value={v} className={cn('flex-1', cls)} />
                      <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{v}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Circular Rings</SubLabel>
                <div className="flex gap-8">
                  {[25, 50, 75, 100].map((pct) => {
                    const r = 22
                    const circ = 2 * Math.PI * r
                    return (
                      <div key={pct} className="flex flex-col items-center gap-2">
                        <svg width="56" height="56" viewBox="0 0 56 56">
                          <circle cx="28" cy="28" r={r} strokeWidth="4" className="stroke-primary/20 fill-none" />
                          <circle cx="28" cy="28" r={r} strokeWidth="4" className="stroke-primary fill-none"
                            strokeDasharray={circ} strokeDashoffset={circ * (1 - pct / 100)}
                            strokeLinecap="round" transform="rotate(-90 28 28)" />
                          <text x="28" y="33" textAnchor="middle" className="fill-foreground" style={{ fontSize: 10, fontWeight: 500 }}>{pct}%</text>
                        </svg>
                        <span className="text-10 text-muted-foreground">{pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="tabs">
            <SectionTitle>Tabs — segmented (sliding button)</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Segmented slider (fixed-height panel below)</SubLabel>
                <div className="w-full max-w-md">
                  <Tabs defaultValue="overview" className="h-60">
                    <TabsList variant="segmented" className="w-full">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="min-h-0 p-4 overflow-auto rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Overview panel. Switch tabs to see the slider move.</p>
                    </TabsContent>
                    <TabsContent value="activity" className="min-h-0 p-4 overflow-auto rounded-lg border border-border bg-muted/20 space-y-2">
                      {['Alice committed 3 files', 'Bob opened PR #42', 'CI pipeline passed'].map((item) => (
                        <div key={item} className="flex items-center gap-3 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span className="text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="settings" className="min-h-0 p-4 overflow-auto rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Settings panel content.</p>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
              <div>
                <SubLabel>Line variant (underline indicator)</SubLabel>
                <div className="w-full max-w-md">
                  <Tabs defaultValue="overview">
                    <TabsList variant="line">
                      <TabsTrigger value="overview">Overview</TabsTrigger>
                      <TabsTrigger value="activity">Activity</TabsTrigger>
                      <TabsTrigger value="settings">Settings</TabsTrigger>
                    </TabsList>
                    <TabsContent value="overview" className="mt-4 p-4 rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Line variant with underline indicator.</p>
                    </TabsContent>
                    <TabsContent value="activity" className="mt-4 p-4 rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Activity panel content.</p>
                    </TabsContent>
                    <TabsContent value="settings" className="mt-4 p-4 rounded-lg border border-border bg-muted/20">
                      <p className="text-sm text-muted-foreground">Settings panel content.</p>
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="accordion">
            <SectionTitle>Accordion</SectionTitle>
            <Accordion>
              {[
                { title: 'What is a design token?', body: 'Design tokens are named entities that store visual design attributes. We use them in place of hard-coded values to ensure a flexible and unified visual design language across all platforms.' },
                { title: 'How are tokens organized?', body: 'Tokens are organized by category: colors, typography, spacing, border radius, and shadows — each mapping to a CSS custom property and a Tailwind utility class.' },
                { title: 'Can I extend the system?', body: 'Yes. Add new tokens to theme.css and map them in the @theme inline block. New Tailwind utilities will be generated automatically.' },
              ].map(({ title, body }) => (
                <AccordionItem key={title}>
                  <AccordionTrigger className="text-sm w-full">
                    {title}
                    <ChevronDown className="w-4 h-4 shrink-0 transition-transform" />
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground pb-4">{body}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="table">
            <SectionTitle>Table — headless task list</SectionTitle>
            <div className="rounded-14 border border-border bg-background overflow-hidden">
              <div className="divide-y divide-border/60">
                {[
                  { id: 'APM-1', title: 'AI chat interface', status: 'done' as TaskStatus, priority: 'high' as Priority, assignee: 'AK', due: 'Mar 8' },
                  { id: 'APM-2', title: 'Kanban board view', status: 'in_progress' as TaskStatus, priority: 'high' as Priority, assignee: 'ML', due: 'Mar 20' },
                  { id: 'APM-4', title: 'AI velocity scoring', status: 'in_review' as TaskStatus, priority: 'urgent' as Priority, assignee: 'BK', due: 'Mar 25' },
                  { id: 'ACR-1', title: 'Stripe webhook handler', status: 'todo' as TaskStatus, priority: 'urgent' as Priority, assignee: '', due: 'Apr 5' },
                  { id: 'APM-10', title: 'Concurrent state updates', status: 'canceled' as TaskStatus, priority: 'medium' as Priority, assignee: '', due: 'Apr 22' },
                ].map((row) => (
                  <div key={row.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/40 transition-colors">
                    <StatusChip status={row.status} />
                    <PriorityIcon priority={row.priority} />
                    <span className="w-16 shrink-0 font-mono text-11 text-muted-foreground">{row.id}</span>
                    <span className="flex-1 truncate text-sm font-medium text-foreground">{row.title}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{row.due}</span>
                    <AssigneeAvatar initials={row.assignee || undefined} />
                  </div>
                ))}
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="tooltip">
            <SectionTitle>Tooltip &amp; Dropdown Menu</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Tooltips (hover)</SubLabel>
                <TooltipProvider>
                  <div className="flex gap-4 flex-wrap">
                    {[
                      { side: 'top' as const, label: 'Tooltip Top' },
                      { side: 'bottom' as const, label: 'Tooltip Bottom' },
                      { side: 'left' as const, label: 'Tooltip Left' },
                      { side: 'right' as const, label: 'Tooltip Right' },
                    ].map(({ side, label }) => (
                      <Tooltip key={side}>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="sm">{label}</Button>
                        </TooltipTrigger>
                        <TooltipContent side={side}>
                          <p className="text-xs">This is a {side} tooltip</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon"><Settings /></Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="text-xs">Settings <kbd className="ml-1 px-1 rounded bg-muted text-9">⌘,</kbd></p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
              <div>
                <SubLabel>Dropdown Menu (static surface)</SubLabel>
                <div className="flex gap-8 items-start flex-wrap">
                  <div className="space-y-2">
                    <Button variant="outline"><MoreHorizontal className="w-4 h-4" /> Actions</Button>
                    <DropdownMenuContent>
                      <DropdownMenuItem><Edit2 className="w-4 h-4" /> Edit</DropdownMenuItem>
                      <DropdownMenuItem><Star className="w-4 h-4" /> Favorite</DropdownMenuItem>
                      <DropdownMenuItem><ExternalLink className="w-4 h-4" /> Open in new tab</DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </div>
                  <div className="space-y-2">
                    <Button variant="ghost" size="icon"><MoreHorizontal className="w-4 h-4" /></Button>
                    <DropdownMenuContent>
                      <DropdownMenuItem><Share2 className="w-4 h-4" /> Share</DropdownMenuItem>
                      <DropdownMenuItem><Bookmark className="w-4 h-4" /> Bookmark</DropdownMenuItem>
                      <DropdownMenuItem><Download className="w-4 h-4" /> Export</DropdownMenuItem>
                    </DropdownMenuContent>
                  </div>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="overlays">
            <SectionTitle>Overlays</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Dialog — functional (base-ui)</SubLabel>
                <div className="flex gap-3">
                  <Button onClick={() => setDialogOpen(true)}><Plus /> Open Dialog</Button>
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Project</DialogTitle>
                        <DialogDescription>Fill in the details to create a new project.</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-2">
                        <Label className="text-xs">Project name</Label>
                        <Input placeholder="AgentPM Platform" />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                        <Button onClick={() => setDialogOpen(false)}>Create</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              <div>
                <SubLabel>Alert Dialog — confirmation</SubLabel>
                <div className="flex gap-3">
                  <Button variant="destructive" onClick={() => setAlertOpen(true)}><Trash2 /> Delete Item</Button>
                  <AlertDialog open={alertOpen} onOpenChange={setAlertOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel onClick={() => setAlertOpen(false)}>Cancel</AlertDialogCancel>
                        <AlertDialogAction variant="destructive" onClick={() => setAlertOpen(false)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <div>
                <SubLabel>Sheet — right side panel (static)</SubLabel>
                <Sheet open>
                  <SheetContent className="static inset-y-auto right-auto z-0 w-full max-w-sm rounded-l-lg">
                    <SheetHeader>
                      <SheetTitle>Details</SheetTitle>
                      <SheetDescription>Right side panel content.</SheetDescription>
                    </SheetHeader>
                    <div className="py-4 text-sm text-muted-foreground">Sheet body content goes here.</div>
                    <SheetFooter>
                      <Button size="sm">Save</Button>
                    </SheetFooter>
                  </SheetContent>
                </Sheet>
              </div>
              <div>
                <SubLabel>Drawer — bottom sheet (static)</SubLabel>
                <Drawer open>
                  <DrawerContent className="static inset-x-auto bottom-auto z-0 mx-auto w-full max-w-md">
                    <DrawerHeader>
                      <DrawerTitle>Actions</DrawerTitle>
                      <DrawerDescription>Bottom drawer content.</DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                      <Button size="sm">Confirm</Button>
                      <Button size="sm" variant="outline">Cancel</Button>
                    </DrawerFooter>
                  </DrawerContent>
                </Drawer>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="popover">
            <SectionTitle>Popover &amp; Combobox</SectionTitle>
            <div className="space-y-6">
              <div>
                <SubLabel>Popover — functional (base-ui)</SubLabel>
                <Popover>
                  <PopoverTrigger>
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-xs hover:bg-muted transition-colors"
                    >
                      <Bell className="w-4 h-4" /> Notifications
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <PopoverHeader>
                      <PopoverTitle>Notifications</PopoverTitle>
                      <PopoverDescription>Latest activity in your workspace.</PopoverDescription>
                    </PopoverHeader>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <p>Alice commented on APM-1</p>
                      <p>CI pipeline passed</p>
                      <p>Bob opened PR #42</p>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
              <div>
                <SubLabel>Combobox — searchable select (functional)</SubLabel>
                <div className="w-72">
                  <Combobox value={ownerValue} onValueChange={setOwnerValue}>
                    <ComboboxInput className="w-full" placeholder="Select owner..." />
                    <ComboboxContent>
                      <ComboboxList>
                        <ComboboxItem value="alex">Alex Chen</ComboboxItem>
                        <ComboboxItem value="sam">Sam Liu</ComboboxItem>
                        <ComboboxItem value="maria">Maria Lopez</ComboboxItem>
                        <ComboboxItem value="kim">Kim Park</ComboboxItem>
                      </ComboboxList>
                    </ComboboxContent>
                  </Combobox>
                </div>
              </div>
              <div>
                <SubLabel>Hover Card (static)</SubLabel>
                <HoverCard>
                  <HoverCardTrigger href="#">@alex</HoverCardTrigger>
                  <HoverCardContent>
                    <p className="text-sm font-medium">Alex Chen</p>
                    <p className="text-xs text-muted-foreground mt-1">Senior Frontend Engineer · @alex</p>
                  </HoverCardContent>
                </HoverCard>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="breadcrumb">
            <SectionTitle>Breadcrumb</SectionTitle>
            <div className="rounded-lg border border-border p-4">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem><BreadcrumbLink href="#">Documents</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbLink href="#">AgentPM</BreadcrumbLink></BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbPage>API Specification</BreadcrumbPage></BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="button-group">
            <SectionTitle>Button Group</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>Segmented actions</SubLabel>
                <ButtonGroup>
                  <Button variant="outline" size="sm">Bold</Button>
                  <Button variant="outline" size="sm">Italic</Button>
                  <Button variant="outline" size="sm">Underline</Button>
                </ButtonGroup>
              </div>
              <div>
                <SubLabel>With text block</SubLabel>
                <ButtonGroup>
                  <ButtonGroupText><FileText className="w-3.5 h-3.5" /> 12 items selected</ButtonGroupText>
                  <Button size="sm" variant="outline"><Plus /> Add</Button>
                  <Button size="sm" variant="outline"><Trash2 /> Delete</Button>
                </ButtonGroup>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="toggle">
            <SectionTitle>Toggle &amp; Segmented Control</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>Toggle (functional)</SubLabel>
                <div className="flex gap-3">
                  <Toggle>Bold</Toggle>
                  <Toggle pressed>Italic</Toggle>
                  <Toggle disabled>Strikethrough</Toggle>
                </div>
              </div>
              <div>
                <SubLabel>Toggle Group</SubLabel>
                <ToggleGroup>
                  <ToggleGroupItem data-state="on">Bold</ToggleGroupItem>
                  <ToggleGroupItem>Italic</ToggleGroupItem>
                  <ToggleGroupItem>Underline</ToggleGroupItem>
                </ToggleGroup>
              </div>
              <div>
                <SubLabel>Segmented Control (functional)</SubLabel>
                <SegmentedControl
                  value={segValue}
                  options={[
                    { value: 'list', label: 'List', icon: <List className="w-3.5 h-3.5" /> },
                    { value: 'grid', label: 'Grid', icon: <LayoutGrid className="w-3.5 h-3.5" /> },
                  ]}
                  onChange={setSegValue}
                />
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="kbd">
            <SectionTitle>Kbd</SectionTitle>
            <div className="flex flex-wrap items-center gap-6">
              <KbdGroup>
                <Kbd>⌘</Kbd>
                <Kbd>K</Kbd>
              </KbdGroup>
              <KbdGroup>
                <Kbd>Ctrl</Kbd>
                <Kbd>Shift</Kbd>
                <Kbd>P</Kbd>
              </KbdGroup>
              <Kbd>Esc</Kbd>
              <Kbd>↵</Kbd>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="spinner">
            <SectionTitle>Spinner</SectionTitle>
            <div className="flex items-end gap-6">
              {(['sm', 'md', 'lg', 'xl'] as const).map((s) => (
                <div key={s} className="flex flex-col items-center gap-2">
                  <Spinner size={s} />
                  <span className="text-10 text-muted-foreground">{s}</span>
                </div>
              ))}
              <div className="flex flex-col items-center gap-2">
                <Spinner size="lg" className="text-primary" />
                <span className="text-10 text-muted-foreground">primary</span>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="status-pill">
            <SectionTitle>Status Pill</SectionTitle>
            <div className="flex flex-wrap gap-2">
              <StatusPill tone="default">Default</StatusPill>
              <StatusPill tone="success">On Track</StatusPill>
              <StatusPill tone="warning">At Risk</StatusPill>
              <StatusPill tone="danger">Off Track</StatusPill>
              <StatusPill tone="info">In Review</StatusPill>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="pagination">
            <SectionTitle>Pagination</SectionTitle>
            <Pagination>
              <PaginationContent>
                <PaginationItem><PaginationPrevious href="#" /></PaginationItem>
                <PaginationItem><PaginationLink href="#">1</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#" isActive>2</PaginationLink></PaginationItem>
                <PaginationItem><PaginationLink href="#">3</PaginationLink></PaginationItem>
                <PaginationItem><PaginationEllipsis /></PaginationItem>
                <PaginationItem><PaginationNext href="#" /></PaginationItem>
              </PaginationContent>
            </Pagination>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="calendar">
            <SectionTitle>Calendar</SectionTitle>
            <div className="rounded-lg border border-border w-fit">
              <Calendar
                mode="single"
                numberOfMonths={2}
                month={new Date(2026, 4, 1)}
                selected={new Date(2026, 4, 15)}
                onSelect={() => {}}
                className="[--cell-size:--spacing(9)]"
              />
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="input-otp">
            <SectionTitle>Input OTP</SectionTitle>
            <InputOTP maxLength={6}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={3} />
                <InputOTPSlot index={4} />
                <InputOTPSlot index={5} />
              </InputOTPGroup>
            </InputOTP>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="input-group">
            <SectionTitle>Input Group</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>Icon + input + action</SubLabel>
                <InputGroup className="w-80">
                  <InputGroupAddon align="inline-start"><Search className="w-4 h-4" /></InputGroupAddon>
                  <InputGroupInput placeholder="Search tasks..." />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton size="icon-xs" variant="ghost"><Settings /></InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
              <div>
                <SubLabel>Input + button</SubLabel>
                <InputGroup className="w-80">
                  <InputGroupInput placeholder="Enter email address..." />
                  <InputGroupAddon align="inline-end">
                    <InputGroupButton size="sm">Subscribe</InputGroupButton>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="native-select">
            <SectionTitle>Native Select</SectionTitle>
            <NativeSelect defaultValue="active" className="w-48">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
            </NativeSelect>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="scroll-area">
            <SectionTitle>Scroll Area</SectionTitle>
            <ScrollArea className="h-40 w-full max-w-sm rounded-lg border border-border">
              <div className="p-4 space-y-3">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    <span className="text-muted-foreground">Activity item {i + 1}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="aspect-ratio">
            <SectionTitle>Aspect Ratio</SectionTitle>
            <div className="flex gap-6">
              <AspectRatio ratio={16 / 9} className="w-64 overflow-hidden rounded-lg border border-border" style={{ aspectRatio: '16 / 9' }}>
                <div className="flex h-full w-full items-center justify-center bg-muted/50 text-xs text-muted-foreground">16:9</div>
              </AspectRatio>
              <AspectRatio ratio={4 / 3} className="w-48 overflow-hidden rounded-lg border border-border" style={{ aspectRatio: '4 / 3' }}>
                <div className="flex h-full w-full items-center justify-center bg-muted/50 text-xs text-muted-foreground">4:3</div>
              </AspectRatio>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="menubar">
            <SectionTitle>Menubar</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>Menu bar</SubLabel>
                <Menubar>
                  <MenubarTrigger>File</MenubarTrigger>
                  <MenubarTrigger>Edit</MenubarTrigger>
                  <MenubarTrigger>View</MenubarTrigger>
                </Menubar>
              </div>
              <div>
                <SubLabel>Menu surface (static)</SubLabel>
                <div className="w-56">
                  <MenubarContent>
                    <MenubarLabel>Actions</MenubarLabel>
                    <MenubarItem>New File</MenubarItem>
                    <MenubarItem>Open…</MenubarItem>
                    <MenubarSeparator />
                    <MenubarItem>Save All</MenubarItem>
                  </MenubarContent>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="collapsible">
            <SectionTitle>Collapsible</SectionTitle>
            <Collapsible className="w-full max-w-md">
              <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors [&>svg]:transition-transform data-[panel-open=true]:[&>svg]:rotate-180">
                <ChevronDown className="w-4 h-4" />
                Show details
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-2 rounded-md border border-border bg-muted/20 p-4 text-sm text-muted-foreground">
                This is collapsible content that reveals additional information on demand.
              </CollapsibleContent>
            </Collapsible>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="skeleton">
            <SectionTitle>Skeleton</SectionTitle>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3">
                <SubLabel>List Loading</SubLabel>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="size-9 rounded-full" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2.5 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <SubLabel>Card Loading</SubLabel>
                <div className="rounded-xl border border-border p-4 space-y-3">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-24 w-full rounded-lg" />
                  <div className="flex gap-2 pt-1">
                    <Skeleton className="h-8 w-20 rounded-md" />
                    <Skeleton className="h-8 w-20 rounded-md" />
                  </div>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="empty">
            <SectionTitle>Empty States</SectionTitle>
            <div className="grid grid-cols-3 gap-4">
              {[
                { Icon: CheckSquare, title: 'No tasks yet', desc: "You're all caught up! Create a new task to get started.", action: 'New Task' },
                { Icon: FileText, title: 'No documents', desc: 'Start building your knowledge base with a new document.', action: 'New Document' },
                { Icon: Search, title: 'No results found', desc: 'Try adjusting your search query or clearing the filters.', action: null },
              ].map(({ Icon, title, desc, action }) => (
                <div key={title} className="flex flex-col items-center justify-center text-center p-6 rounded-xl border border-dashed border-border bg-muted/10 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                    <Icon className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-1 max-w-45">{desc}</p>
                  </div>
                  {action && <Button size="sm"><Plus className="w-3 h-3" /> {action}</Button>}
                </div>
              ))}
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="stat-tiles">
            <SectionTitle>Stat Tiles</SectionTitle>
            <div className="space-y-4">
              <div>
                <SubLabel>KPI Row</SubLabel>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: 'Total Tasks', value: '248', delta: '+12%', color: 'text-emerald-600', Icon: CheckSquare, accent: 'bg-emerald-500' },
                    { label: 'Open Bugs', value: '13', delta: '-3', color: 'text-red-600', Icon: AlertCircle, accent: 'bg-red-500' },
                    { label: 'Milestones', value: '4/6', delta: '+1', color: 'text-blue-600', Icon: Star, accent: 'bg-blue-500' },
                    { label: 'AI Executions', value: '1.2k', delta: '+8%', color: 'text-violet-600', Icon: Sparkles, accent: 'bg-violet-500' },
                  ].map(({ label, value, delta, color, Icon, accent }) => (
                    <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">{label}</span>
                        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center', accent + '/10')}>
                          <Icon className={cn('w-3.5 h-3.5', accent.replace('bg-', 'text-'))} />
                        </div>
                      </div>
                      <div>
                        <p className="text-2xl font-semibold">{value}</p>
                        <p className={cn('text-xs mt-0.5', color)}>{delta} from last week</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <SubLabel>Horizontal Stats Strip</SubLabel>
                <div className="flex rounded-lg border border-border bg-muted/20 overflow-hidden divide-x divide-border">
                  {[
                    { label: 'Done', value: 44, color: 'text-emerald-600' },
                    { label: 'In Progress', value: 28, color: 'text-blue-600' },
                    { label: 'In Review', value: 16, color: 'text-amber-600' },
                    { label: 'Open', value: 12, color: 'text-slate-500' },
                    { label: 'Canceled', value: 8, color: 'text-muted-foreground' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex-1 px-4 py-3 flex flex-col items-center gap-0.5">
                      <span className={cn('text-lg font-semibold', color)}>{value}</span>
                      <span className="text-10 text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="charts">
            <SectionTitle>Charts</SectionTitle>
            <div className="grid grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium">Bar Chart</CardTitle>
                  <CardDescription className="text-xs">Monthly task completions</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
                      <Bar dataKey="value" fill="var(--primary)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium">Area Chart</CardTitle>
                  <CardDescription className="text-xs">Bug count over time</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <defs>
                        <linearGradient id="bugGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--destructive)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="var(--destructive)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
                      <Area type="monotone" dataKey="bugs" stroke="var(--destructive)" fill="url(#bugGrad)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium">Line Chart</CardTitle>
                  <CardDescription className="text-xs">Multi-series trend</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={CHART_DATA} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                      <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <RechartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
                      <Legend wrapperStyle={{ fontSize: 10 }} />
                      <Line type="monotone" dataKey="value" stroke="hsl(var(--chart-1, 25 80% 54%))" strokeWidth={2} dot={{ r: 3 }} name="Completed" />
                      <Line type="monotone" dataKey="bugs" stroke="hsl(var(--chart-2, 190 65% 48%))" strokeWidth={2} dot={{ r: 3 }} name="Bugs" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="text-sm font-medium">Pie / Donut Chart</CardTitle>
                  <CardDescription className="text-xs">Task status distribution</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                          {PIE_DATA.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                        </Pie>
                        <RechartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-2">
                      {PIE_DATA.map((e) => (
                        <div key={e.name} className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: e.fill }} />
                          <span className="text-xs text-muted-foreground">{e.name}</span>
                          <span className="text-xs font-medium ml-auto pl-3">{e.value}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="page-header">
            <SectionTitle>Page Header</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Standard Header — 单行高度 · 裸图标与标题同高 · 收藏星标</SubLabel>
              <div className="rounded-xl border border-border overflow-hidden">
                <PageHeader
                  title="All Tasks"
                  icon={CheckSquare}
                  iconColor="text-accent-blue"
                  metrics={[{ id: 'tasks', label: 'Tasks', value: 248 }]}
                  actions={<HeaderActionButton icon={Plus} label="New Task" />}
                />
              </div>

              <SubLabel>Action Button Group — 正圆形仅图标，hover 展开为胶囊，兄弟按钮自然位移</SubLabel>
              <div className="rounded-xl border border-border overflow-hidden">
                <PageHeader
                  title="Project Roles"
                  icon={Briefcase}
                  metrics={[{ id: 'roles', label: 'Roles', value: 6 }]}
                  actions={
                    <>
                      <HeaderActionButton icon={RefreshCw} label="Sync Templates" variant="outline" />
                      <HeaderActionButton icon={Plus} label="New Role" />
                    </>
                  }
                />
              </div>

              <SubLabel>Counter Tags — 收藏星标后的计数胶囊：文本 + 数字，integration 风格 + 语义色调</SubLabel>
              <div className="rounded-xl border border-border overflow-hidden">
                <PageHeader
                  title="All Bugs"
                  icon={Bug}
                  iconColor="text-accent-red"
                  metrics={[
                    { id: 'total', label: 'Total', value: 42 },
                    { id: 'open', label: 'Open', value: 13, tone: 'warning' },
                    { id: 'critical', label: 'Critical', value: 4, tone: 'danger' },
                    { id: 'resolved', label: 'Resolved', value: 25, tone: 'success' },
                  ]}
                  actions={<HeaderActionButton icon={Plus} label="Report Bug" variant="danger" />}
                />
              </div>

            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="toolbar">
            <SectionTitle>Toolbar Row</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Standard — 视图胶囊（记忆筛选/样式/排序快照）+ 居中样式切换（≤3 种）+ 筛选/显示/下载按钮组，无上下分界线</SubLabel>
              <ToolbarRowDemo
                demoKey="standard"
                styleOptions={[
                  { value: 'list', label: 'List', icon: List },
                  { value: 'board', label: 'Board', icon: Kanban },
                ]}
              />

              <SubLabel>Three Styles — 3 种样式仍居中（滑动胶囊，参考 delivery 视图设计）</SubLabel>
              <ToolbarRowDemo
                demoKey="three"
                styleOptions={[
                  { value: 'list', label: 'List', icon: List },
                  { value: 'board', label: 'Board', icon: Kanban },
                  { value: 'gantt', label: 'Gantt', icon: CalendarRange },
                ]}
              />

              <SubLabel>Dropdown Form — 样式 &gt;3 种时自动收进右侧常驻下拉按钮（viewStyle.layout 可强制 centered/dropdown）</SubLabel>
              <ToolbarRowDemo
                demoKey="dropdown"
                styleOptions={[
                  { value: 'list', label: 'List', icon: List },
                  { value: 'board', label: 'Board', icon: Kanban },
                  { value: 'gantt', label: 'Gantt', icon: CalendarRange },
                  { value: 'grid', label: 'Grid', icon: LayoutGrid },
                ]}
              />
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="sub-page-toolbar">
            <SectionTitle>Sub Page Toolbar</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Standard — 返回按钮 + 面包屑 + 居中子页签（rect 滑块）+ 自定义按钮组 + 侧栏开关</SubLabel>
              <SubPageToolbarDemo withSidebar />

              <SubLabel>With Pager — 翻页器 + 选项高亮色调（tone 按页面传入，激活滑块着色）</SubLabel>
              <SubPageToolbarDemo withPager withSidebar />
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="task-atoms">
            <SectionTitle>Task Atoms</SectionTitle>
            <div className="space-y-6">

              <div>
                <SubLabel>StatusChip — 22 × 22 icon chip</SubLabel>
                <div className="flex flex-wrap gap-4">
                  {(Object.keys(STATUS_CFG) as TaskStatus[]).map((s) => (
                    <div key={s} className="flex items-center gap-2">
                      <StatusChip status={s} />
                      <span className="text-xs text-muted-foreground">{STATUS_CFG[s].label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SubLabel>PriorityIcon</SubLabel>
                <div className="flex flex-wrap gap-4">
                  {(Object.keys(PRIORITY_CFG) as Priority[]).map((p) => (
                    <div key={p} className="flex items-center gap-2">
                      <PriorityIcon priority={p} />
                      <span className="text-xs text-muted-foreground">{PRIORITY_CFG[p].label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <SubLabel>SeverityBar (Bugs)</SubLabel>
                <div className="flex flex-wrap gap-6">
                  {(Object.keys(SEVERITY_CFG) as Severity[]).map((s) => (
                    <SeverityBar key={s} severity={s} />
                  ))}
                </div>
              </div>

              <div>
                <SubLabel>MilestonePill</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {['Phase 1 · Core UI', 'Phase 2 · Intelligence', 'Phase 3 · Quality', 'v1.0 Release'].map((m, i) => (
                    <MilestonePill key={m} name={m} idx={i} />
                  ))}
                </div>
              </div>

              <div>
                <SubLabel>LabelChip (color-coded by hex)</SubLabel>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'Frontend', color: '#3B82F6' },
                    { name: 'Backend', color: '#10B981' },
                    { name: 'Design', color: '#8B5CF6' },
                    { name: 'Bug', color: '#EF4444' },
                    { name: 'CI/CD', color: '#F59E0B' },
                  ].map(({ name, color }) => <LabelChip key={name} name={name} color={color} />)}
                </div>
              </div>

              <div>
                <SubLabel>SubtaskBadge — progress ring + count capsule</SubLabel>
                <div className="flex items-center gap-4">
                  <SubtaskBadge done={3} total={3} />
                  <SubtaskBadge done={2} total={3} />
                  <SubtaskBadge done={1} total={4} />
                  <SubtaskBadge done={0} total={2} />
                </div>
              </div>

              <div>
                <SubLabel>AssigneeAvatar — 22 × 22 mini avatar</SubLabel>
                <div className="flex items-center gap-3">
                  <AssigneeAvatar initials="AK" color="#6366F1" />
                  <AssigneeAvatar initials="ML" color="#F59E0B" />
                  <AssigneeAvatar initials="BK" color="#EF4444" />
                  <AssigneeAvatar initials="CR" color="#10B981" />
                  <AssigneeAvatar />
                </div>
              </div>

              <div>
                <SubLabel>Acceptance Pills</SubLabel>
                <div className="flex flex-wrap gap-2">
                  <AcceptPill stage="unit" passed={true} />
                  <AcceptPill stage="internal" passed={true} />
                  <AcceptPill stage="dev" passed={false} />
                  <AcceptPill stage="pm" passed={null} />
                  <AcceptPill stage="client" passed={null} />
                </div>
              </div>

              <div>
                <SubLabel>Agent Status Pills</SubLabel>
                <div className="flex flex-wrap gap-2">
                  <AgentPill name="Claude Code" status="active" />
                  <AgentPill name="Cursor" status="contributed" />
                  <AgentPill name="Copilot" status="idle" />
                  <AgentPill name="Codex" status="not_used" />
                  <AgentPill name="Windsurf" status="contributed" />
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="task-rows">
            <SectionTitle>Task Rows</SectionTitle>
            <div className="space-y-4">
              <SubLabel>GroupRow — collapsible section header</SubLabel>
              <div className="rounded-lg border border-border overflow-hidden">
                <div
                  className="flex items-center gap-3 px-4 py-2 bg-muted/25 hover:bg-muted/40 transition-colors cursor-pointer"
                  onClick={() => setGroupCollapsed(!groupCollapsed)}
                >
                  <button className="w-4 h-4 flex items-center justify-center text-muted-foreground shrink-0">
                    {groupCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </button>
                  <div className={cn('w-5.5 h-5.5 rounded-md flex items-center justify-center shrink-0', STATUS_CFG.in_progress.bg)}>
                    <Loader className="w-3.5 h-3.5 text-blue-500 animate-spin" style={{ animationDuration: '2s' }} />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">In Progress</span>
                  <span className="text-11 text-muted-foreground/50 font-mono">3</span>
                  <div className="flex items-center gap-2 flex-1 max-w-45">
                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                      <div className="h-full rounded-full bg-blue-500 transition-all" style={{ width: '40%' }} />
                    </div>
                    <span className="text-10 text-muted-foreground shrink-0">1/3</span>
                  </div>
                  <button className="ml-auto opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent transition-colors">
                    <Plus className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>

                {!groupCollapsed && (
                  <>
                    {[
                      { id: 'APM-1', title: 'AI chat interface', status: 'in_progress' as TaskStatus, priority: 'high' as Priority, subtasks: { done: 2, total: 3 }, milestone: 'Phase 1 · Core UI', labels: [{ name: 'Frontend', color: '#3B82F6' }], assignee: 'AK', color: '#6366F1', due: 'Mar 12' },
                      { id: 'APM-2', title: 'Kanban board view', status: 'in_progress' as TaskStatus, priority: 'high' as Priority, subtasks: { done: 1, total: 3 }, milestone: 'Phase 1 · Core UI', labels: [{ name: 'Frontend', color: '#3B82F6' }, { name: 'Design', color: '#8B5CF6' }], assignee: 'ML', color: '#F59E0B', due: 'Mar 20' },
                      { id: 'APM-4', title: 'AI velocity scoring', status: 'in_progress' as TaskStatus, priority: 'urgent' as Priority, subtasks: { done: 0, total: 2 }, milestone: 'Phase 2 · Intelligence', labels: [{ name: 'Backend', color: '#10B981' }], assignee: 'BK', color: '#EF4444', due: 'Mar 25' },
                    ].map((task, taskIdx) => (
                      <div key={task.id}>
                        <div className="flex items-center gap-2 px-4 py-1.5 hover:bg-accent/20 transition-colors cursor-pointer">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-4 h-4 shrink-0" />
                            <StatusChip status={task.status} />
                            <span className="w-15 shrink-0 text-11 font-mono text-muted-foreground/50">{task.id}</span>
                            <PriorityIcon priority={task.priority} />
                            <p className="flex-1 text-xs text-foreground truncate min-w-0">{task.title}</p>
                            <SubtaskBadge done={task.subtasks.done} total={task.subtasks.total} />
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="w-20 text-11 text-muted-foreground truncate">AgentPM</span>
                            <div className="w-35 flex gap-1 overflow-hidden">
                              {task.labels.map((l) => <LabelChip key={l.name} name={l.name} color={l.color} />)}
                            </div>
                            <MilestonePill name={task.milestone} idx={taskIdx} />
                            <div className="w-18 flex items-center gap-1 text-11 text-muted-foreground">
                              <Clock className="w-3 h-3 shrink-0" />{task.due}
                            </div>
                            <AssigneeAvatar initials={task.assignee} color={task.color} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-1 hover:bg-accent/20 transition-colors cursor-default bg-muted/5">
                          <div className="flex items-center gap-2 flex-1 min-w-0 pl-5">
                            <span className="w-4 h-4 shrink-0" />
                            <StatusChip status="done" />
                            <span className="w-15 shrink-0 text-11 font-mono text-muted-foreground/40">{task.id}.1</span>
                            <PriorityIcon priority="medium" />
                            <p className="flex-1 text-xs text-muted-foreground truncate min-w-0">Sub-task: initial implementation</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="w-20 text-11 text-muted-foreground truncate">AgentPM</span>
                            <div className="w-35" />
                            <MilestonePill name={task.milestone} idx={taskIdx} />
                            <div className="w-18" />
                            <AssigneeAvatar initials={task.assignee} color={task.color} />
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 px-4 py-1.5 border-t border-border/50 text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/10 cursor-pointer transition-colors">
                      <span className="w-4 shrink-0" />
                      <Plus className="w-3 h-3" />
                      <span className="text-xs">Add task</span>
                    </div>
                  </>
                )}
              </div>

              <SubLabel>Bug List Row (with severity bar)</SubLabel>
              <div className="rounded-lg border border-border overflow-hidden">
                {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => (
                  <div key={sev} className="flex items-center gap-2 px-4 py-1.5 hover:bg-accent/20 border-b last:border-0 border-border/50 transition-colors cursor-pointer">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="w-4 shrink-0" />
                      <div className={cn('w-1 h-5 rounded-full shrink-0', SEVERITY_CFG[sev].bar)} />
                      <StatusChip status={sev === 'critical' ? 'in_progress' : sev === 'high' ? 'in_review' : sev === 'medium' ? 'todo' : 'done'} />
                      <span className="w-15 shrink-0 text-11 font-mono text-muted-foreground/50">BUG-{String((Object.keys(SEVERITY_CFG).indexOf(sev) + 1)).padStart(3, '0')}</span>
                      <p className="flex-1 text-xs text-foreground truncate">{
                        sev === 'critical' ? 'Stripe webhook fires duplicate charges on retry' :
                        sev === 'high' ? 'TasksPage render time exceeds 500 ms threshold' :
                        sev === 'medium' ? 'Race condition in concurrent status updates' :
                        'Tooltip positioning off-screen on small viewports'
                      }</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                      <SeverityBar severity={sev} />
                      <AssigneeAvatar initials={sev === 'critical' ? 'BK' : sev === 'high' ? 'AK' : undefined} color={sev === 'critical' ? '#EF4444' : '#6366F1'} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="create-card">
            <SectionTitle>Create / CTA Patterns</SectionTitle>
            <div className="space-y-4">
              <SubLabel>New item card (dashed border CTA)</SubLabel>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { Icon: CheckSquare, label: 'New Task', sub: 'Add to current sprint' },
                  { Icon: FileText, label: 'New Document', sub: 'Markdown or rich text' },
                  { Icon: FolderKanban, label: 'New Project', sub: 'Start from scratch' },
                ].map(({ Icon, label, sub }) => (
                  <button
                    key={label}
                    className="group flex flex-col items-center justify-center gap-2 p-6 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition-all text-center"
                  >
                    <div className="w-10 h-10 rounded-lg bg-muted group-hover:bg-primary/10 flex items-center justify-center transition-colors">
                      <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">{label}</p>
                      <p className="text-10 text-muted-foreground/60 mt-0.5">{sub}</p>
                    </div>
                  </button>
                ))}
              </div>

              <SubLabel>Inline add row</SubLabel>
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="flex items-center gap-2 px-4 py-2.5 text-muted-foreground/50 hover:text-muted-foreground hover:bg-accent/10 cursor-pointer transition-colors border-t border-border/50">
                  <Plus className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-xs">Add task to In Progress…</span>
                </div>
              </div>

              <SubLabel>Modal / drawer trigger</SubLabel>
              <div className="flex gap-3">
                <Button><Plus /> New Task</Button>
                <Button variant="outline"><Plus /> New Document</Button>
                <Button variant="secondary"><Plus /> New Bug</Button>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="delivery-row">
            <SectionTitle>Delivery Row</SectionTitle>
            <SubLabel>Tree-structured delivery table — sticky first column, icon-only accept cells, progress bars, agent status icons</SubLabel>
            {(() => {
              type DsAcceptStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'waived' | 'blocked'
              type DsAgentKey = 'claudeCode' | 'cursor' | 'copilot'
              type DsAgentStatus = 'active' | 'idle' | 'contributed' | 'not_used'
              type DsLevel = 'project' | 'milestone' | 'feature'

              const DS_STATUS: Record<DsAcceptStatus, { icon: React.ElementType; cls: string; label: string }> = {
                pending: { icon: Circle, cls: 'text-muted-foreground/30', label: '待验收' },
                in_progress: { icon: Loader, cls: 'text-blue-500', label: '验收中' },
                passed: { icon: Check, cls: 'text-emerald-500', label: '通过' },
                failed: { icon: X, cls: 'text-red-500', label: '未通过' },
                waived: { icon: Minus, cls: 'text-amber-500', label: '豁免' },
                blocked: { icon: AlertTriangle, cls: 'text-orange-500', label: '阻塞' },
              }
              const DS_AGENT_STATUS: Record<DsAgentStatus, { icon: React.ElementType; cls: string; label: string }> = {
                active: { icon: Activity, cls: 'text-emerald-500', label: '活跃' },
                idle: { icon: Minus, cls: 'text-muted-foreground/40', label: '待机' },
                contributed: { icon: Check, cls: 'text-blue-500', label: '已贡献' },
                not_used: { icon: Circle, cls: 'text-muted-foreground/20', label: '未使用' },
              }
              const DS_AGENT: Record<DsAgentKey, { color: string; shortLabel: string; icon: React.ElementType }> = {
                claudeCode: { color: 'text-violet-500', shortLabel: 'Claude', icon: Sparkles },
                cursor: { color: 'text-blue-500', shortLabel: 'Cursor', icon: Bot },
                copilot: { color: 'text-slate-500', shortLabel: 'Copilot', icon: Bot },
              }
              const DS_LEVEL_INDENT: Record<DsLevel, number> = { project: 0, milestone: 20, feature: 40 }
              const DS_LEVEL_ICON: Record<DsLevel, React.ElementType> = { project: Target, milestone: Flag, feature: Layers }
              const DS_LEVEL_STYLE: Record<DsLevel, string> = {
                project: 'font-semibold text-sm bg-muted/30',
                milestone: 'font-medium text-13',
                feature: 'text-xs',
              }
              const DS_RISK = {
                low: { label: '低风险', icon: TrendingDown, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-800' },
                medium: { label: '中风险', icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800' },
                high: { label: '高风险', icon: TrendingUp, color: 'text-red-600', bg: 'bg-red-50 dark:bg-red-950/40', border: 'border-red-200 dark:border-red-800' },
              }

              const CW = { name: 260, progress: 100, coverage: 72, bugs: 56, risk: 80, claude: 60, cursor: 56, copilot: 56, unit: 56, internal: 56, dev: 56, pm: 56, user: 56, due: 80, owner: 90 }
              const totalW = Object.values(CW).reduce((a, b) => a + b, 0)

              const AGENT_KEYS: DsAgentKey[] = ['claudeCode', 'cursor', 'copilot']
              const AGENT_WIDTHS: Record<DsAgentKey, number> = { claudeCode: CW.claude, cursor: CW.cursor, copilot: CW.copilot }
              const STAGE_COLS = [
                { key: 'unit' as const, label: 'UT', icon: Code2, w: CW.unit },
                { key: 'internal' as const, label: 'IT', icon: FlaskConical, w: CW.internal },
                { key: 'dev' as const, label: 'Dev', icon: Building2, w: CW.dev },
                { key: 'pm' as const, label: 'PM', icon: ClipboardCheck, w: CW.pm },
                { key: 'user' as const, label: 'User', icon: Users, w: CW.user },
              ] as { key: string; label: string; icon: React.ElementType; w: number }[]

              const rows: {
                id: string; level: DsLevel; title: string;
                progress: number; coverage: number | null; bugs: number; risk: 'low' | 'medium' | 'high' | null;
                agents: Record<DsAgentKey, DsAgentStatus>;
                accept: Record<string, DsAcceptStatus>;
                due: string; owner: string; hasChildren?: boolean; expanded?: boolean;
              }[] = [
                {
                  id: 'p1', level: 'project', title: 'AgentPM Platform v1.0',
                  progress: 64, coverage: 72, bugs: 8, risk: 'medium',
                  agents: { claudeCode: 'active', cursor: 'active', copilot: 'idle' },
                  accept: { unit: 'passed', internal: 'passed', dev: 'in_progress', pm: 'pending', user: 'pending' },
                  due: '2026-04-30', owner: 'Alex Chen', hasChildren: true, expanded: true,
                },
                {
                  id: 'm1', level: 'milestone', title: 'Phase 1 · Core UI',
                  progress: 95, coverage: 85, bugs: 2, risk: 'low',
                  agents: { claudeCode: 'active', cursor: 'contributed', copilot: 'idle' },
                  accept: { unit: 'passed', internal: 'passed', dev: 'passed', pm: 'passed', user: 'pending' },
                  due: '2026-03-15', owner: 'Alex Chen', hasChildren: true, expanded: true,
                },
                {
                  id: 'f1', level: 'feature', title: 'AI Hub 对话界面',
                  progress: 100, coverage: 91, bugs: 0, risk: 'low',
                  agents: { claudeCode: 'active', cursor: 'contributed', copilot: 'not_used' },
                  accept: { unit: 'passed', internal: 'passed', dev: 'passed', pm: 'passed', user: 'passed' },
                  due: '2026-03-08', owner: 'Alex Chen',
                },
                {
                  id: 'f2', level: 'feature', title: 'Kanban Board',
                  progress: 88, coverage: 78, bugs: 2, risk: null,
                  agents: { claudeCode: 'contributed', cursor: 'idle', copilot: 'not_used' },
                  accept: { unit: 'passed', internal: 'passed', dev: 'passed', pm: 'waived', user: 'pending' },
                  due: '2026-03-15', owner: 'Sam Liu',
                },
                {
                  id: 'm2', level: 'milestone', title: 'Phase 2 · AI Integration',
                  progress: 41, coverage: 55, bugs: 6, risk: 'medium',
                  agents: { claudeCode: 'active', cursor: 'active', copilot: 'not_used' },
                  accept: { unit: 'in_progress', internal: 'pending', dev: 'pending', pm: 'pending', user: 'pending' },
                  due: '2026-04-20', owner: 'Alex Chen', hasChildren: true, expanded: false,
                },
                {
                  id: 'f5', level: 'feature', title: 'Agent Pipeline Engine',
                  progress: 35, coverage: 42, bugs: 4, risk: 'high',
                  agents: { claudeCode: 'active', cursor: 'idle', copilot: 'not_used' },
                  accept: { unit: 'in_progress', internal: 'pending', dev: 'pending', pm: 'pending', user: 'blocked' },
                  due: '2026-04-15', owner: 'Maria Lopez',
                },
              ]

              return (
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <div style={{ minWidth: totalW }}>
                      <div className="flex items-center h-9 bg-muted/50 border-b border-border text-10 font-semibold uppercase tracking-wider text-muted-foreground sticky top-0 z-20">
                        <div className="sticky left-0 z-20 bg-muted/50 flex items-center px-3 border-r border-border/40 shrink-0" style={{ width: CW.name, minWidth: CW.name }}>
                          交付项目
                        </div>
                        <div style={{ width: CW.progress, minWidth: CW.progress }} className="shrink-0 px-2">进度</div>
                        <div style={{ width: CW.coverage, minWidth: CW.coverage }} className="shrink-0 flex items-center justify-center px-1">覆盖率</div>
                        <div style={{ width: CW.bugs, minWidth: CW.bugs }} className="shrink-0 flex items-center justify-center px-1">Bugs</div>
                        <div style={{ width: CW.risk, minWidth: CW.risk }} className="shrink-0 flex items-center justify-center px-1">风险</div>
                        {AGENT_KEYS.map((ak) => {
                          const ac = DS_AGENT[ak]
                          const AgentIcon = ac.icon
                          return (
                            <div key={ak} style={{ width: AGENT_WIDTHS[ak], minWidth: AGENT_WIDTHS[ak] }} className="shrink-0 flex flex-col items-center justify-center border-l border-border/30 gap-0.5 h-full px-1">
                              <AgentIcon className={cn('w-3 h-3', ac.color)} />
                              <span className="text-8">{ac.shortLabel}</span>
                            </div>
                          )
                        })}
                        {STAGE_COLS.map(({ key, label, icon: StageIcon, w }) => (
                          <div key={key} style={{ width: w, minWidth: w }} className="flex flex-col items-center justify-center border-l border-border/30 shrink-0 h-full gap-0.5 px-1">
                            <StageIcon className="w-3 h-3" />
                            <span className="text-9">{label}</span>
                          </div>
                        ))}
                        <div style={{ width: CW.due, minWidth: CW.due }} className="shrink-0 px-2 border-l border-border/30">截止日</div>
                        <div style={{ width: CW.owner, minWidth: CW.owner }} className="shrink-0 px-2 border-l border-border/30">负责人</div>
                      </div>

                      {rows.map((row) => {
                        const indent = DS_LEVEL_INDENT[row.level]
                        const LevelIcon = DS_LEVEL_ICON[row.level]
                        const pColor = row.progress === 100 ? 'bg-emerald-500' : row.progress >= 60 ? 'bg-blue-500' : row.progress >= 30 ? 'bg-amber-500' : 'bg-red-500'
                        return (
                          <div key={row.id} className={cn('flex items-center min-h-9 border-b border-border/50 last:border-0 hover:bg-accent/20 transition-colors', DS_LEVEL_STYLE[row.level])}>
                            <div
                              className="sticky left-0 z-10 bg-inherit flex items-center gap-1.5 shrink-0 border-r border-border/40"
                              style={{ width: CW.name, minWidth: CW.name, paddingLeft: 12 + indent, paddingRight: 12, paddingTop: 6, paddingBottom: 6 }}
                            >
                              <div className={cn('w-4 h-4 flex items-center justify-center rounded shrink-0 text-muted-foreground', !row.hasChildren && 'opacity-0 pointer-events-none')}>
                                {row.hasChildren && (row.expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />)}
                              </div>
                              <LevelIcon className={cn('w-3.5 h-3.5 shrink-0', row.level === 'project' ? 'text-primary' : row.level === 'milestone' ? 'text-violet-500' : 'text-muted-foreground/60')} />
                              <span className="truncate">{row.title}</span>
                            </div>
                            <div style={{ width: CW.progress, minWidth: CW.progress }} className="shrink-0 px-2">
                              <div className="flex items-center gap-1.5">
                                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                  <div className={cn('h-full rounded-full transition-all', pColor)} style={{ width: `${row.progress}%` }} />
                                </div>
                                <span className="text-10 tabular-nums text-muted-foreground w-7 text-right">{row.progress}%</span>
                              </div>
                            </div>
                            <div style={{ width: CW.coverage, minWidth: CW.coverage }} className="shrink-0 flex items-center justify-center">
                              {row.coverage != null
                                ? <span className={cn('text-xs font-mono font-medium', row.coverage >= 80 ? 'text-emerald-600' : row.coverage >= 60 ? 'text-amber-600' : 'text-red-600')}>{row.coverage}%</span>
                                : <span className="text-10 text-muted-foreground/30">—</span>}
                            </div>
                            <div style={{ width: CW.bugs, minWidth: CW.bugs }} className="shrink-0 flex items-center justify-center">
                              {row.bugs > 0
                                ? <span className="inline-flex items-center gap-1 text-10 px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 font-medium"><AlertTriangle className="w-2.5 h-2.5" />{row.bugs}</span>
                                : <span className="text-10 text-muted-foreground/30">—</span>}
                            </div>
                            <div style={{ width: CW.risk, minWidth: CW.risk }} className="shrink-0 flex items-center justify-center">
                              {row.risk ? (() => { const rc = DS_RISK[row.risk]; const RI = rc.icon; return (
                                <span className={cn('inline-flex items-center gap-1 text-10 px-1.5 py-0.5 rounded-full border font-medium', rc.bg, rc.color, rc.border)}>
                                  <RI className="w-2.5 h-2.5" />{rc.label}
                                </span>
                              ) })() : <span className="text-10 text-muted-foreground/30">—</span>}
                            </div>
                            {AGENT_KEYS.map((ak) => {
                              const sCfg = DS_AGENT_STATUS[row.agents[ak]]
                              const AgentStatusIcon = sCfg.icon
                              return (
                                <div key={ak} style={{ width: AGENT_WIDTHS[ak], minWidth: AGENT_WIDTHS[ak] }} className="shrink-0 border-l border-border/20 h-full flex items-center justify-center py-2">
                                  <AgentStatusIcon className={cn('w-3.5 h-3.5', sCfg.cls)} />
                                </div>
                              )
                            })}
                            {STAGE_COLS.map(({ key, w }) => {
                              const status = row.accept[key] as DsAcceptStatus
                              const scfg = DS_STATUS[status]
                              const AccIcon = scfg.icon
                              return (
                                <div key={key} style={{ width: w, minWidth: w }} className="shrink-0 h-full flex items-center border-l border-border/30">
                                  <div className="w-full flex items-center justify-center py-2" title={scfg.label}>
                                    <AccIcon className={cn('w-3.5 h-3.5', scfg.cls, status === 'in_progress' && 'animate-spin')}
                                      style={status === 'in_progress' ? { animationDuration: '2s' } : undefined} />
                                  </div>
                                </div>
                              )
                            })}
                            <div style={{ width: CW.due, minWidth: CW.due }} className="shrink-0 px-2 border-l border-border/30">
                              <div className="flex items-center gap-1 text-11 whitespace-nowrap text-muted-foreground">
                                <Clock className="w-3 h-3 shrink-0" />
                                {new Date(row.due).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                              </div>
                            </div>
                            <div style={{ width: CW.owner, minWidth: CW.owner }} className="shrink-0 px-2 text-11 text-muted-foreground truncate border-l border-border/30">
                              {row.owner}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-1.5 bg-muted/20 border-t border-border text-10 text-muted-foreground">
                    <span className="font-semibold">验收：</span>
                    {(['pending', 'in_progress', 'passed', 'failed', 'waived', 'blocked'] as DsAcceptStatus[]).map((s) => {
                      const c = DS_STATUS[s]
                      const LIcon = c.icon
                      return <span key={s} className="flex items-center gap-1"><LIcon className={cn('w-3 h-3', c.cls)} />{c.label}</span>
                    })}
                    <span className="ml-2 font-semibold">Agent：</span>
                    {(['active', 'idle', 'contributed', 'not_used'] as DsAgentStatus[]).map((s) => {
                      const c = DS_AGENT_STATUS[s]
                      const LIcon = c.icon
                      return <span key={s} className="flex items-center gap-1"><LIcon className={cn('w-3 h-3', c.cls)} />{c.label}</span>
                    })}
                  </div>
                </div>
              )
            })()}
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="doc-cards">
            <SectionTitle>Document Cards</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Grid view</SubLabel>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { title: 'API Specification v2.0', cat: 'API文档', Icon: Code2, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-950/40', status: 'published', tags: ['REST', 'v2'], project: 'AgentPM', updated: '2 days ago' },
                  { title: 'UI/UX Design Guidelines', cat: '设计文档', Icon: Palette, color: 'text-violet-600', bg: 'bg-violet-50 dark:bg-violet-950/40', status: 'review', tags: ['Design'], project: 'AgentPM', updated: '5 days ago' },
                  { title: 'Product Requirements', cat: '需求文档', Icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-950/40', status: 'draft', tags: ['PRD'], project: 'ACR-Web', updated: '1 week ago' },
                ].map(({ title, cat, Icon, color, bg, status, tags, project, updated }) => {
                  const statusCls = status === 'published'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : status === 'review'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  return (
                    <div key={title} className="group rounded-xl border border-border bg-card p-4 hover:shadow-md transition-all cursor-pointer space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', bg)}>
                          <Icon className={cn('w-4 h-4', color)} />
                        </div>
                        <span className={cn('text-10 font-medium px-1.5 py-0.5 rounded', statusCls)}>
                          {status === 'published' ? '已发布' : status === 'review' ? '审核中' : '草稿'}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground line-clamp-2">{title}</p>
                        <p className={cn('text-10 font-medium mt-1', color)}>{cat}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tags.map((t) => (
                          <span key={t} className="text-10 px-1.5 py-0.5 rounded-sm bg-muted text-muted-foreground">{t}</span>
                        ))}
                      </div>
                      <div className="flex items-center justify-between text-10 text-muted-foreground pt-1 border-t border-border/50">
                        <span>{project}</span>
                        <span>{updated}</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <SubLabel>List view row</SubLabel>
              <div className="rounded-lg border border-border overflow-hidden">
                {[
                  { title: 'API Specification v2.0', Icon: Code2, color: 'text-emerald-600', status: 'published', project: 'AgentPM', author: 'AK', updated: '2 days ago' },
                  { title: 'UI/UX Design Guidelines', Icon: Palette, color: 'text-violet-600', status: 'review', project: 'AgentPM', author: 'ML', updated: '5 days ago' },
                  { title: 'Product Requirements Doc', Icon: FileText, color: 'text-blue-600', status: 'draft', project: 'ACR-Web', author: 'BK', updated: '1 week ago' },
                ].map(({ title, Icon, color, status, project, author, updated }) => {
                  const statusCls = status === 'published'
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : status === 'review'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                  return (
                    <div key={title} className="flex items-center gap-3 px-4 py-3 hover:bg-accent/20 border-b last:border-0 border-border/50 transition-colors cursor-pointer">
                      <Icon className={cn('w-4 h-4 shrink-0', color)} />
                      <span className="flex-1 text-sm font-medium text-foreground truncate">{title}</span>
                      <span className={cn('text-10 px-1.5 py-0.5 rounded shrink-0', statusCls)}>
                        {status === 'published' ? '已发布' : status === 'review' ? '审核中' : '草稿'}
                      </span>
                      <span className="text-xs text-muted-foreground w-20 shrink-0 truncate">{project}</span>
                      <AssigneeAvatar initials={author} />
                      <span className="text-10 text-muted-foreground w-20 shrink-0 text-right">{updated}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="command">
            <SectionTitle>Command Palette</SectionTitle>
            <SubLabel>Static preview — opened with ⌘K / Ctrl+/</SubLabel>
            <div className="flex justify-center">
              <div className="w-140 rounded-xl border border-border shadow-2xl bg-card overflow-hidden">
                <div className="flex items-center gap-3 border-b border-border px-4 py-3.5">
                  <Search className="w-4 h-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 text-sm text-muted-foreground/50">输入命令或搜索…</span>
                  <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-10 text-muted-foreground">ESC</kbd>
                </div>

                <div className="max-h-72 overflow-hidden p-2 space-y-1">
                  <p className="px-2 py-1.5 text-10 font-semibold text-muted-foreground uppercase tracking-wider">导航</p>
                  {[
                    { Icon: Home, label: 'Go to Dashboard', shortcut: 'G D', active: false },
                    { Icon: FolderKanban, label: 'Go to Projects', shortcut: 'G P', active: true },
                    { Icon: CheckSquare, label: 'Go to Tasks', shortcut: 'G T', active: false },
                    { Icon: Sparkles, label: 'Go to AI Hub', shortcut: 'G A', active: false },
                    { Icon: GitBranch, label: 'Go to Repositories', shortcut: 'G R', active: false },
                  ].map(({ Icon, label, shortcut, active }) => (
                    <div key={label}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm cursor-pointer transition-colors',
                        active ? 'bg-accent text-foreground' : 'text-foreground hover:bg-accent/60',
                      )}>
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{label}</span>
                      </div>
                      <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-10 text-muted-foreground">{shortcut}</kbd>
                    </div>
                  ))}
                  <p className="px-2 py-1.5 text-10 font-semibold text-muted-foreground uppercase tracking-wider pt-2">新建</p>
                  {[
                    { Icon: Plus, label: 'Create New Task', shortcut: 'C T' },
                    { Icon: FileText, label: 'Create New Document', shortcut: 'C D' },
                  ].map(({ Icon, label, shortcut }) => (
                    <div key={label}
                      className="flex items-center justify-between gap-3 px-3 py-2 rounded-md text-sm cursor-pointer hover:bg-accent/60 transition-colors">
                      <div className="flex items-center gap-3">
                        <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{label}</span>
                      </div>
                      <kbd className="inline-flex h-5 items-center gap-1 rounded border border-border/50 bg-muted/50 px-1.5 font-mono text-10 text-muted-foreground">{shortcut}</kbd>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border px-4 py-2 flex items-center justify-between bg-muted/30">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {[['↑↓', '导航'], ['↵', '选择'], ['ESC', '关闭']].map(([key, label]) => (
                      <div key={key} className="flex items-center gap-1">
                        <kbd className="inline-flex h-5 items-center rounded border border-border/50 bg-background px-1.5 font-mono text-10">{key}</kbd>
                        <span>{label}</span>
                      </div>
                    ))}
                  </div>
                  <kbd className="inline-flex h-5 items-center rounded border border-border/50 bg-background px-1.5 font-mono text-10 text-muted-foreground">Ctrl+/</kbd>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="page-layout">
            <SectionTitle>Page Layout Components</SectionTitle>
            <div className="space-y-4">
              <SubLabel>PageShell + PageHeader + SectionCard + DataTableShell</SubLabel>
              <div className="rounded-xl border border-border overflow-hidden">
                <PageShell className="bg-background">
                  <PageHeader
                    title="Projects"
                    icon={FolderKanban}
                    metrics={[{ id: 'projects', label: 'Projects', value: 12 }]}
                    actions={<HeaderActionButton icon={Plus} label="New Project" />}
                  />
                  <div className="p-4 space-y-4">
                    <SectionCard
                      title="Overview"
                      description="Project health summary"
                      actions={<Badge variant="outline">v2.0</Badge>}
                    >
                      <p className="text-sm text-muted-foreground">
                        SectionCard combines Card primitives with a header, description and action slot.
                      </p>
                    </SectionCard>
                    <DataTableShell className="p-4">
                      <p className="text-sm text-muted-foreground">
                        DataTableShell wraps data tables in a bordered, rounded container.
                      </p>
                    </DataTableShell>
                  </div>
                </PageShell>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="stat-cards">
            <SectionTitle>Stat Cards</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>StatCard</SubLabel>
                <div className="grid grid-cols-3 gap-3">
                  <StatCard
                    label="Total Tasks"
                    value="248"
                    hint="Across all projects"
                    trend="up"
                    trendValue="12%"
                    icon={<CheckSquare className="w-4 h-4" />}
                    iconBg="bg-accent-green/10 text-accent-green"
                  />
                  <StatCard
                    label="Open Bugs"
                    value="13"
                    hint="Needs triage"
                    trend="down"
                    trendValue="3"
                    icon={<AlertCircle className="w-4 h-4" />}
                    iconBg="bg-accent-red/10 text-accent-red"
                  />
                  <StatCard
                    label="AI Executions"
                    value="1.2k"
                    hint="This quarter"
                    icon={<Sparkles className="w-4 h-4" />}
                    iconBg="bg-accent-purple/10 text-accent-purple"
                  />
                </div>
              </div>
              <div>
                <SubLabel>StatsCard</SubLabel>
                <StatsCard
                  columns={4}
                  items={[
                    { key: 'tasks', value: 248, label: 'Tasks', icon: CheckSquare, colorClass: 'bg-accent-blue/10 border-accent-blue/20', iconColorClass: 'text-accent-blue' },
                    { key: 'bugs', value: 13, label: 'Open Bugs', icon: AlertCircle, colorClass: 'bg-accent-red/10 border-accent-red/20', iconColorClass: 'text-accent-red' },
                    { key: 'milestones', value: '4/6', label: 'Milestones', icon: Star, colorClass: 'bg-accent-yellow/10 border-accent-yellow/20', iconColorClass: 'text-accent-yellow' },
                    { key: 'ai', value: '1.2k', label: 'AI Runs', icon: Sparkles, colorClass: 'bg-accent-purple/10 border-accent-purple/20', iconColorClass: 'text-accent-purple' },
                  ]}
                />
              </div>
              <div>
                <SubLabel>IconMetric</SubLabel>
                <div className="flex gap-3">
                  <IconMetric icon={<Sparkles className="w-4 h-4" />} label="AI Executions" value="1.2k" />
                  <IconMetric icon={<GitBranch className="w-4 h-4" />} label="Repositories" value="12" />
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="loading-states">
            <SectionTitle>Loading &amp; Empty States</SectionTitle>
            <div className="space-y-5">
              <div>
                <SubLabel>LoadingOverlay — inline mode</SubLabel>
                <div className="rounded-lg border border-border bg-muted/10 p-6">
                  <LoadingOverlay visible mode="inline" message="Loading data..." description="Fetching latest results" />
                </div>
              </div>
              <div>
                <SubLabel>AsyncState</SubLabel>
                <div className="space-y-3">
                  <AsyncState isLoading>
                    <p className="text-sm text-muted-foreground">Loaded content</p>
                  </AsyncState>
                  <AsyncState isEmpty emptyTitle="No tasks yet" emptyDescription="Create a task to get started">
                    <p className="text-sm text-muted-foreground">Loaded content</p>
                  </AsyncState>
                  <AsyncState error="Failed to load data" onRetry={() => {}}>
                    <p className="text-sm text-muted-foreground">Loaded content</p>
                  </AsyncState>
                </div>
              </div>
              <div>
                <SubLabel>EmptyState</SubLabel>
                <EmptyState
                  title="No documents found"
                  description="Start building your knowledge base"
                  action={<Button size="sm"><Plus /> New Document</Button>}
                />
              </div>
              <div>
                <SubLabel>Empty primitives</SubLabel>
                <div className="rounded-lg border border-dashed border-border">
                  <Empty>
                    <EmptyMedia variant="icon"><Search className="w-5 h-5" /></EmptyMedia>
                    <EmptyHeader>
                      <EmptyTitle>No results</EmptyTitle>
                      <EmptyDescription>Try adjusting your search query or clearing the filters.</EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button size="sm" variant="outline">Clear filters</Button>
                    </EmptyContent>
                  </Empty>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <div className="h-12" />
        </div>
      </main>
    </div>
  )
}
