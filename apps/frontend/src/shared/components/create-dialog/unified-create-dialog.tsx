/**
 * UnifiedCreateDialog - 统一创建对话框（CAP-A-18）
 *
 * 位置演进：原 components/ui/unified-create-dialog（2026-09-15 迁出 ui 原子层——
 * 本组件是跨模块业务复合件，反向依赖 issue/project/document/assistant 等模块 hooks，
 * 违反「components/ui 只放 UI 原子」的放置规范；grill 引用为 shared→module 既有惯例方向，
 * 保留一条并在此注明）。
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
 * 胶囊 (Capsule) 等原子一律取自 components/ui/property-panel（单一来源，
 * 与详情页属性面板共版，禁止在本文件重写原子）；AI 建议卡为业务组件见 ./suggestions-card。
 */
import * as React from 'react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { GrillInterview } from '@/modules/project/components/grill/grill-interview';
import { buildGrillMinutes } from '@/modules/project/components/grill/grill-minutes';
import type { GrillSummary } from '@/modules/assistant/hooks/use-grill';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Capsule,
  CapsuleSelect,
  AutoSizeTextarea,
  PropertyRow,
  PropsCard,
  SubTaskCard,
  DateCapsuleField,
  PropertyPanelIcons,
} from '@/components/ui/property-panel';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useCreateProject } from '@/modules/project/hooks/use-project-mutations';
import { useProjectModules } from '@/modules/project/hooks/use-project-modules';
import { useCreateTask } from '@/modules/issue/hooks/use-project-tasks';
import { useCreateProjectMilestone } from '@/modules/project/hooks/use-project-dashboard-summary';
import { useCreateDocument } from '@/modules/document/hooks/use-document-mutations';
import { listProjectMembers } from '@/modules/team-member/api/team-member-api';
import type { Member } from '@/modules/team-member/types';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/toast';
import { useAppStore } from '@/infrastructure/store/app-store';
import { EntityIcon, type EntityKind } from '@/shared/entity-icons/entity-icons';
import {
  TASK_STATUS_VISUALS,
  PRIORITY_VISUALS,
  TONE_TEXT_CLASS,
} from '@/shared/status/status-visuals';
import {
  useSilentCreateSuggestions,
  parseCreateSuggestions,
  type CreateSuggestion,
} from '@/modules/assistant/hooks/use-silent-ai';
import type { BugSeverity, TaskPriority } from '@/modules/issue/api/issue-api';
import type {
  CreateProjectRequest,
  CreateMilestoneRequest,
  ProjectPriority,
  ProjectType,
  ProjectVisibility,
} from '@/modules/project/api/project-api';
import type { DocumentCategory as DocCategory } from '@/modules/document/api/document-api';
import {
  X,
  Plus,
  Calendar as CalendarIcon,
  Check,
  ChevronDown,
  ChevronRight,
  Flag,
  User,
  PanelRightClose,
  PanelRight,
  Maximize2,
  Minimize2,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SuggestionsCard } from './suggestions-card';

// ============================================================================
// Types
// ============================================================================

export type CreateType = 'task' | 'bug' | 'doc' | 'project' | 'milestone' | 'ai';

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

const TYPE_ORDER: CreateType[] = ['task', 'bug', 'doc', 'project', 'milestone', 'ai'];

interface TypeMeta {
  label: string;
  shortcut: string;
  /** 实体类型走 entity-icons 注册表（图标+tone 语义色，禁本地枚举/原始色）；null = 非实体（ai→Sparkles） */
  kind: EntityKind | null;
  placeholder: string;
  descriptionHint: string;
  createLabel: string;
}

const TYPE_META: Record<CreateType, TypeMeta> = {
  task: {
    label: 'Task',
    shortcut: '1',
    kind: 'issue',
    placeholder: 'Task title',
    descriptionHint: 'Add a description…',
    createLabel: 'Create task',
  },
  bug: {
    label: 'Bug',
    shortcut: '2',
    kind: 'bug',
    placeholder: 'Bug title',
    descriptionHint: 'Steps to reproduce, expected vs actual…',
    createLabel: 'Report bug',
  },
  doc: {
    label: 'Document',
    shortcut: '3',
    kind: 'document',
    placeholder: 'Document title',
    descriptionHint: 'Add a summary or initial content…',
    createLabel: 'Create document',
  },
  project: {
    label: 'Project',
    shortcut: '4',
    kind: 'project',
    placeholder: 'Project name',
    descriptionHint: 'Goals, scope and success criteria…',
    createLabel: 'Create project',
  },
  milestone: {
    label: 'Milestone',
    shortcut: '5',
    kind: 'milestone',
    placeholder: 'Milestone name',
    descriptionHint: 'Key deliverables…',
    createLabel: 'Create milestone',
  },
  ai: {
    label: 'AI 助手',
    shortcut: '6',
    kind: null,
    placeholder: '描述要创建的内容',
    descriptionHint: '用自然语言描述，小周帮你创建',
    createLabel: '让小周创建',
  },
};

/** Bug 严重度 S0–S3（status-visuals 无 severity 映射，本地维护；色用 accent token 禁原始 hex） */
const SEVERITY_OPTIONS: { value: BugSeverity; label: string; dotClass: string }[] = [
  { value: 'critical', label: 'S0 致命', dotClass: 'bg-accent-red' },
  { value: 'high', label: 'S1 严重', dotClass: 'bg-accent-orange' },
  { value: 'medium', label: 'S2 一般', dotClass: 'bg-accent-yellow' },
  { value: 'low', label: 'S3 轻微', dotClass: 'bg-accent-green' },
];

/** 文档类目 chips = 后端 DocumentCategory 真实枚举（原 spec/meeting_notes 等假值已废） */
const DOC_CATEGORY_OPTIONS: { value: DocCategory; label: string }[] = [
  { value: 'requirement', label: '需求' },
  { value: 'analysis', label: '分析' },
  { value: 'design', label: '设计' },
  { value: 'api', label: 'API' },
  { value: 'testing', label: '测试' },
  { value: 'guide', label: '指南' },
];

/** 优先级选项展示序（取 PRIORITY_VISUALS 四档；urgent 为项目侧叫法不入创建面板） */
const PRIORITY_ORDER: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

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
  priority: TaskPriority;
  projectId: string;
  assigneeId: string;
  dueDate: string;
  /** 无手动入口，仅 AI 建议（create-suggestions）回填 */
  labels: string[];
}

interface DocFormValues {
  title: string;
  description: string;
  category: DocCategory;
  projectId: string;
  /** 无手动入口，仅 AI 建议（create-suggestions）回填 */
  labels: string[];
}

interface ProjectFormValues {
  name: string;
  description: string;
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
  title: '', description: '', status: 'todo', severity: 'medium', priority: 'high',
  projectId: '', assigneeId: '', dueDate: '', labels: [],
};
const DEFAULT_DOC: DocFormValues = {
  title: '', description: '', category: 'custom', projectId: '', labels: [],
};
const DEFAULT_PROJECT: ProjectFormValues = {
  name: '', description: '', visibility: 'internal', priority: 'medium',
};
const DEFAULT_MILESTONE: MilestoneFormValues = {
  name: '', description: '', projectId: '', status: 'planned', dueDate: '',
};

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

  // AI 创建：自然语言描述 → 转给小助理对话
  const [aiPrompt, setAiPrompt] = useState('');
  const openAssistantWithDraft = useAppStore((s) => s.openAssistantWithDraft);

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

  // 里程碑创建绑定表单所选项目（原绑死 projectId prop——Dock 全局入口无 prop 时提交必炸）
  const milestoneProjectId = milestoneForm.watch('projectId') || projectId || '';
  const createMilestone = useCreateProjectMilestone(milestoneProjectId || undefined);
  const createDocument = useCreateDocument();

  const { t } = useTranslation();
  // 状态/优先级选项派生自 status-visuals 注册表（批2：禁本地枚举与原始色，label 走 i18n）
  const statusOptions = useMemo(() => Object.entries(TASK_STATUS_VISUALS).map(([value, v]) => ({
    value,
    label: t(v.labelKey),
    icon: v.icon,
    toneClass: TONE_TEXT_CLASS[v.tone],
    spin: value === 'in_progress',
  })), [t]);
  const priorityOptions = useMemo(() => PRIORITY_ORDER.map((value) => {
    const v = PRIORITY_VISUALS[value];
    return { value, label: t(v.labelKey), icon: v.icon, toneClass: TONE_TEXT_CLASS[v.tone] };
  }), [t]);

  // 项目来源分流（v2 纪要切片 1）：导入已有项目 → 创建后进档案页接入向导考古
  // CAP-P-01：ai = AI 代理模式，grill 连续追问澄清需求后确认创建
  const navigate = useNavigate();
  const [projectSource, setProjectSource] = useState<'scratch' | 'existing' | 'ai'>('scratch');

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
  // loading 值当前无消费方，仅 setter 用于触发刷新重渲染
  const [, setMembersLoading] = useState(false);
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
    setAiPrompt('');
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
        ? [{ id: `local-${Date.now()}`, content: subTitle.trim(), completed: false, order: 0 }]
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
        priority: values.priority,
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
        category: values.category,
        projectId: values.projectId || projectId || undefined,
        tags: values.labels,
      });
      if (resp?.id) handleSuccess('doc', resp.id);
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
      if (resp?.id) {
        handleSuccess('project', resp.id);
        // 统一进项目初始化页：绑定工作区目录 + 种生契约三件套 + 下一步引导
        // （导入已有项目的接入向导入口保留在 init 页引导卡）
        navigate(`/app/projects/${resp.id}/init`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  /** CAP-P-01 AI 代理模式：grill 摘要确认后直接创建——落需求澄清纪要文档 + 跳 init 自动挂载 */
  const submitProjectFromGrill = async (summary: GrillSummary) => {
    setError(null);
    try {
      const payload: CreateProjectRequest = {
        name: summary.name.trim(),
        description: summary.description.trim() || undefined,
        type: 'team' as ProjectType,
        visibility: projectForm.getValues().visibility ?? 'private',
        priority: projectForm.getValues().priority ?? 'medium',
      };
      const resp = await createProject.mutateAsync(payload);
      if (resp?.id) {
        // grill 产出持久化：需求澄清纪要文档（失败不阻断建项）
        try {
          await createDocument.mutateAsync({
            title: `需求澄清纪要 · ${summary.name.trim()}`,
            summary: summary.description.trim() || 'AI 需求拷问产出的澄清纪要',
            content: buildGrillMinutes(summary),
            category: 'requirement' as DocCategory,
            projectId: resp.id,
          });
        } catch { /* 纪要落库失败不阻断建项 */ }
        handleSuccess('project', resp.id);
        navigate(`/app/projects/${resp.id}/init?grilled=1`, {
          state: { grillSummary: summary },
        });
      }
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

  /** AI 创建：把描述预填进小助理输入框，由用户确认发送（工具执行后实体卡回显） */
  const submitViaAssistant = () => {
    const text = aiPrompt.trim();
    if (!text) { setError('请描述要创建的内容'); return; }
    setError(null);
    openAssistantWithDraft(`请帮我创建：${text}`);
    handleClose();
    toast.success('已转给小周，在右下角对话里发送即可');
  };

  // ── 静默 AI 建议卡（创建面板场景 create-suggestions）──
  const silentSuggestions = useSilentCreateSuggestions();

  const fetchSuggestions = async (): Promise<CreateSuggestion[]> => {
    const type = activeType === 'ai' ? 'task' : activeType;
    const fields =
      type === 'task' ? taskForm.getValues()
      : type === 'bug' ? bugForm.getValues()
      : type === 'doc' ? docForm.getValues()
      : type === 'project' ? projectForm.getValues()
      : milestoneForm.getValues();
    const res = await silentSuggestions.mutateAsync({
      type,
      fields: fields as unknown as Record<string, unknown>,
      projectId: activeProjectId || undefined,
    });
    const parsed = parseCreateSuggestions(res.data);
    if (parsed.length === 0) throw new Error('AI 没有给出可用建议');
    return parsed;
  };

  const applySuggestion = (s: CreateSuggestion) => {
    const v = s.value.trim();
    if (!v) return;
    switch (s.field) {
      case 'priority':
        if (activeType === 'task') taskForm.setValue('priority', v as TaskPriority, { shouldValidate: true });
        else if (activeType === 'project') projectForm.setValue('priority', v as ProjectPriority, { shouldValidate: true });
        break;
      case 'labels': {
        const labels = v.split(/[,，、]/).map((x) => x.trim()).filter(Boolean);
        if (activeType === 'task') taskForm.setValue('labels', labels);
        else if (activeType === 'bug') bugForm.setValue('labels', labels);
        else if (activeType === 'doc') docForm.setValue('labels', labels);
        break;
      }
      case 'dueDate':
        if (activeType === 'task') taskForm.setValue('dueDate', v);
        else if (activeType === 'bug') bugForm.setValue('dueDate', v);
        else if (activeType === 'milestone') milestoneForm.setValue('dueDate', v);
        break;
      case 'title':
      case 'name': {
        if (activeType === 'project') {
          if (!projectForm.getValues().name) projectForm.setValue('name', v);
        } else if (activeType === 'milestone') {
          if (!milestoneForm.getValues().name) milestoneForm.setValue('name', v);
        } else if (activeType === 'doc') {
          if (!docForm.getValues().title) docForm.setValue('title', v);
        } else {
          if (!taskForm.getValues().title) taskForm.setValue('title', v);
          if (!bugForm.getValues().title) bugForm.setValue('title', v);
        }
        break;
      }
      default:
        break;
    }
  };

  const handleSubmit = () => {
    switch (activeType) {
      case 'task': return submitTask();
      case 'bug': return submitBug();
      case 'doc': return submitDoc();
      case 'project':
        // AI 代理模式：提交由 grill 摘要确认卡驱动，不走手动表单
        if (projectSource === 'ai') return;
        return submitProject();
      case 'milestone': return submitMilestone();
      case 'ai': return submitViaAssistant();
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

  // ── Width classes for dialog
  const widthClass = maximized
    ? (showProps ? 'w-[min(96vw,1000px)]' : 'w-[min(96vw,780px)]')
    : (showProps ? 'w-[min(96vw,720px)]' : 'w-[min(96vw,520px)]');

  // ── Render helpers ───────────────────────────────────────

  const currentProjectId = activeProjectId;

  // ── Property panel content per activeType ──────────────

  const renderPropertiesContent = () => {
    if (activeType === 'task') {
      const statusVal: string = taskForm.watch('status') ?? 'todo';
      const priorityVal = taskForm.watch('priority');
      const assigneeVal: string = taskForm.watch('assigneeId');
      const projectVal: string = taskForm.watch('projectId') || projectId || '';
      const dueVal: string = taskForm.watch('dueDate');
      const statusOpt = statusOptions.find((s) => s.value === statusVal);
      const StatusIcon = statusOpt?.icon ?? PropertyPanelIcons.Circle;
      const memberOptions = members.map((m) => ({ value: m.id, label: m.displayName }));
      const projectOptions = projectList.map((p) => ({ value: p.id, label: p.name }));
      return (
        <>
          <PropertyRow icon={<StatusIcon className={cn('size-3.5', statusOpt?.toneClass, statusOpt?.spin && 'animate-spin')} />} label="Status">
            <CapsuleSelect
              value={statusVal}
              options={statusOptions.map((s) => ({
                value: s.value,
                label: s.label,
                icon: <s.icon className={cn('size-3.5', s.toneClass, s.spin && 'animate-spin')} />,
              }))}
              onChange={(v) => taskForm.setValue('status', v || 'todo')}
              active
            />
          </PropertyRow>
          <PropertyRow icon={<AlertCircle className="size-3.5" />} label="Priority">
            <CapsuleSelect
              value={priorityVal ?? ''}
              options={priorityOptions.map((p) => ({
                value: p.value,
                label: p.label,
                icon: <p.icon className={cn('size-3.5', p.toneClass)} />,
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
              placeholder="No Project"
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
      const priorityVal = bugForm.watch('priority');
      const assigneeVal: string = bugForm.watch('assigneeId');
      const projectVal: string = bugForm.watch('projectId') || projectId || '';
      const dueVal: string = bugForm.watch('dueDate');
      const statusOpt = statusOptions.find((s) => s.value === statusVal);
      const StatusIcon = statusOpt?.icon ?? PropertyPanelIcons.Circle;
      const memberOptions = members.map((m) => ({ value: m.id, label: m.displayName }));
      const projectOptions = projectList.map((p) => ({ value: p.id, label: p.name }));
      return (
        <>
          <PropertyRow icon={<StatusIcon className={cn('size-3.5', statusOpt?.toneClass, statusOpt?.spin && 'animate-spin')} />} label="Status">
            <CapsuleSelect
              value={statusVal}
              options={statusOptions.map((s) => ({
                value: s.value,
                label: s.label,
                icon: <s.icon className={cn('size-3.5', s.toneClass, s.spin && 'animate-spin')} />,
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
                icon: <span className={cn('inline-block size-2.5 rounded-full', s.dotClass)} />,
              }))}
              onChange={(v) => bugForm.setValue('severity', (v || 'medium') as BugSeverity)}
              active={!!severityVal}
            />
          </PropertyRow>
          <PropertyRow icon={<AlertCircle className="size-3.5" />} label="Priority">
            <CapsuleSelect
              value={priorityVal ?? ''}
              options={priorityOptions.map((p) => ({
                value: p.value,
                label: p.label,
                icon: <p.icon className={cn('size-3.5', p.toneClass)} />,
              }))}
              onChange={(v) => bugForm.setValue('priority', (v || 'high') as TaskPriority)}
              active={!!priorityVal}
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
              placeholder="No Project"
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
              placeholder="No Project"
            />
          </PropertyRow>
        </>
      );
    }

    if (activeType === 'project') {
      const priorityVal = projectForm.watch('priority') ?? 'medium';
      return (
        <PropertyRow icon={<AlertCircle className="size-3.5" />} label="Priority">
          <CapsuleSelect
            value={priorityVal}
            options={priorityOptions.map((p) => ({
              value: p.value,
              label: p.label,
              icon: <p.icon className={cn('size-3.5', p.toneClass)} />,
            }))}
            onChange={(v) => projectForm.setValue('priority', (v || 'medium') as ProjectPriority)}
            active
          />
        </PropertyRow>
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
          <DateCapsuleField
            value={milestoneForm.watch('dueDate') ?? ''}
            onChange={(v) => milestoneForm.setValue('dueDate', v)}
          />
        </PropertyRow>
      </>
    );
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          'overflow-hidden p-0 gap-0 border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl',
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
        <div className="flex items-center justify-between px-4 h-11 shrink-0 border-b border-border/50 bg-muted/20">
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
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {/* AI 创建：自然语言描述面板（替代标题/描述/属性表单） */}
              {activeType === 'ai' ? (
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-content-bg-secondary/40 px-3 py-2.5 text-xs text-muted-foreground">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-purple" />
                    <span>
                      用一句话描述你想创建的内容，小周会调用系统工具直接建好，
                      并在对话里回显结果卡片。发送前可先确认草稿。
                    </span>
                  </div>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={6}
                    autoFocus
                    placeholder="例如：建一个任务「登录页改版」，本周五截止，优先级高，打上 frontend 标签"
                    className="flex-1 resize-none rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus-visible:ring-0 focus-visible:border-primary/50"
                  />
                </div>
              ) : activeType === 'project' && projectSource === 'ai' ? (
                /* CAP-P-01：AI 代理模式——grill 连续追问澄清需求后确认创建 */
                <GrillInterview
                  onConfirm={submitProjectFromGrill}
                  onFallback={() => setProjectSource('scratch')}
                  confirmPending={createProject.isPending}
                />
              ) : (
                <>
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

              {/* Extra fields: doc category / project source */}
              <ExtraFields
                activeType={activeType}
                docForm={docForm}
                projectSource={projectSource}
                onProjectSourceChange={setProjectSource}
              />
                </>
              )}
            </div>

            {/* Sub-task block (matches reference: collapsible card at bottom of main) */}
            {(activeType === 'task') && (
              <div className="mt-auto">
                <SubTaskCard
                  open={subOpen}
                  onOpen={() => setSubOpen(true)}
                  onClose={() => { setSubOpen(false); setSubTitle(''); setSubDesc(''); }}
                  title={subTitle}
                  desc={subDesc}
                  onTitleChange={setSubTitle}
                  onDescChange={setSubDesc}
                />
              </div>
            )}
          </div>

          {/* ── Properties panel ── */}
          {showProps && activeType !== 'ai' && (
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
                  onFetch={fetchSuggestions}
                  onApply={applySuggestion}
                />
              </div>
            </aside>
          )}
        </div>

        {/* ──────────── Footer ──────────── */}
        <div className="flex items-center gap-3 px-4 h-13 shrink-0 border-t border-border/50 bg-muted/15">
          <div className="flex-1" />
          <div className="flex items-center gap-2 cursor-pointer select-none">
            <span className="text-xs text-muted-foreground hover:text-foreground transition-colors">Create more</span>
            <Switch checked={createMore} onCheckedChange={setCreateMore} />
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          {activeType === 'project' && projectSource === 'ai' ? (
            <span className="text-xs text-muted-foreground">
              在上面的对话里确认摘要后即可创建
            </span>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || (activeType === 'ai' ? !aiPrompt.trim() : !currentTitle.trim())}
            >
              {isSubmitting ? (
                <>
                  <Spinner className="size-3 text-inherit" />
                  创建中…
                </>
              ) : (
                <>
                  {activeType === 'ai' ? <Sparkles className="size-3" /> : <Plus className="size-3" />}
                  {currentMeta.createLabel}
                </>
              )}
            </Button>
          )}
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

function TypeSelector({ activeType, onChange }: { activeType: CreateType; onChange: (t: CreateType) => void }) {
  const meta = TYPE_META[activeType];
  return (
    <Popover>
      <PopoverTrigger
        render={
          <button className="inline-flex items-center gap-1.5 px-1.5 py-1 rounded-md text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors" />
        }
      >
        {meta.kind
          ? <EntityIcon entity={meta.kind} size="sm" />
          : <Sparkles className="size-3.5 text-accent-purple" />}
        <span>{meta.label}</span>
        <ChevronDown className="size-3 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-44">
        <div className="flex flex-col gap-0.5">
          {TYPE_ORDER.map((t, i) => {
            const M = TYPE_META[t];
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
                {M.kind
                  ? <EntityIcon entity={M.kind} size="sm" />
                  : <Sparkles className="size-3.5 text-accent-purple" />}
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
  taskForm: UseFormReturn<TaskFormValues>;
  bugForm: UseFormReturn<BugFormValues>;
  docForm: UseFormReturn<DocFormValues>;
  projectForm: UseFormReturn<ProjectFormValues>;
  milestoneForm: UseFormReturn<MilestoneFormValues>;
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
  taskForm: UseFormReturn<TaskFormValues>;
  bugForm: UseFormReturn<BugFormValues>;
  docForm: UseFormReturn<DocFormValues>;
  projectForm: UseFormReturn<ProjectFormValues>;
  milestoneForm: UseFormReturn<MilestoneFormValues>;
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

function ExtraFields({
  activeType,
  docForm,
  projectSource,
  onProjectSourceChange,
}: {
  activeType: CreateType;
  docForm: UseFormReturn<DocFormValues>;
  projectSource: 'scratch' | 'existing' | 'ai';
  onProjectSourceChange: (v: 'scratch' | 'existing' | 'ai') => void;
}) {
  if (activeType === 'project') {
    const SOURCE_OPTIONS: Array<{ value: 'scratch' | 'existing' | 'ai'; label: string }> = [
      { value: 'scratch', label: '从零开始' },
      { value: 'existing', label: '导入已有项目' },
      { value: 'ai', label: 'AI 代理 · 对话创建' },
    ];
    return (
      <div className="flex flex-col gap-3 pt-1">
        <div>
          <p className="text-10 font-semibold uppercase tracking-wider text-muted-foreground mb-2">项目来源</p>
          <div className="flex flex-wrap gap-1.5">
            {SOURCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => onProjectSourceChange(opt.value)}
                className={cn(
                  'h-7 px-2.5 rounded-full text-xs border transition-colors',
                  projectSource === opt.value
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'border-border bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {projectSource === 'existing' && (
            <p className="mt-1.5 text-11 leading-relaxed text-muted-foreground">
              项目已在进行中？创建后自动进入接入向导：AI 只读扫描仓库，生成项目档案草稿供你校对。
            </p>
          )}
        </div>
      </div>
    );
  }
  if (activeType === 'doc') {
    const category = docForm.watch('category');
    return (
      <div className="flex flex-col gap-3 pt-1">
        <div>
          <p className="text-10 font-semibold uppercase tracking-wider text-muted-foreground mb-2">Type</p>
          <div className="flex flex-wrap gap-1.5">
            {DOC_CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => docForm.setValue('category', opt.value)}
                className={cn(
                  'h-7 px-2.5 rounded-full text-xs border transition-colors',
                  category === opt.value
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
