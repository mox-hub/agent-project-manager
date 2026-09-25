/**
 * 项目列表行属性就地编辑单元格（CAP-A-08 列表要素即时生效 · 项目域）。
 *
 * 枚举字段（工作流/健康度/优先级）与 buildProjectRowMenu 同一 visual 映射与取值序，
 * mutation 同走 useUpdateProject——右键菜单与行内下拉保证同源不漂移。
 * 负责人用 userId 口径（Project.ownerId 是 User 外键，与右键菜单裁决一致）。
 */

import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { CellSelect, type CellSelectOption } from '@/shared/components/cell-select';
import {
  TONE_TEXT_CLASS,
  type StatusVisual,
} from '@/shared/status/status-visuals';
import { useUpdateProject } from '../hooks/use-project-mutations';
import type { Project, UpdateProjectRequest } from '../api/project-api';

interface ProjectEnumCellProps {
  project: Project;
  /** 可写字段名（UpdateProjectRequest 键） */
  field: 'workflowStatus' | 'status' | 'priority' | 'healthStatus' | 'riskLevel';
  visuals: Record<string, StatusVisual>;
  order: string[];
  title: string;
  children: React.ReactNode;
}

export function ProjectEnumCell({ project, field, visuals, order, title, children }: ProjectEnumCellProps) {
  const { t } = useTranslation();
  const update = useUpdateProject();
  const current = project[field] as string | null | undefined;
  const options: CellSelectOption[] = order
    .filter((value) => visuals[value])
    .map((value) => {
      const visual = visuals[value];
      return {
        value,
        label: t(visual.labelKey),
        icon: <visual.icon className={cn('size-4', TONE_TEXT_CLASS[visual.tone])} />,
        active: current === value,
      };
    });
  return (
    <CellSelect
      title={title}
      value={current}
      onChange={(value) =>
        update.mutate({ projectId: project.id, data: { [field]: value } as UpdateProjectRequest })
      }
      options={options}
    >
      {children}
    </CellSelect>
  );
}

interface ProjectOwnerCellProps {
  project: Project;
  /** 候选成员（真实数据；AI 成员 userId 为空不入候选） */
  owners: Array<{ id: string; userId?: string | null; displayName: string; handle?: string; avatarUrl?: string | null }>;
  children: React.ReactNode;
}

export function ProjectOwnerCell({ project, owners, children }: ProjectOwnerCellProps) {
  const { t } = useTranslation();
  const update = useUpdateProject();
  const candidates = owners.filter((m) => m.userId);
  const currentOwnerId = project.ownerId;
  const options: CellSelectOption[] = [
    { value: '__none__', label: t('project.menu.unassigned'), active: !currentOwnerId },
    ...candidates.map((m) => ({
      value: m.userId!,
      label: m.displayName,
      active: currentOwnerId === m.userId,
    })),
  ];
  return (
    <CellSelect
      title={t('contextMenu.assignee', '负责人')}
      value={currentOwnerId ?? undefined}
      onChange={(value) =>
        update.mutate({
          projectId: project.id,
          data: { ownerId: value === '__none__' ? null : value },
        })
      }
      options={options}
      menuClassName="w-44"
    >
      {children}
    </CellSelect>
  );
}
