---
title: ADR-M-001 移动端技术路线（Expo + React Native）
description: 移动端技术选型裁决——固化 Expo + React Native 独立 App 路线、逐条排除项与理由、遗留风险与 spike 跑法（判据 1-7）
status: active
scope: apps/mobile
created: "2026-10-11"
governance: "本文件是移动端技术路线的真相源；编号 ADR-M-* 为移动端专有命名空间（不与 docs/02-架构设计/策略/决策日志.md 的全局 ADR-NNN 冲突）；全局决策日志对应条目见 ADR-018"
---

# ADR-M-001：移动端技术路线（Expo + React Native）

- **状态**：Accepted（2026-10-11 用户裁决）
- **决策者**：用户（AskUserQuestion 四选一）
- **全局限对应**：`docs/02-架构设计/策略/决策日志.md` **ADR-018**
- **关联**：能力清单 §4.8（`CAP-M-01…M-10`）· [工程接入方案](./工程接入方案.md) · [发布与分发方案](./发布与分发方案.md)

## 1. 背景与约束

移动端 = 双表面架构的**第三种人类表面**（前两种：React Web 控制面、Electron 桌面壳）。0.8.0 后推进，与 PC 发版并行。约束：

- **必须复用既有契约资产**：后端契约真相 = 仓库根 `openapi.json`；手写协议镜像 = `@apm/shared`（HTTP 客户端 / envelope / runtime protocol / domain events / apm-ref / errors）。重复手抄契约类型是最贵的错。
- **单团队双端**：没有 iOS / Android 两班人马，必须一码双端。
- **定位是伴随场景**：低频、轻交互、离桌使用——不是把桌面高密度界面搬小。
- **内测先行**：一期只要能分发给内测用户（EAS 内测分发），不追求当期上架运营。

## 2. 候选与排除

| 候选 | 裁决 | 一句话理由 |
|---|---|---|
| **Expo + React Native** | ✅ **采用** | 与 `@apm/shared` 同语言（TS）可直接消费生成契约类型；一码双端；EAS 同时解决云构建/签名/内测分发/OTA 四件事 |
| 原生双端（Swift + Kotlin） | ❌ 排除 | 两套代码两条技能栈，且完全无法复用 TS 契约生态；内测分发各走 TestFlight / Play 内部测试，成本翻倍 |
| PWA / 响应式 Web | ❌ 排除 | iOS 推送与后台能力受限（离桌场景的核心是「被告知」）；无商店级分发通道；离线与手势体验弱；且会与「前端宪法 §15.2 桌面优先」的定位混淆 |
| React Native CLI（bare workflow） | ❌ 排除 | 放弃 Expo 工具链（EAS 构建/签名/OTA/托管升级）后收益不明显；原生模块需求当前未出现，需要时 Expo 支持 prebuild 逃逸 |
| Flutter | ❌ 排除 | Dart 与全仓 TS 资产（契约类型/协议镜像/事件常量）零复用，需重建一层类型映射，违背约束 1 |
| Taro / uni-app 多端框架 | ❌ 排除 | 目标生态是小程序/H5 多端，与「原生体验 + 商店分发 + 推送」的主线目标不匹配 |

## 3. 裁决

**采用 Expo（managed workflow）+ React Native，独立 App，iOS + Android 双端一码。**

- 包管理与仓库位置：`apps/mobile`（pnpm workspace `apps/*` 已自动纳入，**无需改 `pnpm-workspace.yaml`**）。
- 路由：`expo-router`（文件式，Stack + Bottom Tab）。
- 构建/分发：EAS Build / Submit / Update（详见 [发布与分发方案](./发布与分发方案.md)）。
- 契约消费：**不手抄**——经 `packages/apm-contract` 抽包消费单份生成的契约类型（详见 [工程接入方案](./工程接入方案.md) §2）。

## 4. 后果与遗留风险（必须在 M0/M1 处置）

| # | 风险 | 现状证据 | 处置 |
|---|------|---------|------|
| R1 | **`@apm/shared` 整体不可进 RN** | 根 `index.ts` 一次性 re-export `config/store`（用 `fs`/`os`/`path`）与 `cli/*`（用 `child_process`）；RN 无 Node 内置模块 | spike 期先用**子路径导入**绕开根 index；M1 抽 `packages/apm-contract`（纯 RN+web-safe：仅 axios + zod） |
| R2 | **CI 分类器不认识 `apps/mobile`** | `.github/workflows/quality-gate.yml` 只识别 frontend/server/cli/shared；未识别 → `SOURCES=false` → **门禁全跳过还显示全绿** | M1 加 `MOBILE=$(has '^apps/mobile/')` 并入 `SOURCES` + 新增 `test-mobile` job（**最易踩坑的接入点**） |
| R3 | **契约链只有一份真生成器** | `contract:generate` 只输出前端 `api-types.gen.ts`；`packages/apm-shared/src/generated/api-types.gen.ts` 是无生成器、无 import、行数不符的手工滞后产物 | M1 契约单源化：生成目标改指 `packages/apm-contract`，删滞后产物，修正 `AGENTS.md`/`architecture.md` 的「双份生成」表述 |
| R4 | **EAS 云构建对私有依赖/环境的约束** | 需评估工作区（monorepo）内私有包与 `pnpm` 目录装在 EAS 构建机的行为 | spike 判据 6（EAS 云构建产出可安装内测包）；不行则退到本地构建 + 自建分发 |
| R5 | **OTA 与新架构兼容性** | Expo SDK 版本 ↔ React Native 新架构（Fabric/TurboModules）与 `runtimeVersion` 策略 | 随 spike 记录 SDK 版本；OTA 通道只在 SDK 不升级的前提下推送（详见 [发布与分发方案](./发布与分发方案.md) §4） |
| R6 | **通知分类持久化**（功能级风险，非技术选型风险） | 移动端未读/分类若只在本地存，会与服务端单一口径分叉 | 在 [页面蓝图](./页面蓝图.md) / M-02 卡内明确：服务端通知记录为唯一真相，本地只做展示态缓存 |

## 5. spike 跑法（产出 `spike-Expo-RN-报告.md`）

**范围**：仅创建一个**最小试验工程**验证判据，不实现任何业务页。**该试验工程（`apps/mobile/`）的落地需单独取得确认。**

**前置**：Node 22 / pnpm 11（与全仓一致）；Expo 账号（EAS）；一台可跑 iOS 模拟器的 mac 或 EAS 云构建替代。

**步骤**：

1. 在 `apps/mobile/` 初始化 Expo + TS + expo-router 最小工程，接入 pnpm workspace，`pnpm install` 通过。
2. **子路径导入验证**：`import { ... } from '@apm/shared/events/domain-events'`、`@apm/shared/http/apm-client`，Metro 打包成功，产物**不含 `fs`/`os`/`path`/`child_process`**（判据 1）。
3. 接认证链：`POST /auth/login` → 安全存 token（`expo-secure-store`）→ `GET /auth/me` → 工作区选择器（`GET /workspaces/public`）→ 带 `x-workspace-id` 请求成功（判据 2）。
4. 接通知链：`GET /notifications` + `unread-count` 渲染；连 `/events`（socket.io 命名空间 `/events`）收到 `notification.created` 使徽标自增（判据 3）。
5. 接决策链（**核心楔子**）：`GET /decisions/pending` 渲染 `DecisionCard variant="vertical"` → 对 approval 走 `POST /execution/approvals/{id}/resolve` 成功且列表移除（判据 4）。
6. 双端各跑通 2–5，记录冷启耗时（判据 5）。
7. EAS 云构建产出可安装内测包（判据 6）；移动端 `tsc -b` 能引用生成的契约类型（判据 7）。

**判据汇总**（**全部跑通才算成功**，否则回炉本 ADR）：

1. Metro 在 pnpm workspace 下打包成功且产物无 Node 内置模块。
2. 认证链闭环（登录 → 安全存 → `/auth/me` → 工作区 → 带库头请求）。
3. 通知链闭环（列表 + 未读数 + 实时事件自增）。
4. 决策链闭环（列表 → 决策卡 → `resolve` 成功 → 列表移除）。
5. iOS 模拟器 + Android 模拟器各跑通 2–4，记录冷启耗时。
6. EAS 云构建产出可安装内测包。
7. 移动端 type-check 能引用生成的契约类型。

**报告须如实记录**：失败的判据、真实报错、实测数字（冷启耗时/包体/构建时长），不得只写「通过」。
