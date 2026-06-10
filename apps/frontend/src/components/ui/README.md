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
6. **全局错误**：`ErrorBoundary` + `Sonner Toaster`（已集成到 `main.tsx`）
7. **Mutation 状态**：按钮使用 `isPending` 控制 `disabled` 和文案
