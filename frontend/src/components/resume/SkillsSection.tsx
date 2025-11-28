import { useState } from 'react';
import { Plus, Edit2, Trash2, Lightbulb, X } from 'lucide-react';
import { ProficiencyLevel, type PersonSkill, type Skill } from '../../types/api';

interface SkillsSectionProps {
  skills: PersonSkill[];
  isEditable?: boolean;
  onAdd?: (skill: { skillId?: string; skillName?: string; proficiencyLevel: ProficiencyLevel }) => Promise<void>;
  onUpdate?: (id: string, proficiencyLevel: ProficiencyLevel) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  availableSkills?: Skill[];
}

// Skill categories for grouping
const SKILL_CATEGORIES = [
  'Programming Languages',
  'Frameworks & Libraries',
  'Databases',
  'Cloud & DevOps',
  'Tools & Software',
  'Soft Skills',
  'Languages',
  'Other'
];

// Proficiency level configurations
const PROFICIENCY_CONFIG: Record<ProficiencyLevel, { label: string; color: string; width: string; description: string }> = {
  [ProficiencyLevel.Beginner]: {
    label: 'Beginner',
    color: 'bg-blue-300',
    width: '25%',
    description: 'Basic understanding, limited practical experience'
  },
  [ProficiencyLevel.Intermediate]: {
    label: 'Intermediate',
    color: 'bg-blue-400',
    width: '50%',
    description: 'Working knowledge, can work independently'
  },
  [ProficiencyLevel.Advanced]: {
    label: 'Advanced',
    color: 'bg-blue-500',
    width: '75%',
    description: 'Strong expertise, can mentor others'
  },
  [ProficiencyLevel.Expert]: {
    label: 'Expert',
    color: 'bg-blue-600',
    width: '100%',
    description: 'Mastery level, thought leader'
  }
};

export function SkillsSection({
  skills,
  isEditable = false,
  onAdd,
  onUpdate,
  onDelete,
  availableSkills = []
}: SkillsSectionProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSkill, setEditingSkill] = useState<PersonSkill | null>(null);

  // Group skills by category
  const groupedSkills = skills.reduce((acc, skill) => {
    const category = skill.skill?.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(skill);
    return acc;
  }, {} as Record<string, PersonSkill[]>);

  // Sort categories
  const sortedCategories = Object.keys(groupedSkills).sort((a, b) => {
    const indexA = SKILL_CATEGORIES.indexOf(a);
    const indexB = SKILL_CATEGORIES.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this skill?')) {
      await onDelete?.(id);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-blue-600" />
          Skills
        </h2>
        {isEditable && (
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Skill
          </button>
        )}
      </div>

      {skills.length === 0 ? (
        <div className="text-center py-8">
          <Lightbulb className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">
            {isEditable
              ? 'No skills added yet. Click "Add Skill" to showcase your expertise.'
              : 'No skills listed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sortedCategories.map((category) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                {category}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groupedSkills[category]
                  .sort((a, b) => b.proficiencyLevel - a.proficiencyLevel)
                  .map((personSkill) => (
                    <SkillCard
                      key={personSkill.id}
                      personSkill={personSkill}
                      isEditable={isEditable}
                      onEdit={() => setEditingSkill(personSkill)}
                      onDelete={() => handleDelete(personSkill.id)}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Proficiency Legend */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-700 mb-3">Proficiency Levels</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Object.entries(PROFICIENCY_CONFIG).map(([level, config]) => (
            <div key={level} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${config.color}`} />
              <span className="text-sm text-gray-600">{config.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Add Skill Modal */}
      {showAddModal && (
        <AddSkillModal
          onSave={async (data) => {
            await onAdd?.(data);
            setShowAddModal(false);
          }}
          onClose={() => setShowAddModal(false)}
          availableSkills={availableSkills}
          existingSkillIds={skills.map(s => s.skillId)}
        />
      )}

      {/* Edit Skill Modal */}
      {editingSkill && (
        <EditSkillModal
          skill={editingSkill}
          onSave={async (level) => {
            await onUpdate?.(editingSkill.id, level);
            setEditingSkill(null);
          }}
          onClose={() => setEditingSkill(null)}
        />
      )}
    </div>
  );
}

// Skill Card Component
interface SkillCardProps {
  personSkill: PersonSkill;
  isEditable: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

function SkillCard({ personSkill, isEditable, onEdit, onDelete }: SkillCardProps) {
  const config = PROFICIENCY_CONFIG[personSkill.proficiencyLevel];
  const skillName = personSkill.skill?.name || 'Unknown Skill';

  return (
    <div className="group relative bg-gray-50 rounded-lg p-4 hover:bg-gray-100 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <span className="font-medium text-gray-900">{skillName}</span>
        <span className="text-sm text-gray-500">{config.label}</span>
      </div>

      {/* Proficiency Bar */}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${config.color} transition-all duration-300`}
          style={{ width: config.width }}
        />
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

// Add Skill Modal
interface AddSkillModalProps {
  onSave: (data: { skillId?: string; skillName?: string; proficiencyLevel: ProficiencyLevel }) => Promise<void>;
  onClose: () => void;
  availableSkills: Skill[];
  existingSkillIds: string[];
}

function AddSkillModal({ onSave, onClose, availableSkills, existingSkillIds }: AddSkillModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [customSkillName, setCustomSkillName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [proficiencyLevel, setProficiencyLevel] = useState<ProficiencyLevel>(ProficiencyLevel.Intermediate);
  const [isSaving, setIsSaving] = useState(false);
  const [isCustom, setIsCustom] = useState(false);

  // Filter available skills
  const filteredSkills = availableSkills.filter(skill =>
    !existingSkillIds.includes(skill.id) &&
    skill.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSkill && !customSkillName.trim()) return;

    setIsSaving(true);
    try {
      await onSave({
        skillId: selectedSkill?.id,
        skillName: isCustom ? customSkillName.trim() : undefined,
        proficiencyLevel
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Add Skill</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Skill Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Skill
            </label>
            {!isCustom ? (
              <>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setSelectedSkill(null);
                  }}
                  placeholder="Search for a skill..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                {searchTerm && filteredSkills.length > 0 && !selectedSkill && (
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-200 rounded-lg">
                    {filteredSkills.slice(0, 10).map((skill) => (
                      <button
                        key={skill.id}
                        type="button"
                        onClick={() => {
                          setSelectedSkill(skill);
                          setSearchTerm(skill.name);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center justify-between"
                      >
                        <span>{skill.name}</span>
                        <span className="text-xs text-gray-500">{skill.category}</span>
                      </button>
                    ))}
                  </div>
                )}
                {selectedSkill && (
                  <div className="mt-2 p-3 bg-blue-50 rounded-lg flex items-center justify-between">
                    <div>
                      <span className="font-medium text-blue-900">{selectedSkill.name}</span>
                      <span className="text-sm text-blue-600 ml-2">({selectedSkill.category})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSkill(null);
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
                  Can't find your skill? Add a custom one
                </button>
              </>
            ) : (
              <>
                <input
                  type="text"
                  value={customSkillName}
                  onChange={(e) => setCustomSkillName(e.target.value)}
                  placeholder="Enter skill name..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full mt-2 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select category</option>
                  {SKILL_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setIsCustom(false);
                    setCustomSkillName('');
                  }}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Search from existing skills instead
                </button>
              </>
            )}
          </div>

          {/* Proficiency Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Proficiency Level
            </label>
            <div className="space-y-2">
              {Object.entries(PROFICIENCY_CONFIG).map(([level, config]) => (
                <label
                  key={level}
                  className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                    proficiencyLevel === Number(level)
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="proficiency"
                    value={level}
                    checked={proficiencyLevel === Number(level)}
                    onChange={() => setProficiencyLevel(Number(level) as ProficiencyLevel)}
                    className="sr-only"
                  />
                  <div className={`w-3 h-3 rounded-full ${config.color} mr-3`} />
                  <div className="flex-1">
                    <span className="font-medium text-gray-900">{config.label}</span>
                    <p className="text-sm text-gray-500">{config.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Actions */}
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
              disabled={isSaving || (!selectedSkill && !customSkillName.trim())}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isSaving ? 'Adding...' : 'Add Skill'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Edit Skill Modal
interface EditSkillModalProps {
  skill: PersonSkill;
  onSave: (level: ProficiencyLevel) => Promise<void>;
  onClose: () => void;
}

function EditSkillModal({ skill, onSave, onClose }: EditSkillModalProps) {
  const [proficiencyLevel, setProficiencyLevel] = useState(skill.proficiencyLevel);
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await onSave(proficiencyLevel);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Edit {skill.skill?.name || 'Skill'}
          </h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Proficiency Level
          </label>
          <div className="space-y-2">
            {Object.entries(PROFICIENCY_CONFIG).map(([level, config]) => (
              <label
                key={level}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                  proficiencyLevel === Number(level)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="proficiency"
                  value={level}
                  checked={proficiencyLevel === Number(level)}
                  onChange={() => setProficiencyLevel(Number(level) as ProficiencyLevel)}
                  className="sr-only"
                />
                <div className={`w-3 h-3 rounded-full ${config.color} mr-3`} />
                <div className="flex-1">
                  <span className="font-medium text-gray-900">{config.label}</span>
                  <p className="text-sm text-gray-500">{config.description}</p>
                </div>
              </label>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-6">
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
