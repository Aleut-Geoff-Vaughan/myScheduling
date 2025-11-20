import type { WorkLocationPreference } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

export const workLocationService = {
  getAll: async (params?: {
    personId?: string;
    startDate?: string;
    endDate?: string;
    locationType?: number;
  }): Promise<WorkLocationPreference[]> => {
    const queryParams = new URLSearchParams();
    if (params?.personId) queryParams.append('personId', params.personId);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.locationType !== undefined) queryParams.append('locationType', params.locationType.toString());

    const response = await fetch(
      `${API_BASE_URL}/api/worklocationpreferences?${queryParams}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch work location preferences');
    }

    return response.json();
  },

  getById: async (id: string): Promise<WorkLocationPreference> => {
    const response = await fetch(
      `${API_BASE_URL}/api/worklocationpreferences/${id}`,
      {
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch work location preference');
    }

    return response.json();
  },

  create: async (
    preference: Omit<WorkLocationPreference, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<WorkLocationPreference> => {
    const response = await fetch(
      `${API_BASE_URL}/api/worklocationpreferences`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preference),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create work location preference');
    }

    return response.json();
  },

  update: async (
    id: string,
    preference: WorkLocationPreference
  ): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/api/worklocationpreferences/${id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preference),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to update work location preference');
    }
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(
      `${API_BASE_URL}/api/worklocationpreferences/${id}`,
      {
        method: 'DELETE',
        credentials: 'include',
      }
    );

    if (!response.ok) {
      throw new Error('Failed to delete work location preference');
    }
  },

  createBulk: async (
    preferences: Omit<WorkLocationPreference, 'id' | 'createdAt' | 'updatedAt'>[]
  ): Promise<WorkLocationPreference[]> => {
    const response = await fetch(
      `${API_BASE_URL}/api/worklocationpreferences/bulk`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(preferences),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to create bulk work location preferences');
    }

    return response.json();
  },
};
