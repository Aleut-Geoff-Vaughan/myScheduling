import axios from 'axios';
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

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://localhost:5001';

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

  const response = await axios.get<ResumeProfile[]>(
    `${API_BASE_URL}/api/resumes${params.toString() ? `?${params}` : ''}`
  );
  return response.data;
};

export const getResume = async (id: string): Promise<ResumeProfile> => {
  const response = await axios.get<ResumeProfile>(`${API_BASE_URL}/api/resumes/${id}`);
  return response.data;
};

export const createResume = async (data: {
  personId: string;
  templateConfig?: string;
}): Promise<ResumeProfile> => {
  const response = await axios.post<ResumeProfile>(`${API_BASE_URL}/api/resumes`, data);
  return response.data;
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
  await axios.put(`${API_BASE_URL}/api/resumes/${id}`, data);
};

export const deleteResume = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/resumes/${id}`);
};

// ==================== SECTIONS & ENTRIES ====================

export const addSection = async (
  resumeId: string,
  data: {
    type: ResumeSectionType;
    displayOrder: number;
  }
): Promise<ResumeSection> => {
  const response = await axios.post<ResumeSection>(
    `${API_BASE_URL}/api/resumes/${resumeId}/sections`,
    data
  );
  return response.data;
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
  const response = await axios.post<ResumeEntry>(
    `${API_BASE_URL}/api/resumes/sections/${sectionId}/entries`,
    data
  );
  return response.data;
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
  await axios.put(`${API_BASE_URL}/api/resumes/entries/${entryId}`, data);
};

export const deleteEntry = async (entryId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/resumes/entries/${entryId}`);
};

// ==================== VERSION MANAGEMENT ====================

export const getVersions = async (resumeId: string): Promise<ResumeVersion[]> => {
  const response = await axios.get<ResumeVersion[]>(
    `${API_BASE_URL}/api/resumes/${resumeId}/versions`
  );
  return response.data;
};

export const getVersion = async (resumeId: string, versionId: string): Promise<ResumeVersion> => {
  const response = await axios.get<ResumeVersion>(
    `${API_BASE_URL}/api/resumes/${resumeId}/versions/${versionId}`
  );
  return response.data;
};

export const createVersion = async (
  resumeId: string,
  data: {
    versionName: string;
    description?: string;
    createdByUserId: string;
  }
): Promise<ResumeVersion> => {
  const response = await axios.post<ResumeVersion>(
    `${API_BASE_URL}/api/resumes/${resumeId}/versions`,
    data
  );
  return response.data;
};

export const activateVersion = async (resumeId: string, versionId: string): Promise<void> => {
  await axios.post(`${API_BASE_URL}/api/resumes/${resumeId}/versions/${versionId}/activate`);
};

export const deleteVersion = async (resumeId: string, versionId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/resumes/${resumeId}/versions/${versionId}`);
};

// ==================== APPROVALS ====================

export const getApprovals = async (
  status?: ApprovalStatus,
  reviewerId?: string
): Promise<ResumeApproval[]> => {
  const params = new URLSearchParams();
  if (status !== undefined) params.append('status', status.toString());
  if (reviewerId) params.append('reviewerId', reviewerId);

  const response = await axios.get<ResumeApproval[]>(
    `${API_BASE_URL}/api/resume-approvals${params.toString() ? `?${params}` : ''}`
  );
  return response.data;
};

export const getApproval = async (id: string): Promise<ResumeApproval> => {
  const response = await axios.get<ResumeApproval>(`${API_BASE_URL}/api/resume-approvals/${id}`);
  return response.data;
};

export const requestApproval = async (data: {
  resumeProfileId: string;
  resumeVersionId?: string;
  requestedByUserId: string;
  requestNotes?: string;
}): Promise<ResumeApproval> => {
  const response = await axios.post<ResumeApproval>(
    `${API_BASE_URL}/api/resume-approvals`,
    data
  );
  return response.data;
};

export const approveResume = async (
  id: string,
  data: {
    reviewedByUserId: string;
    reviewNotes?: string;
  }
): Promise<void> => {
  await axios.put(`${API_BASE_URL}/api/resume-approvals/${id}/approve`, data);
};

export const rejectResume = async (
  id: string,
  data: {
    reviewedByUserId: string;
    reviewNotes: string;
  }
): Promise<void> => {
  await axios.put(`${API_BASE_URL}/api/resume-approvals/${id}/reject`, data);
};

export const requestChanges = async (
  id: string,
  data: {
    reviewedByUserId: string;
    reviewNotes: string;
  }
): Promise<void> => {
  await axios.put(`${API_BASE_URL}/api/resume-approvals/${id}/request-changes`, data);
};

export const getPendingApprovals = async (tenantId?: string): Promise<ResumeApproval[]> => {
  const params = new URLSearchParams();
  if (tenantId) params.append('tenantId', tenantId);

  const response = await axios.get<ResumeApproval[]>(
    `${API_BASE_URL}/api/resume-approvals/pending${params.toString() ? `?${params}` : ''}`
  );
  return response.data;
};

export const getMyApprovalRequests = async (userId: string): Promise<ResumeApproval[]> => {
  const response = await axios.get<ResumeApproval[]>(
    `${API_BASE_URL}/api/resume-approvals/my-requests?userId=${userId}`
  );
  return response.data;
};

export const cancelApproval = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/resume-approvals/${id}`);
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

  const response = await axios.get<ResumeTemplate[]>(
    `${API_BASE_URL}/api/resume-templates${params.toString() ? `?${params}` : ''}`
  );
  return response.data;
};

export const getTemplate = async (id: string): Promise<ResumeTemplate> => {
  const response = await axios.get<ResumeTemplate>(`${API_BASE_URL}/api/resume-templates/${id}`);
  return response.data;
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
  const response = await axios.post<ResumeTemplate>(
    `${API_BASE_URL}/api/resume-templates`,
    data
  );
  return response.data;
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
  await axios.put(`${API_BASE_URL}/api/resume-templates/${id}`, data);
};

export const deleteTemplate = async (id: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}/api/resume-templates/${id}`);
};

export const getDefaultTemplate = async (
  tenantId: string,
  type: ResumeTemplateType
): Promise<ResumeTemplate> => {
  const response = await axios.get<ResumeTemplate>(
    `${API_BASE_URL}/api/resume-templates/default?tenantId=${tenantId}&type=${type}`
  );
  return response.data;
};

export const duplicateTemplate = async (
  id: string,
  newName?: string
): Promise<ResumeTemplate> => {
  const response = await axios.post<ResumeTemplate>(
    `${API_BASE_URL}/api/resume-templates/${id}/duplicate`,
    { newName }
  );
  return response.data;
};
