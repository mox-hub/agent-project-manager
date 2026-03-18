import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
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

export function TaskDetailDrawer({ taskId, onClose }: TaskDetailDrawerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showDependencyDialog, setShowDependencyDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newDependencyTaskId, setNewDependencyTaskId] = useState('');
  const [mutationError, setMutationError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<{
    title: string;
    description: string;
    priority: string;
    status: string;
    assigneeId: string;
    iterationId: string;
    dueDate: string;
    estimate: string;
  }>({
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
    assigneeId: '',
    iterationId: '',
    dueDate: '',
    estimate: '',
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
          title: editForm.title,
          description: editForm.description,
          priority: editForm.priority as Task['priority'],
          status: editForm.status,
          assigneeId: editForm.assigneeId || undefined,
          iterationId: editForm.iterationId || undefined,
          dueDate: editForm.dueDate || undefined,
          estimate: editForm.estimate ? parseFloat(editForm.estimate) : undefined,
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
        className="flex h-full min-h-[520px] w-full max-w-[420px] flex-col rounded-xl border border-content-border bg-content-bg motion-enter"
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
                  <Input
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="text-lg font-semibold"
                  />
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
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={4}
                    className="resize-y"
                  />
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
                    <NativeSelect
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    >
                      {statusOptions.map((opt) => (
                        <NativeSelectOption key={opt.value} value={opt.value}>
                          {opt.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
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
                    <NativeSelect
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    >
                      {priorityOptions.map((opt) => (
                        <NativeSelectOption key={opt.value} value={opt.value}>
                          {opt.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
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
                    <NativeSelect
                      value={editForm.assigneeId}
                      onChange={(e) => setEditForm({ ...editForm, assigneeId: e.target.value })}
                    >
                      <NativeSelectOption value="">Unassigned</NativeSelectOption>
                      {assigneeOptions.map((member) => (
                        <NativeSelectOption key={member.user.id} value={member.user.id}>
                          {member.user.displayName || member.user.username}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
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
                    <Input
                      type="date"
                      value={editForm.dueDate}
                      onChange={(e) => setEditForm({ ...editForm, dueDate: e.target.value })}
                    />
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
                    <NativeSelect
                      value={editForm.iterationId}
                      onChange={(e) => setEditForm({ ...editForm, iterationId: e.target.value })}
                    >
                      <NativeSelectOption value="">No iteration</NativeSelectOption>
                      {iterations.map((iteration) => (
                        <NativeSelectOption key={iteration.id} value={iteration.id}>
                          {iteration.name}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
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
                    <Input
                      type="number"
                      value={editForm.estimate}
                      onChange={(e) => setEditForm({ ...editForm, estimate: e.target.value })}
                      placeholder="0"
                    />
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

              {/* Activity Timeline */}
              <div>
                <label className="text-sm font-medium text-muted-foreground block mb-1">
                  Activity
                </label>
                {activities && activities.length > 0 ? (
                  <div className="flex flex-col gap-2">
                    {activities.slice(0, 10).map((activity) => (
                      <div
                        key={activity.id}
                        className="flex gap-2 text-xs"
                      >
                        <div className="w-2 h-2 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        <div>
                          <span className="text-muted-foreground">{activity.summary}</span>
                          <span className="text-muted-foreground/70 ml-1">
                            {new Date(activity.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No activity yet
                  </span>
                )}
              </div>
            </div>
          ) : null}
        </ScrollArea>

        <div className="flex justify-between gap-2 p-4 border-t">
          <Button
            variant="destructive"
            onClick={() => setShowDeleteDialog(true)}
            disabled={deleteTask.isPending || taskLoading}
          >
            Delete
          </Button>

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
                  setEditForm(toEditForm(task));
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
            <NativeSelect
              value={newDependencyTaskId}
              onChange={(e) => setNewDependencyTaskId(e.target.value)}
            >
              <NativeSelectOption value="">Select a task</NativeSelectOption>
              {dependencyOptions.map((candidate) => (
                <NativeSelectOption key={candidate.id} value={candidate.id}>
                  {candidate.title}
                </NativeSelectOption>
              ))}
            </NativeSelect>
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
    </>
  );
}

export { TaskDetailDrawer as TaskDetailPanel };
