import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// 设计宪法 §6 图标治理（docs/design/PRINCIPLES.md）：
// UI 图标唯一库 lucide-react；@lobehub/icons 仅限 AI 供应商/品牌 logo。
// 其余图标库 import 一律禁止。
const ROOT = join(process.cwd(), "src");
const TARGET_EXT = new Set([".ts", ".tsx"]);

const ALLOWED_ICON_IMPORTS = new Set(["lucide-react", "@lobehub/icons"]);
const ICON_IMPORT_REGEX = /from\s+["']([^"']+)["']/g;
// 常见图标库包名特征（按需扩充）
const ICON_PACKAGE_HINTS = [
  /^@?react-icons(\/|$)/,
  /^@heroicons(\/|$)/,
  /^@phosphor-icons(\/|$)/,
  /^@iconify(\/|$)/,
  /^@radix-ui\/react-icons$/,
  /^@tabler\/icons(-react)?$/,
  /^feather-icons$/,
  /^bootstrap-icons$/,
  /^@mui\/icons-material$/,
];

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
  for (const match of text.matchAll(ICON_IMPORT_REGEX)) {
    const pkg = match[1];
    if (ALLOWED_ICON_IMPORTS.has(pkg)) continue;
    const isRelative = pkg.startsWith(".") || pkg.startsWith("@/");
    if (isRelative) continue; // 项目内部组件不走此规则
    if (ICON_PACKAGE_HINTS.some((re) => re.test(pkg))) {
      offenders.push({ file, pkg });
    }
  }
}

if (offenders.length > 0) {
  const lines = offenders.map((o) => `${o.file}: "${o.pkg}"`);
  console.error(
    "Found non-approved icon library imports (宪法 §6：UI 图标唯一 lucide-react，@lobehub/icons 仅限 AI 品牌标):\n" +
      lines.join("\n")
  );
  process.exit(1);
}

console.log("Icon library governance check passed.");
