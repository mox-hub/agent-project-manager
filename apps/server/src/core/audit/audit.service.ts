import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { TraceContextService } from '../tracing/trace-context.service';

/**
 * 审计动作类型
 */
export type AuditActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'execute'
  | 'approve'
  | 'reject'
  | 'cancel'
  | 'read'
  | 'login'
  | 'logout';

/**
 * 审计资源类型
 */
export type AuditResourceType =
  | 'project'
  | 'task'
  | 'iteration'
  | 'team'
  | 'document'
  | 'repository'
  | 'runtime'
  | 'execution_run'
  | 'approval_request'
  | 'user'
  | 'system';

/**
 * 审计动作接口
 */
export interface AuditAction {
  actorType: 'human' | 'agent' | 'system';
  actorId: string;
  action: AuditActionType;
  resourceType: AuditResourceType;
  resourceId: string;
  projectId?: string;
  result: 'success' | 'failure';
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 统一审计服务
 * 提供全平台统一的审计入口，所有模块通过该服务写入审计
 */
@Injectable()
export class AuditService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly traceContext: TraceContextService,
  ) {}

  /**
   * 记录审计日志
   */
  async log(action: AuditAction): Promise<void> {
    const trace = this.traceContext.getContext();

    await this.prisma.auditLog.create({
      data: {
        actorId: action.actorId,
        actorType: action.actorType,
        action: action.action,
        resourceType: action.resourceType,
        resourceId: action.resourceId,
        projectId: action.projectId,
        result: action.result,
        reason: action.reason,
        metadata: action.metadata as object,
        traceId: trace?.traceId,
      },
    });
  }

  /**
   * 记录任务创建审计
   */
  async logTaskCreated(
    taskId: string,
    projectId: string,
    actor: { type: 'human' | 'agent'; id: string },
  ): Promise<void> {
    await this.log({
      actorType: actor.type,
      actorId: actor.id,
      action: 'create',
      resourceType: 'task',
      resourceId: taskId,
      projectId,
      result: 'success',
    });
  }

  /**
   * 记录执行开始审计
   */
  async logExecutionStarted(
    runId: string,
    projectId: string,
    actor: { type: 'human' | 'agent'; id: string },
  ): Promise<void> {
    await this.log({
      actorType: actor.type,
      actorId: actor.id,
      action: 'execute',
      resourceType: 'execution_run',
      resourceId: runId,
      projectId,
      result: 'success',
      metadata: { event: 'execution.started' },
    });
  }

  /**
   * 记录执行完成审计
   */
  async logExecutionCompleted(
    runId: string,
    projectId: string,
    result: 'success' | 'failure',
    reason?: string,
  ): Promise<void> {
    await this.log({
      actorType: 'system',
      actorId: 'system',
      action: result === 'success' ? 'execute' : 'cancel',
      resourceType: 'execution_run',
      resourceId: runId,
      projectId,
      result,
      reason,
      metadata: { event: 'execution.completed' },
    });
  }

  /**
   * 记录审批结果审计
   */
  async logApprovalResolved(
    requestId: string,
    projectId: string,
    result: 'approved' | 'rejected',
    actorId: string,
  ): Promise<void> {
    await this.log({
      actorType: 'human',
      actorId,
      action: result === 'approved' ? 'approve' : 'reject',
      resourceType: 'approval_request',
      resourceId: requestId,
      projectId,
      result: 'success',
      metadata: { approvalResult: result },
    });
  }

  /**
   * 记录Runtime连接审计
   */
  async logRuntimeConnected(runtimeId: string, actorId: string): Promise<void> {
    await this.log({
      actorType: 'system',
      actorId,
      action: 'create',
      resourceType: 'runtime',
      resourceId: runtimeId,
      result: 'success',
      metadata: { event: 'runtime.connected' },
    });
  }

  /**
   * 记录Runtime断开审计
   */
  async logRuntimeDisconnected(runtimeId: string): Promise<void> {
    await this.log({
      actorType: 'system',
      actorId: 'system',
      action: 'delete',
      resourceType: 'runtime',
      resourceId: runtimeId,
      result: 'success',
      metadata: { event: 'runtime.disconnected' },
    });
  }

  /**
   * 记录文档操作审计
   */
  async logDocumentOperation(
    documentId: string,
    projectId: string,
    action: 'create' | 'update' | 'delete',
    actor: { type: 'human' | 'agent'; id: string },
  ): Promise<void> {
    await this.log({
      actorType: actor.type,
      actorId: actor.id,
      action,
      resourceType: 'document',
      resourceId: documentId,
      projectId,
      result: 'success',
    });
  }

  /**
   * 按executionRunId查询审计记录
   * 注意: SQLite不支持JSON路径查询，使用模糊匹配
   */
  async findByExecutionRunId(executionRunId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        OR: [
          { metadata: {} as any }, // 保留结构
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
    // 内存中过滤包含executionRunId的记录
    return logs.filter((log) => {
      if (log.metadata && typeof log.metadata === 'object') {
        const meta = log.metadata as Record<string, unknown>;
        return meta['executionRunId'] === executionRunId;
      }
      return false;
    });
  }

  /**
   * 按projectId查询审计记录
   */
  async findByProjectId(
    projectId: string,
    options?: { limit?: number; offset?: number },
  ) {
    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.auditLog.count({ where: { projectId } }),
    ]);
    return { logs, total };
  }

  /**
   * 按traceId查询审计记录
   */
  async findByTraceId(traceId: string) {
    const logs = await this.prisma.auditLog.findMany({
      where: { traceId },
      orderBy: { createdAt: 'asc' },
    });
    return logs;
  }
}
