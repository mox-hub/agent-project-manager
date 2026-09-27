import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * lint:layers —— 分层倒置门禁（E 类方案 §四 4.2 / 宪法 §19.1）
 *
 * 规则：**原子层 `src/components/ui/` 禁止 `import` 任何 `modules/*`（含 `import type`）**。
 * 原子层是与业务对象无关的可复用件（不 import 任何 modules/*、不发数据请求）；一旦原子层
 * 反向依赖业务模块，就形成循环依赖且组件不可复用 —— 即「分层倒置」。
 *
 * 口径说明：
 * - **原子层 = `src/components/ui/`**（§19.1 唯一命名空间）。第二个 `ui` 命名空间
 *   `src/shared/ui/` 是 §三 E7 的清退候选、不在本门禁的原子层口径内（实测其当前也不
 *   import modules/*），故不扫。
 * - 仅查 `import` 路径（正则足够，无需 AST）——ESLint 只承接需要 AST 的 3 条规则，二者并存。
 * - `import type` **同样算违规**：§19.1 明写「含类型」。
 *
 * ## 存量 vs 新增（新增即拦，存量放行）
 *
 * 基线键 = `文件路径 + imported specifier`（**不含行号**：行号会随任何无关编辑漂移，
 * 导致基线失效后突然变红）。存量条目逐条列出理由与去向，只报告不阻断；
 * 任何不在基线内的命中 = 新增 → 退出码 1。
 *
 * 之所以不能直接全量失败：这 4 处存量倒置的修法是「把组件下沉/上浮到正确的层」，
 * 属需人工裁决的搬迁（且删除已被人类叫停），本轮不推动。
 */

// 根目录锚定「脚本自身位置」而非 process.cwd()：脚本有两条调用路径——
// `pnpm --filter frontend run lint:layers`（cwd = app 根）与 lint-staged 的 pre-commit
// 任务（worker 进程的 cwd 不受控）。依赖 cwd 会在后者下扫空目录或直接报错。
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const ATOM_DIR = join(PKG_ROOT, "src", "components", "ui");

const toPosix = (p) => p.split("\\").join("/");

/**
 * 存量基线（2026-09-27 实测 4 文件 / 5 条）。全部属「原子层错位」，
 * 修法是搬迁而非改写（见方案 §2.2 分拣表），本轮不推动、只报告。
 */
const LAYER_BASELINE = [
  "src/components/ui/ai-execution-badge.tsx → @/modules/execution/hooks/use-active-executions-map",
  "src/components/ui/data-list.tsx → @/modules/team-member/components/member-avatar",
  "src/components/ui/document-preview-dialog.tsx → @/modules/document/api/document-api",
  "src/components/ui/document-preview-dialog.tsx → @/modules/document/components/mdx-renderer",
  "src/components/ui/property-panel.tsx → @/modules/team-member/components/member-avatar",
];

// 静态 `import ... from '…'` / `export … from '…'` 与动态 `import('…')`
const SPECIFIER_RE = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
// 命中条件：specifier 里出现 `/modules/` 段（`@/modules/...` 与相对路径 `../../modules/...` 同拦）
const MODULE_SPECIFIER_RE = /(?:^|\/)modules\//;

let files;
try {
  files = readdirSync(ATOM_DIR).filter((f) => /\.tsx?$/.test(f) && !/\.(test|spec)\.tsx?$/.test(f));
} catch {
  console.error(`Layer check failed: 原子层目录不存在 ${ATOM_DIR}`);
  process.exit(1);
}

const found = [];
for (const file of files) {
  const abs = join(ATOM_DIR, file);
  const rel = toPosix(join("src", "components", "ui", file));
  const source = readFileSync(abs, "utf8");
  const lines = source.split(/\r?\n/);
  lines.forEach((line, i) => {
    SPECIFIER_RE.lastIndex = 0;
    let m;
    while ((m = SPECIFIER_RE.exec(line))) {
      const spec = m[1];
      if (!MODULE_SPECIFIER_RE.test(spec)) continue;
      found.push({ rel, line: i + 1, spec, key: `${rel} → ${spec}` });
    }
  });
}

const baseline = new Set(LAYER_BASELINE);
const existing = found.filter((h) => baseline.has(h.key));
const added = found.filter((h) => !baseline.has(h.key));

// 基线里已修好的条目：不失败，但提示可以删基线行（防基线腐化成永久豁免）
const stale = LAYER_BASELINE.filter((k) => !found.some((h) => h.key === k));

console.log("═".repeat(72));
console.log("lint:layers —— 分层倒置（原子层 src/components/ui/ 禁止 import modules/*，§19.1）");
console.log("═".repeat(72));
console.log(`扫描原子层文件 ${files.length} 个；命中 ${found.length} 条（存量 ${existing.length}，新增 ${added.length}）\n`);

if (existing.length > 0) {
  console.log(`【存量 · 报告项 · 不阻断】${existing.length} 条（修法为搬迁，属待裁决项）：`);
  for (const h of existing) console.log(`  - ${h.rel}:${h.line}  ${h.spec}`);
  console.log("");
}
if (stale.length > 0) {
  console.log(`【基线提示】${stale.length} 条基线已不再命中，可从脚本 LAYER_BASELINE 删除：`);
  for (const k of stale) console.log(`  - ${k}`);
  console.log("");
}

if (added.length > 0) {
  console.error(`Layer check failed —— 新增分层倒置 ${added.length} 条：`);
  for (const h of added) console.error(`  - ${h.rel}:${h.line}  ${h.spec}`);
  console.error(
    "\n原子层不得 import 任何 modules/*（含 import type，§19.1）。" +
      "若该文件本质是业务组件，请上浮到 src/shared/components/ 或 src/modules/<m>/components/。"
  );
  process.exit(1);
}

console.log(
  `Layer check passed（原子层 ${files.length} 个文件无**新增**分层倒置；存量 ${existing.length} 条已登记基线待裁决）。`
);
