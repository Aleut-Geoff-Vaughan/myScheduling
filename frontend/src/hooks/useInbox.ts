import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentRequestService, type AssignmentRequestQuery } from '../services/assignmentRequestService';

export const useInbox = (filters?: AssignmentRequestQuery) =>
  useQuery({
    queryKey: ['inbox', filters],
    queryFn: () => assignmentRequestService.list(filters),
    staleTime: 30_000,
  });

export const useApproveRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, allocationPct }: { id: string; allocationPct?: number }) =>
      assignmentRequestService.approve(id, allocationPct),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  });
};

export const useRejectRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => assignmentRequestService.reject(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  });
};
