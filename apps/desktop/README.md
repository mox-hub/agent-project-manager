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
│  setup.ts   目录/密钥(safeStorage)/db push  │
│  backend.ts 端口探测 4300-4399 + 健康检查    │
│  commands.ts IPC 命令面（29 个）             │
│  tray.ts    托盘常驻 + 关窗语义             │
│  updater.ts 自动更新（electron-updater）     │
│  diagnostics.ts 诊断包导出                  │
│  main.ts    编排 + 退出清理                 │
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
   旧版数据迁移（%APPDATA% → ~/.apm，仅 v0.6.1 升级触发）→ 创建用户目录
   （~/.apm/{logs,uploads,data,desktop}）→ 首装校验（无既有密钥/库 = 全新安装）
   → 生成/加载 secrets.json 密钥（JWT_SECRET / INTEGRATION_ENCRYPTION_KEY）
② 数据库就绪（阻塞 ③）
   全新安装：恢复随包 default-template.db（打包时 db push 生成的干净库，秒级拷贝）；
   已有库跳过，绝不重建。dev 无模板时回退 prisma db push（ELECTRON_RUN_AS_NODE 跑 CLI）
   失败 → initError 置位 → ③ 被前置拦截，前端 init 页可见错误
③ server 拉起（utilityProcess / spawn node.exe）
   env 注入：PORT、DATABASE_URL、JWT_SECRET、INTEGRATION_ENCRYPTION_KEY、
   FRONTEND_DIST_DIR、UPLOAD_DIR、WORKSPACE_REGISTRY_PATH（用户数据目录，
   防升级覆盖丢失）、ALLOWED_ORIGINS、PRISMA_CLIENT_ENGINE_TYPE、NODE_ENV、APP_MODE
   → /_api/health 轮询（30s/500ms）通过才算启动成功
④ 前端加载（依赖 ③ 健康通过）
   生产：loadURL(server) 同源托管（server 自带 SPA history fallback）
   dev：优先 vite 5173（HMR）
⑤ apm-runtime 守护进程（AI 执行面）
   随包分发并由壳在 server 健康后自动拉起（设置页可手动启停）；配置与单实例锁
   在 ~/.apm/desktop/ 子目录（与手动 CLI 的 ~/.apm/runtime.lock 隔离）。
```

退出（窗口关闭/before-quit）：杀全部托管子进程，server 无残留。

## 生命周期与分发契约（ADR-015）

| 机制 | 行为 |
|------|------|
| 单实例锁 | `requestSingleInstanceLock`，双开时第二实例退出并唤起既有窗口（防两套 server 抢 `~/.apm`） |
| 崩溃自愈 | server 意外退出自动重启、daemon 意外退出自动重拉（指数退避 1s→30s，连续 5 次熔断）；渲染进程崩溃白屏重载（60s 内 ≥3 次熔断）；主进程异常记日志不弹崩溃框 |
| 托盘常驻 | 关窗默认最小化到托盘（`close_to_tray` 偏好，设置页可关）；托盘菜单：显示主窗口/检查更新/退出 |
| 窗口状态 | 位置尺寸（正常态 bounds）持久化到 desktop-state.json，下次启动恢复 |
| 自动更新 | electron-updater + GitHub Releases feed；启动 30s 后静默检查、手动检查、下载完成询问安装、退出自动安装；dev 恒禁用；发布端 CI 接线待办 |
| 密钥安全 | secrets.json 经 safeStorage（Windows DPAPI）加密；旧明文兼容；跨机器解密失败报错不重生成（防登录态/集成密文连锁失效） |
| 卸载语义 | 卸载器询问是否删除 `~/.apm`（默认保留） |
| 诊断导出 | `export_diagnostics`：日志 + 元数据 + 进程快照 zip（不含密钥/凭证） |
| 壳级 e2e | `pnpm e2e:shell`（Playwright _electron，`APM_DATA_DIR` 临时目录隔离） |
| 应用菜单 | Alt 唤出：关于/检查更新/重载/缩放/DevTools/日志目录（`menu.ts`） |
| 日志轮转 | desktop-main.log 超 5MB 轮转 `.1/.2/.3`（保留 3 份） |
| 优雅关闭 | utility 路径先 postMessage `apm:shutdown`（server/cli 经 parentPort 桥到 shutdown 钩子收尾），3s 宽限后强杀；node 路径无 IPC 通道直接强杀 |
| 电源事件 | 系统唤醒探活失败自动重启服务组；会话结束（注销/关机）兜底清理子进程 |
| 系统通知 | `notification.created` 桌面模式转发壳侧原生通知（免网页授权），点击唤起主窗口 |
| 深链 | `apm://<内部路径>`（如 `apm://issues/42`）直达页面；second-instance 与冷启动 argv 均可携带 |

启动检查更新与诊断导出入口在设置 → 运行时 → 「桌面偏好」卡片；托盘菜单另有检查更新入口。

## 数据与文件布局

| 位置 | 内容 | 生成方 |
|------|------|--------|
| `~/.apm/data/agent-project-manager.db` | 主库（= default 工作区） | Prisma db push（首启） |
| `~/.apm/workspaces.json` | 工作区注册表（default + 用户工作区） | server 数据层（env 指向 userData） |
| `~/.apm/secrets.json` | JWT/集成加密密钥 | 壳首启生成 |
| `~/.apm/uploads/`、`logs/` | 上传文件、壳+server 日志 | 壳创建 |
| `~/.apm/desktop/apm-config.json`、`runtime.lock` | 守护进程配置与单实例锁 | 壳/守护进程 |
| 用户工作区目录（创建工作区时指定） | `data/apm.db`（自 template.db 复制）+ `uploads/` + `logs/` + `workspace.json` | server（PRISMA 模板 = 随包 `resources/server/prisma/template.db`） |

工作区多库实测（安装版）：创建工作区 → 模板库复制 → 注册表登记 → `x-workspace-id` 头路由，全链路通过。

## 用户数据位置

`~/.apm/`（用户主目录，固定不受安装位置影响；与手动 CLI 的 config.json 同根）。
安装器在安装期校验该目录：已存在 = 升级安装（提示且数据全保留），应用首启时若
检测到 v0.6.1 旧版数据（`%APPDATA%\agent-project-manager\`）会自动迁移并留档
（`.migrated.bak`）。Chromium 自身 profile（缓存/LocalStorage）单独放 `~/.apm/electron/`。

| 路径 | 内容 |
|------|------|
| `data/agent-project-manager.db` | SQLite 主库（首启由 Prisma db push 创建；已存在则跳过，绝不带 `--accept-data-loss` 重建） |
| `secrets.json` | 首启随机生成并持久化的 `JWT_SECRET` / `INTEGRATION_ENCRYPTION_KEY`，跨重启复用 |
| `logs/desktop-main.log` | 壳与 server 运行日志（`open_log_dir` 命令可直接打开） |
| `uploads/` | 上传文件 |
| `desktop/apm-config.json`、`desktop/runtime.lock` | 守护进程配置与单实例锁（与手动 CLI 隔离） |
| `electron/` | Chromium profile（缓存/LocalStorage，非项目数据） |

Prisma 运行时只随包 `@prisma/client` + 预生成客户端（含 query engine dll）；prisma
CLI 与引擎仓库不随包（瘦身剪除，~135MB），建库由打包时预生成的 default-template.db
恢复完成。dev 场景的 db push 经 Electron 内置 Node（`ELECTRON_RUN_AS_NODE=1`）执行。

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
- **调试模式**：dev 模式 DevTools 自动打开（detach）；F12 / Ctrl+Shift+I 随时开关。
- dev 冒烟工具：`electron . --remote-debugging-port=9222` 启动后 `node.exe scripts/smoke-ipc.mjs` 可自动断言渲染进程 IPC 契约（`scripts/cdp-invoke.mjs <command>` 可手动触发任意命令）。

### 打包版调试模式

正式安装包同样支持打开 DevTools 排障，四个入口任选：

```bash
# ① 启动参数
"Agent Project Manager.exe" --devtools
# ② 环境变量
APM_DESKTOP_DEBUG=1 "Agent Project Manager.exe"
```

- ③ 运行中按 **F12** 或 **Ctrl+Shift+I** 随时开关。
- ④ 设置 → 运行时 → 「本机守护进程」卡片 → 「开发者工具」按钮。

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
- apm-runtime 守护进程随包并由壳自动拉起（设置页可手动启停、维护工作目录）；claude-code/codex 等 CLI 二进制不随包，由守护进程探测用户自装环境。
- 登录缓存：JWT（7 天）镜像存 `%APPDATA%/agent-project-manager/desktop-state.json`，跨重启免登录，过期后 401 回登录页。
- 升级场景的 schema 演进（migrate deploy）未接入——首版安装只做全新建库。
- 关闭窗口即退出并杀掉全部托管子进程（server 与守护进程无残留）。
