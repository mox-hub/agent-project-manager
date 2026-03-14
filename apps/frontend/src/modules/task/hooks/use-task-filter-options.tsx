import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Circle, FolderKanban, Tag, User } from 'lucide-react';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useStatuses, useTags } from '@/modules/core-config/hooks/use-metadata';
import { taskApi } from '../api/task-api';
import type { FilterGroup } from '@/shared/filters/types';

export function useTaskFilterOptions(projectId: string | undefined): FilterGroup[] {
  const { data: project } = useProjectDetail(projectId);
  const { data: statuses = [] } = useStatuses(projectId, 'task');
  const { data: tags = [] } = useTags(projectId, 'task');

  const { data: iterations = [] } = useQuery({
    queryKey: ['taskFilterIterations', projectId],
    enabled: !!projectId,
    queryFn: async () => {
      if (!projectId) {
        return [];
      }
      const response = await taskApi.getProjectIterations(projectId);
      return response.data;
    },
  });

  return useMemo(() => {
    const members = project?.members || [];

    return [
      {
        id: 'status',
        label: 'Status',
        icon: <Circle size={14} />,
        searchable: true,
        multiSelect: true,
        options: statuses
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((status) => ({
            id: status.key,
            label: status.name,
          })),
      },
      {
        id: 'assigneeId',
        label: 'Assignee',
        icon: <User size={14} />,
        searchable: true,
        multiSelect: true,
        options: members.map((member) => ({
          id: member.user.id,
          label: member.user.displayName || member.user.username,
        })),
      },
      {
        id: 'iterationId',
        label: 'Iteration',
        icon: <FolderKanban size={14} />,
        searchable: true,
        multiSelect: true,
        options: iterations.map((iteration) => ({
          id: iteration.id,
          label: iteration.name,
        })),
      },
      {
        id: 'tag',
        label: 'Tag',
        icon: <Tag size={14} />,
        searchable: true,
        multiSelect: true,
        options: tags.map((tag) => ({
          id: tag.id,
          label: tag.name,
          color: tag.color,
        })),
      },
    ] satisfies FilterGroup[];
  }, [iterations, project?.members, statuses, tags]);
}

