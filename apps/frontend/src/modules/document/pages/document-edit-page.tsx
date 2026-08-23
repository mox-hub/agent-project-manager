import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Code,
  Eye,
  FileText,
  MoreVertical,
  Save,
  Sparkles,
  Wand2,
  X,
  Plus,
  Hash,
  Image as ImageIcon,
  AlignLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { PageShell } from '@/components/ui/page-shell';
import { SubPageToolbar } from '@/components/ui/sub-page-toolbar';
import { FavoriteToggle } from '@/shared/components/favorite-toggle';
import { Textarea } from '@/components/ui/textarea';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import type { DocumentCategory, Document, DocumentStatus } from '../api/document-api';
import { useDocumentDetail } from '../hooks/use-document-detail';
import { useUpdateDocument } from '../hooks/use-document-mutations';
import { useCreateVersion } from '../hooks/use-document-versions';
import { useAppStore } from '@/infrastructure/store/app-store';
import { parseFrontmatter, mergeFrontmatter, type DocumentFrontmatter } from '../services/mdx-frontmatter';
import { MdxRenderer } from '../components/mdx-renderer';
import { MdxEditor, type MdxEditorRef } from '../components/mdx-editor';
import { MdxToolbar } from '../components/mdx-toolbar';

type EditorMode = 'edit' | 'split' | 'preview';

const CATEGORY_OPTIONS: Array<{ value: DocumentCategory; label: string }> = [
  { value: 'requirement', label: '需求文档' },
  { value: 'design', label: '设计文档' },
  { value: 'api', label: 'API 文档' },
  { value: 'testing', label: '测试文档' },
  { value: 'guide', label: '用户指南' },
  { value: 'custom', label: '自定义' },
];

const STATUS_OPTIONS: Array<{ value: DocumentStatus; label: string; dot: string }> = [
  { value: 'draft', label: '草稿', dot: 'bg-muted-foreground' },
  { value: 'reviewing', label: '审核中', dot: 'bg-accent-yellow' },
  { value: 'published', label: '已发布', dot: 'bg-accent-green' },
];

export function DocumentEditPage() {
  const navigate = useNavigate();
  const { documentId = '' } = useParams<{ documentId: string }>();
  const { data, isLoading, isError } = useDocumentDetail(documentId);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-8 text-sm text-muted-foreground">
        正在加载编辑器...
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto flex min-h-screen max-w-150 flex-col items-center justify-center bg-background p-8 text-center text-muted-foreground">
        文档编辑器加载失败
      </div>
    );
  }

  return <DocumentEditWorkspace key={data.id} data={data} onClose={() => navigate(`/app/documents/${data.id}`)} />;
}

function DocumentEditWorkspace({
  data,
  onClose,
}: {
  data: Document;
  onClose: () => void;
}) {
  const [editorMode, setEditorMode] = useState<EditorMode>('split');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [tagInput, setTagInput] = useState('');
  const editorRef = useRef<MdxEditorRef | null>(null);

  const [title] = useState(data.title);
  const initialFrontmatter = useMemo(() => parseFrontmatter(data.content).data, [data.content]);
  const [content, setContent] = useState(data.content);
  const [category, setCategory] = useState<DocumentCategory>(data.category ?? 'custom');
  const [status, setStatus] = useState<DocumentStatus>(data.status);

  // 元数据 (frontmatter) 草稿态
  const [summary, setSummary] = useState<string>(initialFrontmatter.summary ?? '');
  const [coverImage, setCoverImage] = useState<string>(initialFrontmatter.coverImage ?? '');
  const [tags, setTags] = useState<string[]>(initialFrontmatter.tags ?? []);

  const updateDocument = useUpdateDocument();
  const createVersion = useCreateVersion(data.id);
  const currentUserId = useAppStore((s) => s.currentUser?.id ?? '');

  const addTag = () => {
    const t = tagInput.trim();
    if (!t) return;
    if (tags.includes(t)) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, t]);
    setTagInput('');
  };

  const removeTag = (t: string) => {
    setTags((prev) => prev.filter((x) => x !== t));
  };

  const handleSave = () => {
    // 把元数据合并到 markdown 顶部的 frontmatter, 再随 content 一起提交
    const overrides: Partial<DocumentFrontmatter> = {
      title,
      summary: summary.trim() || undefined,
      coverImage: coverImage.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      updated: new Date().toISOString(),
    };
    const nextContent = mergeFrontmatter(content, overrides);
    updateDocument.mutate({
      documentId: data.id,
      data: { title, content: nextContent, category, status },
    });
    // 保存时同时创建一个版本快照 (DB + Git 同步)
    if (currentUserId) {
      createVersion.mutate({
        data: { content: nextContent, summary: '手动保存快照' },
        createdBy: currentUserId,
      });
    }
  };

  // 定时自动快照: 每 10 分钟
  useEffect(() => {
    if (!currentUserId) return;
    const timer = window.setInterval(() => {
      if (content && content !== data.content) {
        const overrides: Partial<DocumentFrontmatter> = {
          title,
          summary: summary.trim() || undefined,
          coverImage: coverImage.trim() || undefined,
          tags: tags.length > 0 ? tags : undefined,
          updated: new Date().toISOString(),
        };
        const nextContent = mergeFrontmatter(content, overrides);
        createVersion.mutate({
          data: { content: nextContent, summary: '定时自动快照' },
          createdBy: currentUserId,
        });
      }
    }, 10 * 60 * 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, data.content, currentUserId]);

  // 键盘快捷键: Ctrl/Cmd+S 触发保存
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title, summary, coverImage, tags, category, status, currentUserId]);

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.documentEdit}>
      {/* 子页面工具栏：返回 + 面包屑 */}
      <SubPageToolbar
        aiId="document.document-edit"
        onBack={onClose}
        breadcrumbs={[
          { label: '文档管理', to: '/app/documents' },
          { label: title || '未命名文档' },
        ]}
        actions={<FavoriteToggle label={title || '未命名文档'} />}
      />
      <div className="flex flex-1 min-h-0 flex-col border-t border-border bg-background">
        <header className="shrink-0 border-b border-border px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-2xl font-semibold text-foreground">{title || '未命名文档'}</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-1">
                <button
                  type="button"
                  className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm', editorMode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                  onClick={() => setEditorMode('edit')}
                >
                  <Code size={14} /> 编辑
                </button>
                <button
                  type="button"
                  className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm', editorMode === 'split' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                  onClick={() => setEditorMode('split')}
                >
                  <FileText size={14} /> 分屏
                </button>
                <button
                  type="button"
                  className={cn('inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm', editorMode === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted')}
                  onClick={() => setEditorMode('preview')}
                >
                  <Eye size={14} /> 预览
                </button>
              </div>

              <Button variant="outline" size="sm" className="h-10 gap-1.5 text-sm" onClick={() => setShowAiPanel((value) => !value)}>
                <Sparkles size={14} /> AI 助手
              </Button>
              <Button variant="outline" size="icon" className="h-10 w-10">
                <MoreVertical size={16} />
              </Button>
              <Button className="h-10 gap-1.5 px-4 text-sm" onClick={handleSave} disabled={updateDocument.isPending}>
                <Save size={14} /> 保存
              </Button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="w-80 shrink-0 overflow-y-auto border-r border-border bg-muted/20 p-4">
            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">文档分类</label>
                <NativeSelect value={category} onChange={(event) => setCategory(event.target.value as DocumentCategory)}>
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </NativeSelect>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">文档状态</label>
                <div className="grid grid-cols-2 gap-2">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStatus(option.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs transition-colors',
                        status === option.value ? 'border-foreground bg-background text-foreground' : 'border-border bg-background/70 text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <span className={cn('mx-auto mb-1 block h-2.5 w-2.5 rounded-full', option.dot)} />
                      {option.label}
                    </button>
                  ))}
                  <button type="button" disabled className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground/70">
                    <span className="mx-auto mb-1 block h-2.5 w-2.5 rounded-full bg-muted-foreground" />已归档
                  </button>
                </div>
              </div>

              {/* 文档元数据 (frontmatter) */}
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Hash size={12} /> 文档元数据
                </h3>
                <p className="text-11 leading-relaxed text-muted-foreground">
                  随 Markdown 一起保存到文档 frontmatter (YAML 头部), 详情页会自动展示。
                </p>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground">
                    <AlignLeft size={11} /> 摘要
                  </label>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder="一句话说明这篇文档讲什么..."
                    className="min-h-16 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 flex items-center gap-1 text-xs font-medium text-foreground">
                    <ImageIcon size={11} /> 封面图 URL
                  </label>
                  <Input
                    value={coverImage}
                    onChange={(e) => setCoverImage(e.target.value)}
                    placeholder="https://..."
                    className="h-8 text-sm"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-foreground">标签 (只读, 来源 frontmatter)</label>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.length === 0 && (
                      <span className="text-11 text-muted-foreground">暂无标签, 在 frontmatter 添加 <code className="rounded bg-muted px-1 font-mono text-10">tags: [a, b]</code></span>
                    )}
                    {tags.map((t) => (
                      <span
                        key={t}
                        className="inline-flex items-center gap-1 rounded-full bg-accent-blue/10 px-2.5 py-0.5 text-xs text-accent-blue"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                <div className="flex justify-between py-0.5"><span>字符数</span><span>{content.length}</span></div>
                <div className="flex justify-between py-0.5"><span>单词数</span><span>{content.split(/\s+/).filter(Boolean).length}</span></div>
                <div className="flex justify-between py-0.5"><span>行数</span><span>{content.split('\n').length}</span></div>
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 overflow-hidden">
            {(editorMode === 'edit' || editorMode === 'split') ? (
              <div className={cn('flex min-w-0 flex-col overflow-hidden', editorMode === 'split' ? 'w-1/2 border-r border-border' : 'w-full')}>
                <MdxToolbar editorRef={editorRef} />
                <MdxEditor
                  value={content}
                  onChange={setContent}
                  className="flex-1"
                />
              </div>
            ) : null}

            {(editorMode === 'preview' || editorMode === 'split') ? (
              <div className={cn('min-w-0 flex-1 overflow-auto bg-background', editorMode === 'split' ? 'w-1/2' : 'w-full')}>
                <div className="flex h-10 items-center border-b border-border bg-muted/20 px-4 text-sm font-medium text-foreground">预览</div>
                <article className="mx-auto w-full max-w-245 px-6 py-8">
                  <MdxRenderer source={content} />
                </article>
              </div>
            ) : null}
          </section>

          {showAiPanel ? (
            <aside className="w-80 shrink-0 border-l border-border bg-background">
              <div className="flex h-11 items-center justify-between border-b border-border px-4">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles size={15} className="text-accent-purple" /> AI 助手
                </div>
                <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted" onClick={() => setShowAiPanel(false)}>
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-3 p-4">
                <Button variant="outline" className="h-10 w-full justify-start gap-2 text-sm"><Wand2 size={14} /> 优化文档结构</Button>
                <Button variant="outline" className="h-10 w-full justify-start gap-2 text-sm"><Wand2 size={14} /> 生成摘要</Button>
                <Textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="告诉 AI 你想要什么..." className="min-h-30 text-sm" />
                <Button className="h-10 w-full gap-1.5 text-sm" disabled={!aiPrompt.trim()}>
                  <Sparkles size={14} /> 生成内容
                </Button>
              </div>
            </aside>
          ) : null}
        </div>
      </div>
    </PageShell>
  );
}
