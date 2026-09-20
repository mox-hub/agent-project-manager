#!/usr/bin/env node
/**
 * gate.mjs —— 受影响范围的质量门禁（PR 默认路径）
 *
 * 背景：`pnpm quality:gate` 是串行全量（type-check → lint → 全量单测 → contract →
 * server e2e → api:audit → docs-sync）。全量口径保留给 pre-prod / 夜间，
 * PR 只跑「被本次改动影响到的部分」。
 *
 * 设计原则：**宁可慢，不可漏**——任何映射不确定的情况一律回退到全量，而不是跳过。
 *
 * 用法：
 *   node scripts/gate.mjs                 # 相对于 origin/develop 的改动
 *   node scripts/gate.mjs --base origin/main
 *   node scripts/gate.mjs --full          # 全量（等价 pnpm quality:gate）
 *   node scripts/gate.mjs --dry           # 只打印将要执行什么
 */
import { execFileSync, spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const full = args.includes('--full');
const baseArgIdx = args.indexOf('--base');
const explicitBase = baseArgIdx >= 0 ? args[baseArgIdx + 1] : null;

const ROOT = process.cwd();

function sh(cmd, cmdArgs = [], opts = {}) {
  return execFileSync(cmd, cmdArgs, { cwd: ROOT, encoding: 'utf8', ...opts }).trim();
}

function gitLines(gitArgs) {
  try {
    const out = sh('git', gitArgs);
    return out ? out.split(/\r?\n/).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** 依次尝试，取第一个存在的 ref */
function resolveBase() {
  if (explicitBase) return explicitBase;
  if (process.env.GATE_BASE) return process.env.GATE_BASE;
  const candidates = ['origin/develop', 'develop', 'origin/main', 'main', 'HEAD~1'];
  for (const c of candidates) {
    try {
      sh('git', ['rev-parse', '--verify', '--quiet', c]);
      return c;
    } catch {
      /* 试下一个 */
    }
  }
  return null;
}

function changedFiles(base) {
  const set = new Set();
  if (base) {
    // 已提交的改动（相对 base）——用三点，取分叉点之后的改动
    for (const f of gitLines(['diff', '--name-only', '--diff-filter=ACMR', `${base}...HEAD`])) set.add(f);
  }
  // 工作区未提交的改动（本地 gate:quick 主要在跑这个）
  for (const line of gitLines(['status', '--porcelain'])) {
    const p = line.slice(3).trim();
    if (!p) continue;
    const arrow = p.indexOf(' -> ');
    set.add(arrow >= 0 ? p.slice(arrow + 4) : p);
  }
  return [...set].filter((f) => !f.startsWith('.worktrees/'));
}

const BUCKETS = {
  frontend: (f) => f.startsWith('apps/frontend/'),
  server: (f) => f.startsWith('apps/server/'),
  cli: (f) => f.startsWith('apps/cli/'),
  shared: (f) => f.startsWith('packages/apm-shared/'),
  contract: (f) =>
    f === 'openapi.json' || f.startsWith('apps/server/src/') || f.startsWith('packages/apm-shared/src/'),
  docs: (f) => f.startsWith('docs/') || f === 'AGENTS.md' || f === 'README.md' || f === 'CHANGELOG.md',
  // 构建/工具链改动会影响所有包：直接回退全量
  global: (f) =>
    /^(package\.json|pnpm-workspace\.yaml|pnpm-lock\.yaml|turbo\.json|tsconfig.*\.json|scripts\/)/.test(f),
};

/**
 * 把 server 源码改动映射到 e2e 套件。
 * 规则：改到 `src/modules/<m>/**` → 找文件名或内容里提到该模块的 e2e 套件。
 * 只要出现「非 modules 下的 src 改动」「test/helpers 改动」「改动没匹配到任何套件」
 * 三种情况之一，就回退跑全量 e2e（宁可慢，不可漏）。
 */
function affectedE2e(changed) {
  const serverChanges = changed.filter((f) => f.startsWith('apps/server/'));
  if (serverChanges.length === 0) return { skip: true, reason: 'server 无改动' };

  const risky = serverChanges.filter(
    (f) =>
      f.startsWith('apps/server/test/') ||
      f.startsWith('apps/server/prisma/') ||
      (f.startsWith('apps/server/src/') && !f.startsWith('apps/server/src/modules/')),
  );
  if (risky.length) return { all: true, reason: `命中高风险路径（${risky[0]}）` };

  const modules = new Set();
  for (const f of serverChanges) {
    const m = /^apps\/server\/src\/modules\/([^/]+)\//.exec(f);
    if (m) modules.add(m[1]);
  }
  if (modules.size === 0) return { all: true, reason: '无法解析出模块名' };

  const SPEC_DIR = 'apps/server/test/';
  const specs = gitLines(['ls-files', `${SPEC_DIR}*.e2e-spec.ts`]).map((p) => p.replace(/\\/g, '/'));
  const matched = specs.filter((spec) => {
    const name = spec.slice(SPEC_DIR.length);
    if ([...modules].some((m) => name.includes(m))) return true;
    let content = '';
    try {
      content = sh('git', ['show', `HEAD:${spec}`]);
    } catch {
      return false;
    }
    return [...modules].some((m) => content.includes(`/modules/${m}`) || content.includes(`modules/${m}'`));
  });

  if (matched.length === 0) return { all: true, reason: '改动未匹配到任何 e2e 套件' };
  // 传给 vitest 的是位置参数（文件名过滤器），用不带后缀的套件名即可
  return { specs: matched.map((s) => s.slice(SPEC_DIR.length).replace(/\.e2e-spec\.ts$/, '')) };
}

function run(label, cmd, cmdArgs) {
  console.log(`\n\x1b[36m▶ ${label}\x1b[0m\n  $ ${cmd} ${cmdArgs.join(' ')}`);
  if (dry) return true;
  const r = spawnSync(cmd, cmdArgs, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
  if (r.status !== 0) {
    console.log(`\n\x1b[31m✗ ${label} 失败（退出码 ${r.status}）\x1b[0m`);
    return false;
  }
  return true;
}

function main() {
  const base = resolveBase();

  // CI 用：只输出本 PR 需要跑的 e2e 套件名（空格分隔）；需要全量时输出 ALL
  if (args.includes('--e2e-specs')) {
    const r = affectedE2e(changedFiles(base));
    if (r.skip) process.stdout.write('NONE\n');
    else if (r.all) process.stdout.write('ALL\n');
    else process.stdout.write(r.specs.join(' ') + '\n');
    return 0;
  }

  if (full) {
    console.log('全量门禁：转交 pnpm quality:gate');
    return run('quality:gate', 'pnpm', ['quality:gate']) ? 0 : 1;
  }

  const changed = changedFiles(base);
  console.log(`基线：${base ?? '(无法解析，退化为仅工作区改动)'}`);
  console.log(`改动文件 ${changed.length} 个`);

  if (changed.length === 0) {
    console.log('没有检测到改动，什么都不跑。');
    return 0;
  }

  const hit = Object.fromEntries(
    Object.entries(BUCKETS).map(([k, fn]) => [k, changed.filter(fn).length > 0]),
  );
  const forceFull = hit.global;
  console.log('命中范围：', Object.entries(hit).filter(([, v]) => v).map(([k]) => k).join(' / ') || '(无)');
  if (forceFull) console.log('⚠ 改动触及构建/工具链，本次按全量跑');

  const filter = `...[${base ?? 'HEAD~1'}]`;
  const steps = [];

  // 1. 类型与 lint：走 turbo 受影响过滤（含依赖方）
  steps.push(['type-check（受影响包）', 'pnpm', ['exec', 'turbo', 'run', 'type-check', `--filter=${filter}`]]);
  steps.push(['lint（受影响包）', 'pnpm', ['exec', 'turbo', 'run', 'lint', `--filter=${filter}`]]);

  // 2. 单测：按包分派，vitest 用 --changed 精确到文件
  const e2e = affectedE2e(changed);

  if (forceFull) {
    steps.push(['全量单测', 'pnpm', ['exec', 'turbo', 'run', 'test']]);
  } else {
    if (hit.frontend)
      steps.push(['前端单测（受影响文件）', 'pnpm', ['--filter', './apps/frontend', 'exec', 'vitest', 'run', '--changed', base]]);
    if (hit.server)
      steps.push(['server 单测（受影响文件）', 'pnpm', ['--filter', './apps/server', 'exec', 'vitest', 'run', '--changed', base]]);
    if (hit.cli) steps.push(['cli 单测', 'pnpm', ['--filter', './apps/cli', 'run', 'test']]);
    if (hit.shared) steps.push(['apm-shared 单测', 'pnpm', ['--filter', './packages/apm-shared', 'run', 'test']]);
  }

  // 3. server e2e
  if (!forceFull) {
    if (e2e.skip) {
      console.log(`\n跳过 server e2e：${e2e.reason}`);
    } else if (e2e.all) {
      console.log(`\nserver e2e 走全量：${e2e.reason}`);
      steps.push(['server e2e（全量）', 'pnpm', ['--filter', './apps/server', 'run', 'test:e2e']]);
    } else {
      console.log(`\nserver e2e 只跑受影响套件：${e2e.specs.join(', ')}`);
      steps.push([
        'server e2e（受影响套件）',
        'pnpm',
        ['--filter', './apps/server', 'run', 'test:e2e', '--', ...e2e.specs],
      ]);
    }
  } else {
    steps.push(['server e2e（全量）', 'pnpm', ['--filter', './apps/server', 'run', 'test:e2e']]);
  }

  // 4. 契约与文档
  if (forceFull || hit.contract) steps.push(['API 契约零漂移', 'pnpm', ['contract:check']]);
  if (forceFull || hit.docs) steps.push(['文档同步', 'pnpm', ['check:docs-sync']]);
  if (forceFull || hit.contract) steps.push(['API 覆盖率', 'pnpm', ['api:audit', '--min=95']]);

  console.log('\n计划执行：');
  steps.forEach(([label], i) => console.log(`  ${i + 1}. ${label}`));

  for (const [label, cmd, cmdArgs] of steps) {
    if (!run(label, cmd, cmdArgs)) return 1;
  }
  console.log('\n\x1b[32m✓ gate:quick 全部通过\x1b[0m');
  return 0;
}

process.exit(main());
