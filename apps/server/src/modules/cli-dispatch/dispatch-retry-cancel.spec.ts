/**
 * P1-21：blocked 执行死锁——统一出口与指路
 *
 * 死锁链（修复前）：blocked 执行 retry 被单活跃互斥拒绝（原执行自身即活跃）
 * → 按提示先取消 → dispatch cancel 因无 CLI binding 直接 404 → 用户/AI 无路可走。
 *
 * 覆盖：
 * - 全链路：blocked → retry（400 指路取消）→ cancel（dispatch 降级路径）→ retry 放行；
 * - retry 遇其他活跃执行：错误指名该执行并给取消途径；
 * - retry 状态门：仅 failed/blocked/superseded 可重试；
 * - cancel：binding 缺失按 executionId 降级成功 / 双查无果 404（说明查了什么）；
 * - cancel：有 binding 主路径回归（杀进程 + 终结 binding/session）；
 * - failed 重试回归：血缘与 retryContext 不变。
 */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CliDispatchService } from './dispatch.service';

const ORIGINAL_BASE = {
  id: 'exec_orig',
  issueId: 'issue_1',
  projectId: 'proj_1',
  subjectType: 'external_agent',
  subjectId: 'user_1',
  identitySource: 'cli',
  status: 'blocked',
  title: '实现登录页',
  goal: '实现登录页',
  input: { dispatchError: '验收门禁阻断' },
};

function buildService() {
  // 可变状态：cancel 落库后 original 变 superseded、活跃视图清空，
  // 供「blocked → cancel → retry」全链路在同一条 mock 链上推进
  const state: {
    original: Record<string, unknown> & { id: string; status: string };
    active: { id: string; title: string; status: string } | null;
  } = {
    original: {
      ...ORIGINAL_BASE,
      issue: { id: 'issue_1', projectId: 'proj_1', aiAgentId: null },
    },
    active: {
      id: ORIGINAL_BASE.id,
      title: ORIGINAL_BASE.title,
      status: ORIGINAL_BASE.status,
    },
  };

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
    // 依赖门禁（需求重审 G4）：默认无 blocks 依赖 → 放行
    issueDependency: { findMany: vi.fn().mockResolvedValue([]) },
    execution: {
      findUnique: vi
        .fn()
        .mockImplementation(async ({ where }: { where: { id: string } }) => {
          if (where.id === 'exec_new') {
            return {
              id: 'exec_new',
              issueId: 'issue_1',
              status: 'planned',
              input: {},
            };
          }
          if (where.id === state.original.id) return { ...state.original };
          return null;
        }),
      // 单活跃互斥查询（G5 词表）：跟随 state.active，供取消后放行
      findFirst: vi.fn().mockImplementation(async () => state.active),
    },
    runtime: { findFirst: vi.fn().mockResolvedValue({ id: 'rt_1' }) },
    cliSession: {
      create: vi.fn().mockResolvedValue({ id: 'cs_1' }),
      update: vi.fn().mockResolvedValue({}),
    },
    cliExecutionBinding: {
      create: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn().mockResolvedValue(null), // 默认无 binding → 降级路径
      updateMany: vi.fn().mockResolvedValue({}),
    },
    completenessAuditReport: { findUnique: vi.fn().mockResolvedValue(null) },
  };

  const executionService = {
    createExecutionRun: vi
      .fn()
      .mockResolvedValue({ id: 'exec_new', acceptanceId: null }),
    updateExecutionRun: vi
      .fn()
      .mockImplementation(async (id: string, dto: Record<string, unknown>) => ({
        id,
        ...dto,
      })),
    cancelExecution: vi.fn().mockImplementation(async (id: string) => {
      if (id === state.original.id) {
        state.original.status = 'superseded';
        state.active = null;
      }
      return { ...state.original };
    }),
  };

  const executor = {
    execute: vi.fn(),
    cancel: vi.fn().mockReturnValue(true),
  };
  const registry = { isAvailable: vi.fn().mockReturnValue(true) };
  const cliResolution = { resolveForMember: vi.fn() };
  const contextBuilder = {
    buildTaskExecutionContext: vi.fn().mockResolvedValue({ summary: 'ctx' }),
  };
  const trustService = { evaluateExecution: vi.fn() };
  const acceptanceService = {
    assertDispatchGate: vi.fn().mockResolvedValue('acc_mock'),
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

  return {
    service,
    state,
    prisma,
    executionService,
    executor,
    messageBus,
  };
}

describe('CliDispatchService retry/cancel 统一出口与指路（P1-21）', () => {
  it('全链路：blocked 重试被指路取消 → dispatch cancel 降级取消成功 → 重试放行并携带血缘', async () => {
    const { service, executionService, executor, messageBus } = buildService();

    // 1) blocked 原执行直接重试：原执行自身即活跃 → 400 并指路取消途径
    const err1 = await service
      .retryExecution('exec_orig', 'user_1')
      .catch((e: unknown) => e);
    expect(err1).toBeInstanceOf(BadRequestException);
    expect(err1.message).toContain('自身仍处于活跃状态（blocked）');
    expect(err1.message).toContain('exec_orig');
    expect(err1.message).toContain('执行详情「取消执行」');
    expect(err1.message).toContain(
      'POST /_api/ai/execution-runs/exec_orig/cancel',
    );
    expect(err1.message).toContain('取消后再重新执行');
    expect(executionService.createExecutionRun).not.toHaveBeenCalled();

    // 2) 按指路取消：无 CLI binding → 降级为按 executionId 取消执行记录（非 404）
    const cancelled = await service.cancelExecution('exec_orig', 'user_1');
    expect(cancelled).toBe(false); // 无在跑进程可杀（与既有 success 语义一致）
    expect(executionService.cancelExecution).toHaveBeenCalledWith(
      'exec_orig',
      'Cancelled by user',
    );
    expect(executor.cancel).not.toHaveBeenCalled();
    expect(messageBus.publish).toHaveBeenCalledWith(
      'cli.cancelled',
      expect.objectContaining({
        executionRunId: 'exec_orig',
        viaBinding: false,
      }),
    );

    // 3) 取消后再重试：预检与互斥放行，新执行携带 retryOfId 血缘并走派发链
    const result = await service.retryExecution('exec_orig', 'user_1');
    expect(result.status).toBe('dispatched');
    expect(result.executionRunId).toBe('exec_new');
    expect(executionService.createExecutionRun).toHaveBeenCalledTimes(1);
    expect(executionService.createExecutionRun).toHaveBeenCalledWith(
      expect.objectContaining({ retryOfId: 'exec_orig', issueId: 'issue_1' }),
    );
  });

  it('retry 遇其他活跃执行：错误指名该执行（ID+状态）并给取消途径，不再笼统报互斥', async () => {
    const { service, state, executionService } = buildService();
    state.original.status = 'failed'; // 原执行自身不活跃
    state.active = {
      id: 'exec_other',
      title: '另一个执行',
      status: 'in_progress',
    };

    const err = await service
      .retryExecution('exec_orig', 'user_1')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.message).toContain('其他活跃执行');
    expect(err.message).toContain('exec_other');
    expect(err.message).toContain('in_progress');
    expect(err.message).toContain(
      'POST /_api/ai/execution-runs/exec_other/cancel',
    );
    expect(err.message).toContain('再重新执行 exec_orig');
    expect(executionService.createExecutionRun).not.toHaveBeenCalled();
  });

  it.each(['in_progress', 'planned', 'pending_approval', 'completed'])(
    'retry 状态门：%s 不可重新执行，文案列明可重试状态',
    async (status) => {
      const { service, state, executionService } = buildService();
      state.original.status = status;
      state.active = null;

      const err = await service
        .retryExecution('exec_orig', 'user_1')
        .catch((e: unknown) => e);
      expect(err).toBeInstanceOf(BadRequestException);
      expect(err.message).toContain('仅 failed/blocked/superseded 可重新执行');
      expect(executionService.createExecutionRun).not.toHaveBeenCalled();
    },
  );

  it('cancel：binding 缺失按 executionId 降级成功，不杀进程、发降级事件', async () => {
    const { service, executionService, executor, messageBus } = buildService();

    const cancelled = await service.cancelExecution('exec_orig', 'user_1');

    expect(cancelled).toBe(false);
    expect(executionService.cancelExecution).toHaveBeenCalledTimes(1);
    expect(executor.cancel).not.toHaveBeenCalled();
    expect(messageBus.publish).toHaveBeenCalledWith(
      'cli.cancelled',
      expect.objectContaining({
        executionRunId: 'exec_orig',
        viaBinding: false,
      }),
    );
  });

  it('cancel：binding 与执行记录双查无果才 404，且错误说明查了什么', async () => {
    const { service, executionService } = buildService();

    const err = await service
      .cancelExecution('exec_missing', 'user_1')
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(NotFoundException);
    expect(err.message).toContain('执行 exec_missing 不存在');
    expect(err.message).toContain('CLI 执行绑定');
    expect(err.message).toContain('执行记录');
    expect(err.message).toContain('请确认执行 ID');
    expect(executionService.cancelExecution).not.toHaveBeenCalled();
  });

  it('cancel：有 CLI binding 走既有主路径（杀进程 + 终结 binding/session），回归不变', async () => {
    const { service, prisma, executor, executionService, messageBus } =
      buildService();
    prisma.cliExecutionBinding.findFirst.mockResolvedValue({
      id: 'bind_1',
      cliSessionId: 'cs_1',
    });

    const cancelled = await service.cancelExecution('exec_orig', 'user_1');

    expect(cancelled).toBe(true);
    expect(executor.cancel).toHaveBeenCalledWith('exec_orig');
    expect(executionService.cancelExecution).toHaveBeenCalledWith(
      'exec_orig',
      'Cancelled by user',
    );
    expect(prisma.cliExecutionBinding.updateMany).toHaveBeenCalledWith({
      where: { executionRunId: 'exec_orig' },
      data: { status: 'terminated' },
    });
    expect(prisma.cliSession.update).toHaveBeenCalledWith({
      where: { id: 'cs_1' },
      data: expect.objectContaining({ status: 'terminated' }),
    });
    expect(messageBus.publish).toHaveBeenCalledWith(
      'cli.cancelled',
      expect.objectContaining({ executionRunId: 'exec_orig' }),
    );
  });

  it('failed 重试回归：预检放行，dispatchError 归档进 retryContext、不进新执行主载荷', async () => {
    const { service, state, executionService } = buildService();
    state.original.status = 'failed';
    state.active = null;

    const result = await service.retryExecution(
      'exec_orig',
      'user_1',
      '按诊断重试',
    );

    expect(result.status).toBe('dispatched');
    expect(executionService.createExecutionRun).toHaveBeenCalledTimes(1);
    const arg = executionService.createExecutionRun.mock.calls[0][0] as {
      input: Record<string, unknown>;
    };
    expect(arg.input.dispatchError).toBeUndefined();
    expect(arg.input.retryContext).toMatchObject({
      retryOfId: 'exec_orig',
      originalStatus: 'failed',
      diagnosis: '按诊断重试',
    });
  });
});
