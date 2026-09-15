import { Test } from '@nestjs/testing';
import { ExecutionReconcileService } from './execution-reconcile.service';
import { PrismaService } from '@/core/database/prisma.service';
import { MessageBusService } from '@/core/message-bus/message-bus.service';
import { LoggerService } from '@/core/logger/logger.service';

describe('ExecutionReconcileService', () => {
  let service: ExecutionReconcileService;
  let published: Array<{ type: string; payload: Record<string, unknown> }>;

  const prismaMock = {
    appConfig: {
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockResolvedValue({}),
    },
    execution: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    delete process.env.EXEC_STALL_THRESHOLD_MS;
    delete process.env.EXEC_PENDING_TTL_MS;
    published = [];

    const moduleRef = await Test.createTestingModule({
      providers: [
        ExecutionReconcileService,
        { provide: PrismaService, useValue: prismaMock },
        {
          provide: MessageBusService,
          useValue: {
            publish: vi.fn((type: string, payload: unknown) => {
              published.push({
                type,
                payload: payload as Record<string, unknown>,
              });
            }),
          },
        },
        {
          provide: LoggerService,
          useValue: {
            setContext: vi.fn(),
            log: vi.fn(),
            warn: vi.fn(),
            error: vi.fn(),
          },
        },
      ],
    }).compile();

    service = moduleRef.get(ExecutionReconcileService);
  });

  it('pending 派发超 TTL → 置 expired 并 publish 失败结果', async () => {
    const stale = new Date(Date.now() - 25 * 60 * 60_000).toISOString();
    prismaMock.appConfig.findMany.mockResolvedValue([
      {
        id: 'cfg-1',
        key: 'runtime:dispatch:rt-1:run-1',
        value: {
          executionRunId: 'run-1',
          runtimeId: 'rt-1',
          status: 'pending',
          createdAt: stale,
        },
      },
      {
        id: 'cfg-2',
        key: 'runtime:dispatch:rt-1:run-2',
        value: {
          executionRunId: 'run-2',
          runtimeId: 'rt-1',
          status: 'pending',
          createdAt: new Date().toISOString(),
        },
      },
    ]);

    await service.reconcile();

    // 仅陈旧记录被置 expired（新记录不动）
    expect(prismaMock.appConfig.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.appConfig.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'cfg-1' } }),
    );
    const result = published.find((p) => p.payload.executionRunId === 'run-1');
    expect(result?.payload.status).toBe('failed');
    expect(String(result?.payload.summary)).toContain('DISPATCH_EXPIRED');
    // 新鲜派发不收敛
    expect(
      published.find((p) => p.payload.executionRunId === 'run-2'),
    ).toBeUndefined();
  });

  it('in_progress 超阈值且守护进程离线 → publish EXECUTION_STALLED', async () => {
    const stale = new Date(Date.now() - 30 * 60_000);
    prismaMock.execution.findMany.mockResolvedValue([
      { id: 'run-9', goal: '修 bug' },
    ]);
    prismaMock.appConfig.findMany.mockImplementation(async (args: any) => {
      if (args?.where?.scope === 'runtime.registration') {
        // 心跳 10 分钟前 → 按 2×30s 口径判离线
        return [
          {
            value: {
              runtimeId: 'rt-off',
              status: 'online',
              lastHeartbeatAt: new Date(Date.now() - 10 * 60_000).toISOString(),
              heartbeatIntervalSeconds: 30,
            },
          },
        ];
      }
      return [
        {
          id: 'cfg-9',
          key: 'runtime:dispatch:rt-off:run-9',
          value: {
            executionRunId: 'run-9',
            status: 'pending',
            createdAt: stale.toISOString(),
          },
        },
      ];
    });

    await service.reconcile();

    const result = published.find((p) => p.payload.executionRunId === 'run-9');
    expect(result?.payload.status).toBe('failed');
    expect(String(result?.payload.summary)).toContain('EXECUTION_STALLED');
  });

  it('守护进程在线时不误杀 in_progress', async () => {
    prismaMock.execution.findMany.mockResolvedValue([
      { id: 'run-10', goal: '长任务' },
    ]);
    prismaMock.appConfig.findMany.mockImplementation(async (args: any) => {
      if (args?.where?.scope === 'runtime.registration') {
        return [
          {
            value: {
              runtimeId: 'rt-on',
              status: 'online',
              lastHeartbeatAt: new Date().toISOString(),
              heartbeatIntervalSeconds: 30,
            },
          },
        ];
      }
      return [
        {
          id: 'cfg-10',
          key: 'runtime:dispatch:rt-on:run-10',
          value: { executionRunId: 'run-10', status: 'pending' },
        },
      ];
    });

    await service.reconcile();

    expect(published).toHaveLength(0);
    expect(prismaMock.appConfig.update).not.toHaveBeenCalled();
  });

  it('人工执行项不参与悬挂对账', async () => {
    prismaMock.execution.findMany.mockResolvedValue([]);
    await service.reconcile();
    // 查询条件含 subjectType: { not: 'human' }
    expect(prismaMock.execution.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          subjectType: { not: 'human' },
          status: 'in_progress',
        }),
      }),
    );
  });
});
