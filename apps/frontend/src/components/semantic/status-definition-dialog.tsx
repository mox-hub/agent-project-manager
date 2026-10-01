/**
 * StatusDefinitionDialog - 状态定义新建/编辑弹窗（设置·状态）
 *
 * 字段：名称 / 分类（分组 + 组描述联动）/ 描述 / 颜色 / 图标形状（默认+注册表选集）/
 * 允许流转到（同族状态多选，工作流真实校验依据）/ 终态·阻塞态标记。
 * key 由名称自动生成（内部标识，编辑态只读展示），贴齐 Linear 形态不暴露输入框。
 * 展示型语义组件：不取数，候选/提交/删除由消费方注入。
 * 表单重置语义由消费方以 key 重挂载承担（editing/defaultGroup 变化时换 key），
 * 组件内不做 effect 回填（渲染期红线）。
 */
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RawButton } from '@/components/raw/raw-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckboxGroup } from '@/components/ui/checkbox-group';
import { ColorPicker, DEFAULT_SWATCHES } from '@/components/ui/color-picker';
import { SelectField, SelectFieldOption } from '@/components/ui/select-field';
import {
  STATUS_ICON_CHOICES,
  STATUS_GROUP_DEFAULT_ICON,
  STATUS_ICONS,
  type StatusIconKey,
} from '@/shared/status/status-visuals';
import { STATUS_GROUP_ORDER, type StatusDefinitionLike } from './status-definition-list';

/** 新建默认色：取项目预设色板第 9 格（#3b82f6，与参考形态一致；色值单一来源是色板常量） */
const DEFAULT_COLOR = DEFAULT_SWATCHES[8];

export interface StatusDefinitionDraft {
  type: string;
  key: string;
  name: string;
  group: string;
  color: string;
  /** '' = 按分组默认图标 */
  icon: string;
  description: string;
  order: number;
  isFinal: boolean;
  isBlockedState: boolean;
  allowedNextStatusKeys: string[];
}

export interface StatusDefinitionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 状态族类型（task / project），随提交回传 */
  type: string;
  /** 编辑对象；null = 新建 */
  editing: StatusDefinitionLike | null;
  /** 新建时的预选分组（从组头「+」进入） */
  defaultGroup?: string;
  /** 同族全量定义：key 查重 / 流转候选 / order 建议 */
  definitions: StatusDefinitionLike[];
  onSubmit: (draft: StatusDefinitionDraft) => void | Promise<void>;
  onDelete?: (def: StatusDefinitionLike) => void | Promise<void>;
  saving?: boolean;
  deleting?: boolean;
}

function allowedKeysOf(def: StatusDefinitionLike): string[] {
  const v = def.allowedNextStatusKeys;
  return Array.isArray(v) ? (v as string[]) : [];
}

/** 名称 → 内部 key（小写 snake；非 ASCII 名自动生成随机键；与存量撞车加序号） */
function deriveKey(name: string, definitions: StatusDefinitionLike[]): string {
  const taken = new Set(definitions.map((d) => d.key));
  const base = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
  const root = base || `status_${Date.now().toString(36)}`;
  let key = root;
  let n = 2;
  while (taken.has(key)) key = `${root}_${n++}`;
  return key;
}

function nextOrderOf(group: string, definitions: StatusDefinitionLike[]): number {
  const max = definitions
    .filter((d) => (d.group ?? 'unstarted') === group)
    .reduce((m, d) => Math.max(m, d.order ?? 0), 0);
  return max + 10;
}

function draftFromDefinition(
  editing: StatusDefinitionLike,
): DraftState {
  return {
    name: editing.name,
    group: editing.group ?? 'unstarted',
    color: editing.color || DEFAULT_COLOR,
    icon: editing.icon || '',
    description: editing.description || '',
    isFinal: Boolean(editing.isFinal),
    isBlockedState: Boolean(editing.isBlockedState),
    allowedNextStatusKeys: allowedKeysOf(editing),
  };
}

function emptyDraft(group?: string): DraftState {
  return {
    name: '',
    group: group ?? 'unstarted',
    color: DEFAULT_COLOR,
    icon: '',
    description: '',
    isFinal: false,
    isBlockedState: false,
    allowedNextStatusKeys: [],
  };
}

interface DraftState {
  name: string;
  group: string;
  color: string;
  icon: string;
  description: string;
  isFinal: boolean;
  isBlockedState: boolean;
  allowedNextStatusKeys: string[];
}

export function StatusDefinitionDialog({
  open,
  onOpenChange,
  type,
  editing,
  defaultGroup,
  definitions,
  onSubmit,
  onDelete,
  saving,
  deleting,
}: StatusDefinitionDialogProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DraftState>(() =>
    editing ? draftFromDefinition(editing) : emptyDraft(defaultGroup),
  );

  // 编辑态 key 冻结；新建态随名称派生（派生是纯函数，无防抖必要）
  const effectiveKey = useMemo(
    () => (editing ? editing.key : deriveKey(draft.name, definitions)),
    [editing, draft.name, definitions],
  );

  const transitionCandidates = useMemo(
    () => definitions.filter((d) => d.id !== editing?.id),
    [definitions, editing],
  );

  const submit = async () => {
    if (!draft.name.trim()) return;
    const group = draft.group;
    await onSubmit({
      type,
      key: editing ? editing.key : effectiveKey,
      name: draft.name.trim(),
      group,
      color: draft.color,
      icon: draft.icon,
      description: draft.description.trim(),
      order: editing ? editing.order : nextOrderOf(group, definitions),
      isFinal: draft.isFinal,
      isBlockedState: draft.isBlockedState,
      allowedNextStatusKeys: draft.allowedNextStatusKeys,
    });
  };

  // 注册表查表取引用（非 render 期创建，react-hooks/static-components）：''/未配置 → 分组默认
  const previewKey: StatusIconKey =
    draft.icon && draft.icon in STATUS_ICONS
      ? (draft.icon as StatusIconKey)
      : (STATUS_GROUP_DEFAULT_ICON[draft.group] ?? 'Circle');
  const PreviewIcon = STATUS_ICONS[previewKey];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editing ? t('settings.editStatus') : t('settings.addStatus')}
          </DialogTitle>
          <DialogDescription>{t('settings.statusFormDesc')}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.statusName')} *
            </div>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder={t('settings.statusNamePlaceholder', '例如：Code Review')}
              maxLength={30}
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.statusCategoryLabel', '分类')}
            </div>
            <SelectField
              value={draft.group}
              onChange={(e) => setDraft({ ...draft, group: e.target.value })}
            >
              {STATUS_GROUP_ORDER.map((group) => (
                <SelectFieldOption key={group} value={group}>
                  {t(`settings.statusGroup.${group}`)}
                </SelectFieldOption>
              ))}
            </SelectField>
            <p className="text-xs text-content-text-muted">
              {t(`settings.statusGroup.${draft.group}Desc`)}
            </p>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.statusDescLabel', '描述')}
            </div>
            <Textarea
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
              placeholder={t('settings.statusDescPlaceholder', '这个状态对团队意味着什么')}
              rows={3}
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.statusColorLabel', '颜色')}
            </div>
            <ColorPicker
              value={draft.color}
              onValueChange={(color) => setDraft({ ...draft, color })}
            />
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.statusIconLabel', '图标形状')}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <RawButton
                aria-pressed={draft.icon === ''}
                title={t('settings.statusIconDefault', '默认')}
                onClick={() => setDraft({ ...draft, icon: '' })}
                className={`flex size-8 items-center justify-center rounded-md border ${
                  draft.icon === ''
                    ? 'border-accent-blue bg-accent-blue/10'
                    : 'border-transparent hover:bg-accent'
                }`}
              >
                <PreviewIcon strokeWidth={2.5} className="size-4" style={{ color: draft.color }} />
              </RawButton>
              {STATUS_ICON_CHOICES.map((iconKey) => {
                const Chosen = STATUS_ICONS[iconKey];
                return (
                  <RawButton
                    key={iconKey}
                    aria-pressed={draft.icon === iconKey}
                    title={iconKey}
                    onClick={() => setDraft({ ...draft, icon: iconKey })}
                    className={`flex size-8 items-center justify-center rounded-md border ${
                      draft.icon === iconKey
                        ? 'border-accent-blue bg-accent-blue/10'
                        : 'border-transparent hover:bg-accent'
                    }`}
                  >
                    <Chosen strokeWidth={2.5} className="size-4" style={{ color: draft.color }} />
                  </RawButton>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="text-xs text-content-text-secondary">
              {t('settings.allowedNextStatuses')}
            </div>
            {transitionCandidates.length === 0 ? (
              <p className="text-xs text-content-text-muted">
                {t('settings.allowedNextStatusesEmpty')}
              </p>
            ) : (
              <CheckboxGroup
                value={draft.allowedNextStatusKeys}
                onValueChange={(value) =>
                  setDraft({ ...draft, allowedNextStatusKeys: (value as string[]) ?? [] })
                }
                className="flex-row flex-wrap"
              >
                {transitionCandidates.map((c) => (
                  <Label key={c.id} className="cursor-pointer font-normal text-content-text-secondary">
                    <Checkbox value={c.key} />
                    {c.name}
                  </Label>
                ))}
              </CheckboxGroup>
            )}
            <p className="text-xs text-content-text-muted">
              {t('settings.allowedNextStatusesHint', '未勾选任何状态时流转不受限制。')}
            </p>
          </div>

          <div className="flex gap-6">
            <Label className="cursor-pointer font-normal text-content-text-secondary">
              <Checkbox
                checked={draft.isFinal}
                onCheckedChange={(checked) => setDraft({ ...draft, isFinal: checked === true })}
              />
              {t('settings.isFinal')}
            </Label>
            <Label className="cursor-pointer font-normal text-content-text-secondary">
              <Checkbox
                checked={draft.isBlockedState}
                onCheckedChange={(checked) =>
                  setDraft({ ...draft, isBlockedState: checked === true })
                }
              />
              {t('settings.isBlockedState')}
            </Label>
          </div>

          <p className="font-mono text-3xs text-content-text-muted">
            {t('settings.statusKeyDisplay', { key: effectiveKey })}
          </p>
        </div>
        <DialogFooter>
          {editing && onDelete ? (
            <Button
              type="button"
              variant="ghost"
              disabled={deleting}
              className="mr-auto"
              onClick={() => void onDelete(editing)}
            >
              <Trash2 />
              {t('common.delete')}
            </Button>
          ) : null}
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={() => void submit()} disabled={saving || !draft.name.trim()}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
