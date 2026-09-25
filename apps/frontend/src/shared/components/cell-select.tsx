/**
 * CellSelect - 列表行单元格就地编辑下拉（通用原语）
 *
 * 「每个属性要素支持下拉框及时修改生效」的行内载体：children 是既有单元格渲染
 * （状态图标/优先级图标/头像/chip 原样保留），包一层静默触发壳，点选菜单项即回调
 * onChange（mutation 链路由调用方接入，与右键菜单同源，选择即生效）。
 *
 * - 触发壳用 -m-0.5/p-0.5 扩大命中区不挤占行布局；hover/data-[popup-open] 轻 accent
 * - onClick/onKeyDown stopPropagation：不触发行点击（打开详情）与 DataList 键盘流
 * - 候选为空时原样渲染 children（无编辑能力的字段自动退化只读）
 * - 候选项 active 可显式指定（如 assignee 的 userId/memberId 双口径匹配）
 */

import { type ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Menu, MenuTrigger, MenuPopup, MenuItem } from '@/components/ui/menu';
import { cn } from '@/lib/utils';

export interface CellSelectOption {
  value: string;
  label: ReactNode;
  /** 候选图标（状态图标/彩色圆点/头像等） */
  icon?: ReactNode;
  /** 选中态高亮；缺省按 option.value === value 推导 */
  active?: boolean;
}

export interface CellSelectProps {
  /** 当前值（与 option.value 对齐推导选中态） */
  value?: string | null;
  options: CellSelectOption[];
  onChange: (value: string) => void;
  /** 触发器内容（既有单元格渲染） */
  children: ReactNode;
  /** 触发器 hover 提示（属性名） */
  title?: string;
  /** 弹层宽度类（默认 w-40） */
  menuClassName?: string;
  side?: 'bottom' | 'top';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

export function CellSelect({
  value,
  options,
  onChange,
  children,
  title,
  menuClassName = 'w-40',
  side = 'bottom',
  align = 'start',
  className,
}: CellSelectProps) {
  if (options.length === 0) {
    return <>{children}</>;
  }
  return (
    <Menu>
      <MenuTrigger
        type="button"
        title={title}
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        className={cn(
          'inline-flex cursor-pointer items-center rounded-sm outline-none transition-colors',
          '-m-0.5 p-0.5 hover:bg-accent/40 data-[popup-open]:bg-accent/40',
          className,
        )}
      >
        {children}
      </MenuTrigger>
      <MenuPopup side={side} align={align} className={menuClassName}>
        {/* 弹层内层限高滚动：候选超一屏时不撑爆视口（与右键菜单子菜单同口径） */}
        <div className="max-h-72 w-full overflow-y-auto">
          {options.map((option) => (
            <MenuItem key={option.value} className="gap-2" onClick={() => onChange(option.value)}>
              {option.icon ? (
                <span className="flex size-4 shrink-0 items-center justify-center">{option.icon}</span>
              ) : null}
              <span className="flex-1 truncate">{option.label}</span>
              {(option.active ?? option.value === value) ? (
                <Check className="size-3.5 shrink-0 text-muted-foreground" />
              ) : null}
            </MenuItem>
          ))}
        </div>
      </MenuPopup>
    </Menu>
  );
}
