/**
 * 桌面端打包资源准备（CAP-A-14）——`pnpm desktop:pack` / `pnpm pack:resources` 触发。
 *
 * 产出到 build/desktop-pack/（electron-builder extraResources 原样拷进安装包 resources/）：
 *   server/    自包含的 server 运行时（npm 平铺 node_modules + dist + prisma + 预生成客户端）
 *   frontend/  前端构建产物（server 静态托管用）
 *   cli/       ordo-runtime 守护进程自包含运行时（@ordo/shared 以 file: 引用随装；壳自动拉起）
 *   bin/node.exe  Node 运行时（server 承载路径 A 降级兜底用）
 *
 * 路径放在 build/desktop-pack/（构建产物区，gitignore；旧 Tauri 壳时代曾落在
 * src-tauri/target/ 下，ADR-014 定版 Electron 后迁出）：独立稳定路径可避开历史产物上
 * 残留的文件锁（实测 Defender 扫描/进程 CWD 会锁住旧目录数分钟到数小时不等，
 * 删除重试无法根治，换新路径即绕开）。
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
const packRoot = path.join(desktopRoot, 'build', 'desktop-pack');
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
// prisma 目录白名单拷贝：整目录拷会把开发者的 dev.db/dev.db-wal/*.bak 连数据带进安装包
// （实测 22MB，2026-09-12 发现——既是体积浪费更是数据泄露）。运行时资产只这三样：
// schema、migrations（未来 migrate deploy）、template.db（工作区多库模板）。
// default-template.db（默认库模板）由下方 4b 步生成。
for (const name of ['schema.prisma', 'migrations', 'template.db']) {
  const from = path.join(serverSrc, 'prisma', name);
  if (existsSync(from)) {
    cpSync(from, path.join(serverStaging, 'prisma', name), { recursive: true });
  }
}
// i18n 翻译 JSON 是运行时资产：nestjs-i18n 按 cwd 相对的 src/i18n/resources 解析（dev 语义硬编码），
// staging 必须保持同形状目录，否则 server Bootstrap failed: i18n path cannot be found（安装冒烟实测踩坑）
cpSync(path.join(serverSrc, 'src', 'i18n'), path.join(serverStaging, 'src', 'i18n'), {
  recursive: true,
});
// staging 的 package.json 只留 prod 依赖：npm 在解析阶段就会校验全部依赖字段，
// devDependencies 里的 pnpm catalog: 协议会让 install 直接 EUNSUPPORTEDPROTOCOL
// （prod 依赖均为具体版本、无 workspace:/catalog: 引用，可安全裸装）
// prisma CLI 剪除（ADR-015 瘦身，2026-09-12 验证）：它只服务打包机的 db push/generate；
// 用户机建库改为恢复 default-template.db 模板（壳侧 setup.ts）。剪除后实测 server
// 启动 + 健康检查 + 真实查询全部正常（运行时依赖 = @prisma/client + .prisma/client）
const serverPkg = JSON.parse(readFileSync(path.join(serverSrc, 'package.json'), 'utf-8'));
const serverProdDeps = { ...serverPkg.dependencies };
delete serverProdDeps.prisma;
writeFileSync(
  path.join(serverStaging, 'package.json'),
  JSON.stringify(
    {
      name: serverPkg.name,
      version: serverPkg.version,
      private: true,
      dependencies: serverProdDeps,
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
// 注意：strip 在 4c（prisma generate/剪除）之后执行——generate 会生成 .prisma/client
// （含 8MB index.d.ts），strip 必须覆盖其产物

// 4. 预生成 Prisma 客户端（含 query engine dll），安装后免 generate。
//    CLI 用开发区的（staging 已剪 prisma 依赖不再安装）；generate/db push 的输出
//    位置由 --schema 路径决定（staging/node_modules/.prisma），与 CLI 所在无关
const prismaCli = path.join(repoRoot, 'apps', 'server', 'node_modules', 'prisma', 'build', 'index.js');
const prismaSchema = path.join(serverStaging, 'prisma', 'schema.prisma');
if (!existsSync(prismaCli)) {
  throw new Error(`未找到开发区 Prisma CLI: ${prismaCli}（先在 apps/server 跑 pnpm install）`);
}
run(
  process.execPath,
  [prismaCli, 'generate', '--schema', prismaSchema],
  {
    env: { ...process.env, DATABASE_URL: 'file:./pack-placeholder.db' },
  },
);

// 4b. 生成干净默认库模板（file: 路径相对 schema 目录解析）：用户机首启直接拷贝，
//     免现场 db push（实测 ~40s）——与 CLI 剪除配套，见 4c
//     ⚠️ 记账坑（CAP-A-14 实证 2026-09-30）：db push 生成的模板 schema 最新但
//     `_prisma_migrations` 记账为空。不能改用 migrate deploy 生成——迁移历史含
//     重复建表（20260320 与 20260718_init 均建 ExecutionRun），空库重放 P3018。
//     模板派生用户库由 server 侧迁移执行器（schema-migrator.ts）按「记账空 +
//     业务表存在 → baseline」消化，本步骤维持 db push 不动。
run(
  process.execPath,
  [prismaCli, 'db', 'push', '--schema', prismaSchema, '--skip-generate'],
  {
    env: { ...process.env, DATABASE_URL: 'file:./default-template.db' },
  },
);

// 4c. 剪除 Prisma CLI（~58MB）与引擎仓库（~77MB）：generate/db push 只在打包机跑，
//     运行时唯一引擎是 .prisma/client 内的 query engine dll。剪后 node_modules
//     437MB → 303MB（实测 2026-09-12）
rmSync(path.join(serverStaging, 'node_modules', 'prisma'), {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 200,
});
rmSync(path.join(serverStaging, 'node_modules', '@prisma', 'engines'), {
  recursive: true,
  force: true,
  maxRetries: 5,
  retryDelay: 200,
});

// 4d. 非运行时文件剥离（.d.ts/.map/.md/_types/examples）——覆盖含 prisma generate 产物
stripNonRuntime(path.join(serverStaging, 'node_modules'));

// 3c. ordo-runtime 守护进程（apps/cli）自包含产物——AI 执行面随包（壳自动拉起 + 设置页可控制）。
//     @ordo/shared 是 workspace 包，npm 无法解析 workspace: 协议——随 staging 以 file: 引用自带
//     （shared 的 axios/zod 由 npm 一并解析安装），与 server staging 同一套「剥 devDeps 再裸装」模式。
run('pnpm', ['--filter', '@ordo/cli', 'build'], { cwd: repoRoot });
const cliSrc = path.join(repoRoot, 'apps', 'cli');
const cliStaging = path.join(packRoot, 'cli');
const sharedSrc = path.join(repoRoot, 'packages', 'ordo-shared');
if (!existsSync(path.join(cliSrc, 'dist', 'runtime', 'index.js'))) {
  throw new Error('cli dist/runtime/index.js 不存在，@ordo/cli build 疑似失败');
}
if (!existsSync(path.join(sharedSrc, 'dist', 'index.js'))) {
  throw new Error('shared dist/index.js 不存在，@ordo/shared build 疑似失败');
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
        '@ordo/shared': 'file:./shared',
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

// 6. 环境自足随包（CAP-A-30，2026-10-17）：MinGit + npm 运行时——用户机 git 能力
//    （仓库绑定/worktree/文档 git）与 AI CLI 按需安装不再要求预装。MinGit 是
//    git-for-windows 官方嵌入发行版（无 GUI/bash 菜单，git 核心全量）；npm 取自
//    打包机 node 安装自带树（与 node.exe 同源版本配套）。壳侧把 resources/git/cmd
//    与 resources/bin 前插派发链 PATH，并注入 ORDO_BUNDLED_NODE/ORDO_BUNDLED_NPM_CLI。
//    下载缓存到 build/pack-cache/（gitignored 构建产物区），ORDO_PACK_GIT_URL 可指向镜像。
const MINGIT_VERSION = '2.47.1';
const MINGIT_DEFAULT_URL = `https://github.com/git-for-windows/git/releases/download/v${MINGIT_VERSION}.windows.1/MinGit-${MINGIT_VERSION}-64-bit.zip`;
const packCacheDir = path.join(desktopRoot, 'build', 'pack-cache');
mkdirSync(packCacheDir, { recursive: true });
const gitZipPath = path.join(packCacheDir, `MinGit-${MINGIT_VERSION}-64-bit.zip`);
if (!existsSync(gitZipPath)) {
  const url = process.env.ORDO_PACK_GIT_URL ?? MINGIT_DEFAULT_URL;
  console.log(`[pack:resources] 下载 MinGit ${MINGIT_VERSION}: ${url}`);
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`MinGit 下载失败 HTTP ${res.status}（可用 ORDO_PACK_GIT_URL 指向镜像）`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(gitZipPath, buf);
}
const gitStaging = path.join(packRoot, 'git');
mkdirSync(gitStaging, { recursive: true });
// 解压走 PowerShell Expand-Archive（win 全版本内置）：PATH 里的 GNU tar 会把
// `D:\...` 当远程主机（"Cannot connect to D: resolve failed"，2026-10-17 实证），
// bsdtar 虽无此问题但本地/CI 的 tar 解析不可控，PowerShell 是唯一确定性解。
// Defender 对新解压目录的扫描锁由 extraResources 拷贝阶段的重试兜底
run(
  'powershell',
  [
    '-NoProfile',
    '-Command',
    `Expand-Archive -LiteralPath '${gitZipPath}' -DestinationPath '${gitStaging}' -Force`,
  ],
);
if (!existsSync(path.join(gitStaging, 'cmd', 'git.exe'))) {
  throw new Error(`MinGit 解压产物异常：${gitStaging}\\cmd\\git.exe 不存在`);
}

// 6b. npm 运行时 staging（随包 node.exe 配套，供 AI CLI 按需安装；~15MB）
const nodeDir = path.dirname(process.execPath);
const npmSrc = path.join(nodeDir, 'node_modules', 'npm');
if (!existsSync(path.join(npmSrc, 'bin', 'npm-cli.js'))) {
  throw new Error(
    `未找到 npm 运行时树: ${npmSrc}（打包机 node 安装需自带 npm；nvm/绿色版 node 缺 npm 时请换完整安装）`,
  );
}
cpSync(npmSrc, path.join(binStaging, 'npm'), {
  recursive: true,
  filter: (src) => {
    const rel = path.relative(npmSrc, src);
    // 剥文档与测试：npm 树 ~50% 体积是 .md/.map/test，运行时零作用
    return !/(^|[\\/])(test|tests)([\\/]|$)/.test(rel) && !/\.(md|map)$/.test(rel);
  },
});
if (!existsSync(path.join(binStaging, 'npm', 'bin', 'npm-cli.js'))) {
  throw new Error('npm staging 产物异常：bin/npm-cli.js 不存在');
}

console.log(`[pack:resources] 桌面打包资源就绪：${packRoot}`);
