/**
 * 领域事件名常量（server 侧镜像）。
 *
 * 真相源：packages/apm-shared/src/events/domain-events.ts（与前端共享）。
 * server 不直接依赖 apm-shared（与 runtime/protocol.ts 同为镜像 +
 * check:cli-contract 门禁防漂移的架构约定），本文件仅镜像事件名常量；
 * payload zod 契约见真相源。新增事件时两处必须同步。
 */
export const DomainEventTypes = {
  // 任务域
  TaskCreated: 'task.created',
  TaskUpdated: 'task.updated',
  TaskDeleted: 'task.deleted',
  TaskAssigned: 'task.assigned',
  TaskAgentAssigned: 'task.agent.assigned',
  TaskCommented: 'task.commented',
  TaskStatusChanged: 'task.statusChanged',
  TaskFieldChanged: 'task.fieldChanged',
  TaskExecutionCreated: 'task.execution.created',
  TaskExecutionConfirmed: 'task.execution.confirmed',
  TaskDependencyCreated: 'task.dependency.created',
  TaskDependencyDeleted: 'task.dependency.deleted',

  // 提及
  MentionCreated: 'mention.created',

  // 通知
  NotificationCreated: 'notification.created',
  NotificationRead: 'notification.read',

  // 文档 / 项目
  DocumentCreated: 'document.created',
  DocumentDeleted: 'document.deleted',
  ProjectCreated: 'project.created',
  ProjectUpdated: 'project.updated',
  ProjectArchived: 'project.archived',

  // 执行
  ExecutionRunUpdated: 'execution.run.updated',
  ExecutionTerminal: 'execution.terminal',

  // 实时流
  AiStream: 'ai.stream',
} as const;

export type DomainEventTypeName =
  (typeof DomainEventTypes)[keyof typeof DomainEventTypes];
