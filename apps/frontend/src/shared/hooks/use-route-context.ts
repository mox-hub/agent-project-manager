import { useLocation } from 'react-router-dom';

interface RouteContext {
  isFullWidthPage: boolean;
  pageName: string;
}

const FULL_WIDTH_ROUTES = ['/app/search', '/app/notifications', '/app/ai'];

export function useRouteContext(): RouteContext {
  const location = useLocation();
  
  const isFullWidthPage = FULL_WIDTH_ROUTES.some(
    route => location.pathname === route || location.pathname.startsWith(route + '/')
  );
  
  const pageName = location.pathname.split('/').pop() || '';
  
  return {
    isFullWidthPage,
    pageName,
  };
}
