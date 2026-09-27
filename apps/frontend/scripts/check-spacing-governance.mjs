import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, sep, extname } from "node:path";
import { fileURLToPath } from "node:url";

// 根目录锚定「脚本自身位置」而非 process.cwd()：脚本有两条调用路径——
// `pnpm --filter frontend run lint:*`（cwd = app 根）与 lint-staged 的 pre-commit
// 任务（worker 进程的 cwd 不受控）。依赖 cwd 会在后者下扫空目录或直接报错。
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

// 设计宪法刻度治理（docs/design/PRINCIPLES.md「语义化 token 层」）：
// 1) §3 字阶——合法档只剩 3xs/2xs/xs/sm/base/lg/xl/2xl 八档：旧「数字直读」档
//    （8/9/10/11/13/15/22/28/32，含刚迁走的 text-10/11）禁回流，3xl 及以上越界档一并封禁
// 2) §4.1 间距——4px 网格：整数档与 .5 档合法；四分之一档（.25/.75 结尾）冻结
// 3) §3.4 行高——只许语义档（none/tight/snug/normal/relaxed/loose）：数值档封禁
// 4) §2.3 字重——只许 font-normal/medium/semibold
// 5) §7.1 动效——时长只许 duration-fast/normal/slow（任意值 duration-[...] 同样绕过白名单）
// 6) §3.6 阴影——全站唯一档 shadow-xs（shadow-none 为重置档，合法）：裸 shadow 与其余档封禁
const ROOT = join(PKG_ROOT, "src");
const TARGET_EXT = new Set([".ts", ".tsx"]);

// 宪法 §4.1 冻结的四分之一档 spacing（合法属性前缀内才报警）。
// 模式匹配而非枚举六值：p-0.75 / mt-1.25 / w-2.75 一律命中；半档（p-2.5）合法不误伤。
const BANNED_SPACING =
  /\b(?:p|px|py|pt|pb|pl|ps|pe|pr|m|mx|my|mt|mb|ml|ms|me|mr|gap|gap-x|gap-y|w|h|size|top|bottom|left|right|inset|inset-x|inset-y|basis|space-x|space-y)-\d+\.(?:25|75)\b/g;

// 宪法 §7.1 动效时长白名单：duration-fast/normal/slow 之外的一切时长（含任意值 duration-[...]、
// 数值档 duration-350）均封禁。前导 lookbehind 避免误伤 `transition-duration` 之类的复合名。
const BANNED_DURATION =
  /(?<![\w-])duration-(?!fast\b|normal\b|slow\b)(?:\[[^\]]*\]|[a-z0-9-]+)/g;

// 宪法 §3.6 阴影：具名档只许 shadow-xs，其余（2xs/sm/md/lg/xl/2xl/inner）一律违规。
// 任意值 shadow-[...] 不在此处报——它由 lint:tokens（check-tailwind-arbitrary.mjs）的
// ALLOWED_TOKENS 白名单单独治理，避免同一条违规被两套规则以不同口径重复报警。
// 前导 lookbehind 避免误伤 drop-shadow-md / inset-shadow-[...] / transition-shadow。
const BANNED_SHADOW = /(?<![\w-])shadow-(?!xs\b|none\b)[a-z0-9-]+/g;

// 裸 `shadow` 类（Tailwind 默认投影，超规格）：`transition-shadow`、`drop-shadow(...)` 靠
// lookbehind 排除；`shadow={false}` 这类 JSX 属性靠 `=` 排除；`shadow:` 对象键靠 `:` 排除。
const BANNED_SHADOW_BARE = /(?<![\w-])shadow(?![\w\-=:])/g;

// 逐条规则：id 用于文件级豁免（见 FILE_EXEMPTIONS），match[0] 即报错的类名 token。
const RULES = [
  {
    id: "text",
    re: /\btext-(8|9|10|11|13|15|22|28|32)\b/g,
    rule: "宪法 §3 唯一字阶（数字直读档已废弃；迁移：10/11→3xs/2xs、13→xs、15→sm、22/28/32→xl/2xl）",
  },
  {
    id: "text",
    re: /\btext-(3xl|4xl|5xl|6xl)\b/g,
    rule: "宪法 §3 唯一字阶（3xl 及以上越界档；页面标题封顶 text-2xl，确需保留请走 §11.1 豁免登记）",
  },
  {
    id: "spacing",
    re: BANNED_SPACING,
    rule: "宪法 §4.1 4px 网格（四分之一档冻结，迁移到最近整数/.5 档）",
  },
  {
    id: "leading",
    re: /\bleading-[0-9][\w.]*/g,
    rule: "宪法 §3.4 行高（数值档封禁，改用 leading-none/tight/snug/normal/relaxed/loose）",
  },
  {
    id: "font",
    re: /\bfont-(bold|light|extrabold|black|thin)\b/g,
    rule: "宪法 §2.3 字重（只许 font-normal/medium/semibold：bold→semibold、light→normal）",
  },
  {
    id: "motion",
    re: BANNED_DURATION,
    rule: "宪法 §7.1 动效时长白名单（只许 duration-fast/normal/slow；任意值同样绕过白名单）",
  },
  {
    id: "shadow",
    re: BANNED_SHADOW,
    rule: "宪法 §3.6 全站唯一阴影档（只许 shadow-xs；不要投影用 shadow-none）",
  },
  {
    id: "shadow",
    re: BANNED_SHADOW_BARE,
    rule: "宪法 §3.6 裸 shadow 类（Tailwind 默认投影超规格；改 shadow-xs 或 shadow-none）",
  },
];

// 文件级豁免（宪法 §11.1 豁免清单的脚本侧镜像）：按「规则 id」精确放行，不做整文件放行，
// 避免顺带漏掉同一文件里的其它违规。新增豁免须在 PR / 豁免清单登记理由。
const FILE_EXEMPTIONS = [
  {
    rules: ["text", "font", "leading"],
    match: (rel) => rel.startsWith("shared/mdx/"),
    reason:
      "宪法附录 A.1/A1：MDX 渲染的是外来 markdown 内容，字阶/字重/行高由内容作者与 prose 配方决定，不受产品型字阶约束",
  },
  {
    rules: ["motion", "shadow"],
    match: (rel) =>
      rel === "components/ui/drawer.tsx" || rel === "components/ui/navigation-menu.tsx",
    reason:
      "上游 vendored 原语（coss / base-ui）：动效常量与手势物理耦合，浮层投影亦属其官方配方（宪法 §11.1）",
  },
  {
    rules: "*",
    match: (rel) => rel.includes("modules/design-system/"),
    reason: "设计系统展示页集中展示 token 名（沿用 check-palette.mjs 的 design-system 白名单惯例）",
  },
  {
    rules: ["leading"],
    match: (rel) => rel === "components/ui/number-field.tsx",
    reason:
      "结构性行高：leading-8.5/9.5/7.5 与 h-8.5/9.5/7.5 逐档配对做输入框文字垂直居中，非排版行高（宪法 §11.1）",
  },
];

const isExempt = (relUnix, id) =>
  FILE_EXEMPTIONS.some(
    (e) => e.match(relUnix) && (e.rules === "*" || e.rules.includes(id))
  );

// 注释感知：类名活在字符串字面量里，注释中的 token 名是「文档性提及」而非违规。
// 否则作者每写一句「原 <被禁类> 已删」就会被 CI 拦下——等于惩罚写清楚原因的注释，
// 与「文档即契约」相冲（实测已连续踩中 4 次）。
// 保守实现：只计算注释区间，命中落在区间内才跳过；字符串/代码一律照常扫描，
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
  const text = readFileSync(file, "utf8");
  const comments = commentRanges(text);
  for (const { id, re, rule } of RULES) {
    if (isExempt(relUnix, id)) continue;
    for (const match of text.matchAll(re)) {
      if (inRanges(comments, match.index)) continue;
      offenders.push({ file, token: match[0], rule });
    }
  }
}

if (offenders.length > 0) {
  const lines = offenders.map((o) => `${o.file}: ${o.token}  ← ${o.rule}`);
  console.error(
    "Found banned scale tokens (违反设计宪法 docs/design/PRINCIPLES.md):\n" + lines.join("\n")
  );
  process.exit(1);
}

console.log(
  "Spacing, typography, motion & shadow governance check passed."
);
