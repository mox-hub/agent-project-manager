/**
 * Skills Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  skillsApi,
  type CreateSkillRequest,
  type ImportSkillRequest,
  type UpdateSkillRequest,
} from '../api/skills-api';

export const skillKeys = {
  all: ['skills'] as const,
};

export function useSkills() {
  return useQuery({
    queryKey: skillKeys.all,
    queryFn: () => skillsApi.listSkills(),
    staleTime: 30 * 1000,
  });
}

export function useUpdateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ key, data }: { key: string; data: UpdateSkillRequest }) =>
      skillsApi.updateSkill(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}

export function useCreateSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateSkillRequest) => skillsApi.createSkill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}

export function useImportSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ImportSkillRequest) => skillsApi.importSkill(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}

export function useDeleteSkill() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (key: string) => skillsApi.removeSkill(key),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: skillKeys.all });
    },
  });
}
