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
 * 4. nav / tabs 注册表（shell-layout / tabs-registry）的图标迁移留待第二批；
 *    nav 表面另有品牌配色（page-registry color 字段），与本表 tone 是两套口径，互不影响。
 * 5. tone 取 5 档语义色（StatusTone），文字色档复用 TONE_TEXT_CLASS；
 *    词表暂无 purple/cyan/orange 等扩展色，品牌色诉求仍由 nav 配色承载。
 * 6. EntityIcon 尺寸走设计宪法 §6.2 四档：12 / 14 / 16 / 20 px（xs/sm/md/lg），
 *    与 text-10/11、text-xs、text-sm+、标题字阶一一配对。
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 已知重叠（登记待处置，第二批裁决）：
 * - ShieldCheck（本表 = acceptance）同时被 admin 域 nav（page-registry /app/admin、
 *   /app/settings/roles）与 workflow human-confirm 流程节点使用——前者属权限管理域、
 *   后者属流程节点域，均非「验收」实体；建议 admin 域改用 UserCog/Shield 系、
 *   流程节点改用 UserCheck，消除与验收实体的混淆。
 * - Users（本表 = member）/ UsersRound（本表 = team）成对取自 nav 既有口径
 *   （page-registry /app/members=Users、/app/teams=UsersRound），member 侧历史散落
 *   的单数 User 会在第二批铺开时统一为 Users。
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
 *   FolderOpen（project-list-page 旧用）与「打开」动作混淆，第二批收敛。
 * - workflow=Workflow：shell-layout nav.workflow 已用，流程节点语义。
 * - execution=Play：page-registry settings/ai/executions 已用，「运行」语义。
 * - acceptance=ShieldCheck：acceptance-list-page 已用，门禁语义（重叠见文件头注释）。
 * - document=FileText：page-registry /app/documents、route-preview、apm-ref doc 多数派；
 *   FileStack（documents-page 旧用）第二批收敛。
 * - member=Users / team=UsersRound：nav 既有成对口径（见文件头注释）。
 * - decision=Scale：裁决天平语义唯一；page-registry /app/decisions 用 Inbox 是
 *   「收件箱页面」语义，属 nav 表面，第二批迁移时由 nav 口径自行裁决。
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
