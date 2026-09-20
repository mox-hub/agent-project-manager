import { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
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
  Trash2,
  User,
  FileText,
  CheckSquare,
  Check,
  CheckCircle2,
  History,
  PencilLine,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { ChapterScrubber, type Chapter } from '@/components/ui/chapter-scrubber';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { SubscribeButton } from '@/shared/subscription/subscribe-button';
import { HeaderActionButton } from '@/components/ui/header-action-button';
import { MENU_ITEM_CLASS, MENU_SEPARATOR_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useDocumentDetail } from '../hooks/use-document-detail';
import { useUpdateDocument } from '../hooks/use-document-mutations';
import { useDocumentDeleteFlow } from '../hooks/use-document-delete';
import { SectionNavigation } from '../components/section-navigation';
import { DocumentTaskLinks } from '../components/document-task-links';
import { SectionTaskLinksList } from '../components/section-task-links-list';
import { MdxRenderer, OPEN_PICKER_FOR_ANCHOR_EVENT } from '../components/mdx-renderer';
import { extractHeadings, stripFrontmatter } from '@/shared/mdx';
import { parseFrontmatter } from '../services/mdx-frontmatter';
import { useMetadataSync } from '../services/metadata-sync.service';
import { VersionHistoryPanel } from '../components/version-history-panel';
import { DocumentPropertiesPanel } from '../components/document-properties-panel';
import { RevisionImpactBanner } from '../components/revision-impact-banner';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import { useSubmitForReview } from '../hooks/use-approval';
import { ApprovalStatus } from '../components/approval-dialog';
import { useSetViewingContext } from '@/shared/viewing-context';

// 章节目录数据源：与 MdxRenderer 同源的客户端标题提取。
// 服务端 DocumentSection 索引只在显式调 refresh 接口时才落库，常规创建/保存
// 流程不会写入，用它做目录恒为空；extractHeadings 与渲染锚点同函数生成，
// 目录与正文标题天然一致。
function useTocSections(documentId: string, content: string | undefined) {
  return useMemo(() => {
    if (!content) return [];
    return extractHeadings(stripFrontmatter(content)).map((h, index) => ({
      id: `${h.anchor}-${index}`,
      documentId,
      title: h.title,
      level: h.level,
      anchor: h.anchor,
      content: null,
      order: index,
      parentId: null,
      wordCount: 0,
      createdAt: '',
      updatedAt: '',
    }));
  }, [documentId, content]);
}

export function DocumentViewPage() {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'toc' | 'tasks' | 'versions'>('toc');
  const detailQuery = useDocumentDetail(documentId);
  const { copyToClipboard, isCopied } = useCopyToClipboard();
  // apm:// 稳定地址（v2 纪要 §13）：projectCode + shortId 齐备才展示
  const projectCode = detailQuery.data?.project?.projectCode;
  const docShortId = detailQuery.data?.shortId;
  const apmAddress =
    projectCode && docShortId ? `apm://${projectCode}/doc/${docShortId}` : null;
  // 向 AI 助手侧边栏上报「正在查看」上下文（卸载自动清除）
  useSetViewingContext(
    detailQuery.data
      ? { type: 'document', id: detailQuery.data.id, title: detailQuery.data.title }
      : null,
  );
  const tocSections = useTocSections(documentId, detailQuery.data?.content);
  const syncMetadata = useMetadataSync(documentId);  // 作者判定走 useAuth（react-query ['auth','me']，与路由守卫同源）:
  // app-store.currentUser 刷新后要等 boot 异步回填, 用它判定 isAuthor 会偶发漏渲染「提交审核」
  const { currentUser } = useAuth();
  const currentUserId = currentUser?.id ?? '';
  const currentProjectId = useAppStore((state) => state.currentProjectId ?? '');
  const submitForReview = useSubmitForReview();
  const updateDocument = useUpdateDocument();
  // 删除成功后导航回列表（列表 invalidate 由 useDeleteDocument 统一处理）
  const { confirmDelete: confirmDeleteDocument, isDeleting: isDeletingDocument } =
    useDocumentDeleteFlow({ redirectTo: '/app/documents' });

  const handleDeleteDocument = useCallback(async () => {
    setMenuOpen(false);
    await confirmDeleteDocument({ id: documentId, title: detailQuery.data?.title });
  }, [confirmDeleteDocument, documentId, detailQuery.data?.title]);

  // 属性面板写回：只更新 content（frontmatter），正文不动；DB 标签镜像由下方 syncMetadata 副作用跟随
  const handlePropertiesSave = useCallback(
    (nextContent: string) => {
      updateDocument.mutate({ documentId, data: { content: nextContent } });
    },
    [documentId, updateDocument],
  );

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

  // ── Chapter Scrubber（正文左侧刻度导航轨）──
  // 刻线数据与目录同源（useTocSections）；滚动监听驱动当前位置，点击平滑跳转。
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const articleRef = useRef<HTMLElement>(null);
  const [currentHeadingIndex, setCurrentHeadingIndex] = useState(0);

  const scrubberChapters: Chapter[] = useMemo(
    () =>
      tocSections.map((s) => ({
        id: s.id,
        title: s.title,
        level: s.level,
      })),
    [tocSections],
  );

  // 长文档自动加密行距（刻度轨最高约 560px），短文档用舒适密度
  const scrubberRowHeight = useMemo(() => {
    const count = scrubberChapters.length;
    if (count === 0) return 10;
    return Math.max(4, Math.min(10, Math.floor(560 / count)));
  }, [scrubberChapters.length]);

  useEffect(() => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl || scrubberChapters.length === 0) return;
    let raf = 0;
    const update = () => {
      const article = articleRef.current;
      if (!article) return;
      const headings = article.querySelectorAll('h1, h2, h3, h4, h5, h6');
      if (headings.length === 0) return;
      // 视口顶部下方 96px 处为当前阅读线，取最后一个越过阅读线的标题
      const readingLine = scrollEl.getBoundingClientRect().top + 96;
      let index = 0;
      headings.forEach((heading, i) => {
        if (heading.getBoundingClientRect().top <= readingLine) index = i;
      });
      setCurrentHeadingIndex(index);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    scrollEl.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scrollEl.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [scrubberChapters.length, detailQuery.data?.content]);

  const handleScrubberSelect = useCallback(
    (chapter: Chapter) => {
      const article = articleRef.current;
      if (!article) return;
      const index = scrubberChapters.findIndex((c) => c.id === chapter.id);
      const target = tocSections[index];
      if (index < 0 || !target) return;
      const headings = article.querySelectorAll('h1, h2, h3, h4, h5, h6');
      headings[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // 与目录点击同口径：更新高亮锚点与地址栏 hash
      setCurrentAnchor(target.anchor);
      window.history.pushState(null, '', `#${target.anchor}`);
    },
    [scrubberChapters, tocSections],
  );

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
            <SubscribeButton />
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
                  disabled={isDeletingDocument}
                  onClick={() => void handleDeleteDocument()}
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
                {tocSections.length > 0 ? (
                  <SectionNavigation
                    sections={tocSections}
                    documentId={documentId}
                    currentAnchor={currentAnchor}
                    onSelectSection={handleSectionSelect}
                  />
                ) : detailQuery.isLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">加载中...</div>
                ) : (
                  <EmptyState title="暂无章节" />
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
                {document.docRole && (
                  <Badge variant="outline" className="shrink-0 font-normal text-11">
                    {document.docRole}
                  </Badge>
                )}
                {apmAddress ? (
                  <button
                    type="button"
                    onClick={() => copyToClipboard(apmAddress)}
                    title="复制 apm:// 地址"
                    data-ai-component="document.document-view.apm-address"
                    className="inline-flex shrink-0 items-center gap-1 rounded-full border border-border px-2 py-0.5 font-mono text-11 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                  >
                    {isCopied ? <Check size={12} /> : <Copy size={12} />}
                    {apmAddress}
                  </button>
                ) : null}
              </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><User size={15} /> {document.authorId}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {new Date(document.updatedAt).toLocaleString('zh-CN')}</span>
                  <span className="inline-flex items-center gap-1.5"><GitBranch size={15} /> {document.wordCount} 字</span>
                  {document.status === 'published' && document.publishedAt ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 text-accent-green">
                        <CheckCircle2 size={15} /> 已发布 · {new Date(document.publishedAt).toLocaleDateString('zh-CN')}
                      </span>
                      {document.publishedVersionId && (
                        <span
                          className="inline-flex items-center gap-1 text-muted-foreground"
                          title="已存档发布冻结版，验收与外部引用以此版本为证据"
                        >
                          <History size={15} /> 冻结版已存档
                        </span>
                      )}
                    </>
                  ) : document.docRole === 'spec' ? (
                    <span className="inline-flex items-center gap-1.5 text-accent-yellow">
                      <ShieldAlert size={15} /> 门禁：需审批后发布
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5">
                      <PencilLine size={15} /> 编辑中
                    </span>
                  )}
                </div>
                <div className="mt-4">
                  <DocumentPropertiesPanel
                    content={detailQuery.data.content}
                    editable={isAuthor}
                    onSave={handlePropertiesSave}
                  />
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

          <div className="flex min-h-0 flex-1">
            {/* 章节刻度导航轨：正文左缘，≥lg 视口且 ≥2 个标题时显示 */}
            {scrubberChapters.length >= 2 && (
              <div className="hidden shrink-0 items-center pl-3 pr-1 lg:flex">
                <ChapterScrubber
                  chapters={scrubberChapters}
                  currentIndex={currentHeadingIndex}
                  onSelect={handleScrubberSelect}
                  side="right"
                  rowHeight={scrubberRowHeight}
                  restLength={16}
                  peakLength={44}
                  label="文章章节"
                />
              </div>
            )}
            <div ref={scrollContainerRef} className="min-w-0 flex-1 overflow-auto">
              <article ref={articleRef} className="mx-auto w-full max-w-240 px-6 py-10">
              <RevisionImpactBanner
                documentId={documentId}
                category={document.category}
              />
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
        </div>
        </section>
      </div>
    </PageShell>
  );
}
