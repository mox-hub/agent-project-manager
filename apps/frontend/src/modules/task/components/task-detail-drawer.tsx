import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Bot, CheckCircle, FileText, XCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Form, FormField } from '@/components/ui/form';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useTranslation } from '@/hooks/useTranslation';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { taskApi, type Task } from '@/modules/task/api/task-api';
import {
  useTaskDetail,
  useTaskActivities,
  useUpdateTask,
  useAddTaskDependency,
  useRemoveTaskDependency,
  useDeleteTask,
  useProjectTasks,
  useProjectMilestones,
} from '../hooks/use-project-tasks';
import { AiAgentBadge } from '@/shared/components/ai-agent-badge';
import { AiExecutionIndicator } from '@/shared/components/ai-execution-indicator';
import { AiSuggestionCard } from '@/shared/components/ai-suggestion-card';
import { AiAssignDialog } from './ai-assign-dialog';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { useTaskDocumentLinks, LINK_TYPE_LABELS, LINK_TYPE_COLORS } from '@/modules/document/hooks/use-document-task-links';

export interface TaskDetailDrawerProps {
  taskId: string | null;
  onClose: () => void;
}

const priorityOptions = [
  { value: 'low', label: 'Low', color: '#22c55e' },
  { value: 'medium', label: 'Medium', color: '#eab308' },
  { value: 'high', label: 'High', color: '#ef4444' },
  { value: 'critical', label: 'Critical', color: '#dc2626' },
];

const severityOptions = [
  { value: 'low', label: 'Low', color: '#94a3b8' },
  { value: 'medium', label: 'Medium', color: '#f59e0b' },
  { value: 'high', label: 'High', color: '#f97316' },
  { value: 'critical', label: 'Critical', color: '#ef4444' },
];

const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

function toEditForm(task: Task) {
  return {
    title: task.title,
    description: task.description || '',
    priority: task.priority,
    status: task.status,
    assigneeId: task.assignee?.id || '',
    iterationId: task.iterationId || '',
    milestoneId: task.milestoneId || '',
    dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    estimate: task.estimate?.toString() || '',
    // Bug 专用字段
    severity: task.severity || 'medium',
    bugReproducibility: task.bugReproducibility || '',
    bugEnvironment: task.bugEnvironment || '',
    bugExpectedResult: task.bugExpectedResult || '',
    bugActualResult: task.bugActualResult || '',
  };
}

type TaskEditForm = ReturnType<typeof toEditForm>;

export function TaskDetailDrawer({ taskId, onClose }: TaskDetailDrawerProps) {
  const { t } = useTranslation();
  const [isEditing, setIsEditing] = useState(false);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showAiAssignDialog, setShowAiAssignDialog] = useState(false);
  const [newDependencyTaskId, setNewDependencyTaskId] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const editTaskForm = useForm<TaskEditForm>({
    defaultValues: {
      title: '',
      description: '',
      priority: 'medium',
      status: 'todo',
      assigneeId: '',
      iterationId: '',
      milestoneId: '',
      dueDate: '',
      estimate: '',
      // Bug 专用字段
      severity: 'medium',
      bugReproducibility: '',
      bugEnvironment: '',
      bugExpectedResult: '',
      bugActualResult: '',
    },
  });

  const { data: task, isLoading: taskLoading } = useTaskDetail(taskId || undefined);
  const { data: activities } = useTaskActivities(taskId || undefined);
  const { data: project } = useProjectDetail(task?.projectId);
  const { data: iterations = [] } = useQuery({
    queryKey: ['taskDetailIterations', task?.projectId],
    enabled: !!task?.projectId,
    queryFn: () => taskApi.getProjectIterations(task!.projectId),
  });
  const { data: milestones = [] } = useProjectMilestones(task?.projectId);
  const { data: projectTasks } = useProjectTasks(task?.projectId, { pageSize: 200 });

  const updateTask = useUpdateTask();
  const addDependency = useAddTaskDependency(taskId || undefined);
  const removeDependency = useRemoveTaskDependency(taskId || undefined, task?.projectId);
  const deleteTask = useDeleteTask();

  const existingDependencyIds = new Set(
    (task?.dependencies ?? []).map((dependency) => dependency.dependsOnTaskId),
  );
  const dependencyOptions = !task || !projectTasks
    ? []
    : projectTasks.data.filter(
        (candidate) => candidate.id !== task.id && !existingDependencyIds.has(candidate.id),
      );

  const handleSave = async () => {
    if (!taskId) return;
    setMutationError(null);
    try {
      await updateTask.mutateAsync({
        taskId,
        data: {
          title: editTaskForm.getValues('title'),
          description: editTaskForm.getValues('description'),
          priority: editTaskForm.getValues('priority') as Task['priority'],
          status: editTaskForm.getValues('status'),
          assigneeId: editTaskForm.getValues('assigneeId') || undefined,
          iterationId: editTaskForm.getValues('iterationId') || undefined,
          milestoneId: editTaskForm.getValues('milestoneId') || undefined,
          dueDate: editTaskForm.getValues('dueDate') || undefined,
          estimate: editTaskForm.getValues('estimate')
            ? parseFloat(editTaskForm.getValues('estimate'))
            : undefined,
          // Bug 专用字段
          severity: task?.type === 'bug' ? editTaskForm.getValues('severity') : undefined,
          bugReproducibility: task?.type === 'bug' ? editTaskForm.getValues('bugReproducibility') : undefined,
          bugEnvironment: task?.type === 'bug' ? editTaskForm.getValues('bugEnvironment') : undefined,
          bugExpectedResult: task?.type === 'bug' ? editTaskForm.getValues('bugExpectedResult') : undefined,
          bugActualResult: task?.type === 'bug' ? editTaskForm.getValues('bugActualResult') : undefined,
        },
      });
      setIsEditing(false);
    } catch (error) {
      setMutationError(t('task.detailDrawer.errors.saveFailed'));
    }
  };

  const handleAddDependency = async () => {
    if (!newDependencyTaskId || !taskId) return;
    setMutationError(null);
    try {
      await addDependency.mutateAsync({
        dependsOnTaskId: newDependencyTaskId,
        type: 'blocks',
      });
      setShowDependencyDialog(false);
      setNewDependencyTaskId('');
    } catch (error) {
      setMutationError(t('task.detailDrawer.errors.addDependencyFailed'));
    }
  };

  const handleDeleteTask = async () => {
    if (!taskId) return;
    setMutationError(null);
    try {
      await deleteTask.mutateAsync(taskId);
      setShowDeleteDialog(false);
      onClose();
    } catch (error) {
      setMutationError(t('task.detailDrawer.errors.deleteTaskFailed'));
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    setMutationError(null);
    try {
      await removeDependency.mutateAsync(dependencyId);
    } catch (error) {
      setMutationError(t('task.detailDrawer.errors.removeDependencyFailed'));
    }
  };

  const assigneeOptions = project?.members ?? [];

  if (!taskId) return null;

  return (
    <>
      <div
        className="flex h-full min-h-[520px] w-full max-w-[420px] flex-col rounded-lg border border-border bg-background motion-enter"
        data-ai-component="task.task-workspace.detail-panel"
        data-ai-role="panel"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold m-0">
            {t('task.detailDrawer.title')}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            data-ai-action="task.task-workspace.detail-panel.close.click"
            data-ai-role="jump"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4">
          {taskLoading ? (
            <div className="text-center p-8 text-muted-foreground">
              {t('task.detailDrawer.loading')}
            </div>
          ) : task ? (
            <div className="flex flex-col gap-6">
              {mutationError ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {mutationError}
                </div>
              ) : null}

              {/* Title */}
              <div>
                {isEditing ? (
                  <Form {...editTaskForm}>
                    <FormField
                      control={editTaskForm.control}
                      name="title"
                      render={({ field }) => (
                        <Input
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          className="text-lg font-semibold"
                        />
                      )}
                    />
                  </Form>
                ) : (
                  <h3 className="text-lg font-semibold m-0">
                    {task.title}
                  </h3>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Description
                </label>
                {isEditing ? (
                  <Form {...editTaskForm}>
                    <FormField
                      control={editTaskForm.control}
                      name="description"
                      render={({ field }) => (
                        <Textarea
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                          rows={4}
                          className="resize-y"
                        />
                      )}
                    />
                  </Form>
                ) : (
                  <p className="m-0 text-sm text-muted-foreground">
                    {task.description || t('task.detailDrawer.noDescription')}
                  </p>
                )}
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.status')}
                  </label>
                  {isEditing ? (
                    <Form {...editTaskForm}>
                      <FormField
                        control={editTaskForm.control}
                        name="status"
                        render={({ field }) => (
                          <NativeSelect
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            {statusOptions.map((opt) => (
                              <NativeSelectOption key={opt.value} value={opt.value}>
                                {opt.label}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        )}
                      />
                    </Form>
                  ) : (
                    <span className="inline-block px-2 py-1 text-sm rounded bg-muted text-foreground capitalize">
                      {task.status.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.priority')}
                  </label>
                  {isEditing ? (
                    <Form {...editTaskForm}>
                      <FormField
                        control={editTaskForm.control}
                        name="priority"
                        render={({ field }) => (
                          <NativeSelect
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            {priorityOptions.map((opt) => (
                              <NativeSelectOption key={opt.value} value={opt.value}>
                                {opt.label}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        )}
                      />
                    </Form>
                  ) : (
                    <span
                      className="inline-block px-2 py-1 text-sm rounded capitalize"
                      style={{
                        backgroundColor: `${priorityOptions.find((p) => p.value === task.priority)?.color || '#6b7280'}20`,
                        color: priorityOptions.find((p) => p.value === task.priority)?.color || '#6b7280',
                      }}
                    >
                      {task.priority}
                    </span>
                  )}
                </div>
              </div>

              {/* Assignee, Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.assignee')}
                  </label>
                  {isEditing ? (
                    <Form {...editTaskForm}>
                      <FormField
                        control={editTaskForm.control}
                        name="assigneeId"
                        render={({ field }) => (
                          <NativeSelect
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <NativeSelectOption value="">{t('task.detailDrawer.unassigned')}</NativeSelectOption>
                            {assigneeOptions.map((member) => (
                              <NativeSelectOption key={member.user.id} value={member.user.id}>
                                {member.user.displayName || member.user.username}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        )}
                      />
                    </Form>
                  ) : (
                    <div className="flex items-center gap-2">
                      {task.assignee ? (
                        <>
                          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground">
                            {task.assignee.displayName?.[0]?.toUpperCase() || '?'}
                          </div>
                          <span className="text-sm">
                            {task.assignee.displayName || task.assignee.username}
                          </span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {t('task.detailDrawer.unassigned')}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.dueDate')}
                  </label>
                  {isEditing ? (
                    <Form {...editTaskForm}>
                      <FormField
                        control={editTaskForm.control}
                        name="dueDate"
                        render={({ field }) => (
                          <Input
                            type="date"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          />
                        )}
                      />
                    </Form>
                  ) : (
                    <span className="text-sm">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : t('task.detailDrawer.noDueDate')}
                    </span>
                  )}
                </div>
              </div>

              {/* Iteration & Estimate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.iteration')}
                  </label>
                  {isEditing ? (
                    <Form {...editTaskForm}>
                      <FormField
                        control={editTaskForm.control}
                        name="iterationId"
                        render={({ field }) => (
                          <NativeSelect
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                          >
                            <NativeSelectOption value="">{t('task.detailDrawer.noIteration')}</NativeSelectOption>
                            {iterations.map((iteration) => (
                              <NativeSelectOption key={iteration.id} value={iteration.id}>
                                {iteration.name}
                              </NativeSelectOption>
                            ))}
                          </NativeSelect>
                        )}
                      />
                    </Form>
                  ) : (
                    <span className="text-sm">
                      {iterations.find((iteration) => iteration.id === task.iterationId)?.name || t('task.detailDrawer.noIteration')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.estimateHours')}
                  </label>
                  {isEditing ? (
                    <Form {...editTaskForm}>
                      <FormField
                        control={editTaskForm.control}
                        name="estimate"
                        render={({ field }) => (
                          <Input
                            type="number"
                            value={field.value}
                            onChange={(e) => field.onChange(e.target.value)}
                            placeholder="0"
                          />
                        )}
                      />
                    </Form>
                  ) : (
                    <span className="text-sm">
                      {task.estimate !== undefined ? `${task.estimate}h` : t('task.detailDrawer.noEstimate')}
                    </span>
                  )}
                </div>
              </div>

              {/* Milestone */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  {t('task.detailDrawer.milestone')}
                </label>
                {isEditing ? (
                  <Form {...editTaskForm}>
                    <FormField
                      control={editTaskForm.control}
                      name="milestoneId"
                      render={({ field }) => (
                        <NativeSelect
                          value={field.value}
                          onChange={(e) => field.onChange(e.target.value)}
                        >
                          <NativeSelectOption value="">{t('task.detailDrawer.noMilestone')}</NativeSelectOption>
                          {milestones.map((milestone) => (
                            <NativeSelectOption key={milestone.id} value={milestone.id}>
                              {milestone.name}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                      )}
                    />
                    </Form>
                  ) : (
                    <span className="text-sm">
                      {task.milestone?.name || t('task.detailDrawer.noMilestone')}
                    </span>
                  )}
              </div>

              {/* Bug 专用字段 */}
              {task.type === 'bug' && (
                <div className="space-y-4 rounded-md border border-red-200 bg-red-50/50 p-4">
                  <h4 className="text-sm font-semibold text-red-600 flex items-center gap-2">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {t('task.detailDrawer.bugInformation')}
                  </h4>

                  {/* Severity */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">{t('task.detailDrawer.severity')}</label>
                      {isEditing ? (
                        <Form {...editTaskForm}>
                          <FormField
                            control={editTaskForm.control}
                            name="severity"
                            render={({ field }) => (
                              <NativeSelect value={field.value} onChange={(e) => field.onChange(e.target.value)}>
                                {severityOptions.map((opt) => (
                                  <NativeSelectOption key={opt.value} value={opt.value}>{opt.label}</NativeSelectOption>
                                ))}
                              </NativeSelect>
                            )}
                          />
                        </Form>
                      ) : (
                        <span className="text-sm font-medium" style={{ color: severityOptions.find(s => s.value === task.severity)?.color }}>
                          {task.severity || 'medium'}
                        </span>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">{t('task.detailDrawer.environment')}</label>
                      {isEditing ? (
                        <Form {...editTaskForm}>
                          <FormField
                            control={editTaskForm.control}
                            name="bugEnvironment"
                            render={({ field }) => (
                              <Input value={field.value} onChange={(e) => field.onChange(e.target.value)} placeholder="e.g. Chrome 120" />
                            )}
                          />
                        </Form>
                      ) : (
                        <span className="text-sm">{task.bugEnvironment || '-'}</span>
                      )}
                    </div>
                  </div>

                  {/* Expected vs Actual */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">{t('task.detailDrawer.expectedResult')}</label>
                      {isEditing ? (
                        <Form {...editTaskForm}>
                          <FormField
                            control={editTaskForm.control}
                            name="bugExpectedResult"
                            render={({ field }) => (
                              <Textarea value={field.value} onChange={(e) => field.onChange(e.target.value)} rows={2} />
                            )}
                          />
                        </Form>
                      ) : (
                        <p className="text-sm text-muted-foreground">{task.bugExpectedResult || '-'}</p>
                      )}
                    </div>

                    <div>
                      <label className="text-xs font-medium text-muted-foreground block mb-1">{t('task.detailDrawer.actualResult')}</label>
                      {isEditing ? (
                        <Form {...editTaskForm}>
                          <FormField
                            control={editTaskForm.control}
                            name="bugActualResult"
                            render={({ field }) => (
                              <Textarea value={field.value} onChange={(e) => field.onChange(e.target.value)} rows={2} />
                            )}
                          />
                        </Form>
                      ) : (
                        <p className="text-sm text-muted-foreground">{task.bugActualResult || '-'}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* 待办事项 */}
              {task.todoItems && task.todoItems.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-2">
                    {t('task.detailDrawer.todoItems')} ({task.todoItems.filter(t => t.completed).length}/{task.todoItems.length})
                  </label>
                  <div className="space-y-2">
                    {task.todoItems.map((item) => (
                      <div key={item.id} className="flex items-start gap-2">
                        <div className={cn(
                          'w-4 h-4 rounded border mt-0.5',
                          item.completed ? 'bg-green-500 border-green-500' : 'border-muted-foreground'
                        )}>
                          {item.completed && (
                            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className={cn('text-sm', item.completed && 'line-through text-muted-foreground')}>
                          {item.content}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Dependencies */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground block">
                    {t('task.detailDrawer.dependencies')}
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDependencyDialog(true)}
                    disabled={dependencyOptions.length === 0}
                  >
                    {t('task.detailDrawer.add')}
                  </Button>
                </div>

                {task.dependencies && task.dependencies.length > 0 ? (
                  <div className="flex flex-col gap-1">
                    {task.dependencies.map((dep) => (
                      <div
                        key={dep.id}
                        className="flex items-center justify-between p-2 bg-muted rounded-md"
                      >
                        <span className="text-sm">
                          {dep.dependsOnTask?.title || dep.dependsOnTaskId}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDependency(dep.id)}
                          disabled={removeDependency.isPending}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                          </svg>
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t('task.detailDrawer.noDependencies')}
                  </span>
                )}
              </div>

              {/* Blocked By */}
              {task.blockedBy && task.blockedBy.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.blockedBy')}
                  </label>
                  <div className="flex flex-col gap-1">
                    {task.blockedBy.map((dep) => (
                      <div
                        key={dep.id}
                        className="p-2 rounded-md border-l-4 bg-destructive/10 border-l-destructive"
                      >
                        <span className="text-sm">
                          {dep.task?.title || dep.taskId}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  {t('task.detailDrawer.tags')}
                </label>
                {task.taskTags && task.taskTags.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {task.taskTags.map(({ tag }) => (
                      <span
                        key={tag.id}
                        className="inline-block px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: tag.color ? `${tag.color}20` : 'hsl(var(--muted))',
                          color: tag.color || 'hsl(var(--foreground))',
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {t('task.detailDrawer.noTags')}
                  </span>
                )}
              </div>

              {/* Reporter */}
              {task.reporter && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.reporter')}
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-semibold text-foreground">
                      {task.reporter.displayName?.[0]?.toUpperCase() || '?'}
                    </div>
                    <span className="text-sm">
                      {task.reporter.displayName || task.reporter.username}
                    </span>
                  </div>
                </div>
              )}

              {/* AI Assignment */}
              {task.assigneeType === 'ai_agent' && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.aiAssignment')}
                  </label>
                  <div className="flex items-center gap-2">
                    <AiAgentBadge agentName={task.aiAgentId} size="md" />
                    {task.aiExecutionStatus && (
                      <AiExecutionIndicator status={task.aiExecutionStatus} />
                    )}
                  </div>
                </div>
              )}

              {/* AI Suggestion */}
              {task.aiSuggestion && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.aiSuggestion')}
                  </label>
                  <AiSuggestionCard suggestion={task.aiSuggestion} />
                </div>
              )}

              {/* AI Execution Result */}
              {task.aiExecutionResult && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    {t('task.detailDrawer.aiExecutionResult')}
                  </label>
                  <pre className="rounded-lg bg-muted/50 p-3 text-xs text-foreground overflow-auto max-h-48 whitespace-pre-wrap">
                    {typeof task.aiExecutionResult === 'string'
                      ? task.aiExecutionResult
                      : JSON.stringify(task.aiExecutionResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Tabbed Section: Execution, Approvals, AI Suggestion, Discussion, Documents */}
              <Tabs defaultValue="execution" className="mt-4">
                <TabsList variant="line" className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                  <TabsTrigger value="execution" className="text-xs data-[active]:border-b-2 data-[active]:border-primary data-[active]:bg-transparent rounded-none px-2 py-1.5">
                    <Activity className="mr-1 h-3 w-3" />
                    {t('task.detailDrawer.execution')}
                  </TabsTrigger>
                  <TabsTrigger value="approvals" className="text-xs data-[active]:border-b-2 data-[active]:border-primary data-[active]:bg-transparent rounded-none px-2 py-1.5">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {t('task.detailDrawer.approvals')}
                  </TabsTrigger>
                  <TabsTrigger value="documents" className="text-xs data-[active]:border-b-2 data-[active]:border-primary data-[active]:bg-transparent rounded-none px-2 py-1.5">
                    <FileText className="mr-1 h-3 w-3" />
                    关联文档
                  </TabsTrigger>
                  <TabsTrigger value="ai-suggestion" className="text-xs data-[active]:border-b-2 data-[active]:border-primary data-[active]:bg-transparent rounded-none px-2 py-1.5">
                    <Bot className="mr-1 h-3 w-3" />
                    {t('task.detailDrawer.aiSuggestion')}
                  </TabsTrigger>
                  <TabsTrigger value="discussion" className="text-xs data-[active]:border-b-2 data-[active]:border-primary data-[active]:bg-transparent rounded-none px-2 py-1.5">
                    <Activity className="mr-1 h-3 w-3" />
                    {t('task.detailDrawer.discussion')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="execution" className="mt-3">
                  <TaskExecutionContent taskId={taskId} />
                </TabsContent>

                <TabsContent value="approvals" className="mt-3">
                  <TaskApprovalsContent taskId={taskId} />
                </TabsContent>

                <TabsContent value="documents" className="mt-3">
                  <TaskDocumentsContent taskId={taskId} />
                </TabsContent>

                <TabsContent value="ai-suggestion" className="mt-3">
                  <TaskAiSuggestionContent task={task} />
                </TabsContent>

                <TabsContent value="discussion" className="mt-3">
                  <TaskDiscussionContent activities={activities} />
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </ScrollArea>

        <div className="flex justify-between gap-2 p-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              disabled={deleteTask.isPending || taskLoading}
            >
              {t('task.detailDrawer.delete')}
            </Button>
            {task?.assigneeType !== 'ai_agent' && (
              <Button
                variant="outline"
                onClick={() => setShowAiAssignDialog(true)}
                disabled={taskLoading || !task}
              >
                <Bot size={14} className="mr-1 text-accent-purple" />
                {t('task.detailDrawer.assignToAi')}
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                {t('task.detailDrawer.cancel')}
              </Button>
              <Button onClick={handleSave} disabled={updateTask.isPending}>
                {updateTask.isPending ? t('task.detailDrawer.saving') : t('task.detailDrawer.save')}
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => {
                if (task) {
                  editTaskForm.reset(toEditForm(task));
                }
                setIsEditing(true);
              }}
            >
              {t('task.detailDrawer.editTask')}
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('task.detailDrawer.addDependency')}</DialogTitle>
            <DialogDescription>
              {t('task.detailDrawer.selectDependencyTask')}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select
              value={newDependencyTaskId || '__none__'}
              onValueChange={(value) => setNewDependencyTaskId(value === '__none__' ? '' : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('task.detailDrawer.selectTask')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">{t('task.detailDrawer.selectTask')}</SelectItem>
                {dependencyOptions.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDependencyDialog(false)}
            >
              {t('task.detailDrawer.cancel')}
            </Button>
            <Button
              onClick={handleAddDependency}
              disabled={!newDependencyTaskId || addDependency.isPending}
            >
              {addDependency.isPending ? t('task.detailDrawer.saving') : t('task.detailDrawer.addDependency')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('task.detailDrawer.deleteTask')}</DialogTitle>
            <DialogDescription>
              {t('task.detailDrawer.deleteTaskWarning')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
            >
              {t('task.detailDrawer.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTask}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? t('task.detailDrawer.saving') : t('task.detailDrawer.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {task && (
        <AiAssignDialog
          open={showAiAssignDialog}
          onOpenChange={setShowAiAssignDialog}
          taskId={task.id}
          projectId={task.projectId}
          taskTitle={task.title}
        />
      )}
    </>
  );
}

// Tab Content Components
function TaskExecutionContent({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const { data: executions } = useQuery({
    queryKey: ['taskExecutions', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const response = await fetch(`/_api/tasks/${taskId}/execution-runs`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  if (!executions || executions.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        {t('task.detailDrawer.noExecutionRuns')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((exec: any) => (
        <div key={exec.id} className="rounded-md border p-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{exec.agentName || t('task.detailDrawer.aiAgent')}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              exec.status === 'completed' ? 'bg-green-100 text-green-700' :
              exec.status === 'failed' ? 'bg-red-100 text-red-700' :
              exec.status === 'running' ? 'bg-blue-100 text-blue-700' :
              'bg-muted text-muted-foreground'
            }`}>
              {exec.status}
            </span>
          </div>
          {exec.startedAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(exec.startedAt).toLocaleString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function TaskApprovalsContent({ taskId }: { taskId: string }) {
  const { t } = useTranslation();
  const { data: approvals } = useQuery({
    queryKey: ['taskApprovals', taskId],
    enabled: !!taskId,
    queryFn: async () => {
      const response = await fetch(`/_api/tasks/${taskId}/approvals`);
      if (!response.ok) return [];
      return response.json();
    },
  });

  if (!approvals || approvals.length === 0) {
    return (
      <div className="text-center py-4 text-sm text-muted-foreground">
        {t('task.detailDrawer.noApprovalRequests')}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {approvals.map((approval: any) => (
        <div key={approval.id} className="rounded-md border p-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">{approval.action || t('task.detailDrawer.pendingApproval')}</span>
            <span className={`text-xs px-2 py-0.5 rounded ${
              approval.status === 'approved' ? 'bg-green-100 text-green-700' :
              approval.status === 'rejected' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>
              {approval.status}
            </span>
          </div>
          {approval.createdAt && (
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(approval.createdAt).toLocaleString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

function TaskAiSuggestionContent({ task }: { task: any }) {
  const { t } = useTranslation();
  if (!task?.aiSuggestion) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">{t('task.detailDrawer.noAiSuggestion')}</p>
        <Button variant="outline" size="sm">
          <Bot className="mr-1 h-3 w-3" />
          {t('task.detailDrawer.requestAiSuggestion')}
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-l-4 border-l-accent-purple bg-accent-purple/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Bot className="h-4 w-4 text-accent-purple" />
        <span className="text-sm font-medium">{t('task.detailDrawer.aiSuggestion')}</span>
      </div>
      <pre className="text-xs whitespace-pre-wrap">
        {typeof task.aiSuggestion === 'string'
          ? task.aiSuggestion
          : JSON.stringify(task.aiSuggestion, null, 2)}
      </pre>
    </div>
  );
}

function TaskDiscussionContent({ activities }: { activities: any[] | undefined }) {
  const { t } = useTranslation();
  const [newComment, setNewComment] = useState('');

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">{t('task.detailDrawer.noDiscussion')}</p>
        <textarea
          className="w-full rounded-md border p-2 text-sm"
          placeholder={t('task.detailDrawer.addComment')}
          rows={2}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button size="sm" className="mt-2 w-full" disabled={!newComment.trim()}>
          {t('task.detailDrawer.send')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.slice(0, 10).map((activity) => (
        <div key={activity.id} className="flex gap-2">
          <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
            {activity.actorId?.[0]?.toUpperCase() || '?'}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium">{activity.actorId || 'System'}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(activity.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{activity.summary || activity.type}</p>
          </div>
        </div>
      ))}
      <div className="pt-2 border-t">
        <textarea
          className="w-full rounded-md border p-2 text-sm"
          placeholder={t('task.detailDrawer.addComment')}
          rows={2}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button size="sm" className="mt-2" disabled={!newComment.trim()}>
          {t('task.detailDrawer.send')}
        </Button>
      </div>
    </div>
  );
}

export { TaskDetailDrawer as TaskDetailPanel };

function TaskDocumentsContent({ taskId }: { taskId: string }) {
  const { data: links = [], isLoading } = useTaskDocumentLinks(taskId);
  if (isLoading) {
    return <div className="text-xs text-muted-foreground">加载中…</div>;
  }
  if (links.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/20 p-4 text-center text-xs text-muted-foreground">
        暂无关联文档。在文档详情页的"关联任务"面板可添加。
      </div>
    );
  }
  return (
    <ul className="space-y-1">
      {links.map((link) => (
        <li key={link.id}>
          <Link
            to={`/app/documents/${link.documentId}`}
            className="flex items-center justify-between gap-2 rounded-md border border-border bg-background p-2 transition-colors hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-foreground">
                {link.document?.title || `文档 ${link.documentId}`}
              </div>
              {link.section && (
                <div className="truncate text-[11px] text-muted-foreground">
                  段落: {link.section.title}
                </div>
              )}
            </div>
            <span
              className={cn(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                LINK_TYPE_COLORS[link.linkType] || 'bg-muted text-muted-foreground',
              )}
            >
              {LINK_TYPE_LABELS[link.linkType] || link.linkType}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
