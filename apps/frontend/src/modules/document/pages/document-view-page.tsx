import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { MENU_ITEM_CLASS, MENU_SEPARATOR_CLASS, MENU_SURFACE_CLASS } from '@/components/ui/menu-surface';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import { useDocumentDetail } from '../hooks/use-document-detail';
import { MarkdownLite, parseMarkdown } from '../components/markdown-lite';

function buildRelatedItems(path: string, moduleName: string, count: number) {
  if (count <= 0) return [];
  const items = [
    `${moduleName.toUpperCase()} Workspace`,
    path.split('/').slice(0, 2).join('/'),
    'API 设计规范',
  ];
  return items.slice(0, Math.min(count, items.length));
}

export function DocumentViewPage() {
  const { documentId = '' } = useParams<{ documentId: string }>();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const detailQuery = useDocumentDetail(documentId);

  const parsed = useMemo(
    () => parseMarkdown(detailQuery.data?.content ?? ''),
    [detailQuery.data?.content],
  );

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
  const tags = document.tags ?? [];
  const links = buildRelatedItems(document.path, document.module, document.linkCount ?? 0);

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.documentView}>
      <div className="flex h-full border-t border-border bg-background">
        <aside className="hidden w-[280px] shrink-0 border-r border-border bg-muted/20 xl:flex xl:flex-col">
          <div className="h-[56px] border-b border-border px-5 py-4 text-base font-semibold text-foreground">目录</div>
          <nav className="flex-1 overflow-y-auto px-4 py-4">
            {parsed.headings.length === 0 ? (
              <p className="px-3 text-sm text-muted-foreground">暂无目录</p>
            ) : (
              parsed.headings.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={cn(
                    'mb-1 block rounded-md px-3 py-1.5 text-sm font-medium text-foreground/90 transition-colors hover:bg-muted',
                    item.level >= 3 && 'pl-7 text-[13px] font-normal text-muted-foreground',
                    item.level >= 4 && 'pl-12',
                  )}
                >
                  {item.title}
                </a>
              ))
            )}
          </nav>
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
                  <h1 className="truncate text-[28px] font-semibold leading-tight text-foreground">{document.title}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5"><User size={15} /> {document.updatedBy}</span>
                  <span className="inline-flex items-center gap-1.5"><Clock size={15} /> {new Date(document.updatedAt).toLocaleString('zh-CN')}</span>
                  <span className="inline-flex items-center gap-1.5"><GitBranch size={15} /> 版本 {document.currentVersion ?? '1.0'}</span>
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
                <Link
                  to={`/app/documents/${document.id}/edit`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium text-foreground no-underline hover:bg-muted"
                >
                  <Edit size={15} /> 编辑
                </Link>
                <button
                  type="button"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-muted"
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
                      className={`${MENU_ITEM_CLASS} gap-2 justify-start text-left text-rose-500 hover:bg-rose-500/10 hover:text-rose-500`}
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
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1 text-xs font-medium text-foreground hover:bg-muted"
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
