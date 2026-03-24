import { Link, useParams } from 'react-router-dom';
import { AlertCircle, FileText } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { AttentionRail } from '@/components/ui/attention-rail';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useDocumentDetail, useDocumentVersions } from '../hooks/use-document-detail';

export function DocumentViewPage() {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const detailQuery = useDocumentDetail(documentId);
  const versionsQuery = useDocumentVersions(documentId);

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-content-bg p-8 text-sm text-content-text-secondary">
        正在加载文档内容...
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-content-bg p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-accent-red-light">
          <AlertCircle size={32} className="text-accent-red" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-accent-red">文档不存在或加载失败</h2>
      </div>
    );
  }

  const document = detailQuery.data;
  const versions = versionsQuery.data ?? [];

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.documentView}>
      <div className="mx-auto w-full max-w-[1280px]">
        <PageHeader
          aiId="document.document-view"
          title={document.title}
          description={`${document.path} · ${document.updatedBy}`}
          actions={(
            <Link
              to={`/app/documents/${document.id}/edit`}
              className="rounded-md border border-content-border bg-content-bg px-3 py-2 text-sm font-medium text-content-text no-underline hover:bg-content-bg-secondary"
              data-ai-component="document.document-view.header.edit"
              data-ai-action="document.document-view.header.edit.click"
              data-ai-role="jump"
            >
              编辑文档
            </Link>
          )}
        />

        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <Card data-ai-component="document.document-view.primary-content" data-ai-role="content">
            <CardContent className="space-y-3 p-5">
              <p className="text-sm text-content-text-secondary">{document.summary}</p>
              <pre className="overflow-x-auto rounded-lg border border-content-border bg-content-bg-secondary p-4 text-xs text-content-text">
                {document.content}
              </pre>
            </CardContent>
          </Card>

          <Card data-ai-component="document.document-view.version-panel" data-ai-role="panel">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-semibold text-content-text">版本记录</h3>
              <div className="space-y-2">
                {versions.length === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-content-text-secondary">
                    <FileText size={14} />
                    暂无版本历史
                  </div>
                ) : (
                  versions.map((version) => (
                    <div key={version.id} className="rounded-lg border border-content-border bg-content-bg-secondary p-3">
                      <p className="text-sm font-medium text-content-text">{version.version}</p>
                      <p className="mt-1 text-xs text-content-text-secondary">{version.summary}</p>
                      <p className="mt-1 text-xs text-content-text-muted">
                        {version.author} · {new Date(version.createdAt).toLocaleString()}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <AttentionRail
          aiPrefix="document.document-view"
          items={[
            { id: 'back-docs', title: '返回文档列表', description: '查看全部文档', to: '/app/documents' },
            {
              id: 'goto-metadata',
              title: '打开元数据设置',
              description: '维护标签与状态体系',
              to: '/app/settings/metadata',
            },
          ]}
        />
      </div>
    </PageShell>
  );
}

