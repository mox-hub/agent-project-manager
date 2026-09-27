# 组件层 Mock 盘点（批 3）

宪法 §9：mock 只许活在 msw handler 层。下表是当前**组件层/页面层**存量 mock 的清单。
msw 基础设施已就位：`src/mocks/`（`VITE_API_MOCK=on` dev 启用，`?mock_delay=`/`?mock_scenario=error|empty` 三态开关，`MockBadge` 全局角标）。

| 位置 | 内容 | 状态 | 迁移去向 |
|------|------|------|----------|
| `modules/analytics/pages/analytics-page.tsx` | Cost/Quality/Risk/Team 四 Tab 全量静态数据 | ✅ 已接真（契约前端优先落地） | api hook + msw handler 就绪；后端实现同路由后自动切真（提案见 [api-contract-proposals.md](./api-contract-proposals.md)） |
| `modules/delivery/pages/delivery-page.tsx` | DELIVERY_DATA 交付总览整页静态 | ✅ 已接真（契约前端优先落地） | api hook + msw handler 就绪；后端实现同路由后自动切真（提案见 [api-contract-proposals.md](./api-contract-proposals.md)） |
| `modules/search/pages/search-page.tsx` | 搜索结果静态示例 | ✅ 已接真（契约前端优先落地） | api hook + msw handler 就绪；后端实现同路由后自动切真（提案见 [api-contract-proposals.md](./api-contract-proposals.md)） |
| `modules/settings/sections/ai-execution-center-section.tsx`（活页；ai-execution-center-page 已 @deprecated） | 裸 fetch 未解信封致列表静默空白 → 已改走 api client（✅ 2026-08-30 接真）；trust-profiles 后端缺契约返回空 | ✅ 已接真 | — |
| `modules/project/pages/dashboard-page.tsx` | 全局仪表盘 7 组 Figma mock 常量（TEAM_MEMBERS/TASKS/PROJECTS/AI_CONVERSATIONS 等） | ✅ 已接真（契约前端优先落地） | api hook + msw handler 就绪；后端实现同路由后自动切真（提案见 [api-contract-proposals.md](./api-contract-proposals.md) §4） |
| `modules/project/components/dashboard/project-overview-charts.tsx` | 燃尽图 Figma 基线数据 | ⏳ 待迁移 | 需燃尽统计 API |
| `settings/sections/integrations-section.tsx` | 目录静态元数据（展示性）+ 假连接（setTimeout 变 connected）→ 已改为真实 /integrations 状态叠加、断开走 delete mutation、Linear 走真实弹窗（✅ 2026-08-30）；feature 开关为能力说明非状态 | ✅ 已接真 | `modules/integration/pages/integration-list-page.tsx` 为未路由遗留，待登记清除 |
| `modules/team-member/components/team-stats-section.tsx` | 局部统计标注 data-mock | ⏳ 待迁移 | 团队统计 API |
| `src/mocks/*` | msw handler 层（projects/tasks 演示 handler + 生成器） | ✅ 基线就位 | — |
| `src/test-utils/mock-handlers.ts` | 测试用 handler（vitest 域） | ✅ 保留 | 测试域不算组件层 mock |

**顺序建议**：先接已有后端契约的（ai executions、integrations），再造无后端契约的页面（analytics/delivery/search 需先与后端定契约，属产品决策）。
