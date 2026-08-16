type SidebarRole = {
  id: string
  scopeType: string
  projectId?: string
  role: string
}

export type SidebarNavItem = {
  id: string
  label: string
  to: string
  icon: string
  section: "primary" | "workspace" | "system"
  visible?: (roles: SidebarRole[]) => boolean
}

// 预置：用于 future sidebar 组件映射，不改变当前 shell-layout 导航结构
// 注意：Terminal已废弃，功能并入Runtime模块
export const sidebarPreset: SidebarNavItem[] = [
  { id: "inbox", label: "Inbox", to: "/app", icon: "LayoutGrid", section: "primary" },
  { id: "dashboard", label: "Dashboard", to: "/app/projects/dashboard", icon: "LayoutDashboard", section: "primary" },
  { id: "projects", label: "Projects", to: "/app/projects", icon: "FolderKanban", section: "workspace" },
  { id: "documents", label: "Documents", to: "/app/documents", icon: "FileText", section: "workspace" },
  { id: "ai_space", label: "AI Space", to: "/app/ai", icon: "Bot", section: "workspace" },
  { id: "analytics", label: "Analytics", to: "/app/analytics", icon: "BarChart3", section: "workspace" },
  { id: "notifications", label: "Notifications", to: "/app/notifications", icon: "Bell", section: "workspace" },
  { id: "integrations", label: "Integrations", to: "/app/integrations", icon: "Plug", section: "workspace" },
  { id: "repositories", label: "Repositories", to: "/app/repositories", icon: "GitBranch", section: "workspace" },
  // Terminal已废弃 - 功能已并入Runtime模块的terminal capability
  { id: "settings", label: "Settings", to: "/app/settings", icon: "Settings", section: "system" },
]
