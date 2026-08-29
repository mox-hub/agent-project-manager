import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { adminApi } from '../api/admin-api';

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => adminApi.listUsers(),
    staleTime: 30 * 1000,
  });
}

export function useCreateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useUpdateAdminUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof adminApi.updateUser>[1];
    }) => adminApi.updateUser(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

export function useRegistrationInvites() {
  return useQuery({
    queryKey: ['admin', 'invites'],
    queryFn: () => adminApi.listInvites(),
    staleTime: 30 * 1000,
  });
}

export function useCreateRegistrationInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invites'] }),
  });
}

export function useRevokeRegistrationInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: adminApi.revokeInvite,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invites'] }),
  });
}

/** 设置/取消全局管理员角色（写后同时刷新当前用户角色缓存） */
export function useToggleAdminRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      makeAdmin,
      roleAssignmentId,
    }: {
      userId: string;
      makeAdmin: boolean;
      roleAssignmentId?: string;
    }) => {
      if (makeAdmin) {
        return adminApi.addUserRole(userId, 'admin');
      }
      if (!roleAssignmentId) {
        throw new Error('缺少角色分配 ID');
      }
      return adminApi.removeUserRole(userId, roleAssignmentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });
}
