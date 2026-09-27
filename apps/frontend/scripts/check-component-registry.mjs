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

if (errors.length > 0) {
  console.error("Component registry check failed:\n" + errors.join("\n\n"));
  process.exit(1);
}

console.log(
  `Component registry check passed (${actual.length} components). ` +
    `registry.ts 登记 ${registryEntries.length} 条（canonical/standby/internal/review/deprecated 五态词表校验通过）；` +
    `review ${reviewEntries.length} 条元数据完整；deprecated ${deprecatedEntries.length} 条。`
);
