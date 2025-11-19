import { api } from '../lib/api-client';
import { Booking, BookingStatus, Space, Office, SpaceType } from '../types/api';

export interface GetBookingsParams {
  personId?: string;
  spaceId?: string;
  officeId?: string;
  startDate?: string;
  endDate?: string;
  status?: BookingStatus;
}

export interface GetSpacesParams {
  officeId?: string;
  type?: SpaceType;
}

export const bookingsService = {
  async getAll(params?: GetBookingsParams): Promise<Booking[]> {
    const searchParams = new URLSearchParams();

    if (params?.personId) searchParams.append('personId', params.personId);
    if (params?.spaceId) searchParams.append('spaceId', params.spaceId);
    if (params?.officeId) searchParams.append('officeId', params.officeId);
    if (params?.startDate) searchParams.append('startDate', params.startDate);
    if (params?.endDate) searchParams.append('endDate', params.endDate);
    if (params?.status !== undefined) searchParams.append('status', params.status.toString());

    const query = searchParams.toString();
    return api.get<Booking[]>(`/bookings${query ? `?${query}` : ''}`);
  },

  async getById(id: string): Promise<Booking> {
    return api.get<Booking>(`/bookings/${id}`);
  },

  async create(booking: Omit<Booking, 'id' | 'createdAt' | 'updatedAt'>): Promise<Booking> {
    return api.post<Booking>('/bookings', booking);
  },

  async update(id: string, booking: Booking): Promise<void> {
    return api.put<void>(`/bookings/${id}`, booking);
  },

  async delete(id: string): Promise<void> {
    return api.delete<void>(`/bookings/${id}`);
  },

  async checkIn(id: string, method: string): Promise<void> {
    return api.post<void>(`/bookings/${id}/checkin`, method);
  },

  async getOffices(tenantId?: string): Promise<Office[]> {
    const query = tenantId ? `?tenantId=${tenantId}` : '';
    return api.get<Office[]>(`/bookings/offices${query}`);
  },

  async getSpaces(params?: GetSpacesParams): Promise<Space[]> {
    const searchParams = new URLSearchParams();

    if (params?.officeId) searchParams.append('officeId', params.officeId);
    if (params?.type !== undefined) searchParams.append('type', params.type.toString());

    const query = searchParams.toString();
    return api.get<Space[]>(`/bookings/spaces${query ? `?${query}` : ''}`);
  },
};
