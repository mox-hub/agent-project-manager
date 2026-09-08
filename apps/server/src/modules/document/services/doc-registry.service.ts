import { Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
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

@Injectable()
export class DocRegistryService {
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
}
