---
title: "CHANGELOG"
description: "版本化变更记录（版本-模块-证据）"
id: "CHANGELOG-001"
category: "report"
status: "active"
version: "1.0.0"
created: "2026-02-20"
modified: "2026-03-14"
scope: "全仓库版本变更"
ai-session-types: "all"
ai-priority: "high"
ai-freshness: "realtime"
ai-audiences: "session:all"
tags: "changelog,release"
---

# Agent Project Manager - Changelog

格式约定：每条变更包含 `模块 + linked_fr + test_evidence + doc_impact`。

## [0.3.1] - 2026-03-14

### Governance

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|---|
| governance | 新增质量门禁与文档同步阻断机制（PR模板+CI+docs-sync） | FR-CORE-001 | `pnpm type-check`, `pnpm -r lint`, 前后端测试主命令 | `docs/meta/QUALITY-GATE.md`, `docs/meta/contracts/*` |
| docs | 重建 PRD、模板体系与追踪矩阵 | FR-CORE-001 | 追踪矩阵与文档校验 | `docs/meta/PRD.md`, `docs/meta/templates/*`, `docs/reports/traceability-matrix.md` |
| process | TODO 真相源切换到 `docs/reports/TODO.md` | FR-CORE-001 | 执行入口与状态机可追溯 | `docs/reports/TODO.md`, `TODO.md` |

### Quality

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|---|
| server | 清理 `src` 误入 `.js` 产物，恢复 TS 源一致性 | FR-CORE-001 | server unit test 77/77 | `docs/reports/review-reports/project-rescue-baseline-2026-03-14.md` |
| frontend | 修复 `use-project-health` 测试断言结构漂移 | FR-PROJECT-001 | frontend test 31/31 | `docs/reports/traceability-matrix.md` |

## [0.3.0] - 2026-03-06

### Project & AI Integration

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|---|
| project | 新增 external-links/doc-links/api-doc-links 管理能力 | FR-PROJECT-001 | project service/unit + e2e | `docs/meta/requirements/feature-project.md` |
| project | 新增健康度快照与 AI context 刷新能力 | FR-PROJECT-001 | project hooks + backend controller | `docs/meta/requirements/feature-project.md`, `docs/api/api-project.md` |
| ai-project | AI 项目级配置、执行、洞察模型扩展 | FR-AIHUB-001 | 待补专项自动化测试 | `docs/meta/requirements/feature-ai-project.md` |

## [0.2.0] - 2026-02-20

### Security & Foundation

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|---|
| integration | 修复加密密钥硬编码与加密 API 安全性 | FR-CORE-001 | lint + build + integration tests | 安全审计报告 |
| server | CORS 白名单与限流防护增强 | FR-CORE-001 | e2e 回归 | 架构/安全文档 |
| infra | `src/common` 基础设施层建设 | FR-CORE-001 | unit/e2e | 架构文档 |

## 维护规则
1. 每个版本条目必须包含 `linked_fr`。
2. 每个版本条目必须包含可验证证据（测试命令/报告路径）。
3. 接口或模型变化必须同步更新 `docs/api/*` 与 `docs/reports/traceability-matrix.md`。
