import { api } from '@/infrastructure/api-client';

export interface AdminUserRole {
  /** RoleAssignment id（取消角色时需要） */
  id: string;
  role: string;
}

export interface AdminUser {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  createdAt: string;
  roles: AdminUserRole[];
  memberId: string | null;
  memberStatus: string | null;
  memberShortId: string | null;
}

export interface AdminUserSummary {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  avatarUrl: string | null;
  isActive: boolean;
}

export interface CreateAdminUserResponse {
  user: AdminUserSummary;
  memberId: string;
  /** 随机初始密码，仅创建响应返回一次 */
  generatedPassword: string;
}

export interface UpdateAdminUserResponse extends AdminUserSummary {
  /** 重置密码时返回一次 */
  generatedPassword?: string;
}

export interface RegistrationInviteItem {
  id: string;
  email: string | null;
  token: string;
  status: string;
  expiresAt: string;
  acceptedAt: string | null;
  createdById: string | null;
  createdBy: string | null;
  createdAt: string;
}

export const adminApi = {
  listUsers: () => api.get<AdminUser[]>('/admin/users'),
  createUser: (data: {
    displayName: string;
    email: string;
    username?: string;
    role?: string;
  }) => api.post<CreateAdminUserResponse>('/admin/users', data),
  updateUser: (
    id: string,
    data: {
      displayName?: string;
      email?: string;
      isActive?: boolean;
      resetPassword?: boolean;
    },
  ) => api.patch<UpdateAdminUserResponse>(`/admin/users/${id}`, data),
  listInvites: () =>
    api.get<RegistrationInviteItem[]>('/admin/invites'),
  createInvite: (data: { email?: string; expiresInDays?: number }) =>
    api.post<RegistrationInviteItem>('/admin/invites', data),
  revokeInvite: (id: string) =>
    api.post<RegistrationInviteItem>(`/admin/invites/${id}/revoke`, {}),
  addUserRole: (userId: string, role: string) =>
    api.post(`/users/${userId}/roles`, { scopeType: 'global', role }),
  removeUserRole: (userId: string, roleAssignmentId: string) =>
    api.delete(`/users/${userId}/roles/${roleAssignmentId}`),
};

/** 注册邀请链接（与后端邮件中一致：/register?invite=<token>） */
export function buildRegisterInviteLink(token: string) {
  const base = window.location.origin;
  return `${base}/register?invite=${token}`;
}
