/**
 * Task 模块 Mock 数据
 * 用于开发和测试
 * 参考: refers/APM/src/app/data/mock-data.ts
 */

// Types
export type HealthStatus = 'on_track' | 'at_risk' | 'off_track';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'in_progress' | 'in_review' | 'done' | 'canceled';
export type ProjectType = 'personal' | 'team' | 'experiment' | 'enterprise';

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: string;
  color: string;
}

export interface Label {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: Priority;
  assignee?: TeamMember;
  labels: Label[];
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
}

// Team Members
export const TEAM_MEMBERS: TeamMember[] = [
  { id: 'u1', name: 'Alex Chen', email: 'alex@example.com', initials: 'AC', role: 'Tech Lead', color: '#7C3AED' },
  { id: 'u2', name: 'Sarah Kim', email: 'sarah@example.com', initials: 'SK', role: 'Frontend Dev', color: '#2563EB' },
  { id: 'u3', name: 'Mike Johnson', email: 'mike@example.com', initials: 'MJ', role: 'Backend Dev', color: '#059669' },
  { id: 'u4', name: 'Emily Zhang', email: 'emily@example.com', initials: 'EZ', role: 'QA Engineer', color: '#D97706' },
];

// Labels
export const LABELS: Label[] = [
  { id: 'l1', name: 'Bug', color: '#EF4444' },
  { id: 'l2', name: 'Feature', color: '#3B82F6' },
  { id: 'l3', name: 'Enhancement', color: '#8B5CF6' },
  { id: 'l4', name: 'Frontend', color: '#06B6D4' },
  { id: 'l5', name: 'Backend', color: '#10B981' },
  { id: 'l6', name: 'AI', color: '#F59E0B' },
];

// Projects
export const PROJECTS: Project[] = [
  { id: 'p1', name: 'AgentPM Platform', description: 'AI-powered project management' },
  { id: 'p2', name: 'AI Code Reviewer', description: 'Automated code review system' },
  { id: 'p3', name: 'Data Pipeline v2', description: 'Next-gen ETL pipeline' },
];

// Tasks for Project p1
export const TASKS_P1: Task[] = [
  {
    id: 'APM-1',
    projectId: 'p1',
    title: 'Design AI Hub conversation interface',
    description: 'Create the main AI Hub UI with chat interface',
    status: 'done',
    priority: 'high',
    assignee: TEAM_MEMBERS[1],
    labels: [LABELS[1], LABELS[3]],
    dueDate: '2024-03-10',
    createdAt: '2024-01-20',
    updatedAt: '2024-03-10',
  },
  {
    id: 'APM-2',
    projectId: 'p1',
    title: 'Implement task kanban board with drag-and-drop',
    description: 'Build interactive kanban board',
    status: 'in_review',
    priority: 'high',
    assignee: TEAM_MEMBERS[1],
    labels: [LABELS[1], LABELS[3]],
    dueDate: '2024-03-20',
    createdAt: '2024-01-22',
    updatedAt: '2024-03-19',
  },
  {
    id: 'APM-3',
    projectId: 'p1',
    title: 'Set up PostgreSQL schema migrations',
    description: 'Design and implement database schema',
    status: 'done',
    priority: 'high',
    assignee: TEAM_MEMBERS[2],
    labels: [LABELS[4]],
    dueDate: '2024-02-15',
    createdAt: '2024-01-23',
    updatedAt: '2024-02-15',
  },
  {
    id: 'APM-4',
    projectId: 'p1',
    title: 'Build project health score calculation engine',
    description: 'Algorithm to compute health score',
    status: 'in_progress',
    priority: 'medium',
    assignee: TEAM_MEMBERS[2],
    labels: [LABELS[4], LABELS[5]],
    dueDate: '2024-03-25',
    createdAt: '2024-02-01',
    updatedAt: '2024-03-18',
  },
  {
    id: 'APM-5',
    projectId: 'p1',
    title: 'Integrate GitHub API for PR and commit tracking',
    description: 'Connect to GitHub REST API',
    status: 'in_progress',
    priority: 'high',
    assignee: TEAM_MEMBERS[2],
    labels: [LABELS[4], LABELS[1]],
    dueDate: '2024-03-28',
    createdAt: '2024-02-05',
    updatedAt: '2024-03-17',
  },
  {
    id: 'APM-6',
    projectId: 'p1',
    title: 'Fix authentication token refresh race condition',
    description: 'Multiple concurrent requests cause token refresh to fail',
    status: 'todo',
    priority: 'urgent',
    assignee: TEAM_MEMBERS[0],
    labels: [LABELS[0]],
    dueDate: '2024-03-22',
    createdAt: '2024-03-15',
    updatedAt: '2024-03-19',
  },
  {
    id: 'APM-7',
    projectId: 'p1',
    title: 'Add AI-powered task description auto-completion',
    description: 'AI suggests description based on title',
    status: 'todo',
    priority: 'medium',
    assignee: TEAM_MEMBERS[0],
    labels: [LABELS[1], LABELS[5]],
    dueDate: '2024-04-05',
    createdAt: '2024-03-01',
    updatedAt: '2024-03-19',
  },
  {
    id: 'APM-8',
    projectId: 'p1',
    title: 'Write unit tests for TaskService',
    description: 'Achieve 80% coverage',
    status: 'todo',
    priority: 'medium',
    assignee: TEAM_MEMBERS[1],
    labels: [LABELS[4]],
    dueDate: '2024-04-01',
    createdAt: '2024-03-10',
    updatedAt: '2024-03-10',
  },
  {
    id: 'APM-9',
    projectId: 'p1',
    title: 'Implement real-time notification system',
    description: 'WebSocket-based notification delivery',
    status: 'in_progress',
    priority: 'medium',
    assignee: TEAM_MEMBERS[1],
    labels: [LABELS[1], LABELS[3]],
    dueDate: '2024-04-10',
    createdAt: '2024-02-20',
    updatedAt: '2024-03-18',
  },
  {
    id: 'APM-10',
    projectId: 'p1',
    title: 'Set up CI/CD pipeline with GitHub Actions',
    description: 'Automated testing and deployment',
    status: 'done',
    priority: 'high',
    assignee: TEAM_MEMBERS[3],
    labels: [LABELS[4]],
    dueDate: '2024-02-28',
    createdAt: '2024-01-25',
    updatedAt: '2024-02-28',
  },
];

// Tasks for Project p2
export const TASKS_P2: Task[] = [
  {
    id: 'ACR-1',
    projectId: 'p2',
    title: 'LLM integration layer with model routing',
    description: 'Build unified API for multiple LLM providers',
    status: 'done',
    priority: 'high',
    assignee: TEAM_MEMBERS[2],
    labels: [LABELS[5], LABELS[4]],
    dueDate: '2024-02-28',
    createdAt: '2024-02-05',
    updatedAt: '2024-02-28',
  },
  {
    id: 'ACR-2',
    projectId: 'p2',
    title: 'Build PR diff parser',
    description: 'Parse git diff output into structured data',
    status: 'done',
    priority: 'high',
    assignee: TEAM_MEMBERS[2],
    labels: [LABELS[4], LABELS[1]],
    dueDate: '2024-03-05',
    createdAt: '2024-02-10',
    updatedAt: '2024-03-05',
  },
  {
    id: 'ACR-3',
    projectId: 'p2',
    title: 'Implement review comment generation',
    description: 'AI generates inline code comments',
    status: 'in_progress',
    priority: 'high',
    assignee: TEAM_MEMBERS[2],
    labels: [LABELS[5], LABELS[1]],
    dueDate: '2024-03-25',
    createdAt: '2024-02-15',
    updatedAt: '2024-03-18',
  },
  {
    id: 'ACR-4',
    projectId: 'p2',
    title: 'GitHub webhook integration bug',
    description: 'Listen to PR events and trigger review',
    status: 'in_review',
    priority: 'medium',
    assignee: TEAM_MEMBERS[2],
    labels: [LABELS[4], LABELS[0]],
    dueDate: '2024-03-22',
    createdAt: '2024-02-20',
    updatedAt: '2024-03-17',
  },
  {
    id: 'ACR-5',
    projectId: 'p2',
    title: 'Review dashboard UI',
    description: 'Developer-facing UI for review history',
    status: 'todo',
    priority: 'medium',
    assignee: TEAM_MEMBERS[0],
    labels: [LABELS[3], LABELS[1]],
    dueDate: '2024-04-10',
    createdAt: '2024-03-01',
    updatedAt: '2024-03-01',
  },
];

// All tasks combined
export const MOCK_TASKS: Task[] = [...TASKS_P1, ...TASKS_P2];
