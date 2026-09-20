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

/**
 * CAP-B-07 信任三级口径（可理解的分级授权，PRD §12 原则 4「渐进放权」）：
 * 1=观察者 / 2=协助者 / 3=受托者。等级名与放权清单文案走 i18n（trust.* 命名空间），
 * 前端静态映射、server 只下发数值等级（trustLevel Int）。
 * 红线（发布/删除/花钱/成员与权限变更）任何等级都永远须人确认（本期为静态展示口径）。
 */
export type MemberTrustTier = 1 | 2 | 3;

export interface MemberTrustTierDef {
  level: MemberTrustTier;
  /** i18n 键：等级名（trust.tierN.name） */
  labelKey: string;
  /** i18n 键：一句话定位（trust.tierN.desc） */
  descKey: string;
  /** i18n 键列表：该等级放权清单（trust.tierN.allowM，M 与数组下标+1 对齐） */
  allowKeys: string[];
}

export const MEMBER_TRUST_TIERS: MemberTrustTierDef[] = [
  {
    level: 1,
    labelKey: 'trust.tier1.name',
    descKey: 'trust.tier1.desc',
    allowKeys: ['trust.tier1.allow1', 'trust.tier1.allow2', 'trust.tier1.allow3'],
  },
  {
    level: 2,
    labelKey: 'trust.tier2.name',
    descKey: 'trust.tier2.desc',
    allowKeys: ['trust.tier2.allow1', 'trust.tier2.allow2', 'trust.tier2.allow3'],
  },
  {
    level: 3,
    labelKey: 'trust.tier3.name',
    descKey: 'trust.tier3.desc',
    allowKeys: ['trust.tier3.allow1', 'trust.tier3.allow2', 'trust.tier3.allow3'],
  },
];

/** 兼容旧五档（L0-L4）存量数据的展示归一：0/越界 → 未评估，4 → 受托者，1-3 原样 */
export function normalizeTrustLevel(level: number | null | undefined): MemberTrustTier | null {
  if (level === null || level === undefined) return null;
  if (level >= 3) return 3;
  if (level >= 1) return level as MemberTrustTier;
  return null;
}

/** 与 server trust.service scoreToLevel（<40=1 / 40-69=2 / >=70=3）对齐的展示映射 */
export function trustLevelFromScore(score: number): MemberTrustTier {
  if (score >= 70) return 3;
  if (score >= 40) return 2;
  return 1;
}

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
  /** 后端 Json 自由列：除 isSystemAssistant 外还存 phone/timezone 等扩展字段 */
  metadata?: Record<string, unknown> | null;
  user?: MemberUserRef | null;
  aiModelConfig?: MemberAIModelConfig | null;
}

/** 系统内置 AI 助理（小周）：可改信息，禁删除/停用 */
export function isSystemAssistantMember(m: Pick<Member, 'handle' | 'metadata'>): boolean {
  return m.handle === 'xiaozhou' || m.metadata?.isSystemAssistant === true;
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
  issueId: string;
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
  issueId: string;
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
