// 通用成员类型定义
// 统一由 shared/member/types.ts 提供

export type MemberType = 'human' | 'ai_agent';

export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high' | 'max';

export const MEMBER_THINKING_LEVELS: { value: ThinkingLevel; label: string }[] = [
  { value: 'minimal', label: '极简' },
  { value: 'low', label: '低' },
  { value: 'medium', label: '中' },
  { value: 'high', label: '高' },
  { value: 'max', label: '最大化' },
];

/** 信任等级 0-4 的展示标签 */
export const MEMBER_TRUST_LEVEL_LABELS = ['L0 受限', 'L1 基础', 'L2 标准', 'L3 可信', 'L4 完全信任'];

export interface MemberRef {
  id: string;
  type: MemberType;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  isOnline?: boolean;
  email?: string | null;
}

export interface MemberAIModelConfig {
  id: string;
  name: string;
  provider: string;
}

export interface MemberUserRef {
  id: string;
  username: string;
  displayName?: string;
  email?: string;
  avatarUrl?: string;
  isActive?: boolean;
}

export interface Member {
  id: string;
  shortId: string;
  type: MemberType;
  displayName: string;
  handle: string;
  email: string | null;
  avatarUrl: string | null;
  title: string | null;
  description: string | null;
  trustLevel: number | null;
  trustScore: number | null;
  personalPrompt: string | null;
  thinkingLevel: ThinkingLevel | null;
  costRatePerDay: number | null;
  bio: string | null;
  userId: string | null;
  phone: string | null;
  timezone: string | null;
  aiModelConfigId: string | null;
  aiProvider: string | null;
  defaultCliProviderId: string | null;
  defaultExecutionRole: string | null;
  systemPrompt: string | null;
  capabilities: string[] | null;
  status: string;
  lastActiveAt: string | null;
  isOnline: boolean;
  tags: string[] | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  user?: MemberUserRef | null;
  aiModelConfig?: MemberAIModelConfig | null;
}

export interface MemberLoad {
  todo: number;
  inProgress: number;
  completed: number;
  total: number;
}

export interface MemberCard {
  id: string;
  shortId: string;
  type: MemberType;
  displayName: string;
  handle: string;
  email: string | null;
  avatarUrl: string | null;
  title: string | null;
  bio: string | null;
  status: string;
  trustLevel: number | null;
  trustScore: number | null;
  hasPersonalPrompt: boolean;
  thinkingLevel: ThinkingLevel | null;
  isOnline: boolean;
  lastActiveAt: string | null;
  tags: string[];
  userId: string | null;
  phone: string | null;
  timezone: string | null;
  aiModel: MemberAIModelConfig | null;
  capabilities: string[];
  projects: Array<{
    projectId: string;
    projectName: string;
    color: string | null;
    role: string;
  }>;
  load: MemberLoad;
  recentActivities: Array<{
    id: string;
    type: string;
    detail: unknown;
    createdAt: string;
  }>;
  teams: Array<{
    teamId: string;
    teamName: string;
    role: string;
    color: string | null;
  }>;
}

export interface Team {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  avatarUrl: string | null;
  color: string | null;
  teamPrompt: string | null;
  tags: string[] | null;
  ownerId: string | null;
  ownerName?: string | null;
  memberCount?: number;
  status: string;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number; projects: number };
}

export interface TeamMember {
  id: string;
  teamId: string;
  memberId: string;
  role: string;
  joinedAt: string;
  member?: Member;
}

export interface TaskAssignee {
  id: string;
  taskId: string;
  memberId: string;
  role: 'assignee' | 'co_assignee' | 'reviewer' | 'watcher';
  assignedBy: string | null;
  assignedAt: string;
  member?: Pick<
    Member,
    'id' | 'type' | 'displayName' | 'handle' | 'avatarUrl' | 'status' | 'isOnline'
  >;
}

export interface TaskWatcher {
  id: string;
  taskId: string;
  memberId: string;
  createdAt: string;
  member?: Pick<Member, 'id' | 'type' | 'displayName' | 'handle' | 'avatarUrl'>;
}

export interface DocumentAuthor {
  id: string;
  documentId: string;
  memberId: string;
  role: 'author' | 'co_author' | 'reviewer';
  createdAt: string;
  member?: Pick<Member, 'id' | 'type' | 'displayName' | 'handle' | 'avatarUrl'>;
}

export interface DocumentReviewer {
  id: string;
  documentId: string;
  memberId: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  reviewedAt: string | null;
  comment: string | null;
  createdAt: string;
  member?: Pick<Member, 'id' | 'type' | 'displayName' | 'handle' | 'avatarUrl'>;
}

export interface DocumentTaskLinkAssignee {
  id: string;
  documentTaskLinkId: string;
  memberId: string;
  role: 'owner' | 'contributor';
  assignedAt: string;
  member?: Pick<Member, 'id' | 'type' | 'displayName' | 'handle' | 'avatarUrl'>;
}

export interface Mention {
  id: string;
  sourceType: string;
  sourceId: string;
  memberId: string;
  mentionerId: string | null;
  context: string | null;
  createdAt: string;
  member?: Pick<Member, 'id' | 'type' | 'displayName' | 'handle' | 'avatarUrl'>;
}

// 兼容旧 TaskUserRef 的类型别名（向后兼容）
export type TaskUserRef = MemberRef;
