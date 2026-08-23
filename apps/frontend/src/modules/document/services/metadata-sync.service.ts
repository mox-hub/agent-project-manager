// metadata-sync.service.ts
//
// Phase 5: 读时来源 (YAML) → DB (DocumentTag)。
// 解析 frontmatter, 把 tags 一次性附加到文档上 (不删除 DB 中已有的标签)。
// 解析失败时仅警告, 不抛错。

import { useQueryClient } from '@tanstack/react-query';
import { useAttachTag, useDocumentTags } from '@/modules/document/hooks/use-document-tags';
import { useCreateTag } from '@/modules/document/hooks/use-document-tags';
import { documentTagApi } from '@/modules/document/api/document-tag-api';
import { parseFrontmatter } from './mdx-frontmatter';
import { toast } from '@/components/ui/toast';
import { useCallback, useRef } from 'react';

export interface SyncResult {
  appliedTags: string[];
  hadStatusMismatch: boolean;
  hadProjectMismatch: boolean;
}

/**
 * Hook 形式: 监听 rawContent 变化, 自动同步到 DB。
 * - 已挂载: 跳过
 * - 标签不存在: 先创建
 * - 文档已有此标签: 跳过
 */
export function useMetadataSync(documentId: string) {
  const queryClient = useQueryClient();
  const attachTag = useAttachTag();
  const createTag = useCreateTag();
  const lastSyncedRef = useRef<string>('');

  return useCallback(
    async (rawContent: string): Promise<SyncResult> => {
      const result: SyncResult = { appliedTags: [], hadStatusMismatch: false, hadProjectMismatch: false };
      if (!documentId || !rawContent) return result;
      // 同一份内容不重复同步
      if (lastSyncedRef.current === rawContent) return result;
      lastSyncedRef.current = rawContent;

      const { data: frontmatter } = parseFrontmatter(rawContent);
      const tagNames = frontmatter.tags ?? [];
      if (tagNames.length === 0) return result;

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
      let attachedTagIds = new Set<string>();
      try {
        const list = await documentTagApi.listForDocument(documentId);
        attachedTagIds = new Set((Array.isArray(list) ? list : []).map((t: { id: string }) => t.id));
      } catch {
        // ignore
      }

      // 3. 对每个 frontmatter tag, 不存在则创建, 未挂载则挂上
      for (const name of tagNames) {
        let tag = existingTags.find((t) => t.name === name);
        if (!tag) {
          try {
            const created = await createTag.mutateAsync({ name, color: '#94a3b8' });
            tag = { id: created.id, name: created.name };
            existingTags.push(tag);
          } catch (err) {
            console.warn(`[metadataSync] failed to create tag ${name}:`, err);
            continue;
          }
        }
        if (!attachedTagIds.has(tag.id)) {
          try {
            await attachTag.mutateAsync({ documentId, tagId: tag.id });
            result.appliedTags.push(name);
          } catch (err) {
            console.warn(`[metadataSync] failed to attach tag ${name}:`, err);
          }
        }
      }

      if (result.appliedTags.length > 0) {
        toast.success(`已从 frontmatter 同步 ${result.appliedTags.length} 个标签`);
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

// re-export for consumers that need the type
export { useDocumentTags };
