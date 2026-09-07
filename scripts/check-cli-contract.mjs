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
  ['/ai/tasks/{taskId}/dispatch-cli', ['post']],
  ['/ai/execution-runs/{id}/status', ['get']],
  ['/ai/cli-providers', ['get']],
  ['/cli-providers/detect', ['post']],
  // 主线命令依赖
  ['/projects', ['get', 'post']],
  ['/projects/{projectId}/tasks', ['get']],
  ['/tasks', ['post']],
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
