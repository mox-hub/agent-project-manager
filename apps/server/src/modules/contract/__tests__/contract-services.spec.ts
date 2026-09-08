import { resolve } from 'node:path';
import { ContractEngineService } from '../contract-engine.service';
import {
  ContractBindingService,
  ManagedBlockRecord,
} from '../contract-binding.service';
import { ContractSeedService, SeedResult } from '../contract-seed.service';
import {
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from '../contract-workspace-fs';

/**
 * 种生与对齐/冲突闭环测试（内存桩，不打真库）。
 */

class StubPrisma {
  bindings: Record<string, unknown>[] = [];
  proposals: Record<string, unknown>[] = [];
  private idSeq = 0;
  private dpSeq = 0;
  repoRow: { workspacePath?: string; localPath?: string } | null = {
    workspacePath: '/ws',
  };
  projectRow: Record<string, unknown> | null = {
    id: 'proj-1',
    name: '示例项目',
    description: '一个用于测试的项目',
  };

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
    };
  }

  get decisionProposal() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      create: async ({ data }: any) => {
        const row = { ...data, id: `dp_${++svc.dpSeq}` };
        svc.proposals.push(row);
        return row;
      },
    };
  }

  get project() {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const svc = this;
    return {
      findUnique: async () => svc.projectRow,
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
    return {
      findUnique: async () => null,
    };
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
  const fs = new StubFs();
  const engine = new ContractEngineService();
  const resolver = new ContractWorkspaceResolver(prisma as never);
  const bindings = new ContractBindingService(
    prisma as never,
    engine,
    resolver,
    fs,
  );
  const seed = new ContractSeedService(
    prisma as never,
    engine,
    bindings,
    resolver,
    fs,
  );
  return { prisma, fs, engine, resolver, bindings, seed };
}

// 与 ContractWorkspaceResolver.join 一致的本地绝对路径（Windows 下 resolve 会补盘符）
const FILES = {
  agents: resolve('/ws', 'AGENTS.md'),
  claude: resolve('/ws', 'CLAUDE.md'),
  changelog: resolve('/ws', 'CHANGELOG.md'),
};

describe('ContractSeedService', () => {
  it('全新项目种出三件套：AGENTS 托管镜像 + CLAUDE 薄别名 + CHANGELOG detached', async () => {
    const { seed, fs, prisma } = buildHarness();
    const result = await seed.seedProjectContractFiles('proj-1');

    expect(result.workspaceRoot).toBe('/ws');
    expect(result.files.map((f) => f.action)).toEqual([
      'created',
      'created',
      'created',
    ]);

    const agents = fs.get(FILES.agents)!;
    expect(agents).toContain('apm_project_id: proj-1');
    expect(agents).toContain('apm_sync_mode: managed');
    expect(agents).toContain('<!-- BEGIN apm:managed:project-intro -->');
    expect(agents).toContain('# 示例项目');
    expect(agents).toContain('一个用于测试的项目');

    const claude = fs.get(FILES.claude)!;
    expect(claude).toContain('@AGENTS.md');
    expect(claude).toContain('派生别名');

    expect(fs.get(FILES.changelog)!).toContain('# Changelog');
    const changelogBinding = prisma.bindings.find(
      (b) => b.fileType === 'changelog',
    );
    expect(changelogBinding?.syncMode).toBe('detached');
  });

  it('二次种生幂等：文件字节不变，动作 skipped', async () => {
    const { seed, fs } = buildHarness();
    await seed.seedProjectContractFiles('proj-1');
    const before = fs.get(FILES.agents)!;
    const result: SeedResult = await seed.seedProjectContractFiles('proj-1');
    expect(fs.get(FILES.agents)).toBe(before);
    expect(result.files.find((f) => f.path === 'AGENTS.md')?.action).toBe(
      'skipped_unchanged',
    );
    expect(result.files.find((f) => f.path === 'CLAUDE.md')?.action).toBe(
      'skipped_existing',
    );
  });

  it('已有 AGENTS.md：人工 frontmatter 保留、托管区间追加、自由区不动', async () => {
    const { seed, fs } = buildHarness();
    const manual = [
      '---',
      'title: 项目手册',
      'tags: [demo]',
      '---',
      '',
      '# 自定义标题',
      '',
      '开发者自由撰写的内容。',
    ].join('\n');
    fs.set(FILES.agents, manual);

    const result = await seed.seedProjectContractFiles('proj-1');
    expect(result.files.find((f) => f.path === 'AGENTS.md')?.action).toBe(
      'updated',
    );

    const next = fs.get(FILES.agents)!;
    expect(next).toContain('title: 项目手册');
    expect(next).toContain('开发者自由撰写的内容。');
    expect(next).toContain('<!-- BEGIN apm:managed:project-intro -->');
    expect(next).toContain('apm_project_id: proj-1');
  });

  it('已有同名托管区间内容不同：以文件侧为准（adopted）', async () => {
    const { seed, fs, prisma } = buildHarness();
    const preexisting = [
      '<!-- BEGIN apm:managed:project-intro -->',
      '# 用户自己写的简介',
      '<!-- END apm:managed:project-intro -->',
    ].join('\n');
    fs.set(FILES.agents, `---\napm_project_id: proj-1\n---\n\n${preexisting}`);

    await seed.seedProjectContractFiles('proj-1');
    const binding = prisma.bindings.find((b) => b.fileType === 'agents');
    const blocks = binding?.managedBlocks as ManagedBlockRecord[];
    expect(blocks).toHaveLength(1);
    expect(blocks[0].source).toContain('用户自己写的简介');
  });

  it('格式化纳管（adoptOnly）：仅并入 frontmatter、不注入区间、绑定 synced 指纹', async () => {
    const { seed, fs, prisma } = buildHarness();
    const manual = [
      '---',
      'title: 项目手册',
      'tags: [demo]',
      '---',
      '',
      '# 自定义标题',
      '',
      '开发者自由撰写的内容。',
    ].join('\n');
    fs.set(FILES.agents, manual);

    const result = await seed.seedProjectContractFiles('proj-1', {
      adoptOnly: true,
      fileTypes: ['agents'],
    });
    expect(result.files[0].action).toBe('adopted');

    const next = fs.get(FILES.agents)!;
    expect(next).toContain('title: 项目手册');
    expect(next).toContain('apm_project_id: proj-1');
    expect(next).toContain('# 自定义标题');
    expect(next).not.toContain('<!-- BEGIN apm:managed:');

    const binding = prisma.bindings.find((b) => b.fileType === 'agents');
    expect(binding?.syncMode).toBe('synced');
    expect(typeof binding?.baseline).toBe('string');
    expect((binding?.managedBlocks as ManagedBlockRecord[]) ?? []).toHaveLength(
      0,
    );
  });

  it('格式化纳管幂等：frontmatter 已齐则 skipped_unchanged', async () => {
    const { seed, fs } = buildHarness();
    fs.set(FILES.agents, '# 自定义标题\n\n自由内容。');
    await seed.seedProjectContractFiles('proj-1', {
      adoptOnly: true,
      fileTypes: ['agents'],
    });
    const rerun = await seed.seedProjectContractFiles('proj-1', {
      adoptOnly: true,
      fileTypes: ['agents'],
    });
    expect(rerun.files[0].action).toBe('skipped_unchanged');
  });

  it('无仓库工作区：诚实降级 skipped_no_workspace', async () => {
    const harness = buildHarness();
    harness.prisma.repoRow = null;
    const result = await harness.seed.seedProjectContractFiles('proj-1');
    expect(result.workspaceRoot).toBeNull();
    expect(result.files[0].action).toBe('skipped_no_workspace');
  });
});

describe('ContractBindingService 对齐与冲突闭环', () => {
  async function setupWithBinding() {
    const h = buildHarness();
    await h.seed.seedProjectContractFiles('proj-1');
    return h;
  }

  it('aligned：文件与 DB 一致时刷新 baseline', async () => {
    const { bindings, prisma } = await setupWithBinding();
    const report = await bindings.checkAlignment('proj-1', 'agents');
    expect(report.state).toBe('aligned');
    const binding = prisma.bindings.find((b) => b.fileType === 'agents');
    expect(binding?.baseline).toBeTruthy();
    expect(prisma.proposals).toHaveLength(0);
  });

  it('managed 下文件侧被手改 → 升级 DecisionProposal 且不静默覆盖', async () => {
    const { fs, bindings, prisma } = await setupWithBinding();
    const tampered = fs
      .get(FILES.agents)!
      .replace('# 示例项目', '# 被手改的标题');
    fs.set(FILES.agents, tampered);

    const report = await bindings.checkAlignment('proj-1', 'agents');
    expect(report.state).toBe('conflicted');
    expect(report.proposalId).toBe('dp_1');
    // 文件未被系统覆写
    expect(fs.get(FILES.agents)).toBe(tampered);
    // 提案 payload 携带两侧证据
    const proposal = prisma.proposals[0] as Record<string, any>;
    expect(proposal.kind).toBe('contract_conflict');
    expect(proposal.payload.blocks[0].fileSide).toContain('被手改的标题');
    expect(proposal.payload.blocks[0].dbSide).toContain('# 示例项目');
    // 绑定进入冲突态；未决期间不重复建提案
    const binding = prisma.bindings.find((b) => b.fileType === 'agents');
    expect(binding?.conflictState).toBe('conflicted');
    const again = await bindings.checkAlignment('proj-1', 'agents');
    expect(again.proposalId).toBeUndefined();
    expect(prisma.proposals).toHaveLength(1);
  });

  it('resolveConflict accept_db：DB 真相写回文件并对齐', async () => {
    const { fs, engine, bindings, prisma } = await setupWithBinding();
    fs.set(FILES.agents, fs.get(FILES.agents)!.replace('# 示例项目', '# 手改'));
    await bindings.checkAlignment('proj-1', 'agents');

    const binding = prisma.bindings.find((b) => b.fileType === 'agents');
    await bindings.resolveConflict(binding!.id as string, 'accept_db');

    expect(fs.get(FILES.agents)).toContain('# 示例项目');
    const report = await bindings.checkAlignment('proj-1', 'agents');
    expect(report.state).toBe('aligned');
    expect(binding?.conflictState).toBeNull();
    expect(binding?.lastWriter).toBe('system');
    // 引擎校验：区间内容恢复为 DB source
    const blocks = binding?.managedBlocks as ManagedBlockRecord[];
    const diffs = engine.compareManagedBlocks(
      fs.get(FILES.agents)!,
      blocks.map((b) => ({ id: b.id, content: b.source })),
    );
    expect(diffs.every((d) => d.state === 'equal')).toBe(true);
  });

  it('resolveConflict accept_file：文件现值成为 DB 真相', async () => {
    const { fs, bindings, prisma } = await setupWithBinding();
    fs.set(
      FILES.agents,
      fs.get(FILES.agents)!.replace('# 示例项目', '# 保留手改'),
    );
    await bindings.checkAlignment('proj-1', 'agents');
    const binding = prisma.bindings.find((b) => b.fileType === 'agents');
    await bindings.resolveConflict(binding!.id as string, 'accept_file');

    const blocks = binding?.managedBlocks as ManagedBlockRecord[];
    expect(blocks[0].source).toContain('# 保留手改');
    const report = await bindings.checkAlignment('proj-1', 'agents');
    expect(report.state).toBe('aligned');
  });

  it('resolveConflict detach：转 detached 后对齐检查跳过', async () => {
    const { fs, bindings, prisma } = await setupWithBinding();
    fs.set(FILES.agents, fs.get(FILES.agents)!.replace('# 示例项目', '# 手改'));
    await bindings.checkAlignment('proj-1', 'agents');
    const binding = prisma.bindings.find((b) => b.fileType === 'agents');
    await bindings.resolveConflict(binding!.id as string, 'detach');
    expect(binding?.syncMode).toBe('detached');
    const report = await bindings.checkAlignment('proj-1', 'agents');
    expect(report.state).toBe('skipped_detached');
  });
});
