# Terminal 模块功能技术说明书

## 1. 概述

**Terminal 模块**提供内置终端能力，允许用户在应用内执行命令行操作，并与 Project、Git、AI 等模块协同工作，形成“命令 → 结果 → 分析 → 行动”的闭环。

## 2. 目标与范围

- **目标**
  - 为开发者提供与 IDE 一致的终端体验，减少窗口切换。
  - 将终端输出结构化，便于 AI 分析与错误诊断。
  - 支持多 Session、多 Shell 与项目上下文切换。

- **范围**
  - 终端会话管理（创建、关闭、切换）。
  - 命令执行与输出流转。
  - 输出解析与错误智能诊断（与 AIHub 协作）。

## 3. 典型使用场景

- 在项目上下文中运行构建、测试、部署脚本，并将结果与任务/迭代关联。
- 自动识别测试失败栈与错误日志，并由 AI 提供诊断与修复建议。
- 在 Electron 桌面端提供统一的终端面板，与外部终端工具互补。

## 4. 功能需求拆解

### 4.1 会话管理

- **FR-TERM-01 创建终端会话**
  - 支持选择 Shell 类型（如 PowerShell/bash/zsh 等）。
  - 支持指定默认工作目录（通常为项目根目录或仓库路径）。

- **FR-TERM-02 多会话支持**
  - 支持在 UI 中同时管理多个终端会话（Tab 或列表形式）。
  - 支持为每个会话命名与标记（如“后端测试”“前端构建”等）。

### 4.2 命令执行与输出

- **FR-TERM-10 命令执行**
  - 在指定会话中执行命令，支持同步与异步（长时间运行命令）。
  - 支持中断命令（如发送 SIGINT）。

- **FR-TERM-11 输出流推送**
  - 通过 WebSocket 将终端输出实时推送到前端。
  - 支持基础的颜色与样式（ANSI 转译）。

### 4.3 输出解析与 AI 诊断

- **FR-TERM-20 输出解析**
  - 按行或块解析命令输出，识别常见结构（栈追踪、错误摘要、测试报告等）。

- **FR-TERM-21 AI 诊断集成**
  - 支持将某次命令的输出发送给 AIHub 进行诊断，输出错误原因与建议。
  - 支持在错误输出处显示“让 AI 看看”快捷操作。

## 5. 接口设计

### 5.1 REST 与 WebSocket

- `POST /_api/terminal/sessions`
  - 功能：创建会话。
  - 请求体：`{ projectId?, name?, shell?, cwd? }`.

- `POST /_api/terminal/sessions/:id/commands`
  - 功能：在会话中执行命令。
  - 请求体：`{ command, args?, env? }`.

- WebSocket 事件 `terminal.output`
  - 用途：推送命令输出。
  - 负载：`{ sessionId, chunk, isError?, isEnd? }`.

## 6. 与其他模块的交互

- **ProjectModule**
  - 为会话提供项目上下文（默认目录、关联任务/迭代）。

- **GitModule**
  - 可在终端中执行 Git 命令，结果反馈给 Git 状态视图。

- **AIHubModule**
  - 对命令输出进行语义分析与错误诊断，生成解决方案建议。

## 7. 数据模型

- `TerminalSession`
  - `id, projectId?, name, shell, cwd, createdBy, createdAt, status`.

- `CommandExecution`
  - `id, sessionId, command, args[], startTime, endTime?, exitCode?, metadata`.

## 8. 权限与安全

- 只允许在用户有权限访问的项目目录中创建会话。
- 对执行命令进行白名单或风险提示（特别是在企业内网环境）。

