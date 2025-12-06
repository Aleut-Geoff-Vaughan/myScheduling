import { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import {
  subcontractorCompaniesService,
  subcontractorsService,
  careerJobFamiliesService,
  type SubcontractorCompany,
  type Subcontractor,
  type CareerJobFamily,
  type CreateSubcontractorCompanyDto,
  type UpdateSubcontractorCompanyDto,
  type CreateSubcontractorDto,
  type UpdateSubcontractorDto,
  SubcontractorCompanyStatus,
  SubcontractorStatus,
} from '../services/staffingService';
import toast from 'react-hot-toast';

const CompanyStatusLabels: Record<SubcontractorCompanyStatus, string> = {
  [SubcontractorCompanyStatus.Active]: 'Active',
  [SubcontractorCompanyStatus.Inactive]: 'Inactive',
  [SubcontractorCompanyStatus.Suspended]: 'Suspended',
  [SubcontractorCompanyStatus.Terminated]: 'Terminated',
};

const SubcontractorStatusLabels: Record<SubcontractorStatus, string> = {
  [SubcontractorStatus.Active]: 'Active',
  [SubcontractorStatus.Inactive]: 'Inactive',
  [SubcontractorStatus.Terminated]: 'Terminated',
};

export function AdminSubcontractorCompaniesPage() {
  const { currentWorkspace, availableTenants } = useAuthStore();
  // Use workspace tenantId, or fall back to first available tenant for admin users
  const tenantId = currentWorkspace?.tenantId || availableTenants?.[0]?.tenantId;

  const [companies, setCompanies] = useState<SubcontractorCompany[]>([]);
  const [careerFamilies, setCareerFamilies] = useState<CareerJobFamily[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<SubcontractorCompanyStatus | 'all'>('all');
  const [search, setSearch] = useState('');

  // Company modal state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editingCompany, setEditingCompany] = useState<SubcontractorCompany | null>(null);
  const [isSavingCompany, setIsSavingCompany] = useState(false);

  // Subcontractors view state
  const [selectedCompany, setSelectedCompany] = useState<SubcontractorCompany | null>(null);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [isLoadingSubs, setIsLoadingSubs] = useState(false);

  // Subcontractor modal state
  const [showSubModal, setShowSubModal] = useState(false);
  const [editingSub, setEditingSub] = useState<Subcontractor | null>(null);
  const [isSavingSub, setIsSavingSub] = useState(false);

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: '',
    code: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    phone: '',
    website: '',
    forecastContactName: '',
    forecastContactEmail: '',
    forecastContactPhone: '',
    notes: '',
    contractNumber: '',
    contractStartDate: '',
    contractEndDate: '',
    status: SubcontractorCompanyStatus.Active,
  });

  // Subcontractor form state
  const [subForm, setSubForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    positionTitle: '',
    careerJobFamilyId: '',
    careerLevel: '',
    isForecastSubmitter: false,
    notes: '',
    status: SubcontractorStatus.Active,
  });

  const loadCompanies = async () => {
    if (!tenantId) return;

    setIsLoading(true);
    try {
      const data = await subcontractorCompaniesService.getAll({
        tenantId,
        status: filterStatus === 'all' ? undefined : filterStatus,
        search: search || undefined,
      });
      setCompanies(data);
    } catch {
      toast.error('Failed to load subcontractor companies');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCareerFamilies = async () => {
    if (!tenantId) return;
    try {
      const data = await careerJobFamiliesService.getAll({ tenantId, isActive: true });
      setCareerFamilies(data);
    } catch {
      // Silent fail
    }
  };

  const loadSubcontractors = async (companyId: string) => {
    setIsLoadingSubs(true);
    try {
      const data = await subcontractorCompaniesService.getSubcontractors(companyId);
      setSubcontractors(data);
    } catch {
      toast.error('Failed to load subcontractors');
    } finally {
      setIsLoadingSubs(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    loadCareerFamilies();
  }, [tenantId, filterStatus, search]);

  useEffect(() => {
    if (selectedCompany) {
      loadSubcontractors(selectedCompany.id);
    }
  }, [selectedCompany]);

  // Company handlers
  const handleCreateCompany = () => {
    setEditingCompany(null);
    setCompanyForm({
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      country: '',
      postalCode: '',
      phone: '',
      website: '',
      forecastContactName: '',
      forecastContactEmail: '',
      forecastContactPhone: '',
      notes: '',
      contractNumber: '',
      contractStartDate: '',
      contractEndDate: '',
      status: SubcontractorCompanyStatus.Active,
    });
    setShowCompanyModal(true);
  };

  const handleEditCompany = (company: SubcontractorCompany) => {
    setEditingCompany(company);
    setCompanyForm({
      name: company.name,
      code: company.code || '',
      address: company.address || '',
      city: company.city || '',
      state: company.state || '',
      country: company.country || '',
      postalCode: company.postalCode || '',
      phone: company.phone || '',
      website: company.website || '',
      forecastContactName: company.forecastContactName || '',
      forecastContactEmail: company.forecastContactEmail || '',
      forecastContactPhone: company.forecastContactPhone || '',
      notes: company.notes || '',
      contractNumber: company.contractNumber || '',
      contractStartDate: company.contractStartDate || '',
      contractEndDate: company.contractEndDate || '',
      status: company.status,
    });
    setShowCompanyModal(true);
  };

  const handleSaveCompany = async () => {
    if (!tenantId) return;
    if (!companyForm.name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setIsSavingCompany(true);
    try {
      if (editingCompany) {
        const dto: UpdateSubcontractorCompanyDto = {
          name: companyForm.name,
          code: companyForm.code || undefined,
          address: companyForm.address || undefined,
          city: companyForm.city || undefined,
          state: companyForm.state || undefined,
          country: companyForm.country || undefined,
          postalCode: companyForm.postalCode || undefined,
          phone: companyForm.phone || undefined,
          website: companyForm.website || undefined,
          forecastContactName: companyForm.forecastContactName || undefined,
          forecastContactEmail: companyForm.forecastContactEmail || undefined,
          forecastContactPhone: companyForm.forecastContactPhone || undefined,
          notes: companyForm.notes || undefined,
          contractNumber: companyForm.contractNumber || undefined,
          contractStartDate: companyForm.contractStartDate || undefined,
          contractEndDate: companyForm.contractEndDate || undefined,
          status: companyForm.status,
        };
        await subcontractorCompaniesService.update(editingCompany.id, dto);
        toast.success('Company updated');
      } else {
        const dto: CreateSubcontractorCompanyDto = {
          tenantId,
          name: companyForm.name,
          code: companyForm.code || undefined,
          address: companyForm.address || undefined,
          city: companyForm.city || undefined,
          state: companyForm.state || undefined,
          country: companyForm.country || undefined,
          postalCode: companyForm.postalCode || undefined,
          phone: companyForm.phone || undefined,
          website: companyForm.website || undefined,
          forecastContactName: companyForm.forecastContactName || undefined,
          forecastContactEmail: companyForm.forecastContactEmail || undefined,
          forecastContactPhone: companyForm.forecastContactPhone || undefined,
          notes: companyForm.notes || undefined,
          contractNumber: companyForm.contractNumber || undefined,
          contractStartDate: companyForm.contractStartDate || undefined,
          contractEndDate: companyForm.contractEndDate || undefined,
        };
        await subcontractorCompaniesService.create(dto);
        toast.success('Company created');
      }
      setShowCompanyModal(false);
      loadCompanies();
    } catch {
      toast.error(editingCompany ? 'Failed to update company' : 'Failed to create company');
    } finally {
      setIsSavingCompany(false);
    }
  };

  const handleDeleteCompany = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? This will also delete all associated subcontractors.`)) return;

    try {
      await subcontractorCompaniesService.delete(id);
      toast.success('Company deleted');
      if (selectedCompany?.id === id) {
        setSelectedCompany(null);
        setSubcontractors([]);
      }
      loadCompanies();
    } catch {
      toast.error('Failed to delete company. It may have active subcontractors with assignments.');
    }
  };

  // Subcontractor handlers
  const handleCreateSub = () => {
    setEditingSub(null);
    setSubForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      positionTitle: '',
      careerJobFamilyId: '',
      careerLevel: '',
      isForecastSubmitter: false,
      notes: '',
      status: SubcontractorStatus.Active,
    });
    setShowSubModal(true);
  };

  const handleEditSub = (sub: Subcontractor) => {
    setEditingSub(sub);
    setSubForm({
      firstName: sub.firstName,
      lastName: sub.lastName,
      email: sub.email || '',
      phone: sub.phone || '',
      positionTitle: sub.positionTitle || '',
      careerJobFamilyId: sub.careerJobFamilyId || '',
      careerLevel: sub.careerLevel?.toString() || '',
      isForecastSubmitter: sub.isForecastSubmitter,
      notes: sub.notes || '',
      status: sub.status,
    });
    setShowSubModal(true);
  };

  const handleSaveSub = async () => {
    if (!tenantId || !selectedCompany) return;
    if (!subForm.firstName.trim() || !subForm.lastName.trim()) {
      toast.error('First name and last name are required');
      return;
    }

    setIsSavingSub(true);
    try {
      if (editingSub) {
        const dto: UpdateSubcontractorDto = {
          firstName: subForm.firstName,
          lastName: subForm.lastName,
          email: subForm.email || undefined,
          phone: subForm.phone || undefined,
          positionTitle: subForm.positionTitle || undefined,
          careerJobFamilyId: subForm.careerJobFamilyId || undefined,
          careerLevel: subForm.careerLevel ? parseInt(subForm.careerLevel) : undefined,
          isForecastSubmitter: subForm.isForecastSubmitter,
          notes: subForm.notes || undefined,
          status: subForm.status,
        };
        await subcontractorsService.update(editingSub.id, dto);
        toast.success('Subcontractor updated');
      } else {
        const dto: CreateSubcontractorDto = {
          tenantId,
          subcontractorCompanyId: selectedCompany.id,
          firstName: subForm.firstName,
          lastName: subForm.lastName,
          email: subForm.email || undefined,
          phone: subForm.phone || undefined,
          positionTitle: subForm.positionTitle || undefined,
          careerJobFamilyId: subForm.careerJobFamilyId || undefined,
          careerLevel: subForm.careerLevel ? parseInt(subForm.careerLevel) : undefined,
          isForecastSubmitter: subForm.isForecastSubmitter,
          notes: subForm.notes || undefined,
        };
        await subcontractorsService.create(dto);
        toast.success('Subcontractor created');
      }
      setShowSubModal(false);
      loadSubcontractors(selectedCompany.id);
      loadCompanies(); // Refresh counts
    } catch {
      toast.error(editingSub ? 'Failed to update subcontractor' : 'Failed to create subcontractor');
    } finally {
      setIsSavingSub(false);
    }
  };

  const handleDeleteSub = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await subcontractorsService.delete(id);
      toast.success('Subcontractor deleted');
      if (selectedCompany) {
        loadSubcontractors(selectedCompany.id);
        loadCompanies(); // Refresh counts
      }
    } catch {
      toast.error('Failed to delete subcontractor. They may have active assignments.');
    }
  };

  const getStatusColor = (status: SubcontractorCompanyStatus | SubcontractorStatus) => {
    switch (status) {
      case SubcontractorCompanyStatus.Active:
      case SubcontractorStatus.Active:
        return 'bg-green-100 text-green-800';
      case SubcontractorCompanyStatus.Inactive:
      case SubcontractorStatus.Inactive:
        return 'bg-gray-100 text-gray-800';
      case SubcontractorCompanyStatus.Suspended:
        return 'bg-yellow-100 text-yellow-800';
      case SubcontractorCompanyStatus.Terminated:
      case SubcontractorStatus.Terminated:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!tenantId) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800">
          Please select a workspace to manage subcontractor companies.
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subcontractor Companies</h1>
          <p className="mt-1 text-sm text-gray-600">
            Manage vendor companies and their subcontractor resources.
          </p>
        </div>
        <button
          onClick={handleCreateCompany}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
        >
          Add Company
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Companies List */}
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search companies..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus === 'all' ? 'all' : filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value === 'all' ? 'all' : (parseInt(e.target.value) as SubcontractorCompanyStatus))
                  }
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  {Object.entries(CompanyStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Companies Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading companies...</div>
            ) : companies.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <p className="mb-2">No companies found.</p>
                <p className="text-sm">Click "Add Company" to create one.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {companies.map((company) => (
                  <div
                    key={company.id}
                    className={`p-4 cursor-pointer hover:bg-gray-50 ${
                      selectedCompany?.id === company.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                    onClick={() => setSelectedCompany(company)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-gray-900">{company.name}</h3>
                          {company.code && (
                            <span className="text-xs text-gray-500">({company.code})</span>
                          )}
                        </div>
                        {company.city && company.state && (
                          <p className="text-sm text-gray-500">
                            {company.city}, {company.state}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                              company.status
                            )}`}
                          >
                            {CompanyStatusLabels[company.status]}
                          </span>
                          <span className="text-xs text-gray-500">
                            {company.subcontractorCount} subcontractor{company.subcontractorCount !== 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleEditCompany(company)}
                          className="text-blue-600 hover:text-blue-900 text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCompany(company.id, company.name)}
                          className="text-red-600 hover:text-red-900 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Subcontractors Panel */}
        <div className="space-y-4">
          {selectedCompany ? (
            <>
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedCompany.name} - Subcontractors
                    </h2>
                    <p className="text-sm text-gray-500">
                      Manage individual subcontractors for this company
                    </p>
                  </div>
                  <button
                    onClick={handleCreateSub}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Add Subcontractor
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow overflow-hidden">
                {isLoadingSubs ? (
                  <div className="p-8 text-center text-gray-500">Loading subcontractors...</div>
                ) : subcontractors.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <p className="mb-2">No subcontractors found.</p>
                    <p className="text-sm">Click "Add Subcontractor" to create one.</p>
                  </div>
                ) : (
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Position</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {subcontractors.map((sub) => (
                        <tr key={sub.id}>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="font-medium text-gray-900">
                              {sub.firstName} {sub.lastName}
                            </div>
                            {sub.email && <div className="text-xs text-gray-500">{sub.email}</div>}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                            {sub.positionTitle || '-'}
                            {sub.careerJobFamilyName && (
                              <div className="text-xs text-gray-400">{sub.careerJobFamilyName}</div>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                                sub.status
                              )}`}
                            >
                              {SubcontractorStatusLabels[sub.status]}
                            </span>
                            {sub.isForecastSubmitter && (
                              <span className="ml-1 inline-flex items-center px-2 py-0.5 rounded text-xs bg-purple-100 text-purple-800">
                                Forecast
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                            <button
                              onClick={() => handleEditSub(sub)}
                              className="text-blue-600 hover:text-blue-900 mr-2"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteSub(sub.id, `${sub.firstName} ${sub.lastName}`)}
                              className="text-red-600 hover:text-red-900"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <p>Select a company to view and manage its subcontractors</p>
            </div>
          )}
        </div>
      </div>

      {/* Company Modal */}
      {showCompanyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingCompany ? 'Edit Company' : 'Add Company'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={companyForm.name}
                    onChange={(e) => setCompanyForm({ ...companyForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
                  <input
                    type="text"
                    value={companyForm.code}
                    onChange={(e) => setCompanyForm({ ...companyForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={companyForm.address}
                  onChange={(e) => setCompanyForm({ ...companyForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    type="text"
                    value={companyForm.city}
                    onChange={(e) => setCompanyForm({ ...companyForm, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                  <input
                    type="text"
                    value={companyForm.state}
                    onChange={(e) => setCompanyForm({ ...companyForm, state: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input
                    type="text"
                    value={companyForm.postalCode}
                    onChange={(e) => setCompanyForm({ ...companyForm, postalCode: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                  <input
                    type="text"
                    value={companyForm.country}
                    onChange={(e) => setCompanyForm({ ...companyForm, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={companyForm.phone}
                    onChange={(e) => setCompanyForm({ ...companyForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input
                    type="text"
                    value={companyForm.website}
                    onChange={(e) => setCompanyForm({ ...companyForm, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Forecast Contact</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                    <input
                      type="text"
                      value={companyForm.forecastContactName}
                      onChange={(e) => setCompanyForm({ ...companyForm, forecastContactName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input
                      type="email"
                      value={companyForm.forecastContactEmail}
                      onChange={(e) => setCompanyForm({ ...companyForm, forecastContactEmail: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input
                      type="text"
                      value={companyForm.forecastContactPhone}
                      onChange={(e) => setCompanyForm({ ...companyForm, forecastContactPhone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Contract Information</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contract Number</label>
                    <input
                      type="text"
                      value={companyForm.contractNumber}
                      onChange={(e) => setCompanyForm({ ...companyForm, contractNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={companyForm.contractStartDate}
                      onChange={(e) => setCompanyForm({ ...companyForm, contractStartDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                      type="date"
                      value={companyForm.contractEndDate}
                      onChange={(e) => setCompanyForm({ ...companyForm, contractEndDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={companyForm.notes}
                  onChange={(e) => setCompanyForm({ ...companyForm, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {editingCompany && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={companyForm.status}
                    onChange={(e) =>
                      setCompanyForm({ ...companyForm, status: parseInt(e.target.value) as SubcontractorCompanyStatus })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(CompanyStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCompanyModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCompany}
                disabled={isSavingCompany}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingCompany ? 'Saving...' : editingCompany ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subcontractor Modal */}
      {showSubModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editingSub ? 'Edit Subcontractor' : 'Add Subcontractor'}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subForm.firstName}
                    onChange={(e) => setSubForm({ ...subForm, firstName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={subForm.lastName}
                    onChange={(e) => setSubForm({ ...subForm, lastName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={subForm.email}
                    onChange={(e) => setSubForm({ ...subForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input
                    type="text"
                    value={subForm.phone}
                    onChange={(e) => setSubForm({ ...subForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Position Title</label>
                <input
                  type="text"
                  value={subForm.positionTitle}
                  onChange={(e) => setSubForm({ ...subForm, positionTitle: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Career Job Family</label>
                  <select
                    value={subForm.careerJobFamilyId}
                    onChange={(e) => setSubForm({ ...subForm, careerJobFamilyId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select...</option>
                    {careerFamilies.map((family) => (
                      <option key={family.id} value={family.id}>
                        {family.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Career Level</label>
                  <input
                    type="number"
                    value={subForm.careerLevel}
                    onChange={(e) => setSubForm({ ...subForm, careerLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    min="1"
                    max="10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={subForm.notes}
                  onChange={(e) => setSubForm({ ...subForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={subForm.isForecastSubmitter}
                  onChange={(e) => setSubForm({ ...subForm, isForecastSubmitter: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Can submit forecasts for company</span>
              </label>

              {editingSub && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={subForm.status}
                    onChange={(e) =>
                      setSubForm({ ...subForm, status: parseInt(e.target.value) as SubcontractorStatus })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(SubcontractorStatusLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowSubModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSub}
                disabled={isSavingSub}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingSub ? 'Saving...' : editingSub ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
