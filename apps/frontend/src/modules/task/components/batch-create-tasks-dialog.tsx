import { useState, useCallback } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useCreateTask } from '../hooks/use-project-tasks';
import type { CreateTaskRequest } from '../api/task-api';
import { Plus, Trash2, Sparkles, List, FileText, Bot, AlertCircle } from 'lucide-react';

interface BatchCreateTasksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
}

type BatchMode = 'manual' | 'template' | 'ai';

interface TaskRow {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
}

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;
const STATUSES = ['todo', 'in_progress', 'in_review', 'done'] as const;

const TASK_TEMPLATES = [
  {
    id: 'feature',
    name: 'Feature Development',
    icon: Sparkles,
    description: 'New feature implementation',
    tasks: [
      { title: 'Research and planning', priority: 'medium', description: '' },
      { title: 'Design and architecture', priority: 'high', description: '' },
      { title: 'Implementation', priority: 'high', description: '' },
      { title: 'Unit testing', priority: 'medium', description: '' },
      { title: 'Integration testing', priority: 'medium', description: '' },
      { title: 'Documentation', priority: 'low', description: '' },
      { title: 'Code review', priority: 'high', description: '' },
    ],
  },
  {
    id: 'bugfix',
    name: 'Bug Fix',
    icon: AlertCircle,
    description: 'Bug investigation and fix',
    tasks: [
      { title: 'Reproduce the bug', priority: 'high', description: '' },
      { title: 'Identify root cause', priority: 'high', description: '' },
      { title: 'Implement fix', priority: 'high', description: '' },
      { title: 'Write test case', priority: 'medium', description: '' },
      { title: 'Verify fix', priority: 'medium', description: '' },
    ],
  },
  {
    id: 'docs',
    name: 'Documentation',
    icon: FileText,
    description: 'Documentation writing',
    tasks: [
      { title: 'Outline structure', priority: 'medium', description: '' },
      { title: 'Write content', priority: 'medium', description: '' },
      { title: 'Add examples', priority: 'low', description: '' },
      { title: 'Review and edit', priority: 'low', description: '' },
    ],
  },
  {
    id: 'review',
    name: 'Code Review',
    icon: List,
    description: 'Code review tasks',
    tasks: [
      { title: 'Review code changes', priority: 'high', description: '' },
      { title: 'Check tests coverage', priority: 'medium', description: '' },
      { title: 'Verify documentation', priority: 'low', description: '' },
      { title: 'Approve or request changes', priority: 'high', description: '' },
    ],
  },
];

function createEmptyRow(): TaskRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title: '',
    description: '',
    priority: 'medium',
    status: 'todo',
  };
}

function ManualBatchCreate({ tasks, onTasksChange }: {
  tasks: TaskRow[];
  onTasksChange: (tasks: TaskRow[]) => void;
}) {
  const addTask = () => {
    onTasksChange([...tasks, createEmptyRow()]);
  };

  const updateTask = (id: string, field: keyof TaskRow, value: string) => {
    onTasksChange(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const removeTask = (id: string) => {
    onTasksChange(tasks.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Add tasks manually. Each row represents one task.
        </p>
        <Button variant="outline" size="sm" onClick={addTask}>
          <Plus className="mr-1 h-3 w-3" />
          Add Task
        </Button>
      </div>

      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 border rounded-lg border-dashed">
          <List className="h-8 w-8 text-muted-foreground/50 mb-2" />
          <p className="text-sm text-muted-foreground">No tasks added yet</p>
          <Button variant="outline" size="sm" className="mt-3" onClick={addTask}>
            <Plus className="mr-1 h-3 w-3" />
            Add First Task
          </Button>
        </div>
      ) : (
        <ScrollArea className="h-75">
          <div className="space-y-2 pr-4">
            {tasks.map((task, index) => (
              <div key={task.id} className="flex gap-2 items-start p-3 border rounded-lg bg-card">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {index + 1}
                </span>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Task title"
                    value={task.title}
                    onChange={(e) => updateTask(task.id, 'title', e.target.value)}
                    className="h-8"
                  />
                  <div className="flex gap-2">
                    <select
                      className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                      value={task.priority}
                      onChange={(e) => updateTask(task.id, 'priority', e.target.value)}
                    >
                      {PRIORITIES.map(p => (
                        <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                      ))}
                    </select>
                    <Input
                      placeholder="Description (optional)"
                      value={task.description}
                      onChange={(e) => updateTask(task.id, 'description', e.target.value)}
                      className="h-8 flex-1"
                    />
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTask(task.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

function TemplateBatchCreate({ tasks, onTasksChange }: {
  tasks: TaskRow[];
  onTasksChange: (tasks: TaskRow[]) => void;
}) {
  const applyTemplate = (template: typeof TASK_TEMPLATES[0]) => {
    const newTasks = template.tasks.map(t => ({
      ...createEmptyRow(),
      title: t.title,
      description: t.description,
      priority: t.priority,
    }));
    onTasksChange([...tasks, ...newTasks]);
  };

  const clearAll = () => {
    onTasksChange([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Select a template to quickly create multiple tasks.
        </p>
        {tasks.length > 0 && (
          <Button variant="outline" size="sm" onClick={clearAll}>
            <Trash2 className="mr-1 h-3 w-3" />
            Clear All
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        {TASK_TEMPLATES.map((template) => {
          const Icon = template.icon;
          return (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className="flex flex-col items-start p-4 border rounded-lg text-left hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{template.name}</span>
              </div>
              <p className="text-xs text-muted-foreground">{template.description}</p>
              <Badge variant="secondary" className="mt-2 text-xs">
                {template.tasks.length} tasks
              </Badge>
            </button>
          );
        })}
      </div>

      {tasks.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">
            Preview ({tasks.length} tasks to create)
          </p>
          <ScrollArea className="h-37.5">
            <div className="space-y-1">
              {tasks.map((task, i) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-6">{i + 1}.</span>
                  <span className="flex-1 truncate">{task.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

function AiBatchCreate({ tasks, onTasksChange }: {
  tasks: TaskRow[];
  onTasksChange: (tasks: TaskRow[]) => void;
}) {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const generateTasks = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);

    try {
      const response = await fetch('/_api/ai/generate-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (response.ok) {
        const data = await response.json();
        const generatedTasks = data.tasks.map((t: any) => ({
          ...createEmptyRow(),
          title: t.title,
          description: t.description || '',
          priority: t.priority || 'medium',
        }));
        onTasksChange([...tasks, ...generatedTasks]);
        setPrompt('');
      }
    } catch (error) {
      console.error('Failed to generate tasks:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2">
        <Label>Describe the tasks you need</Label>
        <Textarea
          placeholder="e.g., Create tasks for implementing user authentication including login, registration, password reset, and OAuth integration"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
        />
        <p className="text-xs text-muted-foreground">
          AI will generate appropriate tasks based on your description.
        </p>
      </div>

      <Button
        onClick={generateTasks}
        disabled={!prompt.trim() || isGenerating}
        className="w-full"
      >
        {isGenerating ? (
          <>Generating...</>
        ) : (
          <>
            <Bot className="mr-1 h-4 w-4" />
            Generate Tasks with AI
          </>
        )}
      </Button>

      {tasks.length > 0 && (
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">
            Preview ({tasks.length} tasks to create)
          </p>
          <ScrollArea className="h-37.5">
            <div className="space-y-1">
              {tasks.map((task, i) => (
                <div key={task.id} className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground w-6">{i + 1}.</span>
                  <span className="flex-1 truncate">{task.title}</span>
                  <Badge variant="outline" className="text-xs">
                    {task.priority}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}

export function BatchCreateTasksDialog({
  open,
  onOpenChange,
  projectId,
}: BatchCreateTasksDialogProps) {
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [mode, setMode] = useState<BatchMode>('manual');
  const createTask = useCreateTask();

  const handleCreate = async () => {
    const validTasks = tasks.filter(t => t.title.trim());
    if (validTasks.length === 0) return;

    try {
      for (const task of validTasks) {
        await createTask.mutateAsync({
          projectId,
          title: task.title,
          description: task.description,
          priority: task.priority as CreateTaskRequest['priority'],
          status: task.status as any,
        } as CreateTaskRequest);
      }
      setTasks([]);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create tasks:', error);
    }
  };

  const validCount = tasks.filter(t => t.title.trim()).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Batch Create Tasks</DialogTitle>
          <DialogDescription>
            Create multiple tasks at once using manual input, templates, or AI.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as BatchMode)} className="flex-1">
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="manual" className="flex gap-1">
              <List className="h-3 w-3" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="template" className="flex gap-1">
              <FileText className="h-3 w-3" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex gap-1">
              <Bot className="h-3 w-3" />
              AI Generate
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="flex-1 mt-4">
            <div className="px-1">
              <TabsContent value="manual" className="mt-0">
                <ManualBatchCreate tasks={tasks} onTasksChange={setTasks} />
              </TabsContent>

              <TabsContent value="template" className="mt-0">
                <TemplateBatchCreate tasks={tasks} onTasksChange={setTasks} />
              </TabsContent>

              <TabsContent value="ai" className="mt-0">
                <AiBatchCreate tasks={tasks} onTasksChange={setTasks} />
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>

        <DialogFooter className="border-t pt-4 mt-4">
          <div className="flex w-full items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {validCount > 0 ? `${validCount} task${validCount > 1 ? 's' : ''} to create` : 'No tasks to create'}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={validCount === 0 || createTask.isPending}>
                {createTask.isPending ? 'Creating...' : `Create ${validCount} Task${validCount > 1 ? 's' : ''}`}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
