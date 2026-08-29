# COMPONENTS.md — 前端组件清单（agent 与人的共用索引）

> **用途**：开发页面前的第一入口。任何页面开发/改造前先查此表，优先复用；**新增 `components/ui/` 组件必须先在此登记**（`pnpm --filter frontend lint:registry` 会强制对账）。
> **登记格式**：每行必须包含 `ui/<文件名>.tsx` 引用。修改组件用途/props 时同步更新本表。
> **导入方式**：按文件路径直接导入（如 `@/components/ui/button`），不使用 barrel。
> **展示预览**：`/app/design-system`（dev-only）可查看组件实际效果，本表是其机器可读索引。
>
> **基线（2026-08）**：全部基础组件已通过 shadcn CLI 统一为**官方 base-ui 配方**（Tailwind v4）；
> 少数组件带「兼容层」扩展（历史 API，文件内有标注，官方升级时保留）：button（asChild/primary/danger）、
> tooltip（asChild/delayDuration）、context-menu（元数据 items API）、dialog（keepDefaultWidth）、
> tabs（segmented 变体）、checkbox/switch（onChange）、popover（PopoverAnchor）、input（PasswordInput）、
> skeleton（套件）、form（react-hook-form 集成，官方已废弃故保留旧配方）、toast（sonner 命令式 API）。
> 其余为产品自研组件。
>
> **coss ui 组件（2026-08 起）**：[coss.com/ui](https://coss.com/ui) 是 Base UI + Tailwind 的可复制组件集（注册表
> `https://coss.com/ui/r/<name>.json`），与 base-ui 唯一基线同源。已引入：toast（替换 sonner）、menu、
> date-picker（组合件）、number-field、autocomplete、meter、checkbox-group、checkbox（换 coss 配方）、
> scroll-area（升级 coss 配方）+ hooks/use-copy-to-clipboard.ts。其余组件沿用官方 shadcn 配方，勿重复引入。

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
| 反馈 | `toast()` + `ToastProvider`(ui/toast，唯一合法 toast) / `useConfirm`(确认框) / `Alert` |
| hover 路由预览卡 | `RoutePreviewTrigger`（shared/route-preview/）：tab 标签与侧栏收藏项 hover 弹预览卡；路径→类型解析在 route-preview-registry，按类型分发富卡片（项目/任务/Bug/文档/仓库/成员/团队/验收），数据复用各模块现有 query 缓存（miss 静默补拉），未注册路由走 generic 卡 |
| 收藏星标 | `FavoriteToggle`（shared/components/favorite-toggle.tsx）：可复用收藏按钮，PageHeader 内置同款；详情页 SubPageToolbar actions / 项目详情上下文栏/通知/搜索页的收藏入口 |
| 状态统一视觉 | `status-visuals`（shared/status/status-visuals.ts）：任务/项目状态→tone(语义 accent)+图标+i18n 的唯一映射源，消费方：项目列表(StatusPill)、右键子菜单、项目看板、甘特条、任务列表配色 |
| 状态图标底框 | `StatusIconFrame`（shared/status/status-icon-frame.tsx）：tone 语义浅底+圆角框+居中图标的统一底框形态，与 status-visuals 配套；任务/BUG 详情标题、子任务行、动态时间线事件图标 |
| Markdown 渲染 | `MarkdownView`（shared/components/markdown-view.tsx）：react-markdown+remark-gfm 运行时渲染（任务/BUG 描述、评论正文；GFM 表格/任务清单/删除线）；文档模块可编译 MDX 仍走 shared/mdx 管线 |
| Markdown 编辑 | `MarkdownEditor`（shared/components/markdown-editor.tsx）：输入+所见即所得预览的标准编辑器，preview=live 分栏实时渲染（描述）/toggle 编辑预览切换（评论框）；renderInput 可换 MentionTextarea，actions 放表情/发送 |
| 表情选择 | `EmojiPicker`（shared/components/emoji-picker/emoji-picker.tsx）：搜索+常用记录(localStorage)+分类网格面板，调用方包 Popover 触发；数据集 emoji-data.ts 中英文关键词 |
| 动态/评论/表情 | `ActivityFeed`（modules/activity）：操作记录时间线+markdown 评论+表情回应+回复；api/hooks 可独立复用（useActivities 等）；服务端 activity 模块通用落库（task/bug/project 全支持） |

## 完整清单

### 布局与页面骨架

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| PageShell | ui/page-shell.tsx | 页面外壳（内嵌 PageHeader 的整体骨架） | aiPage, title, icon, metrics, actions, children |
| PageHeader | ui/page-header.tsx | 单行页头（图标+标题+收藏星标+计数胶囊+操作组） | title, icon, iconColor, metrics, actions, favoriteId |
| ToolbarRow + useToolbarViews | ui/toolbar-row.tsx | 列表页工具栏（已保存视图+样式切换+筛选/显示/下载下拉）+视图快照持久化 hook | views, viewStyle, filterMenu, displayMenu, downloadMenu, extraActions(支持 render 自定义动作件)；hook: key, defaults, onApply |
| SubPageToolbar | ui/sub-page-toolbar.tsx | 二级页工具栏（返回+面包屑+居中页签+翻页+侧栏开关） | breadcrumbs, tabs, pager, actions, sidebar, onBack |
| RightSidebar / SidebarButtonGroup / SidebarButton / SidebarToggle | ui/right-sidebar.tsx | 详情页右侧栏容器与按钮组（flex 并列可收起） | hidden, width；SidebarButton: icon, label, variant |
| SidebarPanel | ui/sidebar-panel.tsx | 右侧栏折叠面板（圆角矩形↔胶囊） | title, icon, collapsed, onToggle, action |
| Sidebar 套件 | ui/sidebar.tsx | 应用侧栏骨架 | children, SidebarMenuButton: isActive, onClick |
| SectionCard | ui/section-card.tsx | 带标题/描述/操作区的 Card 封装 | title, description, actions, children |
| Resizable 套件 | ui/resizable.tsx | 可调分栏（resizable-panels 封装） | direction, withHandle, defaultSize |
| ScrollArea / ScrollBar | ui/scroll-area.tsx | 滚动容器（coss 配方：滚动条浮现、边缘渐隐 scrollFade、滚动沟位 scrollbarGutter、滚动链隔离 overscrollContain） | className, children, scrollFade, scrollbarGutter, overscrollContain, fill |
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
| Checkbox | ui/checkbox.tsx | 复选框（coss 配方：分层阴影/勾选填充/indeterminate + onCheckedChange 兼容层） | checked, onCheckedChange, value |
| CheckboxGroup | ui/checkbox-group.tsx | 复选组（coss 配方，组值受控） | value, onValueChange |
| Switch | ui/switch.tsx | 开关（base-ui + onCheckedChange 兼容） | checked, onCheckedChange, size |
| RadioGroup / RadioGroupItem | ui/radio-group.tsx | 单选组（base-ui 官方配方） | name, checked, onChange |
| Slider | ui/slider.tsx | 滑块（base-ui 官方配方） | value, onChange, min, max |
| Calendar / CalendarDayButton | ui/calendar.tsx | 日历选择器（react-day-picker 封装） | selected, onSelect, locale, showOutsideDays |
| DatePicker | ui/date-picker.tsx | 日期选择组合件（coss 组合模式：Popover+Calendar+Button；支持自定义胶囊触发器 trigger、presets、footer 清除） | value, onValueChange, trigger, presets, footer, closeOnSelect |
| NumberField 套件 | ui/number-field.tsx | 数字输入（coss 配方：步进按钮/键盘/滚轮，task-form 估时在用） | value, onValueChange, min, max, step, size |
| Autocomplete 套件 | ui/autocomplete.tsx | 自由输入 + 建议过滤（coss 配方，useAutocompleteFilter.contains 手动过滤） | value, onValueChange, AutocompleteInput(showClear), AutocompleteList/Item |
| useCopyToClipboard | hooks/use-copy-to-clipboard.ts | 复制到剪贴板 + 临时已复制状态（coss hook） | timeout, onCopy → { copyToClipboard, isCopied } |
| InputOTP 套件 | ui/input-otp.tsx | 验证码输入（input-otp 库封装） | maxLength, Slot: index |
| Label | ui/label.tsx | 表单标签 | htmlFor, children |
| Field 套件（含 PillInput/PillSelect） | ui/field.tsx | 表单字段布局套件与胶囊输入 | Field: orientation；FieldError: errors 匹配 |
| Form 套件 | ui/form.tsx | react-hook-form 集成层 | FormField: name, render；FormMessage: children |
| InputGroup 套件 | ui/input-group.tsx | 带前后缀的输入组容器 | align(Addon), variant, size |
| FilterBar | ui/filter-bar.tsx | 元数据驱动筛选栏（select/search/视图/分组/自定义） | filters(FilterItem[]), searchConfig, renderExtra |
| SegmentedControl | ui/segmented-control.tsx | 分段切换（pill/rect 滑块，语义色调） | value, options, onChange, variant(pill/rect), tone |
| AvatarPickerField | ui/avatar-picker-field.tsx | 内置头像选择表单字段 | value, onValueChange, memberType(human/ai/all) |
| PropertyPanel 套件（CapsuleSelect/DateCapsuleField/AutoSizeTextarea/PropertyRow/PropsCard/SuggestionsCard 等） | ui/property-panel.tsx | 详情页属性面板（Linear 风格可编辑胶囊+属性行+折叠卡） | CapsuleSelect: value, options, onChange, active；PropsCard: title, collapsed；SuggestionsCard: title, items；DateCapsuleField: placeholder, clearLabel |

### 数据展示

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| Table 套件 | ui/table.tsx | 原生 table 样式化套件（禁止业务代码裸写 `<table>`） | children |
| DataTableShell | ui/data-table-shell.tsx | 表格外壳容器（圆角边框卡片） | children, className |
| DataTable | ui/data-table.tsx | 通用数据表（coss p-table-8 形态：TanStack 排序表头/可选行选择列/客户端或 manual 服务端分页 + footer 区间翻页） | columns, data, getRowId, onRowClick, enableSelection, selectedIds, onSelectedIdsChange, manualPagination, pageSize, emptyContent |
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
| Meter 套件 | ui/meter.tsx | 有界量程表（coss 配方，配额/用量语义；MeterValue 为 render-props children） | value, min, max；MeterValue: children(formatted)=>ReactNode |
| ActivityHeatmap | ui/activity-heatmap.tsx | 活动热力图（GitHub 式日格计数） | data(日序列), days, emptyLabel |
| Chart 套件 + ChartConfig | ui/chart.tsx | recharts 图表封装（主题色注入） | config, children |
| Carousel 套件 | ui/carousel.tsx | 轮播（embla 封装） | opts, orientation, plugins, setApi |
| AttentionRail | ui/attention-rail.tsx | 「需要关注」侧栏（通知/逾期任务/风险项目聚合） | projectId, notifications, overdueTasks, atRiskProjects |

### 反馈 overlay

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| Dialog 套件 | ui/dialog.tsx | 模态对话框（base-ui） | open, onOpenChange；DialogContent: showCloseButton, keepDefaultWidth |
| AlertDialog 套件 | ui/alert-dialog.tsx | 确认对话框（基于 Dialog 复用的套件） | open, onOpenChange, children |
| Sheet 套件 | ui/sheet.tsx | 侧滑面板（base-ui 官方配方） | open, onOpenChange, side, children |
| Drawer 套件 | ui/drawer.tsx | 底部抽屉（base-ui Drawer 官方配方） | open, onOpenChange, children |
| Popover 套件 | ui/popover.tsx | 气泡（base-ui + 兼容 PopoverAnchor） | open, side, align, sideOffset |
| AnchoredMenu | ui/anchored-menu.tsx | 锚定下拉面板基元（portal+fixed+视口翻转） | open, onClose, anchor(Ref), align |
| Tooltip 套件 | ui/tooltip.tsx | 提示浮层（base-ui 官方配方 + 兼容层） | open, delayDuration, side, sideOffset |
| HoverCard 套件 | ui/hover-card.tsx | 悬浮卡（base-ui PreviewCard 官方配方） | children |
| Alert 套件 | ui/alert.tsx | 内联提示条（局部错误/信息展示） | variant, children |
| ToastProvider + toast() / toastManager / AnchoredToastProvider | ui/toast.tsx | coss Toast（base-ui 配方，堆叠/悬停展开/滑动关闭）；toast() 兼容 sonner 命令式 API（success/error/info/warning/loading/dismiss/promise），唯一合法 toast（main.tsx 挂 ToastProvider） | position, portalProps；toast(): message, opts(description/duration/id/action) |
| ~~Toaster（sonner）~~ | — | 已删除（2026-08 coss toast 迁移，sonner 依赖一并移除） | — |
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
| Menu 套件（coss） | ui/menu.tsx | 下拉菜单标准件（coss 配方：分组/勾选/单选/子菜单/快捷键/破坏性项；DropdownMenu* 别名同源） | MenuTrigger, MenuPopup, MenuItem(variant), MenuCheckboxItem, MenuRadioGroup/Item, MenuSub, MenuShortcut |
| ContextMenu 套件 + createMenuItems | ui/context-menu.tsx | 右键菜单（base-ui ContextMenu 原语 + coss Menu 弹出层设计，元数据驱动 items） | items(MenuItem[]), onItemClick |
| DropdownMenu 套件 | ui/dropdown-menu.tsx | 下拉菜单（base-ui 官方配方） | children |
| Menubar 套件 | ui/menubar.tsx | 顶部菜单栏（base-ui 官方配方） | children |
| NavigationMenu 套件 | ui/navigation-menu.tsx | 横向导航菜单（base-ui 官方配方） | children, href |
| TabBar | ui/tab-bar.tsx | 浏览器式多标签栏（读 tabs-context，右键菜单） | className |
| ChapterScrubber | ui/chapter-scrubber.tsx | 章节刻度导航轨（motion/react：hover 余弦放大波 + 预览卡贴边换向，listbox 键盘可达） | chapters(Chapter[]), currentIndex, side, peakLength/restLength/rowHeight/radius, onActiveChange, onSelect, label |
| FloatingDock | ui/floating-dock.tsx | 浮动 Dock（motion/react：桌面 hover 磁性放大 + tooltip，移动端纵向展开按钮） | items(DockItem: title/icon/href), desktopClassName, mobileClassName |

### 基础原语 / 主题工具

| 组件 | 路径 | 用途 | 关键 props |
|------|------|------|-----------|
| Button / PillButton | ui/button.tsx | 主按钮（cva variant/size）与胶囊按钮 | variant, size, asChild |
| ButtonGroup 套件 | ui/button-group.tsx | 按钮组容器（带分隔/文本区） | orientation, children |
| HeaderActionButton | ui/header-action-button.tsx | 页头操作按钮（圆形仅图标，hover 展开胶囊） | icon, label, variant, pinned, trailing |
| Separator | ui/separator.tsx | 分隔线 | orientation |
| Accordion 套件 | ui/accordion.tsx | 手风琴（base-ui 官方配方） | children, className |
| Collapsible 套件 | ui/collapsible.tsx | 折叠面板（base-ui） | defaultOpen, children |
| Toggle | ui/toggle.tsx | 单个开关按钮（base-ui 官方配方） | pressed, onPressedChange |
| ToggleGroup / ToggleGroupItem | ui/toggle-group.tsx | 切换按钮组（base-ui 官方配方） | pressed, onPressedChange, value |
| DirectionProvider / useDirection | ui/direction.tsx | base-ui 方向(RTL) Provider 再导出（非组件） | children |

## 废弃与遗留

- sonner 依赖：**已删除**（2026-08，coss toast 迁移），统一使用 `ui/toast.tsx` 的 `ToastProvider` + `toast()`（lint:ui-governance 强制禁止 `from "sonner"`）。
- `components/kibo-ui/`：**已整体删除**（2026-08，纯转发层无实际价值）；`language-switcher` 迁至 `shared/components/language-switcher.tsx`。`ui/index.ts` barrel 同步删除，一律按文件路径导入。
- `ui/index.ts` barrel：无人使用，导入请按文件路径。
