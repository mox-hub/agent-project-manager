import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Code,
  Eye,
  FileText,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NativeSelect } from '@/components/ui/native-select';
import { PageShell } from '@/components/ui/page-shell';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { CORE_AI_PAGE_IDS } from '@/shared/ai/identifiers';
import { cn } from '@/lib/utils';
import type { DocumentCategory, DocumentStatus } from '../api/document-api';
import { useCreateDocument } from '../hooks/use-document-mutations';
import { useSyncWarnings } from '../hooks/use-sync-warnings';
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

export function DocumentNewPage() {
  const navigate = useNavigate();
  const [editorMode, setEditorMode] = useState<EditorMode>('split');
  const [showAiPanel, setShowAiPanel] = useState(false);
  const editorRef = useRef<MdxEditorRef | null>(null);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('custom');
  const [status, setStatus] = useState<DocumentStatus>('draft');

  const createDocument = useCreateDocument();
  const { data: syncWarnings } = useSyncWarnings();
  const { toast } = useToast();

  const handleSave = () => {
    if (!title.trim()) {
      toast({
        title: '请输入文档标题',
        description: '标题不能为空, 请填写后再保存',
        variant: 'destructive',
      });
      return;
    }
    console.log('[DocumentNew] Creating document with:', { title: title.trim(), content, category });
    createDocument.mutate(
      { title: title.trim(), content, category },
      {
        onSuccess: (document) => {
          console.log('[DocumentNew] Document created successfully:', document);
          // 创建后立即查一次 warnings, 如果落盘失败, 弹窗告知用户
          // (后端是异步落盘, 这里给 1s 缓冲让首次写入尝试执行)
          window.setTimeout(() => {
            const warning = (syncWarnings ?? []).find((w) => w.documentId === document.id);
            if (warning) {
              toast({
                title: '本地文件落盘失败',
                description: `已重试 ${warning.attempts} 次仍未写入, 数据库已保存. 错误: ${warning.lastError}`,
                variant: 'destructive',
              });
            } else {
              toast({
                title: '文档创建成功',
                description: '本地文件已同步落盘',
              });
            }
          }, 1000);
          navigate(`/app/documents/${document.id}`);
        },
        onError: (error: unknown) => {
          console.error('[DocumentNew] Create failed:', error);
          const errorMessage =
            (error as { response?: { data?: { message?: string; error?: { message?: string } } }; message?: string })
              ?.response?.data?.error?.message ||
            (error as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ||
            (error as Error)?.message ||
            '未知错误';
          toast({
            title: '创建文档失败',
            description: errorMessage,
            variant: 'destructive',
          });
        },
      },
    );
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
                onClick={() => navigate('/app/documents')}
              >
                <ArrowLeft size={18} />
              </button>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="输入文档标题..."
                className="min-w-0 flex-1 bg-transparent text-2xl font-semibold text-foreground outline-none placeholder:text-muted-foreground"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-lg border border-border p-1">
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm',
                    editorMode === 'edit' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => setEditorMode('edit')}
                >
                  <Code size={14} /> 编辑
                </button>
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm',
                    editorMode === 'split' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => setEditorMode('split')}
                >
                  <FileText size={14} /> 分屏
                </button>
                <button
                  type="button"
                  className={cn(
                    'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm',
                    editorMode === 'preview' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
                  )}
                  onClick={() => setEditorMode('preview')}
                >
                  <Eye size={14} /> 预览
                </button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-1.5 text-sm"
                onClick={() => setShowAiPanel((value) => !value)}
              >
                <Sparkles size={14} /> AI 助手
              </Button>
              <Button
                className="h-10 gap-1.5 px-4 text-sm"
                onClick={handleSave}
                disabled={createDocument.isPending}
              >
                <Save size={14} /> {createDocument.isPending ? '保存中...' : '创建文档'}
              </Button>
            </div>
          </div>
        </header>

        <div className="flex h-full flex-1 overflow-hidden">
          <aside className="w-70 shrink-0 border-r border-border bg-muted/20 p-4">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">文档分类</label>
                <NativeSelect
                  value={category}
                  onChange={(event) => setCategory(event.target.value as DocumentCategory)}
                >
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
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
                        status === option.value
                          ? 'border-foreground bg-background text-foreground'
                          : 'border-border bg-background/70 text-muted-foreground hover:bg-muted',
                      )}
                    >
                      <span className={cn('mx-auto mb-1 block h-2.5 w-2.5 rounded-full', option.dot)} />
                      {option.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled
                    className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-muted-foreground/70"
                  >
                    <span className="mx-auto mb-1 block h-2.5 w-2.5 rounded-full bg-muted-foreground" />
                    已归档
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-3 text-xs text-muted-foreground">
                <div className="flex justify-between py-0.5">
                  <span>字符数</span>
                  <span>{content.length}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>单词数</span>
                  <span>{content.split(/\s+/).filter(Boolean).length}</span>
                </div>
                <div className="flex justify-between py-0.5">
                  <span>行数</span>
                  <span>{content.split('\n').length}</span>
                </div>
              </div>
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 overflow-hidden">
            {editorMode === 'edit' || editorMode === 'split' ? (
              <div
                className={cn(
                  'flex min-w-0 flex-col overflow-hidden',
                  editorMode === 'split' ? 'w-1/2 border-r border-border' : 'w-full',
                )}
              >
                <MdxToolbar editorRef={editorRef} />
                <MdxEditor
                  value={content}
                  onChange={setContent}
                  className="flex-1"
                />
              </div>
            ) : null}

            {editorMode === 'preview' || editorMode === 'split' ? (
              <div
                className={cn(
                  'min-w-0 flex-1 overflow-auto bg-background',
                  editorMode === 'split' ? 'w-1/2' : 'w-full',
                )}
              >
                <div className="flex h-10 items-center border-b border-border bg-muted/20 px-4 text-sm font-medium text-foreground">
                  预览
                </div>
                <article className="mx-auto w-full max-w-245 px-6 py-8">
                  {title && <h1 className="mb-4 text-3xl font-bold">{title}</h1>}
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
                <button
                  type="button"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-muted"
                  onClick={() => setShowAiPanel(false)}
                >
                  <X size={15} />
                </button>
              </div>
              <div className="space-y-3 p-4">
                <Button variant="outline" className="h-10 w-full justify-start gap-2 text-sm">
                  <Sparkles size={14} /> 优化文档结构
                </Button>
                <Button variant="outline" className="h-10 w-full justify-start gap-2 text-sm">
                  <Sparkles size={14} /> 生成摘要
                </Button>
                <Button className="h-10 w-full gap-1.5 text-sm" disabled>
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
