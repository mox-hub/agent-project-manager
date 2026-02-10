# AIHub 模块功能技术说明书

## 1. 概述

**AIHub 模块**是系统的 AI 集成中枢，负责统一管理多家 LLM 服务、本地模型与向量检索，引入智能路由、上下文注入与工作流执行能力，为项目管理、代码分析、评审、报表等提供 AI 能力支持。

## 2. 目标与范围

- **目标**
  - 提供统一的 AI 调用接口，屏蔽不同模型厂商与协议差异。
  - 基于任务类型、成本与性能智能选择模型。
  - 对请求注入项目/任务/Git/文档上下文，提升 AI 输出质量。
  - 支持多步骤 AI 工作流定义与执行。

- **范围**
  - 模型适配与路由（远程与本地）。
  - 上下文构建与提示模板管理。
  - AI 会话存储与审计。
  - AI 工作流引擎（执行、监控、重试）。

## 3. 角色与使用场景

- **角色**
  - 终端用户：通过 UI 使用 AI 对话、代码审查、任务分解等能力。
  - 系统模块：Project/Git/Terminal/Integration 等模块通过 AIHub 请求分析或生成。
  - 插件开发者：通过 Plugin API 调用 AI，构建自定义 AI Agent。

- **典型场景**
  - 从 PR diff 自动生成代码审查意见与风险提示。
  - 从会议纪要/PRD 中抽取需求并生成任务树。
  - 基于项目历史与任务进度生成日报/周报草稿。
  - 对测试失败日志与错误栈进行自动诊断并给出修复建议。

## 4. 功能需求拆解

### 4.1 模型管理与路由

- **FR-AI-01 模型配置管理**
  - 支持配置多家模型服务（OpenAI、Claude、本地推理服务等）的 API 密钥、基础 URL、限流策略。
  - 支持为不同环境配置不同的模型集合（开发/测试/生产）。

- **FR-AI-02 模型路由规则**
  - 根据任务类型（如 quick-summary、complex-analysis、code-generation 等）指定首选模型列表与备选链路。
  - 支持设置每次请求的成本预算、最大 token 数与延迟阈值。
  - 路由规则可按项目或工作区进行覆盖配置。

### 4.2 上下文注入与提示模板

- **FR-AI-10 上下文收集**
  - 根据调用方提供的上下文需求（项目、任务、Git diff、日志、文档片段等），从 Data 与其他模块拉取数据。
  - 支持对大体量上下文进行裁剪与优先级排序（最近变更优先、相关文件优先等）。

- **FR-AI-11 提示模板管理**
  - 提供可配置的 Prompt 模板库，支持版本控制与回滚。
  - 模板中支持占位符（projectSummary、taskList、diffSummary 等），由系统自动填充。

### 4.3 会话与审计

- **FR-AI-20 会话管理**
  - 支持项目级/任务级会话归类，记录用户与 AI 的完整对话历史。
  - 支持通过关键词、项目、时间过滤历史会话。

- **FR-AI-21 审计与成本统计**
  - 记录每次调用使用的模型、token 数量、估算成本与响应时间。
  - 提供按用户/项目/模型的聚合统计视图。

### 4.4 工作流引擎

- **FR-AI-30 工作流定义**
  - 支持以结构化配置（JSON/YAML）定义 AI 工作流（步骤、依赖、条件、错误处理）。
  - 支持预置常用工作流模板（代码审查、需求 → 任务树、测试失败诊断等）。

- **FR-AI-31 工作流执行**
  - 执行过程支持异步、并行与状态跟踪。
  - 通过 WebSocket 将工作流执行进度与中间结果推送到前端。
  - 支持重试与部分步骤人工确认。

## 5. 接口设计

### 5.1 REST API（示例）

- `POST /_api/ai/chat`
  - 功能：执行一次对话（可带上下文）。
  - 请求体：`{ projectId?, taskId?, conversationId?, message, contextHints?, modelPreference? }`.

- `POST /_api/ai/workflows/run`
  - 功能：启动指定工作流。
  - 请求体：`{ workflowId, projectId?, taskId?, parameters }`.

- `GET /_api/ai/conversations`
  - 功能：查询会话列表。
  - 查询参数：`projectId?`, `taskId?`, `q?`, `from?`, `to?`.

### 5.2 WebSocket 事件

- `ai.stream`
  - 用途：流式推送 AI token。
  - 负载：`{ conversationId, messageId, chunk, isFinal }`.

- `ai.workflow.update`
  - 用途：工作流状态更新。
  - 负载：`{ workflowRunId, stepId, status, output?, error? }`.

## 6. 与其他模块的交互

- **ProjectModule**
  - 读取项目概览、任务树、进度与风险标记，生成分析与建议。
  - 将 AI 建议转化为任务/迭代变更，需用户确认后写回。

- **GitModule**
  - 获取 diff、提交历史、分支拓扑，用于代码分析与审查建议。

- **TerminalModule**
  - 基于命令输出与错误日志进行智能诊断。

- **IntegrationModule**
  - 与外部系统（Jira/Linear/CI 等）的数据结合，为 AI 提供完整上下文。

- **PluginModule**
  - 为插件提供 AI 调用能力，插件可声明自定义 Agent 与工具。

## 7. 数据模型

- `AIConversation`
  - `id, projectId?, taskId?, title?, messages[], createdBy, createdAt, updatedAt`.

- `AIMessage`
  - `id, role: 'user' | 'assistant' | 'system'`, `content`, `model`, `metadata`.

- `AIWorkflowDefinition`
  - `id, name, description, steps[], triggers?, config, version`.

- `AIWorkflowRun`
  - `id, workflowId, projectId?, taskId?, status, stepsState[], startedAt, finishedAt`.

## 8. 权限与安全

- 模型配置与路由策略仅管理员/Owner 可管理。
- 对 AI 会话的访问需符合项目/任务的可见性规则。
- 审计日志记录所有涉及敏感数据的 AI 请求。

## 9. 依赖与约束

- 依赖 Data 层存储会话与工作流状态。
- 依赖 Project/Git/Integration 提供上下文数据。
- 需处理外部 LLM 服务不可用或限流的降级策略（如切换备选模型或提示用户重试）。

