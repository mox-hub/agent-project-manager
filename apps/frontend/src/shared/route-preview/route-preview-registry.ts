/**
 * route-preview-registry.ts - 路由预览卡片注册表
 *
 * 将路由 path 解析为「预览类型 + 实体 id」，供 RoutePreviewCard 分发到对应富卡片。
 * 与 tabs-registry 平行维护：标签页注册表只关心标题/图标，这里额外要提取路径参数。
 *
 * 未命中的静态路由（列表页、设置页等）返回 generic 类型，由通用卡片兜底展示。
 */

export type RoutePreviewType =
  | 'project'
  | 'task'
  | 'bug'
  | 'document'
  | 'repository'
  | 'member'
  | 'team'
  | 'acceptance'
  | 'generic';

export interface RoutePreviewMatch {
  type: RoutePreviewType;
  /** 详情实体 id；generic / 静态页面无 */
  id?: string;
}

/** 动态详情路由：前缀 + 段内第一个路径段作为实体 id */
const DYNAMIC_RULES: Array<{ prefix: string; type: RoutePreviewType }> = [
  { prefix: '/app/projects/', type: 'project' },
  { prefix: '/app/tasks/', type: 'task' },
  { prefix: '/app/bugs/', type: 'bug' },
  { prefix: '/app/documents/', type: 'document' },
  { prefix: '/app/repositories/', type: 'repository' },
  { prefix: '/app/members/', type: 'member' },
  { prefix: '/app/teams/', type: 'team' },
  { prefix: '/app/acceptance/', type: 'acceptance' },
];

/** 保留字路径段：命中时不作为实体 id 解析，回退通用卡片 */
const RESERVED_SEGMENTS = new Set(['dashboard', 'new']);

export function resolveRoutePreview(path: string): RoutePreviewMatch {
  for (const { prefix, type } of DYNAMIC_RULES) {
    if (!path.startsWith(prefix)) continue;
    const id = path.slice(prefix.length).split('/')[0] ?? '';
    if (!id || RESERVED_SEGMENTS.has(id)) {
      return { type: 'generic' };
    }
    return { type, id };
  }
  return { type: 'generic' };
}
