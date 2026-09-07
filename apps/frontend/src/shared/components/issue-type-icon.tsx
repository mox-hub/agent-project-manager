import { createElement } from 'react';
import {
  AlertCircle,
  BookOpen,
  Bug,
  CheckSquare,
  Circle,
  FileCode,
  FileText,
  FlaskConical,
  Flag,
  Layers,
  Lightbulb,
  ListTodo,
  MessageSquare,
  Package,
  Rocket,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IssueTypeMeta } from '@/modules/issue/api/issue-type-api';

/**
 * IssueType.icon（lucide 图标名字符串）→ 组件映射。
 * 新增可选图标时在此登记；未登记的名字回落 Circle。
 */
export const ISSUE_TYPE_ICONS: Record<string, LucideIcon> = {
  AlertCircle,
  BookOpen,
  Bug,
  CheckSquare,
  Circle,
  FileCode,
  FileText,
  FlaskConical,
  Flag,
  Layers,
  Lightbulb,
  ListTodo,
  MessageSquare,
  Package,
  Rocket,
  Sparkles,
  Wrench,
};

export function issueTypeIcon(name?: string | null): LucideIcon {
  if (name && ISSUE_TYPE_ICONS[name]) return ISSUE_TYPE_ICONS[name];
  return Circle;
}

interface IssueTypeIconProps {
  meta: Pick<IssueTypeMeta, 'icon' | 'color'> | undefined;
  className?: string;
}

/** 按类型元数据渲染图标（颜色取 IssueType.color） */
export function IssueTypeIcon({ meta, className }: IssueTypeIconProps) {
  // createElement 规避 react-hooks/static-components：Icon 来自运行时映射查找
  return createElement(IssueTypeIconInner, { meta, className });
}

function IssueTypeIconInner({
  meta,
  className,
}: IssueTypeIconProps) {
  const Icon = issueTypeIcon(meta?.icon);
  return createElement(Icon, {
    className: cn('size-3.5 shrink-0', className),
    style: { color: meta?.color ?? '#5E6AD2' },
  });
}
