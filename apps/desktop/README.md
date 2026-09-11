# Agent Project Manager Desktop（Electron）

人类控制面的桌面壳：把 Web 前端与本地 NestJS 后端打包成一个 Windows 安装包（NSIS），非开发用户装上即用——首启自动建库，无需 Node/pnpm/git 开发环境。

对应能力卡：**CAP-A-14 桌面壳发布级打包与运作**（`docs/01-需求/能力清单-v1.md` §4.1）；壳选型变更（Tauri 2 → Electron）见决策日志 **ADR-014**；执行计划与验收清单见 `docs/roadmap/electron-desktop-v0.6.1-plan.md`。

> 过渡期说明：分支上 `src-tauri/`（Tauri 旧壳）与 `scripts/pack.mjs`（资源准备，两壳共享）暂时共存，Electron 通过同等验收后删除 Tauri 侧。

## 架构一览

```
┌─ Electron 主窗口（Chromium）────────────────┐
│  生产: loadURL(server) —— server 静态托管   │
│  前端并自带 SPA history fallback，api 同源   │
│  dev:   loadURL(vite 5173) —— HMR 开发体验  │
│  modules/desktop 引导链（前端零改动）：      │
│  invoke → get_app_info → setApiBaseUrl      │
│  → window.__DESKTOP_API_BASE_URL__ → api-client
└──────────────┬──────────────────────────────┘
               │ contextBridge: window.__TAURI__.core.invoke
               │（前端 electron-api.ts 声明的壳桥契约，非 Tauri 官方 API）
┌──────────────┴──────────────────────────────┐
│ Electron main（TS，electron/src/）          │
│  setup.ts   目录/密钥/Prisma db push         │
│  backend.ts 端口探测 4300-4399 + 健康检查    │
│  commands.ts 13 个 IPC 命令（对齐 Tauri 面） │
│  main.ts    编排 + 退出清理                  │
└──────────────┬──────────────────────────────┘
               │ 承载双路径（ADR-014 E① 实验定版）
               │ ① utilityProcess 内嵌 Node 跑 server dist（默认，省 ~75MB）
               │ ② spawn resources/bin/node.exe（自动降级兜底：
               │   utility 静默失败且零输出时重试一次）
┌──────────────┴──────────────────────────────┐
│ resources/server（自包含 NestJS 运行时：     │
│ dist + node_modules + prisma + 预生成客户端）│
│ resources/frontend + resources/bin/node.exe │
└─────────────────────────────────────────────┘
```

环境变量 `APM_SERVER_TRANSPORT=node` 可强制路径 ②（调试用）。

## 启动顺序契约（规定的初始化次序，main.ts 强制）

```
① 壳初始化（同步，毫秒级）
   解析路径 → 创建用户目录（%APPDATA%/agent-project-manager/{logs,uploads,data}）
   → 生成/加载 secrets.json 密钥（JWT_SECRET / INTEGRATION_ENCRYPTION_KEY）
② 数据库就绪（阻塞 ③）
   全新安装：Prisma db push 建库（ELECTRON_RUN_AS_NODE 跑 CLI）；已有库跳过，绝不重建
   失败 → initError 置位 → ③ 被前置拦截，前端 init 页可见错误
③ server 拉起（utilityProcess / spawn node.exe）
   env 注入：PORT、DATABASE_URL、JWT_SECRET、INTEGRATION_ENCRYPTION_KEY、
   FRONTEND_DIST_DIR、UPLOAD_DIR、WORKSPACE_REGISTRY_PATH（用户数据目录，
   防升级覆盖丢失）、ALLOWED_ORIGINS、PRISMA_CLIENT_ENGINE_TYPE、NODE_ENV、APP_MODE
   → /_api/health 轮询（30s/500ms）通过才算启动成功
④ 前端加载（依赖 ③ 健康通过）
   生产：loadURL(server) 同源托管（server 自带 SPA history fallback）
   dev：优先 vite 5173（HMR）
⑤ apm-runtime 守护进程（AI 执行面）——不在桌面版
   按四裁决点（不随包分发，v0.6.1）；server 在无 runtime 连接时健康降级，
   控制面功能完整、AI 执行能力不可用。并入桌面版需重新裁决（二期评估）。
```

退出（窗口关闭/before-quit）：杀全部托管子进程，server 无残留。

## 数据与文件布局

| 位置 | 内容 | 生成方 |
|------|------|--------|
| `%APPDATA%/agent-project-manager/data/agent-project-manager.db` | 主库（= default 工作区） | Prisma db push（首启） |
| `%APPDATA%/agent-project-manager/workspaces.json` | 工作区注册表（default + 用户工作区） | server 数据层（env 指向 userData） |
| `%APPDATA%/agent-project-manager/secrets.json` | JWT/集成加密密钥 | 壳首启生成 |
| `%APPDATA%/agent-project-manager/uploads/`、`logs/` | 上传文件、壳+server 日志 | 壳创建 |
| 用户工作区目录（创建工作区时指定） | `data/apm.db`（自 template.db 复制）+ `uploads/` + `logs/` + `workspace.json` | server（PRISMA 模板 = 随包 `resources/server/prisma/template.db`） |

工作区多库实测（安装版）：创建工作区 → 模板库复制 → 注册表登记 → `x-workspace-id` 头路由，全链路通过。

## 用户数据位置

`%APPDATA%\agent-project-manager\`（Electron 的 appData 语义为 Roaming）

| 路径 | 内容 |
|------|------|
| `data/agent-project-manager.db` | SQLite 主库（首启由 Prisma db push 创建；已存在则跳过，绝不带 `--accept-data-loss` 重建） |
| `secrets.json` | 首启随机生成并持久化的 `JWT_SECRET` / `INTEGRATION_ENCRYPTION_KEY`，跨重启复用 |
| `logs/desktop-main.log` | 壳与 server 运行日志（`open_log_dir` 命令可直接打开） |
| `uploads/` | 上传文件 |

Prisma CLI（db push）经 Electron 内置 Node（`ELECTRON_RUN_AS_NODE=1`）执行，不依赖系统或随包 node.exe。

## 开发调试

前置：Node 24、pnpm 11（Electron 二进制下载走镜像：`ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`）。

```bash
# 终端 1：仓库常规 dev（vite 5173；server 可选——壳会自己拉一个）
pnpm dev

# 终端 2：桌面壳（构建 main/preload 后启动 Electron）
cd apps/desktop
pnpm desktop:dev
```

- 壳自动拉起 server（端口探测 4300-4399）；vite 在跑则窗口加载 5173（HMR），否则加载 server 托管的前端。
- dev 冒烟工具：`electron . --remote-debugging-port=9222` 启动后 `node.exe scripts/smoke-ipc.mjs` 可自动断言渲染进程 IPC 契约（`scripts/cdp-invoke.mjs <command>` 可手动触发任意命令）。

## 构建与打包（开发者）

```bash
# 一键链：构建 server+frontend → 资源准备（npm 平铺装 prod 依赖 + 剥离非运行时文件 +
# Prisma 客户端预生成 + node.exe）→ tsup 构建 main/preload → electron-builder NSIS
cd apps/desktop
pnpm desktop:pack
# 产物：release/Agent Project Manager_0.6.1_x64-setup.exe
```

资源准备落位 `src-tauri/target/desktop-pack/`（两壳共享 staging；放 target 下避 Defender 文件锁）。注意：

- staging 的 `package.json` 刻意剥离 devDependencies——npm 解析阶段即校验全部依赖字段，devDeps 里的 pnpm `catalog:` 协议会让 `npm install` 直接 EUNSUPPORTEDPROTOCOL。
- 用 npm 平铺布局而非 pnpm deploy：`.pnpm` 双跳结构会给深层路径加 ~70 字符，`@nestjs`/`@mastra` 等包会顶爆 Windows MAX_PATH(260) 使 makensis 打不开文件（实测多处 257–262 字符撞线）。
- electron-builder 的工具链二进制（winCodeSign/nsis）下载走镜像：`ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/`。

静默冒烟（本机近似「干净机」验证）：

```bash
"release/Agent Project Manager_0.6.1_x64-setup.exe" /S   # 静默安装
# 启动安装后的 exe → 检查 %APPDATA%/agent-project-manager 建库 + health 200
```

## 已知边界（v0.6.1）

- 不含代码签名（SmartScreen 会提示「未知发布者」）、不含自动更新器。
- AI 执行面（apm-runtime 守护 + claude-code/codex CLI）不随包分发。
- 升级场景的 schema 演进（migrate deploy）未接入——首版安装只做全新建库。
- 关闭窗口即退出并杀掉全部托管子进程（server 无残留）。
