/**
 * FilterChipsRow — Linear 风格筛选条件条（工具栏之下单开一行）。
 *
 * 模型：FilterCondition[]（字段 + 算子 + 值集），由页面元数据 FilterFieldDef 驱动；
 * 页面用 filterConditionSets / matchesConditionSets 把条件聚合为 包含/排除 集合做谓词判断，
 * 视图快照直接存 conditions 数组（JSON 可序列化，兼容 useToolbarViews）。
 *
 * 结构参照 Linear 筛选设计：[字段图标+名称｜算子｜值(图标堆叠+文案)｜×] 四段拼接 chip，
 * 行尾 + 追加条件（允许同字段多条件），右侧 Clear / Save(保存到当前视图·另存为新视图)。
 */
import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Filter, Plus, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AnchoredMenu } from "./anchored-menu";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { HeaderActionButton } from "./header-action-button";
import { Input } from "./input";
import {
  Menu,
  MenuCheckboxItem,
  MenuPopup,
  MenuSub,
  MenuSubPopup,
  MenuSubTrigger,
  MenuTrigger,
} from "./menu";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "./command";
import { MENU_ITEM_CLASS } from "./menu-surface";

/* ────────────────────────────── 模型 ────────────────────────────── */

export type FilterOperatorId = "is" | "isNot" | "include" | "notInclude";

export interface FilterValueOption {
  value: string;
  label: string;
  /** 候选值图标（状态图标/色点/头像等，页面自定义） */
  icon?: ReactNode;
  /** 候选值右侧辅助文字（如计数） */
  hint?: string;
}

export interface FilterFieldDef {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** 该字段支持的算子，首个为新建条件时的默认值 */
  operators: FilterOperatorId[];
  options: FilterValueOption[];
  /** 值面板是否带搜索框（候选较多时开，如项目） */
  searchable?: boolean;
}

export interface FilterCondition {
  id: string;
  fieldId: string;
  operator: FilterOperatorId;
  values: string[];
}

let conditionSeq = 0;

export function createFilterCondition(fieldId: string, operator?: FilterOperatorId): FilterCondition {
  conditionSeq += 1;
  return {
    id: `cond-${Date.now().toString(36)}-${conditionSeq}`,
    fieldId,
    operator: operator ?? "is",
    values: [],
  };
}

/**
 * 聚合某字段的 包含/排除 集合：is/include → include，isNot/notInclude → exclude。
 * include 为空 = 该字段不限制。
 */
export function filterConditionSets(
  conditions: FilterCondition[],
  fieldId: string,
): { include: string[]; exclude: string[] } {
  const include: string[] = [];
  const exclude: string[] = [];
  for (const condition of conditions) {
    if (condition.fieldId !== fieldId || condition.values.length === 0) continue;
    if (condition.operator === "isNot" || condition.operator === "notInclude") {
      exclude.push(...condition.values);
    } else {
      include.push(...condition.values);
    }
  }
  return { include, exclude };
}

/** 单值字段判定：include 空则不限；命中 exclude 一票否决 */
export function matchesConditionSets(
  value: string | null | undefined,
  sets: { include: string[]; exclude: string[] },
): boolean {
  const v = value ?? "";
  return (sets.include.length === 0 || sets.include.includes(v)) && !sets.exclude.includes(v);
}

/** 按键聚合计数（值菜单 hint 计数用；null/undefined 键跳过） */
export function countBy<T>(
  items: T[],
  keyOf: (item: T) => string | null | undefined,
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const item of items) {
    const key = keyOf(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

const OPERATOR_I18N_KEY: Record<FilterOperatorId, string> = {
  is: "common.filterOpIs",
  isNot: "common.filterOpIsNot",
  include: "common.filterOpInclude",
  notInclude: "common.filterOpNotInclude",
};

/* ─────────────────────────── 内部子组件 ─────────────────────────── */

/** chip 拼接段的公共底色：首段圆左、末段圆右、中间直角 */
const SEGMENT_CLASS =
  "flex h-6 items-center bg-muted text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground";

function OperatorMenu({
  field,
  operator,
  onOperatorChange,
}: {
  field: FilterFieldDef;
  operator: FilterOperatorId;
  onOperatorChange: (operator: FilterOperatorId) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn(SEGMENT_CLASS, "px-1.5")}
      >
        {t(OPERATOR_I18N_KEY[operator])}
      </button>
      <AnchoredMenu open={open} onClose={() => setOpen(false)} anchor={anchorRef}>
        <div className="min-w-24">
          {field.operators.map((op) => (
            <button
              key={op}
              type="button"
              className={cn(MENU_ITEM_CLASS, "text-xs")}
              onClick={() => {
                onOperatorChange(op);
                setOpen(false);
              }}
            >
              <span className="flex-1">{t(OPERATOR_I18N_KEY[op])}</span>
              {op === operator ? (
                <Check className="ml-2 size-3.5 shrink-0 text-primary" strokeWidth={2.5} />
              ) : null}
            </button>
          ))}
        </div>
      </AnchoredMenu>
    </>
  );
}

function ValueMenu({
  field,
  values,
  autoOpen,
  onValuesChange,
}: {
  field: FilterFieldDef;
  values: string[];
  /** 新建空值条件时首开面板（仅初始态，之后随用户交互） */
  autoOpen?: boolean;
  onValuesChange: (values: string[]) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(autoOpen ?? false);
  const [query, setQuery] = useState("");
  const anchorRef = useRef<HTMLButtonElement>(null);

  const close = () => {
    setOpen(false);
    setQuery("");
  };
  const toggle = (value: string) =>
    onValuesChange(
      values.includes(value) ? values.filter((v) => v !== value) : [...values, value],
    );

  const selected = field.options.filter((option) => values.includes(option.value));
  const rest = field.options.filter((option) => !values.includes(option.value));

  const renderItem = (option: FilterValueOption, checked: boolean) => (
    <CommandItem
      key={option.value}
      value={option.label}
      onSelect={() => toggle(option.value)}
      className="text-xs"
    >
      <Checkbox className="mr-1" checked={checked} render={<span aria-hidden="true" />} />
      {option.icon}
      <span className="truncate">{option.label}</span>
      {option.hint ? (
        <span className="ml-auto pl-2 text-xs text-muted-foreground">{option.hint}</span>
      ) : null}
    </CommandItem>
  );

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(SEGMENT_CLASS, "max-w-60 gap-1.5 px-1.5")}
      >
        {selected.length > 0 ? (
          <>
            <span className="flex items-center -space-x-1">
              {selected.slice(0, 3).map((option) => (
                <span key={option.value} className="inline-flex shrink-0">
                  {option.icon}
                </span>
              ))}
            </span>
            <span className="truncate">
              {selected.length === 1
                ? selected[0].label
                : t("common.filterValuesSelected", { count: selected.length })}
            </span>
          </>
        ) : (
          <span>{t("common.filterSelectValue")}</span>
        )}
      </button>
      <AnchoredMenu open={open} onClose={close} anchor={anchorRef}>
        <Command className="w-56">
          {field.searchable ? (
            <div className="p-1.5 pb-0">
              <CommandInput
                value={query}
                onValueChange={setQuery}
                placeholder={field.label}
                className="h-8 text-xs"
              />
            </div>
          ) : null}
          <CommandList className="max-h-64">
            <CommandEmpty>{t("common.filterNoResults")}</CommandEmpty>
            {selected.length > 0 ? (
              <CommandGroup>{selected.map((option) => renderItem(option, true))}</CommandGroup>
            ) : null}
            {rest.length > 0 ? (
              <>
                {selected.length > 0 ? <CommandSeparator /> : null}
                <CommandGroup>{rest.map((option) => renderItem(option, false))}</CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      </AnchoredMenu>
    </>
  );
}

function FilterChip({
  field,
  condition,
  onChange,
  onRemove,
}: {
  field: FilterFieldDef;
  condition: FilterCondition;
  onChange: (patch: Partial<FilterCondition>) => void;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  const FieldIcon = field.icon;

  return (
    <div className="flex shrink-0 items-center" role="group" aria-label={field.label}>
      <span className="flex h-6 items-center gap-1.5 rounded-l-md bg-muted px-1.5 text-xs text-foreground">
        {FieldIcon ? <FieldIcon className="size-3.5 text-muted-foreground" strokeWidth={1.75} /> : null}
        {field.label}
      </span>
      <OperatorMenu
        field={field}
        operator={condition.operator}
        onOperatorChange={(operator) => onChange({ operator })}
      />
      <ValueMenu
        field={field}
        values={condition.values}
        autoOpen={condition.values.length === 0}
        onValuesChange={(values) => onChange({ values })}
      />
      <button
        type="button"
        aria-label={t("common.delete")}
        title={t("common.delete")}
        onClick={onRemove}
        className={cn(SEGMENT_CLASS, "w-6 justify-center rounded-r-md")}
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

/* ─────────────────── 二级级联筛选菜单（漏斗按钮，Linear 形态） ─────────────────── */

/**
 * 漏斗按钮 + 两级菜单：顶部「添加筛选」搜索过滤字段，字段项 hover 展开值子菜单
 * （图标 + 计数 hint + 勾选态），勾选/取消直接增删同字段条件的值——与 FilterChipsRow
 * 操作同一份 conditions 状态，可独立使用也可配合条件条调整。
 */
export function FilterCascadeMenu({
  fields,
  conditions,
  onChange,
  badge,
  search,
  aiId,
}: {
  fields: FilterFieldDef[];
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  /** 漏斗按钮右上角生效筛选数角标 */
  badge?: number;
  /** 页面内容搜索框（保持旧版漏斗菜单内的搜索能力） */
  search?: { value: string; onChange: (value: string) => void; placeholder?: string };
  aiId?: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const keyword = query.trim().toLowerCase();
  const visibleFields = keyword
    ? fields.filter((field) => field.label.toLowerCase().includes(keyword))
    : fields;

  const toggleFieldValue = (field: FilterFieldDef, value: string) => {
    const existing = conditions.find((c) => c.fieldId === field.id);
    if (!existing) {
      onChange([
        ...conditions,
        { ...createFilterCondition(field.id, field.operators[0]), values: [value] },
      ]);
      return;
    }
    const values = existing.values.includes(value)
      ? existing.values.filter((v) => v !== value)
      : [...existing.values, value];
    onChange(
      values.length === 0
        ? conditions.filter((c) => c.id !== existing.id)
        : conditions.map((c) => (c.id === existing.id ? { ...c, values } : c)),
    );
  };

  return (
    <Menu open={open} onOpenChange={setOpen}>
      <span className="relative inline-flex shrink-0">
        <MenuTrigger
          render={
            <HeaderActionButton
              icon={Filter}
              label={t("common.filters")}
              variant="outline"
              pinned={open}
              aria-haspopup="menu"
              aria-expanded={open}
              data-ai-component={aiId ?? "ui.filter-cascade-menu"}
            />
          }
        />
        {badge && badge > 0 ? (
          <span className="pointer-events-none absolute -top-1 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-xs font-medium leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <MenuPopup align="start" className="w-60">
        {search ? (
          <div className="p-1 pb-0">
            <Input
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
              placeholder={search.placeholder}
              className="h-8 text-xs"
            />
          </div>
        ) : null}
        <div className="p-1 pb-0">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={t("common.filterAdd")}
            className="h-8 text-xs"
          />
        </div>
        <div className="mt-1">
          {visibleFields.map((field) => {
            const FieldIcon = field.icon;
            const fieldCondition = conditions.find((c) => c.fieldId === field.id);
            return (
              <MenuSub key={field.id}>
                <MenuSubTrigger className="text-xs">
                  {FieldIcon ? <FieldIcon className="text-muted-foreground" strokeWidth={1.75} /> : null}
                  <span className="flex-1 truncate">{field.label}</span>
                  {fieldCondition && fieldCondition.values.length > 0 ? (
                    <span className="ms-1 text-xs text-muted-foreground">
                      {fieldCondition.values.length}
                    </span>
                  ) : null}
                </MenuSubTrigger>
                <MenuSubPopup className="min-w-44">
                  {field.options.map((option) => (
                    <MenuCheckboxItem
                      key={option.value}
                      checked={fieldCondition?.values.includes(option.value) ?? false}
                      closeOnClick={false}
                      onCheckedChange={() => toggleFieldValue(field, option.value)}
                      className="text-xs"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {option.icon}
                        <span className="truncate">{option.label}</span>
                        {option.hint ? (
                          <span className="ms-auto pl-2 text-xs text-muted-foreground">
                            {option.hint}
                          </span>
                        ) : null}
                      </span>
                    </MenuCheckboxItem>
                  ))}
                </MenuSubPopup>
              </MenuSub>
            );
          })}
          {visibleFields.length === 0 ? (
            <div className="px-2 py-3 text-xs text-muted-foreground">
              {t("common.filterNoResults")}
            </div>
          ) : null}
        </div>
      </MenuPopup>
    </Menu>
  );
}

/* ─────────────────────── 字段清单（追加条件菜单） ─────────────────────── */

/** 字段清单：供 FilterChipsRow 行尾 + 与页面 ToolbarRow 漏斗按钮的 filterMenu.content 复用 */
export function FilterFieldMenuList({
  fields,
  onSelect,
}: {
  fields: FilterFieldDef[];
  onSelect: (fieldId: string) => void;
}) {
  return (
    <div className="min-w-36">
      {fields.map((field) => {
        const Icon = field.icon;
        return (
          <button
            key={field.id}
            type="button"
            className={cn(MENU_ITEM_CLASS, "text-xs")}
            onClick={() => onSelect(field.id)}
          >
            {Icon ? <Icon className="mr-2 size-4 shrink-0" strokeWidth={1.75} /> : null}
            <span className="flex-1 truncate">{field.label}</span>
            <Plus className="ml-2 size-3.5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
          </button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────── FilterChipsRow ─────────────────────────── */

export interface FilterChipsRowProps {
  /** 可筛选字段定义（追加菜单与 chip 渲染的数据源） */
  fields: FilterFieldDef[];
  conditions: FilterCondition[];
  onChange: (conditions: FilterCondition[]) => void;
  /** 保存到当前视图（页面接 useToolbarViews 的当前快照即为最新态） */
  onSaveToView?: () => void;
  /** 另存为新视图，参数为用户输入的视图名 */
  onSaveAsNewView?: (name: string) => void;
  aiId?: string;
  className?: string;
}

export function FilterChipsRow({
  fields,
  conditions,
  onChange,
  onSaveToView,
  onSaveAsNewView,
  aiId,
  className,
}: FilterChipsRowProps) {
  const { t } = useTranslation();
  const addAnchorRef = useRef<HTMLButtonElement>(null);
  const [addOpen, setAddOpen] = useState(false);
  const saveAnchorRef = useRef<HTMLButtonElement>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [viewName, setViewName] = useState("");

  const closeSave = () => {
    setSaveOpen(false);
    setSaveAsOpen(false);
    setViewName("");
  };

  const updateCondition = (id: string, patch: Partial<FilterCondition>) =>
    onChange(conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const removeCondition = (id: string) => onChange(conditions.filter((c) => c.id !== id));
  const addCondition = (fieldId: string) => {
    const field = fields.find((f) => f.id === fieldId);
    onChange([...conditions, createFilterCondition(fieldId, field?.operators[0])]);
    setAddOpen(false);
  };

  const canSave = Boolean(onSaveToView || onSaveAsNewView);

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg border border-border bg-muted/30 px-2 py-1.5",
        className,
      )}
      data-ai-component={aiId ?? "ui.filter-chips-row"}
      data-ai-role="filter"
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
        {conditions.map((condition) => {
          const field = fields.find((f) => f.id === condition.fieldId);
          if (!field) return null;
          return (
            <FilterChip
              key={condition.id}
              field={field}
              condition={condition}
              onChange={(patch) => updateCondition(condition.id, patch)}
              onRemove={() => removeCondition(condition.id)}
            />
          );
        })}
        <span className="relative shrink-0">
          <button
            ref={addAnchorRef}
            type="button"
            aria-label={t("common.filterAdd")}
            title={t("common.filterAdd")}
            aria-haspopup="menu"
            aria-expanded={addOpen}
            onClick={() => setAddOpen((prev) => !prev)}
            className="flex size-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Plus className="size-3.5" strokeWidth={1.75} />
          </button>
          <AnchoredMenu open={addOpen} onClose={() => setAddOpen(false)} anchor={addAnchorRef}>
            <FilterFieldMenuList fields={fields} onSelect={addCondition} />
          </AnchoredMenu>
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          onClick={() => onChange([])}
        >
          {t("common.filterClear")}
        </Button>
        {canSave ? (
          <span className="relative">
            <Button
              ref={saveAnchorRef}
              variant="ghost"
              size="xs"
              className="gap-0.5 text-muted-foreground"
              aria-haspopup="menu"
              aria-expanded={saveOpen}
              onClick={() => setSaveOpen((prev) => !prev)}
            >
              {t("common.filterSave")}
              <ChevronDown className="size-3 opacity-70" />
            </Button>
            <AnchoredMenu open={saveOpen} onClose={closeSave} anchor={saveAnchorRef}>
              {saveAsOpen ? (
                <form
                  className="flex w-56 flex-col gap-2 p-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSaveAsNewView?.(viewName.trim() || "View");
                    closeSave();
                  }}
                >
                  <Input
                    autoFocus
                    value={viewName}
                    onChange={(event) => setViewName(event.target.value)}
                    placeholder={t("common.filterNewViewName")}
                    className="h-8 text-xs"
                  />
                  <Button type="submit" size="sm">
                    {t("common.filterCreate")}
                  </Button>
                </form>
              ) : (
                <div className="min-w-40">
                  {onSaveToView ? (
                    <button
                      type="button"
                      className={cn(MENU_ITEM_CLASS, "text-xs")}
                      onClick={() => {
                        onSaveToView();
                        closeSave();
                      }}
                    >
                      <span className="flex-1">{t("common.filterSaveToView")}</span>
                    </button>
                  ) : null}
                  {onSaveAsNewView ? (
                    <button
                      type="button"
                      className={cn(MENU_ITEM_CLASS, "text-xs")}
                      onClick={() => setSaveAsOpen(true)}
                    >
                      <span className="flex-1">{t("common.filterSaveAsView")}</span>
                    </button>
                  ) : null}
                </div>
              )}
            </AnchoredMenu>
          </span>
        ) : null}
      </div>
    </div>
  );
}
