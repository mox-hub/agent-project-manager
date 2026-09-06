/**
 * CustomFieldInput / CustomFieldsSection - 自定义字段动态渲染器（IssueType fieldSchema 适配引擎二期）
 *
 * - 按字段 type 渲染对应控件：text→Input、textarea→Textarea、select→NativeSelect、
 *   multiselect→Checkbox 组、number→Input[type=number]、date→Input[type=date]
 * - label 必显示，required 加标记；值统一走 onChange(unknown)，空值以 null 表示
 * - 值格式化工具 formatCustomFieldValue 供只读展示复用
 */
import { useId } from 'react';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { FieldSchemaDef } from '@/modules/issue/api/issue-type-api';

/** 按字段定义渲染单个自定义字段控件（label + 控件） */
export function CustomFieldInput({
  field,
  value,
  onChange,
}: {
  field: FieldSchemaDef;
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {field.label}
        {field.required ? <span className="text-destructive">*</span> : null}
      </Label>
      <FieldControl field={field} value={value} onChange={onChange} id={id} />
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
  id,
}: {
  field: FieldSchemaDef;
  value: unknown;
  onChange: (value: unknown) => void;
  id: string;
}) {
  const { t } = useTranslation();

  switch (field.type) {
    case 'textarea':
      return (
        <Textarea
          id={id}
          rows={3}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'select':
      return (
        <NativeSelect
          id={id}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        >
          <option value="">{t('common.none')}</option>
          {(field.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </NativeSelect>
      );
    case 'multiselect': {
      const selected = Array.isArray(value) ? value.map(String) : [];
      return (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2" id={id}>
          {(field.options ?? []).map((option) => {
            const checked = selected.includes(option);
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-1.5 text-sm text-foreground"
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={(next) =>
                    onChange(
                      next
                        ? [...selected, option]
                        : selected.filter((item) => item !== option),
                    )
                  }
                />
                {option}
              </label>
            );
          })}
        </div>
      );
    }
    case 'number':
      return (
        <Input
          id={id}
          type="number"
          value={value == null ? '' : String(value)}
          onChange={(e) =>
            onChange(e.target.value === '' ? null : Number(e.target.value))
          }
        />
      );
    case 'date':
      return (
        <Input
          id={id}
          type="date"
          value={value == null ? '' : String(value).split('T')[0]}
          onChange={(e) => onChange(e.target.value === '' ? null : e.target.value)}
        />
      );
    case 'text':
    default:
      return (
        <Input
          id={id}
          value={value == null ? '' : String(value)}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

/** 字段定义组合：按 order 排序逐字段渲染，值集中放在 values（key → value） */
export function CustomFieldsSection({
  fields,
  values,
  onChange,
}: {
  fields: FieldSchemaDef[];
  values: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const sorted = [...fields].sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  return (
    <div className="space-y-4">
      {sorted.map((field) => (
        <CustomFieldInput
          key={field.key}
          field={field}
          value={values[field.key]}
          onChange={(value) => onChange(field.key, value)}
        />
      ))}
    </div>
  );
}

/** 只读展示格式化：空值返回 ''（由调用方决定占位符），数组/对象做扁平化 */
export function formatCustomFieldValue(value: unknown): string {
  if (value == null || value === '') return '';
  if (Array.isArray(value)) return value.map((item) => String(item)).join(', ');
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}
