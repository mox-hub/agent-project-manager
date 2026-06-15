import { useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalApi, type ApprovalQuery } from '../api/document-api';
import { useToastMutation } from '@/shared/hooks';

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

  return useToastMutation<unknown, Error, { documentId: string; comment?: string }>({
    successMessage: '文档已提交审批',
    errorPrefix: '提交审批',
    mutationFn: ({ documentId, comment }) => approvalApi.submitForReview(documentId, comment),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['documents', 'detail', variables.documentId] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals'] });
    },
  });
}

export function useResolveApproval() {
  const queryClient = useQueryClient();

  return useToastMutation<
    unknown,
    Error,
    { approvalId: string; status: 'approved' | 'rejected'; comment?: string }
  >({
    successMessage: '审批结果已提交',
    errorPrefix: '处理审批',
    mutationFn: ({ approvalId, status, comment }) => approvalApi.resolve(approvalId, status, comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals-pending'] });
    },
  });
}

export function useCancelApproval() {
  const queryClient = useQueryClient();

  return useToastMutation<unknown, Error, string>({
    successMessage: '审批已取消',
    errorPrefix: '取消审批',
    mutationFn: (approvalId) => approvalApi.cancel(approvalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals'] });
      queryClient.invalidateQueries({ queryKey: ['document-approvals-pending'] });
    },
  });
}
