/**
 * 推荐任务类型库（CAP-A-04 类型管理面重设计，对齐用户 Linear 风格设计稿）。
 * 纯静态注册表：名称与描述走 i18n（settings.recommendedTypes.<key>.name/.desc），
 * 类别标签走 i18n（settings.typeCategory.<key>）；一键添加复用 issueTypeApi.create。
 */
export interface RecommendedIssueType {
  key: string;
  icon: string;
  color: string;
  /** 类别标签（settings.typeCategory.* 的键），展示于行尾 */
  categories: string[];
}

export const RECOMMENDED_ISSUE_TYPES: RecommendedIssueType[] = [
  { key: 'requirement', icon: 'FileText', color: '#0EA5E9', categories: ['engineering', 'pmo'] },
  { key: 'story', icon: 'UserRound', color: '#8B5CF6', categories: ['engineering', 'support'] },
  { key: 'request', icon: 'Inbox', color: '#10B981', categories: ['engineering', 'support'] },
  { key: 'asset', icon: 'Package', color: '#F59E0B', categories: ['design', 'finance'] },
  { key: 'campaign', icon: 'Megaphone', color: '#EF4444', categories: ['design', 'marketing'] },
  { key: 'content', icon: 'PenLine', color: '#EC4899', categories: ['design', 'marketing'] },
  { key: 'deal', icon: 'Briefcase', color: '#14B8A6', categories: ['finance', 'ops'] },
  { key: 'client', icon: 'BookUser', color: '#6366F1', categories: ['finance', 'professional'] },
  { key: 'plan', icon: 'CalendarRange', color: '#F97316', categories: ['hr', 'personal'] },
  { key: 'goal', icon: 'Target', color: '#22C55E', categories: ['other', 'personal'] },
];
