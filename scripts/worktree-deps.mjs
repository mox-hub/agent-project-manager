#!/usr/bin/env node
/**
 * worktree-deps.mjs —— worktree 依赖共享与漂移巡检
 *
 * 背景：本仓用 `.worktrees/*` 做多 Agent 并行开发。每个 worktree 若各自
 * `pnpm install`，在本机（store 与仓库同盘、且曾出现并发争用）会长时间无进展。
 * 因此约定：**worktree 不自己装依赖，而是把各包的 node_modules 目录软链到主仓**。
 *
 * 两条子命令：
 *   check   只读巡检：打印每个 worktree 的软链状态 + 与主仓的依赖声明漂移
 *   link    给缺失的 node_modules 建 junction（Windows 目录联接，无需管理员）
 *
 * 为什么软链可行：pnpm 的 `isolated` 布局里，包内 node_modules 下的链接都是
 * **相对路径**（如 `../../../node_modules/.pnpm/...`）。Windows 解析相对符号链接时
 * 以「访问路径」为基准，因此经由 worktree 自己的路径走进去，相对链接仍落回该
 * worktree 的根 node_modules —— 只要根 node_modules 也一并软链，整条链路自洽。
 *
 * 已知边界（check 会告警）：
 *   - 共享的前提是依赖声明一致。worktree 若改了 package.json / pnpm-lock.yaml，
 *     软链指向的仍是主仓那份，**必须在该 worktree 里独立安装**。
 *   - vitest 通过 `resolve.preserveSymlinks=false` 把模块解析成真实路径，工作区
 *     内部包（`@apm/shared` 等）请以各自的 alias 为准（前端 vitest.config.ts 已配）。
 *
 * 用法：
 *   node scripts/worktree-deps.mjs check               # 只读巡检
 *   node scripts/worktree-deps.mjs link                # 处理所有 worktree
 *   node scripts/worktree-deps.mjs link --path .worktrees/inbox
 *   node scripts/worktree-deps.mjs link --clean        # 顺带清掉半装残骸（破坏性）
 *
 * 三种「非软链」目录的处理口径：
 *   empty-dir       空目录            → 直接换成软链
 *   broken-install  半装残骸          → 默认跳过；--clean 才删（删的是 node_modules，
 *                     ─────────────     代码不受影响，但 HDD 上可能要几分钟）
 *   real-dir        实体安装（非空）  → 一律跳过，是否改共享由人决定
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

/** 需要从主仓软链到 worktree 的目录（与 .claude/settings.json 的 worktree.symlinkDirectories 保持一致） */
const SHARED_DIRS = [
  'node_modules',
  'apps/frontend/node_modules',
  'apps/server/node_modules',
  'apps/cli/node_modules',
  'apps/desktop/node_modules',
  'packages/apm-shared/node_modules',
];

/** 依赖声明文件：这些文件在两个树之间必须逐字节一致，共享依赖才成立 */
function lockFilesOf(root) {
  const files = ['pnpm-lock.yaml', 'pnpm-workspace.yaml'];
  for (const group of ['apps', 'packages']) {
    const dir = path.join(root, group);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      const pkg = path.join(dir, name, 'package.json');
      if (fs.existsSync(pkg)) files.push(path.relative(root, pkg).replace(/\\/g, '/'));
    }
  }
  return files;
}

function sha256(file) {
  try {
    return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  } catch {
    return null;
  }
}

function git(args, cwd) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

/** 解析 `git worktree list --porcelain`，返回 [{path, branch}]，顺序与 git 输出一致（首项是主仓） */
function listWorktrees() {
  const out = git(['worktree', 'list', '--porcelain'], process.cwd());
  const entries = [];
  let cur = null;
  for (const line of out.split(/\r?\n/)) {
    if (line.startsWith('worktree ')) {
      cur = { path: line.slice('worktree '.length).trim(), branch: null };
      entries.push(cur);
    } else if (line.startsWith('branch ') && cur) {
      cur.branch = line.slice('branch '.length).trim().replace(/^refs\/heads\//, '');
    } else if (line.startsWith('detached') && cur) {
      cur.branch = '(detached)';
    }
  }
  return entries;
}

/** 判断路径是否为重解析点（符号链接 / junction） */
function isLink(p) {
  try {
    return fs.lstatSync(p).isSymbolicLink();
  } catch {
    return false;
  }
}

/**
 * 判断是否为「半装残骸」：pnpm 一次**完整**安装必然写出 `.modules.yaml`，
 * 所以「有 `.pnpm/` 却没有 `.modules.yaml`」= linking 阶段被中断的中间态。
 * 这种目录看着像装好了（`.pnpm` 虚拟店是满的），实则顶层软链/.bin 全缺，
 * 依赖一个也解析不了——历史上「pnpm install 静默卡死」留下的就是它。
 */
function isBrokenInstall(p) {
  try {
    return fs.existsSync(path.join(p, '.pnpm')) && !fs.existsSync(path.join(p, '.modules.yaml'));
  } catch {
    return false;
  }
}

function describeLink(p, mainRoot) {
  if (!fs.existsSync(p) && !isLink(p)) return { state: 'missing' };
  if (!isLink(p)) {
    const count = fs.existsSync(p) ? fs.readdirSync(p).length : 0;
    if (count === 0) return { state: 'empty-dir' };
    if (isBrokenInstall(p)) return { state: 'broken-install', count };
    return { state: 'real-dir', count };
  }
  const resolved = path.resolve(path.dirname(p), fs.readlinkSync(p));
  return { state: 'link', target: resolved, pointsToMain: resolved.toLowerCase().startsWith(mainRoot.toLowerCase()) };
}

function driftReport(mainRoot, wtRoot) {
  const drift = [];
  for (const rel of lockFilesOf(mainRoot)) {
    const a = sha256(path.join(mainRoot, rel));
    const b = sha256(path.join(wtRoot, rel));
    if (a !== b) drift.push(rel + (b === null ? '（worktree 中缺失）' : '（内容不同）'));
  }
  return drift;
}

function cmdCheck() {
  const trees = listWorktrees();
  const mainRoot = trees[0].path;
  console.log(`主仓：${mainRoot}\n`);

  if (trees.length === 1) {
    console.log('除主仓外没有其它 worktree。');
    return;
  }

  let problems = 0;
  for (const wt of trees.slice(1)) {
    console.log(`── ${path.relative(mainRoot, wt.path) || wt.path}  [${wt.branch}]`);
    for (const dir of SHARED_DIRS) {
      const p = path.join(wt.path, dir);
      const info = describeLink(p, mainRoot);
      switch (info.state) {
        case 'missing':
          // 主仓里也没有的目录不必提示（例如未安装的包）
          if (fs.existsSync(path.join(mainRoot, dir))) {
            console.log(`   [缺失] ${dir}  → 跑 link 建立软链`);
            problems++;
          }
          break;
        case 'empty-dir':
          console.log(`   [空目录] ${dir}  → 跑 link 前请先删除该空目录`);
          problems++;
          break;
        case 'broken-install':
          console.log(
            `   [半装残骸 ${info.count} 项] ${dir}  → 有 .pnpm/ 但无 .modules.yaml（linking 被中断，依赖不可解析）；link --clean 可清理后建链`,
          );
          problems++;
          break;
        case 'real-dir':
          console.log(`   [实体目录 ${info.count} 项] ${dir}  → 该树是独立安装，与主仓不共享`);
          break;
        case 'link':
          console.log(`   [软链] ${dir} → ${info.pointsToMain ? '主仓' : info.target}`);
          break;
      }
    }

    const drift = driftReport(mainRoot, wt.path);
    if (drift.length) {
      console.log(`   [!!] 依赖声明与主仓不一致，共享的 node_modules 不适用于本树：`);
      for (const d of drift) console.log(`        - ${d}`);
      console.log(`        → 本树需独立安装：cd ${path.relative(mainRoot, wt.path)} && pnpm install`);
      problems++;
    }
    console.log('');
  }

  if (problems === 0) console.log('巡检通过：所有 worktree 均共享主仓依赖且无声明漂移。');
  else console.log(`巡检发现 ${problems} 处待处理项。`);
}

function cmdLink(argv) {
  const pathArgIdx = argv.indexOf('--path');
  const only = pathArgIdx >= 0 ? argv[pathArgIdx + 1] : null;
  // 删除半装残骸是破坏性操作，必须显式开关；且它可能很大，先提示耗时
  const clean = argv.includes('--clean');

  const trees = listWorktrees();
  const mainRoot = trees[0].path;
  const targets = trees.slice(1).filter((t) => !only || t.path.endsWith(path.normalize(only)));

  if (targets.length === 0) {
    console.log('没有匹配的 worktree。');
    return;
  }

  for (const wt of targets) {
    console.log(`── ${wt.path}  [${wt.branch}]`);

    const drift = driftReport(mainRoot, wt.path);
    if (drift.length) {
      console.log(`   [跳过] 依赖声明与主仓不一致（${drift.join('、')}）——该树必须独立 pnpm install`);
      continue;
    }

    for (const dir of SHARED_DIRS) {
      const src = path.join(mainRoot, dir);
      const dest = path.join(wt.path, dir);
      if (!fs.existsSync(src)) continue;

      if (isLink(dest)) {
        console.log(`   [已有] ${dir}`);
        continue;
      }
      if (fs.existsSync(dest)) {
        const entries = fs.readdirSync(dest);
        if (entries.length > 0) {
          if (!isBrokenInstall(dest)) {
            console.log(`   [跳过] ${dir} 是实体目录且非空（独立安装），如需共享请先手动删除`);
            continue;
          }
          if (!clean) {
            console.log(`   [跳过] ${dir} 是半装残骸（有 .pnpm/ 无 .modules.yaml）——加 --clean 可清理后建链`);
            continue;
          }
          console.log(`   [清理] ${dir} 半装残骸（${entries.length} 项，删除可能较慢）...`);
          fs.rmSync(dest, { recursive: true, force: true });
        } else {
          fs.rmdirSync(dest); // 空目录，清掉换成软链
        }
      }
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.symlinkSync(src, dest, 'junction');
      console.log(`   [建立] ${dir} → 主仓`);
    }
    console.log('');
  }
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case 'check':
    cmdCheck();
    break;
  case 'link':
    cmdLink(rest);
    break;
  default:
    console.log('用法：node scripts/worktree-deps.mjs <check|link> [--path <worktree>] [--clean]');
    process.exit(cmd ? 1 : 0);
}
