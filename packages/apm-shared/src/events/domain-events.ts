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

// ---------- 执行 / 运行时族 payload 契约（盯盘投影层直接消费） ----------

/** execution.run.created：execution.service.createExecutionRun 发布 */
export const ExecutionRunCreatedPayloadSchema = z.object({
  executionRunId: z.string(),
  projectId: z.string().nullable().optional(),
  issueId: z.string().nullable().optional(),
  subjectType: z.string().optional(),
});
export type ExecutionRunCreatedPayload = z.infer<
  typeof ExecutionRunCreatedPayloadSchema
>;

/** execution.run.updated：execution.service.updateExecutionRun 发布 */
export const ExecutionRunUpdatedPayloadSchema = z.object({
  executionRunId: z.string(),
  previousStatus: z.string().nullable().optional(),
  newStatus: z.string(),
});
export type ExecutionRunUpdatedPayload = z.infer<
  typeof ExecutionRunUpdatedPayloadSchema
>;

/** execution.step.created：execution.service.createStep 发布 */
export const ExecutionStepCreatedPayloadSchema = z.object({
  executionRunId: z.string(),
  stepId: z.string(),
  sequence: z.number().optional(),
});
export type ExecutionStepCreatedPayload = z.infer<
  typeof ExecutionStepCreatedPayloadSchema
>;

/**
 * execution.step.updated：**两个发布方，形状不一致**（既存漂移，此处按并集放宽）。
 * - execution.service.updateStepStatus → { stepId, status, executionRunId }
 * - cli-dispatch.cli-executor.handleStepUpdate → { executionRunId, stepType, stepName, status, providerId }
 * 消费方不得假设某字段必在；`status` 是唯一共同字段。
 */
export const ExecutionStepUpdatedPayloadSchema = z.object({
  status: z.string(),
  executionRunId: z.string().optional(),
  stepId: z.string().optional(),
  stepType: z.string().optional(),
  stepName: z.string().optional(),
  providerId: z.string().optional(),
});
export type ExecutionStepUpdatedPayload = z.infer<
  typeof ExecutionStepUpdatedPayloadSchema
>;

/** execution.approval_needed：cli-executor 遇到审批门槛时发布 */
export const ExecutionApprovalNeededPayloadSchema = z.object({
  executionRunId: z.string(),
  projectId: z.string().optional(),
  approvalId: z.string(),
});
export type ExecutionApprovalNeededPayload = z.infer<
  typeof ExecutionApprovalNeededPayloadSchema
>;

/** approval.request.created：approval.service.create 发布 */
export const ApprovalRequestCreatedPayloadSchema = z.object({
  approvalRequestId: z.string(),
  executionRunId: z.string().nullable().optional(),
  projectId: z.string(),
  riskLevel: z.string().optional(),
  requestedAction: z.string().optional(),
});
export type ApprovalRequestCreatedPayload = z.infer<
  typeof ApprovalRequestCreatedPayloadSchema
>;

/**
 * runtime.heartbeat：server 广播侧心跳载荷（runtime.service 发布）。
 * 注意与 `runtime/protocol.ts` 的 `RuntimeHeartbeatPayload` **同名不同物**——
 * 后者是 runtime→server 的**请求体**（{ runtimeSessionId, status, activeExecutionIds }），
 * 本者是 server→客户端的**广播体**，故以 `EventPayload` 后缀区分。
 */
export const RuntimeHeartbeatEventPayloadSchema = z.object({
  runtimeId: z.string(),
  runtimeSessionId: z.string().nullable().optional(),
  activeExecutionIds: z.array(z.string()).default([]),
  timestamp: z.string(),
});
export type RuntimeHeartbeatEventPayload = z.infer<
  typeof RuntimeHeartbeatEventPayloadSchema
>;

/**
 * runtime.execution.event：Runtime 上报的增量执行事件（当前**唯一**事件级细节流）。
 * 对应 server `modules/runtime/dto/execution-event.dto.ts` 的 ExecutionEventDto，
 * 发布时以 spread 追加 executionRunId 与 timestamp。
 */
export const RuntimeExecutionEventPayloadSchema = z.object({
  executionRunId: z.string(),
  eventType: z.string(),
  runtimeId: z.string(),
  stepId: z.string().optional(),
  status: z.string().optional(),
  /** 人类可读的一句话进展——盯盘"日志尾巴"的素材来源 */
  summary: z.string().optional(),
  detail: z.record(z.string(), z.unknown()).optional(),
  artifactRefs: z.array(z.string()).optional(),
  evidenceRefs: z.array(z.string()).optional(),
  errorCode: z.string().optional(),
  timestamp: z.string(),
});
export type RuntimeExecutionEventPayload = z.infer<
  typeof RuntimeExecutionEventPayloadSchema
>;

// ---- runtime 族：网关 dispatch 通道裹送的 6 条原始事件 ----
//
// 2026-09-15 补齐：此前这 6 条里只有 `runtime.execution.event` 进了单源，其余
// 5 条的载荷形状只存在于 `runtime.service.ts` 的发布现场与订阅方的 `any` 断言里
// ——契约缺口（CAP 台账 #13）。以下按**发布现场实际发出的线格式**记录，不按
// `RuntimeDispatchRecord` / `RuntimeApprovalRecord` 的 TS 声明照抄：两者有出入
// 时以线上为准（例如审批记录声明 `resolution?: 'approved' | 'rejected'`，而
// `requestApproval` 发布时把它覆盖成 `'pending'`）。

/** CLI 产物/证据引用条目（server dto `RefItemDto` 的契约镜像） */
export const RefItemPayloadSchema = z.object({
  type: z.string(),
  ref: z.string(),
});

/**
 * CLI 终事件 token 用量（server dto `CliUsageDto` 的契约镜像）。
 * 缺省表示守护进程未上报——**不得据 0 推断"没花钱"**，要据"有没有这个字段"。
 */
export const RuntimeUsagePayloadSchema = z.object({
  promptTokens: z.number(),
  completionTokens: z.number(),
  totalTokens: z.number(),
  costUsd: z.number().optional(),
  model: z.string().optional(),
});
export type RuntimeUsagePayload = z.infer<typeof RuntimeUsagePayloadSchema>;

/** runtime.dispatch.created：runtime.service.createDispatch 发布（`{ runtimeId, ...dispatch }`） */
export const RuntimeDispatchCreatedPayloadSchema = z.object({
  runtimeId: z.string(),
  executionRunId: z.string(),
  projectId: z.string().optional(),
  issueId: z.string().optional(),
  subjectType: z.string().optional(),
  subjectId: z.string().optional(),
  contextPackRef: z.string().optional(),
  requestedActions: z.array(z.string()).optional(),
  toolScopes: z.array(z.string()).optional(),
  approvalState: z.string().optional(),
  policySnapshot: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  // 执行载荷（Phase C：守护进程据此执行）
  prompt: z.string().optional(),
  workspaceRoot: z.string().optional(),
  providerId: z.string().optional(),
  model: z.string().optional(),
  allowedTools: z.array(z.string()).optional(),
  timeout: z.number().optional(),
});
export type RuntimeDispatchCreatedPayload = z.infer<
  typeof RuntimeDispatchCreatedPayloadSchema
>;

/**
 * runtime.execution.result：runtime.service.submitExecutionResult 发布
 * （`{ executionRunId, ...ExecutionResultDto, timestamp }`）。
 * 这是**执行终态 + CLI 真实成本**的唯一上行通道（usage 由本事件携带，
 * 服务端据此落 AIUsageLog 再汇总到 ExecutionRun/Acceptance）。
 */
export const RuntimeExecutionResultPayloadSchema = z.object({
  executionRunId: z.string(),
  status: z.string(),
  summary: z.string(),
  artifacts: z.array(RefItemPayloadSchema).optional(),
  evidence: z.array(RefItemPayloadSchema).optional(),
  error: z.record(z.string(), z.unknown()).nullable().optional(),
  usage: RuntimeUsagePayloadSchema.nullable().optional(),
  /** CLI 终态结构化输出（adapter parseFinalResult 产出）；缺省时服务端回落 {summary} */
  output: z.record(z.string(), z.unknown()).nullable().optional(),
  timestamp: z.string(),
});
export type RuntimeExecutionResultPayload = z.infer<
  typeof RuntimeExecutionResultPayloadSchema
>;

/**
 * runtime.approval.requested：runtime.service.requestApproval 发布
 * （审批记录整条展开 + `resolution: 'pending'`）。
 */
export const RuntimeApprovalRequestedPayloadSchema = z.object({
  approvalRequestId: z.string(),
  executionRunId: z.string(),
  runtimeId: z.string().optional(),
  requestedAction: z.string(),
  riskLevel: z.string(),
  reason: z.string(),
  stepId: z.string().optional(),
  status: z.enum(['pending', 'approved', 'rejected']),
  createdAt: z.string(),
  updatedAt: z.string(),
  /** 发布时恒为 'pending'（见文件头说明：线上格式优先于 TS 声明） */
  resolution: z.enum(['pending', 'approved', 'rejected']),
});
export type RuntimeApprovalRequestedPayload = z.infer<
  typeof RuntimeApprovalRequestedPayloadSchema
>;

/**
 * runtime.approval.resolved：runtime.service.resolveApproval 发布
 * （记录整条展开，`status` 与 `resolution` 双写为同一终态值）。
 */
export const RuntimeApprovalResolvedPayloadSchema =
  RuntimeApprovalRequestedPayloadSchema.extend({
    resolutionNote: z.string().optional(),
  });
export type RuntimeApprovalResolvedPayload = z.infer<
  typeof RuntimeApprovalResolvedPayloadSchema
>;

/** runtime.execution.cancelled：runtime.service.cancelExecution 发布 */
export const RuntimeExecutionCancelledPayloadSchema = z.object({
  runtimeId: z.string(),
  executionRunId: z.string(),
  reason: z.string(),
  cancelledBy: z.string(),
  timestamp: z.string(),
});
export type RuntimeExecutionCancelledPayload = z.infer<
  typeof RuntimeExecutionCancelledPayloadSchema
>;

/**
 * runtime.dispatch.changed：events.gateway 把 runtime 族 6 个事件统一裹成
 * { source, payload } 转发（source = 原始事件名）。订阅方可只订这一条再按
 * source 分派，也可逐条订原始事件。
 */
export const RuntimeDispatchChangedPayloadSchema = z.object({
  source: z.string(),
  payload: z.unknown(),
});
export type RuntimeDispatchChangedPayload = z.infer<
  typeof RuntimeDispatchChangedPayloadSchema
>;

/** acceptance.created：acceptance.service.create 发布 */
export const AcceptanceCreatedPayloadSchema = z.object({
  acceptanceId: z.string(),
  title: z.string().optional(),
  issueId: z.string().nullable().optional(),
  projectId: z.string().nullable().optional(),
  userId: z.string().optional(),
});
export type AcceptanceCreatedPayload = z.infer<
  typeof AcceptanceCreatedPayloadSchema
>;

/** release.approved：release.service.approve 发布 */
export const ReleaseApprovedPayloadSchema = z.object({
  releaseId: z.string(),
});
export type ReleaseApprovedPayload = z.infer<
  typeof ReleaseApprovedPayloadSchema
>;

/** ai.workflow.update：workflow.service.publishUpdate 发布 */
export const AiWorkflowUpdatePayloadSchema = z.object({
  workflowRunId: z.string(),
  status: z.string(),
  error: z.string().optional(),
  at: z.string(),
});
export type AiWorkflowUpdatePayload = z.infer<
  typeof AiWorkflowUpdatePayloadSchema
>;
