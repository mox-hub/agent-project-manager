import { useMemo } from 'react';
import { Circle, FolderKanban, User, AlertTriangle, Flag } from 'lucide-react';
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
      {
        id: 'priority',
        label: 'Priority',
        icon: <Flag size={14} />,
        searchable: false,
        multiSelect: true,
        options: [
          { id: 'low', label: 'Low' },
          { id: 'medium', label: 'Medium' },
          { id: 'high', label: 'High' },
          { id: 'urgent', label: 'Urgent' },
        ],
      },
      {
        id: 'workflowStatus',
        label: 'Workflow',
        icon: <Circle size={14} />,
        searchable: false,
        multiSelect: true,
        options: [
          { id: 'backlog', label: 'Backlog' },
          { id: 'planned', label: 'Planned' },
          { id: 'in_progress', label: 'In Progress' },
          { id: 'completed', label: 'Completed' },
          { id: 'canceled', label: 'Canceled' },
        ],
      },
      {
        id: 'riskLevel',
        label: 'Risk',
        icon: <AlertTriangle size={14} />,
        searchable: false,
        multiSelect: true,
        options: [
          { id: 'low', label: 'Low' },
          { id: 'medium', label: 'Medium' },
          { id: 'high', label: 'High' },
          { id: 'critical', label: 'Critical' },
        ],
      },
    ] satisfies FilterGroup[];
  }, [projects]);
}
