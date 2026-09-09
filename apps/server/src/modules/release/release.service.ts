import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { MessageBusService } from '../../core/message-bus/message-bus.service';
import {
  ContractBindingService,
  ContractFileType,
} from '../contract/contract-binding.service';
import { ContractEngineService } from '../contract/contract-engine.service';
import {
  CONTRACT_WORKSPACE_FS,
  ContractWorkspaceFs,
  ContractWorkspaceResolver,
} from '../contract/contract-workspace-fs';

export const CHANGELOG_FILE_PATH = 'CHANGELOG.md';

export interface CreateReleaseInput {
  projectId: string;
  version: string;
  name?: string;
  notes?: string;
  createdBy: string;
}

/**
 * 发版服务（契约与文档知识层 v2 纪要切片 1b）。
 * CHANGELOG 真相 = Release 实体集合，文件是单向投影：release.created
 * 事件触发全量再生（DB→文件，绝不反向导入）。
 */
@Injectable()
export class ReleaseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageBus: MessageBusService,
    private readonly engine: ContractEngineService,
    private readonly bindings: ContractBindingService,
    private readonly resolver: ContractWorkspaceResolver,
    @Inject(CONTRACT_WORKSPACE_FS) private readonly fs: ContractWorkspaceFs,
  ) {}

  createRelease(input: CreateReleaseInput) {
    return this.prisma.release.create({ data: input });
  }

  listReleases(projectId: string) {
    return this.prisma.release.findMany({
      where: { projectId },
      orderBy: [{ releasedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /**
   * 发版动作：draft → released，发布 release.created（经 message-bus），
   * 由订阅器驱动 CHANGELOG 再生。
   */
  async publishRelease(releaseId: string, gitTag?: string) {
    const release = await this.prisma.release.findUnique({
      where: { id: releaseId },
    });
    if (!release) throw new NotFoundException(`发版不存在: ${releaseId}`);
    const published = await this.prisma.release.update({
      where: { id: releaseId },
      data: {
        status: 'released',
        releasedAt: new Date(),
        gitTag: gitTag ?? release.gitTag,
      },
    });
    this.messageBus.publish('release.created', {
      projectId: release.projectId,
      releaseId,
    });
    return published;
  }

  /** 从 Release 集合全量生成 CHANGELOG 文本（Keep a Changelog 风格）。 */
  async generateChangelog(projectId: string): Promise<string> {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { name: true },
    });
    const releases = await this.listReleases(projectId);
    const lines = [
      '<!-- apm:derived-file:changelog 派生自 Release 实体，请勿手改；发版时自动再生 -->',
      '# Changelog',
      '',
      `${project?.name ?? '项目'}的发版日志。`,
    ];
    for (const release of releases) {
      const date = (release.releasedAt ?? release.createdAt)
        .toISOString()
        .slice(0, 10);
      lines.push('', `## [${release.version}] - ${date}`);
      if (release.name) lines.push('', `**${release.name}**`);
      if (release.notes) {
        lines.push('', release.notes.trimEnd());
      }
    }
    return `${lines.join('\n')}\n`;
  }

  /**
   * CHANGELOG 单向导出：无工作区则诚实跳过；写文件后经
   * recordDerivedExport 记录基线（冲突检测 = 整文件指纹）。
   */
  async exportChangelog(projectId: string): Promise<{
    exported: boolean;
    reason?: string;
    path?: string;
  }> {
    const root = await this.resolver.resolveRoot(projectId);
    if (!root) return { exported: false, reason: 'no_workspace' };
    const content = await this.generateChangelog(projectId);
    await this.fs.writeFile(
      this.resolver.join(root, CHANGELOG_FILE_PATH),
      content,
    );
    await this.bindings.upsertBinding({
      projectId,
      fileType: 'changelog' as ContractFileType,
      filePath: CHANGELOG_FILE_PATH,
      syncMode: 'managed',
      truthOwner: 'system',
      baseline: this.engine.checksum(content),
    });
    await this.bindings.recordDerivedExport(
      projectId,
      'changelog' as ContractFileType,
      this.engine.checksum(content),
    );
    return { exported: true, path: CHANGELOG_FILE_PATH };
  }
}
