/**
 * 工作区名单公开开关服务单测（CAP-A-26 / GAP-T-58 ②）。
 *
 * 覆盖「默认关」的安全语义与读写路径：无行默认关、严格布尔判定（非 true 一律关）、
 * 读异常回落关（绝不因读失败而意外暴露）、首次写创建行 / 后续写更新行并留痕 actorId。
 * 数据层以 stub 注入（本服务只做 AppConfig 单键读写，无需真实库）。
 */
import { WorkspacePublicSettingsService } from './public-settings.service';
import type { PrismaService } from '@/core/database/prisma.service';

const CONFIG_KEY = WorkspacePublicSettingsService.CONFIG_KEY;

interface PrismaStub {
  appConfig: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
}

function makePrismaStub(): PrismaStub {
  return {
    appConfig: {
      findFirst: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
      create: vi.fn().mockResolvedValue({}),
    },
  };
}

function makeService(prisma: PrismaStub): WorkspacePublicSettingsService {
  return new WorkspacePublicSettingsService(prisma as unknown as PrismaService);
}

describe('WorkspacePublicSettingsService', () => {
  it('无配置行时默认关闭（安全默认）', async () => {
    const prisma = makePrismaStub();
    prisma.appConfig.findFirst.mockResolvedValue(null);

    await expect(makeService(prisma).isPublicListEnabled()).resolves.toBe(
      false,
    );
    expect(prisma.appConfig.findFirst).toHaveBeenCalledWith({
      where: { key: CONFIG_KEY, scope: 'global' },
    });
  });

  it('仅 value === true 视为开启（严格布尔，非真值一律关）', async () => {
    const prisma = makePrismaStub();
    prisma.appConfig.findFirst.mockResolvedValue({ id: 'row-1', value: true });

    await expect(makeService(prisma).isPublicListEnabled()).resolves.toBe(true);
  });

  it('value 为其它真值（如字符串）不视为开启', async () => {
    const prisma = makePrismaStub();
    prisma.appConfig.findFirst.mockResolvedValue({
      id: 'row-1',
      value: 'yes',
    });

    await expect(makeService(prisma).isPublicListEnabled()).resolves.toBe(
      false,
    );
  });

  it('读取异常时回落关闭（绝不因读失败而意外暴露名单）', async () => {
    const prisma = makePrismaStub();
    prisma.appConfig.findFirst.mockRejectedValue(new Error('db down'));

    await expect(makeService(prisma).isPublicListEnabled()).resolves.toBe(
      false,
    );
  });

  it('首次写入无行则创建，并返回写入值、留痕 actorId', async () => {
    const prisma = makePrismaStub();
    prisma.appConfig.findFirst.mockResolvedValue(null);

    const result = await makeService(prisma).setPublicListEnabled(
      true,
      'user-admin',
    );

    expect(result).toBe(true);
    expect(prisma.appConfig.update).not.toHaveBeenCalled();
    expect(prisma.appConfig.create).toHaveBeenCalledTimes(1);
    expect(prisma.appConfig.create.mock.calls[0][0].data).toMatchObject({
      key: CONFIG_KEY,
      value: true,
      scope: 'global',
      createdBy: 'user-admin',
      updatedBy: 'user-admin',
    });
  });

  it('已有行则按 id 更新，并留痕 updatedBy', async () => {
    const prisma = makePrismaStub();
    prisma.appConfig.findFirst.mockResolvedValue({ id: 'row-9', value: false });

    const result = await makeService(prisma).setPublicListEnabled(
      true,
      'user-admin',
    );

    expect(result).toBe(true);
    expect(prisma.appConfig.create).not.toHaveBeenCalled();
    expect(prisma.appConfig.update).toHaveBeenCalledTimes(1);
    expect(prisma.appConfig.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'row-9' },
      data: { value: true, updatedBy: 'user-admin' },
    });
  });

  it('写入 false 返回关闭值（可回退）', async () => {
    const prisma = makePrismaStub();
    prisma.appConfig.findFirst.mockResolvedValue({ id: 'row-9', value: true });

    await expect(makeService(prisma).setPublicListEnabled(false)).resolves.toBe(
      false,
    );
    expect(prisma.appConfig.update.mock.calls[0][0].data.value).toBe(false);
    expect(prisma.appConfig.update.mock.calls[0][0].data.updatedBy).toBeNull();
  });
});
