import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardBody } from '../components/ui';
import { userProfileService } from '../services/userProfileService';
import toast from 'react-hot-toast';
import type { UserProfile, UpdateUserProfileRequest, ChangePasswordRequest } from '../types/user';
import { useAuthStore } from '../stores/authStore';
import { usePeople } from '../hooks/usePeople';
import { useOffices } from '../hooks/useOffices';
import Cropper from 'react-easy-crop';
import { getCroppedImage } from '../utils/cropImage';

export function UserProfilePage() {
  const { user, setUser, currentWorkspace } = useAuthStore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile form state
  const [profileForm, setProfileForm] = useState<UpdateUserProfileRequest>({
    displayName: '',
    managerId: '',
    department: '',
    jobTitle: '',
    phoneNumber: '',
    homeOfficeId: '',
    executiveAssistantId: '',
    standardDelegateIds: [],
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState<ChangePasswordRequest>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropping, setIsCropping] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const { data: peopleOptions = [] } = usePeople({
    tenantId: currentWorkspace?.tenantId,
  });

  const { data: offices = [] } = useOffices({
    tenantId: currentWorkspace?.tenantId,
  });

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const data = await userProfileService.getMyProfile();
      setProfile(data);
      setProfileForm({
        displayName: data.displayName,
        managerId: data.managerId || '',
        department: data.department || '',
        jobTitle: data.jobTitle || '',
        phoneNumber: data.phoneNumber || '',
        homeOfficeId: data.homeOfficeId || '',
        executiveAssistantId: data.executiveAssistantId || '',
        standardDelegateIds: data.standardDelegateIds || [],
      });
    } catch (error: any) {
      toast.error(error.message || 'Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updatedProfile = await userProfileService.updateMyProfile(profileForm);
      setProfile(updatedProfile);

      // Update auth store with new display name
      if (user) {
        setUser({ ...user, displayName: updatedProfile.displayName });
      }

      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const validatePassword = (): boolean => {
    const errors: string[] = [];

    if (!passwordForm.currentPassword) {
      errors.push('Current password is required');
    }

    if (!passwordForm.newPassword) {
      errors.push('New password is required');
    } else {
      if (passwordForm.newPassword.length < 8) {
        errors.push('Password must be at least 8 characters long');
      }
      if (!/[A-Z]/.test(passwordForm.newPassword)) {
        errors.push('Password must contain at least one uppercase letter');
      }
      if (!/[a-z]/.test(passwordForm.newPassword)) {
        errors.push('Password must contain at least one lowercase letter');
      }
      if (!/[0-9]/.test(passwordForm.newPassword)) {
        errors.push('Password must contain at least one number');
      }
      if (!/[!@#$%^&*(),.?":{}|<>]/.test(passwordForm.newPassword)) {
        errors.push('Password must contain at least one special character');
      }
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errors.push('New password and confirmation do not match');
    }

    setPasswordErrors(errors);
    return errors.length === 0;
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) {
      return;
    }

    setIsSaving(true);

    try {
      await userProfileService.changePassword(passwordForm);
      toast.success('Password changed successfully');
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      setPasswordErrors([]);
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCropImage(reader.result as string);
      setIsCropping(true);
    };
    reader.readAsDataURL(file);
  };

  const handlePhotoDelete = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return;

    try {
      await userProfileService.deleteProfilePhoto();
      setProfile(prev => prev ? { ...prev, profilePhotoUrl: undefined } : null);

      // Update auth store
      if (user) {
        setUser({ ...user, profilePhotoUrl: undefined });
      }

      toast.success('Profile photo removed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove photo');
    }
  };

  const onCropComplete = (_: any, croppedPixels: any) => {
    setCroppedAreaPixels(croppedPixels);
  };

  const handleCropSave = async () => {
    if (!cropImage || !croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const croppedBlob = await getCroppedImage(cropImage, croppedAreaPixels);
      const file = new File([croppedBlob], 'profile.jpg', { type: 'image/jpeg' });
      const response = await userProfileService.uploadProfilePhoto(file);
      setProfile((prev) => (prev ? { ...prev, profilePhotoUrl: response.profilePhotoUrl } : null));
      if (user) {
        setUser({ ...user, profilePhotoUrl: response.profilePhotoUrl });
      }
      toast.success('Profile photo updated successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload photo');
    } finally {
      setIsSaving(false);
      setIsCropping(false);
      setCropImage(null);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 mt-4">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
      <div className="p-6 max-w-4xl mx-auto">
      {isCropping && cropImage && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Crop Profile Photo</h3>
            <div className="relative w-full h-80 bg-gray-900 rounded-lg overflow-hidden">
              <Cropper
                image={cropImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            </div>
            <div className="flex items-center justify-between mt-4">
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsCropping(false);
                    setCropImage(null);
                  }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCropSave}
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">Manage your account settings and preferences</p>
      </div>

      {/* Profile Photo Section */}
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center gap-6">
            <div className="relative">
              {profile.profilePhotoUrl ? (
                <img
                  src={profile.profilePhotoUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-primary-100 flex items-center justify-center border-2 border-gray-200">
                  <span className="text-3xl font-semibold text-primary-700">
                    {profile.displayName.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900">{profile.displayName}</h3>
              <p className="text-sm text-gray-600">{profile.email}</p>
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Upload Photo
                </button>
                {profile.profilePhotoUrl && (
                  <button
                    onClick={handlePhotoDelete}
                    className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                  >
                    Remove Photo
                  </button>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                JPG, PNG or GIF. Max size 5MB.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'profile'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === 'password'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Change Password
            </button>
          </div>
        </div>
      </div>

      {/* Profile Information Tab */}
      {activeTab === 'profile' && (
        <Card>
          <CardHeader title="Profile Information" subtitle="Update your personal information" />
          <CardBody>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Display Name *
                </label>
                <input
                  type="text"
                  value={profileForm.displayName}
                  onChange={(e) => setProfileForm({ ...profileForm, displayName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Email address cannot be changed
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={profileForm.department}
                  onChange={(e) => setProfileForm({ ...profileForm, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Engineering, Sales, Marketing"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={profileForm.jobTitle}
                  onChange={(e) => setProfileForm({ ...profileForm, jobTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Software Engineer, Account Manager"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Manager
                </label>
                <select
                  value={profileForm.managerId || ''}
                  onChange={(e) => setProfileForm({ ...profileForm, managerId: e.target.value || undefined })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No manager</option>
                  {peopleOptions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.displayName} {p.jobTitle ? `— ${p.jobTitle}` : ''}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Visible to your organization for hierarchy and team views.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileForm.phoneNumber}
                  onChange={(e) => setProfileForm({ ...profileForm, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(555) 123-4567"
                />
              </div>

              {/* Work Location Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Work Location Settings</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Home Office
                  </label>
                  <select
                    value={profileForm.homeOfficeId || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, homeOfficeId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Select home office"
                  >
                    <option value="">No home office</option>
                    {offices.map((office) => (
                      <option key={office.id} value={office.id}>
                        {office.name} {office.city ? `— ${office.city}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Your default office location when working in-office.
                  </p>
                </div>
              </div>

              {/* Delegation Settings */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Delegation Settings</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Executive Assistant (EA)
                  </label>
                  <select
                    value={profileForm.executiveAssistantId || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, executiveAssistantId: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Select executive assistant"
                  >
                    <option value="">No EA assigned</option>
                    {peopleOptions.filter(p => p.id !== user?.id).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.displayName} {p.jobTitle ? `— ${p.jobTitle}` : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Your EA can manage your calendar and schedule on your behalf.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Standard Delegates
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 min-h-[100px] bg-gray-50">
                    {/* Selected delegates */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {(profileForm.standardDelegateIds || []).map((delegateId) => {
                        const delegate = peopleOptions.find(p => p.id === delegateId);
                        return delegate ? (
                          <span
                            key={delegateId}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                          >
                            {delegate.displayName}
                            <button
                              type="button"
                              onClick={() => setProfileForm({
                                ...profileForm,
                                standardDelegateIds: (profileForm.standardDelegateIds || []).filter(id => id !== delegateId)
                              })}
                              className="ml-1 hover:text-blue-600"
                              title={`Remove ${delegate.displayName}`}
                              aria-label={`Remove ${delegate.displayName} from delegates`}
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </span>
                        ) : null;
                      })}
                    </div>
                    {/* Add delegate dropdown */}
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value && !(profileForm.standardDelegateIds || []).includes(e.target.value)) {
                          setProfileForm({
                            ...profileForm,
                            standardDelegateIds: [...(profileForm.standardDelegateIds || []), e.target.value]
                          });
                        }
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      title="Add standard delegate"
                      aria-label="Add standard delegate"
                    >
                      <option value="">+ Add delegate...</option>
                      {peopleOptions
                        .filter(p => p.id !== user?.id && !(profileForm.standardDelegateIds || []).includes(p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.displayName} {p.jobTitle ? `— ${p.jobTitle}` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Standard delegates can view your schedule and make limited changes.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={fetchProfile}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Change Password Tab */}
      {activeTab === 'password' && (
        <Card>
          <CardHeader title="Change Password" subtitle="Update your password to keep your account secure" />
          <CardBody>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              {passwordErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-red-800 mb-2">
                    Please fix the following errors:
                  </h4>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    {passwordErrors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Current Password *
                </label>
                <input
                  id="current-password"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
                  New Password *
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              <div>
                <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm New Password *
                </label>
                <input
                  id="confirm-password"
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    setPasswordForm({
                      currentPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                    setPasswordErrors([]);
                  }}
                  disabled={isSaving}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-700 transition disabled:opacity-50"
                >
                  {isSaving ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            </form>
          </CardBody>
        </Card>
      )}

      {/* Account Information */}
      <Card className="mt-6">
        <CardHeader title="Account Information" subtitle="Read-only account details" />
        <CardBody>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Account Status</p>
              <p className="font-medium text-gray-900">
                {profile.isActive ? (
                  <span className="text-green-600">Active</span>
                ) : (
                  <span className="text-red-600">Inactive</span>
                )}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Member Since</p>
              <p className="font-medium text-gray-900">
                {new Date(profile.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>
            </div>
            {profile.lastLoginAt && (
              <div>
                <p className="text-gray-600">Last Login</p>
                <p className="font-medium text-gray-900">
                  {new Date(profile.lastLoginAt).toLocaleString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-600">Roles</p>
              <div className="flex flex-wrap gap-1 mt-1">
                {currentWorkspace?.roles && currentWorkspace.roles.length > 0 ? (
                  currentWorkspace.roles.map((role, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {role}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-500">No roles assigned</span>
                )}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
