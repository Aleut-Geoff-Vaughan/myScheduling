import {
  Mail, Phone, MapPin, Linkedin, Edit2, Download, Share2,
  CheckCircle, Clock, AlertCircle, Archive
} from 'lucide-react';
import { ResumeStatus, type ResumeProfile, type User } from '../../types/api';

interface ProfileHeaderProps {
  resume: ResumeProfile;
  user: User | null;
  onEdit?: () => void;
  onExport?: () => void;
  onShare?: () => void;
  onRequestApproval?: () => void;
  isOwner?: boolean;
}

export function ProfileHeader({
  resume,
  user,
  onEdit,
  onExport,
  onShare,
  onRequestApproval,
  isOwner = false
}: ProfileHeaderProps) {

  const getStatusConfig = (status: ResumeStatus) => {
    const configs: Record<ResumeStatus, { icon: React.ReactNode; color: string; bg: string; label: string }> = {
      [ResumeStatus.Draft]: {
        icon: <Edit2 className="w-4 h-4" />,
        color: 'text-gray-700',
        bg: 'bg-gray-100',
        label: 'Draft'
      },
      [ResumeStatus.PendingReview]: {
        icon: <Clock className="w-4 h-4" />,
        color: 'text-yellow-700',
        bg: 'bg-yellow-100',
        label: 'Pending Review'
      },
      [ResumeStatus.Approved]: {
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-green-700',
        bg: 'bg-green-100',
        label: 'Approved'
      },
      [ResumeStatus.ChangesRequested]: {
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'text-orange-700',
        bg: 'bg-orange-100',
        label: 'Changes Requested'
      },
      [ResumeStatus.Active]: {
        icon: <CheckCircle className="w-4 h-4" />,
        color: 'text-blue-700',
        bg: 'bg-blue-100',
        label: 'Active'
      },
      [ResumeStatus.Archived]: {
        icon: <Archive className="w-4 h-4" />,
        color: 'text-gray-600',
        bg: 'bg-gray-100',
        label: 'Archived'
      }
    };
    return configs[status] || configs[ResumeStatus.Draft];
  };

  const statusConfig = getStatusConfig(resume.status);
  const displayName = user?.displayName || user?.name || user?.email || 'Unknown User';
  const jobTitle = user?.jobTitle || 'No title set';
  const initials = displayName
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Cover/Banner */}
      <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700" />

      {/* Profile Content */}
      <div className="px-6 pb-6">
        {/* Avatar and Actions Row */}
        <div className="flex items-end justify-between -mt-16">
          {/* Avatar */}
          <div className="flex items-end gap-4">
            <div className="w-32 h-32 rounded-full bg-white border-4 border-white shadow-lg flex items-center justify-center">
              {user?.profilePhotoUrl ? (
                <img
                  src={user.profilePhotoUrl}
                  alt={displayName}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white">{initials}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 mb-4">
            {/* Status Badge */}
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.color}`}>
              {statusConfig.icon}
              {statusConfig.label}
            </span>

            {isOwner && resume.status === ResumeStatus.Draft && onRequestApproval && (
              <button
                onClick={onRequestApproval}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                Request Approval
              </button>
            )}

            {isOwner && onEdit && (
              <button
                onClick={onEdit}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </button>
            )}

            {onShare && (
              <button
                onClick={onShare}
                className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                Share
              </button>
            )}

            {/* Export Button */}
            {onExport && (
              <button
                onClick={onExport}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Name and Title */}
        <div className="mt-4">
          <h1 className="text-2xl font-bold text-gray-900">{displayName}</h1>
          <p className="text-lg text-gray-600">{jobTitle}</p>
        </div>

        {/* Contact Info */}
        <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-gray-600">
          {user?.email && (
            <a href={`mailto:${user.email}`} className="flex items-center gap-1.5 hover:text-blue-600">
              <Mail className="w-4 h-4" />
              {user.email}
            </a>
          )}
          {user?.phoneNumber && (
            <a href={`tel:${user.phoneNumber}`} className="flex items-center gap-1.5 hover:text-blue-600">
              <Phone className="w-4 h-4" />
              {user.phoneNumber}
            </a>
          )}
          {user?.department && (
            <span className="flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              {user.department}
            </span>
          )}
          {resume.linkedInProfileUrl && (
            <a
              href={resume.linkedInProfileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-blue-600"
            >
              <Linkedin className="w-4 h-4" />
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
