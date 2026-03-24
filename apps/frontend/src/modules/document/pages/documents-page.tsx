import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, FileText, Search } from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { AttentionRail } from '@/components/ui/attention-rail';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useDocuments } from '../hooks/use-documents';

export function DocumentsPage() {
  const [query, setQuery] = useState('');
  const { data, isLoading, isError } = useDocuments({ q: query || undefined, status: 'all', module: 'all' });

  const documents = useMemo(() => data ?? [], [data]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-content-bg p-8 text-sm text-content-text-secondary">
        正在加载文档...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-content-bg p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-accent-red-light">
          <AlertCircle size={32} className="text-accent-red" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-accent-red">文档加载失败</h2>
      </div>
    );
  }

  return (
    <PageShell className="p-6 sm:p-8" aiPage={CORE_AI_PAGE_IDS.documents}>
      <div className="mx-auto w-full max-w-[1280px]">
        <PageHeader
          aiId="document.document-list"
          title="Documents"
          description="统一浏览需求、设计、指南与报告文档。"
        />

        <div
          className="my-4 flex items-center gap-2"
          data-ai-component="document.document-list.context-bar"
          data-ai-role="filter"
        >
          <Search size={16} className="text-content-text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、摘要或路径..."
            className="max-w-[420px]"
            data-ai-component="document.document-list.context-bar.search"
            data-ai-action="document.document-list.context-bar.search.change"
            data-ai-role="input"
          />
        </div>

        <Card data-ai-component="document.document-list.primary-content" data-ai-role="content">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>路径</TableHead>
                  <TableHead>模块</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>更新人</TableHead>
                  <TableHead>更新时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell className="font-medium">{document.title}</TableCell>
                    <TableCell className="font-mono text-xs text-content-text-secondary">
                      {document.path}
                    </TableCell>
                    <TableCell>{document.module}</TableCell>
                    <TableCell>{document.status}</TableCell>
                    <TableCell>{document.updatedBy}</TableCell>
                    <TableCell>{new Date(document.updatedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Link
                          to={`/app/documents/${document.id}`}
                          className="text-sm text-accent-blue no-underline hover:underline"
                          data-ai-component={`document.document-list.row.${document.id}.view`}
                          data-ai-action={`document.document-list.row.${document.id}.view.click`}
                          data-ai-role="jump"
                        >
                          查看
                        </Link>
                        <Link
                          to={`/app/documents/${document.id}/edit`}
                          className="text-sm text-accent-blue no-underline hover:underline"
                          data-ai-component={`document.document-list.row.${document.id}.edit`}
                          data-ai-action={`document.document-list.row.${document.id}.edit.click`}
                          data-ai-role="jump"
                        >
                          编辑
                        </Link>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center text-content-text-secondary">
                <FileText size={28} className="text-content-text-muted" />
                <p className="text-sm">没有匹配的文档结果</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <AttentionRail
          aiPrefix="document.document-list"
          items={[
            { id: 'goto-analytics', title: '查看分析看板', description: '回到指标总览', to: '/app/analytics' },
            { id: 'goto-projects', title: '进入项目空间', description: '回到项目执行上下文', to: '/app/projects' },
            { id: 'goto-settings', title: '打开系统设置', description: '调整全局配置', to: '/app/settings' },
          ]}
        />
      </div>
    </PageShell>
  );
}

