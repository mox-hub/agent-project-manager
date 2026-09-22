import {
  BarChart3,
  BookMarked,
  ListTodo,
  Milestone,
  Settings,
  type LucideIcon,
} from 'lucide-react';

/**
 * 项目详情页签单一数据源——shell-layout 顶部分段控件与 project-detail-nav
 * 链接条共同消费，增删项目子页只改此处。
 *
 * CAP-P-01 五期 IA 降级（2026-09-22）：playbook/team 摘出主导航，降级为项目
 * 设置页分页（路由 /playbook /team 保留兼容，intake 管道总览卡为生命周期主入口）。
 */
export interface ProjectDetailTab {
  /** URL 段；空串表示项目详情基路径（overview） */
  segment: string;
  /** 页签名 i18n key */
  labelKey: string;
  icon: LucideIcon;
}

export const PROJECT_DETAIL_BASE_SEGMENT = 'overview';

export const PROJECT_DETAIL_TABS: ProjectDetailTab[] = [
  { segment: '', labelKey: 'project.detail.overview', icon: BarChart3 },
  // 工单页签：2026-09-06 Task→Issue 改名后 URL 段为 issues（语义仍是工单）
  { segment: 'issues', labelKey: 'project.detail.tasks', icon: ListTodo },
  { segment: 'milestones', labelKey: 'project.detail.milestones', icon: Milestone },
  { segment: 'profile', labelKey: 'project.detail.profile', icon: BookMarked },
  { segment: 'settings', labelKey: 'nav.settings', icon: Settings },
];
