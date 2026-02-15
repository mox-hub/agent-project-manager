import { useState } from 'react';
import type { ProjectListParams, ProjectStatus, ProjectType } from '../api/project-api';
import { Input, Select } from '../../../shared/ui/field';
import { Search, Filter } from 'lucide-react';

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
        gap: '8px',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '2px 0',
        flexWrap: 'wrap',
      }}
    >
      <Input
        type="search"
        placeholder="Search projects..."
        value={filters.q ?? ''}
        onChange={(e) => handleChange({ q: e.target.value })}
        leftIcon={<Search size={16} />}
        style={{
          minWidth: '220px',
        }}
      />

      <Select
        value={filters.status ?? 'active'}
        onChange={(e) =>
          handleChange({
            status: (e.target.value || undefined) as ProjectStatus | undefined,
          })
        }
        leftIcon={<Filter size={16} />}
      >
        {projectStatuses.map((s) => (
          <option key={s.label} value={s.value}>
            {s.label}
          </option>
        ))}
      </Select>

      <Select
        value={filters.type ?? ''}
        onChange={(e) =>
          handleChange({
            type: (e.target.value || undefined) as ProjectType | undefined,
          })
        }
        leftIcon={<Filter size={16} />}
      >
        {projectTypes.map((t) => (
          <option key={t.label} value={t.value ?? ''}>
            {t.label}
          </option>
        ))}
      </Select>
    </div>
  );
}

