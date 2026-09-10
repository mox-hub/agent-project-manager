import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageShell } from '@/components/ui/page-shell';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { useAuth } from '@/modules/auth/hooks/use-auth';
import {
  useChecklists,
  useCreateChecklist,
  useDeleteChecklist,
  useUpdateChecklist,
} from '@/modules/acceptance/hooks/use-acceptance';
import type { ChecklistItem, CompletenessChecklist } from '@/modules/acceptance/api/acceptance-api';

/** 与服务端 schema 注释对齐的项目类型枚举 */
const PROJECT_TYPES = ['backend', 'frontend', 'mobile', 'library', 'api'] as const;
const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;

const EMPTY_ITEM: ChecklistItem = { category: '', content: '', severity: 'medium' };

interface ChecklistDraft {
  name: string;
  description: string;
  projectType: string;
  techStack: string;
  checklist: ChecklistItem[];
}

const EMPTY_DRAFT: ChecklistDraft = {
  name: '',
  description: '',
  projectType: 'backend',
  techStack: '',
  checklist: [{ ...EMPTY_ITEM }],
};

/** 完备性清单设置子页：系统预置可见、团队自定义创建/编辑/删除（审计清单的管理端） */
export function ChecklistsSettingsSection() {
  const { t } = useTranslation();

  return (
    <PageShell
      variant="standard"
      icon={ClipboardCheck}
      iconColor="text-accent-blue"
      title={t('settings.checklists')}
      className="bg-background text-foreground"
      contentClassName="space-y-6"
    >
      <ChecklistsCard />
    </PageShell>
  );
}

function ChecklistRow({
  checklist,
  mine,
  onEdit,
  onDelete,
}: {
  checklist: CompletenessChecklist;
  mine: boolean;
  onEdit: (c: CompletenessChecklist) => void;
  onDelete: (c: CompletenessChecklist) => void;
}) {
  const { t } = useTranslation();
  const items = checklist.checklist ?? [];

  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{checklist.name}</span>
            {checklist.isSystem ? (
              <Badge variant="secondary" className="gap-1 text-11">
                <Lock className="size-3" />
                {t('settings.checklistsSystemBadge')}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-11">
                v{checklist.version}
              </Badge>
            )}
          </div>
          {checklist.description && (
            <p className="text-xs text-muted-foreground">{checklist.description}</p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className="font-mono text-11">
              {checklist.projectType}
            </Badge>
            <Badge variant="outline" className="font-mono text-11">
              {checklist.techStack}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {t('settings.checklistsItemsCount', { count: items.length })}
            </span>
          </div>
        </div>
        {!checklist.isSystem && mine && (
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => onEdit(checklist)}>
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => onDelete(checklist)}>
              <Trash2 className="size-3.5 text-accent-red" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function ChecklistsCard() {
  const { t } = useTranslation();
  const confirmAction = useConfirm();
  const { currentUser } = useAuth();
  const { data: checklists = [], isLoading } = useChecklists();
  const createChecklist = useCreateChecklist();
  const updateChecklist = useUpdateChecklist();
  const deleteChecklist = useDeleteChecklist();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ChecklistDraft>(EMPTY_DRAFT);

  const systemChecklists = checklists.filter((c) => c.isSystem);
  const teamChecklists = checklists.filter((c) => !c.isSystem);

  const openCreate = () => {
    setEditingId(null);
    setDraft({ ...EMPTY_DRAFT, checklist: [{ ...EMPTY_ITEM }] });
    setDialogOpen(true);
  };

  const openEdit = (c: CompletenessChecklist) => {
    setEditingId(c.id);
    setDraft({
      name: c.name,
      description: c.description ?? '',
      projectType: c.projectType,
      techStack: c.techStack,
      checklist: (c.checklist ?? []).map((item) => ({ ...item })),
    });
    setDialogOpen(true);
  };

  const setItem = (index: number, patch: Partial<ChecklistItem>) => {
    setDraft((prev) => ({
      ...prev,
      checklist: prev.checklist.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  };

  const handleSave = async () => {
    const items = draft.checklist.filter((item) => item.content.trim());
    if (!draft.name.trim() || items.length === 0 || !draft.techStack.trim()) {
      toast.error(t('settings.checklistsRequired'));
      return;
    }
    const payload = {
      name: draft.name.trim(),
      description: draft.description.trim() || undefined,
      projectType: draft.projectType,
      techStack: draft.techStack.trim(),
      checklist: items.map((item) => ({ ...item, content: item.content.trim() })),
    };
    try {
      if (editingId) {
        await updateChecklist.mutateAsync({
          id: editingId,
          patch: {
            name: payload.name,
            description: payload.description,
            checklist: payload.checklist,
          },
        });
        toast.success(t('settings.checklistsUpdated'));
      } else {
        await createChecklist.mutateAsync(payload);
        toast.success(t('settings.checklistsCreated'));
      }
      setDialogOpen(false);
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  const handleDelete = async (c: CompletenessChecklist) => {
    const ok = await confirmAction({
      title: t('settings.checklistsDeleteConfirmTitle'),
      description: t('settings.checklistsDeleteConfirm', { name: c.name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteChecklist.mutateAsync(c.id);
      toast.success(t('settings.checklistsDeleted'));
    } catch (e) {
      toast.error((e as Error).message || t('settings.deleteFailed'));
    }
  };

  const renderGroup = (list: CompletenessChecklist[], emptyKey: string) =>
    isLoading ? (
      <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
    ) : list.length === 0 ? (
      <div className="text-sm text-muted-foreground">{t(emptyKey)}</div>
    ) : (
      <div className="space-y-2">
        {list.map((c) => (
          <ChecklistRow
            key={c.id}
            checklist={c}
            mine={!!currentUser && c.ownerId === currentUser.id}
            onEdit={openEdit}
            onDelete={handleDelete}
          />
        ))}
      </div>
    );

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck size={16} className="text-accent-blue" />
            <CardTitle className="text-base">{t('settings.checklistsTitle')}</CardTitle>
          </div>
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 size-3.5" />
            {t('settings.checklistsCreate')}
          </Button>
        </div>
        <CardDescription>{t('settings.checklistsDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            {t('settings.checklistsSystemGroup')}
          </h4>
          {renderGroup(systemChecklists, 'settings.checklistsSystemEmpty')}
        </section>
        <section className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">
            {t('settings.checklistsTeamGroup')}
          </h4>
          {renderGroup(teamChecklists, 'settings.checklistsTeamEmpty')}
        </section>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t('settings.checklistsEdit') : t('settings.checklistsCreate')}
            </DialogTitle>
            <DialogDescription>{t('settings.checklistsDialogDesc')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('settings.checklistsName')}</label>
              <Input
                value={draft.name}
                onChange={(e) => setDraft((p) => ({ ...p, name: e.target.value }))}
                placeholder={t('settings.checklistsNamePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">{t('settings.checklistsDescription')}</label>
              <Textarea
                value={draft.description}
                onChange={(e) => setDraft((p) => ({ ...p, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t('settings.checklistsProjectType')}</label>
                <NativeSelect
                  value={draft.projectType}
                  onChange={(e) => setDraft((p) => ({ ...p, projectType: e.target.value }))}
                >
                  {PROJECT_TYPES.map((pt) => (
                    <NativeSelectOption key={pt} value={pt} className="font-mono">
                      {pt}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">{t('settings.checklistsTechStack')}</label>
                <Input
                  value={draft.techStack}
                  onChange={(e) => setDraft((p) => ({ ...p, techStack: e.target.value }))}
                  placeholder="ts-node / react / go-gin"
                  className="font-mono"
                />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium">{t('settings.checklistItems')}</label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setDraft((p) => ({ ...p, checklist: [...p.checklist, { ...EMPTY_ITEM }] }))
                  }
                >
                  <Plus className="mr-1 size-3" />
                  {t('settings.checklistsAddItem')}
                </Button>
              </div>
              <div className="space-y-2">
                {draft.checklist.map((item, index) => (
                  <div key={index} className="space-y-1.5 rounded-lg border p-2.5">
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.category}
                        onChange={(e) => setItem(index, { category: e.target.value })}
                        placeholder={t('settings.checklistItemCategory')}
                        className="h-8 flex-1 text-xs"
                      />
                      <NativeSelect
                        value={item.severity}
                        onChange={(e) => setItem(index, { severity: e.target.value })}
                        className="h-8 w-28 text-xs"
                      >
                        {SEVERITIES.map((s) => (
                          <NativeSelectOption key={s} value={s}>
                            {t(`acceptance.severity.${s}`)}
                          </NativeSelectOption>
                        ))}
                      </NativeSelect>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() =>
                          setDraft((p) => ({
                            ...p,
                            checklist: p.checklist.filter((_, i) => i !== index),
                          }))
                        }
                        disabled={draft.checklist.length === 1}
                      >
                        <Trash2 className="size-3.5 text-accent-red" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        value={item.content}
                        onChange={(e) => setItem(index, { content: e.target.value })}
                        placeholder={t('settings.checklistItemContent')}
                        className="h-8 flex-1 text-xs"
                      />
                      <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                        <Checkbox
                          checked={!!item.autoFixable}
                          onChange={(checked) => setItem(index, { autoFixable: !!checked })}
                        />
                        {t('settings.checklistItemAutoFixable')}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={createChecklist.isPending || updateChecklist.isPending}
            >
              {t('common.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
