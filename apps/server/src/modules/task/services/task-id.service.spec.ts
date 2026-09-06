import { TaskIdService } from './task-id.service';

describe('TaskIdService.formatShortId', () => {
  const svc = new TaskIdService(null as any);

  it('joins prefix and seq with -', () => {
    expect(svc.formatShortId('APM', 1)).toBe('APM-1');
    expect(svc.formatShortId('MOX', 42)).toBe('MOX-42');
  });

  it('no zero padding beyond 9', () => {
    expect(svc.formatShortId('MOX', 99)).toBe('MOX-99');
    expect(svc.formatShortId('MOX', 139)).toBe('MOX-139');
  });
});

describe('TaskIdService.nextShortId 全局序列自愈跳号', () => {
  function makeService(taskOccupied: Set<string>, prefix = 'MOX') {
    const upsertSpy = jest.fn().mockResolvedValue({});
    const prisma = {
      appConfig: {
        findFirst: jest.fn().mockResolvedValue({ value: prefix }),
      },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<number>) =>
        fn({
          globalSequence: {
            findUnique: jest.fn().mockResolvedValue(null),
            upsert: upsertSpy,
          },
          task: {
            findFirst: jest.fn(({ where }: { where: { shortId: string } }) =>
              Promise.resolve(
                taskOccupied.has(where.shortId) ? { id: 't' } : null,
              ),
            ),
          },
        }),
      ),
    };
    return { svc: new TaskIdService(prisma as any), upsertSpy };
  }

  it('lastSeq 缺失时从 1 起步', async () => {
    const { svc } = makeService(new Set());
    await expect(svc.nextShortId()).resolves.toBe('MOX-1');
  });

  it('计数器落后于存量任务时跳过被占用序号并落账最终值', async () => {
    const upsertSpy = jest.fn().mockResolvedValue({});
    const prisma = {
      appConfig: {
        findFirst: jest.fn().mockResolvedValue(null), // 未配置 → APM
      },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<number>) =>
        fn({
          globalSequence: {
            findUnique: jest.fn().mockResolvedValue({ lastSeq: 2 }),
            upsert: upsertSpy,
          },
          task: {
            findFirst: jest.fn(({ where }: { where: { shortId: string } }) =>
              Promise.resolve(
                ['APM-1', 'APM-2', 'APM-3'].includes(where.shortId)
                  ? { id: 't' }
                  : null,
              ),
            ),
          },
        }),
      ),
    };
    await expect(new TaskIdService(prisma as any).nextShortId()).resolves.toBe(
      'APM-4',
    );
    expect(upsertSpy).toHaveBeenCalledWith({
      where: { key: 'task.shortId' },
      create: { key: 'task.shortId', lastSeq: 4 },
      update: { lastSeq: 4 },
    });
  });

  it('配置了前缀时使用配置前缀', async () => {
    const { svc } = makeService(new Set(), 'XYZ');
    await expect(svc.nextShortId()).resolves.toBe('XYZ-1');
  });
});
