import { useMemo, useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bookmark,
  Clock,
  Copy,
  Download,
  Edit,
  ExternalLink,
  GitBranch,
  Link as LinkIcon,
  MoreVertical,
  Share2,
  Tag,
  Trash2,
  User,
  FileText,
  CheckSquare,
  History,
  Send,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { MENU_ITEM_CLASS, MENU_SEPARATOR_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { useDocumentDetail } from '../hooks/use-document-detail';
import { SectionNavigation } from '../components/section-navigation';
import { DocumentTaskLinks } from '../components/document-task-links';
import { SectionTaskLinksList } from '../components/section-task-links-list';
import { useDocumentSections } from '../hooks/use-document-sections';
import { MdxRenderer, OPEN_PICKER_FOR_ANCHOR_EVENT } from '../components/mdx-renderer';
import { parseFrontmatter } from '../services/mdx-frontmatter';
import { useMetadataSync } from '../services/metadata-sync.service';
import { VersionHistoryPanel } from '../components/version-history-panel';
import { DocumentTagManager } from '../components/document-tag-manager';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useSubmitForReview } from '../hooks/use-approval';
import { ApprovalStatus } from '../components/approval-dialog';

export function DocumentViewPage() {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'toc' | 'tasks' | 'versions'>('toc');
  const detailQuery = useDocumentDetail(documentId);
  const sectionsQuery = useDocumentSections(documentId);
  const syncMetadata = useMetadataSync(documentId);
  const currentUserId = useAppStore((state) => state.currentUser?.id ?? '');
  const currentProjectId = useAppStore((state) => state.currentProjectId ?? '');
  const submitForReview = useSubmitForReview();

  const { data: frontmatter } = useMemo(() => {
    const raw = detailQuery.data?.content ?? '';
    return parseFrontmatter(raw);
  }, [detailQuery.data?.content]);

  // 获取当前激活的锚点
  const [currentAnchor, setCurrentAnchor] = useState<string | undefined>();

  // 监听 hash 变化
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1);
      setCurrentAnchor(hash || undefined);
    };
    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // 处理章节选择
  const handleSectionSelect = (section: { anchor: string }) => {
    setCurrentAnchor(section.anchor);
    window.history.pushState(null, '', `#${section.anchor}`);
  };

  // 待派发的徽章点击事件: 先切 tab, 下一帧 SectionTaskLinksList 挂载后由 effect 派发
  const [pendingBadgeAnchor, setPendingBadgeAnchor] = useState<string | null>(null);

  const handleBadgeClick = useCallback(
    (detail: { anchor: string; count: number }) => {
      setActiveTab('tasks');
      setPendingBadgeAnchor(detail.anchor);
    },
    [],
  );

  // SectionTaskLinksList 挂载到 tab==='tasks' 之后, 我们把 pending 派发出去
  useEffect(() => {
    if (activeTab !== 'tasks' || !pendingBadgeAnchor) return;
    // 给 SectionTaskLinksList 一次 render + effect 安装的时间
    const t = window.setTimeout(() => {
      window.dispatchEvent(
        new CustomEvent(OPEN_PICKER_FOR_ANCHOR_EVENT, {
          detail: { anchor: pendingBadgeAnchor },
        }),
      );
      setPendingBadgeAnchor(null);
    }, 80);
    return () => window.clearTimeout(t);
  }, [activeTab, pendingBadgeAnchor]);

  // Phase 5: 读时同步 frontmatter → DocumentTag
  useEffect(() => {
    const content = detailQuery.data?.content;
    if (content) {
      syncMetadata(content).catch((err) => {
        console.warn('[document-view] metadata sync failed:', err);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailQuery.data?.content]);

  // 优先使用文档自身的 projectId; 文档未绑定项目时回退到 store 的 currentProjectId
  const effectiveProjectId =
    detailQuery.data?.projectId || currentProjectId;

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">
        正在加载文档内容...
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-150 flex-col items-center justify-center bg-background p-8 text-center text-muted-foreground">
        文档不存在或加载失败
      </div>
    );
  }

  const document = detailQuery.data;
  const tags: string[] = [];
  const links: string[] = [];

  const isAuthor = currentUserId === document.authorId;

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.documentView}>
      {/* 子页面工具栏：返回 + 面包屑 + 操作按钮 */}
      <SubPageToolbar
        aiId="document.document-view"
        onBack={() => navigate('/app/documents')}
        breadcrumbs={[
          { label: '文档管理', to: '/app/documents' },
          { label: document.title },
        ]}
        actions={
          <div className="relative flex items-center gap-2">
            <FavoriteToggle label={document.title} />
            {isAuthor && document.status === 'draft' && (
              <HeaderActionButton
                variant="primary"
                icon={Send}
                label="提交审核"
                disabled={submitForReview.isPending}
                onClick={() => submitForReview.mutate({ documentId: document.id })}
              />
            )}
            <HeaderActionButton
              variant="outline"
              icon={Edit}
              label="编辑"
              onClick={() => navigate(`/app/documents/${document.id}/edit`)}
            />
            <HeaderActionButton
              variant="outline"
              icon={MoreVertical}
              label="更多"
              pinned={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
            />

            {menuOpen ? (
              <div className={`absolute right-0 top-10.5 z-30 w-47.5 p-1 motion-enter ${MENU_SURFACE_CLASS}`}>
                <button type="button" className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left`} onClick={() => setMenuOpen(false)}>
                  <Share2 size={14} /> 分享
                </button>
                <button type="button" className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left`} onClick={() => setMenuOpen(false)}>
                  <Copy size={14} /> 复制链接
                </button>
                <button type="button" className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left`} onClick={() => setMenuOpen(false)}>
                  <Download size={14} /> 导出 Markdown
                </button>
                <button type="button" className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left`} onClick={() => setMenuOpen(false)}>
                  <Bookmark size={14} /> 添加书签
                </button>
                <div className={MENU_SEPARATOR_CLASS} />
                <button
                  type="button"
                  className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left text-accent-red hover:bg-accent-red-light hover:text-accent-red`}
                  onClick={() => setMenuOpen(false)}
                >
                  <Trash2 size={14} /> 删除文档
                </button>
              </div>
            ) : null}
          </div>
        }
      />
      <div className="flex flex-1 min-h-0 overflow-hidden border-t border-border bg-background">
        {/* 左侧边栏 - 章节导航和任务关联 */}
        <aside className="hidden w-75 shrink-0 border-r border-border bg-muted/20 xl:flex xl:flex-col">
          {/* 标签页切换 */}
          <div className="flex h-14 shrink-0 items-center gap-1 border-b border-border px-3">
            <button
              type="button"
              onClick={() => setActiveTab('toc')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'toc' ? 'bg-background shadow-xs' : 'hover:bg-background/50',
              )}
            >
              <FileText size={14} />
              目录
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'tasks' ? 'bg-background shadow-xs' : 'hover:bg-background/50',
              )}
            >
              <CheckSquare size={14} />
              任务
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('versions')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'versions' ? 'bg-background shadow-xs' : 'hover:bg-background/50',
              )}
            >
              <History size={14} />
              版本
            </button>
          </div>

          {/* 内容区域 */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'toc' && (
              <div className="h-full overflow-y-auto py-2">
                {sectionsQuery.data && sectionsQuery.data.length > 0 ? (
                  <SectionNavigation
                    sections={sectionsQuery.data}
                    documentId={documentId}
                    currentAnchor={currentAnchor}
                    onSelectSection={handleSectionSelect}
                  />
                ) : (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {sectionsQuery.isLoading ? '加载中...' : '暂无章节'}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'tasks' && (
              <div className="h-full overflow-y-auto p-4 space-y-5">
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">文档级关联</h4>
                  <DocumentTaskLinks
                    documentId={documentId}
                    projectId={currentProjectId}
                    currentUserId={currentUserId}
                  />
                </div>
                <div>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">段落级关联 (按章节)</h4>
                  <SectionTaskLinksList
                    documentId={documentId}
                    projectId={effectiveProjectId}
                  />
                </div>
              </div>
            )}

            {activeTab === 'versions' && (
              <div className="h-full overflow-y-auto">
                <VersionHistoryPanel documentId={documentId} />
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-border bg-background">
            <div className="flex items-start justify-between gap-4 px-6 py-5">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-3">
                <h1 className="truncate text-3xl font-semibold leading-tight text-foreground">{document.title}</h1>
                <ApprovalStatus status={document.status as 'pending' | 'approved' | 'rejected' | 'draft' | 'reviewing' | 'published'} />
              </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><User size={15} /> {document.authorId}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {new Date(document.updatedAt).toLocaleString('zh-CN')}</span>
                  <span className="inline-flex items-center gap-1.5"><GitBranch size={15} /> {document.wordCount} 字</span>
                </div>
                {tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Tag size={15} className="text-muted-foreground" />
                    {tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{tag}</span>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 border-t border-border pt-3">
                  <DocumentTagManager documentId={documentId} />
                </div>
              </div>
            </div>

            {links.length > 0 ? (
              <div className="border-t border-border px-6 py-3">
                <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <LinkIcon size={15} /> 关联项 ({links.length})
                </div>
                <div className="flex flex-wrap gap-2">
                  {links.map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
                    >
                      {item}
                      <ExternalLink size={13} className="text-muted-foreground" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </header>

          <div className="flex-1 overflow-auto">
            <article className="mx-auto w-full max-w-240 px-6 py-10">
              {frontmatter.summary ? (
                <p className="mb-6 rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  {frontmatter.summary}
                </p>
              ) : null}
              <MdxRenderer
                source={detailQuery.data?.content ?? ''}
                className="tracking-[0.01em]"
                documentId={documentId}
                projectId={currentProjectId}
                onBadgeClick={handleBadgeClick}
              />
            </article>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
