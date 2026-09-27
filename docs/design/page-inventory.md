---
title: page-inventory.md - 页面盘点表（批 4 进度看板）
description: 逐路由登记页面的 UI 代际、数据真实/mock 与宪法 §1 密度达标情况，是前端改造批次的进度看板
status: reference
scope: apps/frontend
---

# 页面盘点表（批 4 进度看板）

列含义：UI = 新UI（装配原语+ui 基础组件）/ 旧UI（历史自生成组件）；数据 = 真实 / mock（见 [mock-inventory.md](./mock-inventory.md)）；密度 = 宪法 §1 高密区标准达标情况。

## 主干

| 路由 | 页面 | UI | 数据 | 密度达标 | 备注 |
|------|------|----|----|----|------|
| /app/projects | 项目列表 | 新UI | 真实 | ✅ | 存量收尾已重构 |
| /app/projects/dashboard | 全局仪表盘 | 新UI | 真实契约（msw 演示） | ✅* | 数据层走 /dashboard/overview；7 组 mock 常量下沉 msw、drill-down 弹窗同源、AsyncState 三态（2026-08-30 重写落地） |
| /app/projects/:id（5 子页） | 项目详情 | 新UI | 真实 | ✅ | 2026-08 重构落地 |
| /app/tasks / tasks/:id | 任务列表/详情 | 新UI | 真实 | ✅ | 动态追踪改版已落地 |
| /app/bugs / bugs/:id | Bug 列表/详情 | 新UI | 真实 | ✅ | StatusGlyph→StatusIconFrame/status-visuals 单一来源、AsyncState 错误态补齐（2026-08-30 收口） |

## 次干

| 路由 | 页面 | UI | 数据 | 密度达标 | 备注 |
|------|------|----|----|----|------|
| /app/members / members/:id | 成员列表/详情 | 新UI | 真实 | ✅ | card 化已落地 |
| /app/teams / teams/:id | 团队列表/详情 | 新UI | 真实 | ✅ | card 化已落地 |
| /app/acceptance* | 验收 | 部分 | 真实 | ✅ | 原始色清零 + DataTable/DataList 键盘行导航覆盖（2026-08-30） |
| /app/repositories* | 仓库 | 部分 | 真实 | ✅ | PageShell/EmptyState/骨架合规；卡片网格原生 Tab 可达（2026-08-30 复核） |
| /app/documents* | 文档 | 部分 | 真实 | ✅ | PageShell/Skeleton/错误态合规（2026-08-30 复核） |
| /app/settings/*（16 子页） | 设置 | 混合 | 真实 | ✅ | appearance/ai-executions/integrations/github/ai-management 已接真+语义色；表单形态 Tab 序+focus ring 原生可达（2026-08-30 复核） |
| /app/workspaces/new | 新建工作区 | 新UI | 真实 | ✅ | 创建错误 Alert destructive、初始化按钮 Spinner（2026-08-30 收口） |

## 长尾 / mock 重灾区

| 路由 | 页面 | UI | 数据 | 密度达标 | 备注 |
|------|------|----|----|----|------|
| /app/analytics | 分析 | 部分 | 真实契约（msw 演示） | ✅* | 数据层走 /analytics/overview；语义色清零；*后端实现后自动切真 |
| /app/app/delivery | 交付总览 | 部分 | 真实契约（msw 演示） | ✅* | 数据层走 /delivery/overview；DELIVERY_DATA 静态树下沉 msw；语义色清零 |
| /app/search | 搜索 | 部分 | 真实契约（msw 演示） | ✅* | 走 /search（防抖 250ms）；类型过滤/键盘导航保留 |
| /app/executions | 执行中心 | — | — | — | 已随遗留清理删除旧页文件；路由重定向到 settings/ai/executions（活页已接真） |
| /app/notifications | 通知中心 | 部分 | 真实 | ✅ | 错误态 AsyncState 已补（2026-08-30） |
| /app/help | 帮助 | 新UI | 无数据 | ✅ | Kbd/KbdGroup、搜索空态 EmptyState、死代码与 aiPage 误用清理（2026-08-30 收口） |
| /app/admin | 管理 | 新UI | 真实 | ✅ | 三区 AsyncState 补 error/onRetry（2026-08-30 收口） |
| /boot /login /register /invite | 认证流 | 新UI | 真实 | ✅ | 错误框 Alert、loading Spinner、boot 页 i18n（2026-08-30 收口；invite 页零散硬编码中文为遗留债） |
| /app/design-system | 设计系统展示 | 新UI | — | ✅ | dev-only，token/原语权威可视化 |

**判定规则**：页面迁移按 `frontend-page` skill 全流程执行；每行达标 = 迁移自检清单 + 打磨清单全过 + 暗色对照 Linear 通过（用户实机验收）。本表随批次滚动更新。
