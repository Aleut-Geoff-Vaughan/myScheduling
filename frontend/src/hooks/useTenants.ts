import { useQuery } from '@tanstack/react-query';
import { tenantsService, usersService } from '../services/tenantsService';
import type { Tenant, User } from '../types/api';

export function useTenants() {
  return useQuery<Tenant[], Error>({
    queryKey: ['tenants'],
    queryFn: () => tenantsService.getAll(),
  });
}

export function useTenant(id: string) {
  return useQuery<Tenant, Error>({
    queryKey: ['tenants', id],
    queryFn: () => tenantsService.getById(id),
    enabled: !!id,
  });
}

export function useUsers(tenantId?: string) {
  return useQuery<User[], Error>({
    queryKey: ['users', tenantId],
    queryFn: () => usersService.getAll(tenantId),
  });
}

export function useUser(id: string) {
  return useQuery<User, Error>({
    queryKey: ['users', id],
    queryFn: () => usersService.getById(id),
    enabled: !!id,
  });
}
