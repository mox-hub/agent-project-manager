import { NotificationService } from './notification.service';

/**
 * 通知生成链路回归——createNotificationFromEvent 是全部领域通知的唯一落点。
 * 曾经的根因 bug：偏好查询空数组时 `[].some(p => p.enabled)` 恒 false，
 * 未配置过偏好的用户永远收不到通知（本次修复的回归用例）。
 */
describe('NotificationService.createNotificationFromEvent', () => {
  const makeService = (preferenceRows: Array<Record<string, unknown>>) => {
    const create = vi.fn().mockImplementation(({ data }) => ({
      id: 'n-1',
      ...data,
    }));
    const publish = vi.fn();
    // 模拟真实 prisma：按 where.userId 过滤偏好行
    const findMany = vi
      .fn()
      .mockImplementation(({ where }) =>
        preferenceRows.filter(
          (row) => !where?.userId || row.userId === where.userId,
        ),
      );
    const service = new NotificationService(
      {
        notificationPreference: { findMany },
        notification: { create },
      } as never,
      { publish } as never,
    );
    return { service, create, publish };
  };

  const PREF_BASE = {
    id: 'pref-1',
    projectId: null,
    channels: '["in-app"]',
  };

  it('用户无任何偏好行时默认创建通知（根因回归）', async () => {
    const { service, create, publish } = makeService([]);

    const result = await service.createNotificationFromEvent(
      'task.created',
      { issueId: 't1', taskTitle: '新任务', projectId: 'p1', projectName: 'P' },
      ['u1'],
    );

    expect(result).toHaveLength(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'u1',
          type: 'task.created',
          title: '新任务已创建：新任务',
          status: 'unread',
        }),
      }),
    );
    expect(publish).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({ userId: 'u1', type: 'task.created' }),
    );
  });

  it('显式关闭该类型（enabled=false）时跳过', async () => {
    const { service, create } = makeService([
      { ...PREF_BASE, userId: 'u1', eventType: 'task.created', enabled: false },
    ]);

    const result = await service.createNotificationFromEvent(
      'task.created',
      { issueId: 't1', taskTitle: 'x', projectId: 'p1' },
      ['u1'],
    );

    expect(result).toHaveLength(0);
    expect(create).not.toHaveBeenCalled();
  });

  it('通配关闭 task.* 时 task.created 一并跳过；同用户其他类型不受影响', async () => {
    const { service, create } = makeService([
      { ...PREF_BASE, userId: 'u1', eventType: 'task.*', enabled: false },
    ]);

    await service.createNotificationFromEvent(
      'task.created',
      { issueId: 't1', projectId: 'p1' },
      ['u1'],
    );
    expect(create).not.toHaveBeenCalled();

    await service.createNotificationFromEvent(
      'document.created',
      { documentId: 'd1', title: 'x', projectId: 'p1' },
      ['u1'],
    );
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('显式开启的偏好决定渠道，通知照常创建', async () => {
    const { service, create } = makeService([
      {
        ...PREF_BASE,
        userId: 'u1',
        eventType: 'task.created',
        enabled: true,
        channels: '["in-app","email"]',
      },
    ]);

    await service.createNotificationFromEvent(
      'task.created',
      { issueId: 't1', taskTitle: 'x', projectId: 'p1' },
      ['u1'],
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ channels: ['in-app', 'email'] }),
      }),
    );
  });

  it('多用户独立判断：未配置者收到、显式关闭者跳过', async () => {
    const { service, create } = makeService([
      { ...PREF_BASE, userId: 'u2', eventType: 'task.created', enabled: false },
    ]);

    const result = await service.createNotificationFromEvent(
      'task.created',
      { issueId: 't1', taskTitle: 'x', projectId: 'p1' },
      ['u1', 'u2'],
    );

    expect(result).toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'u1' }),
      }),
    );
  });
});
