# API 契约提案：analytics / delivery / search / dashboard（待后端确认）

> **状态更新（2026-08-30 第三版）**：新增 §4 Dashboard——全局仪表盘按本提案完成前端侧落地
> （api 类型/hook/msw handler，原 Figma 克隆页 7 组 mock 常量全部下沉）。
>
> **状态更新（2026-08-30 第二版）**：analytics/delivery/search 三页已按本提案完成前端侧落地——api 类型/hook、
> msw handler（`VITE_API_MOCK=on` 可全功能演示，含三态开关）、页面数据层换真。
> 契约最终以后端确认为准；若后端修订字段，只需同步改 api 类型与 msw 生成器，页面零改动。
> 提案与前版的差异：Search 改为扁平 `{items,total}`（前端分组）；Analytics v1 用单
> `GET /analytics/overview` 聚合返回（后端可再拆分）；Delivery 为 `{nodes,annotations}` 交付树。

> 目的：mock-inventory 中最后三个「待迁移」页面均阻塞在无后端契约。本文档是给后端的提案草案，
> 确认或修订后前端即可按宪法重写三页并接真（mock 侧同步下沉 `src/mocks/handlers.ts`）。
> 约定遵循现有后端规范：全局信封 `{status, success, description, data, timestamp, requestId}`、
> `x-workspace-id` 路由、分页返回 `{items, total, page, pageSize}`。

## 1. Search（搜索）

前端：`modules/search/pages/search-page.tsx`（当前整页静态示例）。

```
GET /search
  q        string  必填，关键词
  types    string[] 可选，实体过滤：task|bug|project|document|repository|acceptance|member|team
  limit    number  可选，默认 20

data: {
  groups: Array<{
    type: string                     // 实体类型（同 types 枚举）
    items: Array<{
      id: string
      title: string                  // 主标题（含 <mark> 高亮或由前端自行高亮）
      subtitle?: string              // 次要行（项目名/状态等）
      status?: string
      updatedAt: string
      url: string                    // 前端路由路径
    }>
    total: number
  }>
  total: number                      // 全部命中数
}
```

实现建议：v1 可做 DB `LIKE`/`ILIKE` 多表联合查询即可，无需全文索引；按 type 分组返回。

## 2. Analytics（分析页）

前端：`modules/analytics/pages/analytics-page.tsx`（Cost/Quality/Risk/Team 四 Tab 全静态）。

按 Tab 拆四个只读端点，均为项目级聚合，建议一次事务预聚合或定时快照：

```
GET /analytics/cost?projectId=&from=&to=
data: {
  totalCost: number                  // AI 执行成本（元/积分，与 usage 同单位）
  byDay: Array<{ date: string; cost: number }>
  byProvider: Array<{ provider: string; cost: number; calls: number }>
  byTask: Array<{ taskId: string; taskTitle: string; cost: number; runs: number }>   // Top N
}

GET /analytics/quality?projectId=&from=&to=
data: {
  acceptancePassRate: number         // 验收通过率 0-1
  bugOpenCount: number
  bugTrend: Array<{ date: string; opened: number; closed: number }>
  reworkRate: number                 // 返工率（执行失败/重开占比）
}

GET /analytics/risk?projectId=
data: {
  atRiskProjects: Array<{ projectId: string; name: string; healthStatus: string; healthScore: number; blockedReason?: string }>
  overdueTasks: Array<{ taskId: string; title: string; targetDate: string; assignee?: string }>
  blockingAcceptances: number        // 阻塞验收数
}

GET /analytics/team?projectId=&from=&to=
data: {
  members: Array<{
    memberId: string; name: string; avatar?: string
    completedTasks: number; openTasks: number
    aiRuns: number; humanRuns: number
    acceptanceApproved: number; acceptanceRejected: number
  }>
}
```

数据源备注：cost ← execution runs + ai-hub usage；quality ← acceptance + bugs；risk ← project healthStatus + task targetDate；team ← members + activity 聚合。均为只读聚合，无写路径。

## 3. Delivery（交付总览）

前端：`modules/delivery/pages/delivery-page.tsx`（里程碑/标注/验收状态整页静态）。

```
GET /delivery/overview?projectId=
data: {
  milestones: Array<{
    id: string; name: string; dueDate: string
    status: 'planned' | 'in_progress' | 'done' | 'overdue'
    progress: number                  // 0-100
    acceptance: { total: number; approved: number; rejected: number; pending: number }
  }>
  features: Array<{                   // 交付特性/标注（页面现状的 DELIVERY_DATA 形状）
    id: string; name: string
    milestoneId?: string
    status: 'planned' | 'in_progress' | 'delivered' | 'blocked'
    ownerId?: string
    auditRisk?: 'green' | 'yellow' | 'red'
  }>
  summary: { total: number; delivered: number; inProgress: number; blocked: number }
}
```

数据源备注：milestones ← iteration/milestone 表；features ← task 打标或 milestone 关联任务；acceptance ← acceptance 模块按里程碑聚合。

## 4. Dashboard（全局仪表盘）

前端：`modules/project/pages/dashboard-page.tsx`（workspace 级聚合，v1 单端点返回，后端可按域拆分）。

```
GET /dashboard/overview
data: {
  team: {
    totalMembers: number
    activeTasks: number
    avgLoadPct: number                 // 0-100
    members: Array<{ id: string; name: string; role: string; activeTasks: number; completedThisWeek: number }>
  }
  ai: {
    conversations: number
    weeklyGrowth: number               // 本周新增会话
    tokensUsed: number                 // 本月 token 用量
    topActivities: Array<{ activity: string; count: number }>
  }
  cost: {
    monthTotal: number
    budgetDeltaPct: number             // 负数 = 低于预算
    byCategory: Array<{ name: string; amount: number; percentage: number }>
  }
  delivery: {
    activeTasks: number
    totalTasks: number
    byPriority: Array<{ priority: 'urgent'|'high'|'medium'|'low'; count: number }>
    criticalBugs: number
    openBugs: number
    resolvedBugs: number
  }
  health: {
    avgScore: number                   // 0-100
    projects: Array<{ id: string; name: string; score: number; status: 'on_track'|'at_risk'|'off_track' }>
  }
  risks: {
    mitigationRatePct: number          // 已有缓解方案的风险占比
    items: Array<{ id: string; title: string; severity: 'critical'|'high'|'medium'; impact: string; mitigation: string }>
  }
  trends: {
    productivity: Array<{ date: string; tasks: number; velocity: number; quality: number }>
    health: Array<{ week: string; score: number }>
    performance: Array<{ metric: string; value: number }>   // 团队 6 维表现
  }
}
```

数据源备注：team ← members + task 负载聚合；ai ← AI usage/activity；cost ← execution 成本；
delivery ← task + bug 状态计数；health ← project healthStatus/score；risks ← 风险登记（可先由
超期任务 + 阻塞验收推导）。均为只读聚合，无写路径。页面 drill-down 弹窗数据全部来自本端点，
不再二次请求。

## 前端侧承诺（契约确认后）

1. 每个端点一对「真实 api hook + msw handler」（msw 侧数据生成器 ≥30 条，`?mock_scenario` 三态开关照常生效）；
2. 三页按宪法重写：装配原语 + 唯一字阶 + 语义色 + 键盘导航（列表走 DataList/DataTable）；
3. 页面 `data-mock="true"` 标记与 `mock-inventory.md` 对应行同步清除。

**优先级建议**：search（后端成本最低、用户价值最直接）→ delivery（数据源全部现成，纯聚合）→ analytics（聚合口径需要产品先拍板 Cost 单位与统计窗口）。
