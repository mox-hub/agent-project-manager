/**
 * UnifiedCreateDialog - 统一创建对话框 (重新设计)
 * 参考设计：左侧表单 + 右侧 AI 边栏布局
 * 支持创建：任务、Bug、文档、项目、里程碑
 */

import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField } from '@/components/ui/form';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useTranslation } from '@/hooks/useTranslation';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useCreateProject } from '@/modules/project/hooks/use-project-mutations';
import { useCreateTask } from '@/modules/task/hooks/use-project-tasks';
import { useCreateProjectMilestone } from '@/modules/project/hooks/use-project-dashboard-summary';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  FolderPlus,
  Flag,
  CheckSquare,
  Bug,
  X,
  Plus,
  ChevronDown,
  Sparkles,
  Calendar,
  Users,
  Tag,
  Link2,
  Zap,
  Check,
  AlertCircle,
} from 'lucide-react';
import type { BugSeverity, TaskPriority } from '@/modules/task/api/task-api';

// 类型定义
export type CreateType = 'task' | 'bug' | 'doc' | 'project' | 'milestone';

export interface UnifiedCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: CreateType;
  projectId?: string;
  onSuccess?: (type: CreateType, id: string) => void;
}

// 获取类型配置 - 延迟初始化以支持翻译
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTypeConfig(t: any): Record<CreateType, {
  label: string;
  title: string;
  icon: typeof CheckSquare;
  color: string;
}> {
  return {
    task: { label: t('unifiedCreate.labels.task'), title: t('unifiedCreate.title.task'), icon: CheckSquare, color: 'hsl(217, 91%, 60%)' },
    bug: { label: t('unifiedCreate.labels.bug'), title: t('unifiedCreate.title.bug'), icon: Bug, color: 'hsl(0, 72%, 51%)' },
    doc: { label: t('unifiedCreate.labels.doc'), title: t('unifiedCreate.title.doc'), icon: FolderPlus, color: 'hsl(271, 91%, 65%)' },
    project: { label: t('unifiedCreate.labels.project'), title: t('unifiedCreate.title.project'), icon: FolderPlus, color: 'hsl(142, 76%, 36%)' },
    milestone: { label: t('unifiedCreate.labels.milestone'), title: t('unifiedCreate.title.milestone'), icon: Flag, color: 'hsl(45, 93%, 47%)' },
  };
}

// 获取优先级配置
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getPriorityConfig(t: any) {
  return [
    { value: 'critical', label: t('task.priority.critical'), color: 'hsl(0, 72%, 51%)', bg: 'hsl(0, 72%, 51%, 0.12)' },
    { value: 'high', label: t('task.priority.high'), color: 'hsl(32, 95%, 44%)', bg: 'hsl(32, 95%, 44%, 0.12)' },
    { value: 'medium', label: t('task.priority.medium'), color: 'hsl(217, 91%, 60%)', bg: 'hsl(217, 91%, 60%, 0.12)' },
    { value: 'low', label: t('task.priority.low'), color: 'hsl(142, 76%, 36%)', bg: 'hsl(142, 76%, 36%, 0.12)' },
  ];
}

// 获取严重性配置
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSeverityConfig(t: any) {
  return [
    { value: 'critical', label: t('task.bug.severity.critical'), color: 'hsl(0, 72%, 51%)', bg: 'hsl(0, 72%, 51%, 0.12)' },
    { value: 'high', label: t('task.bug.severity.high'), color: 'hsl(32, 95%, 44%)', bg: 'hsl(32, 95%, 44%, 0.12)' },
    { value: 'medium', label: t('task.bug.severity.medium'), color: 'hsl(217, 91%, 60%)', bg: 'hsl(217, 91%, 60%, 0.12)' },
    { value: 'low', label: t('task.bug.severity.low'), color: 'hsl(142, 76%, 36%)', bg: 'hsl(142, 76%, 36%, 0.12)' },
  ];
}

// 项目类型配置
const PROJECT_TYPE_CONFIG = [
  { value: 'web', label: 'Web 应用', icon: '🌐' },
  { value: 'mobile', label: '移动应用', icon: '📱' },
  { value: 'api', label: 'API 服务', icon: '⚡' },
  { value: 'tool', label: '工具库', icon: '🔧' },
] as const;

// 默认表单数据
const DEFAULT_FORMS = {
  task: {
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    projectId: '',
    iterationId: '',
    dueDate: '',
    assignee: '',
    tags: [] as string[],
  },
  bug: {
    title: '',
    description: '',
    severity: 'medium' as BugSeverity,
    priority: 'high' as TaskPriority,
    projectId: '',
    environment: '',
    stepsToReproduce: '',
    expectedResult: '',
    actualResult: '',
  },
  doc: {
    title: '',
    description: '',
    type: 'design',
    projectId: '',
    visibility: 'team',
  },
  project: {
    name: '',
    description: '',
    type: 'web' as string,
    priority: 'medium' as TaskPriority,
    startDate: '',
    targetDate: '',
  },
  milestone: {
    name: '',
    description: '',
    projectId: '',
    status: 'planning',
    startDate: '',
    targetDate: '',
    progress: 0,
  },
};

type FormData = typeof DEFAULT_FORMS;

// AI 建议配置 - 动态生成
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getAiSuggestions(t: any): Record<CreateType, Array<{ label: string; description: string }>> {
  return {
    task: [
      { label: t('aiSuggestions.task.1.label'), description: t('aiSuggestions.task.1.desc') },
      { label: t('aiSuggestions.task.2.label'), description: t('aiSuggestions.task.2.desc') },
      { label: t('aiSuggestions.task.3.label'), description: t('aiSuggestions.task.3.desc') },
    ],
    bug: [
      { label: t('aiSuggestions.bug.1.label'), description: t('aiSuggestions.bug.1.desc') },
      { label: t('aiSuggestions.bug.2.label'), description: t('aiSuggestions.bug.2.desc') },
      { label: t('aiSuggestions.bug.3.label'), description: t('aiSuggestions.bug.3.desc') },
    ],
    doc: [
      { label: t('aiSuggestions.doc.1.label'), description: t('aiSuggestions.doc.1.desc') },
      { label: t('aiSuggestions.doc.2.label'), description: t('aiSuggestions.doc.2.desc') },
      { label: t('aiSuggestions.doc.3.label'), description: t('aiSuggestions.doc.3.desc') },
    ],
    project: [
      { label: t('aiSuggestions.project.1.label'), description: t('aiSuggestions.project.1.desc') },
      { label: t('aiSuggestions.project.2.label'), description: t('aiSuggestions.project.2.desc') },
      { label: t('aiSuggestions.project.3.label'), description: t('aiSuggestions.project.3.desc') },
    ],
    milestone: [
      { label: t('aiSuggestions.milestone.1.label'), description: t('aiSuggestions.milestone.1.desc') },
      { label: t('aiSuggestions.milestone.2.label'), description: t('aiSuggestions.milestone.2.desc') },
      { label: t('aiSuggestions.milestone.3.label'), description: t('aiSuggestions.milestone.3.desc') },
    ],
  };
}

export function UnifiedCreateDialog({
  open,
  onOpenChange,
  defaultType = 'task',
  projectId,
  onSuccess,
}: UnifiedCreateDialogProps) {
  const { t } = useTranslation();
  const [activeType, setActiveType] = useState<CreateType>(defaultType);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 动态配置
  const TYPE_CONFIG = getTypeConfig(t);
  const AI_SUGGESTIONS = getAiSuggestions(t);

  // Forms
  const taskForm = useForm({ defaultValues: DEFAULT_FORMS.task });
  const bugForm = useForm({ defaultValues: DEFAULT_FORMS.bug });
  const docForm = useForm({ defaultValues: DEFAULT_FORMS.doc });
  const projectForm = useForm({ defaultValues: DEFAULT_FORMS.project });
  const milestoneForm = useForm({ defaultValues: DEFAULT_FORMS.milestone });

  // Hooks
  const { data: projectsResponse } = useProjectList();
  const projects = projectsResponse?.data ?? [];
  const createTask = useCreateTask();
  const createProject = useCreateProject();
  const createMilestone = useCreateProjectMilestone(projectId);

  // 获取当前活动的表单
  const getActiveForm = useCallback(() => {
    switch (activeType) {
      case 'task': return taskForm;
      case 'bug': return bugForm;
      case 'doc': return docForm;
      case 'project': return projectForm;
      case 'milestone': return milestoneForm;
    }
  }, [activeType, taskForm, bugForm, docForm, projectForm, milestoneForm]);

  // 监听默认类型变化
  useEffect(() => {
    setActiveType(defaultType);
  }, [defaultType]);

  // 监听项目 ID 变化
  useEffect(() => {
    if (projectId) {
      taskForm.setValue('projectId', projectId);
      bugForm.setValue('projectId', projectId);
      docForm.setValue('projectId', projectId);
      milestoneForm.setValue('projectId', projectId);
    }
  }, [projectId, taskForm, bugForm, docForm, milestoneForm]);

  // 关闭弹窗
  const handleClose = () => {
    onOpenChange(false);
    // 重置表单
    taskForm.reset(DEFAULT_FORMS.task);
    bugForm.reset(DEFAULT_FORMS.bug);
    docForm.reset(DEFAULT_FORMS.doc);
    projectForm.reset(DEFAULT_FORMS.project);
    milestoneForm.reset(DEFAULT_FORMS.milestone);
    setError(null);
  };

  // 成功处理
  const handleSuccess = (type: CreateType, id: string) => {
    onSuccess?.(type, id);
    toast.success(t('unifiedCreate.success', TYPE_CONFIG[type].label));
    handleClose();
  };

  // 创建任务
  const handleCreateTask = async (data: typeof DEFAULT_FORMS.task) => {
    if (!data.title.trim()) {
      setError(t('form.validation.titleRequired'));
      return;
    }
    const targetProjectId = data.projectId || projectId;
    if (!targetProjectId) {
      setError(t('form.validation.projectRequired'));
      return;
    }
    setError(null);
    try {
      const result = await createTask.mutateAsync({
        projectId: targetProjectId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        iterationId: data.iterationId || undefined,
        dueDate: data.dueDate || undefined,
        status: 'todo',
      });
      if (result?.id) {
        handleSuccess('task', result.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.createFailed'));
    }
  };

  // 创建 Bug
  const handleCreateBug = async (data: typeof DEFAULT_FORMS.bug) => {
    if (!data.title.trim()) {
      setError(t('form.validation.titleRequired'));
      return;
    }
    const targetProjectId = data.projectId || projectId;
    if (!targetProjectId) {
      setError(t('form.validation.projectRequired'));
      return;
    }
    setError(null);
    try {
      const bugDescription = `
## Bug Report

**Environment:** ${data.environment || 'Not specified'}
**Severity:** ${data.severity}
**Priority:** ${data.priority}

### Steps to Reproduce
${data.stepsToReproduce || 'Not provided'}

### Expected Result
${data.expectedResult || 'Not provided'}

### Actual Result
${data.actualResult || 'Not provided'}

### Additional Description
${data.description || 'No additional description'}
      `.trim();

      const result = await createTask.mutateAsync({
        projectId: targetProjectId,
        title: data.title,
        description: bugDescription,
        priority: data.priority,
        type: 'bug',
        severity: data.severity,
        bugEnvironment: data.environment,
        bugStepsToReproduce: data.stepsToReproduce,
        bugExpectedResult: data.expectedResult,
        bugActualResult: data.actualResult,
        status: 'todo',
      });
      if (result?.id) {
        handleSuccess('bug', result.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.createFailed'));
    }
  };

  // 创建项目
  const handleCreateProject = async (data: typeof DEFAULT_FORMS.project) => {
    if (!data.name.trim()) {
      setError(t('form.validation.nameRequired'));
      return;
    }
    setError(null);
    try {
      const result = await createProject.mutateAsync({
        name: data.name,
        description: data.description,
        type: 'team',
      });
      if (result?.id) {
        handleSuccess('project', result.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.createFailed'));
    }
  };

  // 创建里程碑
  const handleCreateMilestone = async (data: typeof DEFAULT_FORMS.milestone) => {
    if (!data.name.trim()) {
      setError(t('form.validation.milestoneNameRequired'));
      return;
    }
    const targetProjectId = data.projectId || projectId;
    if (!targetProjectId) {
      setError(t('form.validation.projectRequired'));
      return;
    }
    setError(null);
    try {
      const result = await createMilestone.mutateAsync({
        name: data.name,
        description: data.description || undefined,
        targetDate: data.targetDate || undefined,
        status: 'planned',
      });
      handleSuccess('milestone', result.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('form.createFailed'));
    }
  };

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') {
        handleClose();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        const form = getActiveForm();
        form.handleSubmit(
          activeType === 'task' ? handleCreateTask :
          activeType === 'bug' ? handleCreateBug :
          activeType === 'project' ? handleCreateProject :
          handleCreateMilestone
        )();
      }
      // 数字键切换类型
      if (!e.ctrlKey && !e.metaKey && ['1', '2', '3', '4', '5'].includes(e.key)) {
        const types: CreateType[] = ['task', 'bug', 'doc', 'project', 'milestone'];
        const idx = parseInt(e.key) - 1;
        if (idx < types.length) {
          setActiveType(types[idx]);
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, activeType, getActiveForm]);

  const currentConfig = TYPE_CONFIG[activeType];
  const CurrentIcon = currentConfig.icon;
  const isCreating = createTask.isPending || createProject.isPending || createMilestone.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[85vh] w-[min(92vw,1100px)] overflow-hidden border-none bg-transparent p-0 shadow-none"
        keepDefaultWidth={false}
      >
        <div className="flex flex-col rounded-xl border border-border bg-background shadow-xl overflow-hidden">
          {/* Header */}
          <div
            className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0"
            style={{
              background: `linear-gradient(135deg, ${currentConfig.color}15 0%, transparent 50%)`,
              borderLeftColor: currentConfig.color,
              borderLeftWidth: '4px',
            }}
          >
            <h2 className="text-lg font-semibold flex items-center gap-2">
              {currentConfig.title}
            </h2>
            <div className="flex items-center gap-2">
              {/* Type Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-border bg-muted/50 hover:bg-muted transition-colors"
                >
                  <CurrentIcon className="h-4 w-4" style={{ color: currentConfig.color }} />
                  <span>{currentConfig.label}</span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </button>

                {showTypeDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowTypeDropdown(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border bg-background shadow-lg z-50 p-1">
                      {Object.entries(TYPE_CONFIG).map(([key, config]) => {
                        const Icon = config.icon;
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              setActiveType(key as CreateType);
                              setShowTypeDropdown(false);
                            }}
                            className={cn(
                              'w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors',
                              activeType === key
                                ? 'bg-muted text-foreground'
                                : 'hover:bg-muted/50 text-muted-foreground'
                            )}
                          >
                            <Icon className="h-4 w-4" style={{ color: config.color }} />
                            <span>{config.label}</span>
                            <span className="ml-auto text-xs text-muted-foreground">
                              {Object.keys(TYPE_CONFIG).indexOf(key) + 1}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          {/* Body: Left Form + Right Sidebar */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Main Form Area */}
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {/* Task Form */}
              {activeType === 'task' && (
                <TaskForm
                  form={taskForm}
                  projects={projects}
                  projectId={projectId}
                  onSubmit={handleCreateTask}
                  isCreating={isCreating}
                />
              )}

              {/* Bug Form */}
              {activeType === 'bug' && (
                <BugForm
                  form={bugForm}
                  projects={projects}
                  projectId={projectId}
                  onSubmit={handleCreateBug}
                  isCreating={isCreating}
                />
              )}

              {/* Project Form */}
              {activeType === 'project' && (
                <ProjectForm
                  form={projectForm}
                  onSubmit={handleCreateProject}
                  isCreating={isCreating}
                />
              )}

              {/* Milestone Form */}
              {activeType === 'milestone' && (
                <MilestoneForm
                  form={milestoneForm}
                  projects={projects}
                  projectId={projectId}
                  onSubmit={handleCreateMilestone}
                  isCreating={isCreating}
                />
              )}

              {/* Doc Form (simplified) */}
              {activeType === 'doc' && (
                <DocForm
                  form={docForm}
                  projects={projects}
                  projectId={projectId}
                />
              )}
            </div>

            {/* AI Sidebar */}
            <div className="w-72 shrink-0 border-l border-border bg-muted/30 p-4 overflow-y-auto">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="h-4 w-4 text-accent-purple" />
                <span className="text-sm font-semibold text-accent-purple">{t('unifiedCreate.aiSuggestions')}</span>
              </div>

              <div className="space-y-3">
                {AI_SUGGESTIONS[activeType].map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      toast.success(t('unifiedCreate.applied'));
                    }}
                    className="w-full text-left p-3 rounded-lg bg-background border border-border hover:border-accent-purple/30 hover:bg-accent-purple/5 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <Zap className="h-3 w-3 text-accent-purple mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium">{suggestion.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {suggestion.description}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <Separator className="my-4" />

              {/* Quick Stats */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('unifiedCreate.quickStats')}
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('unifiedCreate.inProgressTasks')}</span>
                    <span className="font-mono">7</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('unifiedCreate.remainingTokens')}</span>
                    <span className="font-mono">8.2K</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{t('unifiedCreate.bugsThisWeek')}</span>
                    <span className="font-mono text-red-500">+8</span>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* AI Input */}
              <div className="relative">
                <Input
                  placeholder={t('unifiedCreate.askAi')}
                  className="pr-8 bg-background"
                />
                <Sparkles className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-accent-purple" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border shrink-0 bg-muted/30">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Esc</kbd> {t('unifiedCreate.shortcuts.close')}</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Tab</kbd> {t('unifiedCreate.shortcuts.switchType')}</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+Enter</kbd> {t('unifiedCreate.shortcuts.submit')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                {t('unifiedCreate.cancel')}
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info(t('unifiedCreate.aiDraftComing'))}
                className="gap-1.5"
              >
                <Sparkles className="h-3 w-3 text-accent-purple" />
                {t('unifiedCreate.aiDraft')}
              </Button>
              <Button
                onClick={() => {
                  const form = getActiveForm();
                  form.handleSubmit(
                    activeType === 'task' ? handleCreateTask :
                    activeType === 'bug' ? handleCreateBug :
                    activeType === 'project' ? handleCreateProject :
                    handleCreateMilestone
                  )();
                }}
                disabled={isCreating}
              >
                <Plus className="h-4 w-4 mr-1" />
                {isCreating ? t('unifiedCreate.creating') : t('unifiedCreate.create')}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Task Form Component
function TaskForm({
  form,
  projects,
  projectId,
  onSubmit,
  isCreating,
}: {
  form: ReturnType<typeof useForm<typeof DEFAULT_FORMS.task>>;
  projects: Array<{ id: string; name: string }>;
  projectId?: string;
  onSubmit: (data: typeof DEFAULT_FORMS.task) => void;
  isCreating: boolean;
}) {
  const { t } = useTranslation();
  const [selectedPriority, setSelectedPriority] = useState('medium');
  const PRIORITY_CONFIG = getPriorityConfig(t);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <Label>
            {t('form.task.titleRequired')}
          </Label>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <Input placeholder={t('form.task.titlePlaceholder')} {...field} />
            )}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>{t('form.task.description')}</Label>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <Textarea
                placeholder={t('form.task.descriptionPlaceholder')}
                rows={3}
                {...field}
              />
            )}
          />
        </div>

        {/* Project & Iteration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('form.task.projectRequired')}</Label>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <NativeSelect {...field} value={projectId || field.value}>
                  <NativeSelectOption value="">{t('form.task.selectProject')}</NativeSelectOption>
                  {projects.map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('form.task.sprint')}</Label>
            <FormField
              control={form.control}
              name="iterationId"
              render={({ field }) => (
                <NativeSelect {...field}>
                  <NativeSelectOption value="">{t('form.task.selectSprint')}</NativeSelectOption>
                </NativeSelect>
              )}
            />
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label>{t('form.task.priority')}</Label>
          <div className="flex gap-2">
            {PRIORITY_CONFIG.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedPriority(opt.value);
                  form.setValue('priority', opt.value as TaskPriority);
                }}
                className={cn(
                  'flex-1 flex items-center justify-center gap-1.5 py-2 text-sm font-medium rounded-md border transition-all',
                  selectedPriority === opt.value
                    ? 'border-current text-white'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                )}
                style={{
                  backgroundColor: selectedPriority === opt.value ? opt.bg : 'transparent',
                  borderColor: selectedPriority === opt.value ? opt.color : undefined,
                  color: selectedPriority === opt.value ? opt.color : undefined,
                }}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: opt.color }}
                />
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Due Date */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('form.task.dueDate')}</Label>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <Input type="date" {...field} />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('form.task.assignee')}</Label>
            <FormField
              control={form.control}
              name="assignee"
              render={({ field }) => (
                <Input placeholder={t('form.task.assigneePlaceholder')} {...field} />
              )}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>{t('form.task.tags')}</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
              前端 <X className="h-3 w-3 cursor-pointer" />
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
              认证 <X className="h-3 w-3 cursor-pointer" />
            </span>
            <Input
              placeholder={t('form.task.tagPlaceholder')}
              className="flex-1 min-w-[100px] h-7 bg-transparent border-none p-0 text-sm"
            />
          </div>
        </div>

        {/* Git Binding */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3 w-3" />
            {t('form.task.gitBindingOptional')}
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={t('form.task.gitPlaceholder')}
              className="flex-1 font-mono text-xs"
            />
            <Button variant="outline" size="sm" type="button">
              {t('form.task.selectCommit')}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

// Bug Form Component
function BugForm({
  form,
  projects,
  projectId,
  onSubmit,
  isCreating,
}: {
  form: ReturnType<typeof useForm<typeof DEFAULT_FORMS.bug>>;
  projects: Array<{ id: string; name: string }>;
  projectId?: string;
  onSubmit: (data: typeof DEFAULT_FORMS.bug) => void;
  isCreating: boolean;
}) {
  const { t } = useTranslation();
  const [selectedSeverity, setSelectedSeverity] = useState('medium');
  const SEVERITY_CONFIG = getSeverityConfig(t);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <Label>
            {t('form.bug.titleRequired')}
          </Label>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <Input placeholder={t('form.bug.titlePlaceholder')} {...field} />
            )}
          />
        </div>

        {/* Severity */}
        <div className="space-y-2">
          <Label>{t('form.bug.severity')}</Label>
          <div className="flex gap-2">
            {SEVERITY_CONFIG.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedSeverity(opt.value);
                  form.setValue('severity', opt.value as BugSeverity);
                }}
                className={cn(
                  'flex-1 py-2 text-sm font-medium rounded-md border transition-all',
                  selectedSeverity === opt.value
                    ? 'text-white'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                )}
                style={{
                  backgroundColor: selectedSeverity === opt.value ? opt.bg : 'transparent',
                  borderColor: selectedSeverity === opt.value ? opt.color : undefined,
                  color: selectedSeverity === opt.value ? opt.color : undefined,
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project & Priority */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('form.bug.projectRequired')}</Label>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <NativeSelect {...field} value={projectId || field.value}>
                  <NativeSelectOption value="">{t('form.bug.selectProject')}</NativeSelectOption>
                  {projects.map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('form.bug.environment')}</Label>
            <FormField
              control={form.control}
              name="environment"
              render={({ field }) => (
                <Input placeholder={t('form.bug.environmentPlaceholder')} {...field} />
              )}
            />
          </div>
        </div>

        {/* Steps to Reproduce */}
        <div className="space-y-2">
          <Label>{t('form.bug.stepsToReproduce')}</Label>
          <FormField
            control={form.control}
            name="stepsToReproduce"
            render={({ field }) => (
              <Textarea
                placeholder={t('form.bug.stepsPlaceholder')}
                rows={3}
                {...field}
              />
            )}
          />
        </div>

        {/* Expected & Actual Result */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('form.bug.expectedResult')}</Label>
            <FormField
              control={form.control}
              name="expectedResult"
              render={({ field }) => (
                <Textarea rows={2} placeholder={t('form.bug.expectedPlaceholder')} {...field} />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('form.bug.actualResult')}</Label>
            <FormField
              control={form.control}
              name="actualResult"
              render={({ field }) => (
                <Textarea rows={2} placeholder={t('form.bug.actualPlaceholder')} {...field} />
              )}
            />
          </div>
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label>{t('form.bug.attachments')}</Label>
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-muted-foreground/50 cursor-pointer transition-colors">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">{t('form.bug.attachmentsHint')}</span>
          </div>
        </div>
      </form>
    </Form>
  );
}

// Project Form Component
function ProjectForm({
  form,
  onSubmit,
  isCreating,
}: {
  form: ReturnType<typeof useForm<typeof DEFAULT_FORMS.project>>;
  onSubmit: (data: typeof DEFAULT_FORMS.project) => void;
  isCreating: boolean;
}) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState('web');
  const [selectedPriority, setSelectedPriority] = useState('medium');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label>
            {t('form.project.nameRequired')}
          </Label>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <Input placeholder={t('form.project.namePlaceholder')} {...field} />
            )}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>{t('form.project.description')}</Label>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <Textarea rows={2} placeholder={t('form.project.descriptionPlaceholder')} {...field} />
            )}
          />
        </div>

        {/* Project Type */}
        <div className="space-y-2">
          <Label>{t('form.project.type')}</Label>
          <div className="grid grid-cols-4 gap-2">
            {PROJECT_TYPE_CONFIG.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  setSelectedType(opt.value);
                  form.setValue('type', opt.value);
                }}
                className={cn(
                  'flex flex-col items-center gap-1.5 py-3 rounded-lg border transition-all text-xs',
                  selectedType === opt.value
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:border-muted-foreground'
                )}
              >
                <span className="text-xl">{opt.icon}</span>
                {t(`form.project.types.${opt.value}`, opt.label)}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('form.project.startDate')}</Label>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <Input type="date" {...field} />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('form.project.targetDate')}</Label>
            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <Input type="date" {...field} />
              )}
            />
          </div>
        </div>

        {/* Team Members (simplified) */}
        <div className="space-y-2">
          <Label>{t('form.project.teamMembers')}</Label>
          <div className="flex flex-wrap gap-2">
            {['Agent-A', 'Agent-B', '张三', '李四'].map((name, idx) => (
              <button
                key={name}
                type="button"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border border-border hover:border-primary/50 transition-colors"
              >
                <span
                  className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                  style={{
                    backgroundColor: ['hsl(217,91%,60%)', 'hsl(271,91%,65%)', 'hsl(142,76%,36%)', 'hsl(32,95%,44%)'][idx]
                  }}
                >
                  {name[0]}
                </span>
                {name}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Form>
  );
}

// Milestone Form Component
function MilestoneForm({
  form,
  projects,
  projectId,
  onSubmit,
  isCreating,
}: {
  form: ReturnType<typeof useForm<typeof DEFAULT_FORMS.milestone>>;
  projects: Array<{ id: string; name: string }>;
  projectId?: string;
  onSubmit: (data: typeof DEFAULT_FORMS.milestone) => void;
  isCreating: boolean;
}) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState(0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label>
            {t('form.milestone.nameRequired')}
          </Label>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <Input placeholder={t('form.milestone.namePlaceholder')} {...field} />
            )}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>{t('form.milestone.description')}</Label>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <Textarea rows={2} placeholder={t('form.milestone.descriptionPlaceholder')} {...field} />
            )}
          />
        </div>

        {/* Project & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('form.milestone.projectRequired')}</Label>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <NativeSelect {...field} value={projectId || field.value}>
                  <NativeSelectOption value="">{t('form.milestone.selectProject')}</NativeSelectOption>
                  {projects.map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('form.milestone.status')}</Label>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <NativeSelect {...field}>
                  <NativeSelectOption value="planning">{t('form.milestone.statusPlanning')}</NativeSelectOption>
                  <NativeSelectOption value="active">{t('form.milestone.statusActive')}</NativeSelectOption>
                  <NativeSelectOption value="done">{t('form.milestone.statusDone')}</NativeSelectOption>
                </NativeSelect>
              )}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('form.milestone.startDate')}</Label>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <Input type="date" {...field} />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('form.milestone.targetDate')}</Label>
            <FormField
              control={form.control}
              name="targetDate"
              render={({ field }) => (
                <Input type="date" {...field} />
              )}
            />
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>{t('form.milestone.progress')}</Label>
            <span className="text-sm font-mono text-muted-foreground">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </form>
    </Form>
  );
}

// Doc Form Component (simplified)
function DocForm({
  form,
  projects,
  projectId,
}: {
  form: ReturnType<typeof useForm<typeof DEFAULT_FORMS.doc>>;
  projects: Array<{ id: string; name: string }>;
  projectId?: string;
}) {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState('design');
  const docTypes = [
    { key: 'design', label: t('form.doc.types.design', '设计文档') },
    { key: 'api', label: t('form.doc.types.api', 'API 文档') },
    { key: 'spec', label: t('form.doc.types.spec', '需求规格') },
    { key: 'guide', label: t('form.doc.types.guide', '使用指南') },
  ];

  return (
    <Form {...form}>
      <form className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <Label>
            {t('form.doc.titleRequired')}
          </Label>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <Input placeholder={t('form.doc.titlePlaceholder')} {...field} />
            )}
          />
        </div>

        {/* Doc Type */}
        <div className="space-y-2">
          <Label>{t('form.doc.type')}</Label>
          <div className="flex gap-2">
            {docTypes.map((docType) => (
              <button
                key={docType.key}
                type="button"
                onClick={() => setSelectedType(docType.key)}
                className={cn(
                  'flex-1 py-3 rounded-lg border transition-all text-xs',
                  selectedType === docType.key
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                {docType.label}
              </button>
            ))}
          </div>
        </div>

        {/* Project & Visibility */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>{t('form.doc.project')}</Label>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <NativeSelect {...field} value={projectId || field.value}>
                  <NativeSelectOption value="">{t('form.doc.selectProject')}</NativeSelectOption>
                  {projects.map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>{t('form.doc.visibility')}</Label>
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <NativeSelect {...field}>
                  <NativeSelectOption value="team">{t('form.doc.visibilityTeam')}</NativeSelectOption>
                  <NativeSelectOption value="private">{t('form.doc.visibilityPrivate')}</NativeSelectOption>
                  <NativeSelectOption value="public">{t('form.doc.visibilityPublic')}</NativeSelectOption>
                </NativeSelect>
              )}
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>{t('form.doc.description')}</Label>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <Textarea rows={3} placeholder={t('form.doc.descriptionPlaceholder')} {...field} />
            )}
          />
        </div>
      </form>
    </Form>
  );
}
