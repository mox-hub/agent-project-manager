import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Activity, Bot, CheckCircle, XCircle } from 'lucide-react';
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
} from '../hooks/use-project-tasks';
import { AiAgentBadge } from '@/shared/components/ai-agent-badge';
import { AiExecutionIndicator } from '@/shared/components/ai-execution-indicator';
import { AiSuggestionCard } from '@/shared/components/ai-suggestion-card';
import { AiAssignDialog } from './ai-assign-dialog';

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
    dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
    estimate: task.estimate?.toString() || '',
  };
}

type TaskEditForm = ReturnType<typeof toEditForm>;

export function TaskDetailDrawer({ taskId, onClose }: TaskDetailDrawerProps) {
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
      dueDate: '',
      estimate: '',
    },
  });

  const { data: task, isLoading: taskLoading } = useTaskDetail(taskId || undefined);
  const { data: activities } = useTaskActivities(taskId || undefined);
  const { data: project } = useProjectDetail(task?.projectId);
  const { data: iterations = [] } = useQuery({
    queryKey: ['taskDetailIterations', task?.projectId],
    enabled: !!task?.projectId,
    queryFn: async () => {
      if (!task?.projectId) {
        return [];
      }
      const response = await taskApi.getProjectIterations(task.projectId);
      return response.data;
    },
  });
  const { data: projectTasks } = useProjectTasks(task?.projectId, { pageSize: 200 });

  const updateTask = useUpdateTask();
  const addDependency = useAddTaskDependency(taskId || undefined);
  const removeDependency = useRemoveTaskDependency(taskId || undefined, task?.projectId);
  const deleteTask = useDeleteTask();

  const existingDependencyIds = new Set(
    (task?.dependencies ?? []).map((dependency) => dependency.dependsOnTaskId),
  );
  const dependencyOptions = !task || !projectTasks?.data
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
          dueDate: editTaskForm.getValues('dueDate') || undefined,
          estimate: editTaskForm.getValues('estimate')
            ? parseFloat(editTaskForm.getValues('estimate'))
            : undefined,
        },
      });
      setIsEditing(false);
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : 'Failed to save task changes.',
      );
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
      setMutationError(
        error instanceof Error ? error.message : 'Failed to add dependency.',
      );
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
      setMutationError(
        error instanceof Error ? error.message : 'Failed to delete task.',
      );
    }
  };

  const handleRemoveDependency = async (dependencyId: string) => {
    setMutationError(null);
    try {
      await removeDependency.mutateAsync(dependencyId);
    } catch (error) {
      setMutationError(
        error instanceof Error ? error.message : 'Failed to remove dependency.',
      );
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
            Task Details
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
              Loading...
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
                    {task.description || 'No description'}
                  </p>
                )}
              </div>

              {/* Status & Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Status
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
                    Priority
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
                    Assignee
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
                            <NativeSelectOption value="">Unassigned</NativeSelectOption>
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
                          Unassigned
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Due Date
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
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                    </span>
                  )}
                </div>
              </div>

              {/* Iteration & Estimate */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Iteration
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
                            <NativeSelectOption value="">No iteration</NativeSelectOption>
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
                      {iterations.find((iteration) => iteration.id === task.iterationId)?.name || 'No iteration'}
                    </span>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Estimate (hours)
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
                      {task.estimate !== undefined ? `${task.estimate}h` : 'No estimate'}
                    </span>
                  )}
                </div>
              </div>

              {/* Dependencies */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-muted-foreground block">
                    Dependencies
                  </label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowDependencyDialog(true)}
                    disabled={dependencyOptions.length === 0}
                  >
                    Add
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
                    No dependencies
                  </span>
                )}
              </div>

              {/* Blocked By */}
              {task.blockedBy && task.blockedBy.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Blocked By
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
                  Tags
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
                    No tags
                  </span>
                )}
              </div>

              {/* Reporter */}
              {task.reporter && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    Reporter
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
                    AI Assignment
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
                    AI Suggestion
                  </label>
                  <AiSuggestionCard suggestion={task.aiSuggestion} />
                </div>
              )}

              {/* AI Execution Result */}
              {task.aiExecutionResult && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground block mb-1">
                    AI Execution Result
                  </label>
                  <pre className="rounded-lg bg-muted/50 p-3 text-xs text-foreground overflow-auto max-h-48 whitespace-pre-wrap">
                    {typeof task.aiExecutionResult === 'string'
                      ? task.aiExecutionResult
                      : JSON.stringify(task.aiExecutionResult, null, 2)}
                  </pre>
                </div>
              )}

              {/* Tabbed Section: Execution, Approvals, AI Suggestion, Discussion */}
              <Tabs defaultValue="execution" className="mt-4">
                <TabsList variant="line" className="w-full justify-start border-b rounded-none bg-transparent p-0 h-auto">
                  <TabsTrigger value="execution" className="text-xs data-[active]:border-b-2 data-[active]:border-primary data-[active]:bg-transparent rounded-none px-2 py-1.5">
                    <Activity className="mr-1 h-3 w-3" />
                    Execution
                  </TabsTrigger>
                  <TabsTrigger value="approvals" className="text-xs data-[active]:border-b-2 data-[active]:border-primary data-[active]:bg-transparent rounded-none px-2 py-1.5">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Approvals
                  </TabsTrigger>
                  <TabsTrigger value="ai-suggestion" className="text-xs data-[active]:border-b-2 data-[active]:border-primary data-[active]:bg-transparent rounded-none px-2 py-1.5">
                    <Bot className="mr-1 h-3 w-3" />
                    AI Suggestion
                  </TabsTrigger>
                  <TabsTrigger value="discussion" className="text-xs data-[active]:border-b-2 data-[active]:border-primary data-[active]:bg-transparent rounded-none px-2 py-1.5">
                    <Activity className="mr-1 h-3 w-3" />
                    Discussion
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="execution" className="mt-3">
                  <TaskExecutionContent taskId={taskId} />
                </TabsContent>

                <TabsContent value="approvals" className="mt-3">
                  <TaskApprovalsContent taskId={taskId} />
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
              Delete
            </Button>
            {task?.assigneeType !== 'ai_agent' && (
              <Button
                variant="outline"
                onClick={() => setShowAiAssignDialog(true)}
                disabled={taskLoading || !task}
              >
                <Bot size={14} className="mr-1 text-accent-purple" />
                Assign to AI
              </Button>
            )}
          </div>

          {isEditing ? (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={updateTask.isPending}>
                {updateTask.isPending ? 'Saving...' : 'Save'}
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
              Edit Task
            </Button>
          )}
        </div>
      </div>

      <Dialog open={showDependencyDialog} onOpenChange={setShowDependencyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Dependency</DialogTitle>
            <DialogDescription>
              选择一个当前任务所依赖的任务。
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Select
              value={newDependencyTaskId || '__none__'}
              onValueChange={(value) => setNewDependencyTaskId(value === '__none__' ? '' : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a task" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Select a task</SelectItem>
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
              Cancel
            </Button>
            <Button
              onClick={handleAddDependency}
              disabled={!newDependencyTaskId || addDependency.isPending}
            >
              {addDependency.isPending ? 'Adding...' : 'Add Dependency'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Task</DialogTitle>
            <DialogDescription>
              删除后不可恢复，相关依赖关系也会被移除。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteTask}
              disabled={deleteTask.isPending}
            >
              {deleteTask.isPending ? 'Deleting...' : 'Delete Task'}
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
        No execution runs yet
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {executions.map((exec: any) => (
        <div key={exec.id} className="rounded-md border p-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{exec.agentName || 'AI Agent'}</span>
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
        No approval requests
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {approvals.map((approval: any) => (
        <div key={approval.id} className="rounded-md border p-2">
          <div className="flex items-center justify-between">
            <span className="text-sm">{approval.action || 'Pending approval'}</span>
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
  if (!task?.aiSuggestion) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">No AI suggestion yet</p>
        <Button variant="outline" size="sm">
          <Bot className="mr-1 h-3 w-3" />
          Request AI Suggestion
        </Button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border-l-4 border-l-accent-purple bg-accent-purple/5 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Bot className="h-4 w-4 text-accent-purple" />
        <span className="text-sm font-medium">AI Suggestion</span>
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
  const [newComment, setNewComment] = useState('');

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-muted-foreground mb-3">No discussion yet</p>
        <textarea
          className="w-full rounded-md border p-2 text-sm"
          placeholder="Add a comment..."
          rows={2}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button size="sm" className="mt-2 w-full" disabled={!newComment.trim()}>
          Send
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
          placeholder="Add a comment..."
          rows={2}
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button size="sm" className="mt-2" disabled={!newComment.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
}

export { TaskDetailDrawer as TaskDetailPanel };
