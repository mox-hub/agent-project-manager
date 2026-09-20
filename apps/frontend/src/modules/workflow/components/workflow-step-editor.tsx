/**
 * WorkflowStepEditor（CAP-A-12 切片②）——画布编辑模式的步骤属性面板。
 * 线性链的编辑语义 = 列表编辑：改字段 / 在此之后插入 / 删除 / 上移下移。
 * 字段按步骤类型渲染；params/body 等结构化字段用 JSON 文本域 + 保存时服务端校验兜底。
 */
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import type { WorkflowActionInfo } from '../api/workflow-api';

/** 步骤对象（definition.steps[] 成员的宽松视角） */
export type EditableStep = Record<string, unknown>;

export const STEP_TYPES = ['llm', 'human-confirm', 'http', 'condition', 'action'] as const;

const CONDITION_OPS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains'] as const;
const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const;

interface Props {
  step: EditableStep;
  actions: WorkflowActionInfo[];
  isFirst: boolean;
  isLast: boolean;
  onChange: (step: EditableStep) => void;
  onDelete: () => void;
  onInsertAfter: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

function setField(step: EditableStep, field: string, value: unknown): EditableStep {
  if (value === '' || value === undefined) {
    const next = { ...step };
    delete next[field];
    return next;
  }
  return { ...step, [field]: value };
}

function parseJsonField(raw: string): { ok: true; value: unknown } | { ok: false } {
  if (!raw.trim()) return { ok: true, value: undefined };
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

export function WorkflowStepEditor({
  step,
  actions,
  isFirst,
  isLast,
  onChange,
  onDelete,
  onInsertAfter,
  onMoveUp,
  onMoveDown,
}: Props) {
  const { t } = useTranslation();
  const type = String(step.type ?? 'llm');
  const jsonOf = (value: unknown) =>
    value === undefined ? '' : JSON.stringify(value, null, 2);

  const editJson = (field: 'body' | 'params', raw: string) => {
    const parsed = parseJsonField(raw);
    if (!parsed.ok) return; // 非法 JSON 时保持旧值，等合法再落
    onChange(setField(step, field, parsed.value));
  };

  return (
    <div className="flex h-full flex-col gap-3" data-ai="workflow.step-editor">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-content-text">
          {t('workflow.editor.stepTitle', { id: String(step.id ?? '') })}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isFirst}
            onClick={onMoveUp}
            aria-label={t('workflow.editor.moveUp')}
          >
            <ArrowUp className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={isLast}
            onClick={onMoveDown}
            aria-label={t('workflow.editor.moveDown')}
          >
            <ArrowDown className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={onDelete}
            aria-label={t('workflow.editor.delete')}
          >
            <Trash2 className="size-3.5 text-accent-red" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-11 text-content-text-muted">
          {t('workflow.editor.stepId')}
        </Label>
        <Input
          value={String(step.id ?? '')}
          onChange={(e) => onChange(setField(step, 'id', e.target.value))}
          className="h-8 font-mono text-xs"
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-11 text-content-text-muted">
          {t('workflow.editor.stepName')}
        </Label>
        <Input
          value={String(step.title ?? '')}
          onChange={(e) => onChange(setField(step, 'title', e.target.value))}
          className="h-8 text-xs"
        />
      </div>

      {type === 'llm' ? (
        <>
          <div className="space-y-1.5">
            <Label className="text-11 text-content-text-muted">
              {t('workflow.editor.system')}
            </Label>
            <Textarea
              value={String(step.system ?? '')}
              onChange={(e) => onChange(setField(step, 'system', e.target.value))}
              rows={2}
              className="text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-11 text-content-text-muted">
              {t('workflow.editor.prompt')}
            </Label>
            <Textarea
              value={String(step.prompt ?? '')}
              onChange={(e) => onChange(setField(step, 'prompt', e.target.value))}
              rows={4}
              className="text-xs"
            />
          </div>
        </>
      ) : null}

      {type === 'http' ? (
        <>
          <div className="space-y-1.5">
            <Label className="text-11 text-content-text-muted">
              {t('workflow.editor.url')}
            </Label>
            <Input
              value={String(step.url ?? '')}
              onChange={(e) => onChange(setField(step, 'url', e.target.value))}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-11 text-content-text-muted">
              {t('workflow.editor.method')}
            </Label>
            <NativeSelect
              value={String(step.method ?? 'GET')}
              onChange={(e) => onChange(setField(step, 'method', e.target.value))}
              className="h-8 text-xs"
            >
              {HTTP_METHODS.map((m) => (
                <NativeSelectOption key={m} value={m}>
                  {m}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label className="text-11 text-content-text-muted">
              {t('workflow.editor.bodyJson')}
            </Label>
            <Textarea
              value={jsonOf(step.body)}
              onChange={(e) => editJson('body', e.target.value)}
              rows={3}
              className="font-mono text-xs"
            />
          </div>
        </>
      ) : null}

      {type === 'human-confirm' ? (
        <div className="space-y-1.5">
          <Label className="text-11 text-content-text-muted">
            {t('workflow.editor.message')}
          </Label>
          <Textarea
            value={String(step.message ?? '')}
            onChange={(e) => onChange(setField(step, 'message', e.target.value))}
            rows={3}
            className="text-xs"
          />
        </div>
      ) : null}

      {type === 'condition' ? (
        <>
          <div className="space-y-1.5">
            <Label className="text-11 text-content-text-muted">
              {t('workflow.editor.left')}
            </Label>
            <Input
              value={String(step.left ?? '')}
              onChange={(e) => onChange(setField(step, 'left', e.target.value))}
              className="h-8 font-mono text-xs"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label className="text-11 text-content-text-muted">
                {t('workflow.editor.op')}
              </Label>
              <NativeSelect
                value={String(step.op ?? 'eq')}
                onChange={(e) => onChange(setField(step, 'op', e.target.value))}
                className="h-8 text-xs"
              >
                {CONDITION_OPS.map((op) => (
                  <NativeSelectOption key={op} value={op}>
                    {op}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </div>
            <div className="space-y-1.5">
              <Label className="text-11 text-content-text-muted">
                {t('workflow.editor.right')}
              </Label>
              <Input
                value={String(step.right ?? '')}
                onChange={(e) => onChange(setField(step, 'right', e.target.value))}
                className="h-8 text-xs"
              />
            </div>
          </div>
        </>
      ) : null}

      {type === 'action' ? (
        <>
          <div className="space-y-1.5">
            <Label className="text-11 text-content-text-muted">
              {t('workflow.editor.action')}
            </Label>
            <NativeSelect
              value={String(step.action ?? '')}
              onChange={(e) => onChange(setField(step, 'action', e.target.value))}
              className="h-8 text-xs"
            >
              {actions.map((a) => (
                <NativeSelectOption key={a.id} value={a.id}>
                  {a.title}（{a.id}）
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {actions.find((a) => a.id === step.action)?.description ? (
              <p className="text-11 leading-relaxed text-content-text-muted">
                {actions.find((a) => a.id === step.action)?.description}
              </p>
            ) : null}
          </div>
          <div className="space-y-1.5">
            <Label className="text-11 text-content-text-muted">
              {t('workflow.editor.paramsJson')}
            </Label>
            <Textarea
              value={jsonOf(step.params)}
              onChange={(e) => editJson('params', e.target.value)}
              rows={4}
              className="font-mono text-xs"
            />
          </div>
        </>
      ) : null}

      <div className="mt-auto flex items-center justify-between pt-2">
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onInsertAfter}>
          <Plus className="mr-1 size-3" />
          {t('workflow.editor.insertAfter')}
        </Button>
        <span className="text-11 text-content-text-muted">
          {t(`workflow.canvas.step.${type === 'human-confirm' ? 'humanConfirm' : type}`, {
            defaultValue: t('workflow.canvas.step.unknown'),
          })}
        </span>
      </div>
    </div>
  );
}
