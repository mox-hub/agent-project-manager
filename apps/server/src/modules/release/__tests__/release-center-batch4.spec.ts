import { ContractEngineService } from '../../contract/contract-engine.service';
import { ContractBindingService } from '../../contract/contract-binding.service';
import {
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from '../../contract/contract-workspace-fs';
import { ReleaseService } from '../release.service';

/**
 * CAP-K-03 批四（GAP-T-62）列表操作台补全：
 * listReleaseItems 卡点摘要投影（瘦身由 select 类型保证，桩不重复验证）、
 * previewChangelog 只读预览、approve/reopen 跃迁的 status.changed 事件。
 * （门禁通过/发布链路的跃迁事件断言已在 release-service/release-publish
 * 既有用例的事件序列断言中覆盖。）
 */

class StubPrisma {
  releases: Record<string, any>[] = [];
  proposals: Record<string, any>[] = [];
  private idSeq = 0;
  repoRow: { workspacePath?: string } | null = null;

  get release() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    const withRelations = (row: Record<string, any>) => ({
      ...row,
      milestone: null,
      hotfixOf: null,
    });
    return {
      create: async ({ data }: any) => {
        const row = {
          plannedAt: null,
          platforms: null,
          upgradeNotes: null,
          hotfixOfId: null,
          milestoneId: null,
          scope: undefined,
          gateResult: undefined,
          releasedAt: null,
          createdAt: new Date('2026-10-02T00:00:00Z'),
          ...data,
          id: `release_${++svc.idSeq}`,
          status: 'draft',
        };
        svc.releases.push(row);
        return withRelations(row);
      },
      findUnique: async ({ where }: any) => {
        const found = svc.releases.find((r) => r.id === where.id) ?? null;
        return found ? withRelations(found) : null;
      },
      update: async ({ where, data }: any) => {
        const found = svc.releases.find((r) => r.id === where.id);
        if (!found) throw new Error(`release ${where.id} not found`);
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) found[k] = v;
        }
        return withRelations(found);
      },
      findMany: async ({ where }: any = {}) =>
        svc.releases
          .filter((r) =>
            where?.projectId ? r.projectId === where.projectId : true,
          )
          .sort(
            (a, b) =>
              (b.releasedAt ?? b.createdAt).getTime() -
              (a.releasedAt ?? a.createdAt).getTime(),
          )
          .map((r) => withRelations(r)),
    };
  }

  get decisionProposal() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findMany: async ({ where }: any) =>
        svc.proposals.filter(
          (p) =>
            (!where?.kind || p.kind === where.kind) &&
            (!where?.status || p.status === where.status),
        ),
      findFirst: async () => null,
      create: async ({ data }: any) => {
        const row = { ...data, id: `dp_${svc.proposals.length + 1}` };
        svc.proposals.push(row);
        return row;
      },
    };
  }

  get repository() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return { findFirst: async () => svc.repoRow };
  }
  get project() {
    return { findUnique: async () => ({ name: '示例项目' }) };
  }
  get projectWorkspace() {
    return { findUnique: async () => null };
  }
  get contractFileBinding() {
    return {
      findUnique: async () => null,
      upsert: async () => ({}),
      findMany: async () => [],
    };
  }
}

class StubBus {
  events: { type: string; payload: unknown }[] = [];
  publish(type: string, payload?: unknown) {
    this.events.push({ type, payload });
  }
}

class StubFs implements ContractWorkspaceFs {
  files = new Map<string, string>();
  async readFileIfExists(absPath: string) {
    return this.files.get(absPath) ?? null;
  }
  async writeFile(absPath: string, content: string) {
    this.files.set(absPath, content);
  }
}

function buildHarness() {
  const prisma = new StubPrisma();
  const bus = new StubBus();
  const fs = new StubFs();
  const engine = new ContractEngineService();
  const resolver = new ContractWorkspaceResolver(prisma as never);
  const bindings = new ContractBindingService(
    prisma as never,
    engine,
    resolver,
    fs,
    bus,
  );
  const gate = {
    runGate: async () => ({
      passed: true,
      ranAt: '',
      checks: [{ key: 'scope', label: '发布范围', passed: true, detail: 'ok' }],
    }),
  };
  const version = { assertVersionUsable: async () => {} };
  const releases = new ReleaseService(
    prisma as never,
    bus as never,
    engine,
    bindings,
    resolver,
    fs,
    gate as never,
    version as never,
  );
  return { prisma, bus, releases };
}

describe('CAP-K-03 批四：listReleaseItems 卡点摘要投影', () => {
  it('gateFailedChecks = 未过检查项计数；hasPendingApproval 只对列表内发版为真', async () => {
    const { prisma, releases } = buildHarness();
    const a = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      createdBy: 'user-1',
    });
    const b = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.1.0',
      createdBy: 'user-1',
    });
    await releases.createRelease({
      projectId: 'proj-2',
      version: '0.9.0',
      createdBy: 'user-1',
    });
    // a：门禁跑过且 1 项未过；b：未跑门禁
    await prisma.release.update({
      where: { id: a.id },
      data: {
        gateResult: {
          passed: false,
          ranAt: '',
          checks: [
            { key: 'scope', label: '发布范围', passed: true, detail: 'ok' },
            { key: 'ci', label: 'CI 证据', passed: false, detail: '有失败结论' },
            { key: 'audit', label: '审计', passed: false, detail: '有 red' },
          ],
        },
      },
    });
    // 跨项目 pending 卡不应命中 proj-1 列表（交集口径）
    prisma.proposals.push(
      { id: 'dp-a', kind: 'release', status: 'pending', payload: { releaseId: a.id } },
      { id: 'dp-x', kind: 'release', status: 'pending', payload: { releaseId: 'release_其他' } },
    );

    const items = (await releases.listReleaseItems('proj-1')) as Array<
      Record<string, any>
    >;
    expect(items).toHaveLength(2);
    const byId = new Map(items.map((i) => [i.id, i]));
    expect(byId.get(a.id)!.gateFailedChecks).toBe(2);
    expect(byId.get(a.id)!.hasPendingApproval).toBe(true);
    expect(byId.get(b.id)!.gateFailedChecks).toBeNull();
    expect(byId.get(b.id)!.hasPendingApproval).toBe(false);
    // 跨项目 pending 卡被交集过滤
    expect(items.every((i) => i.id !== 'release_其他')).toBe(true);
  });

  it('previewChangelog：返回再生全文（只读不写文件）', async () => {
    const { releases } = buildHarness();
    const r = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      name: '首个版本',
      createdBy: 'user-1',
    });
    const preview = (await releases.previewChangelog(r.id)) as Record<
      string,
      string
    >;
    expect(preview.releaseId).toBe(r.id);
    expect(preview.projectId).toBe('proj-1');
    expect(preview.content).toContain('## [1.0.0]');
    expect(preview.content).toContain('**首个版本**');
    expect(preview.content).toContain('apm:derived-file:changelog');
  });
});

describe('CAP-K-03 批四：状态跃迁事件（approve/reopen）', () => {
  it('approve：gated → approved 发 status.changed；reopenDraft：failed → draft 发 status.changed', async () => {
    const { prisma, bus, releases } = buildHarness();
    const r = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      createdBy: 'user-1',
    });
    // 手动置 gated（跳过门禁桩路径，聚焦 approve 跃迁）
    await prisma.release.update({
      where: { id: r.id },
      data: { status: 'gated' },
    });
    bus.events.length = 0;

    await releases.approve(r.id, 'user-2');
    expect(bus.events.map((e) => e.type)).toEqual([
      'release.status.changed',
      'release.approved',
    ]);
    expect(bus.events[0].payload).toMatchObject({
      releaseId: r.id,
      projectId: 'proj-1',
      from: 'gated',
      to: 'approved',
    });

    await prisma.release.update({
      where: { id: r.id },
      data: { status: 'failed' },
    });
    bus.events.length = 0;
    await releases.reopenDraft(r.id);
    expect(bus.events.map((e) => e.type)).toEqual(['release.status.changed']);
    expect(bus.events[0].payload).toMatchObject({
      releaseId: r.id,
      from: 'failed',
      to: 'draft',
    });
  });
});
