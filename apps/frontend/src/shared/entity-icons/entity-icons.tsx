/**
 * entity-icons.tsx - 实体图标唯一注册表（规范 v0 + 映射 + 薄组件）
 *
 * 「实体是什么」的图标真相源（工单/Bug/项目/验收…），与 status-visuals（「实体状态怎样」）
 * 互补：本表只回答实体身份，状态视觉（五态/健康度/优先级/风险）仍以
 * @/shared/status/status-visuals 为唯一映射源，两者通过 tone 词表对齐。
 *
 * ── 实体图标规范 v0 ──────────────────────────────────────────────────────────
 * 1. 新增实体 = 在 ENTITY_ICONS 登记一行 `{ icon, tone }`。图标定夺三原则：
 *    ① 跟从多数注册表面已用（page-registry / route-preview / apm-ref 等）；
 *    ② 语义清晰；③ 不与其他实体撞车（__tests__ 有 uniqueness 断言强制）。
 * 2. 页面 PageHeader、引用 chip（apm-ref）、预览卡头部等「实体身份」场景一律从本表
 *    取图（getEntityIcon / <EntityIcon>），禁止页面自选实体图标。
 * 3. 图标名统一 lucide 新名（CircleCheck / CircleAlert / CircleX 一族）；
 *    旧名（CheckCircle2 / XCircle / AlertCircle）仅允许存在于未迁移的历史代码。
 * 4. nav / tabs 注册表（shell-layout / tabs-registry / page-registry / route-preview）
 *    已于第二批全部接入本表（getEntityIcon(kind).icon）；nav 表面另有品牌配色
 *    （page-registry color 字段），与本表 tone 是两套口径，互不影响。
 * 5. tone 取 5 档语义色（StatusTone），文字色档复用 TONE_TEXT_CLASS；
 *    词表暂无 purple/cyan/orange 等扩展色，品牌色诉求仍由 nav 配色承载。
 * 6. EntityIcon 尺寸走设计宪法 §6.2 四档：12 / 14 / 16 / 20 px（xs/sm/md/lg），
 *    与 text-10/11、text-xs、text-sm+、标题字阶一一配对。
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ShieldCheck 三方重叠裁决（2026-09-11 用户裁决，第二批落地）：
 * ShieldCheck 专属「验收实体」（本表 acceptance），其余两方已改道——
 * - admin 导航域（shell-layout /app/admin、page-registry /app/admin 与 /app/settings/roles、
 *   tabs-registry /app/admin）→ UserCog（权限管理语义，非验收实体）；
 * - workflow 人工确认节点（workflow-canvas 节点图 / WorkflowNodePalette 节点库 /
 *   workflow-detail-page 等待审批提示 / decision-card human-confirm 步骤徽章）→
 *   UserCheck（人工确认语义，与验收门禁区分）。
 * 仍保留 ShieldCheck 的动作语义场景（非实体、非遗漏）：decision-card 高危/低危风险
 * 图标与 autoChecks 通过数图标——是「检查/安全」动作语义，不属于本次裁决范围。
 *
 * 第二批铺开记录（2026-09-11）：
 * - nav/tabs 注册表面（shell-layout / tabs-registry / page-registry / route-preview-card）
 *   实体图标全部改引本表；bugs=Bug、acceptance=ShieldCheck（原 CheckCircle）、
 *   decision=Scale（原 Inbox）、member 统一复数 Users（原散落单数 User）。
 * - 页面 PageHeader：project-list（原 FolderOpen）、documents（原 FileStack）、
 *   executions（原 Activity）、acceptance-list 改引本表。
 * - tasks-page / bugs-page 筛选「项目」分组字段图标（原 FolderOpen）改引本表 project。
 * - 状态副本收敛：board-presets.STATUS_VISUAL 改派生 status-visuals.TASK_STATUS_VISUALS；
 *   executions-page / delivery-page 为执行 run / 验收专属状态，保留本地并注释声明。
 * - MemberCardPopover 维持双形态（用户已裁决）：点击成员卡 = 完整操作 popover（重操作），
 *   hover 预览 = RoutePreview 轻卡片（轻预览），两者不合并；图标均已对齐 member=Users。
 */

import type { SVGProps } from 'react';
import {
  Bug,
  CheckSquare,
  Database,
  FileText,
  FolderKanban,
  GitBranch,
  Play,
  Scale,
  ShieldCheck,
  Tag,
  Users,
  UsersRound,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { TONE_TEXT_CLASS, type StatusTone } from '@/shared/status/status-visuals';

/** 注册表覆盖的实体种类（新增实体在此扩联合类型 + 登记一行） */
export type EntityKind =
  | 'issue' // 工单（Task，Issue 域统一模型）
  | 'bug' // Bug（Issue 域，与 issue 分色）
  | 'project' // 项目
  | 'workflow' // 项目工作流
  | 'execution' // 执行（Execution，原 ExecutionRun）
  | 'acceptance' // 验收（Acceptance 门禁）
  | 'document' // 文档
  | 'member' // 成员（human / platform_ai_member / external_agent）
  | 'team' // 团队
  | 'decision' // 决策（DecisionProposal / 收件箱）
  | 'workspace' // 工作区（每工作区一库）
  | 'repository' // 仓库
  | 'release'; // 发版（apm-ref chip 首个增量登记：新增实体=一行）

export interface EntityIconEntry {
  icon: LucideIcon;
  tone: StatusTone;
}

/**
 * 实体 → { 图标, 语义 tone }。
 * 取图依据（多数派 + 语义 + 防撞车）：
 * - issue=CheckSquare：page-registry /app/issues、route-preview、issue-type 注册表面的多数派；
 *   ListTodo（tasks-page 旧用）是「清单」动作语义，让位。
 * - bug=Bug：bugs-page / apm-ref chip 已用，甲虫语义唯一；AlertCircle 让位给
 *   status-visuals 的 in_review / at_risk 状态语义（lucide 新名 CircleAlert）。
 * - project=FolderKanban：page-registry /app/projects、route-preview 多数派；
 *   FolderOpen（project-list-page 旧用，与「打开」动作混淆）已于第二批收敛为本口径。
 * - workflow=Workflow：shell-layout nav.workflow 已用，流程节点语义。
 * - execution=Play：page-registry settings/ai/executions 已用，「运行」语义。
 * - acceptance=ShieldCheck：acceptance-list-page 已用，门禁语义；
 *   admin 域与人工确认节点的三方重叠已裁决改道（UserCog / UserCheck，见文件头）。
 * - document=FileText：page-registry /app/documents、route-preview、apm-ref doc 多数派；
 *   FileStack（documents-page 旧用）已于第二批收敛为本口径。
 * - member=Users / team=UsersRound：nav 既有成对口径（见文件头注释）。
 * - decision=Scale：裁决天平语义唯一；page-registry / shell-layout / tabs-registry
 *   的 decisions 导航原用 Inbox（「收件箱页面」语义），已于第二批统一为本口径。
 * - workspace=Database：工作区 = 独立 SQLite 库（每工作区一库），仓库语义无撞车。
 * - repository=GitBranch：page-registry /app/repositories、route-preview 多数派。
 * - release=Tag：apm-ref chip 既有口径。
 */
export const ENTITY_ICONS: Record<EntityKind, EntityIconEntry> = {
  issue: { icon: CheckSquare, tone: 'info' },
  bug: { icon: Bug, tone: 'danger' },
  project: { icon: FolderKanban, tone: 'info' },
  workflow: { icon: Workflow, tone: 'info' },
  execution: { icon: Play, tone: 'info' },
  acceptance: { icon: ShieldCheck, tone: 'success' },
  document: { icon: FileText, tone: 'info' },
  member: { icon: Users, tone: 'warning' },
  team: { icon: UsersRound, tone: 'success' },
  decision: { icon: Scale, tone: 'warning' },
  workspace: { icon: Database, tone: 'default' },
  repository: { icon: GitBranch, tone: 'danger' },
  release: { icon: Tag, tone: 'default' },
};

/** 实体图标条目（icon + tone） */
export function getEntityIcon(entity: EntityKind): EntityIconEntry {
  return ENTITY_ICONS[entity];
}

/** 实体 tone → 文字色类（转发 status-visuals 的语义色档，避免二次映射） */
export function getEntityIconTextClass(entity: EntityKind): string {
  return TONE_TEXT_CLASS[ENTITY_ICONS[entity].tone];
}

/** 设计宪法 §6.2 四档：text-10/11→12px、text-xs→14px、text-sm+→16px、标题→20px */
const ENTITY_ICON_SIZES = {
  xs: 'size-3',
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

export type EntityIconSize = keyof typeof ENTITY_ICON_SIZES;

export interface EntityIconProps extends SVGProps<SVGSVGElement> {
  entity: EntityKind;
  size?: EntityIconSize;
  /** 覆盖默认 tone 色或追加间距类（twmerge 保证色档覆盖语义正确） */
  className?: string;
}

/** 实体图标薄组件：默认着实体 tone 语义色，className 可覆盖，其余 svg props 透传 */
export function EntityIcon({ entity, size = 'md', className, ...rest }: EntityIconProps) {
  const { icon: Icon, tone } = getEntityIcon(entity);
  return (
    <Icon
      className={cn(ENTITY_ICON_SIZES[size], TONE_TEXT_CLASS[tone], className)}
      aria-hidden
      {...rest}
    />
  );
}
