import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

const since = process.env.SINCE ?? '7 days ago';
let files = [];
try {
  const out = run(`git log --since="${since}" --name-only --pretty=format:`);
  files = [...new Set(out.split(/\r?\n/).map((x) => x.trim()).filter(Boolean))];
} catch {
  files = [];
}

const codeFiles = files.filter((f) => f.startsWith('apps/server/') || f.startsWith('apps/frontend/')).length;
const docFiles = files.filter((f) => f.startsWith('docs/')).length;
const ratio = docFiles === 0 ? 'N/A' : (codeFiles / docFiles).toFixed(2);

const date = new Date().toISOString().slice(0, 10);
const content = `# 周治理报告（${date}）\n\n## 一、门禁趋势\n- type-check：请填入本周运行结果\n- lint：请填入本周运行结果\n- frontend test：请填入本周运行结果\n- backend test：请填入本周运行结果\n- docs sync：请填入本周运行结果\n\n## 二、代码-文档漂移\n- 本周代码变更文件数：${codeFiles}\n- 本周文档变更文件数：${docFiles}\n- 变更比（代码/文档）：${ratio}\n- 未映射模块清单：\n\n## 三、风险台账更新\n| ID | 状态变化 | 说明 |\n|---|---|---|\n\n## 四、下周必修项\n1. \n2. \n3. \n`;

const path = `docs/reports/review-reports/weekly-governance-${date}.md`;
writeFileSync(path, content, 'utf8');
console.log(`[governance] report generated: ${path}`);
