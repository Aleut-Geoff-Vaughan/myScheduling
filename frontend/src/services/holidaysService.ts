import { api } from '../lib/api-client';
import type {
  CompanyHoliday,
  HolidayType,
  SeedUSHolidaysRequest,
  SeedHolidaysResponse,
  ApplyHolidaysRequest,
  ApplyHolidaysResponse,
  HolidayCheckResponse,
} from '../types/api';

export const holidaysService = {
  getAll: async (params: {
    tenantId: string;
    year?: number;
    type?: HolidayType;
    isObserved?: boolean;
    isActive?: boolean;
  }): Promise<CompanyHoliday[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.year !== undefined) queryParams.append('year', params.year.toString());
    if (params.type !== undefined) queryParams.append('type', params.type.toString());
    if (params.isObserved !== undefined) queryParams.append('isObserved', params.isObserved.toString());
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());

    return api.get<CompanyHoliday[]>(`/holidays?${queryParams.toString()}`);
  },

  getById: async (id: string): Promise<CompanyHoliday> => {
    return api.get<CompanyHoliday>(`/holidays/${id}`);
  },

  create: async (holiday: Omit<CompanyHoliday, 'id' | 'createdAt' | 'updatedAt'>): Promise<CompanyHoliday> => {
    return api.post<CompanyHoliday>('/holidays', holiday);
  },

  update: async (id: string, holiday: CompanyHoliday): Promise<void> => {
    return api.put<void>(`/holidays/${id}`, holiday);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/holidays/${id}`);
  },

  checkByDate: async (date: string, tenantId: string): Promise<HolidayCheckResponse> => {
    return api.get<HolidayCheckResponse>(`/holidays/by-date/${date}?tenantId=${tenantId}`);
  },

  seedUSHolidays: async (request: SeedUSHolidaysRequest): Promise<SeedHolidaysResponse> => {
    return api.post<SeedHolidaysResponse>('/holidays/seed-us-holidays', request);
  },

  applyToSchedules: async (request: ApplyHolidaysRequest): Promise<ApplyHolidaysResponse> => {
    return api.post<ApplyHolidaysResponse>('/holidays/apply-to-schedules', request);
  },
};
