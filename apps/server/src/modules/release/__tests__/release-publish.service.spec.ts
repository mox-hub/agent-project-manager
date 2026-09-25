import { BadRequestException } from '@nestjs/common';
import { ReleasePublishService } from '../release-publish.service';

/**
 * 发布执行（approved → publishing → released / failed）行为锚点：
 * 仅 approved 可发布（状态机 + CAS 抢占）；成功经 message-bus 发出
 * release.created；无工作区时三步骤诚实跳过。
 */

interface ReleaseRow {
  id: string;
  projectId: string;
  version: string;
  status: string;
  gitTag: string | null;
  failureReason: string | null;
  executionLog: unknown[];
  releasedAt: Date | null;
}

class StubPrisma {
  releases = new Map<string, ReleaseRow>();
  claimed = false;
  /** 模拟读后抢占前状态被并发迁移（updateMany 命中不了） */
  casMiss = false;

  seed(row: Partial<ReleaseRow> & { id: string }): ReleaseRow {
    const full: ReleaseRow = {
      projectId: 'proj-1',
      version: '1.0.0',
      status: 'draft',
      gitTag: null,
      failureReason: null,
      executionLog: [],
      releasedAt: null,
      ...row,
    };
    this.releases.set(full.id, full);
    return full;
  }

  #releaseApi?: {
    findUnique: (q: { where: { id: string } }) => Promise<ReleaseRow | null>;
    updateMany: (q: {
      where: { id: string; status: string };
      data: Partial<ReleaseRow>;
    }) => Promise<{ count: number }>;
    update: (q: {
      where: { id: string };
      data: Partial<ReleaseRow>;
    }) => Promise<ReleaseRow>;
  };

  get release() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    this.#releaseApi ??= {
      findUnique: async ({ where }) => svc.releases.get(where.id) ?? null,
      updateMany: async ({ where, data }) => {
        const row = svc.releases.get(where.id);
        if (svc.casMiss || !row || row.status !== where.status) {
          return { count: 0 };
        }
        Object.assign(row, data);
        svc.claimed = true;
        return { count: 1 };
      },
      update: async ({ where, data }) => {
        const row = svc.releases.get(where.id);
        if (!row) throw new Error(`release ${where.id} not found`);
        Object.assign(row, data);
        return row;
      },
    };
    return this.#releaseApi;
  }
}

class StubBus {
  events: { type: string; payload: unknown }[] = [];
  publish(type: string, payload?: unknown) {
    this.events.push({ type, payload });
  }
}

function buildService(prisma: StubPrisma, bus: StubBus) {
  // 无工作区：CHANGELOG/tag/GitHub 三步骤全部诚实跳过（各有独立实机覆盖）
  const releases = {
    exportChangelog: async () => ({ exported: false, reason: 'no_workspace' }),
  };
  const resolver = { resolveRoot: async () => null };
  const githubSdk = {};
  const service = new ReleasePublishService(
    prisma as never,
    bus as never,
    releases as never,
    resolver as never,
    githubSdk as never,
  );
  return service;
}

describe('ReleasePublishService（发布执行状态机）', () => {
  it('draft 直接发布 → 400（发布必须先过门禁与审批转 approved）', async () => {
    const prisma = new StubPrisma();
    const bus = new StubBus();
    prisma.seed({ id: 'r1', status: 'draft' });
    const service = buildService(prisma, bus);

    await expect(service.publish('r1')).rejects.toThrow(BadRequestException);
    expect(bus.events).toHaveLength(0);
    expect(prisma.claimed).toBe(false);
  });

  it('approved 发布：无工作区三步诚实跳过 → released，并发出 release.created', async () => {
    const prisma = new StubPrisma();
    const bus = new StubBus();
    prisma.seed({ id: 'r2', status: 'approved' });
    const service = buildService(prisma, bus);

    const published = await service.publish('r2');
    expect(published.status).toBe('released');
    expect(published.releasedAt).toBeTruthy();
    const log = published.executionLog as { step: string; status: string }[];
    expect(log.map((l) => l.step)).toEqual([
      'changelog',
      'tag',
      'github-release',
    ]);
    expect(log.every((l) => l.status === 'skipped')).toBe(true);
    expect(bus.events).toEqual([
      {
        type: 'release.created',
        payload: { projectId: 'proj-1', releaseId: 'r2' },
      },
    ]);
  });

  it('CAS 抢占失败（approved 被并发迁移，读到与抢占间状态漂移）→ 400，不发事件', async () => {
    const prisma = new StubPrisma();
    const bus = new StubBus();
    prisma.seed({ id: 'r3', status: 'approved' });
    prisma.casMiss = true;
    const service = buildService(prisma, bus);

    await expect(service.publish('r3')).rejects.toThrow('状态已变化');
    expect(bus.events).toHaveLength(0);
    expect(prisma.releases.get('r3')!.status).toBe('approved');
  });
});
