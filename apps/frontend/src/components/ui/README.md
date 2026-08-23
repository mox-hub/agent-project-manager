# UI 组件库 — 设计系统文档

> 统一管理前端 UI 组件的使用方式、最佳实践和设计规范。

---

## 加载状态组件

### Spinner

旋转加载指示器，支持多尺寸。

```tsx
import { Spinner } from '@/components/ui/spinner'

// 尺寸：sm (16px) | md (20px) | lg (24px) | xl (32px)
<Spinner size="md" />
<Spinner size="lg" label="加载中" />
```

### Skeleton 骨架屏套件

用于内容加载前占位，提供流畅的视觉过渡。

| 组件 | 用途 | 关键 Props |
|------|------|----------|
| `Skeleton` | 基础原子组件 | `className` |
| `SkeletonText` | 多行文本 | `lines`, `lastLineWidth` |
| `SkeletonCard` | 卡片形 | `avatar`, `title`, `lines` |
| `SkeletonAvatar` | 圆形头像 | `size: sm\|md\|lg` |
| `SkeletonList` | 列表骨架 | `count`, `avatar`, `lines` |
| `SkeletonTable` | 表格骨架 | `rows`, `columns` |
| `SkeletonChart` | 图表骨架 | — |

```tsx
import { SkeletonList, SkeletonCard, SkeletonChart } from '@/components/ui/skeleton'

// 列表骨架
<SkeletonList count={6} avatar />

// 卡片骨架
<SkeletonCard avatar title description lines={3} />

// 图表骨架
<SkeletonChart />
```

### LoadingOverlay 全局加载遮罩

覆盖层加载指示器。

```tsx
import { LoadingOverlay, LoadingProvider, useLoading } from '@/components/ui/loading-overlay'

// 顶层包裹（已由 main.tsx 自动设置）
<LoadingProvider defaultMode="bar">
  <App />
</LoadingProvider>

// 在组件中使用 hook
function MyComponent() {
  const { show, hide } = useLoading()

  const handleAction = async () => {
    show({ message: '处理中...', mode: 'overlay' })
    await doSomething()
    hide()
  }
}
```

**mode 类型**:
- `bar` — 顶部细进度条（默认，用于全局 TanStack Query 拦截）
- `overlay` — 全屏遮罩
- `inline` — 局部居中

### AsyncState 组合封装

统一处理 `isLoading / isError / isEmpty` 三态。

```tsx
import { AsyncState } from '@/components/ui/async-state'

<AsyncState
  isLoading={isLoading}
  isError={!!error}
  error={error?.message}
  onRetry={refetch}
  emptyTitle="暂无数据"
  emptyDescription="创建第一个项目开始"
>
  <Content />
</AsyncState>
```

---

## 错误处理组件

### ErrorBoundary 全局错误边界

React 组件树级别的错误捕获。

```tsx
import { ErrorBoundary } from '@/shared/components/error-boundary'

<ErrorBoundary errorCode="E500">
  <MyComponent />
</ErrorBoundary>
```

### PageErrorFallback 页面级错误降级

用于 `react-router` 的 `errorElement`，不遮挡侧边栏。

### ErrorPage 路由错误页

用于 404 / 500 等 HTTP 错误，由 React Router 路由级 `errorElement` 触发。

### Alert 错误提示

用于局部错误展示。

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

<Alert variant="destructive">
  <AlertTriangleIcon className="size-4" />
  <AlertTitle>加载失败</AlertTitle>
  <AlertDescription>
    无法加载数据，请稍后重试。
  </AlertDescription>
</Alert>
```

---

## 右键菜单 ContextMenu

```tsx
import { ContextMenu, createMenuItems } from '@/components/ui/context-menu'
import { CopyIcon, EditIcon, TrashIcon } from 'lucide-react'

const items = createMenuItems([
  {
    label: '编辑',
    icon: <EditIcon className="size-4" />,
    shortcut: '⌘E',
    onClick: () => handleEdit(),
  },
  {
    label: '复制',
    icon: <CopyIcon className="size-4" />,
    shortcut: '⌘C',
    onClick: () => handleCopy(),
  },
  { label: 'separator', separatorAfter: true },
  {
    label: '删除',
    icon: <TrashIcon className="size-4" />,
    destructive: true,
    onClick: () => handleDelete(),
  },
])

<ContextMenu items={items}>
  <div>右键点击这里</div>
</ContextMenu>
```

---

## 快捷键展示 Kbd

```tsx
import { Kbd, KbdGroup } from '@/components/ui/kbd'

<Kbd>⌘K</Kbd>
<KbdGroup>
  <Kbd>Ctrl</Kbd>
  <Kbd>S</Kbd>
</KbdGroup>
```

---

## 页面骨架组件

### PageHeader 单行页头

每个页面顶部的统一页头：**单行高度**（标题行高 + 上下 8px 间距），裸图标与 `text-lg` 标题视觉同高，标题后跟收藏星标（点击切换收藏，持久化并显示在侧边栏"收藏"分区）和计数胶囊，右侧为操作按钮组。无副标题/描述行 —— 数量类信息放入 `metrics`。计数胶囊为 integration 页 StatusBadge 的同款形态（浅色底 + 描边 + 状态点 + 语义色文字）的小号版本。

```tsx
import { PageHeader } from '@/components/ui/page-header'

<PageHeader
  icon={ListTodo}                     // 裸图标，size-5，与标题同高
  iconColor="text-accent-blue"
  title={t('task.title')}
  metrics={[                          // 收藏星标后的计数胶囊（可选）
    { id: 'total', label: 'Tasks', value: 248 },
    { id: 'open', label: 'Open', value: 13, tone: 'warning' },  // success | warning | danger | default
  ]}
  actions={                           // 右侧操作按钮组（可选）
    <HeaderActionButton icon={Plus} label={t('task.create')} />
  }
/>
```

### HeaderActionButton 圆形展开按钮

PageHeader 操作区专用按钮：默认为 `h-8` **正圆形仅图标**；hover / focus-visible 时展开为胶囊（左侧圆形图标区 + 右侧文本，弧度与圆形一致）。展开是真实宽度变化，按钮组内兄弟按钮自然位移。`variant` 与 Button 语义一致：`primary`（默认实心）/ `outline` / `secondary` / `ghost` / `danger`。

```tsx
import { HeaderActionButton } from '@/components/ui/header-action-button'

<HeaderActionButton icon={Plus} label="New Task" />                          // 主操作（实心）
<HeaderActionButton icon={RefreshCw} label="Refresh" variant="outline" />   // 次要操作
<HeaderActionButton icon={ArrowLeft} label="Back" variant="ghost" />        // 返回导航
```

约束：`label` 必填（展开文本 + aria-label）；操作区多个按钮之间用系统标准间隔 `gap-2`（PageHeader 已内置）；不要在 PageHeader actions 中放普通文本 `<Button>`。

### ToolbarRow 列表页工具栏 + useToolbarViews 已保存视图

列表页 PageHeader 之下的统一工具栏，**无上下分界线、无搜索框**（搜索移入筛选下拉，内置 300ms 防抖）。三段布局：左侧已保存视图胶囊（"+" 新建、点击激活胶囊编辑名称/图标/删除）、中间视图样式切换（≤3 种居中，圆角矩形滑块 `SegmentedControl variant="rect"`（rounded-md 轨道 + rounded-sm 滑块、2px 内缩，接近矩形）；选项可传 `tone: 'blue'|'green'|'yellow'|'red'|'purple'` 为激活滑块着色；>3 种自动收进右侧常驻下拉按钮，可用 `viewStyle.layout` 强制）、右侧按钮组（默认 筛选/显示/下载 三个下拉按钮，复用 HeaderActionButton；页面通过 `items` 元数据驱动菜单，传 `false` 移除默认按钮，`extraActions` 注册附加按钮）。菜单按钮支持 `badge` 数字红点角标（如生效中的筛选数量，显示在按钮右上角）。

视图 = 页面全量状态快照（筛选、显示样式、排序等，结构由页面自定义，天然可扩展），由 `useToolbarViews` 按页持久化到 localStorage（`toolbar-views:<key>`），至少保留一个内置视图。

```tsx
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row'

const toolbar = useToolbarViews({
  key: 'tasks-page',                              // localStorage: toolbar-views:tasks-page
  defaults: [{ id: 'all', name: '全部', icon: 'list', builtIn: true, snapshot: { status: 'all' } }],
  onApply: (snapshot) => { /* 把快照恢复到页面 state */ },
})
const { updateActiveSnapshot } = toolbar
useEffect(() => {
  updateActiveSnapshot({ status: statusFilter, viewStyle: viewMode })  // 上报当前状态
}, [updateActiveSnapshot, statusFilter, viewMode])

<ToolbarRow
  aiId="task.tasks-list"
  views={toolbar.views}
  activeViewId={toolbar.activeViewId}
  onSelectView={toolbar.selectView}
  onCreateView={toolbar.createView}
  onUpdateView={toolbar.updateView}
  onDeleteView={toolbar.deleteView}
  viewStyle={{
    value: viewMode,
    onChange: setViewMode,
    options: [
      { value: 'list', label: '列表', icon: List },
      { value: 'board', label: '看板', icon: Kanban },
    ],
  }}
  filterMenu={{                                   // 传 false 移除筛选按钮
    badge: activeFilterCount,                      // 右上角数字红点（>0 显示）
    search: { value: query, onChange: setQuery, placeholder: '搜索…' },
    items: [
      { type: 'label', label: '状态' },
      { type: 'checkbox', label: '进行中', checked: status === 'in_progress', onSelect: () => setStatus('in_progress') },
    ],
  }}
  displayMenu={{ items: [{ type: 'label', label: '分组' }, /* checkbox 单/多选项 */] }}
  downloadMenu={{ items: [{ type: 'label', label: '导出' }, { type: 'item', label: 'CSV', disabled: true }] }}
  extraActions={[{ id: 'refresh', icon: RefreshCw, label: '刷新', onClick: handleRefresh }]}
/>
// items 项类型：'item'（点击后自动关闭）| 'label' | 'separator' | 'checkbox'（多选不自动关闭）
// 视图可选图标 key：list grid board gantt star flag inbox tag target zap bug folder clock user check sparkles
```

配套基元：`AnchoredMenu`（portal + fixed + 视口翻转的下拉面板），需要自制锚定下拉时复用它，不要手写 fixed 面板。

### SubPageToolbar 二级子页面工具栏

详情页 / 二级页面顶部的统一工具栏，放在 PageHeader 之上，布局与 ToolbarRow 一致（三栏 grid、单行、无分界线）：最左返回按钮（默认 `navigate(-1)`，可传 `onBack` 显式路径）→ 面包屑（ChevronRight 分隔，中间层可点击返回对应层级，末项高亮）；居中为子页签切换（`SegmentedControl variant="rect"` 滑块，与主工具栏同款；选项可传 `tone` 高亮色调）；右侧为翻页器（同集合内浏览上一/下一实体，接 `useEntityNavigation`）+ 自定义按钮组（`actions` 传 HeaderActionButton 实例）+ 固定最后一位的右侧边栏开关（`sidebar` 注入开关状态，无右侧面板的页面不传）。

```tsx
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar'

<SubPageToolbar
  aiId="task.task-detail"
  onBack={() => navigate(-1)}
  breadcrumbs={[
    { label: 'Tasks', to: '/app/tasks' },
    { label: project.name, to: `/app/projects/${task.projectId}` },
    { label: shortId },
  ]}
  tabs={{ value: tab, onChange: setTab, items: [{ value: 'board', label: '看板', icon: Kanban }] }}
  pager={{ hasPrev: nav.hasPrev, hasNext: nav.hasNext, onPrev, onNext, position: `${nav.currentPosition}/${nav.total}` }}
  actions={<HeaderActionButton icon={Plus} label="新建" variant="outline" />}
  sidebar={{ open: !asideHidden, onToggle: () => setAsideHidden((v) => !v) }}
/>
```

---

## 全局 TanStack Query 拦截

`main.tsx` 已自动配置：

- `LoadingProvider` 在 `QueryClientProvider` 之下
- `GlobalLoadingState` 监听所有 TanStack Query 请求
- 当有 pending 请求时显示顶部 `bar` 模式进度条
- 请求全部完成后自动隐藏

无需手动管理，mutation 的 `onError` 配合 `toast.error()` 展示具体错误。

---

## 最佳实践

1. **页面级加载**：使用 `SkeletonList` / `SkeletonCard` 骨架屏
2. **局部加载**：使用 `Spinner` 组件
3. **操作失败**：在 mutation `onError` 中使用 `toast.error()`
4. **组件级错误**：`Alert` + 重试按钮
5. **页面级错误**：`PageErrorFallback`（已集成到 `ShellLayout`）
6. **全局错误**：`ErrorBoundary` + `ToastProvider`（ui/toast，已集成到 `main.tsx`）
7. **Mutation 状态**：按钮使用 `isPending` 控制 `disabled` 和文案
