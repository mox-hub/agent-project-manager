import { BadRequestException } from '@nestjs/common';
import { ContractEngineService } from '../../contract/contract-engine.service';
import { ContractBindingService } from '../../contract/contract-binding.service';
import {
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from '../../contract/contract-workspace-fs';
import { ReleaseService } from '../release.service';
import { deriveReleaseChannel } from '../release-version.service';

/**
 * CAP-K-03 批三发版中心扩展（GAP-T-59）：
 * 计划时间/平台/升级说明/热修血缘的落库校验、门禁 upgrade-notes 注记检查、
 * CHANGELOG 再生扩展段、版本通道推导纯函数。
 */

interface ReleaseRow {
  id: string;
  projectId: string;
  version: string;
  name: string | null;
  notes: string | null;
  status: string;
  plannedAt: Date | null;
  platforms: string[] | null;
  upgradeNotes: string | null;
  hotfixOfId: string | null;
  milestoneId: string | null;
  scope: unknown;
  gateResult: unknown;
  releasedAt: Date | null;
  createdAt: Date;
}

class StubPrisma {
  releases: ReleaseRow[] = [];
  private idSeq = 0;
  repoRow: { workspacePath?: string; localPath?: string } | null = null;

  get release() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    const withRelations = (row: ReleaseRow) => ({
      ...row,
      milestone: null,
      hotfixOf: row.hotfixOfId
        ? (svc.releases.find((r) => r.id === row.hotfixOfId) ?? null)
        : null,
    });
    return {
      create: async ({ data }: Record<string, any>) => {
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
        } as ReleaseRow;
        svc.releases.push(row);
        return withRelations(row);
      },
      findUnique: async ({ where }: Record<string, any>) => {
        const found = svc.releases.find((r) => r.id === where.id) ?? null;
        return found ? withRelations(found) : null;
      },
      update: async ({ where, data }: Record<string, any>) => {
        const found = svc.releases.find((r) => r.id === where.id);
        if (!found) throw new Error(`release ${where.id} not found`);
        // Prisma 语义：undefined = 不动（显式 null 才是清除）
        for (const [k, v] of Object.entries(data)) {
          if (v !== undefined) (found as Record<string, unknown>)[k] = v;
        }
        return withRelations(found);
      },
      // checkUpgradeNotes 调用形态：{ projectId, status: 'released', id: { not } }
      findMany: async ({ where }: Record<string, any> = {}) =>
        svc.releases
          .filter((r) => {
            if (where?.projectId && r.projectId !== where.projectId)
              return false;
            if (where?.status && r.status !== where.status) return false;
            if (where?.id?.not && r.id === where.id.not) return false;
            return true;
          })
          .sort(
            (a, b) =>
              (b.releasedAt ?? b.createdAt).getTime() -
              (a.releasedAt ?? a.createdAt).getTime(),
          )
          .map((r) => withRelations(r)),
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
    runGate: async () => ({ passed: true, ranAt: '', checks: [] }),
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
  return { prisma, bus, fs, releases };
}

function upgradeCheck(result: {
  checks: { key: string; passed: boolean; detail: string }[];
}) {
  return result.checks.find((c) => c.key === 'upgrade-notes')!;
}

describe('CAP-K-03 批三：新字段落库与校验', () => {
  it('createRelease 落计划时间/平台/升级说明/热修血缘（plannedAt 转 Date）', async () => {
    const { releases, prisma } = buildHarness();
    const base = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.2.0',
      createdBy: 'user-1',
    });
    await prisma.release.update({
      where: { id: base.id },
      data: { status: 'released' },
    });

    const r = (await releases.createRelease({
      projectId: 'proj-1',
      version: '1.2.1',
      createdBy: 'user-1',
      plannedAt: '2026-10-20T00:00:00Z',
      platforms: ['windows', 'web'],
      upgradeNotes: '无破坏性变更',
      hotfixOfId: base.id,
    })) as ReleaseRow;

    expect(r.plannedAt).toEqual(new Date('2026-10-20T00:00:00Z'));
    expect(r.platforms).toEqual(['windows', 'web']);
    expect(r.upgradeNotes).toBe('无破坏性变更');
    expect(r.hotfixOfId).toBe(base.id);
  });

  it('createRelease 热修基线三拒：不存在 / 跨项目 / 非 released；非法平台 400', async () => {
    const { releases, prisma } = buildHarness();
    const other = await releases.createRelease({
      projectId: 'proj-2',
      version: '0.9.0',
      createdBy: 'user-1',
    });
    await prisma.release.update({
      where: { id: other.id },
      data: { status: 'released' },
    });
    const draftSame = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      createdBy: 'user-1',
    });

    await expect(
      releases.createRelease({
        projectId: 'proj-1',
        version: '1.0.1',
        createdBy: 'user-1',
        hotfixOfId: 'release_missing',
      }),
    ).rejects.toThrow(BadRequestException);
    await expect(
      releases.createRelease({
        projectId: 'proj-1',
        version: '1.0.1',
        createdBy: 'user-1',
        hotfixOfId: other.id,
      }),
    ).rejects.toThrow('跨项目血缘被拒绝');
    await expect(
      releases.createRelease({
        projectId: 'proj-1',
        version: '1.0.1',
        createdBy: 'user-1',
        hotfixOfId: draftSame.id,
      }),
    ).rejects.toThrow('已发布（released）');
    await expect(
      releases.createRelease({
        projectId: 'proj-1',
        version: '1.0.1',
        createdBy: 'user-1',
        platforms: ['dos' as never],
      }),
    ).rejects.toThrow('未知发布平台');
  });

  it('updateDraft：plannedAt null / platforms 空数组清字段；热修基线不能指向自身', async () => {
    const { releases } = buildHarness();
    const r = (await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      createdBy: 'user-1',
      plannedAt: '2026-10-20T00:00:00Z',
      platforms: ['web'],
      upgradeNotes: '初版说明',
    })) as ReleaseRow;

    const cleared = (await releases.updateDraft(r.id, {
      plannedAt: null,
      platforms: [],
      upgradeNotes: undefined,
    })) as ReleaseRow;
    expect(cleared.plannedAt).toBeNull();
    expect(cleared.platforms).toEqual([]);
    expect(cleared.upgradeNotes).toBe('初版说明'); // undefined = 不动

    await expect(
      releases.updateDraft(r.id, { hotfixOfId: r.id }),
    ).rejects.toThrow('不能指向自身');
  });
});

describe('CAP-K-03 批三：门禁 upgrade-notes 注记检查', () => {
  it('无已发布基线 → 诚实跳过；非 major 递增 → 无强制要求', async () => {
    const { releases } = buildHarness();
    const first = await releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      createdBy: 'user-1',
    });
    let result = await releases.submitGate(first.id);
    expect(upgradeCheck(result).passed).toBe(true);
    expect(upgradeCheck(result).detail).toContain('无已发布基线');

    // 基线 1.0.0 released 后，1.1.0 非 major → 无强制要求
    const h = buildHarness();
    const base = await h.releases.createRelease({
      projectId: 'proj-1',
      version: '1.0.0',
      createdBy: 'user-1',
    });
    await h.prisma.release.update({
      where: { id: base.id },
      data: { status: 'released' },
    });
    const minor = await h.releases.createRelease({
      projectId: 'proj-1',
      version: '1.1.0',
      createdBy: 'user-1',
    });
    result = await h.releases.submitGate(minor.id);
    expect(upgradeCheck(result).passed).toBe(true);
    expect(upgradeCheck(result).detail).toContain('非 major 递增');
  });

  it('major 缺说明 → 注记不阻断（passed true + 提示补全）；已补 → 确认通过', async () => {
    const h = buildHarness();
    const base = await h.releases.createRelease({
      projectId: 'proj-1',
      version: '1.5.0',
      createdBy: 'user-1',
    });
    await h.prisma.release.update({
      where: { id: base.id },
      data: { status: 'released' },
    });
    // 缺说明的 major（门禁过后转 gated，不再可 updateDraft，故两个版本各验一支）
    const majorMissing = await h.releases.createRelease({
      projectId: 'proj-1',
      version: '2.0.0',
      createdBy: 'user-1',
    });
    let result = await h.releases.submitGate(majorMissing.id);
    expect(upgradeCheck(result).passed).toBe(true);
    expect(upgradeCheck(result).detail).toContain('注记阶段不阻断');

    const majorWithNotes = await h.releases.createRelease({
      projectId: 'proj-1',
      version: '2.1.0',
      createdBy: 'user-1',
      upgradeNotes: '配置格式迁移见文档',
    });
    result = await h.releases.submitGate(majorWithNotes.id);
    expect(upgradeCheck(result).passed).toBe(true);
    expect(upgradeCheck(result).detail).toContain('已包含升级');
  });
});

describe('CAP-K-03 批三：CHANGELOG 再生扩展段', () => {
  it('热修血缘行与升级注意段随版本块渲染，无则不渲染', async () => {
    const h = buildHarness();
    const base = await h.releases.createRelease({
      projectId: 'proj-1',
      version: '1.2.0',
      createdBy: 'user-1',
      notes: '常规版本。',
    });
    await h.prisma.release.update({
      where: { id: base.id },
      data: {
        status: 'released',
        releasedAt: new Date('2026-10-01T00:00:00Z'),
      },
    });
    const hotfix = (await h.releases.createRelease({
      projectId: 'proj-1',
      version: '1.2.1',
      createdBy: 'user-1',
      notes: '修复崩溃。',
      hotfixOfId: base.id,
      upgradeNotes: '直接覆盖安装即可。',
    })) as ReleaseRow;

    const md = await h.releases.generateChangelog('proj-1');
    expect(md).toContain('## [1.2.1]');
    expect(md).toContain('> 修复自 [1.2.0] 的缺陷');
    expect(md).toContain('### 升级注意事项');
    expect(md).toContain('直接覆盖安装即可。');
    // 常规版本块无这两个扩展段
    const baseBlock = md.split('## [1.2.0]')[1] ?? '';
    expect(baseBlock).not.toContain('修复自');
    expect(baseBlock).not.toContain('升级注意事项');
    void hotfix;
  });
});

describe('deriveReleaseChannel（版本通道推导纯函数）', () => {
  it('alpha/beta/rc/stable 四档；畸形后缀回落 stable', () => {
    expect(deriveReleaseChannel('1.2.3-alpha.1')).toBe('alpha');
    expect(deriveReleaseChannel('1.2.3-alpha')).toBe('alpha');
    expect(deriveReleaseChannel('1.2.3-beta')).toBe('beta');
    expect(deriveReleaseChannel('1.2.3-beta.2')).toBe('beta');
    expect(deriveReleaseChannel('1.2.3-rc.1')).toBe('rc');
    expect(deriveReleaseChannel('1.2.3')).toBe('stable');
    expect(deriveReleaseChannel('1.2.3-dev.1')).toBe('stable');
    expect(deriveReleaseChannel('garbage')).toBe('stable');
  });
});
