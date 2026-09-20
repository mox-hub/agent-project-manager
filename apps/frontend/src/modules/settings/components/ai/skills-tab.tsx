/**
 * 技能 Tab —— 技能注册表（真实后端数据：分类展示 / 启停 / 编辑 / 导入 / 新建 / 删除）。
 * @description 由原 ai-agents-section skills 页签迁移（2026-09-19 页面合并）。
 * 原 ai-management 的本地假技能开关（无持久化）已废除，统一由本 Tab 真实数据承担。
 */
import { useEffect, useState } from 'react';
import { FileInput, Pencil, Plus, Trash2, Zap } from 'lucide-react';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';
import { useConfirm } from '@/shared/confirm/use-confirm';
import {
  skillsApi,
  useCreateSkill,
  useDeleteSkill,
  useImportSkill,
  useSkills,
  useUpdateSkill,
  type CreateSkillRequest,
  type ImportSkillRequest,
  type SkillStatus as SkillItem,
  type UpdateSkillRequest,
} from '@/modules/skills';

/** 新建 / 本地导入 / 编辑技能的弹窗表单（edit 模式拉详情回填指令正文） */
function SkillDialog({
  dialog,
  onClose,
  onCreate,
  onImport,
  onEdit,
  pending,
}: {
  dialog: { mode: 'create' | 'import' | 'edit'; skill: SkillItem | null } | null;
  onClose: () => void;
  onCreate: (data: CreateSkillRequest) => void;
  onImport: (data: ImportSkillRequest) => void;
  onEdit: (key: string, data: UpdateSkillRequest) => void;
  pending: boolean;
}) {
  const { t } = useTranslation();
  const open = dialog !== null;
  const mode = dialog?.mode ?? 'create';
  const editing = dialog?.skill ?? null;

  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [content, setContent] = useState('');
  const [sourcePath, setSourcePath] = useState('');
  const [initializedFor, setInitializedFor] = useState<string | null>(null);

  // 打开时同步初始化表单（渲染期比较，等价原 effect 的同步段）
  const initKey = open ? `${mode}:${editing?.key ?? 'new'}` : null;
  if (initKey !== null && initializedFor !== initKey) {
    setInitializedFor(initKey);
    setKey(editing?.key ?? '');
    setName(editing?.name ?? '');
    setDescription(editing?.description ?? '');
    setCategory(editing?.category ?? '');
    setContent('');
    setSourcePath('');
  }

  // edit 模式异步拉详情回填指令正文
  useEffect(() => {
    if (!(open && mode === 'edit' && editing)) return;
    let cancelled = false;
    skillsApi.getSkill(editing.key).then(
      (detail) => {
        if (!cancelled) setContent(detail.content ?? '');
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [open, mode, editing]);

  const keyValid = /^[a-z0-9][a-z0-9-]*$/.test(key);
  const valid =
    mode === 'import'
      ? sourcePath.trim().length > 0
      : mode === 'edit'
        ? name.trim().length > 0
        : name.trim().length > 0 && keyValid;

  const handleSubmit = () => {
    if (!valid) return;
    if (mode === 'create') {
      onCreate({
        key: key.trim(),
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        content: content.trim() || undefined,
      });
    } else if (mode === 'import') {
      onImport({
        sourcePath: sourcePath.trim(),
        key: key.trim() || undefined,
        name: name.trim() || undefined,
        category: category.trim() || undefined,
      });
    } else if (editing) {
      onEdit(editing.key, {
        name: name.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        content: content.trim() || undefined,
      });
    }
  };

  const titleKey =
    mode === 'create' ? 'aiHub.skillCreateTitle' : mode === 'import' ? 'aiHub.skillImportTitle' : 'aiHub.skillEditTitle';

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t(titleKey)}</DialogTitle>
          <DialogDescription>
            {mode === 'import' ? t('aiHub.skillImportDesc') : t('aiHub.skillDialogDesc')}
          </DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
          {mode === 'import' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('aiHub.skillFieldSourcePath')}</label>
              <Input
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                placeholder="C:\skills\grill-me\SKILL.md"
                className="font-mono"
              />
            </div>
          ) : null}
          {mode !== 'edit' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">
                {t('aiHub.skillFieldKey')}
                {mode === 'import' ? `（${t('aiHub.skillOptional')}）` : ''}
              </label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder={mode === 'import' ? t('aiHub.skillKeyFromPath') : 'my-skill'}
                className="font-mono"
              />
              {mode === 'create' && key.length > 0 && !keyValid ? (
                <p className="text-xs text-accent-red">{t('aiHub.skillKeyInvalid')}</p>
              ) : null}
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">
              {t('aiHub.skillFieldName')}
              {mode === 'import' ? `（${t('aiHub.skillOptional')}）` : ''}
            </label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Grilling 需求拷问" />
          </div>
          {mode !== 'import' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('aiHub.skillFieldDescription')}</label>
              <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('aiHub.mcpOptionalDescription')} />
            </div>
          ) : null}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">{t('aiHub.skillFieldCategory')}</label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Development" />
          </div>
          {mode !== 'import' ? (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">{t('aiHub.skillFieldContent')}</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={8}
                className="font-mono text-xs"
                placeholder={t('aiHub.skillContentPlaceholder')}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>{t('common.cancel')}</Button>
          <Button size="sm" onClick={handleSubmit} disabled={!valid || pending} className="gap-1.5">
            {pending ? <Spinner className="size-3.5 text-inherit" /> : null}
            {mode === 'import' ? t('aiHub.skillImportAction') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SkillsTab() {
  const { t } = useTranslation();
  const confirmDialog = useConfirm();

  const { data: skillsData, isLoading: skillsLoading } = useSkills();
  const updateSkillMutation = useUpdateSkill();
  const createSkillMutation = useCreateSkill();
  const importSkillMutation = useImportSkill();
  const deleteSkillMutation = useDeleteSkill();
  const skills = skillsData?.skills ?? [];

  const [skillDialog, setSkillDialog] = useState<{
    mode: 'create' | 'import' | 'edit';
    skill: SkillItem | null;
  } | null>(null);

  const failMessage = (err: unknown) => (err instanceof Error ? err.message : t('common.unknown'));

  const handleDeleteSkill = async (skill: SkillItem) => {
    const ok = await confirmDialog({
      title: t('aiHub.skillDeleteTitle', { name: skill.name }),
      description: t('aiHub.skillDeleteDesc'),
      variant: 'destructive',
    });
    if (!ok) return;
    deleteSkillMutation.mutate(skill.key, {
      onSuccess: () => toast.success(t('aiHub.skillDeletedToast', { name: skill.name })),
      onError: (err) => toast.error(t('aiHub.deleteFailed', { message: failMessage(err) })),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{t('aiHub.skills')}</h2>
          <p className="text-xs text-muted-foreground">{t('aiHub.skillsRegistryDesc')}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSkillDialog({ mode: 'import', skill: null })}>
            <FileInput size={14} />
            {t('aiHub.skillImport')}
          </Button>
          <Button size="sm" className="gap-1.5" onClick={() => setSkillDialog({ mode: 'create', skill: null })}>
            <Plus size={14} />
            {t('aiHub.skillCreate')}
          </Button>
        </div>
      </div>

      {skillsLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : skills.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border p-10 text-center">
          <Zap size={20} className="mb-2 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t('aiHub.skillEmpty', '暂无技能，可新建或从本地导入')}</p>
          <Button size="sm" variant="outline" className="mt-3" onClick={() => setSkillDialog({ mode: 'create', skill: null })}>
            <Plus size={14} className="mr-1" /> {t('aiHub.skillCreate')}
          </Button>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(
            skills.reduce<Record<string, SkillItem[]>>((acc, skill) => {
              (acc[skill.category] ??= []).push(skill);
              return acc;
            }, {}),
          ).map(([category, items]) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{category}</h3>
              <div className="space-y-2">
                {items.map((skill) => (
                  <div key={skill.key} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate text-sm font-medium">
                        {skill.name}
                        <Badge variant="outline" className="shrink-0 text-10 uppercase">
                          {skill.source}
                        </Badge>
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{skill.description}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        variant={skill.enabled ? 'default' : 'outline'}
                        size="sm"
                        disabled={updateSkillMutation.isPending && updateSkillMutation.variables?.key === skill.key}
                        onClick={() =>
                          updateSkillMutation.mutate(
                            { key: skill.key, data: { enabled: !skill.enabled } },
                            {
                              onSuccess: () =>
                                toast.success(t(skill.enabled ? 'aiHub.skillToggledOffToast' : 'aiHub.skillToggledOnToast', { name: skill.name })),
                              onError: (err) => toast.error(t('aiHub.updateFailed', { message: failMessage(err) })),
                            },
                          )
                        }
                      >
                        {updateSkillMutation.isPending && updateSkillMutation.variables?.key === skill.key ? (
                          <Spinner className="size-3.5 text-inherit" />
                        ) : skill.enabled ? (
                          t('aiHub.enabled')
                        ) : (
                          t('aiHub.disabled')
                        )}
                      </Button>
                      <Button variant="outline" size="sm" className="gap-1.5 px-2" aria-label={t('common.edit')} onClick={() => setSkillDialog({ mode: 'edit', skill })}>
                        <Pencil size={13} />
                      </Button>
                      {skill.source === 'custom' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="px-2 text-accent-red hover:bg-accent-red-light/50 hover:text-accent-red"
                          aria-label={t('common.delete')}
                          onClick={() => handleDeleteSkill(skill)}
                        >
                          <Trash2 size={13} />
                        </Button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 新建 / 导入 / 编辑技能 */}
      <SkillDialog
        dialog={skillDialog}
        onClose={() => setSkillDialog(null)}
        onCreate={(data) =>
          createSkillMutation.mutate(data, {
            onSuccess: (result) => {
              toast.success(t('aiHub.skillCreatedToast', { name: result.name }));
              setSkillDialog(null);
            },
            onError: (err) => toast.error(t('aiHub.createFailed', { message: failMessage(err) })),
          })
        }
        onImport={(data) =>
          importSkillMutation.mutate(data, {
            onSuccess: (result) => {
              toast.success(t('aiHub.skillImportedToast', { name: result.name }));
              setSkillDialog(null);
            },
            onError: (err) => toast.error(t('aiHub.createFailed', { message: failMessage(err) })),
          })
        }
        onEdit={(key, data) =>
          updateSkillMutation.mutate(
            { key, data },
            {
              onSuccess: (result) => {
                toast.success(t('aiHub.skillUpdatedToast', { name: result.name }));
                setSkillDialog(null);
              },
              onError: (err) => toast.error(t('aiHub.updateFailed', { message: failMessage(err) })),
            },
          )
        }
        pending={createSkillMutation.isPending || importSkillMutation.isPending || updateSkillMutation.isPending}
      />
    </div>
  );
}
