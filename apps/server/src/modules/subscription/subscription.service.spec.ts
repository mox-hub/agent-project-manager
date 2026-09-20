import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { PrismaService } from '../../core/database/prisma.service';

describe('SubscriptionService', () => {
  let service: SubscriptionService;
  const prismaMock = {
    subscription: {
      findMany: vi.fn(),
      deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      upsert: vi.fn().mockResolvedValue({}),
    },
    member: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn().mockResolvedValue([]),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        SubscriptionService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = moduleRef.get(SubscriptionService);
  });

  it('listSubscribers 返回订阅者投影（成员信息缺失行剔除）', async () => {
    prismaMock.subscription.findMany.mockResolvedValue([
      { memberId: 'm1' },
      { memberId: 'm2' },
    ]);
    prismaMock.member.findMany.mockResolvedValue([
      {
        id: 'm1',
        displayName: '张三',
        avatarUrl: null,
        type: 'human',
        userId: 'u1',
        status: 'active',
      },
    ]);

    const result = await service.listSubscribers('task', 't1');

    expect(prismaMock.subscription.findMany).toHaveBeenCalledWith({
      where: { entityType: 'task', entityId: 't1' },
      orderBy: { createdAt: 'asc' },
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      memberId: 'm1',
      displayName: '张三',
    });
  });

  it('setSubscribers 全量替换：校验成员存在 + 事务删除多余 + upsert', async () => {
    prismaMock.member.findMany.mockResolvedValue([{ id: 'm1' }, { id: 'm2' }]);
    prismaMock.subscription.findMany.mockResolvedValue([]);

    await service.setSubscribers('task', 't1', ['m1', 'm2', 'm2']);

    expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    expect(prismaMock.subscription.deleteMany).toHaveBeenCalledWith({
      where: {
        entityType: 'task',
        entityId: 't1',
        memberId: { notIn: ['m1', 'm2'] },
      },
    });
    // 去重后 2 个 upsert
    expect(prismaMock.subscription.upsert).toHaveBeenCalledTimes(2);
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith({
      where: {
        entityType_entityId_memberId: {
          entityType: 'task',
          entityId: 't1',
          memberId: 'm1',
        },
      },
      create: { entityType: 'task', entityId: 't1', memberId: 'm1' },
      update: {},
    });
  });

  it('setSubscribers 未知成员 404', async () => {
    prismaMock.member.findMany.mockResolvedValue([{ id: 'm1' }]);

    await expect(
      service.setSubscribers('task', 't1', ['m1', 'ghost']),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('mySubscriptions 无成员档案返回空（memberId=null）', async () => {
    prismaMock.member.findFirst.mockResolvedValue(null);

    const result = await service.mySubscriptions('u1');
    expect(result).toEqual({ memberId: null, items: [] });
  });
});
