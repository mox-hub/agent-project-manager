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
    expect(screen.getByRole('link', { name: 'Board' }).getAttribute('href')).toBe('/app/projects/project-1/board');
    expect(screen.getByRole('link', { name: 'Milestones' }).getAttribute('href')).toBe('/app/projects/project-1/milestones');
    expect(screen.getByRole('link', { name: 'Team' }).getAttribute('href')).toBe('/app/projects/project-1/team');
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/app/projects/project-1/settings');
  });
});
