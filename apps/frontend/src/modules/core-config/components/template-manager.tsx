import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useProjectTemplates, useCreateProjectTemplate, useUpdateProjectTemplate, useTaskTemplates, useCreateTaskTemplate, useUpdateTaskTemplate, useDeleteTaskTemplate, type ProjectTemplate, type TaskTemplate } from '../hooks/use-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { FolderKanban, ListTodo, CheckSquare, Clock, Pencil, Trash2 } from 'lucide-react';

const PROJECT_TYPES = ['personal', 'team', 'experiment', 'enterprise'];
const TASK_CATEGORIES = ['feature', 'bug-fix', 'release', 'documentation', 'infrastructure'];

const CARD_ACCENTS = {
  blue: 'bg-accent-blue-light text-accent-blue',
  green: 'bg-accent-green-light text-accent-green',
  orange: 'bg-accent-yellow-light text-accent-yellow',
  violet: 'bg-accent-purple-light text-accent-purple',
} as const;

function formatRelativeTime(iso?: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return '今天';
  if (days === 1) return '1 天前';
  if (days < 7) return `${days} 天前`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} 周前`;
  const months = Math.floor(days / 30);
  return `${months} 月前`;
}

type TemplateFilter = 'all' | 'project' | 'task';

const TEMPLATE_FILTERS: { id: TemplateFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'project', label: '项目' },
  { id: 'task', label: '任务' },
];

interface ProjectTemplateFormData {
  name: string;
  description: string;
  baseProjectType: string;
}

interface TaskTemplateFormData {
  name: string;
  description: string;
  category: string;
}

const initialProjectFormData: ProjectTemplateFormData = {
  name: '',
  description: '',
  baseProjectType: 'team',
};

const initialTaskFormData: TaskTemplateFormData = {
  name: '',
  description: '',
  category: 'feature',
};

export function TemplateManager() {
  const confirmAction = useConfirm();
  const { data: projectTemplates = [], isLoading: loadingProjectTemplates } = useProjectTemplates();
  const createProjectTemplate = useCreateProjectTemplate();
  const updateProjectTemplate = useUpdateProjectTemplate();

  const projectForm = useForm<ProjectTemplateFormData>({
    defaultValues: initialProjectFormData,
  });
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isProjectFormOpen, setIsProjectFormOpen] = useState(false);

  const { data: taskTemplates = [], isLoading: loadingTaskTemplates } = useTaskTemplates();
  const createTaskTemplate = useCreateTaskTemplate();
  const updateTaskTemplate = useUpdateTaskTemplate();
  const deleteTaskTemplate = useDeleteTaskTemplate();

  const taskForm = useForm<TaskTemplateFormData>({
    defaultValues: initialTaskFormData,
  });
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isTaskFormOpen, setIsTaskFormOpen] = useState(false);
  const [filter, setFilter] = useState<TemplateFilter>('all');

  // Filter templates based on selected view
  const filteredProjectTemplates = filter === 'all' || filter === 'project' ? projectTemplates : [];
  const filteredTaskTemplates = filter === 'all' || filter === 'task' ? taskTemplates : [];

  const handleProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const projectFormData = projectForm.getValues();
      if (editingProjectId) {
        await updateProjectTemplate.mutateAsync({ id: editingProjectId, data: projectFormData });
      } else {
        await createProjectTemplate.mutateAsync(projectFormData);
      }
      projectForm.reset(initialProjectFormData);
      setEditingProjectId(null);
      setIsProjectFormOpen(false);
    } catch (err) {
      console.error('Failed to save project template:', err);
    }
  };

  const handleProjectEdit = (template: ProjectTemplate) => {
    projectForm.reset({
      name: template.name,
      description: template.description || '',
      baseProjectType: template.baseProjectType || 'team',
    });
    setEditingProjectId(template.id);
    setIsProjectFormOpen(true);
  };

  const handleProjectCancel = () => {
    projectForm.reset(initialProjectFormData);
    setEditingProjectId(null);
    setIsProjectFormOpen(false);
  };

  const handleTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const taskFormData = taskForm.getValues();
      if (editingTaskId) {
        await updateTaskTemplate.mutateAsync({ id: editingTaskId, data: taskFormData });
      } else {
        await createTaskTemplate.mutateAsync(taskFormData);
      }
      taskForm.reset(initialTaskFormData);
      setEditingTaskId(null);
      setIsTaskFormOpen(false);
    } catch (err) {
      console.error('Failed to save task template:', err);
    }
  };

  const handleTaskEdit = (template: TaskTemplate) => {
    taskForm.reset({
      name: template.name,
      description: template.description || '',
      category: template.category || 'feature',
    });
    setEditingTaskId(template.id);
    setIsTaskFormOpen(true);
  };

  const handleTaskDelete = async (id: string) => {
    const ok = await confirmAction({
      title: '删除任务模板',
      description: '确定要删除该任务模板吗？',
      confirmText: '删除',
      cancelText: '取消',
      variant: 'destructive',
    });
    if (ok) {
      try {
        await deleteTaskTemplate.mutateAsync(id);
      } catch (err) {
        console.error('Failed to delete task template:', err);
      }
    }
  };

  const handleTaskCancel = () => {
    taskForm.reset(initialTaskFormData);
    setEditingTaskId(null);
    setIsTaskFormOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Section: 模板管理 - 项目模板 + 任务模板 统一标题 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">模板管理</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            管理项目模板与任务模板，用于快速创建项目与任务结构。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={filter} onValueChange={(v) => setFilter(v as TemplateFilter)}>
            <TabsList>
              {TEMPLATE_FILTERS.map((f) => (
                <TabsTrigger key={f.id} value={f.id}>
                  {f.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* 项目模板 子区块 */}
      <div className="space-y-4">
        <h3 className="text-base font-medium text-foreground">项目模板</h3>
        <p className="text-sm text-muted-foreground">
          定义可复用的项目模板，包含默认标签、状态与任务结构。
        </p>

        {!isProjectFormOpen ? (
          <Button onClick={() => setIsProjectFormOpen(true)} variant="default">
            添加项目模板
          </Button>
        ) : (
          <Form {...projectForm}>
            <form
              onSubmit={handleProjectSubmit}
              className="space-y-4 p-4 rounded-lg border border-border bg-muted/50/50"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={projectForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-muted-foreground mb-1">名称 *</FormLabel>
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="如：Web 应用"
                        required
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={projectForm.control}
                  name="baseProjectType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-muted-foreground mb-1">项目类型</FormLabel>
                      <NativeSelect
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full"
                      >
                        {PROJECT_TYPES.map((type) => (
                          <NativeSelectOption key={type} value={type}>
                            {type}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={projectForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-medium text-muted-foreground mb-1">说明</FormLabel>
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="模板说明"
                    />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" variant="default" disabled={createProjectTemplate.isPending || updateProjectTemplate.isPending}>
                  {editingProjectId ? '更新' : '创建'} 模板
                </Button>
                <Button type="button" variant="ghost" onClick={handleProjectCancel}>
                  取消
                </Button>
              </div>
            </form>
          </Form>
        )}

        {loadingProjectTemplates ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : filteredProjectTemplates.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjectTemplates.map((t, i) => {
              const accents = Object.values(CARD_ACCENTS);
              const accent = accents[i % accents.length];
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-border bg-background shadow-xs overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className={`h-20 flex items-center justify-center ${accent}`}>
                    <FolderKanban size={32} strokeWidth={1.5} />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-foreground truncate flex-1">{t.name}</h4>
                      <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/50 text-muted-foreground">
                        {t.baseProjectType || '项目'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-10 mb-4">
                      {t.description || '暂无说明'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {formatRelativeTime(t.updatedAt || t.createdAt)}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleProjectEdit(t)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          title="编辑"
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">暂无项目模板。</p>
        )}
      </div>

      {/* 任务模板 子区块 */}
      <div className="space-y-4 pt-4 border-t border-border">
        <h3 className="text-base font-medium text-foreground">任务模板</h3>
        <p className="text-sm text-muted-foreground">
          定义可复用的任务模板，用于 Bug 修复、需求、发布等常见工作流。
        </p>

        {loadingTaskTemplates ? (
          <p className="text-sm text-muted-foreground">加载中…</p>
        ) : !isTaskFormOpen ? (
          <Button onClick={() => setIsTaskFormOpen(true)} variant="default">
            添加任务模板
          </Button>
        ) : (
          <Form {...taskForm}>
            <form
              onSubmit={handleTaskSubmit}
              className="space-y-4 p-4 rounded-lg border border-border bg-muted/50/50"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={taskForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-muted-foreground mb-1">名称 *</FormLabel>
                      <Input
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="如：Bug 修复模板"
                        required
                      />
                    </FormItem>
                  )}
                />
                <FormField
                  control={taskForm.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="block text-sm font-medium text-muted-foreground mb-1">分类</FormLabel>
                      <NativeSelect
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value)}
                        className="w-full"
                      >
                        {TASK_CATEGORIES.map((category) => (
                          <NativeSelectOption key={category} value={category}>
                            {category}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={taskForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="block text-sm font-medium text-muted-foreground mb-1">说明</FormLabel>
                    <Input
                      value={field.value}
                      onChange={(e) => field.onChange(e.target.value)}
                      placeholder="模板说明"
                    />
                  </FormItem>
                )}
              />
              <div className="flex gap-2">
                <Button type="submit" variant="default" disabled={createTaskTemplate.isPending || updateTaskTemplate.isPending}>
                  {editingTaskId ? '更新' : '创建'} 模板
                </Button>
                <Button type="button" variant="ghost" onClick={handleTaskCancel}>
                  取消
                </Button>
              </div>
            </form>
          </Form>
        )}

        {!loadingTaskTemplates && filteredTaskTemplates.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTaskTemplates.map((t, i) => {
              const accents = Object.values(CARD_ACCENTS);
              const accent = accents[i % accents.length];
              const taskCount = t.items?.length ?? 0;
              return (
                <div
                  key={t.id}
                  className="rounded-lg border border-border bg-background shadow-xs overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div className={`h-20 flex items-center justify-center ${accent}`}>
                    <ListTodo size={32} strokeWidth={1.5} />
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-foreground truncate flex-1">{t.name}</h4>
                      <span className="shrink-0 px-2 py-0.5 rounded-md text-xs font-medium bg-muted/50 text-muted-foreground">
                        {t.category || '任务'}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-10 mb-4">
                      {t.description || '暂无说明'}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <CheckSquare size={12} />
                          {taskCount} 项任务
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {formatRelativeTime(t.updatedAt || t.createdAt)}
                        </span>
                      </span>
                      <div className="flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => handleTaskEdit(t)}
                          className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          title="编辑"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTaskDelete(t.id)}
                          disabled={deleteTaskTemplate.isPending}
                          className="p-1.5 rounded text-accent-red hover:bg-accent-red-light"
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!loadingTaskTemplates && filteredTaskTemplates.length === 0 && !isTaskFormOpen && (
          <p className="text-sm text-muted-foreground">暂无任务模板。</p>
        )}
      </div>
    </div>
  );
}

