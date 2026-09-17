import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep, extname } from "node:path";

// 原生类治理（宪法 §5 语义色 + §10.1 唯一实现）：
// 1) 原生 Tailwind 色板类禁止——颜色一律走语义 token（accent-*/status-*/content-* 等）
// 2) Loader2/Loader2Icon 的 JSX 用法禁止——加载指示唯一入口 ui/spinner（状态图标引用
//    走 status-visuals 的 icon 值引用，不受限）
const ROOT = join(process.cwd(), "src");
const TARGET_EXT = new Set([".ts", ".tsx"]);

const RAW_PALETTE =
  /(?:text|bg|border|ring|fill|stroke|from|to|via)-(red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-\d{2,3}\b/g;
const RAW_LOADER = /<(?:Loader2|Loader2Icon|Icons\.Loader2)\b/g;

// 内联裸色治理（ARCH-AISURFACE-001 §4.5）。
// 动机：原生色板类扫描只能拦住 className，颜色可以绕过它用
// `style={{ color: '#8B5CF6' }}` 直接落进 DOM——ai-surface 原型 712 处裸色
// 正是从这道缺口漏过门禁的。
// 规则：命中 `#hex` / `rgb()` / `rgba()` 字面量即违规；颜色一律走语义 token
// （class 或 `hsl(var(--token))` —— 后者不是字面量，天然放行）。
const INLINE_COLOR = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)/g;

// 内联裸色的两个「同源逃逸口」，一并按窄范围收口：
//
// 1) 无编号中性裸色类 `bg-white` / `text-white` / `bg-black` …——`RAW_PALETTE`
//    只匹配带编号的色板（slate-500 等），white/black 无编号故绕过。危害不止
//    「硬编码」：明眸主题下 `--background` 恰为 `0 0% 100%`，`bg-white` 做激活
//    胶囊底色会与背景**完全同色 → 选中态隐形**（2026-09-14 实测）。
// 2) 超出 `shadow-xs` 的阴影类——DESIGN.md §3.2：全系统仅保留
//    `shadow-xs: 0 1px 2px 0 rgba(0,0,0,0.05)`，「取消厚重投影」。故
//    shadow-sm/md/lg/xl/2xl/inner 一律违规（悬浮层亦只允许 shadow-xs）。
const RAW_NEUTRAL = /\b(?:bg|text|border|fill|stroke)-(?:white|black)\b/g;
const RAW_SHADOW = /\bshadow-(?:sm|md|lg|xl|2xl|inner)\b/g;
// 范围：窄起步，只对 ai-surface 强制；其余存量（page-registry 导航色、
// design-system 展示页等）属设计上可解释的用例，待白名单机制后再宽扫。
const inlineScope = (relUnix) => relUnix.includes("modules/ai-surface/");

// 豁免：linear 品牌色、design-system 展示页、外观设置的主题预览缩略图（预览即字面色）
const EXEMPT = (relUnix) =>
  relUnix.includes("modules/linear/") ||
  relUnix.includes("modules/design-system/") ||
  relUnix.endsWith("appearance-section.tsx") ||
  relUnix.includes("ui/spinner.tsx");

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
  const relUnix = relative(ROOT, file).split(sep).join("/");
  if (EXEMPT(relUnix)) continue;
  const text = readFileSync(file, "utf8");
  for (const match of text.matchAll(RAW_PALETTE)) {
    offenders.push({
      file,
      token: match[0],
      rule: "原生 Tailwind 色板类 → 语义 token（accent-*/status-*/content-*，light 底配对用 accent-*-light）",
    });
  }
  for (const match of text.matchAll(RAW_LOADER)) {
    offenders.push({
      file,
      token: match[0],
      rule: "Loader2 JSX 直用 → <Spinner />（ui/spinner 为唯一加载指示实现；状态图标请引用 status-visuals）",
    });
  }
  if (inlineScope(relUnix)) {
    for (const match of text.matchAll(RAW_NEUTRAL)) {
      offenders.push({
        file,
        token: match[0],
        rule: "无编号中性裸色类 → 语义 token（bg-muted / bg-card / text-foreground；明眸主题下 bg-white 与 --background 同色会使选中态隐形）",
      });
    }
    for (const match of text.matchAll(RAW_SHADOW)) {
      offenders.push({
        file,
        token: match[0],
        rule: "超规格阴影类 → shadow-xs（DESIGN.md §3.2：全系统唯一阴影为 shadow-xs，取消厚重投影）",
      });
    }
    for (const match of text.matchAll(INLINE_COLOR)) {
      offenders.push({
        file,
        token: match[0],
        rule: "内联裸色 → 语义 token（class 或 hsl(var(--token))；AI 专属色用 accent-purple）",
      });
    }
  }
}

if (offenders.length > 0) {
  console.error(`✗ 原生类治理失败（${offenders.length} 处）：`);
  for (const { file, token, rule } of offenders) {
    console.error(`  ${file}: ${token} ← ${rule}`);
  }
  process.exit(1);
}
console.log(
  "✓ 原生类治理通过（无原生色板类、无 Loader2 JSX 直用；ai-surface 无内联裸色、无白/黑裸色类、无超规格阴影）",
);
