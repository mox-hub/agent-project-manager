import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { profileApi } from '../api/profile-api';

/** 项目档案 hooks：查询走 ['projects', id, 'profile'] 命名空间，变更后整体失效 */
const profileKey = (projectId: string) => ['projects', projectId, 'profile'] as const;

export function useProfile(projectId: string | undefined) {
  return useQuery({
    queryKey: profileKey(projectId ?? '_'),
    queryFn: () => profileApi.getProfile(projectId!),
    enabled: !!projectId,
  });
}

export function useProfileSchema() {
  return useQuery({
    queryKey: ['projects', 'profile-schema'],
    queryFn: () => profileApi.getSchema(),
    staleTime: Infinity,
  });
}

export function useCreateProfileAtom(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: profileApi.createAtom,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKey(projectId) });
    },
  });
}

export function useEditProfileAtom(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      atomId,
      content,
    }: {
      atomId: string;
      content: string;
    }) => profileApi.editAtom(projectId, atomId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKey(projectId) });
    },
  });
}

export function useApproveProfileAtom(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (atomId: string) => profileApi.approveAtom(projectId, atomId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKey(projectId) });
    },
  });
}

export function useRejectProfileAtom(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ atomId, reason }: { atomId: string; reason?: string }) =>
      profileApi.rejectAtom(projectId, atomId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKey(projectId) });
    },
  });
}

export function useStartArchaeology(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { memberId?: string; providerId?: string } = {}) =>
      profileApi.startArchaeology(projectId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKey(projectId) });
    },
  });
}

export function useIngestArchaeology(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (executionId: string) =>
      profileApi.ingestArchaeology(projectId, executionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: profileKey(projectId) });
    },
  });
}

export function useProfileBriefing(projectId: string | undefined) {
  return useQuery({
    queryKey: ['projects', projectId, 'briefing'],
    queryFn: () => profileApi.getBriefing(projectId!),
    enabled: !!projectId,
  });
}
