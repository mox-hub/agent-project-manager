import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../api/team-member-api';
import type { Member, Team } from '../types';

// ========== Teams ==========

export function useTeams(params?: { status?: string; q?: string; limit?: number; offset?: number }) {
  return useQuery({
    queryKey: ['teams', params],
    queryFn: () => api.listTeams(params),
    staleTime: 60 * 1000,
  });
}

export function useTeamDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['team', id],
    queryFn: () => api.getTeam(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createTeam,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Team> }) => api.updateTeam(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team', vars.id] });
    },
  });
}

export function useArchiveTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.archiveTeam,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['teams'] }),
  });
}

export function useBindTeamProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, projectId }: { teamId: string; projectId: string; role?: string }) =>
      api.bindTeamProject(teamId, { projectId }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['team', vars.teamId] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team-project-stats', vars.teamId] });
    },
  });
}

export function useUnbindTeamProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ teamId, projectId }: { teamId: string; projectId: string }) =>
      api.unbindTeamProject(teamId, projectId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['project', vars.projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['team', vars.teamId] });
      qc.invalidateQueries({ queryKey: ['teams'] });
      qc.invalidateQueries({ queryKey: ['team-project-stats', vars.teamId] });
    },
  });
}

export function useTeamProjectStats(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-project-stats', teamId],
    queryFn: () => api.getTeamProjectStats(teamId!),
    enabled: !!teamId,
    staleTime: 30 * 1000,
  });
}

export function useTeamMembers(teamId: string | undefined) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: () => api.listTeamMembers(teamId!),
    enabled: !!teamId,
    staleTime: 30 * 1000,
  });
}

export function useAddTeamMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { memberId: string; role?: string }) => api.addTeamMember(teamId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', teamId] });
      qc.invalidateQueries({ queryKey: ['team-members', teamId] });
    },
  });
}

export function useRemoveTeamMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => api.removeTeamMember(teamId, memberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['team', teamId] });
      qc.invalidateQueries({ queryKey: ['team-members', teamId] });
    },
  });
}

export function useUpdateTeamMember(teamId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, data }: { memberId: string; data: { role: string } }) =>
      api.updateTeamMember(teamId, memberId, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team-members', teamId] }),
  });
}

// ========== Members ==========

export function useMembers(params?: {
  type?: string;
  q?: string;
  projectId?: string;
  teamId?: string;
  status?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: ['members', params],
    queryFn: () => api.listMembers(params),
    staleTime: 60 * 1000,
  });
}

export function useMemberSearch(q: string, params?: { type?: string; projectId?: string; teamId?: string; limit?: number }) {
  return useQuery({
    queryKey: ['member-search', q, params],
    queryFn: () => api.searchMembers(q, params),
    enabled: !!q && q.length >= 1,
    staleTime: 30 * 1000,
  });
}

export function useProjectMembers(projectId: string | undefined, params?: { type?: string; q?: string }) {
  return useQuery({
    queryKey: ['project-members', projectId, params],
    queryFn: () => api.listProjectMembers(projectId!, params),
    enabled: !!projectId,
    staleTime: 30 * 1000,
  });
}

export function useMemberDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['member', id],
    queryFn: () => api.getMember(id!),
    enabled: !!id,
    staleTime: 30 * 1000,
  });
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.createMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Member> }) => api.updateMember(id, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['member', vars.id] });
      qc.invalidateQueries({ queryKey: ['members'] });
      qc.invalidateQueries({ queryKey: ['member-card', vars.id] });
    },
  });
}

export function useDeactivateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deactivateMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useDeleteMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.deleteMember,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['members'] }),
  });
}

export function useMemberCard(id: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: ['member-card', id, projectId],
    queryFn: () => api.getMemberCard(id!, projectId),
    enabled: !!id,
    staleTime: 60 * 1000,
  });
}

export function useBindMemberProject(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { projectId: string; role: string }) => api.bindMemberProject(memberId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', memberId] });
      qc.invalidateQueries({ queryKey: ['member-card', memberId] });
    },
  });
}

export function useUnbindMemberProject(memberId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.unbindMemberProject(memberId, projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['member', memberId] });
      qc.invalidateQueries({ queryKey: ['member-card', memberId] });
    },
  });
}

// ========== Task Assignees ==========

export function useTaskAssignees(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-assignees', taskId],
    queryFn: () => api.listTaskAssignees(taskId!),
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

export function useAddTaskAssignee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addTaskAssignee,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task-assignees', vars.taskId] });
    },
  });
}

export function useBulkSetTaskAssignees() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.bulkSetTaskAssignees,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task-assignees', vars.taskId] });
    },
  });
}

export function useRemoveTaskAssignee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, memberId, role }: { taskId: string; memberId: string; role: string }) =>
      api.removeTaskAssignee(taskId, memberId, role),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task-assignees', vars.taskId] });
    },
  });
}

export function useTaskWatchers(taskId: string | undefined) {
  return useQuery({
    queryKey: ['task-watchers', taskId],
    queryFn: () => api.listTaskWatchers(taskId!),
    enabled: !!taskId,
    staleTime: 30 * 1000,
  });
}

export function useAddTaskWatcher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addTaskWatcher,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task-watchers', vars.taskId] });
    },
  });
}

export function useRemoveTaskWatcher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ taskId, memberId }: { taskId: string; memberId: string }) =>
      api.removeTaskWatcher(taskId, memberId),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['task-watchers', vars.taskId] });
    },
  });
}

export function useMemberLoad(memberId: string | undefined, projectId?: string) {
  return useQuery({
    queryKey: ['member-load', memberId, projectId],
    queryFn: () => api.getMemberLoad(memberId!, projectId),
    enabled: !!memberId,
    staleTime: 30 * 1000,
  });
}

// ========== Document Authors / Reviewers ==========

export function useDocumentAuthors(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-authors', documentId],
    queryFn: () => api.listDocumentAuthors(documentId!),
    enabled: !!documentId,
    staleTime: 30 * 1000,
  });
}

export function useAddDocumentAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addDocumentAuthor,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['document-authors', vars.documentId] });
    },
  });
}

export function useRemoveDocumentAuthor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ documentId, memberId, role }: { documentId: string; memberId: string; role: string }) =>
      api.removeDocumentAuthor(documentId, memberId, role),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['document-authors', vars.documentId] });
    },
  });
}

export function useDocumentReviewers(documentId: string | undefined) {
  return useQuery({
    queryKey: ['document-reviewers', documentId],
    queryFn: () => api.listDocumentReviewers(documentId!),
    enabled: !!documentId,
    staleTime: 30 * 1000,
  });
}

export function useAddDocumentReviewer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addDocumentReviewer,
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['document-reviewers', vars.documentId] });
    },
  });
}

export function useUpdateDocumentReviewer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { status: string; comment?: string } }) =>
      api.updateDocumentReviewer(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-reviewers'] }),
  });
}

export function useRemoveDocumentReviewer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.removeDocumentReviewer,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['document-reviewers'] }),
  });
}

export function useDocTaskLinkAssignees(linkId: string | undefined) {
  return useQuery({
    queryKey: ['doc-task-link-assignees', linkId],
    queryFn: () => api.listDocTaskLinkAssignees(linkId!),
    enabled: !!linkId,
    staleTime: 30 * 1000,
  });
}

export function useAddDocTaskLinkAssignee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.addDocTaskLinkAssignee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-task-link-assignees'] }),
  });
}

export function useRemoveDocTaskLinkAssignee() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: api.removeDocTaskLinkAssignee,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['doc-task-link-assignees'] }),
  });
}

// ========== Mentions ==========

export function useMentionSuggest(q: string, limit = 8) {
  return useQuery({
    queryKey: ['mention-suggest', q, limit],
    queryFn: () => api.suggestMentions(q, limit),
    enabled: !!q && q.length >= 1,
    staleTime: 30 * 1000,
  });
}

export function useParseMentions() {
  return useMutation({
    mutationFn: api.parseMentions,
  });
}
