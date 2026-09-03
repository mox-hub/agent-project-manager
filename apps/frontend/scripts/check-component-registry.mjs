import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const UI_DIR = join(process.cwd(), "src", "components", "ui");
const DOC = join(process.cwd(), "COMPONENTS.md");

let doc;
try {
  doc = readFileSync(DOC, "utf8");
} catch {
  console.error(`Component registry check failed: COMPONENTS.md not found at ${DOC}`);
  process.exit(1);
}

// COMPONENTS.md 中引用组件文件时必须写成 `ui/<file>.tsx` 形式
const docFiles = new Set(
  [...doc.matchAll(/\bui\/([a-z0-9-]+\.tsx)\b/g)].map((m) => m[1])
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
