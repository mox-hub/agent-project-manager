/**
 * IssueTypePill - 工单类型胶囊
 *
 * 类型标识的三形态：
 * - pill  图标 + 类型名 + 浅色底胶囊（强调形态；总高 22px 对齐 Task Atoms 套件标准）
 * - frame 图标 + 浅色底圆框（窄列/紧凑场景；22px 框 + 18px 图标，与 StatusChip 同规）
 * - icon  裸图标 + 类型色（标题前轻量标识；无底框无文字，视觉重量与行内小图标同级）
 *
 * 颜色取 IssueType.color（类型管理面配置的运行时数据色），
 * pill/frame 浅底为其低透明叠色；未配置色时回落 muted 灰 token。
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
  variant?: 'pill' | 'frame' | 'icon';
  className?: string;
}) {
  const Icon = issueTypeIcon(meta?.icon);
  const color = meta?.color;
  const tintStyle = color
    ? variant === 'icon'
      ? { color }
      : { color, backgroundColor: `${color}14` }
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
          ? 'h-5.5 gap-1 rounded-full px-2.5 text-xs font-medium whitespace-nowrap'
          : variant === 'frame'
            ? 'size-5.5 rounded-full'
            : '',
        fallbackClass,
        className,
      ),
      style: tintStyle,
    },
    createElement(Icon, {
      className: variant === 'frame' ? 'size-4.5 shrink-0' : 'size-4 shrink-0',
    }),
    variant === 'pill' ? label : null,
  );
}
