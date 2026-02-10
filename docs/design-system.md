# UI/UX 设计规范（Design System）

本文件定义 Agent Project Manager 的 UI/UX 设计规范，基于 **TailwindCSS + shadcn/ui + anime.js** 技术栈，遵循现代化、动感、克制的设计理念。

---

## 1. 设计原则

### 1.1 核心设计理念

**1. 克制与聚焦（Restraint & Focus）**
- 避免过度设计，每个元素都有明确的目的
- 通过留白和层次突出核心内容
- 减少视觉噪音，保持界面简洁

**2. 动感与流畅（Motion & Fluidity）**
- 使用动画增强用户体验，而非装饰
- 动画应服务于功能：状态反馈、空间转换、引导注意力
- 保持动画流畅自然，符合物理直觉

**3. 清晰与可读（Clarity & Readability）**
- 信息层次分明，重要内容优先展示
- 使用合适的字体大小、行高、对比度
- 支持无障碍访问（WCAG 2.1 AA 标准）

**4. 一致性（Consistency）**
- 统一的组件样式、间距、颜色使用
- 一致的交互模式与反馈
- 统一的动画时长与缓动函数

---

## 2. 色彩系统（Color System）

### 2.1 主题色彩架构

采用 **CSS 变量 + TailwindCSS** 实现主题系统，支持亮色/暗色模式与自定义主题。

```css
/* 基础色彩变量（在 tailwind.config.js 中定义） */
:root {
  /* 主色调（Primary）*/
  --color-primary-50: #f0f9ff;
  --color-primary-100: #e0f2fe;
  --color-primary-200: #bae6fd;
  --color-primary-300: #7dd3fc;
  --color-primary-400: #38bdf8;
  --color-primary-500: #0ea5e9;  /* 主色 */
  --color-primary-600: #0284c7;
  --color-primary-700: #0369a1;
  --color-primary-800: #075985;
  --color-primary-900: #0c4a6e;
  --color-primary-950: #082f49;

  /* 语义色彩（Semantic）*/
  --color-success: #10b981;
  --color-warning: #f59e0b;
  --color-error: #ef4444;
  --color-info: #3b82f6;

  /* 中性色（Neutral）*/
  --color-neutral-50: #fafafa;
  --color-neutral-100: #f5f5f5;
  --color-neutral-200: #e5e5e5;
  --color-neutral-300: #d4d4d4;
  --color-neutral-400: #a3a3a3;
  --color-neutral-500: #737373;
  --color-neutral-600: #525252;
  --color-neutral-700: #404040;
  --color-neutral-800: #262626;
  --color-neutral-900: #171717;
  --color-neutral-950: #0a0a0a;

  /* 背景与表面（Background & Surface）*/
  --color-background: var(--color-neutral-50);
  --color-surface: #ffffff;
  --color-surface-elevated: #ffffff;
  --color-border: var(--color-neutral-200);

  /* 文本（Text）*/
  --color-text-primary: var(--color-neutral-900);
  --color-text-secondary: var(--color-neutral-600);
  --color-text-tertiary: var(--color-neutral-400);
  --color-text-inverse: #ffffff;
}

/* 暗色主题 */
[data-theme="dark"] {
  --color-background: var(--color-neutral-950);
  --color-surface: var(--color-neutral-900);
  --color-surface-elevated: var(--color-neutral-800);
  --color-border: var(--color-neutral-700);
  --color-text-primary: var(--color-neutral-50);
  --color-text-secondary: var(--color-neutral-400);
  --color-text-tertiary: var(--color-neutral-600);
}
```

### 2.2 TailwindCSS 配置

```javascript
// tailwind.config.js
module.exports = {
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: 'var(--color-primary-50)',
          100: 'var(--color-primary-100)',
          // ... 其他色阶
          500: 'var(--color-primary-500)',
          // ...
        },
        success: 'var(--color-success)',
        warning: 'var(--color-warning)',
        error: 'var(--color-error)',
        info: 'var(--color-info)',
        background: 'var(--color-background)',
        surface: 'var(--color-surface)',
        'surface-elevated': 'var(--color-surface-elevated)',
        border: 'var(--color-border)',
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          inverse: 'var(--color-text-inverse)',
        },
      },
    },
  },
};
```

### 2.3 色彩使用规范

**主色（Primary）**
- 用于主要操作按钮、链接、选中状态、品牌标识
- 避免大面积使用，保持克制

**语义色（Semantic）**
- `success`：成功状态、完成标记、正向反馈
- `warning`：警告提示、需要关注的状态
- `error`：错误提示、危险操作、删除按钮
- `info`：信息提示、帮助说明

**中性色（Neutral）**
- 用于文本、边框、背景、分割线
- 通过不同色阶建立视觉层次

**使用示例：**
```tsx
// ✅ 正确：使用语义化颜色
<Button variant="destructive">删除</Button>
<Badge variant="success">已完成</Badge>

// ❌ 错误：直接使用十六进制颜色
<div style={{ color: '#ef4444' }}>错误</div>
```

---

## 3. 字体系统（Typography）

### 3.1 字体族

```css
/* 使用系统字体栈，保证跨平台一致性 */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 
  'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 
  'Helvetica Neue', sans-serif;

/* 代码字体 */
font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Fira Code', 
  'Droid Sans Mono', 'Source Code Pro', monospace;
```

### 3.2 字体尺寸与行高

```javascript
// tailwind.config.js
fontSize: {
  'xs': ['0.75rem', { lineHeight: '1rem' }],      // 12px / 16px
  'sm': ['0.875rem', { lineHeight: '1.25rem' }],  // 14px / 20px
  'base': ['1rem', { lineHeight: '1.5rem' }],      // 16px / 24px
  'lg': ['1.125rem', { lineHeight: '1.75rem' }],  // 18px / 28px
  'xl': ['1.25rem', { lineHeight: '1.75rem' }],   // 20px / 28px
  '2xl': ['1.5rem', { lineHeight: '2rem' }],       // 24px / 32px
  '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px / 36px
  '4xl': ['2.25rem', { lineHeight: '2.5rem' }],   // 36px / 40px
}
```

### 3.3 文本样式规范

**标题层级：**
- `h1`：页面主标题（`text-4xl` / `font-bold`）
- `h2`：区块标题（`text-3xl` / `font-semibold`）
- `h3`：小节标题（`text-2xl` / `font-semibold`）
- `h4`：子标题（`text-xl` / `font-medium`）

**正文：**
- 主要文本：`text-base` / `text-text-primary`
- 次要文本：`text-sm` / `text-text-secondary`
- 辅助文本：`text-xs` / `text-text-tertiary`

**使用示例：**
```tsx
<h1 className="text-4xl font-bold text-text-primary mb-4">
  项目仪表盘
</h1>
<p className="text-base text-text-secondary">
  这里是描述文本，使用次要文本颜色以建立层次。
</p>
```

---

## 4. 间距系统（Spacing）

### 4.1 间距规范

使用 TailwindCSS 的间距系统（基于 4px 基准）：

```javascript
// 常用间距值
spacing: {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  8: '2rem',      // 32px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
}
```

### 4.2 间距使用原则

- **组件内部间距**：使用 `p-4`、`gap-3` 等小间距
- **组件之间间距**：使用 `mb-6`、`mt-8` 等中等间距
- **区块之间间距**：使用 `mb-12`、`mt-16` 等大间距
- **保持一致性**：同一层级使用相同间距值

---

## 5. 动画系统（Animation System）

### 5.1 动画原则

1. **功能优先**：动画服务于用户体验，而非装饰
2. **自然流畅**：使用符合物理直觉的缓动函数
3. **性能优化**：优先使用 CSS transform 和 opacity
4. **可访问性**：尊重用户的 `prefers-reduced-motion` 偏好

### 5.2 动画时长规范

```typescript
// 动画时长常量
export const ANIMATION_DURATION = {
  instant: 0,        // 0ms - 即时反馈
  fast: 150,         // 150ms - 微交互
  normal: 300,       // 300ms - 标准过渡
  slow: 500,         // 500ms - 复杂动画
  slower: 800,       // 800ms - 页面过渡
} as const;
```

### 5.3 缓动函数（Easing）

使用 anime.js 内置缓动函数，或通过 CSS 定义：

```css
/* 标准缓动 */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);

/* 弹性缓动（用于有趣的交互） */
--ease-spring: cubic-bezier(0.68, -0.55, 0.265, 1.55);
```

### 5.4 anime.js 使用规范

**基础动画模式：**

```typescript
// utils/animations.ts
import { animate } from 'animejs';

// 1. 淡入淡出
export function fadeIn(element: string | HTMLElement, duration = 300) {
  return animate(element, {
    opacity: [0, 1],
    duration,
    easing: 'easeOutQuad',
  });
}

export function fadeOut(element: string | HTMLElement, duration = 300) {
  return animate(element, {
    opacity: [1, 0],
    duration,
    easing: 'easeInQuad',
  });
}

// 2. 滑入滑出
export function slideInUp(element: string | HTMLElement, duration = 300) {
  return animate(element, {
    translateY: [20, 0],
    opacity: [0, 1],
    duration,
    easing: 'easeOutCubic',
  });
}

// 3. 缩放动画
export function scaleIn(element: string | HTMLElement, duration = 200) {
  return animate(element, {
    scale: [0.95, 1],
    opacity: [0, 1],
    duration,
    easing: 'easeOutBack',
  });
}

// 4. 交错动画（Stagger）
export function staggerFadeIn(
  elements: string | NodeList,
  delay = 50,
  duration = 300
) {
  return animate(elements, {
    opacity: [0, 1],
    translateY: [10, 0],
    duration,
    delay: (el, i) => i * delay,
    easing: 'easeOutQuad',
  });
}
```

**在 React 组件中使用：**

```tsx
// components/AnimatedCard.tsx
import { useEffect, useRef } from 'react';
import { fadeIn } from '@/utils/animations';

export function AnimatedCard({ children, delay = 0 }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      fadeIn(ref.current, 300).delay = delay;
    }
  }, []);

  return (
    <div ref={ref} className="opacity-0">
      {children}
    </div>
  );
}
```

### 5.5 常见动画场景

**1. 页面过渡：**
```tsx
// 页面切换时的淡入
useEffect(() => {
  fadeIn('.page-content', 400);
}, []);
```

**2. 列表项出现：**
```tsx
// 任务列表项交错出现
useEffect(() => {
  staggerFadeIn('.task-item', 30, 250);
}, [tasks]);
```

**3. 按钮点击反馈：**
```tsx
// 按钮点击时的缩放反馈
const handleClick = () => {
  animate('.button', {
    scale: [1, 0.95, 1],
    duration: 150,
    easing: 'easeOutQuad',
  });
};
```

**4. 模态框出现：**
```tsx
// 模态框背景淡入 + 内容滑入
useEffect(() => {
  fadeIn('.modal-backdrop', 200);
  slideInUp('.modal-content', 300).delay = 100;
}, []);
```

### 5.6 可访问性：尊重用户偏好

```tsx
// hooks/use-reduced-motion.ts
import { useEffect, useState } from 'react';

export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

// 使用示例
const prefersReducedMotion = useReducedMotion();
const duration = prefersReducedMotion ? 0 : 300;
```

---

## 6. 组件规范（Component Guidelines）

### 6.1 shadcn/ui 组件定制

基于 shadcn/ui 组件库，通过 TailwindCSS 定制样式，保持设计一致性。

**按钮（Button）：**
```tsx
// components/ui/button.tsx（基于 shadcn/ui）
import { Button } from '@/components/ui/button';

// 使用示例
<Button variant="default" size="default">
  主要操作
</Button>
<Button variant="ghost" size="sm">
  次要操作
</Button>
<Button variant="destructive" size="lg">
  危险操作
</Button>
```

**卡片（Card）：**
```tsx
// 使用 shadcn/ui Card 组件
<Card className="p-6 hover:shadow-lg transition-shadow duration-300">
  <CardHeader>
    <CardTitle>项目标题</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-text-secondary">内容</p>
  </CardContent>
</Card>
```

### 6.2 自定义组件规范

**任务卡片（TaskCard）：**
```tsx
// components/task/task-card.tsx
export function TaskCard({ task, onClick }) {
  return (
    <div
      className="
        bg-surface border border-border rounded-lg p-4
        hover:border-primary-300 hover:shadow-md
        transition-all duration-200 cursor-pointer
        group
      "
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-base font-medium text-text-primary group-hover:text-primary-600 transition-colors">
          {task.title}
        </h3>
        <Badge variant={getStatusVariant(task.status)}>
          {task.status}
        </Badge>
      </div>
      <p className="text-sm text-text-secondary line-clamp-2">
        {task.description}
      </p>
    </div>
  );
}
```

**加载状态（Loading）：**
```tsx
// components/ui/loading.tsx
import { animate } from 'animejs';

export function LoadingSpinner() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      animate(ref.current, {
        rotate: 360,
        duration: 1000,
        loop: true,
        easing: 'linear',
      });
    }
  }, []);

  return (
    <div
      ref={ref}
      className="w-6 h-6 border-2 border-primary-200 border-t-primary-500 rounded-full"
    />
  );
}
```

---

## 7. 布局系统（Layout System）

### 7.1 网格系统

使用 TailwindCSS Grid 和 Flexbox：

```tsx
// 主布局：侧边栏 + 主内容
<div className="flex h-screen">
  <aside className="w-64 bg-surface border-r border-border">
    {/* 侧边栏 */}
  </aside>
  <main className="flex-1 overflow-auto">
    {/* 主内容 */}
  </main>
</div>

// 卡片网格
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  {items.map(item => <Card key={item.id} {...item} />)}
</div>
```

### 7.2 容器宽度

```tsx
// 内容容器最大宽度
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
  {/* 内容 */}
</div>
```

### 7.3 响应式断点

```javascript
// tailwind.config.js
screens: {
  'sm': '640px',   // 小屏设备
  'md': '768px',   // 平板
  'lg': '1024px',  // 桌面
  'xl': '1280px',  // 大桌面
  '2xl': '1536px', // 超大桌面
}
```

---

## 8. 交互规范（Interaction Guidelines）

### 8.1 悬停状态（Hover）

```tsx
// 按钮悬停
<button className="
  bg-primary-500 text-white px-4 py-2 rounded-lg
  hover:bg-primary-600
  active:bg-primary-700
  transition-colors duration-150
">
  按钮
</button>

// 卡片悬停
<div className="
  hover:shadow-lg hover:-translate-y-1
  transition-all duration-200
">
  卡片内容
</div>
```

### 8.2 焦点状态（Focus）

```tsx
// 可访问的焦点样式
<button className="
  focus:outline-none
  focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
  focus-visible:ring-2 focus-visible:ring-primary-500
">
  按钮
</button>
```

### 8.3 加载状态

```tsx
// 按钮加载状态
<Button disabled={isLoading}>
  {isLoading ? (
    <>
      <LoadingSpinner className="mr-2" />
      加载中...
    </>
  ) : (
    '提交'
  )}
</Button>
```

### 8.4 空状态

```tsx
// 空状态设计
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mb-4">
    <Icon name="inbox" className="w-8 h-8 text-neutral-400" />
  </div>
  <h3 className="text-lg font-medium text-text-primary mb-2">
    暂无任务
  </h3>
  <p className="text-sm text-text-secondary mb-4">
    创建你的第一个任务开始使用
  </p>
  <Button>创建任务</Button>
</div>
```

---

## 9. 主题切换（Theme Switching）

### 9.1 主题实现

```tsx
// hooks/use-theme.ts
import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = document.documentElement;
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';

    const currentTheme = theme === 'system' ? systemTheme : theme;
    setResolvedTheme(currentTheme);

    root.setAttribute('data-theme', currentTheme);
    root.classList.toggle('dark', currentTheme === 'dark');
  }, [theme]);

  return { theme, setTheme, resolvedTheme };
}

// components/theme-toggle.tsx
export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  return (
    <button
      onClick={() => {
        const next: Theme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
        setTheme(next);
      }}
      className="p-2 rounded-lg hover:bg-surface-elevated transition-colors"
      aria-label="切换主题"
    >
      {resolvedTheme === 'dark' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
}
```

### 9.2 自定义主题色

```tsx
// hooks/use-custom-theme.ts
export function useCustomTheme() {
  const setPrimaryColor = (color: string) => {
    document.documentElement.style.setProperty('--color-primary-500', color);
    // 可以动态计算其他色阶
  };

  return { setPrimaryColor };
}
```

---

## 10. 可访问性（Accessibility）

### 10.1 键盘导航

- 所有交互元素应支持键盘操作
- 使用 `Tab` 键导航，`Enter`/`Space` 激活
- 提供清晰的焦点指示器

### 10.2 ARIA 标签

```tsx
<button
  aria-label="删除任务"
  aria-describedby="delete-help-text"
>
  <TrashIcon />
</button>
<span id="delete-help-text" className="sr-only">
  此操作不可撤销
</span>
```

### 10.3 颜色对比度

- 文本与背景对比度至少 4.5:1（WCAG AA）
- 大文本（18px+）至少 3:1
- 使用工具检查：WebAIM Contrast Checker

### 10.4 屏幕阅读器支持

```tsx
// 使用 sr-only 类隐藏视觉元素但保留给屏幕阅读器
<span className="sr-only">加载中，请稍候</span>
```

---

## 11. 响应式设计（Responsive Design）

### 11.1 移动优先

```tsx
// 移动优先的响应式设计
<div className="
  grid
  grid-cols-1        // 移动端：1列
  sm:grid-cols-2     // 小屏：2列
  lg:grid-cols-3     // 大屏：3列
  xl:grid-cols-4     // 超大屏：4列
  gap-4
">
  {items.map(item => <Card key={item.id} />)}
</div>
```

### 11.2 触摸友好

- 按钮最小尺寸：44x44px（iOS 推荐）
- 增加触摸目标间距
- 避免悬停依赖的交互

---

## 12. 性能优化

### 12.1 动画性能

- 使用 `transform` 和 `opacity`（GPU 加速）
- 避免动画 `width`、`height`、`top`、`left`
- 使用 `will-change` 提示浏览器优化

```tsx
<div className="will-change-transform">
  {/* 动画元素 */}
</div>
```

### 12.2 懒加载与代码分割

```tsx
// 路由级别的代码分割
const ProjectPage = lazy(() => import('./pages/ProjectPage'));

// 图片懒加载
<img src={src} loading="lazy" alt={alt} />
```

---

## 13. 设计令牌（Design Tokens）

### 13.1 设计令牌定义

```typescript
// design-tokens.ts
export const designTokens = {
  colors: {
    primary: {
      50: '#f0f9ff',
      500: '#0ea5e9',
      900: '#0c4a6e',
    },
    // ...
  },
  spacing: {
    xs: '0.5rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '2rem',
    xl: '3rem',
  },
  typography: {
    fontFamily: {
      sans: '-apple-system, BlinkMacSystemFont, ...',
      mono: 'SF Mono, Monaco, ...',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      // ...
    },
  },
  animation: {
    duration: {
      fast: 150,
      normal: 300,
      slow: 500,
    },
    easing: {
      default: 'cubic-bezier(0.4, 0, 0.2, 1)',
      spring: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    },
  },
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    full: '9999px',
  },
} as const;
```

---

## 14. 组件示例库

### 14.1 按钮变体

```tsx
// 主要按钮
<Button variant="default" size="default">主要操作</Button>

// 次要按钮
<Button variant="outline" size="default">次要操作</Button>

// 文本按钮
<Button variant="ghost" size="sm">文本操作</Button>

// 危险按钮
<Button variant="destructive" size="lg">删除</Button>
```

### 14.2 输入框

```tsx
<Input
  type="text"
  placeholder="请输入..."
  className="w-full"
  aria-label="任务标题"
/>
```

### 14.3 卡片

```tsx
<Card className="p-6">
  <CardHeader>
    <CardTitle>标题</CardTitle>
    <CardDescription>描述</CardDescription>
  </CardHeader>
  <CardContent>
    {/* 内容 */}
  </CardContent>
  <CardFooter>
    <Button>操作</Button>
  </CardFooter>
</Card>
```

---

## 15. 设计检查清单

### 15.1 视觉检查

- [ ] 色彩使用符合规范
- [ ] 字体大小与行高合适
- [ ] 间距一致
- [ ] 对齐整齐
- [ ] 阴影与边框使用恰当

### 15.2 交互检查

- [ ] 所有交互元素有悬停状态
- [ ] 焦点状态清晰可见
- [ ] 加载状态有反馈
- [ ] 错误状态有提示
- [ ] 动画流畅自然

### 15.3 可访问性检查

- [ ] 颜色对比度达标
- [ ] 支持键盘导航
- [ ] ARIA 标签完整
- [ ] 屏幕阅读器友好
- [ ] 支持 `prefers-reduced-motion`

---

## 16. 工具与资源

### 16.1 设计工具

- **Figma**：设计稿与组件库
- **Tailwind CSS IntelliSense**：VS Code 插件
- **Headless UI**：无障碍组件基础（shadcn/ui 基于此）

### 16.2 参考资源

- [TailwindCSS 文档](https://tailwindcss.com/docs)
- [shadcn/ui 组件库](https://ui.shadcn.com/)
- [anime.js 文档](https://animejs.com/)
- [WCAG 2.1 指南](https://www.w3.org/WAI/WCAG21/quickref/)

---

## 17. 总结

本设计规范提供了：

1. ✅ **设计原则**：克制、动感、清晰、一致
2. ✅ **色彩系统**：主题支持、语义化使用
3. ✅ **字体系统**：层次分明、易于阅读
4. ✅ **动画系统**：基于 anime.js 的流畅动画
5. ✅ **组件规范**：基于 shadcn/ui 的定制指南
6. ✅ **布局系统**：响应式、灵活的布局方案
7. ✅ **交互规范**：统一的交互模式
8. ✅ **可访问性**：WCAG 2.1 AA 标准
9. ✅ **主题系统**：亮色/暗色/自定义主题支持

在实际开发中，应严格遵循本规范，保持设计一致性，提升用户体验。
