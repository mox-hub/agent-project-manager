/**
 * 命令面板全局命令注册表
 *
 * 条目只声明 i18n key（labelKey）与分组标识（group），不存已翻译字符串——
 * 翻译时点在 shell-layout 渲染处：用 useTranslation 的 t() 把 key 映射成
 * 已翻译 label/group 后注入 CommandPaletteProvider（provider 的 label 契约
 * 保持为"已翻译字符串"，避免 provider 感知 i18n）。
 *
 * 图标双通道：页面命令给 entity（渲染时经 getEntityIcon 解析，单一图标真相源），
 * 非实体页面与动作命令直接给 icon（lucide 组件）。二者都不给则条目无图标。
 *
 * 运行时动作（主题切换 / 打开 AI 面板 / 登出）以 action id 声明，
 * 由 shell-layout 绑定实际回调；纯路由跳转直接给 to。
 */

import type { LucideIcon } from 'lucide-react';
import {
  Bell,
  Bot,
  Building2,
  ChartColumn,
  CircleHelp,
  CircleUserRound,
  LayoutDashboard,
  LogOut,
  MessagesSquare,
  Search,
  Settings,
  Sparkles,
  SunMoon,
  UserCog,
} from 'lucide-react';
import type { EntityKind } from '@/shared/entity-icons/entity-icons';

/** 命令面板分组标识（分组标题 key 见 COMMAND_GROUP_LABEL_KEYS） */
export type CommandGroupId =
  | 'navigation'
  | 'workflow'
  | 'collaboration'
  | 'system'
  | 'actions';

/** 需要运行时回调的命令动作 id（shell-layout 负责绑定实现） */
export type CommandActionId = 'toggleTheme' | 'openAiPanel' | 'logout';

export type CommandEntry = {
  id: string;
  /** label 的 i18n key，渲染时经 t() 翻译 */
  labelKey: string;
  /** 双向条目（主题切换）：当前为深色模式时改用该 key */
  darkModeLabelKey?: string;
  keywords?: string[];
  /** 仅展示不绑定；只保留真实存在的快捷键绑定（如 Alt A），假 chord 一律不写 */
  shortcut?: string;
  group: CommandGroupId;
  /** 路由跳转目标（与 action 二选一） */
  to?: string;
  action?: CommandActionId;
  /** 仅全局 admin 角色可见 */
  adminOnly?: boolean;
  /** 实体类命令：经 entity-icons 注册表解析图标（单一图标真相源） */
  entity?: EntityKind;
  /** 非实体页面/动作命令：直接给 lucide 图标 */
  icon?: LucideIcon;
};

/** 分组标识 → 分组标题 i18n key */
export const COMMAND_GROUP_LABEL_KEYS: Record<CommandGroupId, string> = {
  navigation: 'shell.navigation',
  workflow: 'shell.groupWorkflow',
  collaboration: 'shell.groupCollaboration',
  system: 'shell.system',
  actions: 'common.actions',
};

/**
 * 全局一级命令（声明顺序即面板展示顺序）。
 * 路由目标与 src/app/router.tsx 对齐；新增一级页面时在此登记。
 */
export const commandEntries: CommandEntry[] = [
  // —— 导航 ——
  { id: 'cmd-projects', labelKey: 'shell.openProjects', to: '/app/projects', group: 'navigation', entity: 'project', keywords: ['project', 'projects', '项目'] },
  { id: 'cmd-dashboard', labelKey: 'shell.openDashboard', to: '/app/projects/dashboard', group: 'navigation', icon: LayoutDashboard, keywords: ['dashboard', '仪表盘'] },
  { id: 'cmd-tasks', labelKey: 'shell.openTasks', to: '/app/issues', group: 'navigation', entity: 'issue', keywords: ['task', 'tasks', 'issue', 'issues', '任务', '工单'] },
  { id: 'cmd-bugs', labelKey: 'shell.openBugs', to: '/app/bugs', group: 'navigation', entity: 'bug', keywords: ['bug', 'bugs', '缺陷'] },
  { id: 'cmd-documents', labelKey: 'shell.openDocuments', to: '/app/documents', group: 'navigation', entity: 'document', keywords: ['docs', 'documents', '文档'] },
  { id: 'cmd-members', labelKey: 'shell.openMembers', to: '/app/members', group: 'navigation', entity: 'member', keywords: ['member', 'members', 'team', '成员'] },
  { id: 'cmd-teams', labelKey: 'shell.openTeams', to: '/app/teams', group: 'navigation', entity: 'team', keywords: ['team', 'teams', '团队'] },
  { id: 'cmd-analytics', labelKey: 'shell.openAnalytics', to: '/app/analytics', group: 'navigation', icon: ChartColumn, keywords: ['analytics', 'metrics', '分析', '统计'] },
  // —— 工作流与治理 ——
  { id: 'cmd-workflows', labelKey: 'shell.openWorkflows', to: '/app/workflows', group: 'workflow', entity: 'workflow', keywords: ['workflow', '工作流', '流'] },
  { id: 'cmd-acceptance', labelKey: 'shell.openAcceptance', to: '/app/acceptance', group: 'workflow', entity: 'acceptance', keywords: ['acceptance', '验收', '门禁'] },
  { id: 'cmd-decisions', labelKey: 'shell.openDecisions', to: '/app/decisions', group: 'workflow', entity: 'decision', keywords: ['decision', '决策', '收件箱', 'inbox'] },
  { id: 'cmd-executions', labelKey: 'shell.openExecutions', to: '/app/executions', group: 'workflow', entity: 'execution', keywords: ['execution', '执行', 'run', '运行'] },
  // —— 协作与工具 ——
  { id: 'cmd-office', labelKey: 'shell.openOffice', to: '/app/office', group: 'collaboration', icon: Building2, keywords: ['office', '办公', '办公室'] },
  { id: 'cmd-repositories', labelKey: 'shell.openRepositories', to: '/app/repositories', group: 'collaboration', entity: 'repository', keywords: ['repository', 'repo', 'git', '仓库', '代码'] },
  { id: 'cmd-notifications', labelKey: 'shell.openNotifications', to: '/app/notifications', group: 'collaboration', icon: Bell, keywords: ['notification', '通知', '消息', 'message'] },
  { id: 'cmd-search', labelKey: 'shell.openSearch', to: '/app/search', group: 'collaboration', icon: Search, keywords: ['search', '搜索', '查找'] },
  // —— 系统 ——
  { id: 'cmd-settings', labelKey: 'shell.openSettings', to: '/app/settings', group: 'system', icon: Settings, keywords: ['settings', '设置'] },
  { id: 'cmd-profile', labelKey: 'shell.openProfile', to: '/app/settings/profile', group: 'system', icon: CircleUserRound, keywords: ['profile', '个人资料', '账户', 'account'] },
  { id: 'cmd-ai', labelKey: 'shell.openAiSpace', to: '/app/settings/ai', group: 'system', icon: Sparkles, keywords: ['ai', 'assistant', '助手'] },
  { id: 'cmd-agents', labelKey: 'shell.openAgents', to: '/app/settings/ai/agents', group: 'system', icon: Bot, keywords: ['agent', 'agents', 'mcp', '智能体'] },
  { id: 'cmd-admin', labelKey: 'nav.admin', to: '/app/admin', group: 'system', adminOnly: true, icon: UserCog, keywords: ['admin', 'accounts', 'invites', '管理'] },
  { id: 'cmd-help', labelKey: 'shell.openHelp', to: '/app/help', group: 'system', icon: CircleHelp, keywords: ['help', 'docs', '帮助'] },
  // —— 操作 ——
  {
    id: 'cmd-theme',
    labelKey: 'shell.switchToDark',
    darkModeLabelKey: 'shell.switchToLight',
    group: 'actions',
    icon: SunMoon,
    keywords: ['theme', 'dark', 'light', '主题', '深色', '浅色'],
    action: 'toggleTheme',
  },
  {
    id: 'cmd-ask-ai',
    labelKey: 'assistant.palette.ask',
    group: 'actions',
    // Alt+A 为真实存在的全局快捷键（shell-layout 绑定主 AI 面板开合），仅展示
    shortcut: 'Alt A',
    icon: MessagesSquare,
    keywords: ['ai', 'assistant', 'ask', 'chat', '提问'],
    action: 'openAiPanel',
  },
  {
    id: 'cmd-logout',
    labelKey: 'shell.logout',
    group: 'actions',
    icon: LogOut,
    keywords: ['logout', 'sign out', '退出', '登出'],
    action: 'logout',
  },
];
