import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 根目录锚定「脚本自身位置」而非 process.cwd()：脚本有两条调用路径——
// `pnpm --filter frontend run lint:*`（cwd = app 根）与 lint-staged 的 pre-commit
// 任务（worker 进程的 cwd 不受控）。依赖 cwd 会在后者下扫空目录或直接报错。
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const UI_DIR = join(PKG_ROOT, "src", "components", "ui");
const DOC = join(PKG_ROOT, "COMPONENTS.md");
const REGISTRY = join(
  PKG_ROOT,
  "src",
  "modules",
  "design-system",
  "registry.ts"
);

let doc;
try {
  doc = readFileSync(DOC, "utf8");
} catch {
  console.error(`Component registry check failed: COMPONENTS.md not found at ${DOC}`);
  process.exit(1);
}

// COMPONENTS.md 中引用组件文件时必须写成 `src/components/ui/<file>.tsx` 形式。
// 负向后顾 `(?<!shared/)` 是必须的：本仓还有第二个 ui 命名空间 `src/shared/ui/`，
// 其路径天然含有 `ui/<file>.tsx` 子串，不加锚点会被误采进 docFiles，进而被判为
// 「COMPONENTS.md 引用了不存在的组件文件」而红门禁（2026-09-27 实测复现）。
// 曾以「把该行路径拆成两个代码片段」绕过，那是脆弱的文档侧 hack——已在生成脚本中移除。
const docFiles = new Set(
  [...doc.matchAll(/(?<!shared\/)\bui\/([a-z0-9-]+\.tsx)\b/g)].map((m) => m[1])
);

const actual = readdirSync(UI_DIR).filter(
  (f) => f.endsWith(".tsx") && !f.endsWith(".test.tsx")
);

const missing = actual.filter((f) => !docFiles.has(f));
const stale = [...docFiles].filter((f) => !actual.includes(f));

const errors = [];
if (missing.length > 0) {
  errors.push(
    `以下 components/ui 组件未在 COMPONENTS.md 登记（新增组件必须先登记再使用）:\n` +
      missing.map((f) => `- ui/${f}`).join("\n")
  );
}
if (stale.length > 0) {
  errors.push(
    `COMPONENTS.md 引用了不存在的组件文件（组件已删除或改名，请同步清单）:\n` +
      stale.map((f) => `- ui/${f}`).join("\n")
  );
}

// ---------------------------------------------------------------------------
// ② registry.ts 元数据完整性（2026-09-27 批 4 新增，E 类方案 §19.3 / §四 4.2）
//
// 只做「元数据是否登记齐全」这一件事，且**只校验登记侧**：
// - `review` 必带 `reviewBy`（§19.3 防滥用条款）；`review` 块必带 reason / proposal，
//   proposal 为 merge / rename 时必带 target（否则人工无从判断合并到哪）。
// - `deprecated` 必带 `expiresAt`（§19.6）。
//
// ⚠️ 有意**不实现**「review 逾期 → CI 失败」（§四 4.2 ③ 的后半段）：
// 该口径会向删除施压，而删除已被人类叫停（「组件仍然不删除，但是要在
// design-system 页面标记，我看过后再删」）⇒ 属待裁决项，见批 4 交付报告存疑清单。
// 本脚本只保证「标记本身是完整可裁决的」，不推动任何清退。
//
// 解析口径：registry.ts 的条目是**严格单行字面量**（见文件头「字段口径」与
// gen-components-md.mjs 的同源解析）。脚本不 import .ts（纯 node 无法加载 TS），
// 故按行解析；若解析条数 < 文件内 `status: '` 出现次数，说明格式已变，
// **直接报错**而不是静默少校验（教训：扫空/少扫会返回 0 退出）。
// ---------------------------------------------------------------------------
const REVIEW_PROPOSALS = new Set(["delete", "merge", "keep", "rename", "standby"]);
const VALID_STATUSES = new Set([
  "canonical",
  "standby",
  "internal",
  "review",
  "deprecated",
]);

const ENTRY_RE =
  /^\s*\{ name: '([^']+)', file: '([^']+)', section: '([^']+)', status: '([a-z]+)'(.*)\},\s*$/;
const REVIEW_BLOCK_RE =
  /review: \{ pending: true, reason: '([^']*)', proposal: '([^']+)'(?:, target: '([^']+)')? \}/;

let registrySource;
try {
  registrySource = readFileSync(REGISTRY, "utf8");
} catch {
  console.error(
    `Component registry check failed: registry.ts not found at ${REGISTRY}`
  );
  process.exit(1);
}

const registryEntries = [];
for (const line of registrySource.split(/\r?\n/)) {
  const m = line.match(ENTRY_RE);
  if (!m) continue;
  const tail = m[5] ?? "";
  const reviewBlock = tail.match(REVIEW_BLOCK_RE);
  registryEntries.push({
    name: m[1],
    file: m[2],
    status: m[4],
    reviewBy: tail.match(/reviewBy: '([^']*)'/)?.[1],
    expiresAt: tail.match(/expiresAt: '([^']*)'/)?.[1],
    proposal: reviewBlock?.[2],
    target: reviewBlock?.[3],
    hasReviewBlock: Boolean(reviewBlock),
  });
}

// 计数时排除注释行：文件头的字段口径注释里也写有 `status: 'standby'` 这样的示例
// （实测 335 vs 334 —— 不排除会把注释算成一条不存在的条目）。注释行 = 以 `*` / `//`
// / `/*` 开头。
const declaredStatuses = registrySource
  .split(/\r?\n/)
  .filter((line) => {
    const t = line.trim();
    return !t.startsWith("*") && !t.startsWith("//") && !t.startsWith("/*");
  })
  .join("\n")
  .match(/status: '[a-z]+'/g)?.length ?? 0;
if (registryEntries.length !== declaredStatuses) {
  errors.push(
    `registry.ts 解析失败：按单行字面量解析出 ${registryEntries.length} 条，` +
      `但文件内出现 ${declaredStatuses} 处 \`status: '…'\`。` +
      `条目格式已变更（需保持严格单行字面量），请同步 scripts/check-component-registry.mjs 的解析口径。`
  );
}

const reviewEntries = [];
const deprecatedEntries = [];
for (const entry of registryEntries) {
  if (!VALID_STATUSES.has(entry.status)) {
    errors.push(`registry.ts: ${entry.name} 的 status '${entry.status}' 不在五态词表内`);
    continue;
  }
  if (entry.status === "review") {
    reviewEntries.push(entry);
    const problems = [];
    if (!entry.reviewBy) problems.push("缺 reviewBy（§19.3 防滥用条款：review 必带审阅期限）");
    if (!entry.hasReviewBlock) {
      problems.push("缺 review 块（须登记 reason + proposal，否则人工无从裁决）");
    } else {
      if (!REVIEW_PROPOSALS.has(entry.proposal)) {
        problems.push(`proposal '${entry.proposal}' 不在词表内（${[...REVIEW_PROPOSALS].join(" / ")}）`);
      }
      if ((entry.proposal === "merge" || entry.proposal === "rename") && !entry.target) {
        problems.push(`proposal '${entry.proposal}' 必带 target（裁决时需知道合并/改名的目标）`);
      }
    }
    if (problems.length > 0) {
      errors.push(`registry.ts: review 条目 '${entry.name}' 元数据不完整:\n` + problems.map((p) => `  - ${p}`).join("\n"));
    }
  }
  if (entry.status === "deprecated") {
    deprecatedEntries.push(entry);
    if (!entry.expiresAt) {
      errors.push(
        `registry.ts: deprecated 条目 '${entry.name}' 缺 expiresAt（§19.6：deprecated 必带 expiresAt）`
      );
    }
  }
}

// ---------------------------------------------------------------------------
// §四 4.2 ②：canonical 且消费方 = 0 → 失败（2026-09-27 批 5 新增）
//
// 这是 §19.3 轴二 LU（Library Utilization）的机器强制：「有真实消费方的 canonical 组件数 ÷
// canonical 组件总数」，目标是逼问「components/ui/ 里每一个组件，谁在用？」。
//
// 「真实消费方」口径**严格照抄 §19.3**：指 `src/modules/**` 或 `src/shared/**` 中
// **非测试、非设计系统页**的文件对该组件的引用。
//
// ⚠️ 三条口径要点（都影响结果，逐条记明以防被误读）：
//   1. 原子层**内部**互相引用（ui/a.tsx 用 ui/b.tsx）**不算**真实消费方——§19.3 只认
//      modules/shared。这正是 `internal` 五态存在的理由：仅被其他 ui 组件消费的组件
//      应登记为 `internal`，而不是占着 `canonical` 把自己算进 LU 分母。
//   2. `src/main.tsx`（app 入口）不在 modules/shared 内，**不算**。故「只被入口引用」的
//      组件会被判 0——报告里会显式标注这种情况，避免被误当成孤儿件删掉。
//   3. 画廊自证被排除（design-system 模块整目录），§19.3 明写「防止画廊自证」。
//
// 依赖解析：把 `@/x` 与 `./x` / `../x` 归一到 `src/...` 形式的无扩展名路径再比对，
// 并支持 `index.tsx` barrel（`import … from '@/shared/components/create-dialog'` 要能命中
// `…/create-dialog/index.tsx`）。**不用正则直接匹配文件基名**——`menu-surface.ts` 这类
// 非 `.tsx` 文件与 barrel 都会漏（实测：早期正则版把 `menu-surface` 误判为「零消费方」）。
//
// ## 存量 vs 新增（新增即拦，存量放行）
//
// 存量条目**不许删**（人类铁律：删除已被叫停、待裁决），故只报告不阻断；
// 任何不在基线内的「canonical 且消费方 = 0」= 新增 → 退出码 1。
// 基线键 = **组件名**（file/行号都会随搬迁漂移，组件名在 registry 内唯一且稳定）。
// ---------------------------------------------------------------------------
const SRC_DIR = join(PKG_ROOT, "src");
const toPosix = (p) => p.split("\\").join("/");

/** registry 的 `file` 是 src 相对路径，但 `ui/` 实际位于 `src/components/ui/` */
const toSrcPath = (file) => (file.startsWith("ui/") ? `src/components/${file}` : `src/${file}`);

/** 归一：消 `.` / `..`，去掉 `.ts` / `.tsx` 扩展名 */
function normalizePath(p) {
  const parts = [];
  for (const seg of p.split("/")) {
    if (seg === "" || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return parts.join("/").replace(/\.tsx?$/, "");
}

function walkFiles(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkFiles(p, out);
    else out.push(p);
  }
  return out;
}

const SRC_PREFIX = toPosix(SRC_DIR) + "/";
const srcFiles = walkFiles(SRC_DIR)
  .map(toPosix)
  .filter((f) => /\.tsx?$/.test(f))
  .filter((f) => !/\.(test|spec)\.tsx?$/.test(f))
  .filter((f) => !/\/(__mocks__|__fixtures__|test-utils)\//.test(f))
  .map((f) => f.replace(SRC_PREFIX, "src/"));

const isGallery = (f) => f.startsWith("src/modules/design-system/");
const inModulesOrShared = (f) => f.startsWith("src/modules/") || f.startsWith("src/shared/");

const specCache = new Map();
function specifiersOf(file) {
  if (!specCache.has(file)) {
    const source = readFileSync(join(PKG_ROOT, file), "utf8");
    const specs = new Set();
    const re = /(?:from\s*|import\s*\(\s*)['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(source))) specs.add(m[1]);
    specCache.set(file, specs);
  }
  return specCache.get(file);
}

function resolveSpecifier(spec, fromFile) {
  if (spec.startsWith("@/")) return normalizePath(`src/${spec.slice(2)}`);
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return normalizePath(`${normalizePath(fromFile).split("/").slice(0, -1).join("/")}/${spec}`);
  }
  return null; // 裸包名（react 等）不是内部引用
}

// 反向索引：归一后的「被导入目标路径」→ 引用它的文件列表。
// 一次遍历建索引，避免「每个 registry 条目 × 每个 src 文件」的 O(N×M) 扫描
// （299 条 canonical × ~1900 文件，实测会到秒级）。
const importersByTarget = new Map();
for (const f of srcFiles) {
  for (const spec of specifiersOf(f)) {
    const resolved = resolveSpecifier(spec, f);
    if (!resolved) continue;
    if (!importersByTarget.has(resolved)) importersByTarget.set(resolved, []);
    importersByTarget.get(resolved).push(f);
  }
}

function consumersOf(entry, accept) {
  const selfNoExt = normalizePath(toSrcPath(entry.file));
  const targets = [selfNoExt];
  if (selfNoExt.endsWith("/index")) targets.push(selfNoExt.slice(0, -"/index".length));
  const out = new Set();
  for (const target of targets) {
    for (const f of importersByTarget.get(target) ?? []) {
      if (!accept(f)) continue;
      if (normalizePath(f) === selfNoExt) continue; // 自己不算自己的消费方
      out.add(f);
    }
  }
  return [...out];
}

/**
 * 存量基线（2026-09-27 实测 4 条）。全部「只报告不阻断」，修法为**登记改判**（改五态）
 * 或补真实消费方，都不是删除。
 */
const LU_BASELINE = new Map([
  [
    "global-loading-state",
    "仅被 app 入口 src/main.tsx 引用（不在 modules/shared 内 ⇒ 按 §19.3 口径判 0）",
  ],
  [
    "loading-overlay",
    "仅被原子层内部（ui/global-loading-state.tsx）与 app 入口引用 ⇒ 按 §19.3 表应改判 internal",
  ],
  ["mock-badge", "仅被 app 入口 src/main.tsx 引用 ⇒ 同上"],
  [
    "task-detail-drawer",
    "全库零引用（实测，仅注释中提及）——canonical 但无消费方，属真·孤儿件",
  ],
]);

const canonicalEntries = registryEntries.filter((e) => e.status === "canonical");
const zeroConsumer = [];
for (const entry of canonicalEntries) {
  const strict = consumersOf(entry, (f) => !isGallery(f) && inModulesOrShared(f));
  if (strict.length > 0) continue;
  // 供报告用：放宽到全 src（含 app 入口 / 原子层内部），说明「为什么判 0」
  const relaxed = consumersOf(entry, (f) => !isGallery(f));
  zeroConsumer.push({ entry, relaxed });
}

const luExisting = zeroConsumer.filter(({ entry }) => LU_BASELINE.has(entry.name));
const luAdded = zeroConsumer.filter(({ entry }) => !LU_BASELINE.has(entry.name));
const luStale = [...LU_BASELINE.keys()].filter(
  (name) => !zeroConsumer.some(({ entry }) => entry.name === name)
);

for (const { entry, relaxed } of luAdded) {
  errors.push(
    `registry.ts: canonical 组件 '${entry.name}'（${entry.file}）**消费方 = 0**（§19.3 轴二 LU）。\n` +
      `  - 「真实消费方」= src/modules/** 或 src/shared/** 中非测试、非设计系统页的引用（§19.3）。\n` +
      `  - 放宽到全 src 后命中：${relaxed.length > 0 ? relaxed.join(", ") : "无（确为孤儿件）"}\n` +
      `  - 处置（§19.3 五态表，**不是删除**）：接上真实消费方、或改判 standby/internal/review。`
  );
}

if (errors.length > 0) {
  console.error("Component registry check failed:\n" + errors.join("\n\n"));
  process.exit(1);
}

// ---------------------------------------------------------------------------
// §四 4.2 ③：review / deprecated 逾期 —— **报告项，刻意不失败**
//
// ⚠️ 方案 §4.2 ③ 原文是「`deprecated` / `review` 逾期 → 失败」。**本脚本有意只报告**：
// 该口径以门禁**向删除施压**，而「组件仍然不删除，但是要在 design-system 页面标记，
// 我看过后再删」是人类裁决 ⇒ 删除已叫停、逾期处理属待裁决项（方案台账偏差 29）。
// E 类批 4 已按同一理由未实现 ③ 的失败分支（见上方「② registry.ts 元数据完整性」注释），
// 批 5 沿用并向上升级为「逾期可见化」：报告逾期条数与清单，把裁决权交回人。
// ---------------------------------------------------------------------------
const TODAY = new Date();
const daysOverdue = (dateStr) => {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const d = new Date(`${dateStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((TODAY.getTime() - d.getTime()) / 86400000);
};

const overdue = [];
for (const entry of registryEntries) {
  const due = entry.status === "review" ? entry.reviewBy : entry.status === "deprecated" ? entry.expiresAt : null;
  const late = daysOverdue(due);
  if (late !== null && late > 0) overdue.push({ entry, due, late });
}

// ---------------------------------------------------------------------------
// §四 4.2 ④：设计系统页覆盖率（lint:gallery）—— **本轮不做门禁，只报告当前覆盖数**
//
// 方案 §5.1 曾记「覆盖 77/96」并列出 19 个未收录件；该页此后被批 2 改过、registry 也已增长。
// 本轮先把**实测值**报出来，作为转 error 前的基线；门禁本身留待画廊改为
// 「按 registry 遍历渲染」（registry.ts 头注宣称的恒 100% 形态）后再落地——
// 否则手写清单与 registry 的漂移会每天假红（这正是该页 6255 行手写 import 的结构问题）。
// ---------------------------------------------------------------------------
const GALLERY_PAGE = join(
  PKG_ROOT,
  "src",
  "modules",
  "design-system",
  "pages",
  "design-system-page.tsx"
);
let galleryCoverage = null;
try {
  const pageSource = readFileSync(GALLERY_PAGE, "utf8");
  const importedStems = new Set(
    [...pageSource.matchAll(/from\s+['"]@\/components\/ui\/([a-z0-9-]+)['"]/g)].map((m) => m[1])
  );
  const uiEntries = registryEntries.filter((e) => e.file.startsWith("ui/"));
  const mustShow = uiEntries.filter((e) => e.status !== "internal"); // internal 按 §19.3 表豁免
  const covered = mustShow.filter((e) =>
    importedStems.has(e.file.slice(3).replace(/\.tsx?$/, ""))
  );
  galleryCoverage = {
    covered: covered.length,
    total: mustShow.length,
    missing: mustShow.filter((e) => !covered.includes(e)),
  };
} catch {
  // 页面文件缺失不阻断（本项是报告项）：显式说明而非静默跳过
  galleryCoverage = null;
}

console.log(
  `Component registry check passed (${actual.length} components). ` +
    `registry.ts 登记 ${registryEntries.length} 条（canonical/standby/internal/review/deprecated 五态词表校验通过）；` +
    `review ${reviewEntries.length} 条元数据完整；deprecated ${deprecatedEntries.length} 条。`
);

// —— ② 消费方对账（报告部分）——
console.log(
  `\n[§4.2 ② 消费方对账] canonical ${canonicalEntries.length} 条中「消费方 = 0」${zeroConsumer.length} 条` +
    `（新增 ${luAdded.length} → 已失败；存量基线 ${luExisting.length} → 报告项）。`
);
for (const { entry, relaxed } of luExisting) {
  console.log(`  ○ ${entry.name}（${entry.file}）—— ${LU_BASELINE.get(entry.name)}`);
  if (relaxed.length > 0) console.log(`      放宽到全 src 命中：${relaxed.join(", ")}`);
}
if (luStale.length > 0) {
  console.log(`  ⚠ 基线提示：${luStale.join(", ")} 已不再命中，可从 LU_BASELINE 删除。`);
}

// —— ③ 逾期报告（不失败）——
console.log(
  `\n[§4.2 ③ 逾期报告 · 报告项不阻断] review/deprecated 逾期 ${overdue.length} 条` +
    `（刻意不失败：向删除施压的口径已被人类叫停，见脚本内注释）。`
);
for (const { entry, due, late } of overdue) {
  console.log(`  ○ ${entry.status} '${entry.name}' 期限 ${due} 已逾期 ${late} 天（${entry.file}）`);
}

// —— ④ 画廊覆盖率报告（本轮不做门禁）——
if (galleryCoverage) {
  const pct = ((galleryCoverage.covered / galleryCoverage.total) * 100).toFixed(1);
  console.log(
    `\n[§4.2 ④ 画廊覆盖率 · 报告项，本轮不做门禁] 设计系统页覆盖 ` +
      `${galleryCoverage.covered}/${galleryCoverage.total} = ${pct}%（已排除 internal）；` +
      `未收录 ${galleryCoverage.missing.length} 个。`
  );
  for (const e of galleryCoverage.missing) console.log(`  ○ ${e.name}（${e.status}，${e.file}）`);
} else {
  console.log("\n[§4.2 ④ 画廊覆盖率] 跳过：未找到设计系统页源文件。");
}
