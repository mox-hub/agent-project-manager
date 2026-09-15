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
  ExecutionRunCreated: 'execution.run.created',
  ExecutionCompleted: 'execution.completed',
  ExecutionStepCreated: 'execution.step.created',
  ExecutionStepUpdated: 'execution.step.updated',
  ExecutionApprovalNeeded: 'execution.approval_needed',

  // 审批门槛
  ApprovalRequestCreated: 'approval.request.created',
  ApprovalResolved: 'approval.resolved',
  ApprovalCancelled: 'approval.cancelled',

  // 验收门禁
  AcceptanceCreated: 'acceptance.created',
  AcceptanceResolved: 'acceptance.resolved',
  AcceptanceDeleted: 'acceptance.deleted',

  // 发版门禁
  ReleaseCreated: 'release.created',
  ReleaseApproved: 'release.approved',

  // 运行时（本地执行节点）
  RuntimeConnected: 'runtime.connected',
  RuntimeHeartbeat: 'runtime.heartbeat',
  RuntimeExecutionEvent: 'runtime.execution.event',
  RuntimeExecutionResult: 'runtime.execution.result',
  RuntimeExecutionCancelled: 'runtime.execution.cancelled',
  RuntimeDispatchCreated: 'runtime.dispatch.created',
  /** 网关聚合事件：上述 6 个 runtime 族事件统一裹成 { source, payload } 转发 */
  RuntimeDispatchChanged: 'runtime.dispatch.changed',
  RuntimeApprovalRequested: 'runtime.approval.requested',
  RuntimeApprovalResolved: 'runtime.approval.resolved',

  // 工作流
  AiWorkflowUpdate: 'ai.workflow.update',

  // 外部同步（Linear）
  LinearSyncProgress: 'linear.sync.progress',
  LinearSyncCompleted: 'linear.sync.completed',
  LinearTaskPulled: 'linear.task.pulled',
  LinearTaskPushed: 'linear.task.pushed',
  LinearTaskConflict: 'linear.task.conflict',
  LinearTaskResolved: 'linear.task.resolved',

  // 实时流
  AiStream: 'ai.stream',
} as const;

export type DomainEventTypeName =
  (typeof DomainEventTypes)[keyof typeof DomainEventTypes];
