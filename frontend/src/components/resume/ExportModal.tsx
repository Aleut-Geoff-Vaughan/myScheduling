import { useState } from 'react';
import { X, FileText, Download, Loader2 } from 'lucide-react';
import { buildApiUrl } from '../../config/api';

// Helper to get JWT token from localStorage (matching api-client.ts)
function getAuthToken(): string | null {
  try {
    const authState = localStorage.getItem('auth-storage');
    if (authState) {
      const parsed = JSON.parse(authState);
      const token = parsed.state?.token;
      const expiresAt = parsed.state?.tokenExpiresAt;

      if (token && expiresAt) {
        const expiryDate = new Date(expiresAt);
        if (expiryDate > new Date()) {
          return token;
        }
      }
    }
  } catch (error) {
    console.error('Failed to get auth token from storage:', error);
  }
  return null;
}

interface ExportModalProps {
  resumeId: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ExportOptions {
  templateStyle: string;
  includeContactInfo: boolean;
  includeLinkedIn: boolean;
  showSkillProficiency: boolean;
  includeSummary: boolean;
  includeExperience: boolean;
  includeEducation: boolean;
  includeSkills: boolean;
  includeCertifications: boolean;
  includeProjects: boolean;
  includeAwards: boolean;
  includePublications: boolean;
}

const TEMPLATE_STYLES = [
  { id: 'Modern', name: 'Modern', description: 'Clean, professional design with blue accents' },
  { id: 'Classic', name: 'Classic', description: 'Traditional black and white format' },
  { id: 'Federal', name: 'Federal', description: 'Optimized for government proposals' },
  { id: 'Executive', name: 'Executive', description: 'Elegant design for senior positions' },
  { id: 'Minimal', name: 'Minimal', description: 'Simple, no-frills layout' }
];

export function ExportModal({ resumeId, isOpen, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<'word' | 'pdf'>('word');
  const [exporting, setExporting] = useState(false);
  const [options, setOptions] = useState<ExportOptions>({
    templateStyle: 'Modern',
    includeContactInfo: true,
    includeLinkedIn: true,
    showSkillProficiency: true,
    includeSummary: true,
    includeExperience: true,
    includeEducation: true,
    includeSkills: true,
    includeCertifications: true,
    includeProjects: true,
    includeAwards: true,
    includePublications: true
  });

  if (!isOpen) return null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Not authenticated');
      }

      const endpoint = `/resumes/${resumeId}/export/${format}`;
      const url = buildApiUrl(endpoint);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(options)
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get the blob and create download
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = format === 'word' ? 'Resume.docx' : 'Resume.pdf';

      if (contentDisposition) {
        const match = contentDisposition.match(/filename="?(.+)"?/);
        if (match) {
          filename = match[1];
        }
      }

      // Create download link
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);

      onClose();
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export resume. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const updateOption = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Download className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Export Resume</h2>
              <p className="text-sm text-gray-500">Download your resume as Word or PDF</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('word')}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  format === 'word'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className={`w-6 h-6 ${format === 'word' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className={`font-medium ${format === 'word' ? 'text-blue-900' : 'text-gray-900'}`}>
                    Word Document
                  </div>
                  <div className="text-sm text-gray-500">.docx format</div>
                </div>
              </button>
              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-lg border-2 transition-all flex items-center gap-3 ${
                  format === 'pdf'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText className={`w-6 h-6 ${format === 'pdf' ? 'text-blue-600' : 'text-gray-400'}`} />
                <div className="text-left">
                  <div className={`font-medium ${format === 'pdf' ? 'text-blue-900' : 'text-gray-900'}`}>
                    PDF Document
                  </div>
                  <div className="text-sm text-gray-500">.pdf format</div>
                </div>
              </button>
            </div>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Template Style
            </label>
            <div className="grid grid-cols-5 gap-2">
              {TEMPLATE_STYLES.map(style => (
                <button
                  key={style.id}
                  onClick={() => updateOption('templateStyle', style.id)}
                  className={`p-3 rounded-lg border-2 transition-all text-center ${
                    options.templateStyle === style.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  title={style.description}
                >
                  <div className={`text-sm font-medium ${
                    options.templateStyle === style.id ? 'text-blue-900' : 'text-gray-700'
                  }`}>
                    {style.name}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {TEMPLATE_STYLES.find(s => s.id === options.templateStyle)?.description}
            </p>
          </div>

          {/* Content Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Include Sections
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'includeSummary' as const, label: 'Professional Summary' },
                { key: 'includeExperience' as const, label: 'Experience' },
                { key: 'includeEducation' as const, label: 'Education' },
                { key: 'includeSkills' as const, label: 'Skills' },
                { key: 'includeCertifications' as const, label: 'Certifications' },
                { key: 'includeProjects' as const, label: 'Projects' },
                { key: 'includeAwards' as const, label: 'Awards' },
                { key: 'includePublications' as const, label: 'Publications' }
              ].map(item => (
                <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={options[item.key]}
                    onChange={(e) => updateOption(item.key, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Additional Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Additional Options
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeContactInfo}
                  onChange={(e) => updateOption('includeContactInfo', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include contact information (email, phone)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.includeLinkedIn}
                  onChange={(e) => updateOption('includeLinkedIn', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include LinkedIn URL</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.showSkillProficiency}
                  onChange={(e) => updateOption('showSkillProficiency', e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Show skill proficiency levels</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export {format === 'word' ? 'Word' : 'PDF'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
