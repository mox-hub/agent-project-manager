/**
 * 决策卡（卡片文法）共享类型 —— 与服务端 decision 模块 DTO 对齐。
 *
 * 卡片文法：所有待决决策共享一个五段结构（头部陈述 / 主体变化 / 影响行 /
 * 证据抽屉 / 动作栏），用户只需要练会一个动作：批卡。
 * 本目录只定义类型与卡壳；各决策类型的富渲染器后续按 kind 注册。
 */
import type { ComponentType } from 'react';

export type DecisionKind = 'approval' | 'acceptance';

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
  taskId?: string;
  taskTitle?: string;
  riskLevel?: string;
  actionType?: string;
  proposer: DecisionProposer;
  /** 来源原始数据（证据抽屉渲染用） */
  payload: Record<string, unknown>;
  createdAt: string;
  expiresAt?: string;
  /** 上下文内嵌投影的前端路由 */
  contextPath?: string;
}

/** 动作栏四键：接受 / 微调 / 驳回 / 要替代方案（顺序与快捷键 1-4 全系统一致） */
export type DecisionCardAction = 'accept' | 'adjust' | 'reject' | 'alternative';

export interface DecisionActionDef {
  action: DecisionCardAction;
  label: string;
  variant?: 'default' | 'outline';
}

/** 决策主体渲染器注册契约：按 kind 注册富渲染器，缺省回退占位渲染器 */
export type DecisionBodyRenderer = ComponentType<{ decision: Decision }>;
