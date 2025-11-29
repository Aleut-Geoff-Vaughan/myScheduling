/**
 * User Profile Type Definitions
 */

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  managerId?: string;
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
  profilePhotoUrl?: string;
  homeOfficeId?: string;
  executiveAssistantId?: string;
  standardDelegateIds?: string[];
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export interface UpdateUserProfileRequest {
  email?: string;
  displayName: string;
  managerId?: string;
  department?: string;
  jobTitle?: string;
  phoneNumber?: string;
  homeOfficeId?: string;
  executiveAssistantId?: string;
  standardDelegateIds?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface UploadProfilePhotoResponse {
  profilePhotoUrl: string;
}
