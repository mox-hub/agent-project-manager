import { useState, useEffect } from 'react';
import type { TaskListParams } from '../api/task-api';
import { PillInput, PillSelect } from '@/components/ui/field';
import { useProjectDetail } from '@/modules/project/hooks/use-project-detail';
import { useStatuses } from '@/modules/core-config/hooks/use-metadata';
import { api } from '@/infrastructure/api-client';

export interface TaskFilterBarProps {
  projectId: string | undefined;
  initialFilters?: TaskListParams;
  onChange: (filters: TaskListParams) => void;
}

interface Iteration {
  id: string;
  name: string;
  status: string;
}

export function TaskFilterBar({ projectId, initialFilters, onChange }: TaskFilterBarProps) {
  const [filters, setFilters] = useState<TaskListParams>({
    ...(initialFilters ?? {}),
  });

  const { data: project } = useProjectDetail(projectId);
  const { data: statuses = [] } = useStatuses(projectId, 'task');
  const [iterations, setIterations] = useState<Iteration[]>([]);

  // Fetch iterations
  useEffect(() => {
    if (!projectId) return;
    api
      .get<Iteration[]>(`/projects/${projectId}/iterations`)
      .then((response) => {
        setIterations(response.data || []);
      })
      .catch(() => {
        setIterations([]);
      });
  }, [projectId]);

  const handleChange = (next: Partial<TaskListParams>) => {
    const merged = { ...filters, ...next };
    setFilters(merged);
    onChange(merged);
  };

  const members = project?.members || [];
  const uniqueStatuses = Array.from(new Set(statuses.map((s) => s.key)));

  return (
    <div
      style={{
        display: 'flex',
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '2px 0',
        flexWrap: 'wrap',
      }}
    >
      <PillInput
        type="search"
        placeholder="Search tasks..."
        value={filters.q ?? ''}
        onChange={(e) => handleChange({ q: e.target.value || undefined })}
        style={{
          minWidth: '220px',
        }}
      />

      <PillSelect
        value={filters.status || ''}
        onChange={(e) =>
          handleChange({
            status: e.target.value || undefined,
          })
        }
      >
        <option value="">All statuses</option>
        {uniqueStatuses.map((status) => (
          <option key={status} value={status}>
            {status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')}
          </option>
        ))}
      </PillSelect>

      <PillSelect
        value={filters.assigneeId || ''}
        onChange={(e) =>
          handleChange({
            assigneeId: e.target.value || undefined,
          })
        }
      >
        <option value="">All assignees</option>
        {members.map((member) => (
          <option key={member.user.id} value={member.user.id}>
            {member.user.displayName || member.user.username}
          </option>
        ))}
      </PillSelect>

      <PillSelect
        value={filters.iterationId || ''}
        onChange={(e) =>
          handleChange({
            iterationId: e.target.value || undefined,
          })
        }
      >
        <option value="">All iterations</option>
        {iterations.map((iteration) => (
          <option key={iteration.id} value={iteration.id}>
            {iteration.name}
          </option>
        ))}
      </PillSelect>
    </div>
  );
}
