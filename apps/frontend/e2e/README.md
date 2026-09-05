# E2E 测试（Playwright）—— 全功能覆盖

针对本地全栈（frontend 5173 + server 4300）的浏览器级端到端测试。两批建设后覆盖**全部用户可达模块**：认证、引导页、Shell、项目、任务、Bug、文档、验收、Git 仓库、成员、团队、仪表盘、决策、通知、搜索、帮助、设置（12 个子页）、AI 助理面板。共 **10 个 spec 文件、约 90 条用例**。

## 运行

```bash
# 前置：server 已运行在 :4300（frontend 未运行会自动拉起，已运行则复用）
pnpm --filter ./apps/frontend run e2e          # 全量（约 10 分钟）
pnpm --filter ./apps/frontend run e2e:ui       # UI 调试模式
pnpm --filter ./apps/frontend run e2e -- -g T05  # 按用例名过滤
pnpm --filter ./apps/frontend run e2e:report   # 查看上次报告
```

首跑自动注册/登录专用账号 **e2e-runner**（`e2e/helpers/api.ts`），UI 登录一次后落盘 `storageState` 到 `e2e/.auth/user.json`（已 gitignore）。

## 文件结构

| 文件 | 模块 | 用例 |
|---|---|---|
| `playwright.config.ts` | 串行、retries=2、失败留 trace、webServer、zh-CN | - |
| `e2e/auth.setup.ts` | 全局鉴权（UI 登录 → storageState） | 1 |
| `e2e/auth.spec.ts` | 登录/注册/退出/路由守卫（空 storageState 独立上下文） | 5 |
| `e2e/shell.spec.ts` | 侧边栏导航、命令面板、浮动面板/主题、BootPage、仪表盘、analytics | 7 |
| `e2e/projects.spec.ts` | 项目全操作（P01–P20） | 20 |
| `e2e/tasks.spec.ts` | 任务全操作（T01–T23、T05b） | 25 |
| `e2e/bugs.spec.ts` | Bug 列表/报告/详情/拖拽/批量（B01–B08） | 8 |
| `e2e/documents.spec.ts` | 文档新建/编辑/提审/列表/关联（C01–C07） | 7 |
| `e2e/acceptance.spec.ts` | 验收契约新建/标准/判定/闭环（AC01–AC04） | 4 |
| `e2e/members-teams.spec.ts` | 成员列表/详情、团队（权限门控）、仓库列表/绑定（M/G/TM） | 8 |
| `e2e/settings.spec.ts` | 设置 12 子页（ST01–ST11） | 12 |
| `e2e/tools.spec.ts` | 通知、搜索、决策、帮助、AI 助理面板（N/S/DC/H/AS） | 6 |

## 功能覆盖率（模块 × 主要操作）

| 模块 | 覆盖的主要操作 | 状态 |
|---|---|---|
| 认证 | 登录（成功/失败）、注册即登录、命令面板退出、路由守卫 | ✅ |
| 引导页 | 启动检查清单 + 进入系统 | ✅ |
| Shell | 11 条侧边栏路由、命令面板（缺陷 #10 已修复）、浮动面板/主题切换 | ✅ |
| 项目 | 创建/编辑/搜索/筛选/右键菜单 11 项/批量归档/三视图/拖拽/分页/详情/设置/里程碑/团队页 | ✅ |
| 任务 | 创建（含 Inbox 无项目创建，缺陷 #1 已修复）/详情全属性/移动项目（缺陷 #2 已修复）/子任务（缺陷 #3 已修复）/评论/右键全项/批量/拖拽/分组/筛选/统计/项目任务页 | ✅ |
| Bug | 报告/筛选/搜索/拖拽严重度/右键直改/批量删/详情（标题/侧栏/评论/删除） | ✅ |
| 文档 | 新建（标题/分类/状态/正文）/空标题校验/编辑保存/提交审核/列表搜索筛选/双视图/任务关联 | ✅ |
| 验收 | 新建契约/添加标准/循环判定/接收闭环/列表视图 | ✅ |
| Git 仓库 | 列表渲染、绑定对话框表单与校验（commits/PR 需外部 git/GitHub，不在范围） | ✅ |
| 成员 | 列表/类型筛选/搜索/详情 tabs/权限门控 | ✅ |
| 团队 | 列表、详情 tabs（有可见团队时）；新建为管理员能力，普通用户入口已隐藏（缺陷 #9 已修复） | ✅ |
| 仪表盘 | 7 张 KPI 卡 + 钻取弹窗、快捷操作跳转、analytics 只读页 | ✅ |
| 决策 | 收件箱计数/分区/刷新（只读，产品无创建入口） | ✅ |
| 通知 | tabs、单条已读、设置弹窗 | ✅ |
| 搜索 | 全局搜索命中、类型 chips | ✅ |
| 帮助 | 静态页 + 搜索过滤 | ✅ |
| 设置 | profile 保存/改密码校验/外观深色/Token 创建撤销/标签（权限）/状态/Short-ID/AI 管理/AI 用量/AI 执行中心/存储/模板/终端 | ✅ |
| AI 助理 | 面板开合、输入框、快捷提示（真实 AI 回复依赖 CLI runtime，不在范围） | ✅ |
| 管理后台/工作区创建 | 仅 admin 角色可见（e2e-runner 为普通用户，无凭据） | ⛔ 排除 |
| 邀请落地页 | 需 admin 先创建邀请 token | ⛔ 排除 |
| Linear/GitHub/MCP/runtime 连接类 | 需外部服务/CLI runtime | ⛔ 排除 |
| Design System / Delivery | DEV-only 调试页 | ⛔ 排除 |

正常用户可达的功能面覆盖率约 **90%+**；未覆盖项均为角色门控（无凭据）或外部服务依赖，非用例缺失。

## 数据与清理

- 测试实体统一 `E2E<n>-<语义名>` 前缀；任务/文档/验收 DELETE 真删，项目/团队走归档（会在已归档筛选累积）。
- 专用账号 e2e-runner（`e2e-runner@example.com` / `e2e-pass-123`）。

## 已知产品缺陷（2026-09-05 修复，遗留收尾项见清单末尾）

1. **Inbox 任务创建 404**：`POST /tasks` 不带 projectId 时普通用户 404（任务落库但 findOne 可见性失败——inbox 项目成员表没有该用户）。修复：`ensureInboxProject(userId)` 幂等补挂请求用户为 inbox 成员；用例 T23。✅
2. **详情页「项目」胶囊移动任务必 400**：前端 PATCH `{projectId}`，服务端 UpdateTaskDto 不含该字段。修复：UpdateTaskDto 增补 `projectId`/`parentTaskId`；update 校验目标项目成员身份、重生成短 ID、同步 TaskTag 归属、清空跨项目里程碑/迭代；用例 T07。✅
3. **子任务创建 404**：`POST /tasks` 带 `parentTaskId` 报 "Parent task not found"（不带 projectId 时落到 inbox 项目，父任务归属校验必然失败）；右键创建父任务另缺 moduleCode → 400。修复：resolveProjectContext 优先从父任务继承项目；`nextShortId` 对真实项目缺 moduleCode 时兜底到首个模块、项目无模块时自动登记默认模块；用例 T09/T15。✅
4. **Create more 开关失效**：页面级 onSuccess 强制关闭统一创建对话框。修复：移除 project-list-page / project-milestones-page 的强制关闭（对话框自身按开关决定关闭或重置）。✅
5. **对话框标签按名字提交**：服务端 tags 只收 tag id → FK 错误。修复：新增共享 `resolveTagIds` 工具（tag id 或名字均可，名字按「项目内 → 全局」匹配、按需创建），task create/update 与 document create/update 统一接入；文档 tags 此前被静默丢弃，现已写入 DocumentTag。✅
6. **新项目无成员/无默认模块**：owner 不进负责人候选（MemberProjectBinding 不创建）；无默认模块而服务端强制 moduleCode。修复：建项目自动播种 TASK/BUG 默认模块 + owner 的 MemberProjectBinding 绑定（Member 缺失时补建）；用例 T06/T13。✅
7. **里程碑创建后列表不刷新**：mutation 未失效 milestones 查询。修复：`useCreateProjectMilestone` onSuccess 补失效 `['projectMilestones', projectId]`；用例 P19 去掉 reload。✅
8. **文档「提交审核」偶发不渲染 / 编辑页保存不触发 PUT**（真实根因 2026-09-06 查明，两个独立问题）：
   - 提审按钮：`isAuthor` 判定用 app-store.currentUser（刷新后异步回填），与路由守卫的 react-query `['auth','me']` 口径分裂。修复：document-view/edit 页统一改走 `useAuth().currentUser`。✅（C03 已实测按钮渲染、点击、状态流转全通；断言值修正为服务端真实状态 `reviewing`）
   - 保存不触发 PUT：gray-matter 在浏览器用裸 `Buffer` 全局（lib/utils.js `toBuffer` → `Buffer.from`），保存时 `mergeFrontmatter` 同步抛 `ReferenceError: Buffer is not defined`，PUT 从未发出（此前 parseFrontmatter 有 try/catch 静默降级，故仅保存炸）。修复：新增 `src/polyfills.ts`（buffer 依赖 + 入口最先引入）。⚠️ polyfill 代码已就位，**待 vite dev server 重启后重跑 C04 验证**（dev 模块图缓存了旧依赖，生产构建不受影响）。
9. **团队/标签/成员创建对普通用户 403**：均为管理员能力，UI 上普通用户仍可见入口（权限门控不一致）。修复：`useAuth` 新增 `isAdmin`，teams-page 新建团队、标签/状态/角色管理创建按钮按角色隐藏；服务端 403 语义保持不变。✅
10. **命令面板 Ctrl+K 高频崩溃**：`Cannot read properties of undefined (reading 'subscribe')`——`CommandDialog` 未用 cmdk `<Command>` root 包裹 children，Input/Item 拿不到 root context store。修复：command.tsx 补 `<Command>` 包裹；SH02 已验证面板稳定打开。✅
11. **服务端限流配额过低导致长跑假死**：默认 60 req/min / 500 req/hour，E2E 全量跑必触发 429 风暴。已将 `THROTTLE_SHORT/MEDIUM/LONG_LIMIT` 环境变量化（`apps/server/src/common/throttler/throttler.config.ts`），dev `.env` 已调高；生产不配置则维持原默认值。✅

### 待收尾清单（合并后继续）

- [ ] **C04**：重启 vite dev server（加载 buffer 依赖预打包）后重跑 C04，验证 Buffer polyfill 生效、UI 保存触发 PUT
- [ ] **A04**：命令面板登出链路未跳转 /login（面板打开已修复，logout 命令触发后的导航未生效），需定位是测试点击落点还是 `logout()` mutation 链路问题
- [ ] `api:audit` 94.5% < 95% 门禁为**存量缺口**（本次未增删端点），24 个未覆盖端点待补 e2e 触达
