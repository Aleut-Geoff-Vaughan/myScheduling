import { api } from '../lib/api-client';
import { Person, PersonStatus } from '../types/api';

export interface GetPeopleParams {
  tenantId?: string;
  status?: PersonStatus;
  search?: string;
}

export const peopleService = {
  async getAll(params?: GetPeopleParams): Promise<Person[]> {
    const searchParams = new URLSearchParams();

    if (params?.tenantId) searchParams.append('tenantId', params.tenantId);
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());
    if (params?.search) searchParams.append('search', params.search);

    const query = searchParams.toString();
    return api.get<Person[]>(`/people${query ? `?${query}` : ''}`);
  },

  async getById(id: string): Promise<Person> {
    return api.get<Person>(`/people/${id}`);
  },

  async create(person: Omit<Person, 'id' | 'createdAt' | 'updatedAt'>): Promise<Person> {
    return api.post<Person>('/people', person);
  },

  async update(id: string, person: Person): Promise<void> {
    return api.put<void>(`/people/${id}`, person);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/people/${id}`);
  },
};
