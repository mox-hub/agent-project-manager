/**
 * status-visuals.ts - 任务 / 项目状态统一视觉映射
 *
 * 一套 tone 词表（对齐 StatusPill 语义色 + accent token）同时服务任务与项目两侧，
 * 取代散落在 task-simple-list / project-simple-list / 看板 / 甘特里的多份本地配色：
 *   default=灰（待办/积压/已取消） info=蓝（进行中） warning=黄（评审/计划/有风险）
 *   success=绿（完成/正常/进行中项目） danger=红（偏离/紧急）
 *
 * 消费方：project-simple-list（StatusPill + 日期/优先级）、row-context-menu（右键子菜单）、
 * project-board（五列分组）、project-gantt（条颜色）、task-simple-list（label 对齐）。
 */

import {
  Activity,
  Archive,
  ArrowDown,
  ArrowUp,
  Ban,
  CalendarClock,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleCheckBig,
  CircleDashed,
  CircleDot,
  CircleHelp,
  CirclePause,
  CircleX,
  Flame,
  Loader2,
  Minus,
} from 'lucide-react';
import { CircleAlertBig, CircleXBig } from './status-symbol-big-icons';

/**
 * 状态图标组件消费面签名——lucide 图标与自绘大符号图标（status-symbol-big-icons）的公共子集。
 * StatusVisual / STATUS_ICONS / StatusIconFrame 统一使用该类型，新增自绘图标无需改消费方。
 */
export type StatusIconComponent = ComponentType<{
  className?: string;
  strokeWidth?: number | string;
  style?: CSSProperties;
  size?: number | string;
}>;
import { TONE_CLASS, type Tone } from '@/components/ui/tone';
import type { ComponentType, CSSProperties } from 'react';

/**
 * 状态色 tone 词表（re-export 视觉层的 `Tone`，§19.5）。
 *
 * 词表定义已下沉到 `src/components/ui/tone.ts`——本文件只做**业务层映射**
 * （status → tone），tone → class 的视觉层映射由 tone.ts 唯一持有。
 * 保留 `StatusTone` 这个名字别名，以不破坏既有消费方（本模块导出名的 import 方）。
 */
export type StatusTone = Tone;

export interface StatusVisual {
  /** i18n key（status.* 命名空间） */
  labelKey: string;
  tone: StatusTone;
  icon: StatusIconComponent;
}

/** tone → 文字色类（语义 accent token，禁原始色）——值取自 `components/ui/tone.ts` 唯一词表 */
export const TONE_TEXT_CLASS: Record<StatusTone, string> = {
  default: TONE_CLASS.default.text,
  info: TONE_CLASS.info.text,
  warning: TONE_CLASS.warning.text,
  success: TONE_CLASS.success.text,
  danger: TONE_CLASS.danger.text,
};

/** tone → 色点/进度条填充类——值取自 `components/ui/tone.ts` 唯一词表 */
export const TONE_DOT_CLASS: Record<StatusTone, string> = {
  default: TONE_CLASS.default.dot,
  info: TONE_CLASS.info.dot,
  warning: TONE_CLASS.warning.dot,
  success: TONE_CLASS.success.dot,
  danger: TONE_CLASS.danger.dot,
};

/** tone → StatusPill 之外的浅底胶囊（菜单图标等轻量场景）——值取自 `components/ui/tone.ts` 唯一词表 */
export const TONE_LIGHT_CLASS: Record<StatusTone, string> = {
  default: TONE_CLASS.default.light,
  info: TONE_CLASS.info.light,
  warning: TONE_CLASS.warning.light,
  success: TONE_CLASS.success.light,
  danger: TONE_CLASS.danger.light,
};

/** 任务状态五态 */
export const TASK_STATUS_VISUALS: Record<string, StatusVisual> = {
  todo: { labelKey: 'status.task.todo', tone: 'default', icon: Circle },
  in_progress: { labelKey: 'status.task.in_progress', tone: 'info', icon: Loader2 },
  in_review: { labelKey: 'status.task.in_review', tone: 'warning', icon: CircleAlertBig },
  done: { labelKey: 'status.task.done', tone: 'success', icon: CircleCheckBig },
  canceled: { labelKey: 'status.task.canceled', tone: 'default', icon: CircleXBig },
};

/** 项目工作流状态五态（与任务五态同 tone 词表） */
export const PROJECT_WORKFLOW_VISUALS: Record<string, StatusVisual> = {
  backlog: { labelKey: 'status.project.backlog', tone: 'default', icon: CircleDashed },
  planned: { labelKey: 'status.project.planned', tone: 'warning', icon: CalendarClock },
  in_progress: { labelKey: 'status.project.in_progress', tone: 'info', icon: Loader2 },
  completed: { labelKey: 'status.project.completed', tone: 'success', icon: CircleCheckBig },
  canceled: { labelKey: 'status.project.canceled', tone: 'default', icon: CircleXBig },
};

/** 项目归档状态（active/archived） */
export const PROJECT_STATUS_VISUALS: Record<string, StatusVisual> = {
  active: { labelKey: 'status.project.active', tone: 'success', icon: Activity },
  archived: { labelKey: 'status.project.archived', tone: 'default', icon: Archive },
};

/** 项目健康度 */
export const HEALTH_VISUALS: Record<string, StatusVisual> = {
  on_track: { labelKey: 'status.health.on_track', tone: 'success', icon: CircleCheck },
  at_risk: { labelKey: 'status.health.at_risk', tone: 'warning', icon: CircleAlert },
  off_track: { labelKey: 'status.health.off_track', tone: 'danger', icon: CircleX },
};

/** 优先级（任务与项目共用；urgent 为项目侧叫法）。
 *  medium/low 降灰（default）——颜色只留给高优先级（high 黄 / critical·urgent 红），对齐 Linear「无信息则灰」 */
export const PRIORITY_VISUALS: Record<string, StatusVisual> = {
  low: { labelKey: 'status.priority.low', tone: 'default', icon: ArrowDown },
  medium: { labelKey: 'status.priority.medium', tone: 'default', icon: Minus },
  high: { labelKey: 'status.priority.high', tone: 'warning', icon: ArrowUp },
  critical: { labelKey: 'status.priority.critical', tone: 'danger', icon: Flame },
  urgent: { labelKey: 'status.priority.urgent', tone: 'danger', icon: Flame },
};

/** 风险等级 */
export const RISK_VISUALS: Record<string, StatusVisual> = {
  low: { labelKey: 'status.risk.low', tone: 'default', icon: ArrowDown },
  medium: { labelKey: 'status.risk.medium', tone: 'info', icon: Minus },
  high: { labelKey: 'status.risk.high', tone: 'warning', icon: ArrowUp },
  critical: { labelKey: 'status.risk.critical', tone: 'danger', icon: Flame },
};

/* ------------------------------------------------------------------
 * 状态定义动态视觉层（设置·状态真实化 2026-10-01）
 *
 * StatusDefinition 落库 color/icon/description 后，状态视觉有了第二真相源：
 * 定义上配了 color/icon → 用定义；没配 → 回落上方静态语义映射（本文件词表）。
 * 统一入口是 buildStatusVisualMap（纯函数）+ use-status-visual-map（React 层），
 * 禁止页面各写一套覆盖映射（§19.5）。
 * ------------------------------------------------------------------ */

/**
 * 状态图标注册表——设置·状态「图标形状」选择集与 icon 落库解析的唯一词表。
 * 键为图标组件名（与 StatusDefinition.icon 存储值一致），新增图标须在此登记。
 *
 * ## 视觉基线（2026-10-01 用户验收调整）
 * - **线宽基线 strokeWidth=2.5**（lucide 缺省 2 在小尺寸下偏细）：由各渲染口
 *   （StatusIconFrame / 设置·状态语义组件 / 行内 WorkflowIcon）统一携带，
 *   新增状态图标渲染口必须同步，禁止单点回落缺省线宽。
 * - **符号可读性优先**：圆内符号类图标一律派发大符号变体——done/completed 用
 *   CircleCheckBig（lucide 官方）；评审感叹号/取消叉 lucide 无官方变体，用自绘
 *   CircleAlertBig / CircleXBig（status-symbol-big-icons，几何仿 lucide 圆系）。
 *   三个小符号旧键（CircleAlert/CircleCheck/CircleX）保留仅为兼容存量落库值解析，
 *   选择集不派发（STATUS_ICON_CHOICES）。
 */
export const STATUS_ICONS = {
  CircleDashed,
  Circle,
  CircleDot,
  CircleAlertBig,
  CircleCheckBig,
  CircleXBig,
  CircleHelp,
  CirclePause,
  Loader2,
  Ban,
  CalendarClock,
  // —— 存量兼容键：仅为解析旧落库值保留，弹窗选择集不派发（见 STATUS_ICON_CHOICES）——
  CircleAlert,
  CircleCheck,
  CircleX,
} as const satisfies Record<string, StatusIconComponent>;

export type StatusIconKey = keyof typeof STATUS_ICONS;

/** 存量兼容键（旧 lucide 小符号变体）：解析仍支持、选择集不再派发 */
const LEGACY_ICON_KEYS: ReadonlySet<string> = new Set(['CircleAlert', 'CircleCheck', 'CircleX']);

/** 弹窗「图标形状」选择集：注册表去存量兼容键后的派发词表（顺序即展示序） */
export const STATUS_ICON_CHOICES: StatusIconKey[] = (
  Object.keys(STATUS_ICONS) as StatusIconKey[]
).filter((k) => !LEGACY_ICON_KEYS.has(k));

/** 状态分组 → 默认图标（icon 未配置时的兜底；与分组词表同步） */
export const STATUS_GROUP_DEFAULT_ICON: Record<string, StatusIconKey> = {
  triage: 'CircleHelp',
  backlog: 'CircleDashed',
  unstarted: 'Circle',
  started: 'Loader2',
  completed: 'CircleCheckBig',
  canceled: 'CircleXBig',
};

/** 按落库 icon 键解析图标组件：注册表键 → 组件；空/未知 → 分组默认 → 空心圆 */
export function resolveStatusIcon(
  icon: string | null | undefined,
  group?: string,
): StatusIconComponent {
  if (icon && icon in STATUS_ICONS) return STATUS_ICONS[icon as StatusIconKey];
  const byGroup = group ? STATUS_GROUP_DEFAULT_ICON[group] : undefined;
  return STATUS_ICONS[byGroup ?? 'Circle'];
}

/** 动态视觉表条目：静态语义 + 定义落库的展示色（useStatusVisualMap / 设置·状态列表行共用） */
export type StatusVisualEntry = StatusVisual & { color?: string };

/** 参与动态视觉解析的状态定义最小形状（StatusDefinition 响应的结构子集） */
export interface StatusVisualDefinition {
  key: string;
  group?: string;
  color?: string | null;
  icon?: string | null;
}

/**
 * 构建动态状态视觉映射：定义 color/icon 优先，静态语义映射兜底。
 * tone/labelKey 恒取静态词表（浅底胶囊等封闭语义不受自定义色影响）；
 * color 透传原值（hex）供图标/色点 inline 着色。
 */
export function buildStatusVisualMap(
  definitions: StatusVisualDefinition[],
  fallback: Record<string, StatusVisual>,
): Map<string, StatusVisual & { color?: string }> {
  const map = new Map<string, StatusVisual & { color?: string }>();
  for (const def of definitions) {
    const base = fallback[def.key];
    map.set(def.key, {
      labelKey: base?.labelKey ?? `status.custom.${def.key}`,
      tone: base?.tone ?? 'default',
      icon: resolveStatusIcon(def.icon, def.group),
      color: def.color || undefined,
    });
  }
  return map;
}
