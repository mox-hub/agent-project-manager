/**
 * StatusDefinitionList - 状态定义分组列表（Linear 式，设置·状态）
 *
 * 按 group 受控词表分组渲染：组头（组名 + 计数 + 新建按钮）+ 组内行（拖拽排序、
 * 真实 color/icon、描述、流转徽标、hover 查看入口）。
 * 展示型语义组件：不取数，definitions/counts/回调全部由消费方注入。
 * 消费方：设置·状态页（status-manager）、类型详情·状态页签（issue-type-detail-section）。
 */
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Plus } from 'lucide-react';
import {
  Sortable,
  SortableItem,
  SortableItemHandle,
} from '@/components/ui/sortable';
import { RawButton } from '@/components/raw/raw-button';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusIconFrame } from '@/shared/status/status-icon-frame';
import type { StatusVisualEntry } from '@/shared/status/status-visuals';
import { STATUS_ICONS, STATUS_GROUP_DEFAULT_ICON, type StatusIconKey } from '@/shared/status/status-visuals';
import { cn } from '@/lib/utils';

/** 分组展示序（受控词表与 schema 注释同步；空组渲染组头便于往空组添加） */
export const STATUS_GROUP_ORDER = [
  'triage',
  'backlog',
  'unstarted',
  'started',
  'completed',
  'canceled',
] as const;

/** 状态定义最小形状（StatusDefinition 响应的结构子集，语义组件不依赖 modules 类型） */
export interface StatusDefinitionLike {
  id: string;
  key: string;
  name: string;
  group?: string;
  color?: string | null;
  icon?: string | null;
  description?: string | null;
  order: number;
  isFinal?: boolean;
  isBlockedState?: boolean;
  allowedNextStatusKeys?: unknown;
}

export interface StatusDefinitionListProps {
  definitions: StatusDefinitionLike[];
  /** 动态视觉映射（useStatusVisualMap）：行内 Frame 的 tone/兜底 icon 来源 */
  visualMap?: Map<string, StatusVisualEntry>;
  /** 组头「+」新建（参数为目标分组）；不传隐藏按钮 */
  onCreate?: (group: string) => void;
  /** 行点击编辑 */
  onEdit?: (def: StatusDefinitionLike) => void;
  /** 行 hover「查看任务」；不传隐藏按钮 */
  onViewTasks?: (def: StatusDefinitionLike) => void;
  /** 状态 key → 工单数（可选，行尾展示） */
  counts?: Record<string, number>;
  /** 组内拖拽落放（参数为该组重排后的全量行）；不传关闭拖拽 */
  onReorderCommit?: (groupDefs: StatusDefinitionLike[]) => void;
  className?: string;
}

function allowedKeysOf(def: StatusDefinitionLike): string[] {
  const v = def.allowedNextStatusKeys;
  return Array.isArray(v) ? (v as string[]) : [];
}

export function StatusDefinitionList({
  definitions,
  visualMap,
  onCreate,
  onEdit,
  onViewTasks,
  counts,
  onReorderCommit,
  className,
}: StatusDefinitionListProps) {
  const { t } = useTranslation();

  const grouped = useMemo(() => {
    const map = new Map<string, StatusDefinitionLike[]>();
    for (const group of STATUS_GROUP_ORDER) map.set(group, []);
    for (const def of [...definitions].sort((a, b) => a.order - b.order)) {
      const group = def.group && map.has(def.group) ? def.group : 'unstarted';
      map.get(group)?.push(def);
    }
    return map;
  }, [definitions]);

  const nameByKey = useMemo(
    () => new Map(definitions.map((d) => [d.key, d.name])),
    [definitions],
  );

  return (
    <div className={cn('flex flex-col gap-5', className)}>
      {STATUS_GROUP_ORDER.map((group) => {
        const items = grouped.get(group) ?? [];
        return (
          <section key={group} className="overflow-hidden rounded-lg border border-border bg-card">
            <header className="flex h-10 items-center justify-between border-b border-border/60 pl-3 pr-1.5">
              <span className="text-xs font-medium text-content-text-secondary">
                {t(`settings.statusGroup.${group}`)}
                {items.length > 0 ? (
                  <span className="ml-1.5 text-content-text-muted">{items.length}</span>
                ) : null}
              </span>
              {onCreate ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={t('settings.addStatus')}
                  title={t('settings.addStatus')}
                  onClick={() => onCreate(group)}
                >
                  <Plus />
                </Button>
              ) : null}
            </header>
            {items.length === 0 ? (
              <p className="px-3 py-2.5 text-xs text-content-text-muted">
                {t(`settings.statusGroup.${group}Desc`)}
              </p>
            ) : (
              <Sortable
                value={items}
                getItemValue={(d) => d.id}
                onValueChange={() => {
                  // 受控源为 React Query：不做本地乐观重排，落放经 onValueCommit 持久化后回读生效
                }}
                onValueCommit={(next) => onReorderCommit?.(next)}
                render={<div className="divide-y divide-border/60" />}
              >
                {items.map((def) => (
                  <StatusDefinitionRow
                    key={def.id}
                    def={def}
                    visualMap={visualMap}
                    groupNames={nameByKey}
                    count={counts?.[def.key]}
                    onClick={() => onEdit?.(def)}
                    onViewTasks={onViewTasks ? () => onViewTasks(def) : undefined}
                  />
                ))}
              </Sortable>
            )}
          </section>
        );
      })}
    </div>
  );
}

function StatusDefinitionRow({
  def,
  visualMap,
  groupNames,
  count,
  onClick,
  onViewTasks,
}: {
  def: StatusDefinitionLike;
  visualMap?: Map<string, StatusVisualEntry>;
  groupNames: Map<string, string>;
  count?: number;
  onClick?: () => void;
  onViewTasks?: () => void;
}) {
  const { t } = useTranslation();
  // 动态视觉优先（tone/兜底 icon 来自 useStatusVisualMap），未命中走注册表分组默认
  const dyn = visualMap?.get(def.key);
  const groupDefault: StatusIconKey =
    (def.group && def.group in STATUS_GROUP_DEFAULT_ICON
      ? STATUS_GROUP_DEFAULT_ICON[def.group]
      : undefined) ?? 'Circle';
  const nextKeys = allowedKeysOf(def);

  return (
    <SortableItem
      value={def.id}
      className="group flex items-center gap-2.5 bg-card px-1.5 py-2 motion-shift"
    >
      <SortableItemHandle
        render={<RawButton aria-label={t('common.reorder', '拖拽排序')} />}
        className="touch-none text-content-text-muted opacity-0 transition-opacity hover:text-content-text-secondary group-hover:opacity-100"
      >
        <svg viewBox="0 0 10 16" className="size-3.5 fill-current" aria-hidden>
          <circle cx="3" cy="3" r="1.4" />
          <circle cx="7" cy="3" r="1.4" />
          <circle cx="3" cy="8" r="1.4" />
          <circle cx="7" cy="8" r="1.4" />
          <circle cx="3" cy="13" r="1.4" />
          <circle cx="7" cy="13" r="1.4" />
        </svg>
      </SortableItemHandle>
      <RawButton
        onClick={onClick}
        className="flex min-w-0 flex-1 items-center gap-3 py-0.5 text-left"
      >
        {/* 双行文本行首：xl 档（32×32）带底框，自定义色时浅底跟随（colorSurface） */}
        <StatusIconFrame
          icon={dyn?.icon ?? STATUS_ICONS[groupDefault]}
          tone={dyn?.tone ?? 'default'}
          size="xl"
          spin={dyn?.icon === STATUS_ICONS.Loader2}
          color={def.color || undefined}
          colorSurface
          className="rounded-lg"
        />
        <span className="min-w-0">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-foreground">{def.name}</span>
            {def.isBlockedState ? (
              <Badge variant="destructive">{t('settings.isBlockedState')}</Badge>
            ) : def.isFinal ? (
              <Badge variant="outline">{t('settings.statusFinalBadge', '终态')}</Badge>
            ) : null}
            {nextKeys.length > 0 ? (
              <Badge
                variant="outline"
                className="gap-0.5 text-accent-blue"
                title={`${t('settings.allowedNextStatuses')}：${nextKeys
                  .map((k) => groupNames.get(k) ?? k)
                  .join('、')}`}
              >
                <ArrowRight className="size-2.5" />
                {t('settings.transitionCount', { count: nextKeys.length })}
              </Badge>
            ) : null}
          </span>
          {def.description ? (
            <span className="block truncate text-xs text-content-text-muted">
              {def.description}
            </span>
          ) : null}
        </span>
      </RawButton>
      {count !== undefined ? (
        <span className="shrink-0 text-xs text-content-text-muted">
          {t('settings.statusIssueCount', { count })}
        </span>
      ) : null}
      {onViewTasks ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mr-1 hidden shrink-0 group-hover:inline-flex"
          onClick={onViewTasks}
        >
          {t('settings.viewIssues')}
        </Button>
      ) : null}
    </SortableItem>
  );
}
