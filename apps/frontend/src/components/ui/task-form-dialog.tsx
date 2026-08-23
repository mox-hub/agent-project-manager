/**
 * TaskFormDialog - 全局任务创建/编辑弹窗组件
 */

import { useState, useEffect } from 'react';
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard';
import { useForm } from 'react-hook-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NumberField,
  NumberFieldDecrement,
  NumberFieldGroup,
  NumberFieldIncrement,
  NumberFieldInput,
} from '@/components/ui/number-field';
import { Label } from '@/components/ui/label';
import { Form, FormField } from '@/components/ui/form';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useCreateTask, useUpdateTask } from '@/modules/task/hooks/use-project-tasks';
import { MentionTextarea } from '@/modules/team-member/components/mention-textarea';
import { cn } from '@/lib/utils';
import {
  AlertCircle, Check, Calendar, Flag, Tag, FolderOpen,
  Copy, Maximize2, X, ChevronRight
} from 'lucide-react';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  projectId: string;
  assigneeId: string;
  dueDate: string;
  estimate: string;
  labels: string[];
}

export interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  projectId?: string;
  taskId?: string;
  initialData?: Partial<TaskFormData>;
  onSuccess?: (taskId: string) => void;
}

const PRIORITY_OPTIONS: { value: TaskPriority; label: string; color: string; bgColor: string }[] = [
  { value: 'low', label: 'Low', color: '#22c55e', bgColor: 'bg-green-500' },
  { value: 'medium', label: 'Medium', color: '#eab308', bgColor: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: '#f97316', bgColor: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: '#ef4444', bgColor: 'bg-red-500' },
];

const STATUS_OPTIONS: { value: TaskStatus; label: string; color: string }[] = [
  { value: 'todo', label: 'To Do', color: 'text-slate-500' },
  { value: 'in_progress', label: 'In Progress', color: 'text-blue-500' },
  { value: 'in_review', label: 'In Review', color: 'text-amber-500' },
  { value: 'done', label: 'Done', color: 'text-emerald-500' },
  { value: 'canceled', label: 'Canceled', color: 'text-slate-400' },
];

const LABEL_OPTIONS = [
  { value: 'feature', label: 'Feature', color: '#3B82F6' },
  { value: 'bug', label: 'Bug', color: '#EF4444' },
  { value: 'enhancement', label: 'Enhancement', color: '#8B5CF6' },
  { value: 'frontend', label: 'Frontend', color: '#06B6D4' },
  { value: 'backend', label: 'Backend', color: '#10B981' },
  { value: 'ai', label: 'AI', color: '#F59E0B' },
  { value: 'docs', label: 'Documentation', color: '#6B7280' },
  { value: 'refactor', label: 'Refactor', color: '#EC4899' },
];

const DEFAULT_FORM_DATA: TaskFormData = {
  title: '',
  description: '',
  priority: 'medium',
  status: 'todo',
  projectId: '',
  assigneeId: '',
  dueDate: '',
  estimate: '',
  labels: [],
};

export function TaskFormDialog({
  open,
  onOpenChange,
  mode,
  projectId,
  initialData,
  onSuccess,
}: TaskFormDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [selectedLabels, setSelectedLabels] = useState<string[]>(initialData?.labels || []);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: projectsResponse } = useProjectList();
  const projects = projectsResponse?.items ?? [];
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();

  const form = useForm<TaskFormData>({
    defaultValues: {
      ...DEFAULT_FORM_DATA,
      ...initialData,
      projectId: initialData?.projectId || projectId || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        ...DEFAULT_FORM_DATA,
        ...initialData,
        projectId: initialData?.projectId || projectId || '',
      });
      setSelectedLabels(initialData?.labels || []);
      setError(null);
      setIsFullscreen(false);
    }
  }, [open, initialData, projectId, form]);

  const toggleLabel = (labelValue: string) => {
    setSelectedLabels((prev) =>
      prev.includes(labelValue)
        ? prev.filter((l) => l !== labelValue)
        : [...prev, labelValue]
    );
  };

  const { copyToClipboard } = useCopyToClipboard();

  const handleCopyToClipboard = () => {
    const data = form.getValues();
    const text = `
Title: ${data.title}
Project: ${projects.find(p => p.id === data.projectId)?.name || data.projectId}
Status: ${STATUS_OPTIONS.find(s => s.value === data.status)?.label}
Priority: ${PRIORITY_OPTIONS.find(p => p.value === data.priority)?.label}
Due Date: ${data.dueDate || 'Not set'}
Estimate: ${data.estimate || '0'}h
Labels: ${selectedLabels.join(', ') || 'None'}

Description:
${data.description || 'No description'}
    `.trim();

    copyToClipboard(text);
  };

  const handleSubmit = async (data: TaskFormData) => {
    setError(null);

    try {
      const apiPriority = (data.priority === 'urgent' ? 'critical' : data.priority) as import('@/modules/task/api/task-api').TaskPriority;
      if (mode === 'create') {
        const result = await createTask.mutateAsync({
          projectId: data.projectId,
          title: data.title,
          description: data.description,
          priority: apiPriority,
          status: data.status,
        });

        if (result?.id) {
          onSuccess?.(result.id);
        }
      } else {
        const taskId = initialData && 'id' in initialData ? String(initialData.id) : undefined;
        if (taskId) {
          await updateTask.mutateAsync({
            taskId,
            data: {
              title: data.title,
              description: data.description,
              priority: apiPriority,
              status: data.status,
              dueDate: data.dueDate || undefined,
            },
          });
        }
      }

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    }
  };

  const isLoading = createTask.isPending || updateTask.isPending;
  const selectedPriority = form.watch('priority');
  const selectedStatus = form.watch('status');

  const priorityConfig = PRIORITY_OPTIONS.find(p => p.value === selectedPriority) || PRIORITY_OPTIONS[1];
  const statusConfig = STATUS_OPTIONS.find(s => s.value === selectedStatus) || STATUS_OPTIONS[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        keepDefaultWidth={false}
        className={cn(
          'flex flex-col p-0 overflow-hidden transition-all duration-300',
          isFullscreen ? 'max-w-dialog w-dialog h-dialog-screen' : 'max-w-5xl w-dialog-wide max-h-dialog-full'
        )}
      >
        {/* Header */}
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-3 h-10 rounded-full', priorityConfig.bgColor)} />
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {mode === 'create' ? 'Create New Task' : 'Edit Task'}
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  {mode === 'create'
                    ? 'Fill in the details to create a new task'
                    : 'Update the task details below'}
                </DialogDescription>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopyToClipboard}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Copy to clipboard"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              >
                <Maximize2 className={cn('h-4 w-4', isFullscreen && 'rotate-180')} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {/* Body - Two Column Layout */}
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="flex-1 overflow-hidden flex flex-col"
          >
            <div className={cn(
              'flex-1 overflow-y-auto px-6 py-5 transition-all duration-300',
              isFullscreen ? 'grid grid-cols-[1fr_380px] gap-6' : 'grid grid-cols-[1fr_320px] gap-5'
            )}>
              {/* Left Column - Main Content */}
              <div className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Title */}
                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: 'Title is required' }}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium flex items-center gap-1.5">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="Enter task title"
                        className="h-11 text-base"
                        {...field}
                      />
                    </div>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">Description</Label>
                      <MentionTextarea
                        value={field.value ?? ''}
                        onChange={field.onChange}
                        placeholder="Add a detailed description... 输入 @ 可提及成员"
                        rows={isFullscreen ? 10 : 6}
                      />
                    </div>
                  )}
                />

                {/* Labels */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                    Labels
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {LABEL_OPTIONS.map((label) => (
                      <button
                        key={label.value}
                        type="button"
                        onClick={() => toggleLabel(label.value)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                          selectedLabels.includes(label.value)
                            ? 'ring-2 ring-offset-1'
                            : 'opacity-70 hover:opacity-100'
                        )}
                        style={{
                          backgroundColor: `${label.color}20`,
                          color: label.color,
                          ...(selectedLabels.includes(label.value)
                            ? { ringColor: label.color }
                            : {}),
                        }}
                      >
                        {selectedLabels.includes(label.value) && (
                          <Check className="h-3 w-3" />
                        )}
                        {label.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column - Metadata Sidebar */}
              <div className="space-y-5 bg-muted/30 rounded-xl p-4 border border-border/50">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <ChevronRight className="h-4 w-4" />
                  Task Properties
                </div>

                {/* Project */}
                <FormField
                  control={form.control}
                  name="projectId"
                  rules={{ required: 'Project is required' }}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="projectId" className="text-sm font-medium flex items-center gap-1.5">
                        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                        Project <span className="text-destructive">*</span>
                      </Label>
                      <NativeSelect
                        id="projectId"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-9"
                      >
                        <NativeSelectOption value="">Select project</NativeSelectOption>
                        {projects.map((project) => (
                          <NativeSelectOption key={project.id} value={project.id}>
                            {project.name}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  )}
                />

                {/* Status */}
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium flex items-center gap-1.5">
                        <div className={cn('w-2 h-2 rounded-full', statusConfig.color.replace('text-', 'bg-'))} />
                        Status
                      </Label>
                      <NativeSelect
                        id="status"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-9"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <NativeSelectOption key={opt.value} value={opt.value}>
                            {opt.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  )}
                />

                {/* Priority */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                    Priority
                  </Label>
                  <div className="grid grid-cols-4 gap-1">
                    {PRIORITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => form.setValue('priority', opt.value)}
                        className={cn(
                          'flex flex-col items-center justify-center p-2 rounded-md border text-xs font-medium transition-all gap-1',
                          selectedPriority === opt.value
                            ? 'border-2'
                            : 'border-border hover:border-muted-foreground/50'
                        )}
                        style={{
                          borderColor: selectedPriority === opt.value ? opt.color : undefined,
                          backgroundColor: selectedPriority === opt.value ? `${opt.color}15` : undefined,
                        }}
                      >
                        <div className={cn('w-2 h-2 rounded-full', opt.bgColor)} />
                        <span style={{ color: selectedPriority === opt.value ? opt.color : undefined, fontSize: '10px' }}>
                          {opt.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Due Date */}
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        Due Date
                      </Label>
                      <Input
                        id="dueDate"
                        type="date"
                        className="h-9"
                        {...field}
                      />
                    </div>
                  )}
                />

                {/* Estimate */}
                <FormField
                  control={form.control}
                  name="estimate"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="estimate" className="text-sm font-medium">
                        Estimate <span className="text-muted-foreground font-normal">(hours)</span>
                      </Label>
                      <NumberField
                        id="estimate"
                        min={0}
                        step={0.5}
                        value={field.value === '' || field.value == null ? null : Number(field.value)}
                        onValueChange={(val) => field.onChange(val == null ? '' : String(val))}
                      >
                        <NumberFieldGroup>
                          <NumberFieldDecrement aria-label="减少估时" />
                          <NumberFieldInput placeholder="0" onBlur={field.onBlur} />
                          <NumberFieldIncrement aria-label="增加估时" />
                        </NumberFieldGroup>
                      </NumberField>
                    </div>
                  )}
                />
              </div>
            </div>

            {/* Footer */}
            <DialogFooter className="px-6 py-4 border-t bg-muted/30 shrink-0">
              <div className="flex w-full justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={form.handleSubmit(handleSubmit)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Saving...' : mode === 'create' ? 'Create Task' : 'Save Changes'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
