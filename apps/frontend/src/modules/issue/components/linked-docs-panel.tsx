/**
 * LinkedDocsPanel - 详情页右侧栏「关联文档」面板（task/bug 详情页共用）
 *
 * 形态与 Properties/外部集成同一套 SidebarPanel；空态/加载态走 §10.6 合规出口
 * （EmptyState compact / Spinner 行），不再内联「暂无 X」纯文本。
 */
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { SidebarPanel } from '@/components/semantic/sidebar-panel';
import { EmptyState } from '@/components/semantic/empty-state';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
import {
  useTaskDocumentLinks, LINK_TYPE_LABELS, LINK_TYPE_COLORS,
} from '@/modules/document/hooks/use-document-task-links';

export function LinkedDocsPanel({ issueId }: { issueId: string }) {
  const { t } = useTranslation();
  const { data: links = [], isLoading } = useTaskDocumentLinks(issueId);
  return (
    <SidebarPanel
      title={t('issueDetail.linkedDocs')}
      icon={<FileText className="size-3" />}
      action={
        links.length > 0 ? (
          <span className="text-3xs text-muted-foreground">({links.length})</span>
        ) : undefined
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2 px-2 py-1.5 text-xs text-muted-foreground">
          <Spinner className="size-3 text-inherit" />
          {t('common.loading')}
        </div>
      ) : links.length === 0 ? (
        <EmptyState variant="compact" icon={FileText} title={t('issueDetail.noLinkedDocs')} />
      ) : (
        links.map((link) => (
          <Link
            key={link.id}
            to={`/app/documents/${link.documentId}`}
            className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          >
            <FileText className="size-3.5 shrink-0" />
            <span className="flex-1 min-w-0 text-left">
              <span className="block truncate font-medium text-foreground">
                {link.document?.title || t('issueDetail.documentFallback', { id: link.documentId })}
              </span>
              {link.section && (
                <span className="block truncate text-3xs">
                  {t('issueDetail.sectionLabel', { title: link.section.title })}
                </span>
              )}
            </span>
            <span
              className={cn(
                'shrink-0 rounded-sm px-1.5 py-0.5 text-3xs font-medium',
                LINK_TYPE_COLORS[link.linkType] || 'bg-muted text-muted-foreground',
              )}
            >
              {t(`document.linkType.${link.linkType}`, {
                defaultValue: LINK_TYPE_LABELS[link.linkType] || link.linkType,
              })}
            </span>
          </Link>
        ))
      )}
    </SidebarPanel>
  );
}
