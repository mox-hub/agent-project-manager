import { CheckCircle2, SunMoon } from 'lucide-react';

import { RawButton } from '@/components/raw/raw-button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

/**
 * ThemeModeCard —— 主题模式卡片（语义组件层，批 G1 第三件）。
 *
 * 三档主题意图的唯一实现：**日间 / 夜间 / 跟随系统**。原为
 * `modules/settings/pages/sections/appearance-section.tsx` 内的内联 JSX
 * （2026-09-29 提取，同一份实现当时只画得出日间/夜间两档）。
 *
 * **一档意图、两档生效**：选择器给出的是「意图」（含 `system`），而落地的主题只有
 * light / dark 两种。`system` 由 `shared/theme` 按 `prefers-color-scheme` 解析成
 * `resolvedMode`——解析是**主题状态模型的职责，不是本组件的**，故本组件收的是
 * 「当前选中哪一档」而不是「现在是不是深色」。
 *
 * **为何不 import `shared/theme` 的 `ThemeMode`**：语义层只许依赖 `components/raw`、
 * `components/ui` 与 `@/lib`（同目录 chip / nav-status-dot 一致的口径，G 类方案 §2.2），
 * 不反向依赖应用状态模块。故此处声明同域镜像 `ThemeModeValue`；两边一旦分叉，
 * 调用处把 `ThemeMode` 赋给 `value` 会**编译期报错**，不会静默漏档。
 *
 * **props 面封闭（裁决 G8）**：四个 props 显式声明，不接 `className`、不透传样式、
 * 不 `extends HTMLAttributes`（口径见 `semantic/README.md`）。
 *
 * **a11y**：每档是 `RawButton` 承载的 `aria-pressed` 开关（semantic 目录禁裸控件，
 * 裁决 G3 为 error 级；此处亦非动作钮，不用 `<Button>`——同 Chip 的判例一）；
 * 选中除色环外还有 ✓ 徽标与 `aria-pressed` 两个非颜色信号（§8.5#4）。
 */

/** 三档主题意图（与 `shared/theme` 的 `ThemeMode` 同域镜像，理由见文件头） */
type ThemeModeValue = 'light' | 'dark' | 'system';

/** 展示顺序即数组顺序：日间 → 夜间 → 跟随系统 */
const TILE_MODES: ThemeModeValue[] = ['light', 'dark', 'system'];

/**
 * 预览缩略图的字面色——**刻意不 token 化**：预览要回答的是「那个主题长什么样」，
 * 与当前主题无关。改成随主题走的 token，浅色主题下就画不出「深色预览块」，预览即失真。
 * 同源豁免登记：宪法附录 A.1 行 A8 + `check-palette.mjs` 的同名谓词（成对改动）。
 */
const PREVIEW_SURFACE: Record<'light' | 'dark', string> = {
  light: 'bg-white',
  dark: 'bg-zinc-950',
};
const PREVIEW_PANEL: Record<'light' | 'dark', string> = {
  light: 'bg-muted/40',
  dark: 'bg-muted',
};
const PREVIEW_BAR: Record<'light' | 'dark', string> = {
  light: 'bg-muted',
  dark: 'bg-gray-700',
};
const PREVIEW_BAR_WEAK = 'bg-muted';

/**
 * 单个主题的缩略内容（外层 aspect-video 容器由里程碑提供，此处只管铺满）。
 * `data-slot` / `data-theme-variant` 是行为锚点：测试靠它断言「这一档画的是哪几种
 * 预览」，避免用裸 class 选择器把断言绑死在字面色上（口径同 `RawButton` 的 data-slot）。
 */
function ThemePreview({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div
      data-slot="theme-preview"
      data-theme-variant={theme}
      className={cn('h-full w-full p-2', PREVIEW_SURFACE[theme])}
    >
      <div className={cn('h-full rounded-md p-1.5', PREVIEW_PANEL[theme])}>
        <div className={cn('mb-1 h-2 w-3/4 rounded-xs', PREVIEW_BAR[theme])} />
        <div className={cn('h-1.5 w-1/2 rounded-xs', PREVIEW_BAR_WEAK)} />
      </div>
    </div>
  );
}

/** 一档选择块：预览缩略图 + 名称 + 说明 + 选中徽标 */
function ThemeModeTile({
  mode,
  isActive,
  label,
  desc,
  onSelect,
}: {
  mode: ThemeModeValue;
  isActive: boolean;
  label: string;
  desc: string;
  onSelect: (mode: ThemeModeValue) => void;
}) {
  return (
    <RawButton
      aria-pressed={isActive}
      onClick={() => onSelect(mode)}
      className={cn(
        'relative rounded-xl border-2 p-4 text-left transition-all hover:scale-102',
        isActive ? 'border-border ring-2 ring-accent-blue' : 'border-border hover:border-muted-foreground',
      )}
    >
      {/* 预览窗口：跟随系统用左右分屏同时展示两种主题 */}
      <div className="mb-3 aspect-video w-full overflow-hidden rounded-lg border border-border">
        {mode === 'system' ? (
          <div className="flex h-full w-full">
            <div className="h-full w-1/2">
              <ThemePreview theme="light" />
            </div>
            <div className="h-full w-1/2">
              <ThemePreview theme="dark" />
            </div>
          </div>
        ) : (
          <ThemePreview theme={mode} />
        )}
      </div>
      {/*
        文案色沿用原实现（选中态反而更淡），疑似原始三元条件写反；
        属独立裁决项，本次「抽组件 + 加第三档」不夹带视觉变更。
      */}
      <p className={cn('font-medium', isActive ? 'text-muted-foreground' : 'text-foreground')}>
        {label}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      {isActive && (
        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent-blue">
          <CheckCircle2 size={12} className="text-white" />
        </div>
      )}
    </RawButton>
  );
}

/**
 * 主题模式卡片：Card 外壳（标题栏 + 图标）+ 三档选择器。
 * 文案全部由调用方注入（组件不碰 i18n），故设计系统页可直接静态陈列。
 */
function ThemeModeCard({
  value,
  onChange,
  title,
  options,
}: {
  /** 当前选中的档位（意图，可能是 `system`） */
  value: ThemeModeValue;
  onChange: (mode: ThemeModeValue) => void;
  /** 卡片标题（如「主题模式」） */
  title: string;
  /** 三档的文案——键域与 value 同域，缺一档在类型层即不成立 */
  options: Record<ThemeModeValue, { label: string; desc: string }>;
}) {
  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <SunMoon size={16} className="text-accent-blue" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {TILE_MODES.map((mode) => (
            <ThemeModeTile
              key={mode}
              mode={mode}
              isActive={value === mode}
              label={options[mode].label}
              desc={options[mode].desc}
              onSelect={onChange}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export { ThemeModeCard };
export type { ThemeModeValue };
