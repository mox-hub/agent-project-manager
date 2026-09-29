import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";

// 根目录锚定「脚本自身位置」而非 process.cwd()：脚本有两条调用路径——
// `pnpm --filter frontend run lint:*`（cwd = app 根）与 lint-staged 的 pre-commit
// 任务（worker 进程的 cwd 不受控）。依赖 cwd 会在后者下扫空目录或直接报错。
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// 原生类治理（宪法 §5 语义色 + §10.1 唯一实现）：
// 1) 原生 Tailwind 色板类禁止——颜色一律走语义 token（accent-*/status-*/content-* 等）
// 2) Loader2/Loader2Icon 的 JSX 用法禁止——加载指示唯一入口 ui/spinner（状态图标引用
//    走 status-visuals 的 icon 值引用，不受限）
//
// 职责边界（2026-09-27 裁决）：本脚本只管**颜色**。
// 阴影曾在此处另写一份与 check-spacing-governance.mjs 逐字相同的正则，同一条违规
// 每次报两遍；且这里只有「整文件 EXEMPT」、没有「按规则 id 放行」的能力，无法表达
// 「vendored 原语只豁免 shadow、不豁免 motion」这类裁决，只能把豁免写宽。
// 故刻度类 token（字阶/间距/行高/字重/动效/阴影）统一归 check-spacing-governance.mjs 单点治理。
//
// 范围变更（批 7a，2026-09-27）：`RAW_NEUTRAL`（C2 无编号中性裸色）与 `INLINE_COLOR`
// （C3 内联裸色）**由 ai-surface 窄范围扩为全库**——原先 `inlineScope` 只放行
// `modules/ai-surface/` 一个子树，ai-surface 之外的裸色（页面里 `text-white` 白字、
// 集成品牌 hex、Canvas 插画调色板）全部从这道缺口漏过门禁。
// 扩面同时按「性质」补齐具名豁免（见 NAMED_EXEMPT）+ 两条 legacy 白名单，
// 白名单一律 `file:token` **精确匹配**（不是整文件放行）。
const ROOT = join(PKG_ROOT, "src");
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
const RAW_NEUTRAL = /\b(?:bg|text|border|fill|stroke)-(?:white|black)\b/g;

// 主题预览豁免（2026-09-29 新增，对应宪法附录 A.1 行 A8）：
// 语义组件层「主题模式卡片」的预览缩略图。预览要展示「日间 / 夜间分别长什么样」，
// 必须与当前主题无关——改成随主题走的 token，浅色主题下就画不出深色预览块，预览即失真。
// 性质同 `appearance-section.tsx` 那条（预览即字面色），但该件已独立成组件，
// 故单列一条、不并入 A5 的历史遗留整文件放行，便于审计时看清它与 A5 各自的范围。
//
// ⚠️ 范围诚实声明：本谓词落在 `EXEMPT`（**整文件**粒度，非 per-token），故实际覆盖
// 不止「预览的字面色」。本文件当前还命中一处：选中徽标的 `text-white`（C2 无编号
// 裸色，`bg-accent-blue` 底白字，与 NEUTRAL_LEGACY_ALLOWLIST (b) 组同类）。该处是
// 提取时按「不夹带视觉变更」原样搬运的存量，改配对的 `accent-foreground` 在浅色
// 主题下是近黑色（`240 5.9% 10%`），**会实打实换观感**，故未改。
// 这一处属**登记在案的越界**（宪法附录 A.1 行 A8 已同文声明），不是已批准的设计；
// 待配套前景 token 补齐后收窄——届时或拆两条，或给本脚本补 per-token 粒度。
const THEME_PREVIEW_EXEMPT = (relUnix) =>
  relUnix.endsWith("components/semantic/theme-mode-card.tsx");

// 整文件豁免（既有，批 7a 保留）：按**子树/文件**放行色板类与内联裸色两条规则。
// linear 品牌色、design-system 展示页（职责即展示色板）、外观设置的主题预览缩略图
// （预览即字面色）、ui/spinner（vendored 原语）、主题模式卡片预览（A.1 行 A8）。
const EXEMPT = (relUnix) =>
  relUnix.includes("modules/linear/") ||
  relUnix.includes("modules/design-system/") ||
  relUnix.endsWith("appearance-section.tsx") ||
  relUnix.includes("ui/spinner.tsx") ||
  THEME_PREVIEW_EXEMPT(relUnix);

// ---- 具名豁免（批 7a 新增）：按「性质」分类，只作用于 C2/C3 两条裸色规则 ----
// 与 EXEMPT 的区别：EXEMPT 是历史遗留的整文件放行；这里每一类都有**性质上的理由**，
// 且只豁免「用字面色值本身是其职责/是 fixture」的场景，不放行其余任何规则。
//
// 本职豁免：职责即展示/选择色值（色盘本体必须拿得到真实色值，否则组件无法工作）
const INTENDED_EXEMPT = (relUnix) => relUnix.endsWith("components/ui/color-picker.tsx");
// 测试豁免：fixture / 断言数据不是 UI 实现（与 check-ui-governance 对 <table> 的口径一致）
const TEST_EXEMPT = (relUnix) =>
  relUnix.startsWith("mocks/") ||
  relUnix.startsWith("test-utils/") ||
  /\.(spec|test)\.(ts|tsx)$/.test(relUnix);
// 品牌豁免：第三方品牌多色/渐变（GitHub/Figma/Vercel… 的官方色号不是语义色，不该 token 化）
const BRAND_EXEMPT = (relUnix) => relUnix.endsWith("components/brand/logo.tsx");
// 技术豁免·假阳性：这些命中是 recharts 的 **CSS 属性选择器**（`[stroke='#ccc']`），
// 属于「选择 recharts 自己吐出的 DOM」的锚点，改成 token 会让主题对齐失效。
const TECH_FALSE_POSITIVE_EXEMPT = (relUnix) => relUnix.endsWith("components/ui/chart.tsx");
// 生成文件豁免：生成物不可手改（改了下一次生成即被覆盖）。
// 注（2026-09-27 补注释感知后）：本豁免当前**已无实际命中**——api-types.gen.ts 里
// 那 4 处 `#5E6AD2/#8B5CF6` 全部在 `/** @example ... */` JSDoc 注释内，补注释感知后
// 不再计入。**保留而非删除**是刻意：这是唯一一道「整文件放行」型豁免，一旦后端
// openapi 变更让生成物在**代码位置**带上色值字面量，`file:token` 白名单对生成物
// 无法维护（下次生成即覆盖），删掉它等于给不出可登记的逃逸口。若日后确认生成物
// 永不会在代码位置出现色值，应连同这条一并删除（属裁决项，勿静默删）。
const GENERATED_EXEMPT = (relUnix) =>
  relUnix.startsWith("infrastructure/api-client/generated/");

const NAMED_EXEMPT = (relUnix) =>
  INTENDED_EXEMPT(relUnix) ||
  TEST_EXEMPT(relUnix) ||
  BRAND_EXEMPT(relUnix) ||
  TECH_FALSE_POSITIVE_EXEMPT(relUnix) ||
  GENERATED_EXEMPT(relUnix);

// ---- legacy 白名单（批 7a 扩面后暴露的存量；理由尚未确定到可动手改的，才进这里）----
// 键一律 `file:token` 精确匹配——往下列任一文件里**新加**别的裸色仍会报错。
// 注意其局限：同文件重复出现**同一个**已放行 token 不会被 additional 计入
// （精确匹配的必然结果，如需再收紧须另立「计数上限」机制）。

// C2 无编号中性裸色（28 处 / 24 键）。分两类：
const NEUTRAL_LEGACY_ALLOWLIST = new Set([
  // (a) 覆盖式模态遮罩 7 处：`bg-black` 做模态底。**不应**改成 bg-background/foreground
  //     ——那会随主题翻转、遮罩在暗色下失效。正确解是**模式不变**的独立遮罩 token
  //     （`--overlay`），本仓目前没有；建 token 属人裁决（批 7 后续），故先登记。
  //     顺带待修：dialog.tsx 的 `dark:bg-black/60` 是 §5.5 违宪（同色明暗双写）。
  "components/ui/alert-dialog.tsx:bg-black",
  "components/ui/command.tsx:bg-black",
  "components/ui/dialog.tsx:bg-black",
  "components/ui/drawer.tsx:bg-black",
  "components/ui/sheet.tsx:bg-black",
  "shared/layout/shell-layout.tsx:bg-black",

  // (b) 有色底上的白字 21 处：正确改法是配对 `<底>-foreground` token，但仓内**没有**
  //     `--color-accent-*-foreground`（只有通用的 accent-foreground / sidebar-accent-foreground），
  //     补 token 要同时改 index.css 与 check-semantic-classes.mjs 允许表 ⇒ 属人裁决。
  //     ⚠️ 严禁机械替换成 `text-foreground`：暗色底 + 暗色前景 = 对比度崩坏。
  "modules/analytics/pages/analytics-page.tsx:text-white",
  "modules/auth/components/auth-visual-card.tsx:bg-black", // Canvas 画布底色，与 C3 的三处 hex 成对；单改一处即破配对
  "modules/core-config/components/tag-manager.tsx:text-white", // 定色胶囊底 #6b7280 + 白字
  "modules/delivery/pages/delivery-page.tsx:text-white",
  "modules/git/components/diff-viewer.tsx:text-white",
  "modules/issue/components/completion-review.tsx:text-white",
  "modules/issue/components/task-detail-drawer.tsx:text-white",
  "modules/issue/components/task-rows.tsx:text-white",
  "modules/issue/pages/bugs-page.tsx:text-white",
  "modules/issue/pages/tasks-page.tsx:text-white",
  "modules/notification/pages/notification-center-page.tsx:text-white",
  "modules/office/components/colleague-card.tsx:text-white",
  "modules/project/components/playbook/interview-chat.tsx:text-white",
  "modules/project/components/project-simple-list.tsx:text-white",
  "modules/settings/pages/sections/integrations-section.tsx:text-white",
  "modules/team-member/components/member-avatar.tsx:text-white",
  "modules/team-member/components/team-card.tsx:text-white",
  "modules/team-member/pages/team-detail-page.tsx:text-white",
]);

// C3 内联裸色（84 处 / 64 键）。分五类：
const INLINE_COLOR_LEGACY_ALLOWLIST = new Set([
  // (a) Canvas 插画调色板 56 处（prism-canvas 46 / blueprint-canvas 10）：
  //     `isDark ? '#38bdf8' : '#1d4ed8'` 式硬编码霓虹色，**尚未换实现**。
  //     ⚠️ 不得登记为「技术豁免」——技术豁免的前提是「已改为读 CSS 变量」，这两个没有。
  //     待办：换实现（读 CSS 变量后传入 canvas/2D API），本批不动（属人裁决）。
  "modules/auth/components/visuals/prism-canvas.tsx:#000000",
  "modules/auth/components/visuals/prism-canvas.tsx:#0284c7",
  "modules/auth/components/visuals/prism-canvas.tsx:#05070e",
  "modules/auth/components/visuals/prism-canvas.tsx:#0a0f1d",
  "modules/auth/components/visuals/prism-canvas.tsx:#0ea5e9",
  "modules/auth/components/visuals/prism-canvas.tsx:#10b981",
  "modules/auth/components/visuals/prism-canvas.tsx:#38bdf8",
  "modules/auth/components/visuals/prism-canvas.tsx:#818cf8",
  "modules/auth/components/visuals/prism-canvas.tsx:#8b5cf6",
  "modules/auth/components/visuals/prism-canvas.tsx:#94a3b8",
  "modules/auth/components/visuals/prism-canvas.tsx:#a855f7",
  "modules/auth/components/visuals/prism-canvas.tsx:#bae6fd",
  "modules/auth/components/visuals/prism-canvas.tsx:#cbd5e1",
  "modules/auth/components/visuals/prism-canvas.tsx:#e0f2fe",
  "modules/auth/components/visuals/prism-canvas.tsx:#f1f5f9",
  "modules/auth/components/visuals/prism-canvas.tsx:#f43f5e",
  "modules/auth/components/visuals/prism-canvas.tsx:#f97316",
  "modules/auth/components/visuals/prism-canvas.tsx:#fcfcfd",
  "modules/auth/components/visuals/prism-canvas.tsx:#ffffff",
  "modules/auth/components/visuals/prism-canvas.tsx:rgba(15, 23, 42, 0.04)",
  "modules/auth/components/visuals/prism-canvas.tsx:rgba(15,23,42,0.18)",
  "modules/auth/components/visuals/prism-canvas.tsx:rgba(15,23,42,0.22)",
  "modules/auth/components/visuals/prism-canvas.tsx:rgba(15,23,42,0.32)",
  "modules/auth/components/visuals/prism-canvas.tsx:rgba(255, 255, 255, 0.06)",
  "modules/auth/components/visuals/prism-canvas.tsx:rgba(255,255,255,0.22)",
  "modules/auth/components/visuals/prism-canvas.tsx:rgba(255,255,255,0.32)",
  "modules/auth/components/visuals/prism-canvas.tsx:rgba(255,255,255,0.36)",
  "modules/auth/components/visuals/prism-canvas.tsx:rgba(255,255,255,0.55)",
  "modules/auth/components/visuals/blueprint-canvas.tsx:#059669",
  "modules/auth/components/visuals/blueprint-canvas.tsx:#080d1a",
  "modules/auth/components/visuals/blueprint-canvas.tsx:#0f172a",
  "modules/auth/components/visuals/blueprint-canvas.tsx:#1d4ed8",
  "modules/auth/components/visuals/blueprint-canvas.tsx:#34d399",
  "modules/auth/components/visuals/blueprint-canvas.tsx:#38bdf8",
  "modules/auth/components/visuals/blueprint-canvas.tsx:#eef2ff",
  "modules/auth/components/visuals/blueprint-canvas.tsx:#f8fafc",
  "modules/auth/components/visuals/blueprint-canvas.tsx:rgba(29, 78, 216, 0.16)",
  "modules/auth/components/visuals/blueprint-canvas.tsx:rgba(56, 189, 248, 0.2)",

  // (b) 集成品牌色 12 处（integrations-section）：github/gitlab/slack/sentry/notion/figma/
  //     vercel/datadog/pagerduty/loom 的官方色号——**品牌 token 缺口**。仓内已有
  //     `--color-brand-linear` / `--color-brand-atlassian` 先例，但补齐品牌 token 表属人裁决，
  //     本批不补（补 token 要改 index.css + check-semantic-classes 允许表）。
  "modules/settings/pages/sections/integrations-section.tsx:#000000",
  "modules/settings/pages/sections/integrations-section.tsx:#06AC38",
  "modules/settings/pages/sections/integrations-section.tsx:#24292E",
  "modules/settings/pages/sections/integrations-section.tsx:#362D59",
  "modules/settings/pages/sections/integrations-section.tsx:#374151",
  "modules/settings/pages/sections/integrations-section.tsx:#4A154B",
  "modules/settings/pages/sections/integrations-section.tsx:#625DF5",
  "modules/settings/pages/sections/integrations-section.tsx:#632CA6",
  "modules/settings/pages/sections/integrations-section.tsx:#F24E1E",
  "modules/settings/pages/sections/integrations-section.tsx:#FC6D26",

  // (c) 要上 wire 落库的 issue-type 色值 12 处（recommended-issue-types 10 / issue-types-section 1 /
  //     metadata-sync.service 1）：issue-type DTO 有 `@Matches(/^#[0-9A-Fa-f]{6}$/)`，
  //     这些 hex 是**契约的一部分**。token 化需要「token→hex 解析层」或改契约 ⇒ 属人裁决，本批不动。
  "modules/issue/constants/recommended-issue-types.ts:#0EA5E9",
  "modules/issue/constants/recommended-issue-types.ts:#10B981",
  "modules/issue/constants/recommended-issue-types.ts:#14B8A6",
  "modules/issue/constants/recommended-issue-types.ts:#22C55E",
  "modules/issue/constants/recommended-issue-types.ts:#6366F1",
  "modules/issue/constants/recommended-issue-types.ts:#8B5CF6",
  "modules/issue/constants/recommended-issue-types.ts:#EC4899",
  "modules/issue/constants/recommended-issue-types.ts:#EF4444",
  "modules/issue/constants/recommended-issue-types.ts:#F59E0B",
  "modules/issue/constants/recommended-issue-types.ts:#F97316",
  "modules/settings/pages/sections/issue-types-section.tsx:#5E6AD2",
  "modules/document/services/metadata-sync.service.ts:#94a3b8",

  // (d) 定色胶囊底 1 处（tag-manager）：#6b7280 底 + text-white 白字成对（见 C2 legacy (b)），
  //     单改一处即破配对。
  "modules/core-config/components/tag-manager.tsx:#6b7280",

  // (e) Canvas 配对底色 3 处（auth-visual-card）：与 prism/blueprint canvas 的同款画布底色成对，
  //     须与 Canvas 一起换实现，单改此处即破配对。
  "modules/auth/components/auth-visual-card.tsx:#060810",
  "modules/auth/components/auth-visual-card.tsx:#091224",
  "modules/auth/components/auth-visual-card.tsx:rgba(248, 250, 252, 0.95)",
]);

// 注释感知（2026-09-27 补，批 7a 扩面后暴露）：
// C2/C3 扩为全库生效、且本脚本进了 pre-commit（lint-staged）之后，
// 「注释里写字面量」会直接把提交拦下——`// 修复 #1234 的回归` 命中 C3 的 hex 正则、
// `// 原 bg-white 已换成 bg-muted` 命中 C2。而注释不是出货代码，写清楚「原来错在哪、
// 为什么这么改」恰恰是「文档即契约」要求作者做的事，拦它等于惩罚写清原因的注释。
// 与 check-spacing-governance.mjs 的同名实现保持一致（那边已因连续踩中 4 次而加）。
// 保守实现：只算注释区间，命中落在区间内才跳过；字符串/代码一律照常扫描，
// 故误判方向只会是「多报」而非「漏报」。
function commentRanges(src) {
  const ranges = [];
  const n = src.length;
  let i = 0;
  let quote = null;
  let lineCommentAt = -1;
  let blockCommentAt = -1;
  while (i < n) {
    const c = src[i];
    const c2 = i + 1 < n ? src[i + 1] : "";
    if (quote !== null) {
      if (c === "\\") { i += 2; continue; }
      if (c === quote) quote = null;
      i += 1;
      continue;
    }
    if (lineCommentAt >= 0) {
      if (c === "\n") { ranges.push([lineCommentAt, i]); lineCommentAt = -1; }
      i += 1;
      continue;
    }
    if (blockCommentAt >= 0) {
      if (c === "*" && c2 === "/") {
        ranges.push([blockCommentAt, i + 2]);
        blockCommentAt = -1;
        i += 2;
        continue;
      }
      i += 1;
      continue;
    }
    if (c === '"' || c === "'" || c === "`") { quote = c; i += 1; continue; }
    if (c === "/" && c2 === "/") { lineCommentAt = i; i += 2; continue; }
    if (c === "/" && c2 === "*") { blockCommentAt = i; i += 2; continue; }
    i += 1;
  }
  if (lineCommentAt >= 0) ranges.push([lineCommentAt, n]);
  if (blockCommentAt >= 0) ranges.push([blockCommentAt, n]);
  return ranges;
}

const inRanges = (ranges, index) =>
  ranges.some(([start, end]) => index >= start && index < end);

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
  const comments = commentRanges(text);
  for (const match of text.matchAll(RAW_PALETTE)) {
    if (inRanges(comments, match.index)) continue;
    offenders.push({
      file,
      token: match[0],
      rule: "原生 Tailwind 色板类 → 语义 token（accent-*/status-*/content-*，light 底配对用 accent-*-light）",
    });
  }
  for (const match of text.matchAll(RAW_LOADER)) {
    if (inRanges(comments, match.index)) continue;
    offenders.push({
      file,
      token: match[0],
      rule: "Loader2 JSX 直用 → <Spinner />（ui/spinner 为唯一加载指示实现；状态图标请引用 status-visuals）",
    });
  }
  if (NAMED_EXEMPT(relUnix)) continue;

  // C2：无编号中性裸色类——全库生效（批 7a）
  for (const match of text.matchAll(RAW_NEUTRAL)) {
    if (inRanges(comments, match.index)) continue;
    if (NEUTRAL_LEGACY_ALLOWLIST.has(`${relUnix}:${match[0]}`)) continue;
    offenders.push({
      file,
      token: match[0],
      rule: "无编号中性裸色类 → 语义 token（bg-muted / bg-card / text-foreground；明眸主题下 bg-white 与 --background 同色会使选中态隐形）",
    });
  }
  // C3：内联裸色——全库生效（批 7a）
  for (const match of text.matchAll(INLINE_COLOR)) {
    if (inRanges(comments, match.index)) continue;
    if (INLINE_COLOR_LEGACY_ALLOWLIST.has(`${relUnix}:${match[0]}`)) continue;
    offenders.push({
      file,
      token: match[0],
      rule: "内联裸色 → 语义 token（class 或 hsl(var(--token))；确需字面量请登记 file:token 到具名豁免/legacy 白名单）",
    });
  }
}

if (offenders.length > 0) {
  console.error(
    `✗ 原生类治理失败（${offenders.length} 处；key 为 \`相对 src 路径:命中片段\`，登记白名单用它）：`,
  );
  for (const { file, token, rule } of offenders) {
    console.error(`  ${file}: ${token} ← ${rule}`);
  }
  process.exit(1);
}
console.log(
  "✓ 原生类治理通过（全库无原生色板类 / 无 Loader2 JSX 直用 / 无漏网中性裸色类 / 无漏网内联裸色；C2/C3 全库生效，豁免与 legacy 白名单均按 file:token 精确匹配）",
);
