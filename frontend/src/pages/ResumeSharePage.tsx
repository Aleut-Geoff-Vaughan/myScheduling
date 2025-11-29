import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Lock, AlertCircle, Briefcase, GraduationCap, Award, FolderOpen, FileText, Loader2 } from 'lucide-react';

interface SharedResume {
  displayName: string;
  jobTitle?: string;
  email?: string;
  phone?: string;
  linkedInUrl?: string;
  sections: SharedSection[];
  skills: SharedSkill[];
  certifications: SharedCertification[];
}

interface SharedSection {
  type: string;
  entries: SharedEntry[];
}

interface SharedEntry {
  title: string;
  organization?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
}

interface SharedSkill {
  name: string;
  category?: string;
  proficiencyLevel: number;
}

interface SharedCertification {
  name: string;
  issuer?: string;
  issueDate?: string;
  expiryDate?: string;
}

interface LinkCheck {
  isValid: boolean;
  requiresPassword: boolean;
  isExpired: boolean;
  message?: string;
}

export function ResumeSharePage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [resume, setResume] = useState<SharedResume | null>(null);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  useEffect(() => {
    if (token) {
      checkLink();
    }
  }, [token]);

  const checkLink = async () => {
    try {
      const response = await fetch(`/api/resumes/share/${token}/check`);
      const data: LinkCheck = await response.json();

      if (!data.isValid) {
        setError(data.message || 'This share link is no longer valid');
        setLoading(false);
        return;
      }

      if (data.requiresPassword) {
        setRequiresPassword(true);
        setLoading(false);
        return;
      }

      // No password required, load the resume
      await loadResume();
    } catch (err) {
      console.error('Error checking link:', err);
      setError('Failed to verify share link');
      setLoading(false);
    }
  };

  const loadResume = async (pwd?: string) => {
    setLoading(true);
    try {
      const url = pwd
        ? `/api/resumes/share/${token}?password=${encodeURIComponent(pwd)}`
        : `/api/resumes/share/${token}`;

      const response = await fetch(url);

      if (response.status === 401) {
        const data = await response.json();
        if (data.requiresPassword) {
          setRequiresPassword(true);
          setError(data.message || 'Incorrect password');
          setLoading(false);
          return;
        }
      }

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to load resume');
      }

      const data: SharedResume = await response.json();
      setResume(data);
      setRequiresPassword(false);
      setError(null);
    } catch (err: any) {
      console.error('Error loading resume:', err);
      setError(err.message || 'Failed to load resume');
    } finally {
      setLoading(false);
      setAuthenticating(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setAuthenticating(true);
    setError(null);
    await loadResume(password);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric'
    });
  };

  const formatDateRange = (startDate?: string, endDate?: string) => {
    if (!startDate && !endDate) return '';
    const start = formatDate(startDate);
    const end = endDate ? formatDate(endDate) : 'Present';
    return startDate ? `${start} - ${end}` : end;
  };

  const getProficiencyLabel = (level: number) => {
    switch (level) {
      case 0: return 'Beginner';
      case 1: return 'Intermediate';
      case 2: return 'Advanced';
      case 3: return 'Expert';
      default: return 'Intermediate';
    }
  };

  const getProficiencyWidth = (level: number) => {
    switch (level) {
      case 0: return '25%';
      case 1: return '50%';
      case 2: return '75%';
      case 3: return '100%';
      default: return '50%';
    }
  };

  const getSectionIcon = (type: string) => {
    switch (type) {
      case 'Summary': return <FileText className="w-5 h-5" />;
      case 'Experience': return <Briefcase className="w-5 h-5" />;
      case 'Education': return <GraduationCap className="w-5 h-5" />;
      case 'Projects': return <FolderOpen className="w-5 h-5" />;
      case 'Awards': return <Award className="w-5 h-5" />;
      default: return <FileText className="w-5 h-5" />;
    }
  };

  const stripHtml = (html: string) => {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading resume...</p>
        </div>
      </div>
    );
  }

  // Password required
  if (requiresPassword && !resume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Password Required</h1>
            <p className="text-gray-500">
              This resume is password protected. Please enter the password to view.
            </p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />

            <button
              type="submit"
              disabled={authenticating || !password.trim()}
              className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {authenticating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'View Resume'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !resume) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Link Not Available</h1>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  // Resume display
  if (!resume) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <div className="text-center">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-3xl font-bold">
              {resume.displayName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">{resume.displayName}</h1>
            {resume.jobTitle && (
              <p className="text-xl text-gray-600 mb-4">{resume.jobTitle}</p>
            )}
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500 flex-wrap">
              {resume.email && <span>{resume.email}</span>}
              {resume.phone && <span>{resume.phone}</span>}
              {resume.linkedInUrl && (
                <a
                  href={resume.linkedInUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  LinkedIn
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Sections */}
        {resume.sections.map((section, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                {getSectionIcon(section.type)}
              </div>
              <h2 className="text-xl font-semibold text-gray-900">
                {section.type === 'Summary' ? 'Professional Summary' : section.type}
              </h2>
            </div>

            {section.type === 'Summary' ? (
              <div className="prose prose-gray max-w-none">
                {section.entries[0]?.description && (
                  <p className="text-gray-700 whitespace-pre-line">
                    {stripHtml(section.entries[0].description)}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {section.entries.map((entry, entryIndex) => (
                  <div key={entryIndex} className="pb-4 last:pb-0 border-b last:border-0 border-gray-100">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="font-semibold text-gray-900">{entry.title}</h3>
                        {entry.organization && (
                          <p className="text-gray-600">{entry.organization}</p>
                        )}
                      </div>
                      {(entry.startDate || entry.endDate) && (
                        <span className="text-sm text-gray-500 whitespace-nowrap">
                          {formatDateRange(entry.startDate, entry.endDate)}
                        </span>
                      )}
                    </div>
                    {entry.description && (
                      <div className="mt-2 text-gray-700 text-sm whitespace-pre-line">
                        {stripHtml(entry.description)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {/* Skills */}
        {resume.skills.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Skills</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resume.skills.map((skill, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{skill.name}</span>
                      <span className="text-xs text-gray-500">{getProficiencyLabel(skill.proficiencyLevel)}</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full transition-all"
                        style={{ width: getProficiencyWidth(skill.proficiencyLevel) }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Certifications */}
        {resume.certifications.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <Award className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900">Certifications</h2>
            </div>

            <div className="space-y-3">
              {resume.certifications.map((cert, index) => (
                <div key={index} className="flex items-start justify-between gap-4 pb-3 last:pb-0 border-b last:border-0 border-gray-100">
                  <div>
                    <h3 className="font-semibold text-gray-900">{cert.name}</h3>
                    {cert.issuer && <p className="text-sm text-gray-600">{cert.issuer}</p>}
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {cert.issueDate && <div>Issued: {formatDate(cert.issueDate)}</div>}
                    {cert.expiryDate && <div>Expires: {formatDate(cert.expiryDate)}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-sm text-gray-400">
          Shared via MyScheduling Resume
        </div>
      </div>
    </div>
  );
}
