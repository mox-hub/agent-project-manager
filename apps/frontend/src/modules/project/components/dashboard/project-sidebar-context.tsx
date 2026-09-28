/**
 * ProjectSidebarContext - 项目页面右侧侧边栏共享状态
 * 暴露隐藏状态 + 固定宽度（F 类 F4.2/J8/J9 裁决：全站唯一档 360px，禁拖拽缩放）
 */

import { createContext, useContext, type ReactNode } from 'react';

export interface ProjectSidebarContextValue {
  hidden: boolean;
  setHidden: (next: boolean) => void;
  toggle: () => void;
  width: number;
}

const ProjectSidebarContext = createContext<ProjectSidebarContextValue | null>(null);

export const PROJECT_SIDEBAR_DEFAULT_WIDTH = 360;

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