import { useMemo, useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
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
import { MENU_ITEM_CLASS, MENU_SEPARATOR_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { useDocumentDetail } from '../hooks/use-document-detail';
import { MarkdownLite, parseMarkdown } from '../components/markdown-lite';
import { SectionNavigation } from '../components/section-navigation';
import { DocumentTaskLinks } from '../components/document-task-links';
import { useDocumentSections } from '../hooks/use-document-sections';
import { useAppStore } from '@/infrastructure/store/app-store';
import { useSubmitForReview } from '../hooks/use-approval';
import { ApprovalStatus } from '../components/approval-dialog';
import type { Document } from '../api/document-api';

export function DocumentViewPage() {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'toc' | 'tasks' | 'versions'>('toc');
  const detailQuery = useDocumentDetail(documentId);
  const sectionsQuery = useDocumentSections(documentId);
  const currentUserId = useAppStore((state) => state.currentUser?.id ?? '');
  const currentProjectId = useAppStore((state) => state.currentProjectId ?? '');

  const parsed = useMemo(
    () => parseMarkdown(detailQuery.data?.content ?? ''),
    [detailQuery.data?.content],
  );

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

  if (detailQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">
        正在加载文档内容...
      </div>
    );
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-background p-8 text-center text-muted-foreground">
        文档不存在或加载失败
      </div>
    );
  }

  const document = detailQuery.data;
  const tags: string[] = [];
  const links: string[] = [];

  const submitForReview = useSubmitForReview();
  const isAuthor = currentUserId === document.authorId;

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.documentView}>
      <div className="flex h-full border-t border-border bg-background">
        {/* 左侧边栏 - 章节导航和任务关联 */}
        <aside className="hidden w-[300px] shrink-0 border-r border-border bg-muted/20 xl:flex xl:flex-col">
          {/* 标签页切换 */}
          <div className="flex h-[56px] shrink-0 items-center gap-1 border-b border-border px-3">
            <button
              type="button"
              onClick={() => setActiveTab('toc')}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                activeTab === 'toc' ? 'bg-background shadow-sm' : 'hover:bg-background/50',
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
                activeTab === 'tasks' ? 'bg-background shadow-sm' : 'hover:bg-background/50',
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
                activeTab === 'versions' ? 'bg-background shadow-sm' : 'hover:bg-background/50',
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
              <div className="h-full overflow-y-auto p-4">
                <DocumentTaskLinks
                  documentId={documentId}
                  projectId={currentProjectId}
                  currentUserId={currentUserId}
                />
              </div>
            )}

            {activeTab === 'versions' && (
              <div className="h-full overflow-y-auto p-4">
                <div className="text-sm text-muted-foreground">版本历史功能开发中...</div>
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className="shrink-0 border-b border-border bg-background">
            <div className="flex items-start justify-between gap-4 px-6 py-5">
              <div className="min-w-0">
                <div className="mb-3 flex items-center gap-3">
                  <button
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                    onClick={() => navigate('/app/documents')}
                    aria-label="返回文档列表"
                  >
                    <ArrowLeft size={18} />
                  </button>
                  <h1 className="truncate text-3xl font-semibold leading-tight text-foreground">{document.title}</h1>
                  <ApprovalStatus status={document.status as any} />
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
              </div>

              <div className="relative flex shrink-0 items-center gap-2">
                {isAuthor && document.status === 'draft' && (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-accent-blue px-3 text-sm font-medium text-white hover:bg-accent-blue/90"
                    onClick={() => submitForReview.mutate({ documentId: document.id })}
                    disabled={submitForReview.isPending}
                  >
                    <Send size={15} /> 提交审核
                  </button>
                )}
                <Link
                  to={`/app/documents/${document.id}/edit`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground no-underline hover:bg-muted"
                >
                  <Edit size={15} /> 编辑
                </Link>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border hover:bg-muted"
                  onClick={() => setMenuOpen((value) => !value)}
                >
                  <MoreVertical size={16} />
                </button>

                {menuOpen ? (
                  <div className={`absolute right-0 top-[42px] z-30 w-[190px] p-1 motion-enter ${MENU_SURFACE_CLASS}`}>
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
            <article className="mx-auto w-full max-w-[960px] px-6 py-10">
              <MarkdownLite blocks={parsed.blocks} className="tracking-[0.01em]" />
            </article>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
