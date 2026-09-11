/**
 * 桌面端打包资源准备（CAP-A-14）——由 tauri build 的 beforeBuildCommand 自动触发，也可 `pnpm pack:resources` 单跑。
 *
 * 产出到 src-tauri/target/desktop-pack/（tauri.conf bundle.resources 打进安装包）：
 *   server/    自包含的 server 运行时（npm 平铺 node_modules + dist + prisma + 预生成客户端）
 *   frontend/  前端构建产物（server 静态托管用；webview 本体走 tauri 内嵌资源）
 *   bin/node.exe  Node 运行时（Rust 侧 resolve_node 消费）
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

// 5. Node 运行时 + 前端 dist
cpSync(process.execPath, path.join(binStaging, 'node.exe'));
cpSync(path.join(repoRoot, 'apps', 'frontend', 'dist'), frontendStaging, { recursive: true });

console.log(`[pack:resources] 桌面打包资源就绪：${packRoot}`);
