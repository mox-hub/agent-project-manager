// metadata-sync.service.ts
//
// Phase 5: 读时来源 (YAML) → DB (DocumentTag)。
// frontmatter tags 为唯一真相, DB 镜像全量跟随（缺则建/挂, 多则摘）。
// 解析失败时仅警告, 不抛错。

import { useQueryClient } from '@tanstack/react-query';
import { useAttachTag } from '@/modules/document/hooks/use-document-tags';
import { useCreateTag } from '@/modules/document/hooks/use-document-tags';
import { documentTagApi } from '@/modules/document/api/document-tag-api';
import { parseFrontmatter } from './mdx-frontmatter';
import { computeTagMirror } from './tag-mirror';
import { toast } from '@/components/ui/toast';
import { useCallback, useRef } from 'react';

export interface SyncResult {
  appliedTags: string[];
  removedTags: string[];
  hadStatusMismatch: boolean;
  hadProjectMismatch: boolean;
}

/**
 * Hook 形式: 监听 rawContent 变化, 自动同步到 DB。
 * - 标签不存在: 先创建
 * - 文档未挂载: 挂上
 * - 文档已挂但 frontmatter 已摘除: 摘下（全量跟随）
 */
export function useMetadataSync(documentId: string) {
  const queryClient = useQueryClient();
  const attachTag = useAttachTag();
  const createTag = useCreateTag();
  const lastSyncedRef = useRef<string>('');

  return useCallback(
    async (rawContent: string): Promise<SyncResult> => {
      const result: SyncResult = { appliedTags: [], removedTags: [], hadStatusMismatch: false, hadProjectMismatch: false };
      if (!documentId || !rawContent) return result;
      // 同一份内容不重复同步
      if (lastSyncedRef.current === rawContent) return result;
      lastSyncedRef.current = rawContent;

      const { data: frontmatter } = parseFrontmatter(rawContent);
      const tagNames = frontmatter.tags ?? [];

      // 1. 列出所有现有标签 (项目级)
      let existingTags: Array<{ id: string; name: string }> = [];
      try {
        const list = await documentTagApi.listAll();
        existingTags = (Array.isArray(list) ? list : []).map((t: { id: string; name: string }) => ({
          id: t.id,
          name: t.name,
        }));
      } catch (err) {
        // ignore
        console.warn('[metadataSync] listAll failed:', err);
      }

      // 2. 列出当前文档已挂的标签
      let attachedTags: Array<{ id: string; name: string }> = [];
      try {
        const list = await documentTagApi.listForDocument(documentId);
        attachedTags = (Array.isArray(list) ? list : []).map((t: { id: string; name: string }) => ({
          id: t.id,
          name: t.name,
        }));
      } catch {
        // ignore
      }

      // 3. 按镜像差集执行: 缺则建/挂, 多则摘
      const plan = computeTagMirror({ existing: existingTags, attached: attachedTags, target: tagNames });
      for (const name of plan.toCreate) {
        try {
          const created = await createTag.mutateAsync({ name, color: '#94a3b8' });
          plan.toAttach.push({ id: created.id, name: created.name });
          existingTags.push({ id: created.id, name: created.name });
        } catch (err) {
          console.warn(`[metadataSync] failed to create tag ${name}:`, err);
        }
      }
      for (const tag of plan.toAttach) {
        try {
          await attachTag.mutateAsync({ documentId, tagId: tag.id });
          result.appliedTags.push(tag.name);
        } catch (err) {
          console.warn(`[metadataSync] failed to attach tag ${tag.name}:`, err);
        }
      }
      for (const tag of plan.toDetach) {
        try {
          await documentTagApi.detachFromDocument(documentId, tag.id);
          result.removedTags.push(tag.name);
        } catch (err) {
          console.warn(`[metadataSync] failed to detach tag ${tag.name}:`, err);
        }
      }

      if (result.appliedTags.length > 0 || result.removedTags.length > 0) {
        const parts: string[] = [];
        if (result.appliedTags.length > 0) parts.push(`+${result.appliedTags.length}`);
        if (result.removedTags.length > 0) parts.push(`-${result.removedTags.length}`);
        toast.success(`已按 frontmatter 同步标签（${parts.join(' ')}）`);
        queryClient.invalidateQueries({ queryKey: ['document-tags'] });
      }
      return result;
    },
    [documentId, attachTag, createTag, queryClient],
  );
}

/**
 * 检测 frontmatter 与 DB 的不一致, 返回提示性 message。
 */
export async function detectMismatches(
  documentId: string,
  dbStatus: string,
  dbProjectId: string,
  rawContent: string,
  resolveProjectCode: (projectId: string) => string | undefined,
): Promise<string[]> {
  const messages: string[] = [];
  const { data: frontmatter } = parseFrontmatter(rawContent);
  if (frontmatter.status && frontmatter.status !== dbStatus) {
    messages.push(`frontmatter.status=${frontmatter.status} 与数据库 status=${dbStatus} 不一致`);
  }
  if (frontmatter.project) {
    const dbCode = resolveProjectCode(dbProjectId);
    if (dbCode && frontmatter.project !== dbCode) {
      messages.push(`frontmatter.project=${frontmatter.project} 与数据库 projectCode 不一致`);
    }
  }
  if (messages.length > 0) {
    resultSyncToast(messages);
  }
  return messages;
}

function resultSyncToast(messages: string[]) {
  toast.warning(`检测到 frontmatter 与数据库不一致: ${messages[0]}${messages.length > 1 ? ' 等' : ''}`);
}
