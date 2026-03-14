import { useState } from 'react';
import type { ProjectListParams, ProjectStatus, ProjectType } from '../api/project-api';
import { Input, Select } from '@/components/ui/field';
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
    <div className="flex flex-wrap items-center justify-end gap-2 py-0.5">
      <div className="relative min-w-[220px]">
        <Search size={16} className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-content-text-secondary" />
        <Input
          type="search"
          placeholder="Search projects..."
          value={filters.q ?? ''}
          onChange={(e) => handleChange({ q: e.target.value })}
          className="pl-8"
        />
      </div>

      <div className="relative">
        <Filter size={16} className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-content-text-secondary" />
        <Select
          value={filters.status ?? 'active'}
          onChange={(e) =>
            handleChange({
              status: (e.target.value || undefined) as ProjectStatus | undefined,
            })
          }
          className="pl-8"
        >
          {projectStatuses.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>

      <div className="relative">
        <Filter size={16} className="pointer-events-none absolute left-2.5 top-1/2 z-[1] -translate-y-1/2 text-content-text-secondary" />
        <Select
          value={filters.type ?? ''}
          onChange={(e) =>
            handleChange({
              type: (e.target.value || undefined) as ProjectType | undefined,
            })
          }
          className="pl-8"
        >
          {projectTypes.map((t) => (
            <option key={t.label} value={t.value ?? ''}>
              {t.label}
            </option>
          ))}
        </Select>
      </div>
    </div>
  );
}

