import { useQuery } from '@tanstack/react-query';
import { projectsService, GetProjectsParams } from '../services/projectsService';
import { Project } from '../types/api';

export function useProjects(params?: GetProjectsParams) {
  return useQuery<Project[], Error>({
    queryKey: ['projects', params],
    queryFn: () => projectsService.getAll(params),
  });
}

export function useProject(id: string) {
  return useQuery<Project, Error>({
    queryKey: ['projects', id],
    queryFn: () => projectsService.getById(id),
    enabled: !!id,
  });
}
