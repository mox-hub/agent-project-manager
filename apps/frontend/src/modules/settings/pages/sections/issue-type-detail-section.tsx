import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  CircleDot,
  Clock,
  CirclePause,
  CircleX,
  CopyPlus,
  HelpCircle,
  Layers,
  Plus,
  Shapes,
  Sparkles,
} from 'lucide-react';
import { PageShell } from '@/components/ui/page-shell';
import { PageHeader } from '@/components/ui/page-header';
import { ToolbarRow } from '@/components/ui/toolbar-row';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AsyncState } from '@/components/ui/async-state';
import { useIssueTypes, useUpdateIssueType } from '@/modules/issue/hooks/use-issue-types';
import type {
  FieldSchemaDef,
  FieldSchemaType,
  IssueTypeMeta,
} from '@/modules/issue/api/issue-type-api';
import { useStatuses, useCreateStatus } from '@/modules/core-config/hooks/use-metadata';
import { ISSUE_TYPE_ICONS, IssueTypeIcon } from '@/shared/components/issue-type-icon';
import { toast } from '@/components/ui/toast';

const ICON_CHOICES = Object.keys(ISSUE_TYPE_ICONS);

/** 与服务端 FIELD_SCHEMA_TYPES 对齐的九种字段类型 */
const FIELD_TYPE_CHOICES: FieldSchemaType[] = [
  'text',
  'textarea',
  'select',
  'multiselect',
  'number',
  'date',
  'boolean',
  'member',
  'url',
];

/** 状态分组受控词表（与 schema 注释同步）＋ 展示序 */
const STATUS_GROUP_ORDER = ['triage', 'backlog', 'unstarted', 'started', 'completed', 'canceled'] as const;

/** 状态分组 → 语义图标（仅管理面展示用） */
const STATUS_GROUP_ICONS: Record<string, typeof CircleDot> = {
  triage: HelpCircle,
  backlog: Clock,
  unstarted: CirclePause,
  started: CircleDot,
  completed: CheckCircle2,
  canceled: CircleX,
};

/**
 * 任务类型详情（设置 · 任务类型 → 类型，CAP-A-04）：
 * 基本信息 / 自定义字段 / 状态分组三页签。状态为全局共享族（跨类型一致）。
 */
export function IssueTypeDetailSection() {
  const { typeKey } = useParams<{ typeKey: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { types, isLoading } = useIssueTypes(true);
  const type = useMemo(() => types.find((ty) => ty.key === typeKey), [types, typeKey]);

  return (
    <PageShell className="overflow-hidden bg-background text-foreground">
      <PageHeader
        icon={Shapes}
        iconColor="text-accent-blue"
        title={type ? type.name : t('settings.issueTypeDetail', '任务类型详情')}
      />
      <AsyncState
        isLoading={isLoading}
        isEmpty={!isLoading && !type}
        emptyTitle={t('settings.issueTypeNotFound', '类型不存在或已被删除')}
        onRetry={() => navigate('/app/settings/issue-types')}
      >
        {type ? <IssueTypeDetailBody type={type} /> : null}
      </AsyncState>
    </PageShell>
  );
}

function IssueTypeDetailBody({ type }: { type: IssueTypeMeta }) {
  const { t } = useTranslation();
  const isDefault = type.key === 'task';
  const [tab, setTab] = useState('basics');
  // 状态页签计数（全局状态族，与 StatusesTab 同源）
  const statusesQuery = useStatuses();
  const statusCount = (statusesQuery.data ?? []).filter((s) => !s.projectId).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 纯样式切换页：不传 views（视图管理整体隐藏），仅居中页签 */}
      <ToolbarRow
        aiId="settings.issue-type-detail"
        viewStyle={{
          layout: 'centered',
          value: tab,
          onChange: setTab,
          options: [
            { value: 'basics', label: t('settings.basicsTab', '基本信息') },
            {
              value: 'fields',
              label: `${t('settings.fieldsTab', '自定义字段')}（${type.fieldSchema?.length ?? 0}）`,
            },
            {
              value: 'statuses',
              label: `${t('settings.statusTab', '状态')}（${statusCount}）`,
            },
          ],
        }}
        filterMenu={false}
        displayMenu={false}
        downloadMenu={false}
      />

      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-4 md:px-7">
        <div className="flex items-center gap-3">
          <IssueTypeIcon meta={type} className="size-8" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-foreground">{type.name}</span>
              {isDefault ? <Badge variant="secondary">{t('settings.defaultType', '默认')}</Badge> : null}
              {!type.enabled ? <Badge variant="outline">{t('settings.typeDisabled', '已停用')}</Badge> : null}
            </div>
            <div className="truncate text-xs text-content-text-secondary">
              {type.description || t('settings.issueTypeNoDesc', '尚未填写类型描述')}
            </div>
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsContent value="basics">
            <BasicsTab key={type.id} type={type} isDefault={isDefault} />
          </TabsContent>
          <TabsContent value="fields">
            <FieldsTab key={type.id} type={type} />
          </TabsContent>
          <TabsContent value="statuses">
            <StatusesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

/* ---------------- 基本信息 ---------------- */

function BasicsTab({ type, isDefault }: { type: IssueTypeMeta; isDefault: boolean }) {
  const { t } = useTranslation();
  const updateType = useUpdateIssueType();
  const [draft, setDraft] = useState({
    name: type.name,
    description: type.description ?? '',
    icon: type.icon,
    color: type.color,
    enabled: type.enabled,
  });

  const save = async () => {
    try {
      await updateType.mutateAsync({
        id: type.id,
        data: {
          name: draft.name,
          description: draft.description || undefined,
          icon: draft.icon,
          color: draft.color,
          enabled: draft.enabled,
        },
      });
      toast.success(t('settings.issueTypesUpdated'));
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
    }
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="space-y-1.5">
        <label className="text-xs text-content-text-secondary">{t('settings.issueTypeNameLabel', '名称')}</label>
        <Input
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          maxLength={50}
          className="max-w-sm"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-content-text-secondary">{t('settings.issueTypeDescLabel', '描述')}</label>
        <Textarea
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          placeholder={t('settings.issueTypeDescPlaceholder', '一句话说明该类型跟踪什么工作')}
          rows={2}
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-content-text-secondary">{t('settings.issueTypeIcon', '图标')}</label>
        <div className="flex flex-wrap items-center gap-1">
          {ICON_CHOICES.map((iconName) => {
            const Icon = ISSUE_TYPE_ICONS[iconName];
            return (
              <button
                key={iconName}
                type="button"
                onClick={() => setDraft({ ...draft, icon: iconName })}
                className={`flex size-7 items-center justify-center rounded-md border motion-shift ${
                  draft.icon === iconName
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-transparent hover:bg-accent'
                }`}
                title={iconName}
              >
                <Icon size={14} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-xs text-content-text-secondary">{t('settings.issueTypeColor', '颜色')}</label>
        <Input
          type="color"
          value={draft.color}
          onChange={(e) => setDraft({ ...draft, color: e.target.value })}
          className="h-9 w-20 cursor-pointer p-1"
        />
      </div>
      <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
        <div>
          <div className="text-sm text-foreground">{t('settings.enabled', '启用')}</div>
          <div className="text-xs text-content-text-secondary">
            {isDefault
              ? t('settings.defaultTypeAlwaysOn', '默认类型不可停用')
              : t('settings.enabledHint', '停用后新工单不再可选此类型，既有工单不受影响')}
          </div>
        </div>
        <Switch
          checked={draft.enabled}
          disabled={isDefault}
          onCheckedChange={(checked) => setDraft({ ...draft, enabled: checked })}
        />
      </div>
      <div className="flex justify-end">
        <Button size="sm" onClick={() => void save()} disabled={updateType.isPending}>
          {t('common.save')}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- 自定义字段 ---------------- */

function FieldsTab({ type }: { type: IssueTypeMeta }) {
  const { t } = useTranslation();
  const updateType = useUpdateIssueType();
  const [draft, setDraft] = useState<FieldSchemaDef[]>(type.fieldSchema ?? []);
  const [dialogDef, setDialogDef] = useState<FieldSchemaDef | null>(null);
  const [dialogIndex, setDialogIndex] = useState<number>(-1);

  const persist = async (next: FieldSchemaDef[]) => {
    const keys = next.map((def) => def.key.trim());
    const invalid =
      keys.some((key) => !key) ||
      new Set(keys).size !== keys.length ||
      next.some(
        (def) =>
          (def.type === 'select' || def.type === 'multiselect') &&
          (def.options ?? []).length === 0,
      );
    if (invalid) {
      toast.error(t('settings.issueTypesFieldInvalid'));
      return false;
    }
    try {
      await updateType.mutateAsync({
        id: type.id,
        data: {
          fieldSchema: next.map((def, index) => ({
            ...def,
            key: def.key.trim(),
            order: index,
          })),
        },
      });
      toast.success(t('settings.issueTypesFieldsSaved'));
      return true;
    } catch (e) {
      toast.error((e as Error).message || t('settings.updateFailed'));
      return false;
    }
  };

  const move = async (index: number, delta: -1 | 1) => {
    const target = index + delta;
    if (target < 0 || target >= draft.length) return;
    const next = [...draft];
    [next[index], next[target]] = [next[target], next[index]];
    setDraft(next);
    await persist(next);
  };

  const toggleEnabled = async (index: number, enabled: boolean) => {
    const next = draft.map((def, i) => (i === index ? { ...def, enabled } : def));
    setDraft(next);
    await persist(next);
  };

  const saveDialog = async (def: FieldSchemaDef, index: number) => {
    const next =
      index >= 0
        ? draft.map((d, i) => (i === index ? def : d))
        : [...draft, { ...def, order: draft.length }];
    const ok = await persist(next);
    if (ok) setDialogDef(null);
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-content-text-secondary">{t('settings.issueTypesFieldsHint')}</p>
      {draft.length === 0 ? (
        <p className="text-xs text-content-text-muted">{t('settings.issueTypesFieldsEmpty')}</p>
      ) : (
        <div className="divide-y divide-border rounded-lg border border-border">
          {draft.map((def, index) => {
            const Icon = getFieldIcon(def.type);
            return (
              <div key={`${def.key}-${index}`} className="flex items-center gap-3 px-3 py-2">
                <button
                  type="button"
                  onClick={() => void move(index, -1)}
                  disabled={index === 0}
                  className="text-content-text-muted hover:text-content-text-secondary disabled:opacity-30"
                  aria-label={t('common.moveUp', '上移')}
                >
                  <ArrowUp size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => void move(index, 1)}
                  disabled={index === draft.length - 1}
                  className="text-content-text-muted hover:text-content-text-secondary disabled:opacity-30"
                  aria-label={t('common.moveDown', '下移')}
                >
                  <ArrowDown size={13} />
                </button>
                <Icon size={14} className="shrink-0 text-content-text-secondary" />
                <button
                  type="button"
                  className="min-w-0 flex-1 text-left"
                  onClick={() => {
                    setDialogIndex(index);
                    setDialogDef({ ...def });
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm text-foreground">{def.label}</span>
                    {def.required ? (
                      <Badge variant="secondary">{t('settings.issueTypesFieldRequired')}</Badge>
                    ) : null}
                    {def.enabled === false ? (
                      <Badge variant="outline">{t('settings.typeDisabled', '已停用')}</Badge>
                    ) : null}
                  </div>
                  <div className="truncate font-mono text-xs text-content-text-muted">
                    {def.key} · {t(`settings.issueTypesFieldTypes${def.type.charAt(0).toUpperCase()}${def.type.slice(1)}`)}
                  </div>
                </button>
                <Switch
                  checked={def.enabled !== false}
                  onCheckedChange={(checked) => void toggleEnabled(index, checked)}
                  aria-label={t('settings.enabled', '启用')}
                />
              </div>
            );
          })}
        </div>
      )}
      <Button
        size="sm"
        variant="outline"
        className="gap-1"
        onClick={() => {
          setDialogIndex(-1);
          setDialogDef({ key: '', label: '', type: 'text', order: draft.length });
        }}
      >
        <Plus size={14} />
        {t('settings.addField', '添加自定义字段')}
      </Button>

      {dialogDef ? (
        <FieldDialog
          def={dialogDef}
          isNew={dialogIndex < 0}
          existingKeys={draft.map((d) => d.key)}
          onCancel={() => setDialogDef(null)}
          onSave={(def) => void saveDialog(def, dialogIndex)}
          saving={updateType.isPending}
        />
      ) : null}
    </div>
  );
}

function getFieldIcon(type: FieldSchemaType) {
  const map: Record<FieldSchemaType, typeof Layers> = {
    text: Layers,
    textarea: Layers,
    select: CopyPlus,
    multiselect: CopyPlus,
    number: HelpCircle,
    date: Clock,
    boolean: CheckCircle2,
    member: Sparkles,
    url: ChevronDown,
  };
  return map[type];
}


function FieldDialog({
  def,
  isNew,
  existingKeys,
  onCancel,
  onSave,
  saving,
}: {
  def: FieldSchemaDef;
  isNew: boolean;
  existingKeys: string[];
  onCancel: () => void;
  onSave: (def: FieldSchemaDef) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<FieldSchemaDef>(def);
  const [error, setError] = useState('');

  const submit = () => {
    if (!draft.key.trim() || !draft.label.trim()) {
      setError(t('settings.issueTypesFieldInvalid'));
      return;
    }
    if (isNew && existingKeys.includes(draft.key.trim())) {
      setError(t('settings.issueTypesFieldKeyDup', '字段 key 与现有字段重复'));
      return;
    }
    if (
      (draft.type === 'select' || draft.type === 'multiselect') &&
      (draft.options ?? []).length === 0
    ) {
      setError(t('settings.issueTypesFieldNeedOptions', 'select/multiselect 至少需要一个选项'));
      return;
    }
    onSave(draft);
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isNew ? t('settings.addField', '添加自定义字段') : t('settings.editField', '编辑自定义字段')}
          </DialogTitle>
          <DialogDescription>{t('settings.fieldDialogDesc', '此类型任务需要记录的字段。')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.issueTypeNameLabel', '名称')}</label>
            <Input
              value={draft.label}
              onChange={(e) => setDraft({ ...draft, label: e.target.value })}
              placeholder={t('settings.fieldLabelPlaceholder', '例如 Severity、Story points')}
              maxLength={50}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.issueTypeKeyLabel', '键（小写 slug）')}</label>
            <Input
              value={draft.key}
              onChange={(e) => setDraft({ ...draft, key: e.target.value.toLowerCase() })}
              placeholder="severity"
              className="font-mono"
              maxLength={64}
              disabled={!isNew}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.fieldTypeLabel', '类型')}</label>
            <NativeSelect
              value={draft.type}
              onChange={(e) => setDraft({ ...draft, type: e.target.value as FieldSchemaType })}
            >
              {FIELD_TYPE_CHOICES.map((type) => (
                <option key={type} value={type}>
                  {t(`settings.issueTypesFieldTypes${type.charAt(0).toUpperCase()}${type.slice(1)}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          {(draft.type === 'select' || draft.type === 'multiselect') && (
            <div className="space-y-1.5">
              <label className="text-xs text-content-text-secondary">{t('settings.issueTypesFieldOptions', '选项（逗号分隔）')}</label>
              <Input
                value={(draft.options ?? []).join(',')}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  })
                }
                placeholder="low, medium, high"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.fieldDefaultValue', '默认值（可选）')}</label>
            {draft.type === 'boolean' ? (
              <NativeSelect
                value={draft.defaultValue ?? ''}
                onChange={(e) => setDraft({ ...draft, defaultValue: e.target.value || undefined })}
              >
                <option value="">{t('settings.none', '无')}</option>
                <option value="true">true</option>
                <option value="false">false</option>
              </NativeSelect>
            ) : draft.type === 'select' ? (
              <NativeSelect
                value={draft.defaultValue ?? ''}
                onChange={(e) => setDraft({ ...draft, defaultValue: e.target.value || undefined })}
              >
                <option value="">{t('settings.none', '无')}</option>
                {(draft.options ?? []).map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </NativeSelect>
            ) : draft.type === 'multiselect' ? (
              <Input
                value={draft.defaultValue ?? ''}
                onChange={(e) => setDraft({ ...draft, defaultValue: e.target.value || undefined })}
                placeholder={t('settings.fieldMultiDefaultPlaceholder', '多个默认值用逗号分隔')}
              />
            ) : (
              <Input
                value={draft.defaultValue ?? ''}
                onChange={(e) => setDraft({ ...draft, defaultValue: e.target.value || undefined })}
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.fieldDescLabel', '描述（可选）')}</label>
            <Textarea
              value={draft.description ?? ''}
              onChange={(e) => setDraft({ ...draft, description: e.target.value || undefined })}
              placeholder={t('settings.fieldDescPlaceholder', '说明此字段的用途和使用场景。')}
              rows={2}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-content-text-secondary">
            <Checkbox
              checked={!!draft.required}
              onCheckedChange={(checked) => setDraft({ ...draft, required: checked === true })}
            />
            {t('settings.issueTypesFieldRequired', '必填')}
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- 状态分组 ---------------- */

function StatusesTab() {
  const { t } = useTranslation();
  const statusesQuery = useStatuses();
  const createStatus = useCreateStatus();
  const [addOpen, setAddOpen] = useState(false);
  const globalStatuses = useMemo(
    () => (statusesQuery.data ?? []).filter((s) => !s.projectId),
    [statusesQuery.data],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof globalStatuses>();
    for (const group of STATUS_GROUP_ORDER) map.set(group, []);
    for (const status of globalStatuses) {
      const group =
        status.group && (STATUS_GROUP_ORDER as readonly string[]).includes(status.group)
          ? status.group
          : 'unstarted';
      map.get(group)?.push(status);
    }
    return map;
  }, [globalStatuses]);

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs text-content-text-secondary">{t('settings.statusGroupsHint', '设置该工作空间可用的状态；顺序即组内展示顺序。')}</p>
        <Button size="sm" variant="outline" className="gap-1" onClick={() => setAddOpen(true)}>
          <Plus size={14} />
          {t('settings.addStatus', '添加状态')}
        </Button>
      </div>
      {STATUS_GROUP_ORDER.map((group) => {
        const items = grouped.get(group) ?? [];
        if (items.length === 0) return null;
        const GroupIcon = STATUS_GROUP_ICONS[group] ?? CircleDot;
        return (
          <div key={group} className="space-y-1.5">
            <div className="flex items-center gap-2">
              <GroupIcon size={14} className="text-content-text-secondary" />
              <span className="text-sm font-medium text-foreground">
                {t(`settings.statusGroup.${group}`)}
              </span>
            </div>
            <p className="text-xs text-content-text-muted">{t(`settings.statusGroup.${group}Desc`)}</p>
            <div className="space-y-1.5">
              {items.map((status) => (
                <div
                  key={status.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2"
                >
                  <CircleDot size={14} className="text-content-text-muted" />
                  <span className="text-sm text-foreground">{status.name}</span>
                  {status.key === 'todo' ? (
                    <Badge variant="secondary">{t('settings.defaultType', '默认')}</Badge>
                  ) : null}
                  <span className="flex-1" />
                  <span className="font-mono text-10 text-content-text-muted">{status.key}</span>
                  {status.isFinal ? (
                    <Badge variant="outline">{t('settings.statusFinalBadge', '终态')}</Badge>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {addOpen ? (
        <AddStatusDialog
          existingKeys={globalStatuses.map((s) => s.key)}
          nextOrder={(globalStatuses.reduce((max, s) => Math.max(max, s.order ?? 0), 0) ?? 0) + 10}
          onCancel={() => setAddOpen(false)}
          onSubmit={async (data) => {
            try {
              await createStatus.mutateAsync(data);
              toast.success(t('settings.issueTypesUpdated'));
              setAddOpen(false);
            } catch (e) {
              toast.error((e as Error).message || t('settings.updateFailed'));
            }
          }}
          saving={createStatus.isPending}
        />
      ) : null}
    </div>
  );
}

function AddStatusDialog({
  existingKeys,
  nextOrder,
  onCancel,
  onSubmit,
  saving,
}: {
  existingKeys: string[];
  nextOrder: number;
  onCancel: () => void;
  onSubmit: (data: { type: string; key: string; name: string; group: string; order: number; isFinal: boolean }) => void;
  saving: boolean;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({ name: '', key: '', group: 'unstarted', isFinal: false });
  const [error, setError] = useState('');

  const submit = () => {
    if (!draft.name.trim() || !draft.key.trim()) {
      setError(t('settings.issueTypesRequired'));
      return;
    }
    if (existingKeys.includes(draft.key.trim())) {
      setError(t('settings.statusKeyDup', '状态键已存在'));
      return;
    }
    onSubmit({
      type: 'task',
      key: draft.key.trim(),
      name: draft.name.trim(),
      group: draft.group,
      order: nextOrder,
      isFinal: draft.isFinal,
    });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('settings.addStatus', '添加状态')}</DialogTitle>
          <DialogDescription>{t('settings.addStatusDesc', '新增状态将对该空间所有任务类型生效。')}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.statusName', '名称')}</label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              maxLength={20}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.statusKey', '键（小写 slug）')}</label>
            <Input
              value={draft.key}
              onChange={(e) => setDraft({ ...draft, key: e.target.value.toLowerCase() })}
              className="font-mono"
              maxLength={32}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs text-content-text-secondary">{t('settings.statusGroupLabel', '所属分组')}</label>
            <NativeSelect
              value={draft.group}
              onChange={(e) => setDraft({ ...draft, group: e.target.value })}
            >
              {STATUS_GROUP_ORDER.map((group) => (
                <option key={group} value={group}>
                  {t(`settings.statusGroup.${group}`)}
                </option>
              ))}
            </NativeSelect>
          </div>
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-content-text-secondary">
            <Checkbox
              checked={draft.isFinal}
              onCheckedChange={(checked) => setDraft({ ...draft, isFinal: checked === true })}
            />
            {t('settings.statusFinalLabel', '终态（表示工作已完成或关闭）')}
          </label>
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            {t('common.cancel')}
          </Button>
          <Button onClick={submit} disabled={saving}>
            {t('common.create')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
