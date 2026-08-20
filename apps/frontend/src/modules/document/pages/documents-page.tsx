import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  AlertTriangle,
  BookOpen,
  Code2,
  Clock,
  FileText,
  FileStack,
  FileEdit,
  FolderOpen,
  GitBranch,
  LayoutGrid,
  Link as LinkIcon,
  List,
  MoreVertical,
  Palette,
  Plus,
  Sparkles,
  TestTube2,
  Trash2,
  User,
  Eye,
  X,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { Button } from '@/components/ui/button';
import { StatsCard, STATS_THEMES } from '@/components/ui/stats-card';
import { ToolbarRow, useToolbarViews } from '@/components/ui/toolbar-row';
import { MENU_ITEM_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import { DocumentPreviewDialog } from '@/components/ui/document-preview-dialog';
import { cn } from '@/lib/utils';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { useDocuments } from '../hooks/use-documents';
import { useDeleteDocument } from '../hooks/use-document-mutations';
import { useCreateDocument } from '../hooks/use-document-mutations';
import { useSyncWarnings, useClearSyncWarning } from '../hooks/use-sync-warnings';
import type { DocumentCategory, DocumentStatus, Document, DocumentListItem } from '../api/document-api';

type StatusFilter = DocumentStatus | 'all';
type CategoryFilter = DocumentCategory | 'all';
type ViewMode = 'grid' | 'list';

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
  rejected: { label: '已拒绝', color: 'bg-destructive/10 text-destructive' },
};

function resolveCategory(key?: string | null) {
  if (!key) return CATEGORY_CONFIG.custom;
  return CATEGORY_CONFIG[key] ?? CATEGORY_CONFIG.custom;
}

export function DocumentsPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);

  // 已保存视图：快照记忆搜索/状态/分类/视图样式
  const toolbar = useToolbarViews({
    key: 'documents-page',
    defaults: [{
      id: 'all',
      name: t('document.filter.all', '全部'),
      icon: 'grid',
      builtIn: true,
      snapshot: { search: '', status: 'all', category: 'all', viewStyle: 'grid' },
    }],
    onApply: (snapshot) => {
      const snap = (snapshot ?? {}) as Partial<{
        search: string; status: StatusFilter; category: CategoryFilter; viewStyle: ViewMode;
      }>;
      setQuery(snap.search ?? '');
      setStatus(snap.status ?? 'all');
      setCategory(snap.category ?? 'all');
      setViewMode(snap.viewStyle ?? 'grid');
    },
  });
  const { updateActiveSnapshot } = toolbar;

  useEffect(() => {
    updateActiveSnapshot({ search: query, status, category, viewStyle: viewMode });
  }, [updateActiveSnapshot, query, status, category, viewMode]);

  const { data, isLoading, isError } = useDocuments({
    q: query || undefined,
    status: status === 'all' ? undefined : status,
    category: category === 'all' ? undefined : category,
  });
  const { data: allDocumentsData } = useDocuments();

  const documents = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const allDocuments = useMemo(() => (Array.isArray(allDocumentsData) ? allDocumentsData : documents), [allDocumentsData, documents]);
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

  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();
  const { data: syncWarnings = [] } = useSyncWarnings();
  const clearSyncWarning = useClearSyncWarning();
  const [showSyncBanner, setShowSyncBanner] = useState(true);

  const syncWarningForDoc = (id: string) => syncWarnings.find((w) => w.documentId === id);

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
          icon={FileStack}
          iconColor="text-accent-blue"
          metrics={[{ id: 'total', label: '文档', value: stats.total }]}
          actions={(
            <HeaderActionButton
              icon={Plus}
              label="新建文档"
              data-ai-component="document.document-list.header.new"
              data-ai-role="nav"
              onClick={() => navigate('/app/documents/new')}
            />
          )}
        />

        <div className="border-b border-border bg-background px-6 py-4">
          {showSyncBanner && syncWarnings.length > 0 ? (
            <div
              className="mb-3 flex items-start gap-3 rounded-lg border border-accent-yellow/40 bg-accent-yellow-light/60 px-3 py-2 text-sm"
              data-ai-component="document.document-list.sync-warning-banner"
              data-ai-role="alert"
            >
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-accent-yellow" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-foreground">
                  本地文件同步失败 ({syncWarnings.length})
                </div>
                <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                  {syncWarnings.slice(0, 3).map((w) => {
                    const doc = documents.find((d) => d.id === w.documentId);
                    return (
                      <div key={w.documentId} className="flex items-center justify-between gap-2">
                        <span className="truncate">
                          {doc?.title ?? w.documentId} · 重试 {w.attempts} 次 · {w.lastError}
                        </span>
                        <button
                          type="button"
                          className="shrink-0 text-accent-blue hover:underline"
                          onClick={() => clearSyncWarning.mutate(w.documentId)}
                        >
                          知道了
                        </button>
                      </div>
                    );
                  })}
                  {syncWarnings.length > 3 ? (
                    <div>...还有 {syncWarnings.length - 3} 个</div>
                  ) : null}
                </div>
              </div>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
                onClick={() => setShowSyncBanner(false)}
                aria-label="关闭预警"
              >
                <X size={14} />
              </button>
            </div>
          ) : null}
          <StatsCard
            items={[
              { key: 'total', value: stats.total, label: '总文档数' },
              { key: 'published', value: stats.published, label: '已发布', icon: FileText, ...STATS_THEMES.green },
              { key: 'reviewing', value: stats.reviewing, label: '审核中', icon: Clock, ...STATS_THEMES.yellow },
              { key: 'draft', value: stats.draft, label: '草稿', icon: FileEdit, ...STATS_THEMES.blue },
            ]}
            columns={4}
            className="grid grid-cols-4 gap-3"
          />
        </div>

        <ToolbarRow
          aiId="document.document-list"
          views={toolbar.views}
          activeViewId={toolbar.activeViewId}
          onSelectView={toolbar.selectView}
          onCreateView={toolbar.createView}
          onUpdateView={toolbar.updateView}
          onDeleteView={toolbar.deleteView}
          viewStyle={{
            value: viewMode,
            onChange: (v) => setViewMode(v as ViewMode),
            options: [
              { value: 'grid', label: t('document.view.grid', 'Grid'), icon: LayoutGrid },
              { value: 'list', label: t('document.view.list', 'List'), icon: List },
            ],
          }}
          filterMenu={{
            badge: [status !== 'all', category !== 'all'].filter(Boolean).length,
            search: { value: query, onChange: setQuery, placeholder: '搜索文档...' },
            items: [
              { type: 'label', label: '状态' },
              ...(['all', 'published', 'reviewing', 'draft'] as const).map((value) => ({
                id: `status-${value}`,
                type: 'checkbox' as const,
                label: STATUS_CONFIG[value].label,
                checked: status === value,
                onSelect: () => setStatus(value),
              })),
              { type: 'separator' },
              { type: 'label', label: '分类' },
              { id: 'category-all', type: 'checkbox', label: '全部分类', checked: category === 'all', onSelect: () => setCategory('all') },
              ...categoryOptions.map((cat) => ({
                id: `category-${cat}`,
                type: 'checkbox' as const,
                label: CATEGORY_CONFIG[cat]?.label ?? cat,
                checked: category === cat,
                onSelect: () => setCategory(cat as CategoryFilter),
              })),
            ],
          }}
          displayMenu={false}
          downloadMenu={{
            items: [
              { type: 'label', label: t('document.export.label', '导出') },
              { id: 'csv', type: 'item', label: 'CSV', disabled: true },
              { id: 'json', type: 'item', label: 'JSON', disabled: true },
            ],
          }}
        />

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
                <DocumentCard
                  key={document.id}
                  document={document}
                  menuOpen={menuOpen}
                  onMenuToggle={setMenuOpen}
                  onPreview={setPreviewDocument}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((document) => (
                <DocumentListItem
                  key={document.id}
                  document={document}
                  menuOpen={menuOpen}
                  onMenuToggle={setMenuOpen}
                  onPreview={setPreviewDocument}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Document Preview Dialog */}
      <DocumentPreviewDialog
        open={previewDocument !== null}
        onOpenChange={(open) => !open && setPreviewDocument(null)}
        document={previewDocument}
      />
    </PageShell>
  );
}

function DocumentCard({
  document,
  menuOpen,
  onMenuToggle,
  onPreview,
}: {
  document: DocumentListItem;
  menuOpen: string | null;
  onMenuToggle: (id: string | null) => void;
  onPreview: (document: DocumentListItem) => void;
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
        onClick={() => onPreview(document)}
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
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(document);
          }}
          className="flex items-center gap-1 text-accent-blue hover:underline"
        >
          <Eye size={12} />
          预览
        </button>
      </div>
    </div>
  );
}

function DocumentListItem({
  document,
  menuOpen,
  onMenuToggle,
  onPreview,
}: {
  document: DocumentListItem;
  menuOpen: string | null;
  onMenuToggle: (id: string | null) => void;
  onPreview: (document: DocumentListItem) => void;
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
              onClick={() => onPreview(document)}
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
