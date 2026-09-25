/**
 * 工作流定义预览卡片 body（['workflow', id] 数据，useWorkflow）
 * 展示：描述 / 版本 / 步骤摘要（服务端解析的 stepsSummary，文法非法时为空）。
 */

import { useWorkflow } from '@/modules/workflow/hooks/use-workflows';
import { useTranslation } from '@/hooks/useTranslation';
import {
  PreviewBodyError,
  PreviewBodySkeleton,
  PreviewFooterMeta,
  PreviewRow,
  PreviewSection,
  formatPreviewDate,
} from './preview-fields';

/** 步骤摘要最多展示条数（超出折叠为计数） */
const MAX_STEPS = 4;

export function WorkflowPreviewBody({ id }: { id: string }) {
  const { t } = useTranslation();
  const { data: workflow, isLoading, isError } = useWorkflow(id);

  if (isLoading) return <PreviewBodySkeleton rows={3} />;
  if (isError || !workflow) return <PreviewBodyError />;

  const steps = workflow.stepsSummary ?? [];

  return (
    <div className="space-y-3">
      {workflow.description && (
        <p className="line-clamp-2 text-11 text-muted-foreground">{workflow.description}</p>
      )}

      <PreviewSection title={t('routePreview.workflow.definition', '定义')}>
        <PreviewRow label={t('routePreview.workflow.version', '版本')}>
          <span className="font-mono text-10 text-muted-foreground">v{workflow.version}</span>
        </PreviewRow>
        <PreviewRow label={t('routePreview.workflow.steps', '步骤数')}>
          <span className="font-mono text-10 text-muted-foreground">{steps.length}</span>
        </PreviewRow>
        {steps.slice(0, MAX_STEPS).map((step, index) => (
          <PreviewRow key={step.id} label={`#${index + 1}`}>
            <span className="truncate">{step.title ?? step.type}</span>
          </PreviewRow>
        ))}
        {steps.length > MAX_STEPS ? (
          <PreviewRow label="…">
            <span className="text-10 text-muted-foreground">
              {t('routePreview.workflow.moreSteps', { count: steps.length - MAX_STEPS })}
            </span>
          </PreviewRow>
        ) : null}
      </PreviewSection>

      <PreviewFooterMeta>
        <span>{t('routePreview.workflow.updatedAt', '更新')} {formatPreviewDate(workflow.updatedAt)}</span>
        <span className="ml-auto font-mono text-10">{workflow.key}</span>
      </PreviewFooterMeta>
    </div>
  );
}
