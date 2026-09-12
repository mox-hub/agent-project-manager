/**
 * 桌面端打包资源准备（CAP-A-14）——`pnpm desktop:pack` / `pnpm pack:resources` 触发。
 *
 * 产出到 src-tauri/target/desktop-pack/（electron-builder extraResources 原样拷进安装包 resources/）：
 *   server/    自包含的 server 运行时（npm 平铺 node_modules + dist + prisma + 预生成客户端）
 *   frontend/  前端构建产物（server 静态托管用）
 *   cli/       apm-runtime 守护进程自包含运行时（@apm/shared 以 file: 引用随装；壳自动拉起）
 *   bin/node.exe  Node 运行时（server 承载路径 A 降级兜底用）
 *
 * 路径刻意放在 target/ 下（而非 src-tauri/resources/）：target 本就是构建产物区，
 * 且全新的稳定路径可避开历史产物上残留的文件锁（实测 Defender 扫描/进程 CWD 会锁住
 * 旧目录数分钟到数小时不等，删除重试无法根治，换新路径即绕开）。
 */
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// 全程非交互：pnpm 的任何确认提示（模块清理/锁定询问）在 CI 模式下都会走非交互分支，
// 否则 deploy 内部安装可能静默挂死等待输入
process.env.CI = '1';

const desktopRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(desktopRoot, '..', '..');
const packRoot = path.join(desktopRoot, 'src-tauri', 'target', 'desktop-pack');
const serverStaging = path.join(packRoot, 'server');
const frontendStaging = path.join(packRoot, 'frontend');
const binStaging = path.join(packRoot, 'bin');

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

// 2. 清空打包区（构建产物路径，正常无遗留锁；保留长重试兜底）
try {
  rmSync(packRoot, { recursive: true, force: true, maxRetries: 10, retryDelay: 1000 });
} catch {
  throw new Error(`无法清空 ${packRoot}，请手动删除后重试。`);
}
mkdirSync(binStaging, { recursive: true });

// 3. server 自包含产物。**刻意用 npm 平铺布局而非 pnpm deploy**：pnpm 的
//    node_modules/.pnpm/<pkg>@ver_hash/node_modules/<pkg> 双跳结构给每条路径加 ~70 字符，
//    @nestjs/@mastra 等包的深层 interface.js 会直接顶爆 Windows MAX_PATH(260) 让 makensis
//    打不开文件（实测 2026-09-11 多处 257~262 字符撞线）；npm 平铺一次性缩短整棵树。
//    从源头的 dist/prisma/package.json 装起——npm 只认 package.json，开发区的 .env 等
//    敏感文件从根上就不会进安装包。
const serverSrc = path.join(repoRoot, 'apps', 'server');
const serverDist = path.join(serverSrc, 'dist');
if (!existsSync(serverDist)) {
  throw new Error('server dist 不存在，nest build 疑似失败');
}
cpSync(serverDist, path.join(serverStaging, 'dist'), { recursive: true });
cpSync(path.join(serverSrc, 'prisma'), path.join(serverStaging, 'prisma'), { recursive: true });
// i18n 翻译 JSON 是运行时资产：nestjs-i18n 按 cwd 相对的 src/i18n/resources 解析（dev 语义硬编码），
// staging 必须保持同形状目录，否则 server Bootstrap failed: i18n path cannot be found（安装冒烟实测踩坑）
cpSync(path.join(serverSrc, 'src', 'i18n'), path.join(serverStaging, 'src', 'i18n'), {
  recursive: true,
});
// staging 的 package.json 只留 prod 依赖：npm 在解析阶段就会校验全部依赖字段，
// devDependencies 里的 pnpm catalog: 协议会让 install 直接 EUNSUPPORTEDPROTOCOL
// （prod 依赖均为具体版本、无 workspace:/catalog: 引用，可安全裸装）
const serverPkg = JSON.parse(readFileSync(path.join(serverSrc, 'package.json'), 'utf-8'));
writeFileSync(
  path.join(serverStaging, 'package.json'),
  JSON.stringify(
    {
      name: serverPkg.name,
      version: serverPkg.version,
      private: true,
      dependencies: serverPkg.dependencies,
    },
    null,
    2,
  ),
);
run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--legacy-peer-deps', '--loglevel=error'], {
  cwd: serverStaging,
});

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

// 3c. apm-runtime 守护进程（apps/cli）自包含产物——AI 执行面随包（壳自动拉起 + 设置页可控制）。
//     @apm/shared 是 workspace 包，npm 无法解析 workspace: 协议——随 staging 以 file: 引用自带
//     （shared 的 axios/zod 由 npm 一并解析安装），与 server staging 同一套「剥 devDeps 再裸装」模式。
run('pnpm', ['--filter', '@apm/cli', 'build'], { cwd: repoRoot });
const cliSrc = path.join(repoRoot, 'apps', 'cli');
const cliStaging = path.join(packRoot, 'cli');
const sharedSrc = path.join(repoRoot, 'packages', 'apm-shared');
if (!existsSync(path.join(cliSrc, 'dist', 'runtime', 'index.js'))) {
  throw new Error('cli dist/runtime/index.js 不存在，@apm/cli build 疑似失败');
}
if (!existsSync(path.join(sharedSrc, 'dist', 'index.js'))) {
  throw new Error('shared dist/index.js 不存在，@apm/shared build 疑似失败');
}
cpSync(path.join(cliSrc, 'dist'), path.join(cliStaging, 'dist'), { recursive: true });
cpSync(path.join(sharedSrc, 'dist'), path.join(cliStaging, 'shared', 'dist'), { recursive: true });
const cliPkg = JSON.parse(readFileSync(path.join(cliSrc, 'package.json'), 'utf-8'));
const sharedPkg = JSON.parse(readFileSync(path.join(sharedSrc, 'package.json'), 'utf-8'));
// shared staging 的 package.json 保留 prod dependencies（axios/zod），剥掉 private 之外的 dev 字段
writeFileSync(
  path.join(cliStaging, 'shared', 'package.json'),
  JSON.stringify(
    {
      name: sharedPkg.name,
      version: sharedPkg.version,
      main: sharedPkg.main,
      types: sharedPkg.types,
      dependencies: sharedPkg.dependencies,
    },
    null,
    2,
  ),
);
writeFileSync(
  path.join(cliStaging, 'package.json'),
  JSON.stringify(
    {
      name: cliPkg.name,
      version: cliPkg.version,
      private: true,
      dependencies: {
        '@apm/shared': 'file:./shared',
        commander: cliPkg.dependencies.commander,
        'socket.io-client': cliPkg.dependencies['socket.io-client'],
      },
    },
    null,
    2,
  ),
);
run('npm', ['install', '--omit=dev', '--no-audit', '--no-fund', '--legacy-peer-deps', '--loglevel=error'], {
  cwd: cliStaging,
});

// 5. Node 运行时 + 前端 dist
cpSync(process.execPath, path.join(binStaging, 'node.exe'));
cpSync(path.join(repoRoot, 'apps', 'frontend', 'dist'), frontendStaging, { recursive: true });

console.log(`[pack:resources] 桌面打包资源就绪：${packRoot}`);
