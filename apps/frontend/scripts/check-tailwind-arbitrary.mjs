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
  "group-not",
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
