import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// ---------------------------------------------------------------------------
// docs-sync-manager.mjs
//
// 文档同步管理器：docs/ 目录不纳入版本控制（见 .gitignore），但文档同步纪律
// 必须可验证。本脚本负责：
//   1. 为后端/前端模块生成 requirements 文档模板（docs/meta/requirements/）
//   2. 生成/更新 traceability matrix（docs/reports/traceability-matrix.md）
//   3. 更新版本化的 docs-sync-manifest.json（CI 可验证的同步证据）
//
// 用法:
//   node scripts/doc-sync-manager.mjs            # 同步当前 git 变更涉及的模块
//   node scripts/doc-sync-manager.mjs --all      # 全量同步所有模块
//   node scripts/doc-sync-manager.mjs --check    # 只报告不同步项，不写文件
// ---------------------------------------------------------------------------

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'docs-sync-manifest.json');
const REQ_DIR = join(ROOT, 'docs/meta/requirements');
const MATRIX_PATH = join(ROOT, 'docs/reports/traceability-matrix.md');

const ARGS = process.argv.slice(2);
const ALL = ARGS.includes('--all');
const CHECK_ONLY = ARGS.includes('--check');

const TODAY = new Date().toISOString().slice(0, 10);

// ---------------------------------------------------------------------------
// 模块发现
// ---------------------------------------------------------------------------

function listModules(side) {
  const base = side === 'backend' ? 'apps/server/src/modules' : 'apps/frontend/src/modules';
  const dir = join(ROOT, base);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
}

function getChangedModules() {
  let changed = [];
  try {
    const out = execSync('git diff --name-only --diff-filter=ACMRT', {
      encoding: 'utf8',
    }).trim();
    changed = out ? out.split(/\r?\n/) : [];
  } catch {
    // not a git repo or no diff, fall through
  }

  const backend = new Set();
  const frontend = new Set();
  for (const file of changed) {
    let m = file.match(/^apps\/server\/src\/modules\/([^/]+)\//);
    if (m) backend.add(m[1]);
    m = file.match(/^apps\/frontend\/src\/modules\/([^/]+)\//);
    if (m) frontend.add(m[1]);
  }
  return {
    backend: [...backend].sort(),
    frontend: [...frontend].sort(),
  };
}

// ---------------------------------------------------------------------------
// 文档模板生成
// ---------------------------------------------------------------------------

function requirementTemplate(side, mod) {
  const scope = side === 'backend' ? `backend:${mod}` : `frontend:${mod}`;
  return `---
title: "功能需求 - ${mod}"
description: "${side === 'backend' ? '后端' : '前端'}模块 ${mod} 需求文档（docs:sync 自动生成占位，请按代码实现补充）"
id: "FR-${mod.toUpperCase().replace(/-/g, '_')}"
category: "requirements"
status: "active"
created: "${TODAY}"
modified: "${TODAY}"
scope: "${scope}"
tags: "requirements,${mod}"
---

# ${mod} 功能需求

> 本文件由 \`pnpm docs:sync\` 自动生成占位。请根据当前代码实现补充以下内容。

## 需求概述

<!-- TODO: 补充模块目标、用户角色、核心场景 -->

## 功能列表

<!-- TODO: 按功能点列出需求项，标注优先级 -->

## 验收标准

<!-- TODO: 补充可验证的验收条件 -->

## 相关文档

- ${scope}
`;
}

function ensureRequirementsDoc(side, mod) {
  const target = join(REQ_DIR, `feature-${mod}.md`);
  if (existsSync(target)) return false;
  mkdirSync(REQ_DIR, { recursive: true });
  writeFileSync(target, requirementTemplate(side, mod), 'utf8');
  return true;
}

function ensureTraceabilityMatrix(backend, frontend) {
  if (existsSync(MATRIX_PATH)) return false;
  mkdirSync(join(ROOT, 'docs/reports'), { recursive: true });
  const rows = [
    '---',
    `title: "需求追踪矩阵"`,
    `description: "后端/前端模块与需求文档的追踪关系（docs:sync 生成）"`,
    'id: "TRACE-001"',
    'category: "report"',
    'status: "active"',
    `created: "${TODAY}"`,
    `modified: "${TODAY}"`,
    'scope: "全仓库"',
    'tags: "traceability,requirements"',
    '---',
    '',
    '# 需求追踪矩阵',
    '',
    '| 模块 | 侧 | 需求文档 | 状态 |',
    '| --- | --- | --- | --- |',
  ];
  for (const mod of backend) {
    rows.push(`| ${mod} | backend | docs/meta/requirements/feature-${mod}.md | active |`);
  }
  for (const mod of frontend) {
    rows.push(`| ${mod} | frontend | docs/meta/requirements/feature-${mod}.md | active |`);
  }
  writeFileSync(MATRIX_PATH, rows.join('\n') + '\n', 'utf8');
  return true;
}

// ---------------------------------------------------------------------------
// Manifest 维护
// ---------------------------------------------------------------------------

function readManifest() {
  if (existsSync(MANIFEST_PATH)) {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8'));
  }
  return {
    schemaVersion: 1,
    description:
      '每个模块的本地文档同步状态。docs/ 不纳入版本控制，本清单是 CI 可验证的同步证据。',
    lastUpdated: TODAY,
    backendModules: {},
    frontendModules: {},
  };
}

function refreshManifest(manifest, backend, frontend) {
  let dirty = false;

  for (const mod of backend) {
    if (!(mod in manifest.backendModules)) {
      manifest.backendModules[mod] = { synced: false };
      dirty = true;
    }
  }
  for (const mod of frontend) {
    if (!(mod in manifest.frontendModules)) {
      manifest.frontendModules[mod] = { synced: false };
      dirty = true;
    }
  }

  // 依据实际文件存在性刷新同步状态（保持与 doc-coverage 一致）
  for (const mod of Object.keys(manifest.backendModules)) {
    const synced = existsSync(join(REQ_DIR, `feature-${mod}.md`));
    if (manifest.backendModules[mod].synced !== synced) {
      manifest.backendModules[mod].synced = synced;
      dirty = true;
    }
  }
  for (const mod of Object.keys(manifest.frontendModules)) {
    const synced = existsSync(join(REQ_DIR, `feature-${mod}.md`));
    if (manifest.frontendModules[mod].synced !== synced) {
      manifest.frontendModules[mod].synced = synced;
      dirty = true;
    }
  }

  if (manifest.lastUpdated !== TODAY) {
    manifest.lastUpdated = TODAY;
    dirty = true;
  }
  return dirty;
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

function main() {
  const backend = ALL ? listModules('backend') : getChangedModules().backend;
  const frontend = ALL ? listModules('frontend') : getChangedModules().frontend;

  console.log(`[docs:sync] target: backend=${backend.length || 0} frontend=${frontend.length || 0}`);

  if (!CHECK_ONLY) {
    const created = [];
    for (const mod of backend) if (ensureRequirementsDoc('backend', mod)) created.push(mod);
    for (const mod of frontend) if (ensureRequirementsDoc('frontend', mod)) created.push(mod);
    if (created.length > 0) {
      console.log(`[docs:sync] generated ${created.length} requirements doc(s):`);
      created.forEach((m) => console.log(`  - docs/meta/requirements/feature-${m}.md`));
    }

    if (ensureTraceabilityMatrix(backend, frontend)) {
      console.log('[docs:sync] generated docs/reports/traceability-matrix.md');
    }

    const manifest = readManifest();
    if (refreshManifest(manifest, backend, frontend)) {
      writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n', 'utf8');
      console.log('[docs:sync] docs-sync-manifest.json updated');
    }
  }

  // 报告
  const manifest = readManifest();
  const unsynced = [
    ...Object.entries(manifest.backendModules).filter(([, v]) => !v.synced).map(([m]) => `backend/${m}`),
    ...Object.entries(manifest.frontendModules).filter(([, v]) => !v.synced).map(([m]) => `frontend/${m}`),
  ];
  if (unsynced.length > 0) {
    console.log(`[docs:sync] ${unsynced.length} module(s) not yet synced (run \`pnpm docs:sync --all\` to generate placeholders):`);
    unsynced.forEach((m) => console.log(`  - ${m}`));
  } else {
    console.log('[docs:sync] all modules synced.');
  }

  console.log('[docs:sync] CHANGELOG 建议条目（请按仓库格式补充进 CHANGELOG.md）:');
  console.log(`[docs:sync] | docs | 新增/更新模块需求文档 + 同步清单 | n/a | pnpm docs:sync | docs/meta/requirements/, docs-sync-manifest.json |`);
}

main();