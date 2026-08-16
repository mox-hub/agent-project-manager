---
title: "Agent Project Manager"
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

# Agent Project Manager

## 文档入口

- 架构总览：`architecture.md`
- AI 治理与会话入口：`CLAUDE.md`
- 变更历史：`CHANGELOG.md`
- 产品需求：`docs/01-需求/产品需求文档-v3.md`（v2 仍存于同目录）
- 需求模块（按 Feature 拆分）：`docs/01-需求/需求模块/`
- 技术架构：`docs/02-架构设计/architecture/技术架构总览.md`
- 产品架构愿景：`docs/02-架构设计/architecture/产品架构愿景.md`
- 后端模块结构：`docs/02-架构设计/architecture/backend/modules.md`
- 前端模块结构：`docs/02-架构设计/architecture/frontend/modules.md`
- 控制面/运行时设计：`docs/02-架构设计/architecture/控制平面-本地运行时-v1.md`
- 实施路线：`docs/roadmap/tasks-phase1-3.md`

## 当前 Desktop 口径

- 当前主路线：Tauri（`apps/desktop/src-tauri/`）
- 历史基线：Electron（仅历史维护，不新增能力）

## AI 会话入口

- 系统约束与治理契约：`CLAUDE.md`
- 需求真相源：`docs/01-需求/产品需求文档-v3.md`
