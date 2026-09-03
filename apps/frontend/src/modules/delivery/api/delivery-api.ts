import { api } from '@/infrastructure/api-client';

// 契约：docs/design/api-contract-proposals.md §3 Delivery（前端优先落地版：交付树 + 标注）

export type AcceptStatus = 'pending' | 'in_progress' | 'passed' | 'failed' | 'waived' | 'blocked';
export type NodeLevel = 'project' | 'milestone' | 'feature';
export type StageKey = 'unitTest' | 'internalTest' | 'devReview' | 'pmReview' | 'userReview';
export type AgentKey = 'claudeCode' | 'cursor' | 'copilot' | 'codex' | 'windsurf';
export type AgentStatus = 'active' | 'idle' | 'contributed' | 'not_used';

export type AcceptanceRecord = Record<StageKey, AcceptStatus>;
export type AgentRecord = Record<AgentKey, AgentStatus>;

export interface Annotation {
  id: string;
  nodeId: string;
  author: string;
  content: string;
  timestamp: string;
  tag: 'note' | 'negotiated' | 'blocker' | 'decision';
}

export interface DeliveryNode {
  id: string;
  level: NodeLevel;
  title: string;
  description?: string;
  owner: string;
  dueDate: string;
  progress: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  testCoverage?: number;
  bugCount?: number;
  openPRs?: number;
  riskLevel?: 'low' | 'medium' | 'high';
  reqCoverage?: number;
  businessValue?: 'low' | 'medium' | 'high';
  feedback?: string;
  acceptance: AcceptanceRecord;
  agents: AgentRecord;
  children?: DeliveryNode[];
}

export interface DeliveryOverview {
  nodes: DeliveryNode[];
  annotations: Annotation[];
}

export const deliveryApi = {
  getOverview: (projectId?: string) =>
    api.get<DeliveryOverview>('/delivery/overview', projectId ? { projectId } : undefined),
};
