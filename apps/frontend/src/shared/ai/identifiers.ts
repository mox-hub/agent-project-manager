export const AI_ATTRIBUTE_KEYS = {
  page: "data-ai-page",
  component: "data-ai-component",
  action: "data-ai-action",
  role: "data-ai-role",
} as const;

export type AIRole =
  | "page"
  | "nav"
  | "filter"
  | "input"
  | "select"
  | "submit"
  | "danger"
  | "jump"
  | "panel"
  | "content";

export function buildAiId(parts: Array<string | undefined | null>): string {
  return parts
    .filter(Boolean)
    .map((part) => String(part).trim().toLowerCase().replace(/\s+/g, "-"))
    .join(".");
}

export const CORE_AI_PAGE_IDS = {
  projectList: "project.project-list.main",
  dashboardOverview: "project.dashboard-overview.main",
  projectDetail: "project.project-detail.main",
  projectDashboard: "project.project-dashboard.main",
  projectBoard: "project.project-board.main",
  projectMilestones: "project.project-milestones.main",
  projectTeam: "project.project-team.main",
  projectSettings: "project.project-settings.main",
  taskWorkspace: "task.task-workspace.main",
  aiSpace: "ai-hub.ai-space.main",
  integrationList: "integration.integration-list.main",
  repositoryList: "git.repository-list.main",
  notificationCenter: "notification.notification-center.main",
  terminal: "terminal.terminal.main",
  analytics: "analytics.overview.main",
  documents: "document.document-list.main",
  documentView: "document.document-view.main",
  documentEdit: "document.document-edit.main",
  settings: "settings.global-settings.main",
  metadataSettings: "settings.metadata-settings.main",
} as const;
