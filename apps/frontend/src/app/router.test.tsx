import { describe, expect, it } from 'vitest';
import type { RouteObject } from 'react-router-dom';
import { router } from './router';

function findRoute(routes: RouteObject[], matcher: (route: RouteObject) => boolean): RouteObject | undefined {
  for (const route of routes) {
    if (matcher(route)) return route;
    if (route.children) {
      const found = findRoute(route.children, matcher);
      if (found) return found;
    }
  }
  return undefined;
}

describe('app router', () => {
  it('contains new analytics/documents routes under /app', () => {
    const routes = (router as unknown as { routes: RouteObject[] }).routes;
    expect(findRoute(routes, (r) => r.path === 'analytics')).toBeDefined();
    expect(findRoute(routes, (r) => r.path === 'documents')).toBeDefined();
    expect(findRoute(routes, (r) => r.path === 'documents/:documentId')).toBeDefined();
    expect(findRoute(routes, (r) => r.path === 'documents/:documentId/edit')).toBeDefined();
  });

  it('keeps plugins compatibility redirects', () => {
    const routes = (router as unknown as { routes: RouteObject[] }).routes;
    expect(findRoute(routes, (r) => r.path === 'plugins')).toBeDefined();
    expect(findRoute(routes, (r) => r.path === 'plugin-center')).toBeDefined();
  });
});

