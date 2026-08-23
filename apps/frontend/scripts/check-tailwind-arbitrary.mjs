import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const ROOT = join(process.cwd(), "src");
const TARGET_EXT = new Set([".ts", ".tsx"]);

// 允许保留的任意值白名单（整 token 精确匹配）。
// 仅限无法 token 化的复杂值（grid 模板、多段 calc、运行时 var()、渐变等）；
// 新增需在 PR 中说明理由。2026-08 全库迁移后登记的存量清单如下。
const ALLOWED_TOKENS = new Set([
  // 过渡属性列表
  "transition-[color,background-color,border-color,box-shadow]",
  "transition-[color,box-shadow]",
  "transition-[color,background-color,border-color,box-shadow,transform,opacity]",
  "transition-[height]",
  "transition-[background-color,border-color,color,transform]",
  "transition-[color,background-color]",
  "transition-[border-radius]",
  "transition-[grid-template-rows]",
  "transition-[left,top,width,height]",
  // grid 模板表达式
  "grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]",
  "grid-cols-[1fr_auto_auto_auto]",
  "grid-cols-[auto_1fr]",
  "grid-cols-[1fr_400px]",
  "grid-cols-[1fr_360px]",
  "grid-cols-[1fr_auto]",
  "grid-cols-[1fr_380px]",
  "grid-cols-[1fr_320px]",
  "grid-cols-[minmax(0,1fr)_190px_auto_auto]",
  "grid-cols-[minmax(0,1fr)_380px]",
  "grid-cols-[auto_100px_1fr_140px_100px_120px_100px_40px]",
  "grid-cols-[4px_auto_100px_1fr_140px_100px_120px_40px]",
  "grid-rows-[auto_auto]",
  "grid-rows-[0fr]",
  "grid-rows-[1fr]",
  // 运行时注入变量（组件内部定位/动画）
  "origin-[var(--transform-origin)]",
  "max-h-[var(--available-height)]",
  "w-[var(--anchor-width)]",
  "h-[var(--collapsible-panel-height)]",
  "max-w-[var(--available-width)]",
  "min-w-[var(--anchor-width)]",
  "left-[var(--active-tab-left)]",
  "top-[var(--active-tab-top)]",
  "w-[var(--active-tab-width)]",
  "h-[var(--active-tab-height)]",
  "translate-x-[var(--radix-toast-swipe-end-x)]",
  "translate-x-[var(--radix-toast-swipe-move-x)]",
  "w-[--radix-popover-trigger-width]",
  // calc / min 表达式
  "rounded-[calc(var(--radius)-5px)]",
  "left-[calc(100%-15px)]",
  "rounded-[min(var(--radius-control),8px)]",
  "rounded-[min(var(--radius-control),10px)]",
  "translate-x-[calc(100%-2px)]",
  "max-h-[min(18rem,calc(var(--available-height)-2.25rem))]",
  "max-w-[calc(100%-2rem)]",
  "rounded-[calc(var(--radius)+2px)]",
  "h-[calc(100%-1px)]",
  "max-h-[calc(100dvh-200px)]",
  "w-[min(96vw,1000px)]",
  "w-[min(96vw,780px)]",
  "w-[min(96vw,720px)]",
  "w-[min(96vw,520px)]",
  // 边缘单次值（动画占位/微调/特殊定位）
  "max-h-[3000px]",
  "h-[18.4px]",
  "text-[0.8rem]",
  "bg-[right_0.5rem_center]",
  "top-[20%]",
  "h-[85vh]",
  "min-h-[40vh]",
  "min-h-[50vh]",
  "max-h-[60vh]",
  "max-h-[85vh]",
  "max-w-[92vw]",
  "max-w-[90vw]",
  "ml-[-0.15rem]",
  "mr-[-0.15rem]",
  "bottom-[-5px]",
  "animate-[loading-bar_1.5s_ease-in-out_infinite]",
  "font-[system-ui]",
  "leading-[1.35]",
  "tracking-[0.01em]",
  "tracking-[-0.01em]",
  "tracking-[0.03em]",
  "z-[-1]",
  // ── shadcn 官方组件自带的运行时复杂值（vaul drawer / navigation-menu 动效），随官方升级保留 ──
  "opacity-[max(var(--drawer-overlay-min-opacity,0),calc(1-var(--drawer-swipe-progress)))]",
  "ease-[cubic-bezier(0.32,0.72,0,1)]",
  "duration-[calc(var(--drawer-swipe-strength)*400ms)]",
  "transform-[translate3d(var(--translate-x,0px),var(--translate-y,0px),0)_scale(var(--stack-scale))]",
  "transition-[transform,height,opacity,filter]",
  "ease-[cubic-bezier(0.22,1,0.36,1)]",
  "opacity-[0.9999]",
  "ease-[cubic-bezier(0.45,1.005,0,1.005)]",
  "rounded-[inherit]",
  "ease-[cubic-bezier(0.22,1,0.36,1)]",
  "duration-[0.35s]",
  "transition-[opacity,transform,translate]",
  "transition-[opacity,transform,width,height,scale,translate]",
  "transition-[top,left,right,bottom]",
  "top-[60%]",
  "gap-[--spacing(var(--gap))]",
    "grid-rows-[auto_1fr]",
  "grid-rows-[auto_auto_1fr]",
  "bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]",
  "rounded-[min(var(--radius-md),10px)]",
  "rounded-[min(var(--radius-md),8px)]",
  "max-h-[min(calc(--spacing(72)---spacing(9)),calc(var(--available-height)---spacing(9)))]",
  "min-w-[calc(var(--anchor-width)+--spacing(7))]",
  "translate-y-[calc(-50%-2px)]",
  // ── coss ui 组件自带的运行时复杂值（toast 堆叠动效 / menu switch / checkbox / number-field / scroll-area 渐隐），
  //    随官方升级保留；2026-08 coss 引入批次登记 ──
  "bg-[color-mix(in_srgb,var(--popover),var(--color-black)_calc(1%*max(0,var(--toast-index,0))))]",
  "bg-[color-mix(in_srgb,var(--popover),var(--color-black)_calc(6%*max(0,var(--toast-index,0))))]",
  "grid-cols-[.75rem_1fr]",
  "h-[calc(var(--thumb-size)+2px)]",
  "h-[calc(var(--toast-gap)+1px)]",
  "inset-shadow-[0_1px_--theme(--color-black/4%)]",
  "mask-b-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-end)))]",
  "mask-l-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-start)))]",
  "mask-r-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-x-end)))]",
  "mask-t-from-[calc(100%-min(var(--fade-size),var(--scroll-area-overflow-y-start)))]",
  "max-h-[min(var(--available-height),23rem)]",
  "max-w-[min(--spacing(64),var(--available-width))]",
  "min-w-[calc(var(--anchor-width)+1.25rem)]",
  "origin-[50%_calc(50%+50%*min(var(--toast-index,0),1))]",
  "origin-[50%_calc(50%-50%*min(var(--toast-index,0),1))]",
  "origin-[var(--thumb-size)_50%]",
  "ps-[calc(--spacing(2.5)-1px)]",
  "ps-[calc(--spacing(3)-1px)]",
  "ps-[calc(--spacing(7)-1px)]",
  "ps-[calc(--spacing(7.5)-1px)]",
  "ps-[calc(--spacing(8)-1px)]",
  "ps-[calc(--spacing(8.5)-1px)]",
  "px-[calc(--spacing(2.5)-1px)]",
  "px-[calc(--spacing(3)-1px)]",
  "ring-[3px]",
  "rounded-[.25rem]",
  "rounded-[3px]",
  "rounded-[calc(var(--radius-lg)-1px)]",
  "rounded-[calc(var(--radius-md)-1px)]",
  "rounded-[var(--thumb-size)/calc(var(--thumb-size)*1.10)]",
  "rounded-e-[calc(var(--radius-lg)-1px)]",
  "rounded-s-[calc(var(--radius-lg)-1px)]",
  "shadow-[0_-1px_--theme(--color-white/6%)]",
  "shadow-[0_1px_--theme(--color-black/4%)]",
  "transform-[translateX(calc(var(--toast-swipe-movement-x)+100%+var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
  "transform-[translateX(calc(var(--toast-swipe-movement-x)-100%-var(--toast-inset)))_translateY(var(--toast-calc-offset-y))]",
  "transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)+(var(--toast-index)*var(--toast-peek))+(var(--toast-shrink)*var(--toast-calc-height))))_scale(var(--toast-scale))]",
  "transform-[translateX(var(--toast-swipe-movement-x))_translateY(calc(var(--toast-swipe-movement-y)-(var(--toast-index)*var(--toast-peek))-(var(--toast-shrink)*var(--toast-calc-height))))_scale(var(--toast-scale))]",
  "transform-[translateX(var(--toast-swipe-movement-x))_translateY(var(--toast-calc-offset-y))]",
  "transform-[translateY(calc(-100%-var(--toast-inset)))]",
  "transform-[translateY(calc(100%+var(--toast-inset)))]",
  "transform-[translateY(calc(var(--toast-swipe-movement-y)+100%+var(--toast-inset)))]",
  "transform-[translateY(calc(var(--toast-swipe-movement-y)+100%-var(--toast-inset)))]",
  "transform-[translateY(calc(var(--toast-swipe-movement-y)-100%-var(--toast-inset)))]",
  "transition-[background-color,box-shadow]",
  "transition-[color,background-color,box-shadow,opacity]",
  "transition-[scale,opacity]",
  "translate-x-[calc(var(--thumb-size)-4px)]",
  "w-[calc(100%-var(--toast-inset)*2)]",
  "w-[calc(var(--thumb-size)*2-2px)]",
  "z-[calc(9999-var(--toast-index))]",
]);

// 变体前缀的方括号不是任意值（data-[...]、aria-[...]、has-[...] 等）
const VARIANT_PREFIX = new Set([
  "data",
  "aria",
  "supports",
  "group",
  "peer",
  "group-data",
  "peer-data",
  "has",
  "group-has",
  "peer-has",
  "not",
  "not-has",
  "group-not",
  "group-not-has",
  "peer-not-has",
  "has-data",
  "peer-not",
]);

const ARBITRARY_REGEX = /([a-zA-Z][a-zA-Z0-9-]*)-\[([^\]"'`]+)\]/g;

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const abs = join(dir, entry);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      files.push(...walk(abs));
      continue;
    }
    if (TARGET_EXT.has(extname(abs))) {
      files.push(abs);
    }
  }
  return files;
}

const offenders = [];
for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(ARBITRARY_REGEX)) {
    const [full, prefix, content] = match;
    const after = text[match.index + full.length];
    if (after === ":") continue; // 媒体/变体写法，如 min-[600px]:flex
    if (content.includes("=")) continue; // 属性选择器，如 data-[state=open]
    if (content.includes("${")) continue; // 模板字符串动态拼接
    if (VARIANT_PREFIX.has(prefix)) continue;
    const token = `${prefix}-[${content}]`;
    if (!ALLOWED_TOKENS.has(token)) {
      offenders.push({ file, token });
    }
  }
}

if (offenders.length > 0) {
  const lines = offenders.map((o) => `${o.file}: ${o.token}`);
  console.error(
    "Found Tailwind arbitrary values (禁止任意值，请使用 tailwind.config.js 中的 token；" +
      "确属无法 token 化的复杂值，加入本脚本 ALLOWED_TOKENS 并说明理由):\n" +
      lines.join("\n")
  );
  process.exit(1);
}

console.log("Tailwind arbitrary value check passed.");
