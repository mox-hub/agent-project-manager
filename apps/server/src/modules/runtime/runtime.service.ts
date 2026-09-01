import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'crypto';
import { PrismaService } from '@/core/database/prisma.service';
import { LoggerService } from '@/core/logger/logger.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { Prisma } from '@prisma/client';
import { RuntimeRegisterDto } from './dto/runtime-register.dto';
import { RuntimeCapabilitiesDto } from './dto/runtime-capabilities.dto';
import { RuntimeHeartbeatDto } from './dto/runtime-heartbeat.dto';
import { ExecutionEventDto } from './dto/execution-event.dto';
import { ExecutionResultDto } from './dto/execution-result.dto';
import { ApprovalRequestDto } from './dto/approval-request.dto';

type RuntimeRegistrationRecord = {
  runtimeId: string;
  deviceId: string;
  hostPlatform: string;
  runtimeVersion: string;
  protocolVersion: string;
  workspaceRoots: string[];
  availableProviders: string[];
  cliProviders: string[];
  runtimeSessionId: string;
  runtimeSessionToken: string;
  status: 'online' | 'offline';
  heartbeatIntervalSeconds: number;
  serverTime: string;
  lastHeartbeatAt: string;
  lastSeenAt: string;
  metadata?: Record<string, unknown>;
};

type RuntimeSessionValidation = {
  runtimeId: string;
  runtimeSessionId: string;
  runtimeSessionToken: string;
};

type RuntimeDispatchRecord = {
  executionRunId: string;
  projectId?: string;
  taskId?: string;
  subjectType?: string;
  subjectId?: string;
  contextPackRef?: string;
  requestedActions?: string[];
  toolScopes?: string[];
  approvalState?: string;
  policySnapshot?: Record<string, unknown>;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  // 执行载荷（Phase C：守护进程据此执行）
  prompt?: string;
  workspaceRoot?: string;
  providerId?: string;
  model?: string;
  allowedTools?: string[];
  timeout?: number;
};

type RuntimeApprovalRecord = {
  approvalRequestId: string;
  executionRunId: string;
  runtimeId?: string;
  requestedAction: string;
  riskLevel: string;
  reason: string;
  stepId?: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  resolution?: 'approved' | 'rejected';
  resolutionNote?: string;
};

@Injectable()
export class RuntimeService {
  private static readonly HEARTBEAT_SECONDS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly messageBus: MessageBusService,
  ) {
    this.logger.setContext('RuntimeService');
  }

  async register(dto: RuntimeRegisterDto) {
    const runtimeSessionId = `rs_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const runtimeSessionToken = `rt_${randomBytes(24).toString('hex')}`;
    const now = new Date().toISOString();

    const record: RuntimeRegistrationRecord = {
      runtimeId: dto.runtimeId,
      deviceId: dto.deviceId,
      hostPlatform: dto.hostPlatform,
      runtimeVersion: dto.runtimeVersion,
      protocolVersion: dto.protocolVersion,
      workspaceRoots: dto.workspaceRoots,
      availableProviders: dto.availableProviders,
      cliProviders: dto.cliProviders,
      runtimeSessionId,
      runtimeSessionToken,
      status: 'online',
      heartbeatIntervalSeconds: RuntimeService.HEARTBEAT_SECONDS,
      serverTime: now,
      lastHeartbeatAt: now,
      lastSeenAt: now,
      metadata: dto.metadata,
    };

    await this.upsertRuntimeConfig(
      this.getRegistrationKey(dto.runtimeId),
      'runtime.registration',
      record,
    );

    await this.prisma.auditLog.create({
      data: {
        action: 'runtime.register',
        resourceType: 'runtime',
        resourceId: dto.runtimeId,
        metadata: {
          runtimeSessionId,
          deviceId: dto.deviceId,
          hostPlatform: dto.hostPlatform,
          runtimeVersion: dto.runtimeVersion,
          protocolVersion: dto.protocolVersion,
        },
      },
    });

    this.messageBus.publish('runtime.connected', {
      runtimeId: dto.runtimeId,
      runtimeSessionId,
      timestamp: now,
    });

    return {
      runtimeSessionId,
      runtimeSessionToken,
      websocketEndpoint: '/runtime/ws',
      heartbeatIntervalSeconds: RuntimeService.HEARTBEAT_SECONDS,
      serverTime: now,
    };
  }

  async updateCapabilities(runtimeId: string, dto: RuntimeCapabilitiesDto) {
    const now = new Date().toISOString();
    await this.ensureRuntimeRegistered(runtimeId);

    await this.upsertRuntimeConfig(
      this.getCapabilitiesKey(runtimeId),
      'runtime.capability',
      {
        runtimeId,
        workspaceRoots: dto.workspaceRoots,
        providers: dto.providers,
        cliProviders: dto.cliProviders,
        capabilityFlags: dto.capabilityFlags ?? {},
        policyConstraints: dto.policyConstraints ?? {},
        updatedAt: now,
      },
    );

    await this.prisma.systemEvent.create({
      data: {
        level: 'info',
        category: 'runtime.capability.updated',
        message: `Runtime capabilities updated: ${runtimeId}`,
        context: {
          runtimeId,
          updatedAt: now,
        },
      },
    });

    return {
      runtimeId,
      updatedAt: now,
    };
  }

  async heartbeat(runtimeId: string, dto: RuntimeHeartbeatDto) {
    const now = new Date().toISOString();
    const registration = await this.ensureRuntimeRegistered(runtimeId);

    if (registration.runtimeSessionId !== dto.runtimeSessionId) {
      throw new UnauthorizedException('RUNTIME_AUTH_FAILED');
    }

    const updatedRecord: RuntimeRegistrationRecord = {
      ...registration,
      status: (dto.status as 'online' | 'offline') || 'online',
      lastHeartbeatAt: now,
      lastSeenAt: now,
      serverTime: now,
      metadata: {
        ...(registration.metadata ?? {}),
        activeExecutionIds: dto.activeExecutionIds ?? [],
      },
    };

    await this.upsertRuntimeConfig(
      this.getRegistrationKey(runtimeId),
      'runtime.registration',
      updatedRecord,
    );

    this.messageBus.publish('runtime.heartbeat', {
      runtimeId,
      runtimeSessionId: dto.runtimeSessionId,
      activeExecutionIds: dto.activeExecutionIds ?? [],
      timestamp: now,
    });

    return {
      runtimeId,
      status: updatedRecord.status,
      lastHeartbeatAt: now,
      activeExecutionIds: dto.activeExecutionIds ?? [],
    };
  }

  async getDispatches(runtimeId: string, status = 'pending', limit = 20) {
    await this.ensureRuntimeRegistered(runtimeId);

    const records = await this.prisma.appConfig.findMany({
      where: {
        scope: 'runtime.dispatch',
        key: {
          startsWith: `${this.getDispatchPrefix(runtimeId)}:`,
        },
      },
      orderBy: {
        updatedAt: 'asc',
      },
      take: Math.max(limit * 3, limit),
    });

    const dispatches = records
      .map((item) => item.value as RuntimeDispatchRecord)
      .filter((item) => (item.status ?? 'pending') === status)
      .slice(0, limit)
      .map((item) => ({
        executionRunId: item.executionRunId,
        projectId: item.projectId,
        taskId: item.taskId,
        subjectType: item.subjectType,
        subjectId: item.subjectId,
        contextPackRef: item.contextPackRef,
        requestedActions: item.requestedActions ?? [],
        toolScopes: item.toolScopes ?? [],
        approvalState: item.approvalState ?? 'not_required_for_read',
        policySnapshot: item.policySnapshot ?? {},
        // 执行载荷透出
        prompt: item.prompt,
        workspaceRoot: item.workspaceRoot,
        providerId: item.providerId,
        model: item.model,
        allowedTools: item.allowedTools,
        timeout: item.timeout,
      }));

    return dispatches;
  }

  async getExecutionContext(executionRunId: string, runtimeId: string) {
    await this.assertExecutionOwnedByRuntime(runtimeId, executionRunId);

    const contextKey = this.getExecutionContextKey(executionRunId);
    const context = await this.prisma.appConfig.findFirst({
      where: { key: contextKey, scope: 'runtime.execution.context' },
    });

    if (context) {
      return context.value;
    }

    const dispatch = await this.findDispatchByExecutionRunId(executionRunId);
    if (!dispatch) {
      throw new NotFoundException('RUNTIME_EXECUTION_NOT_FOUND');
    }

    return {
      executionRunId,
      contextPackRef: dispatch.contextPackRef,
      projectId: dispatch.projectId,
      taskId: dispatch.taskId,
      requestedActions: dispatch.requestedActions ?? [],
      toolScopes: dispatch.toolScopes ?? [],
      generatedAt: new Date().toISOString(),
      // 执行载荷透出
      prompt: dispatch.prompt,
      workspaceRoot: dispatch.workspaceRoot,
      providerId: dispatch.providerId,
      model: dispatch.model,
      allowedTools: dispatch.allowedTools,
      timeout: dispatch.timeout,
    };
  }

  async submitExecutionEvent(
    executionRunId: string,
    dto: ExecutionEventDto,
    runtimeId: string,
  ) {
    await this.assertExecutionOwnedByRuntime(runtimeId, executionRunId);

    const now = dto.timestamp ?? new Date().toISOString();

    await this.prisma.systemEvent.create({
      data: {
        level: dto.errorCode ? 'error' : 'info',
        category: 'runtime.execution.event',
        message: `${dto.eventType} (${executionRunId})`,
        context: {
          ...dto,
          executionRunId,
          timestamp: now,
        },
      },
    });

    if (dto.status) {
      await this.upsertRuntimeConfig(
        this.getExecutionStatusKey(executionRunId),
        'runtime.execution.status',
        {
          executionRunId,
          runtimeId: dto.runtimeId,
          status: dto.status,
          summary: dto.summary,
          updatedAt: now,
        },
      );
    }

    this.messageBus.publish('runtime.execution.event', {
      ...dto,
      executionRunId,
      timestamp: now,
    });

    return {
      accepted: true,
      timestamp: now,
    };
  }

  async submitExecutionResult(
    executionRunId: string,
    dto: ExecutionResultDto,
    runtimeId: string,
  ) {
    await this.assertExecutionOwnedByRuntime(runtimeId, executionRunId);
    const now = new Date().toISOString();

    await this.upsertRuntimeConfig(
      this.getExecutionStatusKey(executionRunId),
      'runtime.execution.status',
      {
        executionRunId,
        status: dto.status,
        summary: dto.summary,
        artifacts: dto.artifacts ?? [],
        evidence: dto.evidence ?? [],
        error: dto.error ?? null,
        updatedAt: now,
      },
    );

    const dispatchMeta =
      await this.findDispatchConfigByExecutionRunId(executionRunId);

    if (dispatchMeta) {
      const dispatch = dispatchMeta.value as RuntimeDispatchRecord;
      await this.prisma.appConfig.update({
        where: { id: dispatchMeta.id },
        data: {
          value: {
            ...dispatch,
            status: dto.status,
            updatedAt: now,
          } as Prisma.InputJsonValue,
          updatedAt: new Date(now),
        },
      });
    }

    await this.prisma.auditLog.create({
      data: {
        action: 'runtime.execution.result.submitted',
        resourceType: 'execution',
        resourceId: executionRunId,
        metadata: {
          status: dto.status,
          summary: dto.summary,
        },
      },
    });

    this.messageBus.publish('runtime.execution.result', {
      executionRunId,
      ...dto,
      timestamp: now,
    });

    return {
      accepted: true,
      timestamp: now,
    };
  }

  async requestApproval(
    executionRunId: string,
    dto: ApprovalRequestDto,
    runtimeId: string,
  ) {
    await this.assertExecutionOwnedByRuntime(runtimeId, executionRunId);
    const now = new Date().toISOString();
    const approvalRequestId = `apr_${randomUUID().replace(/-/g, '').slice(0, 12)}`;

    const approvalRecord = {
      approvalRequestId,
      executionRunId,
      runtimeId,
      requestedAction: dto.requestedAction,
      riskLevel: dto.riskLevel,
      reason: dto.reason,
      stepId: dto.stepId,
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    await this.upsertRuntimeConfig(
      this.getApprovalKey(approvalRequestId),
      'runtime.approval',
      approvalRecord,
    );

    await this.upsertRuntimeConfig(
      this.getExecutionApprovalKey(executionRunId),
      'runtime.execution.approval',
      {
        approvalRequestId,
        executionRunId,
        status: 'pending',
        updatedAt: now,
      },
    );

    this.messageBus.publish('runtime.approval.requested', {
      ...approvalRecord,
      resolution: 'pending',
    });

    return {
      approvalRequestId,
      status: 'pending',
    };
  }

  async validateSession(
    runtimeSessionId: string,
    runtimeSessionToken: string,
  ): Promise<RuntimeSessionValidation> {
    const registration = await this.prisma.appConfig.findFirst({
      where: {
        scope: 'runtime.registration',
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (!registration) {
      throw new UnauthorizedException('RUNTIME_NOT_REGISTERED');
    }

    const allRegistrations = await this.prisma.appConfig.findMany({
      where: { scope: 'runtime.registration' },
    });

    const hit = allRegistrations
      .map((item) => item.value as RuntimeRegistrationRecord)
      .find(
        (item) =>
          item.runtimeSessionId === runtimeSessionId &&
          item.runtimeSessionToken === runtimeSessionToken,
      );

    if (!hit) {
      throw new UnauthorizedException('RUNTIME_AUTH_FAILED');
    }

    return {
      runtimeId: hit.runtimeId,
      runtimeSessionId: hit.runtimeSessionId,
      runtimeSessionToken: hit.runtimeSessionToken,
    };
  }

  async assertRuntimeAccess(
    expectedRuntimeId: string,
    actualRuntimeId: string,
  ) {
    if (expectedRuntimeId !== actualRuntimeId) {
      throw new ForbiddenException('RUNTIME_AUTH_FAILED');
    }
  }

  async createDispatch(runtimeId: string, dispatch: RuntimeDispatchRecord) {
    const now = new Date().toISOString();
    const value: RuntimeDispatchRecord = {
      ...dispatch,
      status: dispatch.status ?? 'pending',
      createdAt: dispatch.createdAt ?? now,
      updatedAt: now,
    };

    await this.upsertRuntimeConfig(
      this.getDispatchKey(runtimeId, dispatch.executionRunId),
      'runtime.dispatch',
      value,
    );

    this.messageBus.publish('runtime.dispatch.created', {
      runtimeId,
      ...value,
    });
  }

  async resolveApproval(
    approvalRequestId: string,
    resolution: 'approved' | 'rejected',
    resolutionNote?: string,
  ) {
    const item = await this.prisma.appConfig.findFirst({
      where: {
        key: this.getApprovalKey(approvalRequestId),
        scope: 'runtime.approval',
      },
    });

    if (!item) {
      throw new NotFoundException('RUNTIME_APPROVAL_ALREADY_RESOLVED');
    }

    const value = item.value as RuntimeApprovalRecord;
    if (value.status === 'approved' || value.status === 'rejected') {
      throw new ForbiddenException('RUNTIME_APPROVAL_ALREADY_RESOLVED');
    }

    const updated = {
      ...value,
      status: resolution,
      resolution,
      resolutionNote,
      updatedAt: new Date().toISOString(),
    };

    await this.prisma.appConfig.update({
      where: { id: item.id },
      data: { value: updated as Prisma.InputJsonValue },
    });

    this.messageBus.publish('runtime.approval.resolved', updated);
    return updated;
  }

  // ---------- 面向前端设置页的查询（JWT 控制面） ----------

  /** 列出全部 runtime 注册（白名单脱敏：不含 session token / deviceSecret） */
  async listRegistrations() {
    const records = await this.prisma.appConfig.findMany({
      where: { scope: 'runtime.registration' },
      orderBy: { updatedAt: 'desc' },
    });
    return records.map((item) => {
      const v = item.value as RuntimeRegistrationRecord;
      return {
        runtimeId: v.runtimeId,
        deviceId: v.deviceId,
        hostPlatform: v.hostPlatform,
        runtimeVersion: v.runtimeVersion,
        protocolVersion: v.protocolVersion,
        workspaceRoots: v.workspaceRoots,
        availableProviders: v.availableProviders,
        cliProviders: v.cliProviders,
        status: v.status,
        lastHeartbeatAt: v.lastHeartbeatAt,
        lastSeenAt: v.lastSeenAt,
      };
    });
  }

  /** 列出 runtime 审批（可按状态过滤，默认全部） */
  async listApprovals(status?: 'pending' | 'approved' | 'rejected', limit = 50) {
    const records = await this.prisma.appConfig.findMany({
      where: { scope: 'runtime.approval' },
      orderBy: { updatedAt: 'desc' },
      take: Math.max(limit * 3, limit),
    });
    return records
      .map((item) => item.value as RuntimeApprovalRecord)
      .filter((item) => !status || item.status === status)
      .slice(0, limit);
  }

  /** 列出派发记录（含执行载荷摘要，不含 prompt 全文） */
  async listDispatches(limit = 50) {
    const records = await this.prisma.appConfig.findMany({
      where: { scope: 'runtime.dispatch' },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });
    return records.map((item) => {
      const v = item.value as RuntimeDispatchRecord;
      return { ...v, prompt: v.prompt ? `${v.prompt.slice(0, 120)}…` : v.prompt };
    });
  }

  async cancelExecution(
    executionRunId: string,
    reason = 'cancelled_by_control_plane',
    cancelledBy = 'control-plane',
  ) {
    const dispatchMeta =
      await this.findDispatchConfigByExecutionRunId(executionRunId);

    if (!dispatchMeta) {
      throw new NotFoundException('RUNTIME_EXECUTION_NOT_FOUND');
    }

    const now = new Date().toISOString();
    const dispatch = dispatchMeta.value as RuntimeDispatchRecord;
    const runtimeId = this.extractRuntimeIdFromDispatchKey(dispatchMeta.key);

    await this.prisma.appConfig.update({
      where: { id: dispatchMeta.id },
      data: {
        value: {
          ...dispatch,
          status: 'cancelled',
          updatedAt: now,
        } as Prisma.InputJsonValue,
      },
    });

    await this.upsertRuntimeConfig(
      this.getExecutionStatusKey(executionRunId),
      'runtime.execution.status',
      {
        executionRunId,
        status: 'cancelled',
        summary: reason,
        updatedAt: now,
      },
    );

    await this.prisma.auditLog.create({
      data: {
        action: 'runtime.execution.cancelled',
        resourceType: 'execution',
        resourceId: executionRunId,
        metadata: {
          runtimeId,
          reason,
          cancelledBy,
        },
      },
    });

    this.messageBus.publish('runtime.execution.cancelled', {
      runtimeId,
      executionRunId,
      reason,
      cancelledBy,
      timestamp: now,
    });

    return {
      executionRunId,
      runtimeId,
      status: 'cancelled',
      reason,
      cancelledBy,
      timestamp: now,
    };
  }

  private async ensureRuntimeRegistered(runtimeId: string) {
    const registration = await this.prisma.appConfig.findFirst({
      where: {
        key: this.getRegistrationKey(runtimeId),
        scope: 'runtime.registration',
      },
    });

    if (!registration) {
      throw new NotFoundException('RUNTIME_NOT_REGISTERED');
    }

    return registration.value as RuntimeRegistrationRecord;
  }

  private async findDispatchByExecutionRunId(executionRunId: string) {
    const dispatchConfig =
      await this.findDispatchConfigByExecutionRunId(executionRunId);
    return dispatchConfig?.value as RuntimeDispatchRecord | undefined;
  }

  private async assertExecutionOwnedByRuntime(
    runtimeId: string,
    executionRunId: string,
  ) {
    const dispatchConfig =
      await this.findDispatchConfigByExecutionRunId(executionRunId);

    if (!dispatchConfig) {
      return;
    }

    const expectedPrefix = `${this.getDispatchPrefix(runtimeId)}:`;
    if (!dispatchConfig.key.startsWith(expectedPrefix)) {
      throw new ForbiddenException('RUNTIME_AUTH_FAILED');
    }
  }

  private async findDispatchConfigByExecutionRunId(executionRunId: string) {
    const records = await this.prisma.appConfig.findMany({
      where: {
        scope: 'runtime.dispatch',
      },
    });

    return records.find(
      (item) =>
        (item.value as RuntimeDispatchRecord).executionRunId === executionRunId,
    );
  }

  private async upsertRuntimeConfig(
    key: string,
    scope: string,
    value: unknown,
  ) {
    const existed = await this.prisma.appConfig.findFirst({
      where: { key, scope },
    });

    if (existed) {
      return this.prisma.appConfig.update({
        where: { id: existed.id },
        data: {
          value: value as Prisma.InputJsonValue,
        },
      });
    }

    return this.prisma.appConfig.create({
      data: {
        key,
        scope,
        value: value as Prisma.InputJsonValue,
      },
    });
  }

  private getRegistrationKey(runtimeId: string) {
    return `runtime:registration:${runtimeId}`;
  }

  private getCapabilitiesKey(runtimeId: string) {
    return `runtime:capabilities:${runtimeId}`;
  }

  private getDispatchPrefix(runtimeId: string) {
    return `runtime:dispatch:${runtimeId}`;
  }

  private getDispatchKey(runtimeId: string, executionRunId: string) {
    return `${this.getDispatchPrefix(runtimeId)}:${executionRunId}`;
  }

  private getExecutionContextKey(executionRunId: string) {
    return `runtime:execution-context:${executionRunId}`;
  }

  private getExecutionStatusKey(executionRunId: string) {
    return `runtime:execution-status:${executionRunId}`;
  }

  private getApprovalKey(approvalRequestId: string) {
    return `runtime:approval:${approvalRequestId}`;
  }

  private getExecutionApprovalKey(executionRunId: string) {
    return `runtime:execution-approval:${executionRunId}`;
  }

  private extractRuntimeIdFromDispatchKey(key: string) {
    const parts = key.split(':');
    if (parts.length < 4) {
      return '';
    }

    return parts[2] ?? '';
  }
}
