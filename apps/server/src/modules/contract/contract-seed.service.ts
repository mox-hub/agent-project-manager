import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { ContractEngineService } from './contract-engine.service';
import {
  ContractBindingService,
  ContractFileType,
  ContractSyncMode,
  ManagedBlockRecord,
} from './contract-binding.service';
import {
  CONTRACT_WORKSPACE_FS,
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from './contract-workspace-fs';

export interface SeedFileResult {
  path: string;
  action:
    | 'created'
    | 'updated'
    | 'skipped_unchanged'
    | 'skipped_existing'
    | 'skipped_no_workspace';
  bindingId?: string;
}

export interface SeedResult {
  projectId: string;
  workspaceRoot: string | null;
  files: SeedFileResult[];
}

const GENERATOR = 'seed:v1';

/**
 * 契约三件套种生（v2 纪要 §16 切片 1a）：
 * AGENTS.md 托管区间镜像（managed）、CLAUDE.md 物化薄别名、CHANGELOG.md
 * 过渡态骨架（detached，等 1b Release 实体接管）。
 * 元规则：模板只在种生时刻生成一次，已有同名托管区间以文件侧为准（adopted），
 * 之后一切变更走托管区同步——绝不重新生成整份文件。
 */
@Injectable()
export class ContractSeedService {
  private readonly logger = new Logger(ContractSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: ContractEngineService,
    private readonly bindings: ContractBindingService,
    private readonly resolver: ContractWorkspaceResolver,
    @Inject(CONTRACT_WORKSPACE_FS) private readonly fs: ContractWorkspaceFs,
  ) {}

  async seedProjectContractFiles(projectId: string): Promise<SeedResult> {
    const [project, root] = await Promise.all([
      this.prisma.project.findUnique({ where: { id: projectId } }),
      this.resolver.resolveRoot(projectId),
    ]);
    if (!project) throw new Error(`项目不存在: ${projectId}`);
    if (!root) {
      return {
        projectId,
        workspaceRoot: null,
        files: [
          {
            path: 'AGENTS.md',
            action: 'skipped_no_workspace',
          },
        ],
      };
    }

    const files: SeedFileResult[] = [];
    files.push(await this.seedAgents(projectId, project, root));
    files.push(await this.seedClaudeAlias(projectId, root));
    files.push(await this.seedChangelog(projectId, root));
    return { projectId, workspaceRoot: root, files };
  }

  private async seedAgents(
    projectId: string,
    project: { id: string; name: string; description: string | null },
    root: string,
  ): Promise<SeedFileResult> {
    const relPath = 'AGENTS.md';
    const absPath = this.resolver.join(root, relPath);
    const existing = await this.fs.readFileIfExists(absPath);

    const updates = this.buildAgentsBlocks(project);
    const frontmatter = {
      apm_project_id: projectId,
      apm_file_type: 'agents',
      apm_sync_mode: 'managed',
    };

    if (existing === null) {
      const base = this.engine.setApmFrontmatter('', frontmatter);
      const content = this.engine.applyManagedBlocks(base, updates, {
        appendMissing: true,
      });
      await this.fs.writeFile(absPath, content);
      const binding = await this.upsertAgentsBinding(
        projectId,
        relPath,
        'managed',
        updates.map((u) => ({ id: u.id, source: u.content })),
        this.engine.checksum(content),
      );
      return { path: relPath, action: 'created', bindingId: binding.id };
    }

    // 已有文件：apm_ 字段并入 frontmatter；缺失区间追加；已有同名区间以文件为准
    let next = this.engine.setApmFrontmatter(existing, frontmatter);
    const diffs = this.engine.compareManagedBlocks(next, updates);
    const missingIds = new Set(
      diffs.filter((d) => d.state === 'missing_in_file').map((d) => d.id),
    );
    const adopted: ManagedBlockRecord[] = diffs
      .filter((d) => d.state === 'file_differs')
      .map((d) => ({
        id: d.id,
        source: d.fileSide ?? '',
        generator: GENERATOR,
      }));
    const appendUpdates = updates.filter((u) => missingIds.has(u.id));
    if (appendUpdates.length > 0) {
      next = this.engine.applyManagedBlocks(next, appendUpdates, {
        appendMissing: true,
      });
    }

    const action: SeedFileResult['action'] =
      next === existing ? 'skipped_unchanged' : 'updated';
    if (action === 'updated') {
      await this.fs.writeFile(absPath, next);
    }
    const finalDiffs = this.engine.compareManagedBlocks(next, updates);
    const managedBlocks: ManagedBlockRecord[] = finalDiffs.map((d) => {
      if (d.state === 'file_differs') {
        const hit = adopted.find((a) => a.id === d.id);
        return {
          id: d.id,
          source: hit?.source ?? d.fileSide ?? '',
          generator: GENERATOR,
        };
      }
      return {
        id: d.id,
        source: updates.find((u) => u.id === d.id)?.content ?? '',
        generator: GENERATOR,
      };
    });
    const binding = await this.upsertAgentsBinding(
      projectId,
      relPath,
      'managed',
      managedBlocks,
      this.engine.checksum(next),
    );
    return { path: relPath, action, bindingId: binding.id };
  }

  /** CLAUDE.md 物化薄别名：仅缺失时生成；已存在的人类文件绝不触碰。 */
  private async seedClaudeAlias(
    projectId: string,
    root: string,
  ): Promise<SeedFileResult> {
    const relPath = 'CLAUDE.md';
    const absPath = this.resolver.join(root, relPath);
    const existing = await this.fs.readFileIfExists(absPath);
    if (existing !== null) {
      const binding = await this.upsertSimpleBinding(
        projectId,
        'claude_alias',
        relPath,
        'managed',
      );
      return {
        path: relPath,
        action: 'skipped_existing',
        bindingId: binding.id,
      };
    }
    const content = [
      '# CLAUDE.md — 派生别名',
      '',
      '本文件由 APM 生成，是 `AGENTS.md` 的派生别名（apm 托管，请勿直接编辑）。',
      'AI 指令请编辑 `AGENTS.md`；本文件将随其托管区变更而重写。',
      '',
      '@AGENTS.md',
      '',
    ].join('\n');
    await this.fs.writeFile(absPath, content);
    const binding = await this.upsertSimpleBinding(
      projectId,
      'claude_alias',
      relPath,
      'managed',
    );
    return { path: relPath, action: 'created', bindingId: binding.id };
  }

  /** CHANGELOG.md 过渡态（1b 前手工真相）：缺则补骨架，绑定 detached。 */
  private async seedChangelog(
    projectId: string,
    root: string,
  ): Promise<SeedFileResult> {
    const relPath = 'CHANGELOG.md';
    const absPath = this.resolver.join(root, relPath);
    const existing = await this.fs.readFileIfExists(absPath);
    let action: SeedFileResult['action'] = 'skipped_existing';
    if (existing === null) {
      const content = [
        '# Changelog',
        '',
        `项目发版日志。`,
        '',
        '> APM 过渡说明：Release 联动导出尚未启用，本文件暂由人工维护。',
        '',
      ].join('\n');
      await this.fs.writeFile(absPath, content);
      action = 'created';
    }
    const binding = await this.upsertSimpleBinding(
      projectId,
      'changelog',
      relPath,
      'detached',
    );
    return { path: relPath, action, bindingId: binding.id };
  }

  private buildAgentsBlocks(project: {
    id: string;
    name: string;
    description: string | null;
  }) {
    return [
      {
        id: 'project-intro',
        content: `# ${project.name}\n\n${project.description ?? ''}`.trim(),
      },
    ];
  }

  private async upsertAgentsBinding(
    projectId: string,
    filePath: string,
    syncMode: ContractSyncMode,
    blocks: { id: string; source: string }[],
    baseline: string,
  ) {
    return this.bindings.upsertBinding({
      projectId,
      fileType: 'agents',
      filePath,
      syncMode,
      managedBlocks: blocks.map((b) => ({ ...b, generator: GENERATOR })),
      truthOwner: 'file_git',
      baseline,
    });
  }

  private async upsertSimpleBinding(
    projectId: string,
    fileType: ContractFileType,
    filePath: string,
    syncMode: ContractSyncMode,
  ) {
    return this.bindings.upsertBinding({
      projectId,
      fileType,
      filePath,
      syncMode,
      truthOwner: fileType === 'claude_alias' ? 'system' : 'file_git',
    });
  }
}
