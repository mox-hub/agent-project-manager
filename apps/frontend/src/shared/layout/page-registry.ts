import {
  AlertCircle,
  Bell,
  Bot,
  Brain,
  CheckCircle,
  CheckSquare,
  FileText,
  FolderKanban,
  GitBranch,
  HelpCircle,
  LayoutDashboard,
  ListTree,
  Palette,
  Play,
  Plug,
  Search,
  Settings,
  Star,
  Users,
  UsersRound,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface PageRegistryEntry {
  icon: LucideIcon;
  /** i18n key，渲染时实时解析（切换语言后侧边栏收藏分区跟随更新） */
  labelKey?: string;
  /** 无 i18n key 的静态名称（如 DEV 页面） */
  label?: string;
  /** 收藏栏展示的强调色（hex），用于图标/背景色点缀 */
  color?: string;
}

/**
 * 静态页面注册表：路由 path → 展示信息。
 * 供侧边栏"收藏"分区解析已收藏页面；未命中（动态路由等）时回退到收藏时存储的 label + Star 图标。
 */
export const PAGE_REGISTRY: Record<string, PageRegistryEntry> = {
  "/app/search": { icon: Search, labelKey: "nav.search", color: "#6366F1" },
  "/app/notifications": { icon: Bell, labelKey: "nav.notifications", color: "#F59E0B" },
  "/app/projects/dashboard": { icon: LayoutDashboard, labelKey: "nav.dashboard", color: "#10B981" },
  "/app/projects": { icon: FolderKanban, labelKey: "nav.projects", color: "#8B5CF6" },
  "/app/tasks": { icon: CheckSquare, labelKey: "nav.tasks", color: "#3B82F6" },
  "/app/bugs": { icon: AlertCircle, labelKey: "task.bug.title", color: "#EF4444" },
  "/app/acceptance": { icon: CheckCircle, labelKey: "nav.acceptance", color: "#10B981" },
  "/app/documents": { icon: FileText, labelKey: "document.title", color: "#06B6D4" },
  "/app/analytics": { icon: BarChart3, labelKey: "nav.analytics", color: "#8B5CF6" },
  "/app/repositories": { icon: GitBranch, labelKey: "git.title", color: "#EF4444" },
  "/app/members": { icon: Users, labelKey: "nav.members", color: "#F59E0B" },
  "/app/teams": { icon: UsersRound, labelKey: "nav.teams", color: "#10B981" },
  "/app/settings": { icon: Settings, labelKey: "nav.settings", color: "#94A3B8" },
  // 设置子路由（AI / 集成迁入设置页后的新路径，供收藏分区解析）
  "/app/settings/ai": { icon: Brain, labelKey: "settings.aiManagement", color: "#F59E0B" },
  "/app/settings/ai/agents": { icon: Bot, labelKey: "settings.aiAgents", color: "#6366F1" },
  "/app/settings/ai/executions": { icon: Play, labelKey: "settings.aiExecutions", color: "#3B82F6" },
  "/app/settings/integrations": { icon: Plug, labelKey: "settings.integrations", color: "#06B6D4" },
  "/app/help": { icon: HelpCircle, labelKey: "nav.help", color: "#06B6D4" },
  "/app/design-system": { icon: Palette, label: "Design System", color: "#8B5CF6" },
  "/app/delivery": { icon: ListTree, label: "Delivery", color: "#F59E0B" },
};

/** 收藏页面未命中注册表时的兜底图标 */
export const FAVORITE_FALLBACK_ICON = Star;
