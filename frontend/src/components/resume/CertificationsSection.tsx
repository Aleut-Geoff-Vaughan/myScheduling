import { useState } from 'react';
import { Plus, Edit2, Trash2, Award, Calendar, AlertTriangle, X } from 'lucide-react';
import { format, parseISO, isPast, addMonths } from 'date-fns';
import type { Certification, PersonCertification } from '../../services/certificationsService';

interface CertificationsSectionProps {
  certifications: PersonCertification[];
  availableCertifications: Certification[];
  isEditable?: boolean;
  onAdd?: (data: {
    certificationId?: string;
    certificationName?: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
  }) => Promise<void>;
  onUpdate?: (personCertificationId: string, data: {
    issueDate?: string;
    expiryDate?: string;
    clearExpiryDate?: boolean;
    credentialId?: string;
  }) => Promise<void>;
  onDelete?: (personCertificationId: string) => Promise<void>;
}

// Group certifications by issuer for display
const COMMON_ISSUERS = [
  'Amazon Web Services (AWS)',
  'Microsoft',
  'Google Cloud',
  'CompTIA',
  'Cisco',
  'Oracle',
  'Salesforce',
  'PMI',
  'ISACA',
  '(ISC)²'
];

export function CertificationsSection({
  certifications,
  availableCertifications,
  isEditable = false,
  onAdd,
  onUpdate,
  onDelete
}: CertificationsSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCertification, setEditingCertification] = useState<PersonCertification | null>(null);

  // Sort by date (most recent first), active before expired
  const sortedCertifications = [...certifications].sort((a, b) => {
    const aExpired = a.expiryDate && isPast(parseISO(a.expiryDate));
    const bExpired = b.expiryDate && isPast(parseISO(b.expiryDate));
    if (aExpired !== bExpired) return aExpired ? 1 : -1;

    const dateA = a.issueDate ? new Date(a.issueDate) : new Date(0);
    const dateB = b.issueDate ? new Date(b.issueDate) : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  // Group by issuer
  const groupedCertifications = sortedCertifications.reduce((acc, cert) => {
    const issuer = cert.issuer || 'Other';
    if (!acc[issuer]) {
      acc[issuer] = [];
    }
    acc[issuer].push(cert);
    return acc;
  }, {} as Record<string, PersonCertification[]>);

  // Sort issuers - common ones first, then alphabetically
  const sortedIssuers = Object.keys(groupedCertifications).sort((a, b) => {
    const indexA = COMMON_ISSUERS.indexOf(a);
    const indexB = COMMON_ISSUERS.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this certification?')) {
      await onDelete?.(id);
    }
  };

  const getExpiryStatus = (expiryDate?: string) => {
    if (!expiryDate) return { label: 'No Expiration', color: 'text-green-600', bg: 'bg-green-50' };
    const date = parseISO(expiryDate);
    if (isPast(date)) return { label: 'Expired', color: 'text-red-600', bg: 'bg-red-50', icon: AlertTriangle };
    const threeMonthsFromNow = addMonths(new Date(), 3);
    if (date <= threeMonthsFromNow) {
      return { label: 'Expiring Soon', color: 'text-yellow-600', bg: 'bg-yellow-50', icon: AlertTriangle };
    }
    return { label: 'Active', color: 'text-green-600', bg: 'bg-green-50' };
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Award className="w-5 h-5 text-blue-600" />
          Certifications
        </h2>
        {isEditable && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Certification
          </button>
        )}
      </div>

      {certifications.length === 0 ? (
        <div className="text-center py-8">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {isEditable
              ? 'No certifications added yet. Click "Add Certification" to get started.'
              : 'No certifications listed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedIssuers.map((issuer) => (
            <div key={issuer}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {issuer}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedCertifications[issuer].map((cert) => (
                  <CertificationCard
                    key={cert.id}
                    certification={cert}
                    isEditable={isEditable}
                    expiryStatus={getExpiryStatus(cert.expiryDate)}
                    onEdit={() => setEditingCertification(cert)}
                    onDelete={() => handleDelete(cert.id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Expiry Legend */}
      {certifications.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Status Legend</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-sm text-gray-600">Active / No Expiration</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-sm text-gray-600">Expiring within 3 months</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-gray-600">Expired</span>
            </div>
          </div>
        </div>
      )}

      {/* Add Certification Modal */}
      {showAddModal && (
        <AddCertificationModal
          onSave={async (data) => {
            await onAdd?.(data);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
          availableCertifications={availableCertifications}
          existingCertificationIds={certifications.map(c => c.certificationId)}
        />
      )}

      {/* Edit Certification Modal */}
      {editingCertification && (
        <EditCertificationModal
          certification={editingCertification}
          onSave={async (data) => {
            await onUpdate?.(editingCertification.id, data);
            setEditingCertification(null);
          }}
          onClose={() => setEditingCertification(null)}
        />
      )}
    </div>
  );
}

// Certification Card Component
interface CertificationCardProps {
  certification: PersonCertification;
  isEditable: boolean;
  expiryStatus: { label: string; color: string; bg: string; icon?: typeof AlertTriangle };
  onEdit: () => void;
  onDelete: () => void;
}

function CertificationCard({ certification, isEditable, expiryStatus, onEdit, onDelete }: CertificationCardProps) {
  const isExpired = certification.expiryDate && isPast(parseISO(certification.expiryDate));
  const StatusIcon = expiryStatus.icon;

  return (
    <div
      className={`relative group p-4 rounded-lg border ${
        isExpired ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'
      } transition-colors`}
    >
      <div className="flex items-start gap-4">
        {/* Certificate Icon */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
          isExpired ? 'bg-gray-200' : 'bg-gradient-to-br from-amber-400 to-orange-500'
        }`}>
          <Award className={`w-6 h-6 ${isExpired ? 'text-gray-500' : 'text-white'}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-semibold ${isExpired ? 'text-gray-500' : 'text-gray-900'}`}>
              {certification.certificationName}
            </h3>
            <span className={`px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${expiryStatus.bg} ${expiryStatus.color}`}>
              {StatusIcon && <StatusIcon className="w-3 h-3 inline mr-1" />}
              {expiryStatus.label}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            {certification.issueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Issued {format(parseISO(certification.issueDate), 'MMM yyyy')}
              </span>
            )}
            {certification.expiryDate && (
              <span className={isExpired ? 'text-red-500' : ''}>
                {isExpired ? 'Expired' : 'Expires'} {format(parseISO(certification.expiryDate), 'MMM yyyy')}
              </span>
            )}
          </div>

          {certification.credentialId && (
            <p className="text-xs text-gray-500 mt-1">
              Credential ID: {certification.credentialId}
            </p>
          )}
        </div>
      </div>

      {/* Edit/Delete buttons */}
      {isEditable && (
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}

// Add Certification Modal
interface AddCertificationModalProps {
  onSave: (data: {
    certificationId?: string;
    certificationName?: string;
    issuer?: string;
    issueDate?: string;
    expiryDate?: string;
    credentialId?: string;
  }) => Promise<void>;
  onClose: () => void;
  availableCertifications: Certification[];
  existingCertificationIds: string[];
}

function AddCertificationModal({ onSave, onClose, availableCertifications, existingCertificationIds }: AddCertificationModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null);
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customIssuer, setCustomIssuer] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [noExpiration, setNoExpiration] = useState(true);
  const [credentialId, setCredentialId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter available certifications
  const filteredCertifications = availableCertifications.filter(cert =>
    !existingCertificationIds.includes(cert.id) &&
    (cert.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     (cert.issuer && cert.issuer.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Group filtered certifications by issuer
  const groupedFiltered = filteredCertifications.reduce((acc, cert) => {
    const issuer = cert.issuer || 'Other';
    if (!acc[issuer]) {
      acc[issuer] = [];
    }
    acc[issuer].push(cert);
    return acc;
  }, {} as Record<string, Certification[]>);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCertification && !customName.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        certificationId: selectedCertification?.id,
        certificationName: isCustom ? customName.trim() : undefined,
        issuer: isCustom ? customIssuer.trim() || undefined : undefined,
        issueDate: issueDate || undefined,
        expiryDate: noExpiration ? undefined : expiryDate || undefined,
        credentialId: credentialId.trim() || undefined
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Certification</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-5">
            {/* Certification Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Certification <span className="text-red-500">*</span>
              </label>
              {!isCustom ? (
                <>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setSelectedCertification(null);
                    }}
                    placeholder="Search certifications by name or issuer..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  {searchTerm && filteredCertifications.length > 0 && !selectedCertification && (
                    <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                      {Object.entries(groupedFiltered).slice(0, 5).map(([issuer, certs]) => (
                        <div key={issuer}>
                          <div className="px-4 py-1 bg-gray-50 text-xs font-semibold text-gray-500 uppercase">
                            {issuer}
                          </div>
                          {certs.slice(0, 5).map((cert) => (
                            <button
                              key={cert.id}
                              type="button"
                              onClick={() => {
                                setSelectedCertification(cert);
                                setSearchTerm(cert.name);
                              }}
                              className="w-full px-4 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-0"
                            >
                              <span className="font-medium">{cert.name}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                  {selectedCertification && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                      <div>
                        <span className="font-medium text-blue-900">{selectedCertification.name}</span>
                        {selectedCertification.issuer && (
                          <span className="text-sm text-blue-600 ml-2">({selectedCertification.issuer})</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedCertification(null);
                          setSearchTerm('');
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsCustom(true)}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Can't find your certification? Add a custom one
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="Enter certification name..."
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="text"
                    value={customIssuer}
                    onChange={(e) => setCustomIssuer(e.target.value)}
                    placeholder="Issuing organization (optional)"
                    className="w-full mt-2 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustom(false);
                      setCustomName('');
                      setCustomIssuer('');
                    }}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Search from existing certifications instead
                  </button>
                </>
              )}
            </div>

            {/* Date Fields */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  disabled={noExpiration}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                />
              </div>
            </div>

            {/* No Expiration */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="noExpiration"
                checked={noExpiration}
                onChange={(e) => {
                  setNoExpiration(e.target.checked);
                  if (e.target.checked) setExpiryDate('');
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded"
              />
              <label htmlFor="noExpiration" className="text-sm text-gray-700">
                This credential does not expire
              </label>
            </div>

            {/* Credential ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Credential ID
              </label>
              <input
                type="text"
                value={credentialId}
                onChange={(e) => setCredentialId(e.target.value)}
                placeholder="Optional"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || (!selectedCertification && !customName.trim())}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : 'Add Certification'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Certification Modal
interface EditCertificationModalProps {
  certification: PersonCertification;
  onSave: (data: {
    issueDate?: string;
    expiryDate?: string;
    clearExpiryDate?: boolean;
    credentialId?: string;
  }) => Promise<void>;
  onClose: () => void;
}

function EditCertificationModal({ certification, onSave, onClose }: EditCertificationModalProps) {
  const [issueDate, setIssueDate] = useState(
    certification.issueDate ? certification.issueDate.split('T')[0] : ''
  );
  const [expiryDate, setExpiryDate] = useState(
    certification.expiryDate ? certification.expiryDate.split('T')[0] : ''
  );
  const [noExpiration, setNoExpiration] = useState(!certification.expiryDate);
  const [credentialId, setCredentialId] = useState(certification.credentialId || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave({
        issueDate: issueDate || undefined,
        expiryDate: noExpiration ? undefined : expiryDate || undefined,
        clearExpiryDate: noExpiration && !!certification.expiryDate,
        credentialId: credentialId.trim() || undefined
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Certification</h2>
            <p className="text-sm text-gray-500 mt-1">{certification.certificationName}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Date Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Issue Date
              </label>
              <input
                type="date"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expiration Date
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                disabled={noExpiration}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          {/* No Expiration */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="editNoExpiration"
              checked={noExpiration}
              onChange={(e) => {
                setNoExpiration(e.target.checked);
                if (e.target.checked) setExpiryDate('');
              }}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded"
            />
            <label htmlFor="editNoExpiration" className="text-sm text-gray-700">
              This credential does not expire
            </label>
          </div>

          {/* Credential ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Credential ID
            </label>
            <input
              type="text"
              value={credentialId}
              onChange={(e) => setCredentialId(e.target.value)}
              placeholder="Optional"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
