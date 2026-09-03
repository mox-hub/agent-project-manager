/**
 * ProjectSidebarContext - 项目页面右侧侧边栏共享状态
 * 暴露隐藏状态 + 宽度 + 拖拽回调
 */

import { createContext, useContext, type ReactNode } from 'react';

export interface ProjectSidebarContextValue {
  hidden: boolean;
  setHidden: (next: boolean) => void;
  toggle: () => void;
  width: number;
  setWidth: (next: number) => void;
  minWidth: number;
  maxWidth: number;
}

const ProjectSidebarContext = createContext<ProjectSidebarContextValue | null>(null);

export const PROJECT_SIDEBAR_DEFAULT_WIDTH = 320;
export const PROJECT_SIDEBAR_MIN_WIDTH = 200;
export const PROJECT_SIDEBAR_MAX_WIDTH = 480;

export function ProjectSidebarProvider({
  value,
  children,
}: {
  value: ProjectSidebarContextValue;
  children: ReactNode;
}) {
  return (
    <ProjectSidebarContext.Provider value={value}>
      {children}
    </ProjectSidebarContext.Provider>
  );
}

export function useProjectSidebar(): ProjectSidebarContextValue | null {
  return useContext(ProjectSidebarContext);
}