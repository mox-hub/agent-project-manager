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
    // 里程碑 tab 2026-09-13 随 CAP-A-16 升级「里程碑与发布」时间轴（i18n key 同步更名）
    expect(screen.getByRole('link', { name: 'Milestones & Releases' }).getAttribute('href')).toBe('/app/projects/project-1/milestones');
    expect(screen.getByRole('link', { name: 'Settings' }).getAttribute('href')).toBe('/app/projects/project-1/settings');
  });

  // CAP-P-01 五期 IA 降级（2026-09-22）：playbook/team 摘出主导航，降级为项目设置分页；
  // 路由 /playbook /team 保留兼容，生命周期主入口移至 intake 管道总览卡
  it('should not render playbook/team tabs after IA demotion', () => {
    render(
      <MemoryRouter>
        <ProjectDetailNav projectId="project-1" />
      </MemoryRouter>,
    );

    expect(screen.queryByRole('link', { name: 'Team & Roles' })).not.toBeInTheDocument();
    expect(screen.queryByText('project.detail.playbook')).not.toBeInTheDocument();
  });
});
