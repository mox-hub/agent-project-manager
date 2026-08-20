import { api } from '@/infrastructure/api-client';
import type {
  Member,
  MemberCard,
  Team,
  TaskAssignee,
  TaskWatcher,
  DocumentAuthor,
  DocumentReviewer,
  DocumentTaskLinkAssignee,
  Mention,
} from '../types';

// ========== Teams ==========

export async function listTeams(params?: { status?: string; q?: string; limit?: number; offset?: number }) {
  const res = await api.get<{ teams: Team[]; total: number }>('/teams', params);
  return res;
}

export async function getTeam(id: string) {
  const res = await api.get<Team & { members: any[]; projects: any[]; invites: any[] }>(`/teams/${id}`);
  return res;
}

export async function createTeam(data: { name: string; slug: string; description?: string; avatarUrl?: string; color?: string }) {
  const res = await api.post<Team>('/teams', data);
  return res;
}

export async function updateTeam(id: string, data: Partial<Team>) {
  const res = await api.patch<Team>(`/teams/${id}`, data);
  return res;
}

export async function archiveTeam(id: string) {
  const res = await api.post<Team>(`/teams/${id}/archive`);
  return res;
}

export async function addTeamMember(teamId: string, data: { memberId: string; role?: string }) {
  const res = await api.post(`/teams/${teamId}/members`, data);
  return res;
}

export async function updateTeamMember(teamId: string, memberId: string, data: { role: string }) {
  const res = await api.patch(`/teams/${teamId}/members/${memberId}`, data);
  return res;
}

export async function removeTeamMember(teamId: string, memberId: string) {
  const res = await api.delete(`/teams/${teamId}/members/${memberId}`);
  return res;
}

export async function listTeamMembers(teamId: string) {
  const res = await api.get<unknown[]>(`/teams/${teamId}/members`);
  return res;
}

export async function bindTeamProject(teamId: string, data: { projectId: string; role?: string }) {
  const res = await api.post(`/teams/${teamId}/projects`, data);
  return res;
}

export async function unbindTeamProject(teamId: string, projectId: string) {
  const res = await api.delete(`/teams/${teamId}/projects/${projectId}`);
  return res;
}

export async function listTeamProjects(teamId: string) {
  const res = await api.get(`/teams/${teamId}/projects`);
  return res;
}

// ========== Members ==========

export async function listMembers(params?: {
  type?: string;
  q?: string;
  projectId?: string;
  teamId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const res = await api.get<{ data: Member[]; total: number }>('/members', params);
  // Backend envelope is already unwrapped; response body is `{ data: Member[], total }`.
  // Reshape to legacy `{ items, total }` for backwards-compatible callers.
  return { items: res?.data ?? [], total: res?.total ?? 0 };
}

export async function searchMembers(q: string, params?: { type?: string; projectId?: string; teamId?: string; limit?: number }) {
  const res = await api.get<Member[]>('/members/search', { q, ...params });
  return res;
}

export async function listProjectMembers(projectId: string, params?: { type?: string; q?: string }) {
  const res = await api.get<{ data: Member[]; total: number }>(`/members/project/${projectId}`, params);
  // Backend envelope is already unwrapped; response body is `{ data: Member[], total }`.
  return res?.data ?? [];
}

export async function getMember(id: string) {
  const res = await api.get<Member>(`/members/${id}`);
  return res;
}

export async function createMember(data: Partial<Member>) {
  const res = await api.post<Member>('/members', data);
  return res;
}

export async function updateMember(id: string, data: Partial<Member>) {
  const res = await api.patch<Member>(`/members/${id}`, data);
  return res;
}

export async function deactivateMember(id: string) {
  const res = await api.post<Member>(`/members/${id}/deactivate`);
  return res;
}

// ========== 成员工具授权 ==========

export type MemberToolGrantScope = 'cli_tool' | 'mcp_server' | 'skill';

export interface MemberToolGrant {
  id: string;
  memberId: string;
  scope: MemberToolGrantScope;
  refKey: string;
  granted: boolean;
  grantedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MemberToolGrantCatalogItem {
  refKey: string;
  label: string;
  enabled: boolean;
}

export interface MemberToolGrantsResponse {
  grants: MemberToolGrant[];
  catalog: Record<MemberToolGrantScope, MemberToolGrantCatalogItem[]>;
}

export async function getMemberToolGrants(memberId: string): Promise<MemberToolGrantsResponse> {
  const res = await api.get<MemberToolGrantsResponse>(`/members/${memberId}/tool-grants`);
  return res;
}

export async function setMemberToolGrants(
  memberId: string,
  items: Array<{ scope: MemberToolGrantScope; refKey: string; granted: boolean }>,
) {
  const res = await api.put<MemberToolGrant[]>(`/members/${memberId}/tool-grants`, { items });
  return res;
}

export async function getMemberCard(id: string, projectId?: string): Promise<MemberCard> {
  const res = await api.get<MemberCard>(`/members/${id}/card`, { projectId });
  return res;
}

export async function listMemberProjects(memberId: string) {
  const res = await api.get(`/members/${memberId}/projects`);
  return res;
}

export async function bindMemberProject(memberId: string, data: { projectId: string; role: string }) {
  const res = await api.post(`/members/${memberId}/projects`, data);
  return res;
}

export async function unbindMemberProject(memberId: string, projectId: string) {
  const res = await api.delete(`/members/${memberId}/projects/${projectId}`);
  return res;
}

// ========== Task Assignees ==========

export async function listTaskAssignees(taskId: string): Promise<TaskAssignee[]> {
  const res = await api.get<TaskAssignee[]>(`/task-assignees/task/${taskId}`);
  return res;
}

export async function addTaskAssignee(data: { taskId: string; memberId: string; role?: string }) {
  const res = await api.post<TaskAssignee>('/task-assignees', data);
  return res;
}

export async function bulkSetTaskAssignees(data: { taskId: string; assignees: Array<{ memberId: string; role?: string }> }) {
  const res = await api.post('/task-assignees/bulk', data);
  return res;
}

export async function removeTaskAssignee(taskId: string, memberId: string, role: string) {
  const res = await api.delete(`/task-assignees/task/${taskId}/member/${memberId}/role/${role}`);
  return res;
}

export async function listTaskWatchers(taskId: string): Promise<TaskWatcher[]> {
  const res = await api.get<TaskWatcher[]>(`/task-assignees/task/${taskId}/watchers`);
  return res;
}

export async function addTaskWatcher(data: { taskId: string; memberId: string }) {
  const res = await api.post('/task-assignees/watchers', data);
  return res;
}

export async function removeTaskWatcher(taskId: string, memberId: string) {
  const res = await api.delete(`/task-assignees/task/${taskId}/watchers/${memberId}`);
  return res;
}

export async function getMemberLoad(memberId: string, projectId?: string) {
  const res = await api.get(`/task-assignees/member/${memberId}/load`, { projectId });
  return res;
}

// ========== Document Authors / Reviewers / Link Assignees ==========

export async function listDocumentAuthors(documentId: string): Promise<DocumentAuthor[]> {
  const res = await api.get<DocumentAuthor[]>(`/document-bindings/document/${documentId}/authors`);
  return res;
}

export async function addDocumentAuthor(data: { documentId: string; memberId: string; role?: string }) {
  const res = await api.post('/document-bindings/authors', data);
  return res;
}

export async function removeDocumentAuthor(documentId: string, memberId: string, role: string) {
  const res = await api.delete(`/document-bindings/document/${documentId}/authors/${memberId}/role/${role}`);
  return res;
}

export async function listDocumentReviewers(documentId: string): Promise<DocumentReviewer[]> {
  const res = await api.get<DocumentReviewer[]>(`/document-bindings/document/${documentId}/reviewers`);
  return res;
}

export async function addDocumentReviewer(data: { documentId: string; memberId: string; comment?: string }) {
  const res = await api.post('/document-bindings/reviewers', data);
  return res;
}

export async function updateDocumentReviewer(id: string, data: { status: string; comment?: string }) {
  const res = await api.patch(`/document-bindings/reviewers/${id}`, data);
  return res;
}

export async function removeDocumentReviewer(id: string) {
  const res = await api.delete(`/document-bindings/reviewers/${id}`);
  return res;
}

export async function listDocTaskLinkAssignees(linkId: string): Promise<DocumentTaskLinkAssignee[]> {
  const res = await api.get<DocumentTaskLinkAssignee[]>(`/document-bindings/doc-task-link/${linkId}/assignees`);
  return res;
}

export async function addDocTaskLinkAssignee(data: { documentTaskLinkId: string; memberId: string; role?: string }) {
  const res = await api.post('/document-bindings/doc-task-link/assignees', data);
  return res;
}

export async function removeDocTaskLinkAssignee(id: string) {
  const res = await api.delete(`/document-bindings/doc-task-link/assignees/${id}`);
  return res;
}

// ========== Mentions ==========

export async function suggestMentions(q: string, limit = 8) {
  const res = await api.get<Array<{ id: string; type: string; handle: string; displayName: string; avatarUrl: string | null }>>(
    '/mentions/suggest',
    { q, limit },
  );
  return res;
}

export async function parseMentions(data: { text: string; sourceType: string; sourceId: string }) {
  const res = await api.post('/mentions/parse', data);
  return res;
}

export async function listMentionsByMember(memberId: string, limit = 20): Promise<Mention[]> {
  const res = await api.get<Mention[]>(`/mentions/member/${memberId}`, { limit });
  return res;
}

export async function listMentionsBySource(sourceType: string, sourceId: string): Promise<Mention[]> {
  const res = await api.get<Mention[]>(`/mentions/source/${sourceType}/${sourceId}`);
  return res;
}
