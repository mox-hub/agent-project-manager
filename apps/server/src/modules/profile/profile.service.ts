import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import {
  CreateProfileAtomDto,
  ProfileAtomDto,
  ProfileBriefingDto,
  ProfileResponseDto,
  ProfileSchemaResponseDto,
  RejectProfileAtomDto,
  UpdateProfileAtomDto,
} from './dto/profile.dto';
import {
  PROFILE_SLOTS,
  PROFILE_SLOT_DEFINITIONS,
  isProfileSlot,
} from './profile-slot.registry';
import {
  ARCHAEOLOGY_MAX_CONFIDENCE,
  PROFILE_DRAFT_ARTIFACT_TYPE,
  tryParseProfileDraft,
  validateProfileDraft,
} from './profile-draft.schema';

/**
 * 项目档案（v2 纪要切片 1）：槽位 schema（内置注册表）+ MemoryAtom 原子。
 * 铁律沿用 memory 模块：真相在数据库只有代码能写；AI 产出只落 working 草稿，
 * 人批准才 consolidated；替换留 supersededById 链，驳回 archived 留证据。
 * 完备度 = 槽位内生效原子 ≥ 1（纯派生量，不落库）。
 */

const PROFILE_REGISTRY_VERSION = '1';

type AtomRow = {
  id: string;
  scope: string;
  type: string;
  slot: string | null;
  content: string;
  confidence: number;
  refs: unknown;
  sourceEventId: string | null;
  sourceType: string | null;
  lifecycle: string;
  pinned: boolean;
  supersededById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function toAtomDto(row: AtomRow): ProfileAtomDto {
  return {
    id: row.id,
    slot: row.slot ?? '',
    type: row.type,
    content: row.content,
    confidence: row.confidence,
    lifecycle: row.lifecycle,
    sourceType: row.sourceType ?? undefined,
    sourceEventId: row.sourceEventId ?? undefined,
    pinned: row.pinned,
    supersededById: row.supersededById ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function normalizeContent(content: string): string {
  return content.trim().replace(/\s+/g, ' ');
}

@Injectable()
export class ProfileService {
  private readonly logger = new Logger(ProfileService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** 内置槽位注册表（只读；自定义 schema 后置切片） */
  getSchema(): ProfileSchemaResponseDto {
    return {
      version: PROFILE_REGISTRY_VERSION,
      slots: Object.values(PROFILE_SLOT_DEFINITIONS).map((d) => ({
        key: d.key,
        label: d.label,
        description: d.description,
        atomType: d.atomType,
      })),
    };
  }

  /** 槽位聚合：生效原子 + 待审草稿 + 完备度（纯派生，每次现算） */
  async getProfile(projectId: string): Promise<ProfileResponseDto> {
    const scope = `project:${projectId}`;
    const rows = (await this.prisma.memoryAtom.findMany({
      where: {
        scope,
        slot: { in: [...PROFILE_SLOTS] },
        lifecycle: { in: ['working', 'consolidated', 'archived'] },
      },
      orderBy: { updatedAt: 'desc' },
    })) as AtomRow[];

    // 替换链归并：被 superseded 的原子不再出现在任何分组（证据仍可查）
    const superseded = new Set(
      rows.filter((r) => r.supersededById).map((r) => r.id),
    );
    const active = rows.filter((r) => !superseded.has(r.id));

    const slots = PROFILE_SLOTS.map((slot) => {
      const def = PROFILE_SLOT_DEFINITIONS[slot];
      const owned = active.filter((r) => r.slot === slot);
      const consolidated = owned.filter((r) => r.lifecycle === 'consolidated');
      const lastRefreshedAt = consolidated[0]?.updatedAt?.toISOString();
      return {
        slot,
        label: def.label,
        description: def.description,
        filled: consolidated.length > 0,
        atoms: consolidated.map(toAtomDto),
        drafts: owned.filter((r) => r.lifecycle === 'working').map(toAtomDto),
        lastRefreshedAt,
      };
    });

    return {
      projectId,
      slots,
      completeness: {
        filled: slots.filter((s) => s.filled).length,
        total: slots.length,
      },
    };
  }

  /** 人写档案原子：直接生效（consolidated），同槽位同内容去重提升置信度 */
  async createAtom(
    dto: CreateProfileAtomDto,
    userId: string,
  ): Promise<ProfileAtomDto> {
    if (!isProfileSlot(dto.slot)) {
      throw new NotFoundException(`未知档案槽位：${dto.slot}`);
    }
    const scope = `project:${dto.projectId}`;
    const def = PROFILE_SLOT_DEFINITIONS[dto.slot];
    const content = normalizeContent(dto.content);

    const existing = (await this.prisma.memoryAtom.findFirst({
      where: {
        scope,
        slot: dto.slot,
        content,
        lifecycle: { in: ['working', 'consolidated'] },
      },
    })) as AtomRow | null;
    if (existing) {
      const updated = (await this.prisma.memoryAtom.update({
        where: { id: existing.id },
        data: {
          confidence: Math.max(existing.confidence, dto.confidence ?? 1),
        },
      })) as AtomRow;
      return toAtomDto(updated);
    }

    const created = (await this.prisma.memoryAtom.create({
      data: {
        scope,
        slot: dto.slot,
        type: def.atomType,
        content,
        confidence: dto.confidence ?? 1,
        refs: (dto.refs ?? undefined) as unknown as undefined,
        sourceType: 'manual',
        lifecycle: 'consolidated',
        createdBy: userId,
      },
    })) as AtomRow;

    await this.recordActivity(dto.projectId, created.id, userId, 'created', {
      slot: dto.slot,
      content,
      source: 'user',
    });
    return toAtomDto(created);
  }

  /**
   * 人编辑：生效侧新建原子替换，旧值留痕（lifecycle=archived + supersededById）。
   * 编辑即最高置信度、最高权威（v2 纪要 §4.2）。
   */
  async editAtom(
    atomId: string,
    dto: UpdateProfileAtomDto,
    userId: string,
  ): Promise<ProfileAtomDto> {
    const old = (await this.prisma.memoryAtom.findUnique({
      where: { id: atomId },
    })) as AtomRow | null;
    if (!old || old.lifecycle === 'pruned') {
      throw new NotFoundException(`档案原子 ${atomId} 不存在`);
    }
    if (!old.slot || !isProfileSlot(old.slot)) {
      throw new NotFoundException(`原子 ${atomId} 不是档案原子`);
    }

    const content = normalizeContent(dto.content);
    const replacement = await this.prisma.$transaction(async (tx) => {
      const created = await tx.memoryAtom.create({
        data: {
          scope: old.scope,
          slot: old.slot,
          type: old.type,
          content,
          confidence: 1,
          refs: old.refs ?? undefined,
          sourceType: 'manual',
          lifecycle: 'consolidated',
          createdBy: userId,
        },
      });
      await tx.memoryAtom.update({
        where: { id: old.id },
        data: { lifecycle: 'archived', supersededById: created.id },
      });
      return created;
    });

    await this.recordActivity(
      old.scope.replace(/^project:/, ''),
      replacement.id,
      userId,
      'updated',
      { slot: old.slot, previousAtomId: old.id, source: 'user' },
    );
    return toAtomDto(replacement as AtomRow);
  }

  /** 批准 AI 草稿：working → consolidated */
  async approveAtom(atomId: string, userId: string): Promise<ProfileAtomDto> {
    const row = (await this.prisma.memoryAtom.findUnique({
      where: { id: atomId },
    })) as AtomRow | null;
    if (!row || row.lifecycle === 'pruned') {
      throw new NotFoundException(`档案原子 ${atomId} 不存在`);
    }
    if (row.lifecycle !== 'working') {
      throw new NotFoundException(
        `原子 ${atomId} 当前为 ${row.lifecycle}，仅草稿（working）可批准`,
      );
    }
    const updated = (await this.prisma.memoryAtom.update({
      where: { id: atomId },
      data: {
        lifecycle: 'consolidated',
        confidence: Math.max(row.confidence, 0.8),
      },
    })) as AtomRow;

    await this.recordActivity(
      row.scope.replace(/^project:/, ''),
      row.id,
      userId,
      'approved',
      { slot: row.slot ?? '', source: 'user' },
    );
    return toAtomDto(updated);
  }

  /** 驳回草稿：working → archived（证据可查，不再注入） */
  async rejectAtom(
    atomId: string,
    dto: RejectProfileAtomDto,
    userId: string,
  ): Promise<ProfileAtomDto> {
    const row = (await this.prisma.memoryAtom.findUnique({
      where: { id: atomId },
    })) as AtomRow | null;
    if (!row || row.lifecycle === 'pruned') {
      throw new NotFoundException(`档案原子 ${atomId} 不存在`);
    }
    if (row.lifecycle !== 'working') {
      throw new NotFoundException(
        `原子 ${atomId} 当前为 ${row.lifecycle}，仅草稿（working）可驳回`,
      );
    }
    const updated = (await this.prisma.memoryAtom.update({
      where: { id: atomId },
      data: { lifecycle: 'archived' },
    })) as AtomRow;

    await this.recordActivity(
      row.scope.replace(/^project:/, ''),
      row.id,
      userId,
      'rejected',
      { slot: row.slot ?? '', reason: dto.reason, source: 'user' },
    );
    return toAtomDto(updated);
  }

  /** 删除已生效原子：consolidated → pruned（活动流留痕，档案页不再展示/注入） */
  async deleteAtom(atomId: string, userId: string): Promise<ProfileAtomDto> {
    const row = (await this.prisma.memoryAtom.findUnique({
      where: { id: atomId },
    })) as AtomRow | null;
    if (!row || row.lifecycle === 'pruned') {
      throw new NotFoundException(`档案原子 ${atomId} 不存在`);
    }
    if (!row.slot || !isProfileSlot(row.slot)) {
      throw new NotFoundException(`原子 ${atomId} 不是档案原子`);
    }
    if (row.lifecycle !== 'consolidated') {
      throw new NotFoundException(
        `原子 ${atomId} 当前为 ${row.lifecycle}，仅已生效（consolidated）可删除，草稿请走驳回`,
      );
    }
    const updated = (await this.prisma.memoryAtom.update({
      where: { id: atomId },
      data: { lifecycle: 'pruned' },
    })) as AtomRow;

    await this.recordActivity(
      row.scope.replace(/^project:/, ''),
      row.id,
      userId,
      'deleted',
      { slot: row.slot ?? '', source: 'user' },
    );
    return toAtomDto(updated);
  }

  /**
   * 考古产物落草稿（拉取式消化：前端轮询到执行完成后显式触发，写入不在热路径）。
   * 读 Execution 的 profile_draft artifact → schema 校验 → 每条落 working 草稿
   * （confidence 上限 0.6、sourceType=tool、sourceEventId=executionId 溯源）。
   */
  async ingestArchaeology(
    projectId: string,
    executionId: string,
    userId: string,
  ): Promise<{
    created: number;
    skipped: number;
    atoms: ProfileAtomDto[];
    summary?: string;
  }> {
    const execution = await this.prisma.execution.findUnique({
      where: { id: executionId },
      include: { artifacts: true },
    });
    if (!execution || execution.projectId !== projectId) {
      throw new NotFoundException(`执行项 ${executionId} 不存在`);
    }

    // 产物优先取专用 artifact（metadata 内联对象 / content JSON），回落 output 内嵌 JSON；
    // 各形态先过 tryParseProfileDraft 容错（围栏 JSON / 包裹字段 / 文本内嵌）
    const artifact = execution.artifacts.find(
      (a) => a.artifactType === PROFILE_DRAFT_ARTIFACT_TYPE,
    );
    let raw: unknown = tryParseProfileDraft(
      (artifact?.metadata as unknown) ?? execution.output,
    );
    if (!artifact?.metadata && artifact?.content) {
      try {
        raw = tryParseProfileDraft(JSON.parse(artifact.content));
      } catch {
        raw = tryParseProfileDraft(execution.output);
      }
    }
    const parsed = validateProfileDraft(raw);
    if (!parsed.valid) {
      throw new NotFoundException(
        `考古产物校验失败：${parsed.errors.join('；')}`,
      );
    }

    const scope = `project:${projectId}`;
    const created: ProfileAtomDto[] = [];
    let skipped = 0;

    for (const group of parsed.draft.slots) {
      if (!isProfileSlot(group.slot)) continue;
      const def = PROFILE_SLOT_DEFINITIONS[group.slot];
      for (const item of group.items) {
        const content = normalizeContent(item.content);
        const existing = await this.prisma.memoryAtom.findFirst({
          where: {
            scope,
            slot: group.slot,
            content,
            lifecycle: { in: ['working', 'consolidated'] },
          },
        });
        if (existing) {
          skipped += 1;
          continue;
        }
        const refs = item.evidence
          ? ([{ kind: 'evidence', id: item.evidence }] as unknown as undefined)
          : undefined;
        const row = (await this.prisma.memoryAtom.create({
          data: {
            scope,
            slot: group.slot,
            type: def.atomType,
            content,
            confidence: Math.min(
              item.confidence ?? ARCHAEOLOGY_MAX_CONFIDENCE,
              ARCHAEOLOGY_MAX_CONFIDENCE,
            ),
            refs,
            sourceEventId: executionId,
            sourceType: 'tool',
            lifecycle: 'working',
            createdBy: userId,
          },
        })) as AtomRow;
        created.push(toAtomDto(row));
      }
    }

    await this.recordActivity(projectId, executionId, userId, 'created', {
      slot: 'archaeology',
      content:
        parsed.draft.summary ??
        `考古产物入库：新建 ${created.length} 条草稿，去重跳过 ${skipped} 条`,
      source: 'ai',
      entityTypeOverride: 'execution',
    });

    this.logger.log(
      `Archaeology ingest ${executionId}: created=${created.length} skipped=${skipped}`,
    );
    return {
      created: created.length,
      skipped,
      atoms: created,
      summary: parsed.draft.summary,
    };
  }

  /**
   * 项目简报（v2 纪要切片 2）：事实层现查 + 生效档案原子 + 派生活动热点。
   * 统计口径只吃事实表，档案原子仅作叙述补充（管道分离，§3.3）；
   * 活跃热点纯派生不落库（§3.1）：git 提交热力 × 近 14 天 issue 密度（按标签）。
   */
  async getBriefing(projectId: string): Promise<ProfileBriefingDto> {
    const activeKeys = (
      await this.prisma.statusDefinition.findMany({
        where: { projectId, type: 'task', isFinal: false },
        select: { key: true },
      })
    ).map((s) => s.key);
    const [
      issueTotal,
      issueActive,
      runningExecutions,
      recentActivities,
      profile,
      hotspots,
    ] = await Promise.all([
      this.prisma.issue.count({ where: { projectId } }),
      this.prisma.issue.count({
        where: {
          projectId,
          ...(activeKeys.length > 0 ? { status: { in: activeKeys } } : {}),
        },
      }),
      this.prisma.execution.count({
        where: { projectId, status: 'in_progress' },
      }),
      this.prisma.activity.findMany({
        where: { projectId },
        orderBy: { createdAt: 'desc' },
        take: 3,
        select: { type: true, summary: true, createdAt: true },
      }),
      this.getProfile(projectId),
      this.getActivityHotspots(projectId, activeKeys),
    ]);

    const atoms = profile.slots.flatMap((s) => s.atoms);
    return {
      projectId,
      completeness: profile.completeness,
      facts: {
        issues: { total: issueTotal, active: issueActive },
        runningExecutions,
        recentActivities: recentActivities.map((a) => ({
          type: a.type,
          summary: a.summary,
          at: a.createdAt.toISOString(),
        })),
        hotspots,
      },
      atoms,
    };
  }

  /**
   * 派生活动热点（不存，每次现算——v2 纪要 §3.1「活跃热点每变」）：
   * 近 14 天 git 提交数 + 活跃 issue 标签密度 Top5 + 目录级提交热力 Top5
   * （CommitFile 路径首段聚合；查无 git 数据时如实给 0/空）。
   */
  private async getActivityHotspots(
    projectId: string,
    activeKeys: string[],
  ): Promise<{
    windowDays: number;
    commits: number;
    activeIssues: number;
    tags: Array<{ tag: string; activeIssues: number }>;
    dirs: Array<{ dir: string; touches: number }>;
  }> {
    const windowDays = 14;
    const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000);
    try {
      const repos = await this.prisma.repository.findMany({
        where: { projectId },
        select: { id: true },
      });
      const repoIds = repos.map((r) => r.id);
      const [commits, issueTags, changedFiles] = await Promise.all([
        repoIds.length > 0
          ? this.prisma.commit.count({
              where: {
                repoId: { in: repoIds },
                authorDate: { gte: since },
              },
            })
          : Promise.resolve(0),
        this.prisma.issueTag.findMany({
          where: {
            issue: {
              projectId,
              updatedAt: { gte: since },
              ...(activeKeys.length > 0 ? { status: { in: activeKeys } } : {}),
            },
          },
          include: { tag: { select: { name: true } } },
        }),
        repoIds.length > 0
          ? this.prisma.commitFile.findMany({
              where: {
                commit: { repoId: { in: repoIds }, authorDate: { gte: since } },
              },
              select: { path: true },
              take: 2000,
            })
          : Promise.resolve([] as Array<{ path: string }>),
      ]);
      const counts = new Map<string, number>();
      for (const it of issueTags) {
        if (!it.tag?.name) continue;
        counts.set(it.tag.name, (counts.get(it.tag.name) ?? 0) + 1);
      }
      const tags = [...counts.entries()]
        .map(([tag, activeIssues]) => ({ tag, activeIssues }))
        .sort((a, b) => b.activeIssues - a.activeIssues)
        .slice(0, 5);

      // 目录热力：路径首段聚合（无目录前缀的散文件归「(root)」）
      const dirCounts = new Map<string, number>();
      for (const f of changedFiles) {
        const firstSlash = f.path.indexOf('/');
        const dir = firstSlash > 0 ? f.path.slice(0, firstSlash) : '(root)';
        dirCounts.set(dir, (dirCounts.get(dir) ?? 0) + 1);
      }
      const dirs = [...dirCounts.entries()]
        .map(([dir, touches]) => ({ dir, touches }))
        .sort((a, b) => b.touches - a.touches)
        .slice(0, 5);

      return {
        windowDays,
        commits,
        activeIssues: issueTags.length,
        tags,
        dirs,
      };
    } catch (err) {
      this.logger.warn(
        `hotspot derive failed: ${err instanceof Error ? err.message : String(err)}`,
      );
      return { windowDays, commits: 0, activeIssues: 0, tags: [], dirs: [] };
    }
  }

  /** 档案事件进活动流（溯源 + 溯源链的展示兜底） */
  private async recordActivity(
    projectId: string,
    entityId: string,
    userId: string,
    type: string,
    meta: {
      slot: string;
      content?: string;
      reason?: string;
      previousAtomId?: string;
      source: 'user' | 'ai' | 'system';
      entityTypeOverride?: string;
    },
  ): Promise<void> {
    try {
      await this.prisma.activity.create({
        data: {
          entityType: meta.entityTypeOverride ?? 'profile_atom',
          entityId,
          projectId,
          actorId: meta.source === 'user' ? userId : null,
          type,
          summary: meta.content
            ? `档案[${meta.slot}] ${type}: ${meta.content.slice(0, 80)}`
            : `档案[${meta.slot}] ${type}${meta.reason ? `：${meta.reason}` : ''}`,
          source: meta.source,
          metadata: {
            slot: meta.slot,
            ...(meta.reason ? { reason: meta.reason } : {}),
            ...(meta.previousAtomId
              ? { previousAtomId: meta.previousAtomId }
              : {}),
          },
        },
      });
    } catch (err) {
      // 事件是旁路：失败不影响主流程
      this.logger.warn(
        `profile activity record failed: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
