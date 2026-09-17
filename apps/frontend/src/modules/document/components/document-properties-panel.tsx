import { useMemo, useState } from 'react';
import { Calendar as CalendarIcon } from 'lucide-react';
import {
  AlignJustify,
  AlignLeft,
  AtSign,
  Boxes,
  Check,
  CheckSquare,
  CircleDot,
  Clock,
  FolderOpen,
  Hash,
  History,
  Image as ImageIcon,
  List,
  Palette,
  Plus,
  Send,
  Shapes,
  SlidersHorizontal,
  Tag,
  TriangleAlert,
  Type,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox';
import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { PropertyRow } from '@/components/ui/property-panel';
import { SidebarPanel } from '@/components/ui/sidebar-panel';
import { cn } from '@/lib/utils';
import {
  getPropertyKeyType,
  parseFrontmatterProperties,
  setFrontmatterProperties,
  type FrontmatterProperty,
  type FrontmatterPropertyType,
} from '../services/mdx-frontmatter';

interface DocumentPropertiesPanelProps {
  /** 文档源内容（含 frontmatter），编辑结果经 onSave 写回 */
  content: string;
  /** 仅作者可编辑；访客只读 */
  editable: boolean;
  /** 提交写回（页面接 useUpdateDocument 落库） */
  onSave: (nextContent: string) => void;
}

const KEY_ICONS: Record<string, LucideIcon> = {
  title: Type,
  author: User,
  tags: Tag,
  aliases: AtSign,
  category: Shapes,
  created: Clock,
  updated: History,
  published: Send,
  status: CircleDot,
  summary: AlignLeft,
  coverImage: ImageIcon,
  cssclass: Palette,
  project: FolderOpen,
  module: Boxes,
  short_id: Hash,
};

const TYPE_ICONS: Record<FrontmatterPropertyType, LucideIcon> = {
  text: AlignJustify,
  list: List,
  number: Hash,
  boolean: CheckSquare,
  date: Clock,
};

// 添加属性时的键名建议（Combobox 可检索，也允许自由输入白名单外键）
const KEY_SUGGESTIONS = [
  'author',
  'tags',
  'aliases',
  'category',
  'created',
  'published',
  'summary',
  'coverImage',
  'cssclass',
  'priority',
  'source',
];

const READONLY_TITLE = '系统镜像属性：与数据库/审批流联动，请在状态徽章或文档设置中修改';

function splitListValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function formatPropertyValue(property: FrontmatterProperty): string {
  if (property.value == null) return '';
  if (property.type === 'date') {
    const date =
      property.value instanceof Date ? property.value : new Date(String(property.value));
    if (Number.isNaN(date.getTime())) return String(property.value);
    return date.toLocaleString('zh-CN', { hour12: false });
  }
  if (property.type === 'list') return splitListValue(property.value).join('、');
  return String(property.value);
}

/** 行内值编辑器状态（text/date/number 共用文本框） */
type EditingState = { key: string; draft: string } | null;

export function DocumentPropertiesPanel({ content, editable, onSave }: DocumentPropertiesPanelProps) {
  // 保存落库与查询刷新之间有间隙：本地覆盖层把连续提交串成链，
  // 每次提交都基于上一次提交后的内容，不会被刷新前的旧 content 覆盖
  const [override, setOverride] = useState<string | null>(null);
  const effectiveContent = override ?? content;

  const { properties, malformed } = useMemo(
    () => parseFrontmatterProperties(effectiveContent),
    [effectiveContent],
  );

  const [editing, setEditing] = useState<EditingState>(null);
  const [listAdding, setListAdding] = useState<string | null>(null);
  const [listDraft, setListDraft] = useState('');
  const [addingProperty, setAddingProperty] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newBool, setNewBool] = useState(false);
  // 添加行当前键的类型（决定值编辑器形态）
  const newKeyType = getPropertyKeyType(newKey.trim());

  const commit = (props: Record<string, unknown | null | undefined>) => {
    const next = setFrontmatterProperties(effectiveContent, props);
    setOverride(next);
    onSave(next);
  };

  const commitText = (property: FrontmatterProperty) => {
    if (!editing || editing.key !== property.key) return;
    const value = editing.draft.trim();
    if (value === '') {
      commit({ [property.key]: null });
      setEditing(null);
      return;
    }
    // number 型属性回型，避免编辑一次就把 YAML 里的数字变成带引号字符串
    const typed =
      property.type === 'number' && value !== '' && Number.isFinite(Number(value))
        ? Number(value)
        : value;
    commit({ [property.key]: typed });
    setEditing(null);
  };

  const commitChip = (property: FrontmatterProperty, next: string[]) => {
    commit({ [property.key]: next });
  };

  const addChip = (property: FrontmatterProperty) => {
    const parts = listDraft
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) {
      setListAdding(null);
      return;
    }
    commitChip(property, [...splitListValue(property.value), ...parts]);
    setListDraft('');
    setListAdding(null);
  };

  const submitNewProperty = () => {
    const key = newKey.trim();
    if (!key || properties.some((p) => p.key === key)) return;
    let value: unknown;
    if (newKeyType === 'boolean') {
      value = newBool;
    } else if (newKeyType === 'list') {
      value = newValue
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      value = newValue.trim();
    }
    // 空值语义是「删键」，创建时输入为空就不落键（占位提示已标必填）
    if (value === '' || (Array.isArray(value) && value.length === 0)) return;
    commit({ [key]: value });
    setAddingProperty(false);
    setNewKey('');
    setNewValue('');
    setNewBool(false);
  };

  const cancelNewProperty = () => {
    setAddingProperty(false);
    setNewKey('');
    setNewValue('');
    setNewBool(false);
  };

  if (malformed) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-dashed border-accent-yellow/40 bg-accent-yellow/5 px-2.5 py-2 text-xs leading-relaxed text-muted-foreground">
        <TriangleAlert size={13} className="mt-0.5 shrink-0 text-accent-yellow" />
        <span>frontmatter 解析失败：请先修复文档源文件中的 YAML 语法，属性面板已暂时停用，以免写回时破坏正文。</span>
      </div>
    );
  }

  if (properties.length === 0 && !editable) return null;

  return (
    <div data-ai-component="document.document-view.properties-panel">
      <SidebarPanel
        title="属性"
        icon={<SlidersHorizontal size={14} />}
        action={
          properties.length > 0 ? (
            <span className="text-10 text-muted-foreground">({properties.length})</span>
          ) : undefined
        }
      >
        {properties.map((property) => {
          const Icon = KEY_ICONS[property.key] ?? TYPE_ICONS[property.type];
          return (
            <PropertyRow
              key={property.key}
              icon={<Icon size={12} />}
              label={property.key}
              className="group/prop"
              labelClassName="w-30 flex-none"
              childrenClassName="min-w-0 flex-1"
            >
              <div className="flex min-w-0 items-center gap-1">
                <div className="min-w-0 flex-1">
                  {property.readonly ? (
                    <span
                      title={READONLY_TITLE}
                      className="block truncate px-1 py-0.5 text-xs text-muted-foreground"
                    >
                      {formatPropertyValue(property)}
                    </span>
                  ) : property.type === 'list' ? (
                    <div className="flex flex-wrap items-center gap-1.5 px-1 py-0.5">
                      {splitListValue(property.value).map((item) => (
                        <Badge key={item} variant="secondary" className="max-w-full">
                          <span className="truncate">{item}</span>
                          {editable && (
                            <button
                              type="button"
                              aria-label={`移除 ${item}`}
                              className="shrink-0 text-muted-foreground/70 transition-colors hover:text-destructive"
                              onClick={() =>
                                commitChip(
                                  property,
                                  splitListValue(property.value).filter((v) => v !== item),
                                )
                              }
                            >
                              <X size={11} />
                            </button>
                          )}
                        </Badge>
                      ))}
                      {editable &&
                        (listAdding === property.key ? (
                          <Input
                            autoFocus
                            value={listDraft}
                            onChange={(e) => setListDraft(e.target.value)}
                            onBlur={() => addChip(property)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addChip(property);
                              if (e.key === 'Escape') {
                                setListDraft('');
                                setListAdding(null);
                              }
                            }}
                            placeholder="标签名，逗号可批量"
                            className="h-6 w-36 px-2 text-xs"
                          />
                        ) : (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-xs"
                            aria-label="添加列表项"
                            className="size-5 text-muted-foreground"
                            onClick={() => {
                              setListDraft('');
                              setListAdding(property.key);
                            }}
                          >
                            <Plus size={12} />
                          </Button>
                        ))}
                    </div>
                  ) : property.type === 'boolean' ? (
                    <div className="px-1 py-0.5">
                      <Checkbox
                        checked={property.value === true}
                        disabled={!editable}
                        onCheckedChange={(checked) => commit({ [property.key]: checked === true })}
                      />
                    </div>
                  ) : editing?.key === property.key ? (
                    <Input
                      autoFocus
                      value={editing.draft}
                      onChange={(e) => setEditing({ key: property.key, draft: e.target.value })}
                      onBlur={() => commitText(property)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitText(property);
                        if (e.key === 'Escape') setEditing(null);
                      }}
                      placeholder={property.type === 'date' ? 'ISO 日期，如 2026-09-17' : '属性值'}
                      className="h-6 px-2 text-xs"
                    />
                  ) : (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      disabled={!editable}
                      onClick={() =>
                        setEditing({ key: property.key, draft: formatPropertyValue(property) })
                      }
                      className={cn(
                        'h-6 w-full max-w-full justify-start px-2 font-normal',
                        editable ? 'text-foreground' : 'text-muted-foreground',
                      )}
                      title={property.readonly ? READONLY_TITLE : undefined}
                    >
                      <span className="truncate">
                        {formatPropertyValue(property) || '（空）'}
                      </span>
                    </Button>
                  )}
                </div>

                {editable && !property.readonly && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    aria-label={`删除属性 ${property.key}`}
                    title="删除该属性"
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/prop:opacity-100"
                    onClick={() => commit({ [property.key]: null })}
                  >
                    <X size={12} />
                  </Button>
                )}
              </div>
            </PropertyRow>
          );
        })}

        {editable &&
          (addingProperty ? (
            <div className="flex items-center gap-2 px-2 py-1">
              <Combobox onValueChange={(v) => setNewKey(String(v ?? ''))}>
                <ComboboxInput
                  autoFocus
                  placeholder="属性名"
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-30 flex-none"
                />
                <ComboboxContent>
                  <ComboboxList>
                    {KEY_SUGGESTIONS.filter((k) => !properties.some((p) => p.key === k)).map(
                      (k) => (
                        <ComboboxItem key={k} value={k}>
                          {k}
                        </ComboboxItem>
                      ),
                    )}
                  </ComboboxList>
                  <ComboboxEmpty>无匹配建议——直接输入后点 ✓ 创建</ComboboxEmpty>
                </ComboboxContent>
              </Combobox>

              {newKeyType === 'boolean' ? (
                <div className="flex min-w-0 flex-1 items-center gap-2 px-1">
                  <Checkbox
                    checked={newBool}
                    onCheckedChange={(checked) => setNewBool(checked === true)}
                  />
                  <span className="text-xs text-muted-foreground">
                    {newBool ? 'true' : 'false'}
                  </span>
                </div>
              ) : newKeyType === 'date' ? (
                <DatePicker
                  value={newValue ? new Date(`${newValue}T00:00:00`) : undefined}
                  onValueChange={(d) => {
                    if (!d) {
                      setNewValue('');
                      return;
                    }
                    const yyyy = d.getFullYear();
                    const mm = String(d.getMonth() + 1).padStart(2, '0');
                    const dd = String(d.getDate()).padStart(2, '0');
                    setNewValue(`${yyyy}-${mm}-${dd}`);
                  }}
                  trigger={
                    <Button
                      type="button"
                      variant="outline"
                      size="xs"
                      className={cn(
                        'min-w-0 flex-1 justify-start font-normal',
                        !newValue && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon size={12} />
                      <span className="truncate">{newValue || '选择日期'}</span>
                    </Button>
                  }
                />
              ) : (
                <Input
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitNewProperty();
                    if (e.key === 'Escape') cancelNewProperty();
                  }}
                  placeholder={
                    newKeyType === 'list' ? '逗号分隔，如 a, b' : '属性值（必填）'
                  }
                  className="h-6 min-w-0 flex-1 px-2 text-xs"
                />
              )}

              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="确认添加属性"
                disabled={
                  !newKey.trim() ||
                  properties.some((p) => p.key === newKey.trim()) ||
                  (newKeyType !== 'boolean' && !newValue.trim())
                }
                className="shrink-0 text-muted-foreground"
                onClick={submitNewProperty}
              >
                <Check size={14} />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="取消添加"
                className="shrink-0 text-muted-foreground"
                onClick={cancelNewProperty}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="xs"
              onClick={() => setAddingProperty(true)}
              className="w-full justify-start text-muted-foreground"
            >
              <Plus size={12} /> 添加属性
            </Button>
          ))}
      </SidebarPanel>
    </div>
  );
}
