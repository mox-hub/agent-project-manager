/**
 * 桌面端打包资源准备（CAP-A-14）——由 tauri build 的 beforeBuildCommand 自动触发，也可 `pnpm pack:resources` 单跑。
 *
 * 产出到 src-tauri/resources/（tauri.conf bundle.resources 打进安装包）：
 *   server/    自包含的 server 运行时（pnpm deploy --legacy 硬拷贝 node_modules + dist + prisma + 预生成客户端）
 *   frontend/  前端构建产物（server 静态托管用；webview 本体走 tauri 内嵌资源）
 *   bin/node.exe  Node 运行时（Rust 侧 resolve_node 消费）
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 全程非交互：pnpm 的任何确认提示（模块清理/锁定询问）在 CI 模式下都会走非交互分支，
// 否则 deploy 内部安装可能静默挂死等待输入
process.env.CI = '1';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(desktopRoot, '..', '..');
const resourcesDir = path.join(desktopRoot, 'src-tauri', 'resources');
const serverStaging = path.join(resourcesDir, 'server');
const frontendStaging = path.join(resourcesDir, 'frontend');
const binStaging = path.join(resourcesDir, 'bin');

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    ...opts,
  });
  if (r.status !== 0) {
    throw new Error(`[${cmd} ${args.join(' ')}] 失败（exit ${r.status}）`);
  }
}

// 1. 构建两端产物
run('pnpm', ['--filter', 'server', 'build'], { cwd: repoRoot });
run('pnpm', ['--filter', 'frontend', 'build'], { cwd: repoRoot });

// 2. 清理三个子目录。Windows 下新复制/执行过的 exe 与 Prisma 引擎 dll 会被 Defender 等短暂
//    持锁（实测数分钟级），删除须带长重试；目录被进程占为 CWD 但已是空时可容忍——
//    deploy 要求目标为空，非空时会自行报错。
const subdirs = ['bin', 'frontend', 'server'].map((s) => path.join(resourcesDir, s));
for (const p of subdirs) {
  try {
    rmSync(p, { recursive: true, force: true, maxRetries: 60, retryDelay: 1000 });
  } catch {
    const stale = existsSync(p) ? readdirSync(p) : [];
    if (stale.length > 0) {
      throw new Error(
        `无法清空 ${p}（残留 ${stale.length} 项，文件被占用）。` +
          '通常是杀毒软件仍在扫描上次产物或旧进程未退出，请稍后重试或手动删除。',
      );
    }
  }
}
mkdirSync(binStaging, { recursive: true });

// 3. server 自包含产物：pnpm deploy 产硬拷贝 node_modules（含 prisma CLI）；
//    dist 与部分运行时无关文件不随 deploy 进来/多余，逐一补拷与剥离
run('pnpm', ['--filter', 'server', 'deploy', '--prod', '--legacy', serverStaging], {
  cwd: repoRoot,
});
for (const junk of [
  'src',
  'test',
  'relative',
  '.husky',
  'eslint.config.mjs',
  'nest-cli.json',
  'tsconfig.build.json',
  'tsconfig.build.tsbuildinfo',
  'tsconfig.json',
  'vitest.config.e2e.ts',
  'vitest.config.ts',
  'README.md',
  'check-users.cjs',
  'workspaces.json',
]) {
  rmSync(path.join(serverStaging, junk), {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 500,
  });
}
const serverDist = path.join(repoRoot, 'apps', 'server', 'dist');
if (!existsSync(serverDist)) {
  throw new Error('server dist 不存在，nest build 疑似失败');
}
cpSync(serverDist, path.join(serverStaging, 'dist'), { recursive: true });

// 3b. 剥离 node_modules 中的非运行时文件：.d.ts/.map/.tsbuildinfo/.md 与 _types、examples 目录。
//     运行时零作用，且能规避 @mastra/core、@modelcontextprotocol/sdk 等包的超长文件路径——
//     Windows MAX_PATH(260) 会让 makensis 直接打不开这些文件导致打包失败
//     （实测 2026-09-11：mastra 的 .d.ts 262 字符、mcp sdk 的 examples js 257+ 均撞线）。
function stripNonRuntime(root) {
  const pruneDirs = [];
  const walk = (dir) => {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) {
        walk(p);
        if (e.name === '_types' || e.name === 'examples') pruneDirs.push(p);
      } else if (e.isFile() && /\.(d\.ts|map|tsbuildinfo|md)$/.test(e.name)) {
        rmSync(p, { force: true, maxRetries: 5, retryDelay: 200 });
      }
    }
  };
  walk(root);
  for (const d of pruneDirs) {
    rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
stripNonRuntime(path.join(serverStaging, 'node_modules'));

// 4. 预生成 Prisma 客户端（含 query engine dll），安装后免 generate
run(
  process.execPath,
  [
    path.join(serverStaging, 'node_modules', 'prisma', 'build', 'index.js'),
    'generate',
    '--schema',
    path.join(serverStaging, 'prisma', 'schema.prisma'),
  ],
  {
    env: { ...process.env, DATABASE_URL: 'file:./pack-placeholder.db' },
  },
);

// 5. Node 运行时 + 前端 dist
cpSync(process.execPath, path.join(binStaging, 'node.exe'));
cpSync(path.join(repoRoot, 'apps', 'frontend', 'dist'), frontendStaging, { recursive: true });

console.log(`[pack:resources] 桌面打包资源就绪：${resourcesDir}`);
