import { api } from '../lib/api-client';

// Forecast Version Types
export interface ForecastVersion {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  type: ForecastVersionType;
  typeName: string;
  projectId?: string;
  projectName?: string;
  userId?: string;
  userName?: string;
  isCurrent: boolean;
  versionNumber: number;
  basedOnVersionId?: string;
  basedOnVersionName?: string;
  startYear: number;
  startMonth: number;
  endYear: number;
  endMonth: number;
  promotedAt?: string;
  archivedAt?: string;
  archiveReason?: string;
  createdAt: string;
  updatedAt?: string;
}

export enum ForecastVersionType {
  Current = 0,
  WhatIf = 1,
  Historical = 2,
  Import = 3,
}

export interface CreateForecastVersionDto {
  tenantId: string;
  name: string;
  description?: string;
  type?: ForecastVersionType;
  projectId?: string;
  userId?: string;
  basedOnVersionId?: string;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
}

export interface UpdateForecastVersionDto {
  name?: string;
  description?: string;
  startYear?: number;
  startMonth?: number;
  endYear?: number;
  endMonth?: number;
}

export interface CloneVersionDto {
  name?: string;
  description?: string;
  type?: ForecastVersionType;
  copyForecasts?: boolean;
}

// Forecast Types
export interface Forecast {
  id: string;
  tenantId: string;
  projectRoleAssignmentId: string;
  forecastVersionId: string;
  forecastVersionName?: string;
  year: number;
  month: number;
  week?: number;
  periodDisplay: string;
  forecastedHours: number;
  recommendedHours?: number;
  status: ForecastStatus;
  statusName: string;
  submittedAt?: string;
  approvedAt?: string;
  approvalNotes?: string;
  isOverride: boolean;
  overriddenAt?: string;
  overrideReason?: string;
  originalForecastedHours?: number;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
  // Assignment info
  projectId?: string;
  projectName?: string;
  wbsElementId?: string;
  wbsElementCode?: string;
  positionTitle?: string;
  assigneeName?: string;
  isTbd: boolean;
  laborCategoryCode?: string;
  history?: ForecastHistoryItem[];
}

export enum ForecastStatus {
  Draft = 0,
  Submitted = 1,
  Approved = 2,
  Rejected = 3,
  Locked = 4,
}

export interface ForecastHistoryItem {
  id: string;
  changedByUserName: string;
  changedAt: string;
  changeType: ForecastChangeType;
  changeTypeName: string;
  oldHours?: number;
  newHours?: number;
  oldStatus?: ForecastStatus;
  oldStatusName?: string;
  newStatus?: ForecastStatus;
  newStatusName?: string;
  changeReason?: string;
}

export enum ForecastChangeType {
  Created = 0,
  HoursUpdated = 1,
  StatusChanged = 2,
  Override = 3,
  Submitted = 4,
  Approved = 5,
  Rejected = 6,
  Locked = 7,
  VersionCreated = 8,
  VersionPromoted = 9,
  VersionDeleted = 10,
}

export interface ForecastSummary {
  totalForecasts: number;
  totalHours: number;
  draftCount: number;
  submittedCount: number;
  approvedCount: number;
  rejectedCount: number;
  lockedCount: number;
  draftHours: number;
  submittedHours: number;
  approvedHours: number;
  overrideCount: number;
}

export interface CreateForecastDto {
  tenantId: string;
  projectRoleAssignmentId: string;
  forecastVersionId?: string;
  year: number;
  month: number;
  week?: number;
  forecastedHours: number;
  notes?: string;
}

export interface BulkCreateForecastDto {
  tenantId: string;
  forecastVersionId?: string;
  updateExisting?: boolean;
  forecasts: BulkForecastItem[];
}

export interface BulkForecastItem {
  projectRoleAssignmentId: string;
  year: number;
  month: number;
  week?: number;
  forecastedHours: number;
  notes?: string;
}

export interface BulkForecastResponse {
  totalRequested: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
}

export interface UpdateForecastDto {
  forecastedHours?: number;
  notes?: string;
}

export interface OverrideForecastDto {
  newHours: number;
  reason: string;
}

export interface BulkApprovalDto {
  tenantId: string;
  forecastIds: string[];
  notes?: string;
}

export interface BulkApprovalResponse {
  totalRequested: number;
  approvedCount: number;
  skippedCount: number;
  failedCount: number;
}

export interface LockMonthDto {
  tenantId: string;
  projectId?: string;
  forecastVersionId?: string;
  year: number;
  month: number;
  reason?: string;
}

export interface LockMonthResponse {
  year: number;
  month: number;
  totalForecasts: number;
  lockedCount: number;
}

// Services
export const forecastVersionsService = {
  getAll: async (params: {
    tenantId: string;
    projectId?: string;
    type?: ForecastVersionType;
    includeArchived?: boolean;
  }): Promise<ForecastVersion[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.type !== undefined) queryParams.append('type', params.type.toString());
    if (params.includeArchived) queryParams.append('includeArchived', 'true');
    return api.get<ForecastVersion[]>(`/forecastversions?${queryParams.toString()}`);
  },

  getById: async (id: string): Promise<ForecastVersion> => {
    return api.get<ForecastVersion>(`/forecastversions/${id}`);
  },

  getCurrent: async (tenantId: string, projectId?: string): Promise<ForecastVersion> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', tenantId);
    if (projectId) queryParams.append('projectId', projectId);
    return api.get<ForecastVersion>(`/forecastversions/current?${queryParams.toString()}`);
  },

  create: async (dto: CreateForecastVersionDto): Promise<ForecastVersion> => {
    return api.post<ForecastVersion>('/forecastversions', dto);
  },

  update: async (id: string, dto: UpdateForecastVersionDto): Promise<ForecastVersion> => {
    return api.put<ForecastVersion>(`/forecastversions/${id}`, dto);
  },

  clone: async (id: string, dto: CloneVersionDto): Promise<ForecastVersion> => {
    return api.post<ForecastVersion>(`/forecastversions/${id}/clone`, dto);
  },

  promote: async (id: string): Promise<ForecastVersion> => {
    return api.post<ForecastVersion>(`/forecastversions/${id}/promote`, {});
  },

  archive: async (id: string, reason?: string): Promise<ForecastVersion> => {
    return api.post<ForecastVersion>(`/forecastversions/${id}/archive`, { reason });
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/forecastversions/${id}`);
  },
};

export const forecastsService = {
  getAll: async (params: {
    tenantId: string;
    versionId?: string;
    projectId?: string;
    wbsElementId?: string;
    projectRoleAssignmentId?: string;
    year?: number;
    month?: number;
    status?: ForecastStatus;
    includeHistory?: boolean;
  }): Promise<Forecast[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.versionId) queryParams.append('versionId', params.versionId);
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.wbsElementId) queryParams.append('wbsElementId', params.wbsElementId);
    if (params.projectRoleAssignmentId) queryParams.append('projectRoleAssignmentId', params.projectRoleAssignmentId);
    if (params.year !== undefined) queryParams.append('year', params.year.toString());
    if (params.month !== undefined) queryParams.append('month', params.month.toString());
    if (params.status !== undefined) queryParams.append('status', params.status.toString());
    if (params.includeHistory) queryParams.append('includeHistory', 'true');
    return api.get<Forecast[]>(`/forecasts?${queryParams.toString()}`);
  },

  getById: async (id: string, includeHistory?: boolean): Promise<Forecast> => {
    const queryParams = new URLSearchParams();
    if (includeHistory) queryParams.append('includeHistory', 'true');
    const query = queryParams.toString();
    return api.get<Forecast>(`/forecasts/${id}${query ? `?${query}` : ''}`);
  },

  getMyForecasts: async (params: {
    tenantId: string;
    versionId?: string;
    year?: number;
    month?: number;
  }): Promise<Forecast[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.versionId) queryParams.append('versionId', params.versionId);
    if (params.year !== undefined) queryParams.append('year', params.year.toString());
    if (params.month !== undefined) queryParams.append('month', params.month.toString());
    return api.get<Forecast[]>(`/forecasts/my-forecasts?${queryParams.toString()}`);
  },

  getByProject: async (projectId: string, params?: {
    versionId?: string;
    year?: number;
    month?: number;
  }): Promise<Forecast[]> => {
    const queryParams = new URLSearchParams();
    if (params?.versionId) queryParams.append('versionId', params.versionId);
    if (params?.year !== undefined) queryParams.append('year', params.year.toString());
    if (params?.month !== undefined) queryParams.append('month', params.month.toString());
    const query = queryParams.toString();
    return api.get<Forecast[]>(`/forecasts/by-project/${projectId}${query ? `?${query}` : ''}`);
  },

  getSummary: async (params: {
    tenantId: string;
    versionId?: string;
    projectId?: string;
    year?: number;
    month?: number;
  }): Promise<ForecastSummary> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.versionId) queryParams.append('versionId', params.versionId);
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.year !== undefined) queryParams.append('year', params.year.toString());
    if (params.month !== undefined) queryParams.append('month', params.month.toString());
    return api.get<ForecastSummary>(`/forecasts/summary?${queryParams.toString()}`);
  },

  create: async (dto: CreateForecastDto): Promise<Forecast> => {
    return api.post<Forecast>('/forecasts', dto);
  },

  createBulk: async (dto: BulkCreateForecastDto): Promise<BulkForecastResponse> => {
    return api.post<BulkForecastResponse>('/forecasts/bulk', dto);
  },

  update: async (id: string, dto: UpdateForecastDto): Promise<Forecast> => {
    return api.put<Forecast>(`/forecasts/${id}`, dto);
  },

  submit: async (id: string, notes?: string): Promise<Forecast> => {
    return api.post<Forecast>(`/forecasts/${id}/submit`, { notes });
  },

  approve: async (id: string, notes?: string): Promise<Forecast> => {
    return api.post<Forecast>(`/forecasts/${id}/approve`, { notes });
  },

  reject: async (id: string, reason: string): Promise<Forecast> => {
    return api.post<Forecast>(`/forecasts/${id}/reject`, { reason });
  },

  override: async (id: string, dto: OverrideForecastDto): Promise<Forecast> => {
    return api.post<Forecast>(`/forecasts/${id}/override`, dto);
  },

  bulkApprove: async (dto: BulkApprovalDto): Promise<BulkApprovalResponse> => {
    return api.post<BulkApprovalResponse>('/forecasts/bulk-approve', dto);
  },

  lockMonth: async (dto: LockMonthDto): Promise<LockMonthResponse> => {
    return api.post<LockMonthResponse>('/forecasts/lock-month', dto);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/forecasts/${id}`);
  },
};

// Helper functions
export const getForecastStatusColor = (status: ForecastStatus): string => {
  switch (status) {
    case ForecastStatus.Draft:
      return 'bg-gray-100 text-gray-800';
    case ForecastStatus.Submitted:
      return 'bg-yellow-100 text-yellow-800';
    case ForecastStatus.Approved:
      return 'bg-green-100 text-green-800';
    case ForecastStatus.Rejected:
      return 'bg-red-100 text-red-800';
    case ForecastStatus.Locked:
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getVersionTypeColor = (type: ForecastVersionType): string => {
  switch (type) {
    case ForecastVersionType.Current:
      return 'bg-green-100 text-green-800';
    case ForecastVersionType.WhatIf:
      return 'bg-purple-100 text-purple-800';
    case ForecastVersionType.Historical:
      return 'bg-gray-100 text-gray-800';
    case ForecastVersionType.Import:
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const getMonthName = (month: number): string => {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || '';
};

export const getMonthShortName = (month: number): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1] || '';
};

export const formatPeriod = (year: number, month: number, week?: number): string => {
  const monthName = getMonthShortName(month);
  if (week) {
    return `${monthName} ${year} W${week}`;
  }
  return `${monthName} ${year}`;
};

export const generateMonthRange = (startYear: number, startMonth: number, months: number): { year: number; month: number }[] => {
  const result: { year: number; month: number }[] = [];
  let currentYear = startYear;
  let currentMonth = startMonth;

  for (let i = 0; i < months; i++) {
    result.push({ year: currentYear, month: currentMonth });
    currentMonth++;
    if (currentMonth > 12) {
      currentMonth = 1;
      currentYear++;
    }
  }

  return result;
};
