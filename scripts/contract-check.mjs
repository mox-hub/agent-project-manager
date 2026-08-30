/**
 * 契约漂移检查（CI 与本地 quality gate 用）。
 *
 * 校验两件事，任一漂移即退出码 1：
 * 1. openapi.json 是否与当前后端代码一致（重新导出到临时文件做字节比对）
 * 2. 前端生成类型 api-types.gen.ts 是否与 openapi.json 一致（重新生成到临时文件比对）
 *
 * 修复方式：
 *   pnpm contract:export   → 更新 openapi.json
 *   pnpm contract:generate → 更新前端生成类型
 *
 * 用法: pnpm contract:check
 */
import { execSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const ROOT = process.cwd();
if (!(process.platform === 'win32' ? resolve(ROOT).toLowerCase().endsWith('agent-project-manager') : ROOT.endsWith('agent-project-manager'))) {
  console.error('请在仓库根目录运行 pnpm contract:check');
  process.exit(1);
}

const OPENAPI_PATH = join(ROOT, 'openapi.json');
const TYPES_PATH = join(
  ROOT,
  'apps',
  'frontend',
  'src',
  'infrastructure',
  'api-client',
  'generated',
  'api-types.gen.ts',
);

function run(cmd) {
  execSync(cmd, { cwd: ROOT, stdio: 'inherit' });
}

function diffHint(name, fixCmd) {
  console.error(`\n✗ ${name} 存在契约漂移。`);
  console.error(`  修复：运行 ${fixCmd} 并将产物一并提交。`);
}

let failed = false;
const tmp = mkdtempSync(join(tmpdir(), 'apm-contract-'));
try {
  // 1. 后端 → openapi.json
  if (!readExists(OPENAPI_PATH)) {
    console.error('openapi.json 不存在，先运行 pnpm contract:export 生成并提交。');
    process.exit(1);
  }
  const tmpOpenapi = join(tmp, 'openapi.json');
  execSync('pnpm --filter ./apps/server run contract:export', {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, OPENAPI_OUT_PATH: tmpOpenapi },
  });
  if (readFileSync(OPENAPI_PATH, 'utf-8') !== readFileSync(tmpOpenapi, 'utf-8')) {
    diffHint('openapi.json（后端契约）', 'pnpm contract:export');
    failed = true;
  } else {
    console.log('openapi.json 与后端代码一致 ✓');
  }

  // 2. openapi.json → 前端生成类型
  if (!readExists(TYPES_PATH)) {
    console.error('前端生成类型缺失，先运行 pnpm contract:generate 生成并提交。');
    process.exit(1);
  }
  const tmpTypes = join(tmp, 'api-types.gen.ts');
  run(
    `pnpm exec openapi-typescript ${quote(tmpOpenapi)} -o ${quote(tmpTypes)} --quiet`,
  );
  if (readFileSync(TYPES_PATH, 'utf-8') !== readFileSync(tmpTypes, 'utf-8')) {
    diffHint('前端生成类型', 'pnpm contract:generate');
    failed = true;
  } else {
    console.log('api-types.gen.ts 与 openapi.json 一致 ✓');
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

if (failed) process.exit(1);
console.log('contract:check ✓ 契约零漂移');

function readExists(p) {
  try {
    readFileSync(p);
    return true;
  } catch {
    return false;
  }
}

function quote(p) {
  return process.platform === 'win32' ? `"${p}"` : `'${p}'`;
}
