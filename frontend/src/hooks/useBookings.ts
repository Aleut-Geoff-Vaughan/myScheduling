import { useQuery } from '@tanstack/react-query';
import { bookingsService } from '../services/bookingsService';
import type { GetBookingsParams, GetSpacesParams } from '../services/bookingsService';
import type { Booking, Space, Office } from '../types/api';

export function useBookings(params?: GetBookingsParams) {
  return useQuery<Booking[], Error>({
    queryKey: ['bookings', params],
    queryFn: () => bookingsService.getAll(params),
  });
}

export function useBooking(id: string) {
  return useQuery<Booking, Error>({
    queryKey: ['bookings', id],
    queryFn: () => bookingsService.getById(id),
    enabled: !!id,
  });
}

export function useOffices(tenantId?: string) {
  return useQuery<Office[], Error>({
    queryKey: ['offices', tenantId],
    queryFn: () => bookingsService.getOffices(tenantId),
  });
}

export function useSpaces(params?: GetSpacesParams) {
  return useQuery<Space[], Error>({
    queryKey: ['spaces', params],
    queryFn: () => bookingsService.getSpaces(params),
  });
}
