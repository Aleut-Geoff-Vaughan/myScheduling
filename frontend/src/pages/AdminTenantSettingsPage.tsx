import { useState, useEffect, useRef } from 'react';
import {
  useTenantSettings,
  useUpdateTenantSettings,
  useUploadLogo,
} from '../hooks/useTenantSettings';
import type { UpdateTenantSettingsRequest } from '../types/doa';
import toast from 'react-hot-toast';

export function AdminTenantSettingsPage() {
  const { data: settings, isLoading } = useTenantSettings();
  const updateMutation = useUpdateTenantSettings();
  const uploadLogoMutation = useUploadLogo();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<UpdateTenantSettingsRequest>({});
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        logoUrl: settings.logoUrl,
        logoFileName: settings.logoFileName,
        logoWidth: settings.logoWidth,
        logoHeight: settings.logoHeight,
        doaPrintHeaderContent: settings.doaPrintHeaderContent,
        doaPrintFooterContent: settings.doaPrintFooterContent,
        doaPrintLetterhead: settings.doaPrintLetterhead,
        companyName: settings.companyName,
        companyAddress: settings.companyAddress,
        companyPhone: settings.companyPhone,
        companyEmail: settings.companyEmail,
        companyWebsite: settings.companyWebsite,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        fontFamily: settings.fontFamily,
        fontSize: settings.fontSize,
        environmentName: settings.environmentName,
        showEnvironmentBanner: settings.showEnvironmentBanner,
        notificationBannerEnabled: settings.notificationBannerEnabled,
        notificationBannerMessage: settings.notificationBannerMessage,
        notificationBannerType: settings.notificationBannerType,
        notificationBannerExpiresAt: settings.notificationBannerExpiresAt,
        fiscalYearStartMonth: settings.fiscalYearStartMonth,
        requireBudgetApproval: settings.requireBudgetApproval,
        defaultBudgetMonthsAhead: settings.defaultBudgetMonthsAhead,
      });
      if (settings.logoUrl) {
        setLogoPreview(settings.logoUrl);
      }
    }
  }, [settings]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PNG, JPEG, and SVG files are allowed');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('File size must be less than 2MB');
      return;
    }

    try {
      const result = await uploadLogoMutation.mutateAsync(file);
      setLogoPreview(result.logoUrl);
      setFormData({ ...formData, logoUrl: result.logoUrl });
      toast.success('Logo uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload logo');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync(formData);
      toast.success('Settings updated successfully');
    } catch (error) {
      toast.error('Failed to update settings');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="animate-pulse text-gray-500">Loading settings...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tenant Settings</h1>
        <p className="mt-1 text-sm text-gray-600">
          Configure your organization's branding, company information, and print templates
        </p>
      </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Logo Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Logo & Branding</h2>
            <div className="space-y-4">
              {/* Logo Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Logo
                </label>
                <div className="flex items-start gap-4">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    {logoPreview ? (
                      <div className="w-32 h-32 border-2 border-gray-300 rounded-lg overflow-hidden flex items-center justify-center bg-gray-50">
                        <img
                          src={logoPreview}
                          alt="Company Logo"
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
                        <span className="text-sm text-gray-400">No logo</span>
                      </div>
                    )}
                  </div>

                  {/* Upload Button */}
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadLogoMutation.isPending}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadLogoMutation.isPending ? 'Uploading...' : 'Upload Logo'}
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                      PNG, JPEG, or SVG. Max file size 2MB.
                    </p>
                  </div>
                </div>
              </div>

              {/* Logo Dimensions */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo Width (px)
                  </label>
                  <input
                    type="number"
                    value={formData.logoWidth || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, logoWidth: parseInt(e.target.value) || undefined })
                    }
                    placeholder="Auto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Logo Height (px)
                  </label>
                  <input
                    type="number"
                    value={formData.logoHeight || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, logoHeight: parseInt(e.target.value) || undefined })
                    }
                    placeholder="Auto"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Company Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  placeholder="Your Company Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Address
                </label>
                <textarea
                  value={formData.companyAddress || ''}
                  onChange={(e) => setFormData({ ...formData, companyAddress: e.target.value })}
                  placeholder="123 Main Street&#10;City, State ZIP"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.companyPhone || ''}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    placeholder="(555) 123-4567"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.companyEmail || ''}
                    onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                    placeholder="info@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.companyWebsite || ''}
                  onChange={(e) => setFormData({ ...formData, companyWebsite: e.target.value })}
                  placeholder="https://www.company.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* DOA Print Template Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              DOA Print Template Configuration
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Print Header Content
                </label>
                <textarea
                  value={formData.doaPrintHeaderContent || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, doaPrintHeaderContent: e.target.value })
                  }
                  placeholder="Header text that appears at the top of printed DOA letters..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Print Footer Content
                </label>
                <textarea
                  value={formData.doaPrintFooterContent || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, doaPrintFooterContent: e.target.value })
                  }
                  placeholder="Footer text that appears at the bottom of printed DOA letters..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Letterhead Content
                </label>
                <textarea
                  value={formData.doaPrintLetterhead || ''}
                  onChange={(e) =>
                    setFormData({ ...formData, doaPrintLetterhead: e.target.value })
                  }
                  placeholder="Custom letterhead content (HTML supported)..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">
                  You can use HTML for custom formatting
                </p>
              </div>
            </div>
          </div>

          {/* Environment & Notification Banner */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Environment & Notification Banner
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure environment indicators and system-wide notification banners that appear at the top of the application.
            </p>

            <div className="space-y-6">
              {/* Environment Banner Settings */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Environment Banner</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="showEnvironmentBanner"
                      checked={formData.showEnvironmentBanner || false}
                      onChange={(e) =>
                        setFormData({ ...formData, showEnvironmentBanner: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="showEnvironmentBanner" className="text-sm text-gray-700">
                      Show environment banner (for non-production environments)
                    </label>
                  </div>

                  <div>
                    <label htmlFor="environmentName" className="block text-sm font-medium text-gray-700 mb-1">
                      Environment Name
                    </label>
                    <select
                      id="environmentName"
                      value={formData.environmentName || ''}
                      onChange={(e) => setFormData({ ...formData, environmentName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select environment...</option>
                      <option value="Development">Development</option>
                      <option value="Test">Test</option>
                      <option value="Staging">Staging</option>
                      <option value="UAT">UAT</option>
                      <option value="Production">Production</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      The environment banner will only show for non-production environments
                    </p>
                  </div>
                </div>
              </div>

              {/* Notification Banner Settings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Notification Banner</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="notificationBannerEnabled"
                      checked={formData.notificationBannerEnabled || false}
                      onChange={(e) =>
                        setFormData({ ...formData, notificationBannerEnabled: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="notificationBannerEnabled" className="text-sm text-gray-700">
                      Enable notification banner
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Banner Message
                    </label>
                    <textarea
                      value={formData.notificationBannerMessage || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, notificationBannerMessage: e.target.value })
                      }
                      placeholder="Enter the notification message to display to all users..."
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="notificationBannerType" className="block text-sm font-medium text-gray-700 mb-1">
                        Banner Type
                      </label>
                      <select
                        id="notificationBannerType"
                        value={formData.notificationBannerType || 'info'}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notificationBannerType: e.target.value as 'info' | 'warning' | 'error' | 'success',
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="info">Info (Blue)</option>
                        <option value="warning">Warning (Yellow)</option>
                        <option value="error">Error (Red)</option>
                        <option value="success">Success (Green)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="notificationBannerExpiresAt" className="block text-sm font-medium text-gray-700 mb-1">
                        Expires At (Optional)
                      </label>
                      <input
                        id="notificationBannerExpiresAt"
                        type="datetime-local"
                        value={
                          formData.notificationBannerExpiresAt
                            ? new Date(formData.notificationBannerExpiresAt).toISOString().slice(0, 16)
                            : ''
                        }
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            notificationBannerExpiresAt: e.target.value
                              ? new Date(e.target.value).toISOString()
                              : undefined,
                          })
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        Leave empty for no expiration
                      </p>
                    </div>
                  </div>

                  {/* Preview */}
                  {formData.notificationBannerEnabled && formData.notificationBannerMessage && (
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preview
                      </label>
                      <div
                        className={`rounded-lg px-4 py-3 flex items-center gap-3 ${
                          formData.notificationBannerType === 'warning'
                            ? 'bg-yellow-50 border border-yellow-200'
                            : formData.notificationBannerType === 'error'
                            ? 'bg-red-50 border border-red-200'
                            : formData.notificationBannerType === 'success'
                            ? 'bg-green-50 border border-green-200'
                            : 'bg-blue-50 border border-blue-200'
                        }`}
                      >
                        <span
                          className={`text-sm font-medium ${
                            formData.notificationBannerType === 'warning'
                              ? 'text-yellow-800'
                              : formData.notificationBannerType === 'error'
                              ? 'text-red-800'
                              : formData.notificationBannerType === 'success'
                              ? 'text-green-800'
                              : 'text-blue-800'
                          }`}
                        >
                          {formData.notificationBannerMessage}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Fiscal Year & Budget Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Fiscal Year & Budget Configuration
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Configure your organization's fiscal year and budget management settings.
            </p>

            <div className="space-y-6">
              {/* Fiscal Year Settings */}
              <div className="border-b border-gray-200 pb-6">
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Fiscal Year</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="fiscalYearStartMonth" className="block text-sm font-medium text-gray-700 mb-1">
                      Fiscal Year Start Month
                    </label>
                    <select
                      id="fiscalYearStartMonth"
                      value={formData.fiscalYearStartMonth || 1}
                      onChange={(e) => setFormData({ ...formData, fiscalYearStartMonth: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={1}>January (Calendar Year: Jan - Dec)</option>
                      <option value={2}>February (Feb - Jan)</option>
                      <option value={3}>March (Mar - Feb)</option>
                      <option value={4}>April (Apr - Mar)</option>
                      <option value={5}>May (May - Apr)</option>
                      <option value={6}>June (Jun - May)</option>
                      <option value={7}>July (Jul - Jun)</option>
                      <option value={8}>August (Aug - Jul)</option>
                      <option value={9}>September (Sep - Aug)</option>
                      <option value={10}>October (US Federal: Oct - Sep)</option>
                      <option value={11}>November (Nov - Oct)</option>
                      <option value={12}>December (Dec - Nov)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      This determines how budgets and fiscal year reporting are calculated
                    </p>
                  </div>

                  {/* Preview of current fiscal year */}
                  {formData.fiscalYearStartMonth && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-700">
                        <span className="font-medium">Current Fiscal Year: </span>
                        {(() => {
                          const startMonth = formData.fiscalYearStartMonth || 1;
                          const today = new Date();
                          const currentMonth = today.getMonth() + 1;
                          const currentYear = today.getFullYear();

                          let fiscalYear: number;
                          if (startMonth === 1) {
                            fiscalYear = currentYear;
                          } else if (currentMonth >= startMonth) {
                            fiscalYear = currentYear + 1;
                          } else {
                            fiscalYear = currentYear;
                          }

                          const startYear = startMonth === 1 ? fiscalYear : fiscalYear - 1;
                          const endYear = startMonth === 1 ? fiscalYear : fiscalYear;
                          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                          const startMonthName = monthNames[startMonth - 1];
                          const endMonth = startMonth === 1 ? 12 : startMonth - 1;
                          const endMonthName = monthNames[endMonth - 1];

                          if (startMonth === 1) {
                            return `Calendar Year ${fiscalYear} (${startMonthName} ${startYear} - ${endMonthName} ${endYear})`;
                          }
                          return `FY${fiscalYear} (${startMonthName} ${startYear} - ${endMonthName} ${endYear})`;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Budget Settings */}
              <div>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">Budget Settings</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="requireBudgetApproval"
                      checked={formData.requireBudgetApproval || false}
                      onChange={(e) =>
                        setFormData({ ...formData, requireBudgetApproval: e.target.checked })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="requireBudgetApproval" className="text-sm text-gray-700">
                      Require approval for budget changes
                    </label>
                  </div>
                  <p className="ml-7 text-xs text-gray-500">
                    When enabled, budgets must be submitted and approved before becoming active
                  </p>

                  <div>
                    <label htmlFor="defaultBudgetMonthsAhead" className="block text-sm font-medium text-gray-700 mb-1">
                      Default Budget Planning Horizon
                    </label>
                    <select
                      id="defaultBudgetMonthsAhead"
                      value={formData.defaultBudgetMonthsAhead || 12}
                      onChange={(e) => setFormData({ ...formData, defaultBudgetMonthsAhead: parseInt(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value={6}>6 months</option>
                      <option value={12}>12 months (1 year)</option>
                      <option value={18}>18 months</option>
                      <option value={24}>24 months (2 years)</option>
                      <option value={36}>36 months (3 years)</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      How far into the future users can create budgets by default
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Styling Options */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Styling Options</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.primaryColor || '#3B82F6'}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.primaryColor || ''}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                      placeholder="#3B82F6"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Secondary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={formData.secondaryColor || '#64748B'}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      className="w-12 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={formData.secondaryColor || ''}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                      placeholder="#64748B"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Family
                  </label>
                  <select
                    value={formData.fontFamily || 'Arial, sans-serif'}
                    onChange={(e) => setFormData({ ...formData, fontFamily: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Times New Roman', serif">Times New Roman</option>
                    <option value="'Courier New', monospace">Courier New</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Font Size (pt)
                  </label>
                  <input
                    type="number"
                    value={formData.fontSize || 12}
                    onChange={(e) =>
                      setFormData({ ...formData, fontSize: parseInt(e.target.value) || 12 })
                    }
                    min="8"
                    max="24"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={updateMutation.isPending}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
