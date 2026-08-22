import { Info } from 'lucide-react';
import { useDocumentTags } from '@/modules/document/hooks/use-document-tags';

interface DocumentTagManagerProps {
  documentId: string;
  onChange?: () => void;
}

/**
 * Phase 5 重构: 标签以文档 frontmatter 为准, 这里只展示当前同步状态。
 * 取消"管理全部标签"折叠面板; 取消手动 attach/detach 入口;
 * 用户改 frontmatter 后, metadata-sync.service 会自动同步。
 */
export function DocumentTagManager({ documentId }: DocumentTagManagerProps) {
  const { data: docTags = [] } = useDocumentTags(documentId);

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 rounded-md border border-dashed border-accent-blue/30 bg-accent-blue/5 px-2.5 py-2 text-11 leading-relaxed text-muted-foreground">
        <Info size={12} className="mt-0.5 shrink-0 text-accent-blue" />
        <span>
          标签以 Markdown 文件的 <code className="rounded bg-muted px-1 font-mono text-10">frontmatter</code> 为准,
          编辑文档源文件的 <code className="rounded bg-muted px-1 font-mono text-10">tags: [a, b]</code> 来管理。保存后会自动同步。
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {docTags.length === 0 && (
          <span className="text-xs text-muted-foreground">尚未添加标签</span>
        )}
        {docTags.map((tag) => (
          <span
            key={tag.id}
            className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
            style={{
              backgroundColor: tag.color ? `${tag.color}1A` : 'var(--accent-blue, #5E6AD2)1A',
              color: tag.color ?? 'var(--accent-blue, #5E6AD2)',
            }}
          >
            {tag.name}
          </span>
        ))}
      </div>
    </div>
  );
}
