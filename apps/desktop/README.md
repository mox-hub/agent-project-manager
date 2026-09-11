# Agent Project Manager Desktop（Tauri 2）

人类控制面的桌面壳：把 Web 前端与本地 NestJS 后端打包成一个 Windows 安装包（NSIS），非开发用户装上即用——首启自动建库，无需 Node/pnpm/git 开发环境。

对应能力卡：**CAP-A-14 桌面壳发布级打包与运作**（`docs/01-需求/能力清单-v1.md` §4.1）；执行计划与验收清单见 `docs/roadmap/tauri-desktop-v0.6.1-plan.md`。

## 架构一览

```
┌─ Tauri 窗口（webview，前端资产内嵌进二进制）─┐
│  modules/desktop 引导链：                    │
│  invoke → get_backend_status → setApiBaseUrl │
│  → window.__DESKTOP_API_BASE_URL__ → api-client
└──────────────┬───────────────────────────────┘
               │ invoke（12 个服务控制命令）
┌──────────────┴───────────────────────────────┐
│ Rust 壳（src-tauri）                          │
│  setup.rs  目录/密钥/Prisma db push/Node 解析 │
│  backend.rs 端口探测 4300-4399 + 健康检查      │
│  commands/  start/stop/restart 等             │
└──────────────┬───────────────────────────────┘
               │ spawn resources/bin/node.exe
        resources/server（自包含 NestJS 运行时：
        dist + node_modules + prisma + 预生成客户端）
```

## 用户数据位置

`%LOCALAPPDATA%\com.agentpm.desktop\`

| 路径 | 内容 |
|------|------|
| `data/agent-project-manager.db` | SQLite 主库（首启由 Prisma db push 创建；已存在则跳过，绝不带 `--accept-data-loss` 重建） |
| `secrets.json` | 首启随机生成并持久化的 `JWT_SECRET` / `INTEGRATION_ENCRYPTION_KEY`，跨重启复用 |
| `logs/` | 壳与服务运行日志（`open_log_dir` 命令可直接打开） |
| `uploads/` | 上传文件 |

## 构建与打包（开发者）

前置：Rust 1.9x（MSVC）、Node 24、pnpm 11、NSIS（tauri CLI 自动获取）。

```bash
# 一键链：构建 server+frontend → 准备自包含资源 → cargo release 构建 → NSIS 安装包
cd apps/desktop
pnpm desktop:pack
# 产物：src-tauri/target/release/bundle/nsis/Agent Project Manager_0.6.1_x64-setup.exe
```

资源准备也可单跑（tauri build 的 `beforeBuildCommand` 会自动触发）：

```bash
pnpm pack:resources   # 产出到 src-tauri/resources/（已 gitignore）
```

开发调试（需要仓库开发环境，`tauri dev` 模式）：

```bash
pnpm tauri:dev   # node 走 PATH，server 用 apps/server 源码目录，前端连 vite dev server
```

## 打包资源布局（src-tauri/resources/，构建时生成）

| 目录 | 内容 | 来源 |
|------|------|------|
| `server/` | `dist/`（SWC 平铺产物，入口 `dist/main.js`）+ `node_modules/`（`pnpm deploy --prod --legacy` 硬拷贝，含 prisma CLI 与预生成客户端引擎）+ `prisma/` + `package.json` | pack.mjs |
| `frontend/` | 前端构建产物（server 静态托管备用；webview 本体走 Tauri 内嵌资产） | pack.mjs |
| `bin/node.exe` | Node 运行时 | pack.mjs |

## 已知边界（v0.6.1）

- 不含代码签名（SmartScreen 会提示「未知发布者」）、不含自动更新器。
- AI 执行面（apm-runtime 守护 + claude-code/codex CLI）不随包分发。
- 升级场景的 schema 演进（migrate deploy）未接入——首版安装只做全新建库。
- 关闭窗口即退出并杀掉全部托管子进程（node 后端无残留）。
