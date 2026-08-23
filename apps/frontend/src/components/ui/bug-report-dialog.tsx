/**
 * BugReportDialog - 全局 Bug 报告弹窗组件
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormField } from '@/components/ui/form';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';
import { useProjectList } from '@/modules/project/hooks/use-project-list';
import { useCreateTask } from '@/modules/task/hooks/use-project-tasks';
import { cn } from '@/lib/utils';
import {
  Bug, AlertCircle, Check, Terminal, Globe, Flag, Calendar,
  Copy, Maximize2, X, ChevronRight
} from 'lucide-react';

export type BugSeverity = 'critical' | 'high' | 'medium' | 'low';
export type BugPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface BugFormData {
  title: string;
  description: string;
  severity: BugSeverity;
  priority: BugPriority;
  projectId: string;
  assigneeId: string;
  dueDate: string;
  environment: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  errorLogs: string;
}

export interface BugReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  initialData?: Partial<BugFormData>;
  onSuccess?: (taskId: string) => void;
}

const SEVERITY_OPTIONS: { value: BugSeverity; label: string; color: string; bgColor: string; description: string }[] = [
  {
    value: 'critical',
    label: 'Critical',
    color: '#ef4444',
    bgColor: 'bg-red-500',
    description: 'System down, data loss',
  },
  {
    value: 'high',
    label: 'High',
    color: '#f97316',
    bgColor: 'bg-orange-500',
    description: 'Major feature broken',
  },
  {
    value: 'medium',
    label: 'Medium',
    color: '#f59e0b',
    bgColor: 'bg-amber-500',
    description: 'Feature partially works',
  },
  {
    value: 'low',
    label: 'Low',
    color: '#94a3b8',
    bgColor: 'bg-slate-400',
    description: 'Minor issue',
  },
];

const ENVIRONMENT_OPTIONS = [
  { value: 'production', label: 'Production' },
  { value: 'staging', label: 'Staging' },
  { value: 'development', label: 'Development' },
  { value: 'local', label: 'Local' },
];

const DEFAULT_FORM_DATA: BugFormData = {
  title: '',
  description: '',
  severity: 'medium',
  priority: 'medium',
  projectId: '',
  assigneeId: '',
  dueDate: '',
  environment: 'development',
  stepsToReproduce: '',
  expectedBehavior: '',
  actualBehavior: '',
  errorLogs: '',
};

export function BugReportDialog({
  open,
  onOpenChange,
  projectId,
  initialData,
  onSuccess,
}: BugReportDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: projectsResponse } = useProjectList();
  const projects = projectsResponse?.items ?? [];
  const createTask = useCreateTask();

  const form = useForm<BugFormData>({
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
      setError(null);
      setIsFullscreen(false);
    }
  }, [open, initialData, projectId, form]);

  const { copyToClipboard } = useCopyToClipboard();

  const handleCopyToClipboard = () => {
    const data = form.getValues();
    const text = `
Bug Report: ${data.title}
Severity: ${SEVERITY_OPTIONS.find(s => s.value === data.severity)?.label}
Priority: ${data.priority}
Project: ${projects.find(p => p.id === data.projectId)?.name || data.projectId}
Environment: ${data.environment}
Target Fix Date: ${data.dueDate || 'Not set'}

Steps to Reproduce:
${data.stepsToReproduce}

Expected Behavior:
${data.expectedBehavior}

Actual Behavior:
${data.actualBehavior}

Error Logs:
${data.errorLogs || 'No error logs'}

Additional Notes:
${data.description || 'None'}
    `.trim();

    copyToClipboard(text);
  };

  const handleSubmit = async (data: BugFormData) => {
    setError(null);

    try {
      const bugDescription = `
## Bug Report

**Environment:** ${data.environment}
**Severity:** ${data.severity}
**Priority:** ${data.priority}

### Steps to Reproduce
${data.stepsToReproduce || 'Not provided'}

### Expected Behavior
${data.expectedBehavior || 'Not provided'}

### Actual Behavior
${data.actualBehavior || 'Not provided'}

### Error Logs
\`\`\`
${data.errorLogs || 'No error logs provided'}
\`\`\`

### Additional Description
${data.description || 'No additional description'}
      `.trim();

      const result = await createTask.mutateAsync({
        projectId: data.projectId,
        title: data.title,
        description: bugDescription,
        priority: data.priority === 'urgent' ? 'critical' : data.priority,
        status: 'todo',
        tags: ['bug'],
      });

      if (result?.id) {
        onSuccess?.(result.id);
      }

      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败，请重试');
    }
  };

  const isLoading = createTask.isPending;
  const selectedSeverity = form.watch('severity');

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
        <DialogHeader className="px-6 pt-5 pb-4 border-b shrink-0 bg-red-50/50 dark:bg-red-950/20">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', 'bg-red-100 dark:bg-red-900/40')}>
                <Bug className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold">
                  {initialData?.title ? 'Edit Bug Report' : 'Report a Bug'}
                </DialogTitle>
                <DialogDescription className="text-sm mt-0.5">
                  Help us track and fix issues by providing detailed information
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
              isFullscreen ? 'grid grid-cols-[1fr_400px] gap-6' : 'grid grid-cols-[1fr_360px] gap-5'
            )}>
              {/* Left Column - Main Content */}
              <div className="space-y-5">
                {error && (
                  <div className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                {/* Bug Title */}
                <FormField
                  control={form.control}
                  name="title"
                  rules={{ required: 'Bug title is required' }}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-sm font-medium flex items-center gap-1.5">
                        Bug Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="Brief description of the bug"
                        className="h-11 text-base"
                        {...field}
                      />
                    </div>
                  )}
                />

                {/* Steps to Reproduce */}
                <FormField
                  control={form.control}
                  name="stepsToReproduce"
                  rules={{ required: 'Steps to reproduce are required' }}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="stepsToReproduce" className="text-sm font-medium flex items-center gap-1.5">
                        Steps to Reproduce <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="stepsToReproduce"
                        placeholder="1. Go to...&#10;2. Click on...&#10;3. See error..."
                        rows={isFullscreen ? 6 : 4}
                        className="resize-y text-sm"
                        {...field}
                      />
                    </div>
                  )}
                />

                {/* Expected & Actual Behavior */}
                <div className={cn('grid gap-4', isFullscreen ? 'grid-cols-2' : '')}>
                  <FormField
                    control={form.control}
                    name="expectedBehavior"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label htmlFor="expectedBehavior" className="text-sm font-medium flex items-center gap-1.5">
                          Expected Behavior <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="expectedBehavior"
                          placeholder="What should happen..."
                          rows={isFullscreen ? 5 : 3}
                          className="resize-y text-sm"
                          {...field}
                        />
                      </div>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="actualBehavior"
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label htmlFor="actualBehavior" className="text-sm font-medium flex items-center gap-1.5">
                          Actual Behavior <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="actualBehavior"
                          placeholder="What actually happens..."
                          rows={isFullscreen ? 5 : 3}
                          className="resize-y text-sm"
                          {...field}
                        />
                      </div>
                    )}
                  />
                </div>

                {/* Error Logs */}
                <FormField
                  control={form.control}
                  name="errorLogs"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="errorLogs" className="text-sm font-medium flex items-center gap-1.5">
                        <Terminal className="h-3.5 w-3.5 text-muted-foreground" />
                        Error Logs / Stack Trace
                      </Label>
                      <Textarea
                        id="errorLogs"
                        placeholder="Paste error message, stack trace, or console output..."
                        rows={isFullscreen ? 6 : 4}
                        className="resize-y font-mono text-xs bg-muted/50"
                        {...field}
                      />
                    </div>
                  )}
                />

                {/* Additional Notes */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium">
                        Additional Notes
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Any additional information, screenshots, or context..."
                        rows={isFullscreen ? 4 : 2}
                        className="resize-y text-sm"
                        {...field}
                      />
                    </div>
                  )}
                />
              </div>

              {/* Right Column - Metadata Sidebar */}
              <div className="space-y-5 bg-muted/30 rounded-xl p-4 border border-border/50">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground mb-3">
                  <ChevronRight className="h-4 w-4" />
                  Bug Properties
                </div>

                {/* Severity Selector */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Flag className="h-3.5 w-3.5 text-destructive" />
                    Severity <span className="text-destructive">*</span>
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {SEVERITY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => form.setValue('severity', opt.value)}
                        className={cn(
                          'flex flex-col items-start p-2.5 rounded-lg border text-left transition-all',
                          selectedSeverity === opt.value
                            ? 'border-2'
                            : 'border-border hover:border-muted-foreground/50'
                        )}
                        style={{
                          borderColor: selectedSeverity === opt.value ? opt.color : undefined,
                          backgroundColor: selectedSeverity === opt.value ? `${opt.color}10` : undefined,
                        }}
                      >
                        <div className="flex items-center gap-1.5 mb-0.5">
                          {selectedSeverity === opt.value && (
                            <Check className="h-3 w-3" style={{ color: opt.color }} />
                          )}
                          <span
                            className="text-xs font-semibold"
                            style={{ color: selectedSeverity === opt.value ? opt.color : undefined }}
                          >
                            {opt.label}
                          </span>
                        </div>
                        <p className="text-10 text-muted-foreground leading-tight">
                          {opt.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Project */}
                <FormField
                  control={form.control}
                  name="projectId"
                  rules={{ required: 'Project is required' }}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="projectId" className="text-sm font-medium flex items-center gap-1.5">
                        <Bug className="h-3.5 w-3.5 text-muted-foreground" />
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

                {/* Environment */}
                <FormField
                  control={form.control}
                  name="environment"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="environment" className="text-sm font-medium flex items-center gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                        Environment
                      </Label>
                      <NativeSelect
                        id="environment"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-9"
                      >
                        {ENVIRONMENT_OPTIONS.map((opt) => (
                          <NativeSelectOption key={opt.value} value={opt.value}>
                            {opt.label}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </div>
                  )}
                />

                {/* Priority */}
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="priority" className="text-sm font-medium flex items-center gap-1.5">
                        <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                        Priority
                      </Label>
                      <NativeSelect
                        id="priority"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="h-9"
                      >
                        <NativeSelectOption value="low">Low</NativeSelectOption>
                        <NativeSelectOption value="medium">Medium</NativeSelectOption>
                        <NativeSelectOption value="high">High</NativeSelectOption>
                        <NativeSelectOption value="urgent">Urgent</NativeSelectOption>
                      </NativeSelect>
                    </div>
                  )}
                />

                {/* Target Fix Date */}
                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <div className="space-y-2">
                      <Label htmlFor="dueDate" className="text-sm font-medium flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        Target Fix Date
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
                  className="gap-1.5 bg-red-600 hover:bg-red-700 text-white border-red-600"
                >
                  <Bug className="h-4 w-4" />
                  {isLoading ? 'Submitting...' : 'Submit Bug Report'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
