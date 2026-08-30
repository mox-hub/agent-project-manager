/**
 * ProjectPropertyPanel - 项目属性面板（常用自定义组件）
 *
 * 与任务详情属性栏同款的 PropertyRow + CapsuleSelect 形态：
 * 类型 / 可见性 / 状态 / 优先级 四个枚举属性支持下拉直接选择并落库
 * （useUpdateProject），健康度 / 负责人 / 排期为只读展示。
 * Linear 锁定字段（fieldsLockedExternally）自动降级为只读，防止覆盖外部数据。
 */

import { useTranslation } from 'react-i18next';
import { Activity, Calendar, CircleDot, Flag, Folder, Lock, Tag, User as UserIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CapsuleSelect, PropertyRow } from '@/components/ui/property-panel';
import { SidebarPanel } from '@/components/ui/sidebar-panel';
import { useProjectDetail } from '../hooks/use-project-detail';
import { useUpdateProject } from '../hooks/use-project-mutations';
import type {
  ProjectPriority,
  ProjectStatus,
  ProjectType,
  ProjectVisibility,
} from '../api/project-api';

const STATUS_COLOR: Record<string, string> = {
  active: 'hsl(var(--accent-green))',
  paused: 'hsl(var(--accent-yellow))',
  archived: 'hsl(var(--muted-foreground))',
  completed: 'hsl(var(--accent-blue))',
};

const PRIORITY_COLOR: Record<string, string> = {
  low: 'hsl(var(--accent-green))',
  medium: 'hsl(var(--accent-yellow))',
  high: 'hsl(var(--accent-orange))',
  urgent: 'hsl(var(--accent-red))',
};

const HEALTH_COLOR: Record<string, string> = {
  on_track: 'hsl(var(--accent-green))',
  at_risk: 'hsl(var(--accent-yellow))',
  off_track: 'hsl(var(--accent-red))',
};

function StatusDot({ color }: { color: string }) {
  return (
    <span className="inline-block size-2 rounded-full" style={{ backgroundColor: color }} />
  );
}

interface ProjectPropertyPanelProps {
  projectId: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function ProjectPropertyPanel({ projectId, collapsed, onToggleCollapse }: ProjectPropertyPanelProps) {
  const { t } = useTranslation();
  const { data: project } = useProjectDetail(projectId);
  const updateProject = useUpdateProject();

  if (!project) {
    return (
      <SidebarPanel
        title={t('project.sidebar.properties')}
        icon={<Tag className="size-3" />}
        iconClassName="text-muted-foreground"
      >
        <p className="px-2 py-2 text-xs text-muted-foreground">{t('project.sidebar.noData')}</p>
      </SidebarPanel>
    );
  }

  /** 枚举属性更新：必填字段忽略清空操作 */
  const locked = project.fieldsLockedExternally;
  const updateField = (field: 'type' | 'visibility' | 'status' | 'priority', value: string, required: boolean) => {
    if (required && !value) return;
    updateProject.mutate({ projectId, data: { [field]: value } as never });
  };

  const typeOptions = (['personal', 'team', 'experiment', 'enterprise'] as ProjectType[]).map((v) => ({
    value: v,
    label: t(`project.type.${v}`, v),
  }));
  const visibilityOptions = (['private', 'internal', 'public'] as ProjectVisibility[]).map((v) => ({
    value: v,
    label: t(`project.visibility.${v}`, v),
  }));
  const statusOptions = (['active', 'paused', 'archived', 'completed'] as ProjectStatus[]).map((v) => ({
    value: v,
    label: t(`project.sidebar.statusLabel.${v}`, v),
    icon: <StatusDot color={STATUS_COLOR[v]} />,
  }));
  const priorityOptions = (['low', 'medium', 'high', 'urgent'] as ProjectPriority[]).map((v) => ({
    value: v,
    label: t(`project.sidebar.priorityLabel.${v}`, v),
    icon: <StatusDot color={PRIORITY_COLOR[v]} />,
  }));

  return (
    <SidebarPanel
      title={t('project.sidebar.properties')}
      icon={<Tag className="size-3" />}
      iconClassName="text-muted-foreground"
      collapsed={collapsed}
      onToggle={onToggleCollapse}
    >
      <PropertyRow icon={<Folder className="size-3.5" />} label={t('project.sidebar.type')}>
        {locked ? (
          <ReadOnlyCapsule>{t(`project.type.${project.type}`, project.type)}</ReadOnlyCapsule>
        ) : (
          <CapsuleSelect
            value={project.type}
            options={typeOptions}
            onChange={(v) => updateField('type', v, true)}
            placeholder={t('common.none')}
          />
        )}
      </PropertyRow>

      <PropertyRow icon={<Activity className="size-3.5" />} label={t('project.sidebar.status')}>
        {locked ? (
          <ReadOnlyCapsule>
            <StatusDot color={STATUS_COLOR[project.status] ?? STATUS_COLOR.active} />
            {t(`project.sidebar.statusLabel.${project.status}`, project.status)}
          </ReadOnlyCapsule>
        ) : (
          <CapsuleSelect
            value={project.status}
            options={statusOptions}
            onChange={(v) => updateField('status', v, true)}
            placeholder={t('common.none')}
          />
        )}
      </PropertyRow>

      <PropertyRow icon={<Lock className="size-3.5" />} label={t('projectSettings.visibility')}>
        {locked ? (
          <ReadOnlyCapsule>{t(`project.visibility.${project.visibility}`, project.visibility)}</ReadOnlyCapsule>
        ) : (
          <CapsuleSelect
            value={project.visibility}
            options={visibilityOptions}
            onChange={(v) => updateField('visibility', v, true)}
            placeholder={t('common.none')}
          />
        )}
      </PropertyRow>

      <PropertyRow icon={<Flag className="size-3.5" />} label={t('project.sidebar.priority')}>
        {locked || !project.priority ? (
          <ReadOnlyCapsule>
            {project.priority ? (
              <>
                <StatusDot color={PRIORITY_COLOR[project.priority]} />
                {t(`project.sidebar.priorityLabel.${project.priority}`, project.priority)}
              </>
            ) : (
              t('common.none')
            )}
          </ReadOnlyCapsule>
        ) : (
          <CapsuleSelect
            value={project.priority}
            options={priorityOptions}
            onChange={(v) => updateField('priority', v, false)}
            placeholder={t('common.none')}
          />
        )}
      </PropertyRow>

      <PropertyRow icon={<CircleDot className="size-3.5" />} label={t('project.sidebar.health')}>
        <ReadOnlyCapsule>
          <StatusDot color={HEALTH_COLOR[project.healthStatus ?? 'on_track'] ?? HEALTH_COLOR.on_track} />
          {t(`project.sidebar.healthLabel.${project.healthStatus}`, project.healthStatus ?? '—')}
        </ReadOnlyCapsule>
      </PropertyRow>

      <PropertyRow icon={<UserIcon className="size-3.5" />} label={t('project.sidebar.owner')}>
        {project.owner ? (
          <span className="inline-flex items-center gap-1.5 max-w-40 h-6 px-1 rounded-full text-xs text-muted-foreground whitespace-nowrap">
            <Avatar className="h-4 w-4">
              {project.owner.avatarUrl ? <AvatarImage src={project.owner.avatarUrl} alt="" /> : null}
              <AvatarFallback className="text-10">
                {(project.owner.displayName || '?').slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="truncate">{project.owner.displayName}</span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground/60">{t('project.sidebar.unassigned')}</span>
        )}
      </PropertyRow>

      <PropertyRow icon={<Calendar className="size-3.5" />} label={t('project.sidebar.schedule')}>
        <span className="text-11 text-muted-foreground whitespace-nowrap">
          {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
          {' → '}
          {project.targetDate ? new Date(project.targetDate).toLocaleDateString() : '—'}
        </span>
      </PropertyRow>
    </SidebarPanel>
  );
}

/** 只读胶囊（与 CapsuleSelect 触发器同形态，无交互） */
function ReadOnlyCapsule({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 max-w-32.5 h-6 px-2.5 rounded-full border border-border bg-transparent text-xs font-medium text-muted-foreground whitespace-nowrap">
      {children}
    </span>
  );
}
