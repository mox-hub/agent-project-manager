/**
 * IssueTypePill - 工单类型胶囊
 *
 * 行首类型标识的强化形态（对比裸 IssueTypeIcon）：
 * - pill  图标 + 类型名 + 浅色底胶囊（列表行首；类型一眼可辨）
 * - frame 图标 + 浅色底圆框（窄列/紧凑场景；形态对齐 StatusIconFrame）
 *
 * 颜色取 IssueType.color（类型管理面配置的运行时数据色），
 * 浅底为其低透明叠色；未配置色时回落 muted 灰 token。
 */
import { createElement } from 'react';
import { cn } from '@/lib/utils';
import { issueTypeIcon } from '@/shared/components/issue-type-icon';
import type { IssueTypeMeta } from '@/modules/issue/api/issue-type-api';

type TypeMeta = Pick<IssueTypeMeta, 'name' | 'icon'> & { color?: string | null };

export function IssueTypePill({
  meta,
  variant = 'pill',
  className,
}: {
  meta: TypeMeta | undefined;
  variant?: 'pill' | 'frame';
  className?: string;
}) {
  const Icon = issueTypeIcon(meta?.icon);
  const color = meta?.color;
  const tintStyle = color
    ? { color, backgroundColor: `${color}14` }
    : undefined;
  const fallbackClass = color
    ? undefined
    : 'bg-muted text-muted-foreground';
  const label = meta?.name ?? '';

  // createElement 规避 react-hooks/static-components：Icon 来自运行时映射查找
  return createElement(
    'span',
    {
      title: label || undefined,
      className: cn(
        'inline-flex shrink-0 items-center justify-center',
        variant === 'pill'
          ? 'gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap'
          : 'size-5 rounded-full',
        fallbackClass,
        className,
      ),
      style: tintStyle,
    },
    createElement(Icon, {
      className: 'size-3.5 shrink-0',
    }),
    variant === 'pill' ? label : null,
  );
}
