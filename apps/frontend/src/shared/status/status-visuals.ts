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
  CalendarClock,
  Circle,
  CircleAlert,
  CircleCheck,
  CircleDashed,
  CircleX,
  Flame,
  Loader2,
  Minus,
  type LucideIcon,
} from 'lucide-react';
import { TONE_CLASS, type Tone } from '@/components/ui/tone';

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
  icon: LucideIcon;
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
  in_review: { labelKey: 'status.task.in_review', tone: 'warning', icon: CircleAlert },
  done: { labelKey: 'status.task.done', tone: 'success', icon: CircleCheck },
  canceled: { labelKey: 'status.task.canceled', tone: 'default', icon: CircleX },
};

/** 项目工作流状态五态（与任务五态同 tone 词表） */
export const PROJECT_WORKFLOW_VISUALS: Record<string, StatusVisual> = {
  backlog: { labelKey: 'status.project.backlog', tone: 'default', icon: CircleDashed },
  planned: { labelKey: 'status.project.planned', tone: 'warning', icon: CalendarClock },
  in_progress: { labelKey: 'status.project.in_progress', tone: 'info', icon: Loader2 },
  completed: { labelKey: 'status.project.completed', tone: 'success', icon: CircleCheck },
  canceled: { labelKey: 'status.project.canceled', tone: 'default', icon: CircleX },
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

/** 优先级（任务与项目共用；urgent 为项目侧叫法） */
export const PRIORITY_VISUALS: Record<string, StatusVisual> = {
  low: { labelKey: 'status.priority.low', tone: 'default', icon: ArrowDown },
  medium: { labelKey: 'status.priority.medium', tone: 'info', icon: Minus },
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

// ── 业务量表 → tone 登记（2026-09-28 no-adhoc-tone 存量收敛批追加）────────────
//
// 以下均为**业务层 status → tone** 纯映射（值是封闭五档词表，不含任何 class），
// 消费方一律经 `TONE_CLASS[tone].{text|dot|light|bg|border}` 取视觉类
// （src/components/ui/tone.ts 视觉层唯一真相源）。只追加、不改既有映射值。

/** 验收单状态（AcceptanceStatus：acceptance 模块详情/契约卡共用） */
export const ACCEPTANCE_STATUS_TONE: Record<string, StatusTone> = {
  draft: 'default',
  pending: 'default',
  in_review: 'info',
  passed: 'success',
  failed: 'danger',
  waived: 'default',
};

/** 验收标准条目状态（CriterionStatus：标准逐项判定） */
export const CRITERION_STATUS_TONE: Record<string, StatusTone> = {
  pending: 'default',
  passed: 'success',
  failed: 'danger',
  blocked: 'warning',
};

/** 严重度四档（Bug severity / 验收标准 severity；色阶与优先级一致） */
export const SEVERITY_TONE: Record<string, StatusTone> = {
  low: 'default',
  medium: 'info',
  high: 'warning',
  critical: 'danger',
};

/** 完整性审计风险级别（AuditReport.riskLevel：red/yellow/green 色名键为服务端契约） */
export const AUDIT_RISK_LEVEL_TONE: Record<string, StatusTone> = {
  red: 'danger',
  yellow: 'warning',
  green: 'success',
};

/** 执行/运行状态（ExecutionRun / ExecutionStep / 执行项与审批结果，14 键合一登记） */
export const EXECUTION_RUN_STATUS_TONE: Record<string, StatusTone> = {
  draft: 'default',
  planned: 'default',
  pending: 'default',
  in_progress: 'info',
  running: 'info',
  pending_approval: 'warning',
  completed: 'success',
  approved: 'success',
  failed: 'danger',
  rejected: 'danger',
  blocked: 'danger',
  cancelled: 'default',
  skipped: 'warning',
  superseded: 'default',
};

/** 运行时间轴活动条分类（run-timeline 的 model/tools/error 行） */
export const RUN_TIMELINE_BAR_TONE: Record<string, StatusTone> = {
  model: 'success',
  tools: 'info',
  error: 'danger',
};

/** 运行事件形态（RunEventKind 分类配色；形态分类并入链路登记，紫色不在封闭词表故归并） */
export const RUN_EVENT_KIND_TONE: Record<string, StatusTone> = {
  user: 'default',
  prompt: 'default',
  context: 'info',
  assistant: 'success',
  thinking: 'info',
  tool: 'info',
  file: 'success',
  usage: 'warning',
  result: 'default',
  error: 'danger',
  approval: 'warning',
  status: 'default',
};

/** 工作流站点状态（workflow 站灯；pending/skipped 由消费侧以描边空心表达） */
export const WORKFLOW_STATION_STATUS_TONE: Record<string, StatusTone> = {
  done: 'success',
  failed: 'danger',
  running: 'warning',
  waiting: 'warning',
  pending: 'default',
  skipped: 'default',
};

/** 剧本五阶段状态（intake 管道进度点 / project 设置面板共用） */
export const PLAYBOOK_STAGE_TONE: Record<string, StatusTone> = {
  done: 'success',
  active: 'info',
  skipped: 'default',
  pending: 'default',
};

/** 完备性评估结论（intake readiness verdict） */
export const READINESS_VERDICT_TONE: Record<string, StatusTone> = {
  ready: 'success',
  'needs-clarification': 'warning',
  blocked: 'danger',
};

/** 完备性评估维度状态（intake readiness 六维度） */
export const READINESS_DIMENSION_TONE: Record<string, StatusTone> = {
  ready: 'success',
  unclear: 'warning',
  missing: 'danger',
};

/** 拆解质量评估结论（decision decomposition review verdict） */
export const DECISION_VERDICT_TONE: Record<string, StatusTone> = {
  healthy: 'success',
  'needs-review': 'warning',
  rework: 'danger',
};

/** AI 同事状态（assistant 状态点 / office 同事位 / bottom-dock 呼吸点共用） */
export const ASSISTANT_STATUS_TONE: Record<string, StatusTone> = {
  needYou: 'danger',
  working: 'info',
  suggestions: 'warning',
  idle: 'success',
};

/** 协作卡状态（office 交接协作状态机） */
export const COLLABORATION_STATUS_TONE: Record<string, StatusTone> = {
  requested: 'warning',
  committed: 'info',
  in_progress: 'info',
  delivered: 'info',
  verified: 'success',
  rejected: 'danger',
  cancelled: 'default',
  escalated: 'danger',
};

/** 容量可接活度（office colleague capacity.acceptability） */
export const CAPACITY_ACCEPTABILITY_TONE: Record<string, StatusTone> = {
  available: 'success',
  busy: 'warning',
  saturated: 'danger',
};

/** 契约文件三态绑定（contract syncMode：managed/synced/detached） */
export const CONTRACT_SYNC_MODE_TONE: Record<string, StatusTone> = {
  managed: 'info',
  synced: 'success',
  detached: 'default',
};

/** Linear 同步状态（linear sync badge） */
export const LINEAR_SYNC_STATUS_TONE: Record<string, StatusTone> = {
  synced: 'success',
  pending: 'warning',
  error: 'danger',
  never_synced: 'default',
  conflict: 'warning',
};

/** 发版状态（ReleaseStatus：release 列表/详情与里程碑页共用） */
export const RELEASE_STATUS_TONE_MAP: Record<string, StatusTone> = {
  draft: 'default',
  gated: 'warning',
  approved: 'info',
  publishing: 'warning',
  released: 'success',
  failed: 'danger',
};

/** 成员活跃状态（team-member 成员卡） */
export const MEMBER_STATUS_TONE: Record<string, StatusTone> = {
  active: 'success',
  inactive: 'default',
  suspended: 'warning',
};
