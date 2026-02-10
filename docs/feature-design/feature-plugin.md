# Plugin 模块功能技术说明书

## 1. 概述

**Plugin 模块**负责插件生态的整体管理与运行时支持，是系统实现“插件优先”架构的核心。  
它为第三方与内部开发者提供可扩展的能力接口，涵盖后端逻辑扩展与前端 UI 扩展。

## 2. 目标与范围

- **目标**
  - 提供安全、稳定且能力丰富的插件运行时环境。
  - 让插件可以访问项目、任务、AI、Git、Terminal 等核心能力。
  - 为插件提供 UI 扩展点，嵌入到现有应用布局与交互流程中。

- **范围**
  - 插件清单与安装管理。
  - 插件 Manifest 校验与权限系统。
  - 插件运行时（进程/沙箱）管理与 IPC 桥接。
  - 插件 API（Core API、UI API、Integration API、AI API）。

## 3. 功能需求拆解

### 3.1 插件生命周期管理

- **FR-PLG-01 插件安装/更新/卸载**
  - 支持从本地文件、私有仓库或插件市场安装插件。
  - 支持插件版本管理与更新检测。
  - 卸载插件需清理相关配置与缓存。

- **FR-PLG-02 插件启用/禁用**
  - 允许按项目或全局启用/禁用插件。
  - 禁用插件时不再接收事件与暴露 UI。

### 3.2 Manifest 与权限控制

- **FR-PLG-10 Manifest 解析与校验**
  - 解析 `PluginManifest` 中的基础信息、类型、入口、权限与依赖声明。
  - 校验必填字段、版本兼容性与依赖约束。

- **FR-PLG-11 权限系统**
  - 插件需显式声明可访问的资源（项目、任务、文件、网络请求等）与访问级别（只读/读写/admin）。
  - 插件调用 API 前，由 Plugin 模块执行权限检查与限流。

### 3.3 插件运行时与通信

- **FR-PLG-20 运行时隔离**
  - 后端插件：运行在独立进程或沙箱中，与主进程通过 IPC 通信。
  - 前端插件：运行在受限环境，通过插件 SDK 与后端通信。

- **FR-PLG-21 插件事件系统**
  - 支持插件订阅系统事件（项目变更、任务状态更新、Git 事件、CI 事件等）。
  - 支持插件发出自定义事件，供其他插件或主应用订阅。

## 4. 接口设计

### 4.1 后端 Plugin API（示例）

- `POST /_api/plugins/install`
  - 功能：安装插件。
  - 请求体：`{ sourceType: 'local' | 'registry' | 'git', urlOrPath }`.

- `GET /_api/plugins`
  - 功能：查询已安装插件列表与状态。

- `POST /_api/plugins/:id/enable`
  - 功能：启用插件。

### 4.2 插件 SDK（前端）

为前端插件提供 npm 包 `@agent-pm/plugin-sdk`，主要能力包括：

- 注册视图扩展点：`registerViewExtension`, `registerPanelExtension`。
- 调用后端能力：`pluginApi.call(method, params)`。
- 订阅事件：`pluginApi.on(eventType, handler)`。

## 5. 与其他模块的交互

- **CoreModule**
  - 提供插件运行时基础设施（进程管理、IPC、日志）。

- **ProjectModule / Task / AI / Git / Terminal / Integration**
  - 通过抽象的 Plugin API 暴露能力给插件访问。

## 6. 数据模型

- `PluginManifest`
  - 与主文档定义一致：`id, name, version, description, type[], permissions[], entryPoints[], configuration?, hooks?`.

- `InstalledPlugin`
  - `id, manifest, installedAt, enabled, scope: 'global' | 'project', config`.

## 7. 权限与安全

- 严格基于 Manifest 中声明的 Permission 控制插件可访问的资源。
- 对外部网络请求、文件系统访问等高风险操作增加白名单或用户确认。

