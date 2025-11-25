import { api } from '../lib/api-client';
import type { Person } from '../types/api';
import type { UpdateUserProfileRequest } from '../types/user';

export interface PeopleQuery {
  tenantId?: string;
  status?: number;
  search?: string;
}

export const peopleService = {
  async getPeople(params: PeopleQuery = {}): Promise<Person[]> {
    const query = new URLSearchParams();
    if (params.tenantId) query.append('tenantId', params.tenantId);
    if (params.status !== undefined) query.append('status', params.status.toString());
    if (params.search) query.append('search', params.search);

    const qs = query.toString();
    const path = qs ? `/people?${qs}` : '/people';
    return api.get<Person[]>(path);
  },

  async getPerson(id: string): Promise<Person> {
    return api.get<Person>(`/people/${id}`);
  },

  async updateUserProfile(id: string, payload: UpdateUserProfileRequest): Promise<Person> {
    return api.patch<Person>(`/users/${id}/profile`, payload);
  },
};
