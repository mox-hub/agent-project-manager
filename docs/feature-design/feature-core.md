# Core 模块功能技术说明书（CoreModule/MessageBus/Data 抽象）

## 1. 概述

**Core 模块**为整个系统提供基础设施能力，包括配置管理、日志、缓存、消息总线与数据访问抽象。  
它是其他业务模块（Project、AIHub、Git、Terminal、Plugin、Integration、User/Auth）的公共依赖。

## 2. 目标与范围

- **目标**
  - 提供统一、可配置的运行时环境（配置、日志、错误处理）。
  - 通过消息总线实现模块间解耦的事件驱动交互。
  - 抽象数据访问层，保证数据库可替换（SQLite/PostgreSQL）。

- **范围**
  - 配置系统（Config）。
  - 日志与审计（Logging/Audit）。
  - 消息总线（MessageBus）。
  - 数据访问抽象（Repository/ORM 配置）。

## 3. 功能需求拆解

### 3.1 配置系统

- 支持多环境配置（开发/测试/生产/单机/内网）。
- 支持从环境变量、配置文件与命令行参数加载配置。
- 提供类型安全的配置对象，供各模块注入使用。

### 3.2 日志与审计

- 提供统一的结构化日志接口（info/warn/error/debug）。
- 支持按模块与请求追踪日志（TraceId/CorrelationId）。
- 提供审计功能记录安全相关操作（如权限变更、插件安装、集成配置修改）。

### 3.3 消息总线（MessageBus）

- 提供发布/订阅能力：
  - 事件类型：`project.updated`, `task.created`, `git.commit.created`, `ci.build.completed`, `plugin.event`, `ai.workflow.updated` 等。
- 支持同步与异步事件：
  - 同步用于简单通知。
  - 异步用于长耗时任务与跨模块协作。

## 4. 接口设计

- `ConfigService`
  - `get<T>(key: string): T`
  - `getOrThrow<T>(key: string): T`

- `LoggerService`
  - `log(level, message, context?)`
  - `audit(action, actor, resource, metadata?)`

- `MessageBus`
  - `publish(eventType, payload)`
  - `subscribe(eventType, handler)`

## 5. 与其他模块的交互

- 所有模块通过依赖注入获取 Config/Logger/MessageBus 实例。
- Project/AIHub/Git/Integration 等通过 MessageBus 交换领域事件，降低耦合度。

## 6. 数据访问抽象

- 封装 ORM（Prisma/TypeORM）初始化与连接管理。
- 提供基础 Repository 抽象，供各领域模块扩展。

## 7. 非功能与安全

- 保证在数据库错误、外部服务错误时系统具备合理的降级与日志。
- 日志中避免记录敏感信息（Token、密码等）。

