import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import {
  useIssueTypes,
  useCreateIssueType,
  useUpdateIssueType,
  useDeleteIssueType,
} from '@/modules/issue/hooks/use-issue-types';
import type { FieldSchemaDef, FieldSchemaType, IssueTypeMeta } from '@/modules/issue/api/issue-type-api';
import { ISSUE_TYPE_ICONS, IssueTypeIcon } from '@/shared/components/issue-type-icon';
import { Plus, Shapes, Trash2, Pencil, Lock, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/components/ui/toast';
import { useConfirm } from '@/shared/confirm/use-confirm';
import { cn } from '@/lib/utils';

const ICON_CHOICES = Object.keys(ISSUE_TYPE_ICONS);

/** 与服务端 FIELD_SCHEMA_TYPES 对齐的六种字段类型 */
const FIELD_TYPE_CHOICES: FieldSchemaType[] = [
  'text',
  'textarea',
  'select',
  'multiselect',
  'number',
  'date',
];

/** 工单类型设置子页：类型元数据的创建 / 修改 / 删除（适配引擎管理端） */
export function IssueTypesSettingsSection() {
  const { t } = useTranslation();

  return (
    <PageShell className="bg-background text-foreground">
      <PageHeader icon={Shapes} iconColor="text-accent-blue" title={t('settings.issueTypes')} />
      <div className="p-6">
        <div className="mx-auto max-w-5xl space-y-6">
          <IssueTypesCard />
        </div>
      </div>
    </PageShell>
  );
}

interface DraftForm {
  key: string;
  name: string;
  icon: string;
  color: string;
}

const EMPTY_DRAFT: DraftForm = { key: '', name: '', icon: 'Circle', color: '#5E6AD2' };

function IssueTypesCard() {
  const { t } = useTranslation();
  const confirmAction = useConfirm();
  const { types, isLoading } = useIssueTypes();
  const createType = useCreateIssueType();
  const updateType = useUpdateIssueType();
  const deleteType = useDeleteIssueType();

  const [draft, setDraft] = useState<DraftForm>(EMPTY_DRAFT);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftForm>(EMPTY_DRAFT);
  // 展开字段定义编辑器的类型 id + 该类型的 fieldSchema 草稿
  const [fieldsId, setFieldsId] = useState<string | null>(null);
  const [fieldsDraft, setFieldsDraft] = useState<FieldSchemaDef[]>([]);

  const startEdit = (id: string, name: string, icon: string, color: string) => {
    setEditingId(id);
    setEditDraft({ key: '', name, icon, color });
    setFieldsId(null);
  };

  const toggleFields = (type: IssueTypeMeta) => {
    if (fieldsId === type.id) {
      setFieldsId(null);
      return;
    }
    setFieldsId(type.id);
    setFieldsDraft((type.fieldSchema ?? []).map((def) => ({ ...def })));
  };

  const handleCreate = async () => {
    if (!draft.key || !draft.name) {
      toast.error(t('settings.issueTypesRequired'));
      return;
    }
    try {
      await createType.mutateAsync({
        key: draft.key,
        name: draft.name,
        icon: draft.icon,
        color: draft.color,
      });
      setDraft(EMPTY_DRAFT);
      toast.success(t('settings.issueTypesCreated'));
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateType.mutateAsync({
        id,
        data: { name: editDraft.name, icon: editDraft.icon, color: editDraft.color },
      });
      setEditingId(null);
      toast.success(t('settings.issueTypesUpdated'));
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  const handleSaveFields = async (id: string) => {
    // 与服务端校验对齐的轻校验：key 非空唯一；select/multiselect 需选项
    const keys = fieldsDraft.map((def) => def.key.trim());
    const invalid =
      keys.some((key) => !key) ||
      new Set(keys).size !== keys.length ||
      fieldsDraft.some(
        (def) =>
          (def.type === 'select' || def.type === 'multiselect') &&
          (def.options ?? []).length === 0,
      );
    if (invalid) {
      toast.error(t('settings.issueTypesFieldInvalid'));
      return;
    }
    try {
      await updateType.mutateAsync({
        id,
        data: {
          fieldSchema: fieldsDraft.map((def, index) => ({
            ...def,
            key: def.key.trim(),
            order: def.order ?? index,
          })),
        },
      });
      toast.success(t('settings.issueTypesFieldsSaved'));
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const ok = await confirmAction({
      title: t('settings.issueTypesDeleteConfirmTitle'),
      description: t('settings.issueTypesDeleteConfirm', { name }),
      confirmText: t('common.delete'),
      cancelText: t('common.cancel'),
      variant: 'destructive',
    });
    if (!ok) return;
    try {
      await deleteType.mutateAsync(id);
      toast.success(t('settings.issueTypesDeleted'));
    } catch (e) {
      toast.error((e as Error).message || t('settings.deleteFailed'));
    }
  };

  return (
    <Card className="border-border shadow-none">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shapes size={16} className="text-accent-blue" />
          <CardTitle className="text-base">{t('settings.issueTypesTitle')}</CardTitle>
        </div>
        <CardDescription>{t('settings.issueTypesDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">{t('common.loading')}</div>
        ) : (
          <div className="space-y-2">
            {types.map((type) =>
              editingId === type.id ? (
                <div key={type.id} className="rounded-lg border border-accent-blue/40 bg-accent-blue/5 p-3 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={editDraft.name}
                      onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                      className="w-40"
                    />
                    <Input
                      type="color"
                      value={editDraft.color}
                      onChange={(e) => setEditDraft({ ...editDraft, color: e.target.value })}
                      className="h-9 w-12 cursor-pointer p-1"
                    />
                    <div className="flex-1" />
                    <Button size="sm" onClick={() => handleUpdate(type.id)} disabled={updateType.isPending}>
                      {t('common.save')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                  <IconPicker value={editDraft.icon} onChange={(icon) => setEditDraft({ ...editDraft, icon })} />
                </div>
              ) : (
                <div key={type.id} className="rounded-lg border border-border bg-muted/20">
                  <div className="flex items-center gap-3 px-3 py-2">
                    <IssueTypeIcon meta={type} />
                    <span className="text-sm font-medium text-foreground">{type.name}</span>
                    <span className="font-mono text-xs text-muted-foreground">{type.key}</span>
                    {type.fieldSchema?.length ? (
                      <span className="text-xs text-muted-foreground">
                        {t('settings.issueTypesFieldsCount', { count: type.fieldSchema.length })}
                      </span>
                    ) : null}
                    {type.isSystem ? (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Lock size={10} />
                        {type.key === 'task' ? t('settings.issueTypesLocked') : t('settings.issueTypesBuiltin')}
                      </span>
                    ) : null}
                    <div className="flex-1" />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      title={t('settings.issueTypesFields')}
                      onClick={() => toggleFields(type)}
                    >
                      <ChevronDown size={13} className={cn(fieldsId === type.id && 'rotate-180')} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7"
                      onClick={() => startEdit(type.id, type.name, type.icon, type.color)}
                    >
                      <Pencil size={13} />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-7 text-destructive"
                      disabled={type.key === 'task'}
                      title={type.key === 'task' ? t('settings.issueTypesLocked') : undefined}
                      onClick={() => handleDelete(type.id, type.name)}
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                  {fieldsId === type.id && (
                    <FieldsEditor
                      draft={fieldsDraft}
                      onChange={setFieldsDraft}
                      onSave={() => void handleSaveFields(type.id)}
                      onCancel={() => setFieldsId(null)}
                      saving={updateType.isPending}
                    />
                  )}
                </div>
              ),
            )}
          </div>
        )}

        {/* 新建自定义类型 */}
        <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
          <div className="flex gap-2">
            <Input
              value={draft.key}
              onChange={(e) => setDraft({ ...draft, key: e.target.value.toLowerCase() })}
              placeholder={t('settings.issueTypesKeyPlaceholder')}
              className="w-40 font-mono"
              maxLength={32}
            />
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={t('settings.issueTypesNamePlaceholder')}
              className="w-40"
              maxLength={50}
            />
            <Input
              type="color"
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              className="h-9 w-12 cursor-pointer p-1"
            />
            <div className="flex-1" />
            <Button size="sm" className="gap-1" onClick={handleCreate} disabled={createType.isPending}>
              <Plus size={13} />
              {t('common.create')}
            </Button>
          </div>
          <IconPicker value={draft.icon} onChange={(icon) => setDraft({ ...draft, icon })} />
        </div>
      </CardContent>
    </Card>
  );
}

/** 字段定义编辑器：每行 key/label/type/required/options/order，可增删；保存整体替换 fieldSchema */
function FieldsEditor({
  draft,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  draft: FieldSchemaDef[];
  onChange: (draft: FieldSchemaDef[]) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const { t } = useTranslation();

  const updateDef = (index: number, patch: Partial<FieldSchemaDef>) =>
    onChange(draft.map((def, i) => (i === index ? { ...def, ...patch } : def)));

  return (
    <div className="space-y-2 border-t border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{t('settings.issueTypesFieldsHint')}</p>
      {draft.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t('settings.issueTypesFieldsEmpty')}</p>
      ) : (
        <div className="space-y-1.5">
          {draft.map((def, index) => (
            <div key={index} className="flex flex-wrap items-center gap-2">
              <Input
                value={def.key}
                placeholder={t('settings.issueTypesFieldKeyPlaceholder')}
                onChange={(e) => updateDef(index, { key: e.target.value.toLowerCase() })}
                className="w-36 font-mono"
                maxLength={64}
              />
              <Input
                value={def.label}
                placeholder={t('settings.issueTypesFieldLabelPlaceholder')}
                onChange={(e) => updateDef(index, { label: e.target.value })}
                className="w-28"
                maxLength={50}
              />
              <div className="w-32">
                <NativeSelect
                  value={def.type}
                  onChange={(e) => updateDef(index, { type: e.target.value as FieldSchemaType })}
                >
                  {FIELD_TYPE_CHOICES.map((type) => (
                    <option key={type} value={type}>
                      {t(`settings.issueTypesFieldTypes${type.charAt(0).toUpperCase()}${type.slice(1)}`)}
                    </option>
                  ))}
                </NativeSelect>
              </div>
              <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
                <Checkbox
                  checked={!!def.required}
                  onCheckedChange={(checked) => updateDef(index, { required: checked === true })}
                />
                {t('settings.issueTypesFieldRequired')}
              </label>
              {(def.type === 'select' || def.type === 'multiselect') && (
                <Input
                  value={(def.options ?? []).join(',')}
                  placeholder={t('settings.issueTypesFieldOptionsPlaceholder')}
                  onChange={(e) =>
                    updateDef(index, {
                      options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  className="w-44"
                />
              )}
              <Input
                type="number"
                value={def.order ?? index}
                title={t('settings.issueTypesFieldOrder')}
                onChange={(e) =>
                  updateDef(index, { order: e.target.value === '' ? undefined : Number(e.target.value) })
                }
                className="w-16"
              />
              <Button
                size="icon"
                variant="ghost"
                className="size-7 text-destructive"
                onClick={() => onChange(draft.filter((_, i) => i !== index))}
              >
                <Trash2 size={13} />
              </Button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1"
          onClick={() => onChange([...draft, { key: '', label: '', type: 'text', order: draft.length }])}
        >
          <Plus size={13} />
          {t('settings.issueTypesFieldsAdd')}
        </Button>
        <div className="flex-1" />
        <Button size="sm" onClick={onSave} disabled={saving}>
          {t('common.save')}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      </div>
    </div>
  );
}

function IconPicker({ value, onChange }: { value: string; onChange: (icon: string) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-wrap items-center gap-1">
      <span className="mr-1 text-xs text-muted-foreground">{t('settings.issueTypesIcon')}</span>
      {ICON_CHOICES.map((iconName) => {
        const Icon = ISSUE_TYPE_ICONS[iconName];
        return (
          <button
            key={iconName}
            type="button"
            onClick={() => onChange(iconName)}
            className={`flex size-6 items-center justify-center rounded-md border transition-colors ${
              value === iconName
                ? 'border-accent-blue bg-accent-blue/10'
                : 'border-transparent hover:bg-muted'
            }`}
            title={iconName}
          >
            <Icon size={13} />
          </button>
        );
      })}
    </div>
  );
}
