/**
 * 领域事件单源（EventMap）：事件名常量 + zod payload 契约。
 *
 * 发布方（领域服务）、订阅方（通知/订阅枢纽、推送网关）、前端监听
 * （event-client）统一从此取事件名，杜绝三处硬编码各自漂移。
 *
 * zod schema 是 payload 的类型真相源（z.infer 推导），不在发布热路径
 * 做运行时校验——需要调试时可显式调用 parseXxx。
 *
 * 命名说明：实体已改名 Issue/Execution，事件名沿用 task.* / execution.*
 * 既有线上口径（订阅双方一致即可，改名是一次全量联动成本，暂不付）。
 */
import { z } from 'zod';

// ---------- 事件名常量 ----------

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

// ---------- 核心 payload 契约（订阅/通知链路直接消费的事件） ----------

/** task.updated：issue.service.update 发布，通知/订阅两枢纽消费 */
export const TaskUpdatedPayloadSchema = z.object({
  issueId: z.string(),
  projectId: z.string().nullable(),
  /** 操作者 userId（订阅推送时排除，防自己吵自己） */
  userId: z.string(),
  statusChanged: z.boolean(),
  oldStatus: z.string().nullable().optional(),
  newStatus: z.string().nullable().optional(),
  /** 请求 DTO 的变更字段名（订阅推送据此决定通知内容） */
  changedFields: z.array(z.string()).optional(),
});
export type TaskUpdatedPayload = z.infer<typeof TaskUpdatedPayloadSchema>;

/** task.commented：activity.service.addComment 发布 */
export const TaskCommentedPayloadSchema = z.object({
  entityType: z.string(),
  entityId: z.string(),
  projectId: z.string().nullable(),
  actorId: z.string(),
  excerpt: z.string(),
});
export type TaskCommentedPayload = z.infer<typeof TaskCommentedPayloadSchema>;

/** mention.created：mention.service.parseAndCreate 发布，直发被 @ 用户 */
export const MentionCreatedPayloadSchema = z.object({
  sourceType: z.string(),
  sourceId: z.string(),
  text: z.string(),
  actorId: z.string().optional(),
  mentionedUserIds: z.array(z.string()),
});
export type MentionCreatedPayload = z.infer<typeof MentionCreatedPayloadSchema>;

/** notification.created：通知落库后发布，网关按 userId 定向推送 */
export const NotificationCreatedPayloadSchema = z.object({
  notificationId: z.string(),
  userId: z.string(),
  type: z.string(),
  channels: z.array(z.string()),
  title: z.string(),
  body: z.string().nullable(),
});
export type NotificationCreatedPayload = z.infer<
  typeof NotificationCreatedPayloadSchema
>;
