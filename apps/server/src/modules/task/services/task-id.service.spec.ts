import { TaskIdService } from './task-id.service';

describe('TaskIdService.formatShortId', () => {
  const svc = new TaskIdService(null as any);

  it('pads 3 digits and joins with -', () => {
    expect(svc.formatShortId('APM', 'PF', 1)).toBe('APM-PF-001');
    expect(svc.formatShortId('APM', 'PF', 42)).toBe('APM-PF-042');
  });

  it('handles >999 seq naturally', () => {
    expect(svc.formatShortId('APM', 'PF', 1234)).toBe('APM-PF-1234');
  });

  it('falls back to APM when projectCode is empty', () => {
    expect(svc.formatShortId('', 'PF', 1)).toBe('APM-PF-001');
  });
});

describe('TaskIdService.nextShortId 自愈跳号', () => {
  function makeService(taskOccupied: Set<string>) {
    const upsertSpy = jest.fn().mockResolvedValue({});
    const prisma = {
      project: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'p1', projectCode: 'APM' }),
      },
      projectModule: {
        findMany: jest.fn().mockResolvedValue([{ code: 'PF', name: 'PF' }]),
      },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<number>) =>
        fn({
          projectSequence: {
            findUnique: jest.fn().mockResolvedValue({ lastSeq: 0 }),
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

  it('lastSeq 落后于存量任务时跳过被占用序号并落账最终值', async () => {
    const { svc, upsertSpy } = makeService(
      new Set(['APM-PF-001', 'APM-PF-002']),
    );
    await expect(svc.nextShortId('p1')).resolves.toBe('APM-PF-003');
    expect(upsertSpy).toHaveBeenCalledWith({
      where: { projectId: 'p1' },
      create: { projectId: 'p1', lastSeq: 3 },
      update: { lastSeq: 3 },
    });
  });

  it('真实项目缺 projectCode 时回落 APM 前缀而非 INBOX', async () => {
    const upsertSpy = jest.fn().mockResolvedValue({});
    const prisma = {
      project: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'p1', projectCode: null }),
      },
      projectModule: {
        findMany: jest.fn().mockResolvedValue([{ code: 'PF', name: 'PF' }]),
      },
      $transaction: jest.fn(async (fn: (tx: any) => Promise<number>) =>
        fn({
          projectSequence: {
            findUnique: jest.fn().mockResolvedValue({ lastSeq: 0 }),
            upsert: upsertSpy,
          },
          task: { findFirst: jest.fn().mockResolvedValue(null) },
        }),
      ),
    };
    await expect(
      new TaskIdService(prisma as any).nextShortId('p1'),
    ).resolves.toBe('APM-PF-001');
  });

  it('无占用时按 lastSeq+1 直取', async () => {
    const { svc, upsertSpy } = makeService(new Set());
    await expect(svc.nextShortId('p1')).resolves.toBe('APM-PF-001');
    expect(upsertSpy).toHaveBeenCalledWith({
      where: { projectId: 'p1' },
      create: { projectId: 'p1', lastSeq: 1 },
      update: { lastSeq: 1 },
    });
  });
});
