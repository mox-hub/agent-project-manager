import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// 根目录锚定「脚本自身位置」而非 process.cwd()：脚本有两条调用路径——
// `pnpm --filter frontend run lint:*`（cwd = app 根）与 lint-staged 的 pre-commit
// 任务（worker 进程的 cwd 不受控）。依赖 cwd 会在后者下扫空目录或直接报错。
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

const UI_DIR = join(PKG_ROOT, "src", "components", "ui");
const DOC = join(PKG_ROOT, "COMPONENTS.md");

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

if (errors.length > 0) {
  console.error("Component registry check failed:\n" + errors.join("\n\n"));
  process.exit(1);
}

console.log(`Component registry check passed (${actual.length} components).`);
