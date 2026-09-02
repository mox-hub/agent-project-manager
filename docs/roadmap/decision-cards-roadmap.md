# 决策卡（卡片文法）路线图

> 13 种决策卡的后端需求、关键节点与批次规划。批次 ①② 已于 2026-09-02 落地
> （分支 `feat/decision-card-grammar`），本文档承载批次 ③④ 及其前置缺口。

## 已完成（批次 ①②，2026-09-02）

| 卡片 | 闭环链路 |
|---|---|
| ApprovalCard 审批门禁 | `ApprovalRequest` → `/execution/approvals/:id/resolve` |
| AcceptanceCard 验收收口 | `Acceptance` → accept/reject/waive-completion |
| **DecisionProposal 地基** | 通用提案表 + `/decisions/proposals`（create/get/resolve）+ 四类事务化 applier |
| SpendCard 花费超支 | 执行完成钩子 `checkSpendOnRunComplete`（`Project.config.aiBudget` 周预算）→ accept 写回预算 |
| PlanCard 任务拆解 | 提案 API 通道（AI 工具 POST `kind=plan`）→ accept 批量建子任务（TaskAssignee 绑定） |
| AssignCard 分派建议 | 规则版生成器 `POST /decisions/proposals/generate/assignment` → accept 批量绑定 |
| ResolutionCard 关闭语义 | 验收全部通过钩子自动生成 → accept=完成 / cancel=取消（取消需项目配置取消终态） |
| ClarifyCard 澄清（最小版） | AI 工具 POST `kind=clarify`（choices + guess 标记）→ accept 落 answer → 提案方 `GET /decisions/proposals/:id` 轮询取回 |

## 批次 ③（等提案地基验证后启动）

### PriorityCard 优先级重排
- 生成侧：规则（依赖图 + 延期风险），可后补 LLM。
- **前置缺口：Task 模型无排序字段**（priority 是枚举非序数）。需新增 `rank` 列或独立排序表，迁移走手动路径。
- 接受执行器：按 payload 顺序批量写 rank；列表/看板查询按 rank 排序。

### ScopeCard 迭代纳入
- 生成侧：规则装箱（`Iteration.capacity` + 任务 estimate）起步，LLM 排序增强。
- 接受执行器：批量 `task.iterationId` 更新。

### GoalCard 里程碑草案
- 生成侧：**依赖 LLM 生成质量**——先在提案 API 上接主 AI 编排（CLI dispatch 出结构化 JSON），建议等 ①② 批次的提案接受率数据后再投入。
- 接受执行器：批量创建 `Milestone`。

## 批次 ④（长线，前置条件未成熟）

### DriftCard 依赖漂移
- v1 只做 **AI 执行中上报通道**（执行器发现接口变更 → POST `kind=drift` 提案）；自动监听外部系统变更是独立大工程，勿与卡片耦合。
- 接受执行器：按建议改任务描述/依赖（TaskDependency 已有）。

### TrustCard 信任升降级
- **前置缺口 1**：按 (subject, actionType) 维度的连续通过 streak 统计聚合器。
- **前置缺口 2**：自主度策略存储 + 执行——`autoApprove` 端点目前无任何调用方，策略先"活"起来再谈升降级卡。
- 接受执行器：更新自主度策略（建议新表 `autonomy_policy`，勿塞 AppConfig）。

### RitualCard 周报复盘
- **前置缺口：定时任务基建**（服务端当前无 @nestjs/schedule）。引入后：周报 cron → 聚合查询（Activity/ExecutionRun/Acceptance/日均决策数）→ 提案 API 生成 ritual 卡。
- 日均决策数指标：decision summary 的历史序列需要轻量快照表或按日聚合查询。

## 横切待办（批次③④之前/期间）

1. **主 AI 编排器**：Plan/Goal 生成的统一入口——CLI dispatch 主 AI 会话产出结构化提案 JSON 后自动 POST 提案 API；Prompt 模板放 `@apm/cli` 侧。
2. **ClarifyCard 第二步（进程级暂停/恢复）**：runtime worker 交互协议——agent 执行中真实暂停，答案经 WS 推送注入（现版本为轮询 + 上下文补投递，不暂停进程）。
3. **MCP 工具包装**：`propose_decision` / `get_proposal` 两个 tool 包装提案 REST API（`mcp-server` 模块）； Clarify 的 ask/poll 同理。
4. **Proposal e2e**：cli-dispatch e2e 同款模式补 proposal 闭环 e2e（create → inbox 聚合 → resolve → 断言 applier 副作用）。
5. **花费数据源升级**：AIUsageLog 目前无写入方（表在、写入缺）；SpendCard 现以 ExecutionRun.totalTokens/totalCost 汇总为准，若后续接入真实 token 计量需切数据源。
