import { describe, it, expect } from 'vitest';
import { resolveRoutePreview } from '../route-preview-registry';

describe('resolveRoutePreview', () => {
  it('解析项目详情及其子页', () => {
    expect(resolveRoutePreview('/app/projects/abc123')).toEqual({ type: 'project', id: 'abc123' });
    expect(resolveRoutePreview('/app/projects/abc123/tasks')).toEqual({ type: 'project', id: 'abc123' });
    expect(resolveRoutePreview('/app/projects/abc123/settings')).toEqual({ type: 'project', id: 'abc123' });
  });

  it('全局仪表盘不视为项目详情', () => {
    expect(resolveRoutePreview('/app/projects/dashboard')).toEqual({ type: 'generic' });
    expect(resolveRoutePreview('/app/projects/dashboard/sub')).toEqual({ type: 'generic' });
  });

  it('解析任务 / Bug / 文档 / 仓库 / 成员 / 团队 / 验收详情', () => {
    expect(resolveRoutePreview('/app/tasks/t1')).toEqual({ type: 'task', id: 't1' });
    expect(resolveRoutePreview('/app/bugs/b1')).toEqual({ type: 'bug', id: 'b1' });
    expect(resolveRoutePreview('/app/documents/d1')).toEqual({ type: 'document', id: 'd1' });
    expect(resolveRoutePreview('/app/documents/d1/edit')).toEqual({ type: 'document', id: 'd1' });
    expect(resolveRoutePreview('/app/repositories/r1')).toEqual({ type: 'repository', id: 'r1' });
    expect(resolveRoutePreview('/app/repositories/r1/settings')).toEqual({ type: 'repository', id: 'r1' });
    expect(resolveRoutePreview('/app/members/m1')).toEqual({ type: 'member', id: 'm1' });
    expect(resolveRoutePreview('/app/teams/tm1')).toEqual({ type: 'team', id: 'tm1' });
    expect(resolveRoutePreview('/app/acceptance/a1')).toEqual({ type: 'acceptance', id: 'a1' });
  });

  it('新建页保留字回退通用卡片', () => {
    expect(resolveRoutePreview('/app/documents/new')).toEqual({ type: 'generic' });
    expect(resolveRoutePreview('/app/workspaces/new')).toEqual({ type: 'generic' });
  });

  it('静态列表页与未注册路由回退通用卡片', () => {
    expect(resolveRoutePreview('/app/projects')).toEqual({ type: 'generic' });
    expect(resolveRoutePreview('/app/tasks')).toEqual({ type: 'generic' });
    expect(resolveRoutePreview('/app')).toEqual({ type: 'generic' });
    expect(resolveRoutePreview('/app/settings/ai')).toEqual({ type: 'generic' });
    expect(resolveRoutePreview('/app/unknown-page')).toEqual({ type: 'generic' });
  });

  it('前缀后无 id 段回退通用卡片', () => {
    expect(resolveRoutePreview('/app/tasks/')).toEqual({ type: 'generic' });
  });
});
