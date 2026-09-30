---
title: "CHANGELOG"
description: "版本化变更记录（版本-模块-证据）"
id: "CHANGELOG-001"
category: "report"
status: "active"
version: "1.0.0"
created: "2026-02-20"
modified: "2026-09-15"
scope: "全仓库版本变更"
ai-session-types: "all"
ai-priority: "high"
ai-freshness: "realtime"
ai-audiences: "session:all"
tags: "changelog,release"
---

# Agent Project Manager - Changelog

格式约定：每条变更包含 模块 + linked_fr + test_evidence + doc_impact。

## [Unreleased]

## [0.7.8] - 2026-10-01

### v0.7.8 发版总览——上线套装首版：G8 成本归因到验收（批二 C-06 余留切片兑现）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | **验收归因成本聚合端点** `GET /ai/usage/acceptance-attribution?projectId=`：AIUsageLog.executionRunId → Execution（retryOfId 返工血缘）→ Issue → Acceptance 一跳链只读内存聚合，零 schema 迁移——summary（totalExecutionCost / reworkCost / reworkPct / acceptanceCount 按有验收单的工单数去重 / avgCostPerAcceptance 单位验收成本）+ byAcceptance 验收单明细（cost 降序上限 50，acceptanceTitle 空回落工单标题）+ byIssueType 返工分布（上限 10） | CAP-C-06 / GAP-T-51 | ai-hub.service.spec 7 用例（空数据/正常归因/返工血缘 2/3 占比/projectId 过滤） | openapi.json +264 行；双份 api-types.gen 再生；能力清单 C-06 置 doing 注记 |
| server | **dashboard 预算偏差诚实降级**：`budgetDeltaPct` 硬编码 0 改 nullable null（预算基线未配置），响应类型同步 | G8 顺带 | dashboard.service.spec null 断言 | DTO 契约 nullable |
| frontend | **analytics Cost Tab 新增「验收归因」区**：汇总卡三数字（单位验收成本/返工成本/返工占比）+ 验收单明细表（验收单/工单/类型/执行次数/返工次数/成本）+ 工单类型返工分布条形列表；use-acceptance-attribution hook；空态诚实文案 | CAP-C-06 / GAP-T-51 | analytics-page.test 12 用例（正常流/空态流） | i18n 双语言键；新增组件入 analytics 模块 |
| frontend | **dashboard 成本卡下钻**：点击跳 `/app/analytics?tab=cost`（CostDialog 弹窗随之退役），budgetDeltaPct null 显示「预算基线未设置」降级 | CAP-C-06 | dashboard-page.test 5 用例 | 孤儿 i18n 键（dashboard.cost.vsBudget 等）留清理批 |

**上线套装进度**：批二余留 C-06 ✅（本版）；A-03/A-14 → v0.7.9/v0.7.10；A-18 → v0.7.13。

## [0.7.7] - 2026-10-01

### v0.7.7 发版总览——收纳版：AI 成员个人页工作台重构 + 图表双引擎 + PromptEditor 统一 + 上线套装前全量收编

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend/server | **CAP-A-02 增强「AI 成员个人页结构重构」六项**：任务清单 tab（`/issue-assignees/member/:id`）· 团队与项目层级 tab（TeamProject 关联）· 活动 tab 真实数据流（`/execution/runs` subjectId 过滤 + `/members/:id/usage-summary` 成本聚合）· PromptEditor 落地 member 层 · 工具授权三层化（MemberToolGrant +config Json 列，`resolveForMember` 消费）· 技能/MCP 双来源（CLI 本地资产发现 cli-asset-scanner） | CAP-A-02 / GAP-T-49 | member-card.service.spec 117 行改动 + 前端三新组件；契约三件套同步（openapi +532 行） | openapi.json / 双份 api-types.gen 再生 |
| frontend | **CAP-A-15 管道项目聚焦切片废弃**：全局聚焦器与六站联动全删，六站筛选回归页内自治；?project 深链与后端 projectId 参数保留 | CAP-A-15 / GAP-T-27 关账 | pipeline-focus 测试随删；六站页自治 | 能力清单切片置 gap |
| frontend | **批 9 十一件死组件物理删除** + 晨批（text-md 升格正式 token / 统计卡余留 / comfortable 档启用）：direction/navigation-menu/sidebar/thinking-stream/batch-create-tasks-dialog/task-board/task-detail-drawer/task-rows/bug-template-helper/doc-category-chips/filter-panel | 组件治理线 | 全库零引用核实后删；registry/decisions.json 同步 | component-review-decisions.json 对账 |
| frontend | **CAP-C-06 图表双引擎切片**：全局仪表盘四趋势面板收编 ChartCard+ui/chart 正式栈（Glance 结论标题/编码 hint/footer 签名行/动画 stagger）+ Lupi 全屏精读弹窗（lupi-chart-dialog + health-hairline/delivery-paired-rungs 双模板 iframe 参数化，点击重播）+ ChartCard 内间距归一 16px + ui/dialog 新增 size=full 档 | CAP-C-06 / GAP-T-50 | dashboard-page.test 新建 + chart-card.test +1；模板 stub-DOM 实跑双模式几何验证；前端全量 1499 用例绿 | lieflat-charts skill 语法入产品 |
| frontend | **PromptEditor 四条调整 + 五消费方接线**：编辑态固定高度（缺省 240）+ 拖拽手柄调高（160~800）+ meta 行「字符·约 tokens」+ injectionKey 注入徽标 + defaultValue 空值回落；member/team/project/settings/project-role/issue 六处消费方统一 | CAP-A-24 延伸 | prompt-editor.test 167 行扩展；i18n promptEditor 段双语言 | 编辑组件统一收敛 |
| frontend | **Sheet 宽度覆盖失效修复**：基件宽度默认档从 data 双变体链改按 side JS 注入纯类（tailwind-merge 不去重变体链、属性选择器特异性反杀消费方覆盖） | 用户实机反馈 | twMerge 实测三消费方输出 | — |
| frontend | **死选择器 `data-[x=true]` 形态全库排查批**：9 文件 29 处逐一核实渲染端——calendar/input-otp/combobox/select/drawer 均为自写渲染端输出 "true" 的配套活选择器（React 布尔 data-* 不折叠），navigation-menu 已随批 9 删除，**零需修**；base-ui 空串死法确认已于 d7596124 收口 | 夜航遗留裁决项 | 渲染端逐处证据（calendar.tsx:206-208 等 + react-day-picker 9.14.0 内部输出） | CHANGELOG 排查结论入账，禁止按形态盲改 |
| frontend | **测试时钟炸弹拆除**：里程碑页迭代状态用例日期写死 09-30，真实时钟 10-01 翻转「已结束」恒挂——quality:gate 2026-10-01 实锤；改相对 now ±7 天动态化 | — | 单文件 7/7 绿 + 全量重跑绿 | 依赖真实时钟的写死日期用例教训入账 |

### 死选择器 `data-[x=true]` 形态全库排查批——9 文件 29 处逐一核实渲染端，零需修（2026-09-30）

> 夜航报告 2026-09-30 §四遗留待裁决项的收口。判定规则（继承 d7596124 修复批证据链）：base-ui 布尔 state 渲染空串属性（`data-pressed=""`），`=true` 形态选择器恒不匹配；但 React 对自写 `data-x={true}` 输出 `"true"` 字符串，配套选择器存活。

| 文件 | 判定 | 证据 |
|---|---|---|
| calendar（2 行 13 处） | **活，不动** | 渲染端自写 `data-range-start={modifiers.range_start}`（calendar.tsx:206-208）+ react-day-picker 9.14.0 内部输出 `"data-focused": modifiers.focused \|\| undefined`（布尔 true → `data-focused="true"`），与 `data-[range-*=true]`/`group-data-[focused=true]/day` 配套 |
| input-otp / combobox / select / drawer | **活，不动** | 各自渲染端自写布尔：`data-active={isActive}`、`data-chips={!!anchor}`、`data-align-trigger={alignItemWithTrigger}`、`data-modal={modal}`——React 布尔 data-* 输出 "true"，选择器配套 |
| navigation-menu | 已随批 9 物理删除（2026-09-30 晨批） | 文件不存在，账面清零 |

**结论**：base-ui 空串死法已于 d7596124（六文件 27 处）收口；剩余 `data-[x=true]` 形态均为 coss 配方「自写渲染端 + 配套选择器」活模式，禁止按形态盲改（改存在性选择器虽兼容 "true" 字符串，但破坏配方与上游一致性且无收益）。

### CAP-C-06 图表双引擎切片——Glance 层 lieflat 语法重设计 + Lupi 全屏精读弹窗（2026-09-30）

> requirement-intake 五步落账（能力清单 CAP-C-06 切片注记 + GAP-T-50）。仪表盘图卡二分升级：产品内 Glance 层按 lieflat-charts skill 语法重设计；Lupi 精读层进全屏弹窗；报告导出仅预留按钮（用户三向裁决）。

| 变更 | 内容 | 证据要点 |
|---|---|---|
| Glance 层语法重设计 | 四张趋势卡：交付节奏卡标题写结论（动态判断「积压消化中/新建快于完成/进出平衡」，sum(tasks) vs sum(velocity)）；hint 升级为编码说明（「一柱 = 一天 · 质量 N%」「满分 100 · 一柱 = 一周」等，原四个装饰性副标题删除）；ChartCard 增 footer 来源行槽（`DELIVERY · LAST 7 DAYS` 式 lieflat 四件套签名，text-3xs tracking-widest 纯拉丁豁免档）；动画对齐宪法 §7（animationDuration 240 + 双柱 stagger 80ms） | dashboard-page.test 更新（结论标题/编码 hint/签名行断言）+ chart-card.test +1（footer 渲染分界） |
| Lupi 全屏精读弹窗 | 新组件 `lupi-chart-dialog.tsx`（ui/dialog 新增 `size="full"` 全屏档——§19.4 D2 组件内变体轴）：健康分/交付节奏两卡 action 区精读入口 → 全屏弹窗 iframe srcDoc 注入参数化 lieflat 模板；首批两图型 `lupi/health-hairline.html`（B2 hairline line 改周健康分：日历地板发丝+折线 draw+top-2 峰值标数）+ `lupi/delivery-paired-rungs.html`（C2 paired rungs 改日交付节奏：淡梯=新建/实梯=完成、1 档=1 任务）；数据契约 LupiHairlinePayload/LupiPairedRungsPayload，占位符注入空值回落演示数据；模板遵 skill 法典（结论标题四件套/入场动画 stagger/prefers-reduced-motion/纸面观感固定不随主题） | 两模板 stub-DOM 实跑双模式验证（演示 32/58 元素、注入 20/27 元素几何计数精确）；lupi-chart-dialog.test 3 用例（注入 JSON/几何标记/导出预留 disabled） |
| 导出预留 | 弹窗 footer「导出报告」Button disabled + 即将上线 title；报告 AI workflow 生成显式不在本切片 | 后续按 C 线立项（能力清单注记） |
| i18n | panel 段增 17 键（编码说明×4/结论标题×4/lupi×9）；删 4 装饰副标题 + productivity 死键 | zh-CN+en 脚本校验（missing 0/dead 0） |

### Sheet 宽度覆盖失效修复——基件宽度默认档从 data 双变体链改为按 side JS 注入纯类（2026-09-30）

> 用户实机反馈执行详情 Sheet 远窄于声明的 `sm:max-w-2xl`。根因：ui/sheet 基件把宽度默认档写成 `data-[side=right]:sm:max-w-sm` 双变体链——tailwind-merge 不去重变体链不同的类，属性选择器特异性 (0,2,0) 反杀消费方单类 `sm:max-w-2xl` (0,1,0)，全部右侧 Sheet 在 sm+ 被钉死在 384px。

| 变更 | 内容 | 证据要点 |
|---|---|---|
| 基件修复 | `components/ui/sheet.tsx`：`w-3/4`+`sm:max-w-sm` 从 CSS data 变体改为按 `side` prop 在 JS 条件注入（仅左右侧），`data-side` 属性保留作样式钩子；消费方 `sm:max-w-*` 覆盖经 tailwind-merge 正常去重生效 | frontend `tsc -b`+eslint 零错；notification-center-page 5 用例绿；twMerge 实测三消费方输出：执行详情 `w-full sm:max-w-2xl`(672px)、Linear `sm:max-w-lg`(512px)、画廊 demo `max-w-sm` 不变 |

### ChartCard 内间距归一治理——上下 30/28px 收敛到与左右一致的 16px（2026-09-30）

> 用户实机反馈图表卡上下留白过大。根因：Card 基类 `py-3.5`/`gap-3`（为裸卡设计）与 ChartCard 自带 `p-4` 的 CardHeader/CardContent 叠加计账——卡顶 30px / 标题→图 28px / 卡底 30px，而左右仅 16px。

| 变更 | 内容 | 证据要点 |
|---|---|---|
| 组件级治理 | chart-card 壳上 `className="py-0 gap-0"` 归零 Card 基类间距，四边与标题→图全部收敛到 p-4 单一来源（16px），上下与左右一致 | chart-card.test 4 用例绿；全局仪表盘 4 卡 + project-overview-charts 2 卡 + design-system 画廊卡全消费方同步受益（卡总高各降约 26-44px） |

### 全局仪表盘四张趋势面板图表栈升级——ChartCard+ChartContainer 正式栈收编手搓 div 图（2026-09-30）

> 依据设计宪法 §17（图表唯一实现 ui/chart、色板只用 --chart-1..5、空态 EmptyState、aria-label MUST）收编全局仪表盘页四处手搓 div 条/柱为正式图表栈；数据层与钻取弹窗不动。

| 变更 | 内容 | 证据要点 |
|---|---|---|
| 新组件 global-overview-charts | 四面板（团队生产力/健康分趋势/团队表现/成本概览）换 semantic/chart-card + ui/chart（recharts 封装）：生产力 grouped 双柱（tasks/velocity；quality 为 0-100 百分比量纲与计数不同轴，不上坐标系、摘要化进卡头 hint「质量 N%」）、健康分单系列柱+柱顶 LabelList+Y 轴 0-100 定域、团队表现/成本概览横向条形图（layout vertical + 条尾 LabelList，成本条尾「金额 · 占比」） | 新增 dashboard-page.test 2 用例（四卡标题/quality hint/aria img role/全零空态）；全量 1483 用例绿 |
| 宪法 §17 合规 | 色板每图系列按序 --chart-1..5（深浅模式 token 齐备）；四图 aria-label 概括结论；生产力全零（tasks+velocity 全 0）渲染 EmptyState 禁空白坐标系；X 轴日期 formatDateShort | lint:palette/ui-governance/registry（64 组件，新件已登记 COMPONENTS.md）/spacing/icons 全绿 |
| i18n 双语 | dashboard.panel 增 qualityHint/chartEmpty/aria×4；删 productivitySub/legendQuality（系列信息由图例承接、质量由 hint 承接） | zh-CN+en 双语键同步 |
| 顺带清障 | member-tasks-section 存量 `bg-amber-500` → `bg-accent-yellow`（分支 HEAD 上 lint:palette 存量红修复；另 data-list.tsx `left-[64px]` 任意值为 Linear 呼吸感批活跃工作区，未动） | lint:palette 全库通过 |

### CAP-A-02 增强「AI 成员个人页结构重构」——任务清单/真实活动流+成本预览/团队→项目层级/PromptEditor/工具授权三层化/技能 MCP 双源（2026-09-30）

> 用户 /goal 开工令（分支 feat/ai-member-page-restructure）；requirement-intake 五步登记（能力清单 CAP-A-02 增强注记 + GAP-T-49）。AI 成员个人页从静态档案升级为工作台。

| 变更 | 内容 | 证据要点 |
|---|---|---|
| 任务清单 tab | 前端新 tab 接现成 `GET /issue-assignees/member/:id`（指派 + 任务/项目摘要，状态点/优先级/项目色点），`useMemberTasks` hook | team-member 模块 8 用例绿 |
| 个人提示词 PromptEditor | overview tab 裸 `<pre>` 只读换 `shared/prompt-editor`（MarkdownLiveEditor 编辑态 + 字数 + 保存中指示），防抖 1.5s PATCH `personalPrompt`，服务端值变化重置草稿防回写竞态 | 渲染期 prevData 同步模式（无 effect setState） |
| 团队与项目合并 | 「参与项目+所属团队」两 tab 合并为层级视图：团队节点下挂 `TeamProject` 关联项目（先团队、团队再项目），直绑项目单列（`card.projects[].source` 区分 direct/team）；member card `teams[].projects` 后端补齐 | member-card 单测 +4（层级/usage 3 例） |
| 活动真实数据 + 成本预览 | 活动 tab 升级三段：成本预览 StatsCard（总 Token/成本/执行次数/最近执行 + 按模型分解）+ CLI 调用记录（`GET /execution/runs` 新增 `subjectType`+`subjectId` 过滤）+ MemberActivity 流；新端点 `GET /members/:id/usage-summary`（AIUsageLog 按 executionRunId 聚合；人类成员诚实零值 scope=human） | member-card 单测覆盖 AI 聚合/人类零值/无 run 短路三路径 |
| 工具授权三层化 | `MemberToolGrant` +`config Json` 列（cli_tool 行存 `{model, thinkingLevel}` 覆盖，空=回落 CLI 默认）；`GET/PUT /members/:id/tool-grants` DTO 透传 config；派发链消费：`runDispatch` 步骤 5.5 成员授权行模型覆盖（优先级：请求显式 > 授权行 > CliProviderConfig.model），`buildMemberPromptContext` 思考强度覆盖（授权行 > Member.thinkingLevel）；UI 选中 CLI 后展开模型（自由输入）+思考强度（CapsuleSelect）覆盖配置 | 迁移 `20260930000000_member_tool_grant_config`（dev.db+template.db 双库登记）；cli-dispatch+team 107 用例绿 |
| 技能/MCP 双源 | 新 `CliAssetScannerService`（best-effort 读本机 CLI 资产：claude-code/zcode/opencode skills 目录+SKILL.md frontmatter、claude-code `.claude.json`/codex `config.toml` mcpServers；读不到=空+note 不抛错）+ 端点 `GET /cli-providers/:id/assets`；tool-grants catalog 合并 CLI 条目（refKey 命名空间 `cli:<providerId>:<key>`，`source: platform|cli`）分组展示；技能提示词段双源合并：平台 SkillConfig 全文注入（现状）+ CLI 授权条目聚合为「本机可用资产」清单段（技能+MCP），`buildSkillsPromptSection(projectId, memberId)` | scanner 纯 node:fs 无新依赖；i18n 双语 4871 键同步 |
| 契约三件套 | openapi.json（+530：usage-summary/assets 端点、card teams[].projects、grants config/source、runs subjectId）+ 前端/apm-shared 双份 api-types.gen.ts 重生成 | `contract:check` 零漂移 |

> 诚实降级：AIConversation/AIMessage 无 memberId 维度（createdBy 是 User），「对话数据」对 AI 成员的口径 = 执行记录（CLI 会话），对话级混流留待接入层演进；远端 runtime 场景的 CLI 资产发现通道同（本轮 standalone 同机扫描）。

### CAP-A-15「管道项目聚焦」切片废弃——六站项目筛选回归页内自治（2026-09-30）

> 用户裁决「直接删掉聚焦功能，留给各个页面自己调整」；能力清单 A-15 卡切片置 gap（GAP-T-27 关账）。废弃根因：全局聚焦与六站「仅初值」消费模式天然脱节（页内筛选改动不回写、跨站即弹回）、入口 text-3xs 藏分组头难发现、侧边栏折叠后选择器消失而过滤仍生效（盲飞）。

| 变更 | 内容 | 证据要点 |
|---|---|---|
| 删除 | `shared/layout/pipeline-focus.ts`（URL/store 双写 hook）及测试、shell-layout `PipelineFocusFilter`（含 SelectField/useProjectList 孤儿 import）、i18n `shell.pipelineFocus.*` 双语键 | tsc -b 0 错；全仓 `pipeline-focus|focusProjectId|pipelineFocus` 零残留 |
| 六站解耦 | tasks（conditions 聚焦预置分支删）/ executions（projectFilter 初值 'all'）/ acceptance（useAcceptanceList 去 projectId）/ intake（双 useDocuments 去 projectId、AnalysisDraftDialog 去预置归属）/ repository-list（projectIds 初值 []）/ ai-surface 四件（lane-strip 跳转去 ?project 联动、scopeNote 固定「全部项目」、dispatch/summary/lanes/queue/narration 全部无参） | 触及 5 测试文件改写全绿（39 用例）；acceptance/intake 各留一条「查询不携带 projectId」守卫 |
| 自治保留 | 各页页内项目筛选（issues chips / repositories 多选 / executions 下拉）与 `?project` 深链（release-list 自读消费）不动；后端 documents/acceptances/releases 三端点可选 projectId 参数保留 | release-list 仅注释口径更新；后端零改动 |

## [0.7.6] - 2026-09-30

### 晨会裁决执行批——批 9 十一件物理删除 + 死选择器晨批 + text-md 升格（宪法 v2.6）+ 统计卡余留收口 + comfortable 档启用（2026-09-30）

> 2026-09-30 晨会 11 项裁决的代码批兑现（分支 chore/design-batch9-and-fixes）；桌面 v0.7.6 已代发布（Latest）、旧 draft 五份清理、stash 与已合流分支清理。

| 批 | 内容 | 证据要点 |
|---|---|---|
| 批 9 物理删除 11/11 | direction / navigation-menu / sidebar / batch-create-tasks-dialog / task-board / task-detail-drawer / task-rows（含自身测试，晨会复核维持：三处字样均为注释非 import）/ bug-template-helper / doc-category-chips（连带 entity-templates.test 两组用例）/ filter-panel（含自身测试与 project-list-page.test vi.mock）/ thinking-stream（含画廊 ① 段 demo 与断言改 4 类）；逐项单独 commit + registry/decisions 双账同步销（action=deleted + executedAt） | 每笔 tsc -b 0 错；触及测试绿；check-component-registry 门禁 90/90=100%；COMPONENTS.md 再生（329 条目，待裁决 0） |
| 死选择器晨批 | 夜航波及 9 文件逐文件核实 data 属性来源（诚实降级）：仅 3 处真死修复——label / input-group addon 的 `group-data-[disabled=true]`→存在性 `group-data-disabled`、画廊 Collapsible demo `data-[panel-open=true]`→`data-[panel-open]`；其余 6 文件（combobox chips / select align-trigger / drawer modal / calendar 全族 / input-otp active）经核实为 React 手写布尔或第三方字面值渲染，`=true` 形态存活有意保留；navigation-menu 已随批 9 出清单 | tsc 0 错；画廊 1 用例绿；check-tailwind-arbitrary 过；视觉复活预告：表单禁用 label/addon 变灰、画廊箭头旋转 |
| text-md 升格（宪法 v2.6） | `--text-md: 15px` 入 @theme（sm/base 间唯一中间档，Linear 对标列表标题档）；task-simple-list / release-list-page 两处 `text-[15px]`→`text-md`；check-tailwind-arbitrary 白名单移除该条目；twMerge 对 t-shirt 尺码天然识别无需登记；PRINCIPLES v2.5→v2.6（§3.1 表 / §十二 D3 / 头部版本说明，字阶 8 档→9 档） | tsc 0 错；受影响 10 用例绿；任意值门禁过 |
| 统计卡批二余留 | ① trend/trendValue 槽位消亡移除（up=绿/down=红 对「成本/错误上升」类指标语义反向无法统一）：dashboard 成本卡顺带修反向 bug（原渲染「成本上升=绿色+」且 budgetDeltaPct 恒 0 假数据）、project-dashboard 健康卡 30d 趋势真值并入 hint 不丢信息、画廊 demo 去 trend 字段；② columns 封闭响应式档：新增 responsive prop（默认 false 零变化，md 以下 3 列及以上降 2 列），页面侧待验收按需接 | tsc 抓出 2 个真实消费方（纠正晨会「业务零消费」前提，处置入账）；tsc 0 错；两 dashboard 3 用例绿 |
| comfortable 档启用（F 类收官） | 两步：member-list / team-list DataList 传 size=comfortable；admin 三区（用户账号/邀请/成员）Table 传 size=comfortable（ui/table Context 透传链 F 类已就绪，本批接线） | tsc 0 错；触及 15 用例绿；视觉变化：五处列表行高 32→40px |

## [0.7.6] - 2026-09-30

### v0.7.6 发版总览——设计系统三层分层收口：语义组件层与画廊覆盖率门禁 + 列表呼吸感改版 + 组件裁决清账

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **设计系统语义层大批（G 类 + H 类 + 统计卡归一）**：物理搬移八簇收官（raw 3 / semantic 31 / ui 69，R1–R6 零违例）；semantic 组件层九件落地（stats-card 双形态标准件、chart-card/stat-tile/metric-row、status-pill/icon-stack/activity-heatmap、nav-status-dot/theme-mode-card、subtask-badge）；画廊覆盖率门禁 ui+semantic 双层 93/93=100% 机器强制（galleryExempt 豁免槽位 fail-closed + 12 件补 demo + Registry 对账区）；统计卡七套并行实现归一（ui/stat-card 收编 featured 变种、ui/stats-card 退役）；page-header 51 渲染点全量补槽 | 组件治理线 | 339 用例绿；门禁 93/93=100%；tsc -b 0 错；registry 342 条双向对账零缺失 | docs/design G/H 类方案五份；COMPONENTS.md 全量再生；PRINCIPLES §19.4 语义组件优先 |
| frontend | **列表 Linear 呼吸感改版 + 组件裁决 36 条收口 + 画廊意见批**：DataList 判定区整槽/树线行级 absolute/双平面化/visibleItems 扁平化/hover bg-accent；任务列表分页器拆除滚动全量、子任务挂树；发版列表换 DataList 基座；StatusIconFrame list 档 22px + semantic/subtask-badge 新件 + MemberAvatar 在线点统一 + ColorPicker 16 色三段同宽 + Tabs segmented 死选择器修复；组件裁决 11 删（限期 2026-10-31，物理删除待批）/2 internal/5 canonical/17 standby，decisions.json 首建 | 组件治理线 | 改动测试 66 用例绿；registry 门禁 90/90=100%；COMPONENTS.md 再生（canonical 306/standby 17/internal 4） | component-review-decisions.json 首建；registry 状态总账；PRINCIPLES 排版裁决回写 |
| frontend | **base-ui data 口径死选择器修复批**：实锤三类死法（布尔 state 空串渲染 / radix 残留属性名 / 裸命名形态）纠正六文件二十七处（field/toggle-group/separator/slider/button-group/tabs 漏网）；测试自证陷阱（field.test 手动喂活属性）入账 | 组件治理线 | tsc -b 0 错；field 13 + design-system-page 1 用例绿；eslint 0 error | 全库另 9 文件同源形态留晨会裁决清剿批 |

### 前端设计治理——组件裁决 36 条收口 + 画廊意见批 + Linear 呼吸感批 + 死选择器修复批（2026-09-30 夜航收口）

> 2026-09-29 三大会话成果（组件裁决三轮提问逐条拍板、画廊实机验收四~五轮、死选择器五件排查）的夜航托管收口：五笔提交（4e795c23 / 33555f99 / b20fe108 / 8149e33d / d7596124）。

| 批 | 内容 | 证据要点 |
|---|---|---|
| 组件裁决 36 条收口 | `component-review-decisions.json` 首建（批 9 唯一驱动文件）；registry 状态总账落位：11 件 deprecated 限期 2026-10-31（direction/navigation-menu/sidebar/batch-create-tasks-dialog/task-board/task-detail-drawer/task-rows/bug-template-helper/doc-category-chips/filter-panel/thinking-stream）、2 件改判 internal（anchored-menu/view-display-popover）、5 件 canonical 转正（autocomplete/chip/chart-card/stat-tile/metric-row）、17 件 standby、dropdown-menu 维持限期 2026-12-31；**批 9 物理删除未执行，待用户晨会批准后逐项单独 commit** | check-component-registry 同源一致断言改写；COMPONENTS.md 再生（canonical 306/standby 17/internal 4/review 0/deprecated 12） |
| 画廊意见批（组件级） | StatusIconFrame 新增 list 档 22×22（StatusChip 唯一实现）；`semantic/subtask-badge` 新件（环 18px + text-xs 计数，G8 封闭 props）；IssueTypePill 增 `icon` 变体（裸图标+类型色）；MemberAvatar 在场徽标统一为在线状态 + overflow-hidden 截断修复（裁剪内移内容层）+ 空态附件式虚框；ColorPicker 色板 15→16（8×2 整行护栏）+ 选色器 234px 三段同宽；Tabs segmented 死选择器修复（base-ui 无布尔 data-horizontal，8 处裸选择器纠正为 `data-[orientation=…]`）并规范化对齐 segmented-control | tsc -b 0 错；改动测试 66 用例绿（component-review-board/design-system-page/member-avatar/subtask-badge/data-list/tasks-page/release-pages/command-palette） |
| Linear 呼吸感批（列表行为） | DataList：checkbox 判定区铺满整槽（28px×行高 stopPropagation）、树线挂行级 absolute 贯穿（left-[55px] 与行首列宽强耦合，已三次同步）、分组/非分组双平面化解除卡片面、visibleItems 扁平化含子行（键盘遍历与批量选中不漏子任务）、hover 统一 bg-accent；TaskSimpleList 子任务挂树（列表内归簇 + renderChildren 递归）；tasks-page 分页器拆除（PAGE_SIZE 50→1000 滚动全量，?page 深链忽略，i18n 六键→两键）；release-list-page 换 DataList 基座（RELEASE_STATUS_VISUALS 六态）；status-visuals PRIORITY medium info→default 降灰（颜色只留给高优先级） | 同上测试绿 + tsc 0 错 + eslint 0 error；行首元数据 hover-only 方案经用户否定（「行内元数据勿用 hover-only」偏好入账） |
| 死选择器修复批 | base-ui data 口径实锤纠正六文件（证据链：getStateAttributesProps 布尔 state 渲染空串、枚举 state 渲染带值）：field 三处布尔 `=true`→存在性、toggle-group `data-[state=on]`→`data-pressed`（radix 残留）+ 十处裸命名、separator/slider/button-group/tabs-line 十七处裸 `data-horizontal|vertical`→`data-[orientation=…]`；测试自证陷阱警示（field.test 手动 `data-invalid="true"` 喂活死选择器） | tsc -b 0 错；field 13 + design-system-page 1 用例绿；eslint 六文件 0 error；全库另 9 文件疑同源（data-[x=true] 形态）留晨会裁决清剿批 |
| 任意值白名单补录 | check-tailwind-arbitrary 补 `text-[15px]`（用户拍板标题档）与 `left-[55px]`（树线锚点几何硬编码）两条并注明理由 | frontend 全 lint 链 0 error |

test_evidence：`pnpm quality:gate` 除 server e2e 4 条长寿库 local-only 用例外全绿（office 1 + playbook 3 经 origin/develop 基线 detach 复跑完全同挂实证豁免，assistant-cli-chat EPERM 为已知 Windows 环境 flake 单跑即过）；contract:check 契约零漂移；api:audit 97.3%。doc_impact：本文件 + component-review-decisions.json + registry.ts 状态标注。

### 前端设计治理——H 类批 H1-H3：画廊覆盖率门禁落地，registry ↔ 画廊闭环 100%（2026-09-29）

> 承接 H 类方案（docs/design/修改方案-H类-画廊遍历渲染-2026-09-29.md，六项决策含排版两项当日全部落定）：兑现 registry.ts / gen-components-md.mjs 两处头注宣称的「画廊覆盖率恒 100%」——实测起点 73/97 = 75.3%（24 件未收录），收官 **93/93 = 100% 且机器强制**。

| 批 | 内容 | 证据要点 |
|---|---|---|
| H1 · 豁免槽位与对账闭环 | registry 增显式 `galleryExempt` 槽位（fail-closed：一句话理由、单行字面量、demo 豁免 ≠ 清退豁免）；12 件豁免登记（6 件 review/standby 待裁决死件「proposal=delete 随裁决清退，改判 keep 则豁免失效」+ 4 件运行时挂载件 + 2 件 .ts 工具件）；两脚本解析同步（check 用 tail 提取、gen 的 ENTRY_RE 扩非捕获组）+ 生成器豁免列（`画廊豁免` 说明后缀 + 治理计数表口径注释） | check-component-registry 341 条解析对账过；COMPONENTS.md 再生含豁免标记 |
| H2 · 补 12 件 demo | canonical 缺口全部收录：6 件并入既有分区（form+field→Forms、table→Table、chart→Charts、right-sidebar→Page Layout、quick-cards-toggle→Page Header、ai-agent-badge+ai-context-summary→AI High-Density Cards）+ 4 个新 section（data-table / item / sidebar-panel / tab-bar）；覆盖 73/97 → 83/95（门禁前口径） | `tsc -b` 0 错；eslint 改动文件 0 error 0 warning（RhfFormDemo 按 F3.6 铁律不经 `<form>`，handleSubmit 按钮直调） |
| H3 · 门禁转 error + 对账区 | §4.2 ④ 升级硬门禁：分母扩 **ui+semantic 双层**（semantic 首次纳入机查；internal 按 G6、galleryExempt 显式豁免排除）、无基线缓冲、missing 计入 errors 阻断；画廊新增「Registry 对账区」section（Governance 组、正文末尾、紧凑表格——按 COMPONENT_REGISTRY 遍历渲染豁免账，排版经用户裁决）；两处头注修订为如实兑现形态 | 门禁自证闭环：删 data-table import → check 红并点名缺失件 → 恢复 → **93/93 = 100% 绿** |

test_evidence：`check-component-registry.mjs` exit 0（341 条五态校验 + 画廊门禁 93/93）；`tsc -b` 0 错；eslint 改动文件 0 error 0 warning；生成器幂等再生过。doc_impact：本文件 + registry.ts 头注（② 同源链兑现形态）+ gen-components-md.mjs 头注 + H 类方案落地勾记。

交接备注：semantic/stats-card 曾短暂未登记（归一批半成品），本批收官时归一批已自行完成登记与画廊收录，门禁双口径未打出误报；「semantic/raw 目录双向对账」未纳入门禁（归一批并行期内避免误伤，登记为 H 类余留，随归一批收口后可补）。

### 前端设计治理——统计卡归一批：ui/stats-card 升格语义层标准件，ui/stat-card 收编为 featured 变种，七套并行实现归一（2026-09-29）

> 用户裁决：「以 1 号场景 StatsCard 作为标准场景，将 stats-card 移动到语义层，并作为绝大多数同类场景的唯一选择；2 号项目详情页的摘要大卡作为 stats-card 的变种，承载更复杂的信息；卡片背景色和数字彩色作为可选项进行合并；字号等统一按 1 号场景为主。」调研基线：全库 7 套统计卡实现（ui/stat-card + ui/stats-card 双轨、semantic/stat-tile、analytics/dashboard/settings 三处本地 KPI/Stat 卡、acceptance 内联裸 JSX）+ 4 邻接件。

| 项 | 内容 | 证据要点 |
|---|---|---|
| 新增 `semantic/stats-card`（canonical） | 双形态：`compact`（原 ui/stats-card 横排瓦片，形态 class 逐字沿袭）+ `featured`（原 ui/stat-card 竖排摘要大卡，hint/trend/onClick 槽位）；卡底 `surface: card\|muted` 与数值彩色 `coloredValue` 为封闭可选项（分别收编 team-stats 灰底瓦片与 acceptance 数值着色先例）；装饰色 `tone` 八档封闭枚举（原 STATS_THEMES 词表 + orange 沿 metric-row）；字号统一 compact 基线 `text-xl font-mono tabular-nums`。props 面封闭（G8：无 className、无 HTMLAttributes），columns 为固定列 | registry 341 条（stat-card 条目删除、stats-card 转落 Semantic 区 canonical）；COMPONENTS.md 再生 |
| 退役 `ui/stat-card` + `ui/stats-card` | 双文件删除；registry 上 stat-card 的 `merge → stats-card` review 提案就此落账 | 全库零残留引用（仅registry/画廊/新件头注释留谱系记录） |
| 三处本地 KPI/Stat 卡收编 | dashboard-page 本地 `KpiCard`×7 → featured（下钻 onClick 保留）；settings ai overview-tab 本地 `KpiCard`×5 → compact（「label · hint」调用方拼装，danger→tone red）；analytics 本地 `StatCard`×16（Overview/Quality/Risk/Team 四 tab）→ featured | analytics 与 ui 同名的本地 StatCard（命名事故主角）就此消失 |
| acceptance KPIStats 内联收编 | 裸 JSX map 退役 → compact + `coloredValue`；数值彩色口径从「数值直染」收编为 tone 派生 | 圆角/字号随基线统一（rounded-xl→lg、2xl→xl mono） |
| team-stats-section 两处手写收编 | 4 张 Card 汇总卡 → compact（无图标）；4 张灰底居中瓦片 → compact + `surface: 'muted'`（完成率/逾期彩底改 coloredValue 数值着色） | 居中→左对齐、text-lg→xl mono 属归一统一代价 |
| 十页存量消费改道 | tasks/bugs/documents/executions/git repo-list/members/teams/member-detail/analytics cost/画廊：import 改 `@/components/semantic/stats-card`，`STATS_THEMES` 展开、`colorClass`/`iconColorClass` 自由串全部转 `tone` 封闭档；画廊 stat-cards 区改版（compact/featured/muted+彩色三段演示） | useMemory 三处 `statsItems` 补 `useMemo<StatsCardItem[]>` 显式标注（tone 联合类型防推宽） |
| 附带修复 | `check-ui-governance.mjs` overlay allowlist 补录 `project-settings-page.tsx`——F3.6 表单迁移⑨（931b4e27）迁 Dialog 时漏登记，lint:ui-governance 由此全程挂红（G1 批 test_evidence 已记为存量），本批按「只登记不改造」判例补录解锁 lint 链 | lint 十项治理脚本首次全过 |

test_evidence：`tsc -b` 0 错；frontend lint 十项治理脚本 PASS + eslint 全库 0 error（2066 warning 全为存量，改动文件净增 0）；受影响 5 测试文件（acceptance-list / analytics / project-dashboard / tasks / documents）33 用例全绿；`check-component-registry` 341 条五态校验过。doc_impact：本文件 + registry.ts（stat-card 退役、stats-card 转 Semantic）。

已知形态变化（归一统一代价，待实机验收）：① 数值字号全库统一 xl mono（原 2xl/lg 档页面变小）；② featured 可点卡 hover 抬升环改背景色反馈（§3.6 口径）、ArrowUpRight 角标不保留；③ analytics cost / dashboard 两排 KPI / settings overview / acceptance KPI 的响应式栅格档退化为固定列（G8 无 className 口径的交换，需要时另批裁决响应式档）；④ analytics 旧 trend 反向语义（up=红表恶化）不保留，Quality/Risk/Team 12 张 mock 演示卡的裸箭头丢弃、色彩信号由 tone 承接（真实数据的 project-dashboard 健康卡 trend 语义不变）；⑤ team-stats 项目瓦片居中→左对齐。semantic/stat-tile（弹窗灰底 mini 块）按裁决不并入本件，场景分工保留。

### 前端设计治理——G 类批 G1 语义组件层：NavStatusDot + ThemeModeCard 两件提取，主题状态模型补「跟随系统」三档（2026-09-29）

> 用户指令：「这个点有没有抽出来作为一个单独的语义组件 NavStatusDot？请帮我在对应位置注册，替换，并在 design system 页面注册」「设置页-外观-主题模式卡片应该抽出为语义组件，支持三个种类，日间、夜间、跟随系统三种模式，并改造当前组件」。两件按同一口径落地：`components/semantic/` 为新增组件默认落点，三源同源链（registry → COMPONENTS.md / registry → 设计系统页 / registry → lint:registry）一次接满。

| 项 | 内容 | 证据要点 |
|---|---|---|
| 新增 `semantic/nav-status-dot` | 提取自设置页导航圆点的内联实现；`label` 必填（§8.5#4 颜色之外的第二信号）、`role="img"` + `aria-label`/`title`；tone→class 走 §19.5 唯一色链（`ui/tone.ts`）；loading 态双层 ping 结构。提取时修掉两处存量缺陷：缺 `relative`（ping 层无定位祖先）、缺 `shrink-0`（被相邻 flex-1 文案挤扁） | 7 用例；`semantic/` 目录第二件，登记 `status: canonical` |
| 新增 `semantic/theme-mode-card` | 提取自 `appearance-section.tsx` 内联主题卡片（**连 Card 外壳一起抽**，用户裁决）；支持**日间 / 夜间 / 跟随系统**三档，`options` 键域与 `value` 同域（缺档编译期报错）；每档为 `RawButton` + `aria-pressed` 开关，选中另有 ✓ 徽标（非颜色信号）；`system` 档预览走左右分屏同时画两种主题 | 9 用例；`semantic/` 目录第三件，登记 `status: canonical` |
| 主题状态模型补「跟随系统」 | `ThemeMode` `'light' \| 'dark'` → 加 `'system'`；**意图与生效分离**：新增 `resolvedMode`（`system` 按 `prefers-color-scheme` 解析后的 light/dark）。落盘的始终是**意图**（否则「跟随系统」这个选择刷新即丢）；首屏无存量时默认 `system`（非行为变更——旧版首屏也取系统偏好，区别只是取完即写死）；监听媒体查询 `change` 实时换肤；`toggleTheme` 改为按**生效主题**取反（否则跟随系统 + 系统深色时点一下仍深色，观感像失灵） | `shared/theme/theme-context.test.tsx` 15 用例（jsdom 无 `matchMedia`，测试显式装桩，否则 system 档全部退化为「只测了 light」） |
| 消费方重指 5 处 | `mode === 'dark'` → `resolvedMode === 'dark'`：`ai-surface-page` / `ai-surface-replay-page` / `bottom-dock` / `shell-layout`（含依赖数组）/ `auth-visual-card`（`useSafeTheme` 同步改）；3 个测试 mock 补齐 `resolvedMode` | 修掉存量错档：跟随系统 + 系统深色时上述位置一律判成浅色 |
| 宪法附录 A.1 行 A8 | 新增豁免行 A8：`components/semantic/theme-mode-card.tsx` 的**预览缩略图字面色**（预览即字面色——改随主题走则浅色主题下画不出深色预览块，预览失真）。与 A5 中 `appearance-section.tsx` 同名性质，因该件已独立成组件故单列，范围随组件文件走 | 与 `check-palette.mjs` 的 `THEME_PREVIEW_EXEMPT` 谓词成对改动（附录与脚本必须同批） |
| ↑ A8 的范围诚实声明 | 该谓词落在 `EXEMPT`（**整文件**粒度，脚本只提供这一档），故实际覆盖不止预览字面色：本文件还命中**选中徽标的 `text-white`**（`bg-accent-blue` 底白字，与 C2 legacy 白名单 (b) 组同类）。此为提取时按「不夹带视觉变更」原样搬运的存量；改配对 `accent-foreground` 在浅色主题下是近黑色（`240 5.9% 10%`），会实打实换观感，故未改。附录行与脚本注释均已写明**这是登记在案的越界，不是已批准的设计**，清除计划为「待配套前景 token 补齐后收窄或拆两条」 | 主动披露，避免「豁免理由只写预览、实际放行整文件」成为不可见缺口 |
| i18n | 新增 `settings.systemMode` / `settings.systemModeDesc`，中英双包 | zh-CN / en 同步 |

test_evidence：`tsc -b` 0 错；eslint 改动文件 0 error（21 warning 全为既有形态告警，其中主题卡片两条 `no-visual-override` 系随标记从 `appearance-section.tsx` 平移而来，净增 0）；六治理脚本 PASS（`check-palette` / `check-semantic-classes` / `check-component-registry` / `check-layers` / `check-spacing-governance` / `check-tailwind-arbitrary`）；`check-ui-governance` 唯一失败 `project-settings-page.tsx: overlay import requires allowlist approval` 系**存量**（该文件本批未改、git 未修改）；触及域全量 38 文件 406 用例全绿。doc_impact：本文件 + `PRINCIPLES.md` 附录 A.1。

已知余项（未在本批处理，须另裁）：① **G8 props 闭包机械化已逾期**——语义组件已三件，`no-visual-override` 现开始命中语义组件内部的 `Card`/`CardTitle` className（本批两条平移而非新增），转 lint 的触发条件已满足；② 主题卡片**选中档文案色比未选中更淡**（疑似原三元写反）按「不夹带视觉变更」原样保留，属独立裁决项；③ 设置页各子路由新增的 30s `refetchInterval` 轮询与 `terminal-section` 假状态卡（§9.1 假常量）为并行会话在办事项。

### 前端设计治理——宪法 v2.5 升格：F 类九条入宪新章 §20「布局与组合」，Sheet 定位收窄（2026-09-29）：纯文档轮零代码改动

> 用户指令「完成宪法升格」，承接 F 类代码三批全量落地（前两条）。按 §11.2 修订流程五步走：①用户确认（J1–J18 裁决 + 本指令）；②版本号单点改 **v2.5**；③机器强制同步——六条由 `f-class-governance` 七规则与 `check-spacing-governance.mjs`（space-x 封禁）承载（均先行落地），20.7 形态可用性律 / 20.9 窗口二态制为 `评审` 强制并登记机器化候选；④本条即 CHANGELOG 声明；⑤存量违规经七规则全量扫描为 **0**，无豁免新增。

| 项 | 内容 | 证据要点 |
|---|---|---|
| 新章 §20「布局与组合」（容器层） | 九条零迁移 `[MUST]`：20.1 浮层串行律 / 20.2 页面居中容器禁手写（宽度四档母版分发）/ 20.3 标题图标分层（L1 必带 icon 槽）/ 20.4 弹窗内禁 SectionCard / 20.5 表单容器铁律（豁免=单项修改·内容编辑器·Inspector）/ 20.6 卡片嵌套三律 / 20.7 视图形态可用性律 / 20.8 按钮间距唯一律 / 20.9 窗口二态制 | 条文来源 `修改方案-F类-布局与组合-2026-09-28.md`；宪法其余章节管原子层、§20 管容器层与组合层 |
| §10.4 修订 | Sheet 定位收窄为内容展示/日志流；「轻量确认/短表单」档的「短表单」二字废除——Sheet 不承载实体表单（表单容器归 §20.5） | F3.6 排除令 1；现网 Sheet 3 消费方 0 表单，零迁移 |
| 章号避让 | F 类取 **§20**，19.x 继续为 E 类待升格账保留（附录 A.3：19.1/19.5/19.6 维持待办，19.2/19.3 永废、19.4 修订口径待机器强制） | 附录 A.3 同日已收窄入宪范围；A.3 补编号占用说明 |
| 决策记录 | 新增 **D13**：布局与组合（容器层）入宪 §20 + §10.4 收窄 + 章号避让 | 决策记录表 D1–D12 之后 |

test_evidence：docs-sync 过（frontmatter 校验 17 governed docs）；六条 lint 强制条款对现网全量 0 命中（前批 51e06807 落地即验）。doc_impact：F 类方案 frontmatter 状态改「落地完成」、批 F1 项 3 标注 ✅；本文件即 §11.2 第 4 步。余量：F 类唯一余项 = 批 F2 项 7 comfortable 档启用逐列表评审（实机后拍板）。

### 前端设计治理——F 类收官批落地（2026-09-29）：F3.6 表单容器迁移九项全清 + 批 F3 机器强制七条 + registry/DESIGN 善后，十四笔提交

> 承接组件侧批次：用户裁决「表单 9 项一次做完、document-preview 宽档豁免登记、批 F3 现在做、实机验收后再 push」。F 方案批 F1/F2/F3 三批代码工作至此全部落地（余宪法升格与 comfortable 启用评审两项非代码项）。

| 提交 | 项 | 内容与证据 |
|---|---|---|
| `f40f5ca0` | J16 收编余量 | 弹窗级 `max-h-[85vh]` ×9 迁 `max-h-dialog-scroll`（等值零视觉）；document-preview-dialog 宽档豁免登记（方案附二名册，F3.1 唯一剩余越界经用户裁决豁免） |
| `02dc35e6` | F×A-E 善后 | registry 三笔账：tab-bar standby→canonical（F 🔴-2 收编为准）、button-group 待查凭 F9.3 结案、task-detail-drawer canonical→review 公示（孤儿 0 importer，E1 制度）；DESIGN.md 地位勘正追加四行收编偏差 |
| `51e06807` | 批 F3 机器强制 | 新建 `f-class-governance` ESLint 插件六规则（宽度逃逸/页面手写居中/Card 嵌套/浮层互嵌/弹窗内 SectionCard/PageHeader 无 icon，warn 级），落地即对现网 0 命中；存量豁免内联白名单+方案附三双登记 |
| `951bb091` | F3.6 ①② | template-manager 项目/任务模板原地 form 迁 Dialog（新建/编辑两用，footer 改 DialogFooter 语义序） |
| `97a33275` | F3.6 ④ | repository-list 新建仓库 5 字段 form 迁 Dialog |
| `2a898b8e` | F3.6 ⑤ | github-panel 新建 PR ×2（完整版+侧栏嵌入版）内嵌面板迁 Dialog，按钮改纯入口 |
| `4e6f845a` | F3.6 ③ | task-detail 自定义字段批量编辑迁 Dialog，分区常驻只读 |
| `c784bb63` | F3.6 ⑦⑧（J14） | profile 资料卡转只读+「编辑」弹窗（页头全局 Save 卸除）、密码表单迁弹窗（关闭清字段） |
| `931b4e27` | F3.6 ⑨（J14） | project-settings 项目主档/git+terminal 两组保存各拆分组 Dialog，页面转只读键值行+分组「编辑」入口 |
| `615f5790` | F3.6 ⑥（J15） | document-new-page 跳页退役：unified doc 模式扩展 status 字段（胶囊选择；CreateDocumentDto 契约无 status，非 draft 创建后补 update），documents-page 入口改开弹窗，路由/页签/文件三退役 |
| `51e06807`→末笔 | 批 F3 第 7 条 | `no-standalone-form` 随九项迁移完成启用（祖先链判 Dialog，dashboard 快捷建任务单字段行按 F3.6 判据表「单项修改豁免」白名单）+ tabs-registry 断言随 J15 更新 |

test_evidence：每笔五治理脚本 + eslint 0 error + tsc 0 错；收口前端全量 192 文件 1436 用例全绿；docs-sync 过。doc_impact：F 方案批 F2 项 6/批 F3 状态与附三同步。余量：宪法升格（等 E 类收口定章号）、comfortable 启用逐列表评审、DESIGN.md「已由 F 类收编」标注仅完成偏差清单部分。

### 前端设计治理——F 类组件侧批次落地（2026-09-29）：J1/J6/J7 默认值、J2 wide 档、J5 行高轴、J11/J12 标题图标，五笔提交

> 承接同日纯结构批次：用户解除「组件内部样式」限制，F 方案批 F1 项 1/4 与批 F2 项 2/4/5 落地。宪法升格（批 F1 项 3，PRINCIPLES.md §11.2）与 F3.6 表单容器迁移（9 项 12 处，含 J15 页面退役/文档模式扩展，属交互重组非样式改造）仍待 E 类三层解耦路线收口后另批执行。

| 提交 | 项 | 内容与证据 |
|---|---|---|
| `45304dd0` | J1/J6/J7（批 F1 项 1） | DialogTitle 升 `text-base font-semibold`（78 处弹窗标题与正文同档收口）；CardFooter 补 `gap-2`（对齐 DialogFooter，60 importer 零破坏）；Tabs line 变体内聚贴边六件套为默认值（F5.1），唯一手写消费方（孤儿死件）卸下手写 |
| `e0e9071e` | J2（批 F2 项 2） | PageShell 补 `wide` 档（max-w-7xl）——F1.3 主栏宽度四档总表收齐；F2.2 口径结案：project-detail-frame 主栏 7xl 为 L2 母版自管分发（F1.2 条文本就规定详情页结构自管），非手写补位，X1 分叉随 wide 档落位消解 |
| `d8f3cf47` | J5（批 F2 项 4） | DataList/table 补 `size` 轴（dense 32 默认 / comfortable 40，F7.2 宪法 §4.2 实现落地）；data-list 三条渲染路径全穿线、table 走 Context 下发；comfortable 启用场景留批 F2 项 7 逐列表评审，本批只立轴不启用（渲染零变化） |
| `edefc891` | J11/J12（批 F2 项 5） | SubPageToolbar 增 `titleIcon` 槽——面包屑末项升「icon+标题」与 L1 对齐（F2.5②），icon 强制消费 entity-icons 唯一源（与 E8 合流）；task/bug/acceptance/repository/team/member 六详情页接线；linear-integration-section 页面标题图标改走 PageHeader icon 槽（J12/X8 唯一迁移项，骨架头豁免） |
| `c87a544e` | 批 F1 项 4 | 正向 `space-x-*` 封禁并入 check-spacing-governance（F9.1/F3.3 机器化）；实测校准：全仓正向 0 实例纯防回流，7 处现存均为负向 `-space-x-N` 叠层惯用法（lookbehind 排除不误伤）；`space-y-*` 为 F3.5/F6.5/F10.4 点名合法档不封 |

test_evidence：每笔过五治理脚本 + eslint 0 error + tsc -b 0 错；收口前端全量 Vitest 192 文件 1436 用例全绿。doc_impact：F 类方案批次表/状态同步。

### 前端设计治理——F 类「布局与组合」纯结构批次落地（2026-09-29）：J8/J9/J10 + F3.1 宽度阶梯 + J16–J18 高度，六笔提交零组件实现改动

> 承接 F 类方案（`docs/design/修改方案-F类-布局与组合-2026-09-28.md`，J1–J18 已全裁决）与 E 类裸组件路线废止裁决：先落 F 类中「只动结构、不动组件内部实现」的部分，为 E 类三层解耦路线重修让出 ui 层。2026-09-28 首轮 F 类代码改动随裁决撤下，本批为同口径重落地（`scripts/f-class/` 迁移脚本未入 git 已失传、存 stash 可找，本批改逐点手工迁移）；`ui/right-sidebar` 默认宽度常量是全批唯一 ui 层触点（J8 裁决实体本身），已独立成笔便于单独回滚。

| 提交 | 项 | 内容与证据 |
|---|---|---|
| `6c31112a` | J9（批 F1 债务清除） | 删 project-sidebar 拖拽 API（MIN/MAX/setWidth 全库 0 调用，shell-layout 只接 toggle）、`PROJECT_SIDEBAR_DEFAULT_WIDTH` 320→360 |
| `c642a946` | J8（批 F2 项 3） | 属性栏统一 360px、废除 320 档：ui/right-sidebar 默认值 + 六详情页删显式 `width={320}` 走默认链；project-right-sidebar / workflow-detail-page 经默认链跟随零编辑 |
| `49236798` | J10（批 F1 债务清除） | 清退死组件 view-switcher（全库 0 渲染）：registry 删条目 → gen-components-md 再生（335→334）→ check-component-registry 对账过；ViewMode 改 project-list-page 本地类型（与各列表页同构，grid 档暂留待裁） |
| `17a49b45` | J16/J17/J18（批 F2 项 8） | 高度迁移 17 文件 18 编辑：`--spacing-dialog-scroll` 80→85vh + assistant-fab 迁 `h-dialog-scroll`；面板头归一 h-12 ×3；滚动区四档封闭表 40/64/80/96（48→40×1、56→64×4、72→80×6、60vh→96×2） |
| `063b7064` | F3.1（批 F2 项 1） | 弹窗宽度数字档 14 处就近迁五档语义阶梯（100→sm、110/120→lg、140/150→xl、160→2xl；dashboard 七弹窗按 J3 逐个判均 StatTile+列表信息型、全归 xl）+ linear-projects-table `max-w-3xl`→`sm:max-w-2xl` |
| `43975392` | F3.1 越界活案例 | run-details 画布型 Dialog（max-w-5xl+85vh 全站唯一越界）迁 Sheet 2xl 档——「日志流归 Sheet 不归 Dialog」示范；同为 base-ui Dialog.Root 原语，四个消费方 props 不变零改动 |

test_evidence：每笔过 pre-commit 五治理脚本（spacing/palette/registry/semantic/ui-governance）+ eslint 0 error + tsc -b 0 错；收口跑前端全量 Vitest 192 文件 1436 用例全绿。doc_impact：F 类方案批次表/状态同步本批。余量登记：弹窗级 `max-h-[85vh]` ×9 不在 J16 裁决集（F12.2 vh 封禁 lint 落地时一并处理）；document-preview-dialog（components/ui 内）维持 E 类占用推迟；J11/J12 接线、组件默认值批、F3.6 表单容器迁移、批 F3 lint 待 E 类三层解耦路线收口。

### 前端设计治理——E 类「禁止裸组件」路线废止，改行「三层分层解耦」（2026-09-29）：方案 §七之十一 裁决入账，纯文档轮零代码改动

> 用户裁决（2026-09-29）：「我过去的经验已经证明了裸组件改造不是正确的方案，三个层级分层，对组件进行改造和解耦才是正解。」承接同日凌晨 `660752f1` 全轮回退（见下一条），本条为该裁决的**方案侧正式入账**：废止批 6/7 裸元素迁移路线，确立「动作钮 Button / 非动作具名直通出口 / 特殊形态语义组件」的三层归属模型。

| 项 | 内容 | 证据要点 |
|---|---|---|
| 废止面 | §19.2「禁止裸组件」、§19.3 轴一 PEC（页面元素清零）、§19.4「变体优先」原文（修订为「语义组件优先」+ 原子组件变体轴冻结）、批 6/批 7、交接单任务 F（§19 入宪）与任务 A/B/C 及待裁 #5（随路线关闭；任务 B 圆角钳位降级为原子层内部一致性技术债）、任务 D 挂起 | 实证链：批 6 复核无损迁移率 0.6%–1.0%；四桶清剿 1548→0 后形变灾难；§七之十（五）「ui 内嵌 button 多数不是动作钮」判断推广到业务面 |
| 保留面 | §19.1 / 19.5 / 19.6、〇之二 三段式、§四 4.1、§五 registry 与 LU 轴、ESLint 三规则（维持 `warn`；`no-naked-controls` 重定位为裸控件盘点器，转 error 前提永久撤销）、allowlist 豁免机制、批 0/0b/0c 补档与批 1-5 基建 | `git diff 4563d236 HEAD` 为空（回退完整）；eslint 告警 ~2000+ 为回退后真实状态，warn 不阻断 |
| 文档改动 | E 类方案：§19.2/19.3/19.4 节首废止·修订标注 + §六 批 6/7 标注 + 新增 **§七之十一**（八项裁决 + 回退基线登记 + 新路线落地形态）+ frontmatter status「部分废止」；PRINCIPLES.md 附录 A.3（入宪范围收窄为 19.1/19.5/19.6，版本号不动——登记变更非条文变更）；交接单加废止横幅 + status「已废止」 | 纯 docs 轮：4 文件，未改任何代码 |
| 后续入口 | raw 出口重建（RawButton/RawInput 重执行 §七之十（五））、语义组件按簇提炼（每簇独立小批、**禁止全库 codemod 大轮**）、分层约束机械化（依赖方向入 dependency-cruiser + 档位输出快照）——均走 requirement-intake 另开方案，E 类方案自此转为历史档案 + 仍有效条款载体 | §七之十一（三） |

### 前端设计治理——E 类裸组件清剿与规范收敛全轮回滚（2026-09-28 深夜）：代码回到批 0c 补档基线，文档与治理基建全量保留

> 用户裁决（2026-09-28）：codemod 大批量修改导致系统组件混乱，裸组件改动整轮回退——「主要还是裸组件这块的改动出问题了，只要回退到裸组件改动过之前就行」；chip 组件不保留；F 类代码改动不保留（文档保留）；docs/ 全部最新文档保留。执行方式：工作区与索引按 `git restore --source=4563d236` 整体回到 **4563d236（E 类批 0c 纯增补补档）**，即 a6007d6f（批 0c 收口）起 17 笔迁移/替换/清剿类代码提交全部撤除；`docs/`、`CHANGELOG.md` 与 allowlist 豁免基建五文件（`eslint-rules/*`、`design-governance.allowlist.json`、`eslint.config.js`）明确排除在外。回退前保险分支 `backup/pre-rollback-ba418dad`；chip.tsx 与 `scripts/f-class/` 存 stash 可找回。

| 项 | 内容 | 证据要点 |
|---|---|---|
| 回退范围 | 批 0c 收口（a6007d6f·加载指示收口+逃生舱转语义档）→ 批 6/7 裸写作迁移 9 笔 → 交接单任务 A（zero 档+八处落轴）→ 四桶清剿 4 笔 → A1 补档+胶囊收敛（9c5d0a4a）→ codemod 批量清零（7efb798e·259 文件）→ RawButton/RawInput 具名出口 → 画廊恢复（ba418dad，回退后自然失效） | 约 308 文件回到 4563d236 状态；raw-button.tsx / raw-input.tsx / header-action-button.test.tsx 三个范围内新增文件随源移除 |
| 保留面 | 批 0/0b/0c 纯增补轴（button/card/field/tone.ts）、批 1-5 基建（registry、三条 warn 规则、lint:layers/duplicate）、批 3 select-field 改名、allowlist 豁免机制 + PRINCIPLES A7 条款 | 索引 vs 4563d236 在 apps/frontend 仅余 allowlist 五文件差异；registry.ts / COMPONENTS.md / package.json / index.css 不在回退范围，零再生 |
| 文档口径 | docs/design/**（含 E 类方案 §七十各轮、清剿报告、交接单、A7 落宪）+ CHANGELOG 历史条目 + F 类方案文档全部保留为最新；本文条目与其后各轮记录为决策史，不随代码回退改写 | F 类方案与高度章记录先行单独入账（9a04f27e） |
| 可见变化 | Button 基线回 `rounded-md` 方角；裸 button/label/input/textarea 回归原写法；F 类成果（85vh token、侧栏 360、面板头 h-12、滚动区四档）消失 | 三条 warn 规则下 eslint 警告回归 ~2000+，属回退后代码的真实状态（warn 不阻断） |

### 前端设计治理——F 类高度 J16–J18 拍板落地（2026-09-28 晚）：三项均按推荐收口，17 文件迁移入账

> 承接同日 F12 高度增补章：用户三项裁决 **J16 复活 token 改 85vh / J17 面板头归一 h-12 / J18 滚动区四档封闭表 40/64/80/96**（均按推荐）。执行 `scripts/f-class/f2-height-migration.mjs`（同一 fail-closed 守卫体系，17 文件 17 编辑，脚本入库）：`--spacing-dialog-scroll` 80→85vh（token 向事实对齐）+ assistant-fab 浮窗迁 `h-dialog-scroll`（等值）；面板头 h-14 ×2 / h-16 ×1 → h-12；滚动区 48→40 ×1、56→64 ×4、72→80 ×6、60vh→96 ×2（收缩性迁移：1080p 下 648→384px，均为受限列表/表格预览且外层有滚动兜底，**建议实机过一眼**）。**余 1 处推迟**：document-preview-dialog:82 `h-[85vh]`→token（该文件 E 类 ui 收敛批次占用中）；顺带发现 `--spacing-dialog-full: 90vh` 亦为零消费死 token（未在裁决范围，仅登记）。方案已同步定档：F12.3 总表（面板头 h-12 / 滚动区四档 / 弹窗 85vh token）+ F3.2/F3.5 表述 token 化 + frontmatter status（J1–J18 全收口）。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` 17 文件（index.css + 16 组件/页面）+ `scripts/f-class/f2-height-migration.mjs` | F 类方案 §四 J16–J18；能力清单 B 治理线 | `tsc -b` exit 0；改动 17 文件 eslint 0 error；`lint:tokens` 过（裸 vh 任意值 −4）；干跑+实跑逐项命中 | F12.3 定档 + F3.2/F3.5 token 表述 + §四裁决回写 + 批 F2 第 8 项状态更新 |

### 前端设计治理——E 类策略切换「规范收敛」：codemod 批量清零，三规则 override/naked/adhoc 1548/493/44 → 0/0/0（2026-09-28 第九轮）

> 用户两度拍板：①已完成裁决方向暴力清空、多形态主线程裁断收敛（§七十 十二条款映射表）；②脚本批量替换、替换完再修报错区域。执行链：A1 补档八项（`9c5d0a4a`）→ Button 胶囊收敛（§七十 #1：基线 `rounded-full`，icon 档即圆形，不立 rectangle 档）→ codemod 两轮（AST 定位+文本切片，202 文件：纯删 2676 token / prop 插入 526 / 裸元素直替 496）→ 伤情修复 27 TS 错 → adhoc-tone 语义收尾 44→0（status-visuals 追加 19 个业务量表）→ naked 收尾 select 11+button 1 替换、内容渲染 2 条豁免落宪（PRINCIPLES A7）。并行隔离：F 类会话在制文件（ui 8 文件 + project-sidebar-context）显式排除，零混改。总账见 `docs/design/修改方案-E类-2026-09-27.md` §七十（四）。

| 项 | 内容 | 证据要点 |
|---|---|---|
| 胶囊收敛 | Button 基线 `rounded-md`→`rounded-full` + 组内锁同步；icon-* 即圆形钮 | 可见变化用户已裁；button.test 72/72、ui vitest 329/329 |
| codemod 批量 | override 1168→0：rounded 全族/素形族纯删 2676 + className→prop 结构映射 526（width/fontVariant/density/maxWidth/fontSize/size/padding/Badge color/Spinner 轴） | tsc 0 错（27 处越域/重复 prop 机械修复）；9 个 check-*.mjs 全过 |
| naked 直替 | 493→2→豁免后 0：label→FieldLabel 档、button→Button ghost、input/textarea 直替、select 11 处 select-field/select 组合件 | 内容渲染 2 条（markdown checkbox/mdx table）豁免落宪 A7，90 天滚动 |
| adhoc-tone | 44→0：自造映射删除接入 status-visuals→tone 唯一链路；`TONE_CLASS.bg/border` 零消费槽首次接线；status-visuals 追加 19 个业务量表键 | 1 处词表误报改等值函数、1 处非状态语义改名（Spinner 正名先例） |
| 门禁 | 三规则 0/0/0（当日起点 1548/493/44）；tsc 0 错；前端全量 vitest 绿 | 迁移/豁免明细：`docs/design/修改方案-E类-2026-09-27.md` §七十（四） |

### 前端设计治理——F 类高度增补调研入档（2026-09-28 晚）：F12 章 + 高度三律 + 档位总表；J16–J18 待裁决

> 全仓生产面 tsx 高度取值补测（grep 实测），方案新增 **F12 高度章**：立法三原则「内容不定高、滚动定上限、条状定高」。三分账——已收编：卡片体系零高度类（SectionCard/Card 源码无 h-*）/ `min-h-0` ×65 滚动链健康 / 横向条状件双口径（标题行 40px `h-10` 定高 + 工具条行 48px `py-2`+`h-8` 自适应，ToolbarRow 与 SubPageToolbar 同构实为同一档）；分叉三实锤：**H1** 弹窗高度两制（`--spacing-dialog-scroll` 80vh 为**死 token 全仓零消费**，实际 85vh 裸写 ×2 + 84vh ×1 + 60vh ×2 + 40vh ×1）、**H2** 面板头 h-12/14/16 三档散布 4 处（assistant-panel ×2 / project-detail-frame / document-view-page / decision-review-modal）、**H3** 内嵌滚动区 `max-h` 七档 ~25 处（40~96 全占，宪法 §10.5 只锁下拉 max-h-80）。新增裁决点 **J16**（推荐：复活 token 改 85vh 收编引用）/ **J17**（推荐：面板头归一 h-12，迁移量最小）/ **J18**（推荐：四档封闭表 max-h-40/64/80/96，迁移 ~10 处）；无争议两条直接立律（卡片禁定高 / vh 裸值封禁），lint 候选并入批 F3，存量迁移挂批 F2 第 8 项。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `docs/design/修改方案-F类-布局与组合-2026-09-28.md`（F12 章 + §四 J16–J18 + 批 F2 第 8 项） | F 类方案 §三 批 F2/F3；能力清单 B 治理线 | 全仓 grep 实测（vh 全查 / h-N 频次表 / max-h 逐处归属 / SectionCard·card 源码零高度 / min-h 分布），证据路径全部入档 F12.1 | 方案 frontmatter status 更新（J16–J18 待裁决） |

### 前端设计治理——F 类布局与组合·批 F1/F2 组件侧批量落地（2026-09-28 第八轮）：八文件 21 编辑，E 类并行零混改

> 执行 `docs/design/修改方案-F类-布局与组合-2026-09-28.md` 批 F1（默认值+债务清除·组件侧）与批 F2（语义档·组件侧）中**可脚本化**的部分，落地脚本入库 `scripts/f-class/`（`f1-defaults-debt.mjs` / `f2-component-axis.mjs` / `_lib.mjs`，支持 `--check` 干跑、幂等重跑）。**并行纪律**：脚本内建 fail-closed 守卫——目标文件一律先过 `git status` 干净校验，E 类修复未提交的 250+ 文件零混改；J9 删拖拽 API（provider 在 shell-layout.tsx）、J10 删 view-switcher（迁移点 project-list-page.tsx 且须走 E 类 registry 清退闭环）、九处 320→360 页面接线、J11 六详情页接线、F3 lint 规则均因依赖 E 类 M 文件或人工迁移**有意推迟**。

| 项 | 内容 | 证据要点 |
|---|---|---|
| J1 | DialogTitle 升 `text-base font-semibold`（原无字号继承 text-sm 与正文同档，78 处弹窗视觉微变） | `dialog.tsx`；方案 F2④/X3 |
| J6 | CardFooter 补 `gap-2`（F9.1 间距唯一律，对齐 DialogFooter；既有手写间距不受影响） | `card.tsx`；60 importer 由 `card.test` 回归 |
| J7 | Tabs line 变体贴边六件套内聚为默认（消费面核验：仅死件手写 + 画廊展示自动跟随，零业务破坏） | `tabs.tsx`；方案 X7 |
| J8 | 属性栏唯一标准宽 320→360：RightSidebar 默认值 + PROJECT_SIDEBAR_DEFAULT_WIDTH（9 处 `width={320}` 页面接线留批 F2，E 类 M 文件） | `right-sidebar.tsx` + `project-sidebar-context.tsx` |
| J2 | PageShell 补 `wide` 档（max-w-7xl，F1.3 四档总表收编；project-detail-frame 手写补位收编推迟） | `page-shell.tsx`；方案 X1/J2 |
| J5 | DataList 行高 `size` 轴 dense(32 默认)/comfortable(40)（table.tsx 两档已由 E 类 density 轴覆盖，不重复加轴） | `data-list.tsx` 七处编辑；`data-list.test` 7 绿 |
| J11 | SubPageToolbar 补 `titleIcon` 槽（面包屑末项升「icon+标题」，接线推迟；icon 消费实体注册表 entity.icon 与 E8 合流） | `sub-page-toolbar.tsx`；方案 F2.5② |

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` 8 个组件文件 + `scripts/f-class/` | F 类方案 §三 批 F1/F2；能力清单 B 治理线 | `tsc -b` exit 0；card/dialog/data-list 测试 51 绿；改动 8 文件 eslint 0 error；`lint:registry`/`lint:spacing`/`lint:semantic` 全过 | 本表 + 脚本注释归因（方案正文裁决记录 §四 不变）；宪法升格（批 F1.3 条文）待 E 类收口后统一走 §11.2 |

### 前端设计治理——E 类四桶子代理清剿第一轮（2026-09-28 第七轮）：override 1548 → 1166（−382 / 24.7%）

> 四桶子代理并行清剿（用户拍板编队）：桶1 组件档迁移 / 桶2 布局清理 / 桶3 font-mono 专项 / 桶4 色彩构成。领地按**文件独占**切割（29 个 font-mono 文件剥离桶3，防同文件并发覆盖）；`rounded-*` 43 条属待裁项 B 剔除派工。收口复算：naked 493、adhoc 44 持平（范围外零触碰）；收口修正两插曲（spinner `tone`→`color` 正名回平 adhoc；桶2 任意值 `w-[37.5%]` 回退）。总账见 `docs/design/修改方案-E类-2026-09-27.md` **§七之八**；逐文件明细见 `docs/design/清剿报告-E类四桶-2026-09-28.md`。

| 项 | 内容 | 证据要点 |
|---|---|---|
| 桶1 组件档 | 清 224 条（962→738）；补档 9 个 ui 文件 / 13 轴 / 18 档，全「新档默认不生效+注释归因」（button `size="2sm"`、input `size`/`fontSize`/`paddingStart`、table `align`/`padding`、card 标题/内距、label 还原档等） | 等价证明临时 vitest 14/14（cn() 终串逐字符）；被改组件既有测试全过 |
| 桶2 布局 | 清 57 处（删冗余 27 / 迁档 4 / 等价下沉 26）；全宽 Button 等静态证明不了的逐条留报 | 逐处基线源码证实；DialogTitle 内 span、wrapper 叠加复现等下沉论证入报告 |
| 桶3 font-mono | 29 文件清 87 条（392→305）；font-mono 50 = 内层 span 下沉 18 / 留报 32 | 表单控件无内层可包裹为主；补档建议 11 类待裁 |
| 桶4 色彩构成 | 35 文件清 57 token（删冗余 42 / 迁档 15，`Card surface="flat"` 逐字节等价） | 禁止对调实录：`destructive ≠ accent-red`、`bg-muted ≠ bg-muted/50` 等全部未动 |
| 门禁 | `tsc -b` 通过；10 个 `check-*.mjs` 全过；前端全量 vitest 通过；三规则计数前后 JSON 逐条对比 | 残留 1166 逐条留报待下一轮；naked/adhoc 另案 |

### 前端设计治理——E 类交接单执行轮（2026-09-28 第六轮）：豁免机制落地 + padding zero 档八处落轴；两项「可先做」被实测证伪转决策简报

> 执行 `docs/design/交接-E类剩余工作-2026-09-28.md`，总账见 `docs/design/修改方案-E类-2026-09-27.md` **§七之七**。三笔提交（显式路径、未 push）：`cf6772c4`（任务 E）、`207fee56`（任务 A）、本轮 docs。**任务 C/D 零迁移**——实测发现交接单「label 40 处无争议可先做」「17 处可收编 StatusIconFrame」均存在无损性缺口，按证据转人裁简报（§3.4 纪律），不硬迁。

| 项 | 内容 | 证据要点 |
|---|---|---|
| 任务 E（交付） | `design-governance.allowlist.json` 豁免机制：schema + 机器实现 + 首条登记（design-system，宪法 A.1 A6 同源、90 天滚动复登）；fail-closed（坏行/超期 → lint 抛错；过期自动失效） | 全仓告警 2287→2102（−185 = design-system 子树三规则告警实测）；负向实测超期登记 → eslint 装载即抛错 |
| 任务 A（交付） | `Button.padding` 补 zero 档 `"p-0": "h-auto gap-0 border-0 p-0"`（gap/border 是参与几何的基线残留，`h-auto` 下边框 +2px 必须归零）；八处零内距裸钮落轴 | 双证：twMerge 终串现场打印 + Playwright 真实浏览器七对盒几何逐对相等（末对 0.02px 亚像素舍入）；button.test 72 绿；全仓告警 2102→2094、裸 button 287→279 |
| 任务 B（简报） | 圆角钳位实为**两档**（xs/icon-xs 8px），sm/icon-sm 的 min(…,10px) 在默认主题 = rounded-md 不生效——交接单「四档」修正；被卡量级由「26 处」修正为个位数（h-8 系可直走 sm） | token 链逐层复算（`--radius-md`=`--radius-control`=10px）+ 行级近似计数；方案 (a) 改钳位（消费面 xs 65 行 + icon-xs 26 行）/(b) 维持+宪法豁免，须人批 |
| 任务 C（证伪→简报） | 「text-xs 两族 40 处可先做」不成立：复算 42 处，探针实测块级表单行语境迁移后**输入框上移 1.5px**（FieldLabel 基线 flex 为块级，裸 label 是 inline）；flex 行仅 +0.5px 行盒。阻断 1 复算：`content-text-secondary` 与 `muted-foreground` **两主题皆不逐值等** | 四场景 Playwright 实测表（§七之七（五））；三选项待裁（接受位移 / 立 inline 窄档 / 块流豁免） |
| 任务 D（证伪→简报） | 「17 处收编 StatusIconFrame」零无损：5 处带自定义时长 2s/3s（Frame 无时长档，收编即能力丢失，与 §七之三 #2 Loader 2s 同型）；其余为裸图标语境，收编=加 tone 浅底圆框的可见变化；Frame 本体实居 `shared/status/`（交接单误写 `ui/`），扩展正则前须先决其位置 | 逐处审计分类表（§七之七（六））；须人裁形态统一 + 时长档 |
| 任务 F（评估） | §19 入宪维持阻塞：三规则存量 2085（naked 493 / override 1548 / adhoc 44），转 error 须逐处 §7 归因级裁决 + 90 天滚动登记，A.3 语义不变 | 实测计数；正确时点在数轮清剿战役之后 |

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` 设计系统（eslint-rules + 8 个生产文件 + button 轴） | E 类方案 §七之七；能力清单 B 治理线 | `tsc -b` exit 0；`button.test` 72 绿；filter-panel/project-list 关联测试绿；改动文件 eslint 0 error；Playwright 盒几何七对逐对相等 | `docs/design/PRINCIPLES.md` 附录 A.1 新增机制说明 + A6 行（成对改动）；`docs/design/修改方案-E类-2026-09-27.md` 新增 §七之七（四处修正/三份简报/待裁增量） |

### 前端设计治理——2026-09-28 第二轮三项裁决落地：缺档补齐政策（批 0c 开工）+ spin 收口 + 逃生舱收窄；并迁画廊加载态样本

> 裁决记录见 `docs/design/修改方案-E类-2026-09-27.md` **§七之三**。三项**均采纳协调方建议**；同轮内协调方**自我更正两条**（见下）。**批 0c 已派工**（3 个代理：`Button` 内距+字阶轴 / `Card` 内距轴 / 逃生舱收窄），交付另行入账。

| 项 | 裁决 | 落地状态 |
|---|---|---|
| #1 | 批 6/7 共同根因（组件缺内距/布局/字阶轴）→ **补内距轴 + 字阶轴；布局类不建轴、由调用方内层 div 承载** | 批 0c 执行中（`Button` 内距+字阶；`Card` 内距）。布局不建轴的理由：内距/字阶是可穷举档位，布局轴会膨胀成第二个 Tailwind |
| #2 | 28 处 `animate-spin` → **只迁画廊样本，其余登记为合法形态** | 画廊样本 `design-system-page.tsx:2119` **已迁**（同批落库）；其余 26 处（在制状态旋转 / 变体作用域 / 装饰）不迁 |
| #3 | `iconClassName` 逃生舱 → **收窄为语义档** | 批 0c 执行中 |

**画廊样本迁移（协调方自执行，1 文件）**：`design-system-page.tsx:2119` 的 `<Loader2 className="animate-spin" /> Loading…` → `<Spinner size="sm" className="text-inherit" />`。**显式给 `size="sm"`(=`size-4`) 与 `text-inherit` 的理由**：`Spinner` 默认档 `md`=`size-5` 会与 `Button` 的 `[&_svg:not([class*='size-'])]:size-4` 撞档（后者因类里已含 `size-` 而不生效），且 `Spinner` 硬编码 `text-muted-foreground` 会改色。故取「同字形（同为 `Loader2`）+ 同尺寸（16px）+ 同色（inherit）」的最小平移，**唯一差异是新增 `role="status"` 与 `aria-label`（无障碍增强，非劣化）**。`Loader2` 在该文件自此零引用，已从 import 移除；`eslint` 该文件 **0 error**（185 条 warning 均为该展示页既有的「故意展示各形态」告警，与本次改动无关）。**`:5423` 另有一处 `Loader` 自旋未迁**：它带 `text-blue-500`（裸色）与 `animationDuration:2s` 自定义时长，`Spinner` 无时长档 ⇒ 迁移会丢能力，故留待单独裁决。

**⚠️ 协调方自我更正（同轮两条，不静默）**：

1. **`iconClassName` 不是一种舱而是三种**。上呈时建议「统一收窄为 `spin?: boolean`」，侦察后推翻：`HeaderActionButton`（2 处，全是自旋）/ `StatusIconFrame`（**0 处**，属性是死的）/ `SidebarPanel`（**7 处，全是颜色**，含 `text-accent-purple` ×2）/ `PropertyPanel`（仅转发）。**统一收窄会打断 `SidebarPanel` 的 7 个调用方**，故按舱分型处置。裁决指向不变，被更正的只是收窄形态。
2. **spin 项的关键论据不完整**（更重要）。上呈时我的论据是「2 处真加载态换 `Spinner` 会改字形/颜色/无障碍」。**该论据漏查了「同一状态在别处怎么渲染」**。补查后：`{pending ? <Spinner/> : <RefreshCw/>}`（字形替换）**8 处**，`iconClassName={pending ? 'animate-spin'}`（让刷新图标自己转）**2 处** ⇒ **同一状态两种渲染，8:2，后者是离群写法，不是应豁免的惯例**。若当时握有这份证据，我会建议「把 2 处收敛到主流写法」而非「发豁免」。**处置**：裁决照原样记录执行（2 处本轮不迁），但**新增待裁 ①**（是否收敛），且**宪法本轮不写此条**——在离群/主流判定未获确认前，不把 2 处离群写法写成宪法惯例。

**本轮新增待裁 2 项**：① 是否把 2 处离群写法收敛到 8 处主流写法（代价：这 2 处字形可见变化）；② `SidebarPanel` 的 2 处 `text-accent-purple` 无 tone 可表达——建议**不扩 tone 词表**（§19.4 的 5 档是**状态**词表，purple 在本仓当**分类/强调**用），改给 `SidebarPanel` 一个窄的 `accent?: 'purple'` 档并在宪法登记「purple 不入 tone 词表」。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` 设计系统（`design-system-page.tsx` 画廊样本） | E 类方案 §七之三 #2；能力清单 B 治理线 | `eslint` 该文件 **0 error**（185 warning 均为既有）；`Loader2` 零引用残留已确认 | `docs/design/修改方案-E类-2026-09-27.md` 新增 **§七之三**「裁决记录（2026-09-28 第二轮）」含三项裁决、`iconClassName` 实物分型表、**两条自我更正**与 2 项新增待裁 |

### 前端设计治理——E 类批 0b「能力二次补档」交付：Card 描边/表面两轴 + Button `tone` 轴 + `ui/tone.ts` 词表下沉

> 三笔提交（均显式路径、**未 push**），**零迁移**——未替换任何消费方（替换是批 6/7 的活）。**⚠️ 交付范围与裁决 #1 不符**：授权的是「Button 字号/内距/布局/tone **四轴** + Card 第二·三轴」，实落 Card 两轴 + Button **仅 `tone` 一轴**，另三轴未交付 ⇒ 批 6 可无损迁移量**仍锁在 0.6%–1.0%**。沿线记录：`docs/design/修改方案-E类-2026-09-27.md` §七之二（五）。

| 提交 | 内容 | 规模 | 纯增补证据 |
|---|---|---|---|
| `43d30aed` | **Card 第二·三轴**：`border`（`ring`/`solid`/`dashed`）+ `surface`（`default`/`flat`/`translucent`），并挂 `data-border`/`data-surface` 供语义断言 | 2 文件 / +83 −0 | `--numstat` **0 删除行**；既有 4 组属性组合的 twMerge 终串逐字全等（漂移 0/4）|
| `b0e91a58` | **Button `tone` 轴**（`default`/`info`/`danger`），`default` 为空串 ⇒ 既有 variant×size 输出逐字节不变；`data-tone` 由组件挂载，默认档传 `undefined` ⇒ 属性不落 DOM | 2 文件 / +109 −1 | 唯一删除行 = `className` 那一行（保持调用方最终覆盖权）|
| `960d01ed` | **`components/ui/tone.ts` 词表下沉**：`Tone`（五档）+ `TONE_CLASS = { text, dot, light, bg, border }`；`status-pill`（原子层）与 `status-visuals`（业务层）共同消费，分层方向无反向 import | 4 文件 / +124 −31 | 20 槽位与抽取前两份原映射**逐字全等**（见核验 3）|

**协调方独立复算（不采信代理自述）**：

1. **Card**：`ui/card` 生产消费方复算 **= 55**，与源码注释「既有 55 个消费方」逐整数吻合；7 个新增类串（含 `bg-card\/60`、`border-border\/60`）在 `dist` 产物中**全部生成**，无幽灵类。
2. **Button**：「裸色类会被任何设色 variant 静默吞掉」这一立项前提**经构建产物字节复现成立**——`text-xs 251354 < text-2xs 251446 < text-accent-blue 253286 < text-accent-red 253870 < text-content-text-muted 254782 < text-foreground 255845 < text-muted-foreground 257193`；作用域类实际生成为 `.data-\[tone\=danger\]\:text-accent-red[data-tone=danger]{…}`（特异性 (0,2,0)，hover (0,3,0)）。
3. **`tone.ts` 抽取零视觉变更：独立复算通过**（承重：26 个 `status-visuals` 消费方 + 36 个 `status-pill` 消费方）。取抽取前两文件（字面父提交 `b0e91a58`），**5 路来源 × 各 5 个非空值**，比对 **20 个槽位差异数 = 0**；两份原「重复映射」（`status-pill.toneClass` vs `status-visuals.TONE_LIGHT_CLASS`）**互相差异 = 0**，代理「无需人裁决统一值」的结论成立。

**取证脚本自身修掉两处「假通过」隐患（自曝）**：① `git show <rev>^:path` 在 Windows 经 `cmd.exe` 时 `^` 是转义符被吞 → git 实收 `<rev>:path`（**变更后**的文件）→ 抽 0 档 → 比较退化为「空对空」仍报 PASS；改为**字面父哈希** + 短输出即抛错。② 来源守卫只查**键数**，而 `Object.fromEntries(TONES.map(t => [t, x?.light]))` 在 `x` 为 `undefined` 时仍产出 5 个**键** ⇒ 已升级为**值非空**守卫（现输出「5 键 / 5 个非空值」，任一来源全空即 `exit 3` 并声明「比较结果无效，不得据此判 PASS」）。

**⚠️ 交付范围缺口（据实登记，不静默覆盖）**：裁决 #1 授权 **Button 字号 / 内距 / 布局 / tone 四轴**，实落**仅 `tone`**（派工时即窄于裁决范围，属协调方缺口）。而这三轴正是批 6 复核里 90 个候选的**主要缺档**（`text-xs/sm`、`px-*/py-*`、`flex/gap-*`）⇒ 批 6 **仍不应按「替换工程」派工**。同源问题在 Card 侧：批 7 卡片壳 40 行中 **34 行带 `p-*`**，Card 新轴不表达内距/布局，卡片壳半边亦未真正解锁。

**新增待裁 3 项**：① **Button 三轴如何补**——补「字阶轴 + 内距轴」还是改走「内层 div 承载布局类」的统一形态（建议先定形态再补轴）；② **`tone.ts` 的 `bg`/`border` 两槽零消费方**——实测 `TONE_CLASS` 消费点仅 `.text` 5 / `.dot` 5 / `.light` 6，`bg` 与 `border` 各 **0**。**代理并未隐瞒**：`tone.ts:32` 已自述「两槽当前零消费方，属性可供后续批次接线；取值待人工确认」。协调方的异议在于**是否该造槽**——同批 Button 轴以「无证据不造档」为由拒了 `success`/`warning`，若另一路可以凭「仓内既有写法」先造两条无人用的槽，两者标准就不一致了（建议删两槽或补消费方，待人裁）；③ **tone 值两处持有**——`button.tsx` 的 tone 轴把 `text-accent-blue`/`text-accent-red` 又硬写一遍且**未** import `tone.ts`，§19.5「tone → class 视觉层唯一持有」尚未达成；直接换裸类会**无声失效**（Button 提交已留「须连同 data 作用域一起搬」的连带契约），建议本轮**只记账不返工**。

**合流验证（三代理改动首次同跑全量）**：`apps/frontend` 全量套件 **`192 文件 / 1401 用例 passed`，exit 0**（`vitest run`，691s）。此前三笔提交各自只跑了子集（A/B 各 `src/components/ui` 26 文件 / 275 用例；C 跑消费方目录 92 文件 / 771 用例），**全量合流是本轮才做的**。运行期有一条 jsdom `Not implemented: navigation (except hash changes)` 告警，属既有环境噪声，非用例失败。

**另**：`COMPONENTS.md` 由协调方再生（registry 335 条 vs 生成物 334 条的 1 行滞后已消除，差异恰为 `ui/tone.ts` 一行；canonical 299 → **300**，Primitives 63 → **64**，合计 334 → **335**）。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` 设计系统（`components/ui/card.tsx` / `button.tsx` / `tone.ts` / `shared/status/status-visuals.ts`） | E 类方案 §七之二 #1（批 0b）；能力清单 B 治理线 | **全量前端套件 192 文件 / 1401 用例 passed（exit 0）**；三轴纯增补取证（Card 0 删除行 / Button 唯一删除行 = `className`）；20 槽位等价脚本 `差异数 = 0`；九项设计门禁 exit 0 | `docs/design/修改方案-E类-2026-09-27.md` §七之二（五）新增「批 0b 交付与核验」（含范围缺口与 3 项待裁）；`apps/frontend/COMPONENTS.md` 再生 |

### 前端设计治理——2026-09-28 十二项裁决的「小项」执行：宪法 v2.4（§4.5 胶囊例外）+ 扩生成器置 `deprecated` + 删数留结论 + 删死 mock

> 四项裁决（#4 / #7 / #9 / #11）落地，**零行为变更、零视觉变更**；`#7` 附带解除一处工具互斥。沿线记录：`docs/design/修改方案-E类-2026-09-27.md` §七之二。

| 项 | 改动 | 验证 |
|---|---|---|
| #9（宪法）| `docs/design/PRINCIPLES.md` **v2.3 → v2.4**：§4.5 新增「**chip / toggle 语义的按钮可用胶囊档**」例外，承认既有形态合法（不清退），并**限定语义、禁止泛化**（普通动作按钮仍一律 `rounded-md`）| 版本串各出现 1 次；§11.2 第 3 步**无可同步项**——圆角维度自始无 `check-*.mjs` / ESLint 规则（已 grep 确认）|
| #7（工具链）| `apps/frontend/scripts/gen-components-md.mjs` 扩 `ENTRY_RE` 解析 `expiresAt`，并以新 `expNote()` 渲染进两张表；`registry.ts` 的 `dropdown-menu` 正式置 `status: 'deprecated', expiresAt: '2026-12-31'`；`COMPONENTS.md` 再生 | 条目数 **334 不变**（无丢失）；`dropdown-menu` 在待裁决清单与完整清单**均显示「清退期限 2026-12-31 · §19.6」**；`check-component-registry` / `check-duplicate` / `check-layers` 均 exit 0 |
| #4（清噪）| `src/components/ui/button.tsx` 删去逐档「实测先例数」（`quiet 57 处 / 34 文件`、`subtle 48 处 / 30 文件`、`ghost-danger 7 处 / 7 文件`、`icon-2xs 10 处 / 8 文件`、`icon-2sm 6 处 / 6 文件`），**保留「来源＝形态聚类 + 档位语义」结论与全部档位边界说明**；靶子规模改标口径（正则行级 315 / 元素级 314，差 1 为 JSX 注释误命中）| 纯注释改动，**非注释行 = 0** |
| #11（清噪）| `src/modules/project/pages/project-list-page.test.tsx` 删去死 mock `vi.mock('@/components/view-switcher', …)`（该路径**磁盘不存在**，且页面仅 `import type` 走 `@/shared/components/view-switcher` ⇒ mock 从未生效）| 该测试文件 **1 passed (1)** |

**协调方复算（含一次自我更正）**：裁决记录中「胶囊按钮 35 处 / 27 文件」经复算——**仅小写 `<button>`** 为 **37 处 / 28 文件**，**含 `<Button>`/`<Badge>`** 为 **53 处 / 36 文件**（`<button` 37 / `<Button` 10 / `<Badge` 6），口径 = 生产文件（排除 `components/ui/`、`*.test.*`、`*.stories.*`）中胶囊类名与控件标签的**元素级**共现。原记 35/27 与前者差 **2 处 / 1 文件**（未定位）。首次复算时我把该差异表述为「**不可复现**」并据此落笔宪法，属**取证未竟即定性**，同批更正为「量级同阶、差异属口径/误命中」。宪法条文**不固化数量**（宪法管规则、`COMPONENTS.md` 管清单），只登记两个口径供后人对齐。

**另修一处自身缺陷**：`gen-components-md.mjs` 的 `entryNote()` 自 2026-09-27 起即为**无调用点的死函数**（上一轮我曾改它而它根本不生效）——本轮改为真正被两张表调用的 `expNote()`，死函数删除。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend`（设计治理 / 工具链 / 宪法）| E 类方案 §七之二 #4 · #7 · #9 · #11 | `vitest run project-list-page.test.tsx` → 1 passed；三脚本 exit 0；生成器重跑条目数 334 | `docs/design/PRINCIPLES.md` v2.4；`docs/design/修改方案-E类-2026-09-27.md` §七之二（执行状态回填）|

### 前端设计治理——E 类批 3 唯一实现收口（①②④⑤ 已交付）：`native-select` 改名 `select-field` + 两处「不合流」实物比对结论

> 三笔提交（均显式路径、未 push）：`3f84855e`（40 文件 / +326 −326，纯改名）、`4e22154c`（3 文件 / +41 −3，注释 + registry reason + 生成物）、`ee5c0da4`（1 文件 / +26 −0，纯注释）。**零删除**（`--diff-filter=D` 为空，仅 2 处 `git mv`）；④ `view-switcher` **零改动无 commit**（实测早已是 `SegmentedControl` 薄封装）。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` 设计系统（`components/ui/select-field.tsx` / `dropdown-menu.tsx` / `shared/components/issue-type-icon.tsx`） | E 类方案批 3（E4 改名 / E6 合流裁决 / E8 合流裁决）；能力清单 B 治理线 | **旧名残留 0**（`native-select`/`NativeSelect`/`native_select` 全库零命中，含被生产测试消费的 `data-slot` 字符串；命名组 `group/select-field` 无跨文件引用 ⇒ **无静默失配**）。**三重一致**：文件名 = 导出三件（`:228`）= registry `name`+`file`（`:107`）。**纯改名无漂移**：`+326/−326` 完全对称，提交内 39 个 `src` 文件 + 生成物 `COMPONENTS.md`。**六项门禁全 exit 0**；`select*` 测试 **16/16**；**生成器重跑不改生成物**（确定性再生）。另两笔**非注释改动行 = 0**（纯注释、零行为风险）。**E6/E8 承重断言经复核成立**：`menu.tsx` 的 `MenuCheckboxItem`/`MenuRadioItem` 确无 `inset` 且 `:350+` 确有整套 `DropdownMenu*` 别名桥；`issue-type-icon.tsx:117` 确走 `IssueType.color` 内联上色、`EntityKind` 为封闭联合而 `ISSUE_TYPE_ICONS` 为开放 26 键。**协调方更正一处**：代理称两处惰性 mock「均不可解析」——实测 `@/components/view-switcher` 确失效，`@/shared/ui/filter-panel` **模块在位、可解析**（应为「一处失效、一处生效」）。**新增待裁 3 项**：`deprecated+expiresAt` 工具互斥（`check-component-registry:164-166` 强制要求 vs `gen-components-md:37` 正则无该槽位 ⇒ 须先改 `scripts/`，本轮改采 `review + reviewBy: 2026-10-31`）/ 失效 mock 去留 / 委托视觉等价不可取证（本批未改该文件，无新增风险） | 本 CHANGELOG + E 类方案「批 3 交付与核验」小节（含 3 项待裁与「③ `tone.ts` 建议并入批 0b」） |

### 前端设计治理——E 类批 6 开工前复核：无损可迁移率 ≈ 0.6%–1.0%，批 6 判定为「能力补档工程」而非替换工程

> 本次**无代码交付**（零提交零改动，代理亦为零改动返回）。派工前按批 0 同一铁律（不能造出「禁了但没得用」）实测，**证否方案对批 6 的规模前提**，故本轮不派替换工；结论与人审项落 E 类方案新增小节「批 6 开工前可行性复核」。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` 全库裸 `<button>`（设计治理） | E 类方案批 6（开工前复核）；能力清单 B 治理线 | **口径复原**：全域生产（排除 test/stories）裸 `<button>` 元素级 **366**，`components/ui` 独占 **52**，366−52 = **314**，与批 0 复算值**逐整数吻合** ⇒ 采信口径「排除设计系统自身 `src/components/ui/**`」。**转化率实测**：候选项 90 处，逐 token 剔除 §19.4 白名单与现有 Button 轴可表达项后**零阻断仅 3 处**（其中 `document-properties-panel.tsx:273` 因 `text-muted-foreground/70` 透明度后缀**存疑**）⇒ **真无损 2–3 处 / 314 ≈ 0.6%–1.0%**；代理自述「8 处 / 2.5%」经抽核其 7 处 (i) 类，**6 处实带 `text-xs`/`text-sm`/`disabled:opacity-50`/`hover:underline`**（Button 无字号轴，按铁律应归缺档），**方向一致、量级更低**。**缺档分布**：布局 `flex/gap-*`、内距 `px-*/py-*`、字号 `text-2xs/xs/sm`、字族 `font-mono`、`cursor-pointer`、`hover:opacity-*`、尺寸 `size-N`、未定义色 `text-accent-red`。**批 0 先例数不可复现**：`button.tsx:25-28` 注释声明 `quiet` 57/34、`subtle` 48/30，同口径下协调方两种规则四种取值（23/16、54/32、42/28、129/73）**无一吻合** ⇒ 范围可复现、**划分规则未留档**，本次不采信为规模依据（**未改源码注释**，待人裁决）；该瑕疵不影响批 0 交付物有效性（新增档位已双取证为零变化纯增补）。**零改动自证**：`git diff --numstat -- src/modules/team-member` = 0 行；`eslint` 三条规则模块命中数逐字未变 | 本 CHANGELOG + E 类方案「批 6 开工前可行性复核」小节（含 4 项待裁口径与「批 0b 能力二次补档」建议） |

### 前端设计治理——偏差 25 第四文件收口（设计系统展示页 15 处裸三元组当色值；口径由 12 更正为 15）

> 提交 `60e63d83`（1 文件 / +9 / −9）。`design-system-page.tsx` 9 行 / **15 处** `var(--x)` → `var(--color-x)`：`card` 4、`border` 4、`destructive` 3、`primary` 1、`muted-foreground` 1、`accent-green` 1、`accent-blue` 1。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` 设计系统展示页 | BCD 类方案偏差 25（收口记录） | 残留裸三元组 **0**（`hsl(var(--chart-N))` 6 处为合法写法、原样保留）；type-check exit 0；palette / ui-governance / tokens / registry / spacing / icons / semantic-classes / undefined-classes **八项 exit 0**；`vite build` 后产物中 7 个 `--color-*` 别名**全部落盘**（对照 `--color-cost` 仍为 0） | 本 CHANGELOG + BCD 类方案偏差 25 收口段 |

**口径更正（自我纠正）**：本条此前记为「12 处」，是被计数正则漏掉**带回退值**的写法——`var(--accent-green, #10B981)` 里 token 名后是逗号，不匹配 `var\(--[a-z-]+\)`，故第 1345 行的 3 处**一处都没被计入**；「9 行」无误。此类「计数正则决定了答案」本会话已第三次（前两次：`mdx-editor` 14 vs 12、C3 测试文件口径 130 vs 142），故本次改按「先枚举全部 `var(--` 行、再逐行分类」，并以「前一个字符非 `(`」判「直接当色值用」（排除 `hsl(var(--chart-N))`）。

**为何动了当初记「只报不改」的文件**：原三条理由中「交付时正被并行代理改动」已随批 2 交付失效；该页是宪法条文与组件用法的**展示面**，把被静默丢弃的色值留在展示面上等于把反例当范例展示。仍属同类缺陷、同型修法，零新 token、零规则收窄；**视觉会变**（此前落到 Recharts 默认值），非等价替换。

### 前端设计治理——E 类 · 批 5「ESLint 设计门禁落地」（3 条 AST 规则 + 2 个新门禁，一律 warn / 零 error）

> 提交 `18402866`（3 条规则）+ `c8c78f72`（`lint:layers` / `lint:duplicate` + registry 消费方对账）。依据 E 类方案 §3 与 §四 4.1/4.2。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` lint 门禁 | E 类 §四 4.1/4.2（批 5） | `eslint .` → **exit 0，2302 problems (0 errors, 2302 warnings)**，协调方独立复跑逐字一致。**门禁真实性由协调方自建探针验证**：注入新增分层倒置 → `lint:layers` **exit 1**、撤除 → exit 0；注入 `stat-cards.tsx` 词干碰撞 → `lint:duplicate` **exit 1**、撤除 → exit 0；探针零残留。7 个设计脚本 + type-check 全 exit 0 | 本 CHANGELOG + E 类方案批 5 行 |

**规则与命中**（`warn` 口径，存量与新增分离）：`no-naked-controls`（§19.2）**530 条 / 157 文件**；`no-visual-override`（§19.4 D2）**1714 条 / 228 文件**；`no-adhoc-tone`（§19.5）**49 条 / 37 文件**。三条规则在 `eslint.config.js` 内均配置为 `'warn'`，**无一条 `'off'`**（未收窄换绿）；该块注释写明转 error 的前提是「存量清零 + allowlist 落地」。

**新门禁存量（报告项，不阻断）**：`lint:layers` 原子层 103 文件 **5 条 / 4 文件**（含批 2 今日搬迁**新引入**的 `ui/ai-execution-badge.tsx`）；`lint:duplicate` 组件 371 文件 **2 组**（`stat-card`/`stats-card`、`member-card`×2）；registry 消费方=0 的 canonical **4 条**；画廊覆盖率 **78/103 = 75.7%**。

**有意未做（须记）**：① `design-governance.allowlist.json` **未创建**——warn 不阻断，「先 warn 一轮」要的是全貌，此刻引入 allowlist 只会把存量从普查里藏起来；② §4.2 ③「`review`/`deprecated` 逾期 → 失败」**刻意做成报告项**（脚本注释指向台账偏差 29：删除已被人类叫停、逾期处理属待裁决项）；③ §4.2 ④ `lint:gallery`、`lint:utilization` 只报告、未设门禁。

**边界（报回裁决）**：未改 `lint-staged.config.mjs`，故两条新门禁只在 `pnpm lint` / CI / pre-push 生效、**不进 pre-commit**（协调方已核 lint-staged 五项链：spacing → palette → registry → semantic → ui-governance）。`--max-warnings` 全仓**无此 flag**（grep 唯一命中是脚本自身注释），故 warn 不会把门禁弄红。`task-detail-drawer` 经协调方复核为**零代码引用**（2 处纯注释 + 1 处 `api-types.gen.ts` 示例字符串巧合 + registry 自身条目）——按「不删只标记」仍留在 `review`/canonical 待审面。

### 前端设计治理——E 类 · 批 0「能力补齐」（button 3 variant + 2 size、Card 1 variant、Field 2 轴；纯增补零迁移）

> 提交 `60ba76a2`（button）+ `fb0dcb10`（card/field），合计 +360 / −5。依据 E 类 §三 E9 的前置铁律：不先补能力，后面的 lint 会造出「禁了但没得用」的自相矛盾。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` UI 原子能力 | E 类 §三 E9（批 0） | **既有档位零变化**：文本级（button 33 / card 21 / field 48 个字面量逐一比对，移除或改动 **0**）+ **渲染级**（旧/新组件真渲染后比对 `className`：button 8×8=64 组、Card 3 组、Field 全等）；button/card/field **3 文件 / 62 用例 passed**；type-check exit 0；八项设计门禁 exit 0 | 本 CHANGELOG + E 类方案批 0 行 |

**新增能力**：`button` **3 variant**（`quiet` 57 处先例 / `subtle` 48 处 / `ghost-danger` 7 处）+ **2 size**（`icon-2xs` 20px / 10 处、`icon-2sm` 28px / 6 处）；`card` **1 variant**（`outline` = 圆角档 + 描边 + 去投影，对应手写壳主形态 23 行 / 16 文件）；`field` 的 `field-label` 槽 **2 轴**（`size` / `variant`，`FieldLabel` 与 `FieldTitle` 同槽同给）。**零迁移**：未替换任何消费方的裸 `<button>` 或手写卡片壳（属批 6）；**零删除、零标记**；仅 `card.tsx` 新增 `data-variant` DOM 属性（唯一 DOM 增量，`Button` 刻意未加以免破坏 191 处既有契约）。

**基线复算（更正方案数字）**：裸 `<button>` **文件数 128 成立**，但**测试/生产拆分为 9 / 119**，方案原文「6 测试 → 生产 122」有误；元素级真值 **315 处生产裸 `<button>`**（自带 `className` 309 → 归一键 **215 簇**）——协调方独立复算与批 0 代理逐字一致。手写卡片壳 **27 文件成立**，展开 **40 行**（39 行 `border` 描边、30 行无 `shadow`、26 行 `rounded-lg`）。

**升级人审（宪法与现状冲突，不静默覆盖）**：实测**胶囊按钮 `rounded-full` 35 处 / 27 文件**，而宪法 §4.5 明令「按钮一律 `rounded-md`，胶囊只归 chip/头像」——要么宪法开口子、要么批 6 把这 35 处改 `rounded-md` 并接受视觉变化。批 0 未碰，列为批 6 前置裁决。另有 7 条不入档/待裁决项记于 E 类方案批 0 行（含 `rounded-xl`+`border` 14 行 / 11 文件**单轴无法无损表达**、`hover:bg-accent` 与 `hover:bg-muted` 同值 token 别名、以及 `text-*` 与 `leading-*` 在 tailwind-merge 中互斥的**全库静默陷阱**——建议后续由批 5 规则覆盖）。

### 前端设计治理——E 类 · 批 2「命名空间收敛」（6 个错位原子件由 `shared/components/` 迁入 `components/ui/`，零删除）

> 提交 `7bc4945a`（21 文件 / +28 / −28）。依据 E 类方案 §2.2 分拣表；**迁移清单严格 6 个**，分拣表标「留 `shared/`」的 11 组一律未动。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` UI 原子层归位 | E 类 §2.2（批 2） | 6 件 `git mv` **sha256 逐字节未变**（`--numstat` 全 `0 0`）、**零删除**；旧路径残留 grep 为空；`COMPONENTS.md` **再跑生成器零 diff**（生成物非手改）；registry 门禁 exit 0（334 条 / review 18 / deprecated 0）；type-check exit 0；**4 文件 / 40 用例由协调方亲自复跑 passed** | 本 CHANGELOG + E 类方案批 2 行 |

**迁移**：`dual-track-metric-pill` / `error-boundary` / `page-error-fallback` / `ai-agent-badge` / `ai-context-summary` / `ai-execution-badge`（内容零改动，仅移动）。**importer 更新**：14 处 import / 13 文件（`shell-layout.tsx` 占 2 处），每件真 importer 1:1 全覆盖；无 `*.stories.*`、无 `vi.mock`、无动态 `import()`/`lazy()` 引用（逐一 grep 确认为空）。`registry.ts` 6 行仅改 `file:` 字段（`shared/components/` → `ui/`），status 仍为 `canonical`。

**方案预警前提已过期（须记）**：§2.2 称「迁入 `components/ui/` 会触发 palette 门禁，因 `ui/` 无豁免」——但**批 7a 已把 C2/C3 由 `modules/ai-surface/` 窄范围扩为全库生效**，这 6 件在 `shared/components/` 时**本就在扫查面内**，故迁移不改变任何命中（实测零内联色，`check-palette` 迁前/迁后均 exit 0）⇒ **未做任何语义 token 替换**，即「为过门禁改类值」清单为**空**。

**遗留（报回裁决，非漏做）**：`components/ui/ai-execution-badge.tsx:4` 仍是 type-only 依赖 `@/modules/execution/hooks/use-active-executions-map`——当前无门禁冲突（`ui/` 内已有 3 个同例：`data-list` / `document-preview-dialog` / `property-panel`），但**批 5 的 `lint:layers`（分层倒置）若落地会点名这 4 件**。

### 治理脚本修复——`check:docs-sync` 变更集改三源并集（修「工作区有代码在制品时看不见 HEAD 里的文档」误拦）

> 提交 `c126d77e`（1 文件 / +40 / −20）。偏差 25 收口入账时 `check:docs-sync` 报 exit 1「code changed but no docs/governance files were updated」——**而该提交本身就是 `CHANGELOG.md` + 设计台账**，报文与事实相反。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| 根 `scripts/check-doc-sync.mjs` | 门禁可用性（闸门 1 误拦） | 仓库外临时仓 **A/B 探针四场景**（旧版 = `0262de98:scripts/check-doc-sync.mjs`）：工作区纯代码 + HEAD 是文档提交 **旧 1 / 新 0**；纯代码提交且全仓无文档改动 旧 1 / **新 1（未修漏）**；头顶非 ASCII 名文档提交 旧 0 / 新 0；受管文档缺 frontmatter 旧 1 / **新 1（Check 2 未削弱）**。主仓实测修复前 exit 1 → 修复后 `[docs-sync] passed.`（14 份受管文档 frontmatter 全过） | 本 CHANGELOG + 方案台账偏差 33 |

**根因**：`getChangedFiles()` 是「首个非空即返回」的短路链——`if (workingTree) return workingTree…` 使工作区有未提交改动时**只看工作区**，HEAD 里已提交的文档/CHANGELOG 一律不可见。**为什么本仓必然踩**：方案简报明文要求「代理只改代码、CHANGELOG/台账由协调方另行提交」，故代码与文档**本就分成两个 commit**；多代理同工作区又让工作区混入别家的纯代码在制品；而 **CI 走 `GITHUB_BASE_REF` 分支级比对** ⇒ **只有本地坏**，又是一次「本地与 CI 结论分歧」。

**修法**：改为**三源并集**（① `origin/<baseRef>...HEAD` ② 工作区 ③ `HEAD~1...HEAD`）——只**增加**文档侧来源、不删减代码侧来源；「文档改了就算数」正是报文自己写的契约（`in the same PR`），与 CI 口径一致。逐条 git 调用独立 `try/catch`，防任一失败把并集塌成空集（那是从「误报」**退化为静默放行**）。

**未改**：规则口径与阈值、frontmatter 必填字段、Check 3（Tauri 主路径）、受管文档范围。**待裁决（未顺手做）**：是否收紧为「文档必须与代码**同一 commit**」——属口径变更。

### 前端设计治理——裸三元组当色值收口（21 处 `var(--x)` → `var(--color-x)`，3 文件）

> 提交 `59f799e5`（3 文件 / +20 / −20）。依据 BCD 方案台账偏差 25（第 114 行）「建议批 7 顺手机械修」。
> `--border`/`--muted-foreground` 等是 HSL **分量**（如 `240 5.9% 90%`）而非合法 CSS 颜色，直接当色值用会被浏览器**静默丢弃** —— 受影响的样式（Recharts 的 `stroke`/`fill`、CodeMirror 主题的 `color`/`backgroundColor`）**从未生效**。本次全部改用 `@theme inline` 暴露的 `--color-*` 别名。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` analytics / team-member / document | 台账偏差 25（批 7 顺手机械修） | **产物级 A/B**：修复前 `dist` 缺 3 个别名 → 重建后 8 个目标 token 齐备；`type-check` exit 0；7 个设计门禁脚本全 exit 0；3 文件残留扫描为空（余下均为合法 `hsl(var(--x))` / `var(--color-x)`）；diff 逐行纯净 20/20 | 本 CHANGELOG + 方案台账偏差 25 收口记录 |

**分布**：`analytics-page.tsx` 4 处 / 3 行、`team-stats-section.tsx` 3 处、`mdx-editor.tsx` 14 处——**较方案的「18 处 / mdx-editor 12」多 2 处**：方案聚类时按 `stroke/fill/color/background` 关键词取面，漏掉 `borderRight: '1px solid var(--border)'` 与 `border: '1px solid var(--border)'` 两行（协调方首次复算踩了同一个坑，改按「先列出全部 `var(--` 行再逐行分类」才暴露）。

**性质须显式记录（非等价替换）**：修复后**渲染会改变**（此前落到 Recharts/CodeMirror 的默认值），属**视觉变更**，且无快照测试覆盖。

**产物级复核（A/B，非推断）**：修复前 `dist/assets/*.css` **缺** `--color-foreground` / `--color-accent` / `--color-accent-blue` 三个别名；仅把源码改为 `var(--color-x)` 后重建，三者**全部落盘**。机制已定位：Tailwind 4 按**源码引用**树摇主题变量——修复前全仓唯一引用 `var(--color-border)` 的是 `shared/decision-card/decision-card.css`，故仅它幸存。**由此建议（需人裁决）**：`hsl(var(--x))`（存量 437 处，是 `var(--color-x)` 69 处的 6 倍）只依赖 `:root` 定义、**不依赖树摇**，后续新代码宜优先采用；69 处存量 `var(--color-x)` 记为「引用驱动才存活」的技术债。本条原建议的 `--color-x` 已落地并**验证可用**，故不推翻、只作倾向性建议。

**有意未做（报回裁决，非漏做）**：① `analytics-page.tsx:409` 的 `fill="var(--color-cost)"` —— `--color-cost` **全仓零定义**（`index.css` 无、产物 CSS 无），fill 被丢弃；属**独立缺陷**（未定义 token，非裸三元组），修它需选配色＝设计决策，故不自造；② `design-system-page.tsx` 同类裸三元组 **12 处 / 9 行**（4 处 `RechartTooltip` 的 `border`+`background`、`stopColor`/`Area` 的 `--destructive`、`Bar` 的 `--primary`；第 1345 行 `var(--accent-green, #10B981)` 虽带 hex 回退但 `--accent-green` 已定义故回退不生效、仍被丢弃）——该页属 palette 豁免面、不在偏差 25 范围，且交付时正被并行代理改动，只报不改。

### 前端设计治理——E 类 · 批 4「组件裁决面落地」（registry 的 `review`/`standby` 标记首次呈到页面，零删除）

> 提交 `af237f9e`（5 文件 / +488 / −3）。依据 E 类方案 §5.2/§5.4，兑现人类铁律第 ① 步「组件不删除，但要在 design-system 页面标记」。
> **修复的是一处从未生效的三步走卡点**：改造前 `design-system-page.tsx` 全文无 `registry` 字样，18 条 `review` 只躺在 `registry.ts` 内部、页面上**一眼看不到**，因此「我看过后再删」在物理上无法进行（见方案台账偏差 29）。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend/design-system` 裁决面 + registry 门禁 | 组件债务清退前置（E 类 §5.2/§5.4） | 定向 vitest **2 文件 / 7 用例全 passed**（board 6 + 整页 1，125s，协调方复跑）；`check-component-registry` passed（334 条五态校验 + review 18 条元数据完整）；负向测试 A/B 各 exit 1、恢复后 exit 0 | 本 CHANGELOG + 方案台账偏差 29/32 |

**做了什么**：新增 `modules/design-system/sections/component-review-board.tsx`（只读裁决面，E 类方案 `sections/<section>.tsx` 结构的首个落点，避免继续加厚已 6243 行的页面文件）；页面接入为 `Governance` 分组下的首个分区、位于**第一屏**；数据**只读 `COMPONENT_REGISTRY`**，逐条展示组件名 / 状态 / `reviewBy` / `expiresAt` / 理由 / `proposal`，五态计数**实时统计不写死**；含「只看待裁决」筛选。`check-component-registry.mjs` 补 **§② 元数据完整性**：`review` 必带 `reviewBy`、`deprecated` 必带 `expiresAt`、status 须在五态词表内，并做**解析对账**（按单行字面量解出的条数须等于 `status: '…'` 出现次数，防格式漂移后静默少校验）；原有 COMPONENTS.md ↔ `ui/*.tsx` 双向对账原样保留。

**协调方独立核验（逐项复现）**：numstat 与自述**逐行吻合**（+126/−1、+15/0、+14/−2、+94/0、+239/0）；**3 处删除行全部是原地替换**（`console.log` 扩为多段输出、`SECTION_GROUPS` 首位加 `Governance`、默认分区 `colors` → `component-review`），**无任何组件/测试/导出被删**；`components/ui/*.tsx` 仍 **121** 个；`registry.ts` **未被修改**（未偷改归属、未新增 `deprecated`）；未碰 `eslint.config.js` / 根 `lint-staged` / `src/index.css` / `docs/**` / `CHANGELOG.md` / `openapi.json`。测试**由协调方复跑**（非采信自述）：2 文件 / 7 用例 passed。

**有意未做（报回裁决，非漏做）**：① **`review` 逾期 → CI 失败**未实现——该口径会**向删除施压**，而删除已被人类叫停，故不做并写进脚本注释与页面脚注；② `component-review-decisions.json` 与**写回路径**未做（本批只读），即「②人看 → ③删」之间**最后一格仍未接上**——页面看完后的结论目前仍需人工转达；③ 6243 行页面整体拆分未做。**另**：E 类文档中的「删除/清退」候选（≈16 个组件）与 registry 实际登记（18 `review` + 3 `standby` 建议清退）**无法一一对应**，只报告未改登记。

### 前端设计治理——治理脚本修复：非 ASCII 路径被 git 引号转义，「`docs/` 前缀匹配」三处失效

> 提交 `0262de98`（3 文件 / +34 / −6）。**由 E 类批 4 交付时报回的 `check:docs-sync` exit 1 顺藤查出**——不是代理的过错，是三个脚本共有的同一缺陷。

git 默认 `core.quotePath=true`，非 ASCII 文件名输出为 `"docs/design/\344\277\256..."`（**带引号 + 八进制转义**），而三处都用 `f.startsWith('docs/')` 判定文档改动 → 首字符是引号，**恒为 false**。本仓 `docs/02-架构设计/`、`docs/design/` 下文档**几乎全是中文名**，故该前缀匹配系统性失效。

| 站点 | 后果 | 证据 |
|---|---|---|
| `scripts/check-doc-sync.mjs` | **误拦合法提交**（代码+中文文档同改 → 判成「没改文档」） | 同一工作区 A/B 跑**真实脚本**：修复前 **exit 1** / 修复后 **exit 0** |
| `scripts/gate.mjs` | **`docs` bucket 恒不命中** → 只改中文文档的提交**恰好跳过最该跑的 `check:docs-sync`** | 唯一改动=一个中文名文档：修复前 `BUCKETS.docs=false` / 修复后 `=true` |
| `scripts/generate-weekly-governance-report.mjs` | `docFiles` 少算 → `codeFiles/docFiles` 比值被抬高 | 同机制推定，未单独跑该报告 |

**修法**：三处取路径的 git 调用统一加 `-c core.quotePath=false`。与 `check-doc-sync.mjs` 自身 B4 改造对**枚举**用的 `git ls-files -z` 等价——那次只修了枚举，喂 `docChanged`/`governanceChanged` 的 diff 三处漏了，本提交补齐。**不改任何规则语义与阈值**。

**双向实测**：真实仓库 `pnpm check:docs-sync` **exit 0**（14 份受管文档）；「仅代码改动」仍 **exit 1**（门禁未被改坏）。**注意**：本会话早前 `check:docs-sync` 的通过属**侥幸**——当时改动里恰有 ASCII 名文件 `CHANGELOG.md` 顶替，中文文档的改动一直不可见。

### 前端设计治理——BCD 方案 · 批 7a「门禁强制扩容」（C9 全页扫描 / C2·C3 全库化 / lint-staged 接入）

> 提交 `0e48626e`（7 文件 / +306 / −49）；随后补 `e5880f61`（1 文件 / +64 / −1，**注释感知**修复，成因见下「扩面放大出的既有缺陷」）。
> **本批不碰 `index.css`**——命名空间封闭（A 类 §4.2 `--*: initial`）依 A 类方案 §6「封闭永远单独一批，不与迁移混」**留在 7b**；事后实测 `index.css` 仍为**零条** `--*: initial`（即 §4.2 从未落地）。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` 门禁脚本 / 页面标注 / lint-staged | C9 覆盖率、C2 中性裸色、C3 内联裸色（宪法 §5 / §10.1） | 5 道设计门禁复跑 **全 exit 0**（palette / ui-governance / spacing / semantic-classes / icons）；C9 空集守卫、注释感知边界各做注入验证 | 本 CHANGELOG + 方案台账偏差 23/24/30/31 + 批 7 行重写 |

**做了什么**：C9 由「4 页白名单」改 **glob `src/**/*-page.tsx`** 并加**空集守卫**（globbing 匹配 0 页即 exit 1——防「路径写错但门禁照过」这种静默失效）；C2/C3 **由 ai-surface 窄范围扩为全库**，同时按**性质**补 5 类具名豁免（`color-picker` 有意展示态 / `mocks` / `test-utils` / `brand/logo` / `chart.tsx` 的 recharts 属性选择器**假阳性** / 生成物）与两条 `file:token` **精确匹配** legacy 白名单（C2 24 键 28 处、C3 64 键 84 处）；`lint-staged.config.mjs` 的 pre-commit 由 1 个设计脚本扩为 **5 个**。

**独立复现（协调方按源码逐条复算，与执行方自述逐项吻合）**：C2 非测试非豁免 **29 处 / 25 文件**（⊂ 具名 1 处、legacy 28 处 / 24 键）；C3 **130 处 / 14 文件**（⊂ 具名 46 处 / 6 文件、legacy 84 处 / 8 文件）。执行方自述的「84 = 130 − 58」是**量词标签滑笔**（58 含 12 处测试命中），正确恒等式为 `84 = 130 − 46`，**数字本身无误**。

**执行方 3 处推翻协调方简报预期的实测**（简报错、代理对，均已独立复现）：① C9 换 glob **同时激活了其他规则**，暴露 **39 处新缺口**（29 页无 `data-ai-action` + 10 处 overlay 导入页）——代理**逐条登记进白名单而非缩窄规则**以迁就简报预期，处置正确；② `data-ai-page` 实为 **34 点号 / 17 kebab**（简报称 31/16——**漏算 19 页**：它们经 `CORE_AI_PAGE_IDS` 常量**间接**声明，按字面 grep 会漏）；③ `error-page.tsx` 的真实缺陷是 `:96` 缺 `nativeButton={false}`，而**协调方简报误称该文件含 `asChild`**（全仓 `asChild` 的代码用法早已为 0，残留仅中文注释）。

**扩面放大出的既有缺陷（已就地修复 `e5880f61`）**：`check-palette.mjs` **不是注释感知的**（注释感知只存在于 `check-spacing-governance.mjs`）。C3 此前只在 `modules/ai-surface/` 内生效且**未进 pre-commit**，本批扩为全库 + 接入 pre-commit 后，「解释违规的注释」会**直接拦下提交**：`// 修复 #1234 的回归` 命中 C3 的 hex 正则，`// 原 bg-white 已换成 bg-muted` 命中 C2——而「写清原来错在哪、为什么这么改」正是「文档即契约」要求作者做的事。修法是移植 `check-spacing-governance.mjs` 的 `commentRanges`（该脚本注释自陈「实测已连续踩中 4 次」）到四条规则，**只跳过落在注释区间内的命中，字符串与代码照常扫描**（误判方向只会「多报」、不会「漏报」）。实测边界：同一行同时含注释提及与代码字面量 → **exit 1 且只报 1 处**；仅注释提及 → exit 0。**副作用（已记账、未静默）**：`api-types.gen.ts` 的 4 处 `@example` 色值本来就在 JSDoc 里，补注释感知后 `GENERATED_EXEMPT` 成为**零命中的死条目**——保留并就地注明理由（生成物下一轮 openapi 生成即覆盖，无法用 `file:token` 维护，删掉等于不留逃逸口），属裁决项。

**7b 挂起（三项人裁决，详见方案台账偏差 26/27）**：① 字阶**冻结现值** vs **采纳 §3.2 新字阶**——§3.2 的 8 档**非视觉中性**（字号与现值一致，但 **5/6 档行高改变**，涉全站 **2613 处**垂直节奏）；② `--ease-*` 封闭**缺一步迁移**（§3.9 只排了 `duration-*` 97 处，封闭会杀死 **13 处 TSX 工具类**；`.css` 内 13 处简写属性值与 1 处任意值**不受影响**）；③ `--shadow-*` 封闭须先迁 §3.6 的 104 + 48 处。**逐族实测**：`--radius-*` / `--duration-*` 封闭**安全**（静态字面量 / bare-value 路径）；`--shadow-*` / `--ease-*` / `--text-*` **不安全**（主题命名空间**构建期内联**或 `var()` 引用）。**另**：43 处 hex 去饱和（偏差 21）与 Canvas 豁免（偏差 22）两项存量裁决仍未决，**裁决前不得把 `prism-canvas`/`blueprint-canvas` 列入技术豁免白名单**。

**协调方操作事故（已回退，见台账偏差 31）**：为上述修复提交时只 `git add` 了自己的脚本，但并行代理已 `git add` 的 5 个文件仍在索引里，`git commit` 提交的是**整个索引**，故把并行代理**尚未核验的在制品**一并提交（`7971d38d`，6 文件，信息与内容不符）。已 `git reset --soft HEAD~1` 回退并**以显式路径**只重提 `check-palette.mjs`（`e5880f61`）。**教训：并行代理同仓作业时提交必须带 `git commit -- <paths>`。**

### 前端设计治理——批 9b · D11 无障碍阶段 1（`jsx-a11y` 接入）

> 提交 `c4b743ef`（6 文件 / +612 / −3）。依据 `docs/design/审计-D10断点与D11无障碍-2026-09-27.md` §3.3 阶段 1。
> **关键澄清**：此前台账记「批 9 待 `jsx-a11y` 分级档位裁决」——经复核为**过度解读**：审计 §3.3 **阶段 1 已给出可直接执行的分级**（18 条低误报规则直接开 `error`），被裁决卡住的是**阶段 2/3/4**（见下存疑 S-D）。审计 §3.4「不要现在改 `eslint.config.js`」是**其只读产出的自律，不是人裁决**。

| 模块 | linked_fr | test_evidence | doc_impact |
|---|---|---|---|
| `apps/frontend` eslint 配置 / 依赖 | D11 无障碍（宪法 §8.5） | 红灯 **2 条 → 0**；`lint` exit 0、`type-check` exit 0、`markdown-view`+`mdx` 10 用例全绿；探针命中 **6 条不同规则**证明插件真在生效 | 本 CHANGELOG + 方案台账偏差 28 |

**做了什么**：`pnpm-workspace.yaml` catalog + `apps/frontend/package.json` 加 `eslint-plugin-jsx-a11y: ^6.10.2`（版本取自 registry 实测；两条目按字母序插入邻居之间）；`eslint.config.js` 以 `plugins: { 'jsx-a11y': … }` + 逐条覆写接 **18 条 `error`**，**未**用 `flatConfigs.recommended`（审计 §3.4#2：一次开 recommended 预估 300~500 条红灯会立刻弄红 `quality:gate`），**未**降级为 `warn` 充数。

**实测红灯 2 条（审计静态预估 2~8 条，落在区间内）**，均为 `jsx-a11y/alt-text`，用**真实语义修复**清掉、**零 `eslint-disable`**：
- `src/shared/components/markdown-view.tsx:108`、`src/shared/mdx/mdx-provider.tsx:47` —— 两处都是 **react-markdown / MDX 的 `img` 覆写**。修法是补 `alt=""` 并**置于 `{...props}` 展开之前**：给「无 alt 的渲染路径」显式装饰性兜底（屏幕阅读器跳过而非朗读文件名），而 react-markdown 透传的真实 alt 仍然优先。**属性顺序即语义**——写在展开之后就成了「夺权」。

**审计预估未复现（口径偏差，非缺陷）**：`anchor-is-valid` 预估 2 处（`pagination.tsx:54`、`mdx-provider.tsx:38`），实测两处 `<a>` 均带 `{...props}` 展开，规则**无法静态判定 href 缺失**（`pagination.tsx` 那处已在 `<Button nativeButton={false} render={<a aria-current=… {...props}/>}/>` 内，运行时 href 由调用方传入）。**故未改这两处**——属审计 §3.2 自陈的「静态近似」，阶段 2/3 的静态近似数字（如 `click-events-have-key-events` 33 vs 369）同样**须以实测为准**。

**存疑（交回裁决）**：
- **S-D（阶段 2/3 的硬前置）**：审计 §3.3 末尾的**豁免机制（override）尚未建立**（`modules/design-system/**`、`drawer.tsx`/`navigation-menu.tsx`、测试夹具三类）。阶段 1 的 18 条实测 0 红灯故暂不需要，但**开阶段 2/3 前必须先建**，否则噪声立刻上来。
- **S-C**：E 类批 5 将再改 `eslint.config.js`（设计门禁），**与 D11 必须串行**；已在该文件规则块上方留痕（注明依据与阶段 2/3 待开规则名）。
- **S-A**：`renovate.json` 的 eslint 分组 `matchPackagePatterns` **已自动覆盖**新插件（行为正确、无需改），仅 `groupName` 字面陈旧（未提 jsx-a11y），纯文案问题、**未改**。
- **S-B**：`pnpm knip` 仍 exit 1，但成因为 ~800 行**既有**的 server/desktop/cli 未用导出与 `knip.json` 冗余 entry，**与本批无关**（本批只加一个前端 devDependency 与两个 `alt`）。**既有红门禁，建议单独立项**。
- **S-G（协调方简报的错，已由执行方纠正）**：简报给的路径 `src/shared/mdx/components/markdown-view.tsx` **不存在**，实际是 `src/shared/components/markdown-view.tsx`（`src/shared/mdx/components/` 下只有 `blockquote/code-block/heading/table`）。**属协调方凭空补全目录、未回库核对**。
- **未做**：运行时无障碍验证（无 axe / Lighthouse / 屏幕阅读器）；阶段 2/3/4 规则；§8.5#4/#5/#6（颜色/焦点环/焦点管理，按审计 §3.4#5 应走自建 `check-*.mjs`）。**零组件/功能删除，零 `any`。**

### 前端设计治理——BCD 方案 · 批 6b「存量清剿」（D6/D7/C1-C3）

> 按**子树**拆两条并行线（线 M = `src/modules/**`；线 C = `src/components/**` + `src/shared/**` + 其余），每条线在自己子树内做完全部规则——**边界即子树，零重叠**。理由：四个工作面在同批文件上高度重叠（实测 `C2∩C3 = 13 文件`），按关注点拆会把同一文件派给两个 agent。
> **C1 为零存量，未派工**：阴影门禁早已在 `check-spacing-governance.mjs` 全库生效且通过，方案让改的 `check-palette.mjs:33 RAW_SHADOW` 已迁走（见方案台账偏差 15）。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **线 C 提交 `9f2c661e`（21 文件，+245/−234）**：D7 `asChild`→`render` 迁移 **18 处代码站 / 9 文件**（`button.tsx`/`tooltip.tsx` 删除 asChild 兼容层与类型声明，保留 base-ui 原生 `render`；`activity-heatmap` / `app-dock` / `shell-layout`×6 / `error-boundary` / `page-error-fallback` / `error-page` / `heartbeat-monitor`）；C2 修 **10 处**（4 处 `bg-destructive` 底 → `text-destructive-foreground`、`bg-accent-orange` 与彩色头像/色带底 → `text-background`、滑块拇指与选中圆点 → `bg-background`）；C3 清剿 **59 处**（`page-registry.ts` 43、`row-context-menu.tsx` 12、`linear.tsx` 2→`fill-brand-linear`、`issue-type-icon` 1、`shell-layout` 1） | CAP-P-01 | **协调方按 rev 归档树独立复现**（线 M 改动同时躺在工作区，故**不能用文件系统**——用 `git archive <rev> apps/frontend/src` 取快照再扫）。**D7 与 C2 的分片自述完全吻合**：D7 子树 27 处/12 文件 → 8 处/5 文件（代码站 18、残留 8 全为注释）；C2 18 → 8。**C3 分片自述不可复用**：真值 89 → 30 处（Δ−59），线 C 自述「105 → 46」两侧同偏 +16，且其「135 = 105+.css 26+测试 4／残留 72」**自身不自洽**（135−59 = 76 ≠ 72）。**净减 59 与全仓实测 `288 → 229` 完全一致，结论不变**。其「全仓 44 文件」无法用任何口径复现（有/无尾部 `\b` 均只有 38 文件）。提交内**零 `modules/**` 文件**（边界守住）。`tsc -b` exit 0、六道门禁 EXIT=0、定向 vitest 9 文件/97 用例 passed | 无契约变更 |
| frontend | **线 M 提交 `1fa5854b`（41 文件，+210/−121）**：D6 补 **16 页** `data-ai-page`（含经 `PageShell aiPage` / 新增可选 `aiPage` prop 于 `AuthShell`·`AuthVisualCard` 透传；7 页走 PageShell、3 页走 auth 壳、6 页落最外层容器）；D7 迁移 **12 站 / 8 文件**（modules 内 `asChild` 实现**归零**；全部为结构改写，无一处可纯文本替换），并**发现 `Button render={<Link/>}` 必须显式 `nativeButton={false}`**（否则渲染出 `role` 为空的 `<a type="button">`），据此为 7 个 Button+Link 站点补齐；C2 修 **2 处**（开关滑钮 `bg-white` → `bg-primary-foreground`、头像环 `border-white dark:border-border` → `border-border`）；C3 清理 **58 处**（非豁免面 78 → 28、Canvas 桶 62 → 56），含 `analytics-page` 8 处 → `--chart-1..5`、`task-detail-drawer` 10 处色档表 → accent token 梯子（并与 `row-context-menu` 的 `SEVERITY_CONFIG` 权威口径对齐）、实体默认色 `#5E6AD2` 17 处 → `var(--color-brand-linear)`（**同值，零视觉变化**）、`office-page` 修一处真 bug（`iconColor` 误传 hex 致图标无色） | CAP-P-01 | **协调方独立复现**：D7 modules **12 处/8 文件 → 0** ✓ 精确吻合；C3 非豁免 **78 → 28**、Canvas **62 → 56**、残留 28 逐项吻合（`recommended-issue-types` 10 + `integrations-section` 12 + `auth-visual-card` 3 + `issue-types-section` 1 + `metadata-sync.service` 1 + `tag-manager` 1）✓；C2 modules 非测试非豁免 **23 → 23**（真相是「修 2 但新注释又添 2」，见下）；`nativeButton={false}` 的既有口径在 `components/ui/pagination.tsx:52` 已核对存在 ✓。**两处自述偏差**：① 其「modules 非测试总量 133」实测为 **183**（线 C 的 105 + 183 = 288 恰好等于全仓 288，证明 183 为真）；② 非豁免基线称 80、实测 **78**（末端 28 与其一致）。`tsc -b` exit 0、`eslint` 0 error、六道门禁全绿、定向 vitest 18 文件/141 用例 passed。**未做任何阴影迁移**、**未改任何门禁脚本**、**未删任何组件/导出**（新增 `aiPage` prop 全部可选） | 无契约变更 |
| frontend | **⚠️ 新发现：两个提交新增的注释本身会触发批 7 扩面后的门禁**。`check-palette.mjs` **不是**注释感知的（只有 `check-spacing-governance.mjs` 是），故「解释违规的注释」在 C2/C3 全库化后会变成新红灯。实测：线 M 新增 **2 处注释自伤**（`board-presets.tsx` 的 `原 border-white 的环…`、`integrations-section.tsx` 的 `旧值 bg-white 在深色主题下…`），线 C 新增 **0 处** | CAP-P-01 | 逐条比对两提交全部新增行 × 4 条门禁正则（`RAW_PALETTE`/`RAW_NEUTRAL`/`INLINE_COLOR`/`BANNED_SHADOW`），排除豁免面。**批 7 扩面暴露面已测算**（HEAD 全库非测试非豁免）：C2 **31 处/26 文件**（= 代码 29 + 注释自伤 2）；C3 **130 处/14 文件**（= 代码 126 + 注释 4，且那 4 处在**不可手改的生成文件** `api-types.gen.ts` 里 → 必须走技术豁免） | 方案台账已登记（偏差 23） |
| frontend | **两项待人裁决（阻塞批 7）**：① **43 处 hex → `hsl(var(--accent-*))` 是可见的去饱和，未标注为视觉变更**——`page-registry.ts` 的 10 个导航配色逐个换算后**饱和度下降 16–54 点**、5 处另有 14–27° 色相偏移，且 **10 个 hex 收敛为 6 个 token**（3 蓝 → 同一 `accent-blue`、2 绿 → 同一 `accent-green`），页面色身份编码被压缩；线 C 自己在存疑清单里对 `decision-card.css` 提出过**同一问题**并提请裁决，却对本批 43 处照做未标注。② **Canvas 技术豁免的「换实现」远未达成**——`workflow-canvas.tsx` 已合规（还修掉 `var(--accent-*)` 三元组当色值致 MiniMap 恒黑的潜伏缺陷）；但 `prism-canvas.tsx`(46) 与 `blueprint-canvas.tsx`(10) 仍是硬编码霓虹色，且两文件在 `modules/auth/`（**非**豁免面）→ 批 7 若按字面放行会放行两个未换实现的文件 | CAP-P-01 | HSL 三轴逐项换算（源 hex vs `index.css` 的 token 值）；三 canvas 文件逐个核对取色方式 | 方案台账已登记（偏差 21/22），**裁决前批 7 的 C3 白名单不得把 prism/blueprint 列入技术豁免** |
| frontend | **口径自纠（协调方自身错误）**：本批简报的 **D6 数字错了**——「51 页中已有 3、待补 48」只把**字面量** `data-ai-page=` 当唯一形态，**漏算了 31 页经 `PageShell aiPage=` / `CORE_AI_PAGE_IDS.*` 透传的声明**。按「有无任何声明」口径，HEAD 实缺 **17 页**，线 M 补 16，余 1 页（`shared/pages/error-page.tsx`，在线 C 子树且 D6 未分派给它）。线 M 在报告中主动纠正了协调方，**该纠正是对的** | CAP-P-01 | 独立复现（按 rev 快照）：`*-page.tsx` 共 **51** 个；线 M 前 = 字面量 3 + 透传非空 31 + 缺失 **17**；线 M 后 = 字面量 9 + 透传非空 41 + 缺失 **1** ✓ 与线 M 自述逐格吻合。并校验每一处透传的**取值非空**（无 `{}`/`undefined`/空串），透传取值样例：`"auth-login"`、`"acceptance-list"`、`{CORE_AI_PAGE_IDS.analytics}` | 方案台账已登记（偏差 20） |

> **度量口径的通用教训（本批第二次踩）**：三条都是「**口径悄悄变窄，数字看起来变小/不变**」——
> ① 我数 `data-ai-page` 只认字面量属性，漏了组件 prop 透传（17 vs 48）；
> ② 线 C 数内联色省掉门禁尾部的 `\b`，`blueprint-canvas.tsx` 从 10 虚增到 17；
> ③ 线 M 数中性裸色时**被自己新写的解释性注释补回同样的数**，于是「修了 2 处」在计数上完全看不出来。
> 与批 4 的 `--z-*` 键名、批 9a 的 `JsxElement.attributes` 同族：**凡「计数/存在性」判断，必须以最小反例实测，且要明说口径的边界（含不含注释、含不含透传）。**

### 前端设计治理——BCD 方案 · 批 6a「三态收口」（D5）

> 批 6 按**关注点**拆为 6a/6b 串行。6a 收口「加载 / 空 / 错误」三态的**写法**（宪法 §10.6 三态选型决策树 + §10.1 唯一实现），**不改任何公共组件的对外 API**。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **四步三态收口，共 25 个源文件**（+2 个 i18n）。①**手写 `animate-spin` → `ui/spinner`（12 文件）**：`sync-progress-dialog` / `task-linear-panel` / `project-linear-sync-status` / `project-prompt-settings-panel` / `project-roles-section` / `storage-settings`(4 处) / `git-section`(3) / `integrations-section` / `short-id-section`(3) / `terminal-section`(2) / `repository-list-page` / `mcp-tab`。②**内联「暂无XX」→ `EmptyState`（7 文件）**：`skills-tab`（手写 dashed 块整体替换，带 `action`）/ `team-detail-page`(3 处含 colSpan 表格行) / `member-detail-page` / `team-stats-section` / `iteration-detail-dialog` / `delivery-page`（原无空态）/ `shared/ui/filter-panel`。③**遮罩语义收敛（1 文件）**：`global-loading-state.tsx` 收敛为非阻塞顶部进度条，去掉 `description`（原文案含 §16.6 禁用词「请稍候」）。④**`AsyncState` 作为数据组件默认入口（3 文件）**：`task-picker-dialog`（4 路三元链 → AsyncState，保留原 Spinner 为 `loadingFallback`）/ `linear-projects-table`（4 骨架行保留为 `loadingFallback`）/ `section-task-links-list`（3 处提前返回守卫 → 单个 AsyncState，带 `onRetry`）。i18n：新增/改写 6 组空态 title+description 键（zh-CN + en） | CAP-P-01 | **协调方独立复现（不采信自报）**：改动文件数 **25 ✓**（与自报一致）；`tsc -b` **exit 0**；八道设计门禁全 **EXIT=0**；子代理自跑 **56 个测试文件 / 317 个测试 0 失败**。四步数字复核（我的口径 vs 自报，**全部落在 ±1 内**）：`animate-spin` 子串 18/17 文件、词边界去注释 17/16、非豁免 15/14；「暂无」**全量 45/45 完全吻合**、非测试+去注释 26/25；`AsyncState` 消费方 27/26（非测试 26/26）；遮罩三组消费方**逐项吻合**（`LoadingOverlay` 应用侧 0、`GlobalLoadingState` 仅 `main.tsx`、`ErrorOverlay`/`useLoading` 零消费者） | 无契约变更；i18n 键取值变化（已 grep 确认每键仅一处引用）；`PRINCIPLES.md` §10.6 无需改（本次是其落地执行） |

> **批 6a 执行偏差记录（3 处，方案的 D5 数字高估）**：
> 20. **第 1 步「30 个文件」高估约 2 倍——真正需要处理的加载指示只有 14 处**。方案的 30 是**子串口径**，把三类非「加载指示」的命中一并计入：① **状态旋转 10 处**（`in_progress`/`running`/`s.spin` 等，语义是「状态」不是「加载」）；② **vendored 配方 1 处**（`ui/toast.tsx` 的 coss 官方配方，按 A2 豁免面不手改）；③ **装饰动画 1 处**（`blueprint-canvas` 20s 缓慢旋转）。另 1 处仅命中 JSDoc 注释（`header-action-button.tsx:34` 注释里写着「如 animate-spin」）。故**方案的工作量按 30 记会多派一倍人力**。
> 21. **第 3 步「2 处」不成立——应用侧 `LoadingOverlay` 消费点为 0**。方案若指「两个组件本身」则成立；若指「两处需厘清的调用点」则不成立：`LoadingOverlay` 在应用侧**零消费**，`ErrorOverlay` / `useLoading` 同样是**零消费者的死表面**（§10.1 删除候选）。**且全屏阻塞场景（导出/切库）当前没有任何一处使用 `LoadingOverlay`，故无「误用」可修正**。因「组件不删、先标记」的裁决，死表面原样保留。
> 22. **第 4 步不存在方案所称的「待盘」数字，且宽口径严重虚高**：严格三态三元链实测 **4 处 → 1 处**，提前返回式守卫 **1 → 0**；但「同文件同现 isLoading + error + 空判」的**宽口径得 66 个文件，该口径对「是否已收口」不敏感**（转换后 `isLoading`/`error`/`isEmpty` 只是变成 `AsyncState` 的 props，仍命中），**不能当工作量**。真实可无损转换的只有 3 处，其余被 `AsyncState` 的 API 缺口挡住（见存疑 2）。
>
> **交回的 8 项存疑（供人裁决，均未擅自实现）**：① **`HeaderActionButton` 的 `icon: LucideIcon` 槽装不下 `Spinner`——阻塞 2 处加载指示**（`shell-layout.tsx:984`、`project-team-page.tsx:104`）。`Spinner` 是普通函数组件，赋值报 `TS2741: Property '$$typeof' is missing`（已实测复现）。建议加 `loading?: boolean`（§10.7 命名已预留），**属改公共组件 API，未自行改** · ② **`AsyncState` API 缺口——阻塞第 4 步大部分转换**：缺 `emptyAction`（空态要挂按钮，宽口径 66 个文件绝大多数卡在此）、缺自定义 error 节点/`errorTitle`、缺 `className` · ③ **`async-state.tsx:63` 的默认 `emptyTitle = t("common.noData","暂无数据")` 是「暂无」文案最大的扩散源**——每个不传 `emptyTitle` 的调用点都渲染它；改它等于改公共组件对外契约，**未动** · ④ **第 2 步剩余 6 个未承载点**（`activity-heatmap` 的 `emptyLabel` 是公共 prop 默认值，改 EmptyState 会把卡片内一行小字升级成 `min-h-40 border-dashed` 块致视觉密度失衡；`station-context.ts` 是 adapter 字符串非 JSX；`radial-watch-deck.tsx` 受 ai-surface「宁可显示无数据，不显示像数据的假话」约定，是否纳入 §16 需产品裁决；`delivery-page.tsx:589` 与 `document-edit-page.tsx:299` 是**单元格/字段级**占位，换 EmptyState 会撑高行高）· ⑤ **19 处已在 EmptyState/AsyncState 内但标题仍是「暂无XX」**——结构合规、文案待收口，建议单独一批；**且多处有测试锁死文案**（`project-gantt.test.tsx:51`、`tasks-page.test.tsx`、`project-milestones-page.test.tsx`），改文案须与测试 owner 协同 · ⑥ `ui/toast.tsx:157,246` 的 `in-data-[type=loading]:animate-spin` 是 vendored coss 配方，按 A2 保留 · ⑦ `ErrorOverlay`/`useLoading`/`LoadingOverlay` 的 `overlay`/`inline` 模式应用侧零消费——§10.1 删除候选，因「不许删文件」未处理 · ⑧ **测试资产里就写着「暂无数据」「暂无工单」**（`async-state.test.tsx:62`、`empty-state.test.tsx`），若后续统一文案需同步。
>
> **口径诚实性说明（子代理自陈，予以保留）**：该代理在一次扫描中用过更窄口径（第 1 步 29/27、第 2 步 34 文件、第 4 步严格链 4/宽口径 15），与收尾全树复测口径**不同、两次数值不可直接相减**；其所报「前」值是按「收尾口径 = 后值 + 已知被清空的文件数」重建的。**此说明值得保留——它把口径不一致主动讲清楚了，而非拼接出一个好看的数字。**

### 前端设计治理——BCD 方案 · 批 9a「D10/D11 只读审计」（前置审计，未改产品代码）

> 批 9 的**前置审计**：把 D10（响应式断点）与 D11（无障碍）的现状做成**只读事实底账**，供后续代码改造排期。**本批零产品代码改动**，产出单篇报告 `docs/design/审计-D10断点与D11无障碍-2026-09-27.md`（74KB，含逐文件行号清单与 jsx-a11y 分级接入方案）。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs | **新建审计报告** `docs/design/审计-D10断点与D11无障碍-2026-09-27.md`。D10 用**手写词边界 + 真实文件脚本**（禁 bash 内联正则）逐处判别断点前缀，分「真断点类名 / 同名非断点（对象键、cva 变体键）/ 注释文本」三类；D11 用 **TypeScript 编译器 API 解析 TSX AST** 逐节点盘点宪法 §8.5 八条（正则无法判定「`<button>` 的子节点是否只有一个图标」这类结构问题），并附 `jsx-a11y` 每条规则的预估命中数（**只出方案不实施**） | CAP-P-01 | **协调方独立复现（不采信自报）**：D10 四口径**逐格吻合**——宽松 405（119 文件）= 方案 D10 的 405 口径；真断点 349（106 文件）+ 注释 4 + 对象键 52；逐档真断点 sm 184 / md 86 / lg 62 / xl 17；`2xl:` / `3xl:` / `max-*:` / v4 容器查询 `@sm:` / `@theme --breakpoint-*` **全部 0**。`xl:grid-cols-*` 15 处（10 文件）、`sr-only` 31 处、`@min-[…]:` 4 处（仅 `auth-shell.tsx`）逐处对上。D11 的 339 亦复现 | 新增审计报告（不入代码路径） |

> **本批的四处必须带走的结论**：
> ① **真断点数比方案少 13.8%**——方案的 405 口径把 **52 处对象键**（JS 对象字面量 / cva 变体键，**不产生任何断点行为**）和 4 处注释文本算了进来；**实际生效的真断点 = 348 处**（349 中另有 `intake/components/analysis-draft-dialog.tsx:108` 一处是 JSX 注释内对 `sm:max-w-md` 的引用）。
> ② **`xl:` 17 处真断点里 0 处是 `max-w-*`**——宪法 §15.3 写明「xl 只做内容区最大宽度封顶，不再增加列」，而实测 15 处正是点名的 `xl:grid-cols-*`（**增加列**），**全部违背条文**。`md:` 86 处中 51 处（59%）是网格增列，而 §15.3 给 md 的职责只有「双栏 → 单栏、抽屉全宽」。`sm:` 184 处中仅 23 处（12%）落在「表格列收缩」职责附近，大头是**宽度/尺寸 57 处 + 间距 44 处**（如 `page-shell.tsx:15-17` 的 `px-4 sm:px-6` 内边距阶梯）——**属未授权的自由发挥，但业务上很难说不合理**。
> ③ **审计给出的关键判断：§15.3 在当前 349 处存量下「不可执行」**。真实用法里 134 处是网格列数、68 处是间距，二者都不在职责表里；若照条文逐条整改会得到**一份 200+ 项而无法收敛的整改单**。审计建议把 §15.3 从「白名单式职责固定」改为「**黑名单式禁止**」（禁 xl 增列、禁 lg 以下藏操作、禁 `max-*` 反向写法）。**此为宪法修改建议，须人裁决后方可动 `PRINCIPLES.md`。**
> ④ **`jsx-a11y` 现状：本仓未安装**（`apps/frontend/package.json` 与 `pnpm-workspace.yaml` 均无），`eslint.config.js` 为 flat config——审计的分级接入方案基于此现状给出。

> **协调方复核对审计报告的一处修正（登记，不静默）**：报告 §4 表格的列头为「实测（**非测试**）」，其中 `aria-*` 一行记 **339 处**。协调方以 TypeScript AST（`ts.isJsxAttribute` 且 name 以 `aria-` 开头）独立复现：**339 是「全部文件（含测试）」的口径**，**非测试应为 311**（差额 28 来自测试文件自身的 aria 属性，仅 `input.test.tsx` 一个文件就占 13）。同口径下**原始子串 485 处（报告记 484）/ 其中测试 75 处（完全吻合）**——±1 的漂移归因于复测时**其他批次正在改写 `src/**`**（工作树 890 个文件 vs HEAD 878，含批 8 的 12 个未追踪测试文件），非报告错误。**该修正不改变任何结论**（报告的原意是「三个口径都对不上方案所称 439」，311 与 339 皆对不上）。**另需注意**：报告 §0.2 记录的 `JsxElement` **没有** `.attributes`（属性挂在 `node.openingElement.attributes` 上）这一 AST 陷阱，已由协调方复现确认——写脚本者务必先看这一段，否则属性类检查会**静默全部失效**。

### 前端设计治理——BCD 方案 · 批 8「D14 组件补测」（Top-20 组件测试补强）

> 本批为**纯测试批**：新增 12 个测试文件 + 追加 2 个既有测试文件，**零组件实现改动、零契约改动**。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **`src/components/ui/` 新增 12 个 `*.test.tsx` + 追加 2 个既有测试文件的 describe 块**，共 **新增 163 个用例**（14 文件合计 175 用例全绿）。覆盖组件：Button（8 variant × 8 size 全量 + `render` API，29 例）、Input/PasswordInput（15）、Badge（11）、Dialog 全族（开合状态机 / 焦点 / Escape，15）、Spinner（4）、Card（7 插槽，6）、Skeleton 族（7 导出，22）、StatusPill（5 tone，8）、AsyncState（四态分支，9）、PageHeader（17）、SectionCard（7）、Alert（6）；追加：NativeSelect（+6 → 13）、EmptyState（+8 → 13） | CAP-P-01 | **协调方独立复现台账**：`components/ui/` 生产组件（非测试 `.tsx`）**96** ✓、ui 测试文件 **25** ✓、同名测试文件覆盖率 **25/96 = 26.0%** ✓（批前 13/96 = 13.5%）。批内自测：14 文件 `Test Files 14 passed / Tests 175 passed`；`tsc -b` 零错；eslint 0 error；八道设计门禁全 PASS（过程中自查拦下 1 处：测试内直用 `<Loader2/>` 违反图标规则，已改为 `<Spinner size="sm"/>`） | 无产品代码改动，无需同步 `openapi.json` / PRD / 能力清单 |

> **本批未达方案指标（两处，必须如实登记）**：
> ① **整体覆盖率目标未达成**——方案要求「13.5% → **≥40%**」，实测到 **26.0%**（补齐 14 个组件后）。要到 40% 需再有约 14 个组件加入，**方案未排期**。
> ② **Top-20 覆盖 = 14/20 = 70%，方案所称「Top-20 达 100%」不成立**——原因是**方案选的这 14 个 ≠ 引用数 Top-20**。仍缺的 6 个（均为方案未排期）：`toast`(94)、`page-shell`(56)、`header-action-button`(40)、`checkbox`(20)、`label`(19)、`table`(18)。**其中 `toast` 是全库引用数第 2 高的组件**，缺口优先做。
>
> **引用数口径与漂移（重要）**：引用数 = 导入该模块的**消费方源文件数**（已排除 `*.test.*` 与 `src/modules/design-system/**`）。**该工作区为多批次共享**，实测有 20+ 个非 D14 源文件在批内被其他批次改写，故 `spinner`（56 → **67**，差 +12）、`empty-state`（42 → **49**）、`async-state`（23 → **25**）等数字**在一次批内两次测量之间发生漂移**。上表数字为**即刻快照**，非稳定值——**引用数不可作为跨批次可比指标**，后续排期须每次现测。
>
> **交回的 8 项存疑（供人裁决，均未擅自实现）**：① `status-pill` 的 5 个 tone 差异**全部只在 className**、无 role/aria/回调，按禁 className 的宪法 §18.2「每个 variant」对纯展示组件**不可满足**，建议加 `data-tone`（结构标记，非样式）或登记豁免 · ② **`input.tsx:40-47` PasswordInput 显隐按钮无 `aria-label`**（宪法 §8.5 #1 违规），纯图标表意且 `tabIndex={-1}`，批内**未写会失败的断言**、只断言了 `tabindex="-1"` · ③ `skeleton.tsx` 全族无 `aria-hidden`/`role`，屏幕阅读器会朗读无意义占位块，**建议加 `aria-hidden="true"` 后才有可写的 a11y 断言** · ④ `dialog.tsx:76/114` 关闭按钮**硬编码英文 `Close`**，若后续 i18n 化则批内断言需同步改 · ⑤ **`native-select` 的「选中 → `onChange`」在 jsdom 不可测**（base-ui `SelectContent` 打开后在 jsdom 只渲染空 `role="listbox"`，疑似依赖布局测量），§18.2 的交互下限缺席，需 Playwright 或组件侧改造补齐 · ⑥ `page-header.test.tsx` 对 `SubscribeButton` 用了 `vi.mock` 空节点替身（该组件依赖路由作用域 + 订阅接口），真要集成需补 MSW handler 并接受额外耦合 · ⑦ **标题语义缺口**：`card.tsx` CardTitle / `section-card` 标题 / `alert.tsx` AlertTitle 均渲染 `div`、不进入标题树（`EmptyState` 的 title 是 `h3`，是好的），批内按文案断言保持绿灯，**是否要求语义标题待裁** · ⑧ **批 8 完成情况是否登记文档**——已由协调方登记于本条目。

### 前端设计治理——E 类 · 批 1「组件登记与标记」（零删除）

> 本批的定位：**把「组件库实况」变成可机读的单一真相源**。此前「有哪些组件、谁在用、哪些是死件」只散落在人工维护的 `COMPONENTS.md` 与各人记忆里，且从未与磁盘对账过。本批建 registry 作为登记真相源，并**一个组件都不删**——按用户裁决：**先标记、经人审阅后再删**（清退执行属 E 类批 9）。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **新建 `src/modules/design-system/registry.ts`——334 条组件登记条目**（类型定义照 E 类方案 §5.2 逐字落地）。构成：UI 原子层 97（`components/ui/` 96 个 `.tsx` + `menu-surface.ts`）、跨模块 35（`shared/components/` 34 + `shared/ui/` 1）、模块层 202（`modules/*/components/**` 全量登记）。状态：**canonical 299 / review 18 / standby 17**（+1 行是文件头文档注释，非条目——故 `grep -c "status: 'standby'"` 会得 18，注意口径）。**零删除**：所有存量问题组件一律置 `review` 并写 `reason` + `proposal` + `reviewBy: '2026-10-31'`。**COMPONENTS.md 改为由 registry 单向再生**（220 行手写版 → 480 行再生版，旧版可从 git 历史取回），新增再生器 `scripts/gen-components-md.mjs` | CAP-P-01 | **独立复现双向对账**（不采信自报）：registry 334 条目 ↔ 磁盘 334 文件，**未登记 0 / 登记但不存在 0 / name 重复 0**；`lint:registry` `Component registry check passed (96 components)`。**零引用清单实测 30 个**（生产口径 = `modules` + `shared` + `app` + `main.tsx`，排除测试与展示页）：① **全库 0 引用 5**（`anchored-menu` / `direction` / `navigation-menu` / `sidebar` / `view-display-popover`）；② **仅画廊引用 15**；③ **仅测试/mock 引用 3**（`shared/ui/filter-panel`、`bug-template-helper`、`doc-category-chips`）；④ **模块层零引用 7**（`task-board` / `batch-create-tasks-dialog` / `thinking-stream` / `agent-handoff-card` / `mention-renderer` / `mention-textarea` / `task-rows`）。门禁：八道设计门禁全 PASS、`tsc -b` 零错、eslint 零错 | 新增 `registry.ts`（登记真相源）+ `gen-components-md.mjs`（再生器）；`COMPONENTS.md` 转再生 |
| scripts | **顺带修复 `check-component-registry.mjs` 的一处正则缺陷**（本批暴露）。原正则 `/\bui\/([a-z0-9-]+\.tsx)\b/g` **未锚定 `components/` 前缀**，会把 `src/shared/ui/filter-panel.tsx` 里的 `ui/filter-panel.tsx` 误采为「已登记的 ui 组件」，进而判为「COMPONENTS.md 引用了不存在的组件文件」**直接红门禁**。批 1 当时的规避手法是在生成脚本里**把该行路径拆成两个代码片段**（`` `src/shared/ui/` `` + `` `filter-panel.tsx` ``）——**脆弱的文档侧 hack**：任何后续非 `components/ui` 的 `ui/<x>.tsx` 路径都会复现同一问题。本次改为在**校验脚本侧**加负向后顾 `(?<!shared/)` 锚定，并把生成脚本里的拆段逻辑删除、文档恢复自然直写 | CAP-P-01 | **实测复现缺陷**：把该行路径还原成自然直写 → 现行正则 stale = `["filter-panel.tsx"]`（门禁会红）；改用 `(?<!shared/)` 后**两种写法均 96/`[]`/0**。**负向测试**确保未削弱门禁：临时新增一个未登记的 `components/ui/probe-gate.tsx` → 门禁仍正确 exit 1 并列出该件；删除后 exit 0 | `check-component-registry.mjs` 正则 + 注释；`gen-components-md.mjs` 移除拆段 hack |

> **E 类批 1 的范围偏离（登记，不静默）**：方案把「`COMPONENTS.md` 改由 registry 单向再生」列在 **E 类批 4**（画廊全覆盖 + 裁决面）。本批提前做了这一步——理由是批 1 若不建再生链，就只能在手写 md 上叠加登记区，**两处会立刻漂移**。**E 类批 4 的其余部分（拆分 6244 行展示页为 sections、registry 驱动渲染、治理仪表、「只看待裁决」筛选）仍未做**。
>
> **本批实测纠正的两处陷阱（登记以免后人重踩）**：① **`member-card` 是同名不同件的两个文件**——`modules/auth/components/member-card.tsx` 与 `modules/team-member/components/member-card.tsx` 内容不同、**都在用**（分别被 welcome-page / members-page 以**相对路径** import）。它们一度被误判为「零引用」，因为相对路径 import 逃过了「按 `components/ui/<stem>` 路径匹配」的统计法；registry 内为保 name 唯一把后者记为 `member-card-team`。**是命名冲突还是本该合并，待裁**。② **方案 §五 E2-B 与 §七 D 项对同一个 6 件集合给出相反状态**（前者要 `review`、后者要 `standby`）；本次按更具体的具名规则取 `standby` 并**同时保留 `review` 数据块**，使「只看待裁决」视图仍能取出它们（35 条待裁决 = 18 review + 17 standby）。
>
> **待裁决清单（8 项，供人裁，均已在 registry / `COMPONENTS.md` 留痕）**：E2-B 六件的状态口径（`review` vs `standby`，改一个字段即可切换）· `member-card` 重名是否合并 · `bug-template-helper` / `doc-category-chips` 仅测试引用，保留还是清退 · `menu-surface.ts` 的归类（有真实消费方但性质是常量模块而非组件）· **`ui/` 层 5 处分层倒置**（`ui/page-header.tsx → @/shared/components/favorite-toggle`；`ui/tab-bar.tsx → @/shared/tabs|command-palette|route-preview`；`ui/document-preview-dialog.tsx → @/shared/mdx/mdx-pipeline`）——E 类批 5 的 `lint:layers` 会直接拦住，**开规则前需先定豁免口径** · `dropdown-menu` 在 5 处生产代码仍在用却按批 1 要求置 `review`，是否先改回 `canonical` · `section` 只做到四个顶层分区，75 个细分标签需新增字段（本批未自加字段）· `stat-card` vs `stats-card` / `autocomplete` vs `combobox` 的合并方向已写入 `review.target`，但「谁是唯一实现」的判断无法代人类定。

### 前端设计治理——BCD 方案 · 批 5「token 迁移：圆角 + 层级」（D1 / D3）

> 批 5 的标题原列六项 token 迁移，**其中四项（字阶 1000 / 阴影 104 / 动效 97 / 排版 74）经实测已由 A 类执行全部完成**——规则在跑、只是账没销。实做范围收敛为**圆角 + 层级**两族，分两次提交：圆角 `7d0a1667`（下表）、层级 `e0d3dc4d`（下下节）。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **裸 `rounded` 145 处 + `rounded-2xl` 31 处 + `rounded-3xl` 1 处 + `rounded-4xl` 1 处归位宪法 §4.5 六档**（90 文件）。裸 `rounded` 是 Tailwind 默认 4px，**根本不是本仓 token**；`rounded-2xl` 与 `rounded-xl` 同值（16px）属重复档，§4.5 明文禁止。迁法为**逐处人工判定的显式「文件:行号 → 目标档位」映射**（非正则猜测），每条替换前断言「该行恰好 1 个裸 `rounded`」，实跑 145/145 成功 0 异常。落点（按提交新增行内的档位出现次数计，**含下述展示页内容修正，故略大于迁移站点数**）：`rounded-sm` 81（行内 code·kbd、静态行内小标、skeleton）/ `rounded-md` 56（按钮、下拉选项行、单元格）/ `rounded-xl` 32（全部来自被清除的 `2xl`/`3xl`）/ `rounded-xs` 12（勾选指示器、进度轨、16px 图标瓦片）/ `rounded-chip` 2 / `rounded-lg` 1。`modules/design-system/**` 32 处按豁免 A4 未动；`lib/utils.ts` 的 twMerge 配置键与 `shell-layout.tsx` 的注释非类名，正确跳过；`drawer.tsx`/`navigation-menu.tsx`（A2）实测无裸 `rounded`，无需跳过。**展示页的圆角演示区属内容修正**：`RADIUS_VALUES` 原为旧 Tailwind 阶梯且**数值与实际 token 不符**（`sm ~6px / md ~8px / xl ~14px / 2xl 1rem`），改为新六档 `xs 2px / sm 8px / md 10px / lg 12px / xl 16px / chip 999px` 并新增用途字段 | CAP-P-01 | **独立复现 agent 的机械审查**（不采信自报）：把提交 diff 中每个 `rounded*` token 归一为占位符后**逐 hunk 比对前后骨架**——**180 个 hunk 中 175 个是纯 token 替换**（涉 180 行，**零布局/间距/颜色改动**）；**5 个非纯 hunk 无一例外都是已声明的偏离**：`design-system-page.tsx` ×3（A4 展示页内容修正）、`command.tsx` ×1（`--radius-2xl` → `--radius-xl` 档位归一）、`check-tailwind-arbitrary.mjs` ×1（白名单注释文字）。迁移后实测：**`rounded-2xl`/`3xl`/`4xl` 的实际类用法全仓清零**（唯一命中是 `check-tailwind-arbitrary.mjs` 注释里那句「禁止 `rounded-2xl`」，非类名用法）；生产代码裸 `rounded` **剩 0**。`tsc -b` 零错；`pnpm --filter frontend build` 成功；八道设计门禁全过（幽灵类比对 3413/15845 零未定义）；**前端全量 178 文件 / 1189 用例全绿 exit 0** | 展示页 `RADIUS_VALUES` 改为新六档 + 用途字段 |
| frontend · scripts | **越界残留清零（复核阶段裁决，含本批唯一有视觉变化的一处）**。① `command.tsx` 的 `--radius-2xl`（4 处）+ `rounded-b-2xl` → `--radius-xl` / `rounded-b-xl`：**全量产物实证** `--radius-2xl` 确被生成为 `1rem`、与 `--radius-xl`（`calc(0.75rem + 4px)` = 16px）**等值 → 零视觉变化**；此举消除对 Tailwind 内置默认阶梯的依赖（本仓已对 sm/md/lg/xl 弃用它），并清掉 §4.5 禁止的档位引用，白名单同步登记并**如实登记与 coss 上游配方的偏离代价**。② `badge.tsx` `rounded-4xl` → `rounded-chip`：`h-5` 盒子上 32px ≥ 半高本就渲染为胶囊，**零视觉变化**。③ **`auth-visual-card.tsx` `rounded-3xl` → `rounded-xl`：本批唯一有视觉变化的修正**（24px → 16px），依据是 §4.5「禁止 `rounded-2xl` 及以上」。④ `markdown-view.tsx:64` 行内 `<code>` 的 `rounded-xs` → `rounded-sm`：§4.5 的 `xs` 用途是「标签内小标、热力格、勾选指示器」，行内 code 不在其中；行内按键原型组件 `kbd.tsx` 本就是 `sm`，故属既有违规而非另一种风格。⑤ ⚠️ **`documents-page.tsx:544` 回改 `chip` → `md`**：agent 将裸 `rounded` 判为 badge/pill 归 `chip`，但**同文件 404 行的同组件**早已用 `rounded-md` 刻意把 StatusPill（基类 `rounded-full`）压平——`chip` 等于把作者想压平的胶囊恢复回去、与相邻兄弟相反 | CAP-P-01 | 全量产物实证 `--radius-2xl: 1rem` 且 `--radius-xl` = 16px（等值）；迁移后 `2xl` 及以上全仓清零；白名单脚本 `lint:tokens` 通过 | `check-tailwind-arbitrary.mjs` 白名单 3 条改指 + 偏离代价登记 |

> **批 5 遗留（未修，另批裁决）**：① **`design-system-page.tsx` 一个文件内仍有 34 处裸 `rounded`**（A4 豁免；**32 行，其中 2 行各含 2 个**——注意上文「迁移时跳过 32 处」是**按行**计、此处 34 是**按出现次数**计，**同一批、未增长**，两个数都对只是口径不同）。构成：7 行是正文里的行内 `<code>` 代码片，25 行是页面演示用的小芯片/按钮（`px-1.5 py-0.5 rounded bg-muted/60` 形态）——按 §4.5 前者应归 `rounded-sm`、后者按第 9 条裁决若为按钮应归 `md`。展示页在教新六档的同时自己用着被禁止的裸类，属「豁免面」与「展示页即规范对照」之间的张力。② `modules/settings/pages/sections/appearance-section.tsx` 主题预览卡是**四层嵌套不同圆角**（卡片 `xl` → 预览区 `lg` → 演示行 `md` → 进度条 `xs`），违反 §4.5 明文「**禁三层嵌套不同圆角**」（原记录写成「同屏 4 档」不准确：它们是**容器→内容的嵌套**，不是并列同屏）。③ `checkbox.tsx` / `input-group.tsx` / `menu.tsx` / `drawer.tsx` 的任意值圆角属 A2 原语或结构性值。④ **复核中新发现**：`shared/components/create-dialog/unified-create-dialog.tsx:1615` 的 `PopoverTrigger` 按钮用 `rounded-sm`，按第 9 条裁决（触发器归 md）应为 `md`——该行**非批 5 所改**（批 5 只动了同文件第 68 行的展示徽块），属既存状态，未回改，登记待裁。

### 前端设计治理——BCD 方案 · 批 5「token 迁移：层级」（D3）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **62 文件 / 122 个 z-index 工具类从裸数值与任意值归位宪法 §8.4 七档语义**（提交 `e0d3dc4d`）。**批 4 注册的七档至此首次被消费**（批 4 时产物零命中属预期 tree-shake，见批 4 条目）。迁法为逐一显式配对（122 个 token 全部配对成功，**零失衡**）：`z-50`×53 → `z-modal`、`z-10`×36 → `z-sticky`、`z-20`×13 → `z-dropdown`、`z-40`×5 → `z-overlay`、`z-30`×5 → `z-banner`、`z-0`×3 → `z-base`、`z-100`×3 → `z-overlay`、`z-100`×1 → `z-banner`、`z-60`×1 → `z-toast`、`z-1000`×1 → `z-dropdown`、`z-1001`×1 → `z-dropdown` | CAP-P-01 | **独立复现的机械审查**（不采信自报）：`z-*` token 归一为占位符后**逐 hunk 比对前后骨架**——**107 个 hunk 全部为纯 token 替换**（涉 119 行，**非纯替换 hunk 为 0**）。**⚠️ 值保持性实测：122 个 token 中 115 个计算值逐位保持，7 个计算值确实变化**——`loading-overlay.tsx` 3 处 `z-100`(100)→`z-overlay`(40)、`toast.tsx:78` `z-60`(60)→`z-toast`(70)、`connection-banner.tsx:28` `z-100`(100)→`z-banner`(30)、`filter-panel.tsx:334/414` `z-1000`/`z-1001`(1000/1001)→`z-dropdown`(20)。**末两处正是 §8.4 铁律点名的「靠加 z-index 解嵌套」的历史产物**，降回 dropdown 档即该铁律的落地，但**因此改变了原先「一定盖住」的行为，需视觉回归确认**（本批未做视觉回归）。迁移后残留复核 **语义档 122 + 裸数值 11 + 任意值 1 = 134**：裸数值 11 = **A2 豁免 6**（`drawer.tsx`×4 + `navigation-menu.tsx`×2）+ **A4 豁免 3**（`design-system-page.tsx` 画廊内 sticky 列）+ **注释文本 2**（`auth-visual-card.tsx:133`、`bottom-dock.tsx:239`——Tailwind 扫描器读纯文本，**注释里的类名照样生成规则**，属既存噪声）；任意值 1 为 `toast.tsx:103` 的 `z-[calc(9999-var(--toast-index))]`（编码兄弟堆叠序而非层级，原样保留）。**全量构建产物实证**：七档全部生成真实规则（`.z-base{z-index:var(--z-index-base)}` … `.z-toast{z-index:var(--z-index-toast)}`），旧值 `z-100`/`z-1000`/`z-1001`/`z-60` 生成 **0 条规则**。门禁：`tsc -b` 零错、`vite build` 成功（41.65s）、八道设计门禁全 PASS、**前端全量 178 文件 / 1189 用例全绿 exit 0**、eslint 0 error / 9 warning（均为既有，非本批引入） | 无（`src/index.css` 的 token 定义随批 4 已入库） |

> **⚠️ 批 5·层级的关键实测结论：档位名与实际语义大面积错配，不能当成「已按语义归位」来读**。本批做的是**保档位的改名**（新旧值一一对应），而非按语义重判，改名后逐站点复核发现：
>
> - **`z-sticky` 36 处中仅 3 处真正是粘性定位**（sticky 表头/侧栏）。余 **33 处实为「局部抬升」**——同一层内把某个元素抬到兄弟之上（卡片 hover、选中态、拖拽占位），**§8.4 根本没有这一档**。
> - **`z-modal` 53 处中仅 10 处是真模态对话框**。**30 处实为下拉层级**（历史 `z-50` 值本是 50，但语义是 dropdown，应归 `z-dropdown` 的 20）；**13 处无任何对应档位**可判。
> - 根因是**历史迁移把 20 档与 50 档混用成同一个值**（下拉一律写 `z-50`），且**七档划分缺一个「局部抬升」档**。**按语义重判需要宪法先补档**，故本批不做，登记待裁。
> - 未修三处：① `shared/layout/shell-layout.tsx:376` 移动端遮罩按语义应为 `z-overlay`，**超出本批授权清单**（授权仅覆盖原值命中项）。② `components/ui/toast.tsx:103` 的任意值见上表。③ `components/ui/navigation-menu.tsx` 的 `z-1` 按 **A2**（vendored 配方，改则偏离上游）豁免。
>
> **本条目数字的自查（2026-09-27）**：初稿曾写入一份**凭记忆手写的旧值配对表**（`z-[1000]`×23、`z-9999`×3、`z-50`×1 等），与实测严重不符——实测旧值分布是 `z-50`×57 / `z-10`×38 / `z-20`×15 / `z-40`×6 / `z-30`×6 / `z-100`×4 / `z-0`×3 / `z-1`×1 / `z-60`×1 / `z-1000`×1 / `z-1001`×1，且**全仓根本没有 `z-[1000]` 这类任意值**（任意值只有 1 处）。初稿还把「122 → 122」误读为「值逐位保持」——那只是 **token 计数**守恒，不是值守恒（值守恒的是 115 个）。两处均已按实测重写并 amend 了提交正文。**教训：token 计数守恒 ≠ 值守恒，手写映射表必须在写进文档前用脚本从 diff 里配对出来。**

### 前端设计治理——BCD 方案 · 批 4「构建基础设施」（D9 / D3）

> 批 4 的核心发现是一次**宪法缺陷**：条文里写的 z token 键名 `--z-*` 根本不被 Tailwind 识别，按字面落地会静默生成 0 CSS。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **z-index 七档注册（D3）——键名是 `--z-index-<name>`，不是 `--z-<name>`**。Tailwind 4.3.3 的 z 工具注册为 `themeKeys:["--z-index"]` / `valueThemeKeys:["--z-index"]`（`dist/lib.mjs`）；**写成 `--z-<name>` 会静默不生成任何 CSS**——类名合法、lint 不报、产物零命中，与宪法 §7.1 时长陷阱（`duration-<name>` 读 `--transition-duration-<name>`）**同型**。三重实证：① 源码 `themeKeys`；② 最小复现编译（同一条 `@theme` 并存 `--z-x: 50` 与 `--z-index-x: 60`，**仅后者**生成 `.z-x{z-index:var(--z-index-x)}`；对照组 `--ease-probeC` 正常生成，证明探针本身可信）；③ 落地后浏览器 `getComputedStyle` 复核七档计算值 **0/10/20/30/40/50/70 全部生效**。该实证同时暴露**宪法 §8.4 表头写错**（原稿 `--z-base`/`--z-modal`），已随宪法 v2.3 修正并把「theme 键名与工具类前缀不总是一致」立为通则 | CAP-P-01 | 上述三重实证；全量产物中 `z-base…z-toast` 零命中属**预期**（源码尚未使用，Tailwind 会 tree-shake），待批 5 层级迁移消费 | `src/index.css` 新增 7 条 `--z-index-*` + 命名空间陷阱注 |
| frontend | **`--radius-chip` 自引用核查：结论是无需改动**。`@theme inline` 的 `--radius-chip: var(--radius-chip)` 自身确为 invalid at computed-value time，但 `@layer base` 的 `:root{--radius-chip:999px}` 层序更后、是级联胜者；浏览器计算值实测 **`border-radius: 999px`**，未被吃掉（对照组：`z-sticky` 无 token 时是真 MISSING）。该行的**必要作用是「把 chip 注册进 radius 命名空间」**——缺它连 `.rounded-chip` 都不生成，故保留原样并登记依据，**不为改而改** | CAP-P-01 | 编译真实 `index.css` → `.rounded-chip{border-radius:var(--radius-chip)}` 正常生成；`getComputedStyle` = 999px | `src/index.css` 注释登记 |
| frontend · scripts | **spacing 语义档补宪法依据注释（值未变）**。数值型 `--spacing-*` 的删除**不属本批**——经核查**已于更早的 `b9f2b5ad` 完成**（删 42 条含 6 个冻结四分之一档，留 9 条 = 5 条弹窗/滚动区 + 4 条语义档）。本批补上 4 条语义档的出处注释（`cell-y`=py-1.5 / `gutter`=px-4 / `section`=spacing 24px / `page`=px-6，均取自宪法 §4.3）。并复核 `lint:spacing` 的 `BANNED_SPACING` **未放宽**：从脚本源码原样提取正则实测，`p-0.75 / mt-1.25 / w-2.75 / pt-3.25 / size-4.25 / gap-y-5.25` 全部 BANNED、`p-2.5 / p-13 / w-65 / gap-3.5` 放行；且该脚本**只扫 `.ts/.tsx`、不读 `.css`**，故「删定义」在机制上**无法**削弱冻结档拦截。动态刻度未受影响：产物 `.p-13{padding:calc(var(--spacing) * 13)}`，浏览器计算值 p-13=52px、w-65=260px ✓ | CAP-P-01 | 正则原样提取实测 6 BANNED / 4 放行；`node scripts/check-spacing-governance.mjs` passed | `src/index.css` 4 条语义档注释 |
| frontend | **新增 `src/lib/format.ts`（D9）+ `format.test.ts`**：10 个函数（`formatDate`/`formatDateTime`/`formatRelative`/`formatDateShort`/`formatTime`/`formatNumber`/`formatCompact`/`formatPercent`/`formatCurrency`/`formatDuration`），**零新增依赖**（`date-fns@4` + `Intl.NumberFormat`）。边界约定写死在 docblock：**无效输入一律返回 `''`，绝不抛异常**，调用方自写 `formatDate(x) || '—'`；locale 只识别两档（`zh*` → 简中，其余 → 英文），空串/空白回落默认档，**永不触发 Intl 的 RangeError**。`formatDate`/`formatDateTime`/`formatTime` **刻意不收 locale**（宪法 §14.2 已把形态钉死为 `2026-09-27` / `2026-09-27 14:32` / `14:32`），按 `i18n.language` 取值的 2 处调用点由 `formatRelative`/`formatDateShort` 覆盖。字符串一律走 `parseISO`，挡住 `new Date('2026-09-27')` 按 UTC 解析在西半球**偏一天**的经典错位。本批**不改任何调用点** | CAP-P-01 | `npx vitest run src/lib/format.test.ts` → **19 passed**（10 函数 × null/undefined、11 种脏输入含 `2026-13-45`/`25:00`/Invalid Date/NaN/±Infinity、跨时区断言设计为与机器时区无关、大数 `1.2万`/`170万`/`12K`/`3.4M`、百分比比值、耗时四档）。定向 `tsc` 零错、定向 eslint 零错 | 新增 `src/lib/format.ts`、`src/lib/format.test.ts` |

> **批 4 遗留（需知情）**：① `formatCurrency` 默认 **USD** 是执行方判断（宪法 §14.3 只说「保留币种」未定默认，仓内金额主要是 AI 成本 `$`）；注意 zh-CN 下输出 `US$0.51`，与旧 `formatCost` 的 `$0.51` **不同**，迁移调用点批次需留意。② `formatPercent` 取**比值口径**（依据仓内既有 `Math.round(ratio*100)` 写法），§14.3 未明说。③ `formatDateShort` 的 `9月27日` 是自写 pattern（date-fns zhCN 下 `'MMM d'` 会出 `9月 27日`）。④ `formatDuration` 的 **<1s 毫秒档**（`300ms`）是 §14.3 未规定的补充档。⑤ 跨时区断言**未在非 UTC+8 环境实跑**（本机 GMT+8）。

### 前端设计治理——BCD 方案 · 批 3「宪法补条文」（D1/D3/D5–D14 + B10）

> 批 3 的主题是**把「口头规则」升级为「成文宪法」**：D 类十二条文此前只存在于修改方案与调研报告里，代码侧却已按 A 类的语义 token 层在跑——即**规则在生效、却没有条文依据**。本批把十二节写进宪法正文，圆角 / 层级 / a11y / 三态 / 组件 API / 格式化 / 图表等此前无家可归的口径终于有单一出处。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs | **宪法 `PRINCIPLES.md` 升 v2.2——D 类十二条文入正文**（278 → 552 行）。§4.5 **圆角五档 + 胶囊**（`xs` 2px / `sm` 8px / `md` 10px 控件 / `lg` 12px 面板 / `xl` 16px 模态浮层 / `chip` 999px 胶囊；禁裸 `rounded` 与 `rounded-2xl` 及以上，同屏圆角层级 ≤ 2 档）；§8.4 **层级七档**（`base` 0 / `sticky` 10 / `dropdown` 20 / `banner` 30 / `overlay` 40 / `modal` 50 / `toast` 70，并定**铁律**：嵌套浮层不得靠加 z-index 解决——历史上 `z-1000`/`z-1001` 正是嵌套补救的产物）；§8.5 **无障碍最低要求** 8 条（图标按钮 `aria-label`、浮层标题、label 关联、非纯色传达、`focus-visible:ring-ring`、焦点进出、语义标签、图片 `alt`）并标明哪些靠 `jsx-a11y` 强制、哪些靠评审清单；§10.6 **三态选型决策树**；§10.7 **组件 API 约定**；§12 `data-ai-*` 标注协议；§13 表单；§14 数字与日期格式化；§15 响应式；§16 文案；§17 图表；§18 组件测试基线；附录 A 豁免清单。**结构自检**：§1–§18 连续无缺口/无重号，附录 A 收尾。按《版本号规则》，版本号仍在宪法头部单点声明 | CAP-P-01 | `pnpm check:docs-sync` **exit 0**（13 份受管文档）；章节序列 grep 复核（§1…§18 + 附录 A）；条款与批 4/5 的 token 契约逐字对齐（§8.4 七档 = 批 4 注册的 `--z-*` 七档） | `docs/design/PRINCIPLES.md` v2.1 → v2.2 |
| frontend | **`AGENTS.md` v1.5：缺口表三族收为两族 + 组件索引单点收敛**。（1）§3「已知缺口」表删除**圆角**行——它已由宪法 §4.5 覆盖，表内改为显式指向该节（原表头「三族 token 没有宪法条文」的断言在本批后已不成立，故改「两族」并补「圆角已由 §4.5 补上条文」）。（2）§6.1 移除 `components/ui/README.md` 引用。（3）**删除 `apps/frontend/src/components/ui/README.md`（11789 字节）**——该文件与 `COMPONENTS.md` 长期并存、内容是同一份组件清单的第二个副本，属典型第二真相源。删除后组件索引**单点收敛到 `COMPONENTS.md`**（`lint:registry` 强制对账）。按「组件删除走标记 → 确认 → 删除三步走」，本文件为**文档而非组件**，且删除已获用户 2026-09-27 明确批准（「README 可以删除」） | CAP-P-01 | 全仓 grep：存活引用仅剩 0 处（宪法 frontmatter `governance` 与正文「地位」段两处引用已同步清理）；`check:docs-sync` exit 0 | `apps/frontend/AGENTS.md` v1.5；删除 `components/ui/README.md` |

> **批 3 执行偏差记录（6 处，均已在提交 `694eb613` 正文与 `修改方案-BCD类-2026-09-27.md` 说明）**：
> 1. **§17.2 不写入已被证伪的事实**——方案草稿据旧侦察称图表深色值缺失，实测 `:root.dark` 第 379–383 行已有 `--chart-1..5`，故条文删除「当前缺失」表述。
> 2. **§8.4 / §4.5 不收录方案附带的「改造清单」**——改造清单属执行计划（批 5 范围），宪法条文只写规范本身，不写存量迁移步骤。
> 3. **§10.7 的 `§N.1` 占位符**改为「见 §3–§5」——宪法正文不出现未解析占位。
> 4. **两处悬空跨引用移除**——§12.4 的「（§C9）」、§18.3 的「见 B9」指向的是**修改方案的内部编号**，宪法读者无从索引。
> 5. **§15.2 补文档前缀、§12.3 嵌套反引号改双反引号**——Markdown 渲染正确性修正。
> 6. **宪法开篇的悬空引用由主会话补齐**——`ui/README.md` 随 B10 同批删除后，宪法正文「地位」段的文档清单与 frontmatter `governance` 字段仍指向该文件，**宪法开篇即指向不存在的文件**。此处属收尾遗漏而非 agent 偏差，已在本批提交内一并修正（同一提交，非追加）。
>
> **附：批 5 范围实测更正（不影响本批交付，登记于此以免批 5 误开工）**——批 5 标题中的四项数字（字阶 1000 / 阴影 104 / 动效 97 / 排版 74）**已由 A 类执行全部完成**：ripgrep 复测 `apps/frontend/src`，`text-10/11/12/13/15` = 0、`font-bold/light` = 0，命名阴影与非法 `duration-*` 的残留**全部落在豁免面** A2（`drawer.tsx`、`navigation-menu.tsx`）/ A4（`modules/design-system/**`）或为 `drop-shadow-sm` 正则误报。批 5 实做范围收敛为**圆角 + 层级**两族。

### 前端设计治理——BCD 方案 · 批 2「文档归一」（A 类收口 / B1·B2·B3·B6·B7·B8）

> 批 2 的主题是**消灭第二真相源**：宪法被下位文档抬成「并列」、AGENTS.md §3 抄了一份会静默过期的摘要、skill 源里指着两个已删除的目录、`DESIGN.md` 三处各写一个版本号。这些都不是错别字，是同一份规则在多个地方各自演进的结构性隐患。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs · frontend | **A 类收口：宪法 `PRINCIPLES.md` 升 v2.1「权威收口」**。（1）重写「地位」段——原表述把本文件与 `COMPONENTS.md` / `AGENTS.md §3` **并列**为真相源，这是 A3/A4/A6/A7 四条矛盾的**制度根源**（下位文档一旦被抬成同级，各自的过期就都不算违规）；现明确「本文件是唯一真相源，其余文档只引用不承载，冲突以本文件为准并须在当次 PR 删除冲突段落」。（2）新增**《效力链》**：宪法 → `check-*.mjs`（机器执行镜像）→ 代码；脚本与宪法冲突时**先修脚本再合代码**——把「谁说了算」从文档层落到可执行层。（3）新增**《版本号规则》**：宪法版本号**只在宪法头部声明一处**，其他文档一律写「见 `PRINCIPLES.md`」，**禁止抄写**（历史上曾同时存在 v1.0/v1.1/v1.2 三个口径）。（4）重写 **§11.2 修订流程**为 5 步（用户确认 → 改单点版本号 → 同步 `check-*.mjs` → 同步 CHANGELOG 并列「条文↔脚本↔存量迁移」三者对应 → 禁止带存量违规开闸）；原条文要求「同步更新 `frontend-page` skill 与 `AGENTS.md` 引用」——**把下位文档当成了同步对象**，而按新规则它们本就不该出现版本号。附注：v2.0 提交时 A 类 §1.2(1)(3) 实际**未落地**（仅 §1.2(2) 生效），本批补齐 | CAP-P-01 | `check:docs-sync` 通过（13 份受管文档） | `PRINCIPLES.md` v2.1；`governance` 字段改为「下位文档一律只引用不承载」 |
| frontend | **`apps/frontend/AGENTS.md` §3 由「宪法摘要」改为纯指针（v1.4）**。摘要的致命处在于**它会随宪法修订静默过期，等于第二真相源**——批 1 已实测到该节仍在教「px 直读档 `text-8/9/10/11/13`」，而该口径在宪法 v2.0 已违规。§3 由 43 行规则压缩为定位导航（宪法 / `COMPONENTS.md` / `check-*.mjs` / 冲突处理），3408 字符 → 435 字符。同时**清零两类失效引用**：`src/templates/`（该骨架目录已于 2026-08 随剪枝删除，文中 3 处仍在教「复制模板」，改为「同域最近似页面作结构参照」）、`src/lib/design-tokens.ts`（空壳文件，本批删除）。§1.4 骨架选择、§4.2/§4.3、§6.2 标题（改为「页面结构约定（骨架与装配）」）全部改为指向同域页面与 §6.2 装配细则 | CAP-P-01 | 全仓 grep：存活路径中 `src/templates/` 引用残留 0、`design-tokens` 引用残留 0 | `apps/frontend/AGENTS.md` v1.4 |
| frontend | **⚠️ 删节暴露的规范真空，已显式登记而不是静默丢弃**：§3 删除后实测，有**三族 token 宪法根本没有对应条文**——宪法有字阶/字重/行高/间距/颜色/图标/动效/阴影/三态，**但没有「圆角」节**；`h-dialog` / `w-dialog` / `max-h-dialog` 全族、`brand-linear*` / `brand-atlassian*` 全族在宪法中命中 **0** 次。它们此前**只写在 `AGENTS.md` §3**，删节后一度无家可归。处置：在 §3 指针内新增「已知缺口（勿当成规则依据）」表，登记三族的**现唯一出处**（`src/index.css` 的 `@theme`，运行时真相）并注明「**批 3 补条文（D1 圆角等）之前，不要据任何文档引用其档位含义；补条文后删表并回填章节号**」。**没有顺手往宪法里补条文**——E 类规则要求「没有机器强制的 `[MUST]` 不写进宪法」，且补条文属批 3 范围 | CAP-P-01 | grep 实测：`h-dialog`/`w-dialog`/`brand-atlassian`/`rounded-chip`/`radius-control` 在宪法中命中均为 0；宪法章节序列确认「§2 字体 → §3 字阶 → §4 间距 → §5 颜色」无圆角节 | `apps/frontend/AGENTS.md` §3 缺口表（批 3 删除） |
| .zcode/skills · scripts | **B1/B2 先修源 + B3 复制与同步门禁**。**顺序是关键**：批 1 的验收约束写明「**先修 `.zcode/skills/` 源，否则会把失效引用复制成 4 份、问题放大 4 倍**」。（1）**B1/B2 源修**——`frontend-page/SKILL.md` 的 `src/templates/` 骨架指引（3 处）改为「同域最近似页面」，§2 骨架选择与 §3 标题同步为「按骨架实现」，§4.1 的 `AGENTS.md` 引用改指 §6.2 装配细则；该文件第 63 行（B9 红灯条款）与版本号问题在批 1 已修，本批复核无回流。（2）**B3 新增 `scripts/sync-skills.mjs`**——历史上 8 份副本靠**手工 `cp`** 维护，这就是多源漂移的成因；脚本把「源 → `.claude`/`.codex`/`.opencode`/`.cursor`」变成**唯一写入路径**，skill 动态发现（含 `SKILL.md` 的子目录即算）、附件逐字复制、`--check` 模式报漂移/缺失并以 exit 1 给出修复命令。**副本横幅插在 frontmatter 之后**（插在之前会破坏 Claude Code 的 YAML 解析）。配套根 `package.json` 增 `sync:skills` / `check:skills-sync` | CAP-P-01 | `pnpm check:skills-sync` 通过（2 skill × 4 工具目录 = 8 份副本一致）；**两次故意漂移注入**（改副本 / 删副本）各报 exit 1，还原后 exit 0——证明闸门是活的而非装饰；本会话实测 `frontend-page` 与 `requirement-intake` 已可被 Claude Code 正常加载（此前闸门是「对着空气喊话」） | 新增 `scripts/sync-skills.mjs`；根 `package.json` 两个 script |
| docs · frontend | **B6/B7/B8 引用修复 + 版本号单点化**。（1）**B6/B7**——`DESIGN.md` 与 `docs/design/DESIGN.md` 的 `governance` 字段与「去哪读」行**去掉宪法版本号**，改为「版本号只在宪法头部声明一处，此处不抄写」；`check-spacing-governance.mjs` 注释同样改指宪法「语义化 token 层」而不抄版本。（2）**B8 路径勘误**——根 `DESIGN.md` 两处失效路径（`:364` 组件路径 `shared/components/create-dialog/unified-create-dialog.tsx`、`:389` 的 `file:///` 绝对链接）修正。**注**：调研报告给的坐标 `DESIGN.md:338` 有误（该行是表格分隔符），实际落点在上述两处。（3）**删除 `src/lib/design-tokens.ts`**——819 字节空壳（`export {}` + 纯文档注释），grep 确认**零代码引用**；同步清掉 `vitest.config.ts` 中指向已删目录的悬空 coverage exclude（`'src/templates/'`） | CAP-P-01 | grep 确认零引用后删除；`check:docs-sync` 通过 | 根 `DESIGN.md`、`docs/design/DESIGN.md`、`check-spacing-governance.mjs` 注释；删除 `design-tokens.ts`；`vitest.config.ts` |
| scripts | **修复提交护栏在「已暂存、随后从工作区移除」（`AD` 态）下的崩溃**。⚠️ **本条修正一个被证伪的中间判断**：最初推断是「lint-staged 把已删除的暂存文件传给 eslint，使删除操作被护栏拦下」，据此加 `--no-error-on-unmatched-pattern`。该推断**是错的**，三组证据厘清如下——① 读 lint-staged 源码：默认 `git diff --diff-filter=ACMR`（`getDiffCommand.js`），**D 已被滤掉**，删除类文件根本不会进任务列表；② 删除 `design-tokens.ts` 的提交实测正常通过 pre-commit，lint-staged 只把 1 个文件交给 eslint；③ 探针复现真正的崩溃条件——**`AD` 态（已暂存、随后 `rm`）**，A 在 diff-filter 之内故路径仍被原样传给任务而磁盘上并不存在。成对实测（ESLint 9.39.5，绝对路径形态）：无 flag → **exit 1**（`Oops! Something went wrong!`），加 flag → **exit 0**。结论：flag 保留（对 `AD` 态承重），但适用场景收窄为「暂存后被从工作区删除」，**不是**「删除文件」；配置头注已按实测重写并标注旧判断被证伪。另（非缺陷，如实登记）：**`docs/` 被 `.gitignore` 整体排除、`docs/design/` 为唯一例外**，故 `docs/README.md` 的编辑**只存在于本机工作区、不入库**——该编辑已实际发生，在此登记而非当作已交付 | CAP-P-01 | 上述 3 组证据 + 成对实测 exit 1 / exit 0；探针文件已清理，`git log` 确认 HEAD 未变、未产生任何提交 | `lint-staged.config.mjs` 两个任务 + 头注（含证伪说明） |

> **批 2 执行偏差记录（4 处，均已在上表与 `修改方案-BCD类-2026-09-27.md` 说明）**：
> 1. **A 类 §5.2 的章节重编号（裁决 T7）未执行**——方案一边给出以 `## 三、设计系统` 为标题的替换文本，一边要求 §4–§7 顺延为 §3–§6。实际取「**§3 保留编号、内容换成纯指针**」：T7 想要的空位已由指针填上，且避免级联改写 `§6.2`/`§6.4` 等 9 处交叉引用。
> 2. **版本号规则新增一条例外口径**——「禁止抄写版本号」与「保留历史存档原文」不可同时成立（存档原文内含版本号）。处置是给宪法**显式增加「明确标注为历史沿革/存档原文的段落除外」条款**，而不是静默改写存档文本。
> 3. **B3 的 8 份副本不进版本控制**——`.claude/`/`.codex/`/`.opencode/`/`.cursor/` 均被 `.gitignore` 的「Agent Tools」段排除，且**目录级排除无法用 `!` 反选救回**。本批取**最小改动路线**：源留在 `.zcode/skills/`，副本为本机产物。代价：**新 clone 需先跑一次 `sync:skills`**；`check:skills-sync` 因此**刻意不进 CI 与 `quality:gate`**——CI 上四个工具目录不存在副本，接进去只会永久红灯（脚本头注已说明它是「本机门禁」）。此项与「手册引用恢复」的合流方案留待后续批次裁决。
> 4. **一处中间判断被实测证伪并已更正**——关于 lint-staged 为何需要 `--no-error-on-unmatched-pattern`，最初推断是「删除文件会被护栏拦下」。实测证伪（`--diff-filter=ACMR` 已滤掉 D，且删除 `design-tokens.ts` 的提交实测正常通过），真正条件是 **`AD` 态（已暂存后从工作区移除）**。配置头注与上表均按实测口径**重写并显式标注旧判断被证伪**，未静默改写。另说明（非错误）：`.zcode/skills/` 中的**已跟踪**文件在被忽略目录内 `git add` 会附带报警但实际生效，本批 3 次提交均如此。

### 前端设计治理——BCD 方案 · 批 1「门禁自修」（B4 / B9 / C7 前置）

> 批 1 是 BCD 方案里唯一的「门禁自身修复」批次，按方案第四部分排序必须先做：后面所有批次的验收都要靠这几道闸门，
> 而它们此前分别处于「永不可达」「静默跳过」「主动承认红灯」三种失效状态。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| scripts · docs | **B4 门禁自修 ①：`check-doc-sync.mjs` Check 2 由「本次改动」改为「全量受管文档」**。旧实现的输入是 `git diff --name-only` 的产物，过滤器却要求 `f.startsWith('docs/')`——`docs/` 在 `.gitignore` 里（`docs/design/` 是唯一例外），**该分支命中率≈0**，这道检查对 docs 整体形同不存在；叠加上游 `changed.length === 0` 提前 `exit 0`，「无变更上下文」直接退化为「跳过全部检查」。现改为直接枚举 `git ls-files`（`-z` 输出，避开中文文件名的引号转义）的受管文档，**无论本次改了什么、甚至什么都没改都完整校验一次**，本地与 CI 口径一致；并补上原错误信息早已宣称、代码却从未做过的**字段级校验**（`title`/`description`/`status` 缺一即报，含 BOM 与未闭合 frontmatter 处理），以及「枚举为空即报错」——不再允许「扫到 0 个文件然后通过」。范围只收**已入库**文档：`docs/` 下 80 余份未跟踪的历史文档不入库、不可评审，对它们强制元数据只会得到「本地永远红、CI 永远绿」的分歧，比没有检查更坏。配套为 4 份受管文档补 frontmatter（`api-contract-proposals` / `mock-inventory` / `page-inventory` / `decision-cards-roadmap`），全量受管文档 13 份一次到位。**实测闸门是活的**：删 `status` 字段 → exit 1；删整个 frontmatter 块 → exit 1；还原 → exit 0 | CAP-P-01 | `check:docs-sync` 通过（13 份受管文档）；3 次故意违规注入-回滚验证（两种违规各报 exit 1） | 4 份受管文档补 `title`/`description`/`status`；`修改方案-BCD类-2026-09-27.md` 新增「执行进度」滚动表 |
| scripts | **B4 门禁自修 ②：删除 `check-doc-sync.mjs` Check 4「软删除候选状态一致性」**（裁决 B-2）。该检查读 `docs/reports/doc-cleanup-soft-delete-candidates-2026-04-04.md`——**文件不存在**，`catch {}` 把异常吞掉后由 `if (archivedPaths.length === 0) return;` 静默跳过，即「一道永远不执行的检查」：它唯一的效果是让门禁看起来是绿的。且「文档生命周期追踪」应由 APM 自家文档模块承担（自举原则），不该由 CI 脚本硬编码一份 2026-04 的过期清单路径。删除函数与调用点，原位留裁决理由；同时清掉自 Check 4 起就无人使用的 `statSync` / `readdirSync` / `node:path` 导入 | CAP-P-01 | 全仓 grep 确认零残留引用（仅剩说明性注释） | — |
| .zcode/skills | **B9：废除「两个存量失败不算回归」测试基线条款**。`.zcode/skills/frontend-page/SKILL.md` 原文把「task-page.test 与 project-list-page.test 两个存量失败与本流程无关，不算回归」写成**规范条款**——这不是文档失效，是规范主动放弃测试门禁：它把红灯制度化，等于告诉后续每个会话「这两个失败是正常的」。**实测其前提也早已过期**：`task-page.test` 在当前树中已随旧任务页（`modules/issue/pages/task-page.tsx`，路由实际挂 `tasks-page.tsx`）一并被删除，全仓不存在该文件；`project-list-page.test.tsx` 单文件 1 用例通过。改为「**所有测试必须通过**；失败即回归，须修复或先撤销变更」，并注明条款废除日期与依据 | CAP-P-01 | 前端全量 **177 文件 / 1170 用例全绿**（exit 0）——这正是该条款原本要求的基线 | `.zcode/skills/frontend-page/SKILL.md` 特殊规则节 |
| frontend | **C7 前置：修掉最后 2 例「写了不生成 CSS」的幽灵类，并补全检查的命名空间**。①`animate-spin-slow`（`shared/components/create-dialog/mode-shuttle-button.tsx:59`）——仓内从无 `--animate-spin-slow`，类名合法却生成 0 CSS、动画静默不转；按方案登记 `--animate-spin-slow: spin 2s linear infinite`（复用 Tailwind 默认 `spin` keyframes：默认档 1s，本档 2s）。②`ease-ease`（`components/ui/navigation-menu.tsx:116`）——vendor 配方残留的无意义类名，同元素上的 `ease-[cubic-bezier(0.22,1,0.36,1)]` 已在生效，故直接删除（零视觉影响）。③**`check-undefined-classes.mjs` 命名空间由 6 补到 10**（新增 `bg` / `animate` / `ease` / `z`）——此前漏掉 `animate-*` 与 `ease-*`，上面两例幽灵类正是从这道检查里逃逸出去的；补全后源码候选由 12695 增至 15696，**零未定义**（`bg` 这轮把近 3000 个候选全部比过、误报为 0，证实其可按封闭刻度族纳入）。C7 实测四例至此全部闭合（另两例 `bg-status-on-track/off-track` 与 `text-12` 已在 A 类 token 批次与门禁脚本批次处理） | CAP-P-01 | 构建产物实证：`.animate-spin-slow{animation:var(--animate-spin-slow)}`、`--animate-spin-slow:spin 2s linear infinite`、`@keyframes spin` 三者均在产物中；`ease-ease` 产物 0 命中；`lint:undefined` 过（已生成选择器 3419 / 候选 15696）；八门禁脚本全过；`tsc -b` 零错；touch 文件 eslint 0 错；`pnpm --filter frontend build` 成功 | `index.css` 动画 token 区补 1 条并注明根因 |

### 前端设计治理——A 类修改方案执行（语义化 token 层落地 + 机器强制）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **字阶/字重/行高/阴影/动效全面语义化 token 化（A 类方案）**：①**字阶**——`text-10/11` 等 px 直读档废止，改为 8 档**名值解耦**语义阶梯 `text-3xs/2xs/xs/sm/base/lg/xl/2xl`；越界档 `text-3xl/4xl/5xl/6xl` 一律降 `text-2xl` 并把 `font-bold` 收敛为 `font-semibold`。迁移口径经实测验证：`--text-3xs/2xs` 不带 `--line-height` 配对（行高继承），与原 `text-10/11` **逐位一致、视觉零变化**。②**阴影**——全站收敛为唯一投影档 `shadow-xs`（`shadow-none` 为复位档），89 处静置态具名档（`2xs`/`sm`/`md`/`lg`/`xl`/`2xl`）归并为 `shadow-xs`；**12 处 hover 抬升阴影不机械映射**（`hover:shadow-md → hover:shadow-xs` 会静默删掉悬停反馈），按用户裁决改由**边框/背景/位移/环色**承载，`transition-shadow` → `transition-colors`（例外：`Card` 系组件环色属 box-shadow，`hover:ring-border` 保留 `transition-shadow` 是对的）。③**字重/行高**——只许 400/500/600 与语义行高档。④**动效**——时长白名单 120/180/240ms 落为 `duration-fast/normal/slow` + `ease-standard/emphasis` | CAP-P-01 | 前端 177 文件 / 1170 用例全绿；`tsc -b` 零错；设计门禁八脚本全过（含 `lint:undefined` 构建后复跑：已生成选择器 3418 / 源码候选 12695，零未定义）；src 迁移面 252 文件 +1302/−1321 | 设计宪法 `PRINCIPLES.md` v2.0（新增 §3.6 阴影章、D10/D11/D12 决策、附录 A 豁免清单；A.2 计数由「11 处」订正为「12 处」） |
| frontend | **⚠️ 实测捕获并修复真 bug：`--duration-*` 命名空间错写导致 82 处类静默失效**。迁移中一度把时长 token 写成 `--duration-fast/normal/slow`，而 Tailwind v4 的 `duration-<name>` 读的是 `--transition-duration-<name>`（`valueThemeKeys:["--transition-duration"]`），**该键名在运行时代码中出现 0 次**——现象是类名完全合法、lint 全过、CSS 却一条不生成（静默失效，非报错）。已改回 `--transition-duration-*` 并构建验证 `.duration-fast/normal/slow` 确实生成。`--ease-*` 沿用 Tailwind 原生命名空间，故 `index.css` 中两条命名**刻意不一致**，已在宪法 §7.1 与代码注释中双重标注"是规范不是笔误"。**配套**：新增 `lint:undefined` 幽灵类检查（比对源码类名 ↔ 构建产物选择器），已实测抓出 `text-12`、`text-content-muted`、命名空间错写三类问题，并排入 CI `build` 之后。另修 `text-content-muted` 幽灵类 1 处（`contract-bindings-panel.tsx`）与 `shadow-brand-linear/20`（`--shadow-brand-linear` 从未注册，写了不生效） | CAP-P-01 | 构建后幽灵类检查：已生成选择器 3418 / 源码候选 12695，零未定义；`grep` 关闸确认无残留旧档 | 宪法 §7.1 命名空间陷阱（含「两套 `--motion-*` 家族与本题无关」澄清）；`AGENTS.md` §6.4 / skill 自检清单增加 `build → lint:undefined` 步骤 |
| frontend · docs | **门禁单点化与注释感知**：①阴影规则**从 `check-palette.mjs` 移除**——它曾与 `check-spacing-governance.mjs` 用逐字相同的正则报同一条违规两遍，且只有「整文件豁免」、没有「按规则 id 放行」的能力（无法表达「vendored 原语只豁免 shadow、不豁免 motion」这类裁决）；刻度类 token（字阶/间距/行高/字重/动效/阴影）现统一由 `check-spacing-governance.mjs` 治理。②扫描器加**注释感知**——全文本扫描会把解释性注释里引用的 token 名误报为违规（本轮累计 4 次），改为跳过注释区间（已验证：字符串字面量内的违规仍被抓到、`https://…a//b` 不破坏解析）。③**否决 shadow 命名空间闭合方案**——A 类 §3.6 曾建议 `--shadow-*: initial` 让违规档物理上不生成 CSS，但会连带抹掉已豁免的 vendored 原语与 design-system 展示页的投影，把「豁免」变成静默破版；裁决取「豁免 + lint 拦截」，已在宪法 §3.6 与附录 A.1 记录否决理由 | CAP-P-01 | 双向探查验证注释感知（6 处代码违规被抓 / 4 处注释提及被忽略）；八脚本全绿 | `check-spacing-governance.mjs` 头注职责边界；`check-palette.mjs` 恢复为只管颜色；`.github/workflows/quality-gate.yml` 增 `build` + `lint:undefined` 两步 |
| frontend · docs | **主题归一与文档降级**：①主题预设 `figma`/`linear`/`notion` 三套归一为**单套 `default`**（linear 的值成为 default 基线），`presets.ts` 保留 preset 接口并对存量/未知值一次性自愈回落；②`DESIGN.md`（《全局设计系统规范 v2.0》）**降级为参考规格（Reference Spec）**——其 frontmatter 原写 `governance: "PRINCIPLES.md 并入升级为本文件"` 与正文"全仓唯一最高权威标准"之说**已被推翻**（PRINCIPLES 并未并入，而是在本轮升为 v2.0 唯一宪法）；文首新增「地位勘正」并列出与宪法的**已知偏差清单**（§五.2 动效 100/160/220ms 已作废、字阶双层模型已被 8 档取代、门禁口径已变），§五.2 就地补作废注记；③`docs/design/DESIGN.md` 原为**逐字副本**（仅机器绝对路径不同，且该副本含失效的 `/E:/Project/` 路径）——两份同源文档并存即真相源分裂，已收口：正文留根 `DESIGN.md`（较新且被 8 处代码注释以 `DESIGN.md §N` 引用），`docs/design/DESIGN.md` 退为**指针页**；④`frontend/AGENTS.md` §3 降级为宪法摘要（技术栈主题行、设计还原来源、token 表、字号/阴影/动效规则、§6.3 主题与预设、§6.4 校验命令、scripts 清单全部对齐现状——原 §3.3 还在教"px 直读档 `text-8/9/10/11/13/…`"，该口径现已违规）；`COMPONENTS.md` 移除宪法版本号（钉住下位文档的版本号只会随宪法修订静默过期）；`frontend-page` skill 同步宪法引用并补 lint:undefined 自检项；⑤**`PRINCIPLES.md` 补 YAML frontmatter**——`check-doc-sync.mjs` 要求任何被它看见处于「修改」状态的 `docs/**.md` 以 `---` 开头，而宪法此前**从未有 frontmatter**，只因长期在 HEAD 上处于 clean 状态而侥幸通过；一旦有人编辑宪法（宪法恰是最常被编辑的文档）即必然阻断 CI。已按 `DESIGN.md` 同款补 `title`/`description`/`status`/`created`/`scope`/`governance`；另**订正 A.2 计数口径**：hover 抬升阴影实为 12 处（10 行覆盖，`template-manager` 与 `documents-page` 各 ×2），先前「11 处」漏算与 `member-card.tsx` 同形的 `team-card.tsx`；`docs/README.md` 补 design/ 入 git 说明与新增方案文档索引 | CAP-P-01 | `check:docs-sync` 通过；八脚本全绿 | `PRINCIPLES.md` v2.0（§2.4/§3.1–3.7/§5.4/§5.6/§6.2/§7.1/附录 A）；`DESIGN.md` 地位勘正；`docs/design/DESIGN.md` 指针页；`frontend/AGENTS.md` v1.3；`COMPONENTS.md`；`.zcode/skills/frontend-page/SKILL.md`；`docs/README.md`（**受 `.gitignore` 的 `docs/` 规则排除，改动仅存在于本地工作区、不入库**——`docs/` 整体不入库、唯一例外是 `docs/design/`，本条登记的是实际发生的编辑而非已入库的文档） |

## [0.7.5] - 2026-09-27

### v0.7.5 发版总览——workflow v2 引擎落地 + 提示词治理与资产化 + 全局实体引用 + 通知收件箱改版

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server · frontend | **workflow v2 确定性引擎与 zcode 接入**：自研 v2 引擎（节点树文法 + journal 双层账 + 跨重启恢复 + agent 派发桥，AIWorkflowStep 死表退役重造 WorkflowNodeRun/WorkflowEvent，AIWorkflowRun 增 engineVersion/graphSnapshot）；内置流程整体 V1→V2 文法替换（代码为真相源，重启即完成六条内置定义替换）；zcode headless adapter stream-json 协议校准（含非 ASCII attach 编码防线）；前端运行面板复刻（阶段时间线 + 执行药丸 + 确认卡/产物/事件流 + 四格统计）与 v2 静态阶段预览；列表/详情徽标改 grammarVersion（契约新增字段，文法版本与行版本分离） | CAP-S-02 · CAP-S-03 | server workflow 59/59 + e2e 8/8；frontend workflow 33/33；contract:check 零漂移；dev.db 六条内置定义 version=2 实机验证 | WorkflowSummaryDto 契约扩展（grammarVersion）；COMPONENTS.md 登记 WorkflowRunPanel/WorkflowRunTimeline/buildRunView |
| frontend · server | **提示词治理与资产化（CAP-A-24 全量）**：治理基座——系统内置提示词只读资产（apm-baseline/apm-report-format）+ PromptEditor 分层编辑 + 注入开关（八键收敛为执行者段，存量配置兼容）+ 执行详情「完整 Prompt」透出（与派发同源）+ 干跑预览；增强四方案——A 模板库+插值（PromptTemplate 表 + `{{issue.*}}` 插值引擎 + 从模板选用弹层）、B AI 起草（四静默场景 + 对照弹层「采用」制，AI 代写人确认）、C 入口收敛+注入率可观测（执行者段合并 + `GET /prompts/usage-stats` 注入率统计）、D AGENTS.md 物化（`apm:managed:project-prompt` 受管区块复用契约引擎多区共存 + drift 检测人确认回填） | CAP-A-24 | server prompt 24+5+12 + dispatch-prompt 12 + assistant-silent 58 + cli-dispatch/issue-template 回归 69；前端 prompt-editor 7 + prompts-section 6 + 定向回归 66；contract:check 零漂移 | 能力清单 CAP-A-24 增强行；测试映射矩阵 GAP-T-45/46；backend/frontend modules.md 补 prompt 模块；COMPONENTS.md 登记 PromptEditor/TemplatePickerDialog |
| frontend · server | **全局实体引用系统（CAP-A-23）**：`/` 命令插入胶囊 + hover 预览三编辑器全覆盖（评论框/描述区所见即所得/文档 MdxEditor）；apm:// 链接全局渲染为胶囊（修复 react-markdown defaultUrlTransform 清洗断链）；search SearchHit 产出 apmRef + issue cuid 短号回落；AI 协议入口三线同源（LLM search_entities 工具 / CLI 回环 / MCP 对外）+ 实体引用协议注入 PERSONA；任务描述区 MarkdownLiveEditor 块级所见即所得 + issue-decompose AI 子任务拆分待确认批 | CAP-A-23 · CAP-A-04 | server search 7 + issue 35（+3 短号回落）+ 静默 54；前端 slash-ref 12 + markdown-view 3 + MarkdownLiveEditor 8 + 任务详情 7 + 全量 1132 用例绿；contract:check 零漂移 | 能力清单 CAP-A-23 新卡 + CAP-A-04 增强行；测试映射矩阵 GAP-T-42/43/44；COMPONENTS.md 多行更新 + design-system 新展示区 |
| frontend | **通知收件箱改版与交互收敛（验收反馈批）**：通知收件箱列表铺满全宽 + Sheet 抽屉详情（决策卡就地拍板迁入，决策收件箱页面取消并入）；标题标准化 PageHeader 骨架；列表行级 hover 预览撤销（裁决：实体悬浮卡只走 route-preview 既有挂载面，撤 DataList itemPreviewPath/itemPreviewTitle 三处接入） | CAP-A-07 · CAP-A-15 | notification 定向 7 + 受影响五域 68 + data-list 定向 17 用例全绿；tsc -b 零错 | PRINCIPLES §10.4 Sheet 宽度三档 + §10.5 行内预览撤销注记（本地） |

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend · server | **提示词资产化四方案（CAP-A-24 增强：A 模板库+插值 / B AI 起草 / C 入口收敛+注入率可观测 / D AGENTS.md 同步）**：**A**——新 `PromptTemplate` 表（workspace/project 双 scope + task/project/role/member 四 target，迁移 20260926000000 手插三步法）+ 插值引擎入 prompt-shared 纯函数层（`{{issue.*}}`/`{{project.*}}`/`{{today}}` 变量，派发组装时按当单事实插值、模板存原文跨任务复用、缺失变量保留占位不静默清空；验收标准由派发面查 acceptanceCriteria 构造事实、查询 fail-open）+ 内置模板三张走代码常量合并不入库（bug 修复基线/发版检查单/代码评审基线）+ 模板 CRUD 与插值干跑端点（`GET|POST /prompts/templates`、`PUT|DELETE /prompts/templates/:id`、`POST /prompts/templates/preview`）+ 任务详情「从模板选用」弹层（TemplatePickerDialog：列表+按任务事实插值预览+采用写编辑框）+ IssueTemplateItem 增 promptHint（useTemplate 建单落 metadata.taskPrompt）；**B**——静默场景四连挂 SCENARIOS 注册表零新端点（prompt-draft-project 侦查项目/角色分工/团队规则、prompt-draft-task 复用工单侦查、prompt-draft-role、prompt-improve 层级感知改写），PromptEditor 增 `onDraft` 起草槽（当前内容 vs 草稿对照弹层，「采用」才写回编辑框，保存仍走人手——AI 只代写人确认），项目/任务/角色三编辑点接入；**C**——执行者段合并（role+member+thinking 三段合一段：`## Your Role` 下 Role Conventions(角色名)/Personal Instructions(成员名)/Reasoning Effort 三小节），注入开关 8→7 键收敛（executor，normalize 兼容存量 8 键配置任一关则关、新键显式配置优先），设置页开关区收敛 + 新增注入率统计（`GET /prompts/usage-stats` 读最近 Execution.input.prompt 按段头 marker 解析各段注入率与平均字符、空样本全零骨架诚实空态）+ 项目提示词编辑处就地干跑预览（选项目任务→prompt-preview 段清单弹层，所见即所派反向带到编辑时），成员详情/编辑对话框文案改执行者口径、角色页 promptHint 降级为「角色约定（该角色成员继承）」+AI 起草；**D**——项目提示词保存时物化到工作区 AGENTS.md 独立受管区块（`apm:managed:project-prompt`），新 PromptAgentsSyncService 复用契约引擎 applyManagedBlocks 原语（prompt.module imports ContractModule）与契约种子同文件多区块共存（未涉及区块字节不变），AppConfig 仍为真相源、派发面 project 段与 CLI 本地读 AGENTS.md 双通道内容归一，文件侧 drift 检测（config 响应带 agentsFile{fileExists,blockContent,drifted}）+「以文件为准」回填走人确认（PUT config 重写归一），无工作区/IO 失败诚实降级 agentsSync.synced=false toast 说明不阻断保存；openapi.json + 双端生成类型同步；i18n 双语 +70 键 | CAP-A-24 | server prompt.service.spec 24 + prompt-agents-sync.service.spec 5（区块共存/替换/移除/降级/drift）+ dispatch-prompt.spec 12（合一段/旧开关映射/插值同源）+ assistant-silent.service.spec 58（+4 场景）+ cli-dispatch/issue-template 回归 69 条绿；前端 prompt-editor 7 + prompts-section 6 + 定向回归 9 文件 66 条绿；双端 tsc 0 错、lint 0 error（语义 token/Spinner 闸门过）；contract:check 零漂移；i18n 双语 4769 键一致 | 能力清单 CAP-A-24 增强行（六问②修订：AI 可起草人生效）+ §七变更记录；测试映射矩阵 GAP-T-46；COMPONENTS.md PromptEditor 行更新 + TemplatePickerDialog 新行 |
| server · frontend | **提示词治理：系统内置提示词 + 分层提示词编辑 + 注入开关 + 执行完整 Prompt 透出（CAP-A-24）**：①server 新 `prompt` 模块（41 目录/43 Module）——系统提示词内置资产（`apm-baseline` APM 协作基线 + `apm-report-format` 执行结果汇报规范，代码固化只读无写端点）+ 注入开关/项目级提示词读写（AppConfig：workspace 级 `prompt.injection` 单行 JSON 八开关 system/project/role/team/member/task/skills/context、project 级 `prompt.project`，全读取 fail-open 治理层故障不阻断派发）+ 端点 `GET /prompts/system`、`GET /prompts/system/:key`、`GET|PUT /prompts/config`；②派发链路——`buildPrompt` 重构为 `buildPromptSegments` 段清单 + 逐段开关过滤（缺省全开；全关回落最小任务提示词派发不失败；项目级注入 `## Project Instructions`、任务级注入 `## Task Instructions`，任务级存 `Issue.metadata.taskPrompt` 零迁移），组装结果随 Execution.input 持久化（`input.prompt`，执行面板展示与实际派发同源）；干跑预览 `GET /ai/issues/:issueId/prompt-preview`（与派发共用 loadPromptGovernance/buildSkillsPromptSection/buildPromptSegments，返回完整 prompt + 逐段拆解 + 开关对照）；③frontend——新 `modules/prompt`（api/hooks，类型单源契约）+ `PromptEditor` 复用组件（shared/components：编辑态=MarkdownLiveEditor 所见即所得+字数+动作槽，readOnly=MarkdownView 纯渲染）+ 设置 · AI 组新增「提示词」分区（`/app/settings/prompts`：八注入开关即时落库 + 系统提示词只读查看器 + 分层编辑入口导航）+ 项目设置新增「AI 提示词」页签（项目级提示词编辑保存/留空即关）+ 任务详情右栏「任务提示词」面板（metadata PATCH 既有通道）+ 角色管理 promptHint 换 PromptEditor + 执行详情对话框新增「完整 Prompt」页签（全文只读+复制+字数，历史执行无持久化时空态说明不报错）；msw 补 prompt 四 handler；openapi.json + 双端生成类型同步；i18n 双语 +40 键（prompts.*/promptEditor.*/projectSettings.{ai,prompt}.* 等） | CAP-A-24 | server prompt spec 12 条（模板资产/开关归一与 fail-open/写读合并/项目提示词三路径/REST 面 404）+ dispatch-prompt spec 11 条（原 4 条回归 + 逐段开关/system 段/全关最小提示词/段清单对照/loadPromptGovernance）；cli-dispatch 全模块 9 文件 80 用例绿；前端 prompt-editor 5 条 + prompts-section 4 条（开关渲染与落库/系统段查看/条目切换）+ run-details-dialog 6 条（+2 完整 Prompt 空态/全文展示）；触达文件 tsc 0 错、eslint 0 error；contract:check 零漂移；i18n 双语键校验一致 | 能力清单 CAP-A-24 新卡 doing + §七变更记录；测试映射矩阵 GAP-T-45；AGENTS.md 模块账 41/43+39；backend/modules.md v4.2.0、frontend/modules.md 4.1.0 补 prompt；COMPONENTS.md 登记 PromptEditor + design-system 页新增展示区 |
| frontend · server | **全局 Markdown 实体引用系统（/ 命令插入胶囊 + hover 预览，CAP-A-23）**：①插入侧——新 `SlashRefTextarea`（shared/entity-ref）：`/` 词元（行首/空白符后，URL 斜杠不误触发）弹统一候选弹层，类型筛选（全部/任务/Bug/文档/成员）+ searchApi 模糊匹配 + 成员 suggestMentions 混排，↑↓/Enter/Tab/Esc 键盘导航，选中插入 `[标题](apm://…)`（成员 @handle 语法糖）并恢复光标，菜单关闭时按键语义全透传（评论 mod+Enter 提交、描述区 Esc 失焦不变）；三编辑器入口全覆盖——MarkdownEditor 默认输入件（评论框/评论编辑即通）、MarkdownLiveEditor 三处输入区（任务/BUG 描述区，解除早期「有意不接补全」限制）、MdxEditor CodeMirror autocompletion 源（文档）；②渲染侧——`MarkdownView` a renderer 接 `ApmRefLink`：apm:// 链接全局渲染为胶囊（实体图标+名称+hover RoutePreviewTrigger 预览+点击直达），**并修复 react-markdown `defaultUrlTransform` 把 apm:// 清洗成空串的隐性断链**（自定义 urlTransform 放行引用方言，此前 MarkdownView 表面引用链接根本无法存活）；③server——search SearchHit 增 `apmRef` 现成引用串（短号+项目代码齐备才产出，缺失 null 不造假、调用方不自行拼装）、issue `findOne` cuid 未命中回落 shortId（闭合 apm-ref-chip 注释预留的「后端逐域兼容」缺口，胶囊 hover 预览/点击直达工单短号即通，可见性口径不变）；openapi.json + 双端生成类型同步；i18n 双语 +8 键（entityRef.slash.*） | CAP-A-23 | server search spec 7 条（+apmRef 产出与完整性/原料 select 断言）+ issue spec 35 条（+3 短号回落：cuid 未命中回落/cuid 直接命中不二查/双 miss 404）；前端 slash-ref-textarea 12 条 + markdown-view 3 条（胶囊渲染/外链保持/非法引用降级）+ 全量 173 文件 1132 用例绿；双端 tsc 0 错、触达文件 eslint 0 error；contract:check 零漂移；check:i18n-sync 4644 键同步；lint:registry 过 | 能力清单 CAP-A-23 新卡 + §七变更记录；测试映射矩阵 GAP-T-43；COMPONENTS.md Markdown 渲染/编辑两行更新 + 全局实体引用系统新行；design-system 页新增 Entity Ref System 展示区（全 kind 胶囊/原文渲染/斜杠命令交互/全类型预览卡 hover 样例） |
| server | **apm:// 协议 AI 查询与生成入口（CAP-A-23 切片）**：①查询面三线同源——主助手 LLM 路径新工具 `search_entities`（AI SDK tool，透传 SearchService 全局搜索，命中带 apmRef 引用串；缺 userId 拒绝查询、异常转可读 error）、CLI 路径目录同条目（`GET /_api/search?q=:query&limit=10`，守护进程凭 PAT 回环；GET /ai/assistant/tools 目录端点自动带出）、MCP Server 对外 agent 同款工具（ListTools schema + CallTool 分发：空 q 报错、无 PAT 归因拒绝、结果 JSON 透传）；②生成面——助手 PERSONA_INSTRUCTION 注入「实体引用协议」段（先 search_entities 查询、再以 `[标题](apm://…)` markdown 链接写回复，短号取 apmRef 禁止杜撰；LLM/CLI 两对话路径共用）+ renderCatalogForPrompt 注入同款指引；SearchModule 导出 SearchService，ai-hub/mcp-server 两模块接线；openapi 契约随并行批次 UpdateIssueDto 一并重导出零漂移 | CAP-A-23 | assistant-tools spec +2（search_entities 透传/异常转 error/目录与 prompt 协议指引断言）+ mcp-server spec +1（空 q/无 PAT/合法透传三态）+ search spec 7 条回归；ai-hub 全模块 13 文件 201 用例绿；server tsc 0 错、触达文件 eslint 0；contract:check 零漂移 | 能力清单 CAP-A-23 切片登记 + §七变更记录；测试映射矩阵 GAP-T-44 |
| frontend · server | **任务描述区所见即所得 + AI 子任务拆分（CAP-A-04 增强切片）**：①任务/BUG 详情页描述区改块级所见即所得 markdown 编辑——新 shared 组件 `MarkdownLiveEditor`（内容按空行/代码围栏切块，非活跃块恒为渲染态、点击块就地编辑，输入与渲染同屏、无左右分栏；Esc/失焦回渲染态、尾部 ghost 追加块），取代原 `MarkdownEditor preview="live"` 在描述区的分栏形态（评论框 toggle 形态不变）；②描述栏右侧编辑按钮更换为「拆分」按钮——触发 ai-hub 新静默场景 `issue-decompose`（服务端 prepareContext 侦查工单事实：标题/描述/类型/优先级/已有子任务/验收标准），AI 返回子任务拆分建议 + 描述去重改写；拆分批持久在父工单 `metadata.splitProposal`（免迁移，不产生真实工单行、不污染看板统计），子任务分区渲染「待确认建议」块逐条确认（走既有 createSubTask 落库，useCreateSubTask 增 silent 选项避免批量 toast）/忽略/全部加入/全部忽略，新批自动展开分区，清空自动撤批；描述改写随拆分直接生效（前端防抖抑制防旧草稿竞态回写），消息提示走全局 toast（通知中心受众规则排除操作者，有意不进通知链路）；③契约：UpdateIssueDto 补 `metadata` 透传，openapi.json + 前端生成类型同步；i18n 双语 +18 键（taskDetail.split*） | CAP-A-04 | server 静默 spec 54 条（+2：issue-decompose 侦查注入与红线指令/缺参与工单不存在 400 不触 LLM）；前端 MarkdownLiveEditor 8 条（块切分纯函数/点击编辑/回写 join/Esc/占位/追加）+ 任务详情页 7 条（+4：拆分落批与描述改写/空建议 noop/待确认确认出批/全部忽略撤批）；issue 模块前端 16 文件 98 条全绿、server issue 51 条全绿；双端 tsc 0 错、eslint 0 error；六治理闸门过（tokens/semantic/palette/spacing/icons/registry）；contract:check 零漂移；i18n 双语 4608 键同步 | 能力清单 CAP-A-04 增强开工行 + §七变更记录；测试映射矩阵 GAP-T-42 登记；COMPONENTS.md 登记 MarkdownLiveEditor + design-system 页新增展示区 |
| frontend | **通知收件箱布局改版（v0.7.3 验收反馈）**：列表铺满全宽（撤 480px 固定左栏 + 常驻右详情栏），消息详情改 Overlays-Sheet 抽屉（`ui/sheet` 标准套件，base-ui 官方配方，side=right），决策卡就地拍板/关联工单/清理归档功能样式原样迁入；交互改点击行开抽屉、关闭清选中，撤首项自动选中回退；标题与收藏 label 接 i18n（`notification.title`，zh「通知」/en「Notifications」） | CAP-A-07 | notification 定向 vitest 7 用例全绿（新增 Sheet 开合/通知详情两用例）；lint:tokens·semantic·palette·spacing·icons 五闸门过；tsc -b 零错；eslint 0 error | 能力清单 CAP-A-07 增强注记 + §七变更记录 |
| frontend | **通知中心标题标准化 + 决策收件箱页面取消（二次验收反馈）+ 设计宪法 §10.4**：①标题区换 PageShell 内嵌 PageHeader 标准骨架（title/icon/actions 装配原语，撤自定义标题栏）；②Sheet 加宽 sm:max-w-xl→2xl，PRINCIPLES v1.1 增补 §10.4 Sheet 宽度三档（sm~md 轻量/lg~xl 内容详情/2xl 卡片拍板）与标题栏规范（SheetTitle 必给、pr-12 让位内置关闭钮、正文 min-h-0 flex-1 滚动区），frontend-page skill 同步；③决策收件箱（/app/decisions）页面取消并入通知中心：路由重定向兜底、侧栏导航项/page-registry/cmd-decisions 删除（决策/收件箱关键词迁通知命令）、7 处页内链接 + 3 处可见文案（回放只读注/队列来源注/创建面板审批策略注）改口径、decision-inbox-page 删除、DecompositionReviewPanel 随迁通知 Sheet（CAP-P-01 切片 3 入口保活）；e2e DC01 改验重定向 | CAP-A-07 · CAP-C-04 · CAP-P-01 | 受影响五域定向 vitest 68 用例全绿（notification 7/command-palette/contract/interview/create-dialog/design-system）；tsc -b 零错；eslint 0 error；五项治理闸门过 | 能力清单 CAP-A-07 增强注记二 + CAP-C-04 承载合并注记 + §七变更记录；PRINCIPLES v1.1 §10.4 |
| frontend | **列表行级预览卡撤销（v0.7.4 验收反馈）**：撤 DataList 行级 hover 预览挂载点（itemPreviewPath/itemPreviewTitle props 与 RoutePreviewTrigger 包装）及任务/Bug/项目 simple-list 三处接入——裁决「行级不直接出卡片预览」，实体悬浮卡只走 route-preview 既有挂载面（workflow 路由预览卡/右键菜单强化/CellSelect 内联编辑均不受影响）；PRINCIPLES §10.5 行内预览子条改「已撤销」注记保留裁决痕迹 | CAP-A-15 | data-list/task-table-view/project-list-page 定向 vitest 17 用例全绿；tsc -b 零错；全仓 itemPreviewPath/itemPreviewTitle 零残留 | PRINCIPLES §10.5 行内预览条目更新（本地） |
| server+frontend | **内置流程整体 V1→V2 文法替换 + workflow 详情页运行面板（ZCode 工作流卡复刻）**：六条内置流程（项目简介流/需求转任务/需求承接/开发主线/发版管道/夜航巡检）从 v1 线性链改写 v2 节点树（human-confirm→human、闸门后步骤进 condition.then、插值口径不变），onModuleInit upsert 的 update 分支由空改覆写（内置模板以代码为真相源，重启即完成存量库替换；此前 update:{} 致 dev.db 永远停在 v1）；Mastra 注册表清空、compileFor demo 短路删除（v2 走自研确定性引擎，Mastra 仅存 v1 兼容层）。前端详情页主区分态：选中 run → 运行面板（阶段进度时间线：站=根层节点状态灯+settled/total 计数徽标+loop 轮数、站下 journal 执行药丸列（类型色瓦片+尾部状态图标）、种类词表头+「N 个阶段 · M 个执行中」、确认卡/文档回流产物行/事件流折叠/四格统计收据行）；v2 定义默认态 → 静态阶段预览卡（替代 v1 画布读 steps 的空画布）+ 工具栏运行入口；列表/详情徽标改显 grammarVersion（新增契约字段，文法版本与行版本分离）。参考实现：ZCode packages/ui workflow-timeline（功能复刻，样式按 APM 宪法 token 重写） | CAP-S-02 · CAP-S-03 | server workflow 59/59 + e2e 8/8（stepsSummary 断言更新 v2 口径）；frontend workflow 33/33（新增 v2 静态预览/运行面板渲染用例）；contract:check 零漂移（WorkflowSummaryDto.grammarVersion）；六项 lint 治理全过；dev.db 六条内置定义 definition.version=2 实机验证 | COMPONENTS.md 登记 WorkflowRunPanel/WorkflowRunTimeline/buildRunView；WorkflowSummaryDto 契约扩展（grammarVersion） |

## [0.7.4] - 2026-09-26

### v0.7.4 发版总览——夜航体验批：标签页全覆盖 + 悬浮卡片更新 + 右键菜单强化 + 列表内联编辑 + 全局搜索悬浮化

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **全局搜索退役改悬浮面板（夜航 0.7.4 · 其四，含标准制定）**：**标准**——全局搜索唯一形态 = 命令面板搜索模式（同一 base-ui Dialog 浮层，不再有第二个搜索 UI）；入口三线归一（mod+k 面板热键 / 新增 `global-search` 热键缺省 mod+shift+f 走 CAP-A-17 注册表可改键 / 侧栏两处搜索按钮与 cmd-search 命令均改派发开面板事件）；检索面 = /search 全部六类实体（task/bug/document/project/milestone/acceptance，limit 8→20），命中按实体类型分组渲染（工单→Bug→文档→项目→里程碑→验收），防抖 300ms / staleTime 30s 保持；Tab 进 AI 模式与零命中回车转问回退不变。**改造**——provider 实体搜索全类型化+分组化；/app/search 页面删除（SearchPage+use-search 摘除，路由改 SearchOverlayRedirect：打开面板+回项目列表，存量收藏/书签自动升级）；tabs-registry 不注册（页面不存在）；commands.ts cmd-search 改 action=openGlobalSearch+hotkeyId；侧栏 NavLink 换按钮；i18n 双语 +9 键（hotkeys.globalSearch 2 + search.type 6 + 豁免注记）；e2e S01 改验重定向+面板内分组命中 | CAP-A-17 · CAP-A-15 | command-palette 47 用例全绿（检索参数六类型/limit20、按类型分组、cmd-search 动作化、global-search 热键收编断言）；hotkey-store 注册表断言更新为三壳层动作；frontend 全量 170 文件 1102 用例绿；tsc -b 零错 | **docs/design/PRINCIPLES.md 增补 §10.5 全局搜索悬浮面板标准**（本地）；快捷键设置页自动出新条目（注册表驱动） |
| frontend | **列表属性下拉即时生效（夜航 0.7.4 · 其三）**：补齐「列表页每个属性要素点选即改」设想——新通用原语 `CellSelect`（shared/components：既有单元格渲染原样保留作触发器，点选菜单项即 mutate；-m/p 扩命中区不挤布局；stopPropagation 防误开详情；候选空自动退化只读；弹层限高滚动）+ 工单域单元格族 `cell-editors`（状态/优先级/严重度走 useUpdateTask、负责人走 useAssignPrimaryMember Member 口径、类型走 PATCH typeId、里程碑按行项目 useProjectMilestones 拉候选）+ 项目域 `project-cell-editors`（工作流/健康度/优先级枚举与 buildProjectRowMenu 同一 visual 映射、负责人 userId 口径）；接入面：任务/Bug simple-list 行首链（类型 pill/状态图标/优先级图标/严重度条）+ 行尾（里程碑 chip/负责人头像）、TaskTableView 状态/优先级/负责人三列、project-simple-list 四格；mutation 链路与右键菜单完全同源不漂移；i18n 双语 +8 键（contextMenu 补 5 + issueCell 3） | CAP-A-15 | cell-editors 4 用例（状态/优先级/负责人点选即调 mutation、单元格点击不冒泡触发行点击）；issue+project+shared 72 文件 404 用例全绿；tsc -b 零错；task-table-view 测试补 cell-editors hooks 桩 | 新组件 CellSelect/cell-editors/project-cell-editors 待 COMPONENTS.md 登记（收口批） |
| frontend | **悬浮卡片更新 + 右键菜单强化（夜航 0.7.4 · 其二）**：①悬浮卡片——route-preview 新增 workflow 预览类型（/app/workflows/:id 不再落 generic 兜底；新 WorkflowPreviewBody 展示描述/版本/步骤摘要/更新时间）；行级 hover 预览铺开——DataList 新增 itemPreviewPath/itemPreviewTitle 挂载点（ContextMenu→RoutePreviewTrigger→行元素按 tab-bar 既定嵌套契约），任务/Bug/项目三个 simple-list 全量接入，列表行悬停即出实体卡；routePreview.type 补 execution/release/workflow 三键 + workflow body 五键（双语）。②右键菜单——子菜单弹层限高 max-h-80（320px）+ 滚动，负责人/标签等长候选不再无限撑高；MenuItem 新增 searchable/searchText：候选 ≥8 的二级菜单（标签/负责人/项目负责人）内置搜索框，输入即时过滤、无命中空态、Esc 先清词再关、键盘事件不外溢；覆盖面扩展——DataTable 新增 onRowContextMenu，TaskTableView 接 useIssueRowMenu（list/board/table 三视图菜单同源，bug 页 contextMenuKind=bug 域隔离） | CAP-A-15 | row-context-menu.searchable 4 用例（构建器标志+渲染过滤/空态）；issue+project+shared 受影响面 36 文件 164 用例全绿；tsc -b 零错；新增测试补 useIssueRowMenu 桩与 react-i18next mock 补 initReactI18next | ui/context-menu MenuItem 契约扩展（searchable/searchText）；DataList/DataTable 挂载点注释 |
| frontend | **标签页注册 100% 覆盖（夜航 0.7.4 · 其一）**：tabs-registry 补齐 ShellLayout 内全部漏注册页面——executions/workflows(+详情)/releases(+详情)/office/intake/members/teams/delivery/design-system/ai-surface/replay 既往打开不建标签页，现全量进 tab 体系；新增 SUFFIX_RULES 结尾段规则层：项目子页签（任务/里程碑/档案/项目步骤/团队/设置）获得独立默认标题（对齐 project-detail-tabs 分段控件口径，不再与详情页共用「项目」）、文档新建/编辑态独立标题、项目初始化引导页按路由注释承诺以 `hidden` 语义不进 tabbar（tabs-context 支持 hidden 跳过）；详情页动态前缀（executions/workflows/releases）补前缀规则；配套覆盖率守卫测试（路由清单全覆盖断言 + 豁免须带理由 + 子页标题/hidden 语义断言） | CAP-A-15 | tabs-registry.test.ts 8 用例绿；frontend tsc -b 零错；`/app/search`、`/app/decisions` 两豁免注记对应 v0.7.4 搜索悬浮化与决策收件箱合并（另两条目） | tabs-registry 头注补 100% 覆盖契约 |

## [0.7.3] - 2026-09-25

### v0.7.3 发版总览——体验 P2 修复批 + 全仓剪枝专项 + 桌面紧凑窗口 + 认证面定版 + 全分支合流

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server · frontend · cli · shared · contract | **体验测试 P2 修复批（28 项）**：后端安全与管道（acceptance 冒名/未知路由信封/@IsIn/legacy publish 删除）+ 契约链路（分页对账 34 端点/payload 校验/usage 落账）+ 性能（任务页真分页/派发索引）+ 数据卫生 + 信任三级派发门禁 + 同类型多供应商槽位 + i18n 清账约 224 条 + 帮助中心重写 + Web onboarding | 体验报告 §五 | 全仓 test 5 包全绿；contract:check 零漂移；i18n 双语同步 | CHANGELOG Unreleased 明细（三行） |
| 工具链 | **全仓死码剪枝专项**：前端死码 75 文件 + ui 组件/死依赖 + 服务端含 context 整模块 + shared/desktop 死导出 + 一次性脚本（P0 全删）；cli 404 修复、fs-extra 退场、页签单一数据源 + jsdiff、knip 补盲区（P1 快改） | — | 编译门禁逐批验证（tsc/测试拦截三类清查代理误报） | — |
| desktop · frontend | **登录态紧凑窗口（CAP-A-14 切片）+ boot 失败双根因修复 + 实机三轮修复**：认证面小窗双窗编排（944×620、WCO、切窗 IPC）+ 健康检查 60s + dev schema db push 对齐 + 切窗闪退主窗工厂注入 + 认证面隐藏主窗 + boot 页纳入紧凑面 + 切窗防抖 250ms | CAP-A-14 | desktop tsc/eslint/tsup + frontend tsc + 新 spec 3 用例 + Playwright _electron 临时 e2e 六场景 PASS | CHANGELOG Unreleased 明细（两行） |
| frontend | **认证面定版**：登录页 WIP 双表面翻转卡为最终形态 + AuthShell 左文右图分栏壳 + 注册欢迎身份工牌（D1~D6 裁决落地） | CAP-A-22 | 新 spec 三件 10 用例 + design-system smoke 回归绿 | CHANGELOG Unreleased 明细（三行） |
| server · frontend · contract | **验收与发版补「所属项目」可读名 + 通知中心可操作收件箱 + CAP-C-07 看板卡接线与项目属性面板/行右键菜单修复（stash 抢救）** | CAP-A-16 | 定向 vitest 全绿；契约三线零漂移 | CHANGELOG Unreleased 明细（两行+修复一笔） |

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| desktop | **boot 失败双根因修复（健康检查窗口 + dev schema 对齐）**：①健康检查超时 30s→60s——server 冷启动耗时抖动大（杀毒扫描/负载，同机实测 7.9s↔30.8s），30s 窗口曾把刚就绪（30.8s）的 server 判死强杀报「健康检查超时」boot 错误屏；超时错误信息补已等待时长。②dev 模式已有库 schema 对齐——`restoreDefaultDbIfNeeded` 原只建库不迁移，代码新增列（approvedFingerprint/retryOfId）后用户旧库缺列导致运行期接口 500（CAP-A-14 重审注记「升级迁移路径」缺口实锤）；现 dev 启动（无 nodeExe）跑 `prisma db push`（无 --accept-data-loss）对齐，破坏性变更被 Prisma 拒绝显式抛错人工裁决；打包模式绝不触碰用户库 | CAP-A-14（重审注记升级迁移路径 dev 半边收口） | 用户库 `db push` 实测 928ms 对齐成功；desktop tsc 0 错 + eslint 0 + tsup 构建过 | 能力清单 §七变更记录 |
| desktop · frontend | **登录态紧凑窗口（桌面端认证面小窗 + 隐藏标题栏）**：进入 /login·/register·/welcome 时主窗口收缩为包住认证卡片的紧凑小窗（1040×700 居中锁 resize、`titleBarStyle:'hidden'` + WCO 原生窗口控制钮、认证卡片顶部 CSS 拖动区），认证完成自动恢复完整窗口与标题栏。Electron 无运行时 titleBarStyle 切换 API，故采用**双窗编排**（`windows.ts` 新模块）：主窗（正常形态）承载工作台、认证窗（紧凑无边框，形态创建时定死）承载认证面，`set_compact_mode` IPC 命令切窗（幂等；退出时主窗重载前端使登录态生效）；首启无会话直接以认证窗启动（品牌启动屏小窗呈现，免大窗闪变）；认证窗 close 与主窗同语义转托盘保活（isQuitting 守卫防阻断退出）；主窗 bounds 持久化天然不受认证窗影响；web 端（无壳桥）与旧壳未知命令静默降级零影响 | CAP-A-14（2026-09-21 追加切片） | desktop tsc 0 错 + eslint 0 + tsup 构建过；frontend tsc -b 零错 + 定向 eslint 0；新 spec `use-desktop-compact-window.test` 3 用例（挂载开/卸载关/web 无桥不 invoke/旧壳拒绝静默）+ desktop·auth 两模块定向回归 24 用例绿 | 能力清单 CAP-A-14 追加切片 + §七变更记录；测试映射矩阵 GAP-T-40 |
| frontend | **认证面定版：登录页采用 WIP 双表面翻转卡版（同步自 fix/experience-p2-fixes d2fd16b）**：AuthVisualCard human/AI 双表面翻转卡（明暗/语言切换 + 服务器配置对话框 + Blueprint/Prism 画布 + 表单精修）为登录/注册页最终形态；redesign 分栏版（AuthShell/MemberCard）保留于 feat/auth-redesign 分支与 /welcome 路由，其 login/register 配套测试随页面结构移除 | CAP-A-22 | frontend tsc -b 零错；恢复文件定向 eslint 0/0；welcome 测试 3/3 绿 | CHANGELOG 本条 |
| server · frontend · cli · shared · contract | **体验测试 P2 修复批（28 项全量，六批次夜航交付）**：①前端交互——dock 收起态根节点退出命中测试不再吞首点（P2-01）、prompt 建子任务对话框化+行固定 localStorage 持久化（P2-02）、执行状态口径统一（approved/rejected 映射补齐/「0 步」如实/office 词表对齐 ACTIVE_EXECUTION_STATUSES/周 tokens 改 AIUsageLog 真相源，P2-03/04）、发版门禁空范围中性态（P2-05）、data-list 键盘三件套平移 DataTable（P2-06）。②后端安全与管道——acceptance 9 处 Query 冒名改 CurrentUser+workspace 两处 @Public 收紧（P2-08/16）、legacy publishRelease 删除（核实推翻报告：`/publish` 端点一直走状态机）、未知路由统一 JSON 信封（P2-09/10）、57 处数组式 @IsEnum 空清单改 @IsIn（P2-11）。③契约与链路——assign-agent 三名归一 aiAgentId（P2-12）、分页契约对账 34 端点零缺口（P2-13）、propose_decision 五 kind payload 校验（P2-14）、进程内执行 usage 落账接通双轨成本另一半（P2-15）。④性能——全局任务页真分页 50/页（P2-17）、runtime 派发配置热路径 (key,scope) 精确索引命中零迁移（P2-18）。⑤数据卫生——displayName 编码校验拒乱码（P2-19）、E2E 残留用户清理脚本 dry-run 自证待裁决 R1（P2-20）。⑥产品级——信任三级接派发门禁（观察者拦截+fail-open 兼容存量，P2-21）、LLM 供应商同类型多槽位（详见下行，P2-22）、skills 注入派发 prompt+上下文增强三来源+token 预算（P2-23）。⑦i18n 与新手面——硬编码文案约 224 条迁 i18n（309 对新键双语同步，P2-24/25）、帮助中心按真实功能重写 22 篇清除 Slack/Ctrl+N 不存在项（P2-26）、OnboardingGate 对 Web 生效（P2-27）、boot 页诚实化+开发地址仅 DEV 显示（P2-28） | 体验报告 §五/§八/§十三 / p2-fix-plan-2026-09-20 | 全仓 test 5 包全绿（frontend 164 文件 1063 用例）；type-check 6/6 包；lint 0 error；contract:check 零漂移；check:cli-contract 过；check-i18n-sync 4486=4486；check:docs-sync 过 | CHANGELOG 本条；体验报告 §十五「P2 修复状态」新增；p2-fix-plan 计划文档入库；openapi.json + 双端 api-types.gen.ts（acceptance 删 userId query/workspace security/AssignIssueAgentDto/provider 多槽位/门禁 400 描述）；裁决 R1（残留数据清理执行）/R2（P0-3 注册建工作区）/R3（考古卡可见性）待用户 |
| server | **同类型多供应商槽位并存（P2-22，双网关场景）**：AIProviderConfig 类型唯一（`provider @unique`）放开为 provider+displayName 组合唯一——同类型（如 glm/deepseek）可建多个槽位（不同显示名/网关 baseUrl/凭证），显示名同类型内唯一；创建查重与更新防撞前置可读校验（400 指名槽位与类型），适配器注册表按「最早启用槽位」为代表解析（loadAdapters/reload/resolveAdapter 三处 findUnique→findFirst，类型唯一时代语义等价），setDefaultModel 同口径；seed 幂等查重同步 findFirst。迁移 `20260920000000_ai_provider_multi_slot`（存量单槽位数据天然满足组合唯一，无损；dev 库已 db execute 应用+模板库已重建，其余环境随 migrate 流程） | 体验报告 §八-10 / p2-fix-plan P2-22 | provider-config 27 用例（含同类型双槽位创建/重名 400/改名防撞 3 新增）+ adapter-registry 新套件 4 用例全绿；ai-hub 模块 176 用例绿；ai-hub e2e 14 用例绿 | openapi.json 已随 contract:export 再生成（同类型多槽位语义、400 错误描述）；前端 models-tab 多槽位卡片显示 baseUrl host、内置模型下拉按类型去重 |
| server | **考古决策卡按项目成员过滤（R3 裁决落地）**：`/decisions/pending` 与 `/decisions/summary` 注入 CurrentUser——全局视图（无 projectId）收敛到请求者的成员项目集合（ProjectMember），显式 projectId 同样校验成员身份、非成员收敛为空集合（不可见而非 403）；projectId 为 null 的系统级卡（如发版审批）不挂项目、不参与成员过滤；userId 缺失（无 JWT 场景理论兜底）保持旧口径。同批执行 R1 自动清理：`cleanup-e2e-users.mjs --execute` 删除 21 个零引用 E2E/冒烟残留用户（备份+rollbackSql 落 scripts/backups/cleanup-e2e-users/） | 体验报告 §十五 R1/R3 / p2-fix-plan R1/R3 | decision.service.spec 9 用例全绿（新增 4：成员集合收敛/非成员显式 projectId 空集合/成员显式放行/summary 收敛）；server type-check（官方 tsconfig.build 口径）过；清理后 dry-run 复核 AUTO=0 | openapi 契约形状不变（query/响应结构未动，仅返回内容按调用者成员关系收敛）；CHANGELOG 本条；R1 人工候选 5 个留待用户逐个裁决 |
| frontend | **全局顶部加载条在无 token 页面常挂修复**：`GlobalLoadingState` 旧实现按 `status === 'pending'` 逐事件计数——disabled 查询（如登录页 enabled 依赖 token 的 me 查询）status 恒为 pending 而 fetchStatus 为 idle，导致 /login 等无 token 页面顶部 2px 加载条永远挂着（CAP-A-22 认证面 1920×1080 截图实测显形，存量问题非本次引入）。修复为以 `fetchStatus === 'fetching'` 为唯一真相全量对账：每次 cache 事件重算「在途请求数 vs 已计数」差值增减，事件序漏计/多计天然免疫 | CAP-A-22（认证面改版随批修复） | frontend 新 spec `global-loading-state.test` 3 用例（disabled 不显示/启用后在途出现·完成消失/挂载即在途同断言）；auth + design-system + settings sections 定向回归绿；tsc -b 零错、定向 eslint 0/0 | — |
| frontend | **认证面改版：左文右图分栏壳 + 注册欢迎身份工牌（CAP-A-22）**：参考 Qoder 双屏语法重做认证面（极简区，用户六点裁决 D1~D6：产品拼贴/工牌仅展示/web 先行/按钮主题色不改绿/语言切换上/不脱敏）——①新增 `AuthShell` 分栏壳（登录/注册/欢迎三页共用：桌面左文右图、左栏三段=品牌/主体居中/操作贴底、窄屏单栏居中；右栏满高圆角面板，缺省渲染 `AuthVisual` 产品卡拼贴——工单/决策/AI 同事迷你卡 + 点阵纹理 + logo 水印，装饰性 aria-hidden、语义色仅上分类 chip、插画资产留槽位可热替换）；②登录/注册页换壳重写（登录/注册逻辑与错误映射不动，硬编码中文全部收编 i18n `auth.*`，补 `auth.errors.emailAlreadyRegistered` 存量缺键，页脚挂 `LanguageSwitcher`——compact 形态修正为尊重 showFlag/showLabel 且 className 经 cn 合并可覆写宽度，`persistTokenToShell` 补桌面注册漏镜像）；③注册成功改进欢迎页 `/welcome`（AuthGuard 门控）：左侧祝贺文案 + 右侧 `MemberCard` 身份工牌（SVG 环形口号 PEOPLE + AI COLLEAGUES + 显示名/编号=id 尾 8 位大写/入职日期 YYYY/MM/DD/签名，纯展示仪式件），数据注册流 state 优先、/auth/me 兜底、均缺静默降级；语言文案 zh/en 双语 36 键对称 | CAP-A-22 | frontend 新 spec 三件 10 用例（登录错误映射 3 保留+凭据透传断言；注册校验两拦截/成功流存 token+桌面镜像+携 registeredAt 跳 /welcome/409 映射；工牌 me 兜底+state Time 行+占位名降级）；design-system 页 smoke 补 matchMedia 桩回归绿；宪法五 lint + lint:registry 103 组件对账过；tsc -b 零错、定向 eslint 0/0、settings sections 定向回归绿 | COMPONENTS.md（认证面三件登记 + design-system 页 Auth Surface 分区）；能力清单 CAP-A-22 新卡 + §七变更记录；测试映射矩阵 GAP-T-39 |
| server · frontend · contract | **验收与发版补「所属项目」可读名**：AcceptanceResponse 经 issue 关联投影 `issue.project` 摘要（新增 AcceptanceProjectBriefDto，任务未关联项目时 nullable null）；ReleaseDto 补 `project` 摘要（include 投影并入 RELEASE_INCLUDE）；前端验收列表/详情/路由预览与发版列表/详情/溯源区补所属项目展示与列；openapi.json + 双端 api-types.gen.ts 三线同步；zh-CN 路由预览区错位嵌套的 task 键顺手归位 | CAP-A-16（发版投影延伸）· 验收详情可读性 | acceptance-list/acceptance-detail 与 release-pages 定向 vitest 用例随批扩展 | openapi.json + api-types.gen.ts ×2；CHANGELOG 本条 |
| frontend | **通知中心可操作收件箱（actionable inbox）**：通知中心页重构为可操作收件箱——新增 inbox-item-row 行组件 + use-actionable-inbox 数据 hook + types/inbox 类型，通知项内联决策提案快速复核入口，缩短「通知→决策收件箱」路径 | —（候补登记待走 requirement-intake） | notification-center-page 测试用例随批扩展（inbox 数据流+行渲染） | CHANGELOG 本条 |

## [0.7.2] - 2026-09-20

### v0.7.2 发版总览——体验测试 P1 修复批（19 项）+ 命令面板双模升级

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **命令面板双模升级**：coss ui p-command 替换手搓 cmdk（引擎=base-ui Autocomplete，壳=base-ui Dialog），内嵌轻量 AI 问答（`assistantApi.send` 真通道一问一答），命令注册表 23→40 条，快捷选择 Ctrl+1..9，非命令前缀输入直达实体搜索（工单/项目）；列表滚动视口修复 | — | `command-palette.test` 21 用例 + design-system 回归 25 用例绿 | COMPONENTS.md（Command 套件重写）+ frontend modules.md + page-registry 四行；cmdk 退场 |
| server · frontend · cli · shared · contract | **体验测试 P1 修复批一/二/四**：错误呈现（工单页错误态/注册 409 语义码/login 字段错误归位 400/dashboard 坏路由/测试连接 60s+诊断透传，P1-1~6）+ 治理口径（决策卡 failed 契约门禁堵死绕过/详情只读回显验收标准/直写决策提案补发事件，P1-8/9/10）+ 契约链路（workflow 补 security、7 端点补分页、blocked 执行死锁统一出口、CLI adapter 能力位如实声明、mcp config 改 PAT 引导，P1-20/21/22a+A-1） | 体验报告 §四 | 全仓 test 5 包全绿；contract:check 零漂移；check:cli-contract 过 | openapi.json + 双端 api-types.gen.ts |
| frontend | **体验测试 P1 修复批三（工单域效率基座 9 项）**：批量修改状态/优先级/负责人、命令面板实体搜索、表格排序+真开关 chips、全局页 CSV/JSON 导入导出、筛选 URL 持久化、键盘流焦点修复、详情页双向依赖区块+子任务缩进、类型切换器接通（base-ui Menu.Item 无 onSelect 死开关）、迭代创建/编辑/详情+日期状态推导（P1-11~19） | 体验报告 §四 | frontend 1022 用例绿；i18n 新键双语同步 | CHANGELOG 本条 |
| 工具链 | **@nestjs/cli tree-kill win32 容错 patch + 命令面板配方白名单**：taskkill 非零退出（进程树部分消亡）不再拖死 dev:server（4300 悄悄死根因之一）；p-command 官方配方 11 个计算值登记 check-tailwind-arbitrary 白名单 | — | 完整 install + supply-chain 校验过；全仓门禁七链绿 | — |

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **命令面板组件升级：coss ui p-command 替换手搓 cmdk 面板（含用户实测五项反馈返工）**：`components/ui/command.tsx` 整体重写为 coss `@coss/command` 移植（引擎=base-ui Autocomplete：accent/大小写不敏感 contains 过滤、分组、键盘导航/高亮全内置；壳=base-ui Dialog 弹出层），provider 按官方 p-command-2 配方组合——数据驱动 items（组数组）+ filter、List children 渲染函数（closed-template）、Kbd 页脚（↑↓/↵/ESC + 右侧实时改键触发键）。**内嵌轻量 AI 问答（双模面板）**：Tab/「询问 AI」/零命中回车三入口进入 AI 模式（不再跳转系统助手），`assistantApi.send` 真通道一问一答（sync 终文 markdown 渲染 / runtime 异步回流诚实提示 / 失败红色告警），「相关页面」引用 chips=问题词复用 /search 的真实命中，Esc capture 返回搜索不关面板；**快捷选择**：可见条目前 9 项显示 Ctrl+1..9（formatComboForDisplay 平台自适应）且真实生效（搜索命中组优先计入可见序）；**图标治理**：条目图标统一 size-4 + page-registry 品牌色（`iconColor` 与侧边栏同源），搜索命中走 entity-icons tone 语义色；**页面全覆盖**：命令注册表 23→40 条（补 releases/intake/delivery/ai-surface + 设置二级页 16 条，新增 settings 分组+`shell.groupSettings` 键），page-registry 补 shortcuts/memory/runtime/tokens 四行；**视觉修正（用户实测反馈）**：输入区/页脚 bg-muted/50 与中间面板 bg-popover 分层（此前同色）、聚焦 ring/边框加粗动画禁用、startAddon 搜索图标与 placeholder 重叠修复（死子选择器改 render Input 直挂 ps-9）；`AutocompleteList`/`CommandList` 增 `scrollAreaClassName` 通道（列表 max-h-72 滚动，AI 回答区 max-h-80）；cmdk 依赖退场；i18n `commandPalette.*` 11 新键 + `shell.groupSettings` 双语 | — | frontend `command-palette.test` 21 用例（15 旧契约原样过 + 关键词过滤/Enter 高亮选中/AI 模式自动提问/Esc 返回搜索/Tab 进 AI 模式/Ctrl+1 快选 6 项新引擎行为）；design-system 整页渲染 + shortcuts + dock 25 用例回归绿；tsc -b 零错、定向 eslint 0/0 | COMPONENTS.md（Command 套件条目重写）+ docs/02-架构设计/architecture/frontend/modules.md（command-palette 行）+ page-registry 四新行；依赖变更：frontend 移除 cmdk |
| server · frontend · cli · shared · contract | **体验测试 P1 修复批一/二/四（18 笔提交，错误呈现+治理口径+契约链路）**：批一错误呈现——工单页 useQuery 补 isError 分支不再把 500 伪装空态（P1-1）；P1-2 复核销项（挂载自发 accept 不存在，补回归锁定）；注册 409 语义码 EMAIL_ALREADY_REGISTERED+前端定向文案，真根因是两页读旧信封路径恒 undefined（api-client 已转顶层 ApiClientError）一并修正（P1-3）；login 移除 LocalAuthGuard（guard 先于 pipe 致字段错误伪装 401）改 controller 显式校验，字段错 400/凭证错 401+INVALID_CREDENTIALS，LocalStrategy/LocalAuthGuard 死代码清退（P1-4）；/app/dashboard redirect 工作台（P1-5）；api-client TIMEOUT 独立分类+测试连接 60s+后端结构化诊断完整透传（P1-6）。批二治理——决策卡完成链统一 notIn ['passed','waived'] 与 TASK_DONE_BLOCKED 同构，apply 拒绝 422 ACCEPTANCE_FAILED_BLOCKING，failed 契约不再可绕过关单（P1-8①②，存量追溯待裁决 D2）；详情正文只读回显验收标准（P1-9）；P1-10 复核实锤 5 处直写决策提案绕过统一入口不发事件（发版审批卡/契约冲突升级×2/助手直出卡×2）全部补发同形态事件。批四契约链路——契约声明对齐实际行为：workflow 全家 9 端点补 security、7 个实读分页参数端点补 @ApiQuery（516 端点全对账，实扫漏声明 9 非 28）（P1-20）；blocked 执行死锁统一出口：错误指名活跃执行+两条取消途径、cancel 按 executionId 降级、retry 放开 superseded（P1-21）；四家 CLI adapter 能力位如实声明（codex usage 失明/zcode allowedTools 失效实锤）+双落点显式告警+opencode 补 MCP 枚举 7 处（P1-22a）；apm mcp config 删 runtime-token 通道改 PAT 引导（A-1） | 体验报告 §四 P1-1~6/8①②/9/10/20/21/22a + §十 A-1 | 全仓 test 5 包全绿（server 949/frontend 1022/cli 9 用例）；批内受影响套件逐波复跑全绿；contract:check 零漂移（两轮 export/generate）；check:cli-contract 过；双端+shared/cli tsc 零错；P1-2/P1-10 复核结论回写报告 §十三 | CHANGELOG 本条；体验报告 §十三「P1 修复状态」新增；openapi.json + 双端 api-types.gen.ts（login 400 声明/workflow security/分页参数/cancel-retry 描述）；P1-7/A-2/A-3 待裁决 D1/D3/D4 未开工 |
| frontend | **体验测试 P1 修复批三（工单域效率基座 9 项）**：批量修改状态/优先级/负责人（逐条 allSettled+汇总 toast，P0-5 范式）（P1-12）；命令面板接 /search 实体搜索（防抖 300ms+AbortSignal 竞态防护，命中置顶可跳转）（P1-13）；表格排序+展示属性 13 假 chips 收敛 11 真开关（3 个无数据 chips 移除；列宽拖拽未做——DataTable 无列宽基建）（P1-14）；全局页 CSV/JSON 导出接通（后端 export 为项目级端点，全局页前端从筛选结果生成并双注明范围）+导入入口（P1-15）；筛选 URL 持久化（视图>URL>默认）+优先级/负责人/迭代/标签四维+计数如实标注（P1-16）；键盘流完整修复——复核实锤焦点到不了容器（j/k 本身正常），onClickCapture 聚焦+焦点守卫+x/space 接多选，顺带修 checkbox Space 双触发（P1-11）；详情页双向依赖区块（drawer 字段错位 Blocked By 恒显 ID 顺带修）+表格子任务缩进折叠（排序回声防子行被排序甩出）（P1-17）；类型切换器死开关真因 base-ui Menu.Item 无 onSelect（DTO typeId 已存在，任务书根因有误），改 onClick+乐观更新回滚，assistant-model-picker 同病根 3 处顺手修（P1-18）；迭代创建/编辑/详情对话框+日期状态推导（cancelled 手动覆盖，后端零改动三端点已在契约）（P1-19） | 体验报告 §四 P1-11~19 | issue+command-palette+assistant+milestones 受影响套件逐波全绿（热点组波次全前端 979 用例绿；总收口 frontend 1022 用例绿）；tsc -b 零错；i18n 新键 zh/en 双语同步（task.batchUpdate/export/import/filter/stats、viewDisplay、commandPalette、project.milestonesPage） | CHANGELOG 本条；体验报告 §十三 |
| 工具链 | **Tailwind 任意值白名单登记（命令面板配方 11 值）**：coss p-command 官方配方（7e9daeb）的 Dialog 弹出层动画链式变量（--nested-dialogs 级联位移/缩放/透明度）、双层圆角微调与触发器紧凑间距属变量/表达式计算值，无 token 可归约——登记进 `check-tailwind-arbitrary.mjs` ALLOWED_TOKENS 并注明出处（首轮误登 VARIANT_PREFIX 集合即纠偏） | — | frontend 全量 lint 0 error（check-tailwind-arbitrary 过，3 存量 warning 无关） | — |

## [0.7.1] - 2026-09-20

### v0.7.1 发版总览——OpenCode 支持三期 + AI 管理页重整 + 批二 P1 治理卡 + 体验测试 P0 修复批

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server · frontend · shared · cli | **OpenCode 支持三期全交付**：Zen/Go 供应商预设 + 第四家 CLI adapter（NDJSON 事件流实机采样）+ 模型清单覆盖式同步 + 在线状态联动 + 余额查询（充值/套餐双型归一）+ models.dev 价目参考源 + Go 网关会话头/chat completions 强制适配 + 运行时守护进程启停按钮 | CAP-A-20 / A-21 / B-05 | 各切片 spec 全绿 + 实机链路验证；契约三件套零漂移 | openapi.json + 双端 api-types.gen.ts；能力清单各卡 |
| frontend · server | **AI 管理页信息架构重整**：「Agent 管理」并入「AI 管理」五页签（模型服务/概览/CLI/MCP/技能），「AI 用量」迁 analytics 成本 Tab 做实（柱状图+活跃热力图）；假数据清除（宪法 §9.1）+ 品牌图标全量替换（@lobehub） | CAP-C-06 | 合并页单测 + 定向回归全绿 | 能力清单 C-06 卡 |
| server | **批二 P1 治理卡（五连发）**：CAP-C-01 assistant 领域 hook 归还各域（PR #66，零行为变更）+ CAP-B-06 ContextPack freshness 按数据源实龄计算 + CAP-K-03 交付成果清单 + CAP-B-01/B-02 验收标准版本化与审计绑定 + CAP-C-04 决策批准绑定内容指纹 + CAP-B-07 信任三级分级授权（观察者/协助者/受托者）+ CAP-P-01 需求修订影响链路最小闭环 | 批二 P1 各卡 | 各切片 spec 全绿 | 能力清单各卡 |
| server · frontend | **夜航体验测试 P0 修复批（12 项，PR #72）**：工作区数据隔离、信任评估量纲统一 0-100（修复成功执行反降信任的反向演进）、质量/团队假数据生产隐藏、AI 建议非法项显式 400、决策提案直写路径补发创建事件等；同批收编 AI 管理页在途改动 | 体验报告 §十 | 全仓 test 全绿 + e2e 增补 | docs/roadmap/experience-report-2026-09-20.md |
| 工具链 | **测试基建治理**：四包测试运行时统一 Vitest 5.0.0（catalog 精确锚定）+ PR 增量门禁（gate:quick + CI 分类器，pre-prod/main 强制全量）+ nightly 全量门禁 + worktree 依赖共享 + test-workspace 补盲 | — | 门禁全绿 | AGENTS.md 质量门禁节 |
| frontend | **心跳监控条样本持久化**：探测历史按 key 落盘 localStorage（60 条窗口），重挂载恢复拼接，损坏静默降级 | CAP-A-14 | heartbeat-monitor 新 spec 4 用例 | — |

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server · frontend | **OpenCode Go 套餐用量查询接入（余额链 percent-only 窗口适配）**：实机验证 Go 网关套餐接口 `GET {baseUrl}/usage`（Bearer 认证，返回 `{usage:{rolling·weekly·monthly:{status,percent,resetsAt}}}`——仅已用百分比+重置时间，无 used/limit 绝对值），据此四处适配既有余额查询链：①`resolveBalanceEndpoint` 对 opencode-go 默认取 baseUrl 版本段下 `/usage`（原默认域名根 `/user/balance` 对网关型厂家不成立；metadata.balanceEndpoint 覆盖优先不变）；②`normalizeBalancePeriod` 补 `rolling→5h` 别名（opencode 滚动窗口即 5h 计费窗）；③`toBalanceWindow` 补 percent 拾取（`percent/used_percent/usedPercent`），窗口成立条件放宽为四值任一非 null（percent=0 不丢）；④契约先行 `ProviderBalanceWindowDto` 增可选 `percent`（0-100，仅百分比型窗口有值此时 used/limit 为 null）+ 前端 `AiBalanceWindow` 手写镜像同步，模型服务 Tab 套餐窗口渲染 percent 优先（文案 `N%`、进度条直接以百分比为值，黄/红阈值照常生效） | CAP-A-20（OpenCode 套餐查询切片） | server `provider-config.service.spec` 24 用例（+opencode-go /usage 真实夹具：端点断言/rolling 别名/percent-only 三窗口稳定排序/percent=0 保留，既有两用例窗口期望同步 +percent 键）；契约三件套零漂移（openapi +percent 字段 + 双端 gen 重导出）；双端 tsc 零错、定向 eslint 0/0、前端合并页 spec 8 用例回归绿；实机链路：直连 `/usage` 200 采样 → APM `GET /ai/providers/:id/balance` 200 返回 `{type:'subscription', windows:[5h pct0/week pct20/month pct2]}` | openapi.json + 双端 api-types.gen.ts（ProviderBalanceWindowDto.percent） |
| frontend | **心跳监控条样本持久化（localStorage）**：机器详情页心跳监控条的探测历史原先存组件内存 state，退出页面即清零——现 `HeartbeatMonitor` 增 `persistKey` prop（机器详情页传 runtimeId + `key` 隔离重挂载），样本按 key 写入 localStorage（键 `apm.heartbeat-monitor.<key>`，保留最近 60 条、detail 截断 200 字符防膨胀），进入页面/刷新后历史恢复、与新探测续拼；存储不可用（隐私模式/配额超限/数据损坏）一律 try/catch 静默降级为内存态，不阻塞条带运行 | CAP-A-14（运行时管理打磨） | frontend 新 spec `heartbeat-monitor.test` 4 用例（按 key 落盘/重挂载恢复拼接/损坏数据静默降级/无 persistKey 不落盘，localStorage 自接内存实现）；shared/runtime + settings sections 回归 50 用例绿；tsc 零错、定向 eslint 0/0 | — |
| server · frontend · cli | **运行时页 OpenCode 支持 + 守护进程启停按钮**：①运行时清单补漏——daemon `lifecycle` register 与 capabilities 两处 `cliProviders` 上报硬编码漏了第四家 opencode（worker ADAPTERS 二期已注册、注册载荷漏同步，机器详情页「运行时」卡因此只见三家）；上报直通无白名单过滤，register/capabilities 按 runtimeId upsert，daemon 重启重新注册即覆盖生效；②机器详情页头部新增「启动运行时 / 重启运行时」按钮，双通道：桌面壳走壳桥命令 `get/start/stop_runtime_daemon`（壳托管进程），浏览器走 server 新增本机 daemon 运维端点 `GET/POST /_api/runtime/local-daemon/{status,start,stop}`（`DaemonOpsService` standalone 限定——非 standalone 一律 403：远程部署无权操纵访问者本机；状态=runtime.lock 持有者探活+config.daemon.pid 兜底，启动=detached spawn CLI runtime 入口（`APM_CLI_ENTRY` 可覆盖）+1.5s 宽限观察防假成功，停止=win32 taskkill /T /F）；重启=stop→start 序列，成功 toast 并 invalidate 注册列表，失败回读真实状态；远程部署 403 时按钮诚实降级隐藏）；③契约三件套同步（openapi +3 端点 + 双端 gen 重导出）；i18n `settings.runtimeDaemon*` 6 键双语 | CAP-B-05（OpenCode 支持收尾） + CAP-A-14（运行时管理增量） | cli `lifecycle` 上报载荷补 opencode（type-check + 9 用例全绿）；前端新 spec `runtime-machine-detail-section.test` 5 用例（浏览器+standalone 走 server 端点/远程 403 降级/壳内启动/壳内重启 stop→start 顺序/浏览器重启）；server 新 `daemon-ops.service.spec` 7 用例（403/状态判定锁优先 config 兜底/已在运行 400/秒退防假成功/taskkill 强杀）+ `runtime-local-daemon.e2e-spec` 1 条（status 形状，start/stop 有真实进程副作用不进共享 e2e，audit 诚实标 2 条未覆盖）；settings sections 46 用例回归绿；契约三件套零漂移、双端 tsc 零错、定向 eslint 0/0、i18n 双语 4042 键对称、api:audit 513/515=99.6%≥95 | openapi.json + 双端 api-types.gen.ts（runtime/local-daemon 三端点） |
| server | **OpenCode 网关实机接入修复（会话头 + chat completions 强制）**：OpenCode Go 套餐实机接入时发现两处潜伏缺陷——①Go 网关（`opencode.ai/zen/go/v1`）强制要求 `x-opencode-session` 请求头做会话路由，缺失一律 400（直连实测四模型一致）；②`@ai-sdk/openai` 4.x 的 `languageModel()` 默认走 Responses API，网关只支持 chat completions（validate 报 `Model ... is not supported for format openai`）。修复：`AiSdkAdapterOptions` 扩 `headers`（三家 sdk 透传）与 `useChatCompletions` 两可选字段；`AiSdkAdapterFactory.create` 统一入口对 opencode/opencode-go 注入实例级 UUID 会话头并强制 `.chat()` 走 chat completions，其余厂家零行为变化。随批实机接入 OpenCode Go：default 工作区建 `opencode-go` 配置（key 源自本机 opencode CLI auth），validate 通过状态联动 connected | CAP-A-20（OpenCode 预设补丁） | server type-check 零错 + `ai-hub` 模块 11 spec 164 用例全绿；实机链路：直连 `/models` 37 模型 → 裸 fetch 缺头复现 400 → 带 UUID 头 chat/completions 200 → 走 APM `POST /ai/providers/validate` 返回 `valid:true` 且 provider 状态落 connected | — |
| server · frontend | **模型价目参考源 models.dev（CAP-A-21，OpenCode 支持三期）**：①后端新增 `ModelsDevService`——拉取 models.dev 开源模型目录（`https://models.dev/api.json`，实测 222 厂家/7860 模型）归一为分项参考价（input/output/cache_read/cache_write，USD/百万 tokens），内存缓存 TTL 24h，启动预热（失败不阻塞）、厂家别名映射（gemini→google、glm→zhipuai 等）、模糊命中取最长目录 id（日期尾缀模型）、免费/无价目条目不造假；②估价链升级——`UsagePricingService` 从「配置价→内置混合表→null」扩为「AIModelConfig 配置价 → **models.dev 分项价**（prompt×input + completion×output）→ 内置混合表 → null」，AI 用量成本估算不再只靠 11 条陈旧混合价兜底；③新端点 `GET /_api/ai/pricing-source`（状态 available/fetchedAt/stale/providerCount/modelCount/source/error，只读不触发网络）+ `POST /_api/ai/pricing-source/refresh`（强刷，失败保留旧缓存并在 error 透出，不抛错）；④前端模型服务 Tab 新增「参考价源」状态卡（在线状态/覆盖规模/拉取时间/过期徽章/手动刷新，i18n `aiHub.pricingSource*` 10 键双语）。真相源纪律：模型清单仍以供应商 /models 端点为唯一权威（CAP-A-20 覆盖式同步不动），models.dev 仅作价目参考元数据，不落库不进 AIModelConfig | CAP-A-21 | server `models-dev.service.spec` 新增 8 条（真实数据夹具：归一计数/别名/日期尾缀模糊/未命中不串价/免费 0 价/失败保旧缓存/TTL 过期后台再拉）+ `usage-pricing.service.spec` 新增 7 条（估价链顺序/分项价数学/免费 0 非 null/内置表回落/全 miss null/DB 抛错回落）+ `ai-hub.e2e-spec` +3（状态形状/桩夹具刷新/桩移除后强刷不抛 500，离线确定性）；波及 `ai-hub.service.spec`+`assistant-silent.service.spec` 52 条回归绿；双端 tsc 0 错、定向 eslint 0、i18n 双语 4036 键同步、契约三件套零漂移 | openapi.json + 双端 api-types.gen.ts；能力清单 CAP-A-21 新卡；测试映射矩阵 GAP-T-38 |
| server · frontend · shared · cli | **OpenCode 支持（一期+二期）：OpenCode Zen/Go 供应商预设 + 第四家 CLI adapter**：一期——`AIProviderType` 枚举扩 `opencode`（Zen，`https://opencode.ai/zen/v1`）与 `opencode-go`（`https://opencode.ai/zen/go/v1`，openai 兼容订阅网关，`OPENCODE_API_KEY`）；后端默认 baseUrl/显示名/sdkType（=openai）/兜底模型四表 + 前端 `provider-visuals` 四表（@lobehub OpenCode 图标），AI 管理页「添加厂家」下拉即现两条预设，模型查询/验证/余额全走 CAP-A-20 既有机制；二期——第四家 CLI provider `opencode`（anomalyco/opencode）：shared `OpenCodeAdapter`（`opencode run --format json` NDJSON 事件流，`-m provider/model` 与 `-s session` 透传、prompt positional；事件包络经本机 1.18.18 实跑采样——`text` token、`step_finish` usage（`tokens{total,input,output,reasoning}`，completion=output+reasoning、`cost` 美元直取）、`error` 三类实锤，`tool` 事件按 part.type 宽松映射待工具型任务校准）+ server `cli-dispatch` 双轨镜像 adapter + daemon `ADAPTERS` 注册 + 白名单三处（registry applyDbOverrides / configure DTO `CLI_PROVIDER_IDS` / cli-provider.service 两处 providerIds）+ 前端 label 三处（`PROVIDER_DISPLAY_NAMES`·`PROVIDER_DESCRIPTIONS` 全键表、cli-dispatch-panel）；搭车修复 models-tab `text-[10px]` 任意值违规（存量 lint 债 → `text-10` token） | CAP-A-20 / CAP-B-05 | shared `adapters.test` 16 用例（OpenCodeAdapter 新增 5：buildCommand 透传/实跑样例解析/usage 口径/error 与非 JSON 回落/summary 拼装）+ server `provider-config.service.spec` 23 用例（+opencode-go 显式 baseUrl、+opencode 默认端点派生）全绿；type-check 6/6 包、frontend lint 0 error、contract:export/generate/check 零漂移 | openapi.json + 双端 api-types.gen.ts（`AIProviderType`/`CLI_PROVIDER_IDS` 枚举扩展）；能力清单 CAP-B-05 四家扩容行 + CAP-A-20 切片行 + §七变更记录；测试映射矩阵 GAP-T-37 |
| server · frontend | **供应商在线状态联动 + 模型清单覆盖式同步 + 下拉状态点 + 余额查询（CAP-A-20 第二轮四问迭代）**：①apiKey 验证有效即在线——`validateProvider` 增可选 `providerConfigId`，校验通过同步该记录 `status=connected`（失败不落态，被验的是输入框新 key 不代表已保存 key 失效）；`detect-models`/余额查询成功也写 connected、失败写 error（前端徽章不再滞留过期状态）；②模型清单**覆盖式同步**——一切以查询结果为准（先 `deleteMany notIn` 同厂家结果外旧模型再 upsert），结果为空返回 `{models:[], synced:false}` 不覆盖（detect-models 响应加 `synced` 字段）；③下拉**状态点恢复**——`ProviderStatusDot` 共享组件（连接绿/不在线红/未配置灰，有 key 断开算红），概览快捷设置卡与模型服务内置模型卡两个 provider 下拉统一挂点；④**余额查询**——新端点 `GET /_api/ai/providers/:id/balance` 代理厂家余额 API 并归一化：充值型（DeepSeek `GET /user/balance`：total/granted/topped_up → `{type:'prepaid', balance, currency, grantedBalance?, toppedUpBalance?, isAvailable?}`）/ 套餐型（编程套餐 5 小时·周·月限额窗口 → `{type:'subscription', windows[{period,used,limit,remaining,resetsAt}]}`，周期键别名归一 5h/day/week/month、windows·usage 等容器键下钻一层、5h→day→week→month 稳定排序）/ unknown 兜底；`metadata.balanceEndpoint` 可覆盖默认链接（baseUrl 域名根 + `/user/balance`）；模型服务详情卡新增**余额区**（充值型单进度条=剩余/累计到账、≤20% 红 ≤50% 黄；套餐型每窗口一条进度条、用量 ≥70% 黄 ≥90% 红；失败重试按钮；余额查询链接防抖输入；i18n `aiHub.balance*` 16 键双语） | CAP-A-20 | server `provider-config.service.spec` 扩至 21 用例（覆盖式断言/空结果零 DB 写/验证状态两流/余额归一化 7 条含 balanceEndpoint 覆盖·usage 嵌套·windows 直出·unknown·401·无 key）+ `ai-hub.e2e-spec` +2（余额 404/.invalid 不可达 400 离线确定性）+ 前端合并页 spec 7 用例（+余额区 prepaid 断言）；双端 tsc 0 错、定向 eslint 0/0、契约三件套零漂移、api:audit 510/510 100% | openapi.json + 双端 api-types.gen.ts；能力清单 CAP-A-20 卡迭代行；测试映射矩阵 +1 行 |
| server · frontend | **AI 管理页概览配置面 + 供应商模型真实查询**：概览页签置首默认（原默认=模型服务，`?tab=` 语义反转——overview 清参、models 显式带参）；概览新增「快捷设置」卡——工作区**内置模型**（provider+model 持久化 `AppConfig ai.defaultModel`，新端点 `GET/PUT /_api/ai/default-model`；`AiHubService.getAdapter` 无显式偏好时优先消费内置模型，`AdapterRegistry.resolveAdapter` 按 provider+model 惰性建适配器带缓存）+ 模型服务厂家启停开关（既有 `enabled` 字段首次有 UI）；模型服务 Tab 顶卡由本地 state 假切换器（选择不生效）改为真·内置模型控制（含保存与「内置」徽章）；**`detect-models` 由假探测（发一次 chat 即返回硬编码默认模型）改为真实查询供应商 `/models` 端点**——OpenAI 兼容 `${baseUrl}/models` Bearer / Anthropic `x-api-key`+`anthropic-version` / Gemini `?key=` 三协议，`metadata.modelsEndpoint` 可覆盖默认查询链接（如 DeepSeek `https://api.deepseek.com/models`），结果落 `AIModelConfig`；`listProviders`/`getProvider` 附 `availableModels`（前端清单真实化，内置表仅兜底）；模型详情区新增「查询模型」按钮与查询链接输入（防抖保存进 metadata）；i18n `aiHub.*` 17 键双语 | CAP-A-20 | server `provider-config.service.spec` 12 用例（三协议解析/端点覆盖/401 透出/不可达/空清单拒假成功/availableModels/内置模型存取）+ `ai-hub.e2e-spec` +3（未设置双 null/未知 404/读写回读）+ 前端合并页 spec 6 用例重写；双端 tsc 0 错、定向 eslint 0/0、contract:export/generate/check 零漂移 | openapi.json + 双端 api-types.gen.ts；能力清单 CAP-A-20 新卡 + §七变更记录；测试映射矩阵 +1 行；modules.md 前后端各一行 |
| frontend | **设置页「Agent 管理」并入「AI 管理」（页面合并 + 信息架构重整）**：`/app/settings/ai/agents` 撤销（`AiAgentsSection` 删除，路由重定向 `/app/settings/ai?tab=overview` 保书签；设置侧栏/命令面板/页面注册表三处入口收编——`cmd-agents` 删除、`cmd-ai` 关键词并入 agent/mcp）；`/app/settings/ai` 以 **ToolbarRow 纯切换形态**（views 不传 + 居中页签，analytics 同款）承载五页签：**模型服务**（默认页签=原 AI 管理核心：厂家卡片网格/API 密钥验证·保存·删除/BaseURL 防抖自动保存/内置模型清单兜底+后端 availableModels 优先/连接测试）、概览（四源真实数据 KPI×5 + CLI/MCP 健康卡，替代原统计三卡）、CLI 工具、MCP 服务器、技能（后三者为原 agents 页四页签全量迁移，功能零删减）；`?tab=` URL 双向同步。**假数据清除（宪法 §9.1）**：mock 配额双卡、信任等级演示卡、本地假技能开关、角色展示手风琴（用户点名）、只读 CLI/MCP 手风琴与 MCP Market 虚按钮一并废除。**品牌图标全量替换**：CLI 工具 emoji（🧠⚡🌀）与 Bot 通用图标 → 厂家 logo，复用 `provider-meta` 唯一源（补 zcode → Zhipu 品牌标；`CliBrandIcon` 新封装）；模型服务厂家图标/内置模型清单沉淀 `components/ai/provider-visuals`（`@lobehub/icons` 品牌色变体优先）；StatusPill 统一状态徽章（两页各持一套 span 版删除）。i18n `aiHub.tabModels`/`skillEmpty` 双语新增、`aiHub.description` 改口；死键（`settings.aiAgents`/`shell.openAgents`/`aiHub.roles*` 等）保留不删 | — | frontend `tsc -b` 零错 + 宪法五 lint + 全量 eslint 0 error（3 存量 warning 无关）+ 合并页新单测 5 用例（默认页签/?tab 定位×3/五页签切换器/品牌图标唯一源断言）+ settings·analytics 定向回归 44 用例全绿 | — |
| frontend | **设置「AI 用量」页迁入 analytics 成本 Tab（Cost 做实）**：`/app/settings/ai/usage` 撤销（路由重定向 `/app/analytics?tab=cost` 保书签、设置导航项删除、`AiUsageSection` 删除）；analytics 成本 Tab 由 DEV-only mock 升正式 Tab，数据源复用 `GET /ai/usage`（AIUsageLog 聚合，不新增后端端点）；新增按日/按月成本**柱状图**（ui/chart 套件 + chart-1 主题色）与 **AI 活跃热力图**（ui/ActivityHeatmap 升级：年视图 365 格 + 月份刻度 + 每格 hover Tooltip 浮窗 + `formatTip` prop）；汇总卡六项（总 Token/估算成本/调用总数/对话调用/静默调用/执行链调用）+ 按模型表（成本占比 Progress）；范围选择器（近 7 天/近 30 天/全部）常驻含空态；热力图恒为近一年总览（独立全量查询，与范围选择解耦）；mock CostTab 内容删除（Quality/Risk/Team 仍 DEV-only）；i18n `settings.aiUsage*` 17 键迁 `analytics.cost.*`（zh/en 双语）。**同批迭代（用户评审）**：ToolbarRow 视图管理组转可选 props（`views` 等整体不传即隐藏视图胶囊与新增按钮——纯样式切换页的合规形态），analytics 页以该形态承载居中页签（首轮误拆 ToolbarRow 裸嵌 TabsList 不合规，已纠正）；类型设置详情页（`/app/settings/issue-types/:typeKey`）同治——裸 TabsList 改为显式 PageHeader + 无视图 ToolbarRow + 自管滚动容器，状态页签计数转为 body 内联计算（StatusTabLabel 删除）；布局收紧（区块 space-y-4、柱状图 h-40） | CAP-C-06 | frontend `tsc -b` 零错 + analytics/issue-types 定向 10 用例（Tab 门控改判、成本正常/空态、六卡、无视图 ToolbarRow）+ team-member/design-system 热力图消费方回归 8 用例 + 宪法五 lint + 定向 eslint 0/0 | COMPONENTS.md（ActivityHeatmap/ToolbarRow props）+ 能力清单 C-06 卡迁移落地行 + §七变更记录 |
| server · frontend | **`GET /ai/usage` 响应扩展（调用来源分类计数）**：UsageResponseDto 新增 `totalCalls`/`conversationCalls`（挂 conversationId）/`executionCalls`（挂 executionRunId/workflowRunId）/`silentCalls`（无关联=系统静默场景）四计数字段，getUsage 聚合按三外键分类计数；`byDay` 上限 30→370 天（供成本页全年热力图）；契约三件套同步（openapi.json +21 行、双端 api-types.gen.ts 重导出） | CAP-C-06 | server `tsc` 零错 + ai-hub.service.spec 4 用例（含分类计数断言）+ `contract:export/generate/check` 零漂移 | openapi.json / 双端生成类型 |
| desktop · frontend | **Tauri 遗产整体剔除（ADR-014 E④ 收口，桌面技术栈 Electron 单轨）**：删除 `apps/desktop/src-tauri/`（Rust 壳全量）与 `@tauri-apps/cli`、`tauri:*`/`desktop:tauri:*` 脚本、tauri gitignore 行、`scripts/build-desktop.ps1`；壳桥契约更名 `window.__TAURI__.core.invoke` → `window.__APM_DESKTOP__.invoke`（扁平化；preload/electron-api 与 boot·desktop·onboarding·notification 模块及 CDP 脚本全量同步）；移除前端 `@tauri-apps/plugin-log` 依赖与 console 转发链（Electron 壳无 `__TAURI_INTERNALS__`，转发自 Electron 切换起即静默失效，行为无变化）；打包资源 staging `src-tauri/target/desktop-pack` → `build/desktop-pack`（pack.mjs/electron-builder.yml 同步）；AppInfo 载荷字段 `tauri`/`rust` → `shell`/`runtime`；check-doc-sync 桌面文档闸门反转为「Tauri 文档不得进主路径」 | CAP-A-14（ADR-014） | desktop type-check/lint + frontend tsc -b + desktop·boot·onboarding·shared 定向单测 + check-doc-sync | AGENTS.md / architecture.md / README / DESIGN.md / desktop README / frontend modules.md / 技术架构总览 / 能力清单 / 决策日志 ADR-014 补记 同步改口；Tauri 计划档案移 docs/archive |
| 工具链 · server | **硬编码路径遗留清偿**：shadcn npm 转发垫片 `npm-forward.cjs` 的 FE_DIR 由 orca/manatee 时代个人绝对路径（三代目录变迁前）改为 `__dirname` 相对解析；`runtime.e2e-spec.ts` workspaceRoots 单反斜杠转义修复（`\t` 被解析为 TAB，与注册值不一致的潜伏错误）；runtime 契约示例值去项目化（`E:\Project\agent-project-manager`、`E:\repo` → `C:\Users\me\workspaces\demo-project`，与既有 `C:/Users/me/APM/docs` 示例风格统一） | — | contract:export + contract:generate + contract:check 契约三件套零漂移全绿（openapi 与双端 gen 各 3 处示例、9 行等量替换） | — |
| server | **APM 研发流程内置模板入库（workflow）**：把仓库自身已验证的四条研发工作流经文法 v1 注册为内置模板（`onModuleInit` upsert 进 `AIWorkflowDefinition`，画布即流程图，APM 用自己管自己）——需求承接六步流（AI 初筛+六问起草→人工裁决闸门→归档→开工登记，对齐 requirement-intake skill）、功能开发主线走查（清单闸门→契约先行→分支实现→quality:gate→文档变更账→PR 合入）、发版管道走查（CHANGELOG 归版→全量门禁→release PR→tag→发版草案落库→人工 Publish）、夜航巡检走查（跑满门禁→机械自修→失败定位→报告起草落库）；message 内沉淀各站 SOP 与已知坑 | CAP-A-11 / CAP-A-12（内置模板通道） | workflow 模块 Vitest 47 用例全绿（upsert 断言覆盖 6 模板）+ server tsc 零错 + 本地 dev.db 落库核对 6 行 | 无（复用既有能力与文法，未动 API 契约） |

### 测试链路提速与 Worktree 环境治理（chore/test-gate-speedup，2026-09-18）

> 动因：仓库与 pnpm store 同处 `E:` SATA HDD（实测冷文件打开 55–85 ms/个，D: NVMe 为 0.17 ms），叠加 PR 门禁全量无增量、worktree 依赖策略缺失，导致「本地改完跑不动、PR 前必须全量、每棵新树环境装不上」。本批为**开发链路治理**，不改任何产品行为与对外契约。**Vitest 版本统一由独立切片负责，不在本条范围内。**

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| 工具链 | **PR 增量门禁**：新增 `scripts/gate.mjs`（按 frontend/server/cli/shared/contract/docs 分桶；`apps/server/src/modules/<m>/**` 改动映射到同名 e2e 套件；命中构建面 `package.json`/`pnpm-lock.yaml`/`pnpm-workspace.yaml`/`turbo.json`/`tsconfig*/scripts/` 或映射不确定时**一律回退全量**），根脚本新增 `gate:quick`（增量）与 `gate:full`（= 原 `quality:gate`，口径未动） | — | 脚本 `--dry`（打印执行计划）与 `--e2e-specs`（供 CI 取套件名）两种只读模式已本机实跑验证；`--dry` 在当前树（lock/workspace 有改动）正确回退全量。**端到端 `pnpm gate:quick` 未实跑** | — |
| CI | **`quality-gate.yml` 改增量**：新增 `changes` 分类器 job（`fetch-depth: 0`，输出 full/sources/frontend/server/workspace/contract/docs）；各 job 加 `needs` + `if` 闸门；前端/后端单测非全量时走 `vitest run --changed origin/<base>`；`e2e-backend` 在 PR 上只跑受影响套件。**合并到 `pre-prod`/`main` 的 PR 强制全量**；工具链改动同样强制全量。已逐项比对原 workflow，**检查项零删减** | — | 声明式 workflow，**未在 GitHub 实跑**（推送后由真实 PR 验证）；分类逻辑与 `gate.mjs` 同口径 | — |
| CI | **`nightly-full-gate.yml` 新增**：`schedule`（UTC 19:17 = 北京 03:17）+ `workflow_dispatch`，全量跑 type-check/lint/四包单测/契约/API 覆盖率/server e2e/文档三项——**比原 PR 门禁更严**（原 PR 门禁不含 `api:audit`）。**已知缺口**：前端 Playwright e2e（117 用例）未纳入——其后端需预先启动且前端 dev server 依赖未入库的 `.env.development`，接线固化前硬写只会稳定失败 | — | 未实跑；可经 `workflow_dispatch` 手动触发验证 | — |
| CI | **补盲区**：新增 `test-workspace` job，`packages/apm-shared` 与 `apps/cli` 的单测此前在 CI 中从未被执行过 | — | 同上 | — |
| 工具链 | **worktree 依赖共享**：新增 `scripts/worktree-deps.mjs` + 根脚本 `wt:check`（只读巡检：软链状态 + 依赖声明漂移）/ `wt:link`（建 junction，Windows 无需管理员）；`.claude/settings.json` 落 `worktree.symlinkDirectories`（6 个 node_modules 目录）；`.worktreeinclude` 从 `.worktrees/c03-project-steps/` 归位到仓库根（原先放错位置从未生效）；`.worktrees/` 加入 `.gitignore`。**半装残骸识别**：pnpm 完整安装必写 `.modules.yaml`，故「有 `.pnpm/` 却无 `.modules.yaml`」判定为 linking 被中断的中间态——`check` 单列 `[半装残骸]` 告警，`link` 默认跳过，`link --clean` 才清理（破坏性，需显式开关）。**边界**：依赖声明（lock/各 package.json）与主仓逐字节一致才可共享，漂移时 `check` 告警、`link` 拒绝 | — | `check` 已本机实跑：正确识别 `.worktrees/inbox` 的半装残骸，并对 inbox 与外部 worktree 的声明漂移告警。`link`/`--clean` **未实跑**；`.worktreeinclude` 归位后新建 worktree 的带入效果未验证 | — |
| 工具链 | **迁盘脚本** `scripts/migrate-to-d.ps1`（`E:` HDD → `D:\workspace`，store → `D:\dev\pnpm-store`，两者须同卷否则 pnpm 退化为主硬链接丢失）：robocopy 整目录复制（**不用 `git clone`**——`docs/` 228 个文档与 `apps/server/.env*`/`prisma/dev.db` 等未入库），排除 `node_modules`/`.turbo`/`dist`/`target`（跨卷复制会破坏 pnpm 硬链接身份），默认干跑、`-Execute` 才真复制，**只复制不删源**，附复制后校验（HEAD / `docs/` 文件数 / 未跟踪 `.env` 与 `dev.db`）与人工修复清单 | — | PowerShell `Parser::ParseFile` 语法校验零错误；干跑预检已实跑。**`-Execute` 真实迁移未执行** | 迁移后需改的绝对路径清单见脚本输出（`apps/desktop/src-tauri/src/frontend.rs:19`、`apps/server/.env.local:5` 等） |

### 测试运行时统一 Vitest 5.0.0（chore/vitest5-catalog，2026-09-19）

> 四包（server / frontend / cli / apm-shared）测试运行时统一 **Vitest 5.0.0 经 pnpm catalog 锚定精确版本**（`vitest`/`@vitest/coverage-v8`/`@vitest/ui` 三项 specifier 均为 `5.0.0`，不带 `^`——防止后续 install 漂移到 5.0.x；版本策略裁决：**暂不追 5.0.1**）。零产品行为变更。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| 工具链 | **四包 vitest 统一挂 catalog**：server / frontend / cli / apm-shared 的 `vitest` devDependency 全部改 `catalog:` 引用，版本唯一真相源收敛到 `pnpm-workspace.yaml` catalog（精确 `5.0.0`）；`@vitest/coverage-v8`、`@vitest/ui` 同步入 catalog；lockfile 重锁后全树 `vitest@5.0.0`/`@vitest/*@5.0.0` 零漂移 | — | `pnpm install` 全绿（supply-chain 校验 2085 条通过）；lockfile grep 核对无 5.0.0 之外版本 | — |
| 工具链 | **根级测试脚本族补齐**：根 `package.json` 新增 `test`（turbo run test）/ `test:watch`（server+frontend 并行 watch）/ `test:coverage` / `test:ui` / `test:e2e`（server）——此前根级只能进子包跑测试；四包各自 `test` 脚本统一为 `vitest run` | — | 同上 | — |
| frontend | **前端 vitest 串行裁决落地**：threads 池 16 worker 下内存膨胀假死（100% CPU / 73% 内存后启动阶段卡死），forks 并行又与抢核互相放大——改 `pool: 'forks'` + `fileParallelism: false`（等价 jest --runInBand，与 server e2e 同款串行先例）；coverage `all: true` 移除（每文件全量报告无消费且拖慢） | — | 迁移后前端全量 884/885，唯一失败 design-system-page 5s 超时系机器慢非断言错 | — |
| server | **server vitest 稳定性加固**：`hookTimeout: 30_000`（防与前端并行跑时 CPU 饱和致 Nest DI 编译超默认 10s 的误报，对齐 e2e 配置先例）；pool 注释更新（threads 快 2.4 倍但 Mastra/workflow 套件 worker_threads 下非确定性挂起的实证结论） | — | 迁移后 server 全量 791 用例绿（workflow 套件 1 条环境性 flaky 单跑即过） | — |
| frontend | **design-system-page 测试超时放宽至 30s**：全量并行时机器慢，该页渲染整套组件库，5s 默认超时不够（纯机器性能问题非用例缺陷） | — | 30s 下全量绿 | — |
| frontend | **vitest 5 类型适配两处**：①`src/test/setup.ts` 手动 `expect.extend(matchers)` 改官方入口 `import '@testing-library/jest-dom/vitest'`——vitest 5 的 Assertion 与 chai 解耦，手动挂载只挂运行时不挂类型（323 个 matcher 类型错误）；②`tsconfig.app.json` types 补 `"node"`——vitest 5 不再经类型入口传递 @types/node，生产代码 `process`/`events` 引用裸奔 | — | `tsc -b --force` 重建 0 错误；frontend 137 文件 891 用例全绿 | — |
| 工具链 | **迁盘 tsbuildinfo 残留坑清偿**：migrate-to-d.ps1 排除 dist 但未排除包根 `tsconfig.tsbuildinfo`，增量缓存声称「产物最新」而 dist 实体缺失/陈旧，tsc 静默跳过 emit 甚至报幽灵错误（frontend 334 错假象）——shared 删 tsbuildinfo 重建 + frontend `tsc -b --force` 全量重建后恢复真实状态 | — | type-check 6/6 绿；`pnpm build` 4/4 绿 | — |

### Added

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | **执行前约束包·切片 1+2（批一 P0，需求重审 G4/G5 部分）**：①**依赖约束进派发门禁**——`assertDispatchGate` 后新增依赖校验（裁决 A：仅 `type='blocks'` 参与拦截；依赖达成 = 依赖工单状态 `StatusDefinition.isFinal` 终态口径，不硬编码状态名；定义缺失 fail-open 同关单守卫口径），阻断信息列出全部未完成依赖；建依赖补**环检测**（BFS 沿 dependsOn 边，自环/直环/间接环均拒绝）——「B 依赖 A 仍可先执行 B」的提示语义升级为约束语义；②**单活跃执行互斥**（裁决 B：同一 issue 已有活跃执行时拒绝新建并引导走「重新执行」血缘重试，活跃词表 `planned/in_progress/pending_approval/blocked` 与关单守卫一致，落 `createExecutionRun` 单一漏斗）。**范围说明**：执行级 cwd 难以无合入机制单独隔离（工作区根=用户真实项目目录，隔离目录会搁浅交付物——裁决 C 的后半句「成果合入另立」实锤），G5 隔离+成果合入归后续设计切片 | CAP-A-04 / CAP-B-03 / CAP-A-19 批 6 | issue/execution/cli-dispatch 三模块 spec 53 条绿（新增环检测 3 + 依赖门禁 5 + 互斥 3）；波及 spec（assistant 24 条）回归绿；type-check 0 错 | 能力清单 A-04/B-03/A-19 重审注记；测试映射矩阵 GAP-T-35 |
| frontend | **概念收拢「剧本」→「项目步骤」（批二 P1，只改文案层）**：用户可见文案统一，代码标识符/i18n 键名/API 路径/DB 值零改动——①zh-CN.json 10 处：挂载剧本→挂载项目步骤、剧本访谈→需求访谈（按裁决示例改写，避免「项目步骤访谈」拗口）、进入剧本流程→进入项目步骤等；②en.json 13 处对应值同步（Playbook→Project steps、playbook interview→intake interview，键集合不变）；③ai-surface 回放面 8 文件用户可见「剧本」按语境自然改写为「演示」口径（预置演示/回放演示/示例演示，`REPLAY_SOURCE_LABEL` 常量值同步）；④analytics 剧本健康卡→项目步骤健康（标题/空态/引导文案）；⑤grill 拷问确认与需求访谈入口文案同步；⑥组件测试断言 2 处随文案改写（analytics-page / ai-surface-replay-page） | CAP-C-03 / CAP-A-15 | 文案层改动，静态自查：残留 `grep -rn "剧本" apps/frontend/src`（排除 node_modules/测试文件）仅剩 api-types.gen.ts 生成契约镜像 11 处（禁手改）与 ai-surface 代码注释（非用户可见，登记）；本地 tsc/vitest/eslint 未跑（worktree install 环境受限），以 CI 与合并后主仓统一验证为准 | 能力清单 CAP-C-03 / CAP-A-15 卡（概念收拢裁决）；登记不改动项：server 侧 Swagger description（dashboard/playbook 模块 @ApiProperty/@ApiOperation 含「剧本」）、ai-hub assistant-silent.service.ts 工具描述——统一留待后端术语切片（playbook.registry/service 用户可见串已由主线程随本切片补刀，见下行 server 条目） |
| server | **概念收拢补刀——playbook 运行时文案「剧本」→「项目步骤」（主线程代 c03 落地）**：registry 模板名「维护型轻剧本」→「维护轻量项目步骤」、托管剧本 description→托管型项目步骤、闸门 detail/consequences 2 处；service 异常与活动消息 4 处（未知模板/未挂载/无阶段/挂载事件消息）；spec it 标题 1 处同步。纯运行时字符串零契约扰动（均不在 Swagger 注解内，openapi.json 未动、DB 值零改动） | CAP-C-03 / CAP-A-15 | 静态自查：playbook registry/service 两文件运行时字符串「剧本」残留 0（仅剩注释）；前端无对后端消息文本的测试断言（grep 验证）；本地测试未跑（worktree 环境受限），以 CI 与合并后主仓统一验证为准 | — |
| server | **问答质量基线测评集（批二 P1，裁决「只复述字段者砍，能行动者留」）**：为 AISlot 局部侵入问答建两层测评基建——①问题集 24 条（八类实体 × 字段查询/行动建议/边界探测三问法）；②三要素 rubric 评分器纯函数（能行动=行动信号词启发式 / 有依据=夹具事实子串溯源 / 守边界=信号词表+日期编造检测，三中二合格；行动题不配有依据期望使合格线收严为双维全过=裁决规则化）；③确定性层 spec 走 `card-explain` 真链路（LLM 经 AdapterRegistry 注入 mock、prisma 夹具 stub，零真实 LLM、零行为变更、不动 openapi）+ ④人工终审指引 README（端点/UI 采集步骤、评分表、终审报告模板落 `docs/roadmap/qa-bench/`）。落点 `apps/server/src/modules/ai-hub/services/qa-bench/` | CAP-C-07 | **静态自查通过（本地测试未跑——worktree 环境受限，以 CI 与合并后主仓统一验证为准）**：问题集 24 条结构校验（id 唯一、八类×三问法矩阵、期望与问法一一对应）；24 条期望子串逐一核对 ⊆ 夹具事实 JSON；8 类字段题合格样本命中矩阵核对（mustMentionAny/行动词/无编造日期）；复述型样本零行动词命中、日期编造用例与边界信号词用例核对成立；类型引用自检（非 spec 文件零 vitest 依赖，tsc build 范围安全）。**未做**：vitest 实跑、tsc/eslint 实跑、prettier --fix（提交时 CI 质量门禁兜底） | 能力清单 CAP-C-07 批二 P1 切片；终审报告落点见 qa-bench/README.md §六 |

### CAP-B-01 验收标准版本化 + CAP-B-02 审计结论绑定标准版本（feat/acceptance-criteria-revision，2026-09-18）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | **验收标准版本化（CAP-B-01）**：`AcceptanceCriteria` 新增 `revision`/`revisedAt`，实质内容（content）修订即 revision+1、status 重置 pending、passedAt 清空；`AcceptanceEvidence` 新增 `criteriaRevision` 创建时快照（存量 null 按 1 处理），证据有效性判定 `isEvidenceCurrent` 单一口径；接收聚合校验（accept-completion）新增 criteriaEvidence 门禁——每条标准至少一条同版本有效证据，修订后旧证据转「待复核」 | CAP-B-01 | `acceptance-criteria.service.spec.ts` + `acceptance.service.spec.ts` 共 10 用例；acceptance 域 Vitest 62/62 绿 | 能力清单 CAP-B-01 卡 |
| server | **审计结论绑定标准版本（CAP-B-02）**：`CompletenessAuditReport` 新增 `criteriaRevisions` 快照（审计时各标准 revision）；`evaluateAuditStaleness` 纯函数判定过期（修订/新增标准 → 过期，存量无快照不标过期）；审计门禁（audit-gate）对过期结论拦截要求重审；audit-report 接口与契约详情附带 `stale`/`staleCriteriaIds` | CAP-B-02 | `completeness-audit.service.spec.ts` 新增 8 用例（快照落库/过期判定/门禁拦截）；契约三件套 `contract:check` 零漂移 | 能力清单 CAP-B-02 卡 |
| frontend | **修订/过期可见性**：标准行显示版本号（v2 起）与「标准已修订，证据待复核」黄色徽标；审计面板与详情页显示「审计结论已过期」徽标与重审入口横幅；i18n zh-CN/en 双语键同步 | CAP-B-01 / B-02 | 前端 acceptance 模块 Vitest 绿；`tsc -b` 零错误；i18n 键一致性校验通过 | — |

### CAP-C-04 决策卡批准绑定内容指纹——实质变更后旧批准标记过期（feat/decision-approval-fingerprint，2026-09-18）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | **决策提案批准绑定内容版本（CAP-C-04，批一 P0）**：`DecisionProposal` 新增 `approvedFingerprint`（批准 accept 时对实质内容 kind/title/detail/payload/projectId/issueId 做规范化序列化后 sha256 留痕）+ migration `20260918000000_add_decision_approved_fingerprint`；`resolve` 支持可选 `expectedFingerprint` 强校验（决议者所见指纹 ≠ 当前内容指纹即 409，拒绝沿用旧印象的决议，防 TOCTOU）；`GET /decisions/proposals/:id` 与收件箱投影下发 `contentFingerprint` + `approvalStale`（accepted 且当前指纹 ≠ 批准时指纹 → true；存量无指纹行不误报） | CAP-C-04 | decision 模块 Vitest 39 用例绿（指纹规范化稳定性 13 + proposal 21 + decision 5）；契约三件套零漂移 | 能力清单 CAP-C-04 卡（批一 P0） |
| frontend | **过期批准徽标 + 决议指纹回传（CAP-C-04）**：决策卡壳 `approvalStale` 时头部渲染橙色醒目徽标「内容已变更 · 批准基于旧版本，请重新确认」（AlertTriangle + title 完整提示，双语 i18n 键 `decision.approvalStaleChip`/`decision.approvalStaleHint`）；建议类提案决议统一回传 `expectedFingerprint`（所见即所批） | CAP-C-04 | decision-card + decision 模块 Vitest 30 用例绿（含 stale 徽标渲染断言） | 能力清单 CAP-C-04 卡（批一 P0） |

### CAP-P-01 需求修订影响链路最小闭环（feat/revision-impact-chain，2026-09-18）

> 补齐 CAP-P-01 修订侧缺口：需求类文档修订 → 自动影响分析 → 「需求修订影响」决策卡供人确认 → 确认后受影响验收标准标记待复核。复用既有承载（决策收件箱 clarify 批阅流 + DocumentTaskLink 引用关系），零 migration。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | **修订影响分析服务（document 域新增 `revision-impact.service` + subscriber + controller）**：订阅 `document.updated`（事件补 `contentChanged` 标记，document.service 最小侵入一行）；需求类文档（category = requirement \| analysis）content 实质修订时，经 `DocumentTaskLink` 既有引用关系扫描关联任务与其活跃验收标准（draft/pending/in_review，passed/failed/waived 不上报不误报），生成结构化影响清单并调用 decision 模块**既有** `ProposalService.create` 生成决策卡（kind=clarify：选项交互承载「标记待复核 / 知悉不处理」，收件箱原生渲染与批阅流零改动）；新增 `GET /documents/:id/revision-impact`（状态查询，读取即幂等收敛确认后动作）与 `POST /documents/:id/revision-impact/analyze`（手动触发）两端点入契约 | CAP-P-01 | `revision-impact.service.spec` 18/18 绿（触发→清单→建卡→确认→置 pending 全链 + 边界：非需求类/无关联/全非活跃/重复卡跳过/reject 留痕/旁路降级）；`contract:export` + `contract:generate` + `contract:check` 三件套零漂移 | 能力清单 CAP-P-01 卡（修订侧闭环） |
| server | **确认后动作（跨模块约定内直写）**：人确认（accept 选「标记待复核」）后，在本域内经 PrismaService 直写 `acceptanceCriteria.updateMany({ where: { id: { in: [...] }, status: { in: [draft, in_review] } }, data: { status: 'pending' } })`——只拉回活跃态标准，已 passed/failed/waived 不回退；**已知余留**：直改不触发标准版本化机制（B-01 分支实现），两级传播完整性待后续切片统一 | CAP-P-01 | 单测断言 updateMany 的 where/data 形状；dismiss/reject 路径断言不动标准 | 决策日志待补（clarify kind 复用裁决） |
| frontend | **文档详情修订影响提示条（最小挂点）**：`revision-impact-banner` 新组件 + view-page 一处挂载——待确认（黄，跳转决策收件箱）/已确认（绿，N 条已标记待复核）/已不处理（中性弱提示）三态；决策卡本体 UI 零改动；i18n `document.revisionImpact` 双语键齐备 | CAP-P-01 | frontend `tsc -b` 零错误 | — |

### CAP-C-01 assistant 领域 hook 归还各域——会话壳只留会话与静默协议（feat/assistant-hook-return，2026-09-18）

> 纯架构整理、零行为变更：`modules/assistant/hooks/` 曾承载属其他域的语义 hook（god module 风险），本次按「消费方所在域」归还，assistant 仅保留会话壳与静默协议。全部改动为文件移动（git mv 保历史）+ import 路径更新，hook 逻辑零改动，无 facade 转发文件。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **领域 hook 归还（5 个）**：`use-workflow-draft` → `modules/workflow/hooks/`（workflow 域）；`use-grill`（含测试）→ `modules/project/hooks/`（grill 组件消费方所在域）；`use-interview-dynamic` / `use-interview-prefill` / `use-intake-composite` → `modules/project/hooks/`（playbook 组件与 playbook 页消费方所在域；前端无独立 playbook 目录，按消费方所在域判定，与既有 `use-playbook.ts` 同域聚合）。**留存 assistant（6 个）**：会话壳 `use-assistant-chat` / `use-assistant-session`、执行桥 `use-assistant-dispatch`、状态推导 `use-assistant-status`、静默协议 `use-silent-ai` / `use-anchor-qa`。消费方 8 文件 import 同步更新 | CAP-C-01 | 受影响模块 vitest 21 文件 101 用例全绿（project/assistant hooks + grill/playbook 组件 + intake 回归 14 文件 57 用例；workflow + create-dialog 消费方 7 文件 44 用例）；`tsc -b` 零错误；涉事文件 eslint 零告警 | — |
### CAP-B-06 ContextPack freshness 按数据源实龄计算——不可信即诚实降级（feat/context-freshness-honesty，2026-09-18）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | **上下文时效性诚实化（批二 P1）**：`context.service.ts` 的 `buildContextPack` 曾恒写 `freshness: 'realtime'`（与数据实际年龄无关，用户与 AI 均会误判上下文为当前）。改为按各层数据源实际更新时间（`updatedAt`/`timestamp` 既有字段）与判定时刻的差值映射档位，词表 `fresh \| recent \| stale \| unknown`（<1h fresh、<24h recent、更旧 stale；阈值可经 `CONTEXT_FRESH_MAX_AGE_MS`/`CONTEXT_RECENT_MAX_AGE_MS` 覆盖）；层基准 = 层内数据源最新更新时间（system=project、project=max(工单,活动)、session=max(会话,最新消息)、runtime=workspace）；无可信时间戳（空层/源不存在/非法日期/超容差未来时间戳）一律 `unknown`，绝不回落 realtime。透出 `layerFreshness`（每层档位）+ `freshness`（整体最低档，存在 unknown 层时整体上限压到 recent）+ `freshnessCheckedAt`。旧词表 `realtime` 经 `normalizeContextFreshness` 映射为 `fresh` 仅供读取兼容，输出不再出现。零 migration（freshness 为响应字段，无 DB 列无 REST 契约约束）；该服务已 deprecated 且当前无 REST 出口（openapi 无 context/pack 端点），响应 shape 追加字段不破坏既有键 | CAP-B-06 | context 模块 Vitest 22/22 绿（纯函数实龄映射/阈值边界/诚实降级 16 条 + buildContextPack 分层透出/整体聚合/全 unknown 不谎报 6 条，时钟注入）；`tsc -p tsconfig.build.json --noEmit` 零错误；改动域 eslint 零错误；server 全量 791 用例仅 workflow 套件 1 条并发池环境性 flaky（单跑 9/9 过，与本改动无 import 关联） | 能力清单 CAP-B-06 卡；余留：ai-hub `ContextBuilderService`（当前主路径）不输出 freshness 字段，后续随 deprecated 服务并仓统一补齐；前端 ContextPreviewDialog 依赖的 `/_api/context/snapshot` 端点后端尚不存在（孤儿前端），freshness 展示位待该端点落地时一并接入 |

### CAP-K-03 交付成果清单——发布交付了什么/在哪拿/怎么验证/限制/接收人（feat/release-deliverables，2026-09-18）

> 批二 P1 切片：发布 ≠ 部署——`released` 终态后用户拿不到「这个版本交付了什么、在哪拿、怎么验证可用、有什么限制、由谁接收」的信号。本切片给 Release 补交付成果清单承载；**边界**：不自建部署平台，部署状态仍从外部 CI/CD 回流；非部署类项目可留空清单不强行加步骤。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | **Release 交付成果清单承载**：schema `Release` 新增 `deliverables Json?`（单字段承载 `{ items: [{name, location, howToVerify, limitations?, receiver?}], updatedBy, updatedAt }`，不建子表避免发布实体膨胀）+ migration；`ReleaseDto` 下发 `deliverables`（查看随详情端点免费获得）；新增 `PUT /releases/:id/deliverables` 全量替换端点（任意状态可改，released 后仍可补录交付信息；记录操作人 updatedBy/updatedAt）；`assertDeliverableItems` 必填口径服务层兜底（name/location/howToVerify trim 非空；limitations/receiver 可选；空数组=清空合法）+ DTO `@ValidateNested` 管道校验双保险 | CAP-K-03 | `release-deliverables.spec` 7 用例绿（必填口径 4 + 存取 roundtrip/全量替换与操作人/404 与兜底不落库 3）；release 域 31 用例回归绿；契约三件套 `contract:export`/`generate`/`check` 零漂移（openapi +186 行纯新增，双端 api-types.gen.ts 同步 +105 行） | 能力清单 CAP-K-03 卡（交付成果清单切片） |
| frontend | **交付成果清单卡片**：release 详情页新增 `ReleaseDeliverablesCard`（展示态：名称/在哪拿/怎么验证/限制/接收人逐项卡片；编辑态：行级增删改 + 客户端必填先行提示与服务端同口径，保存走 PUT 全量替换）；`useUpdateDeliverables` hook + `releaseApi.updateDeliverables`；i18n `release.deliverables` 双语 12 键齐备（zh-CN/en 键集合一致） | CAP-K-03 | `release-pages.test` 8 用例绿（新增清单五字段渲染 + 空态 2 条）；frontend `tsc -b` 零错误 | — |

### CAP-B-07 信任从抽象评分改为可理解的三级分级授权（feat/trust-tiered-delegation，2026-09-18）

> 批二 P1 切片（PRD §12 原则 4「渐进放权」）：非专业用户需要的是可理解的分级授权，不是抽象分数。三级口径 **1=观察者 / 2=协助者 / 3=受托者**，复用既有 `trustLevel` Int 列（零 schema/migration/DTO 变更）；等级名/图标/放权清单文案由前端静态映射（i18n），server 只下发数值等级。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | **`scoreToLevel` 三级映射**：阈值由 `>=90=3 / >=70=2 / 其余=1` 改为 **<40=1（观察者）/ 40–69=2（协助者）/ >=70=3（受托者）**；值域恒为 1-3 整数，存量数据无需迁移（旧 L2/L3 档语义向前归并）。`trustScore` 内部计算与 Member 列同步逻辑全部保留（内部数据，留给未来门禁联动）；acceptance/execution/cli-dispatch 授权判断零改动 | CAP-B-07 | 静态自查：spec 断言已同步三级口径（新增 <40 观察者边界用例；58→协助者/70→受托者/100→受托者断言更新；初始档案 trustLevel 与 50 分映射一致性修正），改动仅 trust.service.ts + spec 两文件、无其他 import 依赖。本地测试未跑（worktree 环境受限），以 CI 与合并后主仓统一验证为准 | 能力清单 CAP-B-07 卡；后续切片登记：自动升降级引擎（执行评估驱动）/ 门禁联动（acceptance/execution/cli-dispatch 授权按等级生效） |
| frontend | **三级等级卡 + 撤下分数**：信任管理面板改三级卡片形态（观察者/协助者/受托者各卡：图标 + 等级名 + 一句话定位 + 「该等级 AI 可自动做什么」放权清单；红线说明条：发布/删除/花钱/成员与权限变更任何等级永远须人确认——静态展示，无门禁联动）；「调整信任」入口改为选等级 Dialog（写 `Member.trustLevel`，零门禁联动）；`TrustLevelBadge` 改三级语义色与图标（Eye/Shield/ShieldCheck）、撤下 `score` prop 与数字显示（兼容旧 0-4 存量归一：0/越界→未评估、4→受托者）；成员列表/成员卡 popover/办公室同事卡徽标撤分数；成员详情页与创建对话框信任选项三级化；route-preview 成员预览、决策卡指派行、AI 管理卡（`TrustLevelCard` 撤 75% 进度条）分数全部撤下，按 `trustLevelFromScore`（与 server 阈值对齐）折算等级展示；`MEMBER_TRUST_LEVEL_LABELS`（L0-L4）退役为 `MEMBER_TRUST_TIERS`；i18n `trust.*` 双语 29 键齐备；ai-surface 演示舱「信度」表盘为独立口径不在本切片范围 | CAP-B-07 | 静态自查：全仓 grep 确认 `MEMBER_TRUST_LEVEL_LABELS` 零残留、UI 层 trustScore 数字仅剩 ai-surface 演示口径（登记余留）；zh-CN/en 两 locale JSON 合法且键集合一致（3990 键逐键 diff 为空）；被删徽标 `score` prop 的 3 个调用点全部同步；@deprecated ai-management-page.tsx（路由已摘除）未动。本地测试未跑（worktree 环境受限），以 CI 与合并后主仓统一验证为准；openapi.json 未动（零契约扰动） | — |

### Fixed

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **delivery 页路由补 DEV 门禁（需求重审 R5）**：mock 还原页（`data-mock`，自述 DEV ONLY）原在 `router.tsx` 无条件注册，生产构建可直达 `/app/delivery`，违反 frontend AGENTS.md §6.7 dev-only 页面规范（侧栏入口此前已 DEV 门禁，本次补齐路由侧） | 需求重审 R5 | tsc -b 0 错 + eslint 0 + pipeline-stages 回归 4 条绿 | 需求重审总纲 §八-5 裁决落地；能力清单重审注记 |
| server | **验收证据守卫口径修复（需求重审 G2 / CAP-B-08 批一先行）**：`github-evidence.subscriber` 的 PR 事件守卫曾用旧状态名 `accepted/abandoned`，对 schema 现词表（`draft\|pending\|in_review\|passed\|failed\|waived`）永不命中——已裁决（终态 `passed/failed/waived`）验收的 `completionEvidence` 仍被迟到的 merged/closed 事件改写（「通过后证据被改写」，可信度硬伤）。守卫改为终态集合拦截，活跃三态不误伤 | CAP-B-08 | subscriber 单测 15 条绿（含终态三元组拦截回归 + 活跃态不误伤各 3 条）；type-check（build 配置）0 错 | 能力清单 CAP-B-08 重审注记；测试映射矩阵 GAP-T-34 |

## [0.7.0] - 2026-09-17

### v0.7.0 发版总览——AI 表面实时化 + 统一创建面板双界面 + 执行侧兜底闭环 + 决策卡实体手卡

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend · server | **AI 表面实时化六切片（CAP-C-08）**：事件链三层收口（单源注册表+面级投影+治理族转发）→ 工位卡/泳道/待办全接真数据 → 顶栏叙述层（模型只翻译不算数）→ 代理态就地收敛（看到卡住→就地问→就地拍板）→ 回放演示（剧本快照驱动，决策卡只读预览语义）→ 实况演示次序收口 | CAP-C-08 | 各切片 Vitest 全绿；事件名单源治理脚本化 | 能力清单 CAP-C-08 卡 |
| frontend | **统一创建面板双界面（CAP-A-18 七批）**：手动 × AI 代理平级切换 + Linear 沉浸流式 + 模式穿梭 + AI 在场感知 + 实体模板（task/bug/doc/project）+ i18n 全量清偿 + GAP-T-32 面板回归清偿；面板迁位 shared 收编 property-panel 原子 | CAP-A-18 | create-dialog 回归 9 条 + create-draft 后端 3 条 + 页面测试全绿 | 能力清单 CAP-A-18 卡（done 候实机验收） |
| server · frontend | **执行侧兜底改造（CAP-A-19 四批+批 5）**：失败感知通知 + 悬挂对账 watchdog（TTL/阈值 env 可配）+ 验收标准供给侧（AI 代写→人确认→派发门禁阻断）+ 一致性清理 + **失败执行重试语义升级**（`POST /ai/execution-runs/:id/retry` 克隆新建执行 + `retryOfId` 血缘，失败现场留痕不丢） | CAP-A-19 | cli-dispatch e2e 7/7（含 retry 3 用例）+ 8 套件 75 用例 + 49 前端用例绿；契约三件套同步 | 能力清单 CAP-A-19 卡 + 方案文档 |
| frontend | **快捷键体系（CAP-A-17）**：全局键位注册表单一真相源 + 设置页录制自定义 + 冲突检测 + 四处散落监听收编 + help 假键清除 | CAP-A-17 | hotkey-utils 12 条 + store 8 条 + shortcuts-section 6 条 | 测试映射矩阵 GAP-T-31 清偿 |
| frontend | **决策卡片实体手卡**：实体质感重构 + 3D 翻面/卡片堆叠/滑走动效 + 全屏悬浮卡片堆批阅模式 + 排版禁折行修复 | 决策卡文法 | 全量 Vitest 绿（含批阅回归） | 决策卡片系统册 |
| frontend | **文档详情面**：frontmatter 属性面板 Obsidian 化重建（行内编辑/属性增删/标签双向镜像，绕过 gray-matter 4.0.3 状态 bug）+ Chapter Scrubber 正文左缘刻度导航 + 目录客户端同源提取修复恒空 | CAP-A-06 增强 | mdx-frontmatter +10 条 / tag-mirror 5 条 / properties-panel 9 条 | GAP-T-33 清偿 |
| frontend | **导航与类型管理**：研发生命周期九站改六站 + 管道项目聚焦联动（CAP-A-15）+ 类型管理面重设计与内置类型落地（CAP-A-04）+ 驱动型发版三期（CAP-K-03 Release 升级交付执行器）+ 证据回流二期收口（CAP-B-08） | CAP-A-15 / A-04 / K-03 / B-08 | 各批次门禁全绿 | 能力清单各卡 |
| frontend | **UI 基建三件**：颜色/头像选择器自建收编（ColorPicker 新建 + AvatarPickerField Popover 化 + 消费方全替换）+ 空态三分场景系统（EmptyState page/card + 13 页落地）+ reui Stepper/Sortable/IconStack 导入 | UI 组件基建 | 治理脚本全绿 + 相关单测绿 | COMPONENTS.md 各行 |
| desktop | 桌面壳（CAP-A-14）v0.6.1/v0.6.2 已随后单独发版（Electron 正式路径 ADR-014），本版归档其 CHANGELOG 账目 | CAP-A-14 | CI 三轮打包验证 | ADR-014 |

### CAP-C-08 AI 表面 S1：事件链三层收口 + 设计契约换血（feat/ai-surface-realtime，2026-09-14）

> 真实瓶颈勘定（本卡最重的一条发现）：**前端白名单不是瓶颈，WS 网关才是**。`gateways/events.gateway.ts` 此前只转发 8 族事件（`ai.stream` / `ai.workflow.update` / `task.*` / `project.*` / `notification.*` / `runtime.dispatch.changed` / `linear.*`），`execution.*` / `approval.*` / `acceptance.*` / `release.*` **一条都没出网关**——故「加白名单即可开会话」的方案会得到静默失效的订阅。已在网关注释就地澄清，避免后人重犯。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| shared · server | **领域事件单源收口（S1-a）**：双镜像补 execution / approval / acceptance / release / runtime 族事件常量与 zod payload schema（`execution.run.created/updated`、`execution.completed`、`execution.step.created/updated`、`approval.request.created` / `approval.resolved` / `approval.cancelled`、`acceptance.created/resolved/deleted`、`release.created/approved`、runtime 族 8 条、`ai.workflow.update`）；`RuntimeHeartbeatEventPayload` 与 `runtime/protocol.ts` 的**同名不同物**（广播体 vs 请求体）加注释澄清并改以 `EventPayload` 后缀区分；`execution.step.updated` 双发布方字段不一致的就地标注 | CAP-C-08（GAP-T-26） | `check:cli-contract` → 「领域事件名镜像一致（52 个）」（改动前 22）；apm-shared + server `type-check` 零错误 | — |
| server | **WS 网关补治理族转发（S1-g）**：新增 `governanceEvents` 转发块（14 个治理事件），并把 Terminal 废案注释块升级为**事实澄清**（`terminal.output` 全仓 0 发布方——幽灵通道，非「待退役」）。已核验 14 事件**均有真实发布方**（`acceptance.service` / `cli-executor.service` / `approval.service` / `execution.service`），非转发空气 | CAP-C-08 | 无 spec 对 `DomainEventTypes` 做计数断言（已核，加键不破测） | ⚠️ **已知边界**：本转发为全局广播、未按 `project:${id}` 房间定向，审批（`requestedAction`/`reason`）与执行步骤细节对所有已认证 WS 客户端可见；与同文件 `task.updated`/`project.updated` 现存口径一致、与 `linear.*` 的房间定向模式不一致。**S2 收口**（房间定向需配套前端 join 与「全部项目」全局房间约定，见待办） |
| frontend | **EventClient 白名单从单源派生 + 重连补订（S1-b）**：`SUBSCRIBED_EVENT_TYPES` 改为完全由 `DomainEventTypes` 派生（消灭硬编码 `'ai.workflow.update'` / `'linear.*'` / `'runtime.dispatch.changed'` 造成的契约漂移）；`subscribe` 发送**移入每次 `connect` 回调**——socket.io 重连不保留服务端房间，原实现只在首次 `connect()` emit 一次，**重连后将静默收不到任何推送**（真实缺陷）；新增 `joinedProjects` 集合并于连接时重放、`disconnect` 清理 | CAP-C-08 | 前端 `type-check` 零错误 | — |
| frontend | **面级投影层 `use-surface-feed`（S1-c）**：领域事件 → `SurfaceFeedItem` 归一化纯函数（可单测）+ zustand 环形缓冲（容量 200）+ 按 `kind:subjectId` 的乱序水位线（**迟到事件丢弃但 `staleDropped` 计数可见，不静默**）+ 心跳单账（`runtimeHeartbeat`，不进 feed）；聚合通道 `runtime.dispatch.changed` 按 `source` 拆包还原溯源事件名。**诚实粒度**：有意只消费 `runtime.execution.event` 作逐事件进展行，**不承诺实时日志尾巴**（粒度天花板=事件级，设计纪要 §4.6 结论 2） | CAP-C-08 | `use-surface-feed.test.tsx` **11 条**：五族归一化 / 步骤双发布方形状防御 / 缺字段不推算（无 summary 不造 `dataText`）/ 心跳与包装通道不进 feed / 同 id 去重 / 迟到丢弃计数 / 环形封顶 / reset 清水位 / **两选择器引用稳定性回归守卫**（zustand v5 `Object.is`：选择器返回新引用＝无限重渲染，`filter` 移入 `useMemo`、对象用 `useShallow`） | ⚠️ **落点偏离**：能力卡规划的落点为 `infrastructure/store` + `infrastructure/hooks/use-event-subscription`，实际落在 `modules/ai-surface/hooks/use-surface-feed.ts`——现只此一个消费方，按 YAGNI 不过早抽象为 infra；若 office 等出现第二消费方再上提（已登记待办） |
| frontend | **ai-surface 设计契约换血（S1-d）**：`modules/ai-surface/**` **712 处**内联裸色字面量清零（构成：7 个组件 666 + 页面 21 + 装饰件 25）→ 语义 token；**删除 2 个纯装饰件**（`living-nebula-background.tsx` 极光呼吸光斑 + `luminous-synapse-overlay.tsx` 突触光纤虚线，二者零信息量，`git rm`）；26 处 `boxShadow` 去发光 / 厚重投影降 `shadow-xs`（DESIGN.md §3.2「取消厚重投影」）；**页面清零伪造行为**——`setTimeout(...900)` 伪造 AI 回复（「已调用模型…全局依赖图遍历」）与 `overallScore` 每次发送自增 0.3 均删除，改为接入既有 `useDispatchAssistantMessage` 真实派发桥 + 项目聚焦作用域，并加**「示例数据」诚实徽标**（数据未接真前不冒充实时）；**同轮清掉第二类逃逸 34 处**（`text-white` 15 / `bg-white` 5 / `border-white` 5 / `shadow-sm|md|xl` 9，分布 6 文件）——其中 `bg-white` 做激活 Tab 底是**真缺陷**：明眸主题 `--background` 即纯白，激活胶囊与背景同色 → **选中态隐形**（`central-watch-dial` / `project-vitality-canvas` 改走 `--muted`，并顺带消掉两臂一粗一细的既有不对称）；`border-white/N` → `border-foreground/N`（dark 视觉等价、light 得同权重细线）；彩色填充上的 `text-white` → `text-primary-foreground`（随主题翻转）；中性微叠层上的 `text-white` 与 `hover:bg-white/N` → `--foreground` 系（用 primary-foreground 会两主题都隐形）；超规格阴影一律归 `shadow-xs` | CAP-C-08 | `ai-surface-page.test.tsx` 4 条（渲染 / 发送回显 / **派发走真实执行桥且不伪造回复** / 示例数据标记可见）；无组件独立测试，其余六脚本治理门禁全绿；全量前端 **99 文件 / 517 用例**通过、`pnpm run lint` 全链（含 palette 三规则）零告警、`type-check` 零错误 | 设计纪要 §4.4（家底数字与色相规则，见下条待办） |
| frontend | **门禁收口：`check-palette` 补内联裸色扫描（S1-e）**：原生色板类扫描只管 `className`，颜色可经 `style={{ color: '#8B5CF6' }}` 绕过——ai-surface 原型 712 处裸色正是从这道缺口漏过门禁（走 `pnpm lint` → `quality:gate` → CI，非孤立脚本）。**窄范围起步**：仅对 `modules/ai-surface/**` 强制，`hsl(var(--token))` 非字面量天然放行；全仓宽扫待白名单机制（`page-registry` 导航色 / design-system 展示页属设计上可解释用例）。**同日二轮再扩两条**：① 无编号中性裸色类 `bg|text|border|fill|stroke-(white|black)`——`RAW_PALETTE` 只匹配带编号色板，`white`/`black` 无编号故整体绕过（且其危害不是「硬编码」而是**明眸主题下与 `--background` 同色 → 选中态隐形**）；② 超规格阴影类 `shadow-(sm|md|lg|xl|2xl|inner)`（DESIGN.md §3.2：全系统唯一阴影为 `shadow-xs`，悬浮层亦不例外）。两条均窄范围同 `ai-surface` 起步 | CAP-C-08 | 异常流实测：扩展后门禁报 **666 处**并阻断（= 712 − 页面 21 − 已删装饰 25），即页面已清零、清单精确指向剩余 7 组件；**二轮三规则口径下报 34 处**（6 文件，与手工 grep 逐条对账一致）并阻断，清理后全绿——两轮合计验证「先扩门禁、再按清单清零」而不是事后补测 | — |
| docs/口径 | **⭐ 靛蓝族归宿裁决（[SHOULD] 级设计偏离，须显式记录）**：原型大量使用靛蓝 `#6366F1` / `#4F46E5` / `#4338CA`，而**本仓设计系统里没有靛蓝**——DESIGN.md §2.3 定义的是五色域低饱和灰调（216 冷灰蓝 / 156 薄荷绿 / 38 暖灰琥珀 / 358 灰粉砖红 / 265 烟熏紫），`--primary` 则是 Linear 中性基线（light `240 5.9% 10%` 近黑 / dark `0 0% 98%` 近白）。故靛蓝**必须按语义角色收敛进系统内色相，且必然伴随色相位移**（换血的固有代价）。规则：AI 身份/Agent/思考链/工具调用 → `--accent-purple`；常规交互/主按钮态/操作链接/进行中 → `--accent-blue`；紫→靛渐变（`#8B5CF6 → #6366F1`）两端**同归** `--accent-purple` 且渐变塌缩为纯色（DESIGN.md 要求 AI 标识无渐变）；**禁止**改判 `--primary`（会把 AI 品牌色静默变近黑/近白，既丢色相又错语义） | CAP-C-08 | 逐文件复核 7 组件无 `--primary` 色相残留（仅保留 `--primary-foreground` 这类对比色 token） | ⚠️ 备忘 §4.4 第 5 条 + `决策日志.md` ADR-017 **待补**：本会话被工作树隔离，`docs/` 下除 `roadmap/` 外均为主检出未跟踪本地文件、工作树无副本，Edit 拒绝跨工作树写入——须回主检出登记（见待办） |

### CAP-C-08 AI 表面 S2：盯盘接真（feat/ai-surface-realtime，2026-09-14）

> 验收口径（设计纪要 §5）：①注入真实执行，盯盘秒级反映 ②WS 断开有明确离线态、重连后快照对齐 ③乱序旧事件不覆盖新状态。
> **诚实边界（§4.7，贯穿本切片）**：不改双表面架构 / 不造第二套数据口径（一切数据经 office·executions·decision 既有服务）/ 不开第二个拍板入口 / 不直写档案 / **不伪造**（无数据就显示无数据，降级就标注降级）。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **面级订阅接线 + 断线离线态 + 重连快照对齐（S2-a）**：①**页面此前从未挂载** `useSurfaceFeedSubscription()`——S1-c 建成的投影层「已建成却收不到任何推送」，S1 的接线只到组件层、缺页面级挂载，此为接真的第一处真实断点；②页头写死的 `ACTIVE` 徽标（纯装饰，**断线也照样绿**）→ 新增 `SurfaceLiveness`，只报三个真实事实：`connected` / `staleDropped` / `lastEventAt`，**刻意不做**三件事——不显示「延迟 N ms」（无 RTT 口径）、不报事件速率（事件级粒度下没有分母）、不把丢弃条数渲染成百分比；③断开时**不**显示新鲜度（「最后一次事件很新」会被读成「现在是活的」，属误导）；④重连触发一次 `invalidateQueries()` 全量重取——断线期间发生的事只存在于事件流、快照仍是旧的，避免界面「半新半旧却不自知」 | CAP-C-08（GAP-T-26） | `surface-liveness.test.tsx` **4 条**（未连接显式报断开且精确匹配下「实时」不命中 / 已连接报实时+最近事件 / 乱序丢弃计数可见 / 断开不给新鲜度）+ `ai-surface-page.test.tsx` 重写 **7 条**（含挂载订阅断言、未连接离线态、**重连 spy `invalidateQueries` 恰调用一次**）；页面测试为此预置 `QueryClientProvider` + 可控 listener registry 的 event-client 替身（否则 jsdom 里会起真 socket） | — |
| frontend | **工位卡接真（S2-b）**：新增纯适配器 `modules/ai-surface/adapters/office-to-station.ts`（office 口径 + 投影层进展 → 工位视图模型），把工位卡从**自造口径**换成既有服务。**清零的伪造**：①`AgentPersona` 自造档位——`status: reasoning/executing/auditing` 服务端**不存在**这三个值，`statusText`/`recentThought`/`specialties`/`tokensUsed`/装饰符头像（✦◈⚡🛡）全是硬编码表演；②`LEFT_CARDS_DATA` **4 个槽位内嵌假人兜底**——同事不足 4 个时把写死的「Aria/DaVinci/Nexus/Sentinel」补上来，改为「没有同事就没有卡片」（几何与走线保留，无同事时不画通向空位的线）。**换上的真实字段**：`displayName`/`title`/`status`(OfficeStatus 四值，状态点复用 `assistant-status-dot` 的 `STATE_DOT` 单一来源)/`blocking`/`advisory`/`trustScore`(**缺则显示 `—`，不落回写死的 98.2**)/`capacity.weeklyTokens·weeklyCostUsd`(标签写明「本周」)/`budgetUsagePct`(仅项目域返回，无则不写)/`currentRun.taskTitle ?? goal`(与 ColleagueCard 同规则)/`currentRun.status`(原样透传，不美化)。**进展接真**：按 `executionRun.id` **精确匹配**投影层事件，优先级「运行时原话（`runtime.execution.event` 的 `summary`）> 步骤事件（`sequence`+`stepLabel`+`status`）」，事件名挂在 hover 上供溯源；无事件则明说**「已派发，暂无进展事件」**。**刻意不渲染**：第几步 / 已耗时 / 卡了——三者服务端均**无字段**。**三态显式区分** `loading`/`error`/`ready+空`（一律渲染空版面会把「读失败」误读成「团队没人」）。徽标射程同步收窄：全局「示例数据」→「**部分区域示例**」（工位卡已接真，笼统徽标即对已接真区域的失实） | CAP-C-08（GAP-T-26） | `office-to-station.test.ts` **14 条**（真实字段透传 / **缺分不兜底** / 标签退化规则 / 状态不美化 / 无执行则双 null / 进展优先级与最新优先 / **按 subjectId 精确匹配不串台** / 无事件返回 null / 预算只透传不推算 / 空列表）；`ai-surface-page.test.tsx` 增至 **12 条**（真实同事上卡、**运行时事件落到对应工位卡**、缺分显示 `—`、无同事不补假人、**读取中/读失败与"真的没人"三态可分**）；全量前端 **101 文件 / 542 用例**通过（较 S1 净增 2 文件 25 例），`check-palette` 三规则 + `eslint --max-warnings=0` + `tsc --noEmit` 全零告警 | — |
| frontend | **六站管道泳道接真（S2-c）**：新增 `modules/ai-surface/hooks/use-pipeline-lanes.ts`（纯函数 `derivePipelineLanes` + `usePipelineLanes`）与 `components/pipeline-lane-strip.tsx`，把页面中部换成**以六站为轴的全局态势区**。**站清单不另起**：顺序/路由/标签一律从 `PIPELINE_STAGES`（CAP-A-15 唯一定义源）派生——该文件头明确「实验位（ai-surface）不得入列」，故本模块只**消费**管道、不往里加站点。**计数逐一取自各站既有服务**（不新增端点、不改服务端）：01 `GET /documents/stats` 的 `byCategory.requirement + analysis`（**新增 `useDocumentStats`**——`useDocuments` 丢弃了分页信封的 `meta`，真实总数只能由此端点取得，**不靠调大 pageSize 数数组**）/ 02 `GET /issues/all` 的 `meta.total` / 03 `GET /git/repos` 数组长度（无分页即全量）/ 04 `GET /execution/runs` 的 `total` / 05 `GET /acceptance` 的 `meta.total` / 06 `GET /releases` 数组长度。取数一律 **`pageSize: 1` 只要真值**（传 1 行 vs 传上千行）。**诚实粒度三律**：①`count: null`（无口径/未取到）渲染 **`—`**，与真实 `0` **可分**——把未知渲染成 0 会让「查不到」读成「一条都没有」；②`blocked: null` 时**必须**给出原因（`blockedNote`）而非静默留白，留白会被读成「无阻塞」；③**不推算**——只取服务端已算好的 total/byCategory 或无分页数组长度，绝不由页面长度、状态分布反推总量。**逐站阻塞口径如实分档**：仅 04（`status === 'blocked'`）与 06（`gateResult.passed === false`，**未跑门禁 ≠ 门禁失败**，`null`/缺字段不计入）有；01/02/03/05 因 Document/Repository 无阻塞字段、`blockedBy` 仅在 Issue 详情 DTO、验收列表只返回当前页，一律显示 **`阻塞 —`** 并把原因挂 hover。04 带 100 条列表窗口：**窗口未覆盖全量时阻塞数标注「列表窗口内（N/M）」不冒充全量**（窗口覆盖全部时才不给标注）。每格 hover 均带 `计数来源 <端点>` 供「你这数字哪来的」追问。**删除**：表盘上方那块**全编造**的遥测 HUD（`AUTONOMOUS RUNNING` / `142.6 t/s` / `18ms 突触延迟` / `4/4 智能体神经网络同频` / `5/5 记忆星云`——服务端一条都对不上却长得像实时遥测），真数据进来假数据必须走；站清单以 `?project` 联动跳转（沿用 CAP-A-15 口径） | CAP-C-08（GAP-T-26） | 新增 `use-pipeline-lanes.test.ts` **12 条**（站序/路由/标签逐一等于 `PIPELINE_STAGES` / 每站带溯源来源 / 全未就绪时 `count` 为 null / 真实零保持 0 且与 null 不混 / 四站 `blocked === null` **且必有 `blockedNote`** / 01 只加 requirement+analysis / 02·05 透传 total / 03 数组长度 / 04 窗口全覆盖无标注 vs 窗口未覆盖含 `3/500` / 06 只计 `passed === false`）+ 新增 `pipeline-lane-strip.test.tsx` **11 条**（六站齐出逐站来自唯一定义源 / 真值上屏 / 未就绪渲染 `—` 不冒充 0 / 服务端为零写 0 且无破折号 / 四站「阻塞 —」带原因 / 有口径给数字且来源可溯源 / 窗口标注不冒充全量 / 取数失败如实报 / 点击跳该站 / 项目聚焦带 `?project`）；`ai-surface-page.test.tsx` 增至 **14 条**（泳道改为验**挂载**——它自己要打 6 个端点而 MSW 仅覆盖 issues/repos，其余 4 个会真发网络，故**分层**：页面测试管接线、泳道测试用受控替身管数据；保留「编造 HUD 已删除」钉子）；全量前端 **103 文件 / 568 用例**通过（较 S2-b 净增 2 文件 26 例，`--reporter` 无 MSW 未处理请求告警），`tsc --noEmit` + `eslint --max-warnings=0` + `check-palette` 三规则全零 | — |
| server · frontend | ✅ **既有缺陷已收口（S2-d 前置）：`release` 类提案误路由**——原登记为「未修，留人审」，本切片**先取证再动手**，把裁决依据钉在代码上：①`ProposalService.apply()` 已有 `case 'release'` 分支；②`ReleaseService.createApprovalProposal` 确实投递 `kind: 'release'`（载荷 `{ releaseId, version, scopeCount, gateResult }`）；③存在专用 applier `applyRelease`。即**服务端语义早已完整**，缺的只是前端与 DTO 的**取值域**——属**对齐缺口**而非新增语义，故补键不构成「静默覆盖决策语义」（这正是原登记要求先裁决的那个问题，现由证据回答）。修法收口到**唯一来源**：`decision.dto.ts` 导出 `PROPOSAL_KIND_VALUES`(8) 与 `DECISION_KIND_VALUES = ['approval','acceptance', ...PROPOSAL_KIND_VALUES]`(10，一并补上同样漂移的 `workflow_def`)，DTO 字段与 `@ApiQuery` 的 `kind` 一律引用该常量，`decision.service.ts` 本地字面量改为引用同源（**顺带修好 `?kind=release` 查空**）；`contract:export` + `contract:generate` 重出 openapi 与双端 gen（各 4 行）。前端 `shared/decision-card/types.ts` 的**同名漂移常量合并为唯一 `as const` 元组**并新增 `isProposalKind()`，`use-decisions.ts` 删掉本地副本改用它——根因即「同一份 kind 清单在两处各自演化」 | CAP-C-08 / CAP-B-08 | 新增 `shared/decision-card/types.test.ts` **4 条**（以本地镜像字面量守卫前后端 kind 单源：8 个提案键逐个 `isProposalKind` 为真 / approval·acceptance 为假 / `release` 在列）；新增 `decision-card-release.test.tsx` **5 条**（标题与说明取自决策记录不另造文案 / 门禁逐项如实给过与拒因 / 动作键是「Approve release」且**不**出现验收语义的 `Pass gate` 键 / 门禁未跑明说且不显示 `0 failing` / 范围未圈定说未圈定不显示 `0 issues`）；`contract:check` 零漂移 ✓ | openapi.json + 双端 `api-types.gen.ts`；`decision.action.approveRelease` 等键进双语语言包（`check:i18n-sync` 通过：en 3721 = zh-CN 3721） |
| frontend | **「该你了」待办区接真（S2-d）**：新增 `hooks/use-decision-queue.ts`（`sortDecisionQueue` + `useDecisionQueue`）与 `components/decision-queue-panel.tsx`，页面中部态势带改为 `lg:grid-cols-[2fr_1fr]` 双栏——左「六站泳道」全局位置、右「该你了」待办（备忘 §3.1 的右栏）。**数据不另起**：直接消费 `usePendingDecisions`（决策收件箱**同一端点、同一 hook**），故不存在第二套口径；`/decisions/pending` 本就聚合三类待办（决策卡 / 待验收 / 待发布门禁），无需新端点。**排序即紧迫度**：blocking 优先，其次按 `createdAt` 最早优先，**时间不可解析者沉到本紧迫度分组末尾**（绝不伪装成「最紧急」）；计数徽标 `阻断 N`/`排队 N` 取**服务端聚合值**而非前端现数（页内数出来的是「这一次取回的那几条」，与服务端口径不等）。**不开第二个拍板入口**（§3.2 纪律）：行展开直接复用 `DecisionCard`（= 既有 `DecisionCardShell` 五段式 + 各 kind 槽位），动作经 `useDecisionActions` 转发——与收件箱**同一个**写路径桥接（含成功/失败 toast）；本组件不自建动作栏、不直连 api、不改决策语义，「就地拍板」的增量价值只是**不跳页**。**诚实粒度**：三类「空」可分（读取中 / 读取失败 / 确实没有，读失败**不显示占位条目**以免被当成真实待办）；分页截断如实报（`另有 N 项未显示（本次取出 X / 共 Y）`），不假装列表就是全部；等待时长由真实 `createdAt` 推出（刚刚/N 分钟/N 小时/N 天，不可解析给 `—`），**不**编造服务端没有的「剩余时限」；表头状态是**出处注脚**（`来自决策收件箱同一端点`）、正文才是内容态，同一句话不再一屏复读 | CAP-C-08（GAP-T-26） | 新增 `use-decision-queue.test.ts` **6 条**（blocking 优先 / 同紧迫度最早优先 / 时间不可解析沉底 / 聚合计数与 `hiddenCount` 透传 / 空列表 / 项目聚焦透传）+ 新增 `decision-queue-panel.test.tsx` **9 条**（行含 kind 徽标·标题·项目名·等待时长 / 阻断与排队取服务端聚合值 / **三类空可分** / 分页截断如实报 / 时间坏显示 `—` / 展开即既有决策卡**以 `data-ai-entity` 卡壳标记为证**且收起不渲染 / 动作经共用接线转发且 action === `accept` / `formatWaiting` 四档 / 不可解析返回 null）；`ai-surface-page.test.tsx` 增至 **15 条**（待办区在本层只验挂载，分层理由同泳道：它自打 `/decisions/pending` 而 MSW 未覆盖）；全量前端 **107 文件 / 593 用例**通过，`tsc --noEmit` + `eslint --max-warnings=0` + `check-palette` 三规则全零 | — |
| frontend | **诚实粒度降级 + 「示例」徽标分区域摘除（S2-e）**：S2 最后一片，收掉 S2-b/c/d 之外**仍未接真**的区域。**两条判据分开处理**（此前混为一谈是问题根源）：①凡「长得像实时遥测、实际无口径」的呈现→**清零数字**，不是"标成示例"就完事——把编造数字标成示例，仍是拿假数据占着真数据的位置（§4.7 无数据就显示无数据）；②凡「叙事型示例剧本」→**就地标注**示例。**逐项清零**：表盘标题栏的 `CAP-P-01` 徽章 / `96.4% 活力` / `零漂移`（表盘并没有在跟踪某个能力卡）、表盘底部整条常驻 HUD `LEVEL 3 准自主 · OPENAPI ZERO-DRIFT · 4/5 准则闭环`（信任等级字段不存在；契约漂移是 CI 构建结论而非运行时可读数；「准则闭环」没有任何口径能算出 4/5）、右侧信度列四项硬编码百分比（99.2 / 94.5 / 97.0 / 92.8）、`ZERO DRIFT 零漂移` / `单库隔离路由生效` / `无幻觉风险` / `上下文损耗 0%` 等**结论式断言**、记忆原子的 `权重 98%`（编造的精度：服务端权重不是这样被前端读的）。**清零后必须给去向**（新增 `NoMetricNote`）：项目信度总分 → 个人信度见左侧工位卡（office 真值）/ 健康分见仪表盘；契约合规率 → `pnpm contract:check` 输出；Token 产出比 → 工位卡「本周 tokens · 花费」。**删除假成功动作**：表盘「准入」按钮点击**只改本地 state** 显示「已准入」——既伪造（看起来批了，其实什么都没落）又开了**第二个拍板入口**（§3.2/§4.7 双踩），连同 `approvedIssue` state / `handleApprove` / `onApproveWorkstream` 入参一并删除（页面原本传的是空函数 `() => {}`）。**标注改为就地**（新增 `SampleTag`）：页头「部分区域示例」徽标**摘除**——收窄射程治不了**位置**问题，徽标在页头而示例内容在屏幕中段表盘里，读者的视线落到那些条目时徽标早已不在视野内（标注了≈没标）；改为标在示例区域标题旁（表盘标题栏 + 记忆原子卡）。**数据源同步清理**：删除 `TRUST_DIMENSIONS` 常量与 `TrustDimension` 类型、`DEMO_OVERALL_SCORE`、`MemoryAtom.weight` 字段（不留"没人看但摆在那儿像真数据"的残留），`radial-watch-deck` 的 `dimensions`/`overallScore`/`onApproveWorkstream` 三个入参随之删除 | CAP-C-08（GAP-T-26） | 新增 `radial-watch-deck.test.tsx` **6 条**（编造百分比全清且四维矩阵文案不复活 / **清零后每张卡都给出真数去向** / 信任等级与零漂移徽标不得复活 / 表盘上下两条 HUD 编造读数已删且**无「准入」按钮** / 示例就地标注恰好 2 枚且无同事时不补工位卡 / 记忆原子只留条目本身、无 `ATOMS ACTIVE` 与权重）；`ai-surface-page.test.tsx` 改写 2 条（页头徽标摘除 + 就地标注存在；**编造遥测三条战线合并为一条钉子**——表盘上方 HUD / 表盘内部上下条 HUD / 右侧信度四百分比 / 假准入按钮）；全量前端 **108 文件 / 599 用例**通过，`tsc --noEmit` + `eslint --max-warnings=0` + `check-palette` 三规则全零 | — |
| frontend | ⚠️ **遗留待定（S2-e 复核时登记，未做，留人审）：右侧信度列可否**接真**而非清零**——清零后该列只剩去向说明，视觉上偏空。复核发现两处**已有真实数据源**可接：①项目级健康分 → `GET /projects/{id}/dashboard-summary` 的 `health` 段（仪表盘页同源，非第二套口径）；②记忆原子 → `GET /memory` 既有服务（前端已有 `modules/settings/api/memory-api.ts`）。**未擅自接**：S2 的接真范围明确为「工位卡 / 泳道 / 待办区」（§五 切片表），把这两处接上属**扩范围**，须先走需求入口定论。**不静默扩**，故只留去向文案 + 本登记 | CAP-C-08 | — （复核依据：`openapi.json` 端点清单 + `modules/settings/api/memory-api.ts` 既有实现） | — |
| shared | **runtime 族载荷契约补齐（台账 #13）**：S1-a 补了 runtime 族 8 条**事件名**，但 6 条经网关 dispatch 通道裹送的事件里**只有 `runtime.execution.event` 有 zod 载荷契约**，其余 5 条的线格式只存在于 `runtime.service.ts` 发布现场与订阅方的 `any` 断言中——属「名字进了单源、形状没进」的半截收口。本次按**发布现场实际发出的线格式**补齐 `RuntimeDispatchCreatedPayloadSchema` / `RuntimeExecutionResultPayloadSchema` / `RuntimeApprovalRequestedPayloadSchema` / `RuntimeApprovalResolvedPayloadSchema` / `RuntimeExecutionCancelledPayloadSchema`，并抽出复用的 `RefItemPayloadSchema` 与 `RuntimeUsagePayloadSchema`。**关键取舍：以线上为准，不照抄 TS 声明**——`RuntimeApprovalRecord` 声明 `resolution?: 'approved' \| 'rejected'`，而 `requestApproval` 发布时把它覆盖成 `'pending'`；若照 TS 抄，调试期 `parse` 会在**真实线上载荷**上失败（该文件明示 schema 是「需要调试时可显式调用 parse」的类型真相源，故必须描述线格式）。文件头就地写明这条判据 | CAP-C-08 | `check:cli-contract` → 「领域事件名镜像一致（52 个）」；apm-shared / frontend / server / cli / desktop 五包 `type-check` 全通过 | — |
| frontend | **单次执行成本接入 + 终态合并规则（台账 #12）**：`runtime.execution.result` 是**执行终态与 CLI 真实 token/成本的上行唯一通道**，但投影层 `normalizeSurfaceEvent` 没有它的分支——事件到达客户端后被 `default` 静默丢弃，于是「本次执行花了多少 token / 多少钱」在表面上根本不存在，工位卡能显示的只有 office 的**本周**聚合口径。①**接入**：新增 `result` 分支（`kind: 'result'`、`dataText` = 终态 `summary`、`detail` 携带 `usage`/`artifactCount`/`evidenceCount`/`hasError`），`at` 取事件自带 `timestamp`（真实发生时刻，非归一化时的 now），**以 run 为键天然幂等**（一次执行只有一个终态，重复投递不产生第二条）；**未上报 usage 时该键缺席而非补 0**（补 0 把「没上报」说成「没花钱」，与伪造同罪），空 `artifacts` 数组同理不写 0。②**终态合并规则**：`pickStationProgress` 优先级改为 **执行终态 > 运行时原话 > 步骤事件**，且终态**按语义压过在途进展而非按时刻**——一次执行只有一个终态，终态之后该 run 不再有未来，**投递延迟会让在途事件晚于终态到达**，若按「时刻最新者赢」，已结束的执行会重新显示成进行中（正是本规则要挡的；已有专项用例钉死）。③`toStationCard` 用终态覆写 `run.status` 并**显式带出 `statusSource: 'snapshot' \| 'event'`**——快照是冷启动抓的、事件是后到的，不一致时以事件为准，但来源必须上 UI（status 旁 title 交代），否则读者无法判断这个状态是「刚确认的」还是「几分钟前抓的」；终态**缺 `status` 时不编终态值**，退回快照。④组件新增成本行：`本次 1.0k tokens · $0.42 · 工件 3`，**各字段各按各的存在性**（有哪个写哪个，都没有则整行不渲染，不补 0、不写「未知」占位），与下方「**本周** …」标签刻意不同以防周报被读成单次花费 | CAP-C-08（GAP-T-26） | `office-to-station.test.ts` 14 → **20 条**（终态压过在途 / **迟到的在途事件不得盖回终态** / 用量有才带 / `run.status` 被覆写且来源为 event / 无终态则来源为 snapshot / **终态缺 status 不编值**）；`use-surface-feed.test.tsx` 11 → **13 条**（终态与真实用量进 detail、未上报就缺席 / **以 run 为键去重**）；`radial-watch-deck.test.tsx` 6 → **9 条**（usage 在则「本次」与「本周」并存可区分 / 未上报整行不渲染 / 无 costUsd 不编 `$0.00`、无 artifacts 不补「工件 0」）；全量前端 **108 文件 / 610 用例**通过，`tsc --noEmit` + `eslint --max-warnings=0` + `pnpm lint` 全链（semantic/palette/ui-governance/tokens/registry/spacing/icons）全绿 | — |
| frontend | ⚠️ **门禁口径自纠 + #11 缓办登记（两者均未改行为，留人审）**：①**验证盲区自曝**——S1/S2 期间我逐切片跑的是 `check-palette` **直连脚本**而非完整 `pnpm lint`，于是 `lint:tokens`（任意值治理）的失败一直未被发现：`ai-surface-page.tsx` 的 `max-w-[1100px]` / `grid-cols-[2fr_1fr]` 是**未提交改动引入**（`git show HEAD:` 无此二者）。本次补跑完整 `pnpm lint` 并暴露、修复（按脚本自述逃生口登记入 `ALLOWED_TOKENS`：内容宽度是**页面级**布局常量，刻意窄于其他页面的 `max-w-7xl`，不升格为全局 `--container-*` token；`2fr_1fr` 是 fr 比例模板，同表内其他 `grid-cols-[...]` 有先例）。**结论：逐切片验收必须跑 `pnpm lint` 全链，不能只跑目标脚本**——只跑子脚本等于自选考卷。②**#11 缓办**：治理族 WS 事件当前为 `this.server.emit()` **全局广播**（跨工作区跨项目）。勘定后判定**不是网关一处能收口**：L1 载荷——14 条治理事件里只有 `execution.run.created` / `approval.request.created` 带 `projectId`，其余 11 条不带，补齐即改 4 个 service 的发布载荷（契约变更）；L2 授权——`handleSubscribe` 对 `project:${id}` **不做成员校验**（任何登录用户可加入任意项目房间），故「定向到项目房间」本身**不是安全边界而只是流量整形**，要真收口须补 `ProjectMember` 校验；L3 客户端——`eventClient.joinProject` 目前只有 linear 两个 hook 在调，ai-surface **未加入任何房间**，若 L2 改为定向而无兜底，**刚验收过的 S2-a 会当场断流**。三层同时动且会回退已验收通路，故**不擅自改**，登记待裁（前置件 #13 已于本批落地） | — | 完整 `pnpm lint` 全链通过（此前仅跑子脚本，见左）；`git show HEAD:<file>` 取证确认该失败由未提交改动引入 | — |
| frontend | ⚠️ **既有缺陷（探路时发现，未修，留人审）：`src/i18n/locales/*.json` 同一对象内存在重复键**——本切片需往语言包加 13 个键，用 `JSON.parse`→`JSON.stringify` 往返时产出 107 插入/30 删除的 diff，且含**并非本人所做**的内容改动（如 `新建状态`→`添加状态`）；`git checkout` 回滚后定向排查定位根因：`zh-CN.json` 的 `addStatus`（2130 / 2325 行）与 `statusName`（2133 / 2327 行）各自出现两次，**后一个键在运行时静默胜出**——源码读起来是「改了 A」，实际生效的却是 B。**不静默改**：两处内容语义须人工裁决保留哪一个。附带一条**纪律**：禁止用 JSON 往返改写语言包，一律精确 Edit | — | `grep -n` 静态核对重复键行号；`check:i18n-sync` 通过（en 3721 键 = zh-CN 3721 键——**键数相等并不能发现重复键**，该门禁对此缺口无覆盖） | — |
| frontend | ⚠️ **既有缺陷（探路时发现，未修，留人审）：`ai-surface` 四个组件为孤儿（全仓零引用）**——`SquadCapsuleOrbit` / `TrustOrbitalLens` / `CognitiveCanvas` / `ProjectVitalityCanvas` 各自只在自身文件内出现（`grep -rn` 排除自引用后无任何 hit），即 S1 换血后遗留的死代码。**不静默删**：是否保留（等待后续接线）属产品判断，交人裁决 | — | `grep -rn <组件名> src --include=*.tsx --include=*.ts` 逐个核对：四个组件的全部命中均在其自身定义文件内 | — |

### CAP-C-08 AI 表面 S3：叙述层（feat/ai-surface-realtime，2026-09-15）

> 验收口径（设计纪要 §3.3）：让**不懂工程的小白**看同一屏数据时能读懂"现在什么情况、卡在哪、要不要我"。四条硬约束贯穿本切片——
> ①**事实与叙事分离**：数字一律由事实层算好注入，模型**只翻译、不算数、不发明**；
> ②**成本纪律**：TTL 30s + 页面可见性触发，**绝不逐事件调模型**，且叙述**自己花的 token/成本也必须可见**；
> ③**确定性降级**：模型不可用/超时/输出不成形 → 回落规则摘要并**就地标注**，盯盘不因 AI 挂了白屏；
> ④**不主动弹窗**。
> **诚实边界（§4.7）**：不改双表面架构 / 不造第二套数据口径 / 不开第二个拍板入口 / **不直写档案**（叙述是展示层产物，永不落 `MemoryAtom`）/ **不伪造**。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **盯盘事实快照（S3-a）**：新增纯函数 `adapters/surface-snapshot.ts`——把页面**此刻已在渲染**的三块数据（工位卡 / 六站泳道 / 待办队列）重排成模型好读的形状，**零新查询**。为什么不做在服务端：若由 ai-hub 重查一遍聚合，就长出了与 office/decision 并行的**第二套口径**（§4.7 明禁）；放在前端还额外保证了**叙述不可能与同屏内容矛盾**——模型拿到的事实就是屏幕上的那些数。**三条诚实纪律**：①**未就绪 ≠ 空**：数据没取到时整组写 `null`（`colleagues`/`needsYou`），**绝不落成 0**——「查不到」被读成「一个都没有」是这块面板最危险的误读；特别注意 `useDecisionQueue` 在未就绪时会把 `total` 兜成 `0`，故输入契约**必须**同时传 `queueReady`，只看 `total` 就会把"还没查"说成"没有待办"；②**口径外不并档**：同事档位不在 `OfficeStatus` 四值内时计入 `other` 单独报数，**不塞进 `working` 凑数**（新档位是"我不认识"，不是"他在干活"）；③**时间只作事实陈述**：`runStartedAt` 是"从几点开始跑"、`lastProgressAt` 是"最后一句进展在几点"，**两者都不是"卡了多久"**——快照没有阻塞起始时刻，拿它俩相减会得到一个听起来精确、实则无据的时长（这条同时写进了服务端场景指令）。`snapshotHasFacts` 作为「值得花一轮 token 去讲吗」的闸门；`gaps` 收集本快照**自身**的数据缺口（窗口未覆盖、无阻塞口径、粒度天花板）供 `honestGaps` 直接引用 | CAP-C-08（GAP-T-26） | `surface-snapshot.test.ts` **17 条**（档位计数 / 未知档位进 `other` 不并入 `working` / 逐人事实透传 / 步骤级事件进 `lastStep` 不冒充原话 / **同事未就绪 → `colleagues` 为 null 且写明缺口，不是 0 个人** / **待办未就绪 → `needsYou` 为 null，挡住兜底 0 陷阱** / 分页截断如实报 / `createdAt` 不可解析则 `waitingSince` 为 null 不拿当前时间顶替 / 窗口计数写进缺口 / **`Object.keys` 断言快照不产出任何 `elapsed`/`duration`/`blockedSince` 式字段** / 两档粒度天花板措辞不混 / 缺口去重 / `snapshotHasFacts` 双向） | — |
| server | **静默场景 `surface-narration`（S3-b）**：在 `SILENT_SCENARIOS` 注册表新增第 **14** 个场景，把事实快照翻译成「一句话总述 + 动态 + 阻塞 + 待拍板 + 诚实缺口」。**刻意不挂 `prepareContext`**（与其余 13 个场景不同）：事实由前端组装后整体注入，服务端**不再重查**——这是 §4.7「不造第二套口径」的直接落实，代码注释就地写明理由以免后人"顺手补上准备钩子"。指令含**四条硬规则**：只翻译不算数（不加减乘除、不推算百分比、不做"大约/接近"式改口）/ 不发明（快照里没有的人名·工单名·数字·时间·原因一律不得出现，拿不准就不写）/ 空就是空（`null` 或空数组时明说"暂无"，绝不拿别的数据顶上）/ 说人话（句子短、不堆形容词）；输出结构 `{headline, highlights[], blockers[{what,who,since,why,whatYouCanDo}], needsYou[{decisionId,oneLineWhy,urgency}], honestGaps[]}`。`snapshot` 缺失或非对象 → **400 且不触碰 LLM** | CAP-C-08（GAP-T-26） | `assistant-silent.service.spec.ts` 36 → **41 条**（新增 `describe('surface-narration')` 五条：指令含完整事实与三条禁令原文 / 缺 `snapshot` → 400 **且未调用 LLM** / usage 回执含 `costUsd: null` 而非 0 / provider 未上报 token 时 `usage` **整个字段缺席** / 估价抛错不阻断叙述） | — |
| server · frontend | **契约：叙述自身的开销可见（S3-c）**：`AssistantSilentResponseDto` 补 `usage?: AssistantSilentUsageDto`（`promptTokens`/`completionTokens`/`totalTokens`/`model?`/`durationMs`/`costUsd?: number \| null`）——约束②要求"叙述自己花多少也要看得见"，此前该信息在响应里根本不存在。**关键口径**：`costUsd: null` = **估价口径不可用 ≠ 0**（DTO 与前端类型两处都写明），provider **未上报 token** 时 `usage` **整体缺席而不是补一个全 0 的回执**——「没上报」与「没花钱」不是一回事。服务端实现相应重构：计时用 `startedAt`/`durationMs`，估价与 `AIUsageLog` 写入各自独立 try/catch（估价失败只让 `costUsd` 为 null，不让整段叙述失败）。**顺带收口一处漂移**：`assistant.dto.ts` 里那份手工维护的场景清单（13 个只列了 4 个）改为**指向注册表的说明**，清单不再随注册表演化而失真。前端 `AssistantSilentResult`/`AssistantSilentUsage` 从手写 interface 改为契约单源 `ApiSchemas[...]` | CAP-C-08 | `contract:export` + `contract:generate` + `contract:check` ✓ 契约零漂移（`openapi.json` +65/−11，双端 `api-types.gen.ts` 各 38 行） | `openapi.json`；双端 `api-types.gen.ts` |
| frontend | **`use-surface-narration`（S3-d）**：叙述 hook。**成本纪律的落点在 queryKey**——`queryKey: ['ai-surface','narration', projectId]`，**快照刻意不进 key**：投影层每来一条事件就换一次快照引用，入 key 等于**逐事件调模型**（约束②禁止的正是在此）；快照改放 ref 并由 effect 同步（初值给首个快照），重取只由「事实签名变化 **且** 缓存已过 `NARRATION_TTL_MS`(30s)」触发，故事件洪峰下**每个 TTL 窗口最多一次模型调用**；页面不可见时 `enabled=false` 完全不取，从后台切回前台且缓存已过期才补一次（这就是"可见性触发"）；`retry: false`（降级是确定性行为，不靠重试盖过去）。**确定性降级**：模型报错、或返回的 JSON 不成形（无 `headline`）→ 回落 `buildTemplateNarration`，状态置 `degraded`，`degradedNote` 给**人话原因**三档——「当前没有可用的 AI 模型」/「AI 返回的内容不成形」/「AI 服务暂时不可用」，一律以「以下为规则生成的摘要」收尾；**不暴露原始报错文本，也不说成"AI 正在思考"**（后者会把一次失败伪装成进行中）。仅在**确实有事实可讲**时才降级——空白页给模板只会产出一句"没有同事"的空话 | CAP-C-08（GAP-T-26） | `use-surface-narration.test.tsx` **7 条**（有事实 → 调一次且 `decisionId` 白名单生效 / 无事实 → **一次模型都不调** / **★ 换快照但 TTL 未过不重复调用、越过 TTL 才允许再花一次** / 输出不成形 → 模板 + `degraded` + 标注 / 调用失败 → 不白屏仍给规则摘要 / 未上报 token → `usage` 缺席 / `refresh` 可绕过 TTL） | — |
| frontend | **顶栏一句话总述（S3-e）**：新增 `components/surface-narration-bar.tsx` 接入页面**态势带上方**（§3.1「顶栏：AI 一句话总述」），并新增纯解析/模板层 `adapters/surface-narration.ts`。**防幻觉闸门**：模型给的 `needsYou[].decisionId` 必须**真的在快照的待办清单里**，否则**整条丢弃**——不能"尽量用"，一个不存在的 id 会让用户点开**另一张**卡（"AI 说错了"里最贵的一种）；整个数组按同样规则过滤，`headline` 缺失/空白即返回 `null` 交由调用方降级（半显示不如老实降级）。**降级必须看得出来**：`source: 'template'` 时就地挂「规则生成的摘要」，原因挂 hover；不标注等于让人把规则拼出来的句子**当成 AI 的判断**——功能没挂、可信度挂了，这是降级里最坏的一种失败。**开销可见**：叙述自身的 token/成本/模型经 `DualTrackMetricPill` 呈现，`costUsd` 为 `null` 时**不传该字段**（宁可不显示也不写 `$0.00`），`usage` 缺席则整枚徽章不渲染。**不是第二个拍板入口**：`needsYou` 只呈现「为什么需要你」一句话，**不带任何按钮、不落任何写路径**，真正拍板仍在右栏决策卡（整块只有"重新读盘"一个按钮，且 title 明说它会消耗一次模型调用）。**四态各自长得不一样**：`idle` 整块不渲染（没有事实就不占位，也不说"暂无"填坑）/ `pending` 说"正在读盘…"（明确是等待而非结论）/ `ready` 与 `degraded` 内容照给、出处标注不同。页面侧把 `usePipelineLanes`/`useDecisionQueue` 提到页面层喂快照——与两个面板**同一组 queryKey**，命中同一份缓存，**不产生任何新请求** | CAP-C-08（GAP-T-26） | `surface-narration.test.ts` **11 条**（完整输出搬运 / **★ 编造的 `decisionId` 整条丢弃** / 待办未就绪时 `needsYou` 全挡而 `headline` 仍在 / head 缺失 → null / 空串当缺失·缺 `what` 的阻塞项丢弃·数组限长 / 模板造句 / 未知档位不折算成"在干活" / 未取到的组明说 / **阻塞项用开跑时刻做事实陈述且 `JSON.stringify` 断言不出现「卡了 N」** / 待办原序带出不自行排序 / 缺口原样带出）+ `surface-narration-bar.test.tsx` **11 条**（idle 不占位且不说"暂无" / pending 措辞 / AI 态分段呈现且不出现降级标 / **★ 降级就地打标 + 原因挂 hover** / 待拍板只给理由且无动作按钮 / 条内最多 2 条 / token·成本·模型上徽章 / **★ `costUsd: null` 不写 `$`** / `usage` 缺席整枚徽章不渲染 / 刷新 title 说明会花调用 / 空区段不留空标题）+ `ai-surface-page.test.tsx` 15 → **18 条**（顶栏**挂在态势带上方**（`compareDocumentPosition` 断言位置即语义）/ 无事实整块不占位 / **★ 降级就地标注且不出现「AI 读盘」**）；全量前端 **112 文件 / 659 用例**通过（较 S2 净增 4 文件 49 例），`tsc --noEmit` + `pnpm lint` 全链（semantic/palette/ui-governance/tailwind-arbitrary/registry/spacing/icons）全绿 | — |
| frontend | ⚠️ **自纠：S3-a 的类型缺陷（本切片内发现即修，**非**遗留）**——`surface-snapshot.ts` 初版写 `station.progress?.text`，而 `StationProgress` 是**三相联合**，步骤支只有 `label` **没有 `text`**：`tsc` 报 TS2339。**修法不是加个可选链糊过去**，而是承认这是两件不同的事实：**原话**（运行时自报 / 执行终态才有原文）与**步骤级**（只是"走到第几个节点"）拆成两组字段——`lastProgress`+`lastProgressAt` 与 `lastStep`+`lastStepSequence`，并相应把 §4.6 粒度天花的缺口文案也拆成两档（「只有状态级进度，没有逐条的执行进展」/「进展只到步骤级，没有运行时逐句原话」）：**合成一个字段会让"只有步骤级进度"被读成"有实时日志"，也会让确实在报步骤的执行被说成毫无动静**。**纪律（与 S2 的「逐切片必须跑 `pnpm lint` 全链」同源，此处是第二例）**：逐切片验收必须跑 `type-check`——只跑测试不够，因为既有用例只断言了**存在的**形状，联合类型里那条没被覆盖的臂不会让任何测试变红 | CAP-C-08 | 新增 2 条用例（步骤级事件进 `lastStep` 且**不**冒充 `lastProgress`、`lastProgressAt` 不给步骤事件的时间；有步骤事件时缺口说「进展只到步骤级」且**不得**说「只有状态级进度」），并把 roster 形状的 `Object.keys` 钉子同步更新；`tsc -p tsconfig.build.json --noEmit` 零错误 | — |

### CAP-C-08 AI 表面 S4：代理态收敛（feat/ai-surface-realtime，2026-09-15）

> 验收口径（设计纪要 §5）：①**不跳页**完成「看到卡住 → 问 AI → 拍板」闭环 ②决策动作仍落**既有**决策记录。
> **纪律**：**对话是入口，不是容器**——代理态的增量价值只有"就地办完"，不是把控制面搬进聊天框。
> **诚实边界（§4.7，贯穿本切片）**：不改双表面架构 / 不造第二套数据口径 / **不开第二个拍板入口** / 不直写档案 / **不伪造**。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **盯盘上下文注入（S4-a）**：新增纯适配器 `modules/ai-surface/adapters/station-context.ts`（`buildStationContext` + `composeSurfaceDispatch`），修掉一处**"看起来生效了、其实没有"的虚假信号**——OmniDock 徽章原文案「定向协同: @小码」承诺了两件都没发生的事：①消息**没有**定向给小码（`dispatch(content, projectId)` 不指定执行者）；②小码的状态**根本没进**派发内容，于是"看到小码卡住了 → 问它为什么"这句话里的"它"对 AI 不存在。**修法取最小改动面**：不扩契约（`openapi.json` / `AssistantViewingDto` / 服务端两条消息路径均不动），而是把工位卡上**已经有了的**事实拼进 `content`——身份（`displayName` + `memberId`）/ 在做哪张单 / 执行状态**带来源标注**（`snapshot` → 「来自快照，可能滞后」、`event` → 「来自执行终态事件」）/ 开跑时刻 / 最近一条进展。**刻意只带"卡在哪"用得上的事实**：`trustScore` / 本周用量 / 预算**不进去**——上下文给得越多，模型越容易顺着数字编解释。**刻意不带任何"卡了多久"**：工位卡没有阻塞起始时刻，拿开跑时刻减一下会得到听起来精确、实则无据的时长（同一判据与 S3 的 `surface-narration` 一致）；**无在执行的事**、**无逐条进展**都明说，不拿状态顶替 | CAP-C-08（GAP-T-26） | 新增 `station-context.test.ts` **11 条**（未选中 → `null` 不造空上下文 / 身份·工单·状态·开跑时刻·原话逐项搬运 / 状态来源两档措辞 / **★ 不产出任何"卡了多久"** / 步骤级照实说"第 N 步"且序号缺失**不编一个第 ? 步** / 终态与原话分得开 / 无执行无进展都明说 / **信度分·本周用量·预算不进去** / 三段拼装顺序 正文→上下文→模型标记 / `'auto'` 不带模型标记） | — |
| frontend | **回显 === 发送（S4-b）**：`ai-surface-page.tsx` 的 `handleSendMessage` 改为**只调一次** `composeSurfaceDispatch`，回显与派发共用同一份字符串。原实现回显原文、派发另一份（带 `[model:]`），对新手而言"气泡里藏着一份给机器看的变体、屏幕上是另一份"是最容易失去信任的那种差异——宁可气泡里多一段显式上下文，也不要看与被看的不一致。模型标记与上下文都**可见地**留在气泡里（可溯源、可复制、可质疑）。依赖数组随之加 `selectedStation` | CAP-C-08（GAP-T-26） | `ai-surface-page.test.tsx` 18 → **21 条**，其中新增 **★ `bubble.textContent === mockMutate.mock.calls[0][0]`**（把"同源"钉成断言而非注释）；原两条精确文本断言改子串/正则匹配（回显内容现在含上下文与模型标记） | — |
| frontend | **徽章只承诺真会发生的事（S4-c）**：`omni-dock.tsx` 的 `activeAgentName` 徽章「定向协同: @X」→「**附带上下文: @X**」并加 `title` 逐条说明附带什么（在做哪张单 / 执行状态 / 最近进展 / 待决数）、且**明说**消息仍走既有派发、不指定具体执行者；空状态「全域 Agent 编队待命」（同样是无据的装饰性断言）→「**未选中同事 · 发送不带上下文**」 | CAP-C-08 | 并入 `ai-surface-page.test.tsx` 新增用例：未选中如实说"不带上下文" / 选中后措辞为"附带上下文" / **两种状态下 `定向协同` 均不得出现** / 且徽章所说在派发内容里**有据可查**（含 `[盯盘上下文`、`memberId: ai-1`、工单名） | — |
| frontend | **`data-ai-entity` 补齐：AISlot 在本面才可能命中（S4-d / CAP-C-07）**：`ai-surface` 此前**一个 `data-ai-entity` 都没有**，而 AISlot 靠 DOM 上的 `kind:id` 找目标——Ctrl+左键的 `closest()` **恒返回 null → 静默无反应**（看着像功能没做，其实是没接）。补两处：①工位卡 → `member:${memberId}`（`member` 本就在 card-explain 支持清单内，**服务端零改动**）；②待办行 → `decision:${id}`——行此前**只有** `data-decision-id`，而 AISlot 读的是 `data-ai-entity`，故**收起状态**下"看见一条待办但不确定它是什么意思、又不想展开"的那一刻问不上话；前缀必须取 `decision:`（决策卡壳的既有约定），不能裸用 `data-decision-id` | CAP-C-08（GAP-T-26） | `ai-surface-page.test.tsx` 新增 `data-ai-entity === 'member:ai-1'` 断言；`decision-queue-panel.test.tsx` 9 → **10 条**，新增行实体标记用例，并把原「展开即既有决策卡」改写——**该用例原以「`data-ai-entity` 存不存在」判定卡片是否渲染，行补上同名属性后此判据失效**，改为计数（收起 1 = 仅行 / 展开 2 = 行 + 卡壳）并以卡壳独有的 `data-decision-urgency` 作证 | — |
| frontend | ⚠️ **边界登记（本切片内确认，未扩范围）**：①**S3 遗留问题就地定论**——备忘 §7 第 4 项「`surface-narration` 的输出是否要做前端交互（点 blockers 直接跳执行详情）」裁定为 **否**：跳页与"不跳页闭环"直接冲突，且会开第二个拍板入口；`blockers`/`needsYou` 保持**不可点击**（"就地查"走 AISlot / 输入框，"就地拍板"走右栏决策卡，两条路都不需要它变成第三个入口）。②**"就地查"的结构前提**：`ai-surface` 是 `/app` 子路由，渲染在 `ShellLayout` 内（`AISlotLayer` 已挂载），故此前链路不通**只缺 `data-ai-entity`**、不缺宿主；该结论以代码位置为据，本工作树无 e2e 可端到端复验（AISlot 的 Ctrl+左键行为须人工点一次）。③**§3.2 的「新建需求 \| 统一创建面板 / intake 剧本（CAP-P-01）」不在本切片**——它落在 S5/S6 的演示切片之外，仍属未开工 | CAP-C-08 | 全量前端 **113 文件 / 674 用例**通过（较 S3 净增 1 文件 15 例），`tsc -b` 零错误、`pnpm lint` 全链（semantic/palette/ui-governance/tailwind-arbitrary/registry/spacing/icons + server）**0 error**（server 2 条 warning 系 CAP-A-16 遗留、非本切片引入） | — |

### CAP-C-08 AI 表面 S5：回放演示（feat/ai-surface-realtime，2026-09-15）

> 验收口径（设计纪要 §五 S5）：①**无 runtime、无 API key** 的环境里完整放完 ②暂停 / 步进 / 跳站可用。
> **为什么走"回放"而不是"实况"**（§3.4 路径 A）：演示最怕三件事——依赖用户本机 runtime、烧 token、等 5 分钟。回放三样全免。
> **一条渲染路径，两个数据源**：回放**不另画一套界面**，它把同一批 View 组件（泳道 / 待办区 / 工位卡 / 顶栏总述）喂上剧本数据——演示的全部价值就在"你看到的就是你会得到的"。
> **诚实边界（§4.7，贯穿本切片）**：不造第二套数据口径（剧本一律复用既有字段口径）/ **不假装实时**（不挂实时徽标、不挂输入坞）/ **不假装能拍板**（剧本里的 id 在服务端不存在 → 决策卡整条只读）/ **不伪造**（每一格数字的溯源改写为"回放剧本"，不沿用实况端点名）。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **快照格式即契约（S5-a）**：新增 `modules/ai-surface/replay/screenplay-format.ts`——设计纪要把剧本格式定为**契约**（「快照格式即契约，需登记」）的理由是它**唯一不被服务端校验**（不过 DTO、不过 zod、不过 openapi，写错了没有任何一层会拦住），故把校验显式做出来：`SCREENPLAY_FORMAT_VERSION = 1`（**版本不等即整份拒绝**，不做"尽力解析"——用旧剧本演示一个已不存在的数据口径比打不开更坏）+ `parseScreenplay()` 返回 `{ screenplay, drops }` 而**不抛异常**（抛异常会让"第三帧写错了"变成"整场演示打不开"）。三条判据：信封字段齐全、**`lanes` 必须给全六站**（快照语义下"未提及"不等于"没变化"，放过去会让漏写的站**静默沿用上一帧数字**，看起来像"管道停在那儿没动"——一个精确、具体、且完全错误的读数）、帧按 `atMs` 单调排序（乱序会让步进往回退）。帧内字段**一律复用既有口径**：`colleagues` 是 `OfficeColleague`（office 同型）、`decisions` 是 `Decision`（决策收件箱同型）、`events` 是**原始领域事件**（回放时经**同一个** `normalizeSurfaceEvent`）。数据结构本身仍纯 JSON 可序列化，若将来外置成 `.json` 由运行时 fetch，`parseScreenplay` 原样可用 | CAP-C-08（GAP-T-26） | 新增 `screenplay-format.test.ts` **20 条**（合法零丢弃 / **★ 版本不等整份拒绝** / `id`·`title`·`about`·`project.id`·`storyAt`·`frames` 缺失逐项拒绝 / `atMs` 非有限数丢帧 / 三个数组字段类型错丢帧 / **★ lanes 缺站丢帧并把缺哪几站报出来** / lanes 值可为 null 但键必须齐 / **★ 部分帧坏掉仍可播（丢的是那一帧，不是整场演示）** / 全坏退回"无一帧可用" / **★ 按 atMs 排序** / 排序不留副作用）；新增 `screenplay-timeline.test.ts` **10 条**（**★ `atMs` 是开演时刻不是时长**——当前帧 = 最后一个 `atMs <= elapsedMs` / 同刻并列取后写者 / 超末帧不越界 / 空帧表返回 0 / 总时长 = 末帧 + 收尾停留 / **★ 站不存在返回 `null` 而不是 0**——跳一个没有的站应当什么都不发生，返回 0 会把"没做成的操作"装成"这段播完了"） | — |
| frontend | **剧本数据：从一句话到交付（S5-b）**：新增 `replay/screenplays/first-delivery.ts`——10 帧 / 100 秒 / 六站全覆盖，`storyAt` 固定为 `2026-09-10T09:00:00.000Z`（**若用 `Date.now()` 兜底，同一份剧本两次回放会显示两个不同的时间，而那些"14:20 开始跑"的读数看起来又很精确——精确的假时间比明显的占位更坏**；顺带让测试可确定性断言）。主线叙事：销售一句话需求 → 小规拆 3 张工单并逐张写验收条件 → 派给小码 → 改代码 → 跑测试 → 终态（`runtime.execution.result` 带真实 `usage`：12k tokens / $0.08 / `claude-sonnet-5`）→ 待验收（全片唯一 `needYou`）→ **降级帧**（`source: 'template'`，演示"AI 挂了盯盘也不白屏"这条承诺**在演示里真的成立**）→ 通过 + `release.created` → `release.approved`。事件名一律取 `DomainEventTypes` **常量**（不写字符串字面量：写错一个事件名的表现是"那一帧凭空少一条进展"，与"这一步本来就没进展"完全一样）。全片人类只做一个动作：**点头** | CAP-C-08 | 新增 `screenplays/first-delivery.test.ts` **13 条**守卫（**★ 自带剧本零丢弃**——解析器一改格式这里先红 / 六站都有帧覆盖 / 首帧 01 末帧 06 / 时间轴单调且首帧为 0 / **★ 全片无一条事件被投影层丢弃** / **★ 全片无一格数字来自实况端点名** / 同事档案可渲染 / **★ 恰有一帧刻意降级且自陈"由规则生成"** / **★ 降级帧里的待办仍在队列** / 全片恰有一条待办（"你只做一次点头"）/ 末帧挑明这是回放 / 成本字段来自 runtime 终态 | — |
| frontend | **回放器 + 视图抽取：一条渲染路径（S5-c）**：①`replay/screenplay-facts.ts`——帧 → 视图事实的**纯函数**，产出形状与实况侧一一对应（工位卡走**同一个** `toStationCards`、进展走**同一个** `normalizeSurfaceEvent`、待办走**同一个** `sortDecisionQueue`、站清单走**同一个** `PIPELINE_STAGES`）；**唯一必须不同的是 `source` 溯源字段**（帧里的数字不是从任何端点取的，沿用实况的「GET /documents/stats」就是让悬停提示说假话），一律改标 `REPLAY_SOURCE_LABEL`。②`replay/use-screenplay-player.ts`——真实时间轴（100ms 一拍），步进/跳站**自动暂停**（手动定位时若还在自动前进，下一拍就把用户想看的帧冲掉了）；**`playing`（时间轴在不在走）与 `atEnd`（还有没有下一帧）分成两件事**：末帧的收尾停留里时间轴仍在走、但已无可步进之帧，合成一个 state 会让"到末尾自动停"必须靠副作用改 state（React 明确不建议，且 `react-hooks/set-state-in-effect` 会报），故改为派生——**末尾按播放键因此是"重播"而不是一次没反应的点击**（"按了没反应"是假按钮的另一种形态）。③**抽出 View**：`pipeline-lane-strip.tsx` / `decision-queue-panel.tsx` 各拆成 hooks 包装器 + 纯 props 的 `*View`（理由写在两处文件头：给回放另画一块"看起来一样"的泳道，两份渲染迟早长歪，于是演示给新手看的界面与真实项目里那个**不是同一个东西**）。④`ScreenplayControls` 控制条（播放/暂停/上一步/下一步/重头放/只读进度条/六站跳转）。⑤共享决策卡新增 `readOnly` / `readOnlyNote`（**整条动作栏不渲染**、键盘快捷键提前返回、`clarify` 自管体一并跳过）+ `data-decision-actions` 稳定标记（"不渲染"与"渲染了但按钮是灰的"在视觉上不易分辨、在测试里更不好断言）| CAP-C-08（GAP-T-26） | 新增 `screenplay-facts.test.ts` **12 条**（**★ 六站计数一律标 `REPLAY_SOURCE_LABEL` 且不得匹配 `GET /POST /_api`** / 站清单与顺序取自单源 / **★ `count` 为 null 保持 null 绝不落成 0** / 有口径的 0 如实给 0 / blocked 为 null 补标准口径说明 / 有值不给说明 / 事故事件经同一归一化器且时刻 = 剧本起点 + 帧内偏移 / **★ 写错事件名必须报出来不静默丢** / 载荷非对象同样计入丢弃 / 同事经同一 `toStationCards` / **★ 待办走同一 `sortDecisionQueue`（blocking 在前）** / 回放不存在分页）；新增 `use-screenplay-player.test.tsx` **15 条**（默认不自动播 / 推进与帧切换 / 暂停冻结 / **★ 到末帧自动停** / **★ 走完后按播放键是"重播"** / **★ 收尾停留里时间轴还在走（按下去是"暂停"不是"重播"）** / **★ 步进自动暂停** / **★ 连点两下前进两帧**（函数式更新，不吃闭包旧值）/ 边界不越界 / 跳站落点 / **★ 跳不存在的站返回 null 且原地不动** / 重头放 / 空帧表不抛 / **★ 尊重「减少动态效果」** / 卸载后定时器清零）；新增 `screenplay-controls.test.tsx` **12 条**（时长文案三档 + 四舍五入到 60 秒换成分 + 负数按 0 / 播放键三态 / **★ 首末帧步进置灰** / 六站键跳的是站编号 / 帧计数从 1 起算 / 进度条只读语义 / 总时长为 0 不除零） | — |
| frontend | **回放页接线 + 入口（S5-d）**：新增 `pages/ai-surface-replay-page.tsx` 与路由 `/app/ai-surface/replay`（独立路由而非盯盘面的"模式开关"：回放不连 WS、不取任何数、也不会因断线而变样，塞进盯盘面的状态机里反而让"回放为什么不需要连接"说不清）；盯盘面页头加回放入口（悬停文案如实说明**不需要 runtime、不需要 API key**——那正是这条入口存在的理由）。本页**刻意不做**四件事，每条都写进文件头：①**不挂 `SurfaceLiveness`**（显示"实时已断开"是如实但不相关的噪音，显示"实时"是假话）②**不挂 OmniDock**（剧本里的对话气泡是已发生的事，留一个发出去没人接的输入框比没有输入框更糟）③**决策卡只读**（剧本 id 在服务端不存在，点下去就是"看起来批了、其实什么都没落"——S2-e 删掉假「准入」按钮时定的同一类错误）④**不假装实时**（所有悬停溯源写"回放剧本（预置快照，非实时取数）"）。另有两处精度处理：**剧本自身读不出来时显式报出丢弃原因**（"少了一幕"不能看起来像"本该如此"）、**待办等待时长按剧本时钟算**（沿用墙上时间会让一条刚出现的待办显示"等了 4 天"——与全屏每一处都矛盾）| CAP-C-08（GAP-T-26） | 新增 `pages/ai-surface-replay-page.test.tsx` **20 条**（**★ 全程零网络零实时连接**（不是"降级兜住"，是根本不依赖）/ **★ 放完不白屏** / 帧标题随时间轴变化 / **★ 降级帧照样放得下去且待办不消失** / 暂停·步进·跳站·重头放 / 六站键齐全 / 进度条只读 / **★ 泳道与待办用的就是实况那两个组件（同一组 `data-ai-component`）** / **★ 每一格溯源都写"回放"且不沿用实况端点名** / 计数来自剧本那一帧 / **★ 页头挂「回放」且不挂实时徽标**（替身标记，谁加回来这里就红）/ **★ 不挂输入坞** / **★ 只读态整条动作栏不渲染 + 原位说明为什么不能拍** / **★ 等待时长按剧本时钟（显示"刚刚"而非"N 天"）** / 出口明确 / 开篇说清这是回放）；`ai-surface-page.test.tsx` 21 → **22 条**（入口存在 + 悬停文案含"不需要 runtime/API key"） | — |
| frontend | ⚠️ **边界登记（本切片内确认，未扩范围）**：①**剧本以 `.ts` 模块承载而非 `.json` 文件**——设计纪要原文写的是「一份快照 JSON」，此处以 `.ts` 承载**等价的结构化数据**，换取编译期类型校验（格式契约的第一道门）与可组合的构造辅助函数；数据结构本身仍是纯 JSON 可序列化，若要外置成 `.json` 由运行时 fetch，`parseScreenplay` **原样可用**（此为偏离，理由已就地写入文件头）。②**"跳站"在控制条里跳的是帧，不是页面**——剧本计数不对应任何真实记录，跳页只会看到一个不相干的空列表；泳道上的 `onOpenStage` 在回放态因此是**空实现**（泳道组件原样复用，只在注脚上写明二者差别）。③**本页无 e2e 覆盖**：20 条用例用假定时器驱动时间轴，覆盖了逻辑与渲染，但"真人看着 90 秒放完是什么感受"须人工看一次 | CAP-C-08 | 全量前端 **120 文件 / 777 用例**通过（较 S4 净增 7 文件 103 例），`tsc -b` 零错误；`pnpm lint` 全链（semantic/palette/ui-governance/tailwind-arbitrary/registry/spacing/icons + server）**0 error**（server 2 条 warning 系 CAP-A-16 遗留、非本切片引入；本切片自行修掉两处：进度条 `transition-[width]` 属禁用的任意值 → 改用已登记 token `transition-[left,top,width,height]`；`Date.now()` 直接落在渲染期触发 `react-hooks/purity` 报错 → 参考时刻缺省值留在 `formatWaiting` 函数体内，调用方要非"现在"的时刻必须显式传参）；`pnpm check:docs-sync` 通过 | — |

### CAP-C-08 AI 表面 S6：实况演示（feat/ai-surface-realtime，2026-09-15）

> 验收口径（设计纪要 §五 S6 / §3.4 路径 B）：①**向导完成后引导至回放** ②实况路径兼出 **GAP-T-19 主流程证据**。
> **先回放、后实况的次序不可颠倒**（§3.4）：刚装好的机器上用户可能一步都没配（模型没配、runtime 没起），此时带他去看实况，看到的会是"什么都没发生"——第一印象就此毁掉，而且他会合理地认为这东西坏了。顺带这也让上一步的「配置 AI」**可以安全地跳过**：跳过之后不再是一句无据的"您已准备好"接着一片空屏，而是"先看一遍它怎么干活（90 秒 · 不需要配置模型）"。
> **回放是回放的证据，实况是实况的证据**：本切片**不拿回放的截图去充当实况冒烟**——两者能证明的事情不同（见下表 ⚠️ 行）。
> **诚实边界（§4.7，贯穿本切片）**：不改双表面架构 / 不造第二套数据口径 / 不开第二个拍板入口 / 不直写档案 / **不伪造**（验收②**未被产出**，如实登记为环境阻塞，不以任何形式充数）。

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **向导完成 → 先看回放（S6-a）**：`use-onboarding` 新增 `watchReplayThenStart`（`completeOnboarding()` → `navigate('/app/ai-surface/replay')`），`onboarding-wizard` 的 `CompleteStep` 主键改为「**先看一遍它怎么干活（90 秒 · 不需要配置模型）**」，「进入 APM」「查看文档」降为次键/幽灵键。**两处非显然的取舍写进代码**：①**主键不给"进入 APM"**——按钮文案承担全部说明责任（含"不需要配置模型"），否则主键就是一个语焉不详的跳转，用户点完才发现要看的东西一样也看不到；②**完成标记必须先落**（与 `finishOnboarding` 同序）——不落的话引导门控会在回放页上**再弹一次向导**，用户刚点的按钮看起来就没生效。**顺带修掉一句无据的断言**：原文案「您已准备好开始使用 APM」——上一步「配置 AI」是**可跳过**的，跳过之后这条链路一步也跑不起来；改为「工作区已经建好了。下一步建议先花 90 秒看一遍这条管道怎么干活」，把"还差什么"交回给下方那张本来就写着「在『设置 → AI 管理』配置模型后即可执行任务」的卡片去说。回放页**本身零改动**即可承接这条入口：它不连 WS、不取任何数、不需要 runtime 与 API key（S5-d 已定） | CAP-C-08（GAP-T-26） | `use-onboarding.test.ts` 4 → **6 条**，新增 `describe('watchReplayThenStart')`：**★ 先落完成标记、再跳回放页**（三个断言钉死次序：`setOnboardingCompleted(true)` / `persistOnboardingToShell(true)` / `navigate('/app/ai-surface/replay')`，并断言**零网络** `postMock` 未被调用——完成标记是前端/壳侧状态，回放页更是一个请求都不发）；**★ 与「直接进入 APM」是两条不同的去向**（同一 hook 上先后调两者，落在 `/app/ai-surface/replay` 与 `/app` 两个地址——"次序不可颠倒"的那一半是可断言的，不是一句注释） | — |
| — | ⚠️ **验收②未产出 · 环境阻塞（如实登记，不充数）**：设计纪要 §3.4 路径 B 的**实况演示**（沙箱工作区真跑一条 mini 需求：intake → 拆解 → 派发 → 执行 → 验收）**未在本切片产出**——它需要一台能起守护进程、配有可用模型、且能开沙箱工作区的机器，**在本工作树（前端改动 + 无 runtime / 无模型凭据 / 无沙箱）不可能诚实地做出来**。设计纪要说它「一次投入两处收口」（既是实况演示，也是 GAP-T-19 缺的端到端主流程安装冒烟），**两处因此都仍未收口**。**已有证据（非本切片产出，转引自既有登记）**：GAP-T-19 记为「本机近似完成（2026-09-12：静默安装 → 生产启动 → health 200 → 优雅退出无残留）」，**其缺的正是"项目主流程 CRUD 端到端"这一段**。**为什么不用回放冒充**：回放（S5）证明的是"无 runtime、无 API key 也放得完"，实况冒烟要证明的是"真的能跑起来"——**两件不同的事**，拿前者当后者就是把演示当成了证据（本切片最不允许的形态）。**要产出它需要**：一台干净机 + 安装包 + 模型凭据 + 沙箱工作区，人工按 GAP-T-19 的正常流走一遍并留存记录 | CAP-C-08 · CAP-A-14（GAP-T-19） | 本切片**不含**该项的任何自动化或人工证据；本条的作用是让"缺口在哪、缺什么、谁来补"在变更契约里可见，而不是让一次未完成的验收在 CHANGELOG 里消失 | — |
| frontend | ⚠️ **边界登记（本切片内确认，未扩范围）**：①**S6 不含"实况路径的就绪度提示"**——曾考虑在盯盘面加一块"runtime 未在线 / 模型未配置"的引导，**经裁定不做**：那需要一个新的就绪度查询口径（runtime 在线态 + 模型配置态在本面**没有现成查询**），既有 `SurfaceLiveness` 只报连接态、`useOfficeSummary` 只报同事，"没配"与"没人"在数据上本就分得开（S3-a 已把"未就绪 ≠ 空"钉进快照契约）——**再开一块面板是造第二套口径的入口，且它属于未开工的能力，不属本切片的验收**。②**回放下游的去向不新增页面**：回放页页脚出口仍指回盯盘面，文案已如实写明"那里的数字是真实项目里的"（S5-d 原文），**不新增"回放结束后自动跳转"**——自动跳转会打断"看到最后一眼"这件事，而最后一眼恰是降级帧与 `release.approved` 所在 | CAP-C-08 | 本切片无新增文件、无新增用例文件（唯一改动是 `use-onboarding` 的一个 hook + 一个测试文件的两个用例）；全量前端 **120 文件 / 779 用例**通过（较 S5 净增 2 例），`pnpm run type-check` 6/6 任务通过、`pnpm lint` 全链（semantic/palette/ui-governance/tailwind-arbitrary/registry/spacing/icons + server）**0 error**（server 2 条 warning 系 CAP-A-16 遗留、非本切片引入）、`pnpm check:docs-sync` 通过 | — |
### CAP-A-18 统一创建面板设计升级：Linear 沉浸流式 + 实体精准定制 + AI 在场感知与功能去重（2026-09-15）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **极简沉浸流式与放大无位移**：彻底纠正原 `max-w-3xl mx-auto` 居中缩进导致的放大位移与左右各 136px 巨大空边距，统一为全宽自然延伸流式排版；取消面板头部 AI 切换 tab 与常驻微型智能填单提示（消除功能重复），将视觉信噪比降至极致；取消文档类型和项目来源重复冗余模块（统一收口至对应页面模板入口）。 | CAP-A-18 | `unified-create-dialog.test.tsx` 更新并通过；无缝宽高自适应 | `CHANGELOG.md` 登记 |
| frontend | **底部布局重构与智能体呼吸穿梭**：Footer 左侧将附件入口与「连续创建」开关并列排布；右侧新增 `ModeShuttleButton`，采用系统默认 AI 紫色系（`accent-purple`），内置 `animate-ping` 呼吸光标，实现手动精准录入与智能体自然语言拆解的双向平滑穿梭。 | CAP-A-18 | `mode-shuttle-button.tsx` 单元测试与面板集成测试全绿 | — |
| frontend | **AI 在场感知与执行策略控制**：实现 `AgentPresenceBanner`，当指派人为 AI Agent 时自动感知激活并提供执行策略下拉选项（立即执行 / 需审批 / 仅建待办），协同任务与缺陷的验收标准治理闭环（CAP-B-01/B-02）。 | CAP-A-18 | `agent-presence-banner.test.tsx` 5 条用例全绿 | — |
| frontend | **实体模版与横向属性胶囊**：实现 `PropertyPillsBar` 单行横向属性栏与 `BugTemplateHelper` 标准排查模板，优化不同实体的表单体验与状态/优先级/指派人快速切换。 | CAP-A-18 | `entity-templates.test.tsx` 6 条用例全绿；tsc -b / eslint 0 警告 0 错误 | — |

### CAP-A-18 统一创建面板双界面：手动 × AI 代理平行 + 注册表对齐 + 行为修正（2026-09-15）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **迁位 + 原子收编（批1）**：`components/ui/unified-create-dialog` → `shared/components/create-dialog/`（业务复合件退出 ui 原子层，消除对 issue/project/document/assistant 五模块反向依赖的层级违例；grill 引用为 shared→module 既有惯例方向并注释注明）；删除本地重复原子 Capsule/CapsuleSelect/PropertyRow/PropsCard/AutoSizeTextarea/SubTaskCard/SmallCaps/Switch，统一改引 `components/ui/property-panel` 与 base-ui Switch（胶囊观感以详情页共版归一，SubTask 死装饰 SmallCaps 随收编消失）；错误条换标准 Alert；AI 建议卡拆 `suggestions-card.tsx`；12 处消费方导入 + 3 处测试 mock 同步 | CAP-A-18 | tsc -b 0 错；eslint 0；受影响 3 测试文件 6 用例绿 | `COMPONENTS.md` 注册表路径同步 |
| frontend | **注册表对齐 + 死装饰清理 + P0 修复（批2）**：entity-icons 登记 `milestone=Flag/warning`（第 14 实体）；TYPE_META 五类型图标改走 EntityIcon（tone 语义色），删手绘 FileTextIcon SVG 与全部内联 hex；状态/优先级选项派生自 status-visuals TASK_STATUS_VISUALS/PRIORITY_VISUALS（label 走 status.* i18n，in_progress 加 animate-spin）；CTA 主色恒定 bg-primary；死装饰移除（附件按钮/死 Labels 行/Template chips/Identifier 提示/Lead/Target 死胶囊）；doc Type chips 接真实 DocumentCategory 枚举并接线 submitDoc（原硬编码 custom）；**P0 三修**：里程碑 mutation 改绑表单所选项目（原绑死 prop，Dock 全局入口提交必炸 projectId is required）、里程碑 Target date 接 DateCapsuleField、子任务 completed 语义修正（原 !!subDesc 误标完成）；bug 面板补优先级行 | CAP-A-18 | entity-icons 7 用例绿；面板零原始色残留 grep 校验 | `docs/01-需求/能力清单-v1.md`（CAP-A-18 卡）、`测试映射矩阵-v1.md`（GAP-T-32） |
| frontend | **顶级双界面（批3）**：面板级 mode(manual\|ai) Header SegmentedControl 平级切换；'ai' 退出 CreateType/TYPE_ORDER（store CreateDialogType 同步收窄）；AI 代理界面=自然语言→create-draft 草稿确认卡（字段预览/重新生成/确认创建/回手动编辑），确认后回填表单复用手动提交流；降级保留「转小助理」；project 类型 grill 深访流程原样保留（仅手动模式）；快捷键注册表 create 组补 create-panel-submit(mod+enter) 登记同步 | CAP-A-18（口径扩展 [[#CAP-P-01]] ADR-011：project 专属 AI 双模式 → 面板级全类型） | hotkeys+store 47 用例绿 | `docs/01-需求/能力清单-v1.md` 变更记录 |
| frontend | **行为修正（批4）**：最大化改语义档 w-dialog × h-dialog-screen（95vw×95vh 宽高同步放大，原仅宽度）+ transition-all 平滑；连续创建补完（成功后重套 projectId/assigneeId 预置、projectSource 复位、焦点回归标题）；Esc/遮罩/X/Cancel 统一走 requestClose 脏检查（有未提交输入先弹 AlertDialog 确认防丢草稿）；SuggestionsCard 删四条不可点静态假建议（死可供性），未生成时渲染 EmptyState 引导 | CAP-A-18 | 消费方 3 测试文件回归绿 | — |
| frontend | **i18n 清偿（批5）**：面板全部硬编码文案入 unifiedCreate.* 双语键（类型 label/placeholder/descHint/字段行/占位/错误/toast/模式切换/AI 草稿卡/脏退出弹窗/文档类目/项目来源/严重度/图标 title；新增 15 组键，复用既有 labels/title/linear.*/success 等）；suggestions-card 同步清偿 | CAP-A-18 | 双语 JSON 合法 + 键对称；zh/en 0 漂移 | — |
| server | **静默场景 create-draft**：SILENT_SCENARIOS 新增（prompt+typeHint → {type, fields} 结构化草稿；prepareContext 空 prompt 400 守卫；宁缺毋假指令约束；开放对象协议契约零改动）；前端 useSilentCreateDraft/parseCreateDraft 容错解析 | CAP-A-18 | assistant-silent.service.spec 39 条（+3：正常流含指令断言/code fence 容错/空 prompt 400 不触 LLM） | — |
| frontend | **GAP-T-32 回归测试**：新增 `create-dialog/__tests__/unified-create-dialog.test.tsx` 9 条——双界面切换互不串/AI 草稿流全链（生成→预览→确认落库）/失败降级转小助理/Esc 脏保护两态/最大化语义档断言/里程碑绑定所选项目/死装饰不渲染 | CAP-A-18 | 前端全量 110 文件 571 用例绿；server 73 套件 661 用例绿；契约零漂移 | `docs/01-需求/测试映射矩阵-v1.md`（GAP-T-32 清偿回填） |
### feat：执行兜底批 5——失败执行重新执行（克隆新建执行+血缘关联，替代原地重派）（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| server+frontend | **失败执行重新执行语义升级**：①schema `Execution.retryOfId` 自关联字段（迁移 20260917100000，dev.db+template.db 均应用并登记，SQLite 不做 DB 级外键、完整性由 schema 声明+应用层校验维护）；②cli-dispatch 新增 `POST /ai/execution-runs/:id/retry`（retryExecution）：校验 failed/blocked 可重试（superseded 人工取消不放开）→ 克隆新建执行（沿用 goal/标题/角色/主体/工时/验收契约关联，原 input 保留并附 `retryContext`=原状态/原 errorDetail/原派发错误，`dispatchError` 留痕字段归档不进新载荷）→ 走既有派发链（platform_ai_member 主体沿用原成员）→ 派发被门禁阻断时新执行落 blocked（RETRY_DISPATCH_FAILED）留痕、原执行不受影响；与批 1.4 原地重派的语义差异：原执行保持终态，失败现场（步骤/产物/错误详情）不丢；③前端执行中心 failed/blocked 行菜单与任务详情执行项面板改调新端点（draft/planned 仍为首次派发 CLI 原地语义）；执行中心行与执行项面板新增「重试自」血缘徽标（点击直达原执行详情）；④i18n 双语键（retry/retrySuccess/retryError/retryOf、execActionRetryCli/execRetryCli*/execRetryOf），移除 redispatch 旧键 | CAP-A-19 批 5 | cli-dispatch e2e 7/7 绿（新增 3 用例：retry 正常流=克隆+血缘+retryContext+契约对齐+原执行不动+runtime 链路到 completed；非 failed/blocked 400+404；门禁阻断=新执行 blocked 留痕原执行不受影响）；server type-check 零错；前端 tsc -b 零错；execution/issue 相关 49 用例绿；契约三件套已同步（openapi +39 行） | `docs/01-需求/能力清单-v1.md`（CAP-A-19 卡批 5 增强行+§七变更记录）· `docs/roadmap/execution-fallback-plan.md`（批 5 小节） |

### feat：文档详情 frontmatter 属性面板 Obsidian 化重建（行内编辑+属性增删+标签双向同步）（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **CAP-A-06 增强：以 Obsidian 笔记属性（Properties）范式重建 frontmatter 交互（全量系统组件实现）**：①新增 `document-properties-panel`（文档详情页头部替换原「标签以 frontmatter 为准」只读提示 DocumentTagManager，组件删除）——面板壳走系统 `SidebarPanel`（折叠动画/action 槽计数），行走 `PropertyRow`（原语扩展三个可选槽位：className/labelClassName/childrenClassName，向后兼容，本卡用固定键列 w-30 + 值列 flex-1）；类型化值编辑器：text/number 行内 `Button ghost` 点击进入 `Input` 编辑（Enter/失焦提交、Esc 取消、number 回型防引号降级）、list 型 `Badge secondary` chip 化增删（逗号批量）、boolean 型系统 `Checkbox`、date 型本地化显示；行尾 hover 删除属性；`+ 添加属性` 行——键名走系统 `Combobox`（可检索建议+自由输入自定义键、已存在键过滤）替代原生 datalist，值编辑器按所选键类型切换（list=逗号分隔 Input/date=系统 `DatePicker`/boolean=Checkbox/text=Input，`getPropertyKeyType` 键→类型推断）；系统镜像键（title/status/project/module/short_id）只读防审批流绕行；仅作者可编辑，访客只读；畸形 YAML 降级警示禁写回；②`mdx-frontmatter` 新增 `parseFrontmatterProperties`（有序全量+类型推断+Date 识别）与 `setFrontmatterProperties`（顶层键增删改写回，null/空串/空数组=删键），修 `mergeFrontmatter` 未知键嵌套 `custom:` 回写漂移为顶层扁平回写；**发现并绕过 gray-matter 4.0.3（js-yaml 3）状态 bug**：进程内首次解析抛错后对畸形 YAML 静默降级（data={}原文当 body），以自提边界块+空数据回退签名确定性闸门防护（畸形时拒绝写回防残块吞入正文）；③`metadata-sync` 标签 DB 镜像升级全量跟随——frontmatter 唯一真相，差集计算抽纯函数 `tag-mirror.computeTagMirror`（toCreate/toAttach/toDetach），detach 补齐（原 attach-only 半同步），同步 toast 改 ±N 口径；④视图页接 `useUpdateDocument` 仅写 content，保存后既有 syncMetadata 副作用自动跟随标签镜像 | CAP-A-06（文档基础面增强）· 支线 UX | 前端全量 111 文件 586 用例绿；新增 `mdx-frontmatter.test` +10 条（类型推断/只读键/扁平回写/增删改写回/畸形闸门/首次建块）、`tag-mirror.test` 5 条（建挂摘差集/空目标全摘/复挂）、`document-properties-panel.test` 9 条（渲染/chip 删改/行内编辑/布尔切换/属性新增/镜像键只读/畸形降级/非作者隐藏/空只读不渲染）；tsc -b 零错；eslint 0/0（余 ApprovalAction 存量警告）；lint 六件套过（lint:tokens 正则形状误报以 \s 改写规避） | `docs/01-需求/能力清单-v1.md`（CAP-A-06 增强行）· `docs/01-需求/测试映射矩阵-v1.md`（GAP-T-33） |

### feat：文档详情接入 Chapter Scrubber 正文左缘刻度导航（H1-H6 区分）（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **ChapterScrubber 升级 + 文档详情集成**：①ui 原语扩展 `Chapter.level`（1-6 可选）——刻线静息长度按层级递减（H1 满长→H6 35%，hover 波峰长度统一），预览卡自动加 H{n} 角标，aria-label 带层级，向后兼容；②document-view-page 正文滚动区左缘挂刻度轨（≥lg 视口且 ≥2 标题渲染），数据与目录同源（useTocSections/extractHeadings H1-H6），rAF 节流 scroll 监听驱动 currentIndex（阅读线=视口顶下 96px，取最后越线标题），点击按 DOM 标题序号平滑跳转 + 同步 hash 与目录高亮；行距随章节数自适应（最高约 560px 防长文档溢出） | CAP-D-03（文档知识）· 支线 UX | `tsc -b` 零错；eslint 0/0；lint:tokens/palette/spacing/icons 过；document+mdx 25 用例绿 | `COMPONENTS.md`（ChapterScrubber 条目补 level props） |

### fix：文档详情页目录恒空（章节索引无写入方，目录改客户端同源提取）（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **document-view-page 目录数据源切换**：目录原读服务端 DocumentSection 索引（`useDocumentSections`），但该索引仅 `POST /sections/refresh` 一个写入口且前端从未有任何调用方（useRefreshSections 自创建即零消费）——常规创建/保存的文档章节恒空，目录恒显「暂无章节」（正文标题/任务角标走 MdxRenderer 即时提取不受影响，故仅目录坏）。改为新增 `useTocSections`：用与渲染器同源的 `extractHeadings(stripFrontmatter(content))` 客户端提取（同一 toSlug 锚点），目录与正文标题/高亮锚点天然一致；服务端索引与 refresh 接口保留（章节级关联等后续消费方可用）。注：段落级任务关联（SectionTaskLinksList）依赖章节索引，索引空时该能力本就退化，属既有缺口未在本批扩修 | CAP-D-03（文档知识） | `tsc -b` 零错；eslint 0/0；document+mdx 模块 25 用例绿 | — |

### fix：AI 分析报告弹窗过窄（DialogContent 基类宽度覆盖）+ 同类三处（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **四枚被压窄的弹窗补 `keepDefaultWidth={false}`**：DialogContent 基类默认附加 `sm:max-w-md`，Tailwind 响应式变体在样式表中排于基础工具类之后，消费方裸写的 `max-w-2xl/3xl/xl` 在 ≥sm 视口全被覆盖回 448px——AI 生成需求分析报告弹窗（intake/analysis-draft-dialog，恢复作者意图 672px）、GitHub 集成配置（576px）、Linear 集成配置（576px）、Linear 项目表（768px）四处同理批修，沿用 run-details-dialog 等既有 `keepDefaultWidth={false}` 惯例 | CAP-P-01（需求分析代写） | `tsc -b` 零错；eslint 0/0；lint:tokens 过；intake 模块 15 用例绿 | — |

### UX：详情正文自定义字段分区下沉 + 执行项/子任务/动态/评论可收缩（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **正文分区治理（用户实测裁决）**：①**自定义字段下沉正文**——CustomFieldsPanel 从右栏 SidebarPanel 卡改为正文分区（描述下方、执行项之前），形态对齐执行项/子任务分区（px-6 分区头 + ListTree 图标 + 计数 + 编辑铅笔 + 收缩箭头），行值由 truncate 改 break-words 右对齐（长文本如复现步骤不再截断），编辑态/保存链路不变，无 fieldSchema 类型整块不渲染；②**正文四分区可收缩**——执行项（ExecutionItemsPanel）与子任务（SubTaskSection）头部加收缩箭头（+ 新增时自动展开分区），动态+评论（ActivityFeed，task/bug 两页共用）头部右置收缩箭头、时间线与评论输入整段折叠；收缩动画统一 grid-rows 0fr/1fr 手势（对齐 SidebarPanel 既有口径）；③新增 `common.expand`/`common.collapse` 双语键 | 支线 UX 手感统一（详情正文治理） | `tsc -b` 零错；eslint 0/0；lint:tokens/semantic/palette/spacing/icons 全过；activity+issue 模块 28 用例绿；zh/en 键对称 0/0 | — |

### fix：任务详情负责人加载/指派全链失效（core-model 改名漏网路径）（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **team-member-api 四处手写路径跟随 issue 改名**：`/issue-assignees/task/...` → `/issue-assignees/issue/...`（GET 指派列表 / DELETE 移除指派 / GET watcher 列表 / DELETE 移除 watcher）——fix/core-model-refactor 服务端路由改名时前端手写路径未同步，导致任务详情右栏负责人不回显（列表 404 → primary 恒空）、指派看似不保存（POST 本就正确、静默落库，但回查列表 404 UI 永不刷新）、换人时旧负责人不移除；watcher 链路同批修复。教训：手写前端路径不参与契约校验，改名批次需全仓扫 `api.(get\|post\|delete)` 字面量 | CAP-A-05（V3 身份统一收口善后） | `tsc -b` 零错；eslint 0/0；与 openapi.json 九条 issue-assignees 路径逐一核对一致 | — |

### UX：issue 详情右栏折叠统一 + 建议栏移除 + GitHub 集成归位外部集成（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **详情右栏三分改造（用户实测裁决）**：①全分区可收缩达成——唯一不可收缩的 GitHub 集成独立 Card 从右栏摘除；②标题图标补齐——`PropsCard` 增 `icon`/`iconClassName` 透传（属性区补 SlidersHorizontal，task/bug 两页同），外部集成区补 Blocks 图标（关联文档/自定义字段/验收契约原有图标不动）；③**建议栏整体取消**——task/bug 详情页静态 SuggestionsCard 摘除（纯展示假建议，无交互价值），property-panel 死导出一并清除（unified-create-dialog 的 AI 建议卡为本地实现不受影响），孤儿 i18n 键 10 枚双语对称清理；④**GitHub 集成嵌入外部集成**——github-panel 拆出 `GithubPanelEmbedded` 子卡（形态对齐 TaskLinearPanel，纵向单列：repo 输入+刷新/新建 PR 行内表单/紧凑 PR 行），Card 完整版保留给集成页与设置页，嵌入版文案新增 `github.panel.*` 双语 12 键（Card 版硬编码存量不动）。行为注记：GitHub 子卡随外部集成区挂 `task.projectId` 之下，无项目收件箱任务不再显示（原独立卡显示，属集成区项目域语义修正） | 支线 UX 手感统一（详情右栏治理） | `tsc -b` 零错；eslint 0 错 1 存量警告（use-execution 未触碰文件）；lint:tokens/semantic/palette/spacing/icons/ui-governance 全过；issue 模块回归 10 用例绿；zh/en 键集合对称 0/0 差异 | `COMPONENTS.md`（PropertyPanel 套件条目更新） |

### fix：发版详情「圈定发版范围」清单溢出压底栏 + 不可滚（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **release-trace-section ScopeEditor 滚动约束修正**：`max-h-64` 原挂在 ScrollArea 根容器上，但 base-ui 配方根容器高度不定时 Viewport 的 `h-full` 百分比失效——viewport 被全量任务列表撑高溢出根容器下缘（根无 overflow-hidden），导致清单与「已选 N/取消/保存」底栏重叠、底栏无法点击、viewport 自身无溢出滚动失效；改为任意变体 `[&_[data-slot=scroll-area-viewport]]:max-h-64` 把高度约束直接落在 viewport 上（仓库已有 project-team-page 先例口径），短列表仍自适应高度 | CAP-K-03（发版前因后果区） | `tsc -b` 零错；eslint 0/0；release-pages.test 6 用例绿 | — |

### CAP-A-19 执行侧兜底改造：失败感知+悬挂对账+验收供给侧四批（2026-09-15 夜航）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| server+cli | **助手 CLI 派发载荷修复（预热）**：sendViaRuntime/dispatchExecution 两处派发补齐 providerId（用户定向或守护进程首个 CLI 通道）与 workspaceRoot（守护进程注册根缺失时回退项目工作区三级配置 ProjectWorkspace→git.workspaceRoot→Repository）；字段缺失时 server 侧抛可读 400 指引；worker 报错精确化只列缺失字段 | CAP-A-19 | assistant 单测 24 用例（新增 3）+ assistant-cli-chat e2e 3 用例 + worker 4 用例全绿 | `docs/roadmap/execution-fallback-plan.md` |
| server+frontend | **批1 失败感知与一键重试**：notification-event-subscriber 订阅 execution.run.updated（failed/blocked 定向通知发起人+负责人，NOTIFY_EXECUTION_AUDIENCE=project 可切全员）与 approval.requested；受众排除订阅枢纽已覆盖用户防双条；网关转发两事件至前端（死订阅根因治愈）；execution-items-panel 改监听真实事件；useExecutionRuns/useIssueExecutions/run 详情非终态轮询兜底；执行中心 failed/blocked 行「重新派发」+ 助手失败卡「重试」；通知点击跳转工单/项目；未读数 60s 轮询兜底；新增全局断线横幅 ConnectionBanner | CAP-A-19 | notification subscriber 16 用例（新增 5：订阅断言/受众去重/completed 不发/审批通知/project 模式）+ 前端 assistant/notification 50 用例全绿 | 契约：apm-shared domain-events 补 ApprovalRequested 常量与两事件 payload schema |
| server | **批2 悬挂对账 watchdog**：AppModule 挂 @nestjs/schedule；新增 ExecutionReconcileService（2min 周期）——①pending 派发超 TTL（24h，EXEC_PENDING_TTL_MS 可配）置 expired+关联 run 收敛 failed；②AI 来源 in_progress 超阈值（5min，EXEC_STALL_THRESHOLD_MS 可配，裁决缩短默认超时）且守护进程心跳离线 → 收敛 failed（在线不误杀、人工执行项豁免）；③WorkflowService reconcileStalledRuns（5min 自挂调度，running 超 24h 置 failed）；收敛统一出口 publish runtime.execution.result 复用既有结果链路（failExecution+助手占位原位替换+失败通知）。取消语义修正：cancelExecution 由 blocked 改 superseded 终态；越权修复：runs 写端点五处补 getExecutionRun 归属校验；updateExecutionRun 加 force 内部选项（DTO 不可达） | CAP-A-19 | execution/workflow/cli-dispatch 8 套件 75 用例全绿（新增对账 4：TTL 过期/离线收敛/在线不误杀/人工豁免） | 裁决记录见方案文档 §六 |
| server+frontend | **批3 验收标准供给侧**：assistant-silent 新增 acceptance-draft 场景（issueId 侦查/创建面板草稿双模式，3~6 条可检查标准，绝不编造）；POST /acceptance/issue/:issueId/apply-criteria 人确认落库（找/建活契约增量写入同文去重）；派发前验收门禁 assertDispatchGate——无活契约或 0 条标准均 400 阻断（裁决先按严格要求）；CreateIssueDto 加 acceptanceCriteria 创建即落契约；创建面板 task/bug 加验收标准编辑区+AI 生成；任务详情验收卡空契约区加 AI 代写主入口+AcceptanceDraftDialog（生成→勾选→确认三步） | CAP-A-19（兑付 CAP-B-01/B-02 供给侧） | server acceptance/issue/cli-dispatch 96 用例全绿；前端 assistant 46 用例全绿 | 契约：openapi.json 重导出+双端类型再生，contract:check 零漂移 |
| frontend+server | **批4 一致性清理**：摘除老 execution 前端模块死 API（retry/escalate/adjustParams 等指向不存在路由）与 execution-recovery-dialog/use-execution-recovery/execution-run-panel 死组件及 approvals 死 hooks；决策收件箱过滤过期提案+resolve 拒绝过期决议；proposal.create 发布 decision.proposal.created→网关转发→shell 失效 decisions 查询（收件箱/徽标实时刷新）；cli-executor 的 ai.stream 补 userId（惰性解析 run 属主）实现进程内执行前端可见 | CAP-A-19 | server decision/cli-dispatch 37 用例 + 前端 issue/execution 45 用例全绿 | — |
### feat：颜色/头像选择器自建组件——ColorPicker 新建+AvatarPickerField Popover 化+消费方全替换（2026-09-17）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **两个选择器自建收编**（shadcn base-vega/coss/reui 三库均无现成品，reui color-picker 付费墙，React Aria 与 base-ui 唯一基线冲突，故自建）：①新建 `ui/color-picker.tsx`——照 coss DatePicker 组合范式（Popover+受控组合件），react-colorful（新依赖，2KB）+ 预设色板 + Hex 输入（非法回滚），`allowCustom=false` 退化为纯预设选择；`DEFAULT_SWATCHES`=原 tag-manager TAG_COLORS 15 色用户数据色（宪法 §5 豁免注释随迁）；②`ui/avatar-picker-field.tsx` 改造为 Popover 组合件——触发器圆钮，弹层=内置 12 头像网格+随机生成种子+自定义 URL 预览+清除，`nice-avatar:`/`avvvatars:` 前缀对任意种子字符串确定性出图（随机生成直接落库种子），导出 `AvatarGlyph` 复用；③消费方替换：颜色 2 处（issue-types-section 原 `<input type="color">`、tag-manager 自绘网格，均 `allowCustom=false`），头像 4 处 API 兼容零改动（profile/member-create/member-detail/design-system） | UI 组件基建（2026-09-16 拍板） | tsc -b 零错；eslint 5 文件零错；palette·tokens·ui-governance·registry 治理脚本全绿；issue-types 相关单测 5/5 | `COMPONENTS.md` ColorPicker 新增行 + AvatarPickerField 行更新；design-system 页 Forms 区新增 ColorPickerShowcase |

### CAP-A-17 快捷键体系：全局键位注册表 + 设置页自定义 + 散落监听收编（2026-09-15）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **快捷键基建 `shared/hotkeys/` 四件**：①`hotkey-definitions.ts` 注册表单一真相源——global 组两动作（command-palette mod+k / ai-assistant alt+a）+ readonly 上下文参考条目（文档保存 mod+s / 决策卡批阅 / 创建面板 Ctrl+1..6）；②`hotkey-store.ts` zustand persist（`hotkey-storage`，仅存 overrides）——getEffectiveCombo（override 优先回落缺省）/ findConflictingActionId 单点冲突检测 / getKeyConflicts 全量兜底；③`hotkey-utils.ts` 纯函数——eventToCombo 归一化（ctrl/meta→mod、修饰序固定、单修饰键与纯 Shift+字母不算录制完成）、formatComboForDisplay（isMac 符号化 ⌘/⌥/⇧）、isEditableTarget（含 attribute 兜底，jsdom 不实现 getter）；④`use-global-hotkey.ts` 模块级单例监听器 + handler 注册表——带 mod/alt 修饰不做输入框抑制（浏览器级语义）、无修饰单键让位输入态 | CAP-A-17 | hotkey-utils 12 条 + hotkey-store 8 条 | — |
| frontend | **设置 · 快捷键分区**（`/app/settings/shortcuts`，groupGeneral 组）：全局动作行内「修改」进入录制态（capture 拦截全局、Esc 取消、单修饰键继续等待）→ 组合键归一化后与其他动作生效键冲突检测——撞车行内红字不落库；改动即时写 store 即时切键；单项重置 + 全部恢复默认 + 「已自定义」标记；上下文参考条目只读展示（Kbd/KbdGroup 平台感知渲染） | CAP-A-17 | shortcuts-section.test 6 条（渲染/录制落库/Esc 取消与单修饰/冲突红字不落库/单项重置/全部重置） | — |
| frontend | **三处散落监听收编 + 三面脱钩治愈**：①command-palette-provider 手写 Ctrl+K/Ctrl+/ 监听 → `useGlobalHotkey('command-palette')`（**Ctrl+/ 双键随收编移除**，help 本就误写、单一键位足够）；②shell-layout Alt+A 手写监听 → `useGlobalHotkey('ai-assistant')`；③bottom-dock 伪造 Ctrl+K KeyboardEvent hack → 改 dispatch 既有 OPEN_COMMAND_PALETTE_EVENT（事件常量拆独立文件 `open-command-palette-event.ts` 防测试链拉进 i18n 实例，provider re-export 兼容 TabBar），Dock 搜索按钮 label 键位改注册表动态解析；④help 页快捷键表从注册表生成（随用户自定义实时反映），**删除 4+1 条从未实现的假键**（Ctrl+N/P/B、Ctrl+Shift+A、Ctrl+/）；⑤命令面板 cmd-ask-ai 硬编码 'Alt A' → `hotkeyId` 声明式字段（shell-layout 消费时解析） | CAP-A-17（help 假键治愈） | command-palette.test 更新 1 条 + 新增收编回归 2 条（缺省 Ctrl+K 切换且 Ctrl+/ 不再响应 / 自定义 mod+j 后旧键失效新键生效）；bottom-dock.test 修复 import 链后 42 条绿 | `docs/01-需求/能力清单-v1.md`（CAP-A-17 卡）、`测试映射矩阵-v1.md`（GAP-T-31） |

### 项目列表页 / 文档列表页 i18n 补齐（2026-09-15）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **两页遗留硬编码文案全量 t() 化**：①**documents-page**：模块级 CATEGORY_CONFIG/STATUS_CONFIG 的 label 改存 i18n 键（labelKey，渲染处 t() 解析，子组件 DocumentCard/DocumentListItem 补 useTranslation）；页头（文档管理/新建文档/metrics）、加载与错误态、同步失败预警条（标题/条目/知道了/还有 N 个/关闭 aria-label，新增 syncBanner.* 插值键）、统计卡四标签、筛选菜单（状态/分类/全部分类/搜索占位）、空态双分支、卡片与列表行操作（查看/编辑/删除/预览/版本历史）、公共文档兜底全部接键；日期 toLocaleDateString('zh-CN') 硬编码改 i18n.language。大量键（document.title/noMatch/actions.* 等）本已存在双语、页面从未消费，本次直接接上；补缺键 document.rejected/noMatchDesc/searchPlaceholder/publicDoc/categories.testing（原只有 test，与后端枚举 testing 不匹配）/filter.status/filter.category/syncBanner.*/export.label。②**project-list-page**：AI 执行中胶囊（title+计数插值）、错误态回退文案与重试按钮、空态（'No projects found'/'New Project' 英文硬编码→messages.noProjects/project.create）、批量归档确认四文案（新增 project.archive.* 插值键）、分页 'Showing X–Y of Z projects'（新增 pageShowing 插值键）；清掉 searchPlaceholder 的 `\|\| '英文'` 死 fallback。新增键全部双语对称（zh/en 各 20 键：project.status.active/project.export.label 等此前 t() fallback 直接漏英文的键一并补上）。 | 支线 UX 手感统一（i18n 治理） | `tsc -b` 零错；eslint 0/0；documents-page/project-list-page 测试修 mock 后绿（t mock 非字符串第二参返回键名，documents mock 补 i18n 对象）；全量 vitest 536/536；zh/en 键集合对称校验 0/0 差异；lint:tokens/semantic 过 | `CHANGELOG.md` 登记 |

### 空态批次二：任务页四视图统一 + 验收中心改造 + 甘特空态标准化 + 死组件清除（2026-09-14）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|------|------|-----------|---------------|------------|
| frontend | **任务页四视图空态按页面层级标准统一**：tasks-page 在视图分发前页面层接管空态——工单池为空（allTasks=0）走 A 类整页空态（`EmptyState variant="page"` + IconStack CheckSquare/info 蓝 + 新建任务入口，四视图共用同一形态）；筛选后为空（filteredTasks=0 且有数据）走 C 类紧凑空态（SearchX + 清除筛选一键重置 search/conditions/completedFilter）；列表/看板/甘特/表格四视图不再各自为政（原四套形态：列表「No tasks」无插画、看板五列「拖拽卡片到此列」、甘特浅灰条英文、表格一行灰字英文）。看板列内「拖拽卡片到此列」保留（有任务时的列级 drop 提示，非页面空态）。 | 支线 UX 手感统一（空态三分场景治理·续） | `task-gantt.test`/`gantt-chart.test`/`acceptance-list-page.test`/`task-page.test`/`empty-state.test` 13 用例绿；全量 vitest 536 用例仅 project-gantt 英文断言 1 挂（已同步改中文断言复跑绿）；`tsc -b` 零错；eslint 0/0；lint:tokens/palette/semantic/spacing/icons/registry/ui-governance 全过 | `CHANGELOG.md` 登记；i18n 双语键补齐（zh/en：task.empty.none/noneDesc/filtered/filteredDesc、acceptance.emptyFiltered/emptyFilteredHint、common.clearFilters） |
| frontend | **验收中心列表页 empty 改造**（上批 A 类清单遗漏）：空态由页面接管——契约池为空走 A 类整页空态（page 变体 + IconStack ShieldCheck/accent-green + 新建验收契约入口）；筛选后为空走 C 类（SearchX + 清除筛选重置 search/status/risk/page）；列表/表格双视图内空态统一改 C 类口径（原盾牌圆块「暂无验收契约」误用于筛选场景）。 | 支线 UX 手感统一（空态三分场景治理·续） | 同上（acceptance-list-page.test 3 用例绿，断言仅查询参数不受影响） | 同上（acceptance.emptyFiltered 双语键） |
| frontend | **甘特空态标准化**：`GanttChart` 空态由浅灰条改为 `EmptyState` card 形态（CalendarRange muted 圆块 + dashed 边框），新增 `emptyDescription` prop；task-gantt/project-gantt 适配器文案中文化（「暂无可排期的任务/项目」+ 设置日期引导描述），默认值同步中文化；测试断言同步。**共享视图组件英文空态中文化**：TaskSimpleList 默认 emptyMessage（'No tasks'→'暂无任务'）、TaskTableView emptyContent（'No tasks to display'→'暂无任务'，加载中文案同步）。 | 支线 UX 手感统一（空态治理·续） | `task-gantt.test`/`gantt-chart.test`/`project-gantt.test` 断言更新后全绿 | 无需（文案硬编码对齐 documents-page 口径） |
| frontend | **删除零消费死组件**：`modules/project/components/project-list.tsx`（944 行 ProjectList，零 JSX 消费，上批登记待裁决）整文件删除；`ProjectListColumnKey` 类型迁入唯一消费方 project-list-page.tsx 本地定义（11 列联合类型，口径不变）。 | 技术债清理 | `tsc -b` 零错（无残留引用）；eslint 0/0 | 无需（ProjectList 未登记 COMPONENTS.md） |
| frontend | **验收中心 / Git 仓库页整页空态撑满修正（用户实测二轮）**：两页 page 变体未撑满的根因各不相同——①验收页路由未入自管滚动清单（无 `selfScroll` handle），shell ScrollArea fill 的 Content 是 `min-h-full` 非确定高度，`h-full` 全链无法解析恒回落 min-h-100 半屏：补路由 handle + 数据分支容器改 `flex-1 overflow-auto` 内部滚动（对齐 issues/documents 口径，工具栏固定、列表独立滚动）；②仓库页经 `DataList emptyMessage` 渲染被 `w-full` + DataList 自动高度根元素隔断：空态上提到页面层拦截直挂 `flex-1 overflow-auto` 素块容器（该页本就 selfScroll，链路高度确定）。 | 支线 UX 手感统一（空态治理·续） | `tsc -b` 零错；eslint 0/0；acceptance-list-page/repository-list-page 测试绿；lint:spacing/tokens 过 | 无需（挂载模式已在 empty-state.tsx 注释与两页行内注释说明） |

### 空状态系统三分场景改造：EmptyState page/card 变体 + 整页空态撑满 + 13 页落地（2026-09-14）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **空状态全量治理（65 文件 ~90 处用法盘点后改造）**：<br>① **EmptyState 加 variant 三分场景**：page=整页主体空态（h-full 撑满父内容区 + min-h-100 兜底，配 IconStack 插画与首个功能入口）/ card=分区内·筛选无结果紧凑形态（默认，muted 圆块图标，不用插画）；AsyncState 新增 emptyVariant/emptyVisual 透传（错误态恒 card 简式）；DataList 修 emptyMessage 传完整空态元素时的「EmptyState 套 EmptyState」嵌套 bug（元素直接渲染，仓库列表页实害）；<br>② **A 类 13 页整页空态落地 page 变体 + IconStack**（各页主实体图标+语义色）：executions（Activity 蓝）/documents（FileText primary）/decision-inbox（Layers 黄，经 AsyncState 透传）/office（Bot 紫）/notification-center（Bell 蓝/Bot 紫，窄栏去内层 padding 挡板）/repository-list（FolderGit2 蓝）/workflow-list（紫）/release-list（Rocket 紫）/members（Users 蓝）/teams（Users 紫）/search 初始引导（Search primary）/help（Book 蓝）；<br>③ **C 类混态分化**（对齐 executions/release 现行范式）：documents（query/status/category 三筛选→SearchX+清除筛选）、workflow-list（search→清除）、repository-list（search/providers→清除）、search 无结果（typeFilter≠all 时给清除动作）；<br>④ **清理**：version-history/section-reference/document-task-links/document-preview-dialog 四处手绘图标+双边框冗余收敛为标准 EmptyState；project-profile-page AsyncState isEmpty 误用修复（原 children 永不渲染恒显「暂无数据」）；删除死代码 integration-list.tsx（含 barrel 导出行）；发现 project-list.tsx 的 ProjectList 组件（944 行）零 JSX 消费，登记待裁决；<br>⑤ design-system 两分区同步：Empty States 三分场景演示（page 演示容器 h-100）+ loading-states 区 AsyncState 透传演示。 | 支线 UX 手感统一（空态三分场景治理） | `empty-state.test.tsx` 新增 5 用例全绿（card 默认/page 撑满/visual 槽/AsyncState 透传/错误态恒 card）；`tsc -b` 零错；lint:tokens/palette/semantic/spacing/icons/registry/ui-governance 全过、eslint 0/0；全量 vitest 见提交记录 | `CHANGELOG.md` 登记；`apps/frontend/COMPONENTS.md` EmptyState/AsyncState/DataList 三行更新 |

### 引入 reui Sortable/IconStack 组件：拖拽排序收口 + 等距插画空态（2026-09-14）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **reui 双组件导入与系统替换（零新增依赖，@dnd-kit 三件套项目已有）**：<br>① `ui/sortable.tsx`：reui base-nova 复合式拖拽排序列表（Sortable/SortableItem/SortableItemHandle/SortableOverlay，落放一次性提交、onValueCommit 回滚快照、拖拽 overlay、键盘可达、vertical/horizontal/grid 策略、render 槽可渲染为任意容器元素）；**语义限定同列表条目重排**，看板跨列拖拽（board-view 六宿主）/文件投放/画布节点不动；<br>② **标签管理（settings.labels）**：全仓唯一原生 HTML5 拖拽残留（整行拖拽、把手纯装饰、无键盘可达、串行 N+1 回写）替换为 Sortable——tbody/tr 经 render 槽保持表格语义、GripVertical 升级为真把手（键盘可达）、持久化改为仅并发回写 order 变化项（对齐任务类型口径）；<br>③ **任务类型管理（settings）**：手搭 DndContext+useSortable ~80 行收敛为 Sortable 复合 API（onValueCommit 持久化、受控源仍为 React Query 回读）；<br>④ `ui/icon-stack.tsx`：reui 等距层叠图标插画容器（blur-[4px]→blur-xs token 化、内容定位改内联 style 避开任意值类）；EmptyState 扩 `visual` 槽（整页大空态可换插画，图标圆块形态默认不变）；落地四处：onboarding 欢迎/完成双 hero（primary/accent-green 系列感）、项目列表整页空态、文档页空态（补上缺失的视觉锚点）；<br>⑤ 顺手清理 task-card 死 `draggable` prop（BoardView 迁移后零消费）；design-system 新增 Sortable/Icon Stack 双分区 demo。 | 支线 UX 手感统一（拖拽排序/空态插画收口） | `sortable.test.tsx`+`icon-stack.test.tsx` 新增单测全绿；issue-types-section 存量测试通过；`tsc -b` 零错；lint:tokens/palette/semantic/spacing/icons/registry/ui-governance 全过、eslint 0/0 | `CHANGELOG.md` 登记；`apps/frontend/COMPONENTS.md` Sortable/IconStack 登记 + EmptyState visual 槽更新 |

### 引入 reui 复合式 Stepper 步骤条并落地四个页面变体（2026-09-14）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **Stepper 组件升级为 reui base-nova 复合配方 + 四页面变体落地**：<br>① `ui/stepper.tsx` 由自研简版（steps/current 两 prop）整体替换为 reui base-nova 复合式步骤条（注册表 `reui.io/r/base-nova/stepper.json`，仅依赖 @base-ui/react）：Stepper/StepperNav/StepperItem/StepperTrigger/StepperIndicator/StepperSeparator/StepperTitle/StepperDescription/StepperPanel/StepperContent 复合 API，支持受控/非受控、横向/纵向、completed/inactive/loading/active 四态、indicators 覆写与键盘导航（方向键/Home/End/Enter）；本地化适配：inactive 指示器 muted 底、标题随 data-state 变色、指示器/分隔线 motion-shift 过渡、分隔线 bg-border+completed 点亮；<br>② **onboarding 向导**：原「步骤 X/Y + Progress 进度条」头部替换为横向标题式步骤条，已走过步骤可点击回跳（goToStep），未来步骤禁用，completed→Check/skipped→SkipForward 指示器；<br>③ **发版详情页**：自制 pill 状态链（STATUS_FLOW 五态）替换为横向指示器式纯展示步骤条，publishing 步 loading 旋转、failed 保留链外徽章；<br>④ **boot 启动自检清单**：自制五态清单替换为纵向步骤条（标题+描述+连接线随状态点亮），success/skipped→completed、running→loading、error→红色活动步；<br>⑤ **项目接入向导**（旧组件唯一消费方）：迁移至复合 API，扫描步 loading 旋转、失败步红色指示器，自动推进语义保持不可点击；<br>⑥ design-system 展示页新增 Stepper 分区（可导航向导/状态链/纵向三 demo），COMPONENTS.md 登记 reui 组件来源基线。 | 支线 UX 手感统一（步骤条唯一实现） | `stepper.test.tsx` 4/4 绿；onboarding/boot/release/design-system 相关 4 套件 13 用例全绿；`tsc -b` 零错；lint:tokens/palette/semantic/spacing/icons/registry/ui-governance 全过、eslint 0/0 | `CHANGELOG.md` 登记；`apps/frontend/COMPONENTS.md` Stepper 行改复合 API + reui 基线说明 |

### 助手伴随式待决卡片升级为实体卡片堆 + 全新立体手卡折叠态手柄（feat/decision-card-review，2026-09-14）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **AI 助手伴随式待决卡片堆叠与折叠态重构**：<br>① **左侧待决栏改为实体卡片堆展示**：将原先在狭窄侧栏垂直流式平铺排布（`items.map` 产生截断与多余滚动）彻底改造为 `DecisionDeckStack`（实体手卡卡片堆叠），支持多层卡片立体露角、3D 翻面、顺滑盖章飞出（PASSED/REJECTED）与翻页；宽度升级为 `assistant-decision-wing`（420px/440px），高度与小周主对话框齐平，整体保持毛玻璃悬浮与立体投影；<br>② **全新实体手卡折叠夹槽手柄（Tactile Collapsed Stack Dock）**：收起待办后，摒弃原有单薄小药丸，升级为极具实体便签夹与卡片堆隐喻的高质感手柄：外层多重立体阴影、侧边伪元素模拟 2 层底牌微倾斜边缘、层叠图标、待办数量徽章（含阻塞告警呼吸动效）、竖排「待决卡片」精致中文字及展开提示，悬浮在主面板左侧，Hover 外弹并高亮，点击顺滑展开；<br>③ 补齐 `assistant-decision-strip.test.tsx` 单元测试，覆盖 compact 紧凑卡片堆、加载骨架与空态。 | 伴随式决策卡片堆升级与折叠态重塑 | `assistant-decision-strip.test.tsx` 3/3 绿，`assistant` 全套 11 文件 43 用例 100% 通过；`tsc -b && vite build` 构建打包通过；eslint 0 error 0 warning | `CHANGELOG.md` 登记 |

### 决策卡片排版修复：编号移至第二行 / 标签与按钮禁止折行 / 标题自动宽度满行折行（feat/decision-card-review，2026-09-14）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **决策卡片头部排版与折行治理**：<br>① **卡片正面头部三行分层**：第 1 行左侧紧凑展示提案人 Avatar + 提案人 Pill + 紧迫度 Chip（阻断/排队）+ 高危 Chip，右侧展示 3D 翻面按钮；第 2 行展示决策编号（`#shortId`）及相对时间/过期时间，彻底杜绝长编号与标题抢占横向空间；第 3 行标题独立占据卡片 100% 宽度，自适应利用全部空间，仅在超过整整满一行后才自然折行（彻底解决窄宽度下 3-4 字被动切断折成竖排问题）；<br>② **全系统卡片按钮与标签禁止换行**：所有操作按钮（翻面、底部动作栏、批阅条快捷通过/驳回）、状态标签徽章（Pill/Chip/Reason Chip）全量配置 `shrink-0 whitespace-nowrap`，彻底防止在各断点与弹窗卡片堆内发生字词折断换行；<br>③ **背面档案标头同步两行化分层**：第 1 行展示档案标头与翻回正面按钮（`whitespace-nowrap`），第 2 行展示决策编号与翻回快捷键提示，整洁统一；<br>④ 补齐 `decision-card-shell.test.tsx` 单元测试，覆盖三行分层、无折行约束、标题样式与翻面交互。 | 决策卡片视觉排版修复 | `decision-card-shell.test.tsx` 4/4 绿，`decision` 域全量 5 测试文件 20 用例 100% 通过；`tsc -b && vite build` 产物打包通过；eslint 与语义检查 0 错误 0 警告 | `CHANGELOG.md` 登记 |

### 决策卡片实体质感重构 + 3D翻面/堆叠/滑走动效 + 全屏悬浮卡片堆批阅模式（feat/decision-card-review，2026-09-14）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **决策卡片现实实体质感与 3D 翻面重构**：<br>① `DecisionCardShell` 升级：采用竖直黄金比例（560px 高度实体手卡比例），新增现实手卡拟物夹槽视觉、高光多重立体阴影、卡片编号刻印（`#DEC-xxx`）；<br>② **3D 双面卡结构（Card Flip）**：正面呈现决策核心陈述、差异主体、影响指标与翻面指引，背面**绝对定位覆盖**呈现完整证据溯源档案与技术细节，解决正反面流式重叠 bug；支持点击右上角角标/底部横条或按 `F` 键顺滑 3D 旋转翻转（全局注入 `decision-card.css` 纯 CSS 3D 硬件加速）；<br>③ **轻量化卡片堆叠（Deck Stacking）与动效**：新增 `DecisionDeckStack` 组件，支持多张卡片层次堆叠（顶层焦点+后排底牌物理立体微倾斜露角）、印章落下（绿色 PASSED / 红色 REJECTED 盖章动效）、向右/向左顺滑滑出飞走（Dismiss Animation）、上一张/下一张翻页导航；<br>④ **决策收件箱「批阅」功能与全屏悬浮卡片堆**：收件箱顶部与详情区新增【卡片批阅】按钮，点击弹出毛玻璃全屏悬浮层 `DecisionReviewModal`，用户可集中逐张勾选来过，支持进度指示与快捷键（`1/Enter` 通过、`2` 驳回、`F` 翻面、`←/→` 翻页、`Esc` 退出），批阅完展示清空成就反馈；<br>⑤ 双语 i18n 补齐（`decision.review.*` 16 个双语键）。 | 用户体验改进 / 决策卡片实体化 | `decision-deck-stack.test.tsx` 6/6 用例绿、`decision-review-modal.test.tsx` 3/3 用例绿、`decision-card-gate.test.tsx` 5/5 用例全过；`tsc -b` 0 错误；全套 lint（palette/semantic/arbitrary/ui/spacing/icons/eslint）0 错误 0 警告；全量构建 `vite build` 通过 | `CHANGELOG.md` 登记 |

### 主线四项开工落地——管道项目聚焦 / 里程碑与发布轴 / 分析阶段补足 / 仪表盘去重（feat/mainline-four-initiatives，2026-09-13）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **CAP-A-15 管道项目聚焦**：侧边栏 pipeline 六站分组头部新增项目聚焦筛选器（「全部项目/某项目」，NativeSelect，折叠态隐藏）——新建 `shared/layout/pipeline-focus.ts`（zustand 不持久化 + `usePipelineProjectFilter()`：URL `?project=` 优先、store 兜底、setProjectId 双写 store+searchParams 保留他参；URL→store 写回用边沿检测防路由传播窗口旧参灌回）；六站统一口径消费：intake/acceptance 查询携带 projectId（服务端过滤）、issues/repositories 以聚焦值预置页内筛选初值、executions projectFilter 初值对齐、releases 统一 `?project` 参数名并**移除「未选项目=空列表」**（无参返回全部，useReleases 解除 enabled 门禁）；**明确不引入全局当前项目**（与项目详情页 ProjectContextBar 上下文不打架） | CAP-A-15 追加切片 | pipeline-focus.test 6 条 + intake 页 2 条 + acceptance-list 2 条 + release-pages 参数改写；全量 98 文件 504 用例绿 | 能力清单 CAP-A-15、GAP-T-27 |
| server | **①后端三端点可选 projectId**：documents/acceptances 列表过滤参数补齐服务端实现（query 定义已有、service where 补过滤，缺省行为不变）、releases 列表 projectId 改可选（缺省=全部项目跨项目流水） | CAP-A-15 / CAP-A-16 | document e2e +32 行用例、acceptance e2e +25 行用例（过滤断言） | — |
| server · frontend | **CAP-A-16 里程碑与发布：计划-交付轴整合**：语义裁决 Iteration=时间盒 / Milestone=计划轴节点 / Release=交付物——schema `Release +milestoneId`（SetNull 级联，迁移 20260913160000 已应用 dev.db+template.db）；release 创建/编辑携带里程碑（跨项目 400 守卫）、列表详情 include milestone 投影；milestone.service 列表聚合关联 releases；前端项目详情 milestones tab 升级**「里程碑与发布」时间轴**（迭代区间条+里程碑五态节点+关联发布标记+未计划区，i18n 更名）；release 表单加可选「所属里程碑」下拉、列表/详情显示归属；**sprint 死代码清理**（sprint-page/sprint-list/use-sprints/sprint-api 四文件删除，调用后端不存在的端点且路由未注册） | CAP-A-16（新卡 doing） | release-service spec 扩至 11 条（里程碑关联/跨项目 400/SetNull）+ milestone.service spec 2 条 + project-milestones-page.test 4 条 + release-pages 里程碑用例 | 能力清单 CAP-A-16 新卡、GAP-T-28；Prisma schema 注释 |
| server · frontend | **CAP-P-01 四期分析阶段补足**（「调研→分析→设计→拆解」中「分析」的结构性空档收口）：①requirement-pipeline 剧本插 `analysis` 阶段（clarify→**analysis**→breakdown，三访谈问题：可行性/影响面/风险，工件 category=analysis）；②Document category 扩 `analysis` 枚举（六处 DTO @IsEnum/@ApiProperty + openapi 五 schema 一 query，表单加「分析报告」选项）；③静默场景 `analysis-draft`——读调研/澄清工件 + **按项目契约绑定做影响面 grounding**（K 线咬合：ContractFileBinding 是文件级影响面权威来源），AI 代写结构化分析（可行性判定 go/conditional/no-go + 影响面 + 依赖 + 风险 + 验收预清单），前端对话框预览→人确认→组装 markdown 落 analysis 文档（「代写→人确认」主轴语法）；④intake 页升级：管道四步说明扩五步（插「分析评估」）、「AI 生成分析报告」入口、分析报告独立列表区；⑤intake-composite 组合件扩 `analysisDocumentId` 工件（拆解以分析报告为 grounding：acceptancePreview 供 criteria、high 风险注入任务描述⚠提示） | CAP-P-01 四期 | silent spec 36 条（+3：analysis-draft 正常流含绑定注入/缺工件 400/grounding 断言 + intake-composite 三工件）+ playbook e2e 7 条（五阶段流转 + analysis 工件 category 断言）+ 前端 hook 4 + dialog 4 + intake 页 15 条 | 能力清单 CAP-P-01 四期、GAP-T-29；§2.2 管道② |
| frontend | **CAP-C-06 仪表盘与分析页定位分工去重**：Analytics Overview 移除与 Dashboard 同源双份渲染的五项（活跃任务/平均健康分/AI 周用量 StatCard、项目健康表、风险聚焦卡），保留独有回顾性内容（项目总数 + 档案健康 + 剧本健康）；四个 mock Tab（Cost/Quality/Risk/Team，无后端支撑）降 **DEV-only**（`getAvailableAnalyticsTabs(isDev)` 纯函数过滤，生产构建不出现，默认选首可用 Tab）；页标题硬编码 "Analytics" 改走 i18n（`analytics.title`=「分析」）；后续真有报表场景再扩 dashboard 端点做实（不另起 analytics 后端） | CAP-C-06 追加 | analytics-page.test 重写 4 条（生产仅 overview/DEV 四 tab/去重断言/标题 i18n）；全量绿 | 能力清单 CAP-C-06、GAP-T-30 |

### 页面风格统一（执行记录/发版交付）+ 发版前因后果关联 + 全系统空态专题（2026-09-13）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **执行记录页按 list-page 模板重写**：PageShell(overflow-hidden)+selfScroll 路由、PageHeader metrics 计数、QuickCardsToggle+StatsCard 六项 KPI（持久化开关）、ToolbarRow+useToolbarViews（状态/Agent/项目筛选收进下拉+搜索，快照持久化）、DataList 行原语列表（行点击弹 RunDetailsDialog，右键菜单承载总览/验收跳转/取消执行）、空态两分支（无记录引导去任务页/筛选无结果清筛选）+ 全量 i18n（消灭页面全部硬编码英文）；执行状态视觉提取为 `executions/components/run-status.tsx` 共享件（页面与发版链路共用，收编口径注释随迁） | CAP-K-03 配套 / 宪法 §10.3 | 全量 93 文件 476 用例绿（task-rows loading 断言随骨架化同步）；lint 五项 0 违例 | `apps/frontend/COMPONENTS.md`（EmptyState/AsyncState/DataList 行 props 更新） |
| frontend | **发版列表页 ToolbarRow 化**：项目/状态筛选+搜索收进 filterMenu（项目真相源保持 URL searchParams，视图快照 apply 时写回）、metrics 计数、SkeletonTable 加载、空态三分支补 action（创建发版/清筛选）；**发版详情页新增「前因后果」关联区**（`release/components/release-trace-section.tsx`）：scope.issueIds → 每任务实时验收状态（listByTask）+ 执行运行记录（/execution/runs?issueId=，useExecutionRuns 补 issueId 类型）+ 成本汇总，纯前端组合现成端点零后端契约变更；draft 态内联圈定范围编辑器（勾选项目任务→useUpdateRelease({scopeIssueIds})，补齐 CreateReleaseRequest 已支持但 UI 缺失的入口）；展开行验收单/执行记录子列表分别跳验收详情与复用 RunDetailsDialog；`void scopeIds` 丢弃位替换为实渲染 | CAP-K-03 | release-pages.test 11 用例（含列表空态引导/门禁面板断言天然兼容新结构） | — |
| frontend | **空状态专题补足（宪法 §9/§10.2 三态收口）**：基座——EmptyState 加 `icon` prop（muted 圆块规范形态，design-system「Empty States」节样例同步为组件直用消除第二实现）、AsyncState 默认文案 i18n 化（common.loadFailed 键新增）+emptyIcon 透传、DataList 内建空态升级 EmptyState 形态（消灭 'No items' 英文默认，新增 emptyIcon/emptyDescription props）；迁移 14 处手写空态——acceptance 列表/详情×3、task-rows（含 loading 换 DataListSkeleton）、workflow 列表、PR 列表（双语键 git.pulls.*）、office、search×2、settings 集成/记忆、project-list（含 loading 换 SkeletonList）、sprint-list（硬编码中文 i18n 化）、analytics×2、通知中心、run-event-list；豁免四处（github-integration 死代码页/cli-dispatch 按钮禁用态/ai-management 功能性引导态/delivery dev-only mock 页） | 宪法 §8/§9/§10 | 同上全量绿；JSON 双语键 node.exe 解析校验通过 | design-system 展示页两节同步 |
| frontend | **实机验收修复（发版详情 + 分析页，截图驱动）**：①发版前因后果区——scope 为空且编辑中不再叠加渲染空态（圈定列表与 EmptyState 重叠根因）、范围圈定器任务状态名改走 StatusDefinition 动态解析（`useStatuses` key→name，修复六站自定义状态键如 backlog 回退英文原文）、「圈定范围/提交门禁」按钮由仅图标 HeaderActionButton 改带文字 outline Button（可读性）、状态进度链居中+连接线去 gap 间隙连贯；②分析页——Overview Tab 数据源由 404 契约提案端点 `/analytics/overview` 切换为已实装 `/dashboard/overview`（七段真实字段映射：项目总数/活跃任务/AI 周用量/平均健康分四卡 + 项目健康表 on_track/at_risk/off_track 徽标 + 风险聚焦卡 severity 徽标与缓解率，重试按钮由整页 reload 改 query refetch）；`useAnalyticsOverview` 加 `enabled: isMockModeEnabled()`（真实模式不再发 404 请求，成本/质量/风险/团队四 Tab 静默回退形态数据）；工具栏 Tab 标签中文化缩短（Team Activity→团队）修复截断 | CAP-K-03 / 分析页可用性 | analytics-page.test 重写（dashboard hook 注入 + 中文标签断言）；全量 93 文件 476 用例绿；lint 0 | — |

### CAP-C-08 需求入口登记——AI 表面（实时盯盘 · 代理 · 叙述 · 演示）（2026-09-13，**未开工**）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| （登记条目，**代码零改动**） | **CAP-C-08 新卡 doing**：AI 表面由 mock 形态实验升格为真实驾驶舱——①实时盯盘（同事工位卡 + 六站管道泳道 + 待你拍板区，接真实执行/门禁/阻塞数据）②代理态（待办就地拍板 + 输入框接既有 assistant + AISlot 保留，**不开第二个拍板入口**）③叙述层（静默场景 `surface-narration`：事实与叙事分离·数字由事实层算好注入 / TTL≈30s+记账 / 模型挂掉回落确定性模板不白屏 / 不主动弹窗）④演示模式（**新手首次上手**，先回放后实况；回放零 token 零 runtime 依赖） | CAP-C-08（†供血 B 全线） | — （登记期，尚无实现与测试；GAP-T-26 已登记验收义务，S1/S2 子项列为 P0） | `docs/01-需求/能力清单-v1.md`（新增 CAP-C-08 卡 + C 线卡数勘误 6→8 + 候补区条目升格 + 变更记录）、`docs/01-需求/测试映射矩阵-v1.md`（C 线补 C-07/C-08 行 + GAP-T-26 登记）、新增 `docs/02-架构设计/策略/AI表面-实时盯盘与演示-设计纪要-v1.md` |
| （登记期勘明，待 S1 落地） | **两项关键前置事实**（登记期代码级核验，非实现）：①**实时瓶颈不在后端**——message-bus 已发 `execution.step.*`（步骤级）/ `terminal.output`（chunk 级流式）/ `runtime.execution.event` / `runtime.heartbeat` / `approval.*` / `acceptance.*` / `release.approved`，而前端 `event-client` 订阅白名单**硬编码 12 条**、全仓 `useEventSubscription` 仅 4 处，执行族事件**零订阅**（UI 靠轮询）→ 改造是**扩订 + 补事件名单源**，非造链路；②`terminal.output` 现注释为「前端已无消费者，待 Terminal 退役一并摘除」，但它是**当前唯一 chunk 级管道**，决定盯盘粒度天花板 → 裁决**先接后删**，未确认接替前不得摘除。同时确认 `ai-surface` 十文件 **215 处硬编码裸色**违反 `DESIGN.md`，而 `check-palette` / `check-semantic` **实测通过**（只扫 className 不扫 `style={{}}` 内联色）——该门禁缺口随 S1 收口（窄范围起步） | CAP-C-08 / DESIGN.md §2·§3·§5·§8 | 核验手段：`node ./scripts/check-palette.mjs` 与 `check-semantic-classes.mjs` 均 EXIT=0；事件面为 `apps/server/src` 发布侧全量扫描 | 同上；建议 `DESIGN.md` §七 补 ai-surface 入风格整改路线 |

### 内置工单类型落地 + issue 列表类型可视化 + 添加类型报错修复（2026-09-13，用户三项反馈）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | **内置工单类型 task/bug 落地**（此前 IssueType 表全仓零种子，「内置 bug 六字段已预置」仅是 schema 注释）：新增 `prisma/builtin-issue-types.ts` 单一事实源（seed.ts 与 build-template.ts 共用）——task/bug 均 isSystem=true，bug 带六字段 fieldSchema（severity=select 规范四值经存量 38 条 customFields 核验安全，复现概率/步骤/环境/预期/实际=自由文本保兼容），upsert 只补缺不覆盖用户修改；服务端删除守卫扩为 isSystem 全量不可删（task 禁用守卫保留）；dev.db 已跑 seed（task/bug 落库），template.db 已重建 | CAP-A-04 | issue-type 套件 14 条（新增 isSystem 删除守卫 3 条：bug 400 不落库/task 原守卫保留/自定义类型零引用正常删）；issue 族 e2e 28 条过 | 能力清单 CAP-A-04 注记 |
| frontend | **issue 列表类型可视化**（统一工单视图下区分类型，Linear 式行首图标）：列表行（TaskSimpleList renderLeading）、表格 ID 列（替换原 task/bug 硬编码双色条）、看板卡行1（taskCardRow1/bugCardRow1 增可选 typeMeta 参数）三视图统一渲染 `IssueTypeIcon`（icon+color 来自 IssueType 元数据）；新增 `useIssueTypeOf` 解析 hook（typeId 事实源 → 遗留 type 字符串桥接 → 缺省 task）；类型管理面删除菜单对 isSystem 类型禁用并提示「内置类型不可删除」 | CAP-A-04 | use-issue-types.test 1 条（四路解析断言）+ 全量 93 文件 476 用例绿；lint 0 错误 | — |
| server | **「添加任务类型」报错根因修复**：dev server 重启后新 Prisma client 查询 dev.db 不存在的 description/enabled 列 → issue-types 端点全量 SQL 报错；`prisma migrate deploy` 与 `migrate resolve` 均被运行中 server 持锁挡死（EPERM database is locked，migrate status 静默无输出），改用 `prisma db execute --file` WAL 直写三条 ALTER + SQL 直插 `_prisma_migrations` 账本（sha384 校验和计算）绕过 schema engine 锁，**零重启完成修复** | — | pragma_table_info 验证三列生效、账本行落库 | 运维技巧留痕 |

### CAP-A-15 导航信息架构 + CAP-A-04 类型管理面重设计与缺陷降级（2026-09-13）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **研发生命周期九站重构为六站**（对齐能力清单 §2.2 理想管道①-⑥）：01 需求承接（新页 `/app/intake`：「提出需求」CTA 唤起统一创建面板 project AI 代理模式 + 承接管道四步说明 + category=requirement 需求纪要列表）→ 02 规划拆解（issues）→ 03 代码研发（repositories）→ 04 派发执行（executions）→ 05 质量验收（acceptance）→ 06 交付发布（releases）；六站唯一定义源抽 `shared/layout/pipeline-stages.ts`；迁位裁决：ai-surface（候补 pending 实验）迁协同组保留 exp 徽标、delivery（mock 还原页）移出编号仅 DEV 展示、bugs 撤销独立导航位回归类型视角、documents 迁协同组；补齐 04-09 阶段语义 hint（此前复制 label）；PAGE_REGISTRY 补 intake/executions/workflows | CAP-A-15（新卡）/ CAP-P-01 | 前端 pipeline-stages.test 4 条 + intake 页 3 条；全量 92 文件 475 用例绿；lint 五治理 + type-check 0/0 | 能力清单 CAP-A-15 新卡 + 变更记录、测试映射矩阵 GAP-T-24 |
| server · frontend | **工单类型管理面按 Linear 风格重设计**（设置 · 任务类型）：类型列表（dnd-kit 拖拽排序持久化 order、启用开关 Switch、默认徽标、状态·字段·任务三计数、描述行）+ 推荐类型库（10 个常用类型带类别标签一键添加、已存在去重）+ 新类型详情页 `/app/settings/issue-types/:typeKey` 三页签（基本信息/自定义字段/状态分组）；自定义字段对话框支持九种字段类型与默认值/描述/必填；状态页签按 group 聚合渲染（六组受控词表：triage/backlog/unstarted/started/completed/canceled）+ 添加状态对话框；issues 列表页补类型筛选条件（typeId 事实源，遗留行按旧 type 字符串解析） | CAP-A-04 增强 | server issue-type-management.spec 6 条（字段类型扩展/默认值校验/task 禁用守卫）；前端类型管理面 4 条（统计行/开关守卫/推荐库去重/一键添加）；全量回归双端绿（645 + 475）；e2e 全量 53 文件 393 用例全过（唯一失败为 assistant-cli-chat afterAll 清理 EPERM 环境噪声）；契约三件套零漂移；api:audit 502 端点 100% | 能力清单 CAP-A-04 增强注记、测试映射矩阵 GAP-T-25 |
| server | **schema 扩展**：IssueType +description/enabled 列、fieldSchema 类型词表扩 boolean/member/url + defaultValue/description/enabled 字段（含 select 默认值必须在 options 内校验）；StatusDefinition +group 状态分组列（默认 unstarted）；seed 补四内置状态 group 回填；默认类型 task 禁用守卫（400）；metadata 响应 DTO 透传 group | CAP-A-04 | 迁移 20260913150000 已应用 template.db（dev.db 因 dev server 持锁待重启窗口执行 `prisma migrate deploy`）；issue-type 套件 11 条绿 | schema 注释留痕 |

### CAP-A-08 增强——仓库页 PR 列表服务端回源（2026-09-13）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server · frontend | **Git 仓库详情页 PR 页签从恒空死表回源 GitHub 实时数据**：本地 `PullRequest` 表全仓零写入路径（历史死链路，页签恒「No pull requests found」）——`GET /git/repos/:repoId/pull-requests` 在本地无数据且仓库 `remoteUrl` 指向 GitHub（https/ssh 均解析）时，复用 github 集成凭据 octokit 实时拉取并映射既有 `PullRequestResponseDto` 形状（draft/merged/open/closed 四态、label 名提取、htmlUrl 落 metadata）；`merged/draft` 过滤全量拉取后本地筛，`open/closed` 透传 GitHub state；无集成/回源失败诚实回落空态不抛 500。**集成候选选择防废配置雷**：不用无排序 findFirst（实机恒命中 08-10 密钥轮换前的废配置致解密必炸、回源恒空），改为候选列表（project 优先、同 scope 取新）逐个尝试、解密失败跳过。只读展示不落任何表（B-08 证据回流边界不动）；前端卡片带 htmlUrl 时点击外跳 GitHub。搭车：`GitHubClient.normalizePullRequest` 补 `draft`/`labels` 归一化透传 | CAP-A-08（与 B-08 划接口：只读展示 vs 证据回流） | `git.service.spec` getPullRequests 组 8 条（含废配置跳过回归）全套件 19/19 绿；github provider 既有 5 用例回归绿；触及模块 type-check/eslint 0/0；**实机端到端验证**：修复前 dev.db findFirst 实锤命中废配置，修复后真实接口返回 mox-hub/agent-project-manager 全量 PR（#49 open） | 能力清单 CAP-A-08 增强注记 + 变更记录、测试映射矩阵 GAP-T-23（done） |

### CAP-K-03 驱动型发版三期——Release 升级为主线管道⑥交付执行器（feat/release-pipeline-driver，2026-09-13）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server · frontend | **驱动型发版三期一夜达成**：Release 从「事后记录 CHANGELOG」升级为「主线管道⑥交付执行器」——①状态机（draft/gated/approved/publishing/released/failed，只前滚禁删 tag）+ 版本推断（semver + conventional-recommended-bump 机械增量，基线取库内版本与 git tag 较大者，AI 润色人拍板）；②门禁聚合五检查（范围归属/验收全 passed|waived/CI 证据无失败/契约无 detached/审计无 red + CHANGELOG 一致性追加）只读四证据源；③发布审批决策卡（kind=release，借鉴 release-please「人确认才发布」，accept 即授权→release.approved 事件驱动自动发布）；④发布执行（CAS 并发互斥，CHANGELOG 导出→本地 tag+push→GitHub Release 三步骤如实落 executionLog，失败置 failed 可重开）；⑤前端发布管理页（列表/详情/门禁面板/AI 起草/执行日志，pipeline 导航 09 发版交付）；⑥workflow 产品动作 release.create/release.latest + 静默场景 release-notes | CAP-K-03 / B-02 / B-08 接口并轨 | 状态机 5 条 + 门禁 8 条 + 既有 spec 6 条单测全绿；e2e release-pipeline 全链 7 条（草案→异常流 400→门禁→审批→自动发布诚实 skipped→released）；前端页面测试 4 条；type-check 双端 0 错误；契约三件套零漂移；门禁终验 server e2e 全量 53 文件 393 用例全绿、api:audit 502 端点 100% | 能力清单 CAP-K-03 扩卡、GAP-T-22、§2.2 管道⑥ |
| server | **SQLite 手写 migration 的 Json 列类型修正**：`JSON` 声明落 NUMERIC affinity，Prisma RETURNING 读回报「Value JSON not supported」；对齐 20260811 先例改 JSONB（BLOB affinity 原样存储）；已同步重建 dev.db 与 template.db 五列 | — | probe 脚本直写/读回验证；e2e 全链绿 | migration.sql 注释留痕 |

### CAP-B-08 二期证据回流收口 + workflow 补测试/C-07 滚轮拦截/llm 记账三项搭车（feat/workflow-tests-evidence-sprint，2026-09-13）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server · frontend | **证据回流二期五落点**：①PR 中间态证据——subscriber 放开 open（opened/reopened/synchronize）回写 completionEvidence（state='open'，前端蓝徽标，质量把关从「终态事后看」到「过程可观测」），乱序防御：终态已回写后迟到的中间态不覆盖；②criteria 级 pr_review 证据——github-sync review submitted 发 `github.pr_review.submitted`，subscriber 落 source='pr_review' 证据（criteria.source 口径扩 pr_review，evidenceType 一期已预留），reviewId+state+reviewer 防重；③check_run repo 校验——反查 PR 加 repoFullName 匹配，多仓库同名分支不再误配；④人工执行审计闸门提示（收口 B-02 悬空项）——createIssueExecution human 路径响应带 auditWarning（与 dispatch AI 指派同口径黄牌，red 不阻断），前端执行项面板 toast，契约 ExecutionRunResponseDto 扩 auditWarning；⑤多库边界裁决 ADR-016——证据回流统一落默认库，跨库迁移随「集成配置入工作区」一次性收口 | CAP-B-08 / ADR-016 / B-02 | subscriber spec 9 用例、execution spec 7 用例、issue.service 18 用例、integration 域 21 用例全绿；contract 三件套零漂移 | 能力清单 B-08 卡二期落点、B-02 暂缓解除、管道诊断表④⑤、决策日志 ADR-016 |
| frontend | **CAP-C-07 滚轮冲突修复（用户拍板）**：ai-slot 高亮期间（长按 Ctrl/Cmd 500ms 进入 discovery）document capture 级拦截 Ctrl/Cmd+滚轮缩放（preventDefault+stopPropagation，passive:false）——页缩放会触发 resize/scroll 误关已打开的解释卡，且同一手势在 workflow 画布内外语义相反；普通滚轮不受影响，退出高亮即恢复 | CAP-C-07 | ai-slot-layer 测试 10 用例全绿（拦截/普通滚轮放行/退出后恢复） | 能力清单登记流水（C-07 冲突裁决落地） |
| server | **AIUsageLog 接 workflow llm 步骤（CAP-A-11 余留）**：compiler buildLlmStep 捕获 Mastra execute 的 runId（=AIWorkflowRun.id，零结构改动）归因 AIUsageLog.workflowRunId；generateText usage → promptTokens/completionTokens/totalTokens，UsagePricingService 估价 estimatedCost，responseMetadata 记 {kind:'workflow', stepId}；记账失败仅 warn 不阻断执行；注入 UsagePricingService（AiHubModule 已导出，模块装配零变更） | CAP-A-11 / 双轨成本 | workflow-compiler spec 9 用例全绿（记账载荷/失败不阻断） | — |
| server · frontend | **GAP-T-14 workflow 画布测试赤字清偿**：编辑回写（saveEditing definition 组装 + server updateDefinition 校验/version 自增）、产品动作节点文法（parseWorkflowDefinition action 分支 + workflow-actions requireParams）、模板库 upsert（onModuleInit 遍历断言）四块补回归 | CAP-A-12 / GAP-T-14 | 新增 spec 全绿（详见提交） | 测试映射矩阵 GAP-T-14 状态更新 |

## [0.6.2] - 2026-09-12

### v0.6.2——桌面壳安装包三调整 + 分发与生命周期强化（CAP-A-14，feat/desktop-electron-spike）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| desktop | **安装包三调整**：①图标换项目内置 logo（`gen-icon.mjs` Playwright 渲染 logo.svg 产出 7 帧 ICO + NSIS 品牌位图 + 托盘图标，替换蓝底白 A 占位图，零新依赖）；②NSIS 改向导模式（可自选安装位置 + 品牌位图 + 安装期检测既有 `~/.apm` 数据提示升级安装）；③数据根固定 `~/.apm`（库/日志/上传/密钥/会话全收敛；守护进程配置与锁落 `desktop/` 子目录与手动 CLI 隔离；Chromium profile 收敛 `electron/`；v0.6.1 旧 `%APPDATA%` 数据白名单自动迁移留档；`isFirstInstall` 首装校验暴露 IPC） | CAP-A-14 | ICO 7 帧结构校验通过；desktop tsc/lint/tsup 全绿 | apps/desktop/README.md 数据布局表重写 |
| desktop | **P0 生命周期**：单实例锁（双开唤起既有窗口，防两套 server 抢 `~/.apm`）；崩溃自愈——server/daemon 意外退出自动重启（指数退避 1s→30s、连续 5 次熔断）、渲染进程崩溃白屏重载（60s 窗 3 次熔断）、主进程 uncaughtException 兜底；自动更新消费端（electron-updater + GitHub Releases feed：启动 30s 静默检查/手动检查/下载完成询问安装/退出自动装，dev 禁用） | CAP-A-14 / ADR-015 | 壳级 e2e（Playwright _electron + 临时数据目录隔离）9 断言 ALL PASS | 决策日志 ADR-015（推翻 ADR-014「不自动更新」边界；签名单列待办） |
| desktop · frontend | **P1 体验**：托盘常驻（关窗默认最小化保活，`close_to_tray` 偏好可关，托盘菜单三入口）；窗口位置尺寸持久化；`will-navigate` 白名单拦截；IPC 参数形状校验；secrets.json 经 safeStorage(DPAPI) 加密（旧明文兼容、跨机器解密失败拒绝启动不静默重生成）；卸载器询问是否删除 `~/.apm`；一键导出诊断包（日志+元数据+进程快照 zip，无凭证）；前端设置页「桌面偏好」卡（关闭行为/检查更新/导出诊断，i18n 双语 + 6 组件测试） | CAP-A-14 / ADR-015 | frontend desktop/settings 模块 41 测试全绿；e2e-shell ALL PASS | README 生命周期与分发契约表 |
| desktop · frontend | **P2 打磨**：应用菜单（Alt 唤出，关于/检查更新/重载/缩放/日志目录）；日志轮转（5MB×3 份）；优雅关闭（utility postMessage `apm:shutdown` → server/cli parentPort 桥接 shutdown 钩子，3s 宽限强杀兜底；dev/手动 CLI 无 parentPort 不挂载）；电源事件（唤醒探活失败自动重启服务组；会话结束兜底清理）；系统通知桥（`notification.created` 桌面模式转发主进程原生通知，web 保持浏览器横幅）；深链 `apm://<内部路径>`（协议注册 + second-instance/冷启动转发 + preload 桥 + DesktopGate 消费） | CAP-A-14 / ADR-015 | desktop/cli tsc、server lint、frontend 22 测试全绿；e2e 复跑 ALL PASS | README 生命周期契约表扩 P2 行 |
| desktop | **包体瘦身 242MB → 188MB（-22%）**：bundle 路线证伪弃用；定向剪除 Prisma CLI(58MB)+engines(77MB)（实测剪后 server 启动/健康/DB 读写全正常）；**封死数据泄露**——整目录拷 prisma/ 曾把开发者 dev.db+wal+bak（22MB）打进安装包，改白名单拷贝；打包时预生成 `default-template.db`（首启拷贝建库 40s→秒级，壳侧 `restoreDefaultDbIfNeeded`，dev 回退 db push）；strip 挪至 generate 后覆盖生成产物 | CAP-A-14 / ADR-015 补记 2 | 真包 `desktop:pack` 全链跑通 188MB；新管线产物启动冒烟（health 200/注册 201/JWT 签发）全过 | 决策日志 ADR-015 补记 2；README 建库契约更新 |
| ci | **发布管线接线（取代 Tauri 版 release.yml）**：`desktop-release.yml`——tag `v*` 触发 windows 构建（质量前置 type-check/lint/单测 → pack:resources → electron-builder `--publish always`）→ GitHub Release **draft**（exe + blockmap + latest.yml）→ 人工确认 Publish 防误发 → 已装用户 electron-updater 静默拉取；workflow_dispatch dry_run 仅构建留档 | CAP-A-14 / ADR-015 | 管线设计经 188MB 真包全链本地验证；CI 侧待首 tag 实跑 | 本条目；ADR-015 补记（发布端闭环） |

## [0.6.1] - 2026-09-12

### CAP-A-14 桌面体验五切片——初始化向导/登录缓存/启动屏/守护进程托管/调试模式（v0.6.1）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| desktop · frontend | **登录缓存（跨 origin 会话镜像）**：根因=生产模式 API 端口在 4300–4399 动态探测，重启后 origin 漂移而 localStorage 按 origin 隔离，登录态/工作区/向导标记全丢。新增壳侧 `desktop-state.json` 持久化（IPC：get/set/clear_desktop_state）+ 前端 desktop-session 桥——启动时恢复进 localStorage（onboarding 标记 merge 进 zustand persist JSON），登录/登出/401 清除/工作区切换四点镜像回壳；JWT 7d 过期仍由服务端兜底（401 回登录页） | CAP-A-14 | 前端 `desktop-session.test` 7 条全绿（token 恢复/不覆盖现值/merge/壳桥不可用 no-op/镜像/清除/web 不调壳）；tsc -b 0 错误 | 能力清单 CAP-A-14 体验切片、GAP-T-20 |
| desktop · frontend | **首启初始化向导**：OnboardingGate 挂 ShellLayout 全局层（桌面模式且未完成时自动弹出，web 不渲染）；向导步骤动态化（按 id 分发），桌面模式在欢迎页后插入「工作目录」步骤——壳原生目录选择器（choose_directory）写守护进程 apm-config.json 的 workspaceRoots；欢迎页新增 AI 同事说明块（代写→确认→把关治理语法）；完成标记双重持久化（zustand persist + 壳侧镜像） | CAP-A-14 | 前端 type-check/lint 全绿；既有 OnboardingWizard/Onboarding API 复用零 server 变更 | 能力清单 CAP-A-14 体验切片 |
| desktop | **品牌全屏启动屏**：data-URL 内联页重做——logo SVG + 双轨道旋转弧 + 呼吸动画 + 分阶段状态文案（准备数据目录→启动本地服务→连接 AI 执行运行时→加载界面）+ 底部扫光进度条；阶段经 executeJavaScript 原地更新（did-finish-load 前缓冲），不再重载 URL 闪屏；失败态红字 + 数据/日志目录指引 | CAP-A-14 | desktop type-check/lint/tsup 全绿 | apps/desktop/README.md |
| desktop · cli | **apm-runtime 守护进程托管（运行时自动启动+手动控制）**：apps/cli 自包含随包（pack.mjs 新增 cli/ staging——dist + @apm/shared 以 file: 引用 npm 装平铺）；壳 runtime-daemon.ts 经 utilityProcess 拉起（APM_BACKEND/APM_CONFIG_PATH 指向 userData，与用户手动 CLI 的 ~/.apm 完全隔离），server 健康后自动启动（失败仅告警不阻断），注册端点 Public 无需凭证→上线即出现在设置页机器列表；退出随 stopAllProcesses 清理；IPC 新增 get_runtime_daemon_status/start/stop + get/set_workspace_roots + choose_directory；设置页运行时区新增「本机守护进程」卡片（状态 Pill/启停按钮/工作目录增删/开发者工具入口，web 模式不渲染）。**边界更新**：守护进程本体随包（原「AI 执行面不随包」裁决更新），外部 CLI 二进制仍不随包 | CAP-A-14 | desktop type-check/lint/tsup 全绿；守护进程 1.5s 宽限观察防 fork 即退假成功 | 能力清单 CAP-A-14 边界更新、pack.mjs 注释、GAP-T-20 |
| desktop | **调试模式**：dev 模式自动开 DevTools（detach）；打包版三入口——`--devtools` 启动参数 / `APM_DESKTOP_DEBUG=1` 环境变量 / F12·Ctrl+Shift+I 随时开关（before-input-event）/ 设置页「开发者工具」按钮（toggle_devtools 命令） | CAP-A-14 | desktop type-check/lint 全绿 | apps/desktop/README.md |

### CAP-A-14 桌面壳发布级打包与运作——六处关键缺口清偿（v0.6.1 桌面版）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| desktop · server | **打包资源自包含**：pack.mjs 资源准备链（server `pnpm deploy --prod --legacy` 硬拷贝 node_modules + 补拷 dist + 剥离 src/test 等非运行时文件 + Prisma 客户端与 query engine 预生成 + Node 运行时随包 + 前端 dist），落位 `src-tauri/resources/`（gitignore）；`prisma` 从 server devDependencies 移入 dependencies（桌面首启要跑 prisma CLI，它就是运行时依赖）；tauri.conf `bundle.resources` 改为 resources/{bin,server,frontend}，`beforeBuildCommand` 接 `node scripts/pack.mjs`。**顺带修两个陈旧缺陷**：server 入口实为 SWC 平铺的 `dist/main.js`（Rust 与 `start:prod` 均还指向旧 `dist/src/main.js`）；`frontend.rs` 硬编码 `E:/Project` 路径致 release 下 `start_all_services` 必炸（生产模式前端随应用内嵌，改为跳过前端进程启动）。 | CAP-A-14 | 自包含 staging 冷启动冒烟：`resources/bin/node.exe resources/server/dist/main.js`（不依赖仓库任何东西）路由全映射 + Database connected + `/_api/health` HTTP 200 + 静态托管 HTTP 200；query engine `query_engine-windows.dll.node` 落位核验 | `apps/desktop/README.md`（新增：架构/打包/数据目录/边界） |
| desktop | **密钥持久化与初始化收口**：新增 `setup.rs` 共享初始化模块（目录/密钥/db push/Node 解析，后台初始化与 `init_app` 命令共用一条路径）——首启随机生成 `JWT_SECRET`/`INTEGRATION_ENCRYPTION_KEY` 落盘 `secrets.json`、后续启动复用（修复空串密钥致 Joi `required` 校验拒启）；db push 仅在库文件不存在（全新安装）时执行，已存在的库不再带 `--accept-data-loss` 重建；init 失败经 `AppState.init_error` 透出（新增 `get_init_status` 命令，`start_backend`/`start_all_services` 在初始化未完成时前置拦截报错）；node.exe 解析收敛进 `AppConfig.node_exe`（打包模式指向随包 node.exe 且缺失时给出可操作报错，开发模式回落 PATH——原 4 处 `current_exe().parent()/node.exe` 写法在 debug 下必挂）；退出时（`RunEvent::Exit`）杀掉全部托管子进程，node 后端不再残留。 | CAP-A-14 | `cargo check` 0 error；GAP-T-19 冒烟项随安装包实测清偿（v0.6.1 版本号已对齐 tauri.conf/desktop package.json） | 计划文档 `docs/roadmap/tauri-desktop-v0.6.1-plan.md`、能力清单 CAP-A-14 |
| 工程化 | pnpm `verifyDepsBeforeRun: false`——tauri `beforeBuildCommand` 以 `NODE_ENV=production` 运行，pnpm 依赖自检会自动触发根目录 `pnpm install --prod` 并要求清空整个 node_modules（无 TTY 时中止；TTY 下会真删开发依赖）。被实际触发一次并被 TTY 保护拦下，全局关闭该自检。 | CAP-A-14 | `desktop:pack` 一键链（构建两端 → 资源准备 → cargo release → NSIS 安装包）全链跑通 | pnpm-workspace.yaml 注释说明缘由 |

### CAP-A-14 壳选型转 Electron——验证 spike 通过，定为正式路径（v0.6.1，ADR-014）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| desktop | **壳技术栈 Tauri 2 → Electron**：main/preload 全 TS（electron/src 8 模块，Rust 胶水层一比一翻译）；preload 以 `window.__TAURI__.core.invoke` 同形状契约（electron-api.ts 自定义壳桥）实现**前端零改动**；server 承载 utilityProcess 内嵌 Node 一次通过（省 ~75MB 随包 node.exe），spawn 随包 node.exe 保留为自动降级；electron-builder NSIS 打包链（electronDist 本地直指/asar:false/换新输出路径三招解 Defender 锁竞态）。顺带修正 Tauri 版潜伏缺陷：Rust serde snake_case 与前端 camelCase 契约错位（生产动态端口注入会失效，dev 被 vite proxy 掩盖） | CAP-A-14 | smoke-ipc.mjs CDP 全字段断言 PASS；本机静默安装冒烟：/S 安装→生产 server 启动→health 200→优雅退出无残留；安装包 241MB、5 进程内存 584MB | apps/desktop/README.md 重写、`docs/roadmap/electron-desktop-v0.6.1-plan.md`、ADR-014 补记 |
| desktop · server | **打包链两坑修复（pack.mjs）**：staging package.json 剥离 devDependencies（npm 解析阶段即校验全部依赖字段，devDeps 的 pnpm `catalog:` 协议直接 EUNSUPPORTEDPROTOCOL）；i18n 翻译 JSON 按 cwd 相对 src/i18n/resources 硬编码解析，staging 补拷 src/i18n 保持目录形状（否则生产 Bootstrap failed: i18n path cannot be found） | CAP-A-14 | 安装版 i18n 正常加载、server 完整启动 | pack.mjs 注释 |

## [0.6.0] - 2026-09-11

### 搜索按钮圆形图标化与侧边栏导航样式优化 (feat/ui-views-and-toolbar-refactor)

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**搜索按钮与通知按钮一致圆形化**：将搜索按钮从侧边栏普通导航分组（`utilities` items）中移除，取消原有长条形导航链接样式，对齐通知按钮样式重构为标准圆形按钮（`relative flex size-8 items-center justify-center rounded-full text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground`，激活态高亮）；②**布局位置调整至通知按钮左侧**：在展开态侧边栏顶部 header 中放置于通知按钮左侧并列；在收起态侧边栏底部容器中置于通知按钮上方（从上到下依次为搜索、通知、展开侧边栏），配套统一的 `Tooltip` 提示（`t('nav.search')`），点击直达全局搜索。 | 用户指令（搜索按钮也做和通知相同的处理，放到通知按钮的左侧，取消导航栏的样式） | Vitest 前端 **81 文件 421 用例全绿**；`tsc -b` 0 错误；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告；`pnpm check:docs-sync` 通过 | 本 CHANGELOG |

### 多选操作栏避开 Dock 触发区平移与 count 基数真实数据加载 (feat/ui-views-and-toolbar-refactor)

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**多选菜单栏向上平移避开 Dock 触发区**：将 `DataList` 的 `SelectionBar` 与 `DataTable` 的多选悬浮胶囊定位统一从 `fixed bottom-5`（20px）向上平移至 `fixed bottom-28`（112px），彻底离开底部 Dock 栏展开触发感应区（0~96px），避免鼠标移动到多选栏操作按钮时意外唤醒 Dock 造成视觉重叠与争抢焦点；②**count 基数区域加载真实数据与 i18n 插值修复**：彻底修复 `zh-CN.json` 与 `en.json` 中因为单花括号 `{count}` 导致 i18next 无法插值直接打印字面量文本的缺陷（包括 `dataTable.selected`、`dataTable.range`、`acceptance.results`、`acceptance.pagination.page` 等 13 处关键动态字符串），新增 `dataTable.selectedWithTotal`（`已选 {{count}} / 共 {{total}} 项` / `{{count}} of {{total}} selected`）；并在 `DataList`（支持 `totalCount`，默认为 `items.length`）与 `DataTable`（采用服务端 `manualPagination.total` 或本地过滤行数基数）中实时计算并加载真实基数分母，全面支持「已选 X / 共 Y 项」真实响应式计数呈现。 | 用户指令（多选菜单栏向上平移，避开dock栏的触发区域，count基数区域加载真实数据） | Vitest 前端 **81 文件 421 用例全绿**；`tsc -b` 0 错误；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告；`pnpm check:docs-sync` 通过 | 本 CHANGELOG |

### 视图模式与工具栏重构及视觉缺陷修复 (feat/ui-views-and-toolbar-refactor)

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**视图滑块与胶囊全量 i18n 补齐**：`zh-CN.json` / `en.json` 补齐 `common.grid/cards`、`task.filter.all`、`project.filter.all`、`document.filter.all`、`task.view.*`、`project.view.*`、`document.view.*`、`acceptance.view.*` 与 `viewDisplay.views.*`；`ToolbarRow` 的 `ViewPill` 针对 built-in `all` 增加动态兜底避免历史存量缓存残留英文，`SegmentedControl` 与 `ViewStyleDropdown` 均增加统一翻译兜底；②**验收中心卡片视图彻底改造为 List 视图**：废除并清理原大卡片 `AcceptanceRow`，改用统一的 `@/components/ui/data-list` 的 `DataList` 紧凑呈现（集成勾选批量删除、状态图标、标题、验收标准进度条、审计风险色标、成本统计与分页），与全站列表视觉一致；③**文档管理页重构列表与卡片视图**：严格对齐 Design System 的 Document Cards 规范（`rounded-xl`、`size-9` 浅色背景类别图标盒、`StatusPill`、分类文本、标签栏、项目归属与预览时间），统一列表与卡片组件语言；④**通知侧边栏条目移除与圆形无弹窗按钮**：从侧边栏主导航移除通知条目，侧边栏顶部及收起态底部均改用标准圆形通知按钮（`rounded-full size-8`），含 Tooltip 标题与未读红点（`unreadCount > 0`），取消原有无实际通知内容的 `NotificationPopover` 弹窗，点击直达 `/app/notifications`；⑤**成员管理卡片上下留白修复**：解决 `MemberCard` 中 `Card` 默认 `py-3.5` 与 `CardContent` 的 padding 叠加导致的过高纵向留白问题，显式指定 `gap-0 py-0` 与 `px-3.5 py-2.5`，使视觉比例紧凑自然。 | 用户指令（视图与工具栏重构及视图缺陷修复） | Vitest 前端 **81 文件 421 用例全绿**；`tsc -b` 0 错误；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告；`pnpm check:docs-sync` 通过 | 本 CHANGELOG |

### v0.6.0 发版总览——设计系统 v2 落地 + 六条能力线推进 + Dock 协同交互面

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | **全局设计系统 v2 收口**：DESIGN.md v2.0 规范体系（低饱和多色色阶、外舒内紧卡片、磨砂外壳、页面级规格 PageShell Profile Variants、5 类 AI 结构卡片）+ 双表面头像体系（人类 NiceAvatar × AI Avvvatars）+ 悬浮卡片体系（收藏栏/标签页/命令面板外观）全面对齐规范 | FR-DESIGN-001 | 各切片 CHANGELOG 条目内 Vitest 全绿记录；`tsc -b` 0 错误、ESLint 0 错 0 警告 | DESIGN.md v2.0 |
| server · frontend | **六条能力线推进**：CAP-A-11 workflow 执行引擎基座（Mastra 引入 + 独立 WorkflowModule）→ CAP-A-12 工作流画布四切片（只读可视化 + 画布编辑 + 产品动作节点文法 v2 + AI 草拟与模板库）→ CAP-P-01 需求承接三期（剧本访谈动态追问）→ CAP-B-02 完整性审计前端收口 → CAP-B-08 验收证据回流一期（GitHub PR 终态与 CI 结论自动回流）→ CAP-C-07 局部侵入问答 AISlot 首批落地 | FR-WORKFLOW-001 / FR-GRILL-001 / FR-ACCEPT-002 / FR-ACCEPT-003 / FR-AI-001 | 全量质量门禁绿（server 单测/e2e + frontend Vitest + contract 零漂移） | 能力清单 v1 各卡补记 |
| frontend | **底部 Dock 协同交互面（新卡 CAP-A-13）**：默认自动隐藏 + 鼠标靠近浮出（包围盒坐标判定，零不可见遮挡）+「常驻显示」开关 + 默认助手固定首位 + 用户/助手头像统一真实头像 + 全局统一创建面板 +「设置 · Dock 栏」实时预览自定义 | CAP-A-13 | Vitest 前端 81 文件 418 用例全绿（Dock 域新增 ~80 条） | 能力清单 v1 新增 CAP-A-13 |
| frontend | **工程治理**：命令面板全量刷新（17→25 命令 + i18n 化）+ 实体图标注册表 v0（导航/页签图标统一）+ eslint warning 全仓清零（frontend 142 处 + server 12 处）+ 存量未使用 import 清理（69 处） | FR-CORE-001 | `pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告 | COMPONENTS.md 图标契约 |
| frontend | **实验表面**：ai-surface 全屏沉浸协同表面原型并入（手表表盘视界 + 项目生命力全景 + 信任轨道透镜 + Omni-Dock，mock 数据纯前端，挂 exp 胶囊） | — | Vitest 418 用例全绿（含 ai-surface-page 2 条） | 待设计系统演进裁决转正或下线 |

### Dock 头像完全填满容器 + 状态点不再被裁切

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**头像完全填满**：`MemberAvatar` 的尺寸是固定档位（xs/sm/md/lg/xl = 20/24/32/40/56px），而 Dock 头像按钮原为 `size-7.5`（30px）内嵌 `size="xs"`（20px）——**圆环里露出一圈容器底色**。把容器尺寸对齐档位（`size-8` = `md` = 32px），头像即与容器**逐像素重合**；展开输入栏的选中角色头像同样修正（原 `size="sm"` 24px 内嵌 32px 容器）。容器描边改回**不占布局的 `ring`**（原为 `border`）——`border` 会占掉 1px 内容盒逼头像缩小 2px，「填满」与「描边」将无法同时成立，`ring` 是盒阴影故二者可兼得。注：`NiceAvatar` 是流式（100% 填充），`Avvvatars` 是按 `size` 固定px 的——所以只能让**容器对齐头像档位**，不能让头像自适应容器；②**状态点不再被裁切**：头像按钮原带 `overflow-hidden`，而右下角呼吸状态点以 `-bottom-0.5 -right-0.5` 挂在按钮**外侧**，被裁掉一角。头像填满后不再需要它裁任何东西（`MemberAvatar` 自身有 `overflow-hidden`，负责把方图裁成圆），故移除；③**连带清理**：头像填满容器后，容器底色已完全被覆盖，`DockAiColleague.color` / `bgColor` 与 hook 里的 `COLOR_SCHEMES` 轮转成为死字段——一并删除（AI 头像配色本就由 `MemberAvatar` 按 `displayName` 种子确定性生成，与成员管理页一致）。 | 用户指令（头像完全填满容器；右下角状态点不要被切割遮挡，要和之前一样完整显示） | Vitest 前端 **79 文件 416 用例全绿**（新增 3 条：容器与头像同尺寸 32px 的填满断言、描边走 ring 不走 border、容器无 `overflow-hidden` 且状态点挂外侧的不裁切断言）；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告；`tsc -b` 既有 6 行错误不变（无新增） | 同步更新 `docs/01-需求/能力清单-v1.md`（CAP-A-13 补记）、`docs/01-需求/测试映射矩阵-v1.md`（GAP-T-18 用例补充）、本 CHANGELOG |

### Dock 默认助手固定首位且不可关闭 + 用户/助手头像统一取真实头像

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**默认助手（小周）固定首位且不可关闭**：`DockAiColleague` 新增 `isMain` 标识把「谁是默认助手」收敛到一处（此前散落按名字/固定 id 判断）；hook 保证默认助手排首位，设置页「常驻 AI 助手」再按 `isMain` 稳定排序并把它渲染为**禁用且恒为开启**的开关 + 「默认」徽章；Dock 的可见同事过滤与设置页的计数都对其豁免隐藏名单——**即便该 id 混进持久化的隐藏名单（存量脏数据/改名残留）也不会消失**；②**头像统一取真实头像**：用户头像（`DockUserPopover`，触发胶囊 + 浮层身份条）与助手头像（Dock 头像群、展开输入栏、设置页 AI 列表）**全部改由 `MemberAvatar` 渲染**——成员信息里有 `avatarUrl` 就显示真实图片；③**由此修掉一个真实缺陷**：用户头像此前把 `currentUser.avatarUrl` 直塞 `<img src>`，而头像选择器的内置项存的是**哨兵串**（`nice-avatar:alex` / `avvvatars:claude-code`）而非 URL，**选了内置头像的用户在 Dock 上看到的是坏图**；`MemberAvatar` 会区分「真实 URL / 哨兵 / 无头像」三种情况；④**回退档不再自画图标**：无真实头像的 AI 同事此前在 Dock 上画一个 lucide 通用图标（`DockAiColleague.icon` 字段，现已删除），与成员管理页显示的确定性生成头像不一致；现统一回落双表面规范的头像，两处观感一致；⑤**顺带修复**：`MemberAvatar` 的 `title` 在调用方只传「类型+显示名+头像」（无 `handle`）时会拼出 `(@undefined)`；`DockUserPopover` 触发元素原用 Radix 的 `asChild`（base-ui 只认 `render`），会渲染出「button 套 button」的非法结构并持续报 TS 错误——改用 `render` 后该结构消失，既有类型错误由 7 行降至 6 行。 | 用户指令（Dock 栏：默认助手固定首位且不可手动关闭；用户头像与助手头像采用真实头像） | Vitest 前端 **79 文件 413 用例全绿**（新增 13 条：`bottom-dock.test` 3 条头像/默认助手豁免 + `dock-section.test` 4 条首位与不可关闭 + 新增 `dock-user-popover.test` 6 条真实 URL/哨兵/无头像/触发元素非嵌套）；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告；`tsc -b` 既有错误 7 行 → **6 行** | 同步更新 `docs/01-需求/能力清单-v1.md`（CAP-A-13 补记）、`docs/01-需求/测试映射矩阵-v1.md`（GAP-T-18 登记并当日清偿）、本 CHANGELOG |

> ⚠️ 两个既有问题**未处理**（本次只修了落在 dock 文件里的那一处，避免夹带大范围重构）：①`asChild` 是全仓性问题——`asChild` 是 Radix 惯例，base-ui 只认 `render`，仓库内共 **62 处** `asChild` 用法，其余位置很可能同样在渲染嵌套元素；建议单开一轮排查，不要顺手改；②`ensureMemberForUser` 创建 Member 时不同步 `User.avatarUrl`，故 OAuth 登录用户的 Member 镜像头像恒为 null（用户侧头像走 User 字段不受影响，但成员列表/成员卡会缺失）。

### 底部 Dock 自动隐藏：平时只留徽章栏贴底，鼠标靠近底部才浮出（含「常驻显示」开关）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**默认自动隐藏**：Dock 平时收起（下沉 + 淡出 + 不可点），底部只留**徽章栏贴底**——`DockMetricBadge` 新增 `collapsed` 形态（`bottom-0` ↔ `bottom-full mb-2.5` 之间过渡），浮出时徽章栏随之抬到 Dock 上方；②**靠近浮出、停留保持**：判定区域 = Dock 自身包围盒向外扩 32px、并向下延伸到视口底边；收起态监听 `document` 的 mousemove 做坐标判定，指针离开区域（含移出窗口）即收起。**刻意不用透明热区元素**——那会在页面底部压出一条看不见却吞点击的条带（先按热区实现过一版：约 88px 高、Dock 宽 +64px 的一整片，范围内页面元素全部点不动），改为坐标判定后**页面可点区域零损失**。包围盒取自根节点（其盒高即胶囊高度），不受收起动画那层 transform 影响，因此浮出/收起不会让判定区域抖动；输入栏展开时胶囊变宽，判定区域随包围盒自动变大；③**键盘可达性**：焦点进入 Dock 即浮出，且焦点在 Dock 内部按钮之间移动时不收起（比对 `relatedTarget`），避免 Tab 落到不可见按钮上；④**两个例外**：输入栏展开时不隐藏（正在输入，收起会打断操作）、设置页预览态强制常显（否则预览失去意义）；⑤**设置页新增「显示方式」卡片**：`常驻显示` 开关（默认关闭 = 自动隐藏），改动即时落盘，`恢复默认` 一并还原；⑥**合并** `fix/activity-select-settings-back`（三项缺陷修复）——冲突仅 CHANGELOG（两批都在 Unreleased 顶部加条目），保留双方。 | 用户指令（Dock 平时隐藏、设置页加常驻开关、鼠标靠近浮出且停留保持） | Vitest 前端 **78 文件 400 用例全绿**（新增 14 条：`bottom-dock.test` 自动隐藏/浮出/保持/横向离开/移出窗口/常驻/预览/输入栏例外 9 条 + `dock-section.test` 常驻开关 3 条 + `app-store.test` 2 条）；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告；`tsc -b` 无新增错误（既有 5 处分支既有错误不变） | 同步更新 `docs/01-需求/能力清单-v1.md`（CAP-A-13 切片补记）、`docs/01-需求/测试映射矩阵-v1.md`（GAP-T-17 登记并当日清偿）、本 CHANGELOG |

> ⚠️ 交互取舍（有意为之，非缺陷）：靠近判定的监听只在收起态挂载（常驻显示时零开销）；每次 mousemove 读一次根节点包围盒（一次布局读取），这是换取「零不可见遮挡」的代价。收起态下键盘 Tab 仍可进入 Dock 并触发浮出，故未使用 `inert`——用了键盘用户就再也够不到 Dock。

### 三项缺陷修复：工单动态页白屏 / 设置页返回目标 / 全站下拉框显示 id

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server · frontend | ①**工单详情页白屏修复**（`activity.changes?.find is not a function`）：根因是**存量迁移数据**——`20260827000000_add_activity_module` 把旧 `TaskActivity.detail`（对象形状 `{ changes: [...] }` 或更早的 `{ from, to }`）整段灌进了新的 `Activity.changes` 列，而契约（Prisma/OpenAPI/DTO）声明的是数组；`shapeActivity` 原先以 `unknown` 原样透出、无运行时收窄，前端 `changes.find` / `changes.slice` 直接抛错。后端新增 `normalizeActivityChanges`（数组原样、旧包装取出内层数组以**救回历史信息**、不可解释形状置 null），前端 `toActivityChanges` 再做一层兜底——契约外数据不该让整页白屏；②**设置页返回目标修复**：`settings-page.tsx` 按「当前历史索引 − 进入时索引」回退，但**少退了一步**（未计跨出设置页那一步），于是「在设置页翻过至少一个分页」时返回会落到上一个设置分页而非进入前的业务页面。抽出纯函数 `resolveBackSteps`（`currentIdx - entryIdx + 1`）并加注释锁定该 off-by-one；③**全站下拉框显示 id 修复**：base-ui 的 `Select.Value` 只在 Root 收到 `items` 时才能把 value 映射成 label，否则回退 `String(value)`；`SelectItem` 里的文本救不了场（**弹层关闭时 item 根本不挂载，已实证**）。`NativeSelect` 从组件层把解析好的 `{ value, label }` 交给 Root（**一处修复覆盖 121 处用法**，其中 `__native_select_empty__` 内部哨兵也不再被当文本渲染，空值显示空选项文本）；裸 `Select` 的 value≠label 站点按同一契约补 `items`（document-form / execution-recovery-dialog / bind-repository-dialog ×2 / task-detail-drawer ×2 / project-roles-section ×2 / team-detail-page / design-system 演示，共 10 处）。 | 用户指令（三项运行时缺陷：工单详情页报错、设置页返回错位、所有下拉框显示 id） | Vitest 前端 **74 文件 341 用例全绿**（本分支基线 70/317，新增 24 条：`native-select.test` 7 + `select.test` 3 + `history-back.test` 9 + `activity-display.test` 5，其中 1 条既有契约测试按新行为收紧断言）；后端 **65 文件 569 用例全绿**（新增 `activity.service.spec` 6 条）；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告；server `type-check` 通过。**旁证**：契约绑定面板（未改任何调用点）的同步模式下拉框从显示 `managed` 变为显示 `contract.syncMode.managed`，即组件层修复在真实消费方生效。 | 同步更新 `apps/frontend/COMPONENTS.md`（Select label 契约硬规则）、`docs/02-架构设计/策略/决策日志.md`（ADR-013）、`docs/01-需求/测试映射矩阵-v1.md`（回归用例登记）、本 CHANGELOG |

> ⚠️ 已知遗留（非本次引入，未处理）：①`MEMBER_ROLE_OPTIONS`（团队角色）与字体名等下拉项 value 与展示文本相同，显示的是英文 role 字面量而非本地化名称——属 i18n 范畴，非本次「显示 id」缺陷；②`apps/frontend` 的 `tsc -b` 仍有 5 处**分支既有**类型错误（`app-dock.tsx` / `dock-metric-badge.tsx` / `dock-user-popover.tsx`），本次改动未新增错误（已用同一命令对照验证）。
### 底部协同交互面（Dock）四项修复 + 「设置 · Dock 栏」自定义（新卡 CAP-A-13）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**「新建」按钮修复断链**：原实现 `navigate('/app/issues?create=true')` 的 query 参数**全仓无消费方**，点新建只跳页不开面板。改为经 `app-store` 的 `createDialog` 唤起**全局统一创建面板**（新增 `shared/components/global-create-dialog.tsx` 挂载于 `ShellLayout`，任意页面可开、不跳页丢上下文；六类创建形态由面板内切换）；②**退出判定区域修正（含决策侧栏解耦）**：Dock 的 outside-click 原先只判定自身容器 `dockContainerRef.contains()`，而 AI 对话浮窗（`fixed bottom-28`）与决策侧栏都在容器之外——**点对话面板内部、其按钮、或决策侧栏「收起」按钮，都会被误判为「外部点击」，连带把主窗口一起关掉**。新增 `shared/lib/floating-layers.ts` 定义「AI 协同交互面」（Dock ＋ 对话浮窗 ＋ 就地问答浮层 ＋ 任意 Portal 弹层），面内点击一律不关闭；并为对话浮窗补上此前**完全缺失**的 ESC 关闭与外部点击关闭（内层浮层已打开时 ESC 先让位，避免模型选择器/历史菜单与主窗口一起关）；③**新增「设置 · Dock 栏」自定义**：页面**置顶为一张实时预览卡片，内嵌完整 Dock 栏本体**（`BottomDock` 新增 `preview` 定位态，与真实 Dock 同源同交互，配置一改预览即变），其下为功能按钮（新建/搜索/通知/主题）显隐 + 上下移排序 + 常驻 AI 助手名单，改动即时生效并落盘（`app-store` + zustand persist，与 `sidebarItemVisibility` 同款设备级偏好机制），Dock 渲染改为配置驱动；④**重构去重**：AI 同事清单生成逻辑（真实成员优先 + 缺省兜底）从 `bottom-dock.tsx` 抽为共享 hook `use-dock-ai-colleagues`，Dock 与设置页共用同一数据源；⑤**顺带修复**：`test-utils/providers.tsx` 空路由表兜底失效（`routes \|\| 默认` 对空数组不生效，致 `renderWithProviders` 不传 `routes` 即抛错）。 | 用户指令（底部 dock 栏修复：新建入口导向统一创建面板、弹窗关闭校验区域不含弹窗自身与按钮、设置页新增 dock 栏设置、决策侧栏关闭不影响主窗口关闭） | Vitest **74 文件 362 用例全绿**（新增 45 条：`floating-layers.test` 9 + `bottom-dock.test` 10 + `assistant-fab.test` 5 + `dock-section.test` 11 + `app-store.test` 增 12）；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告 | 同步更新 `docs/01-需求/能力清单-v1.md`（新增 CAP-A-13 + §4.1 卡数口径修正 + 变更记录）、`docs/01-需求/测试映射矩阵-v1.md`（GAP-T-15 登记并当日清偿 + §三 A-13 行 + 变更记录）、本 CHANGELOG |

> ⚠️ 遗留（**非本次改动引入**，已用 `git stash` 对照验证）：`apps/frontend` 在执行 `tsc -b` 时有 5 处**分支既有**类型错误，位于上一提交（aa181b4）新增的 Dock 相关文件——`components/ui/app-dock.tsx`（base-ui `TooltipProvider` 无 `delayDuration`；motion `children` 类型含 `MotionValue`）、`shared/components/bottom-dock/dock-metric-badge.tsx`（`AssistantRunEntry` 无 `status`/`tokens` 字段）、`shared/components/bottom-dock/dock-user-popover.tsx`（base-ui `PopoverTrigger` 无 `asChild`；`WorkspaceRecord` 无 `slug` 字段）。因 `type-check` 门禁在分支上已红，本次未一并处理，建议单独修复。

### 生产悬浮卡片体系（收藏夹栏与标签页）全面对齐 Design System 规范与头像全面圆形化

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**收藏夹栏与标签页悬浮卡片全面升级**：彻底替换侧边栏收藏栏与 TabBar 标签页弹出卡片的旧版样式——`RoutePreviewTrigger` 显式挂载 `HoverCardArrow` 气泡指向箭头，依据路由类型智能分发 `size="lg"` / `size="xl"`，统一 `p-3.5` 标准内边距；②**RoutePreviewCard 核心壳重塑**：移除陈旧生硬的 `<Separator />` 灰色横线，图标底块全面接入实体语义色彩池（`ENTITY_COLOR_CLASSES`，task/bug/project/acceptance/execution/release/member/team 专属语义色），标题采用高密度 `text-xs font-semibold`，类型徽章升级为细线描边或语义胶囊；③**全量业务卡片对齐 Design System 四层架构**：重构 `TaskPreviewBody`（引入 `StatusPill`、`PriorityFlag` 与 `SeverityBar`，常规工单呈现状态+优先级彩旗+迭代，P0 缺陷呈现 Blocker 高危红色告警带与环境/关联工单）、`ProjectPreviewBody`（健康度评级+交付进度条+项目大盘属性区）、`AcceptancePreviewBody`（门禁通过率点阵矩阵+审计风险预警）、`ExecutionPreviewBody`（双轨指标胶囊+审批拦截告警）、`ReleasePreviewBody`（SemVer Tag+门禁归档闭环）、`MemberPreviewBody`（双表面对称三列头部+圆形头像+在线状态）、`DocumentPreviewBody`、`TeamPreviewBody`、`RepositoryPreviewBody` 与 `GenericPreviewBody`；④**头像规格全面圆形化**：全仓头像选择器、列表、详情、卡片统一采用 `rounded-full`，彻底清零圆角矩形；⑤**门禁与单测**：`tsc -b` 0 错，Vitest 70 个文件 317 项用例全绿通过，7 项治理脚本与 ESLint 保持 0 error 0 warning，`check:docs-sync` 100% 校验通过。 | 用户指令（侧边栏收藏夹与标签页悬浮卡片老旧样式彻底升级对齐 Design System） | `tsc -b` 0 错；Vitest 70 文件 317 用例全绿；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告；`pnpm check:docs-sync` 通过 | 同步更新 CHANGELOG.md |

### Design System 深度优化——双表面头像体系（人类 NiceAvatar × AI Avvvatars）与 HoverCard 闭环矩阵

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**双表面头像体系裁决与落地**：舍弃所有非标与旧版方案（Dicebear、Emoji 及静态临时 SVG），正式确立双表面唯一样式契约——人类同事采用 `react-nice-avatar` 确定性插画肖像（生动、温暖、专业，具备多种发型、肤色、服饰与表情）；AI 同事与 Agent 采用 `avvvatars-react` 确定性算法几何符号（冷峻、精密、高科技感）；②**统一组件升级**：`MemberAvatar` 自动按 `type`（`human` vs `ai_agent`）路由至双引擎，`AvatarPickerField` 预设项全面替换为人类插画肖像与 AI 算法几何，全仓头像均由本地纯 SVG 驱动，零外网 API 依赖，离线与 Tauri 桌面端 100% 稳定；③**Design System 展台全景重塑**：重构 `AvatarModernizationShowcase` 展台为双引擎实时工作台（支持人类肖像随机变幻换装、AI 几何/字符模式切换、参数实时展示）及 12 位人机协同全景团队画廊；MemberAvatar 5 级尺寸阶梯全部接入双表面新规范；④**HoverCard 闭环矩阵落地**：补齐 Release 版本发布卡片，与 Task 工单、Bug 缺陷、Acceptance 验收门禁、Project 项目、Execution 执行审批共同构成 2 行 × 3 列 6 卡闭环审查矩阵；⑤**治理与门禁**：修复非标 `text-9` 字阶，清除 arbitrary class 与 unused imports，全套治理门禁（palette/arbitrary/registry/spacing/icons/eslint）0 error 0 warning 100% 通过。 | 用户指令（双表面头像规范定夺与外观优化） | `tsc -b` 0 错；`vitest run src/modules/design-system/pages/design-system-page.test.tsx src/modules/team-member/components/member-avatar.test.tsx` 8/8 全绿；`pnpm lint` 7 道治理门禁 + eslint 全部 0 错 0 警告通过；`check:docs-sync` 校验通过 | 同步更新 CHANGELOG.md |



### 命令面板外观对齐 design-system 设计语言——图标/键位徽章/底部键位提示栏

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 真实全局面板（shared/command-palette）外观对齐 design-system 页 Command Palette 设计：①原语层 command.tsx——CommandInput 搜索图标移左+右侧 ESC 键位徽章+外框 border-b、CommandShortcut 升级为 kbd 键位徽章、CommandItem 条目间距/圆角对齐设计稿（px-3 py-2 rounded-md）、CommandGroup 分组标题小型大写字距（text-10 uppercase tracking-wider）、新增 CommandFooter 底部键位提示栏（↑↓ 导航/↵ 选择/ESC 关闭+右侧触发键 ⌘//Ctrl+/ 平台感知，自包含 i18n）、Dialog 容器 w-140+shadow-2xl；②注册表 commands.ts 图标双通道填充——页面命令给 entity（shell-layout 经 getEntityIcon 解析，单一图标真相源，原「icon 预留不填充」口径废止）、动作/非实体页面直接给 lucide 图标（admin=UserCog 对齐裁决），25 条命令全部有图标；③design-system 页演示段由手写静态假模型改为消费真实 Command 原语+真实数据形态（entity-icons 图标/真实 Alt A 键位），删除从未实现的 G D/G P 系假快捷键展示，静态展示变活体（键盘上下键可导航） | 用户指令（外观对齐设计稿） | vitest 70 文件 316 用例全绿（含 design-system 页 cmdk scrollIntoView stub 修复）；tsc -b 0 错；eslint 改动文件 0 error 0 warning；治理脚本 icons/registry(99)/arbitrary 全过；i18n 双侧 3261 键对称（+hintNavigate/hintSelect/hintClose） | commandPalette.hint* 双语 3 键；COMPONENTS.md command 登记行不变（原语文件未新增） |

### 集成接入 P0 收敛性修复（集成接入规范 v0 §九 P0：①②③④）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 四项安全/收敛修复：①`POST /integrations/github/test-inline` 补 `JwtAuthGuard`+`ApiBearerAuth`（B6/R1/D7 补 guard 保留，对齐 linear 同名端点，匿名 token 代理滥用面清零）；②github webhook 无 secret 场景由「带任意 signature 即放行」改为一律拒绝（`verifySignature`→`verifyWebhookSignature` 返回 {ok,reason}，无 enabled 配置/无 secret/签名不匹配三类拒绝原因均写 WebhookEventLog 审计并抛 **401** UnauthorizedException，B7/R2/D8 直接修不加灰度）；③访问校验三处三口径收敛为 `IntegrationService.assertIntegrationAccess()` 单一实现（配置不存在→NotFoundException、project 无成员→ForbiddenException、global 全 workspace 可见注释为既定语义），github/linear controller 删私有实现改注入调用，integration.service 四处内联检查同步收敛，模块环用 forwardRef（对齐仓库既有先例）；④顺手清本文件面 unused-vars（GitHubClient/ApiResponse/前端 Settings/Globe/any 断言） | 集成接入规范 v0 P0（本地） | `npx vitest run src/modules/integration` 21/21（新增 github.controller.spec 5 用例：test-inline guard metadata、webhook 无配置/无 secret/签名不匹配三拒绝 401、正确签名放行；integration.service.spec +3：assertIntegrationAccess NotFound/Forbidden/global 放行）；tsc -p tsconfig.build.json --noEmit 0 错；eslint 改动文件 0 error 0 warning | openapi.json 契约变更：test-inline 新增 security 声明（contract:export→generate→check 三件套零漂移 ✓，生成 api-types.gen.ts 零 diff）；规范文档 §一 B5/B6/B7 问题基线已清偿（本地） |
| frontend | GitHub 集成前端创建入口断裂修复（F2）：新建 `modules/github/components/github-config-form.tsx` Connect 流对话框（对称 linear-config-form：Display name + PAT + 可选 Webhook Secret 三字段，type=password+autocomplete 关闭；Test 按钮走受保护 test-inline 校验显示 viewer/sampleRepo；Save & Connect 走通用 `POST /integrations` provider='github' 凭据落库由后端加密，**「仅测试不保存」不再是终态**）；integrations-section 卡片 onConnect 的 `i.id==='linear'` if-else 硬编码链重构为映射驱动（`connectFlows` 注册表 + `providerSettingsRoutes` 路由表，规范 §3.1/§七#15，GitHub 卡 Connect/Reconnect 按钮激活，成功后跳转 /app/settings/integrations/github）；github-integration-section 空态引导从「指向不存在的创建页」纯文本改为页头+空态双「Connect GitHub」按钮直开创建对话框（空态引导指向真实入口） | 集成接入规范 v0 P0-①（本地） | `npx tsc -b` 0 错；`npx vitest run src/modules/settings src/modules/github` 5/5 全绿；eslint 改动三文件 0 error 0 warning | 集成管理页 GitHub 卡片 Connect 流打通（用户可从前端完整创建 GitHub IntegrationConfig，验收标准见规范 §九 P0） |

### eslint warning 全仓清零（用户裁决⑤）——frontend 142 处 + server 收尾 12 处

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | warning 142→0：`no-explicit-any` 68 处（补真实类型 ~41——form 用 `UseFormReturn<T>`、API 层用 `QueryOf`/`ResponseOf` 契约单源、局部接口；unknown 收窄 13；删多余断言 8；测试 fixture 显式目标类型 16）；`no-unused-vars` 62 处（删死代码 ~50/解构省略 8/`_` 前缀 3，eslint 配置补 `^_` ignorePattern）；`set-state-in-effect` 7 处全部语义化重构零 disable（渲染期比较重置/URL 参数派生/ref 闸/数据版本化编辑派生）；`exhaustive-deps` 5 处补全或 useMemo 化；仅 1 处 disable（mdx-pipeline @mdx-js Runtime 类型边界） | 用户裁决⑤ | eslint 0 error 0 warning；tsc -b 0 错；vitest 70 文件 315 用例全绿；治理脚本四件套全过 | 行为微调五处（向导落 `?wizard=1`、ingest 失败不再误显成功横幅等）已在代码注释与代理报告记录 |
| server | integration 领地收尾 12 处 unused-vars 清零（未用 import 4、死赋值/死代码 2、`_` 前缀占位 5、解绑保留校验调用 1），全仓 lint 归零 | 用户裁决⑤ | pnpm lint 0 error 0 warning；tsc 0 错；integration 套件 21/21 | 无 |

### frontend 存量未使用 import 清理（夜航质检自修）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 按 eslint `@typescript-eslint/no-unused-vars` 报告清理 69 处未使用 import 说明符（55 文件：34 处整行删除、35 处保留其余具名导入的说明符级裁剪，含 e2e spec 4 处；纯机械删除，不改任何运行时逻辑与导出面） | 夜航质检（用户指令） | 复跑 tsc -b 0 错；vitest 70 文件 315 用例全绿；eslint 0 error / 145 warning（214→145，恰减 69）；治理 lint 七件套全过 | 无（本条目即记录） |

### 命令面板全量刷新——17→25 命令/i18n 化/TabBar 入口修复

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 命令数组从 shell-layout 硬编码抽出为 `shared/command-palette/commands.ts` 注册表（条目存 i18n key，翻译时点在 shell-layout，预留 `icon?` 字段对齐图标统一线）；新增 9 条一级命令（workflows/acceptance/decisions/executions/office/repositories/notifications/search/profile），路由逐一对照 router.tsx；四分组（导航/工作流与治理/协作与工具/系统+操作）；删除 cmd-ai-management 冗余（与 cmd-ai 同目标）与全部假快捷键（G P 系 chord 从未实现，仅保留真实 Alt A）；修复 TabBar「+」按钮 `open-command-palette` 事件零监听 bug（provider effect 监听共享常量）；面板 placeholder/空态/dialog title 与兜底分组全部 i18n 化；死键清理（shell.openTerminal）与 searchPlaceholder 迁移为 `search.placeholder`（盘点纠偏：原键 search-page 在用，原写法 `t(key) || fallback` 的 fallback 永不生效） | 用户插队指令（夜航） | command-palette.test 8/8（注册表形态/id 唯一/9 新路由/防回归/仅 Alt A/CustomEvent 开面板/i18n 渲染）；受影响面回归 19 文件 89 用例全过；tsc -b 0 错；eslint 0；zh/en 各 3237 键对称脚本校验 | i18n shell.group* / commandPalette.* / search.placeholder 双语增删 |

### 实体图标注册表 v0 + Issue 域试点 + HoverCard 变体扩充

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 新建 `shared/entity-icons/` 实体图标唯一注册表（13 实体+release 增量，`{icon,tone}` 条目+`getEntityIcon`+`<EntityIcon>`，文件头「实体图标规范 v0」，图标唯一性测试强制防撞车）；定夺：issue=CheckSquare/bug=Bug/project=FolderKanban/workflow=Workflow/execution=Play/acceptance=ShieldCheck/document=FileText/member=Users/team=UsersRound/decision=Scale/workspace=Database/repository=GitBranch/release=Tag（多数注册表面+语义+防撞车原则）；Issue 域试点接入（tasks-page/bugs-page PageHeader、apm-ref-chip KIND_ICON 全量、task-card 子任务计数）；状态副本收敛试点：task-rows/task-simple-list 本地 STATUS_CFG 改派生自 TASK_STATUS_VISUALS（消灭 Loader/AlertCircle 旧名偏差，第二批剩 board-presets/delivery/executions 三处）；HoverCard（base-ui PreviewCard）cva size 四档变体（sm/md/lg/xl）+HoverCardArrow，默认渲染零破坏；preview-fields 新增 PreviewSection/PreviewFooterMeta 富信息共用件，member 预览卡示范增强（资料/AI 配置/标签/底部元信息，w-72 不膨胀）；design-system 页补变体演示；COMPONENTS.md 登记更新 | 用户插队指令（夜航） | entity-icons.test 7/7 + hover-card.test 5/5；全仓 vitest 70 文件 315 用例全过；tsc -b 0 错；eslint 0 error（4 warning 经 stash 基线比对为存量）；check-icons/check-component-registry(99)/check-tailwind-arbitrary/check-semantic-classes/check-palette 全过 | 第二批铺开清单+ShieldCheck 三方重叠+MemberCardPopover 归一裁决点登记于注册表文件头（本地） |

### 测试稳定性——PrismaService e2e 负载型超时加固

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | `prisma.service.spec.ts` 两个 onModuleInit/onModuleDestroy 用例加 15s 超时余量（默认 5s 在多进程并行负载下被推爆误报，单跑 944ms 实耗）——夜航并行代理跑全量 gate 时不再环境型误报 | — | 全量 vitest 550/550（负载复跑验证）；单套件 4/4 | 无（测试代码） |

### 工作流详情页实机反馈改造（CAP-A-12）——连线/占满屏/右侧栏/节点库/标题栏/预览小窗

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 实机验收五条反馈一次性收口：①**连线与节点形态**——自定义节点补 Handle 连接点（此前边完全不渲染的根因），smoothstep 折线+语义描边，节点升级为「图标+标题+描述行+上下接口点」（描述行按类型取 prompt/URL/message/比较式/action id 摘要，数据源从 stepsSummary 换为 definition.steps 完整字段），human-confirm 出边保留动画强调；②**画布占满**——详情页改 `PageShell overflow-hidden` 自管布局，画布 flex-1 占满剩余高度（h-72 限高解除），运行历史与 run 详情整体迁入 `RightSidebar`（SubPageToolbar 侧栏开关收放，suspended 确认卡与输出面板原样保留）；③**节点库**——新增 `WorkflowNodePalette` 分类待选组件（AI 能力/人工环节/流程逻辑/集成/产品动作五组，产品动作组展开 /workflows/actions 注册表目录，点击直接插入带 action id 的步骤），编辑模式布局=左节点库+中画布+右属性面板三栏；④**标题栏标准化**——手写返回行替换 `SubPageToolbar`（返回/面包屑/v 徽章/编辑与保存动作/侧栏开关）；⑤**预览小窗**——画布加 `MiniMap`（左下角，按步骤类型语义着色，可平移缩放）与 `Controls`（右下角缩放复位） | CAP-A-12 | workflow 模块 15/15（转换器+编辑器+页面既有用例全过）；前端 67 文件 295 用例全绿；tsc -b 0 错；设计 lint 五件套过；eslint 0 警告 | i18n workflow.palette.* 双语 12 键；GAP-T-14 持续（本地） |

### 工作流画布切片②③④（CAP-A-12）——画布编辑 + 产品动作节点（文法 v2）+ AI 草拟与模板库

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 切片②（编辑回写）：补定义 CRUD REST——`POST /workflows`（key kebab-case 校验+冲突 400+文法校验落库）、`PATCH /workflows/:id`（definition 变更时 version 自增，返回 stepsSummary）；人直接编辑不走决策卡（AI 代写仍走决策卡，双通道语义分立）。切片③（产品动作节点/文法 v2）：新 `action` 步骤类型（id/title/action/params，params 叶子支持插值）+ 动作注册表 `workflow-actions.ts`（单一真相，新增动作=登记一个 def）：首发 `issue.create`（projectId/title 必填，status=todo 落库）与 `document.create`（projectId/title/content 必填），执行直接走 prisma（对齐组合件 applier 先例防模块环）+ 必填参数执行期可读报错；`GET /workflows/actions` 目录端点（前端节点库与 AI 代写共用）；编译器注入 prisma 编译 action 步骤。切片④：`workflow-builtin.ts` 升级 BUILTIN_WORKFLOW_TEMPLATES 模板清单（新增「需求转任务」实战模板：llm 起标题×2 → human-confirm → condition → action issue.create，onModuleInit 遍历 upsert）；新增 `workflow-draft` 静默场景（自然语言描述 → 文法说明+动作目录注入 → 输出 {name, description, steps} 草稿，写数据前必须 human-confirm 的纪律写进指令） | CAP-A-12 | workflow-compiler.service.spec 7/7（+2：action params 插值后落库建 issue 且输出进 steps[id]/未知 action 与缺必填参数 run failed）；assistant-silent.service.spec 33/33（+2：workflow-draft 指令含五类步骤说明与动作目录+草稿透传、缺描述 400 不触 LLM）；contract:export→generate→check 零漂移；server 官方 type-check 0 错 | 能力清单 CAP-A-12 doing（本地）；GAP-T-14 部分清偿（本地） |
| frontend | 画布升级可编辑：`WorkflowCanvas` 支持 onStepClick/selectedId（编辑模式点选高亮）；新增 `WorkflowStepEditor` 属性面板（按类型渲染字段表单：llm prompt/http url+method+body JSON/human-confirm message/condition 左值+比较符+右值/action 动作下拉+params JSON——动作下拉取 /workflows/actions 目录；结构化字段非法 JSON 不落变更；面板内集成在此后插入/删除/上移/下移）；workflow-detail-page 编辑模式（编辑按钮 → definition 步骤副本 + 画布点选 + 面板编辑 → 保存 PATCH version+1 / 取消丢弃）；list-page 新增「新建流程」对话框：基本信息 + **AI 草拟**（自然语言 → workflow-draft 场景 → steps 草稿预填，名称自动带出 → 保存进画布继续修改）；新增 useWorkflowDraft hook（防御性解析，name/steps 不完整整单拒绝）；i18n workflow.editor.*/createDialog.* 双语 38 键 | CAP-A-12 | workflow-step-editor.test 5/5（llm 字段渲染/action 下拉与参数域/onChange 携带新值/非法 JSON 不落/操作按钮边界禁用与回调）；workflow-canvas.test 6/6（+action 节点转换）；前端 67 文件 295 用例全绿；tsc -b 0 错；设计 lint 五件套过；eslint 0 警告 | GAP-T-14 持续（本地） |

### 工作流节点画布切片①（CAP-A-12）——definition 只读可视化

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 新增 `modules/workflow/components/workflow-canvas.tsx`：@xyflow/react（React Flow v12）只读节点画布——`stepsToFlow` 纯函数转换器把步骤链映射为「触发 → 步骤… → 完成」垂直节点图（四类步骤各一形态：llm 紫 Sparkles / human-confirm 黄 ShieldCheck 且出边 animated 强调人工闸门 / http 蓝 / condition 橙 GitBranch 预留分支语义，未知类型回落中性形态保证文法 v2 前向兼容）；step 节点不可拖拽不可连线（只读切片）；workflow-detail-page 定义卡步骤 pills 链替换为画布（清理失效 import）；i18n workflow.canvas.* 双语 8 键；新依赖 @xyflow/react 登记入 frontend package.json（纯 UI 库无构建脚本，无需 allowBuilds） | CAP-A-12 | workflow-canvas.test 5/5（线性链节点/边首尾相接+human-confirm 边 animated/空步骤双端点/未知类型不炸/step 节点数据携带与不可拖拽 + 渲染冒烟）；前端 66 文件 289 用例全绿；tsc -b 0 错；设计 lint 五件套过（修复 interview-chat 的 max-w-[85%] 任意值违例→max-w-sm）；eslint 0 警告 | 能力清单 CAP-A-12 新卡 doing（本地）；测试映射矩阵 GAP-T-14 登记（本地） |

### 需求承接三期（CAP-P-01）——剧本访谈动态追问：AI 会话访谈形态

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 新增 `interview-dynamic` 静默场景（沿用 grill-next 的无状态多轮协议，零服务端会话态）：context 收当前阶段问题组（questions）/阶段目的（stagePurpose）/已答历史（history 全量传，同 grill 先例）/阶段产物文档 id（artifactDocumentIds→prepareContext 查库注入标题+正文，遵守 ADR-012「服务端不做剧本感知」解耦原则）；指令协议：未收敛每轮一问+2~4 个猜测选项（优先追问对话与工件中模糊/缺失/矛盾处，问题组固定问题不逐条问用户——由最终答案集承载），收敛时一次性输出覆盖问题组全部 id 的 answers（沿用 interview-prefill「绝不编造、拿不准写待确认」纪律） | CAP-P-01 | assistant-silent.service.spec 31/31（+3：首轮追问 instructions 含问题组/目的/空历史提示+question 轮透传/工件查库注入与已答历史进入 instructions+done 轮 answers/缺问题组 400 不触 LLM）；listScenarios 目录断言更新 | 决策日志三期实施补记（本地）；能力清单变更记录（本地） |
| frontend | InterviewDialog 升级双形态（ADR-010 三期「访谈 Dialog 换 AI 会话形态」落地）：默认「AI 会话访谈」（新增 interview-chat.tsx：气泡对话流+猜测选项 chips 点击即答+Enter 发送，挂载自动开问、ref 防 StrictMode 双发；收敛后答案**只填空**回填表单（不覆盖手填）并自动切回表单供人审改提交——「AI 代写→人确认」语法保留 submitInterview 确定性转写与闸门），「直接填写」静态表单保留为兜底形态（AI 不可用/8 轮上限到限时管道仍通）；新增 use-interview-dynamic hook（防御性解析 question/done 双轮，答案过滤复用 parseInterviewPrefill 只留问题组内合法 id）；剧本页传入当前阶段产物 documentId 作为 grounding；i18n 双语 10 键 | CAP-P-01 | interview-dialog.test 5/5（chat 首问自动触发+choices 即答历史累积/done 只填空回填切表单/表单兜底全链提交/预填不覆盖——原三用例适配双形态）；前端 65 文件 284 用例全绿；tsc -b 0 错；新文件 eslint 0 警告；server 官方 type-check 0 错 | 无 |
### 验收证据回流一期（CAP-B-08）——GitHub PR 终态与 CI 结论自动回流验收

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 激活 `RemotePullRequest` 死列关联（此前 acceptanceId/executionRunId/projectId 四列自建表起从未被写入，PR→验收无挂点）：`POST /integrations/github/:integrationId/pulls` 建端点 body 增可选 `acceptanceId`/`executionRunId` 透传，`recordPullRequest` 落库时由 acceptance→issue 推导 projectId；webhook 分发新增 `check_run` 事件（原仅 pull_request/pull_request_review，check_run 走 debug 丢弃），`GitHubSyncService.handleCheckRunEvent` 仅在 completed+conclusion 时发布 `github.check_run.completed`；新增 `acceptance/github-evidence.subscriber` 订阅两类事件——PR 终态（merged/closed）合并写入 completionEvidence（保留 artifacts/report/autoChecks，补 prUrl/state/prNumber/prRepo/prSyncedAt，打通 accept-completion 对 pr 契约「仅 merged 可接收」的前置校验，消除人工手填 PR 链接；仅 completionType=pr 且未裁决的验收消费），CI 结论按 headBranch 解析关联 PR 后落到 source='ci' 的标准（evidenceType=ci_result，submittedBy=system:github-checks 哨兵，content 含 sha 防重）。已知边界：回流落默认库（webhook 无 x-workspace-id 头，与既有 github-sync 同库口径），多库工作区跨库回流待集成配置入工作区后统一裁决 | CAP-B-08 | github-evidence.subscriber.spec 5/5（merged 补全并保留既有字段/已有 prUrl 不覆盖/非终态·无关联·非 pr 契约·已裁决四类跳过/CI 结论落 ci 标准含 metadata/无分支·无关联·无 ci 标准·重复投递四类跳过）；server tsc 0 错；contract:check 零漂移 | 能力清单 CAP-B-08 planned→doing 一期（本地） |
| frontend | 验收详情页证据可见化：标准行证据计数由纯数字改为可展开（点开渲染证据明细列表=类型徽章+内容+外链（metadata.htmlUrl/storageRef）+时间）；完成证据卡新增 PR 状态行（GitPullRequest 图标+repo#number 链接+state 徽章 merged 绿/closed 红+回流时间）——GitHub 侧合并 PR 后 APM 内即可见，无需人工回填；`acceptance-api` 的 CriterionEvidence 补 metadata、CompletionEvidence 补 prNumber/prRepo/prSyncedAt（后端 DTO metadata 字段已存在，仅前端类型镜像缺口）；i18n acceptanceDetail.evidence.pr/list + evidenceType 七类双语 12 键 | CAP-B-08 | frontend tsc -b 0 错 | 无 |

### 完整性审计前端收口（CAP-B-02）——审计清单选择器 + 完备性清单管理面

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 补齐完备性清单 CRUD 的 REST 面（service 层 createTeamChecklist/updateTeamChecklist 已存在但从未暴露）：`POST /_api/acceptance/checklists`、`PATCH /_api/acceptance/checklists/:id`（isSystem 400/非所有者 400/version 自增）、`DELETE /_api/acceptance/checklists/:id`（新增 removeTeamChecklist，同守卫口径），userId 沿用 `@Query('userId')` 仓库惯例；修复存量 DTO 缺陷——`CreateChecklistDto.checklist`/`UpdateChecklistDto.checklist` 误标 `@IsString()`（传数组必 400，此前端点不存在故未暴露），改为 `@IsArray + @ArrayMinSize(1) + @ValidateNested(each) + ChecklistItemDto`（severity 收紧 `@IsIn(critical/high/medium/low)`、autoFixable `@IsBoolean`） | CAP-B-02 | acceptance e2e +7（团队清单创建归 ownerId/缺 userId 400/update 升版 version=2/系统清单改 400/非所有者改 400/删除/重复删 404，全绿）；contract:export→generate→check 三件套零漂移 | 能力清单 CAP-B-02 gap→doing（本地） |
| frontend | 验收详情页审计 tab 增加审计清单选择器：修复此前跑审计 `checklistId` 恒为 undefined、全靠项目 metadata 自动匹配技术栈，匹配不到时工程完备性检查**静默跳过**且用户无感知的问题——新增「自动匹配/系统预置清单/团队自定义清单」分组下拉（NativeSelect + OptGroup），runAudit 携带所选清单；新增设置子页「完备性清单」（`/app/settings/checklists`，对齐 issue-types 管理页形态）：系统预置组只读展示（名称/描述/projectType/techStack/项数/系统徽标），团队自定义组 CRUD（创建/编辑 Dialog 表单含检查项行编辑器：分类/内容/严重级别/可自动修复，仅 ownerId 本人可编辑删除）；`acceptance-api` 补 checklists 类型与四个函数、`use-acceptance` 补 useChecklists/useCreateChecklist/useUpdateChecklist/useDeleteChecklist；settings-nav/page-registry/router 三处登记；i18n 双语 35 键同步 | CAP-B-02 | checklists-section.test 5/5（分组渲染/系统行无操作按钮/创建负载含 projectType+checklist/空名校验拦截/删除走确认框）；frontend tsc -b 0 错、eslint 新文件 0 警告、设计 lint 五件套（tokens/semantic/palette/spacing/icons）全过 | 人工执行路径的审计闸门提示暂缓（与 CAP-B-08 证据回流一并设计）；能力清单变更记录已登记（本地） |

### 仪表盘风险项逾期天数改按自然日口径（消除整日边界跳变与单测 flaky）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | `dashboard.service.ts` 的「逾期 N 天」由 `Math.max(1, Math.ceil((now - dueDate) / 86400000))` 改为按自然日差计算（新增 `calendarDayDiff`：两端归一到本地日历日零点后再取天数，`Math.round` 吸收夏令时 23/25 小时日长）。旧口径按毫秒差向上取整，会把「昨天 10:00 到期、今天 11:00 查看」显示成逾期 2 天，且任何整日边界上的毫秒跳变都会让同一任务在两个瞬间显示不同天数——该不确定性也是 `dashboard.service.spec` 在 CI 偶发失败的根因 | 仪表盘 | `dashboard.service.spec` 8 条全绿；新增回归用例「25 小时前到期算 1 天而非 2 天」（旧口径取值 2、新口径取值 1，可稳定区分）；既有逾期用例改用 `vi.useFakeTimers` 固定系统时钟 | 产品可见行为变更：逾期天数不再按「不足一天进一天」放大，改按自然日 |
| server | `dashboard.service.spec.ts` 逾期用例改用固定系统时钟，去除对真实时钟的依赖 | 仪表盘 | server 530 用例全绿 | CI 不再受运行时刻影响 |

### workflow 执行引擎基座（CAP-A-11）——Mastra 引入 + 独立 WorkflowModule + 前端管理页

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 新增独立 `modules/workflow` 模块（编排逻辑不进 ai-hub）：引入 `@mastra/core@1.65`（Apache-2.0）+ `@mastra/libsql@1.22` 持久执行内核，LibSQLStore 落本地 `data/mastra-workflows.db`；definition JSON 文法（v1：llm/http/human-confirm/condition 四类步骤，线性链+累积上下文 `{input,steps}`+模板插值 `{input.x}/{steps.y}`，code/plugin 待沙箱落地后放开）经 WorkflowCompilerService 编译为 Mastra 可执行链；llm 步骤复用 ai-hub AdapterRegistryService（generateText，abortSignal 透传），human-confirm 走 Mastra suspend/resume（suspendPayload 记入 AIWorkflowRun.stepsState 供前端确认卡），condition 为比较闸门（met=false 整 run failed），http 为 fetch+JSON 解析+100KB 截断保护；run 记账复用 AIWorkflowRun 表（引擎 runId=产品侧 run id 双写关联），状态映射 success/failed/suspended→succeeded/failed/suspended，进度经 message-bus `ai.workflow.update`→socket 广播；REST 六端点接管原 ai-hub 空壳（GET /workflows、GET /workflows/:id、POST /workflows/:id/run、GET /workflow-runs、GET /workflow-runs/:id 真 detail 含 waitingApproval、POST /workflow-runs/:id/resume），旧 /ai/workflows* 空壳端点+workflow-engine/executor 孤儿文件删除；内置 demo `project-brief-demo`（起草→人工确认→闸门→验收要点）onModuleInit upsert。已知边界：suspended run 的 resume 依赖进程内句柄，服务重启后诚实降级 400（跨重启快照恢复留待后续） | CAP-A-11 | workflow-compiler.service.spec 5/5（文法校验/llm 插值/http 插值解析/human-confirm suspend→resume 全链/condition 双分支，真实 Mastra 引擎+LibSQL 临时库）；contract:export+contract:generate+contract:check 三件套零漂移；server tsc（除主仓库存量 spec 错）0 新错 | 能力清单 CAP-A-11 新卡 doing（本地）；GAP-T-13 登记（本地） |
| frontend | 新增 `modules/workflow` 管理页基座：列表页（定义卡网格 v 徽章/描述/步骤摘要+运行对话框 JSON 入参校验）；详情页（步骤时间线 human-confirm 高亮+run 历史状态行+run 详情面板：状态/触发方式/输出 JSON 预览/suspended 确认卡=草稿展示+审核备注+批准并继续/拒绝）；hooks 层 TanStack Query + eventClient `ai.workflow.update` 推送失效 + run 详情 5s 轮询兜底（running/suspended 时）；路由 /app/workflows、/app/workflows/:id + 侧边栏「工作流」导航；i18n workflow.* 双语 30 键（3111 键同步）；vite proxy target 支持 VITE_API_PORT 环境变量（worktree 并行场景） | CAP-A-11 | workflow-pages.test 4/4（列表渲染/空态/触发对话框参数提交/suspended 确认卡批准负载）；前端 tsc -b 0 错；eslint 0 警告；实机全链验收：浏览器登录→列表→运行→等待人工确认→批准→已成功（四步 step 输出全落库） | COMPONENTS.md 可后补（本地） |
| server | assistant 工具面四件套（「AI 代写 → 决策卡人确认 → 落库」主线语法）：list_workflows/read_workflow 只读直查（read 返回 definition 文法样例供 AI 学习文法）；create_workflow/update_workflow 代写路径——parseWorkflowDefinition 前置校验（AI 写错当场可读反馈：缺 prompt/key 非法/类型不支持）、create 查重提示改走 update、update 查存在性携 currentVersion，校验通过创建 workflow_def 决策卡（提案人归因小周，detail 记步骤链）；决策卡 accept → proposal.service.applyWorkflowDef applier 二次文法校验后落库（create 建 v1 记批准人，update 按 key version+1，key 冲突/缺失 400 且卡片留待决可重试）；目录（CLI 路径）与 LLM 路径双注册 | CAP-A-11 | proposal.service.spec +5（create 落库与批准人/重复 key 400/文法非法 400/update 升版/缺失 key 400，15/15）；assistant-tools.service.spec +3（目录登记与摘要/文法反馈查重/update 负载，14/14）；实机验收：建卡→批准落库→/workflows 出现新定义→触发运行 llm+human-confirm 挂起全链正常；决策收件箱 workflow_def 卡渲染核验 | GAP-T-13 注记（本地） |
| frontend | 决策卡支持 workflow_def：DecisionKind/PROPOSAL_KINDS 扩展，KIND_ACTIONS 加「落库生效/驳回」，SLOT_BUILDERS 注册 buildWorkflowDefSlots（名称/描述/key/步骤链 human-confirm 高亮/变更模式与版本 impact 行）；i18n decision.action.applyWorkflow + decision.workflow.* 双语（3116 键同步） | CAP-A-11 | 决策收件箱实机渲染核验（步骤链/变更模式/按钮组）；tsc -b 0 错 | 无 |

### 仪表盘与统计卡片上下间距收敛与消除内边距双重叠加（DESIGN.md §3.3）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs | `DESIGN.md` 与 `docs/design/DESIGN.md` 同步更新 §3.3：明确禁止 Card 内边距双重叠加反模式（严禁在自带 py-3.5 的 Card 内为 CardContent 随意添加 p-5/p-6），确立数据卡片矩阵行间距统一为 space-y-3（12px）与 gap-3 规范 | CAP-P-01 | pnpm check:docs-sync | DESIGN.md §3.3 同步更新 |
| frontend | 根治仪表盘卡片上下间隙过大与内部大块空白缺陷：`dashboard-page.tsx` 中 `KpiCard` 显式设置 `Card py-0` + `CardContent p-3.5`（四周精准锁定 14px，消除原 34px 巨大内边距），图标容器规整为 32px（size-8），紧凑化内部元素间隙；骨架屏同步收缩至 h-28（112px） | CAP-P-01 | 7 项设计门禁通过，tsc 0 错 | 解决 KPI 卡片上下空旷缺陷 |
| frontend | 聚合仪表盘 KPI 卡片两排矩阵：将 Row 1（4卡）与 Row 2（3卡）收束在 `space-y-3` 统一数据区块中，卡片网格间隙规整为 `gap-3`，将原两排卡片之间高达 24px 的割裂距离减半至 12px；全页垂直区块间隙由 `space-y-6`（24px）收敛至 `space-y-4`（16px） | CAP-P-01 | 7 项设计门禁通过，Vitest 全绿 | 消除卡片行间空虚感 |
| frontend | 消除图表卡片与分析页统计卡内边距冗余：`dashboard-page.tsx` 中生产力趋势、健康度图表、成本卡片与快捷操作卡移除 `p-5` 并规整为 `py-0` + `p-4`；`analytics-page.tsx` 中 `StatCard` 规整为 `py-0` + `p-3.5` | CAP-P-01 | Vitest 273 用例全绿 | 对齐 DESIGN.md §3.3 |

### 移除主体模块割裂边界线、侧栏收缩左右对称与 Logo 垂直对齐

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs | `DESIGN.md` 与 `docs/design/DESIGN.md` 同步更新 §3.5：明确一体化无分割线画布规范（取消侧栏 border-r 与顶栏 border-b）、收缩态栏宽规整为 64px（w-16）且左右留白绝对等宽（12px 对称）、展开/收缩态 Logo 与菜单项图标垂直对齐基线（展开态 X=20px，收缩态 X=32px 严格共线） | CAP-P-01 | pnpm check:docs-sync | DESIGN.md §3.5 同步更新 |
| frontend | 消除主体模块间割裂线：`shell-layout.tsx` 根容器底色对齐 `bg-sidebar`，移除 aside 的 `border-r`、TabBar 外层的 `border-b`、移动端 Header 的 `border-b` 与底部同事位的 `border-t`，实现连续一体化的浅色/深色磨砂底座 | CAP-P-01 | 7 项设计门禁通过，tsc 0 错 | 对齐 DESIGN.md §3.5.1 |
| frontend | 侧栏折叠态严格对称居中：`sidebarCollapsed` 宽度从 `w-17`（68px）精简为 `w-16`（64px），导航容器改为 `flex flex-col items-center px-0`，菜单项设为 `size-10`（40px 居中），消除原右侧过宽问题，实现左右严格等宽各 12px；未读红点采用 `right-1.5 top-1.5 ring-2 ring-sidebar` 贴边；折叠展开按钮尺寸规整至 `size-10` 居中 | CAP-P-01 | 7 项设计门禁通过 | 解决收缩态图标左右不等宽缺陷 |
| frontend | Logo 与菜单图标垂直完全对齐：收缩态 Logo 按钮规整为 `size-10`（40px）在 64px 容器内水平居中，与下方 40px 菜单图标的垂直中心线在 `X = 32px` 绝对共线；展开态 Logo 外层 `px-2.5` + 内部 `px-2.5`，图标左边缘与菜单图标左边缘严格锁定在 `X = 20px` 同一垂直线上 | CAP-P-01 | 7 项设计门禁通过，Vitest 全绿 | 解决 Logo 与菜单图标视觉错位缺陷 |

### 浅色模式侧边栏去黑化、Codex 类磨砂外壳与全局复合组件规范落地（DESIGN.md §3.5）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs | `DESIGN.md` 与 `docs/design/DESIGN.md` 新增 §3.5 应用壳层架构（Shell Architecture）与全局交互复合组件规范：系统定义 Codex 级磨砂分层、左侧栏（w-56/w-17，h-8 菜单项）、右侧栏（w-320/360，SidebarPanel 折叠面板）、TabBar（h-10，h-7 标签项）、左下角悬浮底座（w-11 h-11 磨砂微光晕）、全局弹窗（DialogOverlay 磨砂景深 + DialogContent 磨砂微边框）、统一创建面板与命令面板的结构、尺寸与手感基线 | CAP-P-01 | pnpm check:docs-sync | DESIGN.md §3.5 同步更新 |
| frontend | 浅色系侧栏色彩重构（去黑化）：`index.css` 根变量浅色模式全面弃用纯黑，`--sidebar-background` 统一为温润浅灰（240 5% 96%），`--sidebar-foreground` 采用高对比深字（240 10% 3.9%），悬停采用低饱和浅灰阶（240 5% 90%）；暗色模式微调深邃质感 | CAP-P-01 | 7 项设计治理门禁通过，tsc 0 错 | 对齐 DESIGN.md §3.5.1 |
| frontend | Codex 级磨砂外壳架构落地：`shell-layout.tsx` 侧栏升级为 `bg-sidebar/85 backdrop-blur-xl border-r border-sidebar-border/60`；导航项统一为 32px 高度与 12px 500字重微浮雕卡片；主内容区采用磨砂底座上悬浮的工作台卡片结构（`rounded-xl bg-background/95 shadow-sm border border-border/60`） | CAP-P-01 | Vitest 273 用例全绿 | 对齐 DESIGN.md §3.5.2 |
| frontend | 顶部 TabBar 规范升级：`tab-bar.tsx` 容器背景改为透明穿透磨砂底，TabItem 尺寸规整为 h-7，间距 gap-1，激活态采用温润白色/浅灰磨砂浮起效果，左右滚动按钮与新建按钮升级为微透磨砂控件 | CAP-P-01 | tsc 0 错，Vitest 全绿 | 对齐 DESIGN.md §3.5.3 |
| frontend | 左下角悬浮操作底座升级：`floating-actions.tsx` 主触发器升级为 44px（w-11 h-11）圆角微光晕磨砂按钮，用户信息与工作区卡片升级为 `bg-card/95 backdrop-blur-xl border-border/70`，遮罩升级为轻柔磨砂 | CAP-P-01 | tsc 0 错，7 项治理通过 | 对齐 DESIGN.md §3.5.5 |
| frontend | 全局弹窗体系磨砂升级：`dialog.tsx` 遮罩 `DialogOverlay` 升级为 `bg-black/30 backdrop-blur-sm dark:bg-black/60` 舒适景深，`DialogContent` 升级为 `bg-popover/95 backdrop-blur-xl border border-border/70 shadow-2xl` | CAP-P-01 | tsc 0 错，全量单测通过 | 对齐 DESIGN.md §3.5.6 |
| frontend | 统一创建面板与命令面板质感收敛：`unified-create-dialog.tsx` 容器接入毛玻璃磨砂，强化顶部工具栏（h-11）与底部操作栏（h-13）细边框分隔；`command.tsx` 优化背景穿透与条目选中高亮质感 | CAP-P-01 | tsc 0 错，Vitest 273 用例全绿 | 对齐 DESIGN.md §3.5.7/8 |
| frontend | 右侧栏与通用标签页对齐：`right-sidebar.tsx` 增加 `bg-background/50 backdrop-blur-md` 磨砂侧栏，`sidebar-panel.tsx` 折叠面板升级微透底，`tabs.tsx` 预设支持磨砂微边框 | CAP-P-01 | 7 项治理通过 | 对齐 DESIGN.md §3.5.4 |

### 仪表盘视觉中心聚焦、看板呼吸感边距升级与二级三级子页主栏收敛

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs | `DESIGN.md` 与 `docs/design/DESIGN.md` 补全 §3.4 页面级规格：新增「概览聚焦型（Overview / Dashboard）」（max-w-7xl ~1280px + px-6~10 渐进留白），补充二级/三级详情子页主栏阅读宽度收敛约束（max-w-4xl / max-w-5xl），消除大屏长文本行长失控与宽屏视觉拉扯 | CAP-P-01 | pnpm check:docs-sync | DESIGN.md §3.4 同步更新 |
| frontend | 仪表盘与效能分析大屏视觉居中聚焦：`DashboardPage` 引入 `max-w-7xl mx-auto w-full px-6 py-6 sm:px-8 sm:py-8 lg:px-10` 居中呼吸容器，骨架屏严格与真实结构等宽对齐；`AnalyticsPage` 升级至相同留白体系，消除首屏 KPI 与报表在 2K/4K 屏幕下的散漫拉扯 | CAP-P-01 | tsc --noEmit 0 错，Vitest 273 用例全绿 | 对齐 DESIGN.md §3.4 |
| frontend | 项目二级子页母版留白升级：`ProjectDetailFrame` 面包屑与内容区全面收敛至 `max-w-7xl mx-auto px-6 sm:px-8 lg:px-10`，头部与内容边距严格贴合，一次性为项目概览、项目工单看板、里程碑、项目团队、项目设置等二级子页建立聚焦呼吸边距 | CAP-P-01 | tsc --noEmit 0 错 | 对齐 DESIGN.md §3.4 |
| frontend | 全局看板与列表页呼吸感边距升级：`tasks-page`、`bugs-page`、`acceptance-list-page` 左右边距由过窄的 `px-4 sm:px-6` 升级为舒适的 `px-6 py-4 sm:px-8 sm:py-5 lg:px-10`，杜绝宽屏下首尾列卡片死贴屏幕物理边缘 | CAP-P-01 | 7 项设计治理门禁通过 | 提升宽屏阅读与拖拽手感 |
| frontend | 6 大核心二级/三级详情页主栏居中收敛：`TaskDetailPage`、`BugDetailPage`、`AcceptanceDetailPage`、`MemberDetailPage`、`TeamDetailPage`、`RepositoryDetailPage` 保持外贴视口原生滚动条的同时，主内容区包裹 `max-w-4xl` / `max-w-5xl` 居中容器，杜绝超大屏下长文本行长过度伸展 | CAP-P-01 | tsc --noEmit 0 错，Vitest 全绿 | 对齐 DESIGN.md §3.4 |

### 页面级规格与留白体系标准落地（PageShell Profile Variants + 设置页/列表页/阅读页统一规格收敛）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs | `DESIGN.md` 与 `docs/design/DESIGN.md` 补齐 §3.4 页面级规格与留白体系标准：定义 full（100% 全宽高密）、standard（max-w-5xl ~1024px 居中）、reading（max-w-4xl ~896px 黄金阅读宽）3 档规格尺寸、内边距与典型消费场景，制定嵌套治理铁律（严禁在 PageShell 内部重复手写 max-w-5xl mx-auto 与 p-6） | CAP-P-01 | pnpm check:docs-sync | DESIGN.md §3.4 同步更新 |
| frontend | `PageShell` 增强规格变体调度：支持 `variant="full" \| "standard" \| "reading"`、`padded`、`contentClassName`，内置 `VARIANT_CONTAINER_CLASSES` 与 `VARIANT_PADDING_CLASSES`，导出 `PageBody` 支持局部包裹与 HTMLAttributes 透传 | CAP-P-01 | tsc --noEmit 0 错，Vitest 273 用例全绿 | 对齐 DESIGN.md §3.4 |
| frontend | 设置与配置域页面全面收敛至 `standard` 规格：重构 18 个设置与核心配置页面（Appearance、Profile、AccessTokens、Git、Linear、GitHub、Integrations、Role/Status/Tag/Template Manager、AI Usage、Memory、ShortId、IssueTypes、Storage、Terminal、Runtime/MachineDetail、AiAgents、AiExecutionCenter、AiManagement），消除各自冗余的手写 max-w-5xl 和双层嵌套 Header | CAP-P-01 | tsc --noEmit 0 错，7 项设计治理门禁通过 | 消除 300+ 行重复手写 padding 代码 |
| frontend | 全宽高密与阅读型页面规格对齐：`tasks-page`、`bugs-page`、`office-page`、`acceptance-list-page` 消除冗余 24px (p-6) 臃肿边距，收敛至高密 px-4 py-3.5 sm:px-6 sm:py-4；`help-page` 内容区收敛至 max-w-4xl 黄金阅读宽度 | CAP-P-01 | Vitest 63 文件 273 用例全绿 | 对齐 DESIGN.md §3.4 |

### 全局设计系统规范升级与双表面高密度重构（DESIGN.md v2.0 + 低饱和多色阶 + 外舒内紧 + 5 类 AI 结构卡片）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs | 编写并落地 `DESIGN.md` (v2.0.0)：确立低饱和多色域灰调色彩体系（5 语义色系 4 级色阶）、外舒内紧卡片分割原则（内边距紧缩至 p-3.5，子卡片 p-2.5）、多端自适应字体（双层字阶+紧凑/舒适密度模式）、系统化动效白名单（100ms 微交互/160ms 展开/1.2s 思考脉冲）、双表面组件全量标识（[AI] / [HUMAN] / [HYBRID]）以及 7 项不统一异类组件整改路线 | CAP-P-01 | pnpm check:docs-sync | 新增根目录 `DESIGN.md` 与 `docs/design/DESIGN.md` |
| frontend | 色彩与动效基线升级：`index.css` 注入 5 组低饱和多色阶（冷灰蓝、薄荷绿、暖灰琥珀、灰粉砖红、烟熏紫），暗色饱和度由 90%+ 调谐至 30~45%；新增 `.animate-thinking-pulse`、`.motion-micro`、`.motion-expand`、`.motion-modal` 动效类 | CAP-P-01 | tsc --noEmit 0 错 | 对齐 DESIGN.md §2 与 §5 |
| frontend | 核心容器外舒内紧优化：`Card` 默认 padding 从 p-6 紧凑收敛为 p-3.5（14px），`SectionCard` 默认背景统一为 bg-card 且垂直间隙收缩至 gap-2 | CAP-P-01 | tsc --noEmit 0 错 | 对齐 DESIGN.md §3 |
| frontend | 落地 5 类 AI 专属高密度卡片构件：新增 `ThinkingStream`（26px 思考折叠核+烟熏紫脉冲）、`DualTrackMetricPill`（11px Mono 双轨成本微徽章）、`AgentHandoffCard`（工件流转+3 项验收门禁），与既有 `AssistantToolCard`、`DecisionCardShell` 组装完成 | CAP-P-01 | design-system-page.test 绿灯通过 | 对齐 DESIGN.md §6.1 |
| frontend | 收敛异类组件与修复 DesignSystem 演示页：`PropertyPanel` 胶囊组件全面矩形化为 rounded-md；`StatsCard` 移除大面积刺眼底色并使用微边框与 font-mono；彻底删除无生产消费的废弃 `empty.tsx` 并统一至 `EmptyState`；修复 Popover 嵌套 button 与 PieChart 尺寸警告，补齐 MSW 拦截，消除裸色 | CAP-P-01 | 全量单测通过，无 React 嵌套 button 报错 | 对齐 DESIGN.md §7 |
### 局部侵入问答 AISlot——CAP-C-07 首批落地（card-explain 静默场景 + shared/ai-slot 机制 + 三卡试点）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 静默场景注册表新增 `card-explain`（CAP-C-07 局部侵入问答后端）：prepareContext 按 `entity{kind,id}` 服务端查库组装权威事实——task 复用任务锚点事实（负责人/验收/依赖/近期动态），decision 取提案+payload+提案人名，member 取档案+信任分；缺 id/不支持类型/实体不存在一律可读 400 且不触 LLM。instructions 为解释型 prompt 面向小白：无显式问题时解释「卡片上最值得知道的事」，带 question 时优先作答；输出 `{title,summary,details[],nextStep}` JSON（extractJsonObject 容忍 fence）；AIUsageLog 记账走 run() 共享路径 | CAP-C-07 | assistant-silent.service.spec 16/16（新增 card-explain 7 条：任务卡默认解释口径/带 question 注入/决策卡含提案人/成员卡含信任分/缺 id·不支持类型·实体不存在 400 不触 LLM）；server tsc 除 logging.interceptor.spec 存量外 0 错 | docs/02-架构设计/architecture/backend/modules.md ai-hub 行补 card-explain（本地） |
| frontend | 新增 `shared/ai-slot/ai-slot-layer`：Ctrl/Cmd+左键任意 `data-ai-entity="kind:id"` 卡片，原位 Portal 覆盖 AI 解释卡（原卡保持挂载零布局抖动），overlay 内右键/ESC/页面滚动/resize 恢复，高度=max(卡高,视口内 420px)+NaN 防御；答案卡三态（骨架/错误+重试/内容=title+summary+details+nextStep），有标题时出「继续追问」经 openAssistantWithDraft 带草稿唤起浮窗；`use-silent-ai` 增 useCardExplain/parseCardExplain（容错解析）；shell-layout 挂 AISlotLayer 并顺手清 7 个存量 unused 图标 import；试点接线三卡根元素 data-ai-entity：TaskCard/DecisionCardShell/MemberCard；i18n aiSlot.* 双语 9 键 | CAP-C-07 | ai-slot-layer.test 6/6（触发并按属性请求/Cmd 触发/无修饰键与非法属性不触发/ESC 恢复/数据渲染+追问跳浮窗/错误态重试）；前端全量 vitest 59 文件 258 用例绿；tsc -b 0 错；eslint 改动文件 0 警告；check:i18n-sync 双语 3041 键同步 | apps/frontend/COMPONENTS.md 登记 AISlotLayer |
| server | card-explain 场景扩容治理面（切片 2）：loadCardEntityFacts 增 `contract-binding`（绑定行：fileType/filePath/syncMode/conflictState/truthOwner+项目名）与 `document`（状态/provenance/publishedVersionId/publishedAt+项目名）两类实体；prompt 补契约绑定模式大白话解释口径（managed=系统托管生成/synced=观察文件手改/detached=已解绑不管）与冲突态提示 | CAP-C-07 | assistant-silent.service.spec 18/18（新增契约绑定含冲突态与项目名、文档卡状态与发布两用例；「不支持类型」用例改用 milestone） | 无 |
| frontend | 试点扩两处（切片 2）：契约绑定面板行（ContractBindingsPanel，设置页/init 页共用）根元素 data-ai-entity=`contract-binding:{id}`；文档树 TreeNode 文档节点 data-ai-entity=`document:{id}`（文件夹不接） | CAP-C-07 | tsc -b 0 错；eslint 改动文件 0 警告；contract/document 域 vitest 26/26 | COMPONENTS.md AISlotLayer 行试点清单更新 |
| server | card-explain 增 `acceptance` 实体（切片 3，供血判据主目标）：facts=验收（status/type/completionType/title）+关联 issue（title/shortId/status/type）+criteria 明细（criteriaType/content/weight/severity/status）+一对一 CompletenessAuditReport（riskLevel/blocked/suggested/passed/summary）；prompt 补审计三级大白话口径（red=有强阻断项不能交付、yellow=有建议补全项、green=无缺失）并要求点出最关键验收标准 | CAP-C-07 | assistant-silent.service.spec 19/19（新增验收卡含审计报告与审计口径断言；400 组补 acceptance 不存在分支） | 无 |
| frontend | 验收详情页接线（切片 3）：「验收标准」与「审计报告」两个 TabsContent 根元素 data-ai-entity=`acceptance:{id}`（路由 id，同一验收实体两入口） | CAP-C-07 | tsc -b 0 错（base-ui TabsContent 透传 data-*）；eslint 改动文件 0 警告；前端全量 vitest 258/258 | COMPONENTS.md AISlotLayer 行试点清单更新 |
| server | card-explain 增 `project`/`team` 实体（切片 4）：project facts=名称/描述/编号/类型/workflowStatus/healthStatus/riskLevel/status/targetDate+负责人名；team facts=名称/描述/status/teamPrompt（团队规则） | CAP-C-07 | assistant-silent.service.spec 20/20（新增项目健康面+团队规则一用例） | 无 |
| frontend | 看板卡通用接入（切片 4）：BoardCardModel 槽位模型新增 `dataEntity?: (item) => string` 槽（默认卡片根透传 data-ai-entity，全部 BoardView 看板获得 AISlot 能力）；project-board 卡模型接 `project:{id}`；TeamCard 根接 `team:{id}` | CAP-C-07 | tsc -b 0 错；eslint 改动文件 0 警告；board-view 回归 7/7；前端全量 vitest 258/258 | COMPONENTS.md AISlotLayer 行试点清单更新 |
| frontend + css | AISlot 可发现性（切片 5）：长按 Ctrl/Cmd 500ms 高亮页面全部可就地解释卡——根元素挂 `ai-slot-discovery` 类 + index.css 后代选择器（`[data-ai-entity]` outline 脉冲光晕 + pointer cursor，prefers-reduced-motion 降级为静态描边），React 重渲染不覆盖；防误触——按住窗口内任何其他键按下（Ctrl+C 等组合键）即取消、keyup/窗口失焦/卸载兜底清理。C-07 卡内增强，零新依赖 | CAP-C-07 | ai-slot-layer.test 9/9（新增长按进入/组合键取消/短按不进入三用例，fake timers）；tsc -b 0 错；eslint 改动文件 0 警告；前端全量 vitest 59 文件 261 用例绿 | COMPONENTS.md AISlotLayer 行补可发现性；能力清单 CAP-C-07 卡行补描述 |
| frontend | 任务/BUG 看板卡接线补漏（实机验收发现）：切片 1 接线的 TaskCard 实为无消费方遗留组件，`/app/issues` 真实渲染路径是 BoardView+taskCardModel（tasks-page list/board 双视图、project-tasks-page、task-board，bugs-page 经 bugCardModel 继承）此前未声明 dataEntity，长按 Ctrl 整页无卡可亮；taskCardModel 补 `dataEntity: (task) => \`task:${task.id}\`` 一处声明即六消费方全链路生效 | CAP-C-07 | board-view.test 新增 dataEntity 透传/未声明不渲染防回归断言 8/8；task-page.test 1/1；tsc -b 0 错；eslint 0 警告 | 无 |
| frontend | 项目负责人/排期编辑修复（实机验收发现，含弃用组件清理）：①删除无消费方遗留组件 TaskCard（task-card.tsx + 桶导出）；②项目详情属性面板负责人由只读改 CapsuleSelect 成员下拉、排期由只读改双 DateCapsuleField 日期胶囊（复用 property-panel 既有形态，清空传 null 过 @IsOptional）；③项目行右键菜单负责人修复——`Project.ownerId` 是 User 外键而菜单提交的是 Member.id 致外键失败静默无效，改为 userId 口径（打勾匹配同步修正）+ 过滤 AI 成员 + 「未分配」由空串改 null（空串撞外键 500）；④右键菜单补「排期」子菜单（开始/截止设为今天、+1 周、+1 月、清除，本地 date-only 串） | CAP-C-07 | row-context-menu.test 新增 3 条（userId 提交与 AI 成员过滤/userId 打勾+未分配 null/排期快捷项与清除）；project+issue+context-menu 域 vitest 18 文件 62 用例绿；tsc -b 0 错；eslint 0 警告 | 无 |
### CAP-P-01 二期——组合件提案：任务族 + 验收清单一次批卡原子落库

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | applyPlan 升级组合件 applier（ADR-012）：payload.issueId 变可选（缺省时以提案 projectId 建顶级任务族）、added[] 每项可带 acceptance 段（criteria 与任务同 `$transaction` 落库，source 记 `ai-generated-from-interview` 溯源，开放问题 #4 清偿）；决策模块不注入 AcceptanceService（acceptance→decision 依赖方向，直写 tx 同构 applyPlan）；新增静默场景 `intake-composite`——读需求承接剧本「任务拆解/验收草案」两工件（prepareContext 显式文档指针），AI 代写组合件 payload；PlanProposalPayloadDto 三层嵌套校验（added→acceptance→criteria） | FR-P-01 | proposal.service.spec 10 条（组合件顶级任务族+验收溯源/缺 projectId 400/空 criteria 400/旧 payload 兼容）；assistant-silent.service.spec 19 条（intake-composite 4 条）；playbook e2e 7/7（组合件批卡全链：创建→pending 投影→accept→issue/acceptance/criteria 直查，任务 B 无验收段不建单）；server 全量 61 文件 520 用例绿；契约零漂移 | ADR-012 |
| frontend | PlanCard 槽位渲染扩展：added 行内嵌验收标准清单（criteriaType 功能/技术标记）+ impact 区验收计数；`use-intake-composite` hook（parse 防御性收敛：title 必填/criteria 过滤/上限 20 任务）；剧本页「AI 生成任务族提案」卡（breakdown/acceptance-draft 工件就绪时显示）——生成→直接 POST plan 卡进决策收件箱→收件箱批卡；decision-api 补 createProposal（契约单源）；i18n 双语 +12 键（3081 键对齐） | FR-P-01 | tsc -b 零错误；vitest 61 文件 263 用例绿；双语键对齐校验 | ADR-012 |

### server 日志控制台彩色输出——level 按严重度着色

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | LoggerService 控制台行渲染重构为纯函数 `formatConsoleLine` + 色彩门控 `consoleColorEnabled`：level 按严重度着色（error 红/warn 黄/info 绿/http 青/verbose 品红/debug 灰）、context 统一亮青；默认开启（pnpm/turbo 接管 stdout 后 isTTY=false 但终端仍渲染 ANSI），`NO_COLOR=1`/`FORCE_COLOR=0` 关闭、`FORCE_COLOR=1` 强制开启；standalone `[LEVEL]` 前置与常规两种布局均支持；Bootstrap context 归一为 APM | — | logger.service.spec 18 条（布局/着色/门控矩阵）；logging.interceptor.spec 随行更新；vitest 4 套件 56 用例绿 | — |

### CAP-P-01 一期收口——需求承接剧本 + 访谈 AI 预填 + init 自动挂载（切片 3）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | playbook 注册表新增「需求承接」剧本（requirement-pipeline，research→clarify→breakdown→acceptance-draft 四阶段：novice 向人话问题组 + 术语对照 + 闸门后果声明），纯增量注册（playbookRef 自由 TEXT 无迁移，registry version 不 bump）；静默场景 `interview-prefill`：按一句话需求/grill 摘要为当前阶段问题组生成答案候选（缺问题组 400，复用 extractJsonObject/AIUsageLog 链） | FR-P-01 | playbook.service.spec 模板清单断言扩展；assistant-silent.service.spec 18 用例（+3）；playbook e2e 6/6 含需求承接全链（挂载→调研拍板→澄清必答 400→拍板→拆解访谈 + interview-prefill 无模型可读失败） | ADR-011 |
| frontend | InterviewDialog 预填条（一句话需求输入 + Sparkles「AI 预填」按钮）：候选只填空字段绝不覆盖手填、失败红字降级手填；use-interview-prefill hook（防御性解析：id+answer 齐全且命中问题组才收）；init 页 `?grilled=1`（grill 建项链）：幂等自动挂载 requirement-pipeline 剧本 + 澄清摘要卡与访谈引导；submitProjectFromGrill 补「需求澄清纪要」文档落库（buildGrillMinutes 摘要转 markdown，失败不阻断建项）；i18n 双语 +12 键（3069 键对齐） | FR-P-01 | interview-dialog.test 补预填交互用例（空字段才回填断言）；grill-minutes 纯函数测试；前端 tsc -b 零错误 + vitest 61 文件 263 用例全绿；契约 contract:check 零漂移 | ADR-011 |

### 技能注册表管理面——CRUD 补全 + 指令内容物化 + 本地 SKILL.md 导入（CAP-P-01 grill 前置）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | SkillConfig 加 `content`（驱动指令全文，物化入 DB）+ `sourcePath`（导入来源留档）两列（迁移 20260909100000）；skills 补全管理面：POST /skills（key 冲突 409，带 sourcePath 缺 content 时读文件物化）、GET /skills/:key（全量含指令）、DELETE /skills/:key（builtin 禁删 403）、POST /skills/import（本地 SKILL.md 导入：frontmatter 行式解析 name/description + 正文物化，key 缺省从路径派生）；BUILTIN_SKILLS 增第 8 个内置 `grilling`（grill 需求拷问驱动指令：一次一问 + 猜测选项 + done 收敛输出结构化摘要，CAP-P-01 AI 代理模式创建的会话引擎）；契约三件套同步重导出零漂移 | FR-P-01 / FR-CORE-001 | skills.service.spec 19 用例（种子幂等/CRUD/导入 frontmatter/解析纯函数）；skills.e2e 9 用例（CRUD 全链 + 403/404/409 + 导入 400）；openapi contract:check 零漂移 | ADR-011 |
| frontend | 设置页「Agent 管理」技能区从纯开关升级为全管理面：行内编辑（拉详情回填指令正文）与删除（custom 专属，确认弹窗）+ 顶部「新建技能」「从本地导入」入口；SkillDialog 三模式表单（create/import/edit，import 模式 sourcePath 必填、key 可留空从路径派生）；skills-api/use-skills 补 create/get/import/remove 四向（请求体走契约单源 RequestBodyOf）；i18n 双语 25 键同步（zh/en 3057 键对齐） | FR-P-01 | tsc -b 零错误；全量 vitest 58 文件 252 用例绿；双语键数对齐校验 | 无 |

### 日志控制台治理——默认上下文 APM 化 + 模块上下文按调用保留 + 彩色输出

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | LoggerService 上下文解析重构：main.ts 全局默认上下文 `Bootstrap`→`APM`，格式化兜底 `App`→`APM`；新增 resolveContext——Nest Logger 实例委托时追加在尾参的 context（error 在 trace 之后）优先采用，未传时回退共享实例 moduleContext，context 尾参不再混入 meta。修复 30+ 服务 `new Logger(Xxx.name)` 的模块名被单例 `'Bootstrap'` 覆盖、运行期日志全部显示 `[Bootstrap]` 的问题；已知残留：构造器内 setContext 的注入式服务（HTTP/Prisma/MessageBus 等约 20 处）因单例共享可变状态仍显示 `[APM]`，待后续实例化改造；顺手修复 logging.interceptor.spec 存量 jest.fn/jest.Mock 残留（Jest→Vitest 迁移漏改，整套件 ReferenceError 挂 9 用例） | FR-CORE-001 | logger.service.spec 新增 context 解析 4 用例；server 全量单测 60 套件 491 用例全绿；改动文件 eslint 绿、server type-check 绿 | 无 |
| server | 控制台彩色日志：level 按严重度着色（error 红/warn 黄/info 绿/http 青/verbose 品红/debug 灰）+ context 统一亮青色；两套 console 布局（standalone `[LEVEL] ts [CTX] msg` / 常规 `ts [CTX] level: msg`）收敛为纯函数 formatConsoleLine 并支持彩色，移除旧 `format.colorize()`（仅 level 上色）；闸门——默认开启（pnpm/turbo 接管子进程 stdout 使 isTTY=false，但终端仍可渲染 ANSI，首版 TTY 闸门会误关 dev 颜色已修正），`NO_COLOR=1` 关闭、`FORCE_COLOR=0` 显式关闭（机器捕获场景）、`FORCE_COLOR=1` 强制开启 | FR-CORE-001 | formatConsoleLine/consoleColorEnabled 新增 7 用例（双色布局逐字节断言 + ANSI 码断言 + 环境闸门）；全量 491 绿 | 无 |

## [0.5.0] - 2026-09-09

### 依赖现代化——NestJS 12 + Express 5 + @swc/cli 0.8 + 测试栈迁移 Vitest

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | @nestjs 全家 10→12（common/core/platform-*/websockets/swagger/jwt/passport/config/axios/event-emitter/mapped-types/cli/schematics/testing）+ express ^5.2.1 + @swc/cli ^0.8.1（@nestjs/cli 12 解锁）；Nest 12 为纯 ESM 包（type: module），Node 24 经 require(esm) 以 CJS 应用消费，无需应用层 ESM 化；LocalAuthGuard 适配 Nest 12 注入器收紧（passport mixin 基类的 @Optional 水印不再跨原型链继承，无构造器 guard 子类显式构造器落回本类元数据）；@nestjs/throttler 6.5.0 peer 未声明 12，运行时正常留观察 | FR-CORE-001 | 运行时冒烟：42 模块全启 + JWT 守卫链 + 路由/404 正常；全仓 type-check/lint 绿 | 无 |
| server | 测试栈整体迁移 Jest→Vitest（vitest 5 + unplugin-swc——Nest 构造器注入依赖 emitDecoratorMetadata，esbuild 不支持，走 swc 转换）：单测 59 套件 471 用例全绿（forks 池按文件回收进程，全量 9 秒）；e2e 50 套件 362 用例全绿（fileParallelism:false 串行 215 秒）；contract:export 迁 vitest 链（octokit stub 走 resolve.alias）；jest/@types/jest/@swc/jest 依赖与内嵌配置段、test/jest-e2e.json 全摘除；CI quality-gate.yml 与根 quality:gate 摘除 --runInBand --forceExit；coverage thresholds 沿用原基线 11/10/9/11 | FR-CORE-001 | vitest run 单测/e2e 全绿；contract:export 378 paths 与仓库真相源逐字节一致（零漂移） | 无 |
| server | 黄金路径 3（文档冻结→执行触碰→冲突升级）断言收窄至 AGENTS.md：同轮对齐因 CLAUDE.md 派生绑定指纹失配误升级无关 contract_conflict 提案（无人手改被误判，污染决策收件箱），间歇失败根源定位；CLAUDE.md 误报为独立 bug 另案追踪（嫌疑：seed baseline 写入与文件内容竞态） | FR-CONTRACT-001 | golden-path 修后 8/9 绿 + 全量 362 全绿收口 | 无 |

### dev 运行时优化——SWC 编译链 + Swagger 按环境构建 + Prisma SQL 日志开关 + dispatches 推送化

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 编译链切 SWC builder（nest-cli compilerOptions.builder=swc + typeCheck=false，类型检查由 turbo type-check 门禁兜底；tsconfig.build 显式 rootDir+include 限定 src，swc 不做 tsc 式推导）；dev watch 内存从 tsc 的 1.8GB 级降至轻量档，496 文件 523ms；Swagger/OpenAPI 构建仅非 production 挂载（38 模块全量路由扫描 + 文档对象常驻内存省却），ENABLE_SWAGGER=1 逃生阀，contract:export 走 jest→vitest e2e 直调 buildOpenApiDocument 不受影响；Prisma 每条 SQL 的 query 事件日志默认关闭（PRISMA_QUERY_LOG=1 或 CONSOLE_LOG_LEVEL=debug 时挂载），error 保留；EventsGateway 聚合 dispatch 生命周期 6 事件（created/execution.event/result/approval.requested/resolved/cancelled）统一转发 runtime.dispatch.changed | FR-CORE-001 | build 437 文件 452ms；contract:export 零漂移；type-check/lint 绿 | 无 |
| frontend | event-client 事件白名单登记 runtime.dispatch.changed；同事位「工作中」判定（useActiveDispatchExists）由 5s 轮询改推送驱动失效 + 30s 断连兜底；设置页 runtime-admin 审批/派发查询族同挂推送 | FR-RUNTIME-001 | assistant 域 vitest 4/4 绿 | 无 |


### 日志刷屏治理——派发活跃轻端点 + 同事位轮询改造 + HTTP 日志降噪

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 新增 `GET /runtime/dispatches/summary` 派发活跃度轻端点：统计最近 200 条 `runtime.dispatch` 记录的 pending/running（支持 `projectId` 收窄，与原列表判定语义一致），只返回 `{active,pending,running}`，不携带 prompt/策略载荷。openapi 三件套重导出零漂移 | FR-RUNTIME-001 | `contract:export` + `contract:generate` + `contract:check` 零漂移；server tsc -b 0 error | 无 |
| frontend | 同事位「工作中」判定（`useActiveDispatchExists`）从 `GET /runtime/dispatches?limit=50` 全量列表改用 summary 轻端点——轮询响应从 KB 级降到几十字节，顺带修复「活跃派发排在第 50 条之外时漏判」；`refetchInterval` 改回调，`document.hidden` 时暂停轮询 | FR-RUNTIME-001 | vitest assistant 域 35/35 绿；frontend tsc 0 error；eslint 0 error | 无 |
| server | `LoggingInterceptor` 日志降噪：新增静默路径前缀表（内置 `/_api/runtime/dispatches`，`LOG_QUIET_PATHS` 环境变量可追加，运行时读取即时生效），命中路径的请求/响应日志降为 debug 级（console 默认 info 不再刷屏，`logs/combined.log` 仍收全量）；响应 sample 字符串截断 500→120 并补齐敏感键脱敏；删除无引用的死函数 `inline`。新增 `logging.interceptor.spec.ts`（此前零测试） | FR-CORE-001 | `logging.interceptor.spec.ts` 9/9 绿（静默降级/前缀匹配/env 追加/sample 截断/脱敏/错误路径不降级）；eslint 0 error | 无 |
### 夜航测试清偿——GAP-T-03 完结 + 黄金路径场景 1 + 异常流抽样 + formatOnly e2e 消竞态

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 测试映射矩阵缺口清偿（2026-09-09 夜航，分支 feat/contract-binding-entry 七提交）：GAP-T-03（P0 完整性审计零测试）完结——新增 completeness-audit.service.spec 19 条（依赖完备性 blocks/related 分级、工程完备性双向 includes 去重、三级响应 red/yellow/green、applySuggestions 四路径、enforceAuditBeforeExecution 四路径）+ completeness-checklist.service.spec 14 条（清单 CRUD 三道闸、applyToAcceptance order 续接与 template 溯源、findAll 过滤）；GAP-T-02 首条落测——新增 golden-path.e2e 8 步全链（建项目→POST seed→建 issue→执行→审批 approved→验收→发布 Release→CHANGELOG 再生与订阅链，执行/runtime 走 HTTP 面不启 daemon）；GAP-T-05 部分——新增 error-paths.e2e 6 条（issue 缺必填 400/项目不存在 404/越权 workspace 头 401 + project 缺 name 400/PATCH 不存在 403 成员守卫遮蔽/archive 重复提交幂等）；acceptance e2e 23→26 条（audit 行为级断言 riskLevel/summary/items/report 落库、checklists 404 错误路径、audit-gate allowed 断言）；release 单测桩补 projectWorkspace 访问器适配解析器三级回退；formatOnly 纳管 e2e 消竞态（等待 project.created 自动种生定局后再登记工作区，三连跑稳定） | FR-REQ-GOV-001 | quality:gate 全绿：server 单测 58 套件 453 用例、server e2e 49 套件 350 用例、contract:check 零漂移、api:audit 479 端点 100% 覆盖、check:docs-sync 通过 | 测试映射矩阵 GAP-T-03 置 done、GAP-T-02 场景 1 置 done、GAP-T-05 置部分（本地 docs/）；新增 docs/01-需求/控件清单-issue详情页-v0.md（92 控件静态盘点，本地） |

### 需求治理收口——能力清单/测试映射矩阵/需求入口流程三账本落地 + requirement-intake skill

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs | 需求失控治理收口（2026-09-08 讨论裁决落库）：新增 `docs/01-需求/能力清单-v1.md`（28 张能力卡按 A 底盘 10/B 治理 8/C 同事 6/D 契约知识 3/跨线桥 3 归线 + 产品主轴「AI 同事是手段、治理是目的」+ 理想管道六环节诊断 + 四条工作线：主线=需求承接拆解管道 CAP-P-01、副线=CI-PR 证据回流 CAP-B-08、支线=UX 手感与 e2e 深化 + 治理骨架分工声明 acceptance=验收证据层/contract=文件绑定层 + 候补区）；新增 `docs/01-需求/测试映射矩阵-v1.md`（五类覆盖模型 + 域×测试资产对照基线 57 单测/48 server e2e/前端 10 spec + 8 条缺口登记含 P0「完整性审计零测试」+ 黄金路径场景库 4 条 + 控件清单模板）；新增 `docs/01-需求/需求入口流程-v1.md`（五步入口流程 + C 线供血判据）；AGENTS.md 升 v1.1.0——三真相源改「PRD + 能力清单」、§一启动清单补能力清单步、§二补产品主轴与四工作线、§六模块口径 36→40 目录/42 Module 与前端 37、域表增「契约知识」行并补 profile/playbook、主线对象表补 ContractFileBinding/Release、§七契约表增「需求契约」行、§八术语基线分支改为已合入 | FR-REQ-GOV-001 | 文档落库，无代码变更；check:docs-sync passed | backend/modules.md 修正 36→40 目录口径（补 profile/playbook）；docs/README.md 索引同步 |
| skill | 新增 `.zcode/skills/requirement-intake/SKILL.md`——需求入口闸门 skill 化：会话中出现新功能想法/功能变更/废弃意图时强制五步流程（一行声明→冲突检测→裁决归档→更新清单→开工登记），硬规则「未进清单不得开工」取代设计纪要直通开发 | FR-REQ-GOV-001 | 流程定义，随下次功能开发实测 | 能力清单候补区启用 |

### 契约种生实机入口——项目 init 页 + 设置页契约绑定面板 + 契约 REST 面

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 半途项目纳管：POST seed 增 `formatOnly` 格式化纳管模式——已有 AGENTS.md 仅把 `apm_project_id/apm_file_type/apm_sync_mode` 并入 frontmatter（人工字段原样保留），**不注入 apm:managed 托管区间**（正文一字不动）；绑定落 synced + 整文件 sha256 基线（观察模式：手改文件检查对齐即报 conflicted，不升级决策收件箱提案）；缺文件时与默认种生一致生成；默认种生行为不变；action 增新枚举 `adopted`。修复半途项目（功能上线前创建）「检查对齐不可用」：根因是零绑定（check 逐类型查绑定、无绑定跳过、前端零绑定禁用检查按钮） | FR-CONTRACT-001 | e2e `contract-bindings-api` 8/8 绿（新增：自定义 frontmatter 文件纳管后仅差身份字段且无区间标记 + synced 绑定；aligned → 手改正文 conflicted 且不建提案）；contract 单测 28/28；`contract:check` 零漂移 | docs/02-架构设计/architecture/backend/modules.md contract 行补 formatOnly（本地） |
| frontend | 契约绑定面板新增「格式化纳管」动作（FileSearch 图标，title 提示语义）与 `adopted` 结果徽章；synced 绑定冲突行显示「文件已变化」而非决策收件箱链接（观察模式不建提案，链接会落空）；空态描述区分新项目（全部种生）与已有项目（格式化纳管）两条路径；hooks 种生入参对象化 `{fileTypes?, formatOnly?}` | FR-CONTRACT-001 | 组件测试 8/8 绿（新增 formatOnly 调用形态与 synced 冲突提示两例）；tsc -b 0 错；lint 0 error；i18n 双语 3033 键同步 | 无 |
| server | contract 模块首次开放 REST 面（`/projects/:projectId/contract/*`）：GET bindings（绑定+工作区根，只读）、POST seed（幂等种生，`fileTypes` 过滤即单文件补种）、POST check（显式对齐检查，managed 漂移照旧升级 contract_conflict 提案）、PATCH bindings/:fileType（三态切换，detached 清冲突态）。修复种生实机断层：ContractWorkspaceResolver 此前只读 `Repository.workspacePath/localPath`，而现有绑定链路（设置页 WorkspaceConfig/接入向导）写的是 `ProjectWorkspace.localPath` → 解析器增第三级回退，绑过工作区的项目种生立即可用；ContractSeedService 增 fileTypes 过滤参数 | FR-CONTRACT-001 | e2e `contract-bindings-api` 6/6 绿（含仅绑 ProjectWorkspace 种生、幂等/单文件补种、冲突升级提案、detached 清冲突）；`contract:check` 零漂移；server tsc -b 0 错 | docs/02-架构设计/architecture/backend/modules.md contract 域同步（本地） |
| frontend | 新建 modules/contract 域（api/hooks/components）：`ContractBindingsPanel` 契约绑定面板（绑定行 × sync_mode 徽章/冲突警示→决策收件箱链接、全部种生/单文件补种/对齐检查/三态切换、种生与检查结果条）；设置页新增「契约文件」页签复用该面板；新增项目初始化页 `/:id/init`（三段式：绑定工作区复用 WorkspaceConfig → 种生契约三件套 → 下一步引导卡），统一创建面板建项后改跳 init 页（原 playbook/profile?wizard=1 直跳保留为引导卡入口，不入 tabbar）；i18n 双语键 contract.* / project.init.* / projectSettings.tabs.contract | FR-CONTRACT-001 | 组件测试 6/6 绿（面板渲染/冲突链接/空态禁用/种生过滤/结果条）；tsc -b 0 错；lint 0 error；check:i18n-sync 双语 3029 键同步 | COMPONENTS.md 登记 ContractBindingsPanel |

## [0.4.12] - 2026-09-08

### 左侧边栏改进——通知/决策计数角标 + Status Pill 标签 + 通用分组收缩 + 折叠气泡修复

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 侧边栏计数角标：决策收件箱 / 通知 订阅实时未读数（`decisions.summary.pending`、`notifications.unread.count`，随 `notification.created/.read` WS 事件失效刷新）——展开态红底数字药丸（>99 显 99+），整栏折叠态右上角红点；admin/dev 路由胶囊由自绘实底大胶囊改为 Design System `StatusPill` 样式（admin=danger 红 tint、dev=紫 tint，text-11 圆角小胶囊） | FR-NAV-001 | Playwright 实机：展开 19/10 数字药丸、折叠两处 8px 红点、ADMIN/DEV 计算样式均为 tinted 圆角胶囊（admin bg rgb(254,225,225)/text 红、dev bg rgb(245,235,255)/text 紫）+ tsc 0 error + eslint 0 error | 无 |
| frontend | 侧栏分组可折叠泛化：除工具组外主导航/收藏/系统均支持收缩（store 由单一 `favoritesCollapsed` 重构为 `navGroupsCollapsed{main,favorites,system}` map，persist 持久化）；各组头标题字号 text-11→text-xs 放大、chevron 移到标题文字之后（各分区标题左缘 x=12 对齐）、折叠态标题右侧显条目计数（收藏即收藏数） | FR-NAV-001 | Playwright：主导航折叠显 10、收藏折叠显 1、reload 后 localStorage `navGroupsCollapsed` 持久化恢复、四组头标题同 x=12/font 12px、chevronX 紧贴标题右缘（收藏/系统 41px、主导航 54px） | 无 |
| frontend | 整栏折叠后气泡不再自动悬浮弹出：Tooltip/RoutePreviewTrigger 的 hover 状态原跨折叠态存活，折叠/展开切换时 TooltipContent 才挂载而 hover 态残留 → 指针未动即自动出泡。修复：触发器 key 绑定 `sidebarCollapsed`（折叠态再并入 `pathname`），折叠/展开/导航切换即重挂载重置 hover 态 | FR-NAV-001 | Playwright：折叠动画结束后 1.3s 断言 `[data-slot=tooltip-content]` 空；hover 通知图标正常出泡「通知」；折叠态点击「任务」导航后 1s 无气泡残留 | 无 |

### 看板组件修复——充满高度/固定列宽/列内可见滚动 + list↔kanban 共享右键菜单

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 通用 BoardView 布局重构：根容器原 `height:auto`+`max-h-[calc(100dvh-200px)]` 使 flex 主轴高度不定 → 列高按内容膨胀至 8.7k px、被外层 `overflow-y-hidden` 裁断不可达。新增 `useFillViewportHeight` 自测「自身顶部→视口底」剩余高度（保留底边距、下限 320px）并以内联像素高落根容器 → 整条 flex 链受约束：列高与看板区等高、列 body `overflow-y` 可见滚动条列内滚动、列头固定；列宽固定一致（默认 `w-72` 288px，多列超宽仅看板区内一条横向滚动、页面不滚动）。实测任务/Bug/项目三看板：5 列等高、body clientH 870 < scrollH 5551、docScrollH=docClientH（页面无滚动） | FR-TASK-001 | `board-view.test.tsx` 7 用例绿 + tsc -b 0 error + eslint 0 error + Playwright 三看板实测几何与滚动断言 | 无 |
| frontend | 任务/Bug 看板卡片右键菜单与各自 list 行共享：行菜单逻辑从 TaskSimpleList/BugSimpleList 内联实现抽为共享 hook `useIssueRowMenu`（use-issue-row-menu.ts，list/kanban 同源构建：状态/优先级/严重度/负责人/标签 + 固定/复制链接/建子父任务/删除），任务页/Bug 页/项目工单页三个看板接线同一构建器。另修右键不弹根因：compat ContextMenu 用 cloneElement 注入触发器 props（onContextMenu/data-slot/aria），而卡片默认组件 DefaultBoardCard 仅消费固定字段不透传多余 props → 触发器从未落到 DOM；卡片外包一层 `display:contents` 宿主承接注入后菜单可开（与 DataList 行一致） | FR-TASK-001 | 同上 + Playwright 实测三看板右键卡片均弹出与 list 行同款菜单（Bug 域含严重度、删除实体文案为 Bug）；任务页 list 右键基线对照一致 | 无 |

### 项目详情页头部 tabbar 日间配色修复——白卡上的深色带归位内容表面色

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 项目详情页 ProjectContextBar（面包屑 + 子页签 tabbar + Linear 同步）头部工具栏原用 `bg-sidebar` 着色——该 token 日间也恒深（`--sidebar-background` 双模式深色），导致日间模式在浅色内容卡顶部顶一条深色带（其余 SubPageToolbar 均透明继承所在页背景）。改为 `bg-background` 与所在内容卡同色系：日间浅色、夜间深色，主题自适应一致 | FR-NAV-001 | 实机 Playwright 验证：日间 header bg #fff 与内容卡一致、夜间随 .dark 深色且文字对比正常；前端 type-check + eslint 0 error（file 域 8 个既有 unused-import warning 非本次引入） | 无（纯视觉 token 修正，语义 token 已存在） |

### 档案草稿批准不再改写置信度——考古 AI 诚实边界回归

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| profile | approveAtom 批准草稿仅做 working→consolidated 生效闸门，删除 `Math.max(row.confidence, 0.8)` 置信度抬升：考古 Agent 依「诚实边界」给出 ≤0.6 的 AI 原置信度（如 40%/50%），一经批准即被统一改写为 80% 属事实失真；人若认可到满置信应走编辑（editAtom → confidence 1）而非批准。修复后批准保留草稿原置信度（逐条与批量接受共用该路径） | FR-AI-001 | `profile.service.spec.ts`：批准用例断言 0.5 保留 + 新增低置信 0.4 不抬高回归用例，profile 模块 jest 全绿 | 无（文档未声明批准改写置信度；语义落 approveAtom JSDoc） |

### 通知收件箱恒空修复——前端误读分页契约字段

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 通知收件箱列表恒空修复：GET /notifications 契约形状是 `{ data, meta }`（NotificationListResponseDto，非标准 PaginatedData `{items,total}`），但页面读 `data.items`、未读数读 `data.total`——列表永远为空、未读计数恒 0，通知链路产出的通知全部不可见。前端对齐契约：getList 类型改 NotificationListResponse（{data,meta}）、列表读 data.data、未读数改走 /notifications/unread-count 专用端点（{count}）；notification-center 组件（barrel 导出未挂载）同款误读顺手修正；测试 mock 从错误形状改为真实契约形状（mock 固化 bug 的教训） | FR-NOTIF-001 | notification 模块 vitest 4 全绿 + tsc -b 0 error + eslint 0 error + 实机 API 3 条未读返回正常 + vite 热载验证 | 无（契约本就是 {data,meta}，前端回归契约口径） |

### 订阅推送不再排除操作者（订阅=观察一切变动）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| subscription | 订阅推送语义修正：用户订阅任务后自身变更也收不到通知（状态/字段/评论/执行终态四分支均排除操作者），与「订阅后任何变动都提醒」的用户预期相悖。移除四分支的操作者排除，状态分支保留负责人排除（全域层已单独通知负责人，防双份） | FR-NOTIF-001 | `subscription-event.subscriber.spec.ts` 增「操作者是订阅者时照常通知」用例，subscription 模块 jest 10 全绿；实机验证：他人变更→订阅者收到 task.statusChanged ✓，本人变更→同样收到 ✓ | 无 |

### 项目上下文栏恢复 + 面包屑 i18n + 收藏夹旧路径迁移（77f20bf 改名残留收尾）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 项目子页 ProjectContextBar 恢复渲染：isProjectDetailRoute 正则仍枚举旧路由词（board/tasks），77f20bf 改名后 `/projects/:id/issues` 不再命中——上下文工具栏（面包屑+页签+收藏+Linear 同步）整体丢失且页面落到错误滚动分支；正则补 issues/playbook（保留旧词兜底重定向过渡态）。ProjectContextBar 页签 value tasks→issues（修正激活态匹配）并补 playbook 页签（与详情导航对齐） | FR-NAV-001 | issue/project 模块 vitest 51 全绿 + tsc -b 0 error + eslint 0 error + vite 热载验证 | 无 |
| frontend | 任务/BUG 详情页面包屑首节硬编码英文（'Tasks'/'Bugs'）改 i18n（nav.tasks / task.bug.title），中文界面不再夹生英文 | FR-NAV-001 | 同上回归 | 无 |
| frontend | 收藏夹旧路径双保险：app-store persist 升 v1 带 migrate（migrateLegacyAppPath 重写 /app/tasks[:id]→/app/issues[:id]、/projects/:id/[tasks\|board]→issues 并去重）+ 路由补 /app/tasks 与 /app/tasks/:taskId 重定向（未迁移书签兜底） | FR-NAV-001 | `app-store.test.ts` 增 migrateLegacyAppPath 3 用例，store+layout vitest 11 全绿 | 无 |

### 详情页 Tasks 断链修复（77f20bf 改名漏改点）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 修复项目详情页 Tasks tab 404：77f20bf（Task→Issue 命名收尾）把路由改为 `:projectId/issues` 但漏改 ProjectDetailNav（仍链 `tasks`），点击即落 ErrorPage。导航改指 `issues` + 路由补 `:projectId/tasks` → issues 旧链接重定向（存量书签兜底）+ use-subscription 订阅作用域 URL 匹配同步 `/app/tasks/` → `/app/issues/`（entityType 保持后端订阅域词汇 task） | FR-NAV-001 | `project-detail-nav.test.tsx` 断言更新，project/subscription/route-preview vitest 39 全绿 + tsc -b 0 error + eslint 0 error | 无 |

### 档案草稿批量接受 + 生效原子删除

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| profile | 新增 DELETE /projects/:projectId/profile/atoms/:atomId：生效原子 consolidated → pruned（活动流 deleted 事件留痕）；仅 consolidated 可删，草稿引导走驳回，与 approve/reject 同款守卫口径 | FR-AI-001 | `profile.service.spec.ts` 增 2 用例（pruned 转换 + 分组消失 + 非生效拒绝），profile 模块 jest 28 全绿 | `openapi.json` atoms/:atomId 增 delete 方法，contract:generate 双份重生成，contract:check 零漂移 |
| frontend | 档案页槽位区：有草稿时在添加按钮左侧显示「全部接受（N）」批量按钮（CheckCheck 图标，点击逐条顺序批准后统一失效缓存）；生效卡片悬停动作在编辑旁新增删除按钮（Trash2，accent-red）；busy 态覆盖删除/批量中 | FR-AI-001 | `profile-slot-section.test.tsx` 新建 4 用例（条件渲染 + DOM 左侧序 + 草稿 id 回传 + 草稿卡无删除），前端 project 模块 vitest 29 全绿 + tsc -b 0 error + eslint 0 error | i18n 双语键 project.profilePage.approveAll/delete |

### 考古流程两断点修复（轮询句柄字段 + 进度计数源）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| profile | 考古 start 返回值改显式契约映射：内部 DispatchResult 字段为 executionRunId，契约/前端轮询要的是 executionId——原先透传导致前端拿到 undefined、轮询 hook `enabled: !!id` 永不启动（接入向导第二步空转圈）；返回类型收窄为 ArchaeologyStartResult（issueId/executionId/auditWarning?，不泄漏内部字段） | FR-AI-001 | `archaeology.service.spec.ts` 新建 4 用例（字段映射回归锚点 + auditWarning 透传 + 任务包 promptOverride + 404）+ profile 模块 jest 26 全绿 | 无（DTO 契约本就声明 executionId，运行时回归契约口径，零漂移） |
| frontend | 考古进度计数改走事件流水：useExecutionRunEvents 轮询事件，countArchaeologyProgress 取「工具调用+思考」事件数；原 runDetail.steps 只有进程内执行器会写，runtime 守护进程路径恒空导致「已产出 0 步」永不增长 | FR-AI-001 | 前端 project 模块 vitest 25 全绿 + tsc -b 0 error + eslint 0 error | 无 |
| cli | 运维提示：cd21532 的 output 结构化上报需重建产物才生效（dist 2026-09-07 00:27 旧构建导致 9/8 00:52 实测 output 仍回落 {summary}）；已执行 `pnpm --filter @apm/cli build`，需重启 apm-runtime 守护进程加载 | FR-AI-001 | dist/runtime/worker.js 已含 res.parse.output 转发 | 无 |

### 简报装配 + 剧本 + 决策卡知识层 + 分析卡（AI 同事化 v2 纪要切片 2-5）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| profile | 切片 2 简报底座收口：getBriefing 增派生活动热点（近 14 天 git 提交数 × 活跃 issue 标签密度 Top5，纯派生不落库）+ ingest 容错（tryParseProfileDraft：围栏 JSON/包裹字段/花括号配平提取，CLI 最后一公里格式偏差自愈）+ 推式消化订阅器（考古执行 completed 自动 ingest，前端轮询不再是唯一入口，与显式调用幂等共存） | FR-AI-001 | `profile-draft-parse.spec.ts`（9 用例）+ server jest 357 全绿 | `openapi.json` briefing facts.hotspots 增量 |
| ai-hub | briefing 接管家注入：assistant.service formatBriefingInstruction 将档案完备度、生效槽位原子（≤8 条）、活跃热点注入系统指令（旁路失败不阻断对话）；CLI 桥路径注入后置 | FR-AI-001 | assistant.service.spec 21 用例回归全绿 | 无 |
| playbook | 切片 4 剧本模块新建：内置剧本注册表（软件项目全流程 6 阶段 + 维护型轻剧本 3 阶段，代码常量版本化 v1，含人话访谈问题/术语对照/闸门定义/后果预演/档位领域）+ 运行态服务（mount 游标拨首阶段 / 阶段访谈确定性转写正式工件+术语对照 / skip 记事件留痕 / getStatus 事件派生时间线）+ 闸门决策卡（DecisionProposal 新增 gate kind：accept 拨游标+完成事件，reject 必须理由+退回事件）+ Project 增 playbookRef/lifecycleStage 可空游标字段（migration 20260908000000）+ 知识原子落 Store B（type=knowledge，闸门提交时按阶段术语入库） | FR-AI-001 | `playbook.service.spec.ts`（11 用例）+ migration 已应用 dev.db 与 template.db | `openapi.json` 新增 5 端点（templates/status/mount/interview/skip）；Project schema 增量 |
| memory | 切片 3 专长度档位：ExpertiseService 按 人 × 领域 存 Store B 偏好原子（scope=user:{id}，折叠忽略 ≥3 次自动降 terse / 主动追问回升 detailed / suppress 直写抑制 / reset 恢复）；MEMORY_TYPES 增 knowledge 类型 | FR-AI-001 | `expertise.service.spec.ts`（6 用例） | `openapi.json` 新增 2 端点（GET memory/expertise、POST feedback）；MEMORY_TYPES 增量 |
| frontend | 决策卡 gate kind 四段式（产出工件行 + 人话→专业对照 + 后果预演 + 知识夹层：默认永不主动弹开、展开=追问回升密度、折叠=忽略计数、"别再解释这类"直写抑制、suppressed 一键恢复）+ use-expertise 档位 hook + 剧本流程页（详情页 playbook tab：模板选择卡/阶段时间线/游标徽标/跳过留痕对话框/访谈向导——人话提问收集→工件+对照翻译展示→引导去决策收件箱拍板）+ 创建面板从零开始分流至剧本页（导入分流不变）+ analytics 档案健康卡与剧本健康卡（完备度/置信度/过期槽位/跳过率/退回率/平均停留，全派生） | FR-AI-001 | 前端 vitest 214 用例全绿（含 decision-card-gate 5 用例 + interview-dialog 2 用例 + use-expertise 2 用例）+ type-check 0 error + eslint 0 error | i18n 双语键（decision.gate.*、project.playbookPage.*、detail.playbook） |
| dashboard | 切片 5 分析端点：GET /dashboard/profile-health（按项目完备度/生效原子平均置信度/90 天过期槽位，全派生零存储）+ GET /dashboard/playbook-health（阶段通过/跳过/驳回计数、跳过率、退回率、平均停留时长≈同项目上一剧本事件到通过的间隔） | FR-AI-001 | `dashboard-health.spec.ts`（4 用例） | `openapi.json` 新增 2 端点 |
| profile | 边界补完：briefing 注入补齐 CLI 桥对话路径（buildCliChatPrompt 接入 formatBriefingInstruction，LLM/CLI 双链路对称，旁路失败不阻断）；活跃热点升级目录级 git 热力（CommitFile 路径首段聚合 Top5，take 2000 封顶，进简报注入文案「改动最集中的目录」）；档案页顶部健康条（生效原子平均置信度 + 90 天过期槽位徽标，与 profile-health 端点同口径，零额外请求） | FR-AI-001 | eslint 文件域 0 error + 前端 vitest 214 全绿 + assistant-cli-chat/playbook e2e 全绿 | 无 |
| e2e | api:audit 存量盲区清零：periphery.e2e-spec 7 用例真实触达 20 条存量未覆盖端点（issue-types 全 CRUD / oauth2 未配置提供方可读失败 / runtime approvals·dispatches 清单 / ai chat·assign-issue 无模型无成员可读失败 / assistant tools·dispatches·silent / git PR 404 路径 / MCP 无 token 401 握手） | FR-AI-001 | `pnpm api:audit --min=95` 覆盖率 474/474（100%），未覆盖清零 | `docs/roadmap/api-audit.md`（滚动） |

### 项目档案底座 + 考古导入（AI 同事化 v2 纪要切片 1）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| profile | 项目档案模块新建：内置槽位注册表（tech-stack/module-map/conventions/risks/tech-debts，代码常量版本化 v1）+ 档案原子存取（复用 MemoryAtom 加 `slot` 列，AI 产物落 working 草稿、人批准 consolidated、替换 archived+supersededById 留痕、驳回 archived）+ 完备度派生（生效槽位/总槽位，不落库）+ briefing 最小装配（事实现查与 AI 档案管道分离）+ 考古服务（内部 issue 容器复用派发链路，DispatchOptions.promptOverride 注入只读扫描任务包，产物经 profile_draft schema 校验拉取式 ingest 落草稿） | FR-AI-001 | `apps/server/src/modules/profile/profile.service.spec.ts`（12 用例：聚合/完备度/审批状态机/替换链/产物校验/clamp 与去重）+ `pnpm contract:check` 零漂移 | `openapi.json` 新增 9 端点（profile schema/聚合/原子 CRUD/approve/reject/archaeology/ingest/briefing）；双端 api-types.gen.ts 重生成 |
| frontend | 项目档案页（详情页新 profile tab：槽位分组卡 + 完备度环 + AI 草稿区批准/驳回 + 原子编辑替换留痕 + 考古触发与执行轮询自动入库）+ 项目接入向导（连仓库复用 git workspace API → AI 考古 → 档案页校对，`?wizard=1` 带参唤起）+ 创建对话框来源分流（从零开始/导入已有项目）+ 通用 Stepper 组件（COMPONENTS.md 已登记） | FR-AI-001 | 前端 vitest project 模块 205 用例回归全绿 + `pnpm type-check` 4 包 0 error + eslint 0 error | `apps/frontend/src/modules/project/{api,hooks,components,pages}`、`components/ui/stepper.tsx`、i18n 双语键、`COMPONENTS.md` |

## [0.4.11] - 2026-09-06

### v0.4.11 发版：主 AI 助手全量特性 + e2e 全量测试驱动的 10 项产品缺陷修复（develop 三分支合入）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| assistant | 主 AI 助手全量特性合入（feat/main-ai-assistant，16 特性提交 + 4 批次 WIP 收尾）：面板对话闭环（长驻会话/作用域隔离/流式渲染）、执行桥（POST /ai/assistant/dispatches 选在线 CLI 守护进程建 ExecutionRun 派发）、静默 AI 场景（quick-prompts/create-suggestions/project-score，AIUsageLog 记账接 UsagePricingService 成本估算）、订阅（Subscription 模块 + 页面订阅按钮→变动推送）、dashboard 聚合模块、V3 Member 口径前端收尾（V1/V2 AI 身份清偿）、运行时派发视图 | FR-AI-001 | server jest 268 用例 + 前端 vitest 185 用例 + `pnpm type-check`（4 包 0 error） | `apps/server/src/modules/ai-hub/`、`apps/frontend/src/modules/assistant/` |
| task | e2e 驱动缺陷修复四项：POST /tasks 无 projectId 落 inbox 并补挂请求用户成员身份（修复任务已落库但 findOne 404）；create 从 parentTaskId 继承项目（修复子任务创建 "Parent task not found"）；task-id nextShortId 缺 moduleCode 兜底项目首模块、项目无模块自动登记默认模块（修复右键建任务 400，存量项目自愈）；UpdateTaskDto 增 projectId/parentTaskId，update 做目标项目成员校验+短 ID 重生成+TaskTag 归属同步+跨项目里程碑/迭代清空（修复详情页「项目」胶囊移动任务 400） | FR-TASK-001 | `apps/server/src/modules/task/task.service.spec.ts`（18 用例，含 7 项缺陷回归）+ e2e T06/T07/T09/T13/T15/T23/P15 | `openapi.json`（UpdateTaskDto 增量） |
| project | 建项目自动播种 TASK/BUG 默认模块（建任务/Bug 不再因无登记模块 400，存量项目由 nextShortId 自愈）并绑定 owner 到 MemberProjectBinding（负责人下拉走 Member 体系，修复新项目恒无指派候选；Member 缺失的存量账号补建） | FR-PROJECT-001 | `apps/server/src/modules/project/project.service.spec.ts` + e2e T06/T13 | 无 |
| document | tags 按 id 或名字解析写入（create 此前静默丢弃、update 此前透传 prisma 报错）；新增共享 tag-resolve.util（id/名字双口径，项目内→全局匹配、按需创建），任务与文档 create/update 统一接入——统一创建对话框按名字提交标签全链路打通 | FR-DOC-001 | `apps/server/src/common/utils/tag-resolve.util.ts` + e2e 冒烟 | `scripts/`（无） |
| frontend | 命令面板修 Ctrl+K 确定性崩溃（CommandDialog 缺 cmdk Command root，Input/Item 拿不到 store context）；文档 view/edit 页 currentUser 改走 useAuth（与路由守卫同源，修提审按钮偶发不渲染）；**Buffer polyfill 新增**（gray-matter 浏览器端裸 Buffer 致文档「保存」同步抛 ReferenceError、PUT 从未发出——缺陷 8 真根因）；useAuth 增 isAdmin 并隐藏团队/标签/状态/角色四处普通用户必 403 的管理入口；project-list/milestones 页移除 onSuccess 强制关闭（Create more 开关恢复）；useCreateProjectMilestone 失效 projectMilestones 查询（里程碑列表即时刷新） | FR-CORE-001 | e2e SH02/ST05/TM01/TM02/C03/C04/P19 | `apps/frontend/src/polyfills.ts`（新增） |
| test | Playwright 全功能 e2e 套件首次入库（test/e2e-suite 分支）：10 spec 约 91 用例覆盖全部用户可达模块（认证/shell/项目/任务/Bug/文档/验收/成员团队/设置 12 子页/AI 助理面板），helpers + auth.setup 落 storageState，串行 retries=2 失败留 trace；断言已随缺陷修复翻转，正常用户可达功能面覆盖率 90%+ | FR-CORE-001 | `pnpm --filter ./apps/frontend run e2e`（auth/documents/projects 三 spec 重跑 30/33 过，遗留 C04/A04 两项见 e2e/README.md 待收尾清单） | `apps/frontend/e2e/README.md` |
| release | v0.4.11 发版：三分支治理合入（feat/main-ai-assistant → fix/known-defects → test/e2e-suite，均自 v0.4.10 切出，按依赖序合并）；合并后契约三件套再同步（contract:check 零漂移）、lockfile 补齐 shared/cli typescript importer 条目 | FR-CORE-001 | `pnpm type-check` + `pnpm contract:check` | `CHANGELOG.md` |

> 遗留（不影响本版功能面）：文档编辑页保存的 Buffer polyfill 已合入但 dev 模式验证与 e2e C04 复跑待做；命令面板登出链路（A04）待定位；`api:audit` 94.5%<95% 为存量缺口。详见 `apps/frontend/e2e/README.md` 待收尾清单。

## [0.4.10] - 2026-09-04

### v0.4.10 发版收口：tag 迁移残留修复与质量门禁清偿（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| runtime | 守护进程全局单实例保证：CLI 侧 runtime.lock 锁文件（wx 原子创建防双开、持有者存活即拒、陈旧锁自动接管），server 侧同 deviceId 旧注册 register/心跳压制（supersededBy/At）、listRegistrations 按 2×心跳间隔判活 | FR-RUNTIME-001 | `pnpm --filter @apm/cli run test` + `pnpm --filter ./apps/server run test:e2e -- runtime-single-instance` | 无 |
| server | 0.4.8 tag 单一 resourceType 迁移收尾：metadata/document-tag/linear-sync/seed 五处 `resourceTypes` 数组残留对齐单字段（此前被主仓库旧 Prisma Client 掩盖，干净环境 type-check/jest 必挂）；metadata e2e 载荷同步 | FR-CORE-001 | `pnpm type-check`（4 包 0 error）+ `pnpm --filter ./apps/server run test`（184/184） | 无 |
| infra | @apm/shared 与 @apm/cli 补声明 typescript devDependency（此前依赖主仓库根 .bin 历史残留链接，干净环境/CI 缺 tsc）；contract-check 根检测改按 pnpm-workspace.yaml+openapi.json 标志文件（兼容 worktree/CI 检出目录名）；契约三件套再同步（openapi.json 329 paths + 前端/shared 双 gen 类型） | FR-CORE-001 | `pnpm contract:check` | `scripts/contract-check.mjs` |
| chore | server 22 文件 45 处 prettier 格式化清偿（server lint --fix 语义遗留，巡检非破坏性 lint 首次全量暴露） | FR-CORE-001 | `pnpm --filter ./apps/server exec eslint "{src,apps,libs,test}/**/*.ts"`（0 error） | 无 |
| test | cli-dispatch e2e 密闭化：套件内经公开 API（registerAdapter+detectAllProviders）注册 claude-code 假 adapter，不再依赖宿主机真实 CLI 探测（无 claude 原生二进制的机器/CI 上 isAvailable=false 致派发 400） | FR-AI-001 | `pnpm --filter ./apps/server run test:e2e -- cli-dispatch`（4 用例） | `apps/server/test/cli-dispatch.e2e-spec.ts` |
| release | v0.4.10 发版收口：分支治理（清理已合并本地 33/远端 13，评估删除 5 个旧时代分支）、develop 线首个正式 tag、main 对齐 develop、全量质量门禁与稳定化巡检 | FR-CORE-001 | `pnpm quality:gate` + `docs/roadmap/stability-reports/` | `docs/roadmap/stability-reports/LATEST.md` |

## [0.4.9] - 2026-09-01

### CLI 与守护进程完善（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| shared/cli | `@apm/shared` 与 `@apm/cli` 入库（apm 瘦客户端 16 组命令 + apm-runtime 守护进程）；审批决议闭环：协议增 ApprovalResolvedPayload，worker 维护审批映射、驳回终止进程树、lifecycle 空监听器接通；daemon stop 平台判断前置；vitest 基建 + 11 用例（worker 去重/审批驳回/结果映射 + 适配器 prompt 契约与流解析） | FR-RUNTIME-001 | `pnpm --filter @apm/shared run test && pnpm --filter @apm/cli run test` | `docs/02-架构设计/architecture/本地运行时通信协议-v1.md` |
| server | cli-dispatch 缺陷修复：CommandBuildResult 增 stdinData 契约（修复进程内 fallback 下 codex 派发 prompt 丢失）、cancel 改进程树终止、zcode parseStream 删死分支、spec 构造参数对齐；新增 runtime 查询控制面（registrations 脱敏/approvals/dispatches）；CLI Dispatch e2e 4 用例（runtime 通道接单-结果回桥-cancel-404） | FR-AI-001 | `pnpm --filter ./apps/server run test:e2e -- cli-dispatch` | `docs/roadmap/api-audit.md` |
| auth | 访问 token（PAT）：AccessToken 模型 + /auth/tokens CRUD（明文一次性、SHA-256 hash、吊销/有效期/lastUsedAt 节流），双 JwtAuthGuard 接 PAT 分叉；e2e 6 用例 | FR-AUTH-001 | `pnpm --filter ./apps/server run test:e2e -- access-token` | 无 |
| frontend | 设置页新增「运行时」与「访问 Token」两个区块（runtime 注册卡片/审批决议/派发记录/CLI 指引；token 创建一次性明文复制/列表脱敏/吊销）；导航 groupAi/groupAccount 各增一项，i18n 双语 64 键 | FR-AI-001 | `pnpm --filter frontend lint && pnpm --filter frontend test --run` | 无 |

## [0.4.5] - 2026-08-30

### 接口测试与契约自动化基建（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 契约 codegen 链路：Swagger 配置抽 `openapi.document.ts` 与运行时共用，`contract:export`（jest 守卫 spec + template.db 副本）导出 openapi.json（321 paths/102 schemas）入库，`contract:generate` 生成前端契约类型，`contract:check` 临时产物字节比对校验零漂移；9 个 DTO 补齐 @ApiProperty，LinearConfigPayload 手动 $ref 以 ApiExtraModels 注册修复 | FR-CORE-001 | `pnpm contract:check` | `docs/roadmap/stabilization-plan.md` WP1 |
| server | E2E 工作区隔离基建：`test/helpers/ws-app.ts`（template.db 副本一次性工作区 + initTestApp 装配 x-workspace-id→ALS 中间件 + wsRequest 注入工作区头 + ws.db 直连客户端），存量 6 spec 迁移并修复契约漂移断言 | FR-CORE-001 | `pnpm --filter ./apps/server run test:e2e --runInBand`（68 用例全绿） | `docs/roadmap/stabilization-plan.md` WP2 备注 |
| server | 新增 git/document/team/activity 四模块 E2E smoke；修复 auth 凭据错误状态码 400→401（UnauthorizedException.prototype.getStatus() 反模式）、git 根提交 diff 列表 400、task-assignee spec 存量失败（F3 清零） | FR-CORE-001 | `pnpm --filter ./apps/server run test`（184/184） | `CHANGELOG.md` |
| tooling | `api:audit` 完成度清点脚本（openapi.json × e2e 触达路径三态比对，首份报告覆盖 180/413）；coverageThreshold 防劣化基线（11/10/9/11）；quality-gate.yml 与根 quality:gate 接入 contract:check 与 server e2e；修复 quality:gate 前端测试 `--` 分隔符残留 | FR-CORE-001 | `pnpm api:audit` + `pnpm quality:gate` | `.github/workflows/quality-gate.yml` |

## [0.4.8] - 2026-09-01

### 标签单一资源类型迁移 + git 模块 UI 收编（develop，WIP）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | Tag 模型 resourceTypes JSON 数组收敛为单一 resourceType（迁移取首元素、缺省 task）；seed/template.db 同步 | FR-CORE-001 | e2e 276/276（迁移后库跑通） | `apps/server/prisma/migrations/20260830090000_tag_single_resource_type/` |
| frontend | tag-manager/status/role 管理与 document-tag-api 适配单一 resourceType；git 模块删 repository-card、branch/commit 列表与 tasks 页对齐 toolbar/filter-chips 形态 | FR-CORE-001 | type-check + vitest 通过 | `apps/frontend/src/components/ui/filter-chips.tsx` |

## [0.4.7] - 2026-09-01

### pnpm 11 迁移落定（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| infra | pnpm 锚定 11.25.0：lockfile 重新生成为 v9 格式，pnpm-workspace.yaml 以 `allowBuilds` 声明可信构建脚本白名单（bcrypt/esbuild/prisma/msw 等 8 项）；CI workflow 移除硬编码 pnpm 版本改读 packageManager 字段 | FR-CORE-001 | `pnpm quality:gate` 全绿 | `pnpm-workspace.yaml`、`.github/workflows/quality-gate.yml` |

## [0.4.6] - 2026-08-30

### 接口 E2E 覆盖率冲刺 43.6% → 96.4% + 六个真实缺陷修复（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| server | 新增 14 个接口 E2E 套件（members/users/task-assignees/mentions/task-templates/metadata-roles/iterations/config/notifications/admin/invites/document-bindings/auth-extended/workspaces/runtime/execution/acceptance/plugins/cli-providers/mcp-servers/integrations/ai-hub），endpoint 覆盖 180→398（43.6%→96.4%） | FR-CORE-001 | `pnpm api:audit`（33 套件 276 用例全绿） | `apps/server/test/` |
| server | 修 6 个真实缺陷：AcceptanceModule 重复声明 PrismaService 绕过工作区路由；execution steps 端点写死 system 用户致 403；integrations external-issues 被 :id 路由抢占致 404；task-template PATCH 部分更新清空条目；task-assignees bulk DTO 缺校验；notification preferences channels String 列误写数组；document reference parse 正则 `[^]]` 误用；git clone 拒绝本地路径 remoteUrl | FR-CORE-001 | e2e 276/276 | 对应模块源码 |
| infra | api:audit 支持 `--min` 阈值并接入 quality:gate（钉 95%），防接口覆盖回退；契约零漂移链路照常生效 | FR-CORE-001 | `pnpm quality:gate` | `scripts/api-audit.mjs`、根 `package.json` |

## [0.4.4] - 2026-08-17

### 任务列表对齐 design-system Task Rows（develop）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 新增 `TaskRowsList` 共享组件（状态分组 GroupRow 可折叠 + 任务行/缩进子任务行 + 组尾 Add task 行，结构与 `/app/design-system#task-rows` 一致） | FR-CORE-001 | `pnpm vitest task-rows` | `apps/frontend/src/modules/task/components/task-rows.tsx` |
| frontend | `/app/tasks` 列表视图由 `TaskListCard` 替换为 `TaskRowsList`（名称列显示项目名，点击/筛选/统计/派发功能不变） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/task/pages/tasks-page.tsx` |
| frontend | 项目 Board 标签页列表视图由 4 列 Table 替换为 `TaskRowsList`（点击跳详情、组内新建入口接入现有 inline create） | FR-CORE-001 | `pnpm build` | `apps/frontend/src/modules/project/pages/project-board-page.tsx` |
| frontend | Tasks Workspace（task-page）列表视图同步替换并接入按状态新建；删除旧组件 task-list/task-list-card/task-milestone-badge/sub-task-badge | FR-CORE-001 | `pnpm vitest task-page` | `apps/frontend/src/modules/task/components/index.ts` |

## [0.4.3] - 2026-08-16

### refer 页面级对齐（feat/refer-page-alignment）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 还原缺失页面 Delivery（交付树三视图/验收矩阵/Agent 状态，dev-only + data-mock） | FR-CORE-001 | `pnpm build` | `apps/frontend/src/modules/delivery/` |
| frontend | 还原缺失页面 Metadata（Labels/Statuses/Roles/Templates 四 Tab，复用 core-config manager，dev-only） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/metadata/` |
| frontend | Analytics 对齐 5-Tab 结构（Overview 真实 API + Cost/Quality/Risk/Team mock） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/analytics/pages/analytics-page.tsx` |
| frontend | Search 对齐类型过滤/分组/键盘导航（mock 数据） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/search/pages/search-page.tsx` |
| docs | AGENTS.md 增补 5.7 页面级对齐约定（mock 规范、dev-only 规范、组件复用映射） | FR-DOC-01 | `pnpm lint` | `apps/frontend/AGENTS.md` |

## [0.4.2] - 2026-08-16

### refer 设计系统还原（feat/refer-design-restore）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 默认主题预设改为 `figma`（refer 设计 v23），应用启动即呈现 refer 设计 | FR-CORE-001 | `pnpm type-check` | `apps/frontend/src/shared/theme/presets.ts` |
| frontend | Badge/Card/Input/PageHeader/Select 默认样式对齐 refer（保留扩展变体） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/components/ui/` |
| frontend | tailwind `xl` 圆角对齐 refer `--radius-xl`；补充 `--input-background`/`--switch-background` 兜底 | FR-CORE-001 | `pnpm build` | `apps/frontend/tailwind.config.js`, `apps/frontend/src/index.css` |
| docs | 新增前端治理手册 `apps/frontend/AGENTS.md`（结构/设计系统架构/组件复用规范） | FR-DOC-01 | `pnpm lint` | `apps/frontend/AGENTS.md` |

## [0.4.1] - 2026-08-16

### CLI Provider / 角色 / MCP-SSE / Linear SDK / 执行恢复 / 文档同步

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| backend | `CliProviderConfig` 模型、CLI Provider 解析链与执行运行面板 | FR-CLI-01 | `pnpm type-check` | `apps/server/prisma/schema.prisma` |
| frontend | MCP/CLI Provider 管理 UI（`feat/cli-provider-module`） | FR-CLI-01 | `pnpm type-check` | `apps/frontend/src/modules/cli-provider/` |
| backend | 角色模块 + Member CLI 绑定字段 + 5 个全局执行角色模板 | FR-RBAC-01 | `pnpm jest` | `apps/server/src/modules/role/` |
| backend | MCP Server 迁移 HTTP/SSE 传输 + 3 个新 CLI Provider 工具 | FR-MCP-01 | `pnpm type-check` | `apps/server/src/modules/mcp-server/` |
| backend | Linear 升级 `@linear/sdk` + 子任务/标签同步 + 幂等绑定 | FR-INT-04 | `pnpm jest integration` | `apps/server/src/modules/integration/providers/linear/` |
| backend | Task 支持 `parentTaskId` 过滤 + 执行恢复 API | FR-TASK-04 | `pnpm type-check` | `apps/server/src/modules/task/` |
| frontend | `/boot` 启动页 + 品牌 Logo 重设计（`chore/boot-brand` 落地） | FR-BOOT-01 | `pnpm vitest` | `apps/frontend/src/modules/boot/` |
| frontend | Design System 展示页面（`feat/frontend-design-system`，仅 dev 模式：Tokens / Primitives / App Components 三大类、28 个 section） | FR-CORE-001 | `pnpm vitest` | `apps/frontend/src/modules/design-system/` |
| docs | CLAUDE/README/architecture 与 cli-provider、role、mcp-sse、linear-sdk 同步 | FR-DOC-01 | `pnpm check:docs-sync` | `docs-sync-manifest.json` |

## [0.4.0] - 2026-07-28

### 内置任务提供商：Linear 完整接入 + Integrations 页面升级

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| backend | Prisma 扩展 Project/Task + 新模型 `TaskProviderLink` / `IntegrationSyncLog` + 迁移 `20260728210000_add_task_provider_link` | FR-INT-04 | `pnpm prisma migrate dev` | `apps/server/prisma/schema.prisma`, `apps/server/prisma/migrations/20260728210000_add_task_provider_link/migration.sql` |
| backend | `EncryptionService`（AES-256-GCM）抽离到 `core/crypto/`，`IntegrationService` 改造为调用 `encryptJson/decryptJson`，新增 `getDecryptedConfig` | FR-INT-04 / P0-SEC-001 | `pnpm jest integration.service.spec.ts` | `apps/server/src/core/crypto/encryption.service.ts`, `apps/server/src/modules/integration/integration.service.ts` |
| backend | 新模块 `LinearClient`（GraphQL + 429/5xx 重试 + `NON_RETRYABLE_LIKE_CODES` 短路）+ `LinearProviderService` + `LinearSyncService`（project 单向 pull + task 双向 sync + hybrid 冲突）+ `LinearController` | FR-INT-04 | `pnpm jest linear-client.spec.ts linear-sync.service.spec.ts integration.service.spec.ts`（19/19 通过） | `apps/server/src/modules/integration/providers/linear/` |
| backend | 字段锁：`ProjectService.update` 校验 `fieldsLockedExternally` 白名单；`TaskService.update` 自动写 `syncStatus='pending'` + `localUpdatedAt` 触发下次 push | FR-INT-04 | `pnpm jest project.service.spec.ts task.service.spec.ts` | `apps/server/src/modules/project/project.service.ts`, `apps/server/src/modules/task/task.service.ts` |
| backend | 消息总线扩展：`linear.sync.completed` / `linear.task.{pulled,pushed,conflict,resolved}`；`EventsGateway` 增 project 房间 join/leave 协议 | FR-INT-04 | `pnpm type-check` | `apps/server/src/core/message-bus/message-bus.service.ts`, `apps/server/src/gateways/events.gateway.ts` |
| frontend | 新模块 `modules/linear/`（API + hooks + 配置表单 + 状态徽章 + provider card + 冲突解决 + 同步日志抽屉 + Task 外部面板） | FR-INT-04 | `pnpm vitest run src/modules/integration`（3/3 通过） | `apps/frontend/src/modules/linear/` |
| frontend | `IntegrationListPage` 升级为 Built-in / Installed / Marketplace 三 Tab；Linear 渐变深色 hero 卡 + Jira "Coming Soon" 占位 | FR-INT-04 | `pnpm vitest run integration-list-page.test.tsx` | `apps/frontend/src/modules/integration/pages/integration-list-page.tsx`, `apps/frontend/src/modules/integration/constants/builtin-providers.tsx` |
| frontend | Project 设置/详情/Board/Team 注入 Linear 同步状态徽章 + Sync 按钮 + `LinearSyncLogDrawer`；Task 详情右栏新增 External 分组 | FR-INT-04 | `pnpm type-check` | `apps/frontend/src/modules/project/components/project-linear-sync-status.tsx`, `apps/frontend/src/modules/task/pages/task-detail-page.tsx` |
| frontend | 前端 Socket 订阅：`eventClient` 增 `joinProject/leaveProject`；`useLinearSyncEvents` 自动 invalidate 任务 + 冲突 toast | FR-INT-04 | `pnpm type-check` | `apps/frontend/src/infrastructure/event-client/index.ts`, `apps/frontend/src/modules/linear/hooks/use-linear-events.ts` |
| docs | `docs/02-架构设计/architecture/linear-sync-design.md` 新建架构设计文档；P3-007 勾选 Linear 部分 + Jira "Coming Soon" | FR-INT-04 | n/a | `docs/02-架构设计/architecture/linear-sync-design.md`, `docs/roadmap/tasks-phase1-3.md` |

## [0.3.8] - 2026-06-16

### APM 文档模块重构 v1（7 项调整落地）

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| shared | 新增 `useToastMutation` / `useActionWithToast`: 统一 mutation 成功/失败 toast 反馈 | FR-DOC-07 | `pnpm type-check` | `apps/frontend/src/shared/hooks/use-action-with-toast.ts` |
| frontend | 删除 `MarkdownLite`, 编辑/查看页统一走 `MdxRenderer` | FR-DOC-01 | `pnpm type-check` | `apps/frontend/src/modules/document/components/markdown-lite.tsx` |
| shared | 升级 MDX 工具链: 接入 `rehype-highlight` / `rehype-external-links` / `remark-gfm` 完整 GFM | FR-DOC-01 | `vitest mdx-pipeline.test.ts` (7) | `apps/frontend/src/shared/mdx/mdx-pipeline.ts` |
| frontend | CodeMirror 6 编辑器 + 工具栏, `MdxEditorRef` 暴露 insert/wrap/focus | FR-DOC-01 | `pnpm type-check` | `apps/frontend/src/modules/document/components/mdx-editor.tsx` |
| shared | 标题组件悬浮: H{level} 徽章 / 复制锚点 / 复制为 Markdown / 折叠子标题, 全部按钮走 `useActionWithToast` | FR-DOC-02 | `pnpm type-check` | `apps/frontend/src/shared/mdx/components/mdx-heading.tsx` |
| frontend | 目录缩进按 H1-H6 真实 level 计算, 跳级按 parentLevel 栈降级 | FR-DOC-02 | `pnpm type-check` | `apps/frontend/src/modules/document/components/section-navigation.tsx` |
| backend | `Project.documentsRepoPath` 字段 + `PUT /projects/:id/docs-storage` 端点 | FR-DOC-03 | `pnpm type-check` | `apps/server/src/modules/project/` |
| backend | `DocsGitService` 走 `child_process.execFile` 调用 git CLI, 提供 commitFile / listCommits / restoreFile | FR-DOC-03 | `pnpm type-check` | `apps/server/src/modules/document/services/docs-git.service.ts` |
| backend | `DocumentVersionService` 集成 Git 同步层, 新增 `renameVersion` + 回滚为新版本 | FR-DOC-03 | `pnpm type-check` | `apps/server/src/modules/document/services/document-version.service.ts` |
| backend | `ProjectModule` 表 + `ProjectModuleController` (CRUD); 校验 `^[A-Z]{2,4}$` | FR-DOC-04 | `pnpm type-check` | `apps/server/prisma/schema.prisma`, `apps/server/src/modules/project/` |
| backend | `ProjectSequence` 表 + `TaskIdService.nextShortId` 原子递增; Bug/Task 共享计数器 | FR-DOC-04 | `jest task-id.service.spec.ts` (3) | `apps/server/src/modules/task/services/task-id.service.ts` |
| backend | `Task.shortId @unique` 字段, `CreateTaskDto.moduleCode` 必填 | FR-DOC-04 | `pnpm type-check` | `apps/server/prisma/schema.prisma` |
| frontend | `ProjectModuleManager` UI + `useProjectModules` 钩子 (CRUD) | FR-DOC-04 | `pnpm type-check` | `apps/frontend/src/modules/project/components/project-module-manager.tsx` |
| frontend | 所有 Task/Bug 列表 + 详情显示 `task.shortId`, 看板卡片 + 关联卡片 + 详情 drawer | FR-DOC-04 | `pnpm type-check` | `apps/frontend/src/modules/task/`, `apps/frontend/src/modules/document/components/document-task-links.tsx` |
| frontend | `TaskDetailDrawer` 新增"关联文档" tab + `DocumentPickerDialog` 反向选择 | FR-DOC-04 | `pnpm type-check` | `apps/frontend/src/modules/task/components/task-detail-drawer.tsx`, `apps/frontend/src/modules/document/components/document-picker-dialog.tsx` |
| shared | `mdx-frontmatter` 升级 Obsidian 兼容子集: tags/aliases/status/project/module/short_id/custom 桶 | FR-DOC-05 | `vitest mdx-frontmatter.test.ts` (8) | `apps/frontend/src/modules/document/services/mdx-frontmatter.ts` |
| frontend | `metadata-sync.service` 读时同步 frontmatter → DocumentTag (单向, 不写回) | FR-DOC-05 | `pnpm type-check` | `apps/frontend/src/modules/document/services/metadata-sync.service.ts` |
| frontend | `DocumentTagManager` 取消"管理全部标签" 折叠, 改为只读 + frontmatter 提示 | FR-DOC-05 | `pnpm type-check` | `apps/frontend/src/modules/document/components/document-tag-manager.tsx` |
| frontend | 文档编辑页标签输入框改为只读展示, 提示用户编辑 frontmatter | FR-DOC-05 | `pnpm type-check` | `apps/frontend/src/modules/document/pages/document-edit-page.tsx` |
| frontend | 所有 mutation 钩子 (`useCreateDocument` / `useUpdateDocument` / `useDeleteDocument` / `useAttachTag` / 等) 走 `useToastMutation`, 必传 `successMessage` | FR-DOC-06 | `pnpm type-check` | `apps/frontend/src/modules/document/hooks/` |
| test | 服务端 task.service.spec.ts 11/11 通过; 任务 ID 生成测试 3/3 通过 | — | `jest` | `apps/server/src/modules/task/` |
| test | 前端 mdx-pipeline 7/7 + mdx-frontmatter 8/8 | — | `vitest` | `apps/frontend/src/` |

## [0.3.7] - 2026-05-30

### Phase 2 Trust & Context 模块实现

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| backend | 新增 TrustModule (TrustService): 信任档案管理、三层评估管道、角色驱动指标、信任分计算 | FR-TRUST-01~06 | `pnpm type-check` | `apps/server/src/modules/trust/` |
| backend | 新增 ContextModule (ContextService): 四层上下文构建、配方系统、自动策展、Token预算管理 | FR-CTX-01~10 | `pnpm type-check` | `apps/server/src/modules/context/` |
| backend | 更新 app.module.ts 导入 TrustModule 和 ContextModule | — | `pnpm type-check` | `apps/server/src/app.module.ts` |

### Tier 2 前端功能实现

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | 新增 ContextPreviewDialog: 四层上下文预览、Token用量条、可折叠区块 | FR-CTX-04 | `pnpm type-check` | `apps/frontend/src/modules/task/components/context-preview-dialog.tsx` |
| frontend | 更新 TaskAiSuggestionTab 集成 ContextPreviewButton | FR-CTX-04 | `pnpm type-check` | `apps/frontend/src/modules/task/components/task-detail-tabs.tsx` |
| frontend | 新增 BatchCreateTasksDialog: 批量创建任务（手动/模板/AI生成三种模式） | FR-TK-BATCH | `pnpm type-check` | `apps/frontend/src/modules/task/components/batch-create-tasks-dialog.tsx` |
| frontend | 更新 TaskPage 添加 Batch Create 按钮和 Dialog 集成 | FR-TK-BATCH | `pnpm type-check` | `apps/frontend/src/modules/task/pages/task-page.tsx` |

## [0.3.6] - 2026-05-30

### 前端模块完善与 Onboarding 向导实现

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | Tier 1: 创建 Onboarding Wizard 5步向导（欢迎→创建项目→连接仓库→配置AI→完成） | FR-CORE-001 | `pnpm type-check` | `apps/frontend/src/modules/onboarding/` |
| frontend | Tier 1: 创建 use-onboarding.ts hook（步骤管理、状态持久化、API集成） | FR-CORE-001 | `pnpm type-check` | `apps/frontend/src/modules/onboarding/hooks/use-onboarding.ts` |
| frontend | Tier 1: 创建 sprint-page.tsx 及 Sprint 管理组件（sprint-list.tsx, sprint-dialog.tsx） | FR-TK-04 | `pnpm type-check` | `apps/frontend/src/modules/project/pages/sprint-page.tsx` |
| frontend | Tier 1: 创建 execution-recovery-dialog.tsx（5种恢复选项：重试/重试步骤/调整参数/转交人工/放弃） | FR-AI-05 | `pnpm type-check` | `apps/frontend/src/modules/execution/components/execution-recovery-dialog.tsx` |
| frontend | Tier 1: 检查任务讨论/活动流 TaskActivity（已正确实现于 task-detail-drawer.tsx） | FR-TK-06 | — | — |
| frontend | Phase 2: 验证 Git 模块后端服务完整性（GitService, GitToolService, ProjectWorkspaceService, GitCommandService） | FR-GT-01 | — | — |
| frontend | Phase 2: 验证 Terminal 模块后端服务完整性（TerminalService） | FR-TERM-01 | — | — |
| frontend | Phase 3: 验证 AIExecutionCenterPage 实现完整性（执行队列/审批中心/信任管理） | FR-AI-02 | — | — |
| frontend | Phase 4: 验证 Plugin 前端模块完整性（api, hooks, components） | FR-PL-01 | — | — |
| infrastructure | 新增 onboardingCompleted 状态到 AppStore（支持 onboarding 流程持久化） | FR-CORE-001 | `pnpm type-check` | `apps/frontend/src/infrastructure/store/app-store.ts` |

## [0.3.5] - 2026-05-29

### 文档结构重组与前端 Tier 1 实现

|| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
|| --- | --- | --- | --- | --- |
|| docs | 文档重组：创建根目录 CLAUDE.md, architecture.md, PRD.md | FR-CORE-001 | — | `CLAUDE.md`, `architecture.md`, `PRD.md` |
|| docs | 文档重组：创建 docs/modules/ 目录（10个模块README） | FR-CORE-001 | — | `docs/modules/*/README.md` |
|| docs | 文档重组：创建 docs/design/ 目录（设计入口、设计系统、UI约束） | FR-CORE-001 | — | `docs/design/*.md` |
|| docs | 更新 docs/INDEX.md 索引 | FR-CORE-001 | — | `docs/INDEX.md` |
|| frontend | Tier 1: Task Detail Sheet 新增 4 Tab（执行记录/审批记录/AI建议/讨论） | FR-TK-06, FR-TK-07 | — | `apps/frontend/src/modules/task/components/task-detail-drawer.tsx` |
|| frontend | Tier 1: 新增 AIExecutionCenterPage（执行队列/审批中心/执行回放/信任管理） | FR-AI-02, FR-AI-05 | — | `apps/frontend/src/modules/ai-hub/pages/ai-execution-center-page.tsx` |
|| frontend | 路由：新增 /app/ai/executions 路由 | FR-AI-02 | — | `apps/frontend/src/app/router.tsx` |
|| frontend | Git: 新增 BindRepositoryDialog 组件 | FR-GT-01 | — | `apps/frontend/src/modules/git/components/bind-repository-dialog.tsx` |
|| frontend | Git: 更新 RepositoryListPage 添加绑定仓库入口 | FR-GT-01 | — | `apps/frontend/src/modules/git/pages/repository-list-page.tsx` |
|| frontend | Plugins: 创建前端模块目录结构 | FR-PL-01 | — | `apps/frontend/src/modules/plugins/` |

## [0.3.4] - 2026-05-17

### 基线修复、文档补齐、工程健壮性与环境切换

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| logging | 统一日志系统：Tauri 插件收集前后端日志，前端 shared/lib/logger 转发 console，后端 standalone 模式结构化格式 | FR-CORE-001 | `pnpm type-check`, `pnpm -r lint` | — |
| desktop | 移除 Tauri 硬编码路径，debug 使用 CARGO_MANIFEST_DIR，release 基于可执行文件位置 | FR-CORE-001 | `cargo check` 通过 | — |
| desktop | 配置 CSP 安全策略（允许 WebSocket、API、OpenAI 连接），打包后端 dist 和 prisma 资源 | FR-CORE-001 | `cargo check` 通过 | — |
| test | 修复 analytics-panel 和 documents-page 测试失败（PointerEvent polyfill + 断言调整） | FR-ANALYTICS-001, FR-DOCUMENT-001 | 前端测试 82/82 通过 | — |
| test | 新增 GitService 单元测试 12 条（CRUD、权限检查、MessageBus 事件） | FR-GIT-001 | 后端测试 117/117 通过 | — |
| docs | 新增 command-palette 三层文档（需求+契约+API），settings 和 analytics 需求文档 | FR-COMMAND-PALETTE-001, FR-SETTINGS-001, FR-ANALYTICS-001 | doc-coverage 检查 | `docs/meta/requirements/feature-*.md`, `docs/meta/contracts/command-palette.md`, `docs/api/api-command-palette.md` |
| docs | 新增 GIT-WORKFLOW.md（分支策略、版本标签、合并流程、提交规范） | FR-CORE-001 | — | `docs/meta/GIT-WORKFLOW.md` |
| docs | 更新追踪矩阵（+3 FR）、INDEX.md（+2 条目）、AGENTS.md（+4 模块） | FR-CORE-001 | 追踪矩阵核对 | 多文件 |
| ci | 新增 doc-coverage 自动检查脚本，加入 quality-gate CI | FR-CORE-001 | `node scripts/check-doc-coverage.mjs` | `scripts/check-doc-coverage.mjs`, `.github/workflows/quality-gate.yml` |
| ci | 新增 release.yml（tag push 触发自动构建和 NSIS 发布） | FR-CORE-001 | — | `.github/workflows/release.yml` |
| build | 新增 .env.production.example 和 build-desktop.ps1 构建脚本 | FR-CORE-001 | — | `apps/server/.env.production.example`, `scripts/build-desktop.ps1` |
| git | 创建版本标签 v0.1.0 ~ v0.3.3 | — | — | — |

## [0.3.3] - 2026-04-04

### Documentation Governance & Desktop Migration Alignment

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| docs/index | 重建文档索引并新增 Desktop 迁移状态导航（current/transition/legacy） | FR-CORE-001 | `pnpm check:docs-sync` | `docs/INDEX.md` |
| docs/desktop | 建立 Tauri 主线文档包（架构、runbook、发布回滚、路线图、验收清单） | FR-CORE-001 | 文档一致性人工校验 | `docs/architecture/desktop-tauri-architecture-v1.md`, `docs/guides/desktop-tauri-*.md`, `docs/reports/desktop-tauri-*.md` |
| docs/legacy | Electron 文档降级与归档基线合并 | FR-CORE-001 | 文档一致性人工校验 | `docs/archive/guides/desktop-electron-baseline.md`, `docs/guides/desktop-electron-runbook.md`, `docs/reports/release-notes-desktop-v0.1.0.md` |
| docs/contracts | 补齐模块缺口文档（runtime/iteration/config/task-template）并统一 plugin/plugins 命名说明 | FR-CORE-001 | 追踪矩阵核对 | `docs/meta/requirements/feature-*.md`, `docs/meta/contracts/*.md`, `docs/api/api-*.md`, `docs/reports/traceability-matrix.md` |
| governance | 新增 ADR-011（Electron -> Tauri 迁移决策） | FR-CORE-001 | 文档一致性人工校验 | `docs/meta/decision-log.md` |
| cleanup | 新增软删除候选清单（含文档与非文档产物） | FR-CORE-001 | 清单审阅 | `docs/reports/doc-cleanup-soft-delete-candidates-2026-04-04.md` |

## [0.3.2] - 2026-03-24

### Documentation Architecture Upgrade

| 模块      | 变更                                                                                                       | linked_fr        | test_evidence                   | doc_impact                                                                                                                                                                              |
| --------- | ---------------------------------------------------------------------------------------------------------- | ---------------- | ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| docs/meta | PRD 新增“文档管理与上下文治理层”与 V2 文档管理专项（实体、章节、版本、关联、AI 治理）                       | FR-DOCUMENT-001  | 文档一致性人工校验              | `docs/meta/PRD.md`                                                                                                                                                                      |
| docs/meta | 新增 Document 模块需求文档，定义 FR-DOC-01~07                                                              | FR-DOCUMENT-001  | 文档一致性人工校验              | `docs/meta/requirements/feature-document.md`                                                                                                                                            |
| docs/meta | Project/Task/AI Hub 需求文档补充文档章节关联与 AI 文档治理需求                                              | FR-PROJECT-001, FR-TASK-001, FR-AIHUB-001 | 文档一致性人工校验              | `docs/meta/requirements/feature-project.md`, `docs/meta/requirements/feature-task.md`, `docs/meta/requirements/feature-ai-hub.md`                                                     |
| contracts | 新增 Document 模块契约并更新 Project/Task/AI Hub 契约以支持章节级关联与 AI 文档写入提案                    | FR-DOCUMENT-001  | 文档一致性人工校验              | `docs/meta/contracts/document.md`, `docs/meta/contracts/project.md`, `docs/meta/contracts/task.md`, `docs/meta/contracts/ai-hub.md`                                                  |
| api       | 新增 `api-document.md`，并更新 `api-project.md`、`api-core.md`、`api-ai-hub.md` 以覆盖文档聚合、任务章节关联与 AI 写入审批 | FR-DOCUMENT-001  | OpenAPI/契约文档人工审阅        | `docs/api/api-document.md`, `docs/api/api-project.md`, `docs/api/api-core.md`, `docs/api/api-ai-hub.md`                                                                              |
| arch      | 架构总览加入 `document` 模块与文档契约；新增文档管理架构细化文档                                             | FR-DOCUMENT-001  | 架构文档人工审阅                | `docs/architecture/overview.md`, `docs/architecture/document-management-v2.md`                                                                                                         |
| reports   | 追踪矩阵新增 FR-DOCUMENT-001 映射                                                                            | FR-DOCUMENT-001  | 追踪矩阵检查                    | `docs/reports/traceability-matrix.md`                                                                                                                                                   |

## [0.3.1] - 2026-03-14

### Governance

| 模块       | 变更                                                                                              | linked_fr   | test_evidence                                       | doc_impact                                                                                                                                          |
| ---------- | ------------------------------------------------------------------------------------------------- | ----------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| governance | 新增质量门禁与文档同步阻断机制（PR模板+CI+docs-sync）                                             | FR-CORE-001 | `pnpm type-check`, `pnpm -r lint`, 前后端测试主命令 | `docs/meta/QUALITY-GATE.md`, `docs/meta/contracts/*`                                                                                                |
| docs       | 重建 PRD、模板体系与追踪矩阵                                                                      | FR-CORE-001 | 追踪矩阵与文档校验                                  | `docs/meta/PRD.md`, `docs/meta/templates/*`, `docs/reports/traceability-matrix.md`                                                                  |
| process    | GOV-001 验收：TODO 真相源切换到 `docs/reports/TODO.md` 并冻结根 TODO 写入                         | FR-CORE-001 | 人工核验根 `TODO.md` 归档状态                       | `docs/reports/TODO.md`, `TODO.md`, `docs/reports/DONE.md`                                                                                           |
| process    | GOV-002 归档流程固化：定义 TODO -> DONE -> CHANGELOG 一致性步骤                                   | FR-CORE-001 | 文档流程校验                                        | `docs/guides/todo-done-changelog-workflow.md`                                                                                                       |
| process    | GOV-003 启动首份治理周报机制                                                                      | FR-CORE-001 | 周报模板与首份周报落地                              | `docs/reports/review-reports/weekly-governance-2026-03-14.md`                                                                                       |
| process    | GOV-004 覆盖率周推进机制落地                                                                      | FR-CORE-001 | 周目标表创建并纳入治理机制                          | `docs/reports/coverage-weekly-targets-2026-03-14.md`                                                                                                |
| docs       | DOC-005 文档链接全量巡检与失效路径修复                                                            | FR-CORE-001 | 本地链接复扫 `BROKEN_COUNT=0`                       | `docs/reports/review-reports/doc-link-audit-2026-03-14.md`                                                                                          |
| docs       | DOC-001~004 收口：PRD 签字、7模块需求 GWT/边界补齐、7模块契约接口/状态/异常补齐、追踪矩阵证据回填 | FR-CORE-001 | 文档字段扫描通过 + QA 模块测试报告                  | `docs/reports/review-reports/prd-signoff-2026-03-14.md`, `docs/meta/requirements/*`, `docs/meta/contracts/*`, `docs/reports/traceability-matrix.md` |

### Quality

| 模块     | 变更                                                                  | linked_fr                                         | test_evidence                                                                              | doc_impact                                                                                                                           |
| -------- | --------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| server   | 清理 `src` 误入 `.js` 产物，恢复 TS 源一致性                          | FR-CORE-001                                       | server unit test 77/77                                                                     | `docs/reports/review-reports/project-rescue-baseline-2026-03-14.md`                                                                  |
| frontend | 修复 `use-project-health` 测试断言结构漂移                            | FR-PROJECT-001                                    | frontend test 31/31                                                                        | `docs/reports/traceability-matrix.md`                                                                                                |
| quality  | QA-001/002/003 补齐 ai-hub/integration/terminal 服务层专项测试证据    | FR-AIHUB-001, FR-INTEGRATION-001, FR-TERMINAL-001 | `pnpm test -- ai-hub.service.spec.ts integration.service.spec.ts terminal.service.spec.ts` | `docs/reports/test-reports/qa-module-tests-2026-03-14.md`, `docs/reports/traceability-matrix.md`                                     |
| frontend | UI-001 首轮兼容台账清点 + UI-003 依赖退场清单冻结 + UI-004 里程碑冻结 | FR-PROJECT-001                                    | 台账/计划文档校验                                                                          | `docs/reports/ui-compatibility-register.md`, `docs/reports/ui-radix-exit-register-2026-03-14.md`, `docs/reports/ui-refactor-plan.md` |
| server   | 修复开发环境 JWT 守卫放行导致 `request.user` 丢失的问题，恢复鉴权链路 | FR-CORE-001                                       | `pnpm type-check`, `pnpm test -- auth.service.spec.ts`                                     | `apps/server/src/modules/auth/guards/jwt-auth.guard.ts`, `docs/reports/ui-regression-report-2026-03-14.md`                           |
| frontend | UI-002/UI-005 收口：三页回归截图归档并解除阻塞                        | FR-PROJECT-001                                    | `pnpm -s exec vitest --run`                                                                | `docs/reports/ui-component-consistency-2026-03-14.md`, `docs/reports/ui-regression-report-2026-03-14.md`, `docs/reports/ui-*.png`    |
| release  | REL-001/REL-002 收口：0.3.1 证据回填与下一周期风险 Backlog 更新       | FR-CORE-001                                       | 版本记录与 backlog 一致性校验                                                              | `CHANGELOG.md`, `docs/reports/BACKLOG.md`, `docs/reports/DONE.md`                                                                    |

## [0.3.0] - 2026-03-06

### Project & AI Integration

| 模块       | 变更                                                 | linked_fr      | test_evidence                      | doc_impact                                                             |
| ---------- | ---------------------------------------------------- | -------------- | ---------------------------------- | ---------------------------------------------------------------------- |
| project    | 新增 external-links/doc-links/api-doc-links 管理能力 | FR-PROJECT-001 | project service/unit + e2e         | `docs/meta/requirements/feature-project.md`                            |
| project    | 新增健康度快照与 AI context 刷新能力                 | FR-PROJECT-001 | project hooks + backend controller | `docs/meta/requirements/feature-project.md`, `docs/api/api-project.md` |
| ai-project | AI 项目级配置、执行、洞察模型扩展                    | FR-AIHUB-001   | 待补专项自动化测试                 | `docs/meta/requirements/feature-ai-project.md`                         |

## [0.2.0] - 2026-02-20

### Security & Foundation

| 模块        | 变更                                | linked_fr   | test_evidence                    | doc_impact    |
| ----------- | ----------------------------------- | ----------- | -------------------------------- | ------------- |
| integration | 修复加密密钥硬编码与加密 API 安全性 | FR-CORE-001 | lint + build + integration tests | 安全审计报告  |
| server      | CORS 白名单与限流防护增强           | FR-CORE-001 | e2e 回归                         | 架构/安全文档 |
| infra       | `src/common` 基础设施层建设         | FR-CORE-001 | unit/e2e                         | 架构文档      |

## 维护规则

1. 每个版本条目必须包含 `linked_fr`。
2. 每个版本条目必须包含可验证证据（测试命令/报告路径）。
3. 接口或模型变化必须同步更新 `docs/api/*` 与 `docs/reports/traceability-matrix.md`。
