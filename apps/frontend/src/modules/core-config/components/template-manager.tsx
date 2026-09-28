import { useState } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { useForm } from 'react-hook-form';
import { useProjectTemplates, useCreateProjectTemplate, useUpdateProjectTemplate, useTaskTemplates, useCreateTaskTemplate, useUpdateTaskTemplate, useDeleteTaskTemplate, type ProjectTemplate, type TaskTemplate } from '../hooks/use-metadata';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
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
    <PageShell aiPage="settings.templates" >
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

      <PageBody variant="standard">
        {/* 布局下沉：PageBody 基线为 flex-col 无 gap，卡片间距由调用方结构承载 */}
        <div className="space-y-6">
        {showProjects && (
            <Card >
              <CardHeader>
                <CardTitle size="base" >
                  {/* 布局下沉：图标+标题行由调用方结构承载，CardTitle 保持基线盒 */}
                  <div className="flex items-center gap-2">
                    <FolderKanban size={16} className="text-accent-blue" />
                    {t('settings.templateManagerProjectTemplates')}
                  </div>
                </CardTitle>
                <CardDescription>{t('settings.templateManagerProjectDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 布局下沉：间距（gap-3+space-y-4 叠加）由调用方结构等价承载 */}
                <div className="flex flex-col gap-3 space-y-4">
                {!isProjectFormOpen ? (
                  <div>
                    <Button onClick={() => setIsProjectFormOpen(true)} variant="default">
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
                              <SelectField
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                              >
                                {PROJECT_TYPES.map((type) => (
                                  <SelectFieldOption key={type} value={type}>
                                    {t(projectTypeKey(type))}
                                  </SelectFieldOption>
                                ))}
                              </SelectField>
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
                        className="overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-colors hover:border-border/80"
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
                            <Button variant="ghost"
                              type="button"
                              onClick={() => handleProjectEdit(template)}
                              
                              title={t('common.edit')}
                            >
                              <Pencil size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState title={t('settings.templateManagerEmptyProjects')} />
                )}
                </div>
              </CardContent>
            </Card>
          )}

          {showTasks && (
            <Card >
              <CardHeader>
                <CardTitle size="base" >
                  {/* 布局下沉：图标+标题行由调用方结构承载，CardTitle 保持基线盒 */}
                  <div className="flex items-center gap-2">
                    <ListTodo size={16} className="text-accent-purple" />
                    {t('settings.templateManagerTaskTemplates')}
                  </div>
                </CardTitle>
                <CardDescription>{t('settings.templateManagerTaskDesc')}</CardDescription>
              </CardHeader>
              <CardContent>
                {/* 布局下沉：间距（gap-3+space-y-4 叠加）由调用方结构等价承载 */}
                <div className="flex flex-col gap-3 space-y-4">
                {loadingTaskTemplates ? (
                  <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
                ) : !isTaskFormOpen ? (
                  <div>
                    <Button onClick={() => setIsTaskFormOpen(true)} variant="default">
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
                              <SelectField
                                value={field.value}
                                onChange={(e) => field.onChange(e.target.value)}
                              >
                                {TASK_CATEGORIES.map((category) => (
                                  <SelectFieldOption key={category} value={category}>
                                    {t(taskCategoryKey(category))}
                                  </SelectFieldOption>
                                ))}
                              </SelectField>
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
                          className="overflow-hidden rounded-lg border border-border bg-card shadow-xs transition-colors hover:border-border/80"
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
                                <Button variant="ghost"
                                  type="button"
                                  onClick={() => handleTaskEdit(template)}
                                  
                                  title={t('common.edit')}
                                >
                                  <Pencil size={14} />
                                </Button>
                                {/* E 类批 6：`quiet` + `tone="danger"` —— tone 的色类带
                                    `data-[tone=danger]:` 作用域（特异性 (0,2,0)/(0,3,0)），
                                    故压得住 quiet 的 `text-muted-foreground` 与
                                    `hover:text-foreground`：常态 = accent-red、悬停文字仍是
                                    accent-red、悬停底 = accent-red-light，与原类串逐态等价。
                                    `size-3.5` 是**必需连带**：Button 基线带
                                    `[&_svg:not([class*='size-'])]:size-4`，`<Trash2 size={14} />`
                                    的表现属性会被 CSS 归一成 16px ⇒ 不钉住即为几何漂移。 */}
                                <Button
                                  type="button"
                                  variant="quiet"
                                  tone="danger"
                                  padding="p-1.5"
                                  onClick={() => handleTaskDelete(template.id)}
                                  disabled={deleteTaskTemplate.isPending}
                                  title={t('common.delete')}
                                >
                                  <Trash2 className="size-3.5" />
                                </Button>
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
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </PageBody>
    </PageShell>
  );
}
