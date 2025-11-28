import { api } from '../lib/api-client';

// ==================== TYPES ====================

export interface Certification {
  id: string;
  name: string;
  issuer?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PersonCertification {
  id: string;
  userId: string;
  certificationId: string;
  certificationName: string;
  issuer?: string;
  issueDate: string;
  expiryDate?: string;
  credentialId?: string;
  createdAt: string;
}

// ==================== CERTIFICATION CATALOG ====================

export const getCertifications = async (
  issuer?: string,
  search?: string
): Promise<Certification[]> => {
  const params = new URLSearchParams();
  if (issuer) params.append('issuer', issuer);
  if (search) params.append('search', search);

  return api.get<Certification[]>(`/certifications${params.toString() ? `?${params}` : ''}`);
};

export const getCertification = async (id: string): Promise<Certification> => {
  return api.get<Certification>(`/certifications/${id}`);
};

export const createCertification = async (data: {
  name: string;
  issuer?: string;
}): Promise<Certification> => {
  return api.post<Certification>('/certifications', data);
};

export const updateCertification = async (
  id: string,
  data: {
    name?: string;
    issuer?: string;
  }
): Promise<void> => {
  return api.put<void>(`/certifications/${id}`, data);
};

export const deleteCertification = async (id: string): Promise<void> => {
  return api.delete<void>(`/certifications/${id}`);
};

// ==================== USER CERTIFICATIONS (PersonCertification) ====================

export const getUserCertifications = async (userId: string): Promise<PersonCertification[]> => {
  return api.get<PersonCertification[]>(`/certifications/user/${userId}`);
};

export const addUserCertification = async (
  userId: string,
  data: {
    certificationId?: string;
    certificationName?: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
  }
): Promise<PersonCertification> => {
  return api.post<PersonCertification>(`/certifications/user/${userId}`, data);
};

export const updateUserCertification = async (
  userId: string,
  personCertificationId: string,
  data: {
    issueDate?: string;
    expiryDate?: string;
    clearExpiryDate?: boolean;
    credentialId?: string;
  }
): Promise<void> => {
  return api.put<void>(`/certifications/user/${userId}/${personCertificationId}`, data);
};

export const deleteUserCertification = async (
  userId: string,
  personCertificationId: string
): Promise<void> => {
  return api.delete<void>(`/certifications/user/${userId}/${personCertificationId}`);
};

// ==================== ADMIN ENDPOINTS ====================

export interface CertificationsAdminStats {
  totalCertifications: number;
  totalUserCertifications: number;
  usersWithCertifications: number;
  certificationsByIssuer: { issuer: string; count: number }[];
  topCertifications: { certificationId: string; certificationName: string; userCount: number }[];
  expiringCertifications: {
    personCertificationId: string;
    userId: string;
    userName: string;
    certificationName: string;
    expiryDate: string;
  }[];
}

export const getCertificationsAdminStats = async (): Promise<CertificationsAdminStats> => {
  return api.get<CertificationsAdminStats>('/certifications/admin/stats');
};

export const getIssuers = async (): Promise<string[]> => {
  return api.get<string[]>('/certifications/admin/issuers');
};
