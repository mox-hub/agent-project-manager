import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

// 设计宪法 §3/§4 刻度治理（docs/design/PRINCIPLES.md）：
// 1) 唯一字阶 8 档：text-10/11/xs/sm/base/lg/xl/2xl；px 直读长尾档禁止
// 2) 间距 4px 网格：整数档与 .5 档合法；四分之一档冻结
const ROOT = join(process.cwd(), "src");
const TARGET_EXT = new Set([".ts", ".tsx"]);

// 宪法 §3.1 之外的长尾字阶（批 1 迁移后应保持零命中）
const BANNED_TEXT = /\btext-(8|9|13|15|22|28|32)\b/g;

// 宪法 §4.1 冻结的四分之一档 spacing（合法属性前缀内才报警）
const FROZEN_VALUES = "(0\\.75|1\\.25|2\\.75|3\\.25|4\\.25|5\\.25)";
const BANNED_SPACING =
  new RegExp("\\b(?:p|px|py|pt|pb|pl|ps|pe|pr|m|mx|my|mt|mb|ml|ms|me|mr|gap|gap-x|gap-y|w|h|size|top|bottom|left|right|inset|inset-x|inset-y|basis|space-x|space-y)-" + FROZEN_VALUES + "\\b", "g");

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
  for (const match of text.matchAll(BANNED_TEXT)) {
    offenders.push({ file, token: match[0], rule: "宪法 §3 唯一字阶（映射：8/9→text-10、13→xs、15→sm、22/28/32→xl/2xl）" });
  }
  for (const match of text.matchAll(BANNED_SPACING)) {
    offenders.push({ file, token: match[0], rule: "宪法 §4.1 4px 网格（四分之一档冻结，迁移到最近整数/.5 档）" });
  }
}

if (offenders.length > 0) {
  const lines = offenders.map((o) => `${o.file}: ${o.token}  ← ${o.rule}`);
  console.error(
    "Found banned scale tokens (违反设计宪法 docs/design/PRINCIPLES.md):\n" + lines.join("\n")
  );
  process.exit(1);
}

console.log("Spacing & type scale governance check passed.");
