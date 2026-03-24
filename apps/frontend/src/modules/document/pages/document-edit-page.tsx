import { useNavigate, useParams } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { AttentionRail } from '@/components/ui/attention-rail';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useDocumentDetail } from '../hooks/use-document-detail';

export function DocumentEditPage() {
  const navigate = useNavigate();
  const { documentId = '' } = useParams<{ documentId: string }>();
  const { data, isLoading, isError } = useDocumentDetail(documentId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-content-bg p-8 text-sm text-content-text-secondary">
        正在加载编辑器...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-content-bg p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-accent-red-light">
          <AlertCircle size={32} className="text-accent-red" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-accent-red">文档编辑器加载失败</h2>
      </div>
    );
  }

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.documentEdit}>
      <div className="mx-auto w-full max-w-[1280px]">
        <PageHeader
          aiId="document.document-edit"
          title={`编辑: ${data.title}`}
          description={`${data.path} · 当前状态 ${data.status}`}
          actions={(
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/app/documents/${data.id}`)}
                data-ai-component="document.document-edit.header.cancel"
                data-ai-action="document.document-edit.header.cancel.click"
                data-ai-role="jump"
              >
                取消
              </Button>
              <Button
                onClick={() => navigate(`/app/documents/${data.id}`)}
                data-ai-component="document.document-edit.header.save"
                data-ai-action="document.document-edit.header.save.click"
                data-ai-role="submit"
              >
                保存并返回
              </Button>
            </>
          )}
        />

        <Card data-ai-component="document.document-edit.primary-content" data-ai-role="content">
          <CardContent className="space-y-4 p-5">
            <div>
              <label className="mb-1 block text-sm font-medium text-content-text">标题</label>
              <Input
                defaultValue={data.title}
                data-ai-component="document.document-edit.form.title"
                data-ai-action="document.document-edit.form.title.change"
                data-ai-role="input"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-content-text">摘要</label>
              <Textarea
                defaultValue={data.summary}
                className="min-h-[100px]"
                data-ai-component="document.document-edit.form.summary"
                data-ai-action="document.document-edit.form.summary.change"
                data-ai-role="input"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-content-text">正文</label>
              <Textarea
                defaultValue={data.content}
                className="min-h-[320px] font-mono text-xs"
                data-ai-component="document.document-edit.form.content"
                data-ai-action="document.document-edit.form.content.change"
                data-ai-role="input"
              />
            </div>
          </CardContent>
        </Card>

        <AttentionRail
          aiPrefix="document.document-edit"
          items={[
            {
              id: 'preview-doc',
              title: '回到预览页',
              description: '查看当前编辑结果',
              to: `/app/documents/${data.id}`,
            },
            {
              id: 'open-ai',
              title: '让 AI 生成摘要',
              description: '在 AI Space 中处理文档总结',
              to: '/app/ai',
            },
          ]}
        />
      </div>
    </PageShell>
  );
}
