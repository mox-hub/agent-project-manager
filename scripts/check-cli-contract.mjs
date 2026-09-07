/**
 * CLI 契约护栏：断言 openapi.json 包含 apm CLI / 守护进程依赖的关键端点。
 *
 * 目的：防止后端重构时悄然删除/改签 CLI 依赖的端点，导致 CLI 在 build 后仍可
 * 编译但运行时 404。缺失时退出码 1。
 *
 * 用法：node scripts/check-cli-contract.mjs
 */

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const openapiPath = path.join(root, 'openapi.json');

const REQUIRED_PATHS = [
  // 认证 / 基础
  ['/auth/login', ['post']],
  ['/auth/register', ['post']],
  ['/workspaces', ['get', 'post']],
  // runtime 协议（守护进程）
  ['/runtime/register', ['post']],
  ['/runtime/{runtimeId}/capabilities', ['put']],
  ['/runtime/{runtimeId}/heartbeat', ['post']],
  ['/runtime/{runtimeId}/dispatches', ['get']],
  ['/runtime/executions/{executionRunId}/context', ['get']],
  ['/runtime/executions/{executionRunId}/events', ['post']],
  ['/runtime/executions/{executionRunId}/result', ['post']],
  ['/runtime/executions/{executionRunId}/approval-request', ['post']],
  ['/runtime/control/dispatches', ['post']],
  // CLI 派发与状态
  ['/ai/issues/{issueId}/dispatch-cli', ['post']],
  ['/ai/execution-runs/{id}/status', ['get']],
  ['/ai/cli-providers', ['get']],
  ['/cli-providers/detect', ['post']],
  // 主线命令依赖
  ['/projects', ['get', 'post']],
  ['/projects/{projectId}/issues', ['get']],
  ['/issues', ['post']],
  ['/execution/runs', ['get', 'post']],
  ['/execution/approvals', ['get', 'post']],
  ['/acceptance', ['get', 'post']],
  ['/git/repos', ['get', 'post']],
  ['/git/projects/{projectId}/workspace', ['put']],
  ['/teams', ['get', 'post']],
  ['/documents', ['get', 'post']],
];

if (!existsSync(openapiPath)) {
  console.error(`[check-cli-contract] openapi.json 不存在：${openapiPath}`);
  console.error('请先执行 pnpm contract:export 生成契约');
  process.exit(1);
}

const openapi = JSON.parse(readFileSync(openapiPath, 'utf8'));
const paths = openapi.paths ?? {};

const missing = [];
for (const [p, methods] of REQUIRED_PATHS) {
  // openapi.json 的 path key 带全局前缀 /_api
  const full = p.startsWith('/_api') ? p : `/_api${p}`;
  const entry = paths[full];
  if (!entry) {
    missing.push(`${full}（端点缺失）`);
    continue;
  }
  for (const m of methods) {
    if (!entry[m]) {
      missing.push(`${m.toUpperCase()} ${full}（方法缺失）`);
    }
  }
}

if (missing.length > 0) {
  console.error(`[check-cli-contract] CLI 依赖的 ${missing.length} 个端点缺失：`);
  for (const m of missing) console.error(`  - ${m}`);
  process.exit(1);
}

console.log(
  `[check-cli-contract] OK：CLI 依赖的 ${REQUIRED_PATHS.length} 个端点全部存在`,
);

// ---------- 领域事件名镜像对比（apm-shared 真相源 ↔ server 镜像） ----------
// server 不直接依赖 apm-shared（镜像架构），事件名漂移在此拦截。

function extractEventNames(filePath) {
  const src = readFileSync(filePath, 'utf8');
  const m = src.match(/export const DomainEventTypes = \{([\s\S]*?)\} as const/);
  if (!m) return null;
  const pairs = {};
  for (const line of m[1].split('\n')) {
    const km = line.match(/(\w+):\s*'([^']+)'/);
    if (km) pairs[km[1]] = km[2];
  }
  return pairs;
}

const eventsTruthPath = path.join(
  root,
  'packages/apm-shared/src/events/domain-events.ts',
);
const eventsMirrorPath = path.join(
  root,
  'apps/server/src/core/message-bus/domain-events.ts',
);
const eventsTruth = extractEventNames(eventsTruthPath);
const eventsMirror = extractEventNames(eventsMirrorPath);
if (!eventsTruth || !eventsMirror) {
  console.error('[check-cli-contract] ✗ 领域事件镜像：DomainEventTypes 解析失败');
  process.exit(1);
}
const drifted = Object.keys(eventsTruth).filter(
  (k) => eventsMirror[k] !== eventsTruth[k],
);
if (drifted.length > 0) {
  console.error(
    `[check-cli-contract] ✗ 领域事件名镜像漂移（${drifted.length} 个）：`,
  );
  for (const k of drifted) {
    console.error(
      `  - ${k}: 真相源=${eventsTruth[k]} 镜像=${eventsMirror[k] ?? '缺失'}`,
    );
  }
  process.exit(1);
}
console.log(
  `[check-cli-contract] OK：领域事件名镜像一致（${Object.keys(eventsTruth).length} 个）`,
);
