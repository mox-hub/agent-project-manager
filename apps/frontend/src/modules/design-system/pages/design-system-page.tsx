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
  GitPullRequest,
  GitCommit,
  Home,
  Info,
  Kanban,
  Layers,
  LayoutGrid,
  List,
  Loader,
  Loader2,
  Mail,
  MessagesSquare,
  Milestone,
  Minus,
  MoreHorizontal,
  Palette,
  Plus,
  RefreshCw,
  Rocket,
  Search,
  Settings,
  Share2,
  Sparkles,
  Star,
  SunMoon,
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
  CircleCheck,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandFooter,
} from '@/components/ui/command'
import { getEntityIcon } from '@/shared/entity-icons/entity-icons'
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
import Avvvatars from 'avvvatars-react'
import NiceAvatar, { genConfig } from 'react-nice-avatar'
import { MemberAvatar } from '@/modules/team-member/components/member-avatar'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
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
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
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
  HoverCardArrow,
  HoverCardContent,
  HoverCardTrigger,
} from '@/components/ui/hover-card'
import { PreviewFooterMeta, PreviewRow, PreviewSection } from '@/shared/route-preview/previews/preview-fields'
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
import { StatusIconFrame } from '@/shared/status/status-icon-frame'
import { TASK_STATUS_VISUALS } from '@/shared/status/status-visuals'
import { MarkdownView } from '@/shared/components/markdown-view'
import { MarkdownEditor } from '@/shared/components/markdown-editor'
import { EmojiPicker } from '@/shared/components/emoji-picker/emoji-picker'
import { ChapterScrubber, type Chapter } from '@/components/ui/chapter-scrubber'
import { FloatingDock, type DockItem } from '@/components/ui/floating-dock'
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
  MenubarMenu,
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
import {
  FilterChipsRow,
  FilterCascadeMenu,
  type FilterCondition,
  type FilterFieldDef,
} from '@/components/ui/filter-chips'
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar'
import { SectionCard } from '@/components/ui/section-card'
import { toast } from '@/components/ui/toast'
import {
  Menu,
  MenuCheckboxItem,
  MenuGroupLabel,
  MenuItem,
  MenuPopup,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuShortcut,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from '@/components/ui/menu'
import { ContextMenu, createMenuItems } from '@/components/ui/context-menu'
import { DatePicker } from '@/components/ui/date-picker'
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field'
import {
  Autocomplete,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
  AutocompletePopup,
  useAutocompleteFilter,
} from '@/components/ui/autocomplete'
import { CheckboxGroup } from '@/components/ui/checkbox-group'
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from '@/components/ui/meter'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { StatCard } from '@/components/ui/stat-card'
import { StatsCard } from '@/components/ui/stats-card'
import { IconMetric } from '@/components/ui/icon-metric'
import { DataTableShell } from '@/components/ui/data-table-shell'
import { EmptyState } from '@/components/ui/empty-state'
import { AsyncState } from '@/components/ui/async-state'
import { DataList } from '@/components/ui/data-list'
import { PropsCard, PropertyRow } from '@/components/ui/property-panel'
import { LoadingOverlay } from '@/components/ui/loading-overlay'
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
import { ThinkingStream } from '@/modules/assistant/components/thinking-stream'
import { AgentHandoffCard } from '@/modules/office/components/agent-handoff-card'
import { DualTrackMetricPill } from '@/shared/components/dual-track-metric-pill'
import { AssistantToolCard } from '@/modules/assistant/components/assistant-tool-card'
import { DecisionCardShell } from '@/shared/decision-card/decision-card-shell'

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
  { id: 'member-identity', label: 'Member Identity', group: 'Primitives' },
  { id: 'cards', label: 'Cards', group: 'Primitives' },
  { id: 'forms', label: 'Forms', group: 'Primitives' },
  { id: 'number-field', label: 'Number Field', group: 'Primitives' },
  { id: 'autocomplete', label: 'Autocomplete', group: 'Primitives' },
  { id: 'checkbox-group', label: 'Checkbox Group', group: 'Primitives' },
  { id: 'alerts', label: 'Alerts', group: 'Primitives' },
  { id: 'toast', label: 'Toast', group: 'Primitives' },
  { id: 'progress', label: 'Progress', group: 'Primitives' },
  { id: 'meter', label: 'Meter', group: 'Primitives' },
  { id: 'tabs', label: 'Tabs', group: 'Primitives' },
  { id: 'accordion', label: 'Accordion', group: 'Primitives' },
  { id: 'table', label: 'Table', group: 'Primitives' },
  { id: 'tooltip', label: 'Tooltip & Menu', group: 'Primitives' },
  { id: 'menu', label: 'Menu (coss)', group: 'Primitives' },
  { id: 'overlays', label: 'Overlays', group: 'Primitives' },
  { id: 'popover', label: 'Popover & Combobox', group: 'Primitives' },
  { id: 'hover-card', label: 'Hover Card', group: 'Primitives' },
  { id: 'breadcrumb', label: 'Breadcrumb', group: 'Primitives' },
  { id: 'button-group', label: 'Button Group', group: 'Primitives' },
  { id: 'toggle', label: 'Toggle & Segmented', group: 'Primitives' },
  { id: 'kbd', label: 'Kbd', group: 'Primitives' },
  { id: 'spinner', label: 'Spinner', group: 'Primitives' },
  { id: 'status-pill', label: 'Status Pill', group: 'Primitives' },
  { id: 'status-icon-frame', label: 'Status Icon Frame', group: 'Primitives' },
  { id: 'markdown', label: 'Markdown View', group: 'Primitives' },
  { id: 'markdown-editor', label: 'Markdown Editor', group: 'Primitives' },
  { id: 'emoji-picker', label: 'Emoji Picker', group: 'Primitives' },
  { id: 'pagination', label: 'Pagination', group: 'Primitives' },
  { id: 'calendar', label: 'Calendar', group: 'Primitives' },
  { id: 'date-picker', label: 'Date Picker', group: 'Primitives' },
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
  { id: 'chapter-scrubber', label: 'Chapter Scrubber', group: 'Primitives' },
  { id: 'floating-dock', label: 'Floating Dock', group: 'Primitives' },
  { id: 'page-header', label: 'Page Header', group: 'App Components' },
  { id: 'toolbar', label: 'Toolbar Row', group: 'App Components' },
  { id: 'filter-chips', label: 'Filter Chips', group: 'App Components' },
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
  { id: 'assembly-primitives', label: 'Assembly Primitives', group: 'App Components' },
  { id: 'ai-density-cards', label: 'AI High-Density Cards [AI]', group: 'AI Execution' },
]

const SECTION_GROUPS = ['Tokens', 'Primitives', 'App Components', 'AI Execution']

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

const FILTER_DEMO_FIELDS: FilterFieldDef[] = [
  {
    id: 'status',
    label: 'Status',
    icon: Circle,
    operators: ['is', 'isNot'],
    options: [
      { value: 'todo', label: 'Todo', icon: <Circle className="size-3.5 text-muted-foreground" /> },
      { value: 'in_progress', label: 'In Progress', icon: <Loader className="size-3.5 text-accent-blue" /> },
      { value: 'done', label: 'Done', icon: <CircleCheck className="size-3.5 text-accent-green" /> },
    ],
  },
  {
    id: 'priority',
    label: 'Priority',
    icon: Flag,
    operators: ['is', 'isNot'],
    options: [
      { value: 'urgent', label: 'Urgent', icon: <span className="size-2.5 shrink-0 rounded-full bg-accent-red" /> },
      { value: 'high', label: 'High', icon: <span className="size-2.5 shrink-0 rounded-full bg-accent-orange" /> },
      { value: 'medium', label: 'Medium', icon: <span className="size-2.5 shrink-0 rounded-full bg-accent-yellow" /> },
      { value: 'low', label: 'Low', icon: <span className="size-2.5 shrink-0 rounded-full bg-muted-foreground/40" /> },
    ],
  },
]

/** FilterChipsRow 演示：Linear 风格条件条（字段｜算子｜值｜× 拼接 chip + 追加 + Clear/Save） */
function FilterChipsDemo() {
  const [conditions, setConditions] = React.useState<FilterCondition[]>([
    { id: 'demo-status', fieldId: 'status', operator: 'is', values: ['todo', 'in_progress'] },
    { id: 'demo-priority', fieldId: 'priority', operator: 'isNot', values: ['low'] },
  ])

  return (
    <div className="space-y-2">
      <FilterChipsRow
        fields={FILTER_DEMO_FIELDS}
        conditions={conditions}
        onChange={setConditions}
        onSaveToView={() => undefined}
        onSaveAsNewView={() => undefined}
      />
      <div className="flex items-center gap-3">
        <FilterCascadeMenu
          fields={FILTER_DEMO_FIELDS}
          conditions={conditions}
          onChange={setConditions}
          badge={conditions.filter((c) => c.values.length > 0).length}
        />
        <span className="text-xs text-muted-foreground">漏斗按钮二级级联菜单：字段搜索 + 值子菜单直接勾选，与条件条操作同一份状态</span>
      </div>
      <div className="text-xs text-muted-foreground">
        {conditions.length} condition(s) — 点字段清单追加（允许同字段多条件），Save 菜单演示保存到视图/另存为新视图
      </div>
    </div>
  )
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
  { label: 'shadow-xs', cls: 'shadow-xs' },
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
  todo: { label: 'Todo', Icon: Circle, color: 'text-muted-foreground', bg: 'bg-muted/50' },
  in_progress: { label: 'In Progress', Icon: Loader, color: 'text-accent-blue', bg: 'bg-accent-blue-light' },
  in_review: { label: 'In Review', Icon: AlertCircle, color: 'text-accent-yellow', bg: 'bg-accent-yellow-light' },
  done: { label: 'Done', Icon: CheckCircle2, color: 'text-accent-green', bg: 'bg-accent-green-light' },
  canceled: { label: 'Canceled', Icon: XCircle, color: 'text-muted-foreground', bg: 'bg-muted/50' },
}

const PRIORITY_CFG: Record<Priority, { label: string; Icon: React.ElementType; color: string }> = {
  urgent: { label: 'Urgent', Icon: ChevronsUp, color: 'text-accent-red' },
  high: { label: 'High', Icon: ArrowUp, color: 'text-accent-orange' },
  medium: { label: 'Medium', Icon: Minus, color: 'text-accent-blue' },
  low: { label: 'Low', Icon: ArrowDown, color: 'text-muted-foreground' },
}

const SEVERITY_CFG: Record<Severity, { label: string; bar: string; text: string }> = {
  critical: { label: 'Critical', bar: 'bg-accent-red', text: 'text-accent-red' },
  high: { label: 'High', bar: 'bg-accent-orange', text: 'text-accent-orange' },
  medium: { label: 'Medium', bar: 'bg-accent-yellow', text: 'text-accent-yellow' },
  low: { label: 'Low', bar: 'bg-muted-foreground/30', text: 'text-muted-foreground' },
}

const MILESTONE_COLORS = [
  { bg: 'bg-accent-blue-light', text: 'text-accent-blue', border: 'border-accent-blue/20' },
  { bg: 'bg-accent-purple-light', text: 'text-accent-purple', border: 'border-accent-purple/20' },
  { bg: 'bg-accent-green-light', text: 'text-accent-green', border: 'border-accent-green/20' },
  { bg: 'bg-accent-yellow-light', text: 'text-accent-yellow', border: 'border-accent-yellow/20' },
]

const ACCEPT_STAGES: Record<string, { label: string; color: string; bg: string }> = {
  unit: { label: 'Unit Test', color: 'text-accent-blue', bg: 'bg-accent-blue-light' },
  internal: { label: 'Internal', color: 'text-accent-purple', bg: 'bg-accent-purple-light' },
  dev: { label: 'Dev Team', color: 'text-accent-green', bg: 'bg-accent-green-light' },
  pm: { label: 'PM', color: 'text-accent-yellow', bg: 'bg-accent-yellow-light' },
  client: { label: 'Client', color: 'text-muted-foreground', bg: 'bg-muted/60' },
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
  const { copyToClipboard, isCopied: copied } = useCopyToClipboard({ timeout: 1200 })
  return (
    <button onClick={() => copyToClipboard(name)} className="flex items-center gap-1 text-10 text-muted-foreground hover:text-foreground font-mono group transition-colors">
      <span>{name}</span>
      {copied
        ? <Check className="w-2.5 h-2.5 text-emerald-500" />
        : <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-60 transition-opacity" />}
    </button>
  )
}

/* ── coss 新组件演示（2026-08 引入） ─────────────────────────── */

function MarkdownEditorDemo() {
  const [value, setValue] = useState('左侧输入，右侧实时渲染 —— **加粗**、`code`、- 列表')
  return (
    <MarkdownEditor
      value={value}
      onChange={setValue}
      rows={4}
      preview="live"
      placeholder="live 分栏实时预览（宽容器）"
    />
  )
}

function ToastDemo() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={() => toast.success('Event has been created', { description: 'Monday, January 3rd at 6:00pm' })}>
        Success
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.error('Something went wrong', { description: 'Check the console for details.' })}>
        Error
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.info('New version available')}>
        Info
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.warning('This action may have consequences')}>
        Warning
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast('Deploy started', { action: { label: 'View logs', onClick: () => toast.info('Opening logs…') } })}>
        With Action
      </Button>
      <Button size="sm" variant="outline" onClick={() => toast.promise(new Promise((r) => setTimeout(r, 1500)), { loading: 'Uploading…', success: 'Upload complete', error: 'Upload failed' })}>
        Promise
      </Button>
    </div>
  )
}

function MenuDemo() {
  const [shuffle, setShuffle] = React.useState(false)
  const [sort, setSort] = React.useState('artist')
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Menu>
        <MenuTrigger render={<Button variant="outline">Open Menu</Button>} />
        <MenuPopup className="min-w-52">
          <MenuGroupLabel>Playback</MenuGroupLabel>
          <MenuItem onClick={() => undefined}>
            Play <MenuShortcut>⌘P</MenuShortcut>
          </MenuItem>
          <MenuItem disabled>Pause</MenuItem>
          <MenuSeparator />
          <MenuCheckboxItem checked={shuffle} onCheckedChange={setShuffle}>
            Shuffle
          </MenuCheckboxItem>
          <MenuRadioGroup value={sort} onValueChange={setSort}>
            <MenuRadioItem value="artist">Sort by artist</MenuRadioItem>
            <MenuRadioItem value="album">Sort by album</MenuRadioItem>
          </MenuRadioGroup>
          <MenuSeparator />
          <MenuSub>
            <MenuSubTrigger>Add to playlist</MenuSubTrigger>
            <MenuSubPopup>
              <MenuItem>Favorites</MenuItem>
              <MenuItem>Focus</MenuItem>
            </MenuSubPopup>
          </MenuSub>
          <MenuItem variant="destructive" onClick={() => toast.warning('Deleted (demo)')}>
            Delete
          </MenuItem>
        </MenuPopup>
      </Menu>
      <ContextMenu
        items={createMenuItems([
          { label: 'Edit', icon: <Edit2 className="size-4" />, onClick: () => undefined },
          { label: 'Duplicate', icon: <Copy className="size-4" />, separatorAfter: true },
          { label: 'Delete', icon: <Trash2 className="size-4" />, destructive: true, onClick: () => undefined },
        ])}
      >
        <div className="rounded-md border border-dashed px-4 py-3 text-xs text-muted-foreground">
          右键点击这里（coss 设计弹出层）
        </div>
      </ContextMenu>
    </div>
  )
}

function DatePickerDemo() {
  const [date, setDate] = React.useState<Date | undefined>(undefined)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 86_400_000)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <DatePicker value={date} onValueChange={setDate} />
      <DatePicker
        value={date}
        onValueChange={setDate}
        placeholder="With presets"
        presets={[
          { label: 'Today', date: today },
          { label: 'Tomorrow', date: tomorrow },
        ]}
      />
    </div>
  )
}

function NumberFieldDemo() {
  const [value, setValue] = React.useState<number | null>(4)
  return (
    <div className="flex flex-wrap items-center gap-3">
      <NumberField value={value} onValueChange={setValue} min={0} step={0.5} size="sm">
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label="Decrease" />
          <NumberFieldInput />
          <NumberFieldIncrement aria-label="Increase" />
        </NumberFieldGroup>
      </NumberField>
      <NumberField value={value} onValueChange={setValue} min={0} step={0.5}>
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label="Decrease" />
          <NumberFieldInput />
          <NumberFieldIncrement aria-label="Increase" />
        </NumberFieldGroup>
      </NumberField>
      <NumberField value={value} onValueChange={setValue} min={0} step={0.5} size="lg">
        <NumberFieldGroup>
          <NumberFieldDecrement aria-label="Decrease" />
          <NumberFieldInput />
          <NumberFieldIncrement aria-label="Increase" />
        </NumberFieldGroup>
      </NumberField>
    </div>
  )
}

const AUTOCOMPLETE_FRUITS = ['Apple', 'Banana', 'Cherry', 'Grape', 'Mango', 'Peach', 'Pear', 'Pineapple']

function AutocompleteDemo() {
  const [value, setValue] = React.useState('')
  const filter = useAutocompleteFilter()
  const options = AUTOCOMPLETE_FRUITS.filter((fruit) => filter.contains(fruit, value))
  return (
    <div className="w-full max-w-xs">
      <Autocomplete value={value} onValueChange={setValue}>
        <AutocompleteInput placeholder="Type to filter fruits…" showClear />
        <AutocompletePopup>
          <AutocompleteList>
            <AutocompleteEmpty>No results found.</AutocompleteEmpty>
            {options.map((fruit) => (
              <AutocompleteItem key={fruit} value={fruit}>
                {fruit}
              </AutocompleteItem>
            ))}
          </AutocompleteList>
        </AutocompletePopup>
      </Autocomplete>
    </div>
  )
}

function CheckboxGroupDemo() {
  const [channels, setChannels] = React.useState<string[]>(['email'])
  return (
    <CheckboxGroup value={channels} onValueChange={setChannels}>
      {['Email', 'Push', 'SMS'].map((channel) => (
        <label key={channel} className="flex cursor-pointer items-center gap-2 text-sm">
          <Checkbox value={channel} />
          {channel}
        </label>
      ))}
    </CheckboxGroup>
  )
}

function MeterDemo() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <Meter value={72} min={0} max={100}>
        <div className="flex items-baseline justify-between">
          <MeterLabel>Storage used</MeterLabel>
          <MeterValue>{(formatted) => formatted}</MeterValue>
        </div>
        <MeterTrack>
          <MeterIndicator />
        </MeterTrack>
      </Meter>
      <Meter value={38} min={0} max={100} />
      <Meter value={96} min={0} max={100}>
        <div className="flex items-baseline justify-between">
          <MeterLabel>Quota (critical)</MeterLabel>
          <MeterValue>{(formatted) => formatted}</MeterValue>
        </div>
        <MeterTrack>
          <MeterIndicator className="bg-accent-red" />
        </MeterTrack>
      </Meter>
    </div>
  )
}

const SCRUBBER_CHAPTERS: Chapter[] = [
  { id: 'intake', meta: 'Phase 01', title: '需求录入与拆解', description: '产品将原始需求整理为结构化任务，附验收标准与优先级。' },
  { id: 'assign', meta: 'Phase 02', title: 'AI 智能分派', description: '按成员技能与负载推荐执行人，Agent 可认领自动化任务。' },
  { id: 'exec', meta: 'Phase 03', title: '执行与过程追踪', description: '执行运行面板实时回传步骤输出，动态时间线记录关键事件。' },
  { id: 'review', meta: 'Phase 04', title: '完成评审', description: '产出物进入完成评审流，评审人逐项核对验收标准。' },
  { id: 'accept', meta: 'Phase 05', title: '多级验收', description: '单元/内部/开发/PM/客户五级验收链逐级放行。' },
  { id: 'sync', meta: 'Phase 06', title: 'Linear 同步', description: '任务状态双向同步到 Linear，外部协作不断档。' },
  { id: 'retro', meta: 'Phase 07', title: '复盘与归档', description: '动态时间线沉淀为项目档案，结论进入知识库。' },
  { id: 'release', meta: 'Phase 08', title: '发布与巡检', description: '稳定化巡检通过后对外发布并归档版本。' },
]

function ChapterScrubberDemo() {
  const [current, setCurrent] = React.useState(2)
  const [active, setActive] = React.useState<Chapter | null>(null)
  const shown = active ?? SCRUBBER_CHAPTERS[current]
  return (
    <div className="flex items-center gap-8 rounded-xl border border-border bg-background px-8 py-6">
      <ChapterScrubber
        chapters={SCRUBBER_CHAPTERS}
        currentIndex={current}
        onSelect={(_, index) => setCurrent(index)}
        onActiveChange={setActive}
      />
      <div className="min-w-0">
        <div className="text-10 font-medium tabular-nums text-muted-foreground">{shown.meta}</div>
        <div className="truncate text-sm font-semibold">{shown.title}</div>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{shown.description}</p>
        <p className="mt-3 text-10 text-muted-foreground">
          {active ? 'hover 预览中 — 点击切换 current（主色刻度）' : '悬停刻度出现放大波与预览卡，点击/方向键切换章节'}
        </p>
      </div>
    </div>
  )
}

const DOCK_ITEMS: DockItem[] = [
  { title: 'Home', icon: <Home className="h-full w-full text-muted-foreground" />, href: '#' },
  { title: 'Projects', icon: <Kanban className="h-full w-full text-muted-foreground" />, href: '#' },
  { title: 'Tasks', icon: <FileText className="h-full w-full text-muted-foreground" />, href: '#' },
  { title: 'Bugs', icon: <Bug className="h-full w-full text-muted-foreground" />, href: '#' },
  { title: 'Team', icon: <Users className="h-full w-full text-muted-foreground" />, href: '#' },
  { title: 'Search', icon: <Search className="h-full w-full text-muted-foreground" />, href: '#' },
  { title: 'Settings', icon: <Settings className="h-full w-full text-muted-foreground" />, href: '#' },
]

function FloatingDockDemo() {
  return (
    <div className="rounded-xl border border-border overflow-hidden bg-background">
      <div className="flex min-h-56 items-end justify-center bg-muted/20 px-6 pb-8 pt-6">
        <FloatingDock items={DOCK_ITEMS} />
      </div>
      <div className="px-6 py-4 text-xs text-muted-foreground">
        桌面端 hover 图标磁性放大并弹出 tooltip；md 以下折叠为展开按钮
      </div>
    </div>
  )
}

function StatusChip({ status }: { status: TaskStatus }) {
  const cfg = STATUS_CFG[status]
  return (
    <div className={cn('w-5.5 h-5.5 rounded-md flex items-center justify-center shrink-0 border border-border/40', cfg.bg)} title={cfg.label}>
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
  const c = MILESTONE_COLORS[idx % MILESTONE_COLORS.length]
  return (
    <span className={cn('inline-flex items-center text-11 font-medium px-2 py-0.5 rounded-md border whitespace-nowrap truncate', c.bg, c.text, c.border)}>
      {name}
    </span>
  )
}

function LabelChip({ name, color }: { name: string; color: string }) {
  return (
    <span className="inline-flex items-center text-10 px-1.5 py-0.5 rounded-sm font-medium whitespace-nowrap bg-muted/60 text-foreground border border-border/40"
      style={{ color }}>
      {name}
    </span>
  )
}

function ProgressRing({ done, total, size = 14 }: { done: number; total: number; size?: number }) {
  const r = (size - 2.5) / 2
  const circ = 2 * Math.PI * r
  const ratio = total > 0 ? done / total : 0
  const stroke = ratio === 1 ? 'var(--accent-green, #10B981)' : ratio > 0 ? 'var(--accent-blue, #3B82F6)' : 'var(--muted-foreground, #94A3B8)'
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
    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md border border-border/80 bg-muted/50 text-10 font-medium text-muted-foreground shrink-0 ml-1.5 font-mono">
      <ProgressRing done={done} total={total} />
      <span>{done}/{total}</span>
    </span>
  )
}

function AssigneeAvatar({ initials, color }: { initials?: string; color?: string }) {
  if (!initials) {
    return (
      <div className="w-5.5 h-5.5 rounded-full bg-muted/60 border border-border/40 flex items-center justify-center shrink-0">
        <User className="h-3 w-3 text-muted-foreground/60" />
      </div>
    )
  }
  return (
    <div className="w-5.5 h-5.5 rounded-full flex items-center justify-center text-primary-foreground text-10 font-semibold shrink-0 bg-primary/80 border border-primary/20"
      style={color ? { backgroundColor: color } : undefined}>
      {initials}
    </div>
  )
}

function AvatarPickerShowcase() {
  const [value, setValue] = useState<string | null>('nice-avatar:alex')
  return (
    <div className="space-y-3 max-w-xl">
      <div className="rounded-lg border border-border/70 p-3.5 bg-muted/10 space-y-2">
        <p className="text-xs font-medium text-foreground">双表面预设（人类同事 NiceAvatar 插画肖像 & AI 智能体 Avvvatars 算法几何）</p>
        <AvatarPickerField value={value} onValueChange={setValue} />
        <div className="flex items-center gap-2 pt-1 text-xs text-muted-foreground">
          <span>当前选择路径:</span>
          <code className="font-mono text-11 px-1.5 py-0.5 rounded bg-muted text-foreground">
            {value ?? '（未选择）'}
          </code>
        </div>
      </div>
    </div>
  )
}

function AvatarModernizationShowcase() {
  const [humanSeed, setHumanSeed] = useState('Alex Chen')
  const [humanNonce, setHumanNonce] = useState(0)
  const [agentSeed, setAgentSeed] = useState('claude-code')
  const [avStyle, setAvStyle] = useState<'shape' | 'character'>('shape')
  const [avShadow, setAvShadow] = useState(true)

  const humanPresets = ['Alex Chen', 'Sarah Lin', 'Leo Zhang', 'David Wu', 'Emma Zhao', 'Lucas Gray']
  const agentPresets = ['claude-code', 'codex', 'zcode', 'doc-bot', 'qa-bot', 'guardian']

  // 模拟团队人类同事（react-nice-avatar）与 AI 同事（avvvatars）全景花名册
  const humanTeam = [
    { name: 'Alex Chen', role: '系统架构师', handle: 'alex', status: 'online' as const },
    { name: 'Sarah Lin', role: '研发技术主管', handle: 'sarah', status: 'online' as const },
    { name: 'Leo Zhang', role: '全栈工程师', handle: 'leo', status: 'online' as const },
    { name: 'David Wu', role: '数据架构师', handle: 'david', status: 'offline' as const },
    { name: 'Emma Zhao', role: '体验设计主管', handle: 'emma', status: 'online' as const },
    { name: 'Lucas Gray', role: '交付与质保', handle: 'lucas', status: 'busy' as const },
  ]

  const agentTeam = [
    { name: 'Claude Coder', role: '主工程智能体', handle: 'claude-code', model: 'Claude 3.7', status: 'active' as const },
    { name: 'Codex Reviewer', role: '代码审查智能体', handle: 'codex', model: 'Codex CLI', status: 'active' as const },
    { name: 'ZCode Daemon', role: '运行时守护', handle: 'zcode', model: 'Runtime Agent', status: 'idle' as const },
    { name: 'Doc Architect', role: '知识库与契约', handle: 'doc-bot', model: 'Knowledge AI', status: 'active' as const },
    { name: 'QA Gatekeeper', role: '门禁与回流', handle: 'qa-bot', model: 'Evidence Guard', status: 'active' as const },
    { name: 'Guardian Bot', role: '安全与风险审计', handle: 'guardian', model: 'Security Agent', status: 'idle' as const },
  ]

  const effectiveHumanSeed = humanNonce > 0 ? `${humanSeed}#${humanNonce}` : humanSeed
  const currentNiceConfig = genConfig(effectiveHumanSeed)

  return (
    <div className="space-y-4 max-w-3xl rounded-xl border border-border p-4 bg-card/60">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-accent-purple" />
            <h3 className="text-sm font-semibold text-foreground">
              双表面头像体系（人类同事: react-nice-avatar × AI 同事: avvvatars）
            </h3>
            <Badge variant="outline" className="text-10 text-accent-blue border-accent-blue/30">官方定夺</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            全面舍弃其他非标方案。人类同事采用 <code>react-nice-avatar</code> 确定性插画肖像；AI 同事采用 <code>avvvatars</code> 算法几何。纯本地 SVG 驱动，零外网依赖。
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="text-10 text-accent-green bg-accent-green/10 border-accent-green/30">
            双表面 100% 确定性生成
          </Badge>
        </div>
      </div>

      {/* 双工作台：人类肖像 vs AI 几何 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左栏：人类同事肖像生成器 (react-nice-avatar) */}
        <div className="rounded-xl border border-accent-blue/30 bg-background/90 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <User className="size-4 text-accent-blue" />
              <span className="text-xs font-semibold text-foreground">人类同事肖像引擎</span>
            </div>
            <Badge variant="secondary" className="text-10 text-accent-blue bg-accent-blue/10">react-nice-avatar</Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-16 rounded-full overflow-hidden border-2 border-accent-blue/40 shadow-sm shrink-0">
              <NiceAvatar style={{ width: '100%', height: '100%' }} shape="circle" {...currentNiceConfig} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate">{humanSeed}</span>
                <button
                  type="button"
                  onClick={() => setHumanNonce((n) => n + 1)}
                  className="px-2 py-0.5 rounded text-10 font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  随机变幻
                </button>
              </div>
              <div className="flex flex-wrap gap-1 text-10 font-mono text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/60">性别: {currentNiceConfig.sex}</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/60">发型: {currentNiceConfig.hairStyle}</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/60">服饰: {currentNiceConfig.shirtStyle}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-10 text-muted-foreground">测试 Seed / 姓名:</span>
              <div className="flex flex-wrap gap-1">
                {humanPresets.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => { setHumanSeed(p); setHumanNonce(0); }}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-10 font-mono transition-colors',
                      humanSeed === p ? 'bg-primary text-primary-foreground font-semibold' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    {p.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>
            <Input
              value={humanSeed}
              onChange={(e) => { setHumanSeed(e.target.value || 'User'); setHumanNonce(0); }}
              placeholder="输入人类成员姓名或邮箱…"
              className="h-7 text-xs font-mono"
            />
          </div>
        </div>

        {/* 右栏：AI 同事算法几何生成器 (avvvatars) */}
        <div className="rounded-xl border border-accent-purple/30 bg-background/90 p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Bot className="size-4 text-accent-purple" />
              <span className="text-xs font-semibold text-foreground">AI 同事几何符号引擎</span>
            </div>
            <Badge variant="secondary" className="text-10 text-accent-purple bg-accent-purple/10">avvvatars-react</Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="size-16 rounded-full overflow-hidden border-2 border-accent-purple/40 shadow-sm shrink-0 flex items-center justify-center">
              <Avvvatars value={agentSeed} size={64} style={avStyle} shadow={avShadow} />
            </div>
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate">@{agentSeed}</span>
                <div className="inline-flex rounded-md border border-border p-0.5 bg-muted/40">
                  <button
                    type="button"
                    onClick={() => setAvStyle('shape')}
                    className={cn(
                      'px-1.5 py-0.5 text-10 font-medium rounded transition-colors',
                      avStyle === 'shape' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    Shape
                  </button>
                  <button
                    type="button"
                    onClick={() => setAvStyle('character')}
                    className={cn(
                      'px-1.5 py-0.5 text-10 font-medium rounded transition-colors',
                      avStyle === 'character' ? 'bg-background text-foreground shadow-xs font-semibold' : 'text-muted-foreground'
                    )}
                  >
                    Char
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 text-10 font-mono text-muted-foreground">
                <span className="px-1.5 py-0.5 rounded bg-muted/60">模式: {avStyle}</span>
                <span className="px-1.5 py-0.5 rounded bg-muted/60">60 几何哈希</span>
                <button
                  type="button"
                  onClick={() => setAvShadow(!avShadow)}
                  className="px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted text-accent-purple"
                >
                  {avShadow ? '阴影: 开' : '阴影: 关'}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <span className="text-10 text-muted-foreground">测试智能体 Handle:</span>
              <div className="flex flex-wrap gap-1">
                {agentPresets.slice(0, 4).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setAgentSeed(p)}
                    className={cn(
                      'px-1.5 py-0.5 rounded text-10 font-mono transition-colors',
                      agentSeed === p ? 'bg-accent-purple text-white font-semibold' : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    @{p.split('-')[0]}
                  </button>
                ))}
              </div>
            </div>
            <Input
              value={agentSeed}
              onChange={(e) => setAgentSeed(e.target.value || 'agent')}
              placeholder="输入智能体标识…"
              className="h-7 text-xs font-mono"
            />
          </div>
        </div>
      </div>

      {/* 全景团队画廊 */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
            <Users className="size-3.5 text-primary" />
            全景人机协同画廊（人类同事 react-nice-avatar vs AI 同事 avvvatars）
          </span>
          <span className="text-10 text-muted-foreground font-mono">2 大引擎 · 12 位协同成员</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* 人类同事阵列 */}
          <div className="rounded-xl border border-border/80 bg-background p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <span className="text-xs font-semibold text-accent-blue flex items-center gap-1">
                <User className="size-3" /> 人类工程师与产品团队
              </span>
              <Badge variant="outline" className="text-10 text-accent-blue border-accent-blue/30">插画肖像</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {humanTeam.map((h) => (
                <div key={h.name} className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                  <div className="relative size-11 rounded-full overflow-hidden border border-border/60 shadow-xs mb-1.5">
                    <NiceAvatar style={{ width: '100%', height: '100%' }} shape="circle" {...genConfig(h.name)} />
                    <span className={cn(
                      'absolute bottom-0 right-0 size-2.5 rounded-full border border-background',
                      h.status === 'online' ? 'bg-accent-green' : h.status === 'busy' ? 'bg-accent-yellow' : 'bg-muted-foreground'
                    )} />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate max-w-24">{h.name}</span>
                  <span className="text-10 text-muted-foreground truncate max-w-24">{h.role}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AI 同事智能体阵列 */}
          <div className="rounded-xl border border-border/80 bg-background p-3 space-y-2.5">
            <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
              <span className="text-xs font-semibold text-accent-purple flex items-center gap-1">
                <Bot className="size-3" /> AI 智能体执行面
              </span>
              <Badge variant="outline" className="text-10 text-accent-purple border-accent-purple/30">算法几何</Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {agentTeam.map((a) => (
                <div key={a.handle} className="flex flex-col items-center text-center p-2 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/40 transition-colors">
                  <div className="relative size-11 rounded-full overflow-hidden border border-border/60 shadow-xs mb-1.5 flex items-center justify-center">
                    <Avvvatars value={a.handle} size={44} style={avStyle} shadow={false} />
                    <span className={cn(
                      'absolute bottom-0 right-0 size-2.5 rounded-full border border-background',
                      a.status === 'active' ? 'bg-accent-purple animate-pulse' : 'bg-muted-foreground'
                    )} />
                  </div>
                  <span className="text-xs font-medium text-foreground truncate max-w-24">{a.name}</span>
                  <span className="text-10 text-accent-purple font-mono truncate max-w-24">@{a.handle}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 架构裁决横幅 */}
      <div className="rounded-lg border border-accent-green/30 bg-accent-green/5 p-3.5 text-xs space-y-1.5">
        <div className="flex items-center gap-2 text-accent-green font-semibold">
          <CheckCircle2 className="size-4" />
          <span>架构裁决：已舍弃其余非标方案，确立人类 (react-nice-avatar) 与 AI (avvvatars) 唯一标准</span>
        </div>
        <p className="text-11 text-muted-foreground leading-relaxed">
          全仓统一由 <code>MemberAvatar</code> 组件自动承接：人类成员根据名称或标识确定性生成精美人物肖像；AI 智能体自动渲染极具未来感的算法几何符号。无需配置外部图片或 CDN，在离线与 Tauri 桌面端具备 100% 稳定性与极致性能。
        </p>
      </div>
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
      <span className="inline-flex items-center text-11 px-2 py-0.5 rounded-md border border-dashed border-border text-muted-foreground/50">
        {cfg.label}
      </span>
    )
  }
  if (passed) {
    return (
      <span className={cn('inline-flex items-center gap-1 text-11 px-2 py-0.5 rounded-md border border-transparent', cfg.bg, cfg.color)}>
        <Check className="w-2.5 h-2.5" /> {cfg.label}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-11 px-2 py-0.5 rounded-md border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
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
    <span className={cn('inline-flex items-center text-11 font-medium px-2 py-0.5 rounded-md border', colors[status])}>
      {name}
    </span>
  )
}

export function DesignSystemPage() {
  const [activeSection, setActiveSection] = React.useState('colors')
  const [navSearch, setNavSearch] = React.useState('')
  const [sliderVal, setSliderVal] = React.useState(40)
  const [groupCollapsed, setGroupCollapsed] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [alertOpen, setAlertOpen] = React.useState(false)
  const [segValue, setSegValue] = React.useState<string>('list')
  const [ownerValue, setOwnerValue] = React.useState('')

  const mainRef = React.useRef<HTMLElement | null>(null)
  const navRef = React.useRef<HTMLElement | null>(null)
  const isScrollingProgrammaticallyRef = React.useRef(false)

  const scrollTo = (id: string) => {
    setActiveSection(id)
    isScrollingProgrammaticallyRef.current = true

    const el = document.getElementById(id)
    if (el && mainRef.current) {
      const mainEl = mainRef.current
      const mainRect = mainEl.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const targetTop = mainEl.scrollTop + (elRect.top - mainRect.top) - 20
      mainEl.scrollTo({
        top: Math.max(0, targetTop),
        behavior: 'smooth',
      })
    }

    window.setTimeout(() => {
      isScrollingProgrammaticallyRef.current = false
    }, 600)
  }

  const filteredSections = React.useMemo(() => {
    if (!navSearch.trim()) return SECTIONS
    const q = navSearch.toLowerCase()
    return SECTIONS.filter(
      (s) =>
        s.label.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.group.toLowerCase().includes(q),
    )
  }, [navSearch])

  const grouped = React.useMemo(
    () =>
      SECTION_GROUPS.map((g) => ({
        label: g,
        items: filteredSections.filter((s) => s.group === g),
      })).filter((g) => g.items.length > 0),
    [filteredSections],
  )

  const handleMainScroll = (e: React.UIEvent<HTMLElement>) => {
    if (isScrollingProgrammaticallyRef.current) return
    const el = e.currentTarget
    const mainTop = el.getBoundingClientRect().top
    let found = activeSection
    for (const s of SECTIONS) {
      const node = document.getElementById(s.id)
      if (node) {
        const offset = node.getBoundingClientRect().top - mainTop
        if (offset <= 140) {
          found = s.id
        }
      }
    }
    if (found && found !== activeSection) {
      setActiveSection(found)
    }
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-background">

      {/* 左侧独立侧边栏：单独的滚动条，不跟右边共用，顶部常驻固定 */}
      <aside className="w-56 shrink-0 border-r border-border h-full flex flex-col bg-background/95 select-none">
        <div className="p-3.5 border-b border-border space-y-2.5 shrink-0 bg-background">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">Design System</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-10 font-bold bg-violet-500 text-white uppercase tracking-wide">
                DEV
              </span>
            </div>
          </div>
          {/* 快速搜索框 */}
          <div className="relative">
            <Search className="absolute left-2 top-2 size-3.5 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={navSearch}
              onChange={(e) => setNavSearch(e.target.value)}
              placeholder="搜索组件或 Token…"
              className="w-full h-7 pl-7 pr-6 text-xs rounded-md border border-border bg-muted/40 placeholder:text-muted-foreground/60 focus:bg-background focus:outline-hidden focus:border-accent-blue transition-colors"
            />
            {navSearch && (
              <button
                type="button"
                onClick={() => setNavSearch('')}
                className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </button>
            )}
          </div>
        </div>

        {/* 侧栏导航：具有独立的垂直滚动条 */}
        <nav ref={navRef} className="flex-1 overflow-y-auto p-2 space-y-3">
          {grouped.length === 0 ? (
            <p className="px-2 py-4 text-xs text-muted-foreground text-center">无匹配项</p>
          ) : (
            grouped.map((g) => (
              <div key={g.label}>
                <p className="px-2.5 pb-1 text-10 font-bold text-muted-foreground/60 uppercase tracking-widest">
                  {g.label}
                </p>
                {g.items.map((s) => {
                  const isActive = activeSection === s.id
                  return (
                    <button
                      key={s.id}
                      onClick={() => scrollTo(s.id)}
                      className={cn(
                        'w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors flex items-center justify-between',
                        isActive
                          ? 'bg-accent text-foreground font-semibold shadow-xs'
                          : 'text-muted-foreground hover:text-foreground hover:bg-accent/60',
                      )}
                    >
                      <span className="truncate">{s.label}</span>
                      {isActive && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-blue shrink-0 ml-1.5" />
                      )}
                    </button>
                  )
                })}
              </div>
            ))
          )}
        </nav>
      </aside>

      {/* 右侧主视口：具有独立的垂直滚动条，滚动不影响左侧栏 */}
      <main
        ref={mainRef}
        className="flex-1 h-full overflow-y-auto"
        onScroll={handleMainScroll}
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
                <SubLabel>AvatarPickerField（人类插画肖像 + AI 算法几何 + 自定义 URL）</SubLabel>
                <AvatarPickerShowcase />
              </div>
              <div>
                <SubLabel>MemberAvatar 实体头像矩阵（人类: NiceAvatar 插画 vs AI: Avvvatars 几何 · 5 级尺寸阶梯）</SubLabel>
                <div className="space-y-3 rounded-lg border border-border/70 p-3.5 bg-muted/10 max-w-2xl">
                  {/* 人类成员尺寸阶梯 */}
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 font-medium">人类成员:</span>
                    {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                      <div key={sz} className="flex flex-col items-center gap-1">
                        <MemberAvatar
                          size={sz}
                          member={{
                            type: 'human',
                            displayName: 'Alex Chen',
                            handle: 'alex',
                            isOnline: true,
                          }}
                        />
                        <span className="text-10 text-muted-foreground font-mono">{sz}</span>
                      </div>
                    ))}
                    {/* Fallback 纯文本模式 */}
                    <div className="flex flex-col items-center gap-1">
                      <MemberAvatar
                        size="md"
                        useInitials
                        member={{
                          type: 'human',
                          displayName: 'Sarah Connor',
                          handle: 'sarah',
                          isOnline: false,
                        }}
                      />
                      <span className="text-10 text-muted-foreground font-mono">initials</span>
                    </div>
                  </div>

                  {/* AI 智能体尺寸阶梯 */}
                  <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-border/50">
                    <span className="text-xs text-muted-foreground w-24 shrink-0 font-medium">AI 智能体:</span>
                    {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((sz) => (
                      <div key={sz} className="flex flex-col items-center gap-1">
                        <MemberAvatar
                          size={sz}
                          member={{
                            type: 'ai_agent',
                            displayName: 'Claude Coder',
                            handle: 'claude-coder',
                            isOnline: true,
                          }}
                        />
                        <span className="text-10 text-muted-foreground font-mono">{sz}</span>
                      </div>
                    ))}
                    {/* AI 字符模式 */}
                    <div className="flex flex-col items-center gap-1">
                      <MemberAvatar
                        size="md"
                        avvvatarsStyle="character"
                        member={{
                          type: 'ai_agent',
                          displayName: 'DeepSeek Architect',
                          handle: 'deepseek-r1',
                          isOnline: true,
                        }}
                      />
                      <span className="text-10 text-muted-foreground font-mono">char-mode</span>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <SubLabel>双表面头像系统实装展台（人类: react-nice-avatar × AI: avvvatars）</SubLabel>
                <AvatarModernizationShowcase />
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
                  <RadioGroup defaultValue="beta">
                    {['Alpha', 'Beta', 'Gamma'].map((v) => (
                      <div key={v} className="flex items-center gap-2">
                        <RadioGroupItem value={v.toLowerCase()} id={`r-${v}`} />
                        <Label htmlFor={`r-${v}`} className="text-xs cursor-pointer">{v}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
                <div className="space-y-3">
                  <SubLabel>Slider</SubLabel>
                  <Slider min={0} max={100} value={sliderVal} onValueChange={(v) => setSliderVal(Number(v))} />
                  <p className="text-xs text-muted-foreground">Value: {sliderVal}</p>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="number-field">
            <SectionTitle>Number Field</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss 配方（base-ui NumberField）——步进按钮 / 键盘上下键 / 滚轮调值，任务估时已在用。</p>
            <NumberFieldDemo />
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="autocomplete">
            <SectionTitle>Autocomplete</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss 配方（base-ui Autocomplete）——自由输入 + 建议 过滤，适合 @提及 / label 输入类场景。</p>
            <AutocompleteDemo />
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="checkbox-group">
            <SectionTitle>Checkbox Group</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss Checkbox（分层阴影 + 勾选填充 + indeterminate）+ CheckboxGroup 组值管理。</p>
            <CheckboxGroupDemo />
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

          <SectionAnchor id="toast">
            <SectionTitle>Toast</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss Toast（base-ui 配方，2026-08 替换 sonner）——堆叠/悬停展开/滑动关闭；命令式 API 兼容历史 toast.success/error/…。</p>
            <ToastDemo />
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

          <SectionAnchor id="meter">
            <SectionTitle>Meter</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss 配方（base-ui Meter）——有界量程表（配额 / 用量），语义不同于 Progress（进度）。</p>
            <MeterDemo />
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
                        <p className="text-xs">Settings <kbd className="ml-1 px-1 rounded bg-muted text-10">⌘,</kbd></p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>
              <div>
                <SubLabel>Dropdown Menu</SubLabel>
                <div className="flex gap-8 items-start flex-wrap">
                  <div className="space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="outline" />}>
                        <MoreHorizontal className="w-4 h-4" /> Actions
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem><Edit2 className="w-4 h-4" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem><Star className="w-4 h-4" /> Favorite</DropdownMenuItem>
                        <DropdownMenuItem><ExternalLink className="w-4 h-4" /> Open in new tab</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="space-y-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" />}>
                        <MoreHorizontal className="w-4 h-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem><Share2 className="w-4 h-4" /> Share</DropdownMenuItem>
                        <DropdownMenuItem><Bookmark className="w-4 h-4" /> Bookmark</DropdownMenuItem>
                        <DropdownMenuItem><Download className="w-4 h-4" /> Export</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="menu">
            <SectionTitle>Menu (coss)</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss Menu 标准件（分组/勾选/单选/子菜单/快捷键/破坏性项）+ coss 设计的右键菜单弹出层。</p>
            <MenuDemo />
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
                <SubLabel>Sheet — right side panel</SubLabel>
                <Sheet>
                  <SheetTrigger render={<Button variant="outline" />}>Open Sheet</SheetTrigger>
                  <SheetContent className="w-full max-w-sm rounded-l-lg">
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
                <SubLabel>Drawer — bottom sheet</SubLabel>
                <Drawer>
                  <DrawerTrigger render={<Button variant="outline" />}>Open Drawer</DrawerTrigger>
                  <DrawerContent className="mx-auto w-full max-w-md">
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
                  <PopoverTrigger
                    render={
                      <Button variant="outline" size="sm" className="gap-2">
                        <Bell className="w-4 h-4" /> Notifications
                      </Button>
                    }
                  />
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
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="hover-card">
            <SectionTitle>Hover Card（浮动预览卡片）</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              用于光标悬停在触发元素时呈现上下文补充信息、富实体预览或路由直觉感知。基于{' '}
              <code className="font-mono text-11 bg-muted px-1 py-0.5 rounded">@base-ui/react/preview-card</code>{' '}
              封装，支持避障定位、无障碍语义与开闭过渡动画。
            </p>

            <div className="space-y-8">
              {/* ① 尺寸规范阶梯 */}
              <div>
                <SubLabel>① 尺寸规格阶梯（Sizes: sm / md / lg / xl）</SubLabel>
                <div className="flex flex-wrap items-center gap-4">
                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono text-accent-blue hover:underline">
                      size="sm" (w-56)
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Compact Card</span>
                          <Badge variant="outline" className="text-10 px-1">sm</Badge>
                        </div>
                        <p className="text-11 text-muted-foreground leading-relaxed">
                          适用于窄栏、密集表格单元格或单行轻量指标说明。
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono text-accent-blue hover:underline">
                      size="md" (w-64 · 默认)
                    </HoverCardTrigger>
                    <HoverCardContent size="md">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Standard Card</span>
                          <Badge variant="outline" className="text-10 px-1">md</Badge>
                        </div>
                        <p className="text-11 text-muted-foreground leading-relaxed">
                          通用默认卡片宽度，满足绝大部分简短详情与状态预览。
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono text-accent-blue hover:underline">
                      size="lg" (w-72 · 路由标准)
                    </HoverCardTrigger>
                    <HoverCardContent size="lg">
                      <HoverCardArrow />
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Large Card + Arrow</span>
                          <Badge variant="secondary" className="text-10 px-1">lg</Badge>
                        </div>
                        <p className="text-11 text-muted-foreground leading-relaxed">
                          对齐 <code>route-preview</code> 规范标准宽，兼顾内容信息量与弹出留白。
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono text-accent-blue hover:underline">
                      size="xl" (w-80 · 富实体宽)
                    </HoverCardTrigger>
                    <HoverCardContent size="xl">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-foreground">Extra Large Card</span>
                          <Badge variant="secondary" className="text-10 px-1">xl</Badge>
                        </div>
                        <p className="text-11 text-muted-foreground leading-relaxed">
                          用于成员履历、AI 智能体运行态面板等高信息密度复合组件展示。
                        </p>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* ② 方位与对齐矩阵 */}
              <div>
                <SubLabel>② 四向方位与对齐矩阵（Placements &amp; Alignments）</SubLabel>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
                  {(['top', 'bottom', 'left', 'right'] as const).map((side) => (
                    <div key={side} className="p-3 rounded-lg border border-border/60 bg-muted/10 flex flex-col items-center gap-2">
                      <span className="text-10 font-mono text-muted-foreground uppercase">side="{side}"</span>
                      <HoverCard>
                        <HoverCardTrigger
                          render={
                            <Button variant="outline" size="sm" className="h-7 text-xs">
                              Hover {side}
                            </Button>
                          }
                        />
                        <HoverCardContent side={side} size="sm">
                          <HoverCardArrow />
                          <p className="text-xs font-medium text-foreground">side="{side}"</p>
                          <p className="text-10 text-muted-foreground mt-0.5">自动避障且居中锚定</p>
                        </HoverCardContent>
                      </HoverCard>
                    </div>
                  ))}
                </div>
              </div>

              {/* ③ 箭头与视觉修饰对比 */}
              <div>
                <SubLabel>③ 视觉修饰对比（无箭头默认 vs 显式气泡箭头 HoverCardArrow）</SubLabel>
                <div className="flex flex-wrap items-center gap-6">
                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted">
                      无箭头平整卡片（Clean Minimal）
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <p className="text-xs font-semibold text-foreground">无箭头紧凑浮层</p>
                      <p className="text-11 text-muted-foreground mt-1">适合紧贴在按钮或操作栏下方的提示。</p>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs text-muted-foreground hover:text-foreground underline decoration-dotted">
                      带气泡指向箭头（With HoverCardArrow）
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <HoverCardArrow />
                      <p className="text-xs font-semibold text-foreground">带指向箭头</p>
                      <p className="text-11 text-muted-foreground mt-1">显式放入 children，明确视觉指示来源。</p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* ④ 延迟策略 */}
              <div>
                <SubLabel>④ 响应延迟策略（Timings: 即时调试 vs 防误触人机工程）</SubLabel>
                <div className="flex flex-wrap items-center gap-4">
                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground">
                      delay=0 (即时)
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <p className="text-xs font-medium text-foreground">即时展开 (0ms)</p>
                      <p className="text-11 text-muted-foreground mt-1">鼠标触碰瞬间展开，适合调试测试。</p>
                    </HoverCardContent>
                  </HoverCard>

                  <HoverCard>
                    <HoverCardTrigger href="#" className="text-xs font-mono px-2 py-1 rounded bg-muted/60 hover:bg-muted text-foreground">
                      delay=300 · closeDelay=150 (推荐生产配置)
                    </HoverCardTrigger>
                    <HoverCardContent size="sm">
                      <HoverCardArrow />
                      <p className="text-xs font-medium text-foreground">推荐延迟 (300ms/150ms)</p>
                      <p className="text-11 text-muted-foreground mt-1">避免鼠标横穿屏幕时引发走马灯式闪烁。</p>
                    </HoverCardContent>
                  </HoverCard>
                </div>
              </div>

              {/* ⑤ 真实业务场景卡片全景 */}
              {/* ⑤ APM 全流程核心业务卡片矩阵（6 大核心业务深度特色） */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <SubLabel>⑤ APM 全流程核心业务卡片矩阵（统一架构 × 模块特色）</SubLabel>
                  <span className="text-10 text-muted-foreground">
                    严格遵循「四层三列」外舒内紧架构，突出各模块专属第一视觉信号 (Hero Visual)
                  </span>
                </div>

                {/* A. 交互悬停体验栏 (Interactive Hover Triggers) */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-2">
                  <p className="text-11 font-medium text-foreground">
                    交互悬浮测试（鼠标滑过以下实体，检验定位避障、气泡箭头与浮层开闭手感）：
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 1. 任务卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <CheckSquare className="size-3.5 text-accent-blue" />
                        <span className="group-hover:text-accent-blue">任务: #ISSUE-104</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                              <CheckSquare className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              重构 Design System 侧栏导航与悬停规范
                            </span>
                            <Badge variant="outline" className="text-10 shrink-0">Task</Badge>
                          </div>
                          {/* Hero 带：状态 + 优先级 + 迭代 */}
                          <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                            <div className="flex items-center gap-1.5">
                              <StatusPill tone="info">In Progress</StatusPill>
                              <span className="inline-flex items-center gap-1 text-10 text-accent-red font-medium">
                                <Flag className="size-2.5 fill-accent-red" /> High
                              </span>
                            </div>
                            <span className="text-10 font-mono text-muted-foreground">Sprint 24</span>
                          </div>
                          <PreviewSection title="工单属性">
                            <PreviewRow label="负责人">
                              <div className="flex items-center gap-1.5">
                                <MemberAvatar
                                  size="xs"
                                  member={{
                                    type: 'human',
                                    displayName: 'Alex Chen',
                                    handle: 'alex',
                                    isOnline: true,
                                  }}
                                />
                                <span>Alex Chen (@alex)</span>
                              </div>
                            </PreviewRow>
                            <PreviewRow label="所属项目">Agent Project Manager</PreviewRow>
                            <PreviewRow label="工时进度">
                              <div className="flex items-center gap-2 flex-1">
                                <Progress value={62} className="h-1.5 flex-1" />
                                <span className="font-mono text-10 text-muted-foreground">2.5h / 4h</span>
                              </div>
                            </PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>分支: <code>feat/design-system</code></span>
                            <span className="ml-auto font-mono text-10">截止 2026-09-15</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 2. 缺陷阻断卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent-red/30 bg-accent-red/5 hover:bg-accent-red/10 text-xs font-medium text-accent-red transition-colors group">
                        <Bug className="size-3.5" />
                        <span className="group-hover:underline">缺陷: #BUG-42 (阻断)</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
                              <Bug className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              工作区路由并发死锁（阻断发版）
                            </span>
                            <Badge variant="destructive" className="text-10 shrink-0">Bug</Badge>
                          </div>
                          {/* Hero 带：严重性标尺 + 阻断发版警示 */}
                          <div className="flex items-center justify-between p-2 rounded-md bg-accent-red/10 border border-accent-red/30">
                            <div className="flex items-center gap-2">
                              <SeverityBar severity="critical" />
                              <span className="text-10 font-bold text-accent-red uppercase tracking-wider">
                                阻塞发布 (Blocker)
                              </span>
                            </div>
                            <StatusPill tone="danger">Open</StatusPill>
                          </div>
                          <PreviewSection title="排查上下文">
                            <PreviewRow label="复现环境">Node 20.14 · SQLite WAL · macOS 15</PreviewRow>
                            <PreviewRow label="根因分类">AsyncLocalStorage 作用域穿透竞态</PreviewRow>
                            <PreviewRow label="修复关联">已关联工单 #ISSUE-112</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span className="text-accent-red flex items-center gap-1 font-medium">
                              <AlertCircle className="size-3" /> P0 紧急响应中
                            </span>
                            <span className="ml-auto font-mono text-10">报障人: @qa-bot</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 3. 工程治理验收卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent-green/30 bg-accent-green/5 hover:bg-accent-green/10 text-xs font-medium text-accent-green transition-colors group">
                        <ShieldCheck className="size-3.5" />
                        <span className="group-hover:underline">验收: ACC-2026-09</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="xl">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-green/10 text-accent-green">
                              <ShieldCheck className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              v2.4 核心质量门禁收口与闭环
                            </span>
                            <Badge variant="secondary" className="text-10 shrink-0 text-accent-green bg-accent-green/10">
                              Acceptance
                            </Badge>
                          </div>
                          {/* Hero 带：门禁通过率点阵 + 进度 */}
                          <div className="space-y-1.5 p-2 rounded-md bg-accent-green/10 border border-accent-green/30">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-semibold text-accent-green flex items-center gap-1">
                                <CheckCircle2 className="size-3.5" /> 门禁通过率: 3/4 Passed
                              </span>
                              <span className="font-mono text-10 font-bold text-accent-green">75%</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="h-1.5 flex-1 rounded-full bg-accent-green" title="单测覆盖率: Passed" />
                              <span className="h-1.5 flex-1 rounded-full bg-accent-green" title="API 契约零漂移: Passed" />
                              <span className="h-1.5 flex-1 rounded-full bg-accent-green" title="文档同步对齐: Passed" />
                              <span className="h-1.5 flex-1 rounded-full bg-accent-yellow animate-pulse" title="破坏性静态扫描: Pending" />
                            </div>
                          </div>
                          <PreviewSection title="证据回流与治理">
                            <PreviewRow label="证据链">12 条 CI/PR 自动化回流证据</PreviewRow>
                            <PreviewRow label="AI 代写状态">AI 同事已草拟验收标准，待人审签署</PreviewRow>
                            <PreviewRow label="阻断风险">1 项破坏性代码扫描待确认</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span className="text-accent-yellow flex items-center gap-1 font-medium">
                              <Clock className="size-3" /> 等待人工签署确认
                            </span>
                            <span className="ml-auto font-mono text-10">对应 #ISSUE-104</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 4. 项目全景卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <FolderKanban className="size-3.5 text-primary" />
                        <span className="group-hover:text-primary">项目: Nebula Core</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                              <FolderKanban className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              Nebula Core (AgentPM 核心平台)
                            </span>
                            <Badge variant="outline" className="text-10 shrink-0">Project</Badge>
                          </div>
                          {/* Hero 带：健康度 + 交付进度 */}
                          <div className="space-y-1.5 pb-1 border-b border-border/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <StatusPill tone="success">On Track</StatusPill>
                                <span className="text-11 font-medium text-foreground">健康度 94 分</span>
                              </div>
                              <span className="text-10 font-mono text-muted-foreground">已完成 48/60 工单</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={80} className="h-1.5 flex-1" />
                              <span className="font-mono text-10 text-muted-foreground">80%</span>
                            </div>
                          </div>
                          <PreviewSection title="项目大盘">
                            <PreviewRow label="核心仓库">agent-project-manager (develop)</PreviewRow>
                            <PreviewRow label="协作团队">4 位人类工程师 + 2 位 AI 同事</PreviewRow>
                            <PreviewRow label="双轨成本">累计 186k Tokens ($1.42) · 38h</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>负责人: @alex</span>
                            <span className="ml-auto font-mono text-10">目标 GA: 2026-09-30</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 5. AI 执行与审批卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent-purple/30 bg-accent-purple/5 hover:bg-accent-purple/10 text-xs font-medium text-accent-purple transition-colors group">
                        <Bot className="size-3.5" />
                        <span className="group-hover:underline">执行审批: EXEC-891</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="xl">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-purple/10 text-accent-purple">
                              <Bot className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              EXEC-891: 全局样式 Token 批量重构
                            </span>
                            <Badge variant="outline" className="text-10 shrink-0 text-accent-purple border-accent-purple/40">
                              Execution
                            </Badge>
                          </div>
                          {/* Hero 带：等待审批 + 冷却倒计时 + 双轨消耗 */}
                          <div className="p-2 rounded-md bg-accent-purple/10 border border-accent-purple/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-accent-purple flex items-center gap-1">
                                <Clock className="size-3" /> 等待人审决议 (Pending Approval)
                              </span>
                              <span className="text-10 font-mono px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red font-semibold">
                                高风险拦截
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DualTrackMetricPill tokens={4280} durationMs={2400} costUsd={0.0064} model="Claude 3.7" />
                            </div>
                          </div>
                          <PreviewSection title="执行影响分析">
                            <PreviewRow label="触发源">CLI Dispatch (`claude-code` 运行时)</PreviewRow>
                            <PreviewRow label="破坏性评估">波及 14 个组件，涉及 28 处基础色板变更</PreviewRow>
                            <PreviewRow label="回滚保护">Git Worktree 独立隔离，支持一键丢弃</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span className="text-accent-purple font-medium">3s 冷却门禁已解除</span>
                            <span className="ml-auto font-mono text-10">按键 1 确认 / 2 驳回</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 6. 版本发布卡 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-accent-orange/30 bg-accent-orange/5 hover:bg-accent-orange/10 text-xs font-medium text-accent-orange transition-colors group">
                        <Rocket className="size-3.5" />
                        <span className="group-hover:underline">发版: Release v2.4.0</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-orange/10 text-accent-orange">
                              <Rocket className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              Release v2.4.0 (Spring GA 稳定版)
                            </span>
                            <Badge variant="outline" className="text-10 shrink-0 text-accent-orange border-accent-orange/40">
                              Release
                            </Badge>
                          </div>
                          {/* Hero 带：发布状态 + Git Tag + 门禁收口 */}
                          <div className="space-y-1.5 pb-1 border-b border-border/50">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <StatusPill tone="success">Published</StatusPill>
                                <span className="text-11 font-mono font-medium text-foreground">tag: v2.4.0</span>
                              </div>
                              <span className="text-10 font-mono text-muted-foreground">commit 9f8e12a</span>
                            </div>
                            <div className="flex items-center justify-between text-10 text-muted-foreground pt-0.5">
                              <span className="flex items-center gap-1 text-accent-green font-medium">
                                <ShieldCheck className="size-3" /> 门禁归档 100% 审计闭环
                              </span>
                              <span className="font-mono">4/4 全绿</span>
                            </div>
                          </div>
                          <PreviewSection title="发版资产与元数据">
                            <PreviewRow label="变更真相源">CHANGELOG.md (单向再生完成)</PreviewRow>
                            <PreviewRow label="归档工单">28 项工单 · 6 项治理验收闭环</PreviewRow>
                            <PreviewRow label="多端分发">Web (Vite) / Desktop (Tauri) / CLI</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>签发人: @alex (双签审计)</span>
                            <span className="ml-auto font-mono text-10">2026-09-11 GA</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>

                {/* B. 全景平铺审查画廊 (Expanded Spec Gallery) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-11 font-medium text-foreground">
                      全景平铺审查画廊（无需悬停，直接对比各模块卡片的统一底盘与差异化第一视觉）：
                    </p>
                    <Badge variant="secondary" className="text-10">静态展开对比</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* 卡片 1: 任务工单卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                            <CheckSquare className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            #ISSUE-104: 重构侧栏与 HoverCard
                          </span>
                          <Badge variant="outline" className="text-10 shrink-0">Task</Badge>
                        </div>
                        <div className="flex items-center justify-between pb-1.5 border-b border-border/50">
                          <div className="flex items-center gap-1.5">
                            <StatusPill tone="info">In Progress</StatusPill>
                            <span className="inline-flex items-center gap-1 text-10 text-accent-red font-medium">
                              <Flag className="size-2.5 fill-accent-red" /> High
                            </span>
                          </div>
                          <span className="text-10 font-mono text-muted-foreground">Sprint 24</span>
                        </div>
                        <PreviewSection title="工单属性">
                          <PreviewRow label="负责人">@alex (Alex Chen)</PreviewRow>
                          <PreviewRow label="所属项目">Agent Project Manager</PreviewRow>
                          <PreviewRow label="工时进度">2.5h / 4h (62%)</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>分支: <code>feat/design-system</code></span>
                        <span className="ml-auto font-mono text-10">截止 09-15</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 2: 缺陷阻断卡 */}
                    <div className="rounded-xl border border-accent-red/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-red/10 text-accent-red">
                            <Bug className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            #BUG-42: 工作区路由并发死锁
                          </span>
                          <Badge variant="destructive" className="text-10 shrink-0">Bug</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-accent-red/10 border border-accent-red/30">
                          <div className="flex items-center gap-2">
                            <SeverityBar severity="critical" />
                            <span className="text-10 font-bold text-accent-red uppercase tracking-wider">
                              阻塞发布 (Blocker)
                            </span>
                          </div>
                          <StatusPill tone="danger">Open</StatusPill>
                        </div>
                        <PreviewSection title="排查上下文">
                          <PreviewRow label="复现环境">Node 20.14 · SQLite WAL</PreviewRow>
                          <PreviewRow label="根因分类">AsyncLocalStorage 穿透竞态</PreviewRow>
                          <PreviewRow label="修复关联">关联工单 #ISSUE-112</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span className="text-accent-red flex items-center gap-1 font-medium">
                          <AlertCircle className="size-3" /> P0 紧急响应中
                        </span>
                        <span className="ml-auto font-mono text-10">@qa-bot</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 3: 工程验收卡 */}
                    <div className="rounded-xl border border-accent-green/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-green/10 text-accent-green">
                            <ShieldCheck className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            ACC-2026-09: 核心门禁收口
                          </span>
                          <Badge variant="secondary" className="text-10 shrink-0 text-accent-green bg-accent-green/10">
                            Acceptance
                          </Badge>
                        </div>
                        <div className="space-y-1.5 p-2 rounded-md bg-accent-green/10 border border-accent-green/30">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-accent-green flex items-center gap-1">
                              <CheckCircle2 className="size-3.5" /> 门禁通过率: 3/4 Passed
                            </span>
                            <span className="font-mono text-10 font-bold text-accent-green">75%</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="h-1.5 flex-1 rounded-full bg-accent-green" />
                            <span className="h-1.5 flex-1 rounded-full bg-accent-green" />
                            <span className="h-1.5 flex-1 rounded-full bg-accent-green" />
                            <span className="h-1.5 flex-1 rounded-full bg-accent-yellow animate-pulse" />
                          </div>
                        </div>
                        <PreviewSection title="证据回流与治理">
                          <PreviewRow label="证据链">12 条 CI/PR 回流证据</PreviewRow>
                          <PreviewRow label="AI 审计状态">AI 已草拟标准，待人审</PreviewRow>
                          <PreviewRow label="阻断风险">1 项静态扫描待裁决</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span className="text-accent-yellow flex items-center gap-1 font-medium">
                          <Clock className="size-3" /> 等待签署确认
                        </span>
                        <span className="ml-auto font-mono text-10">#ISSUE-104</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 4: 项目全景卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <FolderKanban className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            Nebula Core
                          </span>
                          <Badge variant="outline" className="text-10 shrink-0">Project</Badge>
                        </div>
                        <div className="space-y-1.5 pb-1 border-b border-border/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <StatusPill tone="success">On Track</StatusPill>
                              <span className="text-11 font-medium text-foreground">健康度 94 分</span>
                            </div>
                            <span className="text-10 font-mono text-muted-foreground">48/60 工单</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Progress value={80} className="h-1.5 flex-1" />
                            <span className="font-mono text-10 text-muted-foreground">80%</span>
                          </div>
                        </div>
                        <PreviewSection title="项目大盘">
                          <PreviewRow label="核心仓库">agent-project-manager</PreviewRow>
                          <PreviewRow label="协作团队">4 位成员 + 2 位 AI</PreviewRow>
                          <PreviewRow label="双轨成本">186k Tokens ($1.42) · 38h</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>负责人: @alex</span>
                        <span className="ml-auto font-mono text-10">GA 09-30</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 5: AI 执行审批卡 */}
                    <div className="rounded-xl border border-accent-purple/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-purple/10 text-accent-purple">
                            <Bot className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            EXEC-891: 全局样式重构
                          </span>
                          <Badge variant="outline" className="text-10 shrink-0 text-accent-purple border-accent-purple/40">
                            Execution
                          </Badge>
                        </div>
                        <div className="p-2 rounded-md bg-accent-purple/10 border border-accent-purple/30 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-accent-purple flex items-center gap-1">
                              <Clock className="size-3" /> 等待人审决议
                            </span>
                            <span className="text-10 font-mono px-1.5 py-0.5 rounded bg-accent-red/20 text-accent-red font-semibold">
                              高风险拦截
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DualTrackMetricPill tokens={4280} durationMs={2400} costUsd={0.0064} model="Claude 3.7" />
                          </div>
                        </div>
                        <PreviewSection title="执行影响分析">
                          <PreviewRow label="触发源">CLI Dispatch (`claude-code`)</PreviewRow>
                          <PreviewRow label="破坏性评估">波及 14 个组件，改动 28 处样式</PreviewRow>
                          <PreviewRow label="回滚保护">Git Worktree 隔离</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span className="text-accent-purple font-medium">3s 门禁已解除</span>
                        <span className="ml-auto font-mono text-10">按键 1 确认 / 2 驳回</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 6: 版本发布归档卡 */}
                    <div className="rounded-xl border border-accent-orange/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-orange/10 text-accent-orange">
                            <Rocket className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            Release v2.4.0-GA
                          </span>
                          <Badge variant="outline" className="text-10 shrink-0 text-accent-orange border-accent-orange/40">
                            Release
                          </Badge>
                        </div>
                        <div className="space-y-1.5 pb-1 border-b border-border/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <StatusPill tone="success">Published</StatusPill>
                              <span className="text-11 font-mono font-medium text-foreground">tag: v2.4.0</span>
                            </div>
                            <span className="text-10 font-mono text-muted-foreground">commit 9f8e12a</span>
                          </div>
                          <div className="flex items-center justify-between text-10 text-muted-foreground pt-0.5">
                            <span className="flex items-center gap-1 text-accent-green font-medium">
                              <ShieldCheck className="size-3" /> 门禁归档闭环
                            </span>
                            <span className="font-mono text-10 text-accent-green font-semibold">100% 审计</span>
                          </div>
                        </div>
                        <PreviewSection title="发版资产与元数据">
                          <PreviewRow label="变更真相源">CHANGELOG.md (单向再生)</PreviewRow>
                          <PreviewRow label="归档工单">28 项工单 · 6 项验收闭环</PreviewRow>
                          <PreviewRow label="多端产物">Web · Desktop · CLI</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>签发人: @alex (双签审计)</span>
                        <span className="ml-auto font-mono text-10">09-11 GA</span>
                      </PreviewFooterMeta>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⑥ 孪生成员卡片体系（Twin Identity Cards: 人类同事 vs AI同事 · 对称底盘 × 异构度量） */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <SubLabel>⑥ 孪生成员卡片体系（Twin Identity Cards: 人类同事 vs AI 同事）</SubLabel>
                  <span className="text-10 text-muted-foreground">
                    双表面核心：相同底盘框架（Header 3列 / 统一 Hero 焦点带 / 统一 PreviewSection），特化异构数据
                  </span>
                </div>

                {/* A. 交互悬停体验栏 */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-2">
                  <p className="text-11 font-medium text-foreground">
                    孪生成员交互悬浮体验（分别悬停人类同事与 AI 同事，体验相同视觉底盘下的异构数据呈现）：
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 人类同事 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <MemberAvatar
                          size="xs"
                          member={{
                            type: 'human',
                            displayName: 'Alex Chen',
                            handle: 'alex',
                            isOnline: true,
                          }}
                        />
                        <span className="group-hover:text-accent-blue">人类同事: Alex Chen (@alex)</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="xl">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          {/* 统一三列 Header */}
                          <div className="flex items-start gap-3">
                            <MemberAvatar
                              size="lg"
                              member={{
                                type: 'human',
                                displayName: 'Alex Chen',
                                handle: 'alex',
                                isOnline: true,
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-foreground truncate">Alex Chen</h4>
                                <span className="inline-flex items-center gap-1 text-10 text-accent-green font-medium">
                                  <span className="size-1.5 rounded-full bg-accent-green" /> 在职在线
                                </span>
                              </div>
                              <p className="text-11 text-muted-foreground truncate">资深全栈架构师 · @alex</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <TrustLevelBadge level={2} score={88} />
                                <Badge variant="outline" className="text-10 py-0">PR 评审 / 生产发布</Badge>
                              </div>
                            </div>
                          </div>
                          {/* Hero 焦点带：工时负荷 + 技术栈 */}
                          <div className="p-2 rounded-md bg-muted/40 border border-border/60 space-y-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-11 font-medium text-foreground flex items-center gap-1">
                                <Activity className="size-3 text-accent-blue" /> 本周负荷 32h / 40h
                              </span>
                              <span className="font-mono text-10 text-muted-foreground">80% · 3 个活跃工单</span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {['React 19', 'NestJS 10', 'Tailwind v4', 'SQLite'].map((tech) => (
                                <span key={tech} className="text-10 font-mono px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground">
                                  {tech}
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* 属性小节 */}
                          <PreviewSection title="协作与职责">
                            <PreviewRow label="所属团队">前端架构组 (Team Lead)</PreviewRow>
                            <PreviewRow label="核心模块">Design System · 实时协同引擎</PreviewRow>
                            <PreviewRow label="当前攻坚">#ISSUE-104: 重构侧栏与 HoverCard</PreviewRow>
                          </PreviewSection>
                          {/* 底部元信息 */}
                          <PreviewFooterMeta>
                            <span className="flex items-center gap-1">
                              <Clock className="size-3 text-muted-foreground" /> 远程 · UTC+8 (5m 前活跃)
                            </span>
                            <span className="ml-auto font-mono text-10">alex@apm.dev</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* AI 同事 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-accent-purple/30 bg-accent-purple/5 hover:bg-accent-purple/10 text-xs font-medium text-accent-purple transition-colors group">
                        <MemberAvatar
                          size="xs"
                          member={{
                            type: 'ai_agent',
                            displayName: 'Claude Coder',
                            handle: 'claude-coder',
                            isOnline: true,
                          }}
                        />
                        <span className="group-hover:underline">AI 同事: Claude Coder (@claude-coder)</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="xl">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          {/* 统一三列 Header */}
                          <div className="flex items-start gap-3">
                            <MemberAvatar
                              size="lg"
                              member={{
                                type: 'ai_agent',
                                displayName: 'Claude Coder',
                                handle: 'claude-coder',
                                isOnline: true,
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-foreground truncate">Claude Coder</h4>
                                <span className="inline-flex items-center gap-1 text-10 text-accent-green font-medium">
                                  <span className="size-1.5 rounded-full bg-accent-green animate-pulse" /> 常驻就绪
                                </span>
                              </div>
                              <p className="text-11 text-muted-foreground truncate">全栈执行 Agent · Claude 3.7 Sonnet</p>
                              <div className="flex items-center gap-1.5 mt-1">
                                <TrustLevelBadge level={3} score={92} />
                                <Badge variant="outline" className="text-10 py-0">自主编码权限</Badge>
                              </div>
                            </div>
                          </div>
                          {/* Hero 焦点带：Token 消耗 + CLI 工具流 */}
                          <div className="p-2 rounded-md bg-accent-purple/10 border border-accent-purple/30 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <DualTrackMetricPill tokens={4280} durationMs={2400} costUsd={0.0064} model="Claude 3.7" />
                            </div>
                            <div className="flex items-center gap-1 flex-wrap">
                              {['Git Worktree', 'CLI Dispatch', 'Jest/Vitest', 'API Contract'].map((tool) => (
                                <span key={tool} className="text-10 font-mono px-1.5 py-0.5 rounded bg-background/80 border border-accent-purple/30 text-accent-purple">
                                  {tool}
                                </span>
                              ))}
                            </div>
                          </div>
                          {/* 属性小节 */}
                          <PreviewSection title="执行表现度量">
                            <PreviewRow label="门禁通过率">96.8% (31/32 门禁一次性通过)</PreviewRow>
                            <PreviewRow label="常驻守护">apm-runtime 节点 #rt-08</PreviewRow>
                            <PreviewRow label="授权边界">自主编码测试 · 生产合流需人审</PreviewRow>
                          </PreviewSection>
                          {/* 底部元信息 */}
                          <PreviewFooterMeta>
                            <span className="text-accent-green flex items-center gap-1">
                              <CheckCircle2 className="size-3" /> 契约巡检零偏差
                            </span>
                            <span className="ml-auto font-mono text-10">活跃分支: feat/*</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>

                {/* B. 孪生卡片对称 1:1 对比画廊 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-11 font-medium text-foreground">
                      孪生卡片 1:1 对称平铺画廊（验证三列头部、中间 Hero 焦点带、PreviewSection 高度节奏一致性）：
                    </p>
                    <Badge variant="secondary" className="text-10">对称规范对比</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl">
                    {/* 左：人类同事卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MemberAvatar
                            size="lg"
                            member={{
                              type: 'human',
                              displayName: 'Alex Chen',
                              handle: 'alex',
                              isOnline: true,
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-foreground truncate">Alex Chen</h4>
                              <span className="inline-flex items-center gap-1 text-10 text-accent-green font-medium">
                                <span className="size-1.5 rounded-full bg-accent-green" /> 在职在线
                              </span>
                            </div>
                            <p className="text-11 text-muted-foreground truncate">资深全栈架构师 · @alex</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <TrustLevelBadge level={2} score={88} />
                              <Badge variant="outline" className="text-10 py-0">PR 评审 / 生产发布</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-2 rounded-md bg-muted/40 border border-border/60 space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-11 font-medium text-foreground flex items-center gap-1">
                              <Activity className="size-3 text-accent-blue" /> 本周负荷 32h / 40h
                            </span>
                            <span className="font-mono text-10 text-muted-foreground">80% · 3 工单</span>
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {['React 19', 'NestJS 10', 'Tailwind v4', 'SQLite'].map((tech) => (
                              <span key={tech} className="text-10 font-mono px-1.5 py-0.5 rounded bg-background border border-border/60 text-muted-foreground">
                                {tech}
                              </span>
                            ))}
                          </div>
                        </div>

                        <PreviewSection title="协作与职责">
                          <PreviewRow label="所属团队">前端架构组 (Team Lead)</PreviewRow>
                          <PreviewRow label="核心模块">Design System · 实时协同引擎</PreviewRow>
                          <PreviewRow label="当前攻坚">#ISSUE-104: 重构侧栏与 HoverCard</PreviewRow>
                        </PreviewSection>
                      </div>

                      <PreviewFooterMeta>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3 text-muted-foreground" /> 远程 · UTC+8 (5m 前活跃)
                        </span>
                        <span className="ml-auto font-mono text-10">alex@apm.dev</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 右：AI 同事卡 */}
                    <div className="rounded-xl border border-accent-purple/40 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-start gap-3">
                          <MemberAvatar
                            size="lg"
                            member={{
                              type: 'ai_agent',
                              displayName: 'Claude Coder',
                              handle: 'claude-coder',
                              isOnline: true,
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-semibold text-foreground truncate">Claude Coder</h4>
                              <span className="inline-flex items-center gap-1 text-10 text-accent-green font-medium">
                                <span className="size-1.5 rounded-full bg-accent-green animate-pulse" /> 常驻就绪
                              </span>
                            </div>
                            <p className="text-11 text-muted-foreground truncate">全栈执行 Agent · Claude 3.7 Sonnet</p>
                            <div className="flex items-center gap-1.5 mt-1">
                              <TrustLevelBadge level={3} score={92} />
                              <Badge variant="outline" className="text-10 py-0">自主编码权限</Badge>
                            </div>
                          </div>
                        </div>

                        <div className="p-2 rounded-md bg-accent-purple/10 border border-accent-purple/30 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <DualTrackMetricPill tokens={4280} durationMs={2400} costUsd={0.0064} model="Claude 3.7" />
                          </div>
                          <div className="flex items-center gap-1 flex-wrap">
                            {['Git Worktree', 'CLI Dispatch', 'Jest/Vitest', 'API Contract'].map((tool) => (
                              <span key={tool} className="text-10 font-mono px-1.5 py-0.5 rounded bg-background/80 border border-accent-purple/30 text-accent-purple">
                                {tool}
                              </span>
                            ))}
                          </div>
                        </div>

                        <PreviewSection title="执行表现度量">
                          <PreviewRow label="门禁通过率">96.8% (31/32 门禁一次通过)</PreviewRow>
                          <PreviewRow label="常驻守护">apm-runtime 守护节点 #rt-08</PreviewRow>
                          <PreviewRow label="授权边界">自主编码测试 · 生产合流需人审</PreviewRow>
                        </PreviewSection>
                      </div>

                      <PreviewFooterMeta>
                        <span className="text-accent-green flex items-center gap-1">
                          <CheckCircle2 className="size-3" /> 契约巡检零偏差
                        </span>
                        <span className="ml-auto font-mono text-10">活跃分支: feat/*</span>
                      </PreviewFooterMeta>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⑦ 轻量级特殊属性卡片族（Lightweight Attribute Cards: 里程碑 / 团队 / PR 审查 / Git 提交） */}
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <SubLabel>⑦ 轻量级特殊属性卡片族（Lightweight Attribute Cards: 里程碑 / 团队 / PR / Git）</SubLabel>
                  <span className="text-10 text-muted-foreground">
                    面向高频元属性上下文提供轻快、聚焦的预览能力，统一采用 size="lg" 紧凑结构
                  </span>
                </div>

                {/* A. 交互悬停体验栏 */}
                <div className="p-3.5 rounded-xl border border-border/80 bg-muted/10 space-y-2">
                  <p className="text-11 font-medium text-foreground">
                    轻量属性交互悬浮测试（鼠标滑过以下微实体，体验轻巧灵动的属性卡片）：
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    {/* 1. 里程碑 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <Milestone className="size-3.5 text-accent-blue" />
                        <span className="group-hover:text-accent-blue">里程碑: v2.4 门禁收口</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                              <Milestone className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              v2.4 质量门禁收口与闭环
                            </span>
                            <StatusPill tone="info">进行中</StatusPill>
                          </div>
                          <div className="space-y-1.5 pb-1 border-b border-border/50">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-11 font-medium text-foreground">18 / 24 工单完成</span>
                              <span className="font-mono text-10 text-muted-foreground">75% · 剩余 3 天</span>
                            </div>
                            <Progress value={75} className="h-1.5" />
                            <div className="flex items-center justify-between text-10 text-muted-foreground">
                              <span className="flex items-center gap-1 text-accent-green">
                                <TrendingUp className="size-3" /> 燃尽速率平稳
                              </span>
                              <span>目标 2026-09-15</span>
                            </div>
                          </div>
                          <PreviewSection title="排期与交付关联">
                            <PreviewRow label="关联迭代">Sprint 24 (09-01 ~ 09-15)</PreviewRow>
                            <PreviewRow label="关联发版">Release v2.4.0-rc.2</PreviewRow>
                            <PreviewRow label="阻断风险">0 项 Blocker (风险可控)</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>负责人: @alex</span>
                            <span className="ml-auto font-mono text-10">健康度: 92%</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 2. 团队 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <Users className="size-3.5 text-accent-purple" />
                        <span className="group-hover:text-accent-purple">团队: 前端架构组</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-purple/10 text-accent-purple">
                              <Users className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              前端架构与工程团队
                            </span>
                            <Badge variant="outline" className="text-10 shrink-0">Core Team</Badge>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60">
                            <div className="flex items-center -space-x-2">
                              <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Alex Chen', handle: 'alex', isOnline: true }} className="ring-2 ring-background" />
                              <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Sarah Lin', handle: 'sarah', isOnline: true }} className="ring-2 ring-background" />
                              <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Leo Zhang', handle: 'leo', isOnline: true }} className="ring-2 ring-background" />
                              <MemberAvatar size="sm" member={{ type: 'ai_agent', displayName: 'Claude Coder', handle: 'claude-coder', isOnline: true }} className="ring-2 ring-background" />
                            </div>
                            <div className="text-right">
                              <span className="text-11 font-medium text-foreground block">4 位协同成员</span>
                              <span className="text-10 text-muted-foreground block">3 人类 + 1 AI 同事</span>
                            </div>
                          </div>
                          <PreviewSection title="团队范畴与负荷">
                            <PreviewRow label="核心职责">Web · Tauri 桌面壳 · UI 规范</PreviewRow>
                            <PreviewRow label="活跃负荷">14 个工单在跑 · 3 个分支</PreviewRow>
                            <PreviewRow label="交付效能">本周 22 PR 合入 · 零缺陷</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>Team Lead: @alex</span>
                            <span className="ml-auto font-mono text-10 text-accent-green flex items-center gap-1">
                              <span className="size-1.5 rounded-full bg-accent-green" /> 全员协同就绪
                            </span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 3. Pull Request Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <GitPullRequest className="size-3.5 text-accent-blue" />
                        <span className="group-hover:text-accent-blue">PR: #128 HoverCard 体系</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                              <GitPullRequest className="size-3.5" />
                            </span>
                            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                              #128: 核心 HoverCard 体系规范化
                            </span>
                            <StatusPill tone="success">Approved</StatusPill>
                          </div>
                          <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60">
                            <div className="flex items-center gap-1.5 font-mono text-11 text-foreground min-w-0 truncate">
                              <GitBranch className="size-3 text-muted-foreground shrink-0" />
                              <span className="truncate">feat/design-system</span>
                              <span className="text-muted-foreground">→</span>
                              <span className="text-accent-blue font-semibold">develop</span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono text-10 shrink-0">
                              <span className="text-accent-green font-semibold">+248</span>
                              <span className="text-accent-red font-semibold">-36</span>
                            </div>
                          </div>
                          <PreviewSection title="审查与门禁验证">
                            <PreviewRow label="CI 门禁">5/5 Passed (SWC, Vitest, Doc, Lint)</PreviewRow>
                            <PreviewRow label="签署决议">@sarah (已批准) · @qa-bot (签署)</PreviewRow>
                            <PreviewRow label="关联工单">#ISSUE-104: 重构侧栏与 HoverCard</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span className="text-accent-green flex items-center gap-1 font-medium">
                              <CheckCircle2 className="size-3" /> 可无冲突 Squash 合并
                            </span>
                            <span className="ml-auto font-mono text-10">15 分钟前更新</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>

                    {/* 4. Git 提交 Trigger */}
                    <HoverCard>
                      <HoverCardTrigger href="#" className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-medium text-foreground transition-colors group">
                        <GitCommit className="size-3.5 text-muted-foreground" />
                        <span className="group-hover:text-foreground">提交: 7a3f8c1 (fix ALS)</span>
                      </HoverCardTrigger>
                      <HoverCardContent size="lg">
                        <HoverCardArrow />
                        <div className="space-y-3">
                          <div className="flex items-center gap-2">
                            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                              <GitCommit className="size-3.5" />
                            </span>
                            <span className="font-mono text-xs font-semibold text-foreground">
                              commit 7a3f8c1
                            </span>
                            <Badge variant="outline" className="text-10 shrink-0 text-accent-green border-accent-green/40 flex items-center gap-0.5">
                              <ShieldCheck className="size-2.5" /> Verified
                            </Badge>
                          </div>
                          <div className="p-2 rounded-md bg-muted/40 border border-border/60">
                            <p className="text-xs font-medium text-foreground leading-snug">
                              fix(runtime): resolve AsyncLocalStorage scope penetration race
                            </p>
                          </div>
                          <PreviewSection title="变更上下文">
                            <PreviewRow label="提交作者">Alex Chen (@alex) · 12 分钟前</PreviewRow>
                            <PreviewRow label="变更规模">3 个文件变更 (+42 / -8 行代码)</PreviewRow>
                            <PreviewRow label="CI 流水线">Commit Build #982 Passed (38s)</PreviewRow>
                          </PreviewSection>
                          <PreviewFooterMeta>
                            <span>所在分支: <code>develop</code></span>
                            <span className="ml-auto font-mono text-10">关联 #ISSUE-112</span>
                          </PreviewFooterMeta>
                        </div>
                      </HoverCardContent>
                    </HoverCard>
                  </div>
                </div>

                {/* B. 全景平铺审查画廊 */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-11 font-medium text-foreground">
                      轻量属性卡片平铺全景画廊（4 大高频元属性规范对比）：
                    </p>
                    <Badge variant="secondary" className="text-10">轻量元卡对比</Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    {/* 卡片 1: 里程碑卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                            <Milestone className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            v2.4 质量门禁收口
                          </span>
                          <StatusPill tone="info">进行中</StatusPill>
                        </div>
                        <div className="space-y-1.5 pb-1 border-b border-border/50">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-11 font-medium text-foreground">18 / 24 工单</span>
                            <span className="font-mono text-10 text-muted-foreground">75% · 剩3天</span>
                          </div>
                          <Progress value={75} className="h-1.5" />
                          <div className="flex items-center justify-between text-10 text-muted-foreground">
                            <span className="flex items-center gap-1 text-accent-green">
                              <TrendingUp className="size-3" /> 燃尽平稳
                            </span>
                            <span>09-15</span>
                          </div>
                        </div>
                        <PreviewSection title="排期与交付关联">
                          <PreviewRow label="关联迭代">Sprint 24</PreviewRow>
                          <PreviewRow label="关联发版">v2.4.0-rc.2</PreviewRow>
                          <PreviewRow label="阻断风险">0 项 Blocker</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>负责人: @alex</span>
                        <span className="ml-auto font-mono text-10">健康度: 92%</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 2: 团队协同卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-purple/10 text-accent-purple">
                            <Users className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            前端架构组
                          </span>
                          <Badge variant="outline" className="text-10 shrink-0">Core</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60">
                          <div className="flex items-center -space-x-2">
                            <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Alex Chen', handle: 'alex', isOnline: true }} className="ring-2 ring-background" />
                            <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Sarah Lin', handle: 'sarah', isOnline: true }} className="ring-2 ring-background" />
                            <MemberAvatar size="sm" member={{ type: 'human', displayName: 'Leo Zhang', handle: 'leo', isOnline: true }} className="ring-2 ring-background" />
                            <MemberAvatar size="sm" member={{ type: 'ai_agent', displayName: 'Claude Coder', handle: 'claude-coder', isOnline: true }} className="ring-2 ring-background" />
                          </div>
                          <div className="text-right">
                            <span className="text-11 font-medium text-foreground block">4 位成员</span>
                            <span className="text-10 text-muted-foreground block">3人+1AI</span>
                          </div>
                        </div>
                        <PreviewSection title="团队范畴与负荷">
                          <PreviewRow label="核心职责">Web · Desktop · UI</PreviewRow>
                          <PreviewRow label="活跃负荷">14 工单 · 3 分支</PreviewRow>
                          <PreviewRow label="交付效能">22 PR · 零缺陷</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>Lead: @alex</span>
                        <span className="ml-auto font-mono text-10 text-accent-green flex items-center gap-1">
                          <span className="size-1.5 rounded-full bg-accent-green" /> 全员就绪
                        </span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 3: PR 审查卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-accent-blue/10 text-accent-blue">
                            <GitPullRequest className="size-3.5" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">
                            #128: HoverCard
                          </span>
                          <StatusPill tone="success">Approved</StatusPill>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded-md bg-muted/40 border border-border/60">
                          <div className="flex items-center gap-1 font-mono text-10 text-foreground min-w-0 truncate">
                            <GitBranch className="size-3 text-muted-foreground shrink-0" />
                            <span className="truncate">feat/ui</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-accent-blue font-semibold">dev</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-10 shrink-0">
                            <span className="text-accent-green font-semibold">+248</span>
                            <span className="text-accent-red font-semibold">-36</span>
                          </div>
                        </div>
                        <PreviewSection title="审查与门禁验证">
                          <PreviewRow label="CI 门禁">5/5 Passed</PreviewRow>
                          <PreviewRow label="签署决议">@sarah · @qa-bot</PreviewRow>
                          <PreviewRow label="关联工单">#ISSUE-104</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span className="text-accent-green flex items-center gap-1 font-medium">
                          <CheckCircle2 className="size-3" /> 可无冲突合并
                        </span>
                        <span className="ml-auto font-mono text-10">15m 前</span>
                      </PreviewFooterMeta>
                    </div>

                    {/* 卡片 4: Git 提交卡 */}
                    <div className="rounded-xl border border-border/80 bg-card p-3.5 shadow-md space-y-3 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                            <GitCommit className="size-3.5" />
                          </span>
                          <span className="font-mono text-xs font-semibold text-foreground">
                            7a3f8c1
                          </span>
                          <Badge variant="outline" className="text-10 shrink-0 text-accent-green border-accent-green/40 flex items-center gap-0.5">
                            <ShieldCheck className="size-2.5" /> Verified
                          </Badge>
                        </div>
                        <div className="p-2 rounded-md bg-muted/40 border border-border/60">
                          <p className="text-11 font-medium text-foreground leading-snug line-clamp-2">
                            fix(runtime): resolve AsyncLocalStorage scope penetration race
                          </p>
                        </div>
                        <PreviewSection title="变更上下文">
                          <PreviewRow label="提交作者">Alex Chen · 12m前</PreviewRow>
                          <PreviewRow label="变更规模">3 文件 (+42 / -8)</PreviewRow>
                          <PreviewRow label="流水线">Build #982 Passed</PreviewRow>
                        </PreviewSection>
                      </div>
                      <PreviewFooterMeta>
                        <span>分支: <code>develop</code></span>
                        <span className="ml-auto font-mono text-10">#ISSUE-112</span>
                      </PreviewFooterMeta>
                    </div>
                  </div>
                </div>
              </div>

              {/* ⑧ HoverCard 现存问题诊断与优化点看板 */}
              <div>
                <SubLabel>⑧ 现行 HoverCard 样式诊断与优化点审查（Design System Audit）</SubLabel>
                <div className="rounded-xl border border-accent-yellow/30 bg-accent-yellow/5 p-4 space-y-3 max-w-3xl">
                  <div className="flex items-center gap-2 text-accent-yellow font-semibold text-xs">
                    <AlertTriangle className="size-4" />
                    <span>HoverCard 现状审查清单与 5 大改进建议</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-11">
                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-red">1. 暗色模式边缘对比度较弱</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        现状仅使用 <code className="text-10 bg-muted px-1 py-0.5 rounded">ring-1 ring-foreground/10 shadow-md</code>，在纯暗色或半透明底板上阴影被吸收，卡片边界不够清晰。建议补充 <code className="text-10 bg-muted px-1 py-0.5 rounded">border border-border/80 dark:shadow-black/70</code>。
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-orange">2. HoverCardArrow 边缘描边断层</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        箭头是旋转小方块，但未带 border。当主卡片有清晰边框时，箭头两侧与主卡片接合部会形成 1px 缺失断层。建议在 Arrow 上追加对齐的主边框色。
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-blue">3. 移动端/触控环境降级缺失</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        在触控屏或移动设备上无 hover 状态，Trigger 会直接跳转或失效。建议为纯 Trigger 增加点击弹出切换（Click Fallback）或长按呼出。
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-purple">4. 视口越界高度与溢出滚动保护</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        长内容卡片在低分辨率屏幕或视口边缘时可能被浏览器底部裁切。HoverCardContent 需具备默认的 <code className="text-10 bg-muted px-1 py-0.5 rounded">max-h-96 overflow-y-auto</code> 安全线。
                      </p>
                    </div>

                    <div className="p-2.5 rounded-lg border border-border/80 bg-background/80 space-y-1 sm:col-span-2">
                      <p className="font-semibold text-foreground flex items-center gap-1">
                        <span className="text-accent-green">5. 统一数据加载态骨架屏（Skeleton规范）</span>
                      </p>
                      <p className="text-muted-foreground leading-relaxed">
                        当 HoverCardContent 挂载时触发异步请求（如获取成员实时任务或 Git 提交），目前缺乏标准通用的 <code className="text-10 bg-muted px-1 py-0.5 rounded">HoverCardSkeleton</code>，易出现高度剧烈跳跃（Layout Shift）。
                      </p>
                    </div>
                  </div>
                </div>
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

          <SectionAnchor id="status-icon-frame">
            <SectionTitle>Status Icon Frame</SectionTitle>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-2">
                {Object.entries(TASK_STATUS_VISUALS).map(([value, visual]) => (
                  <span key={value} className="flex items-center gap-1.5">
                    <StatusIconFrame
                      icon={visual.icon}
                      tone={visual.tone}
                      spin={visual.icon === TASK_STATUS_VISUALS.in_progress.icon}
                    />
                    <span className="text-xs text-muted-foreground">{value}</span>
                  </span>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusIconFrame icon={CircleCheck} tone="success" size="xs" />
                <StatusIconFrame icon={CircleCheck} tone="success" size="sm" />
                <StatusIconFrame icon={CircleCheck} tone="success" size="md" />
                <StatusIconFrame icon={CircleCheck} tone="success" size="lg" />
                <span className="text-xs text-muted-foreground">xs / sm / md / lg</span>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="markdown">
            <SectionTitle>Markdown View</SectionTitle>
            <div className="max-w-150 rounded-lg border border-border p-4">
              <MarkdownView
                content={[
                  '## GFM Support',
                  '',
                  '- [x] 完成项',
                  '- [ ] 待办项',
                  '',
                  '| Field | Value |',
                  '| ----- | ----- |',
                  '| status | `done` |',
                  '',
                  '```js',
                  "const ok = 'code block';",
                  '```',
                  '',
                  '> 引用块 ~~删除线~~ **加粗** [链接](https://example.com)',
                ].join('\n')}
              />
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="markdown-editor">
            <SectionTitle>Markdown Editor</SectionTitle>
            <div className="flex flex-col gap-4">
              <MarkdownEditorDemo />
              <div className="max-w-100">
                <MarkdownEditor
                  value=""
                  onChange={() => {}}
                  rows={2}
                  preview="toggle"
                  placeholder="Write / Preview 切换模式（窄容器）"
                />
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="emoji-picker">
            <SectionTitle>Emoji Picker</SectionTitle>
            <div className="rounded-lg border border-border">
              <EmojiPicker onSelect={() => {}} />
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

          <SectionAnchor id="date-picker">
            <SectionTitle>Date Picker</SectionTitle>
            <p className="text-xs text-muted-foreground mb-3">coss 组合模式（Popover + Calendar + Button）——支持自定义触发器（胶囊）与 presets。</p>
            <DatePickerDemo />
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
                  <MenubarMenu>
                    <MenubarTrigger>File</MenubarTrigger>
                    <MenubarContent>
                      <MenubarLabel>Actions</MenubarLabel>
                      <MenubarItem>New File</MenubarItem>
                      <MenubarItem>Open…</MenubarItem>
                      <MenubarSeparator />
                      <MenubarItem>Save All</MenubarItem>
                    </MenubarContent>
                  </MenubarMenu>
                  <MenubarMenu>
                    <MenubarTrigger>Edit</MenubarTrigger>
                  </MenubarMenu>
                  <MenubarMenu>
                    <MenubarTrigger>View</MenubarTrigger>
                  </MenubarMenu>
                </Menubar>
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
                    <PieChart width={160} height={160}>
                      <Pie data={PIE_DATA} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                        {PIE_DATA.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                      </Pie>
                      <RechartTooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card)' }} />
                    </PieChart>
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

          <SectionAnchor id="chapter-scrubber">
            <SectionTitle>Chapter Scrubber</SectionTitle>
            <div className="space-y-4">
              <ChapterScrubberDemo />
              <p className="text-xs text-muted-foreground">
                纵向章节刻度轨：单一 spring 驱动的余弦放大波，预览卡自动测高钳位、贴视口边自动换边；listbox 语义 + roving tabindex 键盘可达，prefers-reduced-motion 降级为即时响应。
              </p>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="floating-dock">
            <SectionTitle>Floating Dock</SectionTitle>
            <div className="space-y-4">
              <FloatingDockDemo />
              <p className="text-xs text-muted-foreground">
                macOS 风格浮动 Dock：指针距离映射到尺寸弹簧（40↔80px 磁性放大 + tooltip）；窄视口（md 以下）自动切换为纵向展开按钮组。
              </p>
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

          <SectionAnchor id="filter-chips">
            <SectionTitle>Filter Chips</SectionTitle>
            <div className="space-y-4">
              <SubLabel>Linear 风格条件条 — 工具栏下单开一行：[字段｜算子｜值｜×] 拼接 chip，行尾 + 追加条件，右侧 Clear / Save（保存到当前视图 / 另存为新视图）</SubLabel>
              <FilterChipsDemo />
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
                    ].map((task, issueIdx) => (
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
                            <MilestonePill name={task.milestone} idx={issueIdx} />
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
                            <MilestonePill name={task.milestone} idx={issueIdx} />
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
                milestone: 'font-medium text-xs',
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
                              <span className="text-10">{ac.shortLabel}</span>
                            </div>
                          )
                        })}
                        {STAGE_COLS.map(({ key, label, icon: StageIcon, w }) => (
                          <div key={key} style={{ width: w, minWidth: w }} className="flex flex-col items-center justify-center border-l border-border/30 shrink-0 h-full gap-0.5 px-1">
                            <StageIcon className="w-3 h-3" />
                            <span className="text-10">{label}</span>
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
                        <span className={cn('text-11 font-medium px-1.5 py-0.5 rounded-md', statusCls)}>
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
            <SubLabel>Live primitives (components/ui/command) — 全局面板同源，⌘K / Ctrl+/ 唤起真实面板</SubLabel>
            <div className="flex justify-center">
              <div className="w-140 overflow-hidden rounded-xl border border-border shadow-2xl bg-card">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="输入命令或搜索…" />
                  <CommandList>
                    <CommandGroup heading="导航">
                      {(
                        [
                          { entity: 'project', label: '打开项目' },
                          { entity: 'issue', label: '打开任务' },
                          { entity: 'workflow', label: '打开工作流' },
                          { entity: 'acceptance', label: '打开验收' },
                          { entity: 'decision', label: '打开决策收件箱' },
                          { entity: 'repository', label: '打开仓库' },
                        ] as const
                      ).map(({ entity, label }) => {
                        const { icon: Icon } = getEntityIcon(entity)
                        return (
                          <CommandItem key={entity} onSelect={() => undefined}>
                            <Icon className="text-muted-foreground" />
                            <span>{label}</span>
                          </CommandItem>
                        )
                      })}
                    </CommandGroup>
                    <CommandGroup heading="操作">
                      <CommandItem onSelect={() => undefined}>
                        <MessagesSquare className="text-muted-foreground" />
                        <span>问主 AI</span>
                        <CommandShortcut>Alt A</CommandShortcut>
                      </CommandItem>
                      <CommandItem onSelect={() => undefined}>
                        <SunMoon className="text-muted-foreground" />
                        <span>切换到深色 / 浅色模式</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                  <CommandFooter />
                </Command>
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
                <SubLabel>EmptyState (In-Card / Filter Results)</SubLabel>
                <div className="rounded-lg border border-border/60 bg-card p-2">
                  <EmptyState
                    title="No matching items"
                    description="Try adjusting your search query or clearing the filters."
                    action={<Button size="sm" variant="outline">Clear filters</Button>}
                  />
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="assembly-primitives">
            <SectionTitle>Assembly Primitives</SectionTitle>
            <p className="text-xs text-muted-foreground">
              页面装配原语（宪法 §10.2）：DataList 列表原语、PropertyRow / PropsCard 属性面板原语。新页面必须由装配原语 + ui 基础组件构成。
            </p>
            <div className="space-y-5">
              <div>
                <SubLabel>DataList</SubLabel>
                <div className="rounded-lg border border-border">
                  <DataList
                    items={[
                      { id: 'demo-1' },
                      { id: 'demo-2' },
                      { id: 'demo-3' },
                    ]}
                    renderLeading={(item) => (
                      <div className="min-w-0">
                        <p className="truncate text-sm text-foreground">List row {item.id.slice(-1)}</p>
                        <p className="truncate text-xs text-muted-foreground">Secondary metadata line</p>
                      </div>
                    )}
                    renderTrailing={() => (
                      <StatusPill tone="success">Done</StatusPill>
                    )}
                    onItemClick={() => {}}
                  />
                </div>
              </div>
              <div>
                <SubLabel>PropertyRow + PropsCard</SubLabel>
                <div className="max-w-sm rounded-lg border border-border p-2">
                  <PropsCard title="Properties" collapsed={false} onToggleCollapse={() => {}}>
                    <PropertyRow icon={<Sparkles className="w-3.5 h-3.5" />} label="AI assignee">
                      <span className="text-xs text-foreground">Unassigned</span>
                    </PropertyRow>
                    <PropertyRow icon={<GitBranch className="w-3.5 h-3.5" />} label="Repository">
                      <span className="text-xs text-foreground">agent-project-manager</span>
                    </PropertyRow>
                    <PropertyRow icon={<Plus className="w-3.5 h-3.5" />} label="Estimate">
                      <span className="text-xs text-foreground">3h</span>
                    </PropertyRow>
                  </PropsCard>
                </div>
              </div>
            </div>
          </SectionAnchor>

          <Separator />

          <SectionAnchor id="ai-density-cards">
            <SectionTitle>AI High-Density Cards [AI]</SectionTitle>
            <p className="text-xs text-muted-foreground mb-4">
              AI 执行面高信息密度卡片矩阵（DESIGN.md §6.1）：承载复杂多样化执行状态、推理链、工件交接、冷却门禁与双轨成本。
            </p>

            <div className="space-y-6">
              {/* ① 思考折叠核 (ThinkingStream) */}
              <div>
                <SubLabel>① 思考折叠核 (ThinkingStream) — 26px 胶囊 · 烟熏紫脉冲 · 展开就地查看思维链</SubLabel>
                <div className="space-y-2 max-w-xl">
                  <ThinkingStream
                    isThinking={true}
                    steps={[
                      { step: 1, title: '解析用户指令与架构契约', durationMs: 420 },
                    ]}
                  />
                  <ThinkingStream
                    isThinking={false}
                    totalDurationMs={1850}
                    defaultExpanded={true}
                    steps={[
                      { step: 1, title: '解析用户指令与架构契约', detail: '已验证 DESIGN.md 与 modules.md 架构对齐', durationMs: 420 },
                      { step: 2, title: '静态扫描组件依赖树', detail: '确认 99 个 UI 原语与 150 个业务模块组件边界', durationMs: 680 },
                      { step: 3, title: '构建低饱和 5 色阶与外舒内紧卡片方案', detail: '已生成 14px 标准 / 13px 密集自适应规则', durationMs: 750 },
                    ]}
                  />
                </div>
              </div>

              {/* ② 工具与命令执行胶囊 (AssistantToolCard) */}
              <div>
                <SubLabel>② 工具与命令执行胶囊 (AssistantToolCard) — 单行折叠 · 动词×实体 · 结果常显</SubLabel>
                <div className="space-y-2 max-w-xl">
                  <AssistantToolCard
                    part={{
                      type: 'tool-call',
                      toolName: 'update_task',
                      state: 'output-available',
                      input: { taskId: 'ISSUE-104', priority: 'high', status: 'in_progress' },
                      output: {
                        taskId: 'ISSUE-104',
                        title: '重构 Design System 紧凑型卡片',
                        status: 'in_progress',
                      },
                    }}
                  />
                  <AssistantToolCard
                    part={{
                      type: 'tool-call',
                      toolName: 'list_project_tasks',
                      state: 'output-available',
                      input: { projectId: 'p-core', limit: 10 },
                      output: {
                        count: 8,
                        samples: [
                          'ISSUE-101: 优化暗色模式色阶对比度',
                          'ISSUE-102: 修复 PopoverTrigger 双嵌套',
                          'ISSUE-103: 接入 DualTrackMetricPill',
                        ],
                      },
                    }}
                  />
                </div>
              </div>

              {/* ③ 多 Agent 协作交接卡 (AgentHandoffCard) */}
              <div>
                <SubLabel>③ 多 Agent 协作交接卡 (AgentHandoffCard) — 跨角色流转 · 显式契约门禁</SubLabel>
                <div className="max-w-xl">
                  <AgentHandoffCard
                    fromAgent={{ name: 'Alice PM', role: '需求主管' }}
                    toAgent={{ name: 'Claude Coder', role: '全栈执行 Agent' }}
                    artifact={{
                      title: 'DESIGN.md - APM 全局设计系统规范 v2.0',
                      type: 'Architecture Spec',
                    }}
                    description="完成低饱和多色色阶、外舒内紧卡片、多端 13px/14px 双层字阶与动效白名单制定，请按清单完成卡片收口。"
                    gates={[
                      { id: 'g1', label: '契约绑定', status: 'passed' },
                      { id: 'g2', label: '测试覆盖', status: 'passed' },
                      { id: 'g3', label: '破坏性拦截', status: 'pending' },
                    ]}
                    metrics={{ tokens: 4280, durationMs: 2400, costUsd: 0.0064 }}
                  />
                </div>
              </div>

              {/* ④ 决策证据抽屉卡 (DecisionCardShell) */}
              <div>
                <SubLabel>④ 决策证据抽屉卡 (DecisionCardShell) — 证据强制 · 3s 冷却门禁 · 1~4 快捷键</SubLabel>
                <div className="max-w-xl">
                  <DecisionCardShell
                    decision={{
                      id: 'dec-ds-01',
                      kind: 'approval',
                      sourceId: 'dec-ds-01',
                      status: 'pending',
                      urgency: 'blocking',
                      riskLevel: 'high_risk',
                      title: '执行破坏性样式重构：全面清理 276 处非语义裸色与废弃伪组件',
                      proposer: { type: 'ai_agent', name: 'Design Architect Agent' },
                      createdAt: new Date().toISOString(),
                      payload: { affectedFiles: 14, tokensChanged: 28, deletedLines: 120 },
                    }}
                    requireEvidence={true}
                    cooldownSecs={3}
                    impact={[
                      { label: '波及组件', value: '18 个', tone: 'orange', icon: Sparkles },
                      { label: '预估耗时', value: '5 分钟', tone: 'blue', icon: Clock },
                      { label: '回滚策略', value: 'Git 分支保护', tone: 'green', icon: CheckCircle2 },
                    ]}
                    evidence={
                      <div className="space-y-1 font-mono text-11 text-content-text-muted bg-content-bg-secondary p-2 rounded">
                        <p className="text-accent-green">+ 引入 5 组低饱和多色色阶 (--accent-blue/green/amber/crimson/violet)</p>
                        <p className="text-accent-red">- 移除 276 处 text-orange-500, bg-blue-50 等硬编码裸色</p>
                        <p className="text-accent-blue">• 统一 Card 内边距为 p-3.5，CardTitle 设为 text-base font-semibold</p>
                      </div>
                    }
                    onAction={(act) => toast.info(`触发决议动作: ${act}`)}
                  />
                </div>
              </div>

              {/* ⑤ 双轨成本微徽章 (DualTrackMetricPill) */}
              <div>
                <SubLabel>⑤ 双轨成本与执行微徽章 (DualTrackMetricPill) — 11px Mono · 低调角落常驻</SubLabel>
                <div className="flex flex-wrap items-center gap-3">
                  <DualTrackMetricPill
                    tokens={3420}
                    durationMs={1820}
                    costUsd={0.0051}
                    model="Claude 3.7 Sonnet"
                  />
                  <DualTrackMetricPill
                    tokens={12400}
                    durationMs={4500}
                    costUsd={0.0186}
                  />
                  <DualTrackMetricPill
                    durationMs={620}
                    model="Gemini 2.5 Flash"
                  />
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
