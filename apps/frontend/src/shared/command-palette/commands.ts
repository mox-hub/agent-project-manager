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
  Brain,
  Building2,
  ChartColumn,
  CircleHelp,
  CircleUserRound,
  ClipboardCheck,
  GitBranch,
  Hash,
  HardDrive,
  KeyRound,
  Keyboard,
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  ListTree,
  LogOut,
  MessagesSquare,
  Palette,
  Plug,
  Rocket,
  Search,
  Server,
  Settings,
  Shapes,
  Sparkles,
  SunMoon,
  Tag,
  TerminalSquare,
  UserCog,
} from 'lucide-react';
import type { EntityKind } from '@/shared/entity-icons/entity-icons';

/** 命令面板分组标识（分组标题 key 见 COMMAND_GROUP_LABEL_KEYS） */
export type CommandGroupId =
  | 'navigation'
  | 'workflow'
  | 'collaboration'
  | 'settings'
  | 'system'
  | 'actions';

/** 需要运行时回调的命令动作 id（shell-layout 负责绑定实现） */
export type CommandActionId = 'toggleTheme' | 'openAiPanel' | 'openGlobalSearch' | 'logout';

export type CommandEntry = {
  id: string;
  /** label 的 i18n key，渲染时经 t() 翻译 */
  labelKey: string;
  /** 双向条目（主题切换）：当前为深色模式时改用该 key */
  darkModeLabelKey?: string;
  keywords?: string[];
  /** 仅展示不绑定；只保留真实存在的快捷键绑定，假 chord 一律不写 */
  shortcut?: string;
  /** 关联全局快捷键注册表动作 id（CAP-A-17）：显示键随用户自定义实时解析，优先于 shortcut */
  hotkeyId?: string;
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
  settings: 'shell.groupSettings',
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
  { id: 'cmd-releases', labelKey: 'nav.releases', to: '/app/releases', group: 'workflow', icon: Rocket, keywords: ['release', '发版', '交付', 'changelog'] },
  { id: 'cmd-intake', labelKey: 'nav.intake', to: '/app/intake', group: 'workflow', entity: 'document', keywords: ['intake', '需求', '承接'] },
  { id: 'cmd-delivery', labelKey: 'nav.delivery', to: '/app/delivery', group: 'workflow', icon: ListTree, keywords: ['delivery', '交付视图'] },
  // —— 协作与工具 ——
  { id: 'cmd-office', labelKey: 'shell.openOffice', to: '/app/office', group: 'collaboration', icon: Building2, keywords: ['office', '办公', '办公室'] },
  { id: 'cmd-repositories', labelKey: 'shell.openRepositories', to: '/app/repositories', group: 'collaboration', entity: 'repository', keywords: ['repository', 'repo', 'git', '仓库', '代码'] },
  { id: 'cmd-notifications', labelKey: 'shell.openNotifications', to: '/app/notifications', group: 'collaboration', icon: Bell, keywords: ['notification', '通知', '消息', 'message'] },
  // 全局搜索（v0.7.4 悬浮化）：不再跳 /app/search 页面，命令即开搜索面板
  {
    id: 'cmd-search',
    labelKey: 'shell.openSearch',
    group: 'collaboration',
    icon: Search,
    keywords: ['search', '搜索', '查找', 'find'],
    action: 'openGlobalSearch',
    hotkeyId: 'global-search',
  },
  { id: 'cmd-ai-surface', labelKey: 'nav.aiSurface', to: '/app/ai-surface', group: 'collaboration', icon: Sparkles, keywords: ['ai', 'surface', '表面', '同事'] },
  // —— 设置（二级页全量登记，路由与 router.tsx 对齐）——
  { id: 'cmd-ai', labelKey: 'shell.openAiSpace', to: '/app/settings/ai', group: 'settings', icon: Sparkles, keywords: ['ai', 'assistant', 'agent', 'mcp', '助手', '智能体', '模型'] },
  { id: 'cmd-ai-executions', labelKey: 'settings.aiExecutions', to: '/app/settings/ai/executions', group: 'settings', entity: 'execution', keywords: ['ai', 'execution', '执行中心'] },
  { id: 'cmd-settings-integrations', labelKey: 'settings.integrations', to: '/app/settings/integrations', group: 'settings', icon: Plug, keywords: ['integration', 'github', 'linear', '集成'] },
  { id: 'cmd-settings-runtime', labelKey: 'settings.runtime', to: '/app/settings/runtime', group: 'settings', icon: Server, keywords: ['runtime', 'daemon', '运行时', '守护进程'] },
  { id: 'cmd-settings-memory', labelKey: 'settings.memory', to: '/app/settings/memory', group: 'settings', icon: Brain, keywords: ['memory', '记忆'] },
  { id: 'cmd-settings-tokens', labelKey: 'settings.tokens', to: '/app/settings/tokens', group: 'settings', icon: KeyRound, keywords: ['token', 'pat', '令牌', '访问令牌'] },
  { id: 'cmd-settings-shortcuts', labelKey: 'settings.shortcuts', to: '/app/settings/shortcuts', group: 'settings', icon: Keyboard, keywords: ['shortcut', 'hotkey', '快捷键', '键位'] },
  { id: 'cmd-settings-appearance', labelKey: 'settings.appearance', to: '/app/settings/appearance', group: 'settings', icon: Palette, keywords: ['appearance', 'theme', '外观', '主题'] },
  { id: 'cmd-settings-git', labelKey: 'settings.git', to: '/app/settings/git', group: 'settings', icon: GitBranch, keywords: ['git'] },
  { id: 'cmd-settings-terminal', labelKey: 'settings.terminal', to: '/app/settings/terminal', group: 'settings', icon: TerminalSquare, keywords: ['terminal', '终端'] },
  { id: 'cmd-settings-labels', labelKey: 'settings.labels', to: '/app/settings/labels', group: 'settings', icon: Tag, keywords: ['label', '标签'] },
  { id: 'cmd-settings-statuses', labelKey: 'settings.statuses', to: '/app/settings/statuses', group: 'settings', icon: ListChecks, keywords: ['status', '状态'] },
  { id: 'cmd-settings-issue-types', labelKey: 'settings.issueTypes', to: '/app/settings/issue-types', group: 'settings', icon: Shapes, keywords: ['type', '类型', '工单类型'] },
  { id: 'cmd-settings-checklists', labelKey: 'settings.checklists', to: '/app/settings/checklists', group: 'settings', icon: ClipboardCheck, keywords: ['checklist', '清单', '完备性'] },
  { id: 'cmd-settings-roles', labelKey: 'settings.roles', to: '/app/settings/roles', group: 'settings', icon: UserCog, keywords: ['role', 'permission', '角色', '权限'] },
  { id: 'cmd-settings-templates', labelKey: 'settings.templates', to: '/app/settings/templates', group: 'settings', icon: LayoutTemplate, keywords: ['template', '模板'] },
  { id: 'cmd-settings-short-id', labelKey: 'settings.shortId', to: '/app/settings/short-id', group: 'settings', icon: Hash, keywords: ['short id', '短id', '编号规则'] },
  { id: 'cmd-settings-storage', labelKey: 'settings.storage', to: '/app/settings/storage', group: 'settings', icon: HardDrive, keywords: ['storage', '存储', '工作区'] },
  // —— 系统 ——
  { id: 'cmd-settings', labelKey: 'shell.openSettings', to: '/app/settings', group: 'system', icon: Settings, keywords: ['settings', '设置'] },
  { id: 'cmd-profile', labelKey: 'shell.openProfile', to: '/app/settings/profile', group: 'system', icon: CircleUserRound, keywords: ['profile', '个人资料', '账户', 'account'] },
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
    // 显示键走快捷键注册表（缺省 Alt+A），随用户在设置 · 快捷键中的改键实时反映
    hotkeyId: 'ai-assistant',
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
