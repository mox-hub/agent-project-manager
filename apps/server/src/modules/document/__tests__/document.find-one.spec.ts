import { NotFoundException } from '@nestjs/common';
import { DocumentService } from '../document.service';

/**
 * apm:// 短号解析接线（v2 纪要 §13）：findOne 兼容 `D{seq}` shortId。
 */

class StubPrisma {
  docs: Array<{ id: string; shortId: string | null; isDeleted: boolean }> = [];
  document = {
    findUnique: async ({ where }: any) =>
      this.docs.find((d) => d.id === where.id) ?? null,
    findFirst: async ({ where }: any) =>
      this.docs.find(
        (d) => d.shortId === where.shortId && d.isDeleted === false,
      ) ?? null,
  };
}

function makeService(docs: StubPrisma['docs']) {
  const prisma = new StubPrisma();
  prisma.docs = docs;
  return new DocumentService(
    prisma as never,
    {} as never,
    {} as never,
  ) as unknown as { findOne: (id: string) => Promise<{ id: string }> };
}

describe('DocumentService.findOne apm:// 短号解析', () => {
  it('短号 D17 解析到对应文档（isDeleted 排除）', async () => {
    const svc = makeService([
      { id: 'cuid-1', shortId: 'D17', isDeleted: false },
      { id: 'cuid-2', shortId: 'D18', isDeleted: true },
    ]);
    expect(((await svc.findOne('D17')) as { id: string }).id).toBe('cuid-1');
  });

  it('cuid 查找不受影响；未知短号抛 404', async () => {
    const svc = makeService([
      { id: 'cuid-1', shortId: 'D17', isDeleted: false },
    ]);
    expect(((await svc.findOne('cuid-1')) as { id: string }).id).toBe('cuid-1');
    await expect(svc.findOne('D99')).rejects.toThrow(NotFoundException);
  });
});
