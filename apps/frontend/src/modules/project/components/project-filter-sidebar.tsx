import { useMemo } from 'react';
import { FilterPanel, type FilterGroup } from '../../../shared/ui/filter-panel';
import type { ProjectListParams, ProjectStatus, ProjectType } from '../api/project-api';
import { useTheme } from '@/shared/theme/theme-context';
import {
  Search,
  Filter,
  Sparkles,
  Target,
  Tag,
  User,
  UserCircle,
  Activity,
  Calendar,
  FileX,
  Milestone,
  GitBranch,
  FileText,
  FolderKanban,
  Circle,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export interface ProjectFilterSidebarProps {
  filters: ProjectListParams;
  onChange: (filters: ProjectListParams) => void;
  projectCounts?: {
    status?: Record<string, number>;
    type?: Record<string, number>;
  };
}

export function ProjectFilterSidebar({
  filters,
  onChange,
  projectCounts,
}: ProjectFilterSidebarProps) {
  const { theme } = useTheme();
  const { colors } = theme;
  
  const filterGroups: FilterGroup[] = useMemo(() => {
    // Map API statuses to display options
    // Note: API only supports 'active' and 'archived', but we show additional options for future expansion
    const statusOptions = [
      {
        id: 'active',
        label: 'In Progress',
        icon: <Clock size={14} style={{ color: '#eab308' }} />,
        count: projectCounts?.status?.active,
      },
      {
        id: 'archived',
        label: 'Archived',
        icon: <XCircle size={14} style={{ color: '#6b7280' }} />,
        count: projectCounts?.status?.archived,
      },
      // Future status options (not yet supported by API)
      {
        id: 'backlog',
        label: 'Backlog',
        icon: <Circle size={14} style={{ color: '#f97316' }} />,
        count: projectCounts?.status?.backlog,
      },
      {
        id: 'planned',
        label: 'Planned',
        icon: <Circle size={14} style={{ color: '#ffffff' }} />,
        count: projectCounts?.status?.planned,
      },
      {
        id: 'completed',
        label: 'Completed',
        icon: <CheckCircle2 size={14} style={{ color: '#3b82f6' }} />,
        count: projectCounts?.status?.completed,
      },
    ];

    const typeOptions = [
      {
        id: 'personal',
        label: 'Personal',
        count: projectCounts?.type?.personal,
      },
      {
        id: 'team',
        label: 'Team',
        count: projectCounts?.type?.team,
      },
      {
        id: 'experiment',
        label: 'Experiment',
        count: projectCounts?.type?.experiment,
      },
      {
        id: 'enterprise',
        label: 'Enterprise',
        count: projectCounts?.type?.enterprise,
      },
    ];

    return [
      {
        id: 'ai-filter',
        label: 'AI Filter',
        icon: <Sparkles size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'advanced-filter',
        label: 'Advanced filter',
        icon: <Filter size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'status',
        label: 'Status',
        icon: (
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: '50%',
              backgroundColor: colors.textMuted,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 4,
                height: 4,
                borderRadius: '50%',
                backgroundColor: colors.surface,
              }}
            />
          </div>
        ),
        options: statusOptions,
        searchable: true,
      },
      {
        id: 'priority',
        label: 'Priority',
        icon: <Target size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'labels',
        label: 'Labels',
        icon: <Tag size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'lead',
        label: 'Lead',
        icon: <User size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'members',
        label: 'Members',
        icon: <UserCircle size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'creator',
        label: 'Creator',
        icon: <UserCircle size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'health',
        label: 'Health',
        icon: <Activity size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'dates',
        label: 'Dates',
        icon: <Calendar size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'no-initiatives',
        label: 'No initiatives',
        icon: <FileX size={14} />,
        options: [],
      },
      {
        id: 'milestones',
        label: 'Milestones',
        icon: <Milestone size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'relations',
        label: 'Relations',
        icon: <GitBranch size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'template',
        label: 'Template',
        icon: <FileText size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'title-summary',
        label: 'Title & summary',
        icon: <Search size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'specific-project',
        label: 'Specific project',
        icon: <FolderKanban size={14} />,
        options: [],
        searchable: true,
      },
      {
        id: 'type',
        label: 'Type',
        icon: <FolderKanban size={14} />,
        options: typeOptions,
        searchable: true,
      },
    ];
  }, [projectCounts, colors.surface, colors.textMuted]);

  const selectedFilters = useMemo(() => {
    const result: Record<string, string | string[] | undefined> = {};
    // Convert single values to arrays for multi-select UI
    // Note: API only supports single values, but UI supports multi-select
    if (filters.status) {
      result.status = [filters.status];
    }
    if (filters.type) {
      result.type = [filters.type];
    }
    return result;
  }, [filters.status, filters.type]);

  const handleFilterChange = (filterId: string, value: string | string[] | undefined) => {
    const updates: Partial<ProjectListParams> = {};

    if (filterId === 'status') {
      // Handle array values (multi-select) - use first value for API
      const statusValue = Array.isArray(value) ? value[0] : (value as string);
      if (statusValue === 'active' || statusValue === 'archived') {
        updates.status = statusValue as ProjectStatus;
      } else {
        // For future statuses or empty selection, clear the filter
        updates.status = undefined;
      }
    } else if (filterId === 'type') {
      // Handle array values (multi-select) - use first value for API
      const typeValue = Array.isArray(value) ? value[0] : (value as ProjectType);
      updates.type = (typeValue as ProjectType) || undefined;
    }

    onChange({
      ...filters,
      ...updates,
      page: 1, // Reset to first page when filter changes
    });
  };

  return (
    <FilterPanel
      groups={filterGroups}
      selectedFilters={selectedFilters}
      onFilterChange={handleFilterChange}
      addFilterPlaceholder="Add Filter..."
      buttonText="Filter"
      buttonIcon={<Filter size={14} />}
    />
  );
}
