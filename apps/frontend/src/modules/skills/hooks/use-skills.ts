/**
 * Skills Hooks
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { skillsApi, type UpdateSkillRequest } from '../api/skills-api';

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
