/**
 * DefinitionRow - 设置·定义类管理页通用行骨架（标签 / 工单类型 / 角色 / 状态…）
 *
 * 统一行形态（2026-10-01 设置管理面统一批）：拖拽手柄（hover 显隐）+ 前导底框图标 +
 * 双行文本（标题行含徽标 / 描述行）+ 尾部槽（计数/开关/操作）。
 * sortable 形态内置 SortableItem/Handle（须置于 <Sortable> 内）；非 sortable 形态
 * （无 order 能力的实体，如角色）渲染为同款静态行。
 * 展示型语义组件：内容全部由消费方注入。
 */
import { useTranslation } from 'react-i18next';
import { SortableItem, SortableItemHandle } from '@/components/ui/sortable';
import { RawButton } from '@/components/raw/raw-button';
import { cn } from '@/lib/utils';

export interface DefinitionRowProps {
  /** SortableItem value（= 实体 id） */
  id: string;
  /** 前导底框图标（StatusIconFrame / IssueTypeIcon 等已组装好的节点） */
  leading: React.ReactNode;
  /** 标题行：名称 + 徽标（消费方拼接） */
  title: React.ReactNode;
  /** 第二行：描述 / key 等；不传则单行 */
  description?: React.ReactNode;
  /** 尾部槽：计数 / 开关 / 菜单 / 操作按钮组 */
  trailing?: React.ReactNode;
  /** 行主体点击（leading + 文本区承载） */
  onClick?: () => void;
  /** 拖拽形态（须置于 <Sortable> 内且实体有 order 能力）；false = 静态行、无手柄 */
  sortable?: boolean;
  /** 单行模式（表格型列表）：leading + 标题 + 描述并排一行，描述占满余宽；默认双行堆叠 */
  singleLine?: boolean;
  /** 单行模式标题列宽类（须与列头同款类保证列对齐；默认 w-40） */
  titleClassName?: string;
  className?: string;
}

const ROW_CLASS =
  'group flex items-center gap-2.5 bg-card px-1.5 py-2 motion-shift';

export function DefinitionRow({
  id,
  leading,
  title,
  description,
  trailing,
  onClick,
  sortable = true,
  singleLine = false,
  titleClassName,
  className,
}: DefinitionRowProps) {
  const { t } = useTranslation();

  const main = singleLine ? (
    <RawButton
      onClick={onClick}
      className="flex min-w-0 flex-1 items-center gap-3 py-0.5 text-left"
    >
      {leading}
      <span
        className={cn(
          'shrink-0 truncate text-sm font-medium text-foreground',
          titleClassName ?? 'w-40',
        )}
      >
        {title}
      </span>
      {description !== undefined && description !== null ? (
        <span className="min-w-0 flex-1 truncate text-sm text-content-text-secondary">
          {description}
        </span>
      ) : null}
    </RawButton>
  ) : (
    <RawButton
      onClick={onClick}
      className="flex min-w-0 flex-1 items-center gap-3 py-0.5 text-left"
    >
      {leading}
      <span className="min-w-0">
        <span className="flex items-center gap-2">{title}</span>
        {description !== undefined && description !== null ? (
          <span className="block truncate text-xs text-content-text-muted">{description}</span>
        ) : null}
      </span>
    </RawButton>
  );

  const body = (
    <>
      {main}
      {trailing ?? null}
    </>
  );

  if (!sortable) {
    return (
      <div data-slot="definition-row" className={cn(ROW_CLASS, className)}>
        {body}
      </div>
    );
  }

  return (
    <SortableItem value={id} className={cn(ROW_CLASS, className)}>
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
      {body}
    </SortableItem>
  );
}
