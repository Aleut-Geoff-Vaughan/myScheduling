import { useQuery } from '@tanstack/react-query';
import { peopleService } from '../services/peopleService';
import type { GetPeopleParams } from '../services/peopleService';
import type { Person } from '../types/api';

export function usePeople(params?: GetPeopleParams) {
  return useQuery<Person[], Error>({
    queryKey: ['people', params],
    queryFn: () => peopleService.getAll(params),
  });
}

export function usePerson(id: string) {
  return useQuery<Person, Error>({
    queryKey: ['people', id],
    queryFn: () => peopleService.getById(id),
    enabled: !!id,
  });
}
