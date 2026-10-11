/**
 * DocumentTableView - 文档库表格视图（CAP-A-29 视图形态完整性）
 *
 * 基于通用 DataTable；行点击预览（与卡片/列表视图一致），
 * 行右键菜单同语义（查看/编辑/删除），列数据与 list/grid 视图同源零新请求。
 * 分类/状态视觉词表为页内配置的最小镜像（避免页面↔组件循环依赖）。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type ColumnDef } from '@tanstack/react-table';
import { BookOpen, Code2, FileText, FolderOpen, Palette, TestTube2 } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { StatusPill } from '@/components/semantic/status-pill';
import { ListDate } from '@/shared/components/data-list';
import type { MenuItem } from '@/components/ui/context-menu';
import { cn } from '@/lib/utils';
import type { DocumentListItem } from '../api/document-api';

export interface DocumentTableViewProps {
  documents: DocumentListItem[];
  loading?: boolean;
  onPreview: (document: DocumentListItem) => void;
  onDelete: (document: DocumentListItem) => void;
  className?: string;
}

/** 分类视觉词表（与 documents-page CATEGORY_CONFIG 同源镜像） */
const CATEGORY_CONFIG: Record<string, { labelKey: string; icon: typeof FileText; color: string; bg: string }> = {
  requirement: { labelKey: 'document.categories.requirement', icon: FileText, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  design: { labelKey: 'document.categories.design', icon: Palette, color: 'text-accent-purple', bg: 'bg-accent-purple/10' },
  api: { labelKey: 'document.categories.api', icon: Code2, color: 'text-accent-green', bg: 'bg-accent-green/10' },
  testing: { labelKey: 'document.categories.testing', icon: TestTube2, color: 'text-accent-yellow', bg: 'bg-accent-yellow/10' },
  guide: { labelKey: 'document.categories.guide', icon: BookOpen, color: 'text-accent-blue', bg: 'bg-accent-blue/10' },
  custom: { labelKey: 'document.categories.custom', icon: FolderOpen, color: 'text-muted-foreground', bg: 'bg-muted/50' },
};

/** 状态 tone 词表（与 documents-page DOC_STATUS_TONE 同源镜像） */
const DOC_STATUS_TONE: Record<string, 'default' | 'warning' | 'success' | 'danger'> = {
  draft: 'default',
  reviewing: 'warning',
  published: 'success',
  rejected: 'danger',
};

const STATUS_LABEL_KEY: Record<string, string> = {
  draft: 'document.draft',
  reviewing: 'document.reviewing',
  published: 'document.published',
  rejected: 'document.rejected',
};

function resolveCategory(key?: string | null) {
  if (!key) return CATEGORY_CONFIG.custom;
  return CATEGORY_CONFIG[key] ?? CATEGORY_CONFIG.custom;
}

export function DocumentTableView({
  documents,
  loading = false,
  onPreview,
  onDelete,
  className,
}: DocumentTableViewProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const onRowContextMenu = (document: DocumentListItem): MenuItem[] => [
    {
      id: 'view',
      label: t('document.actions.view'),
      onClick: () => onPreview(document),
    },
    {
      id: 'edit',
      label: t('document.actions.edit'),
      onClick: () => navigate(`/app/documents/${document.id}/edit`),
    },
    {
      id: 'delete',
      label: t('document.actions.delete'),
      destructive: true,
      onClick: () => onDelete(document),
    },
  ];

  const columns = useMemo<ColumnDef<DocumentListItem, unknown>[]>(
    () => [
      {
        id: 'title',
        accessorFn: (document) => document.title,
        header: t('document.columns.title'),
        size: 260,
        cell: ({ row }) => {
          const document = row.original;
          const catConfig = resolveCategory(document.category);
          const CatIcon = catConfig.icon;
          return (
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  'inline-flex size-6 shrink-0 items-center justify-center rounded-md',
                  catConfig.bg,
                )}
              >
                <CatIcon className={cn('size-3.5', catConfig.color)} />
              </span>
              <span className="min-w-0 truncate font-medium text-foreground">{document.title}</span>
            </span>
          );
        },
      },
      {
        id: 'status',
        accessorFn: (document) => document.status,
        header: t('document.columns.status'),
        size: 100,
        cell: ({ row }) => {
          const document = row.original;
          return (
            <StatusPill tone={DOC_STATUS_TONE[document.status]} className="rounded-md px-1.5 py-0.5 text-2xs">
              {t(STATUS_LABEL_KEY[document.status] ?? 'document.draft')}
            </StatusPill>
          );
        },
      },
      {
        id: 'category',
        accessorFn: (document) => document.category ?? '',
        header: t('document.columns.category'),
        size: 100,
        cell: ({ row }) => {
          const catConfig = resolveCategory(row.original.category);
          return <span className={cn('text-xs', catConfig.color)}>{t(catConfig.labelKey)}</span>;
        },
      },
      {
        id: 'project',
        accessorFn: (document) => document.project?.name ?? '',
        header: t('document.columns.project'),
        size: 140,
        cell: ({ row }) => (
          <span className="truncate text-xs text-muted-foreground">
            {row.original.project?.name ?? t('document.publicDoc')}
          </span>
        ),
      },
      {
        id: 'shortId',
        accessorFn: (document) => document.shortId ?? '',
        header: t('document.columns.id'),
        size: 90,
        cell: ({ row }) =>
          row.original.shortId ? (
            <span className="font-mono text-3xs text-muted-foreground/70">{row.original.shortId}</span>
          ) : (
            <span className="text-xs text-muted-foreground/40">-</span>
          ),
      },
      {
        id: 'updatedAt',
        accessorFn: (document) => new Date(document.updatedAt).getTime(),
        header: t('document.columns.updated'),
        size: 100,
        cell: ({ row }) => <ListDate value={row.original.updatedAt} />,
      },
    ],
    [t],
  );

  return (
    <DataTable<DocumentListItem>
      columns={columns}
      data={documents}
      getRowId={(document) => document.id}
      onRowClick={onPreview}
      onRowContextMenu={onRowContextMenu}
      pageSize={50}
      stickyHeader
      emptyContent={
        <div className="p-8 text-center text-sm text-muted-foreground">
          {loading ? t('document.loading') : t('document.noDocuments')}
        </div>
      }
      className={className}
    />
  );
}
