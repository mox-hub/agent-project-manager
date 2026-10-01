/**
 * IssueDetailHeading - 工单详情页标题区（task/bug 详情页共用）
 *
 * 收编两页逐字重复的标题块：热编辑标题（AutoSizeTextarea）+ 底框状态图标（lg 档，
 * in_progress 自旋内聚）+ 类型切换器槽（task 页用，bug 页不传）+ 父任务来源行
 * （ParentIssueLine，RoutePreviewTrigger 悬浮预览卡）+ 元信息行容器。
 * 热编辑保存协议（防抖/草稿）仍由页面持有，本件只管结构与视觉。
 */
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ListChecks } from 'lucide-react';
import type { ReactNode } from 'react';
import { AutoSizeTextarea } from '@/shared/components/property-panel';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { RoutePreviewTrigger } from '@/shared/route-preview/route-preview-trigger';
import { TASK_STATUS_VISUALS, type StatusVisual } from '@/shared/status/status-visuals';

export interface IssueDetailHeadingProps {
  /** 当前标题值（defaultValue，热编辑不回灌） */
  title: string;
  /** 热编辑重挂载 key（一般传 `title-${task.id}`，切任务清草稿） */
  titleKey: string;
  placeholder: string;
  /** 防抖保存回调（onChange 透传） */
  onTitleChange: (value: string) => void;
  statusVisual: StatusVisual;
  /** 标题左侧槽（task 页传 IssueTypeSwitcher，bug 页不传） */
  left?: ReactNode;
  /** 父任务来源行（有 parentIssueId 时传） */
  parentIssue?: { id: string; title?: string };
  /** 元信息行内容（shortId/创建时间/外部徽标，双页差异大由消费方组装） */
  meta?: ReactNode;
}

export function IssueDetailHeading({
  title,
  titleKey,
  placeholder,
  onTitleChange,
  statusVisual,
  left,
  parentIssue,
  meta,
}: IssueDetailHeadingProps) {
  return (
    <div className="px-6 pt-5 pb-3 shrink-0">
      <div className="flex items-center gap-3">
        {left}
        <StatusIconFrame
          icon={statusVisual.icon}
          tone={statusVisual.tone}
          size="lg"
          spin={statusVisual.icon === TASK_STATUS_VISUALS.in_progress.icon}
        />
        <AutoSizeTextarea
          key={titleKey}
          defaultValue={title}
          rows={1}
          placeholder={placeholder}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full text-lg font-semibold placeholder:text-muted-foreground/40"
        />
      </div>
      {parentIssue && <ParentIssueLine parentIssue={parentIssue} />}
      {meta != null && (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">{meta}</div>
      )}
    </div>
  );
}

/**
 * ParentIssueLine - 子任务来源行：父任务悬浮预览卡 + 点击跳转。
 * label 走 issueDetail.parentTaskLabel（task/bug 共用键，2026-10-02 提取统一）。
 */
export function ParentIssueLine({ parentIssue }: { parentIssue: { id: string; title?: string } }) {
  const { t } = useTranslation();
  return (
    <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
      <ListChecks className="size-3.5 shrink-0" />
      <span className="shrink-0">{t('issueDetail.parentTaskLabel')}</span>
      <RoutePreviewTrigger path={`/app/issues/${parentIssue.id}`} title={parentIssue.title} icon={ListChecks}>
        <Link
          to={`/app/issues/${parentIssue.id}`}
          className="truncate max-w-75 font-medium text-foreground transition-colors hover:text-primary hover:underline"
        >
          {parentIssue.title || parentIssue.id.slice(0, 8)}
        </Link>
      </RoutePreviewTrigger>
    </div>
  );
}
