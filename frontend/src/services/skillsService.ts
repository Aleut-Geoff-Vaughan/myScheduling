import { api } from '../lib/api-client';
import type { Skill, PersonSkill, ProficiencyLevel, SkillCategory } from '../types/api';

// ==================== SKILL CATALOG ====================

export const getSkills = async (
  category?: SkillCategory,
  search?: string
): Promise<Skill[]> => {
  const params = new URLSearchParams();
  if (category !== undefined) params.append('category', category.toString());
  if (search) params.append('search', search);

  return api.get<Skill[]>(`/skills${params.toString() ? `?${params}` : ''}`);
};

export const getSkill = async (id: string): Promise<Skill> => {
  return api.get<Skill>(`/skills/${id}`);
};

export const createSkill = async (data: {
  name: string;
  category: SkillCategory;
}): Promise<Skill> => {
  return api.post<Skill>('/skills', data);
};

export const updateSkill = async (
  id: string,
  data: {
    name?: string;
    category?: SkillCategory;
  }
): Promise<void> => {
  return api.put<void>(`/skills/${id}`, data);
};

export const deleteSkill = async (id: string): Promise<void> => {
  return api.delete<void>(`/skills/${id}`);
};

// ==================== USER SKILLS (PersonSkill) ====================

export const getUserSkills = async (userId: string): Promise<PersonSkill[]> => {
  return api.get<PersonSkill[]>(`/skills/user/${userId}`);
};

export const addUserSkill = async (
  userId: string,
  data: {
    skillId?: string;
    skillName?: string;
    category?: SkillCategory;
    proficiencyLevel: ProficiencyLevel;
    lastUsedDate?: string;
  }
): Promise<PersonSkill> => {
  return api.post<PersonSkill>(`/skills/user/${userId}`, data);
};

export const updateUserSkill = async (
  userId: string,
  personSkillId: string,
  data: {
    proficiencyLevel?: ProficiencyLevel;
    lastUsedDate?: string;
  }
): Promise<void> => {
  return api.put<void>(`/skills/user/${userId}/${personSkillId}`, data);
};

export const deleteUserSkill = async (
  userId: string,
  personSkillId: string
): Promise<void> => {
  return api.delete<void>(`/skills/user/${userId}/${personSkillId}`);
};

// ==================== ADMIN ENDPOINTS ====================

export interface SkillsAdminStats {
  totalSkills: number;
  totalUserSkills: number;
  usersWithSkills: number;
  userDefinedSkills: number;
  skillsByCategory: { category: SkillCategory; count: number }[];
  topSkills: { skillId: string; skillName: string; userCount: number }[];
}

export interface SkillWithUsers {
  id: string;
  name: string;
  category: SkillCategory;
  isApproved: boolean;
  createdAt: string;
  userCount: number;
  users: { userId: string; userName: string; proficiencyLevel: ProficiencyLevel }[];
}

export const getSkillsAdminStats = async (): Promise<SkillsAdminStats> => {
  return api.get<SkillsAdminStats>('/skills/admin/stats');
};

export const getPendingReviewSkills = async (): Promise<SkillWithUsers[]> => {
  return api.get<SkillWithUsers[]>('/skills/admin/pending-review');
};

export const approveSkill = async (
  id: string,
  data: { name?: string; category?: SkillCategory }
): Promise<void> => {
  return api.post<void>(`/skills/admin/approve/${id}`, data);
};

export const rejectSkill = async (
  id: string,
  replacementSkillId?: string
): Promise<void> => {
  return api.post<void>(`/skills/admin/reject/${id}`, { replacementSkillId });
};

export const bulkApproveSkills = async (
  skillIds: string[]
): Promise<{ processed: number; total: number }> => {
  return api.post<{ processed: number; total: number }>('/skills/admin/bulk-approve', { skillIds });
};
