/**
 * IssueDependenciesSection - 工单详情正文区「依赖」区块（P1-17）
 *
 * 问题：依赖关系此前只在旧版抽屉（task-detail-drawer）里有残缺展示（字段名错位导致
 * 永远回退显示 ID），新详情页正文区完全零展示；维护者看不到阻塞链。
 * 做法：双向只读列表——
 * - 「被谁阻塞」（Blocked by）：task.dependencies[].dependsOnIssue 投影
 *   （Prisma IssueDependency：本单为 issueId 发起方，dependsOnIssue 为前置工单）
 * - 「阻塞谁」（Blocks）：task.blockedBy[].issue 投影
 *   （本单为 dependsOnIssueId 被依赖方，issue 为下游工单）
 * 条目为 Link，点击跳转对应工单详情；双向皆空时不渲染空块。
 *
 * 分区形态（header + grid-rows 收展）与 task-detail-page 的 AcceptanceCriteriaPreview /
 * SubTaskSection 保持一致；数据由详情页既有 useTaskDetail 响应直传，无新增查询。
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Link2 } from 'lucide-react';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { TASK_STATUS_VISUALS } from '@/shared/status/status-visuals';
import type { TaskDependencyRef } from '../api/issue-api';
import { cn } from '@/lib/utils';

/** 依赖条目投影：工单摘要（title + status），来自关系记录上的对侧工单 */
interface DependencyIssueRef {
  id: string;
  title: string;
  status: string;
}

/** 从关系记录投影对侧工单（契约字段 dependsOnIssue / issue；缺失时以 fallbackId 兜底显示） */
function projectRef(
  deps: TaskDependencyRef[] | undefined,
  pick: (dep: TaskDependencyRef) => DependencyIssueRef | undefined,
  fallbackId: (dep: TaskDependencyRef) => string,
): DependencyIssueRef[] {
  return (deps ?? [])
    .map((dep) => pick(dep) ?? { id: fallbackId(dep), title: fallbackId(dep), status: 'todo' })
    .filter((ref) => !!ref.id);
}

function DependencyList({ issues }: { issues: DependencyIssueRef[] }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-0.5">
      {issues.map((ref) => {
        const visual = TASK_STATUS_VISUALS[ref.status] ?? TASK_STATUS_VISUALS.todo;
        return (
          <Link
            key={ref.id}
            to={`/app/issues/${ref.id}`}
            className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-muted/40 transition-colors group"
            data-testid="issue-dependency-link"
          >
            <StatusIconFrame
              icon={visual.icon}
              tone={visual.tone}
              size="sm"
              spin={visual.icon === TASK_STATUS_VISUALS.in_progress.icon}
            />
            <span className="flex-1 min-w-0 text-sm truncate group-hover:text-primary transition-colors">
              {ref.title}
            </span>
          </Link>
        );
      })}
      {issues.length === 0 ? (
        <span className="px-2 py-1 text-xs text-muted-foreground">
          {t('task.detailDrawer.noDependencies')}
        </span>
      ) : null}
    </div>
  );
}

export interface IssueDependenciesSectionProps {
  /** 本单作为发起方的依赖（blocked by 前置工单） */
  dependencies?: TaskDependencyRef[];
  /** 指向本单的依赖（本单 blocks 的下游工单） */
  blockedBy?: TaskDependencyRef[];
}

export function IssueDependenciesSection({
  dependencies,
  blockedBy,
}: IssueDependenciesSectionProps) {
  const { t } = useTranslation();
  const [collapsed, setCollapsed] = useState(false);

  const upstream = projectRef(
    dependencies,
    (dep) => dep.dependsOnIssue,
    (dep) => dep.dependsOnIssueId,
  );
  const downstream = projectRef(
    blockedBy,
    (dep) => dep.issue,
    (dep) => dep.issueId,
  );

  // 双向皆空：不渲染空块
  if (upstream.length === 0 && downstream.length === 0) return null;

  const totalCount = upstream.length + downstream.length;

  return (
    <div className="shrink-0" data-testid="issue-dependencies-section">
      {/* Section header：与描述/验收契约/子任务分区同形态 */}
      <div className="px-6 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Link2 className="size-3.5" />
          <span>{t('task.detailDrawer.dependencies')}</span>
          <span className="text-10 font-normal normal-case tabular-nums">({totalCount})</span>
        </div>
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

      {/* 分区内容：grid-rows 动画展开 / 收起（与正文其他分区同一手势） */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-300 ease-out',
          collapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="px-6 pb-3 flex flex-col gap-2">
            {upstream.length > 0 ? (
              <div className="rounded-lg border border-border bg-card px-2 py-2">
                <div className="px-1 pb-1 text-10 font-medium text-muted-foreground">
                  {t('task.detailDrawer.blockedBy')}
                  <span className="ml-1 tabular-nums">({upstream.length})</span>
                </div>
                <DependencyList issues={upstream} />
              </div>
            ) : null}
            {downstream.length > 0 ? (
              <div className="rounded-lg border border-border bg-card px-2 py-2">
                <div className="px-1 pb-1 text-10 font-medium text-muted-foreground">
                  {t('document.linkType.blocks')}
                  <span className="ml-1 tabular-nums">({downstream.length})</span>
                </div>
                <DependencyList issues={downstream} />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
