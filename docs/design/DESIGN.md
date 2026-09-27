---
title: DESIGN.md - APM 全局设计系统规范与组件架构标准（指针页）
description: 本文件原为根 DESIGN.md 的逐字副本，2026-09-27 收口为单份后降为指针页——正文见仓库根 DESIGN.md，宪法见 PRINCIPLES.md
status: pointer
superseded_by: docs/design/PRINCIPLES.md
created: "2026-09-10"
scope: apps/frontend, apps/desktop
governance: "宪法为 docs/design/PRINCIPLES.md（版本号只在宪法头部声明一处）；参考规格正文在根 DESIGN.md"
---

# DESIGN.md — 指针页（正文已收口至仓库根）

本文件在 2026-09-27 之前与仓库根 `DESIGN.md` 是**两份逐字副本**（除其中链接使用的机器绝对路径外完全一致：根副本为 `/D:/workspace/agent-project-manager/…`，本副本为 `/E:/Project/agent-project-manager/…`——后者是**失效路径**）。两份同源文档并存即「单一真相源」分裂：任何一次只改其中一份的编辑都会静默产生两个版本的规范。故本轮收口为**单份**。

## 去哪读

| 要读什么 | 去哪 |
|---------|------|
| **前端设计宪法（最高依据）** | [`docs/design/PRINCIPLES.md`](./PRINCIPLES.md) —— 版本号只在宪法头部声明一处，配 `lint:spacing` / `lint:palette` / `lint:semantic` / `lint:undefined` 机器强制 |
| 《APM 全局设计系统规范与组件架构标准 v2.0》正文 | 仓库根 [`DESIGN.md`](../../DESIGN.md) —— 已降级为**参考规格（Reference Spec）**，其文首「地位勘正」列出与宪法的全部已知偏差 |
| A/B/C/D/E 类修改方案与规范调研 | `docs/design/修改方案-*.md`、`docs/design/规范调研报告-2026-09-27.md` |

## 为什么保留根副本而不是本副本

根 `DESIGN.md` 是**更新的一份**（2026-09-20 最后修改，且链接指向当前仓库实际路径），本副本停留在 2026-09-19 且含失效的 `/E:/Project/` 路径；同时仓库内 8 处代码注释（`page-shell.tsx`、`thinking-stream.tsx`、`agent-handoff-card.tsx`、`dock-metric-badge.tsx`、`dual-track-metric-pill.tsx`、`ai-surface-page.tsx`、`design-system-page.tsx`、`assistant/…`）以 `DESIGN.md §N` 形式引用该文档，按仓库约定解析到根路径。故正文留根副本，本处退为指针。

> **治理说明**：本文件位于 `docs/` 下，受 `scripts/check-doc-sync.mjs` 的 frontmatter 闸门管理（`title`/`description`/`status` 三字段齐全），本指针页完整保留 frontmatter。
