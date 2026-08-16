import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProjectGantt } from '@/modules/project/components/project-gantt';
import type { Project } from '@/modules/project/api/project-api';

function buildProject(partial: Partial<Project>): Project {
  return {
    id: 'project-1',
    name: 'Demo project',
    type: 'team',
    visibility: 'internal',
    status: 'active',
    createdAt: '2026-03-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    ...partial,
  };
}

describe('ProjectGantt', () => {
  it('renders project item when timeline exists', () => {
    render(
      <ProjectGantt
        projects={[
          buildProject({
            id: 'project-a',
            name: 'Project A',
            startDate: '2026-03-01T00:00:00Z',
            targetDate: '2026-03-20T00:00:00Z',
          }),
        ]}
      />,
    );

    expect(screen.getByTestId('gantt-bar-project-a')).toBeTruthy();
  });

  it('renders empty state when no project has dates', () => {
    render(
      <ProjectGantt
        projects={[
          buildProject({
            id: 'project-b',
            name: 'Project B',
            startDate: null,
            targetDate: null,
          }),
        ]}
      />,
    );

    expect(screen.getByText('No projects with valid dates to display')).toBeTruthy();
  });
});
