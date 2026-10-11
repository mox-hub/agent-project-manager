/**
 * ReleaseTableView - 发版列表表格视图（CAP-A-29 扩展切片）
 *
 * 基于通用 DataTable；行点击进发版详情，列数据与 DataList 列表视图同源零新请求。
 * 版本列合并承载通道 chip 与行级卡点（待审批/门禁未过——批四投影字段），与列表口径一致。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/ui/data-table';
import { ListChip, ListDate } from '@/shared/components/data-list';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import { ReleaseChannelChip, ReleasePlatformBadges } from './release-platform-badges';
import { RELEASE_STATUS_VISUALS, isPlannedOverdue, statusLabelKey } from '../release-status-meta';
import { deriveReleaseChannel, type ReleaseRecord } from '../api/release-api';

export interface ReleaseTableViewProps {
  releases: ReleaseRecord[];
  loading?: boolean;
  onReleaseClick: (release: ReleaseRecord) => void;
  className?: string;
}

export function ReleaseTableView({
  releases,
  loading = false,
  onReleaseClick,
  className,
}: ReleaseTableViewProps) {
  const { t } = useTranslation();

  const columns = useMemo<ColumnDef<ReleaseRecord, unknown>[]>(
    () => [
      {
        id: 'version',
        accessorFn: (r) => r.version,
        header: t('release.columns.version'),
        size: 200,
        cell: ({ row }) => {
          const r = row.original;
          return (
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 whitespace-nowrap font-mono text-sm font-medium text-muted-foreground/50">
                v{r.version}
              </span>
              <ReleaseChannelChip channel={deriveReleaseChannel(r.version)} />
              {r.hasPendingApproval ? (
                <ListChip className="shrink-0 bg-accent-blue-light text-accent-blue">
                  {t('release.list.pendingApproval')}
                </ListChip>
              ) : null}
              {r.gateFailedChecks ? (
                <ListChip className="shrink-0 bg-accent-red-light text-accent-red">
                  {t('release.list.gateFailed', { count: r.gateFailedChecks })}
                </ListChip>
              ) : null}
            </span>
          );
        },
      },
      {
        id: 'name',
        accessorFn: (r) => r.name ?? '',
        header: t('release.columns.name'),
        size: 180,
        cell: ({ row }) => (
          <span className="truncate text-md font-medium text-foreground">
            {row.original.name || '—'}
          </span>
        ),
      },
      {
        id: 'status',
        accessorFn: (r) => r.status,
        header: t('release.columns.status'),
        size: 120,
        cell: ({ row }) => {
          const r = row.original;
          const visual = RELEASE_STATUS_VISUALS[r.status];
          return (
            <span className="flex items-center gap-1.5">
              <StatusIconFrame
                icon={visual.icon}
                tone={visual.tone}
                size="list"
                spin={r.status === 'publishing'}
                title={
                  r.status === 'failed' && r.failureReason
                    ? `${t(statusLabelKey(r.status))}：${r.failureReason}`
                    : t(statusLabelKey(r.status))
                }
              />
              <span className="text-xs text-muted-foreground">{t(statusLabelKey(r.status))}</span>
            </span>
          );
        },
      },
      {
        id: 'project',
        accessorFn: (r) => r.project?.name ?? '',
        header: t('release.columns.project'),
        size: 130,
        cell: ({ row }) =>
          row.original.project?.name ? (
            <span className="truncate text-xs text-muted-foreground">{row.original.project.name}</span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
      {
        id: 'milestone',
        accessorFn: (r) => r.milestone?.name ?? '',
        header: t('release.columns.milestone'),
        size: 120,
        cell: ({ row }) =>
          row.original.milestone?.name ? (
            <ListChip className="max-w-27.5 truncate border border-border bg-muted/40 text-muted-foreground">
              {row.original.milestone.name}
            </ListChip>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
      {
        id: 'platforms',
        accessorFn: (r) => (r.platforms ?? []).join(','),
        header: t('release.columns.platforms'),
        size: 140,
        enableSorting: false,
        cell: ({ row }) => <ReleasePlatformBadges platforms={row.original.platforms} />,
      },
      {
        id: 'plannedAt',
        accessorFn: (r) => (r.plannedAt ? new Date(r.plannedAt).getTime() : 0),
        header: t('release.columns.plannedAt'),
        size: 110,
        cell: ({ row }) =>
          row.original.plannedAt ? (
            <ListDate value={row.original.plannedAt} overdue={isPlannedOverdue(row.original)} />
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
      {
        id: 'gitTag',
        accessorFn: (r) => r.gitTag ?? '',
        header: t('release.columns.gitTag'),
        size: 110,
        cell: ({ row }) =>
          row.original.gitTag ? (
            <span className="whitespace-nowrap font-mono text-xs text-muted-foreground/50">
              {row.original.gitTag}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
      {
        id: 'releasedAt',
        accessorFn: (r) => (r.releasedAt ? new Date(r.releasedAt).getTime() : 0),
        header: t('release.columns.releasedAt'),
        size: 110,
        cell: ({ row }) =>
          row.original.releasedAt ? (
            <ListDate value={row.original.releasedAt} />
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
    ],
    [t],
  );

  return (
    <DataTable<ReleaseRecord>
      columns={columns}
      data={releases}
      getRowId={(r) => r.id}
      onRowClick={onReleaseClick}
      pageSize={50}
      stickyHeader
      emptyContent={
        <div className="p-8 text-center text-sm text-muted-foreground">
          {loading ? t('common.loading') : t('release.empty.none')}
        </div>
      }
      className={className}
    />
  );
}
