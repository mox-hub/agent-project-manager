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
}

if (offenders.length > 0) {
  console.error(`✗ 原生类治理失败（${offenders.length} 处）：`);
  for (const { file, token, rule } of offenders) {
    console.error(`  ${file}: ${token} ← ${rule}`);
  }
  process.exit(1);
}
console.log("✓ 原生类治理通过（无原生色板类、无 Loader2 JSX 直用）");
