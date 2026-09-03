/**
 * ProjectFormDialog - 项目创建 / 基本信息编辑双模式对话框
 *
 * 从 project-list-page 内联的旧创建 Dialog 抽出：
 * - create 模式（project 为空）：名称/描述/类型/可见性/图标/颜色/模板
 * - edit 模式（传 project）：上述字段（预填，模板除外）+ 编号/类别/起止日期
 * 编辑模式提交 PATCH（useUpdateProject），覆盖右键子菜单无法枚举的元数据字段。
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useCreateProject, useUpdateProject } from '../hooks/use-project-mutations';
import { useProjectTemplates } from '@/modules/core-config/hooks/use-metadata';
import type {
  Project,
  ProjectType,
  ProjectVisibility,
  UpdateProjectRequest,
} from '../api/project-api';

const NONE = '__none__';

interface ProjectFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 传入则为编辑模式 */
  project?: Project | null;
  onSuccess?: () => void;
}

export function ProjectFormDialog({ open, onOpenChange, project, onSuccess }: ProjectFormDialogProps) {
  const { t } = useTranslation();
  const isEdit = !!project;
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const { data: templates = [] } = useProjectTemplates();

  const [form, setForm] = useState({
    type: 'team',
    visibility: 'internal',
    icon: 'folder',
    templateId: '',
  });

  // 打开时按模式重置受控 Select 的初值（编辑模式预填项目当前值）
  useEffect(() => {
    if (!open) return;
    setForm({
      type: project?.type ?? 'team',
      visibility: project?.visibility ?? 'internal',
      icon: project?.icon ?? 'folder',
      templateId: '',
    });
  }, [open, project]);

  const pending = createProject.isPending || updateProject.isPending;

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    if (!name) return;

    const description = String(data.get('description') ?? '').trim() || undefined;
    const type = form.type as ProjectType;
    const visibility = form.visibility as ProjectVisibility;
    const icon = form.icon.trim() || undefined;
    const color = String(data.get('color') ?? '').trim() || undefined;

    const handleSuccess = () => {
      onOpenChange(false);
      onSuccess?.();
    };

    if (isEdit && project) {
      const patch: UpdateProjectRequest = {
        name,
        description,
        type,
        visibility,
        icon,
        color,
        projectCode: String(data.get('projectCode') ?? '').trim() || undefined,
        category: String(data.get('category') ?? '').trim() || undefined,
        // date input 的值即 yyyy-MM-dd，空串转 undefined 表示清空
        startDate: String(data.get('startDate') ?? '') || null,
        targetDate: String(data.get('targetDate') ?? '') || null,
      };
      updateProject.mutate({ projectId: project.id, data: patch }, { onSuccess: handleSuccess });
      return;
    }

    createProject.mutate(
      {
        name,
        description,
        type,
        visibility,
        templateId: form.templateId.trim() || undefined,
        icon,
        color,
      },
      { onSuccess: handleSuccess },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-130">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('project.form.title.edit') : t('project.form.title.create')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground">{t('project.form.subtitle')}</p>
        </DialogHeader>
        <form id="project-form-dialog-form" onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground" htmlFor="name">
                {t('project.form.name')}
              </label>
              <Input
                id="name"
                name="name"
                required
                defaultValue={project?.name}
                placeholder="Agent Project Manager"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground" htmlFor="description">
                {t('project.form.description')}
              </label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={project?.description ?? undefined}
                placeholder={t('project.form.descriptionPlaceholder')}
                className="bg-muted/50 text-xs"
              />
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor="type">
                  {t('project.form.type')}
                </label>
                <Select value={form.type} onValueChange={(value) => setForm((prev) => ({ ...prev, type: value }))}>
                  <SelectTrigger id="type" className="h-8 w-full bg-muted/50 text-xs">
                    <SelectValue placeholder={t('project.form.selectType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="personal">{t('project.type.personal')}</SelectItem>
                    <SelectItem value="team">{t('project.type.team')}</SelectItem>
                    <SelectItem value="experiment">{t('project.type.experiment')}</SelectItem>
                    <SelectItem value="enterprise">{t('project.type.enterprise')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor="visibility">
                  {t('project.form.visibility')}
                </label>
                <Select
                  value={form.visibility}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, visibility: value }))}
                >
                  <SelectTrigger id="visibility" className="h-8 w-full bg-muted/50 text-xs">
                    <SelectValue placeholder={t('project.form.selectVisibility')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="private">{t('project.visibility.private')}</SelectItem>
                    <SelectItem value="internal">{t('project.visibility.internal')}</SelectItem>
                    <SelectItem value="public">{t('project.visibility.public')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor="icon">
                  {t('project.form.iconStyle')}
                </label>
                <Select value={form.icon} onValueChange={(value) => setForm((prev) => ({ ...prev, icon: value }))}>
                  <SelectTrigger id="icon" className="h-8 w-full bg-muted/50 text-xs">
                    <SelectValue placeholder={t('project.form.selectIcon')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="folder">{t('project.form.icon.folder')}</SelectItem>
                    <SelectItem value="rocket">{t('project.form.icon.rocket')}</SelectItem>
                    <SelectItem value="target">{t('project.form.icon.target')}</SelectItem>
                    <SelectItem value="tooling">{t('project.form.icon.tooling')}</SelectItem>
                    <SelectItem value="spark">{t('project.form.icon.spark')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor="color">
                  {t('project.form.iconColor')}
                </label>
                <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5">
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue={project?.color ?? '#5E6AD2'}
                    className="h-6 w-9 cursor-pointer rounded border border-border bg-transparent p-0 shadow-none"
                  />
                  <span className="text-xs text-muted-foreground">{t('project.form.colorHint')}</span>
                </div>
              </div>
            </div>

            {isEdit ? (
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="projectCode">
                    {t('project.form.projectCode')}
                  </label>
                  <Input
                    id="projectCode"
                    name="projectCode"
                    defaultValue={project?.projectCode ?? ''}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="category">
                    {t('project.form.category')}
                  </label>
                  <Input
                    id="category"
                    name="category"
                    defaultValue={project?.category ?? ''}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ) : null}

            {isEdit ? (
              <div className="flex gap-4">
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="startDate">
                    {t('project.columns.start')}
                  </label>
                  <Input
                    id="startDate"
                    name="startDate"
                    type="date"
                    defaultValue={project?.startDate ? project.startDate.slice(0, 10) : ''}
                    className="h-8 text-xs"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-xs font-medium text-foreground" htmlFor="targetDate">
                    {t('project.columns.target')}
                  </label>
                  <Input
                    id="targetDate"
                    name="targetDate"
                    type="date"
                    defaultValue={project?.targetDate ? project.targetDate.slice(0, 10) : ''}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            ) : null}

            {!isEdit && templates.length > 0 ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground" htmlFor="templateId">
                  {t('project.form.template')}
                </label>
                <Select
                  value={form.templateId || NONE}
                  onValueChange={(value) => setForm((prev) => ({ ...prev, templateId: value === NONE ? '' : value }))}
                >
                  <SelectTrigger id="templateId" className="h-8 w-full bg-muted/50 text-xs">
                    <SelectValue placeholder={t('project.form.templateNone')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{t('project.form.templateNone')}</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending
                ? t('project.form.submitting')
                : isEdit
                  ? t('project.form.submit.edit')
                  : t('project.form.submit.create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
