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
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, type UseFormReturn } from 'react-hook-form';
import { GrillInterview } from '@/modules/project/components/grill/grill-interview';
import { buildGrillMinutes } from '@/modules/project/components/grill/grill-minutes';
import type { GrillSummary } from '@/modules/project/hooks/use-grill';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
  useSilentCreateDraft,
  parseCreateDraft,
  type CreateDraft,
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
  Eye,
  Edit3,
  Paperclip,
} from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { SuggestionsCard } from './suggestions-card';
import { AcceptanceCriteriaField, type CriterionItem } from './acceptance-criteria-field';
import { MarkdownView } from '@/shared/components/markdown-view';
import { AgentPresenceBanner, type DispatchStrategy } from './agent-presence-banner';
import { ModeShuttleButton } from './mode-shuttle-button';
import { PropertyPillsBar } from './property-pills-bar';

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
  /** 实体类型走 entity-icons 注册表（图标+tone 语义色）；文案一律走 unifiedCreate.* i18n */
  kind: EntityKind | null;
}

const TYPE_META: Record<CreateType, TypeMeta> = {
  task: { kind: 'issue' },
  bug: { kind: 'bug' },
  doc: { kind: 'document' },
  project: { kind: 'project' },
  milestone: { kind: 'milestone' },
};

/** Bug 严重度 S0–S3（status-visuals 无 severity 映射，本地维护；色用 accent token 禁原始 hex） */
const SEVERITY_OPTIONS: { value: BugSeverity; dotClass: string }[] = [
  { value: 'critical', dotClass: 'bg-accent-red' },
  { value: 'high', dotClass: 'bg-accent-orange' },
  { value: 'medium', dotClass: 'bg-accent-yellow' },
  { value: 'low', dotClass: 'bg-accent-green' },
];

/** 文档类目 chips = 后端 DocumentCategory 真实枚举（原 spec/meeting_notes 等假值已废；label 走 i18n） */
const DOC_CATEGORY_OPTIONS: { value: DocCategory }[] = [
  { value: 'requirement' },
  { value: 'analysis' },
  { value: 'design' },
  { value: 'api' },
  { value: 'testing' },
  { value: 'guide' },
];

/** 优先级选项展示序（取 PRIORITY_VISUALS 四档；urgent 为项目侧叫法不入创建面板） */
const PRIORITY_ORDER: TaskPriority[] = ['critical', 'high', 'medium', 'low'];

/** 草稿类型 → entity-icons 实体（task/doc 与注册表 kind 名不同） */
const DRAFT_ENTITY_KIND: Record<CreateDraft['type'], EntityKind> = {
  task: 'issue',
  bug: 'bug',
  doc: 'document',
  project: 'project',
  milestone: 'milestone',
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
  const [showProps, setShowProps] = useState(false);
  const [propsCollapsed, setPropsCollapsed] = useState(false);
  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);
  const [maximized, setMaximized] = useState(false);
  const [createMore, setCreateMore] = useState(false);
  // AI 调度策略：immediate | approval | manual_dispatch
  const [dispatchStrategy, setDispatchStrategy] = useState<DispatchStrategy>('immediate');

  // subtask state (single sub-task per creation, matches reference)
  const [subOpen, setSubOpen] = useState(false);
  const [subTitle, setSubTitle] = useState('');
  const [subDesc, setSubDesc] = useState('');

  // 🎯 验收标准列表状态（CAP-B-01/B-02 治理闭环）
  const [criteria, setCriteria] = useState<CriterionItem[]>([]);
  // 放大态：描述 Markdown 预览模式切换
  const [descPreview, setDescPreview] = useState(false);

  // AI 代理：自然语言描述 → create-draft 草稿 → 人确认后落库
  const [aiPrompt, setAiPrompt] = useState('');
  // 顶级双界面（CAP-A-18）：manual=结构化表单 / ai=自然语言草稿，平级切换
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [draft, setDraft] = useState<CreateDraft | null>(null);
  // Esc/关闭时的脏表单保护
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const openAssistantWithDraft = useAppStore((s) => s.openAssistantWithDraft);
  // 连续创建：重置后焦点回归标题输入框
  const mainColRef = useRef<HTMLDivElement>(null);

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
    setDraft(null);
    setError(null);
    setCriteria([]);
    setDescPreview(false);
  }, [taskForm, bugForm, docForm, projectForm, milestoneForm]);

  const handleClose = () => {
    onOpenChange(false);
    setMode('manual');
    setTimeout(reset, 150);
  };

  /** 是否有未提交输入（Esc/关闭守卫用；事件回调内调用，非渲染期） */
  const hasUnsavedInput = () => {
    if (mode === 'ai') return Boolean(aiPrompt.trim() || draft);
    return Boolean(
      taskForm.getValues('title').trim()
      || bugForm.getValues('title').trim()
      || docForm.getValues('title').trim()
      || projectForm.getValues('name').trim()
      || milestoneForm.getValues('name').trim()
      || taskForm.getValues('description').trim()
      || bugForm.getValues('description').trim()
      || docForm.getValues('description').trim()
      || projectForm.getValues('description').trim()
      || milestoneForm.getValues('description').trim()
      || (subOpen && subTitle.trim())
      || criteria.some((c) => c.text.trim().length > 0),
    );
  };

  /** 关闭请求：有未提交输入先弹确认，防误触丢草稿 */
  const requestClose = () => {
    if (hasUnsavedInput()) {
      setConfirmDiscard(true);
      return;
    }
    handleClose();
  };

  const handleSuccess = (type: CreateType, id: string) => {
    onSuccess?.(type, id);
    toast.success(t('unifiedCreate.success', { type: t(`unifiedCreate.labels.${type}`) }));
    if (createMore) {
      reset();
      // 连续创建补完（CAP-A-18 批4）：重置后重套唤起预置、来源状态复位、焦点回归标题
      if (projectId) {
        taskForm.setValue('projectId', projectId);
        bugForm.setValue('projectId', projectId);
        docForm.setValue('projectId', projectId);
        milestoneForm.setValue('projectId', projectId);
      }
      if (defaultAssigneeId) taskForm.setValue('assigneeId', defaultAssigneeId);
      setProjectSource('scratch');
      setCriteria([]);
      setDescPreview(false);
      requestAnimationFrame(() => {
        mainColRef.current?.querySelector('textarea')?.focus();
      });
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
    if (!values.title.trim()) { setError(t('unifiedCreate.error.taskTitle')); return; }
    const pid = values.projectId || projectId;
    const moduleCode = resolveModuleCode(pid);
    setError(null);
    try {
      const criteriaItems = criteria
        .filter((c) => c.text.trim().length > 0)
        .map((c, idx) => ({
          id: c.id,
          content: c.text.trim(),
          completed: c.completed,
          order: idx,
        }));
      const legacySubTask = subOpen && subTitle.trim()
        ? [{ id: `local-${Date.now()}`, content: subTitle.trim(), completed: false, order: criteriaItems.length }]
        : [];
      const combinedTodo = [...criteriaItems, ...legacySubTask];
      const todoItems = combinedTodo.length > 0 ? combinedTodo : undefined;

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
      setError(err instanceof Error ? err.message : t('unifiedCreate.error.createFailed'));
    }
  };

  const submitBug = async () => {
    const values = bugForm.getValues();
    if (!values.title.trim()) { setError(t('unifiedCreate.error.bugTitle')); return; }
    const pid = values.projectId || projectId;
    const moduleCode = resolveModuleCode(pid, 'BUG');
    setError(null);
    try {
      const criteriaItems = criteria
        .filter((c) => c.text.trim().length > 0)
        .map((c, idx) => ({
          id: c.id,
          content: c.text.trim(),
          completed: c.completed,
          order: idx,
        }));
      const todoItems = criteriaItems.length > 0 ? criteriaItems : undefined;

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
        todoItems,
      });
      if (resp?.id) handleSuccess('bug', resp.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unifiedCreate.error.createFailed'));
    }
  };

  const submitDoc = async () => {
    const values = docForm.getValues();
    if (!values.title.trim()) { setError(t('unifiedCreate.error.docTitle')); return; }
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
      setError(err instanceof Error ? err.message : t('unifiedCreate.error.createFailed'));
    }
  };

  const submitProject = async () => {
    const values = projectForm.getValues();
    if (!values.name.trim()) { setError(t('unifiedCreate.error.projectName')); return; }
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
      setError(err instanceof Error ? err.message : t('unifiedCreate.error.createFailed'));
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
      setError(err instanceof Error ? err.message : t('unifiedCreate.error.createFailed'));
    }
  };

  const submitMilestone = async () => {
    const values = milestoneForm.getValues();
    if (!values.name.trim()) { setError(t('unifiedCreate.error.milestoneName')); return; }
    const pid = values.projectId || projectId;
    if (!pid) { setError(t('unifiedCreate.error.projectRequired')); return; }
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
      setError(err instanceof Error ? err.message : t('unifiedCreate.error.createFailed'));
    }
  };

  /** AI 创建兜底：把描述预填进小助理输入框，由用户确认发送（LLM 不可用时的降级路径） */
  const submitViaAssistant = () => {
    const text = aiPrompt.trim();
    if (!text) { setError(t('unifiedCreate.error.prompt')); return; }
    setError(null);
    openAssistantWithDraft(`请帮我创建：${text}`);
    handleClose();
    toast.success(t('unifiedCreate.aiPanel.forwardedToast'));
  };

  // ── AI 代理草稿流（CAP-A-18 双界面）──
  const silentCreateDraft = useSilentCreateDraft();

  const generateDraft = async () => {
    const text = aiPrompt.trim();
    if (!text) { setError(t('unifiedCreate.error.prompt')); return; }
    setError(null);
    setDraft(null);
    try {
      const res = await silentCreateDraft.mutateAsync({
        prompt: text,
        typeHint: activeType,
        projectId: activeProjectId || undefined,
      });
      const parsed = parseCreateDraft(res.data);
      if (!parsed) throw new Error(t('unifiedCreate.error.noDraft'));
      setDraft(parsed);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('unifiedCreate.error.aiFailed'));
    }
  };

  /** 草稿字段回填对应表单（非法枚举值忽略，保持表单缺省） */
  const applyDraftToForm = (d: CreateDraft): void => {
    const f = d.fields;
    const okPriority = f.priority && (PRIORITY_ORDER as string[]).includes(f.priority);
    const okStatus = f.status && Object.prototype.hasOwnProperty.call(TASK_STATUS_VISUALS, f.status);
    const okSeverity = f.severity && ['critical', 'high', 'medium', 'low'].includes(f.severity);
    switch (d.type) {
      case 'task':
        taskForm.setValue('title', f.title);
        if (f.description) taskForm.setValue('description', f.description);
        if (okPriority) taskForm.setValue('priority', f.priority as TaskPriority);
        if (okStatus) taskForm.setValue('status', f.status);
        if (f.dueDate) taskForm.setValue('dueDate', f.dueDate);
        if (f.labels?.length) taskForm.setValue('labels', f.labels);
        break;
      case 'bug':
        bugForm.setValue('title', f.title);
        if (f.description) bugForm.setValue('description', f.description);
        if (okSeverity) bugForm.setValue('severity', f.severity as BugSeverity);
        if (okPriority) bugForm.setValue('priority', f.priority as TaskPriority);
        if (okStatus) bugForm.setValue('status', f.status);
        if (f.dueDate) bugForm.setValue('dueDate', f.dueDate);
        if (f.labels?.length) bugForm.setValue('labels', f.labels);
        break;
      case 'doc':
        docForm.setValue('title', f.title);
        if (f.description) docForm.setValue('description', f.description);
        if (f.category) docForm.setValue('category', f.category as DocCategory);
        break;
      case 'project':
        projectForm.setValue('name', f.title);
        if (f.description) projectForm.setValue('description', f.description);
        break;
      case 'milestone':
        milestoneForm.setValue('name', f.title);
        if (f.description) milestoneForm.setValue('description', f.description);
        if (f.dueDate) milestoneForm.setValue('dueDate', f.dueDate);
        break;
    }
  };

  /** 确认草稿：回填后复用手动提交流（同一校验、同一成功链路） */
  const confirmCreateDraft = () => {
    if (!draft) return;
    applyDraftToForm(draft);
    setActiveType(draft.type);
    setMode('manual');
    switch (draft.type) {
      case 'task': void submitTask(); break;
      case 'bug': void submitBug(); break;
      case 'doc': void submitDoc(); break;
      case 'project': void submitProject(); break;
      case 'milestone': void submitMilestone(); break;
    }
  };

  /** 草稿回填手动表单继续精修（不落库） */
  const editDraftManually = () => {
    if (!draft) return;
    applyDraftToForm(draft);
    setActiveType(draft.type);
    setDraft(null);
    setMode('manual');
  };

  // ── 静默 AI 建议卡（创建面板场景 create-suggestions）──
  const silentSuggestions = useSilentCreateSuggestions();

  const fetchSuggestions = async (): Promise<CreateSuggestion[]> => {
    const type = activeType;
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
    if (parsed.length === 0) throw new Error(t('unifiedCreate.error.suggestionFailed'));
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
    if (mode === 'ai') {
      // AI 代理界面：有草稿 → 确认创建；无草稿 → 生成草稿
      if (draft) { confirmCreateDraft(); return; }
      void generateDraft();
      return;
    }
    switch (activeType) {
      case 'task': return submitTask();
      case 'bug': return submitBug();
      case 'doc': return submitDoc();
      case 'project':
        // AI 代理模式：提交由 grill 摘要确认卡驱动，不走手动表单
        if (projectSource === 'ai') return;
        return submitProject();
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
      if (e.key === 'Escape') { e.preventDefault(); requestClose(); return; }
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
  }, [open, activeType, createMore, mode, draft]);

  // ── Sizing classes: 普通态 720px，放大态适度 1040px × 760px（白名单规范）
  const dialogSizeClass = maximized
    ? 'w-[min(96vw,1040px)] h-[min(84vh,760px)]'
    : (showProps ? 'w-[min(96vw,720px)]' : 'w-[min(96vw,720px)]');

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
          <PropertyRow icon={<StatusIcon className={cn('size-3.5', statusOpt?.toneClass, statusOpt?.spin && 'animate-spin')} />} label={t('unifiedCreate.field.status')}>
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
          <PropertyRow icon={<AlertCircle className="size-3.5" />} label={t('unifiedCreate.field.priority')}>
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
          <PropertyRow icon={<User className="size-3.5" />} label={t('unifiedCreate.field.assignee')}>
            <CapsuleSelect
              value={assigneeVal ?? ''}
              options={memberOptions}
              onChange={(v) => taskForm.setValue('assigneeId', v)}
              active={!!assigneeVal}
              placeholder={t('unifiedCreate.linear.unassigned')}
            />
          </PropertyRow>
          <PropertyRow icon={<Flag className="size-3.5" />} label={t('unifiedCreate.field.project')}>
            <CapsuleSelect
              value={projectVal}
              options={projectOptions}
              onChange={(v) => taskForm.setValue('projectId', v)}
              active={!!projectVal}
              placeholder={t('unifiedCreate.linear.noProject')}
            />
          </PropertyRow>
          <PropertyRow icon={<CalendarIcon className="size-3.5" />} label={t('unifiedCreate.field.dueDate')}>
            <DateCapsuleField
              value={dueVal}
              onChange={(v) => taskForm.setValue('dueDate', v)}
              placeholder={t('unifiedCreate.field.none')}
              clearLabel={t('unifiedCreate.field.clearDueDate')}
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
          <PropertyRow icon={<StatusIcon className={cn('size-3.5', statusOpt?.toneClass, statusOpt?.spin && 'animate-spin')} />} label={t('unifiedCreate.field.status')}>
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
          <PropertyRow icon={<AlertCircle className="size-3.5" />} label={t('unifiedCreate.field.severity')}>
            <CapsuleSelect
              value={severityVal}
              options={SEVERITY_OPTIONS.map((s) => ({
                value: s.value,
                label: t(`unifiedCreate.severity.${s.value}`),
                icon: <span className={cn('inline-block size-2.5 rounded-full', s.dotClass)} />,
              }))}
              onChange={(v) => bugForm.setValue('severity', (v || 'medium') as BugSeverity)}
              active={!!severityVal}
            />
          </PropertyRow>
          <PropertyRow icon={<AlertCircle className="size-3.5" />} label={t('unifiedCreate.field.priority')}>
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
          <PropertyRow icon={<User className="size-3.5" />} label={t('unifiedCreate.field.assignee')}>
            <CapsuleSelect
              value={assigneeVal ?? ''}
              options={memberOptions}
              onChange={(v) => bugForm.setValue('assigneeId', v)}
              active={!!assigneeVal}
              placeholder={t('unifiedCreate.linear.unassigned')}
            />
          </PropertyRow>
          <PropertyRow icon={<Flag className="size-3.5" />} label={t('unifiedCreate.field.project')}>
            <CapsuleSelect
              value={projectVal}
              options={projectOptions}
              onChange={(v) => bugForm.setValue('projectId', v)}
              active={!!projectVal}
              placeholder={t('unifiedCreate.linear.noProject')}
            />
          </PropertyRow>
          <PropertyRow icon={<CalendarIcon className="size-3.5" />} label={t('unifiedCreate.field.dueDate')}>
            <DateCapsuleField value={dueVal} onChange={(v) => bugForm.setValue('dueDate', v)} placeholder={t('unifiedCreate.field.none')} clearLabel={t('unifiedCreate.field.clearDueDate')} />
          </PropertyRow>
        </>
      );
    }

    if (activeType === 'doc') {
      const projectVal = docForm.watch('projectId') || projectId || '';
      const projectOptions = projectList.map((p) => ({ value: p.id, label: p.name }));
      return (
        <>
          <PropertyRow icon={<User className="size-3.5" />} label={t('unifiedCreate.field.author')}>
            <Capsule>{t('unifiedCreate.field.me')}</Capsule>
          </PropertyRow>
          <PropertyRow icon={<Flag className="size-3.5" />} label={t('unifiedCreate.field.project')}>
            <CapsuleSelect
              value={projectVal}
              options={projectOptions}
              onChange={(v) => docForm.setValue('projectId', v)}
              active={!!projectVal}
              placeholder={t('unifiedCreate.linear.noProject')}
            />
          </PropertyRow>
        </>
      );
    }

    if (activeType === 'project') {
      const priorityVal = projectForm.watch('priority') ?? 'medium';
      return (
        <PropertyRow icon={<AlertCircle className="size-3.5" />} label={t('unifiedCreate.field.priority')}>
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
        <PropertyRow icon={<Flag className="size-3.5" />} label={t('unifiedCreate.field.project')}>
          <CapsuleSelect
            value={currentProjectId}
            options={milestoneProjectOptions}
            onChange={(v) => {
              milestoneForm.setValue('projectId', v);
            }}
            active={!!currentProjectId}
            placeholder={t('unifiedCreate.linear.selectProject')}
          />
        </PropertyRow>
        <PropertyRow icon={<CalendarIcon className="size-3.5" />} label={t('unifiedCreate.field.targetDate')}>
          <DateCapsuleField
            value={milestoneForm.watch('dueDate') ?? ''}
            onChange={(v) => milestoneForm.setValue('dueDate', v)}
            placeholder={t('unifiedCreate.field.none')}
            clearLabel={t('unifiedCreate.field.clearDueDate')}
          />
        </PropertyRow>
      </>
    );
  };

  // ── Render ─────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        // base-ui 自身 Esc/遮罩关闭也走脏检查守卫
        if (!o) requestClose();
      }}
    >
      <DialogContent
        className={cn(
          'overflow-hidden p-0 gap-0 border border-border/70 bg-card/95 backdrop-blur-xl shadow-2xl transition-all duration-300',
          dialogSizeClass,
        )}
        keepDefaultWidth={false}
        showCloseButton={false}
        style={maximized ? undefined : { maxHeight: 'calc(100vh - 48px)' }}
      >
        <DialogTitle className="sr-only">
          {mode === 'ai' ? t('unifiedCreate.mode.ai') : t(`unifiedCreate.title.${activeType}`)}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {t(`unifiedCreate.descHint.${activeType}`)}
        </DialogDescription>

        {/* ──────────── Header ──────────── */}
        <div className="flex items-center justify-between px-4 h-11 shrink-0 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-1 text-xs text-muted-foreground min-w-0">
            <span className="px-1 rounded-sm hover:bg-accent hover:text-foreground transition-colors cursor-pointer shrink-0">
              AgentPM
            </span>
            <ChevronRight className="size-3 opacity-40 shrink-0" />
            <ProjectBreadcrumbSelector
              projectId={activeProjectId}
              projectList={projectList}
              onSelect={(pid) => {
                taskForm.setValue('projectId', pid);
                bugForm.setValue('projectId', pid);
                docForm.setValue('projectId', pid);
                milestoneForm.setValue('projectId', pid);
              }}
            />
            <TypeSelector activeType={activeType} onChange={setActiveType} />
          </div>
          <div className="flex items-center gap-0.5 shrink-0">
            <IconBtn
              active={showProps}
              onClick={() => setShowProps((v) => !v)}
              title={showProps ? t('unifiedCreate.iconTips.hideProps') : t('unifiedCreate.iconTips.showProps')}
            >
              {showProps ? <PanelRightClose className="size-3.5" /> : <PanelRight className="size-3.5" />}
            </IconBtn>
            <IconBtn
              active={maximized}
              onClick={() => setMaximized((v) => !v)}
              title={maximized ? t('unifiedCreate.iconTips.restore') : t('unifiedCreate.iconTips.maximize')}
            >
              {maximized ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            </IconBtn>
            <IconBtn onClick={requestClose} title={t('unifiedCreate.iconTips.close')}>
              <X className="size-3.5" />
            </IconBtn>
          </div>
        </div>

        {/* ──────────── Body ──────────── */}
        <div className="flex overflow-hidden flex-1 min-h-0" style={{ minHeight: 320 }}>
          {/* ── Main ── */}
          <div ref={mainColRef} className="flex-1 min-w-0 overflow-y-auto flex flex-col">
            <div className="p-5 pb-3 flex flex-col gap-3.5 flex-1 min-h-0 w-full transition-all">
              {error && (
                <Alert variant="destructive" className="py-2 text-xs">
                  <AlertCircle className="size-3.5 shrink-0" />
                  <AlertDescription className="text-xs">{error}</AlertDescription>
                </Alert>
              )}

              {/* AI 代理界面：自然语言 → 草稿确认卡（CAP-A-18 顶级双界面） */}
              {mode === 'ai' ? (
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
                    <Sparkles className="mt-0.5 size-3.5 shrink-0 text-accent-purple" />
                    <span>{t('unifiedCreate.aiPanel.hint')}</span>
                  </div>
                  <Textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={5}
                    autoFocus
                    placeholder={t('unifiedCreate.aiPanel.inputPlaceholder')}
                    className="flex-1 resize-none rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus-visible:ring-0 focus-visible:border-primary/50"
                  />
                  {draft && (
                    <div
                      className="rounded-lg border border-border overflow-hidden"
                      data-testid="create-draft-card"
                    >
                      <div className="flex items-center justify-between px-3 py-2 bg-muted/30 border-b border-border/40">
                        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                          <EntityIcon entity={DRAFT_ENTITY_KIND[draft.type]} size="sm" />
                          {t('unifiedCreate.aiPanel.draftBadge', { type: t(`unifiedCreate.labels.${draft.type}`) })}
                        </span>
                        <button
                          type="button"
                          onClick={() => void generateDraft()}
                          disabled={silentCreateDraft.isPending}
                          className="text-10 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                        >
                          {t('unifiedCreate.aiPanel.regen')}
                        </button>
                      </div>
                      <div className="p-3 flex flex-col gap-1.5 text-xs">
                        <div>
                          <span className="text-muted-foreground">{t('unifiedCreate.aiPanel.fieldTitle')}：</span>
                          <span className="font-medium text-foreground">{draft.fields.title}</span>
                        </div>
                        {draft.fields.description && (
                          <div>
                            <span className="text-muted-foreground">{t('unifiedCreate.aiPanel.fieldDesc')}：</span>
                            <span className="text-foreground/80">{draft.fields.description}</span>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                          {draft.fields.priority && <span>{t('unifiedCreate.aiPanel.fieldPriority')} {draft.fields.priority}</span>}
                          {draft.fields.severity && <span>{t('unifiedCreate.aiPanel.fieldSeverity')} {draft.fields.severity}</span>}
                          {draft.fields.dueDate && <span>{t('unifiedCreate.aiPanel.fieldDue')} {draft.fields.dueDate}</span>}
                          {draft.fields.category && <span>{t('unifiedCreate.aiPanel.fieldCategory')} {draft.fields.category}</span>}
                          {draft.fields.labels?.length ? <span>{t('unifiedCreate.aiPanel.fieldLabels')} {draft.fields.labels.join('、')}</span> : null}
                        </div>
                      </div>
                      <div className="px-3 pb-3 flex gap-2">
                        <Button size="sm" onClick={confirmCreateDraft} disabled={isSubmitting}>
                          <Check className="size-3" />
                          {t('unifiedCreate.aiPanel.confirm')}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={editDraftManually} disabled={isSubmitting}>
                          {t('unifiedCreate.aiPanel.editManually')}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : mode === 'manual' && activeType === 'project' && projectSource === 'ai' ? (
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
                  />

                  {/* Description */}
                  <DescriptionField
                    activeType={activeType}
                    taskForm={taskForm}
                    bugForm={bugForm}
                    docForm={docForm}
                    projectForm={projectForm}
                    milestoneForm={milestoneForm}
                    maximized={maximized}
                    descPreview={descPreview}
                    onTogglePreview={() => setDescPreview((v) => !v)}
                  />

                  {/* 🎯 验收标准与完备性清单 (针对任务与缺陷，打通 CAP-B-01/B-02 治理闭环) */}
                  {(activeType === 'task' || activeType === 'bug') && (
                    <AcceptanceCriteriaField
                      criteria={criteria}
                      onChange={setCriteria}
                      titleValue={currentTitle}
                      descValue={activeType === 'task' ? taskForm.watch('description') : bugForm.watch('description')}
                      maximized={maximized}
                    />
                  )}

                  {/* AI 智能体在场感知条与策略控制（检测到经办人为 AI Agent 时激活） */}
                  <AgentPresenceBanner
                    assigneeId={activeType === 'task' ? taskForm.watch('assigneeId') : activeType === 'bug' ? bugForm.watch('assigneeId') : ''}
                    members={members}
                    activeType={activeType}
                    strategy={dispatchStrategy}
                    onStrategyChange={setDispatchStrategy}
                  />

                  {/* 横向属性胶囊栏（下沉单行极简药丸，随实体动态组合） */}
                  <PropertyPillsBar
                    activeType={activeType}
                    projectId={activeProjectId}
                    projectList={projectList}
                    onProjectChange={(pid) => {
                      taskForm.setValue('projectId', pid);
                      bugForm.setValue('projectId', pid);
                      docForm.setValue('projectId', pid);
                      milestoneForm.setValue('projectId', pid);
                    }}
                    status={activeType === 'task' ? taskForm.watch('status') : activeType === 'bug' ? bugForm.watch('status') : undefined}
                    onStatusChange={(st) => {
                      if (activeType === 'task') taskForm.setValue('status', st);
                      if (activeType === 'bug') bugForm.setValue('status', st);
                    }}
                    statusOptions={statusOptions}
                    priority={activeType === 'task' ? taskForm.watch('priority') : activeType === 'bug' ? bugForm.watch('priority') : undefined}
                    onPriorityChange={(pr) => {
                      if (activeType === 'task') taskForm.setValue('priority', pr);
                      if (activeType === 'bug') bugForm.setValue('priority', pr);
                    }}
                    priorityOptions={priorityOptions}
                    assigneeId={activeType === 'task' ? taskForm.watch('assigneeId') : activeType === 'bug' ? bugForm.watch('assigneeId') : undefined}
                    onAssigneeChange={(aid) => {
                      if (activeType === 'task') taskForm.setValue('assigneeId', aid);
                      if (activeType === 'bug') bugForm.setValue('assigneeId', aid);
                    }}
                    members={members}
                    dueDate={activeType === 'task' ? taskForm.watch('dueDate') : activeType === 'bug' ? bugForm.watch('dueDate') : activeType === 'milestone' ? milestoneForm.watch('dueDate') : undefined}
                    onDueDateChange={(dd) => {
                      if (activeType === 'task') taskForm.setValue('dueDate', dd);
                      if (activeType === 'bug') bugForm.setValue('dueDate', dd);
                      if (activeType === 'milestone') milestoneForm.setValue('dueDate', dd);
                    }}
                    severity={activeType === 'bug' ? bugForm.watch('severity') : undefined}
                    onSeverityChange={(sv) => {
                      if (activeType === 'bug') bugForm.setValue('severity', sv);
                    }}
                    severityOptions={SEVERITY_OPTIONS}
                    docCategory={activeType === 'doc' ? docForm.watch('category') : undefined}
                    onDocCategoryChange={(cat) => {
                      if (activeType === 'doc') docForm.setValue('category', cat);
                    }}
                    docCategoryOptions={DOC_CATEGORY_OPTIONS}
                    projectPriority={activeType === 'project' ? projectForm.watch('priority') : undefined}
                    onProjectPriorityChange={(pp) => {
                      if (activeType === 'project') projectForm.setValue('priority', pp as ProjectPriority);
                    }}
                    milestoneStatus={activeType === 'milestone' ? milestoneForm.watch('status') : undefined}
                    onMilestoneStatusChange={(ms) => {
                      if (activeType === 'milestone') milestoneForm.setValue('status', ms);
                    }}
                    onOpenAcceptance={() => {
                      if (criteria.length === 0) {
                        setCriteria([{ id: `crit-${Date.now()}`, text: '', completed: false }]);
                      }
                    }}
                    acceptanceCount={criteria.length}
                  />
                </>
              )}
            </div>

            {/* Sub-task block (matches reference: collapsible card at bottom of main) */}
            {(mode === 'manual' && activeType === 'task') && (
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
          {showProps && mode === 'manual' && (
            <aside className={cn(
              "shrink-0 px-3 pb-3 pt-1 overflow-y-auto border-l border-border/30 transition-all",
              maximized ? "w-72 bg-muted/10 px-4" : "w-52.5 bg-transparent"
            )}>
              <PropsCard
                title={t('unifiedCreate.properties')}
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
        <div className="flex items-center justify-between gap-3 px-5 h-13 shrink-0 border-t border-border/50 bg-muted/15">
          {/* 左侧：附件入口 + 连续创建（并列） */}
          <div className="flex items-center gap-3">
            {activeType !== 'project' && (
              <button
                type="button"
                className="inline-flex items-center justify-center size-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors shrink-0"
                title="添加附件"
              >
                <Paperclip className="size-4 opacity-70 hover:opacity-100" />
              </button>
            )}
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground transition-colors">
              <span>{t('unifiedCreate.createMore')}</span>
              <Switch checked={createMore} onCheckedChange={setCreateMore} />
            </label>
          </div>

          {/* 右侧：模式穿梭、取消与提交主按钮 */}
          <div className="flex items-center gap-2.5">
            {/* 智能体穿梭模式按钮（采用系统默认 AI 紫色配色与呼吸感） */}
            <ModeShuttleButton
              mode={mode}
              onToggle={() => {
                const next = mode === 'manual' ? 'ai' : 'manual';
                setMode(next);
                if (next === 'manual') setDraft(null);
              }}
              disabled={isSubmitting}
            />

            <Button variant="ghost" size="sm" onClick={requestClose} disabled={isSubmitting}>
              {t('unifiedCreate.cancel')}
            </Button>

            {mode === 'manual' && activeType === 'project' && projectSource === 'ai' ? (
              <span className="text-xs text-muted-foreground">
                {t('unifiedCreate.projectSource.grillHint')}
              </span>
            ) : mode === 'ai' ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={submitViaAssistant}
                  disabled={isSubmitting || silentCreateDraft.isPending}
                  title={t('unifiedCreate.aiPanel.fallbackTitle')}
                >
                  {t('unifiedCreate.aiPanel.fallback')}
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={isSubmitting || silentCreateDraft.isPending || !aiPrompt.trim()}
                >
                  {silentCreateDraft.isPending ? (
                    <>
                      <Spinner className="size-3 text-inherit" />
                      {t('unifiedCreate.aiPanel.parsing')}
                    </>
                  ) : draft ? (
                    <>
                      <Check className="size-3" />
                      {t('unifiedCreate.aiPanel.confirm')}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-3" />
                      {t('unifiedCreate.aiPanel.generate')}
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !currentTitle.trim()}
                aria-label={t(`unifiedCreate.title.${activeType}`)}
                className="gap-1.5 font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="size-3 text-inherit" />
                    {t('unifiedCreate.creating')}
                  </>
                ) : (
                  <>
                    <Plus className="size-3" />
                    <span>{t(`unifiedCreate.title.${activeType}`)}</span>
                    <kbd
                      aria-hidden="true"
                      className="inline-flex items-center px-1 py-0.5 rounded bg-primary-foreground/20 text-10 font-mono opacity-80 ml-0.5"
                    >
                      Ctrl ↵
                    </kbd>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>

      {/* 脏表单退出确认（批4：防 Esc/遮罩误触丢草稿） */}
      <AlertDialog open={confirmDiscard} onOpenChange={setConfirmDiscard}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('unifiedCreate.discard.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('unifiedCreate.discard.desc')}
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('unifiedCreate.discard.keep')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmDiscard(false);
                handleClose();
              }}
            >
              {t('unifiedCreate.discard.discard')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  const { t } = useTranslation();
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
        <span>{t(`unifiedCreate.labels.${activeType}`)}</span>
        <ChevronDown className="size-3 opacity-50" />
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-44">
        <div className="flex flex-col gap-0.5">
          {TYPE_ORDER.map((ty, i) => {
            const M = TYPE_META[ty];
            return (
              <button
                key={ty}
                type="button"
                onClick={() => onChange(ty)}
                className={cn(
                  'flex items-center gap-2 px-2 py-1.5 text-xs rounded-md transition-colors text-left',
                  activeType === ty ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
                )}
              >
                {M.kind
                  ? <EntityIcon entity={M.kind} size="sm" />
                  : <Sparkles className="size-3.5 text-accent-purple" />}
                <span className="font-medium flex-1">{t(`unifiedCreate.labels.${ty}`)}</span>
                {activeType === ty && <Check className="size-3 text-primary" />}
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
}) {
  const { t } = useTranslation();
  const cls = 'w-full text-2xl font-semibold placeholder:text-muted-foreground/50 resize-none leading-tight focus-visible:ring-0';
  const placeholder = t(`unifiedCreate.placeholder.${props.activeType}`);
  switch (props.activeType) {
    case 'task': return <AutoSizeTextarea autoFocus rows={1} placeholder={placeholder} className={cls} {...props.taskForm.register('title')} />;
    case 'bug': return <AutoSizeTextarea autoFocus rows={1} placeholder={placeholder} className={cls} {...props.bugForm.register('title')} />;
    case 'doc': return <AutoSizeTextarea autoFocus rows={1} placeholder={placeholder} className={cls} {...props.docForm.register('title')} />;
    case 'project': return <AutoSizeTextarea autoFocus rows={1} placeholder={placeholder} className={cls} {...props.projectForm.register('name')} />;
    case 'milestone': return <AutoSizeTextarea autoFocus rows={1} placeholder={placeholder} className={cls} {...props.milestoneForm.register('name')} />;
  }
}

function ProjectBreadcrumbSelector({
  projectId,
  projectList,
  onSelect,
}: {
  projectId: string;
  projectList: Array<{ id: string; name: string }>;
  onSelect: (pid: string) => void;
}) {
  const current = projectList.find((p) => p.id === projectId);
  if (projectList.length === 0) return null;
  return (
    <>
      <Popover>
        <PopoverTrigger
          render={
            <button className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors max-w-36 truncate" />
          }
        >
          <Flag className="size-3 text-muted-foreground shrink-0" />
          <span className="truncate">{current?.name || '选择项目'}</span>
          <ChevronDown className="size-2.5 opacity-50 shrink-0" />
        </PopoverTrigger>
        <PopoverContent align="start" className="p-1 w-52 max-h-60 overflow-y-auto">
          <div className="flex flex-col gap-0.5">
            {projectList.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 text-xs rounded-md transition-colors text-left',
                  projectId === p.id ? 'bg-accent text-accent-foreground font-medium' : 'hover:bg-muted',
                )}
              >
                <span className="truncate flex-1">{p.name}</span>
                {projectId === p.id && <Check className="size-3 text-primary ml-1 shrink-0" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      <ChevronRight className="size-3 opacity-40 shrink-0" />
    </>
  );
}

function DescriptionField(props: {
  activeType: CreateType;
  taskForm: UseFormReturn<TaskFormValues>;
  bugForm: UseFormReturn<BugFormValues>;
  docForm: UseFormReturn<DocFormValues>;
  projectForm: UseFormReturn<ProjectFormValues>;
  milestoneForm: UseFormReturn<MilestoneFormValues>;
  maximized?: boolean;
  descPreview?: boolean;
  onTogglePreview?: () => void;
}) {
  const { t } = useTranslation();
  const cls = 'w-full text-xs font-normal leading-relaxed text-foreground/80 placeholder:text-muted-foreground/50 focus-visible:ring-0';
  const ph = t(`unifiedCreate.descHint.${props.activeType}`);
  const taCls = cn(cls, 'flex-1 min-h-24 resize-none');

  const currentDesc =
    props.activeType === 'task' ? props.taskForm.watch('description')
    : props.activeType === 'bug' ? props.bugForm.watch('description')
    : props.activeType === 'doc' ? props.docForm.watch('description')
    : props.activeType === 'project' ? props.projectForm.watch('description')
    : props.milestoneForm.watch('description');

  let textarea: React.ReactNode;
  switch (props.activeType) {
    case 'task': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.taskForm.register('description')} />; break;
    case 'bug': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.bugForm.register('description')} />; break;
    case 'doc': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.docForm.register('description')} />; break;
    case 'project': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.projectForm.register('description')} />; break;
    case 'milestone': textarea = <FillTextarea placeholder={ph} className={taCls} {...props.milestoneForm.register('description')} />; break;
    default: textarea = null;
  }

  return (
    <div className="flex-1 min-h-24 flex flex-col gap-1.5">
      {props.maximized && (
        <div className="flex items-center justify-between text-xs text-muted-foreground border-b border-border/30 pb-1">
          <span className="font-medium text-foreground/70">
            {t('unifiedCreate.linear.description')} (Markdown)
          </span>
          <button
            type="button"
            onClick={props.onTogglePreview}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-11 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            {props.descPreview ? (
              <>
                <Edit3 className="size-3" />
                <span>{t('unifiedCreate.edit')}</span>
              </>
            ) : (
              <>
                <Eye className="size-3" />
                <span>{t('unifiedCreate.preview')}</span>
              </>
            )}
          </button>
        </div>
      )}
      {props.maximized && props.descPreview ? (
        <div className="flex-1 min-h-28 rounded-lg border border-border/40 bg-muted/10 p-3 overflow-y-auto text-xs">
          {currentDesc?.trim() ? (
            <MarkdownView content={currentDesc} />
          ) : (
            <span className="text-muted-foreground/50">{t('unifiedCreate.previewEmpty')}</span>
          )}
        </div>
      ) : (
        textarea
      )}
    </div>
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

