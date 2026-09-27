import { createElement } from 'react';
import {
  AlertCircle,
  BookOpen,
  BookUser,
  Boxes,
  Briefcase,
  Bug,
  CalendarRange,
  CheckSquare,
  Circle,
  FileCode,
  FileText,
  FlaskConical,
  Flag,
  Inbox,
  Layers,
  Lightbulb,
  ListTodo,
  Megaphone,
  MessageSquare,
  Package,
  PenLine,
  Rocket,
  Sparkles,
  Target,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { IssueTypeMeta } from '@/modules/issue/api/issue-type-api';

/**
 * IssueType.icon（lucide 图标名字符串）→ 组件映射。
 * 新增可选图标时在此登记；未登记的名字回落 Circle。
 *
 * ── 与 entity-icons 的边界（2026-09-27 批 3 实物比对 · E 类方案 §三 E8 决策 C）───────
 * 比对对象：`shared/entity-icons/entity-icons.tsx`（自称「实体→图标+语义 tone 的唯一
 * 映射」，其文件头第 94 行已提到 issue-type，故被列为疑似第三处图标映射）。
 *
 * **结论：维度不同，不予合流。** entity-icons 继续是「实体身份」的唯一真相源；
 * 本文件继续是「单条类型自定义图标 + 自定义颜色」的唯一真相源。三条判据：
 *
 * 1. **键空间不同（决定性）**：entity-icons 的键是封闭联合类型 `EntityKind`
 *    （14 个固定实体：issue/bug/project/…），一实体一图标，属设计系统决策、由开发者登记；
 *    本文件的键是 `IssueType.icon` 中的**用户自选 lucide 图标名字符串**（存 DB 的元数据，
 *    27 个可选值，设置页的图标选择器正以 `ISSUE_TYPE_ICONS` 作封闭词表）。
 *    前者封闭且由代码定义，后者开放且由用户产生 —— 无法用同一张表表达。
 * 2. **着色机制不同**：entity-icons 走固定 5 档语义 tone（`StatusTone` → 文字色类）；
 *    本文件按每个类型的**用户自定义颜色** `IssueType.color` 上色（内联 style），
 *    仅在该色缺失时才回落 accent 语义色。`EntityIcon` 的 tone 类承载不了任意用户色。
 * 3. **粒度不同**：同一实体（工单）下可存在多个用户自定义类型（需求/缺陷/技术债…），
 *    各有不同图标与颜色；而 entity-icons 对 issue 只给一个固定图标。
 *
 * 三者的**唯一重叠**是图标词表本身（两表都引用 CheckSquare / Bug / Flag / FileText 等同
 * 一套 lucide 图标），属「同一套图标被两个不同维度的表各自引用」，**不是重复映射**，
 * 故既不合并不删任一侧，也不得把用户可选图标名塞进 entity-icons 的 EntityKind 表。
 * 唯一的跨表强制约束：两侧图标名口径须同为 lucide 新名（见 entity-icons 规范 v0 第 3 条）。
 *
 * 登记侧说明：registry.ts 的 canonical 条目无自由文本列（生成器只为 review 块渲染
 * reason），故本边界只落在文件头；如需在 COMPONENTS.md 可见，须先扩生成器（另立批次）。
 */
export const ISSUE_TYPE_ICONS: Record<string, LucideIcon> = {
  AlertCircle,
  BookOpen,
  BookUser,
  Boxes,
  Briefcase,
  Bug,
  CalendarRange,
  CheckSquare,
  Circle,
  FileCode,
  FileText,
  FlaskConical,
  Flag,
  Inbox,
  Layers,
  Lightbulb,
  ListTodo,
  Megaphone,
  MessageSquare,
  Package,
  PenLine,
  Rocket,
  Sparkles,
  Target,
  UserRound,
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
    // 无类型色时的兜底：语义 accent token（原为内联品牌 hex 字面量，批 6b C3）
    style: { color: meta?.color ?? 'hsl(var(--accent-blue))' },
  });
}
