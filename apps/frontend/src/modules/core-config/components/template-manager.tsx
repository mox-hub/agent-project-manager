import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { useForm } from 'react-hook-form';
import { useProjectTemplates, useCreateProjectTemplate, useUpdateProjectTemplate, useTaskTemplates, useCreateTaskTemplate, useUpdateTaskTemplate, useDeleteTaskTemplate, type ProjectTemplate, type TaskTemplate } from '../hooks/use-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { PageShell, PageBody } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { CheckSquare, Clock, FolderKanban, LayoutTemplate, ListTodo, Pencil, Plus, Trash2 } from 'lucide-react';

const PROJECT_TYPES = ['personal', 'team', 'experiment', 'enterprise'] as const;
const TASK_CATEGORIES = ['feature', 'bug-fix', 'release', 'documentation', 'infrastructure'] as const;

const CARD_ACCENTS = [
  'bg-accent-blue-light text-accent-blue',
  'bg-accent-green-light text-accent-green',
  'bg-accent-yellow-light text-accent-yellow',
  'bg-accent-purple-light text-accent-purple',
] as const;

function projectTypeKey(type: string): string {
  switch (type) {
    case 'personal':
      return 'settings.templateManagerTypePersonal';
    case 'team':
      return 'settings.templateManagerTypeTeam';
    case 'experiment':
      return 'settings.templateManagerTypeExperiment';
    case 'enterprise':
      return 'settings.templateManagerTypeEnterprise';
    default:
      return type;
  }
}

function taskCategoryKey(category: string): string {
  switch (category) {
    case 'feature':
      return 'settings.templateManagerCategoryFeature';
    case 'bug-fix':
      return 'settings.templateManagerCategoryBugFix';
    case 'release':
      return 'settings.templateManagerCategoryRelease';
    case 'documentation':
      return 'settings.templateManagerCategoryDocumentation';
    case 'infrastructure':
      return 'settings.templateManagerCategoryInfrastructure';
    default:
      return category;
  }
}

function relativeTimeLabel(iso: string | undefined, t: TFunction): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const days = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  if (days < 1) return t('settings.templateManagerUpdatedToday');
  if (days === 1) return t('settings.templateManagerUpdatedDaysAgo', { n: 1 });
  if (days < 7) return t('settings.templateManagerUpdatedDaysAgo', { n: days });
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return t('settings.templateManagerUpdatedWeeksAgo', { n: weeks });
  const months = Math.floor(days / 30);
  return t('settings.templateManagerUpdatedMonthsAgo', { n: months });
}

type TemplateFilter = 'all' | 'project' | 'task';

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
  const { t } = useTranslation();
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
  const showProjects = filter === 'all' || filter === 'project';
  const showTasks = filter === 'all' || filter === 'task';

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
      title: t('settings.templateManagerDeleteTaskTitle'),
      description: t('settings.templateManagerDeleteTaskDesc'),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
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
    <PageShell aiPage="settings.templates" className="bg-background text-foreground">
      <PageHeader
        aiId="settings.templates"
        title={t('settings.templates')}
        icon={LayoutTemplate}
        iconColor="text-accent-blue"
      />

      {/* 工具栏：全部 / 项目 / 任务 居中页签 */}
      <div className="grid w-full shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-6 py-2 md:px-7">
        <div />
        <SegmentedControl
          variant="rect"
          value={filter}
          onChange={(value) => setFilter(value as TemplateFilter)}
          options={[
            { value: 'all', label: t('settings.templateFilterAll') },
            { value: 'project', label: t('settings.templateFilterProject') },
            { value: 'task', label: t('settings.templateFilterTask') },
          ]}
        />
        <div />
      </div>

      <PageBody variant="standard" className="space-y-6">
        {showProjects && (
            <Card className="border-border shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FolderKanban size={16} className="text-accent-blue" />
                  {t('settings.templateManagerProjectTemplates')}
                </CardTitle>
                <CardDescription>{t('settings.templateManagerProjectDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isProjectFormOpen ? (
                  <div>
                    <Button onClick={() => setIsProjectFormOpen(true)} variant="default" className="gap-1.5">
                      <Plus size={15} />
                      {t('settings.templateManagerAddProject')}
                    </Button>
                  </div>
                ) : (
                  <Form {...projectForm}>
                    <form
                      onSubmit={handleProjectSubmit}
                      className="space-y-4 rounded-lg border border-border bg-muted/20 p-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          control={projectForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('settings.templateManagerFormNameLabel')}</FormLabel>
                              <Input
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder={t('settings.templateManagerFormNameProjectPlaceholder')}
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
                              <FormLabel>{t('settings.templateManagerFormTypeLabel')}</FormLabel>
                              <NativeSelect
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-full"
                              >
                                {PROJECT_TYPES.map((type) => (
                                  <NativeSelectOption key={type} value={type}>
                                    {t(projectTypeKey(type))}
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
                            <FormLabel>{t('settings.templateManagerFormDescriptionLabel')}</FormLabel>
                            <Input
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder={t('settings.templateManagerFormDescriptionPlaceholder')}
                            />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          variant="default"
                          disabled={createProjectTemplate.isPending || updateProjectTemplate.isPending}
                        >
                          {editingProjectId
                            ? t('settings.templateManagerSubmitUpdate')
                            : t('settings.templateManagerSubmitCreate')}
                        </Button>
                        <Button type="button" variant="ghost" onClick={handleProjectCancel}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}

                {loadingProjectTemplates ? (
                  <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                ) : projectTemplates.length > 0 ? (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projectTemplates.map((template, i) => (
                      <div
                        key={template.id}
                        className="overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-shadow hover:shadow-md"
                      >
                        <div className={`flex h-20 items-center justify-center ${CARD_ACCENTS[i % CARD_ACCENTS.length]}`}>
                          <FolderKanban size={32} strokeWidth={1.5} />
                        </div>
                        <div className="p-4">
                          <div className="mb-2 flex items-start justify-between gap-2">
                            <h4 className="flex-1 truncate font-semibold text-foreground">{template.name}</h4>
                            <span className="shrink-0 rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                              {t(projectTypeKey(template.baseProjectType || 'team'))}
                            </span>
                          </div>
                          <p className="mb-4 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                            {template.description || t('settings.templateManagerNoDescription')}
                          </p>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {relativeTimeLabel(template.updatedAt || template.createdAt, t)}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleProjectEdit(template)}
                              className="rounded p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                              title={t('common.edit')}
                            >
                              <Pencil size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={t('settings.templateManagerEmptyProjects')} />
                )}
              </CardContent>
            </Card>
          )}

          {showTasks && (
            <Card className="border-border shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListTodo size={16} className="text-accent-purple" />
                  {t('settings.templateManagerTaskTemplates')}
                </CardTitle>
                <CardDescription>{t('settings.templateManagerTaskDesc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingTaskTemplates ? (
                  <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                ) : !isTaskFormOpen ? (
                  <div>
                    <Button onClick={() => setIsTaskFormOpen(true)} variant="default" className="gap-1.5">
                      <Plus size={15} />
                      {t('settings.templateManagerAddTask')}
                    </Button>
                  </div>
                ) : (
                  <Form {...taskForm}>
                    <form
                      onSubmit={handleTaskSubmit}
                      className="space-y-4 rounded-lg border border-border bg-muted/20 p-4"
                    >
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <FormField
                          control={taskForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('settings.templateManagerFormNameLabel')}</FormLabel>
                              <Input
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                placeholder={t('settings.templateManagerFormNameTaskPlaceholder')}
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
                              <FormLabel>{t('settings.templateManagerFormCategoryLabel')}</FormLabel>
                              <NativeSelect
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                                className="w-full"
                              >
                                {TASK_CATEGORIES.map((category) => (
                                  <NativeSelectOption key={category} value={category}>
                                    {t(taskCategoryKey(category))}
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
                            <FormLabel>{t('settings.templateManagerFormDescriptionLabel')}</FormLabel>
                            <Input
                              value={field.value}
                              onChange={(e) => field.onChange(e.target.value)}
                              placeholder={t('settings.templateManagerFormDescriptionPlaceholder')}
                            />
                          </FormItem>
                        )}
                      />
                      <div className="flex gap-2">
                        <Button
                          type="submit"
                          variant="default"
                          disabled={createTaskTemplate.isPending || updateTaskTemplate.isPending}
                        >
                          {editingTaskId
                            ? t('settings.templateManagerSubmitUpdate')
                            : t('settings.templateManagerSubmitCreate')}
                        </Button>
                        <Button type="button" variant="ghost" onClick={handleTaskCancel}>
                          {t('common.cancel')}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}

                {!loadingTaskTemplates && taskTemplates.length > 0 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {taskTemplates.map((template, i) => {
                      const taskCount = template.items?.length ?? 0;
                      return (
                        <div
                          key={template.id}
                          className="overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-shadow hover:shadow-md"
                        >
                          <div className={`flex h-20 items-center justify-center ${CARD_ACCENTS[i % CARD_ACCENTS.length]}`}>
                            <ListTodo size={32} strokeWidth={1.5} />
                          </div>
                          <div className="p-4">
                            <div className="mb-2 flex items-start justify-between gap-2">
                              <h4 className="flex-1 truncate font-semibold text-foreground">{template.name}</h4>
                              <span className="shrink-0 rounded-md bg-muted/50 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                {t(taskCategoryKey(template.category || 'feature'))}
                              </span>
                            </div>
                            <p className="mb-4 line-clamp-2 min-h-10 text-sm text-muted-foreground">
                              {template.description || t('settings.templateManagerNoDescription')}
                            </p>
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span className="flex items-center gap-2">
                                <span className="flex items-center gap-1">
                                  <CheckSquare size={12} />
                                  {t('settings.templateManagerTaskCount', { count: taskCount })}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Clock size={12} />
                                  {relativeTimeLabel(template.updatedAt || template.createdAt, t)}
                                </span>
                              </span>
                              <div className="flex items-center gap-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleTaskEdit(template)}
                                  className="rounded p-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                  title={t('common.edit')}
                                >
                                  <Pencil size={14} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTaskDelete(template.id)}
                                  disabled={deleteTaskTemplate.isPending}
                                  className="rounded p-1.5 text-accent-red hover:bg-accent-red-light"
                                  title={t('common.delete')}
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

                {!loadingTaskTemplates && taskTemplates.length === 0 && !isTaskFormOpen && (
                  <EmptyState title={t('settings.templateManagerEmptyTasks')} />
                )}
              </CardContent>
            </Card>
          )}
      </PageBody>
    </PageShell>
  );
}
