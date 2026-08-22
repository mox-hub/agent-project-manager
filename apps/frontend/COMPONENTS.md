# COMPONENTS.md — 前端组件清单（agent 与人的共用索引）

> **用途**：开发页面前的第一入口。任何页面开发/改造前先查此表，优先复用；**新增 `components/ui/` 组件必须先在此登记**（`pnpm --filter frontend lint:registry` 会强制对账）。
> **登记格式**：每行必须包含 `ui/<文件名>.tsx` 引用。修改组件用途/props 时同步更新本表。
> **导入方式**：按文件路径直接导入（如 `@/components/ui/button`），不使用 barrel。
> **展示预览**：`/app/design-system`（dev-only）可查看组件实际效果，本表是其机器可读索引。

## 页面骨架速查（搭页面先看这里）

| 场景 | 用什么 |
|------|--------|
| 页面外壳 | `PageShell`（含 PageHeader）或手动 `PageHeader` |
| 页头操作 | `HeaderActionButton`（唯一合法形态，圆形图标 hover 展开胶囊） |
| 统计卡 | `StatsCard`（多项网格）+ `QuickCardsToggle`（页头显隐开关） |
| 列表页工具栏 | `ToolbarRow` + `useToolbarViews`（视图快照持久化） |
| 详情页工具栏 | `SubPageToolbar`（返回/面包屑/居中页签/翻页器/侧栏开关） |
| 详情右栏 | `RightSidebar` + `SidebarButtonGroup` + `PropsCard`/`PropertyRow`/`CapsuleSelect` |
| 列表内容 | `DataList`（多选/分组/右键菜单）或 `Table` 套件 + `DataTableShell` |
| 三态处理 | `AsyncState`（加载/空/错误）或 `PageLoader` / `EmptyState` |
| 弹窗 | `Dialog` 套件；创建类用 `UnifiedCreateDialog` / `TaskFormDialog` |
| 反馈 | `Toaster`(sonner，唯一合法 toast) / `useConfirm`(确认框) / `Alert` |

## 完整清单

### 布局与页面骨架

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| PageShell | ui/page-shell.tsx | 页面外壳（内嵌 PageHeader 的整体骨架） | aiPage, title, icon, metrics, actions, children |
| PageHeader | ui/page-header.tsx | 单行页头（图标+标题+收藏星标+计数胶囊+操作组） | title, icon, iconColor, metrics, actions, favoriteId |
| ToolbarRow + useToolbarViews | ui/toolbar-row.tsx | 列表页工具栏（已保存视图+样式切换+筛选/显示/下载下拉）+视图快照持久化 hook | views, viewStyle, filterMenu, displayMenu, downloadMenu, extraActions；hook: key, defaults, onApply |
| SubPageToolbar | ui/sub-page-toolbar.tsx | 二级页工具栏（返回+面包屑+居中页签+翻页+侧栏开关） | breadcrumbs, tabs, pager, actions, sidebar, onBack |
| RightSidebar / SidebarButtonGroup / SidebarButton / SidebarToggle | ui/right-sidebar.tsx | 详情页右侧栏容器与按钮组（flex 并列可收起） | hidden, width；SidebarButton: icon, label, variant |
| SidebarPanel | ui/sidebar-panel.tsx | 右侧栏折叠面板（圆角矩形↔胶囊） | title, icon, collapsed, onToggle, action |
| Sidebar 套件 | ui/sidebar.tsx | 应用侧栏骨架 | children, SidebarMenuButton: isActive, onClick |
| SectionCard | ui/section-card.tsx | 带标题/描述/操作区的 Card 封装 | title, description, actions, children |
| Resizable 套件 | ui/resizable.tsx | 可调分栏（resizable-panels 封装） | direction, withHandle, defaultSize |
| ScrollArea | ui/scroll-area.tsx | 滚动容器（简单 div 包装） | className, children |
| AspectRatio | ui/aspect-ratio.tsx | 固定宽高比容器 | ratio, children |
| QuickCardsToggle | ui/quick-cards-toggle.tsx | 页头幽灵按钮：显隐「快捷统计卡」栏目 | visible, onToggle, label, aiId |

### 表单输入

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| Input / PasswordInput | ui/input.tsx | 文本输入框与密码框（带显隐切换） | type, value, onChange, placeholder |
| Textarea | ui/textarea.tsx | 多行文本框（field-sizing 自适应） | value, onChange, rows |
| NativeSelect / OptGroup / Option | ui/native-select.tsx | 原生 select 样式化（含 size） | value, onChange, size, children |
| Select 套件 | ui/select.tsx | 下拉选择（base-ui） | value, onValueChange；SelectTrigger: size(sm/default) |
| Combobox 套件 | ui/combobox.tsx | 可搜索下拉（base-ui，支持 chips 多选） | value, onValueChange, options, multiple |
| Checkbox | ui/checkbox.tsx | 复选框（base-ui + onCheckedChange 兼容层） | checked, onCheckedChange |
| Switch | ui/switch.tsx | 开关（base-ui + onCheckedChange 兼容） | checked, onCheckedChange, size |
| RadioGroup / RadioGroupItem | ui/radio-group.tsx | 单选组（原生 input 占位实现） | name, checked, onChange |
| Slider | ui/slider.tsx | 滑块（原生 range 简化实现） | value, onChange, min, max |
| Calendar / CalendarDayButton | ui/calendar.tsx | 日历选择器（react-day-picker 封装） | selected, onSelect, locale, showOutsideDays |
| InputOTP 套件 | ui/input-otp.tsx | 验证码输入（input-otp 库封装） | maxLength, Slot: index |
| Label | ui/label.tsx | 表单标签 | htmlFor, children |
| Field 套件（含 PillInput/PillSelect） | ui/field.tsx | 表单字段布局套件与胶囊输入 | Field: orientation；FieldError: errors 匹配 |
| Form 套件 | ui/form.tsx | react-hook-form 集成层 | FormField: name, render；FormMessage: children |
| InputGroup 套件 | ui/input-group.tsx | 带前后缀的输入组容器 | align(Addon), variant, size |
| FilterBar | ui/filter-bar.tsx | 元数据驱动筛选栏（select/search/视图/分组/自定义） | filters(FilterItem[]), searchConfig, renderExtra |
| SegmentedControl | ui/segmented-control.tsx | 分段切换（pill/rect 滑块，语义色调） | value, options, onChange, variant(pill/rect), tone |
| AvatarPickerField | ui/avatar-picker-field.tsx | 内置头像选择表单字段 | value, onValueChange, memberType(human/ai/all) |
| PropertyPanel 套件（CapsuleSelect/DateCapsuleField/AutoSizeTextarea/PropertyRow/PropsCard 等） | ui/property-panel.tsx | 详情页属性面板（Linear 风格可编辑胶囊+属性行+折叠卡） | CapsuleSelect: value, options, onChange, active；PropsCard: title, collapsed |

### 数据展示

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| Table 套件 | ui/table.tsx | 原生 table 样式化套件（禁止业务代码裸写 `<table>`） | children |
| DataTableShell | ui/data-table-shell.tsx | 表格外壳容器（圆角边框卡片） | children, className |
| DataList + 单元格（ListText/Chip/Date/Icon/Avatar/ActionButton） | ui/data-list.tsx | 通用列表（多选/分组手风琴/右键菜单/悬浮批量操作） | items, renderLeading, renderTrailing, groupBy, onItemContextMenu |
| Card 套件 | ui/card.tsx | 卡片容器（支持 sm 尺寸与 CardAction 槽） | size(default/sm), children |
| Item 套件 | ui/item.tsx | 通用行条目（cva variant/size） | variant(default/outline/muted), size, render |
| Badge | ui/badge.tsx | 徽标（cva variant） | variant, children |
| StatusPill | ui/status-pill.tsx | 状态胶囊（语义色调文字） | tone(success/warning/danger/default), children |
| Avatar 套件（含 Group/Badge） | ui/avatar.tsx | 头像与头像组 | size(sm/default/lg), AvatarGroup 多头像 |
| Kbd / KbdGroup | ui/kbd.tsx | 键位徽标与组合 | children |
| StatCard | ui/stat-card.tsx | 单个统计卡（图标+数值+趋势） | label, value, icon, trend, onClick |
| StatsCard + STATS_THEMES | ui/stats-card.tsx | 多项统计卡网格（等距全宽） | items(StatsCardItem[]), columns(2/3/4/6), maxWidth |
| IconMetric | ui/icon-metric.tsx | 图标+标签+数值指标块 | icon, label, value |
| Progress | ui/progress.tsx | 进度条 | value |
| ActivityHeatmap | ui/activity-heatmap.tsx | 活动热力图（GitHub 式日格计数） | data(日序列), days, emptyLabel |
| Chart 套件 + ChartConfig | ui/chart.tsx | recharts 图表封装（主题色注入） | config, children |
| Carousel 套件 | ui/carousel.tsx | 轮播（embla 封装） | opts, orientation, plugins, setApi |
| AttentionRail | ui/attention-rail.tsx | 「需要关注」侧栏（通知/逾期任务/风险项目聚合） | projectId, notifications, overdueTasks, atRiskProjects |

### 反馈 overlay

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| Dialog 套件 | ui/dialog.tsx | 模态对话框（base-ui） | open, onOpenChange；DialogContent: showCloseButton, keepDefaultWidth |
| AlertDialog 套件 | ui/alert-dialog.tsx | 确认对话框（基于 Dialog 复用的套件） | open, onOpenChange, children |
| Sheet 套件 | ui/sheet.tsx | 侧滑面板（简化自实现） | open, onOpenChange, side, children |
| Drawer 套件 | ui/drawer.tsx | 底部抽屉（简化自实现） | open, onOpenChange, children |
| Popover 套件 | ui/popover.tsx | 气泡（base-ui + 兼容 PopoverAnchor） | open, side, align, sideOffset |
| AnchoredMenu | ui/anchored-menu.tsx | 锚定下拉面板基元（portal+fixed+视口翻转） | open, onClose, anchor(Ref), align |
| Tooltip 套件 | ui/tooltip.tsx | 提示浮层（自实现定位，非 radix） | open, delayDuration, side, sideOffset |
| HoverCard 套件 | ui/hover-card.tsx | 悬浮卡（简化占位实现） | children |
| Alert 套件 | ui/alert.tsx | 内联提示条（局部错误/信息展示） | variant, children |
| Toaster | ui/sonner.tsx | sonner Toast 容器（主题联动，唯一合法 toast） | position, richColors |
| Spinner | ui/spinner.tsx | 旋转加载指示器 | size(sm/md/lg/xl), label |
| Skeleton 套件（Text/Card/Avatar/List/Table/Chart） | ui/skeleton.tsx | 骨架屏占位全家桶 | Text: lines；Table: rows, columns |
| AsyncState | ui/async-state.tsx | 加载/空/错误三态统一处理容器 | isLoading, isEmpty, error, onRetry, children |
| EmptyState | ui/empty-state.tsx | 轻量空状态（标题/描述/操作） | title, description, action |
| Empty 套件 | ui/empty.tsx | shadcn 空状态套件 | EmptyMedia: variant |
| PageLoader + usePageLoader | ui/page-loader.tsx | 全屏页面加载遮罩 | message, className |
| GlobalLoadingState | ui/global-loading-state.tsx | 监听 Query 缓存显示全局顶部加载条（main.tsx 挂载） | 无 props |
| LoadingOverlay / ErrorOverlay / LoadingProvider + useLoading | ui/loading-overlay.tsx | 加载遮罩三模式（bar/overlay/inline）+错误遮罩+全局 Provider | visible, message, mode |
| NotificationPopover | ui/notification-popover.tsx | 通知弹窗（未读/警报 Tab 过滤） | notifications, onMarkAsRead, onMarkAllAsRead |
| UnifiedCreateDialog | ui/unified-create-dialog.tsx | 统一创建弹窗（task/bug/doc/project/milestone 五类型，属性胶囊右栏） | open, onOpenChange, defaultType, projectId, defaultAssigneeId, onSuccess |
| TaskFormDialog | ui/task-form-dialog.tsx | 任务创建/编辑弹窗 | open, onOpenChange, mode, projectId, initialData, onSuccess |
| BugReportDialog | ui/bug-report-dialog.tsx | 全局 Bug 报告创建弹窗（含严重度/优先级表单） | open, onOpenChange, projectId, initialData, onSuccess |
| DocumentPreviewDialog | ui/document-preview-dialog.tsx | 文档预览弹窗（左目录右内容） | open, onOpenChange, document |

### 导航

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| Tabs 套件 | ui/tabs.tsx | 页签（base-ui，default/line/segmented 变体） | value, onValueChange；TabsList: variant |
| Breadcrumb 套件 | ui/breadcrumb.tsx | 面包屑导航（base-ui render） | render(Link), href/to |
| Pagination 套件 | ui/pagination.tsx | 分页导航（静态结构） | isActive, size, href |
| Command 套件 | ui/command.tsx | 命令面板基元（Dialog 式命令列表） | CommandDialog: open, onOpenChange；CommandInput: value, onChange |
| ContextMenu 套件 + createMenuItems/useContextMenuState | ui/context-menu.tsx | 自研右键菜单（元数据驱动 items） | items(MenuItem[]), onItemClick |
| DropdownMenu 套件 | ui/dropdown-menu.tsx | 下拉菜单（简化占位实现，Root 仅透传） | children |
| Menubar 套件 | ui/menubar.tsx | 顶部菜单栏（简化自实现） | children |
| NavigationMenu 套件 | ui/navigation-menu.tsx | 横向导航菜单（简化自实现） | children, href |
| TabBar | ui/tab-bar.tsx | 浏览器式多标签栏（读 tabs-context，右键菜单） | className |

### 基础原语 / 主题工具

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| Button / PillButton | ui/button.tsx | 主按钮（cva variant/size）与胶囊按钮 | variant, size, asChild |
| ButtonGroup 套件 | ui/button-group.tsx | 按钮组容器（带分隔/文本区） | orientation, children |
| HeaderActionButton | ui/header-action-button.tsx | 页头操作按钮（圆形仅图标，hover 展开胶囊） | icon, label, variant, pinned, trailing |
| Separator | ui/separator.tsx | 分隔线 | orientation |
| Accordion 套件 | ui/accordion.tsx | 轻量手风琴容器（div/button 自实现，非 radix） | children, className |
| Collapsible 套件 | ui/collapsible.tsx | 折叠面板（base-ui） | defaultOpen, children |
| Toggle | ui/toggle.tsx | 单个开关按钮（自实现受控/非受控） | pressed, onPressedChange |
| ToggleGroup / ToggleGroupItem | ui/toggle-group.tsx | 切换按钮组（简化自实现） | pressed, onPressedChange, value |
| DirectionProvider / useDirection | ui/direction.tsx | base-ui 方向(RTL) Provider 再导出（非组件） | children |

## 废弃与遗留

- `ui/toast.tsx` / `ui/toaster.tsx`：**已废弃**，统一使用 `ui/sonner.tsx` 的 `Toaster` + `toast()`（lint:ui-governance 强制）。
- `components/kibo-ui/`：迁移中遗留，仅 `language-switcher.tsx` 仍被使用（settings/appearance-section），其余禁止新增引用。
- `ui/index.ts` barrel：无人使用，导入请按文件路径。
