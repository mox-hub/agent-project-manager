---
title: "CHANGELOG"
description: "版本化变更记录（版本-模块-证据）"
id: "CHANGELOG-001"
category: "report"
status: "active"
version: "1.0.0"
created: "2026-02-20"
modified: "2026-09-08"
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
