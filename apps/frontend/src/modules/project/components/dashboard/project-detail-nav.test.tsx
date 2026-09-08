import { describe, it, expect } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import { ProjectDetailNav } from './project-detail-nav';

describe('ProjectDetailNav', () => {
  it('should render all detail routes', () => {
    render(
      <MemoryRouter>
        <ProjectDetailNav projectId="project-1" />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: 'Overview' }).getAttribute('href')).toBe('/app/projects/project-1');
    // 工单 tab 路由 2026-09-06 Task→Issue 命名收尾后为 /issues（旧 /tasks 由路由重定向兜底）
    expect(screen.getByRole('link', { name: 'Tasks' }).getAttribute('href')).toBe('/app/projects/project-1/issues');
    expect(screen.getByRole('link', { name: 'Milestones' }).getAttribute('href')).toBe('/app/projects/project-1/milestones');
    expect(screen.getByRole('link', { name: 'Team & Roles' }).getAttribute('href')).toBe('/app/projects/project-1/team');
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/app/projects/project-1/settings');
  });
});
