import { api } from '../lib/api-client';
import { buildApiUrl } from '../config/api';
import type {
  Floor,
  Zone,
  SpaceAssignment,
  BookingRule,
  ImportResult,
  SpaceAssignmentType,
  SpaceAssignmentStatus,
  SpaceType,
} from '../types/api';

const BASE_URL = '/facilitiesadmin';

// Helper to get JWT token from localStorage
function getAuthToken(): string | null {
  try {
    const authState = localStorage.getItem('auth-storage');
    if (authState) {
      const parsed = JSON.parse(authState);
      const token = parsed.state?.token;
      const expiresAt = parsed.state?.tokenExpiresAt;

      if (token && expiresAt) {
        const expiryDate = new Date(expiresAt);
        if (expiryDate > new Date()) {
          return token;
        }
      }
    }
  } catch (error) {
    console.error('Failed to get auth token from storage:', error);
  }
  return null;
}

// ==================== FLOORS ====================

export interface CreateFloorRequest {
  officeId: string;
  name: string;
  level: number;
  squareFootage?: number;
  floorPlanUrl?: string;
  isActive?: boolean;
}

export interface UpdateFloorRequest {
  name: string;
  level: number;
  squareFootage?: number;
  floorPlanUrl?: string;
  isActive: boolean;
}

// ==================== ZONES ====================

export interface CreateZoneRequest {
  floorId: string;
  name: string;
  description?: string;
  color?: string;
  isActive?: boolean;
}

export interface UpdateZoneRequest {
  name: string;
  description?: string;
  color?: string;
  isActive: boolean;
}

// ==================== SPACE ASSIGNMENTS ====================

export interface CreateSpaceAssignmentRequest {
  spaceId: string;
  userId: string;
  startDate: string;
  endDate?: string;
  type: SpaceAssignmentType;
  notes?: string;
}

export interface UpdateSpaceAssignmentRequest {
  startDate: string;
  endDate?: string;
  type: SpaceAssignmentType;
  status: SpaceAssignmentStatus;
  notes?: string;
}

// ==================== BOOKING RULES ====================

export interface CreateBookingRuleRequest {
  name: string;
  description?: string;
  officeId?: string;
  spaceId?: string;
  spaceType?: SpaceType;
  minDurationMinutes?: number;
  maxDurationMinutes?: number;
  minAdvanceBookingMinutes?: number;
  maxAdvanceBookingDays?: number;
  earliestStartTime?: string;
  latestEndTime?: string;
  allowedDaysOfWeek?: string;
  allowRecurring: boolean;
  maxRecurringWeeks?: number;
  requiresApproval: boolean;
  autoApproveForRoles: boolean;
  autoApproveRoles?: string;
  maxBookingsPerUserPerDay?: number;
  maxBookingsPerUserPerWeek?: number;
  isActive: boolean;
  priority: number;
}

export type UpdateBookingRuleRequest = CreateBookingRuleRequest;

export const facilitiesAdminService = {
  // ==================== FLOORS ====================

  async getFloors(tenantId: string, officeId?: string): Promise<Floor[]> {
    const params = new URLSearchParams({ tenantId });
    if (officeId) params.append('officeId', officeId);
    return api.get<Floor[]>(`${BASE_URL}/floors?${params}`);
  },

  async getFloor(id: string, tenantId: string): Promise<Floor> {
    return api.get<Floor>(`${BASE_URL}/floors/${id}?tenantId=${tenantId}`);
  },

  async createFloor(tenantId: string, floor: CreateFloorRequest): Promise<Floor> {
    return api.post<Floor>(`${BASE_URL}/floors?tenantId=${tenantId}`, floor);
  },

  async updateFloor(id: string, tenantId: string, floor: UpdateFloorRequest): Promise<Floor> {
    return api.put<Floor>(`${BASE_URL}/floors/${id}?tenantId=${tenantId}`, floor);
  },

  async deleteFloor(id: string, tenantId: string): Promise<void> {
    return api.delete<void>(`${BASE_URL}/floors/${id}?tenantId=${tenantId}`);
  },

  // ==================== ZONES ====================

  async getZones(tenantId: string, floorId?: string, officeId?: string): Promise<Zone[]> {
    const params = new URLSearchParams({ tenantId });
    if (floorId) params.append('floorId', floorId);
    if (officeId) params.append('officeId', officeId);
    return api.get<Zone[]>(`${BASE_URL}/zones?${params}`);
  },

  async getZone(id: string, tenantId: string): Promise<Zone> {
    return api.get<Zone>(`${BASE_URL}/zones/${id}?tenantId=${tenantId}`);
  },

  async createZone(tenantId: string, zone: CreateZoneRequest): Promise<Zone> {
    return api.post<Zone>(`${BASE_URL}/zones?tenantId=${tenantId}`, zone);
  },

  async updateZone(id: string, tenantId: string, zone: UpdateZoneRequest): Promise<Zone> {
    return api.put<Zone>(`${BASE_URL}/zones/${id}?tenantId=${tenantId}`, zone);
  },

  async deleteZone(id: string, tenantId: string): Promise<void> {
    return api.delete<void>(`${BASE_URL}/zones/${id}?tenantId=${tenantId}`);
  },

  // ==================== SPACE ASSIGNMENTS ====================

  async getSpaceAssignments(tenantId: string, spaceId?: string, userId?: string): Promise<SpaceAssignment[]> {
    const params = new URLSearchParams({ tenantId });
    if (spaceId) params.append('spaceId', spaceId);
    if (userId) params.append('userId', userId);
    return api.get<SpaceAssignment[]>(`${BASE_URL}/assignments?${params}`);
  },

  async getSpaceAssignment(id: string, tenantId: string): Promise<SpaceAssignment> {
    return api.get<SpaceAssignment>(`${BASE_URL}/assignments/${id}?tenantId=${tenantId}`);
  },

  async createSpaceAssignment(tenantId: string, assignment: CreateSpaceAssignmentRequest): Promise<SpaceAssignment> {
    return api.post<SpaceAssignment>(`${BASE_URL}/assignments?tenantId=${tenantId}`, assignment);
  },

  async updateSpaceAssignment(id: string, tenantId: string, assignment: UpdateSpaceAssignmentRequest): Promise<SpaceAssignment> {
    return api.put<SpaceAssignment>(`${BASE_URL}/assignments/${id}?tenantId=${tenantId}`, assignment);
  },

  async deleteSpaceAssignment(id: string, tenantId: string): Promise<void> {
    return api.delete<void>(`${BASE_URL}/assignments/${id}?tenantId=${tenantId}`);
  },

  // ==================== BOOKING RULES ====================

  async getBookingRules(tenantId: string, officeId?: string): Promise<BookingRule[]> {
    const params = new URLSearchParams({ tenantId });
    if (officeId) params.append('officeId', officeId);
    return api.get<BookingRule[]>(`${BASE_URL}/booking-rules?${params}`);
  },

  async getBookingRule(id: string, tenantId: string): Promise<BookingRule> {
    return api.get<BookingRule>(`${BASE_URL}/booking-rules/${id}?tenantId=${tenantId}`);
  },

  async createBookingRule(tenantId: string, rule: CreateBookingRuleRequest): Promise<BookingRule> {
    return api.post<BookingRule>(`${BASE_URL}/booking-rules?tenantId=${tenantId}`, rule);
  },

  async updateBookingRule(id: string, tenantId: string, rule: UpdateBookingRuleRequest): Promise<BookingRule> {
    return api.put<BookingRule>(`${BASE_URL}/booking-rules/${id}?tenantId=${tenantId}`, rule);
  },

  async deleteBookingRule(id: string, tenantId: string): Promise<void> {
    return api.delete<void>(`${BASE_URL}/booking-rules/${id}?tenantId=${tenantId}`);
  },

  // ==================== EXCEL EXPORT ====================

  async exportToExcel(tenantId: string, entityType: 'offices' | 'spaces' | 'floors' | 'zones' | 'assignments' | 'booking-rules', officeId?: string): Promise<Blob> {
    const params = new URLSearchParams({ tenantId });
    if (officeId) params.append('officeId', officeId);

    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(buildApiUrl(`${BASE_URL}/export/${entityType}?${params}`), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    return response.blob();
  },

  // ==================== EXCEL IMPORT ====================

  async importFromExcel(tenantId: string, entityType: 'offices' | 'spaces' | 'floors' | 'zones' | 'assignments', file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(buildApiUrl(`${BASE_URL}/import/${entityType}?tenantId=${tenantId}`), {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Import failed: ${response.statusText}`);
    }

    return response.json();
  },

  // ==================== EXCEL TEMPLATES ====================

  async downloadTemplate(entityType: 'offices' | 'spaces' | 'floors' | 'zones' | 'assignments'): Promise<Blob> {
    const headers: Record<string, string> = {};
    const token = getAuthToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(buildApiUrl(`${BASE_URL}/templates/${entityType}`), {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Download template failed: ${response.statusText}`);
    }

    return response.blob();
  },
};
