export interface TeamWorkloadMember {
  name: string;
  percentage: number;
  status: 'normal' | 'high' | 'low';
}

export interface PreviewTask {
  id: string;
  title: string;
  priority: 'high' | 'medium';
  assignee: string | null;
  pending?: boolean;
}

export interface KanbanPreviewColumn {
  id: 'todo' | 'in-progress' | 'review' | 'done';
  title: string;
  count: number;
  tasks: PreviewTask[];
}

export interface DashboardTab {
  id: 'dashboard' | 'board' | 'milestones' | 'team' | 'settings';
  label: string;
}

export const dashboardTabs: DashboardTab[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'board', label: 'Board' },
  { id: 'milestones', label: 'Milestones' },
  { id: 'team', label: 'Team' },
  { id: 'settings', label: 'Settings & Config' },
];

export const mockTeamWorkload: TeamWorkloadMember[] = [
  { name: 'Alex Chen', percentage: 85, status: 'normal' },
  { name: 'Sarah Miller', percentage: 42, status: 'normal' },
  { name: 'Marcus T.', percentage: 98, status: 'high' },
  { name: 'Dina V.', percentage: 12, status: 'low' },
];

export const mockKanbanColumns: KanbanPreviewColumn[] = [
  {
    id: 'todo',
    title: 'Todo',
    count: 4,
    tasks: [{ id: '1', title: 'Update IAM policy for S3 buckets', priority: 'high', assignee: null }],
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    count: 2,
    tasks: [{ id: '2', title: 'Refactor EC2 instance discovery script', priority: 'medium', assignee: 'avatar' }],
  },
  {
    id: 'review',
    title: 'Review',
    count: 1,
    tasks: [
      {
        id: '3',
        title: 'Finalize migration docs for Finance',
        priority: 'medium',
        assignee: 'avatar',
        pending: true,
      },
    ],
  },
  {
    id: 'done',
    title: 'Done',
    count: 12,
    tasks: [],
  },
];

export const burnDownHeights = [90, 80, 75, 60, 55, 40, 30, 20, 15];
