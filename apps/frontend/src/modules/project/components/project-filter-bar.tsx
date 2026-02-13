import { useState } from 'react';
import type { ProjectListParams, ProjectStatus, ProjectType } from '../api/project-api';

export interface ProjectFilterBarProps {
  initialFilters?: ProjectListParams;
  onChange: (filters: ProjectListParams) => void;
}

const projectTypes: { label: string; value: ProjectType }[] = [
  { label: 'All types', value: undefined as unknown as ProjectType },
  { label: 'Personal', value: 'personal' },
  { label: 'Team', value: 'team' },
  { label: 'Experiment', value: 'experiment' },
  { label: 'Enterprise', value: 'enterprise' },
];

const projectStatuses: { label: string; value: ProjectStatus | '' }[] = [
  { label: 'All status', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' },
];

export function ProjectFilterBar({ initialFilters, onChange }: ProjectFilterBarProps) {
  const [filters, setFilters] = useState<ProjectListParams>({
    q: '',
    status: 'active',
    ...(initialFilters ?? {}),
  });

  const handleChange = (next: Partial<ProjectListParams>) => {
    const merged = { ...filters, ...next };
    setFilters(merged);
    onChange(merged);
  };

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        marginBottom: '16px',
        flexWrap: 'wrap',
      }}
    >
      <input
        type="search"
        placeholder="Search projects..."
        value={filters.q ?? ''}
        onChange={(e) => handleChange({ q: e.target.value })}
        style={{
          padding: '6px 10px',
          minWidth: '220px',
          borderRadius: '4px',
          border: '1px solid #ccc',
        }}
      />

      <select
        value={filters.status ?? 'active'}
        onChange={(e) =>
          handleChange({
            status: (e.target.value || undefined) as ProjectStatus | undefined,
          })
        }
        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
      >
        {projectStatuses.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        value={filters.type ?? ''}
        onChange={(e) =>
          handleChange({
            type: (e.target.value || undefined) as ProjectType | undefined,
          })
        }
        style={{ padding: '6px 10px', borderRadius: '4px', border: '1px solid #ccc' }}
      >
        {projectTypes.map((t) => (
          <option key={t.label} value={t.value ?? ''}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}

