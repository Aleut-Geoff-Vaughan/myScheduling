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

// Version Compare Types
export interface VersionCompareResponse {
  version1: ForecastVersion;
  version2: ForecastVersion;
  comparisons: ForecastComparisonItem[];
  summary: VersionCompareSummary;
}

export interface ForecastComparisonItem {
  projectRoleAssignmentId: string;
  projectId: string;
  projectName: string;
  positionTitle: string;
  assigneeName: string;
  year: number;
  month: number;
  version1Hours?: number;
  version1Status?: ForecastStatus;
  version1StatusName?: string;
  version2Hours?: number;
  version2Status?: ForecastStatus;
  version2StatusName?: string;
  hoursDifference: number;
  isNew: boolean;
  isRemoved: boolean;
  isChanged: boolean;
}

export interface VersionCompareSummary {
  totalHoursVersion1: number;
  totalHoursVersion2: number;
  hoursDifference: number;
  percentChange: number;
  newForecastsCount: number;
  removedForecastsCount: number;
  changedForecastsCount: number;
  unchangedForecastsCount: number;
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

  compare: async (id1: string, id2: string): Promise<VersionCompareResponse> => {
    return api.get<VersionCompareResponse>(`/forecastversions/${id1}/compare/${id2}`);
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

// ==================== IMPORT/EXPORT TYPES ====================

export enum ForecastImportExportType {
  Export = 0,
  Import = 1,
  ImportUpdate = 2,
}

export enum ForecastImportExportStatus {
  InProgress = 0,
  Completed = 1,
  CompletedWithErrors = 2,
  Failed = 3,
}

export interface ImportValidationResult {
  rowNumber: number;
  projectRoleAssignmentId: string;
  year: number;
  month: number;
  forecastedHours: number;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

export interface ImportPreviewResponse {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  items: ImportValidationResult[];
  fileHash: string;
  isDuplicateImport: boolean;
  previousImportDate?: string;
}

export interface ImportCommitResponse {
  totalRows: number;
  createdCount: number;
  updatedCount: number;
  skippedCount: number;
  failedCount: number;
  versionId?: string;
  versionName?: string;
}

export interface ImportExportHistoryItem {
  id: string;
  type: ForecastImportExportType;
  typeName: string;
  operationAt: string;
  operationByUserName: string;
  projectId?: string;
  projectName?: string;
  versionId?: string;
  versionName?: string;
  year?: number;
  month?: number;
  fileName: string;
  fileFormat: string;
  fileSizeBytes: number;
  fileHash?: string;
  status: ForecastImportExportStatus;
  statusName: string;
  recordsProcessed: number;
  recordsSucceeded: number;
  recordsFailed: number;
  errorDetails?: string;
}

// ==================== IMPORT/EXPORT SERVICE ====================

export const forecastImportExportService = {
  exportCsv: async (params: {
    tenantId: string;
    versionId?: string;
    projectId?: string;
    year?: number;
    month?: number;
  }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.versionId) queryParams.append('versionId', params.versionId);
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.year !== undefined) queryParams.append('year', params.year.toString());
    if (params.month !== undefined) queryParams.append('month', params.month.toString());

    const response = await fetch(`/api/forecastimportexport/export/csv?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  exportExcel: async (params: {
    tenantId: string;
    versionId?: string;
    projectId?: string;
    year?: number;
    month?: number;
  }): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.versionId) queryParams.append('versionId', params.versionId);
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.year !== undefined) queryParams.append('year', params.year.toString());
    if (params.month !== undefined) queryParams.append('month', params.month.toString());

    const response = await fetch(`/api/forecastimportexport/export/excel?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },

  downloadTemplate: async (tenantId: string, projectId?: string): Promise<Blob> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', tenantId);
    if (projectId) queryParams.append('projectId', projectId);

    const response = await fetch(`/api/forecastimportexport/export/template?${queryParams.toString()}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Template download failed');
    return response.blob();
  },

  importPreview: async (params: {
    tenantId: string;
    versionId?: string;
    file: File;
  }): Promise<ImportPreviewResponse> => {
    const formData = new FormData();
    formData.append('tenantId', params.tenantId);
    if (params.versionId) formData.append('versionId', params.versionId);
    formData.append('file', params.file);

    const response = await fetch('/api/forecastimportexport/import/preview', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Preview failed');
    }
    return response.json();
  },

  importCommit: async (params: {
    tenantId: string;
    versionId?: string;
    updateExisting?: boolean;
    createNewVersion?: boolean;
    newVersionName?: string;
    newVersionDescription?: string;
    file: File;
  }): Promise<ImportCommitResponse> => {
    const formData = new FormData();
    formData.append('tenantId', params.tenantId);
    if (params.versionId) formData.append('versionId', params.versionId);
    formData.append('updateExisting', String(params.updateExisting ?? true));
    formData.append('createNewVersion', String(params.createNewVersion ?? false));
    if (params.newVersionName) formData.append('newVersionName', params.newVersionName);
    if (params.newVersionDescription) formData.append('newVersionDescription', params.newVersionDescription);
    formData.append('file', params.file);

    const response = await fetch('/api/forecastimportexport/import/commit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: formData,
    });
    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Import failed');
    }
    return response.json();
  },

  getHistory: async (tenantId: string, limit?: number): Promise<ImportExportHistoryItem[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', tenantId);
    if (limit) queryParams.append('limit', limit.toString());
    return api.get<ImportExportHistoryItem[]>(`/forecastimportexport/history?${queryParams.toString()}`);
  },

  reDownload: async (id: string): Promise<Blob> => {
    const response = await fetch(`/api/forecastimportexport/history/${id}/download`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    });
    if (!response.ok) throw new Error('Re-download failed');
    return response.blob();
  },
};

// Helper to trigger file download
export const downloadBlob = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const getImportExportStatusColor = (status: ForecastImportExportStatus): string => {
  switch (status) {
    case ForecastImportExportStatus.InProgress:
      return 'bg-yellow-100 text-yellow-800';
    case ForecastImportExportStatus.Completed:
      return 'bg-green-100 text-green-800';
    case ForecastImportExportStatus.CompletedWithErrors:
      return 'bg-orange-100 text-orange-800';
    case ForecastImportExportStatus.Failed:
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// ==================== STAFFING REPORTS TYPES ====================

export interface MonthlyDataPoint {
  year: number;
  month: number;
  forecastedHours: number;
  budgetedHours: number;
  actualHours: number;
}

export interface DashboardSummary {
  hasData: boolean;
  message?: string;
  versionName?: string;
  versionId?: string;
  totalForecastedHours: number;
  totalBudgetedHours: number;
  totalActualHours: number;
  variance: number;
  variancePercent: number;
  projectCount: number;
  assignmentCount: number;
  forecastCount: number;
  statusCounts: Record<string, number>;
  monthlyData: MonthlyDataPoint[];
}

export interface ProjectAssignmentSummary {
  id: string;
  roleName: string;
  assigneeType: string;
  assigneeName: string;
  laborCategory?: string;
  wbsCode?: string;
  billRate?: number;
  totalForecastedHours: number;
  totalBudgetedHours: number;
  totalActualHours: number;
  variance: number;
  status: string;
}

export interface ProjectStaffingSummary {
  project: {
    id: string;
    name: string;
    programCode?: string;
    startDate?: string;
    endDate?: string;
    status: string;
  };
  hasData: boolean;
  message?: string;
  versionName?: string;
  totalForecastedHours: number;
  totalBudgetedHours: number;
  totalActualHours: number;
  assignmentCount: number;
  assignments: ProjectAssignmentSummary[];
  monthlyTotals: MonthlyDataPoint[];
}

export interface ProjectVariance {
  projectId: string;
  projectName: string;
  programCode?: string;
  totalForecastedHours: number;
  totalBudgetedHours: number;
  totalActualHours: number;
  variance: number;
  variancePercent: number;
  status: string;
}

export interface VarianceAnalysis {
  hasData: boolean;
  message?: string;
  summary: {
    totalForecastedHours: number;
    totalBudgetedHours: number;
    totalActualHours: number;
    totalVariance: number;
    projectsOverBudget: number;
    projectsUnderBudget: number;
  };
  projectVariances: ProjectVariance[];
  monthlyVariances: (MonthlyDataPoint & { variance: number })[];
}

export interface MonthlyBurnRate {
  year: number;
  month: number;
  forecastedHours: number;
  forecastedCost: number;
  budgetedHours: number;
  budgetedCost: number;
  actualHours: number;
  actualCost: number;
}

export interface CumulativeBurnRate extends MonthlyBurnRate {
  cumulativeForecastedCost: number;
  cumulativeBudgetedCost: number;
  cumulativeActualCost: number;
}

export interface BurnRateAnalysis {
  hasData: boolean;
  message?: string;
  summary: {
    totalForecastedCost: number;
    totalBudgetedCost: number;
    totalActualCost: number;
    averageMonthlyForecastedCost: number;
    averageMonthlyBudgetedCost: number;
    monthCount: number;
  };
  monthlyBurnRate: MonthlyBurnRate[];
  cumulativeBurnRate: CumulativeBurnRate[];
}

export interface ResourceUtilization {
  id?: string;
  name: string;
  type: string;
  projectCount: number;
  forecastedHours: number;
  availableHours: number;
  utilizationPercent: number;
}

export interface CapacityUtilization {
  hasData: boolean;
  message?: string;
  period: {
    year: number;
    month: number;
  };
  summary: {
    totalResources: number;
    employees: number;
    subcontractors: number;
    averageUtilization: number;
    overUtilized: number;
    fullyUtilized: number;
    underUtilized: number;
  };
  utilization: ResourceUtilization[];
}

export interface ProjectsSummaryItem {
  id: string;
  name: string;
  programCode?: string;
  startDate?: string;
  endDate?: string;
  assignmentCount: number;
  forecastCount: number;
  totalForecastedHours: number;
}

// ==================== STAFFING REPORTS SERVICE ====================

export const staffingReportsService = {
  getDashboardSummary: async (projectId?: string): Promise<DashboardSummary> => {
    const queryParams = new URLSearchParams();
    if (projectId) queryParams.append('projectId', projectId);
    const query = queryParams.toString();
    return api.get<DashboardSummary>(`/staffing/staffingreports/dashboard-summary${query ? `?${query}` : ''}`);
  },

  getProjectSummary: async (projectId: string): Promise<ProjectStaffingSummary> => {
    return api.get<ProjectStaffingSummary>(`/staffing/staffingreports/project-summary/${projectId}`);
  },

  getVarianceAnalysis: async (projectId?: string): Promise<VarianceAnalysis> => {
    const queryParams = new URLSearchParams();
    if (projectId) queryParams.append('projectId', projectId);
    const query = queryParams.toString();
    return api.get<VarianceAnalysis>(`/staffing/staffingreports/variance-analysis${query ? `?${query}` : ''}`);
  },

  getBurnRate: async (projectId?: string): Promise<BurnRateAnalysis> => {
    const queryParams = new URLSearchParams();
    if (projectId) queryParams.append('projectId', projectId);
    const query = queryParams.toString();
    return api.get<BurnRateAnalysis>(`/staffing/staffingreports/burn-rate${query ? `?${query}` : ''}`);
  },

  getCapacityUtilization: async (year?: number, month?: number): Promise<CapacityUtilization> => {
    const queryParams = new URLSearchParams();
    if (year !== undefined) queryParams.append('year', year.toString());
    if (month !== undefined) queryParams.append('month', month.toString());
    const query = queryParams.toString();
    return api.get<CapacityUtilization>(`/staffing/staffingreports/capacity-utilization${query ? `?${query}` : ''}`);
  },

  getProjectsSummary: async (): Promise<{ projects: ProjectsSummaryItem[] }> => {
    return api.get<{ projects: ProjectsSummaryItem[] }>('/staffing/staffingreports/projects-summary');
  },
};
