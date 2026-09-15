/**
 * PropertyPillsBar - 横向属性胶囊栏组件（CAP-A-18 V2）
 *
 * 将传统笨重垂直右侧属性面板下沉为紧凑的单行横向胶囊，
 * 采用极简药丸视觉（Linear 风格），随实体类型动态组装。
 */
import * as React from 'react';
import { useTranslation } from 'react-i18next';
import {
  User,
  FolderGit2,
  MoreHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { CapsuleSelect, DateCapsuleField } from '@/components/ui/property-panel';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Member } from '@/modules/team-member/types';
import type { BugSeverity, TaskPriority } from '@/modules/issue/api/issue-api';
import type { DocumentCategory as DocCategory } from '@/modules/document/api/document-api';
import type { CreateType } from './unified-create-dialog';

export interface PropertyPillsBarProps {
  activeType: CreateType;
  // Common
  projectId: string;
  projectList: Array<{ id: string; name: string }>;
  onProjectChange: (pid: string) => void;

  // Task & Bug
  status?: string;
  onStatusChange?: (status: string) => void;
  statusOptions?: { value: string; label: string; icon: React.ComponentType<{ className?: string }>; toneClass?: string; spin?: boolean }[];

  priority?: TaskPriority;
  onPriorityChange?: (priority: TaskPriority) => void;
  priorityOptions?: { value: TaskPriority; label: string; icon: React.ComponentType<{ className?: string }>; toneClass?: string }[];

  assigneeId?: string;
  onAssigneeChange?: (assigneeId: string) => void;
  members?: Member[];

  dueDate?: string;
  onDueDateChange?: (dueDate: string) => void;

  labels?: string[];
  onLabelsChange?: (labels: string[]) => void;

  // Bug specific
  severity?: BugSeverity;
  onSeverityChange?: (severity: BugSeverity) => void;
  severityOptions?: { value: BugSeverity; dotClass: string }[];

  moduleId?: string;
  onModuleChange?: (modId: string) => void;
  modules?: { id: string; name: string }[];

  // Doc specific
  docCategory?: DocCategory;
  onDocCategoryChange?: (cat: DocCategory) => void;
  docCategoryOptions?: { value: DocCategory }[];

  // Project specific
  projectPriority?: string;
  onProjectPriorityChange?: (p: string) => void;
  projectVisibility?: string;
  onProjectVisibilityChange?: (v: string) => void;

  // Milestone specific
  milestoneStatus?: string;
  onMilestoneStatusChange?: (s: string) => void;

  // 治理动作回调
  onOpenAcceptance?: () => void;
  acceptanceCount?: number;
}

export function PropertyPillsBar({
  activeType,
  projectId,
  projectList,
  onProjectChange,
  status,
  onStatusChange,
  statusOptions = [],
  priority,
  onPriorityChange,
  priorityOptions = [],
  assigneeId,
  onAssigneeChange,
  members = [],
  dueDate,
  onDueDateChange,
  severity,
  onSeverityChange,
  severityOptions = [],
  moduleId,
  onModuleChange,
  modules = [],
  docCategory,
  onDocCategoryChange,
  docCategoryOptions = [],
  projectPriority,
  onProjectPriorityChange,
  milestoneStatus,
  onMilestoneStatusChange,
  onOpenAcceptance,
  acceptanceCount = 0,
}: PropertyPillsBarProps) {
  const { t } = useTranslation();
  const [moreOpen, setMoreOpen] = React.useState(false);

  const projectOptions = React.useMemo(
    () => projectList.map((p) => ({ value: p.id, label: p.name })),
    [projectList],
  );

  const memberOptions = React.useMemo(
    () =>
      members.map((m) => ({
        value: m.id,
        label: m.displayName,
        icon: m.type === 'ai_agent' ? <span className="inline-block size-2 rounded-full bg-accent-purple" /> : undefined,
      })),
    [members],
  );

  // 渲染任务与通用胶囊
  if (activeType === 'task') {
    return (
      <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
        {/* 状态 */}
        {onStatusChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">{t('unifiedCreate.field.status')}</span>
            <CapsuleSelect
              value={status || 'todo'}
              options={statusOptions.map((s) => ({
                value: s.value,
                label: s.label,
                icon: <s.icon className={cn('size-3.5', s.toneClass, s.spin && 'animate-spin')} />,
              }))}
              onChange={(v) => onStatusChange(v || 'todo')}
              active
            />
          </div>
        )}

        {/* 优先级 */}
        {onPriorityChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">{t('unifiedCreate.field.priority')}</span>
            <CapsuleSelect
              value={priority ?? ''}
              options={priorityOptions.map((p) => ({
                value: p.value,
                label: p.label,
                icon: <p.icon className={cn('size-3.5', p.toneClass)} />,
              }))}
              onChange={(v) => onPriorityChange((v || 'medium') as TaskPriority)}
              active={!!priority}
              placeholder={t('unifiedCreate.linear.noPriority', { defaultValue: '无优先级' })}
            />
          </div>
        )}

        {/* 经办人 */}
        {onAssigneeChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">{t('unifiedCreate.field.assignee')}</span>
            <CapsuleSelect
              value={assigneeId ?? ''}
              options={memberOptions}
              onChange={onAssigneeChange}
              active={!!assigneeId}
              placeholder={t('unifiedCreate.linear.unassigned', { defaultValue: '未指派' })}
            />
          </div>
        )}

        {/* 所属项目 */}
        <div className="inline-flex items-center">
          <span className="sr-only">{t('unifiedCreate.field.project')}</span>
          <CapsuleSelect
            value={projectId}
            options={projectOptions}
            onChange={onProjectChange}
            active={!!projectId}
            placeholder={t('unifiedCreate.linear.noProject', { defaultValue: '无项目' })}
          />
        </div>

        {/* 截止日期 */}
        {onDueDateChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">{t('unifiedCreate.field.dueDate')}</span>
            <DateCapsuleField
              value={dueDate ?? ''}
              onChange={onDueDateChange}
              placeholder={t('unifiedCreate.field.none', { defaultValue: '截止日' })}
              clearLabel={t('unifiedCreate.field.clearDueDate', { defaultValue: '清除日期' })}
            />
          </div>
        )}

        {/* 更多属性 Popover */}
        <Popover open={moreOpen} onOpenChange={setMoreOpen}>
          <PopoverTrigger
            render={
              <button
                type="button"
                className="inline-flex items-center justify-center size-6 rounded-md border border-border/70 bg-background/60 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title={t('unifiedCreate.moreProperties', { defaultValue: '更多属性' })}
              >
                <MoreHorizontal className="size-3.5" />
              </button>
            }
          />
          <PopoverContent align="start" className="w-56 p-1.5 shadow-xl border border-border/70 bg-popover/95 text-xs">
            <div className="flex flex-col gap-1">
              {onOpenAcceptance && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenAcceptance();
                    setMoreOpen(false);
                  }}
                  className="flex items-center justify-between px-2 py-1.5 rounded hover:bg-accent transition-colors text-left"
                >
                  <span className="text-foreground">{t('unifiedCreate.acceptanceTitle', { defaultValue: '验收标准门禁' })}</span>
                  {acceptanceCount > 0 && (
                    <span className="text-10 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                      {acceptanceCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // 渲染缺陷（Bug）胶囊
  if (activeType === 'bug') {
    return (
      <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
        {/* 严重度 */}
        {onSeverityChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">{t('unifiedCreate.field.severity')}</span>
            <CapsuleSelect
              value={severity || 'medium'}
              options={severityOptions.map((s) => ({
                value: s.value,
                label: t(`unifiedCreate.severity.${s.value}`, { defaultValue: s.value }),
                icon: <span className={cn('inline-block size-2 rounded-full', s.dotClass)} />,
              }))}
              onChange={(v) => onSeverityChange((v || 'medium') as BugSeverity)}
              active
            />
          </div>
        )}

        {/* 状态 */}
        {onStatusChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">{t('unifiedCreate.field.status')}</span>
            <CapsuleSelect
              value={status || 'todo'}
              options={statusOptions.map((s) => ({
                value: s.value,
                label: s.label,
                icon: <s.icon className={cn('size-3.5', s.toneClass, s.spin && 'animate-spin')} />,
              }))}
              onChange={(v) => onStatusChange(v || 'todo')}
              active
            />
          </div>
        )}

        {/* 优先级 */}
        {onPriorityChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">{t('unifiedCreate.field.priority')}</span>
            <CapsuleSelect
              value={priority ?? ''}
              options={priorityOptions.map((p) => ({
                value: p.value,
                label: p.label,
                icon: <p.icon className={cn('size-3.5', p.toneClass)} />,
              }))}
              onChange={(v) => onPriorityChange((v || 'high') as TaskPriority)}
              active={!!priority}
              placeholder={t('unifiedCreate.linear.noPriority', { defaultValue: '无优先级' })}
            />
          </div>
        )}

        {/* 经办人 */}
        {onAssigneeChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">{t('unifiedCreate.field.assignee')}</span>
            <CapsuleSelect
              value={assigneeId ?? ''}
              options={memberOptions}
              onChange={onAssigneeChange}
              active={!!assigneeId}
              placeholder={t('unifiedCreate.linear.unassigned', { defaultValue: '未指派' })}
            />
          </div>
        )}

        {/* 所属项目 */}
        <div className="inline-flex items-center">
          <span className="sr-only">{t('unifiedCreate.field.project')}</span>
          <CapsuleSelect
            value={projectId}
            options={projectOptions}
            onChange={onProjectChange}
            active={!!projectId}
            placeholder={t('unifiedCreate.linear.noProject', { defaultValue: '无项目' })}
          />
        </div>

        {/* 影响模块 */}
        {modules.length > 0 && onModuleChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">模块</span>
            <CapsuleSelect
              value={moduleId || ''}
              options={modules.map((m) => ({ value: m.id, label: m.name }))}
              onChange={onModuleChange}
              active={!!moduleId}
              placeholder="模块归属"
            />
          </div>
        )}

        {/* 截止日期 */}
        {onDueDateChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">{t('unifiedCreate.field.dueDate')}</span>
            <DateCapsuleField
              value={dueDate ?? ''}
              onChange={onDueDateChange}
              placeholder={t('unifiedCreate.field.none', { defaultValue: '截止日' })}
              clearLabel={t('unifiedCreate.field.clearDueDate', { defaultValue: '清除日期' })}
            />
          </div>
        )}
      </div>
    );
  }

  // 渲染文档（Doc）胶囊
  if (activeType === 'doc') {
    return (
      <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
        {/* 类目 */}
        {onDocCategoryChange && (
          <div className="inline-flex items-center">
            <span className="sr-only">类目</span>
            <CapsuleSelect
              value={docCategory || 'requirement'}
              options={docCategoryOptions.map((c) => ({
                value: c.value,
                label: t(`unifiedCreate.category.${c.value}`, { defaultValue: c.value }),
              }))}
              onChange={(v) => onDocCategoryChange(v as DocCategory)}
              active
            />
          </div>
        )}

        {/* 作者 */}
        <div className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border border-border/70 bg-background/60 text-muted-foreground">
          <User className="size-3 opacity-60" />
          <span>{t('unifiedCreate.field.author', { defaultValue: '作者' })}: {t('unifiedCreate.field.me', { defaultValue: '我' })}</span>
        </div>

        {/* 所属项目 */}
        <div className="inline-flex items-center">
          <span className="sr-only">{t('unifiedCreate.field.project')}</span>
          <CapsuleSelect
            value={projectId}
            options={projectOptions}
            onChange={onProjectChange}
            active={!!projectId}
            placeholder={t('unifiedCreate.linear.noProject', { defaultValue: '无项目' })}
          />
        </div>
      </div>
    );
  }

  // 渲染项目（Project）胶囊
  if (activeType === 'project') {
    return (
      <div className="flex flex-wrap items-center gap-2 py-1 text-xs">
        {/* 项目优先级（保留清晰 label 以兼容既有断言与规范） */}
        {onProjectPriorityChange && (
          <div className="inline-flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground font-medium">{t('unifiedCreate.field.priority')}</span>
            <CapsuleSelect
              value={projectPriority || 'medium'}
              options={priorityOptions.map((p) => ({
                value: p.value,
                label: p.label,
                icon: <p.icon className={cn('size-3.5', p.toneClass)} />,
              }))}
              onChange={onProjectPriorityChange}
              active
            />
          </div>
        )}

        {/* 项目可见性 */}
        <div className="inline-flex items-center gap-1.5 h-6 px-2 rounded-md border border-border/70 bg-background/60 text-muted-foreground">
          <FolderGit2 className="size-3 opacity-60" />
          <span>内部团队可见</span>
        </div>
      </div>
    );
  }

  // 里程碑（Milestone）胶囊
  return (
    <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
      {/* 所属项目 */}
      <div className="inline-flex items-center">
        <span className="sr-only">{t('unifiedCreate.field.project')}</span>
        <CapsuleSelect
          value={projectId}
          options={projectOptions}
          onChange={onProjectChange}
          active={!!projectId}
          placeholder={t('unifiedCreate.linear.selectProject', { defaultValue: '选择项目' })}
        />
      </div>

      {/* 状态 */}
      {onMilestoneStatusChange && (
        <div className="inline-flex items-center">
          <CapsuleSelect
            value={milestoneStatus || 'planned'}
            options={[
              { value: 'planned', label: '计划中 planned' },
              { value: 'active', label: '进行中 active' },
              { value: 'completed', label: '已达成 completed' },
            ]}
            onChange={onMilestoneStatusChange}
            active
          />
        </div>
      )}

      {/* 目标达成日 */}
      {onDueDateChange && (
        <div className="inline-flex items-center">
          <span className="sr-only">{t('unifiedCreate.field.targetDate')}</span>
          <DateCapsuleField
            value={dueDate ?? ''}
            onChange={onDueDateChange}
            placeholder={t('unifiedCreate.field.none', { defaultValue: '目标达成日' })}
            clearLabel={t('unifiedCreate.field.clearDueDate', { defaultValue: '清除日期' })}
          />
        </div>
      )}
    </div>
  );
}
