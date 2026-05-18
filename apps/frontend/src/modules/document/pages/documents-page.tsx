import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Code2,
  FileText,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  Link as LinkIcon,
  List,
  MoreVertical,
  Palette,
  Plus,
  Search,
  Sparkles,
  TestTube2,
  Trash2,
  User,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { MENU_ITEM_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import { ViewSwitcher, type ViewMode } from '@/components/view-switcher';
import { cn } from '@/lib/utils';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import type { DocumentCategory, DocumentItem, DocumentStatus } from '../api/document-api';
import { useDocuments } from '../hooks/use-documents';

type StatusFilter = DocumentStatus | 'all';
type CategoryFilter = DocumentCategory | 'all';

const CATEGORY_CONFIG: Record<string, { label: string; icon: typeof FileText; color: string }> = {
  requirement: { label: '需求文档', icon: FileText, color: 'text-accent-blue' },
  design: { label: '设计文档', icon: Palette, color: 'text-accent-purple' },
  api: { label: 'API文档', icon: Code2, color: 'text-accent-green' },
  testing: { label: '测试文档', icon: TestTube2, color: 'text-accent-yellow' },
  guide: { label: '用户指南', icon: BookOpen, color: 'text-accent-blue' },
  custom: { label: '自定义', icon: FolderOpen, color: 'text-muted-foreground' },
};

const STATUS_CONFIG: Record<StatusFilter, { label: string; color: string }> = {
  all: { label: '全部状态', color: '' },
  draft: { label: '草稿', color: 'bg-muted text-muted-foreground' },
  reviewing: { label: '审核中', color: 'bg-accent-yellow-light text-accent-yellow' },
  published: { label: '已发布', color: 'bg-accent-green-light text-accent-green' },
};

function resolveCategory(key?: string | null) {
  if (!key) return CATEGORY_CONFIG.custom;
  return CATEGORY_CONFIG[key] ?? CATEGORY_CONFIG.custom;
}

export function DocumentsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<Extract<ViewMode, 'grid' | 'list'>>('grid');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const { data, isLoading, isError } = useDocuments({
    q: query || undefined,
    status,
    category,
  });
  const { data: allDocumentsData } = useDocuments();

  const documents = useMemo(() => data ?? [], [data]);
  const allDocuments = useMemo(() => allDocumentsData ?? documents, [allDocumentsData, documents]);
  const categoryOptions = useMemo(() => {
    const cats = Array.from(new Set(allDocuments.map((item) => item.category).filter(Boolean))) as string[];
    return cats.sort((a, b) => a.localeCompare(b, 'zh-CN'));
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
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">
        正在加载文档...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-background p-8 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-lg bg-accent-red-light">
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
          description="管理项目文档、API规范和技术指南"
          actions={(
            <Button data-ai-component="document.document-list.header.new" data-ai-role="nav" disabled>
              <Plus size={16} />
              新建文档
            </Button>
          )}
        />

        <div className="grid grid-cols-2 gap-4 border-b border-border bg-background px-6 py-4 md:grid-cols-4">
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <div className="text-2xl font-semibold text-foreground">{stats.total}</div>
            <div className="mt-1 text-xs text-muted-foreground">总文档数</div>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <div className="text-2xl font-semibold text-accent-green">{stats.published}</div>
            <div className="mt-1 text-xs text-muted-foreground">已发布</div>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <div className="text-2xl font-semibold text-accent-yellow">{stats.reviewing}</div>
            <div className="mt-1 text-xs text-muted-foreground">审核中</div>
          </div>
          <div className="rounded-lg bg-muted/50 px-4 py-3">
            <div className="text-2xl font-semibold text-muted-foreground">{stats.draft}</div>
            <div className="mt-1 text-xs text-muted-foreground">草稿</div>
          </div>
        </div>

        <div
          className="border-b border-border bg-background px-6 py-3"
          data-ai-component="document.document-list.context-bar"
          data-ai-role="filter"
        >
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative w-full md:max-w-[360px]">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="搜索文档..."
                className="pl-9"
                data-ai-component="document.document-list.context-bar.search"
                data-ai-action="document.document-list.context-bar.search.change"
                data-ai-role="input"
              />
            </div>

            <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-[minmax(0,220px)_minmax(0,180px)_auto] md:justify-end">
              <NativeSelect
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoryFilter)}
                data-ai-component="document.document-list.context-bar.category"
                data-ai-action="document.document-list.context-bar.category.change"
              >
                <option value="all">全部分类</option>
                {categoryOptions.map((cat) => (
                  <option key={cat} value={cat}>
                    {CATEGORY_CONFIG[cat]?.label ?? cat}
                  </option>
                ))}
              </NativeSelect>

              <NativeSelect
                value={status}
                onChange={(event) => setStatus(event.target.value as StatusFilter)}
                data-ai-component="document.document-list.context-bar.status"
                data-ai-action="document.document-list.context-bar.status.change"
              >
                <option value="all">{STATUS_CONFIG.all.label}</option>
                <option value="published">{STATUS_CONFIG.published.label}</option>
                <option value="reviewing">{STATUS_CONFIG.reviewing.label}</option>
                <option value="draft">{STATUS_CONFIG.draft.label}</option>
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

        <div className="flex-1 overflow-auto p-6">
          {documents.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FileText size={48} className="mb-4 text-muted-foreground/50" />
              <h3 className="mb-2 text-lg font-medium text-foreground">暂无文档</h3>
              <p className="text-sm text-muted-foreground">
                {query ? '未找到匹配的文档' : '开始创建你的第一个文档'}
              </p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((document) => (
                <DocumentCard key={document.id} document={document} menuOpen={menuOpen} onMenuToggle={setMenuOpen} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((document) => (
                <DocumentListItem key={document.id} document={document} menuOpen={menuOpen} onMenuToggle={setMenuOpen} />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

function DocumentCard({
  document,
  menuOpen,
  onMenuToggle,
}: {
  document: DocumentItem;
  menuOpen: string | null;
  onMenuToggle: (id: string | null) => void;
}) {
  const catConfig = resolveCategory(document.category);
  const CatIcon = catConfig.icon;
  const statusConfig = STATUS_CONFIG[document.status];

  return (
    <div
      className="group rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:shadow-sm"
      data-ai-component={`document.document-list.card.${document.id}`}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className={cn('rounded-lg bg-muted/50 p-2', catConfig.color)}>
          <CatIcon size={18} />
        </div>
        <div className="relative">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              onMenuToggle(menuOpen === document.id ? null : document.id);
            }}
          >
            <MoreVertical size={16} />
          </Button>
          {menuOpen === document.id && (
            <div
              className={`absolute right-0 top-full z-20 mt-1 w-36 p-1 motion-enter ${MENU_SURFACE_CLASS}`}
              onClick={(e) => e.stopPropagation()}
            >
              <Link
                to={`/app/documents/${document.id}`}
                className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left no-underline`}
                onClick={() => onMenuToggle(null)}
                data-ai-component={`document.document-list.card.${document.id}.view`}
                data-ai-action={`document.document-list.card.${document.id}.view.click`}
                data-ai-role="jump"
              >
                查看
              </Link>
              <Link
                to={`/app/documents/${document.id}/edit`}
                className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left no-underline`}
                onClick={() => onMenuToggle(null)}
                data-ai-component={`document.document-list.card.${document.id}.edit`}
                data-ai-action={`document.document-list.card.${document.id}.edit.click`}
                data-ai-role="jump"
              >
                编辑
              </Link>
              <button
                type="button"
                className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left text-accent-red hover:bg-accent-red-light hover:text-accent-red`}
                onClick={() => onMenuToggle(null)}
                data-ai-component={`document.document-list.card.${document.id}.delete`}
                data-ai-action={`document.document-list.card.${document.id}.delete.click`}
                data-ai-role="danger"
              >
                <Trash2 size={14} />
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      <h3
        className="mb-2 line-clamp-2 cursor-pointer font-medium text-foreground hover:text-primary"
        onClick={() => window.location.assign(`/app/documents/${document.id}`)}
      >
        {document.title}
      </h3>

      <div className="mb-3 flex items-center gap-2">
        <span className={cn('rounded-full px-2 py-1 text-xs', statusConfig.color)}>
          {statusConfig.label}
        </span>
        {document.isAIGenerated && (
          <span className="flex items-center gap-1 rounded-full bg-accent-purple-light px-2 py-1 text-xs text-accent-purple">
            <Sparkles size={12} />
            AI
          </span>
        )}
      </div>

      {document.tags && document.tags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1">
          {document.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="rounded bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {tag}
            </span>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-3">
          {document.currentVersion && (
            <span className="flex items-center gap-1">
              <GitBranch size={12} />
              {document.currentVersion}
            </span>
          )}
          {document.linkCount != null && document.linkCount > 0 && (
            <span className="flex items-center gap-1">
              <LinkIcon size={12} />
              {document.linkCount}
            </span>
          )}
        </div>
        <span className="flex items-center gap-1">
          <User size={12} />
          {document.updatedBy}
        </span>
      </div>
    </div>
  );
}

function DocumentListItem({
  document,
  menuOpen,
  onMenuToggle,
}: {
  document: DocumentItem;
  menuOpen: string | null;
  onMenuToggle: (id: string | null) => void;
}) {
  const catConfig = resolveCategory(document.category);
  const CatIcon = catConfig.icon;
  const statusConfig = STATUS_CONFIG[document.status];

  return (
    <div
      className="group rounded-lg border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:shadow-sm"
      data-ai-component={`document.document-list.list-item.${document.id}`}
    >
      <div className="flex items-center gap-4">
        <div className={cn('shrink-0 rounded-lg bg-muted/50 p-2', catConfig.color)}>
          <CatIcon size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3
              className="cursor-pointer truncate font-medium text-foreground hover:text-primary"
              onClick={() => window.location.assign(`/app/documents/${document.id}`)}
            >
              {document.title}
            </h3>
            <span className={cn('shrink-0 rounded-full px-2 py-0.5 text-xs', statusConfig.color)}>
              {statusConfig.label}
            </span>
            {document.isAIGenerated && (
              <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent-purple-light px-2 py-0.5 text-xs text-accent-purple">
                <Sparkles size={12} />
                AI
              </span>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className={catConfig.color}>{catConfig.label}</span>
            <span>{new Date(document.updatedAt).toLocaleDateString('zh-CN')}</span>
            <span className="flex items-center gap-1">
              <User size={12} />
              {document.updatedBy}
            </span>
            {document.currentVersion && (
              <span className="flex items-center gap-1">
                <GitBranch size={12} />
                {document.currentVersion}
              </span>
            )}
            {document.linkCount != null && document.linkCount > 0 && (
              <span className="flex items-center gap-1">
                <LinkIcon size={12} />
                {document.linkCount} 关联
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            to={`/app/documents/${document.id}`}
            className="text-sm text-accent-blue no-underline opacity-0 transition-opacity hover:underline group-hover:opacity-100"
            data-ai-component={`document.document-list.list-item.${document.id}.view`}
            data-ai-action={`document.document-list.list-item.${document.id}.view.click`}
            data-ai-role="jump"
          >
            <LayoutGrid size={14} className="mr-1 inline" />
            查看
          </Link>
          <Link
            to={`/app/documents/${document.id}/edit`}
            className="text-sm text-accent-blue no-underline opacity-0 transition-opacity hover:underline group-hover:opacity-100"
            data-ai-component={`document.document-list.list-item.${document.id}.edit`}
            data-ai-action={`document.document-list.list-item.${document.id}.edit.click`}
            data-ai-role="jump"
          >
            <List size={14} className="mr-1 inline" />
            编辑
          </Link>
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onMenuToggle(menuOpen === document.id ? null : document.id);
              }}
            >
              <MoreVertical size={16} />
            </Button>
            {menuOpen === document.id && (
              <div
                className={`absolute right-0 top-full z-20 mt-1 w-36 p-1 motion-enter ${MENU_SURFACE_CLASS}`}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left`}
                  onClick={() => onMenuToggle(null)}
                >
                  <GitBranch size={14} />
                  版本历史
                </button>
                <button
                  type="button"
                  className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left text-accent-red hover:bg-accent-red-light hover:text-accent-red`}
                  onClick={() => onMenuToggle(null)}
                  data-ai-component={`document.document-list.list-item.${document.id}.delete`}
                  data-ai-action={`document.document-list.list-item.${document.id}.delete.click`}
                  data-ai-role="danger"
                >
                  <Trash2 size={14} />
                  删除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
