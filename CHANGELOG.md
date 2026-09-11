---
title: "CHANGELOG"
description: "版本化变更记录（版本-模块-证据）"
id: "CHANGELOG-001"
category: "report"
status: "active"
version: "1.0.0"
created: "2026-02-20"
modified: "2026-09-11"
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

### Dock 头像完全填满容器 + 状态点不再被裁切

| 模块 | 变更 | linked_fr | test_evidence | doc_impact |
| --- | --- | --- | --- | --- |
| frontend | ①**头像完全填满**：`MemberAvatar` 的尺寸是固定档位（xs/sm/md/lg/xl = 20/24/32/40/56px），而 Dock 头像按钮原为 `size-7.5`（30px）内嵌 `size="xs"`（20px）——**圆环里露出一圈容器底色**。把容器尺寸对齐档位（`size-8` = `md` = 32px），头像即与容器**逐像素重合**；展开输入栏的选中角色头像同样修正（原 `size="sm"` 24px 内嵌 32px 容器）。注：`NiceAvatar` 是流式（100% 填充），`Avvvatars` 是按 `size` 固定px 的——所以只能让**容器对齐头像档位**，不能让头像自适应容器；②**状态点不再被裁切**：头像按钮原带 `overflow-hidden`，而右下角呼吸状态点以 `-bottom-0.5 -right-0.5` 挂在按钮**外侧**，被裁掉一角。头像填满后不再需要它裁任何东西（`MemberAvatar` 自身有 `overflow-hidden`，负责把方图裁成圆），故移除；③**连带清理**：头像填满容器后，容器底色已完全被覆盖，`DockAiColleague.color` / `bgColor` 与 hook 里的 `COLOR_SCHEMES` 轮转成为死字段——一并删除（AI 头像配色本就由 `MemberAvatar` 按 `displayName` 种子确定性生成，与成员管理页一致）。 | 用户指令（头像完全填满容器；右下角状态点不要被切割遮挡，要和之前一样完整显示） | Vitest 前端 **79 文件 415 用例全绿**（新增 2 条：容器与头像同尺寸 32px 的填满断言、容器无 `overflow-hidden` 且状态点挂外侧的不裁切断言）；`pnpm lint` 7 项治理脚本 + ESLint 0 错 0 警告；`tsc -b` 既有 6 行错误不变（无新增） | 同步更新 `docs/01-需求/能力清单-v1.md`（CAP-A-13 补记）、`docs/01-需求/测试映射矩阵-v1.md`（GAP-T-18 用例补充）、本 CHANGELOG |

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
