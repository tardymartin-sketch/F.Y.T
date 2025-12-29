import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  X, 
  Check,
  ChevronDown,
  ChevronUp,
  UserPlus,
  UserMinus,
  Palette
} from 'lucide-react';
import type { 
  AthleteGroupWithCount, 
  User,
} from '../../types';
import { GROUP_COLORS } from '../../types';

interface Props {
  coachId: string;
  athletes: User[];
  groups: AthleteGroupWithCount[];
  onCreateGroup: (name: string, description: string, color: string) => Promise<void>;
  onUpdateGroup: (groupId: string, name: string, description: string, color: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onUpdateMembers: (groupId: string, athleteIds: string[]) => Promise<void>;
  onLoadGroupMembers: (groupId: string) => Promise<User[]>;
}

export const AthleteGroupsManager: React.FC<Props> = ({
  coachId,
  athletes,
  groups,
  onCreateGroup,
  onUpdateGroup,
  onDeleteGroup,
  onUpdateMembers,
  onLoadGroupMembers,
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [expandedGroupId, setExpandedGroupId] = useState<string | null>(null);
  const [groupMembers, setGroupMembers] = useState<Record<string, User[]>>({});
  const [loadingGroupId, setLoadingGroupId] = useState<string | null>(null);

  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState(GROUP_COLORS[0]);

  const resetForm = () => {
    setFormName('');
    setFormDescription('');
    setFormColor(GROUP_COLORS[0]);
  };

  const handleCreateGroup = async () => {
    if (!formName.trim()) return;
    try {
      await onCreateGroup(formName.trim(), formDescription.trim(), formColor);
      resetForm();
      setShowCreateForm(false);
    } catch (e) {
      console.error("Erreur création groupe:", e);
    }
  };

  const startEdit = (group: AthleteGroupWithCount) => {
    setEditingGroupId(group.id);
    setFormName(group.name);
    setFormDescription(group.description || '');
    setFormColor(group.color);
  };

  const handleUpdateGroup = async (groupId: string) => {
    if (!formName.trim()) return;
    try {
      await onUpdateGroup(groupId, formName.trim(), formDescription.trim(), formColor);
      setEditingGroupId(null);
      resetForm();
    } catch (e) {
      console.error("Erreur mise à jour groupe:", e);
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!confirm('Supprimer ce groupe ?')) return;
    try {
      await onDeleteGroup(groupId);
    } catch (e) {
      console.error("Erreur suppression groupe:", e);
    }
  };

  const handleExpandGroup = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
      return;
    }
    
    setExpandedGroupId(groupId);
    
    if (!groupMembers[groupId]) {
      setLoadingGroupId(groupId);
      try {
        const members = await onLoadGroupMembers(groupId);
        setGroupMembers(prev => ({ ...prev, [groupId]: members }));
      } catch (e) {
        console.error("Erreur chargement membres:", e);
      } finally {
        setLoadingGroupId(null);
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Groupes d'athlètes</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau groupe
        </button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Nom du groupe</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Débutants, Confirmés..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Description (optionnel)</label>
            <input
              type="text"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Description du groupe..."
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Couleur</label>
            <div className="flex gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setFormColor(color)}
                  className={`w-8 h-8 rounded-lg transition-transform ${
                    formColor === color ? 'scale-110 ring-2 ring-white' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCreateGroup}
              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
            >
              Créer
            </button>
            <button
              onClick={() => { setShowCreateForm(false); resetForm(); }}
              className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      {/* Groups List */}
      {groups.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-8 text-center">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500">Aucun groupe créé</p>
          <p className="text-sm text-slate-600 mt-1">Créez des groupes pour organiser vos athlètes</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isExpanded = expandedGroupId === group.id;
            const isEditing = editingGroupId === group.id;
            const members = groupMembers[group.id] || [];
            const isLoading = loadingGroupId === group.id;

            return (
              <div
                key={group.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
              >
                {isEditing ? (
                  <div className="p-4 space-y-4">
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      {GROUP_COLORS.map((color) => (
                        <button
                          key={color}
                          onClick={() => setFormColor(color)}
                          className={`w-6 h-6 rounded-lg ${formColor === color ? 'ring-2 ring-white' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdateGroup(group.id)}
                        className="flex-1 py-2 bg-emerald-600 text-white rounded-lg font-medium"
                      >
                        Enregistrer
                      </button>
                      <button
                        onClick={() => { setEditingGroupId(null); resetForm(); }}
                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between p-4">
                      <button
                        onClick={() => handleExpandGroup(group.id)}
                        className="flex items-center gap-3 flex-1"
                      >
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ backgroundColor: `${group.color}20` }}
                        >
                          <Users className="w-5 h-5" style={{ color: group.color }} />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-white">{group.name}</p>
                          <p className="text-sm text-slate-400">
                            {group.memberCount} athlète{group.memberCount > 1 ? 's' : ''}
                          </p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </button>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => startEdit(group)}
                          className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(group.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-slate-800 p-4">
                        {group.description && (
                          <p className="text-sm text-slate-400 mb-3">{group.description}</p>
                        )}

                        {isLoading ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                          </div>
                        ) : members.length === 0 ? (
                          <p className="text-sm text-slate-500 text-center py-4">
                            Aucun membre dans ce groupe
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {members.map((member) => (
                              <div
                                key={member.id}
                                className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2"
                              >
                                <div className="w-8 h-8 bg-slate-700 rounded-lg flex items-center justify-center text-slate-400 text-xs font-medium">
                                  {member.firstName?.[0]}{member.lastName?.[0]}
                                </div>
                                <span className="text-sm text-white">
                                  {member.firstName} {member.lastName}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AthleteGroupsManager;
