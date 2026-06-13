import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { approvalApi, type ApprovalQuery } from '../api/document-api';

export function useApprovals(query?: ApprovalQuery) {
  return useQuery({
    queryKey: ['document-approvals', query],
    queryFn: () => approvalApi.getList(query).then((res) => res.data),
  });
}

export function usePendingApprovals(myDocuments?: boolean) {
  return useQuery({
    queryKey: ['document-approvals-pending', myDocuments],
    queryFn: () => approvalApi.getPending(myDocuments).then((res) => res.data),
  });
}

export function useApproval(approvalId: string) {
  return useQuery({
    queryKey: ['document-approvals', approvalId],
    enabled: Boolean(approvalId),
    queryFn: () => approvalApi.getById(approvalId).then((res) => res.data),
  });
}

export function useSubmitForReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ documentId, comment }: { documentId: string; comment?: string }) =>
      approvalApi.submitForReview(documentId, comment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', 'detail', variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals'] });
    },
  });
}

export function useResolveApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      approvalId,
      status,
      comment,
    }: {
      approvalId: string;
      status: 'approved' | 'rejected';
      comment?: string;
    }) => approvalApi.resolve(approvalId, status, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals-pending'] });
    },
  });
}

export function useCancelApproval() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (approvalId: string) => approvalApi.cancel(approvalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals-pending'] });
    },
  });
}
