/**
 * UnifiedCreateDialog - 统一创建对话框
 * 参考设计见 create-dialog.html (Linear 风格, 属性胶囊右侧栏)
 *
 * 结构:
 * ┌─────────────────────────────────────────────────────────┐
 * │  AgentPM  ›  [Task ▾]                    [panel][max][×]│  Header
 * ├──────────────────────────────────────────┬──────────────┤
 * │  Title (大字号)                          │ Properties   │
 * │  Description (无边框)                    │ ┌──────────┐ │
 * │  Extra fields (Type/Template chips)      │ │ Status  │ │
 * │  ── Suggestions ──                       │ │ Priority│ │
 * │  ── Sub-task ──  (可折叠卡片)            │ │ ...     │ │
 * │                                          │ └──────────┘ │
 * │                                          │ Suggestions  │
 * ├──────────────────────────────────────────┴──────────────┤
 * │  📎    [Create more ⬜]                [Cancel] [Create]│  Footer
 * └─────────────────────────────────────────────────────────┘
 *
 * 胶囊 (Capsule) 是右侧栏每个属性值的 pill 控件,
 * 点击触发 Popover (status / priority / assignee / project / milestone / label / date)
 */
import * as React from 'react';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DateCapsuleField } from '@/components/ui/property-panel';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useCreateProject } from '@/modules/project/hooks/use-project-mutations';
import { useProjectModules } from '@/modules/project/hooks/use-project-modules';
import { useCreateTask } from '@/modules/task/hooks/use-project-tasks';
import { useCreateProjectMilestone } from '@/modules/project/hooks/use-project-dashboard-summary';
import { useCreateDocument } from '@/modules/document/hooks/use-document-mutations';
import { listProjectMembers } from '@/modules/team-member/api/team-member-api';
import type { Member } from '@/modules/team-member/types';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import type { BugSeverity, TaskPriority } from '@/modules/task/api/task-api';
import type {
  CreateProjectRequest,
  CreateMilestoneRequest,
  ProjectPriority,
  ProjectType,
  ProjectVisibility,
} from '@/modules/project/api/project-api';
import type { DocumentCategory as DocCategory } from '@/modules/document/api/document-api';import {
  CheckSquare,
  Bug,
  X,
  Plus,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Loader2,
  Flag,
  Diamond,
  Tag,
  User,
  Paperclip,
  PanelRightClose,
  PanelRight,
  Maximize2,
  Minimize2,
  Sparkles,
  ListTodo,
  AlertCircle,
  FolderPlus,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';

// ============================================================================
// Types
// ============================================================================

export type CreateType = 'task' | 'bug' | 'doc' | 'project' | 'milestone';

export interface UnifiedCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: CreateType;
  projectId?: string;
  /** 打开时预置的任务负责人（成员 id，用于成员卡「派发任务」等入口） */
  defaultAssigneeId?: string;
  onSuccess?: (type: CreateType, id: string) => void;
}

// ============================================================================
// Config
// ============================================================================

const TYPE_ORDER: CreateType[] = ['task', 'bug', 'doc', 'project', 'milestone'];

interface TypeMeta {
  label: string;
  shortcut: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string; style?: React.CSSProperties }>;
  color: string;
  placeholder: string;
  descriptionHint: string;
  createLabel: string;
}

const FileTextIcon = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement> & { className?: string }>(
  (props, ref) => (
    <svg
      ref={ref}
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
);
FileTextIcon.displayName = 'FileTextIcon';

const Circle = React.forwardRef<SVGSVGElement, React.SVGProps<SVGSVGElement> & { className?: string }>(
  (props, ref) => (
    <svg ref={ref} {...props} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  ),
);
Circle.displayName = 'Circle';

const TYPE_META: Record<CreateType, TypeMeta> = {
  task: {
    label: 'Task',
    shortcut: '1',
    Icon: CheckSquare,
    color: '#5e6ad2',
    placeholder: 'Task title',
    descriptionHint: 'Add a description…',
    createLabel: 'Create task',
  },
  bug: {
    label: 'Bug',
    shortcut: '2',
    Icon: Bug,
    color: '#eb5757',
    placeholder: 'Bug title',
    descriptionHint: 'Steps to reproduce, expected vs actual…',
    createLabel: 'Report bug',
  },
  doc: {
    label: 'Document',
    shortcut: '3',
    Icon: FileTextIcon,
    color: '#bb87fc',
    placeholder: 'Document title',
    descriptionHint: 'Add a summary or initial content…',
    createLabel: 'Create document',
  },
  project: {
    label: 'Project',
    shortcut: '4',
    Icon: FolderPlus,
    color: '#4cb782',
    placeholder: 'Project name',
    descriptionHint: 'Goals, scope and success criteria…',
    createLabel: 'Create project',
  },
  milestone: {
    label: 'Milestone',
    shortcut: '5',
    Icon: Flag,
    color: '#f2c94c',
    placeholder: 'Milestone name',
    descriptionHint: 'Key deliverables…',
    createLabel: 'Create milestone',
  },
};

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>; color: string }[] = [
  { value: 'critical', label: 'Urgent', icon: AlertCircle, color: '#ef4444' },
  { value: 'high', label: 'High', icon: ChevronUp, color: '#f97316' },
  { value: 'medium', label: 'Medium', icon: ChevronDown, color: '#eab308' },
  { value: 'low', label: 'Low', icon: ChevronDown, color: '#8b93a4' },
];

const SEVERITY_OPTIONS: { value: BugSeverity; label: string; color: string }[] = [
  { value: 'critical', label: 'S0 致命', color: '#ef4444' },
  { value: 'high', label: 'S1 严重', color: '#f97316' },
  { value: 'medium', label: 'S2 一般', color: '#eab308' },
  { value: 'low', label: 'S3 轻微', color: '#10b981' },
];

const TASK_STATUS_OPTIONS: { value: string; label: string; icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>; color: string }[] = [
  { value: 'todo', label: 'Todo', icon: Circle, color: '#8993a4' },
  { value: 'in_progress', label: 'In Progress', icon: Loader2, color: '#3b82f6' },
  { value: 'in_review', label: 'In Review', icon: AlertCircle, color: '#8b5cf6' },
  { value: 'done', label: 'Done', icon: Check, color: '#10b981' },
  { value: 'canceled', label: 'Canceled', icon: X, color: '#b0b8c4' },
];

const DOC_TYPE_OPTIONS = [
  { value: 'spec', label: 'Specification' },
  { value: 'guide', label: 'Guide' },
  { value: 'api', label: 'API Reference' },
  { value: 'meeting_notes', label: 'Meeting Notes' },
  { value: 'retrospective', label: 'Retrospective' },
  { value: 'other', label: 'Other' },
];

const PROJECT_TEMPLATES = [
  { value: 'blank', label: 'Blank' },
  { value: 'software', label: 'Software' },
  { value: 'design', label: 'Design' },
  { value: 'marketing', label: 'Marketing' },
];

const TAG_SUGGESTIONS: Record<CreateType, string[]> = {
  task: ['frontend', 'backend', 'bug', 'feature', 'urgent'],
  bug: ['regression', 'crash', 'data-loss', 'ui-bug', 'p1'],
  doc: ['spec', 'design', 'api', 'guide', 'rfc'],
  project: ['platform', 'internal', 'client'],
  milestone: ['mvp', 'ga', 'beta'],
};

// ============================================================================
// Form values
// ============================================================================

interface TaskFormValues {
  title: string;
  description: string;
  status: string;
  priority: TaskPriority;
  assigneeId: string;
  dueDate: string;
  projectId: string;
  labels: string[];
}

interface BugFormValues {
  title: string;
  description: string;
  status: string;
  severity: BugSeverity;
  projectId: string;
  assigneeId: string;
  dueDate: string;
  labels: string[];
}

interface DocFormValues {
  title: string;
  description: string;
  type: string;
  projectId: string;
  labels: string[];
}

interface ProjectFormValues {
  name: string;
  description: string;
  template: string;
  visibility: ProjectVisibility;
  priority: ProjectPriority;
}

interface MilestoneFormValues {
  name: string;
  description: string;
  projectId: string;
  status: string;
  dueDate: string;
}

const DEFAULT_TASK: TaskFormValues = {
  title: '', description: '', status: 'todo', priority: 'medium',
  assigneeId: '', dueDate: '', projectId: '', labels: [],
};
const DEFAULT_BUG: BugFormValues = {
  title: '', description: '', status: 'todo', severity: 'medium',
  projectId: '', assigneeId: '', dueDate: '', labels: [],
};
const DEFAULT_DOC: DocFormValues = {
  title: '', description: '', type: 'spec', projectId: '', labels: [],
};
const DEFAULT_PROJECT: ProjectFormValues = {
  name: '', description: '', template: 'blank', visibility: 'internal', priority: 'medium',
};
const DEFAULT_MILESTONE: MilestoneFormValues = {
  name: '', description: '', projectId: '', status: 'planned', dueDate: '',
};

// ============================================================================
// Atoms
// ============================================================================

function MemberAvatar({ name, avatarUrl }: { name: string; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <Avatar size="sm" className="shrink-0">
        <AvatarImage src={avatarUrl} alt={name} />
        <AvatarFallback>{name[0]?.toUpperCase() ?? '?'}</AvatarFallback>
      </Avatar>
    );
  }
  return (
    <Avatar size="sm" className="shrink-0">
      <AvatarFallback className="bg-primary/15 text-primary text-10 font-semibold">
        {name[0]?.toUpperCase() ?? '?'}
      </AvatarFallback>
    </Avatar>
  );
}

/**
 * Capsule - 右侧属性栏的 pill 控件
 * Linear 风格: 圆角胶囊 + icon + label + chevron
 */
function Capsule({
  active,
  onClick,
  children,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 max-w-32.5 h-6 px-2.5 rounded-full border border-border bg-transparent text-xs font-medium text-muted-foreground whitespace-nowrap transition-colors hover:bg-accent hover:text-foreground hover:border-border/80',
        active && 'bg-accent border-border text-foreground',
        className,
      )}
    >
      <span className="overflow-hidden text-ellipsis max-w-22.5 truncate">{children}</span>
      <ChevronDown className="size-3 opacity-50 shrink-0" />
    </button>
  );
}

function CapsuleSelect({
  value,
  options,
  onChange,
  active,
  placeholder = 'None',
}: {
  value: string;
  options: { value: string; label: string; icon?: React.ReactNode; color?: string }[];
  onChange: (v: string) => void;
  active?: boolean;
  placeholder?: string;
}) {
  const current = options.find((o) => o.value === value);
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <button
          type="button"
          className={cn(
            'inline-flex items-center gap-1.5 max-w-32.5 h-6 px-2.5 rounded-full border border-border bg-transparent text-xs font-medium text-muted-foreground whitespace-nowrap transition-colors hover:bg-accent hover:text-foreground hover:border-border/80',
            active && 'bg-accent border-border text-foreground',
          )}
        >
          {current?.icon}
          <span className="overflow-hidden text-ellipsis max-w-22.5 truncate">
            {current?.label ?? placeholder}
          </span>
          <ChevronDown className="size-3 opacity-50 shrink-0" />
        </button>
      }>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={4}
        className="w-50 p-1 max-h-65 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col">
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={cn(
              'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors',
              !value && 'bg-accent',
            )}
          >
            <span className="text-muted-foreground italic">{placeholder}</span>
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn(
                'flex items-center gap-2 px-2 py-1.5 rounded-md text-xs hover:bg-accent transition-colors',
                value === opt.value && 'bg-accent',
              )}
            >
              {opt.icon}
              <span className="flex-1 text-left">{opt.label}</span>
              {value === opt.value && <Check className="size-3.5 text-primary" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * PropertyRow - 右侧属性栏的一行 (icon + label + value)
 */
function PropertyRow({ icon, label, children }: { icon?: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg min-h-8 hover:bg-muted/40 transition-colors">
      {icon && <span className="text-muted-foreground shrink-0">{icon}</span>}
      <span className="text-xs text-muted-foreground flex-1 min-w-0 truncate">{label}</span>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/**
 * PropsCard - 右侧属性面板卡 (可折叠为胶囊)
 */
function PropsCard({
  title,
  collapsed,
  onToggleCollapse,
  children,
}: {
  title: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={cn(
      'rounded-xl border border-border bg-card overflow-hidden transition-all',
      collapsed && 'rounded-full',
    )}>
      <div className={cn(
        'flex items-center justify-between px-3 py-2 bg-muted/30',
        collapsed && 'border-b-0',
      )}>
        <span className="text-10 font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="size-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
          title={collapsed ? '展开' : '收起'}
        >
          {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
        </button>
      </div>
      {!collapsed && <div className="p-1.5 flex flex-col gap-0.5">{children}</div>}
    </div>
  );
}

/**
 * AutoSizeTextarea - 自适应高度 textarea
 */
function AutoSizeTextarea({
  rows = 1,
  className,
  ...props
}: React.ComponentProps<'textarea'> & { rows?: number }) {
  return (
    <Textarea
      rows={rows}
      className={cn(
        'field-sizing-content bg-transparent dark:bg-transparent [background-color:transparent] !border-0 shadow-none px-0.5 py-0 rounded-none focus-visible:ring-0 focus-visible:border-transparent min-h-0 resize-none',
        className,
      )}
      {...props}
    />
  );
}

function FillTextarea(props: React.ComponentProps<'textarea'>) {
  return (
    <Textarea
      {...props}
      className={cn(
        'field-sizing-fixed h-full bg-transparent dark:bg-transparent [background-color:transparent] !border-0 shadow-none px-2.5 py-2 rounded-md focus-visible:ring-0 focus-visible:border-transparent resize',
        props.className,
      )}
    />
  );
}

// ============================================================================
// Main component
// ============================================================================

export function UnifiedCreateDialog({
  open, onOpenChange, defaultType = 'task', projectId, defaultAssigneeId, onSuccess,
}: UnifiedCreateDialogProps) {
  const [activeType, setActiveType] = useState<CreateType>(defaultType);
  const [error, setError] = useState<string | null>(null);

  // layout state
  const [showProps, setShowProps] = useState(true);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [createMore, setCreateMore] = useState(false);

  // subtask state (single sub-task per creation, matches reference)
  const [subOpen, setSubOpen] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');

  // forms
  const taskForm = useForm<TaskFormValues>({ defaultValues: DEFAULT_TASK });
  const bugForm = useForm<BugFormValues>({ defaultValues: DEFAULT_BUG });
  const docForm = useForm<DocFormValues>({ defaultValues: DEFAULT_DOC });
  const projectForm = useForm<ProjectFormValues>({ defaultValues: DEFAULT_PROJECT });
  const milestoneForm = useForm<MilestoneFormValues>({ defaultValues: DEFAULT_MILESTONE });

  // data hooks
  const { data: projectListResp } = useProjectList();
  const projectList = useMemo(() => projectListResp?.items ?? [], [projectListResp]);
  const createTask = useCreateTask();
  const createProject = useCreateProject();
  const createMilestone = useCreateProjectMilestone(projectId);
  const createDocument = useCreateDocument();

  const activeProjectId = (() => {
    const fromForm =
      activeType === 'task' ? taskForm.watch('projectId')
      : activeType === 'bug' ? bugForm.watch('projectId')
      : activeType === 'milestone' ? milestoneForm.watch('projectId')
      : activeType === 'doc' ? docForm.watch('projectId')
      : '';
    return fromForm || projectId || '';
  })();

  const { data: projectModules = [] } = useProjectModules(activeProjectId);

  // members
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);
  useEffect(() => {
    if (!activeProjectId) { setMembers([]); return; }
    let cancelled = false;
    setMembersLoading(true);
    listProjectMembers(activeProjectId)
      .then((list) => { if (!cancelled) setMembers(list || []); })
      .catch(() => { if (!cancelled) setMembers([]); })
      .finally(() => { if (!cancelled) setMembersLoading(false); });
    return () => { cancelled = true; };
  }, [activeProjectId]);

  useEffect(() => { setActiveType(defaultType); }, [defaultType]);
  // 成员卡「派发任务」等入口：打开时预置负责人
  useEffect(() => {
    if (open && defaultAssigneeId) {
      taskForm.setValue('assigneeId', defaultAssigneeId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultAssigneeId]);
  useEffect(() => {
    if (!projectId) return;
    taskForm.setValue('projectId', projectId);
    bugForm.setValue('projectId', projectId);
    docForm.setValue('projectId', projectId);
    milestoneForm.setValue('projectId', projectId);
  }, [projectId, taskForm, bugForm, docForm, milestoneForm]);

  const reset = useCallback(() => {
    taskForm.reset(DEFAULT_TASK);
    bugForm.reset(DEFAULT_BUG);
    docForm.reset(DEFAULT_DOC);
    projectForm.reset(DEFAULT_PROJECT);
    milestoneForm.reset(DEFAULT_MILESTONE);
    setSubOpen(false);
    setSubTitle('');
    setSubDesc('');
    setError(null);
  }, [taskForm, bugForm, docForm, projectForm, milestoneForm]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(reset, 150);
  };

  const handleSuccess = (type: CreateType, id: string) => {
    onSuccess?.(type, id);
    toast.success(`${TYPE_META[type].label} 创建成功`);
    if (createMore) {
      reset();
    } else {
      handleClose();
    }
  };

  const resolveModuleCode = (pid: string | undefined, fallback = 'TASK'): string | undefined => {
    if (!pid) return undefined;
    return projectModules[0]?.code ?? fallback;
  };

  // ── Sub-task state lives separately (matches reference design)
  // The single sub-task's status/priority/assignee/project inherit from main task at submission time

  const submitTask = async () => {
    const values = taskForm.getValues();
    if (!values.title.trim()) { setError('请输入任务标题'); return; }
    const pid = values.projectId || projectId;
    const moduleCode = resolveModuleCode(pid);
    setError(null);
    try {
      const todoItems = subOpen && subTitle.trim()
        ? [{ id: `local-${Date.now()}`, content: subTitle.trim(), completed: !!subDesc, order: 0 }]
        : undefined;
      const resp = await createTask.mutateAsync({
        projectId: pid || undefined,
        ...(moduleCode ? { moduleCode } : {}),
        title: values.title,
        description: values.description || undefined,
        priority: values.priority,
        status: values.status,
        assigneeId: values.assigneeId || undefined,
        dueDate: values.dueDate || undefined,
        tags: values.labels,
        type: 'task',
        todoItems,
      });
      if (resp?.id) handleSuccess('task', resp.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const submitBug = async () => {
    const values = bugForm.getValues();
    if (!values.title.trim()) { setError('请输入 Bug 标题'); return; }
    const pid = values.projectId || projectId;
    const moduleCode = resolveModuleCode(pid, 'BUG');
    setError(null);
    try {
      const resp = await createTask.mutateAsync({
        projectId: pid || undefined,
        ...(moduleCode ? { moduleCode } : {}),
        title: values.title,
        description: values.description || undefined,
        priority: 'high',
        status: values.status,
        assigneeId: values.assigneeId || undefined,
        dueDate: values.dueDate || undefined,
        tags: values.labels,
        type: 'bug',
        severity: values.severity,
      });
      if (resp?.id) handleSuccess('bug', resp.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const submitDoc = async () => {
    const values = docForm.getValues();
    if (!values.title.trim()) { setError('请输入文档标题'); return; }
    setError(null);
    try {
      const resp = await createDocument.mutateAsync({
        title: values.title,
        summary: values.description || undefined,
        content: '',
        category: 'custom' as DocCategory,
        projectId: values.projectId || projectId || undefined,
        tags: values.labels,
      });
      if (resp?.id) handleSuccess('doc', (resp as any).id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const submitProject = async () => {
    const values = projectForm.getValues();
    if (!values.name.trim()) { setError('请输入项目名称'); return; }
    setError(null);
    try {
      const payload: CreateProjectRequest = {
        name: values.name,
        description: values.description || undefined,
        type: 'team' as ProjectType,
        visibility: values.visibility,
        priority: values.priority,
      };
      const resp = await createProject.mutateAsync(payload);
      if (resp?.id) handleSuccess('project', resp.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const submitMilestone = async () => {
    const values = milestoneForm.getValues();
    if (!values.name.trim()) { setError('请输入里程碑名称'); return; }
    const pid = values.projectId || projectId;
    if (!pid) { setError('请选择所属项目'); return; }
    setError(null);
    try {
      const payload: CreateMilestoneRequest = {
        name: values.name,
        description: values.description || undefined,
        targetDate: values.dueDate || null,
        status: values.status,
      };
      const resp = await createMilestone.mutateAsync(payload);
      if (resp?.id) handleSuccess('milestone', resp.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  const handleSubmit = () => {
    switch (activeType) {
      case 'task': return submitTask();
      case 'bug': return submitBug();
      case 'doc': return submitDoc();
      case 'project': return submitProject();
      case 'milestone': return submitMilestone();
    }
  };

  const isSubmitting =
    createTask.isPending || createProject.isPending
    || createMilestone.isPending || createDocument.isPending;

  // ── Form state helpers
  const taskTitle = useWatch({ control: taskForm.control, name: 'title' }) ?? '';
  const bugTitle = useWatch({ control: bugForm.control, name: 'title' }) ?? '';
  const docTitle = useWatch({ control: docForm.control, name: 'title' }) ?? '';
  const projectName = useWatch({ control: projectForm.control, name: 'name' }) ?? '';
  const milestoneName = useWatch({ control: milestoneForm.control, name: 'name' }) ?? '';
  const currentTitle =
    activeType === 'task' ? taskTitle
    : activeType === 'bug' ? bugTitle
    : activeType === 'doc' ? docTitle
    : activeType === 'project' ? projectName
    : milestoneName;

  // ── Keyboard shortcuts
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); handleClose(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSubmit(); return; }
      if ((e.ctrlKey || e.metaKey) && /^[1-9]$/.test(e.key)) {
        e.preventDefault();
        const idx = Number(e.key) - 1;
        if (idx < TYPE_ORDER.length) setActiveType(TYPE_ORDER[idx]);
        return;
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeType, createMore]);

  const currentMeta = TYPE_META[activeType];
  const CurrentIcon = currentMeta.Icon;

  // ── Width classes for dialog
  const widthClass = maximized
    ? (showProps ? 'w-[min(96vw,1000px)]' : 'w-[min(96vw,780px)]')
    : (showProps ? 'w-[min(96vw,720px)]' : 'w-[min(96vw,520px)]');

  // ── Render helpers ───────────────────────────────────────

  const renderProjectName = (projectId?: string | null): string => {
    if (!projectId) return 'Inbox';
    return projectList.find((p) => p.id === projectId)?.name ?? 'Inbox';
  };

  const currentProjectId = activeProjectId;

  // ── Property panel content per activeType ──────────────

  const renderPropertiesContent = () => {
    if (activeType === 'task') {
      const statusVal: string = taskForm.watch('status') ?? 'todo';
      const priorityVal = taskForm.watch('priority');
      const assigneeVal: string = taskForm.watch('assigneeId');
      const projectVal: string = taskForm.watch('projectId') || projectId || '';
      const dueVal: string = taskForm.watch('dueDate');
      const labelsVal: string[] = taskForm.watch('labels') ?? [];
      const statusOpt = TASK_STATUS_OPTIONS.find((s) => s.value === statusVal);
      const StatusIcon = statusOpt?.icon ?? Circle;
      const memberOptions = members.map((m) => ({ value: m.id, label: m.displayName }));
      const projectOptions = projectList.map((p) => ({ value: p.id, label: p.name }));
      return (
        <>
          <PropertyRow icon={<StatusIcon className="size-3.5" style={{ color: statusOpt?.color }} />} label="Status">
            <CapsuleSelect
              value={statusVal}
              options={TASK_STATUS_OPTIONS.map((s) => ({
                value: s.value,
                label: s.label,
                icon: <s.icon className="size-3.5" style={{ color: s.color }} />,
              }))}
              onChange={(v) => taskForm.setValue('status', v || 'todo')}
              active
            />
          </PropertyRow>
          <PropertyRow icon={<AlertCircle className="size-3.5" />} label="Priority">
            <CapsuleSelect
              value={priorityVal ?? ''}
              options={PRIORITY_OPTIONS.map((p) => ({
                value: p.value,
                label: p.label,
                icon: <p.icon className="size-3.5" style={{ color: p.color }} />,
              }))}
              onChange={(v) => taskForm.setValue('priority', (v || 'medium') as TaskPriority)}
              active={!!priorityVal}
            />
          </PropertyRow>
          <PropertyRow icon={<User className="size-3.5" />} label="Assignee">
            <CapsuleSelect
              value={assigneeVal ?? ''}
              options={memberOptions}
              onChange={(v) => taskForm.setValue('assigneeId', v)}
              active={!!assigneeVal}
              placeholder="Unassigned"
            />
          </PropertyRow>
          <PropertyRow icon={<Flag className="size-3.5" />} label="Project">
            <CapsuleSelect
              value={projectVal}
              options={projectOptions}
              onChange={(v) => taskForm.setValue('projectId', v)}
              active={!!projectVal}
              placeholder="Inbox"
            />
          </PropertyRow>
          <PropertyRow icon={<Tag className="size-3.5" />} label="Labels">
            <CapsuleSelect
              value=""
              options={[]}
              onChange={() => {}}
              active={labelsVal.length > 0}
              placeholder={labelsVal.length > 0 ? `${labelsVal[0]}${labelsVal.length > 1 ? ` +${labelsVal.length - 1}` : ''}` : 'None'}
            />
          </PropertyRow>
          <PropertyRow icon={<CalendarIcon className="size-3.5" />} label="Due date">
            <DateCapsuleField
              value={dueVal}
              onChange={(v) => taskForm.setValue('dueDate', v)}
            />
          </PropertyRow>
        </>
      );
    }

    if (activeType === 'bug') {
      const statusVal: string = bugForm.watch('status') ?? 'todo';
      const severityVal: string = bugForm.watch('severity') ?? 'medium';
      const assigneeVal: string = bugForm.watch('assigneeId');
      const projectVal: string = bugForm.watch('projectId') || projectId || '';
      const dueVal: string = bugForm.watch('dueDate');
      const labelsVal: string[] = bugForm.watch('labels') ?? [];
      const statusOpt = TASK_STATUS_OPTIONS.find((s) => s.value === statusVal);
      const StatusIcon = statusOpt?.icon ?? Circle;
      const memberOptions = members.map((m) => ({ value: m.id, label: m.displayName }));
      const projectOptions = projectList.map((p) => ({ value: p.id, label: p.name }));
      return (
        <>
          <PropertyRow icon={<StatusIcon className="size-3.5" style={{ color: statusOpt?.color }} />} label="Status">
            <CapsuleSelect
              value={statusVal}
              options={TASK_STATUS_OPTIONS.map((s) => ({
                value: s.value,
                label: s.label,
                icon: <s.icon className="size-3.5" style={{ color: s.color }} />,
              }))}
              onChange={(v) => bugForm.setValue('status', v || 'todo')}
              active
            />
          </PropertyRow>
          <PropertyRow icon={<AlertCircle className="size-3.5" />} label="Severity">
            <CapsuleSelect
              value={severityVal}
              options={SEVERITY_OPTIONS.map((s) => ({
                value: s.value,
                label: s.label,
                icon: <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: s.color }} />,
              }))}
              onChange={(v) => bugForm.setValue('severity', (v || 'medium') as BugSeverity)}
              active={!!severityVal}
            />
          </PropertyRow>
          <PropertyRow icon={<User className="size-3.5" />} label="Assignee">
            <CapsuleSelect
              value={assigneeVal ?? ''}
              options={memberOptions}
              onChange={(v) => bugForm.setValue('assigneeId', v)}
              active={!!assigneeVal}
              placeholder="Unassigned"
            />
          </PropertyRow>
          <PropertyRow icon={<Flag className="size-3.5" />} label="Project">
            <CapsuleSelect
              value={projectVal}
              options={projectOptions}
              onChange={(v) => bugForm.setValue('projectId', v)}
              active={!!projectVal}
              placeholder="Inbox"
            />
          </PropertyRow>
          <PropertyRow icon={<Tag className="size-3.5" />} label="Labels">
            <CapsuleSelect
              value=""
              options={[]}
              onChange={() => {}}
              active={labelsVal.length > 0}
              placeholder={labelsVal.length > 0 ? `${labelsVal[0]}${labelsVal.length > 1 ? ` +${labelsVal.length - 1}` : ''}` : 'None'}
            />
          </PropertyRow>
          <PropertyRow icon={<CalendarIcon className="size-3.5" />} label="Due date">
            <DateCapsuleField value={dueVal} onChange={(v) => bugForm.setValue('dueDate', v)} />
          </PropertyRow>
        </>
      );
    }

    if (activeType === 'doc') {
      const projectVal = docForm.watch('projectId') || projectId || '';
      const projectOptions = projectList.map((p) => ({ value: p.id, label: p.name }));
      return (
        <>
          <PropertyRow icon={<User className="size-3.5" />} label="Author">
            <Capsule>Me</Capsule>
          </PropertyRow>
          <PropertyRow icon={<Flag className="size-3.5" />} label="Project">
            <CapsuleSelect
              value={projectVal}
              options={projectOptions}
              onChange={(v) => docForm.setValue('projectId', v)}
              active={!!projectVal}
              placeholder="Inbox"
            />
          </PropertyRow>
          <PropertyRow icon={<Tag className="size-3.5" />} label="Labels">
            <CapsuleSelect value="" options={[]} onChange={() => {}} placeholder="None" />
          </PropertyRow>
        </>
      );
    }

    if (activeType === 'project') {
      const priorityVal = projectForm.watch('priority') ?? 'medium';
      return (
        <>
          <PropertyRow icon={<User className="size-3.5" />} label="Lead">
            <Capsule>Unassigned</Capsule>
          </PropertyRow>
          <PropertyRow icon={<Flag className="size-3.5" />} label="Priority">
            <CapsuleSelect
              value={priorityVal}
              options={[
                { value: 'critical', label: 'Critical' },
                { value: 'high', label: 'High' },
                { value: 'medium', label: 'Medium' },
                { value: 'low', label: 'Low' },
              ]}
              onChange={(v) => projectForm.setValue('priority', v as ProjectPriority)}
              active
            />
          </PropertyRow>
          <PropertyRow icon={<CalendarIcon className="size-3.5" />} label="Target">
            <Capsule>None</Capsule>
          </PropertyRow>
        </>
      );
    }

    // milestone
    const milestoneProjectOptions = projectList.map((p) => ({ value: p.id, label: p.name }));
    return (
      <>
        <PropertyRow icon={<Flag className="size-3.5" />} label="Project">
          <CapsuleSelect
            value={currentProjectId}
            options={milestoneProjectOptions}
            onChange={(v) => {
              milestoneForm.setValue('projectId', v);
            }}
            active={!!currentProjectId}
            placeholder="Select project"
          />
        </PropertyRow>
        <PropertyRow icon={<CalendarIcon className="size-3.5" />} label="Target date">
          <Capsule>None</Capsule>
        </PropertyRow>
      </>
    );
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'overflow-hidden p-0 gap-0 border border-border/60 bg-card',
          widthClass,
        )}
        keepDefaultWidth={false}
        showCloseButton={false}
        style={{
          maxHeight: 'calc(100vh - 48px)',
        }}
      >
        <DialogTitle className="sr-only">{currentMeta.label} creation dialog</DialogTitle>
        <DialogDescription className="sr-only">{currentMeta.descriptionHint}</DialogDescription>

        {/* ──────────── Header ──────────── */}
        <div className="flex items-center justify-between px-4 h-12 shrink-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="px-1 rounded-sm hover:bg-accent hover:text-foreground transition-colors cursor-pointer">
              AgentPM
            </span>
            <ChevronRight className="size-3 opacity-40" />
            <TypeSelector activeType={activeType} onChange={setActiveType} />
          </div>
          <div className="flex items-center gap-0.5">
            <IconBtn
              active={showProps}
              onClick={() => setShowProps((v) => !v)}
              title={showProps ? '隐藏属性面板' : '显示属性面板'}
            >
              {showProps ? <PanelRightClose className="size-3.5" /> : <PanelRight className="size-3.5" />}
            </IconBtn>
            <IconBtn
              active={maximized}
              onClick={() => setMaximized((v) => !v)}
              title={maximized ? '还原' : '展开'}
            >
              {maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </IconBtn>
            <IconBtn onClick={handleClose} title="关闭">
              <X className="size-3.5" />
            </IconBtn>
          </div>
        </div>

        {/* ──────────── Body ──────────── */}
        <div className="flex overflow-hidden flex-1 min-h-0" style={{ minHeight: 320 }}>
          {/* ── Main ── */}
          <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">
            <div className="p-4 pb-2 flex flex-col gap-3 flex-1 min-h-0">
              {error && (
                <div role="alert" className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                  <AlertCircle className="size-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Title */}
              <TitleField
                activeType={activeType}
                taskForm={taskForm}
                bugForm={bugForm}
                docForm={docForm}
                projectForm={projectForm}
                milestoneForm={milestoneForm}
                currentMeta={currentMeta}
              />

              {/* Description */}
              <DescriptionField
                activeType={activeType}
                taskForm={taskForm}
                bugForm={bugForm}
                docForm={docForm}
                projectForm={projectForm}
                milestoneForm={milestoneForm}
                currentMeta={currentMeta}
              />

              {/* Extra fields: doc type / project template / project identifier hint */}
              <ExtraFields
                activeType={activeType}
                projectForm={projectForm}
                docForm={docForm}
              />
            </div>

            {/* Sub-task block (matches reference: collapsible card at bottom of main) */}
            {(activeType === 'task') && (
              <SubTaskCard
                open={subOpen}
                onOpen={() => setSubOpen(true)}
                onClose={() => { setSubOpen(false); setSubTitle(''); setSubDesc(''); }}
                title={subTitle}
                desc={subDesc}
                onTitleChange={setSubTitle}
                onDescChange={setSubDesc}
              />
            )}
          </div>

          {/* ── Properties panel ── */}
          {showProps && (
            <aside className="w-52.5 shrink-0 px-3 pb-3 pt-1 overflow-y-auto bg-transparent">
              <PropsCard
                title="Properties"
                collapsed={propsCollapsed}
                onToggleCollapse={() => setPropsCollapsed((v) => !v)}
              >
                {renderPropertiesContent()}
              </PropsCard>

              <div className="mt-3">
                <SuggestionsCard
                  collapsed={suggestionsCollapsed}
                  onToggle={() => setSuggestionsCollapsed((v) => !v)}
                />
              </div>
            </aside>
          )}
        </div>

        {/* ──────────── Footer ──────────── */}
        <div className="flex items-center gap-3 px-4 h-14 shrink-0">
          <button
            type="button"
            className="size-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="添加附件"
          >
            <Paperclip className="size-3.5" />
          </button>
          <div className="flex-1" />
          <button
            type="button"
            onClick={() => setCreateMore((v) => !v)}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">Create more</span>
            <Switch checked={createMore} onCheckedChange={setCreateMore} />
          </button>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || !currentTitle.trim()}
            className="text-white"
            style={{ backgroundColor: currentTitle.trim() ? currentMeta.color : undefined }}
          >
            {isSubmitting ? (
              <>
                <Spinner className="size-3 text-inherit" />
                创建中…
              </>
            ) : (
              <>
                <Plus className="size-3" />
                {currentMeta.createLabel}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function IconBtn({
  active,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        'size-7 inline-flex items-center justify-center rounded-md text-muted-foreground transition-colors',
        'hover:bg-accent hover:text-foreground',
        active && 'bg-accent text-foreground',
      )}
      {...props}
    >
      {children}
    </button>
  );
}

function Switch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <span
      role="switch"
      aria-checked={checked}
      tabIndex={0}
      onClick={() => onCheckedChange(!checked)}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onCheckedChange(!checked);
        }
      }}
      className={cn(
        'relative inline-flex items-center w-8 h-4.5 rounded-full border cursor-pointer transition-colors',
        checked ? 'bg-primary border-primary' : 'border-border bg-transparent',
      )}
    >
      <span
        className={cn(
          'absolute top-0.5 size-3 rounded-full bg-white transition-all shadow',
          checked ? 'left-4' : 'left-1',
          !checked && 'bg-muted-foreground/70',
        )}
      />
    </span>
  );
}

function TypeSelector({ activeType, onChange }: { activeType: CreateType; onChange: (t: CreateType) => void }) {
  const meta = TYPE_META[activeType];
  const Icon = meta.Icon;
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button className="inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" />
        }
      >
        <Icon className="size-3.5" style={{ color: meta.color }} />
        <span>{meta.label}</span>
        <ChevronDown className="size-3 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-44">
        <div className="flex flex-col gap-0.5">
          {TYPE_ORDER.map((t, i) => {
            const M = TYPE_META[t];
            const I = M.Icon;
            return (
              <button
                key={t}
                type="button"
                onClick={() => onChange(t)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left',
                  activeType === t ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                <I className="size-3.5" style={{ color: M.color }} />
                <span className="font-medium flex-1">{M.label}</span>
                {activeType === t && <Check className="size-3 text-primary" />}
                <span className="text-10 text-muted-foreground">{i + 1}</span>
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TitleField(props: {
  activeType: CreateType;
  taskForm: any;
  bugForm: any;
  docForm: any;
  projectForm: any;
  milestoneForm: any;
  currentMeta: TypeMeta;
}) {
  const cls = 'w-full text-2xl font-semibold placeholder:text-muted-foreground/50 resize-none leading-tight focus-visible:ring-0';
  switch (props.activeType) {
    case 'task': return <AutoSizeTextarea autoFocus rows={1} placeholder={props.currentMeta.placeholder} className={cls} {...props.taskForm.register('title')} />;
    case 'bug': return <AutoSizeTextarea autoFocus rows={1} placeholder={props.currentMeta.placeholder} className={cls} {...props.bugForm.register('title')} />;
    case 'doc': return <AutoSizeTextarea autoFocus rows={1} placeholder={props.currentMeta.placeholder} className={cls} {...props.docForm.register('title')} />;
    case 'project': return <AutoSizeTextarea autoFocus rows={1} placeholder={props.currentMeta.placeholder} className={cls} {...props.projectForm.register('name')} />;
    case 'milestone': return <AutoSizeTextarea autoFocus rows={1} placeholder={props.currentMeta.placeholder} className={cls} {...props.milestoneForm.register('name')} />;
  }
}

function DescriptionField(props: {
  activeType: CreateType;
  taskForm: any;
  bugForm: any;
  docForm: any;
  projectForm: any;
  milestoneForm: any;
  currentMeta: TypeMeta;
}) {
  const cls = 'w-full text-xs font-normal leading-relaxed text-foreground/80 placeholder:text-muted-foreground/50 focus-visible:ring-0';
  const ph = props.currentMeta.descriptionHint;
  const taCls = cn(cls, 'flex-1 min-h-30 resize-none');
  let textarea: React.ReactNode;
  switch (props.activeType) {
    case 'task': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.taskForm.register('description')} />; break;
    case 'bug': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.bugForm.register('description')} />; break;
    case 'doc': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.docForm.register('description')} />; break;
    case 'project': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.projectForm.register('description')} />; break;
    case 'milestone': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.milestoneForm.register('description')} />; break;
    default: textarea = null;
  }
  return <div className="flex-1 min-h-30 flex flex-col">{textarea}</div>;
}

function ExtraFields({ activeType, projectForm, docForm }: { activeType: CreateType; projectForm: any; docForm: any }) {
  if (activeType === 'project') {
    const name: string = projectForm.watch('name') ?? '';
    const key = name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
    const template = projectForm.watch('template');
    return (
      <div className="flex flex-col gap-3 pt-1">
        {key && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="font-mono text-muted-foreground/80">#</span>
            Identifier: <code className="font-mono text-foreground/80">{key}-1, {key}-2…</code>
          </p>
        )}
        <div>
          <p className="text-10 font-semibold uppercase tracking-wider text-muted-foreground mb-2">Template</p>
          <div className="flex flex-wrap gap-1.5">
            {PROJECT_TEMPLATES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => projectForm.setValue('template', t.value)}
                className={cn(
                  'h-7 px-2.5 rounded-full text-xs border transition-colors',
                  template === t.value
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (activeType === 'doc') {
    const t = docForm.watch('type');
    return (
      <div className="flex flex-col gap-3 pt-1">
        <div>
          <p className="text-10 font-semibold uppercase tracking-wider text-muted-foreground mb-2">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {DOC_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => docForm.setValue('type', opt.value)}
                className={cn(
                  'h-7 px-2.5 rounded-full text-xs border transition-colors',
                  t === opt.value
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

function SuggestionsCard({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const items = [
    { label: 'High priority', icon: AlertCircle, color: 'text-orange-500' },
    { label: 'Tag: frontend', icon: Tag, color: 'text-blue-500' },
    { label: 'Assign me', icon: User, color: 'text-violet-500' },
    { label: 'Today', icon: CalendarIcon, color: 'text-emerald-500' },
  ];
  return (
    <div className={cn(
      'rounded-xl border border-border bg-card overflow-hidden transition-all',
      collapsed && 'rounded-full',
    )}>
      <div className={cn(
        'flex items-center gap-1.5 px-3 py-2 bg-muted/30',
        collapsed && 'border-b-0',
      )}>
        <Sparkles className="size-3 text-accent-purple" />
        <span className="text-10 font-semibold uppercase tracking-wider text-muted-foreground">Suggestions</span>
        <button
          type="button"
          onClick={onToggle}
          className="ml-auto size-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
        >
          {collapsed ? <ChevronDown className="size-3" /> : <ChevronUp className="size-3" />}
        </button>
      </div>
      {!collapsed && (
        <div className="p-1.5 flex flex-col gap-0.5">
          {items.map((it) => {
            const Icon = it.icon;
            return (
              <button
                key={it.label}
                type="button"
                className="flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Icon className={cn('size-3.5', it.color)} />
                <span className="flex-1 text-left">{it.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SubTaskCard({
  open,
  onOpen,
  onClose,
  title,
  desc,
  onTitleChange,
  onDescChange,
}: {
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  title: string;
  desc: string;
  onTitleChange: (v: string) => void;
  onDescChange: (v: string) => void;
}) {
  if (!open) {
    return (
      <div className="mt-auto px-4 py-3 border-t border-border/40 bg-card/80 backdrop-blur-sm">
        <button
          type="button"
          onClick={onOpen}
          className="flex items-center gap-1.5 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors w-full px-1 py-1"
        >
          <Plus className="size-3.5" />
          <span>Add sub-task</span>
        </button>
      </div>
    );
  }
  return (
    <div className="mt-auto px-4 py-3 border-t border-border/40 bg-card/80 backdrop-blur-sm">
      <div className="rounded-xl border border-border bg-muted/20 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-border/40 bg-muted/30">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ListTodo className="size-3.5" />
            <span>Sub-task</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="size-5 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            title="关闭"
          >
            <X className="size-3" />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-2">
          <AutoSizeTextarea
            autoFocus
            rows={1}
            placeholder="Sub-task title"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            className="w-full text-sm font-semibold placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
          <AutoSizeTextarea
            rows={1}
            placeholder="Add description…"
            value={desc}
            onChange={(e) => onDescChange(e.target.value)}
            className="w-full text-xs font-normal placeholder:text-muted-foreground/50 focus-visible:ring-0"
          />
        </div>
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          <SmallCaps icon={Circle} label="Todo" />
          <SmallCaps icon={User} label="Assignee" />
          <SmallCaps icon={AlertCircle} label="Priority" />
        </div>
      </div>
    </div>
  );
}

function SmallCaps({ icon: Icon, label }: { icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>; label: string }) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 h-5.5 px-2 rounded-full border border-border bg-transparent text-11 text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
    >
      <Icon className="size-3" />
      <span>{label}</span>
    </button>
  );
}




