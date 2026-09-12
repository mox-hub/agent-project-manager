import {
  Bell,
  Bot,
  Brain,
  ClipboardCheck,
  GitBranch,
  HardDrive,
  Hash,
  HelpCircle,
  DoorOpen,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  Shapes,
  ListTree,
  Palette,
  Plug,
  Search,
  Settings,
  Star,
  Tag,
  TerminalSquare,
  UserCog,
  UserRound,
  BarChart3,
  Sparkles,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { getEntityIcon } from "@/shared/entity-icons/entity-icons";

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
 * 实体页面（projects/issues/bugs/…）的图标统一从 entity-icons 注册表取（规范 v0 第二批铺开）；
 * 非实体页面（dashboard/settings/help…）保留自有图标；storage 是存储设置页而非 workspace
 * 实体，保留 HardDrive。
 */
export const PAGE_REGISTRY: Record<string, PageRegistryEntry> = {
  "/app/ai-surface": { icon: Sparkles, labelKey: "nav.aiSurface", color: "#8B5CF6" },
  "/app/decisions": { icon: getEntityIcon("decision").icon, labelKey: "nav.decisions", color: "#F97316" },
  "/app/search": { icon: Search, labelKey: "nav.search", color: "#6366F1" },
  "/app/notifications": { icon: Bell, labelKey: "nav.notifications", color: "#F59E0B" },
  "/app/projects/dashboard": { icon: LayoutDashboard, labelKey: "nav.dashboard", color: "#10B981" },
  "/app/projects": { icon: getEntityIcon("project").icon, labelKey: "nav.projects", color: "#8B5CF6" },
  "/app/issues": { icon: getEntityIcon("issue").icon, labelKey: "nav.tasks", color: "#3B82F6" },
  "/app/bugs": { icon: getEntityIcon("bug").icon, labelKey: "task.bug.title", color: "#EF4444" },
  "/app/acceptance": { icon: getEntityIcon("acceptance").icon, labelKey: "nav.acceptance", color: "#10B981" },
  "/app/documents": { icon: getEntityIcon("document").icon, labelKey: "document.title", color: "#06B6D4" },
  "/app/analytics": { icon: BarChart3, labelKey: "nav.analytics", color: "#8B5CF6" },
  "/app/repositories": { icon: getEntityIcon("repository").icon, labelKey: "git.title", color: "#EF4444" },
  "/app/office": { icon: DoorOpen, labelKey: "nav.office", color: "#8B5CF6" },
  "/app/members": { icon: getEntityIcon("member").icon, labelKey: "nav.members", color: "#F59E0B" },
  "/app/teams": { icon: getEntityIcon("team").icon, labelKey: "nav.teams", color: "#10B981" },
  "/app/settings": { icon: Settings, labelKey: "nav.settings", color: "#94A3B8" },
  "/app/settings/profile": { icon: UserRound, labelKey: "settings.profile", color: "#3B82F6" },
  // 设置子路由（AI / 集成迁入设置页后的新路径，供收藏分区解析）
  "/app/settings/ai": { icon: Brain, labelKey: "settings.aiManagement", color: "#F59E0B" },
  "/app/settings/ai/agents": { icon: Bot, labelKey: "settings.aiAgents", color: "#6366F1" },
  "/app/settings/ai/executions": { icon: getEntityIcon("execution").icon, labelKey: "settings.aiExecutions", color: "#3B82F6" },
  "/app/settings/integrations": { icon: Plug, labelKey: "settings.integrations", color: "#06B6D4" },
  // 设置其余子页（均有 PageHeader 可收藏，此前未登记会退化为 Star 兜底）
  "/app/settings/appearance": { icon: Palette, labelKey: "settings.appearance", color: "#8B5CF6" },
  "/app/settings/git": { icon: GitBranch, labelKey: "settings.git", color: "#EF4444" },
  "/app/settings/terminal": { icon: TerminalSquare, labelKey: "settings.terminal", color: "#10B981" },
  "/app/settings/labels": { icon: Tag, labelKey: "settings.labels", color: "#06B6D4" },
  "/app/settings/statuses": { icon: ListChecks, labelKey: "settings.statuses", color: "#3B82F6" },
  "/app/settings/issue-types": { icon: Shapes, labelKey: "settings.issueTypes", color: "#0EA5E9" },
  "/app/settings/checklists": { icon: ClipboardCheck, labelKey: "settings.checklists", color: "#0EA5E9" },
  // 权限管理域非验收实体：ShieldCheck 三方重叠裁决改用 UserCog（规范 v0）
  "/app/settings/roles": { icon: UserCog, labelKey: "settings.roles", color: "#F59E0B" },
  "/app/settings/templates": { icon: LayoutTemplate, labelKey: "settings.templates", color: "#8B5CF6" },
  "/app/settings/short-id": { icon: Hash, labelKey: "settings.shortId", color: "#94A3B8" },
  "/app/settings/storage": { icon: HardDrive, labelKey: "settings.storage", color: "#6366F1" },
  "/app/help": { icon: HelpCircle, labelKey: "nav.help", color: "#06B6D4" },
  // admin 域导航同上：UserCog（非验收实体）
  "/app/admin": { icon: UserCog, labelKey: "nav.admin", color: "#EF4444" },
  "/app/design-system": { icon: Palette, label: "Design System", color: "#8B5CF6" },
  "/app/delivery": { icon: ListTree, labelKey: "nav.delivery", label: "交付视图", color: "#10B981" },
  "/app/releases": { icon: Rocket, labelKey: "nav.releases", label: "发版交付", color: "#22C55E" },
  "/app/releases/:id": { icon: Rocket, labelKey: "nav.releases", label: "发版详情", color: "#22C55E" },
};

/** 收藏页面未命中注册表时的兜底图标 */
export const FAVORITE_FALLBACK_ICON = Star;
