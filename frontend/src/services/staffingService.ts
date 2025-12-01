import { api } from '../lib/api-client';

// Types
export interface CareerJobFamily {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  code?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateCareerJobFamilyDto {
  tenantId: string;
  name: string;
  description?: string;
  code?: string;
  sortOrder?: number;
}

export interface UpdateCareerJobFamilyDto {
  name?: string;
  description?: string;
  code?: string;
  sortOrder?: number;
  isActive?: boolean;
}

export interface SubcontractorCompany {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  primaryContactUserId?: string;
  primaryContactUserName?: string;
  forecastContactName?: string;
  forecastContactEmail?: string;
  forecastContactPhone?: string;
  status: SubcontractorCompanyStatus;
  notes?: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
  subcontractorCount: number;
  createdAt: string;
  updatedAt?: string;
}

export enum SubcontractorCompanyStatus {
  Active = 0,
  Inactive = 1,
  Suspended = 2,
  Terminated = 3,
}

export interface CreateSubcontractorCompanyDto {
  tenantId: string;
  name: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  primaryContactUserId?: string;
  forecastContactName?: string;
  forecastContactEmail?: string;
  forecastContactPhone?: string;
  notes?: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
}

export interface UpdateSubcontractorCompanyDto {
  name?: string;
  code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  primaryContactUserId?: string;
  forecastContactName?: string;
  forecastContactEmail?: string;
  forecastContactPhone?: string;
  status?: SubcontractorCompanyStatus;
  notes?: string;
  contractNumber?: string;
  contractStartDate?: string;
  contractEndDate?: string;
}

export interface Subcontractor {
  id: string;
  tenantId: string;
  subcontractorCompanyId: string;
  subcontractorCompanyName: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  positionTitle?: string;
  careerJobFamilyId?: string;
  careerJobFamilyName?: string;
  careerLevel?: number;
  isForecastSubmitter: boolean;
  status: SubcontractorStatus;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export enum SubcontractorStatus {
  Active = 0,
  Inactive = 1,
  Terminated = 2,
}

export interface CreateSubcontractorDto {
  tenantId: string;
  subcontractorCompanyId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  positionTitle?: string;
  careerJobFamilyId?: string;
  careerLevel?: number;
  isForecastSubmitter?: boolean;
  notes?: string;
}

export interface UpdateSubcontractorDto {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  positionTitle?: string;
  careerJobFamilyId?: string;
  careerLevel?: number;
  isForecastSubmitter?: boolean;
  status?: SubcontractorStatus;
  notes?: string;
}

export interface LaborCategory {
  id: string;
  tenantId: string;
  projectId: string;
  projectName: string;
  name: string;
  code?: string;
  description?: string;
  billRate?: number;
  costRate?: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateLaborCategoryDto {
  tenantId: string;
  projectId: string;
  name: string;
  code?: string;
  description?: string;
  billRate?: number;
  costRate?: number;
  sortOrder?: number;
}

export interface UpdateLaborCategoryDto {
  name?: string;
  code?: string;
  description?: string;
  billRate?: number;
  costRate?: number;
  isActive?: boolean;
  sortOrder?: number;
}

export interface ForecastApprovalSchedule {
  id: string;
  tenantId: string;
  name: string;
  isDefault: boolean;
  submissionDeadlineDay: number;
  approvalDeadlineDay: number;
  lockDay: number;
  forecastMonthsAhead: number;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ProjectRoleAssignment {
  id: string;
  tenantId: string;
  projectId: string;
  projectName: string;
  wbsElementId?: string;
  wbsElementCode?: string;
  wbsElementDescription?: string;
  userId?: string;
  userName?: string;
  subcontractorId?: string;
  subcontractorName?: string;
  subcontractorCompanyName?: string;
  isTbd: boolean;
  tbdDescription?: string;
  assigneeName: string;
  positionTitle: string;
  careerJobFamilyId?: string;
  careerJobFamilyName?: string;
  careerLevel?: number;
  laborCategoryId?: string;
  laborCategoryName?: string;
  laborCategoryCode?: string;
  startDate: string;
  endDate?: string;
  status: ProjectRoleAssignmentStatus;
  statusName: string;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export enum ProjectRoleAssignmentStatus {
  Draft = 0,
  Active = 1,
  OnHold = 2,
  Completed = 3,
  Cancelled = 4,
}

export interface CreateProjectRoleAssignmentDto {
  tenantId: string;
  projectId: string;
  wbsElementId?: string;
  userId?: string;
  subcontractorId?: string;
  isTbd?: boolean;
  tbdDescription?: string;
  positionTitle: string;
  careerJobFamilyId?: string;
  careerLevel?: number;
  laborCategoryId?: string;
  startDate: string;
  endDate?: string;
  status?: ProjectRoleAssignmentStatus;
  notes?: string;
}

export interface UpdateProjectRoleAssignmentDto {
  wbsElementId?: string;
  positionTitle?: string;
  careerJobFamilyId?: string;
  careerLevel?: number;
  laborCategoryId?: string;
  startDate?: string;
  endDate?: string;
  status?: ProjectRoleAssignmentStatus;
  notes?: string;
  tbdDescription?: string;
}

export interface FillTbdDto {
  userId?: string;
  subcontractorId?: string;
}

export interface CreateForecastApprovalScheduleDto {
  tenantId: string;
  name: string;
  isDefault?: boolean;
  submissionDeadlineDay?: number;
  approvalDeadlineDay?: number;
  lockDay?: number;
  forecastMonthsAhead?: number;
}

export interface UpdateForecastApprovalScheduleDto {
  name?: string;
  isDefault?: boolean;
  submissionDeadlineDay?: number;
  approvalDeadlineDay?: number;
  lockDay?: number;
  forecastMonthsAhead?: number;
  isActive?: boolean;
}

// Services
export const careerJobFamiliesService = {
  getAll: async (params: { tenantId: string; isActive?: boolean; search?: string }): Promise<CareerJobFamily[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.search) queryParams.append('search', params.search);
    return api.get<CareerJobFamily[]>(`/careerjobfamilies?${queryParams.toString()}`);
  },

  getById: async (id: string): Promise<CareerJobFamily> => {
    return api.get<CareerJobFamily>(`/careerjobfamilies/${id}`);
  },

  create: async (dto: CreateCareerJobFamilyDto): Promise<CareerJobFamily> => {
    return api.post<CareerJobFamily>('/careerjobfamilies', dto);
  },

  update: async (id: string, dto: UpdateCareerJobFamilyDto): Promise<CareerJobFamily> => {
    return api.put<CareerJobFamily>(`/careerjobfamilies/${id}`, dto);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/careerjobfamilies/${id}`);
  },
};

export const subcontractorCompaniesService = {
  getAll: async (params: {
    tenantId: string;
    status?: SubcontractorCompanyStatus;
    search?: string;
  }): Promise<SubcontractorCompany[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.status !== undefined) queryParams.append('status', params.status.toString());
    if (params.search) queryParams.append('search', params.search);
    return api.get<SubcontractorCompany[]>(`/subcontractorcompanies?${queryParams.toString()}`);
  },

  getById: async (id: string): Promise<SubcontractorCompany> => {
    return api.get<SubcontractorCompany>(`/subcontractorcompanies/${id}`);
  },

  getSubcontractors: async (id: string): Promise<Subcontractor[]> => {
    return api.get<Subcontractor[]>(`/subcontractorcompanies/${id}/subcontractors`);
  },

  create: async (dto: CreateSubcontractorCompanyDto): Promise<SubcontractorCompany> => {
    return api.post<SubcontractorCompany>('/subcontractorcompanies', dto);
  },

  update: async (id: string, dto: UpdateSubcontractorCompanyDto): Promise<SubcontractorCompany> => {
    return api.put<SubcontractorCompany>(`/subcontractorcompanies/${id}`, dto);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/subcontractorcompanies/${id}`);
  },
};

export const subcontractorsService = {
  getAll: async (params: {
    tenantId: string;
    companyId?: string;
    status?: SubcontractorStatus;
    search?: string;
  }): Promise<Subcontractor[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.companyId) queryParams.append('companyId', params.companyId);
    if (params.status !== undefined) queryParams.append('status', params.status.toString());
    if (params.search) queryParams.append('search', params.search);
    return api.get<Subcontractor[]>(`/subcontractors?${queryParams.toString()}`);
  },

  getById: async (id: string): Promise<Subcontractor> => {
    return api.get<Subcontractor>(`/subcontractors/${id}`);
  },

  create: async (dto: CreateSubcontractorDto): Promise<Subcontractor> => {
    return api.post<Subcontractor>('/subcontractors', dto);
  },

  update: async (id: string, dto: UpdateSubcontractorDto): Promise<Subcontractor> => {
    return api.put<Subcontractor>(`/subcontractors/${id}`, dto);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/subcontractors/${id}`);
  },
};

export const laborCategoriesService = {
  getAll: async (params: {
    tenantId: string;
    projectId?: string;
    isActive?: boolean;
    search?: string;
  }): Promise<LaborCategory[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.search) queryParams.append('search', params.search);
    return api.get<LaborCategory[]>(`/laborcategories?${queryParams.toString()}`);
  },

  getById: async (id: string): Promise<LaborCategory> => {
    return api.get<LaborCategory>(`/laborcategories/${id}`);
  },

  getByProject: async (projectId: string, isActive?: boolean): Promise<LaborCategory[]> => {
    const queryParams = new URLSearchParams();
    if (isActive !== undefined) queryParams.append('isActive', isActive.toString());
    const query = queryParams.toString();
    return api.get<LaborCategory[]>(`/laborcategories/by-project/${projectId}${query ? `?${query}` : ''}`);
  },

  create: async (dto: CreateLaborCategoryDto): Promise<LaborCategory> => {
    return api.post<LaborCategory>('/laborcategories', dto);
  },

  update: async (id: string, dto: UpdateLaborCategoryDto): Promise<LaborCategory> => {
    return api.put<LaborCategory>(`/laborcategories/${id}`, dto);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/laborcategories/${id}`);
  },
};

export const forecastApprovalSchedulesService = {
  getAll: async (params: { tenantId: string; isActive?: boolean }): Promise<ForecastApprovalSchedule[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    return api.get<ForecastApprovalSchedule[]>(`/forecastapprovalschedules?${queryParams.toString()}`);
  },

  getById: async (id: string): Promise<ForecastApprovalSchedule> => {
    return api.get<ForecastApprovalSchedule>(`/forecastapprovalschedules/${id}`);
  },

  getDefault: async (tenantId: string): Promise<ForecastApprovalSchedule> => {
    return api.get<ForecastApprovalSchedule>(`/forecastapprovalschedules/default?tenantId=${tenantId}`);
  },

  create: async (dto: CreateForecastApprovalScheduleDto): Promise<ForecastApprovalSchedule> => {
    return api.post<ForecastApprovalSchedule>('/forecastapprovalschedules', dto);
  },

  update: async (id: string, dto: UpdateForecastApprovalScheduleDto): Promise<ForecastApprovalSchedule> => {
    return api.put<ForecastApprovalSchedule>(`/forecastapprovalschedules/${id}`, dto);
  },

  setAsDefault: async (id: string): Promise<ForecastApprovalSchedule> => {
    return api.post<ForecastApprovalSchedule>(`/forecastapprovalschedules/${id}/set-default`, {});
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/forecastapprovalschedules/${id}`);
  },
};

export const projectRoleAssignmentsService = {
  getAll: async (params: {
    tenantId: string;
    projectId?: string;
    wbsElementId?: string;
    userId?: string;
    subcontractorId?: string;
    isTbd?: boolean;
    status?: ProjectRoleAssignmentStatus;
    includeInactive?: boolean;
  }): Promise<ProjectRoleAssignment[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', params.tenantId);
    if (params.projectId) queryParams.append('projectId', params.projectId);
    if (params.wbsElementId) queryParams.append('wbsElementId', params.wbsElementId);
    if (params.userId) queryParams.append('userId', params.userId);
    if (params.subcontractorId) queryParams.append('subcontractorId', params.subcontractorId);
    if (params.isTbd !== undefined) queryParams.append('isTbd', params.isTbd.toString());
    if (params.status !== undefined) queryParams.append('status', params.status.toString());
    if (params.includeInactive) queryParams.append('includeInactive', 'true');
    return api.get<ProjectRoleAssignment[]>(`/projectroleassignments?${queryParams.toString()}`);
  },

  getById: async (id: string): Promise<ProjectRoleAssignment> => {
    return api.get<ProjectRoleAssignment>(`/projectroleassignments/${id}`);
  },

  getByProject: async (projectId: string, includeInactive?: boolean): Promise<ProjectRoleAssignment[]> => {
    const queryParams = new URLSearchParams();
    if (includeInactive) queryParams.append('includeInactive', 'true');
    const query = queryParams.toString();
    return api.get<ProjectRoleAssignment[]>(`/projectroleassignments/by-project/${projectId}${query ? `?${query}` : ''}`);
  },

  getTbds: async (tenantId: string, projectId?: string): Promise<ProjectRoleAssignment[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', tenantId);
    if (projectId) queryParams.append('projectId', projectId);
    return api.get<ProjectRoleAssignment[]>(`/projectroleassignments/tbds?${queryParams.toString()}`);
  },

  getMyAssignments: async (tenantId: string, includeInactive?: boolean): Promise<ProjectRoleAssignment[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', tenantId);
    if (includeInactive) queryParams.append('includeInactive', 'true');
    return api.get<ProjectRoleAssignment[]>(`/projectroleassignments/my-assignments?${queryParams.toString()}`);
  },

  getPositionTitles: async (tenantId: string, search?: string): Promise<string[]> => {
    const queryParams = new URLSearchParams();
    queryParams.append('tenantId', tenantId);
    if (search) queryParams.append('search', search);
    return api.get<string[]>(`/projectroleassignments/position-titles?${queryParams.toString()}`);
  },

  create: async (dto: CreateProjectRoleAssignmentDto): Promise<ProjectRoleAssignment> => {
    return api.post<ProjectRoleAssignment>('/projectroleassignments', dto);
  },

  update: async (id: string, dto: UpdateProjectRoleAssignmentDto): Promise<ProjectRoleAssignment> => {
    return api.put<ProjectRoleAssignment>(`/projectroleassignments/${id}`, dto);
  },

  fillTbd: async (id: string, dto: FillTbdDto): Promise<ProjectRoleAssignment> => {
    return api.post<ProjectRoleAssignment>(`/projectroleassignments/${id}/fill-tbd`, dto);
  },

  delete: async (id: string): Promise<void> => {
    return api.delete<void>(`/projectroleassignments/${id}`);
  },
};
