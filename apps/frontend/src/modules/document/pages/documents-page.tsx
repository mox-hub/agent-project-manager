import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Code2,
  FileText,
  FolderKanban,
  LayoutGrid,
  List,
  Plus,
  Search,
  Sparkles,
  TestTube2,
  UserCircle2,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { StatCard } from '@/components/ui/stat-card';
import { StatusPill } from '@/components/ui/status-pill';
import { ViewSwitcher, type ViewMode } from '@/components/view-switcher';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import type { DocumentItem, DocumentStatus } from '../api/document-api';
import { useDocuments } from '../hooks/use-documents';

type StatusFilter = DocumentStatus | 'all';
type ModuleMeta = {
  label: string;
  icon: typeof FileText;
  accentClass: string;
};

const STATUS_META: Record<StatusFilter, { label: string; tone: 'default' | 'success' | 'warning' }> = {
  all: { label: '全部状态', tone: 'default' },
  draft: { label: '草稿', tone: 'default' },
  reviewing: { label: '审核中', tone: 'warning' },
  published: { label: '已发布', tone: 'success' },
};

const MODULE_META_MAP: Record<string, ModuleMeta> = {
  frontend: { label: '前端', icon: Sparkles, accentClass: 'text-accent-blue' },
  backend: { label: '后端', icon: Code2, accentClass: 'text-accent-green' },
  core: { label: '核心', icon: FolderKanban, accentClass: 'text-accent-yellow' },
  test: { label: '测试', icon: TestTube2, accentClass: 'text-accent-purple' },
};

function resolveModuleMeta(moduleName: string): ModuleMeta {
  const key = moduleName.toLowerCase();
  return (
    MODULE_META_MAP[key] ?? {
      label: moduleName,
      icon: BookOpen,
      accentClass: 'text-content-text-secondary',
    }
  );
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DocumentsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [module, setModule] = useState<string>('all');
  const [viewMode, setViewMode] = useState<Extract<ViewMode, 'grid' | 'list'>>('grid');

  const { data, isLoading, isError } = useDocuments({
    q: query || undefined,
    status,
    module,
  });
  const { data: allDocumentsData } = useDocuments();

  const documents = useMemo(() => data ?? [], [data]);
  const allDocuments = useMemo(() => allDocumentsData ?? documents, [allDocumentsData, documents]);
  const moduleOptions = useMemo(() => {
    const modules = Array.from(new Set(allDocuments.map((item) => item.module)));
    return modules.sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [allDocuments]);
  const stats = useMemo(
    () => ({
      total: allDocuments.length,
      published: allDocuments.filter((item) => item.status === 'published').length,
      reviewing: allDocuments.filter((item) => item.status === 'reviewing').length,
      draft: allDocuments.filter((item) => item.status === 'draft').length,
    }),
    [allDocuments],
  );

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
    <PageShell className="overflow-hidden" aiPage={CORE_AI_PAGE_IDS.documents}>
      <div className="flex h-full flex-col">
        <PageHeader
          aiId="document.document-list"
          title="文档管理"
          description="统一管理项目规范、架构文档与交付说明。"
          actions={(
            <Button data-ai-component="document.document-list.header.new" data-ai-role="nav" disabled>
              <Plus size={16} />
              新建文档
            </Button>
          )}
        />

        <div className="grid grid-cols-2 gap-3 border-b border-content-border bg-content-bg px-6 py-4 md:grid-cols-4">
          <StatCard label="总文档数" value={stats.total} hint="包含全部状态" className="bg-content-bg-secondary shadow-none" />
          <StatCard label="已发布" value={stats.published} accentClassName="text-accent-green" className="bg-content-bg-secondary shadow-none" />
          <StatCard label="审核中" value={stats.reviewing} accentClassName="text-accent-yellow" className="bg-content-bg-secondary shadow-none" />
          <StatCard label="草稿" value={stats.draft} accentClassName="text-content-text-secondary" className="bg-content-bg-secondary shadow-none" />
        </div>

        <div
          className="border-b border-content-border bg-content-bg px-6 py-3"
          data-ai-component="document.document-list.context-bar"
          data-ai-role="filter"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-[360px]">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-content-text-muted" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索文档标题、摘要或路径..."
                className="pl-9"
                data-ai-component="document.document-list.context-bar.search"
                data-ai-action="document.document-list.context-bar.search.change"
                data-ai-role="input"
              />
            </div>

            <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,180px)_auto] md:justify-end">
              <NativeSelect
                value={module}
                onChange={(event) => setModule(event.target.value)}
                data-ai-component="document.document-list.context-bar.module"
                data-ai-action="document.document-list.context-bar.module.change"
              >
                <option value="all">全部模块</option>
                {moduleOptions.map((item) => (
                  <option key={item} value={item}>
                    {resolveModuleMeta(item).label}
                  </option>
                ))}
              </NativeSelect>

              <NativeSelect
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                data-ai-component="document.document-list.context-bar.status"
                data-ai-action="document.document-list.context-bar.status.change"
              >
                <option value="all">{STATUS_META.all.label}</option>
                <option value="published">{STATUS_META.published.label}</option>
                <option value="reviewing">{STATUS_META.reviewing.label}</option>
                <option value="draft">{STATUS_META.draft.label}</option>
              </NativeSelect>

              <ViewSwitcher
                value={viewMode}
                onValueChange={(value) => setViewMode(value as Extract<ViewMode, 'grid' | 'list'>)}
                modes={['grid', 'list']}
                className="justify-self-start md:justify-self-end"
              />
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5">
          {documents.length === 0 ? (
            <Card data-ai-component="document.document-list.primary-content" data-ai-role="content">
              <CardContent className="flex flex-col items-center justify-center gap-2 px-6 py-20 text-center text-content-text-secondary">
              <FileText size={28} className="text-content-text-muted" />
              <p className="text-base font-medium text-content-text">暂无匹配文档</p>
              <p className="text-sm text-content-text-secondary">可尝试清空搜索词或调整筛选条件</p>
              </CardContent>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {documents.map((document) => (
                <DocumentCard key={document.id} document={document} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((document) => (
                <DocumentListItem key={document.id} document={document} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function DocumentCard({ document }: { document: DocumentItem }) {
  const moduleMeta = resolveModuleMeta(document.module);
  const ModuleIcon = moduleMeta.icon;
  const statusMeta = STATUS_META[document.status];

  return (
    <Card className="group border-content-border bg-content-bg transition-colors hover:border-content-border-light" data-ai-component={`document.document-list.card.${document.id}`}>
      <CardHeader className="pb-3">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 text-content-text-secondary">
            <ModuleIcon size={16} className={moduleMeta.accentClass} />
            <span className="text-xs font-medium">{moduleMeta.label}</span>
          </div>
          <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
        </div>
        <CardTitle className="text-base leading-6 text-content-text">{document.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <p className="min-h-10 text-sm leading-6 text-content-text-secondary">{document.summary}</p>
        <div className="rounded-md bg-content-bg-secondary px-2.5 py-2 font-mono text-xs text-content-text-secondary">
          {document.path}
        </div>
        <div className="flex items-center justify-between border-t border-content-border pt-3">
          <div className="flex items-center gap-1 text-xs text-content-text-muted">
            <UserCircle2 size={13} />
            {document.updatedBy} · {formatDateTime(document.updatedAt)}
          </div>
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
        </div>
      </CardContent>
    </Card>
  );
}

function DocumentListItem({ document }: { document: DocumentItem }) {
  const moduleMeta = resolveModuleMeta(document.module);
  const ModuleIcon = moduleMeta.icon;
  const statusMeta = STATUS_META[document.status];

  return (
    <Card className="group border-content-border bg-content-bg transition-colors hover:border-content-border-light" data-ai-component={`document.document-list.list-item.${document.id}`}>
      <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 rounded-md bg-content-bg-secondary p-2">
            <ModuleIcon size={16} className={moduleMeta.accentClass} />
          </div>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-content-text">{document.title}</h3>
              <StatusPill tone={statusMeta.tone}>{statusMeta.label}</StatusPill>
            </div>
            <p className="font-mono text-xs text-content-text-secondary">{document.path}</p>
            <p className="text-xs text-content-text-muted">
              {moduleMeta.label} · {document.updatedBy} · {formatDateTime(document.updatedAt)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 opacity-0 transition-opacity group-hover:opacity-100">
          <Link
            to={`/app/documents/${document.id}`}
            className="inline-flex items-center gap-1 text-sm text-accent-blue no-underline hover:underline"
          >
            <LayoutGrid size={14} />
            查看
          </Link>
          <Link
            to={`/app/documents/${document.id}/edit`}
            className="inline-flex items-center gap-1 text-sm text-accent-blue no-underline hover:underline"
          >
            <List size={14} />
            编辑
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
