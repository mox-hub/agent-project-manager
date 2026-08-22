import { readdirSync, readFileSync, writeFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

/**
 * 一次性迁移：把 className 中的 Tailwind 任意值替换为 tailwind.config.js token。
 * 规则（优先级从高到低）：
 *   1. EXPLICIT 精确映射（等价默认类 / 语义 token / 特例）
 *   2. 品牌色 hex → colors.brand.*
 *   3. spacing 派生前缀 + 整数px → key = px/4（默认刻度已有则直接用，否则记入新增 spacing）
 *   4. text-[Npx] → text-N（fontSize px 直读键）
 *   5. border/ring/z/scale 专用数值键
 *   6. 其余（calc/var/grid/transition/百分比/negative…）保留并打印，进白名单核对
 */

const ROOT = join(process.cwd(), "src");
const EXTS = new Set([".ts", ".tsx"]);

const EXPLICIT = {
  // 等价默认类（表A）
  "rounded-[var(--radius-control)]": "rounded-md",
  "rounded-[var(--radius)]": "rounded-lg",
  "rounded-t-[var(--radius)]": "rounded-t-lg",
  "rounded-b-[var(--radius)]": "rounded-b-lg",
  "rounded-[calc(var(--radius-control)-2px)]": "rounded-sm",
  "rounded-[4px]": "rounded",
  "rounded-[2px]": "rounded-xs",
  "max-w-[320px]": "max-w-xs",
  "max-w-[1280px]": "max-w-7xl",
  "text-[12px]": "text-xs",
  "text-[hsl(var(--accent-yellow))]": "text-accent-yellow",
  "bg-[hsl(var(--accent-yellow-light))]": "bg-accent-yellow-light",
  "bg-[#09090b]": "bg-zinc-950",
  "min-w-[8.5rem]": "min-w-34", // 136px
  "min-w-[8rem]": "min-w-32",
  "min-w-[1.25rem]": "min-w-5",
  // 语义 token（弹窗/滚动区尺寸）
  "max-h-[80vh]": "max-h-dialog",
  "max-h-[90vh]": "max-h-dialog-full",
  "h-[95vh]": "h-dialog",
  "w-[95vw]": "w-dialog",
  "max-w-[95vw]": "max-w-dialog",
  "w-[90vw]": "w-dialog-wide",
  "gap-[3px]": "gap-0.75",
  "p-[3px]": "p-0.75",
  // 二次补收（首轮遗留中的可转化项）
  "rounded-[3px]": "rounded-3",
  "rounded-[5px]": "rounded-5",
  "rounded-t-[10px]": "rounded-t-10",
  "max-w-[14rem]": "max-w-56", // 14rem=224px
  "h-[calc(--spacing(5.5))]": "h-5.5", // v4 语法残留，v3 下无效，等价 22px
};

const COLOR_HEX = {
  "#5E6AD2": "brand-linear",
  "#9FA8F2": "brand-linear-light",
  "#2D2B5F": "brand-linear-deep",
  "#1B1A3D": "brand-linear-darkest",
  "#0052CC": "brand-atlassian",
  "#0B1A33": "brand-atlassian-dark",
  "#172B4D": "brand-atlassian-darker",
};

// spacing 派生的前缀（w/h/min/max/p/m/gap/inset/translate/space/basis/size）
const SPACING_PREFIXES = new Set([
  "w", "h", "size", "min-w", "max-w", "min-h", "max-h",
  "p", "px", "py", "pt", "pr", "pb", "pl",
  "m", "mx", "my", "mt", "mr", "mb", "ml",
  "gap", "gap-x", "gap-y", "space-x", "space-y",
  "inset", "top", "right", "bottom", "left",
  "translate-x", "translate-y", "basis",
]);

// Tailwind v3 默认 spacing 键（公式 key*4px）
const DEFAULT_SPACING_KEYS = new Set([
  "0.5", "1", "1.5", "2", "2.5", "3", "3.5", "4", "5", "6", "7", "8", "9",
  "10", "11", "12", "14", "16", "20", "24", "28", "32", "36", "40", "44",
  "48", "52", "56", "60", "64", "72", "80", "96",
]);

// 显式跳过（动画占位/非整数微调等，进白名单）
const SKIP_TOKENS = new Set(["max-h-[3000px]", "h-[18.4px]"]);

const VARIANT_PREFIX = new Set([
  "data", "aria", "supports", "group", "peer", "group-data", "peer-data",
  "has", "group-has", "peer-has", "not", "group-not", "peer-not",
]);
const ARBITRARY_REGEX = /([a-zA-Z][a-zA-Z0-9-]*)-\[([^\]"'`]+)\]/g;
const KEY_CAP = 250; // spacing 键上限，防动画占位值等混入

const newSpacing = {};
const newFontSize = {};
const newBorderWidth = {};
const newRingWidth = {};
const newBorderRadius = {};
const newZIndex = {};
const newScale = {};
const replacedCounts = new Map();
const leftovers = new Map(); // token -> { count, files: Set }

function fmtKey(px) {
  const k = px / 4;
  return Number.isInteger(k) ? String(k) : String(parseFloat(k.toFixed(3)));
}

function classify(prefix, content) {
  const pxMatch = /^(\d+(?:\.\d+)?)px$/.exec(content);
  if (!pxMatch) return null;
  const px = parseFloat(pxMatch[1]);

  if (prefix === "text") {
    if (!Number.isInteger(px) || px <= 0 || px > 200) return null;
    return { target: `text-${String(px)}`, record: newFontSize, key: String(px), value: `${px}px` };
  }
  if (prefix === "ring") {
    return { target: `ring-${String(px)}`, record: newRingWidth, key: String(px), value: `${px}px` };
  }
  if (/^border(-[trblxy])?$/.test(prefix)) {
    return { target: `${prefix}-${String(px)}`, record: newBorderWidth, key: String(px), value: `${px}px` };
  }
  if (/^rounded(-[trbl]|-(tl|tr|bl|br))?$/.test(prefix)) {
    return { target: `${prefix}-${String(px)}`, record: newBorderRadius, key: String(px), value: `${px}px` };
  }
  if (SPACING_PREFIXES.has(prefix)) {
    const key = fmtKey(px);
    if (!/^\d+(\.\d{1,2})?$/.test(key)) return null;
    const num = parseFloat(key);
    if (num > KEY_CAP) return null;
    return { target: `${prefix}-${key}`, record: newSpacing, key, value: `${px}px` };
  }
  return null;
}

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
    if (EXTS.has(extname(abs))) {
      files.push(abs);
    }
  }
  return files;
}

let totalReplaced = 0;
let filesChanged = 0;

for (const file of walk(ROOT)) {
  const text = readFileSync(file, "utf8");
  let changed = false;

  const next = text.replace(ARBITRARY_REGEX, (full, prefix, content, offset) => {
    const after = text[offset + full.length];
    if (after === ":") return full;
    if (content.includes("=") || content.includes("${")) return full;
    if (VARIANT_PREFIX.has(prefix)) return full;

    const token = `${prefix}-[${content}]`;
    if (SKIP_TOKENS.has(token)) {
      addLeftover(token, file);
      return full;
    }
    if (EXPLICIT[token]) {
      count(EXPLICIT[token]);
      changed = true;
      return EXPLICIT[token];
    }
    const hex = /^#[0-9a-fA-F]{3,8}$/.exec(content);
    if (hex && COLOR_HEX[content.toUpperCase()]) {
      const target = `${prefix}-${COLOR_HEX[content.toUpperCase()]}`;
      count(target);
      changed = true;
      return target;
    }
    if (prefix === "z" && /^\d+$/.test(content)) {
      newZIndex[content] = content;
      const target = `z-${content}`;
      count(target);
      changed = true;
      return target;
    }
    if (prefix === "scale" && /^\d+(\.\d+)?$/.test(content)) {
      const key = String(Math.round(parseFloat(content) * 100));
      newScale[key] = String(parseFloat(content));
      const target = `scale-${key}`;
      count(target);
      changed = true;
      return target;
    }
    const cls = classify(prefix, content);
    if (cls) {
      const isSpacing = cls.record === newSpacing;
      if (!(cls.key in cls.record) && (!isSpacing || !DEFAULT_SPACING_KEYS.has(cls.key))) {
        cls.record[cls.key] = cls.value;
      }
      count(cls.target);
      changed = true;
      return cls.target;
    }
    addLeftover(token, file);
    return full;
  });

  function count(t) {
    totalReplaced += 1;
    replacedCounts.set(t, (replacedCounts.get(t) ?? 0) + 1);
  }
  function addLeftover(token, f) {
    const entry = leftovers.get(token) ?? { count: 0, files: new Set() };
    entry.count += 1;
    entry.files.add(f);
    leftovers.set(token, entry);
  }

  if (changed) {
    writeFileSync(file, next, "utf8");
    filesChanged += 1;
  }
}

console.log(`Replaced ${totalReplaced} tokens in ${filesChanged} files.\n`);
console.log("== 新增 spacing（key*4=px）==");
console.log(JSON.stringify(newSpacing, null, 2));
console.log("== 新增 fontSize（px 直读）==");
console.log(JSON.stringify(newFontSize, null, 2));
console.log("== 新增 borderWidth ==");
console.log(JSON.stringify(newBorderWidth, null, 2));
console.log("== 新增 ringWidth ==");
console.log(JSON.stringify(newRingWidth, null, 2));
console.log("== 新增 borderRadius ==");
console.log(JSON.stringify(newBorderRadius, null, 2));
console.log("== 新增 zIndex ==");
console.log(JSON.stringify(newZIndex, null, 2));
console.log("== 新增 scale ==");
console.log(JSON.stringify(newScale, null, 2));
console.log("\n== 遗留 token（进白名单核对）==");
for (const [token, info] of [...leftovers.entries()].sort((a, b) => b[1].count - a[1].count)) {
  console.log(`${String(info.count).padStart(3)}  ${token}  (${[...info.files].length} files)`);
}
