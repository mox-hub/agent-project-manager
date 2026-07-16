// 通用类型（与 modules/team-member/types.ts 保持最小依赖）
export type MemberType = 'human' | 'ai_agent';

export interface MemberRef {
  id: string;
  type: MemberType;
  displayName: string;
  handle: string;
  avatarUrl: string | null;
  isOnline?: boolean;
  email?: string | null;
}

// 兼容旧 TaskUserRef 的类型别名（向后兼容）
// 注意：Task.assignee 仍然使用 TaskUserRef，但新功能应使用 Member 或 TaskAssignee
export type TaskUserRef = MemberRef;
