import { api } from '../lib/api-client';
import type {
  UserProfile,
  UpdateUserProfileRequest,
  ChangePasswordRequest,
  UploadProfilePhotoResponse,
} from '../types/user';

export const userProfileService = {
  /**
   * Get current user's profile
   */
  getMyProfile: async (): Promise<UserProfile> => {
    return api.get<UserProfile>('/users/me');
  },

  /**
   * Update current user's profile
   */
  updateMyProfile: async (request: UpdateUserProfileRequest): Promise<UserProfile> => {
    return api.put<UserProfile>('/users/me', request);
  },

  /**
   * Change password for current user
   */
  changePassword: async (request: ChangePasswordRequest): Promise<void> => {
    return api.post<void>('/users/me/change-password', request);
  },

  /**
   * Upload profile photo
   */
  uploadProfilePhoto: async (file: File): Promise<UploadProfilePhotoResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    return api.post<UploadProfilePhotoResponse>('/users/me/profile-photo', formData);
  },

  /**
   * Delete profile photo
   */
  deleteProfilePhoto: async (): Promise<void> => {
    return api.delete<void>('/users/me/profile-photo');
  },
};
