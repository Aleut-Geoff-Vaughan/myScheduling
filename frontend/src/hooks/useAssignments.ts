import { useQuery } from '@tanstack/react-query';
import { assignmentsService, GetAssignmentsParams } from '../services/assignmentsService';
import { Assignment } from '../types/api';

export function useAssignments(params?: GetAssignmentsParams) {
  return useQuery<Assignment[], Error>({
    queryKey: ['assignments', params],
    queryFn: () => assignmentsService.getAll(params),
  });
}

export function useAssignment(id: string) {
  return useQuery<Assignment, Error>({
    queryKey: ['assignments', id],
    queryFn: () => assignmentsService.getById(id),
    enabled: !!id,
  });
}
