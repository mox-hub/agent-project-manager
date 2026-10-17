---
title: "Ordo"
description: "项目入口与文档导航"
id: "ROOT-README-001"
category: "meta"
status: "active"
version: "2.0.0"
created: "2026-02-21 00:00:00"
modified: "2026-08-05"
scope: "仓库读者（开发/产品/运维/AI协作）"
ai-session-types: "all"
ai-priority: "high"
ai-freshness: "daily"
ai-notify-on: "status-change,version-major"
ai-audiences: "session:all"
tags: "docs,index,readme"
---

# Ordo

**AI 驱动的工程项目管理工具**——AI 同事替你干活，治理闭环替你把关：需求访谈 → 任务拆解 → 隔离执行 → 验收门禁 → 发版交付。

## 快速上手

**方式一：桌面版（推荐）**

1. 到 [Releases](https://github.com/mox-hub/ordo/releases) 下载最新 Windows 安装包（`.exe`）并安装；
2. 首启注册账号（首个注册用户自动成为管理员），引导向导会带你完成：工作目录 → 环境检查 → 建第一个项目 → 连接仓库 → 配置 AI；
3. 「配置 AI」步填入模型服务的 API Key（支持 OpenAI / Anthropic / GLM / DeepSeek 等），测试通过后 Ordo 会自动创建你的第一个 AI 员工；
4. 到项目里建一张工单，指派给 AI 员工——它会读取需求、隔离执行、回来提交验收。

**方式二：开发态（Web 全栈）**

```bash
pnpm install
pnpm dev          # server :4300 + frontend :5173
```

浏览器打开 `http://localhost:5173`。开发态下桌面专属能力（工作目录配置、运行时托管）不可用，建议配合桌面版使用。

**前置条件**（引导向导的环境检查步也会检测）：

- Node.js ≥ 20、Git；
- 至少一个 AI CLI（Claude Code / Codex / ZCode 等，按你要用的 AI 员工而定）；
- 一个模型服务的 API Key。

> 已知限制见对应 Release 的发布说明：远程/移动端访问暂不可用；部分新接入的 CLI Provider（gemini/qwen/codebuddy/grok）为文档级接入未实测。遇到问题欢迎 [提 issue](https://github.com/mox-hub/ordo/issues/new/choose)。

## 文档入口

- 架构总览：`architecture.md`
- AI 治理与会话入口：`AGENTS.md`
- 变更历史：`CHANGELOG.md`
- 产品需求：`docs/01-需求/产品需求文档-v3.md`（v2 仍存于同目录）
- 需求模块（按 Feature 拆分）：`docs/01-需求/需求模块/`
- 技术架构：`docs/02-架构设计/architecture/技术架构总览.md`
- 产品架构愿景：`docs/02-架构设计/architecture/产品架构愿景.md`
- 后端模块结构：`docs/02-架构设计/architecture/backend/modules.md`
- 前端模块结构：`docs/02-架构设计/architecture/frontend/modules.md`
- 控制面/运行时设计：`docs/02-架构设计/architecture/控制平面-本地运行时-v1.md`
- 交互式架构图表集：`docs/diagrams/`（含系统架构、模块依赖、主流程图）
- 实施路线：`docs/roadmap/tasks-phase1-3.md`

## 当前 Desktop 口径

- 当前主路线：Electron（`apps/desktop/electron/`，ADR-014；v0.6.2 起随安装包发布）
- 历史基线：Tauri 2（已随 ADR-014 剔除，仅存 CHANGELOG 与 docs/archive 历史记录）

## AI 会话入口

- 系统约束与治理契约：`AGENTS.md`
- 需求真相源：`docs/01-需求/产品需求文档-v3.md`
