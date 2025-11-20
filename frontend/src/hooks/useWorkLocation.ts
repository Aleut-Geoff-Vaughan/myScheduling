import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workLocationService } from '../services/workLocationService';
import type { WorkLocationPreference } from '../types/api';

export function useWorkLocationPreferences(params?: {
  personId?: string;
  startDate?: string;
  endDate?: string;
  locationType?: number;
}) {
  return useQuery({
    queryKey: ['workLocationPreferences', params],
    queryFn: () => workLocationService.getAll(params),
    enabled: !!params,
  });
}

export function useWorkLocationPreference(id?: string) {
  return useQuery({
    queryKey: ['workLocationPreference', id],
    queryFn: () => workLocationService.getById(id!),
    enabled: !!id,
  });
}

export function useCreateWorkLocationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preference: Omit<WorkLocationPreference, 'id' | 'createdAt' | 'updatedAt'>) =>
      workLocationService.create(preference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workLocationPreferences'] });
    },
  });
}

export function useUpdateWorkLocationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, preference }: { id: string; preference: WorkLocationPreference }) =>
      workLocationService.update(id, preference),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workLocationPreferences'] });
      queryClient.invalidateQueries({ queryKey: ['workLocationPreference'] });
    },
  });
}

export function useDeleteWorkLocationPreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => workLocationService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workLocationPreferences'] });
    },
  });
}

export function useCreateBulkWorkLocationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: Omit<WorkLocationPreference, 'id' | 'createdAt' | 'updatedAt'>[]) =>
      workLocationService.createBulk(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workLocationPreferences'] });
    },
  });
}
