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

// 类型配置
const TYPE_CONFIG: Record<CreateType, {
  label: string;
  title: string;
  icon: typeof CheckSquare;
  color: string;
}> = {
  task: { label: '任务', title: '创建任务', icon: CheckSquare, color: 'hsl(217, 91%, 60%)' },
  bug: { label: 'Bug', title: '创建 Bug', icon: Bug, color: 'hsl(0, 72%, 51%)' },
  doc: { label: '文档', title: '创建文档', icon: FolderPlus, color: 'hsl(271, 91%, 65%)' },
  project: { label: '项目', title: '创建项目', icon: FolderPlus, color: 'hsl(142, 76%, 36%)' },
  milestone: { label: '里程碑', title: '创建里程碑', icon: Flag, color: 'hsl(45, 93%, 47%)' },
};

// 优先级配置
const PRIORITY_CONFIG = [
  { value: 'critical', label: '紧急', color: 'hsl(0, 72%, 51%)', bg: 'hsl(0, 72%, 51%, 0.12)' },
  { value: 'high', label: '高', color: 'hsl(32, 95%, 44%)', bg: 'hsl(32, 95%, 44%, 0.12)' },
  { value: 'medium', label: '中', color: 'hsl(217, 91%, 60%)', bg: 'hsl(217, 91%, 60%, 0.12)' },
  { value: 'low', label: '低', color: 'hsl(142, 76%, 36%)', bg: 'hsl(142, 76%, 36%, 0.12)' },
] as const;

// 严重性配置
const SEVERITY_CONFIG = [
  { value: 'critical', label: '致命', color: 'hsl(0, 72%, 51%)', bg: 'hsl(0, 72%, 51%, 0.12)' },
  { value: 'high', label: '严重', color: 'hsl(32, 95%, 44%)', bg: 'hsl(32, 95%, 44%, 0.12)' },
  { value: 'medium', label: '一般', color: 'hsl(217, 91%, 60%)', bg: 'hsl(217, 91%, 60%, 0.12)' },
  { value: 'low', label: '轻微', color: 'hsl(142, 76%, 36%)', bg: 'hsl(142, 76%, 36%, 0.12)' },
] as const;

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

// AI 建议配置
const AI_SUGGESTIONS: Record<CreateType, Array<{ label: string; description: string }>> = {
  task: [
    { label: '实现 OAuth 2.0 认证', description: '包含登录/注册/密码重置' },
    { label: 'API 性能优化', description: '优化数据库查询和缓存' },
    { label: '单元测试覆盖', description: '提升核心模块测试覆盖率' },
  ],
  bug: [
    { label: '类似 Bug 分析', description: '发现 3 个相似问题' },
    { label: '自动诊断', description: '根据日志分析可能原因' },
    { label: '修复建议', description: '提供解决方案和代码示例' },
  ],
  doc: [
    { label: '自动生成大纲', description: '基于项目结构生成文档' },
    { label: '模板推荐', description: '推荐适合的文档模板' },
    { label: '关联代码', description: '自动关联相关代码文件' },
  ],
  project: [
    { label: '团队配置', description: '推荐团队组成和分工' },
    { label: '预算估算', description: '基于历史数据估算资源' },
    { label: '里程碑规划', description: '自动生成项目里程碑' },
  ],
  milestone: [
    { label: '任务拆分', description: '自动拆分可执行任务' },
    { label: '时间预测', description: '预测最佳完成时间' },
    { label: '风险识别', description: '识别潜在风险任务' },
  ],
};

export function UnifiedCreateDialog({
  open,
  onOpenChange,
  defaultType = 'task',
  projectId,
  onSuccess,
}: UnifiedCreateDialogProps) {
  const [activeType, setActiveType] = useState<CreateType>(defaultType);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    toast.success(`${TYPE_CONFIG[type].label} 创建成功`);
    handleClose();
  };

  // 创建任务
  const handleCreateTask = async (data: typeof DEFAULT_FORMS.task) => {
    if (!data.title.trim()) {
      setError('请输入任务标题');
      return;
    }
    const targetProjectId = data.projectId || projectId;
    if (!targetProjectId) {
      setError('请选择项目');
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
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  // 创建 Bug
  const handleCreateBug = async (data: typeof DEFAULT_FORMS.bug) => {
    if (!data.title.trim()) {
      setError('请输入 Bug 标题');
      return;
    }
    const targetProjectId = data.projectId || projectId;
    if (!targetProjectId) {
      setError('请选择项目');
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
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  // 创建项目
  const handleCreateProject = async (data: typeof DEFAULT_FORMS.project) => {
    if (!data.name.trim()) {
      setError('请输入项目名称');
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
      setError(err instanceof Error ? err.message : '创建失败');
    }
  };

  // 创建里程碑
  const handleCreateMilestone = async (data: typeof DEFAULT_FORMS.milestone) => {
    if (!data.name.trim()) {
      setError('请输入里程碑名称');
      return;
    }
    const targetProjectId = data.projectId || projectId;
    if (!targetProjectId) {
      setError('请选择项目');
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
      setError(err instanceof Error ? err.message : '创建失败');
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
                <span className="text-sm font-semibold text-accent-purple">AI 建议</span>
              </div>

              <div className="space-y-3">
                {AI_SUGGESTIONS[activeType].map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      toast.success('已应用建议');
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
                  快速统计
                </p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">进行中任务</span>
                    <span className="font-mono">7</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">剩余 Token</span>
                    <span className="font-mono">8.2K</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">本周 Bug</span>
                    <span className="font-mono text-red-500">+8</span>
                  </div>
                </div>
              </div>

              <Separator className="my-4" />

              {/* AI Input */}
              <div className="relative">
                <Input
                  placeholder="追问 AI…"
                  className="pr-8 bg-background"
                />
                <Sparkles className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-accent-purple" />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-6 py-3 border-t border-border shrink-0 bg-muted/30">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Esc</kbd> 关闭</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Tab</kbd> 切换类型</span>
              <span><kbd className="px-1 py-0.5 rounded bg-muted border border-border font-mono text-[10px]">Ctrl+Enter</kbd> 提交</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose}>
                取消
              </Button>
              <Button
                variant="outline"
                onClick={() => toast.info('AI 起草功能开发中')}
                className="gap-1.5"
              >
                <Sparkles className="h-3 w-3 text-accent-purple" />
                AI 起草
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
                {isCreating ? '创建中…' : '创建'}
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
  const [selectedPriority, setSelectedPriority] = useState('medium');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <Label>
            任务标题 <span className="text-destructive">*</span>
          </Label>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <Input placeholder="例如：实现用户认证模块" {...field} />
            )}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>描述</Label>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <Textarea
                placeholder="描述任务的具体内容、验收标准…"
                rows={3}
                {...field}
              />
            )}
          />
        </div>

        {/* Project & Iteration */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>所属项目 <span className="text-destructive">*</span></Label>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <NativeSelect {...field} value={projectId || field.value}>
                  <NativeSelectOption value="">选择项目…</NativeSelectOption>
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
            <Label>Sprint</Label>
            <FormField
              control={form.control}
              name="iterationId"
              render={({ field }) => (
                <NativeSelect {...field}>
                  <NativeSelectOption value="">选择 Sprint…</NativeSelectOption>
                </NativeSelect>
              )}
            />
          </div>
        </div>

        {/* Priority */}
        <div className="space-y-2">
          <Label>优先级</Label>
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
            <Label>截止日期</Label>
            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <Input type="date" {...field} />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>指派给</Label>
            <FormField
              control={form.control}
              name="assignee"
              render={({ field }) => (
                <Input placeholder="选择或搜索成员…" {...field} />
              )}
            />
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <Label>标签</Label>
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-border bg-muted/30">
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20">
              前端 <X className="h-3 w-3 cursor-pointer" />
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
              认证 <X className="h-3 w-3 cursor-pointer" />
            </span>
            <Input
              placeholder="输入标签…"
              className="flex-1 min-w-[100px] h-7 bg-transparent border-none p-0 text-sm"
            />
          </div>
        </div>

        {/* Git Binding */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <Link2 className="h-3 w-3" />
            关联 Git 提交 <span className="text-muted-foreground/50">(可选)</span>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="输入 commit hash 或搜索分支…"
              className="flex-1 font-mono text-xs"
            />
            <Button variant="outline" size="sm" type="button">
              选择提交…
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
  const [selectedSeverity, setSelectedSeverity] = useState('medium');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <Label>
            Bug 标题 <span className="text-destructive">*</span>
          </Label>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <Input placeholder="简明描述问题，例如：登录后 Session 立即失效" {...field} />
            )}
          />
        </div>

        {/* Severity */}
        <div className="space-y-2">
          <Label>严重程度</Label>
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
            <Label>所属项目 <span className="text-destructive">*</span></Label>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <NativeSelect {...field} value={projectId || field.value}>
                  <NativeSelectOption value="">选择项目…</NativeSelectOption>
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
            <Label>环境 / 版本</Label>
            <FormField
              control={form.control}
              name="environment"
              render={({ field }) => (
                <Input placeholder="例如：Chrome 126" {...field} />
              )}
            />
          </div>
        </div>

        {/* Steps to Reproduce */}
        <div className="space-y-2">
          <Label>复现步骤</Label>
          <FormField
            control={form.control}
            name="stepsToReproduce"
            render={({ field }) => (
              <Textarea
                placeholder="1. 打开登录页&#10;2. 输入用户名密码&#10;3. 点击登录&#10;4. 观察到…"
                rows={3}
                {...field}
              />
            )}
          />
        </div>

        {/* Expected & Actual Result */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>预期结果</Label>
            <FormField
              control={form.control}
              name="expectedResult"
              render={({ field }) => (
                <Textarea rows={2} placeholder="应该发生什么…" {...field} />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>实际结果</Label>
            <FormField
              control={form.control}
              name="actualResult"
              render={({ field }) => (
                <Textarea rows={2} placeholder="实际发生了什么…" {...field} />
              )}
            />
          </div>
        </div>

        {/* Attachments */}
        <div className="space-y-2">
          <Label>附件</Label>
          <div className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-border hover:border-muted-foreground/50 cursor-pointer transition-colors">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">点击或拖拽上传截图/日志</span>
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
  const [selectedType, setSelectedType] = useState('web');
  const [selectedPriority, setSelectedPriority] = useState('medium');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label>
            项目名称 <span className="text-destructive">*</span>
          </Label>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <Input placeholder="例如：AI 客服平台 v2" {...field} />
            )}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>项目描述</Label>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <Textarea rows={2} placeholder="简要描述项目目标和范围…" {...field} />
            )}
          />
        </div>

        {/* Project Type */}
        <div className="space-y-2">
          <Label>项目类型</Label>
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
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>开始日期</Label>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <Input type="date" {...field} />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>目标日期</Label>
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
          <Label>团队成员</Label>
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
  const [progress, setProgress] = useState(0);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label>
            里程碑名称 <span className="text-destructive">*</span>
          </Label>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <Input placeholder="例如：v1.0 公开发布" {...field} />
            )}
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>描述</Label>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <Textarea rows={2} placeholder="描述此里程碑的关键目标和交付物…" {...field} />
            )}
          />
        </div>

        {/* Project & Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>所属项目 <span className="text-destructive">*</span></Label>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <NativeSelect {...field} value={projectId || field.value}>
                  <NativeSelectOption value="">选择项目…</NativeSelectOption>
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
            <Label>状态</Label>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <NativeSelect {...field}>
                  <NativeSelectOption value="planning">规划中</NativeSelectOption>
                  <NativeSelectOption value="active">进行中</NativeSelectOption>
                  <NativeSelectOption value="done">已完成</NativeSelectOption>
                </NativeSelect>
              )}
            />
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>开始日期</Label>
            <FormField
              control={form.control}
              name="startDate"
              render={({ field }) => (
                <Input type="date" {...field} />
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>截止日期</Label>
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
            <Label>里程碑进度</Label>
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
  const [selectedType, setSelectedType] = useState('design');

  return (
    <Form {...form}>
      <form className="space-y-5">
        {/* Title */}
        <div className="space-y-2">
          <Label>
            文档标题 <span className="text-destructive">*</span>
          </Label>
          <FormField
            control={form.control}
            name="title"
            render={({ field }) => (
              <Input placeholder="例如：API 认证模块设计文档" {...field} />
            )}
          />
        </div>

        {/* Doc Type */}
        <div className="space-y-2">
          <Label>文档类型</Label>
          <div className="flex gap-2">
            {['设计文档', 'API 文档', '需求规格', '使用指南'].map((label, idx) => (
              <button
                key={label}
                type="button"
                onClick={() => setSelectedType(['design', 'api', 'spec', 'guide'][idx])}
                className={cn(
                  'flex-1 py-3 rounded-lg border transition-all text-xs',
                  selectedType === ['design', 'api', 'spec', 'guide'][idx]
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Project & Visibility */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>关联项目</Label>
            <FormField
              control={form.control}
              name="projectId"
              render={({ field }) => (
                <NativeSelect {...field} value={projectId || field.value}>
                  <NativeSelectOption value="">选择项目…</NativeSelectOption>
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
            <Label>可见性</Label>
            <FormField
              control={form.control}
              name="visibility"
              render={({ field }) => (
                <NativeSelect {...field}>
                  <NativeSelectOption value="team">团队可见</NativeSelectOption>
                  <NativeSelectOption value="private">仅自己</NativeSelectOption>
                  <NativeSelectOption value="public">公开链接</NativeSelectOption>
                </NativeSelect>
              )}
            />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label>描述</Label>
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <Textarea rows={3} placeholder="简要描述文档内容…" {...field} />
            )}
          />
        </div>
      </form>
    </Form>
  );
}
