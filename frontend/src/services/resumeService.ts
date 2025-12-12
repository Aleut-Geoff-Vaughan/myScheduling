import { api } from '../lib/api-client';
import type {
  ResumeProfile,
  ResumeSection,
  ResumeEntry,
  ResumeVersion,
  ResumeApproval,
  ResumeTemplate,
  ResumeStatus,
  ApprovalStatus,
  ResumeSectionType,
  ResumeTemplateType,
} from '../types/api';

// ==================== RESUME CRUD ====================

export const getResumes = async (
  tenantId?: string,
  status?: ResumeStatus,
  search?: string
): Promise<ResumeProfile[]> => {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);
  if (status !== undefined) params.append('status', status.toString());
  if (search) params.append('search', search);

  return api.get<ResumeProfile[]>(
    `/resumes${params.toString() ? `?${params}` : ''}`
  );
};

export const getResume = async (id: string): Promise<ResumeProfile> => {
  return api.get<ResumeProfile>(`/resumes/${id}`);
};

// Get the current user's resume
export const getMyResume = async (): Promise<ResumeProfile | null> => {
  try {
    return await api.get<ResumeProfile>('/resumes/my');
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError?.response?.status === 404) {
        return null; // User doesn't have a resume yet
      }
    }
    throw error;
  }
};

// Get team members' resumes (for managers)
export const getTeamResumes = async (
  filter: 'direct' | 'team' | 'all' = 'direct',
  status?: ResumeStatus,
  search?: string
): Promise<ResumeProfile[]> => {
  const params = new URLSearchParams();
  params.append('filter', filter);
  if (status !== undefined) params.append('status', status.toString());
  if (search) params.append('search', search);

  return api.get<ResumeProfile[]>(`/resumes/team?${params}`);
};

export const createResume = async (data: {
  userId: string;
  templateConfig?: string;
}): Promise<ResumeProfile> => {
  return api.post<ResumeProfile>(`/resumes`, data);
};

export const updateResume = async (
  id: string,
  data: {
    status?: ResumeStatus;
    isPublic?: boolean;
    templateConfig?: string;
    linkedInProfileUrl?: string;
  }
): Promise<void> => {
  return api.put<void>(`/resumes/${id}`, data);
};

export const deleteResume = async (id: string): Promise<void> => {
  return api.delete<void>(`/resumes/${id}`);
};

// ==================== SECTIONS & ENTRIES ====================

export const addSection = async (
  resumeId: string,
  data: {
    type: ResumeSectionType;
    title?: string;  // Optional, backend may not use it
    displayOrder: number;
  }
): Promise<ResumeSection> => {
  return api.post<ResumeSection>(
    `/resumes/${resumeId}/sections`,
    { type: data.type, displayOrder: data.displayOrder }
  );
};

export const addEntry = async (
  sectionId: string,
  data: {
    title: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    additionalFields?: string;
  }
): Promise<ResumeEntry> => {
  return api.post<ResumeEntry>(
    `/resumes/sections/${sectionId}/entries`,
    data
  );
};

export const updateEntry = async (
  entryId: string,
  data: {
    title?: string;
    organization?: string;
    startDate?: string;
    endDate?: string;
    description?: string;
    additionalFields?: string;
  }
): Promise<void> => {
  return api.put<void>(`/resumes/entries/${entryId}`, data);
};

export const deleteEntry = async (entryId: string): Promise<void> => {
  return api.delete<void>(`/resumes/entries/${entryId}`);
};

// ==================== VERSION MANAGEMENT ====================

export const getVersions = async (resumeId: string): Promise<ResumeVersion[]> => {
  return api.get<ResumeVersion[]>(
    `/resumes/${resumeId}/versions`
  );
};

export const getVersion = async (resumeId: string, versionId: string): Promise<ResumeVersion> => {
  return api.get<ResumeVersion>(
    `/resumes/${resumeId}/versions/${versionId}`
  );
};

export const createVersion = async (
  resumeId: string,
  data: {
    versionName: string;
    description?: string;
    createdByUserId: string;
  }
): Promise<ResumeVersion> => {
  return api.post<ResumeVersion>(
    `/resumes/${resumeId}/versions`,
    data
  );
};

export const activateVersion = async (resumeId: string, versionId: string): Promise<void> => {
  return api.post<void>(`/resumes/${resumeId}/versions/${versionId}/activate`, undefined);
};

export const deleteVersion = async (resumeId: string, versionId: string): Promise<void> => {
  return api.delete<void>(`/resumes/${resumeId}/versions/${versionId}`);
};

// ==================== APPROVALS ====================

export const getApprovals = async (
  status?: ApprovalStatus,
  reviewerId?: string
): Promise<ResumeApproval[]> => {
  const params = new URLSearchParams();
  if (status !== undefined) params.append('status', status.toString());
  if (reviewerId) params.append('reviewerId', reviewerId);

  return api.get<ResumeApproval[]>(
    `/resume-approvals${params.toString() ? `?${params}` : ''}`
  );
};

export const getApproval = async (id: string): Promise<ResumeApproval> => {
  return api.get<ResumeApproval>(`/resume-approvals/${id}`);
};

export const requestApproval = async (data: {
  resumeProfileId: string;
  resumeVersionId?: string;
  requestedByUserId: string;
  requestNotes?: string;
}): Promise<ResumeApproval> => {
  return api.post<ResumeApproval>(
    `/resume-approvals`,
    data
  );
};

export const approveResume = async (
  id: string,
  data: {
    reviewedByUserId: string;
    reviewNotes?: string;
  }
): Promise<void> => {
  return api.put<void>(`/resume-approvals/${id}/approve`, data);
};

export const rejectResume = async (
  id: string,
  data: {
    reviewedByUserId: string;
    reviewNotes: string;
  }
): Promise<void> => {
  return api.put<void>(`/resume-approvals/${id}/reject`, data);
};

export const requestChanges = async (
  id: string,
  data: {
    reviewedByUserId: string;
    reviewNotes: string;
  }
): Promise<void> => {
  return api.put<void>(`/resume-approvals/${id}/request-changes`, data);
};

export const getPendingApprovals = async (tenantId?: string): Promise<ResumeApproval[]> => {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);

  return api.get<ResumeApproval[]>(
    `/resume-approvals/pending${params.toString() ? `?${params}` : ''}`
  );
};

export const getMyApprovalRequests = async (userId: string): Promise<ResumeApproval[]> => {
  return api.get<ResumeApproval[]>(
    `/resume-approvals/my-requests?userId=${userId}`
  );
};

export const cancelApproval = async (id: string): Promise<void> => {
  return api.delete<void>(`/resume-approvals/${id}`);
};

// ==================== TEMPLATES ====================

export const getTemplates = async (
  tenantId?: string,
  type?: ResumeTemplateType,
  isActive?: boolean
): Promise<ResumeTemplate[]> => {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);
  if (type !== undefined) params.append('type', type.toString());
  if (isActive !== undefined) params.append('isActive', isActive.toString());

  return api.get<ResumeTemplate[]>(
    `/resume-templates${params.toString() ? `?${params}` : ''}`
  );
};

export const getTemplate = async (id: string): Promise<ResumeTemplate> => {
  return api.get<ResumeTemplate>(`/resume-templates/${id}`);
};

export const createTemplate = async (data: {
  tenantId: string;
  name: string;
  description: string;
  type: ResumeTemplateType;
  templateContent: string;
  storedFileId?: string;
  isDefault?: boolean;
}): Promise<ResumeTemplate> => {
  return api.post<ResumeTemplate>(
    `/resume-templates`,
    data
  );
};

export const updateTemplate = async (
  id: string,
  data: {
    name?: string;
    description?: string;
    type?: ResumeTemplateType;
    templateContent?: string;
    storedFileId?: string;
    isDefault?: boolean;
    isActive?: boolean;
  }
): Promise<void> => {
  return api.put<void>(`/resume-templates/${id}`, data);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  return api.delete<void>(`/resume-templates/${id}`);
};

export const getDefaultTemplate = async (
  tenantId: string,
  type: ResumeTemplateType
): Promise<ResumeTemplate> => {
  return api.get<ResumeTemplate>(
    `/resume-templates/default?tenantId=${tenantId}&type=${type}`
  );
};

export const duplicateTemplate = async (
  id: string,
  newName?: string
): Promise<ResumeTemplate> => {
  return api.post<ResumeTemplate>(
    `/resume-templates/${id}/duplicate`,
    { newName }
  );
};

// ==================== ADMIN ENDPOINTS ====================

export interface ResumeAdminStats {
  totalResumes: number;
  resumesByStatus: { status: ResumeStatus; count: number }[];
  pendingApprovals: number;
  recentResumes: { id: string; userName: string; status: ResumeStatus; updatedAt: string }[];
}

export interface ResumeApprovalListItem {
  id: string;
  resumeProfileId: string;
  userName: string;
  userEmail: string;
  requestedAt: string;
  requestedByName: string;
  requestNotes?: string;
  resumeStatus: ResumeStatus;
}

export const getResumeAdminStats = async (): Promise<ResumeAdminStats> => {
  return api.get<ResumeAdminStats>('/resumes/admin/stats');
};

export const getAdminPendingApprovals = async (): Promise<ResumeApprovalListItem[]> => {
  return api.get<ResumeApprovalListItem[]>('/resumes/admin/pending-approvals');
};

export const adminApproveResume = async (
  approvalId: string,
  reviewedByUserId: string,
  reviewNotes?: string
): Promise<void> => {
  return api.post<void>(`/resumes/admin/approve/${approvalId}`, {
    reviewedByUserId,
    reviewNotes
  });
};

export const adminRejectResume = async (
  approvalId: string,
  reviewedByUserId: string,
  reviewNotes?: string
): Promise<void> => {
  return api.post<void>(`/resumes/admin/reject/${approvalId}`, {
    reviewedByUserId,
    reviewNotes
  });
};

export const bulkApproveResumes = async (
  approvalIds: string[],
  reviewedByUserId: string,
  reviewNotes?: string
): Promise<{ processed: number; total: number }> => {
  return api.post<{ processed: number; total: number }>('/resumes/admin/bulk-approve', {
    approvalIds,
    reviewedByUserId,
    reviewNotes
  });
};
