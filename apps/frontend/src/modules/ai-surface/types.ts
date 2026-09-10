/**
 * AI Surface (AI 认知协同表面) 类型定义
 */

export type AgentRole = 'pm' | 'architect' | 'coder' | 'qa';

export type AgentStatus = 'idle' | 'reasoning' | 'executing' | 'auditing';

export interface AgentPersona {
  id: string;
  name: string;
  role: AgentRole;
  roleTitle: string;
  avatar: string;
  status: AgentStatus;
  statusText: string;
  activeIssue?: {
    id: string;
    key: string;
    title: string;
  };
  trustScore: number;
  tokensUsed: number;
  recentThought?: string;
  specialties: string[];
}

export interface ActivityBubble {
  id: string;
  agentId: string;
  text: string;
  timestamp: number;
  type: 'info' | 'tool' | 'contract';
}

export interface ThoughtStep {
  id: string;
  title: string;
  description: string;
  durationMs: number;
  status: 'done' | 'active' | 'pending';
}

export interface ArtifactItem {
  id: string;
  type: 'architecture' | 'code-diff' | 'acceptance-criteria';
  title: string;
  subtitle: string;
  createdAt: string;
  authorAgentId: string;
  payload: {
    codeSnippet?: string;
    language?: string;
    diagramSpec?: string[];
    criteriaList?: Array<{ label: string; done: boolean; required: boolean }>;
  };
}

export interface CognitiveMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: AgentRole;
  avatar: string;
  timestamp: string;
  content: string;
  thoughts?: ThoughtStep[];
  artifactId?: string;
}

export interface TrustDimension {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  description: string;
  status: 'optimal' | 'good' | 'warning';
}

export interface MemoryAtom {
  id: string;
  key: string;
  category: 'architecture' | 'governance' | 'preference';
  weight: number;
  summary: string;
}
