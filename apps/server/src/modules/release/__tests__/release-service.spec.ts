import { resolve } from 'node:path';
import { ContractEngineService } from '../../contract/contract-engine.service';
import { ContractBindingService } from '../../contract/contract-binding.service';
import {
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from '../../contract/contract-workspace-fs';
import { ReleaseService } from '../release.service';

/**
 * 1b 发版闭环测试（内存桩）：发版 → release.created → CHANGELOG 单向再生
 * → 整文件指纹基线；手改派生文件检出冲突；重新导出恢复。
 */

class StubPrisma {
  releases: Record<string, unknown>[] = [];
  bindings: Record<string, unknown>[] = [];
  proposals: Record<string, unknown>[] = [];
  publishedEvents: unknown[] = [];
  private idSeq = 0;
  repoRow: { workspacePath?: string; localPath?: string } | null = {
    workspacePath: '/ws',
  };

  get release() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      create: async ({ data }: any) => {
        const row = {
          ...data,
          id: `release_${++svc.idSeq}`,
          status: 'draft',
          releasedAt: null,
          gitTag: null,
          createdAt: new Date('2026-09-08T00:00:00Z'),
        };
        svc.releases.push(row);
        return row;
      },
      findUnique: async ({ where }: any) =>
        svc.releases.find((r) => r.id === where.id) ?? null,
      findFirst: async ({ where }: any) =>
        svc.releases.find((r: any) =>
          Object.entries(where ?? {}).every(
            ([k, v]) => !k.startsWith('NOT') && r[k] === v,
          ),
        ) ?? null,
      update: async ({ where, data }: any) => {
        const found = svc.releases.find((r) => r.id === where.id);
        if (!found) throw new Error(`release ${where.id} not found`);
        Object.assign(found, data);
        return found;
      },
      findMany: async () =>
        [...svc.releases].sort((a, b) => {
          const da = (a.releasedAt ?? a.createdAt) as Date;
          const db = (b.releasedAt ?? b.createdAt) as Date;
          return db.getTime() - da.getTime();
        }),
    };
  }

  get contractFileBinding() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findUnique: async ({ where }: any) => {
        if (where.id) {
          return svc.bindings.find((b) => b.id === where.id) ?? null;
        }
        return (
          svc.bindings.find(
            (b) =>
              b.projectId === where.projectId_fileType.projectId &&
              b.fileType === where.projectId_fileType.fileType,
          ) ?? null
        );
      },
      upsert: async ({ where, update, create }: any) => {
        const found = svc.bindings.find(
          (b) =>
            b.projectId === where.projectId_fileType.projectId &&
            b.fileType === where.projectId_fileType.fileType,
        );
        if (found) {
          Object.assign(found, update);
          return found;
        }
        const row = {
          ...create,
          id: `binding_${++svc.idSeq}`,
          conflictState: null,
          lastWriter: null,
        };
        svc.bindings.push(row);
        return row;
      },
      update: async ({ where, data }: any) => {
        const found = svc.bindings.find((b) => b.id === where.id);
        if (!found) throw new Error(`binding ${where.id} not found`);
        Object.assign(found, data);
        return found;
      },
      findMany: async () => svc.bindings,
    };
  }

  get decisionProposal() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      create: async ({ data }: any) => {
        const row = { ...data, id: `dp_${svc.proposals.length + 1}` };
        svc.proposals.push(row);
        return row;
      },
    };
  }

  get project() {
    return {
      findUnique: async () => ({ name: '示例项目' }),
    };
  }

  get repository() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findFirst: async () => svc.repoRow,
    };
  }

  get projectWorkspace() {
    // 解析器三级回退的第 3 级：项目级工作区（本桩无登记 → null 诚实降级）
    return {
      findUnique: async () => null,
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
  get(absPath: string) {
    return this.files.get(absPath);
  }
  set(absPath: string, content: string) {
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
  );
  // 驱动型发版子服务在本闭环测试中为透传桩（各自有独立 spec）
  const gate = {
    runGate: async () => ({ passed: true, ranAt: '', checks: [] }),
  };
  const version = {
    assertVersionUsable: async () => {},
    recommendVersion: async () => ({
      recommended: '0.0.1',
      base: '0.0.0',
      releaseType: 'patch',
      basis: 'stub',
    }),
  };
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
  return { prisma, bus, fs, engine, resolver, bindings, releases };
}

const CHANGELOG_PATH = resolve('/ws', 'CHANGELOG.md');

describe('ReleaseService（1b：Release 实体 + CHANGELOG 单向导出）', () => {
  it('generateChangelog：版本倒序、含版本号与日期、带派生声明头', async () => {
    const { releases, prisma } = buildHarness();
    const r1 = await releases.createRelease({
      projectId: 'proj-1',
      version: '0.1.0',
      notes: '首个版本。',
      createdBy: 'user-1',
    });
    const r2 = await releases.createRelease({
      projectId: 'proj-1',
      version: '0.2.0',
      name: '契约层',
      notes: '新增契约绑定。',
      createdBy: 'user-1',
    });
    // 模拟发布
    await prisma.release.update({
      where: { id: r1.id },
      data: {
        status: 'released',
        releasedAt: new Date('2026-09-01T00:00:00Z'),
      },
    });
    await prisma.release.update({
      where: { id: r2.id },
      data: {
        status: 'released',
        releasedAt: new Date('2026-09-08T00:00:00Z'),
      },
    });

    const md = await releases.generateChangelog('proj-1');
    expect(md).toContain('<!-- apm:derived-file:changelog');
    expect(md.indexOf('## [0.2.0] - 2026-09-08')).toBeLessThan(
      md.indexOf('## [0.1.0] - 2026-09-01'),
    );
    expect(md).toContain('**契约层**');
    expect(md).toContain('新增契约绑定。');
  });

  it('publishRelease：发布并经 message-bus 发出 release.created', async () => {
    const { releases, bus } = buildHarness();
    const r = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      createdBy: 'user-1',
    });
    await releases.publishRelease(r.id as string, 'v1.0.0');
    expect(bus.events).toHaveLength(1);
    expect(bus.events[0].type).toBe('release.created');
  });

  it('exportChangelog：写入文件、登记 binding（managed/system）并记整文件指纹基线', async () => {
    const { releases, fs, bindings, engine, prisma } = buildHarness();
    const r = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      notes: '发版说明。',
      createdBy: 'user-1',
    });
    await releases.publishRelease(r.id as string);
    const result = await releases.exportChangelog('proj-1');

    expect(result.exported).toBe(true);
    const md = fs.get(CHANGELOG_PATH)!;
    expect(md).toContain('# Changelog');
    expect(md).toContain('## [1.0.0]');
    const binding = prisma.bindings.find((b) => b.fileType === 'changelog');
    expect(binding?.syncMode).toBe('managed');
    expect(binding?.truthOwner).toBe('system');
    expect(binding?.baseline).toBe(engine.checksum(md));
    // 对齐检查：文件未动 → aligned
    const report = await bindings.checkAlignment('proj-1', 'changelog');
    expect(report.state).toBe('aligned');
  });

  it('手改派生文件 → 升级派生型冲突提案；重新导出恢复对齐', async () => {
    const { releases, fs, bindings, prisma } = buildHarness();
    const r = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      createdBy: 'user-1',
    });
    await releases.publishRelease(r.id as string);
    await releases.exportChangelog('proj-1');

    // 人工手改导出文件
    fs.set(
      CHANGELOG_PATH,
      fs.get(CHANGELOG_PATH)!.replace('# Changelog', '# 我的手改日志'),
    );
    const report = await bindings.checkAlignment('proj-1', 'changelog');
    expect(report.state).toBe('conflicted');
    expect(report.proposalId).toBe('dp_1');
    const proposal = prisma.proposals[0] as Record<string, any>;
    expect(proposal.payload.derived).toBe(true);
    // 未决冲突不重复建提案
    await bindings.checkAlignment('proj-1', 'changelog');
    expect(prisma.proposals).toHaveLength(1);

    // 重新导出（accept_db 的派生型等价动作）→ 冲突清除、文件恢复平台真相
    const reexport = await releases.exportChangelog('proj-1');
    expect(reexport.exported).toBe(true);
    expect(fs.get(CHANGELOG_PATH)).toContain('# Changelog');
    const realigned = await bindings.checkAlignment('proj-1', 'changelog');
    expect(realigned.state).toBe('aligned');
  });

  it('无工作区：exportChangelog 诚实跳过', async () => {
    const harness = buildHarness();
    harness.prisma.repoRow = null;
    const result = await harness.releases.exportChangelog('proj-1');
    expect(result).toEqual({ exported: false, reason: 'no_workspace' });
  });

  it('accept_db 对派生型绑定给出明确引导（走重新导出）', async () => {
    const { releases, bindings, prisma } = buildHarness();
    const r = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      createdBy: 'user-1',
    });
    await releases.publishRelease(r.id as string);
    await releases.exportChangelog('proj-1');
    const binding = prisma.bindings.find((b) => b.fileType === 'changelog');
    await expect(
      bindings.resolveConflict(binding!.id as string, 'accept_db'),
    ).rejects.toThrow('重新导出');
  });
});
