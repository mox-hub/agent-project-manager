import { BadRequestException, NotFoundException } from '@nestjs/common';
import { assertDeliverableItems, ReleaseService } from '../release.service';

/**
 * 交付成果清单单测（CAP-K-03 批二切片，内存桩）：
 * 必填口径（name/location/howToVerify trim 非空，limitations/receiver 可选）、
 * 全状态可改（released 后仍可补录）、记录操作人与时间、全量替换语义。
 */

const VALID_ITEM = {
  name: '桌面安装包 v1.2.0',
  location: 'GitHub Releases / 内网镜像',
  howToVerify: '安装后登录成功，验收单全绿',
};

class StubPrisma {
  releases: Record<string, any>[] = [];

  get release() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findUnique: async ({ where }: any) => {
        const found = svc.releases.find((r) => r.id === where.id) ?? null;
        return found ? { ...found, milestone: null } : null;
      },
      update: async ({ where, data }: any) => {
        const found = svc.releases.find((r) => r.id === where.id);
        if (!found) throw new Error(`release ${where.id} not found`);
        Object.assign(found, data);
        return { ...found, milestone: null };
      },
    };
  }
}

function buildService(prisma: StubPrisma): ReleaseService {
  // updateDeliverables 只触及 prisma.release；其余协作者为透传桩
  return new ReleaseService(
    prisma as never,
    { publish: () => {} } as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
}

describe('assertDeliverableItems（交付成果清单必填口径）', () => {
  it('合法元素（含可选字段）不抛', () => {
    expect(() =>
      assertDeliverableItems([
        { ...VALID_ITEM, limitations: '仅支持 x64', receiver: '值班 QA' },
      ]),
    ).not.toThrow();
  });

  it('缺必填字段（name/location/howToVerify）→ 400', () => {
    for (const field of ['name', 'location', 'howToVerify'] as const) {
      const broken = { ...VALID_ITEM };
      delete broken[field];
      expect(() => assertDeliverableItems([broken])).toThrow(
        BadRequestException,
      );
      expect(() => assertDeliverableItems([broken])).toThrow(field);
    }
  });

  it('必填字段全空白（trim 后为空）→ 400', () => {
    expect(() =>
      assertDeliverableItems([{ ...VALID_ITEM, location: '   ' }]),
    ).toThrow(BadRequestException);
  });

  it('空数组 = 清空清单，合法；非数组 → 400', () => {
    expect(() => assertDeliverableItems([])).not.toThrow();
    expect(() => assertDeliverableItems(undefined)).toThrow(
      BadRequestException,
    );
    expect(() => assertDeliverableItems({} as never)).toThrow(
      BadRequestException,
    );
  });
});

describe('ReleaseService.updateDeliverables（交付成果清单存取）', () => {
  it('存取 roundtrip：落 { items, updatedBy, updatedAt }，全量替换', async () => {
    const prisma = new StubPrisma();
    prisma.releases.push({ id: 'r-1', status: 'released', deliverables: null });
    const svc = buildService(prisma);

    const saved = await svc.updateDeliverables(
      'r-1',
      [{ ...VALID_ITEM }],
      'user-1',
    );
    const shape = saved.deliverables as Record<string, any>;
    expect(shape.items).toEqual([{ ...VALID_ITEM }]);
    expect(shape.updatedBy).toBe('user-1');
    expect(typeof shape.updatedAt).toBe('string');

    // 全量替换：二次保存覆盖旧 items
    await svc.updateDeliverables('r-1', [], 'user-2');
    const replaced = prisma.releases[0].deliverables as Record<string, any>;
    expect(replaced.items).toEqual([]);
    expect(replaced.updatedBy).toBe('user-2');
  });

  it('released 态仍可补录（发布 ≠ 记录终止）；发版不存在 → 404', async () => {
    const prisma = new StubPrisma();
    prisma.releases.push({
      id: 'r-2',
      status: 'released',
      releasedAt: new Date('2026-09-17T00:00:00Z'),
      deliverables: null,
    });
    const svc = buildService(prisma);

    const saved = await svc.updateDeliverables(
      'r-2',
      [{ ...VALID_ITEM, receiver: '运维值班' }],
      'user-1',
    );
    expect((saved.deliverables as Record<string, any>).items).toHaveLength(1);

    await expect(
      svc.updateDeliverables('r-ghost', [], 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('服务层兜底校验：必填缺失 → 400 且不落库', async () => {
    const prisma = new StubPrisma();
    prisma.releases.push({ id: 'r-3', status: 'draft', deliverables: null });
    const svc = buildService(prisma);

    await expect(
      svc.updateDeliverables(
        'r-3',
        [{ name: '缺验证方式' } as never],
        'user-1',
      ),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.releases[0].deliverables).toBeNull();
  });
});
