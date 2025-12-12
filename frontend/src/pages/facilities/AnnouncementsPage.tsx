import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { facilitiesPortalService, AnnouncementType, AnnouncementPriority } from '../../services/facilitiesPortalService';
import type { FacilityAnnouncement, CreateAnnouncementRequest } from '../../services/facilitiesPortalService';
import { useAuthStore, AppRole } from '../../stores/authStore';
import { format } from 'date-fns';

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const { hasRole } = useAuthStore();
  const canManage = hasRole(AppRole.OfficeManager) || hasRole(AppRole.TenantAdmin) || hasRole(AppRole.SysAdmin);

  const [filterType, setFilterType] = useState<AnnouncementType | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<AnnouncementPriority | 'all'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch announcements
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => facilitiesPortalService.getAnnouncements(),
  });

  // Acknowledge mutation
  const acknowledgeMutation = useMutation({
    mutationFn: (id: string) => facilitiesPortalService.acknowledgeAnnouncement(id),
    onSuccess: () => {
      toast.success('Announcement acknowledged');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
    onError: () => {
      toast.error('Failed to acknowledge announcement');
    },
  });

  // Filter announcements
  const filteredAnnouncements = announcements.filter(a => {
    if (filterType !== 'all' && a.type !== filterType) return false;
    if (filterPriority !== 'all' && a.priority !== filterPriority) return false;
    return true;
  });

  // Group by priority for display
  const urgentAnnouncements = filteredAnnouncements.filter(a => a.priority === AnnouncementPriority.Urgent);
  const otherAnnouncements = filteredAnnouncements.filter(a => a.priority !== AnnouncementPriority.Urgent);

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-600 mt-1">Stay informed about facility updates and news</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Announcement
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as AnnouncementType | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="all">All Types</option>
              <option value={AnnouncementType.General}>General</option>
              <option value={AnnouncementType.Maintenance}>Maintenance</option>
              <option value={AnnouncementType.Safety}>Safety</option>
              <option value={AnnouncementType.Policy}>Policy</option>
              <option value={AnnouncementType.Event}>Event</option>
              <option value={AnnouncementType.Emergency}>Emergency</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as AnnouncementPriority | 'all')}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="all">All Priorities</option>
              <option value={AnnouncementPriority.Low}>Low</option>
              <option value={AnnouncementPriority.Normal}>Normal</option>
              <option value={AnnouncementPriority.High}>High</option>
              <option value={AnnouncementPriority.Urgent}>Urgent</option>
            </select>
          </div>
        </div>
      </div>

      {/* Urgent Announcements */}
      {urgentAnnouncements.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-red-700 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Urgent Announcements
          </h2>
          {urgentAnnouncements.map(announcement => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onAcknowledge={() => acknowledgeMutation.mutate(announcement.id)}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Other Announcements */}
      {otherAnnouncements.length > 0 && (
        <div className="space-y-3">
          {urgentAnnouncements.length > 0 && (
            <h2 className="text-lg font-semibold text-gray-900">Other Announcements</h2>
          )}
          {otherAnnouncements.map(announcement => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              onAcknowledge={() => acknowledgeMutation.mutate(announcement.id)}
              canManage={canManage}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredAnnouncements.length === 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No announcements</h3>
          <p className="text-gray-500">There are no announcements matching your filters</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateAnnouncementModal onClose={() => setShowCreateModal(false)} />
      )}
    </div>
  );
}

function AnnouncementCard({
  announcement,
  onAcknowledge,
}: {
  announcement: FacilityAnnouncement;
  onAcknowledge: () => void;
  canManage: boolean;
}) {
  const getTypeBadge = (type: AnnouncementType) => {
    const styles: Record<AnnouncementType, string> = {
      [AnnouncementType.General]: 'bg-gray-100 text-gray-800',
      [AnnouncementType.Maintenance]: 'bg-yellow-100 text-yellow-800',
      [AnnouncementType.Safety]: 'bg-orange-100 text-orange-800',
      [AnnouncementType.Policy]: 'bg-blue-100 text-blue-800',
      [AnnouncementType.Event]: 'bg-purple-100 text-purple-800',
      [AnnouncementType.Emergency]: 'bg-red-100 text-red-800',
    };
    const labels: Record<AnnouncementType, string> = {
      [AnnouncementType.General]: 'General',
      [AnnouncementType.Maintenance]: 'Maintenance',
      [AnnouncementType.Safety]: 'Safety',
      [AnnouncementType.Policy]: 'Policy',
      [AnnouncementType.Event]: 'Event',
      [AnnouncementType.Emergency]: 'Emergency',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[type]}`}>
        {labels[type]}
      </span>
    );
  };

  const getPriorityBadge = (priority: AnnouncementPriority) => {
    const styles: Record<AnnouncementPriority, string> = {
      [AnnouncementPriority.Low]: 'bg-gray-100 text-gray-600',
      [AnnouncementPriority.Normal]: 'bg-teal-100 text-teal-700',
      [AnnouncementPriority.High]: 'bg-orange-100 text-orange-700',
      [AnnouncementPriority.Urgent]: 'bg-red-100 text-red-700',
    };
    const labels: Record<AnnouncementPriority, string> = {
      [AnnouncementPriority.Low]: 'Low',
      [AnnouncementPriority.Normal]: 'Normal',
      [AnnouncementPriority.High]: 'High',
      [AnnouncementPriority.Urgent]: 'Urgent',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[priority]}`}>
        {labels[priority]}
      </span>
    );
  };

  const borderColor = announcement.priority === AnnouncementPriority.Urgent
    ? 'border-l-red-500'
    : announcement.priority === AnnouncementPriority.High
      ? 'border-l-orange-500'
      : 'border-l-teal-500';

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 ${borderColor} overflow-hidden`}>
      <div className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {getTypeBadge(announcement.type)}
              {getPriorityBadge(announcement.priority)}
              {announcement.office?.name && (
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  {announcement.office.name}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{announcement.title}</h3>
            <p className="text-gray-600 whitespace-pre-wrap">{announcement.content}</p>
            <div className="mt-4 flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {format(new Date(announcement.createdAt), 'MMM d, yyyy')}
              </span>
              {announcement.effectiveDate && (
                <span>Effective: {format(new Date(announcement.effectiveDate), 'MMM d, yyyy')}</span>
              )}
              {announcement.expirationDate && (
                <span>Expires: {format(new Date(announcement.expirationDate), 'MMM d, yyyy')}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {announcement.requiresAcknowledgment && (
              <button
                onClick={onAcknowledge}
                className="px-3 py-2 text-sm font-medium bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
              >
                Acknowledge
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateAnnouncementModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<CreateAnnouncementRequest>({
    title: '',
    content: '',
    type: AnnouncementType.General,
    priority: AnnouncementPriority.Normal,
    requiresAcknowledgment: false,
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateAnnouncementRequest) => facilitiesPortalService.createAnnouncement(data),
    onSuccess: () => {
      toast.success('Announcement created');
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      onClose();
    },
    onError: () => {
      toast.error('Failed to create announcement');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Create Announcement</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Content *</label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: parseInt(e.target.value) as AnnouncementType })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value={AnnouncementType.General}>General</option>
                <option value={AnnouncementType.Maintenance}>Maintenance</option>
                <option value={AnnouncementType.Safety}>Safety</option>
                <option value={AnnouncementType.Policy}>Policy</option>
                <option value={AnnouncementType.Event}>Event</option>
                <option value={AnnouncementType.Emergency}>Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) as AnnouncementPriority })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              >
                <option value={AnnouncementPriority.Low}>Low</option>
                <option value={AnnouncementPriority.Normal}>Normal</option>
                <option value={AnnouncementPriority.High}>High</option>
                <option value={AnnouncementPriority.Urgent}>Urgent</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
              <input
                type="date"
                value={formData.effectiveDate || ''}
                onChange={(e) => setFormData({ ...formData, effectiveDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Expiration Date</label>
              <input
                type="date"
                value={formData.expirationDate || ''}
                onChange={(e) => setFormData({ ...formData, expirationDate: e.target.value || undefined })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="requiresAcknowledgment"
              checked={formData.requiresAcknowledgment}
              onChange={(e) => setFormData({ ...formData, requiresAcknowledgment: e.target.checked })}
              className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
            />
            <label htmlFor="requiresAcknowledgment" className="text-sm text-gray-700">
              Requires acknowledgment from all users
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
