import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../core/database/prisma.service';

/**
 * 受管知识注册表 DocRegistry（契约与文档知识层 v2 纪要 §8，切片 2 首步）。
 *
 * 注册表是**派生索引，永远可重建**：不新增任何持久化清单——Document /
 * DocumentFolder 表即真相，本服务只做两件事：
 *  1. rebuildIndex：回填派生字段（folder slug、document shortId、内容指纹），
 *     已有值绝不变更（slug/shortId 稳定性），checksum 按内容刷新；
 *  2. getCatalog / resolveRef：给人文档 UI、AI subset/digest、平台自用
 *     （contract check、dispatch 上下文）三个消费面提供统一取数入口，
 *     不各自爬目录。
 *
 * shortId 惯例与 issue-id.service 对齐：GlobalSequence 原子递增 + 事务内
 * 跳过被占用序号自愈；格式 D{seq}，kind 语义由 apm:// scheme 承载（§13）。
 */

export const DOC_SHORT_ID_SEQUENCE_KEY = 'document.shortId';

/** 首批治理角色（v2 纪要 §10 分批表）；V1 仅登记不强制 */
export const DOC_ROLES = [
  'charter',
  'spec',
  'design',
  'decision',
  'release-log',
  'reference',
] as const;
export type DocRole = (typeof DOC_ROLES)[number];

export interface DocRegistryEntry {
  docId: string;
  shortId: string | null;
  title: string;
  docRole: string | null;
  provenance: string;
  status: string;
  /** slug 路径（POSIX，根起）；根级文档为空串 */
  folderPath: string;
  sourceChecksum: string | null;
  digestPolicy: string;
  updatedAt: string;
}

// ==================== digest 类型（v2 纪要 §11） ====================

export interface DocAnchor {
  anchor: string;
  title: string;
  level: number;
}

export interface DocDigestProduced {
  summary: string;
  keyPoints?: string[];
  anchors?: DocAnchor[];
  model: string;
  projectId?: string;
}

/** 摘要生成器接口：V1 默认抽取式；AI 管线适配（streamText + AIUsageLog）同接口接入 */
export interface DigestGenerator {
  generate(input: {
    title: string;
    content: string;
  }): Promise<DocDigestProduced>;
}

export interface DocDigestView {
  summary: string;
  keyPoints: string[];
  anchors: DocAnchor[];
  sourceChecksum: string;
  model: string | null;
  generatedAt: string;
}

export interface DocStructuralSubset {
  docId: string;
  shortId: string | null;
  title: string;
  docRole: string | null;
  status: string;
  anchors: DocAnchor[];
  firstParagraph: string;
  wordCount: number;
  updatedAt: string;
  freshness: 'structural' | 'cached' | 'stale';
  digestPolicy: string;
}

export interface DocSubsetResult extends DocStructuralSubset {
  digest: DocDigestView | null;
}

/** CommonMark 标题 → GitHub 风格锚点（与前端渲染锚点规则一致的常用子集） */
export function headingToAnchor(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-');
}

/**
 * 抽取式摘要生成器（V1 默认）：首段作摘要、标题行作关键点。
 * 零 AI 成本的诚实降级——摘要质量弱于生成式，但满足「不装正文、可溯源、
 * checksum 失效重算」的全部物化语义。
 */
export class ExtractiveDigestGenerator implements DigestGenerator {
  async generate(input: {
    title: string;
    content: string;
  }): Promise<DocDigestProduced> {
    const paragraphs = input.content
      .split(/\n{2,}/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0 && !p.startsWith('#'));
    const keyPoints = (input.content.match(/^#{1,6}\s+(.+)$/gm) ?? [])
      .map((h) => h.replace(/^#{1,6}\s+/, '').trim())
      .slice(0, 5);
    const anchors = (input.content.match(/^#{1,6}\s+(.+)$/gm) ?? [])
      .map((h) => {
        const title = h.replace(/^#{1,6}\s+/, '').trim();
        return {
          anchor: headingToAnchor(title),
          title,
          level: (h.match(/^#+/) ?? ['#'])[0].length,
        };
      })
      .slice(0, 10);
    return {
      summary: paragraphs[0]?.slice(0, 300) ?? input.title,
      keyPoints,
      anchors,
      model: 'extractive:v1',
    };
  }
}

@Injectable()
export class DocRegistryService {
  private digestGenerator: DigestGenerator = new ExtractiveDigestGenerator();

  constructor(private readonly prisma: PrismaService) {}

  checksum(content: string): string {
    return createHash('sha256').update(content, 'utf8').digest('hex');
  }

  /**
   * slug 规则：保留中文（纪要 §5「中文可行」），空白/危险字符归一为 `-`；
   * Windows 禁用字符与路径分隔符一并替换；空结果回退 id 尾段。
   */
  slugify(name: string, fallbackId: string): string {
    const slug = name
      .trim()
      .toLowerCase()
      .replace(/[\s/\\:*?"<>|.]+/gu, '-')
      .replace(/-+/gu, '-')
      .replace(/^-|-$/gu, '');
    return slug || `folder-${fallbackId.slice(-6)}`;
  }

  /**
   * 重建索引：回填全部派生字段。幂等——重复执行除 checksum 随内容刷新外
   * 无任何变更；slug/shortId 一经分配永不变更（稳定 id 语义）。
   */
  async rebuildIndex(
    projectId: string,
  ): Promise<{ documents: number; folders: number }> {
    const folders = await this.prisma.documentFolder.findMany({
      where: { projectId },
      select: { id: true, name: true, slug: true },
    });
    let foldersFilled = 0;
    for (const folder of folders) {
      if (folder.slug) continue;
      const slug = await this.nextFolderSlug(projectId, folder, folders);
      await this.prisma.documentFolder.update({
        where: { id: folder.id },
        data: { slug },
      });
      foldersFilled += 1;
    }

    const documents = await this.prisma.document.findMany({
      where: { projectId, isDeleted: false },
      select: {
        id: true,
        content: true,
        shortId: true,
        sourceChecksum: true,
      },
    });
    let docsFilled = 0;
    for (const doc of documents) {
      const data: Record<string, unknown> = {};
      const checksum = this.checksum(doc.content);
      if (doc.sourceChecksum !== checksum) {
        data.sourceChecksum = checksum;
      }
      if (!doc.shortId) {
        data.shortId = await this.nextDocShortId(doc.id);
      }
      if (Object.keys(data).length > 0) {
        await this.prisma.document.update({
          where: { id: doc.id },
          data,
        });
        docsFilled += 1;
      }
    }
    return { documents: docsFilled, folders: foldersFilled };
  }

  /** AI catalog 导出（消费面 2/3 的取数入口，v2 纪要 §8）。 */
  async getCatalog(projectId: string): Promise<DocRegistryEntry[]> {
    const [documents, folders] = await Promise.all([
      this.prisma.document.findMany({
        where: { projectId, isDeleted: false },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          shortId: true,
          title: true,
          docRole: true,
          provenance: true,
          status: true,
          folderId: true,
          sourceChecksum: true,
          digestPolicy: true,
          updatedAt: true,
        },
      }),
      this.prisma.documentFolder.findMany({
        where: { projectId },
        select: { id: true, slug: true, parentId: true },
      }),
    ]);
    const folderById = new Map(folders.map((f) => [f.id, f]));
    const pathOf = (folderId: string | null): string => {
      const parts: string[] = [];
      let cursor = folderId ? folderById.get(folderId) : undefined;
      while (cursor) {
        parts.unshift(cursor.slug ?? cursor.id);
        cursor = cursor.parentId ? folderById.get(cursor.parentId) : undefined;
      }
      return parts.join('/');
    };
    return documents.map((d) => ({
      docId: d.id,
      shortId: d.shortId,
      title: d.title,
      docRole: d.docRole,
      provenance: d.provenance,
      status: d.status,
      folderPath: pathOf(d.folderId),
      sourceChecksum: d.sourceChecksum,
      digestPolicy: d.digestPolicy,
      updatedAt: d.updatedAt.toISOString(),
    }));
  }

  /** apm://{projectCode}/doc/{shortId} 的后端解析支撑（v2 纪要 §13）。 */
  async resolveRef(projectId: string, shortId: string) {
    return this.prisma.document.findFirst({
      where: { projectId, shortId, isDeleted: false },
      select: {
        id: true,
        shortId: true,
        title: true,
        status: true,
        docRole: true,
        summary: true,
      },
    });
  }

  /** GlobalSequence 原子递增 + 事务内跳号自愈（对齐 issue-id.service 惯例）。 */
  private async nextDocShortId(docId: string): Promise<string> {
    return this.prisma.$transaction(async (tx: PrismaService) => {
      const existing = await tx.globalSequence.findUnique({
        where: { key: DOC_SHORT_ID_SEQUENCE_KEY },
      });
      let seq = (existing?.lastSeq ?? 0) + 1;
      while (
        await tx.document.findFirst({
          where: { shortId: `D${seq}` },
          select: { id: true },
        })
      ) {
        seq += 1;
      }
      await tx.globalSequence.upsert({
        where: { key: DOC_SHORT_ID_SEQUENCE_KEY },
        create: { key: DOC_SHORT_ID_SEQUENCE_KEY, lastSeq: seq },
        update: { lastSeq: seq },
      });
      void docId;
      return `D${seq}`;
    });
  }

  /** 同级 slug 冲突加 `-2` 起的后缀；与既有 slug 全局不重（目录树内唯一即可）。 */
  private async nextFolderSlug(
    projectId: string,
    folder: { id: string; name: string },
    siblings: { id: string; slug: string | null }[],
  ): Promise<string> {
    const base = this.slugify(folder.name, folder.id);
    const taken = new Set(siblings.map((s) => s.slug).filter(Boolean));
    if (!taken.has(base)) return base;
    let n = 2;
    while (taken.has(`${base}-${n}`)) n += 1;
    return `${base}-${n}`;
  }

  // ==================== T1 惰性 digest（v2 纪要 §11） ====================

  /**
   * 摘要生成器（可插拔）：V1 默认为抽取式实现（零 AI 成本，纯本地文本），
   * AI 管线适配（streamText 聚合 + AIUsageLog 计量）经同接口后续接入。
   */
  setDigestGenerator(generator: DigestGenerator): void {
    this.digestGenerator = generator;
  }

  /**
   * 廉价结构子集（零 AI 成本）：元数据 + 标题锚点 + 首段。
   * T1 语义的第一跳——无缓存 digest 时先返回本结构，绝不阻塞在生成上。
   */
  async getStructuralSubset(
    documentId: string,
  ): Promise<DocStructuralSubset | null> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, isDeleted: false },
      select: {
        id: true,
        projectId: true,
        shortId: true,
        title: true,
        docRole: true,
        status: true,
        digestPolicy: true,
        updatedAt: true,
        content: true,
      },
    });
    if (!doc) return null;

    const anchors: DocAnchor[] = [];
    const headingRe = /^(#{1,6})\s+(.+)$/gm;
    let match: RegExpExecArray | null;
    while ((match = headingRe.exec(doc.content)) !== null) {
      anchors.push({
        anchor: headingToAnchor(match[2]),
        title: match[2].trim(),
        level: match[1].length,
      });
    }
    const firstParagraph =
      doc.content
        .split(/\n{2,}/)
        .map((p) => p.trim())
        .find((p) => p.length > 0 && !p.startsWith('#')) ?? '';

    return {
      docId: doc.id,
      shortId: doc.shortId,
      title: doc.title,
      docRole: doc.docRole,
      status: doc.status,
      anchors,
      firstParagraph: firstParagraph.slice(0, 400),
      wordCount: doc.content.length,
      updatedAt: doc.updatedAt.toISOString(),
      freshness: 'structural',
      digestPolicy: doc.digestPolicy,
    };
  }

  /**
   * T1 按需取用：digest 命中（checksum 一致）返回 cached digest；
   * 失配（T2 stale）或缺失时返回结构子集并异步排队生成，绝不阻塞读取。
   * digestPolicy=off 永不生成。
   */
  async getSubset(documentId: string): Promise<DocSubsetResult | null> {
    const structural = await this.getStructuralSubset(documentId);
    if (!structural) return null;

    if (structural.digestPolicy === 'off') {
      return { ...structural, digest: null };
    }

    const [digest, doc] = await Promise.all([
      this.prisma.documentDigest.findUnique({
        where: { documentId },
      }),
      this.prisma.document.findUnique({
        where: { id: documentId },
        select: { sourceChecksum: true },
      }),
    ]);
    const currentChecksum = doc?.sourceChecksum ?? null;

    if (digest && digest.status === 'ready') {
      if (digest.sourceChecksum === currentChecksum) {
        return {
          ...structural,
          digest: this.toDigestView(digest),
          freshness: 'cached',
        };
      }
      // T2 增量失效：内容已变，返回 stale 提示并异步重算
      await this.enqueueDigest(documentId);
      return {
        ...structural,
        digest: this.toDigestView(digest),
        freshness: 'stale',
      };
    }

    await this.enqueueDigest(documentId);
    return { ...structural, digest: null };
  }

  /**
   * 异步排队生成（T0 物化提升与 T1 惰性共用）：已有 pending 在队则跳过。
   * ready 记录不改状态（旧值继续服务，纪要「热替换」语义——重算完成后
   * 直接覆盖）；仅无记录时落 pending 占位。生成在后台执行，失败记
   * failed + failReason，绝不阻塞调用方。
   */
  async enqueueDigest(documentId: string): Promise<boolean> {
    const doc = await this.prisma.document.findFirst({
      where: { id: documentId, isDeleted: false },
      select: {
        id: true,
        projectId: true,
        digestPolicy: true,
        content: true,
        title: true,
      },
    });
    if (!doc || doc.digestPolicy === 'off') return false;

    const existing = await this.prisma.documentDigest.findUnique({
      where: { documentId },
    });
    if (existing?.status === 'pending') return false;

    const sourceChecksum = this.checksum(doc.content);
    if (!existing) {
      await this.prisma.documentDigest.create({
        data: {
          documentId,
          projectId: doc.projectId ?? '',
          sourceChecksum,
          status: 'pending',
        },
      });
    }

    // 后台执行：脱离请求路径（T1「异步排队生成后热替换」）
    setImmediate(() => {
      this.generateDigest(
        documentId,
        doc.title,
        doc.content,
        sourceChecksum,
      ).catch(() => undefined);
    });
    return true;
  }

  private async generateDigest(
    documentId: string,
    title: string,
    content: string,
    sourceChecksum: string,
  ): Promise<void> {
    try {
      const produced = await this.digestGenerator.generate({ title, content });
      // enqueue 阶段已落 pending 记录，此处仅就位更新
      await this.prisma.documentDigest.update({
        where: { documentId },
        data: {
          summary: produced.summary,
          keyPoints: produced.keyPoints
            ? (produced.keyPoints as unknown as Prisma.InputJsonValue)
            : undefined,
          anchors: produced.anchors
            ? (produced.anchors as unknown as Prisma.InputJsonValue)
            : undefined,
          sourceChecksum,
          status: 'ready',
          failReason: null,
          model: produced.model,
        },
      });
    } catch (err) {
      const failReason = err instanceof Error ? err.message : String(err);
      await this.prisma.documentDigest
        .update({
          where: { documentId },
          data: { status: 'failed', failReason },
        })
        .catch(() => undefined);
    }
  }

  private toDigestView(digest: {
    summary: string;
    keyPoints: unknown;
    anchors: unknown;
    sourceChecksum: string;
    status: string;
    model: string | null;
    updatedAt: Date;
  }): DocDigestView | null {
    if (digest.status !== 'ready') return null;
    return {
      summary: digest.summary,
      keyPoints: Array.isArray(digest.keyPoints)
        ? (digest.keyPoints as string[])
        : [],
      anchors: Array.isArray(digest.anchors)
        ? (digest.anchors as DocAnchor[])
        : [],
      sourceChecksum: digest.sourceChecksum,
      model: digest.model,
      generatedAt: digest.updatedAt.toISOString(),
    };
  }
}
