/**
 * P2-21 派发信任门禁单测（CAP-B-07 三级授权「协助者以上才可自动派发」）：
 * - 观察者（trustLevel=1）：拦截，结构化错误 code=TRUST_LEVEL_INSUFFICIENT 并落 blocked 留痕；
 * - 协助者（2）/ 受托者（3）：放行；
 * - 未评估（trustLevel=null）：放行 + 工单时间线记提示（存量兼容 fail-open）；
 * - 项目配置 dispatch.trustGateEnabled=false：门禁整体关闭。
 * 显式指定成员、issue 主负责人回落两条路径各覆盖。
 */
import { BadRequestException } from '@nestjs/common';
import { CliDispatchService } from './dispatch.service';

type MemberOverrides = {
  trustLevel?: number | null;
  trustScore?: number | null;
};

function buildService(options: { member?: MemberOverrides } = {}) {
  const member = {
    id: 'mem_1',
    displayName: 'Claude Coder',
    type: 'ai_agent',
    status: 'active',
    trustLevel: options.member?.trustLevel ?? null,
    trustScore: options.member?.trustScore ?? null,
    personalPrompt: null,
    thinkingLevel: null,
  };

  const prisma = {
    issue: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'issue_1',
        title: '实现登录页',
        description: '按设计稿实现',
        projectId: 'proj_1',
        aiAgentId: null, // 回落路径用例单独覆盖
        project: { id: 'proj_1' },
      }),
    },
    projectWorkspace: { findUnique: vi.fn().mockResolvedValue(null) },
    appConfig: {
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]), // 无在线 runtime → 进程内回退
    },
    repository: {
      findFirst: vi.fn().mockResolvedValue({ localPath: 'E:\\repo' }),
    },
    member: { findUnique: vi.fn().mockResolvedValue(member) },
    teamMember: { findMany: vi.fn().mockResolvedValue([]) },
    team: { findMany: vi.fn().mockResolvedValue([]) },
    memberToolGrant: { findMany: vi.fn().mockResolvedValue([]) },
    // 依赖门禁：默认无 blocks 依赖 → 放行
    issueDependency: { findMany: vi.fn().mockResolvedValue([]) },
    runtime: { findFirst: vi.fn().mockResolvedValue({ id: 'rt_1' }) },
    cliSession: { create: vi.fn().mockResolvedValue({ id: 'cs_1' }) },
    cliExecutionBinding: { create: vi.fn().mockResolvedValue({}) },
    issueActivity: { create: vi.fn().mockResolvedValue({ id: 'act_1' }) },
  };

  const executionService = {
    createExecutionRun: vi.fn().mockResolvedValue({
      id: 'exec_new',
      subjectType: 'platform_ai_member',
      subjectId: 'mem_1',
      projectId: 'proj_1',
      acceptanceId: null,
    }),
    updateExecutionRun: vi.fn().mockImplementation(async (_id, dto) => ({
      id: _id,
      subjectType: 'platform_ai_member',
      subjectId: 'mem_1',
      projectId: 'proj_1',
      acceptanceId: null,
      ...dto,
    })),
  };

  const trustService = { evaluateExecution: vi.fn() };
  const acceptanceService = {
    assertDispatchGate: vi.fn().mockResolvedValue('acc-mock'),
  };
  const executor = { execute: vi.fn() };
  const registry = { isAvailable: vi.fn().mockReturnValue(true) };
  const cliResolution = {
    resolveForMember: vi
      .fn()
      .mockResolvedValue({ providerId: 'claude-code', executionRole: null }),
  };
  const contextBuilder = {
    buildTaskExecutionContext: vi.fn().mockResolvedValue({ summary: 'ctx' }),
  };
  const runtimeService = { createDispatch: vi.fn() };
  const messageBus = { publish: vi.fn() };

  const service = new CliDispatchService(
    prisma as never,
    messageBus as never,
    executionService as never,
    executor as never,
    registry as never,
    cliResolution as never,
    contextBuilder as never,
    trustService as never,
    acceptanceService as never,
    runtimeService as never,
  );

  return { service, prisma, executionService, executor, messageBus };
}

describe('CliDispatchService 派发信任门禁（P2-21 · CAP-B-07 三级授权）', () => {
  it('观察者（trustLevel=1）：拦截并返回结构化错误（当前/所需等级 + 提升指路）', async () => {
    const { service } = buildService({
      member: { trustLevel: 1, trustScore: 20 },
    });

    let caught: unknown;
    try {
      await service.dispatchTaskToCli('issue_1', 'user_1', {
        memberId: 'mem_1',
      });
    } catch (e) {
      caught = e;
    }

    expect(caught).toBeInstanceOf(BadRequestException);
    const response = (caught as BadRequestException).getResponse() as Record<
      string,
      any
    >;
    expect(response.code).toBe('TRUST_LEVEL_INSUFFICIENT');
    expect(response.message).toContain('观察者');
    expect(response.message).toContain('协助者');
    expect(response.details).toMatchObject({
      memberId: 'mem_1',
      currentLevel: 1,
      requiredLevel: 2,
    });
  });

  it('观察者拦截留痕：新建式派发失败落 blocked 执行记录', async () => {
    const { service, executionService } = buildService({
      member: { trustLevel: 1 },
    });

    await expect(
      service.dispatchTaskToCli('issue_1', 'user_1', { memberId: 'mem_1' }),
    ).rejects.toThrow(BadRequestException);

    expect(executionService.createExecutionRun).toHaveBeenCalledTimes(1);
    expect(executionService.createExecutionRun).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'blocked',
        metadata: { dispatchFailed: true },
      }),
    );
  });

  it('协助者（trustLevel=2）：放行派发', async () => {
    const { service, executor } = buildService({
      member: { trustLevel: 2, trustScore: 55 },
    });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {
      memberId: 'mem_1',
    });

    expect(result.status).toBe('dispatched');
    expect(executor.execute).toHaveBeenCalled();
  });

  it('受托者（trustLevel=3）：放行派发', async () => {
    const { service, executor } = buildService({
      member: { trustLevel: 3, trustScore: 80 },
    });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {
      memberId: 'mem_1',
    });

    expect(result.status).toBe('dispatched');
    expect(executor.execute).toHaveBeenCalled();
  });

  it('未评估（trustLevel=null）：放行 + 工单时间线记提示（存量兼容）', async () => {
    const { service, executor, prisma } = buildService({ member: {} });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {
      memberId: 'mem_1',
    });

    expect(result.status).toBe('dispatched');
    expect(executor.execute).toHaveBeenCalled();
    expect(prisma.issueActivity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issueId: 'issue_1',
        type: 'trust_gate',
        source: 'system',
        summary: expect.stringContaining('尚未评估信任等级'),
      }),
    });
  });

  it('回落主体（issue 主负责人）为观察者：同样拦截', async () => {
    const { service, prisma } = buildService({
      member: { trustLevel: 1 },
    });
    prisma.issue.findUnique.mockResolvedValue({
      id: 'issue_1',
      title: '实现登录页',
      projectId: 'proj_1',
      aiAgentId: 'mem_1',
      project: { id: 'proj_1' },
    });

    let code: string | undefined;
    try {
      await service.dispatchTaskToCli('issue_1', 'user_1', {});
    } catch (e) {
      code = ((e as BadRequestException).getResponse() as Record<string, any>)
        .code;
    }
    expect(code).toBe('TRUST_LEVEL_INSUFFICIENT');
  });

  it('项目配置 dispatch.trustGateEnabled=false：门禁整体关闭，观察者也放行', async () => {
    const { service, executor, prisma } = buildService({
      member: { trustLevel: 1 },
    });
    prisma.appConfig.findFirst.mockImplementation(async ({ where }: any) =>
      where?.key === 'dispatch.trustGateEnabled' ? { value: false } : null,
    );

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {
      memberId: 'mem_1',
    });

    expect(result.status).toBe('dispatched');
    expect(executor.execute).toHaveBeenCalled();
    expect(prisma.issueActivity.create).not.toHaveBeenCalled();
  });
});
