# 数据模型设计总览（Data Model）

本目录用于定义整个系统的核心数据模型，包括实体结构、关系、约束与持久化映射（如 SQLite/PostgreSQL 表结构）。  
它与 `docs/feature-design/` 下的功能设计文档相对应，从“**数据视角**”描述系统。

## 1. 设计原则

- 与功能模块一一对应：每个核心模块（Project、AIHub、Git、Terminal、Plugin、User/Auth、Integration、Notification、Project-Metadata 等）在本目录下拥有独立的数据模型文档。
- 抽象优先：先定义逻辑数据模型（实体与关系），再映射到具体存储（Prisma/ORM Schema、数据库表）。
- 向后兼容：为未来迁移与扩展预留字段与版本控制机制。

## 2. 后续规划

接下来建议的文档拆分（示例）：

- `project.md`：Project/Task/Iteration 等核心项目数据结构。
- `user-auth.md`：User/Session/RoleAssignment/OAuth2 相关数据结构。
- `ai-hub.md`：AIConversation/AIWorkflowDefinition/AIWorkflowRun 等。
- `git.md`：Repository/Commit/Diff 等。
- `terminal.md`：TerminalSession/CommandExecution 等。
- `plugin.md`：InstalledPlugin/PluginConfig 等。
- `integration.md`：IntegrationConfig/ExternalIssueLink 等。
- `notification.md`：Notification/NotificationPreference 等。
- `project-metadata.md`：Tag/StatusDefinition/ProjectRoleDefinition/ProjectTemplate 等。

在你确定优先设计的模块后，我们可以从对应的 `*.md` 文件开始，逐步细化字段与关系。***
