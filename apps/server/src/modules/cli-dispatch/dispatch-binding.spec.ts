/**
 * 4d-3：CLI 派发以 Execution 为单位 —— 绑定派发单测
 * 核心断言：传入 executionId 时复用既有执行项（不新建），并经状态机流转到 in_progress。
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CliDispatchService } from './dispatch.service';

function buildService(
  overrides: {
    existing?: Record<string, unknown> | null;
  } = {},
) {
  const prisma = {
    issue: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'issue_1',
        title: '实现登录页',
        description: '按设计稿实现',
        projectId: 'proj_1',
        aiAgentId: null,
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
    member: { findUnique: vi.fn().mockResolvedValue(null) },
    execution: {
      findUnique: vi
        .fn()
        .mockResolvedValue(
          overrides.existing === undefined ? null : overrides.existing,
        ),
    },
    runtime: { findFirst: vi.fn().mockResolvedValue({ id: 'rt_1' }) },
    cliSession: { create: vi.fn().mockResolvedValue({ id: 'cs_1' }) },
    cliExecutionBinding: { create: vi.fn().mockResolvedValue({}) },
  };

  const executionService = {
    createExecutionRun: vi.fn().mockResolvedValue({
      id: 'exec_new',
      subjectType: 'external_agent',
      subjectId: 'user_1',
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

  const executor = { execute: vi.fn() };
  const registry = { isAvailable: vi.fn().mockReturnValue(true) };
  const cliResolution = { resolveForMember: vi.fn() };
  const contextBuilder = {
    buildTaskExecutionContext: vi.fn().mockResolvedValue({ summary: 'ctx' }),
  };
  const trustService = { evaluateExecution: vi.fn() };
  const acceptanceService = {};
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

  return {
    service,
    prisma,
    executionService,
    executor,
    runtimeService,
    messageBus,
  };
}

describe('CliDispatchService 绑定派发（4d-3）', () => {
  it('传入 executionId 时复用既有执行项：不新建 Execution，流转到 in_progress 并合并派发 input', async () => {
    const { service, executionService } = buildService({
      existing: {
        id: 'exec_1',
        issueId: 'issue_1',
        status: 'planned',
        input: { prev: true },
      },
    });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {
      executionId: 'exec_1',
    });

    expect(result.executionRunId).toBe('exec_1');
    expect(result.status).toBe('dispatched');

    // 不新建执行项
    expect(executionService.createExecutionRun).not.toHaveBeenCalled();
    // 经既有状态机流转到 in_progress，goal/input 以派发参数为准（合并覆盖）
    expect(executionService.updateExecutionRun).toHaveBeenCalledWith(
      'exec_1',
      expect.objectContaining({
        status: 'in_progress',
        input: expect.objectContaining({
          prev: true,
          task: expect.objectContaining({ id: 'issue_1' }),
        }),
      }),
    );
  });

  it('不传 executionId 时保持现状：新建 Execution', async () => {
    const { service, executionService } = buildService({ existing: null });

    const result = await service.dispatchTaskToCli('issue_1', 'user_1', {});

    expect(result.executionRunId).toBeDefined();
    expect(executionService.createExecutionRun).toHaveBeenCalledTimes(1);
    expect(executionService.updateExecutionRun).not.toHaveBeenCalled();
  });

  it('执行项不属于该 issue 时 400', async () => {
    const { service } = buildService({
      existing: { id: 'exec_1', issueId: 'other_issue', status: 'planned' },
    });

    await expect(
      service.dispatchTaskToCli('issue_1', 'user_1', { executionId: 'exec_1' }),
    ).rejects.toThrow(BadRequestException);
  });

  it('执行项不存在时 404', async () => {
    const { service } = buildService({ existing: null });

    await expect(
      service.dispatchTaskToCli('issue_1', 'user_1', { executionId: 'nope' }),
    ).rejects.toThrow(NotFoundException);
  });

  it.each(['completed', 'in_progress', 'pending_approval', 'superseded'])(
    '执行项状态 %s 不可派发（400）',
    async (status) => {
      const { service, executionService } = buildService({
        existing: { id: 'exec_1', issueId: 'issue_1', status },
      });

      await expect(
        service.dispatchTaskToCli('issue_1', 'user_1', {
          executionId: 'exec_1',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(executionService.updateExecutionRun).not.toHaveBeenCalled();
    },
  );

  it.each(['draft', 'planned', 'failed', 'blocked'])(
    '执行项状态 %s 允许绑定派发',
    async (status) => {
      const { service, executionService } = buildService({
        existing: { id: 'exec_1', issueId: 'issue_1', status },
      });

      const result = await service.dispatchTaskToCli('issue_1', 'user_1', {
        executionId: 'exec_1',
      });

      expect(result.executionRunId).toBe('exec_1');
      expect(executionService.updateExecutionRun).toHaveBeenCalledWith(
        'exec_1',
        expect.objectContaining({ status: 'in_progress' }),
      );
    },
  );

  it('绑定派发不新建 Execution：进程内回退执行也复用同一执行项 ID', async () => {
    const { service, executor, runtimeService, messageBus } = buildService({
      existing: { id: 'exec_1', issueId: 'issue_1', status: 'draft' },
    });

    await service.dispatchTaskToCli('issue_1', 'user_1', {
      executionId: 'exec_1',
    });

    expect(runtimeService.createDispatch).not.toHaveBeenCalled(); // 无在线 runtime
    expect(executor.execute).toHaveBeenCalledWith(
      expect.objectContaining({ executionRunId: 'exec_1' }),
      expect.objectContaining({ workspaceRoot: 'E:\\repo' }),
      expect.objectContaining({ onComplete: expect.any(Function) }),
    );
    expect(messageBus.publish).toHaveBeenCalledWith(
      'cli.dispatched',
      expect.objectContaining({ executionRunId: 'exec_1' }),
    );
  });
});
