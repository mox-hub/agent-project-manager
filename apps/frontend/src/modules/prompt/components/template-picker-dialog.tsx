/**
 * TemplatePickerDialog - 提示词模板选用弹层（CAP-A-24 增强 A）
 *
 * 列出模板库（内置常量 + 自定义表，target 过滤）→ 选中项按任务事实插值
 * 干跑预览（POST /prompts/templates/preview，与派发面同一插值引擎）→
 * 「采用」把插值后文本交给调用方写入编辑框——保存仍走人手，不直接落库。
 * 事实缺失的变量保留 {{占位}} 并在预览下方如实提示。
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LayoutTemplate } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { EmptyState } from '@/components/semantic/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { MarkdownView } from '@/shared/components/markdown-view';
import {
  previewPromptTemplate,
  usePromptTemplates,
  type PromptTemplateItem,
} from '@/modules/prompt/api/prompt-api';

export function TemplatePickerDialog({
  open,
  onOpenChange,
  target,
  issueId,
  projectId,
  onApply,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 落到哪一级提示词（过滤模板目标） */
  target: 'task' | 'project' | 'role' | 'member';
  /** 插值事实来源工单（target=task 时必传；其余目标暂无插值预览） */
  issueId?: string;
  /** 项目级模板过滤 */
  projectId?: string;
  onApply: (text: string) => void;
}) {
  const { t } = useTranslation();
  const templates = usePromptTemplates(target, projectId);
  const items = templates.data?.items ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const activeId =
    selectedId && items.some((i) => i.id === selectedId)
      ? selectedId
      : (items[0]?.id ?? null);
  const active = items.find((i) => i.id === activeId) ?? null;
  const [preview, setPreview] = useState<{
    text: string;
    missingVars: string[];
  } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const select = async (item: PromptTemplateItem) => {
    setSelectedId(item.id);
    setPreview(null);
    if (!issueId) return;
    setPreviewLoading(true);
    try {
      const result = await previewPromptTemplate(item.body, issueId);
      setPreview({ text: result.text, missingVars: result.missingVars });
    } catch {
      // 预览失败回落展示模板原文（插值交给派发面）
      setPreview({ text: item.body, missingVars: [] });
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-2xl"
        data-ai-component="prompt.template-picker"
      >
        <DialogHeader>
          <DialogTitle>{t('prompt.templatePicker.title')}</DialogTitle>
          <DialogDescription>
            {t('prompt.templatePicker.desc')}
          </DialogDescription>
        </DialogHeader>
        {templates.isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            variant="card"
            icon={LayoutTemplate}
            title={t('prompt.templatePicker.empty')}
          />
        ) : (
          <div className="flex max-h-96 gap-3">
            {/* 模板列表 */}
            <div
              className="w-52 shrink-0 space-y-1 overflow-y-auto"
              data-ai-component="prompt.template-picker.list"
            >
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void select(item)}
                  className={cn(
                    'w-full rounded-lg px-3 py-2 text-left transition-colors',
                    item.id === activeId
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted/60',
                  )}
                  data-ai-component={`prompt.template-picker.item.${item.id}`}
                  data-ai-action={`prompt.template-picker.item.${item.id}.click`}
                >
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                    {item.name}
                    {item.builtIn ? (
                      <Badge
                        variant="secondary"
                        className="bg-accent-blue/10 px-1 py-0 text-xs text-accent-blue"
                      >
                        {t('prompt.templatePicker.builtin')}
                      </Badge>
                    ) : null}
                  </p>
                  {item.description ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  ) : null}
                </button>
              ))}
            </div>
            {/* 插值预览 */}
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {t('prompt.templatePicker.preview')}
              </p>
              <div
                className="max-h-64 overflow-y-auto rounded-lg border border-border bg-muted/20 px-3 py-2"
                data-ai-component="prompt.template-picker.preview"
              >
                {previewLoading ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Spinner className="size-3.5" />
                    {t('prompt.templatePicker.previewing')}
                  </p>
                ) : preview?.text ? (
                  <MarkdownView content={preview.text} />
                ) : (
                  active && (
                    <MarkdownView content={active.body} />
                  )
                )}
              </div>
              {preview && preview.missingVars.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t('prompt.templatePicker.missingVars', {
                    vars: preview.missingVars.join(', '),
                  })}
                </p>
              ) : null}
            </div>
          </div>
        )}
        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t('prompt.templatePicker.cancel')}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!active}
            onClick={() => {
              if (!active) return;
              onApply(preview?.text ?? active.body);
              onOpenChange(false);
              setSelectedId(null);
              setPreview(null);
            }}
            data-ai-action="prompt.template-picker.apply"
          >
            {t('prompt.templatePicker.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
