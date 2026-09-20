/**
 * AcceptanceCriteriaPreview - 工单详情页正文区「验收契约」只读回显（P1-9）
 *
 * 问题：验收标准原先只在右栏「验收契约」卡（CompletionReview）内可见，新手在
 * 详情正文区看不到标准内容，以为丢了。
 * 做法：把各契约的 criteria 摘要提升到正文区——标题 + 条目列表（状态图标/文案
 * 与 acceptance-detail-page 的 CRITERION_ICON/CRITERION_TONE 同口径），仅只读回显：
 * - 编辑/判定/接收等能力不迁移，仍走右栏既有入口；「编辑」轻链接仅展开右栏
 *   （onOpenEditor 由详情页注入），契约标题链接与右栏卡片同目标（验收详情页）
 * - 无契约或契约无标准条目时不渲染空块（右栏已有空态 + 新建/AI 代写入口）
 *
 * 分区形态（header + grid-rows 收展）与 task-detail-page 的 CustomFieldsPanel /
 * SubTaskSection 保持一致；数据由详情页既有 useAcceptancesByTask 查询传入。
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Ban,
  CheckCircle2,
  ChevronDown,
  Circle,
  ExternalLink,
  XCircle,
} from 'lucide-react';
import type {
  Acceptance,
  CriterionStatus,
} from '@/modules/acceptance/api/acceptance-api';
import { cn } from '@/lib/utils';

/** 标准状态视觉：与 acceptance-detail-page 保持同口径（只读回显不引入新形态） */
const CRITERION_ICON: Record<CriterionStatus, typeof Circle> = {
  pending: Circle,
  passed: CheckCircle2,
  failed: XCircle,
  blocked: Ban,
};

const CRITERION_TONE: Record<CriterionStatus, string> = {
  pending: 'text-muted-foreground',
  passed: 'text-accent-green',
  failed: 'text-accent-red',
  blocked: 'text-accent-yellow',
};

interface AcceptanceCriteriaPreviewProps {
  acceptances: Acceptance[];
  /** 展开右栏（定位到「验收契约」卡的既有编辑入口）；未传则不渲染编辑链接 */
  onOpenEditor?: () => void;
}

export function AcceptanceCriteriaPreview({
  acceptances,
  onOpenEditor,
}: AcceptanceCriteriaPreviewProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  // 按契约分组并按 order 排序；无标准条目的契约不占正文区
  const criteriaGroups = acceptances
    .map((acceptance) => ({
      acceptance,
      criteria: [...(acceptance.criteria ?? [])].sort((a, b) => a.order - b.order),
    }))
    .filter((group) => group.criteria.length > 0);

  // 无契约 / 契约均无标准：不渲染空块（右栏已有空态与新建入口）
  if (criteriaGroups.length === 0) return null;

  const totalCount = criteriaGroups.reduce((n, g) => n + g.criteria.length, 0);
  const passedCount = criteriaGroups.reduce(
    (n, g) => n + g.criteria.filter((c) => c.status === 'passed').length,
    0,
  );

  return (
    <div className="shrink-0" data-testid="acceptance-criteria-preview">
      {/* Section header：与描述/自定义字段/子任务分区同形态 */}
      <div className="px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <CheckCircle2 className="size-3.5" />
          <span>{t('taskDetail.acceptanceContract')}</span>
          <span className="text-10 font-normal normal-case tabular-nums">
            {passedCount}/{totalCount}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          {onOpenEditor && (
            <button
              type="button"
              onClick={onOpenEditor}
              className="inline-flex h-5 items-center rounded-md px-1 text-10 font-normal normal-case text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={t('common.edit')}
            >
              {t('common.edit')}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex size-5 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label={collapsed ? t('common.expand') : t('common.collapse')}
            aria-expanded={!collapsed}
          >
            <ChevronDown
              className={cn('size-3 transition-transform', !collapsed && 'rotate-180')}
            />
          </button>
        </div>
      </div>

      {/* 分区内容：grid-rows 动画展开 / 收起（与正文其他分区同一手势） */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-3 flex flex-col gap-2">
            {criteriaGroups.map(({ acceptance, criteria }) => (
              <div
                key={acceptance.id}
                className="rounded-lg border border-border bg-card px-3 py-2"
              >
                {/* 契约行：标题链接与右栏 CompletionReview 卡片同目标；右侧轻量编辑入口 */}
                <div className="flex items-center gap-1.5">
                  <Link
                    to={`/app/acceptance/${acceptance.id}`}
                    className="min-w-0 flex items-center gap-1 text-xs font-medium text-foreground truncate hover:underline"
                  >
                    <span className="truncate">
                      {acceptance.title ||
                        t('acceptance.titleFallback', { id: acceptance.id.slice(0, 8) })}
                    </span>
                    <ExternalLink size={11} className="shrink-0 text-muted-foreground" />
                  </Link>
                  <span className="shrink-0 text-10 text-muted-foreground">
                    {t(`acceptance.status.${acceptance.status}`)}
                  </span>
                </div>

                {/* 标准条目：只读回显（状态图标 + 内容 + 状态文案），无任何判定/编辑控件 */}
                <ul className="mt-1">
                  {criteria.map((c) => {
                    const Icon = CRITERION_ICON[c.status] ?? Circle;
                    const tone = CRITERION_TONE[c.status] ?? 'text-muted-foreground';
                    return (
                      <li key={c.id} className="flex items-start gap-1.5 py-0.5 text-xs">
                        <Icon className={cn('size-3.5 shrink-0 mt-0.5', tone)} />
                        <span className="min-w-0 flex-1 break-words text-foreground">
                          {c.content}
                        </span>
                        <span className={cn('shrink-0 mt-0.5 text-10', tone)}>
                          {t(`acceptance.criterionStatus.${c.status}`)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
