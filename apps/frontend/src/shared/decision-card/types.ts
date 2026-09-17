/**
 * 决策卡（卡片文法）共享类型 —— 与服务端 decision 模块 DTO 对齐。
 *
 * 卡片文法：所有待决决策共享一个五段结构（头部陈述 / 主体变化 / 影响行 /
 * 证据抽屉 / 动作栏），用户只需要练会一个动作：批卡。
 */
import type { ComponentType, ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * 建议类提案 kind（对应服务端 `DecisionProposal.kind`）。
 *
 * **唯一**取值源：与 `useResolveDecision` 的决议路由、`KIND_ACTIONS` 的动作表
 * 同源；前端任何地方都不得再抄一份字面量（曾有两份漂移副本：本文件漏 `release`、
 * `use-decisions` 另抄的副本连 `workflow_def` 也漏 → 这两类提案会被误路由到
 * **验收端点** `acceptCompletion`，即「批准发版」被当成「验收通过」）。
 *
 * 服务端侧的对应清单：`apps/server/src/modules/decision/dto/decision.dto.ts`
 * 的 `PROPOSAL_KIND_VALUES`（与 `ProposalService.apply()` 的分发 switch 对齐）。
 */
export const PROPOSAL_KINDS = [
  'plan',
  'assignment',
  'resolution',
  'spend',
  'clarify',
  'gate',
  'workflow_def',
  'release',
] as const;

/** 建议（DecisionProposal）来源的建议类 kind 与实体 kind 的全集 */
export type DecisionKind = 'approval' | 'acceptance' | (typeof PROPOSAL_KINDS)[number];

/**
 * 该 kind 是否走 `DecisionProposal` 表（→ `/decisions/proposals/:id/resolve`）。
 *
 * 决议路由的**判定入口**：`useResolveDecision` 据此选端点，`KIND_ACTIONS` 据此选动作表。
 * 不要在各处直接写 `PROPOSAL_KINDS.includes(...)`——元组是全字面量类型，
 * 传宽联合类型会被 TS 拒收，各写各的强转迟早又会漂移。
 */
export function isProposalKind(kind: DecisionKind): boolean {
  return (PROPOSAL_KINDS as readonly string[]).includes(kind);
}

export type DecisionUrgency = 'blocking' | 'advisory';

export interface DecisionProposer {
  type: 'ai_agent' | 'human' | 'system';
  id?: string;
  name?: string;
}

/** 服务端 /decisions/pending 投影的中性决策 */
export interface Decision {
  /** 复合 ID：{kind}:{sourceId} */
  id: string;
  kind: DecisionKind;
  sourceId: string;
  status: string;
  /** 决策主题（审批动作描述 / 待验收任务标题） */
  title: string;
  detail?: string;
  urgency: DecisionUrgency;
  projectId?: string;
  projectName?: string;
  issueId?: string;
  taskTitle?: string;
  riskLevel?: string;
  actionType?: string;
  proposer: DecisionProposer;
  /** 来源原始数据（证据抽屉渲染用） */
  payload: Record<string, unknown>;
  /**
   * 当前实质内容指纹（建议类提案下发，CAP-C-04）。
   * 决议（resolve）时作为 expectedFingerprint 回传，服务端校验「所见即所批」。
   */
  contentFingerprint?: string;
  /**
   * 批准是否已过期：内容实质变更后旧批准不再可信（CAP-C-04）。
   * true 时卡壳显示醒目徽标提示重新确认；待决列表中恒为 false。
   */
  approvalStale?: boolean;
  createdAt: string;
  expiresAt?: string;
  /** 上下文内嵌投影的前端路由 */
  contextPath?: string;
}

/** 动作栏动作（默认四键：接受/微调/驳回/要替代方案；kind 可覆盖，快捷键 = 数组序号 1-4） */
export type DecisionCardAction = string;

export interface DecisionActionDef {
  action: DecisionCardAction;
  /** i18n key 或明文（含 "." 视为 key） */
  label: string;
  icon: LucideIcon;
  /**
   * 驳回/豁免类动作：点击后先弹出原因 chips 行（点选即提交），
   * reason 作为 resolutionNote / reject reason / waive reason 上送
   */
  needsReason?: boolean;
  variant?: 'default' | 'outline';
}

export interface DecisionActionOptions {
  /** needsReason 动作经 chips 选择后携带 */
  reason?: string;
  /** clarify：所选选项 key，随决议落痕供提案方轮询取回 */
  answer?: string;
}

/** 决策主体槽位集合：由各 kind 的槽位构建器产出 */
export interface DecisionSlots {
  body?: ReactNode;
  impact?: DecisionImpactItem[];
  evidence?: ReactNode;
}

export interface DecisionImpactItem {
  label: string;
  value: string;
  icon: LucideIcon;
  /** 语义色文字类（如 text-accent-red），缺省跟随 muted */
  tone?: 'red' | 'yellow' | 'green' | 'blue' | 'purple' | 'orange';
}

/**
 * 动作路由策略（卡片文法 2×2）：不可逆/高代价动作要求先展开证据 + 冷却确认。
 * 当前规则：approval high_risk → 证据强制 + 3s 冷却；其余不设防。
 */
export interface DecisionActionPolicy {
  requireEvidence: boolean;
  cooldownSecs: number;
}

export function decisionActionPolicy(decision: Decision): DecisionActionPolicy {
  if (decision.kind === 'approval' && decision.riskLevel === 'high_risk') {
    return { requireEvidence: true, cooldownSecs: 3 };
  }
  return { requireEvidence: false, cooldownSecs: 0 };
}

/** 决策槽位构建器注册契约：按 kind 注册富渲染器，缺省回退占位渲染器 */
export type DecisionSlotsBuilder = (decision: Decision) => DecisionSlots;

export type DecisionBodyRenderer = ComponentType<{ decision: Decision }>;
