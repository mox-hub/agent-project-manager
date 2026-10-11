/**
 * ExecutionTableView - 执行记录表格视图（CAP-A-29 扩展切片）
 *
 * 基于通用 DataTable；行点击开 RunDetailsDialog、行右键菜单与列表视图同源
 * （rowMenuItems 由页面下发），列数据与 DataList 列表视图同源零新请求。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { Bot, FolderKanban } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { ListDate } from '@/shared/components/data-list';
import type { MenuItem } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { ExecutionRunRecord } from '../api/execution-api';
import { RUN_STATUS_CONFIG, RunStatusBadge, formatRunDateTime } from './run-status';
import { formatCost, formatRunDuration, formatTokens } from './run-details-format';

export interface ExecutionTableViewProps {
  runs: ExecutionRunRecord[];
  loading?: boolean;
  /** 行点击：与列表一致打开执行详情对话框 */
  onRunClick: (run: ExecutionRunRecord) => void;
  /** 行右键菜单（与列表 rowMenuItems 同源；不传则无右键菜单） */
  onRowContextMenu?: (run: ExecutionRunRecord) => MenuItem[];
  className?: string;
}

export function ExecutionTableView({
  runs,
  loading = false,
  onRunClick,
  onRowContextMenu,
  className,
}: ExecutionTableViewProps) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<ExecutionRunRecord, unknown>[]>(
    () => [
      {
        id: 'goal',
        accessorFn: (run) => run.goal,
        header: t('execution.columns.goal'),
        size: 240,
        cell: ({ row }) => {
          const run = row.original;
          const cfg = RUN_STATUS_CONFIG[run.status] ?? RUN_STATUS_CONFIG.draft;
          const StatusIcon = cfg.icon;
          return (
            <span className="flex min-w-0 items-center gap-2">
              <StatusIcon
                className={cn('size-4 shrink-0', cfg.color, cfg.pulse && 'animate-pulse')}
              />
              <span className="min-w-0 truncate font-medium text-foreground">{run.goal}</span>
            </span>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (run) => run.status,
        header: t('execution.columns.status'),
        size: 110,
        cell: ({ row }) => <RunStatusBadge status={row.original.status} />,
      },
      {
        id: 'agent',
        accessorFn: (run) => run.subjectName ?? '',
        header: t('execution.columns.agent'),
        size: 130,
        cell: ({ row }) =>
          row.original.subjectName ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Bot className="size-3 shrink-0" />
              <span className="truncate">{row.original.subjectName}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
      {
        id: 'project',
        accessorFn: (run) => run.project?.name ?? '',
        header: t('execution.columns.project'),
        size: 130,
        cell: ({ row }) =>
          row.original.project?.name ? (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <FolderKanban className="size-3 shrink-0" />
              <span className="truncate">{row.original.project.name}</span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
      {
        id: 'issue',
        accessorFn: (run) => run.issue?.title ?? '',
        header: t('execution.columns.issue'),
        size: 160,
        cell: ({ row }) =>
          row.original.issue?.title ? (
            <span className="truncate text-xs text-muted-foreground">{row.original.issue.title}</span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
      {
        id: 'started',
        accessorFn: (run) => new Date(run.startedAt ?? run.createdAt).getTime(),
        header: t('execution.columns.started'),
        size: 110,
        cell: ({ row }) => (
          <ListDate value={row.original.startedAt ?? row.original.createdAt} />
        ),
      },
      {
        id: 'duration',
        accessorFn: (run) => formatRunDuration(run),
        header: t('execution.columns.duration'),
        size: 90,
        cell: ({ row }) => {
          const duration = formatRunDuration(row.original);
          return duration ? (
            <span className="text-xs text-muted-foreground">{duration}</span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          );
        },
      },
      {
        id: 'tokens',
        accessorFn: (run) => run.totalTokens ?? 0,
        header: t('execution.columns.tokens'),
        size: 100,
        cell: ({ row }) => {
          const tokens = formatTokens(row.original.totalTokens);
          return tokens ? (
            <span className="text-xs text-muted-foreground">{tokens}</span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          );
        },
      },
      {
        id: 'cost',
        accessorFn: (run) => run.totalCost ?? 0,
        header: t('execution.columns.cost'),
        size: 90,
        cell: ({ row }) => {
          const cost = formatCost(row.original.totalCost);
          return cost ? (
            <span className="text-xs text-muted-foreground">{cost.replace('$', '')}</span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          );
        },
      },
      {
        id: 'provider',
        accessorFn: (run) => run.providerId ?? '',
        header: t('execution.columns.provider'),
        size: 120,
        cell: ({ row }) =>
          row.original.providerId ? (
            <span className="truncate rounded-full bg-muted/60 px-2 py-0.5 font-mono text-2xs text-muted-foreground">
              {row.original.providerId}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
    ],
    [t],
  );

  return (
    <DataTable<ExecutionRunRecord>
      columns={columns}
      data={runs}
      getRowId={(run) => run.id}
      onRowClick={onRunClick}
      onRowContextMenu={onRowContextMenu}
      pageSize={50}
      stickyHeader
      emptyContent={
        <div className="p-8 text-center text-sm text-muted-foreground">
          {loading ? t('common.loading') : t('execution.empty.none')}
        </div>
      }
      className={className}
    />
  );
}
