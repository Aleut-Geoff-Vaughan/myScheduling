import { useQuery } from '@tanstack/react-query';
import { peopleService, type PeopleQuery } from '../services/peopleService';

export const usePeople = (params: PeopleQuery) => {
  return useQuery({
    queryKey: ['people', params],
    queryFn: () => peopleService.getPeople(params),
    enabled: !!params.tenantId,
  });
};

export const usePerson = (id?: string) => {
  return useQuery({
    queryKey: ['people', id],
    queryFn: () => peopleService.getPerson(id!),
    enabled: !!id,
  });
};
