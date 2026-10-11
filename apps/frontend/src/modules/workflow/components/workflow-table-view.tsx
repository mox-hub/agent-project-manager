/**
 * WorkflowTableView - 工作流列表表格视图（CAP-A-29 视图形态完整性）
 *
 * 基于通用 DataTable；行点击进详情，尾部「运行」动作与卡片/列表视图同语义
 * （stopPropagation 防误触发行点击）。WorkflowSummary 无时间戳字段，
 * 列仅覆盖既有数据（名称/文法版本/标识/描述），不造第二真相。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { GitBranch, Play } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { WorkflowSummary } from '../api/workflow-api';

export interface WorkflowTableViewProps {
  workflows: WorkflowSummary[];
  loading?: boolean;
  onWorkflowClick: (workflow: WorkflowSummary) => void;
  onTrigger: (workflow: WorkflowSummary) => void;
  className?: string;
}

export function WorkflowTableView({
  workflows,
  loading = false,
  onWorkflowClick,
  onTrigger,
  className,
}: WorkflowTableViewProps) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<WorkflowSummary, unknown>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (wf) => wf.name,
        header: t('workflow.columns.name'),
        size: 220,
        cell: ({ row }) => (
          <span className="flex min-w-0 items-center gap-2">
            <GitBranch className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate text-sm font-medium text-foreground">
              {row.original.name}
            </span>
            <Badge variant="secondary" className="shrink-0 text-3xs" title={t('workflow.grammarVersionBadge')}>
              v{row.original.grammarVersion ?? 1}
            </Badge>
          </span>
        ),
      },
      {
        id: 'key',
        accessorFn: (wf) => wf.key,
        header: t('workflow.columns.key'),
        size: 160,
        cell: ({ row }) => (
          <code className="truncate font-mono text-2xs text-muted-foreground/60">{row.original.key}</code>
        ),
      },
      {
        id: 'description',
        accessorFn: (wf) => wf.description ?? '',
        header: t('workflow.columns.description'),
        size: 320,
        cell: ({ row }) => (
          <span className="line-clamp-1 text-xs text-muted-foreground">
            {row.original.description || t('workflow.noDescription')}
          </span>
        ),
      },
      {
        id: 'actions',
        header: t('workflow.columns.actions'),
        size: 90,
        enableSorting: false,
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 px-2.5 text-xs"
            onClick={(event) => {
              event.stopPropagation();
              onTrigger(row.original);
            }}
          >
            <Play className="size-3" />
            {t('workflow.run')}
          </Button>
        ),
      },
    ],
    [t, onTrigger],
  );

  return (
    <DataTable<WorkflowSummary>
      columns={columns}
      data={workflows}
      getRowId={(wf) => wf.id}
      onRowClick={onWorkflowClick}
      pageSize={50}
      stickyHeader
      emptyContent={
        <div className="p-8 text-center text-sm text-muted-foreground">
          {loading ? t('common.loading') : t('workflow.empty')}
        </div>
      }
      className={className}
    />
  );
}
