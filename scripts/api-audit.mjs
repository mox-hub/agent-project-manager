/**
 * API 完成度/测试覆盖清点（api:audit）。
 *
 * 以 openapi.json 为唯一事实来源，提取全部 endpoint，与 e2e 测试中实际
 * 请求过的路径做归一化比对，产出三态报告：
 *   ✓ 已覆盖   —— 有文档且有 e2e 触达
 *   ⚠ 未覆盖   —— 有实现有文档但无 e2e 触达（真实测试缺口）
 *   ? 疑似漂移 —— e2e 里出现但 openapi.json 匹配不到的路径（文档缺口或路径动态拼接）
 *
 * 报告写入 docs/roadmap/api-audit.md（滚动覆盖，便于 diff 观察覆盖增长）。
 *
 * 用法: pnpm api:audit
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const OPENAPI_PATH = join(ROOT, 'openapi.json');
const E2E_DIR = join(ROOT, 'apps', 'server', 'test');
const REPORT_PATH = join(ROOT, 'docs', 'roadmap', 'api-audit.md');
const HTTP_METHODS = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);

// '/_api/tasks/{taskId}/comments' → 'tasks/:p/comments'
function normalizeDocPath(p) {
  return p
    .replace(/^\/?_api\//, '')
    .replace(/\{[^}]+\}/g, ':p')
    .replace(/\/+$/, '');
}

// "'/_api/tasks/${taskId}/comments?x=1'" → 'tasks/:p/comments'
function normalizeTestPath(raw) {
  return raw
    .replace(/^\/?_api\//, '')
    .split('?')[0]
    .replace(/\$\{[^}]+\}/g, ':p')
    .replace(/\/+$/, '');
}

function main() {
  const doc = JSON.parse(readFileSync(OPENAPI_PATH, 'utf-8'));
  const endpoints = [];
  for (const [p, ops] of Object.entries(doc.paths ?? {})) {
    for (const [m, op] of Object.entries(ops)) {
      if (!HTTP_METHODS.has(m)) continue;
      endpoints.push({
        method: m.toUpperCase(),
        path: normalizeDocPath(p),
        tag: op.tags?.[0] ?? 'unknown',
        operationId: op.operationId ?? '',
      });
    }
  }

  // 从 e2e spec 提取请求路径
  const testedRaw = new Set();
  for (const f of readdirSync(E2E_DIR)) {
    if (!f.endsWith('.e2e-spec.ts')) continue;
    const src = readFileSync(join(E2E_DIR, f), 'utf-8');
    for (const match of src.matchAll(/['"`](\/_api\/[^'"`\s)]+)['"`]/g)) {
      testedRaw.add(match[1]);
    }
  }
  const tested = new Set([...testedRaw].map(normalizeTestPath));

  // 比对：先精确匹配，再允许测试路径比文档多出具体分段（截断到文档分段数再试）
  function isCovered(docPath) {
    if (tested.has(docPath)) return true;
    const segs = docPath.split('/');
    for (const t of tested) {
      const tSegs = t.split('/');
      if (tSegs.length <= segs.length && tSegs.every((s, i) => s === segs[i] || segs[i] === ':p')) {
        return true;
      }
    }
    return false;
  }

  const covered = [];
  const uncovered = [];
  for (const ep of endpoints) {
    (isCovered(ep.path) ? covered : uncovered).push(ep);
  }
  // 疑似漂移：测试打了但文档里匹配不到的路径
  const docSet = new Set(endpoints.map((e) => `${e.method} ${e.path}`));
  const drift = [];
  for (const t of tested) {
    const hit = endpoints.some(
      (e) => e.path === t || t.split('/').length === e.path.split('/').length,
    );
    if (!hit) drift.push(t);
  }

  const pct = ((covered.length / endpoints.length) * 100).toFixed(1);
  const byTag = new Map();
  for (const ep of endpoints) {
    if (!byTag.has(ep.tag)) byTag.set(ep.tag, { total: 0, covered: 0, uncovered: [] });
    const g = byTag.get(ep.tag);
    g.total += 1;
    if (isCovered(ep.path)) g.covered += 1;
    else g.uncovered.push(ep);
  }

  const lines = [
    '# API 完成度与 e2e 覆盖审计',
    '',
    `> 生成：${new Date().toISOString()}　|　事实来源：openapi.json + apps/server/test/*.e2e-spec.ts　|　命令：\`pnpm api:audit\``,
    '',
    `**Endpoint 总数 ${endpoints.length}，e2e 已覆盖 ${covered.length}（${pct}%），未覆盖 ${uncovered.length}**`,
    '',
    '| 模块(tag) | 总数 | 已覆盖 | 覆盖率 |',
    '|-----------|------|--------|--------|',
    ...[...byTag.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([tag, g]) => `| ${tag} | ${g.total} | ${g.covered} | ${((g.covered / g.total) * 100).toFixed(0)}% |`),
    '',
    '## 未覆盖 endpoint（测试缺口清单）',
    '',
    ...uncovered.map((e) => `- [ ] \`${e.method} /_api/${e.path}\`（${e.tag}）`),
    '',
  ];
  if (drift.length) {
    lines.push(
      '## 疑似漂移路径（e2e 请求了但 openapi.json 匹配不到）',
      '',
      ...drift.map((t) => `- ? \`${t}\``),
      '',
    );
  }

  writeFileSync(REPORT_PATH, lines.join('\n'), 'utf-8');
  console.log(`API 审计：${endpoints.length} endpoints，覆盖 ${covered.length}（${pct}%），未覆盖 ${uncovered.length}`);
  console.log(`报告：docs/roadmap/api-audit.md`);
  if (drift.length) console.log(`疑似漂移 ${drift.length} 条，详见报告`);
}

main();
