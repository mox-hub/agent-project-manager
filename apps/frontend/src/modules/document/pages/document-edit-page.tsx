import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Code,
  Eye,
  FileText,
  MoreVertical,
  Save,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { PageShell } from '@/components/ui/page-shell';
import { Textarea } from '@/components/ui/textarea';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import type { DocumentCategory, DocumentItem, DocumentStatus } from '../api/document-api';
import { useDocumentDetail } from '../hooks/use-document-detail';
import { MarkdownLite, parseMarkdown } from '../components/markdown-lite';

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
  { value: 'draft', label: '草稿', dot: 'bg-slate-400' },
  { value: 'reviewing', label: '审核中', dot: 'bg-amber-500' },
  { value: 'published', label: '已发布', dot: 'bg-emerald-500' },
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
      <div className="mx-auto flex min-h-screen max-w-[600px] flex-col items-center justify-center bg-background p-8 text-center text-muted-foreground">
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
  data: DocumentItem;
  onClose: () => void;
}) {
  const [editorMode, setEditorMode] = useState<EditorMode>('split');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [tagInput, setTagInput] = useState('');

  const [title] = useState(data.title);
  const [content, setContent] = useState(data.content);
  const [category, setCategory] = useState<DocumentCategory>(data.category ?? 'requirement');
  const [status, setStatus] = useState<DocumentStatus>(data.status);
  const [tags, setTags] = useState<string[]>(data.tags ?? []);

  const parsed = useMemo(() => parseMarkdown(content), [content]);

  const handleAddTag = () => {
    const normalized = tagInput.trim();
    if (!normalized || tags.includes(normalized)) return;
    setTags((prev) => [...prev, normalized]);
    setTagInput('');
  };

  return (
    <PageShell className="overflow-hidden p-0" aiPage={CORE_AI_PAGE_IDS.documentEdit}>
      <div className="flex h-full flex-col border-t border-border bg-background">
        <header className="shrink-0 border-b border-border px-6 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                onClick={onClose}
              >
                <ArrowLeft size={18} />
              </button>
              <h1 className="truncate text-[26px] font-semibold text-foreground">{title || '未命名文档'}</h1>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-xl border border-border p-1">
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
              <Button className="h-10 gap-1.5 px-4 text-sm" onClick={onClose}>
                <Save size={14} /> 保存
              </Button>
            </div>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <aside className="w-[280px] shrink-0 border-r border-border bg-muted/20 p-4">
            <div className="space-y-4">
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
                        'rounded-xl border px-3 py-2 text-xs transition-colors',
                        status === option.value ? 'border-foreground bg-background text-foreground' : 'border-border bg-background/70 text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <span className={cn('mx-auto mb-1 block h-2.5 w-2.5 rounded-full', option.dot)} />
                      {option.label}
                    </button>
                  ))}
                  <button type="button" disabled className="rounded-xl border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground/70">
                    <span className="mx-auto mb-1 block h-2.5 w-2.5 rounded-full bg-slate-300" />已归档
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">标签</label>
                <div className="flex gap-2">
                  <Input value={tagInput} onChange={(event) => setTagInput(event.target.value)} placeholder="添加标签..." className="h-10 text-xs" />
                  <Button size="sm" className="h-10 px-3 text-sm" onClick={handleAddTag}>添加</Button>
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
                      {tag}
                      <button type="button" onClick={() => setTags((prev) => prev.filter((item) => item !== tag))}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
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
                <div className="flex h-10 items-center justify-between border-b border-border bg-muted/20 px-4 text-xs">
                  <span className="font-medium text-foreground">Markdown 编辑器</span>
                  <span className="text-muted-foreground">支持 GitHub Flavored Markdown</span>
                </div>
                <Textarea
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  className="h-full min-h-0 resize-none rounded-none border-0 bg-background p-5 font-mono text-[13px] leading-relaxed focus-visible:ring-0"
                />
              </div>
            ) : null}

            {(editorMode === 'preview' || editorMode === 'split') ? (
              <div className={cn('min-w-0 flex-1 overflow-auto bg-background', editorMode === 'split' ? 'w-1/2' : 'w-full')}>
                <div className="flex h-10 items-center border-b border-border bg-muted/20 px-4 text-sm font-medium text-foreground">预览</div>
                <article className="mx-auto w-full max-w-[980px] px-6 py-8">
                  <MarkdownLite blocks={parsed.blocks} />
                </article>
              </div>
            ) : null}
          </section>

          {showAiPanel ? (
            <aside className="w-[320px] shrink-0 border-l border-border bg-background">
              <div className="flex h-11 items-center justify-between border-b border-border px-4">
                <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <Sparkles size={15} className="text-violet-500" /> AI 助手
                </div>
                <button type="button" className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted" onClick={() => setShowAiPanel(false)}>
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-3 p-4">
                <Button variant="outline" className="h-10 w-full justify-start gap-2 text-sm"><Wand2 size={14} /> 优化文档结构</Button>
                <Button variant="outline" className="h-10 w-full justify-start gap-2 text-sm"><Wand2 size={14} /> 生成摘要</Button>
                <Textarea value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} placeholder="告诉 AI 你想要什么..." className="min-h-[120px] text-sm" />
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
