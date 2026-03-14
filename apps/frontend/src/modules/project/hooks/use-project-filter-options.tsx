import { useMemo } from 'react';
import { Circle, FolderKanban, User } from 'lucide-react';
import type { Project } from '../api/project-api';
import type { FilterGroup } from '@/shared/filters/types';

interface UseProjectFilterOptionsInput {
  projects: Project[];
}

export function useProjectFilterOptions({
  projects,
}: UseProjectFilterOptionsInput): FilterGroup[] {
  return useMemo(() => {
    const memberMap = new Map<string, { id: string; label: string }>();
    projects.forEach((project) => {
      (project.members || []).forEach((member) => {
        memberMap.set(member.user.id, {
          id: member.user.id,
          label: member.user.displayName || member.user.username,
        });
      });
    });

    return [
      {
        id: 'status',
        label: 'Status',
        icon: <Circle size={14} />,
        searchable: true,
        multiSelect: true,
        options: [
          { id: 'active', label: 'Active' },
          { id: 'archived', label: 'Archived' },
        ],
      },
      {
        id: 'type',
        label: 'Type',
        icon: <FolderKanban size={14} />,
        searchable: true,
        multiSelect: true,
        options: [
          { id: 'personal', label: 'Personal' },
          { id: 'team', label: 'Team' },
          { id: 'experiment', label: 'Experiment' },
          { id: 'enterprise', label: 'Enterprise' },
        ],
      },
      {
        id: 'memberId',
        label: 'Member',
        icon: <User size={14} />,
        searchable: true,
        multiSelect: true,
        options: Array.from(memberMap.values()),
      },
    ] satisfies FilterGroup[];
  }, [projects]);
}

