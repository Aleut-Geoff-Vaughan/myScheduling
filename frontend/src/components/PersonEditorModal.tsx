import { useState, useEffect } from 'react';
import { peopleService } from '../services/peopleService';
import type { Person } from '../types/api';
import type { UpdateUserProfileRequest } from '../types/user';
import toast from 'react-hot-toast';
import { usePeople } from '../hooks/usePeople';
import { useAuthStore } from '../stores/authStore';

interface PersonEditorModalProps {
  person?: Person;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function PersonEditorModal({ person, isOpen, onClose, onSaved }: PersonEditorModalProps) {
  const [form, setForm] = useState<UpdateUserProfileRequest>({
    displayName: '',
    email: '',
    jobTitle: '',
    department: '',
    managerId: '',
  });
  const [saving, setSaving] = useState(false);
  const { currentWorkspace } = useAuthStore();
  const { data: people = [] } = usePeople({ tenantId: currentWorkspace?.tenantId });
  const managerOptions = people.filter((p) => p.id !== person?.id);

  useEffect(() => {
    if (person) {
      setForm({
        displayName: person.displayName,
        email: person.email,
        jobTitle: person.jobTitle || '',
        department: person.department || '',
        managerId: person.managerId || '',
      });
    }
  }, [person]);

  const handleSave = async () => {
    if (!person) return;
    setSaving(true);
    try {
      await peopleService.updateUserProfile(person.id, form);
      toast.success('Person updated');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !person) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Edit Person</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Email is fixed for now.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={form.jobTitle ?? ''}
                onChange={(e) => setForm({ ...form, jobTitle: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
              <input
                className="w-full border border-gray-300 rounded px-3 py-2"
                value={form.department ?? ''}
                onChange={(e) => setForm({ ...form, department: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Manager</label>
            <input
              list="manager-options"
              className="w-full border border-gray-300 rounded px-3 py-2"
              value={form.managerId ?? ''}
              onChange={(e) => setForm({ ...form, managerId: e.target.value })}
              placeholder="Start typing name or email"
            />
            <datalist id="manager-options">
              <option value="">No manager</option>
              {managerOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName} — {p.email}
                </option>
              ))}
            </datalist>
            <p className="text-xs text-gray-500 mt-1">
              Type to search by name or email, then select a manager.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
