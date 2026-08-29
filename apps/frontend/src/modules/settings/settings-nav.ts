import type { LucideIcon } from 'lucide-react';
import {
  Palette,
  UserRound,
  GitBranch,
  Terminal,
  Tags,
  FolderOpen,
  Hash,
  Brain,
  Bot,
  Play,
  Plug,
  Github,
} from 'lucide-react';

export interface SettingsNavItem {
  /** 子路由完整路径，与 router.tsx 中 /app/settings 的 children 保持一致 */
  to: string;
  labelKey: string;
  icon: LucideIcon;
  /** 菜单项右侧展示工具可用性状态点 */
  status?: 'git' | 'terminal';
}

export interface SettingsNavGroup {
  labelKey: string;
  items: SettingsNavItem[];
}

/** 设置页分组式侧边栏配置 */
export const SETTINGS_NAV_GROUPS: SettingsNavGroup[] = [
  {
    labelKey: 'settings.groupAccount',
    items: [{ to: '/app/settings/profile', labelKey: 'settings.profile', icon: UserRound }],
  },
  {
    labelKey: 'settings.groupGeneral',
    items: [{ to: '/app/settings/appearance', labelKey: 'settings.appearance', icon: Palette }],
  },
  {
    labelKey: 'settings.groupWorkspace',
    items: [
      { to: '/app/settings/labels', labelKey: 'settings.labels', icon: Tags },
      { to: '/app/settings/statuses', labelKey: 'settings.statuses', icon: Tags },
      { to: '/app/settings/roles', labelKey: 'settings.roles', icon: Tags },
      { to: '/app/settings/templates', labelKey: 'settings.templates', icon: Tags },
      { to: '/app/settings/short-id', labelKey: 'settings.shortId', icon: Hash },
    ],
  },
  {
    labelKey: 'settings.groupTools',
    items: [
      { to: '/app/settings/git', labelKey: 'settings.git', icon: GitBranch, status: 'git' },
      { to: '/app/settings/terminal', labelKey: 'settings.terminal', icon: Terminal, status: 'terminal' },
    ],
  },
  {
    labelKey: 'settings.groupAi',
    items: [
      { to: '/app/settings/ai', labelKey: 'settings.aiManagement', icon: Brain },
      { to: '/app/settings/ai/agents', labelKey: 'settings.aiAgents', icon: Bot },
      { to: '/app/settings/ai/executions', labelKey: 'settings.aiExecutions', icon: Play },
    ],
  },
  {
    labelKey: 'settings.groupIntegrations',
    items: [
      { to: '/app/settings/integrations', labelKey: 'settings.integrations', icon: Plug },
      { to: '/app/settings/integrations/github', labelKey: 'settings.github', icon: Github },
    ],
  },
  {
    labelKey: 'settings.groupSystem',
    items: [{ to: '/app/settings/storage', labelKey: 'settings.storage', icon: FolderOpen }],
  },
];
