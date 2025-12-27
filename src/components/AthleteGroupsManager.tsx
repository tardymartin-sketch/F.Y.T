// ============================================================
// F.Y.T - ATHLETE GROUPS MANAGER
// src/components/AthleteGroupsManager.tsx
// Gestion des groupes d'athlètes pour les coachs
// ============================================================

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
  AthleteGroup, 
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
  const [loadingMembers, setLoadingMembers] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formColor, setFormColor] = useState(GROUP_COLORS[0].value);
  const [formMembers, setFormMembers] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Charger les membres d'un groupe
  const loadMembers = async (groupId: string) => {
    if (groupMembers[groupId]) return; // Déjà chargé
    
    setLoadingMembers(groupId);
    try {
      const members = await onLoadGroupMembers(groupId);
      setGroupMembers(prev => ({ ...prev, [groupId]: members }));
    } catch (error) {
      console.error('Failed to load group members:', error);
    } finally {
      setLoadingMembers(null);
    }
  };

  // Ouvrir/fermer un groupe
  const toggleGroup = async (groupId: string) => {
    if (expandedGroupId === groupId) {
      setExpandedGroupId(null);
    } else {
      setExpandedGroupId(groupId);
      await loadMembers(groupId);
    }
  };

  // Initialiser le formulaire pour création
  const startCreate = () => {
    setFormName('');
    setFormDescription('');
    setFormColor(GROUP_COLORS[0].value);
    setFormMembers([]);
    setEditingGroupId(null);
    setShowCreateForm(true);
  };

  // Initialiser le formulaire pour édition
  const startEdit = async (group: AthleteGroupWithCount) => {
    setFormName(group.name);
    setFormDescription(group.description || '');
    setFormColor(group.color);
    
    // Charger les membres actuels
    const members = await onLoadGroupMembers(group.id);
    setFormMembers(members.map(m => m.id));
    
    setEditingGroupId(group.id);
    setShowCreateForm(true);
  };

  // Annuler le formulaire
  const cancelForm = () => {
    setShowCreateForm(false);
    setEditingGroupId(null);
    setFormName('');
    setFormDescription('');
    setFormColor(GROUP_COLORS[0].value);
    setFormMembers([]);
  };

  // Sauvegarder
  const handleSave = async () => {
    if (!formName.trim()) {
      alert('Le nom du groupe est obligatoire');
      return;
    }

    setSaving(true);
    try {
      if (editingGroupId) {
        // Mise à jour
        await onUpdateGroup(editingGroupId, formName, formDescription, formColor);
        await onUpdateMembers(editingGroupId, formMembers);
        // Rafraîchir les membres chargés
        const members = await onLoadGroupMembers(editingGroupId);
        setGroupMembers(prev => ({ ...prev, [editingGroupId]: members }));
      } else {
        // Création
        await onCreateGroup(formName, formDescription, formColor);
        // Note: le parent doit rafraîchir la liste des groupes
      }
      cancelForm();
    } catch (error) {
      console.error('Failed to save group:', error);
      alert('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Supprimer un groupe
  const handleDelete = async (groupId: string) => {
    if (!confirm('Supprimer ce groupe ? Les athlètes ne seront pas supprimés.')) {
      return;
    }

    try {
      await onDeleteGroup(groupId);
      // Nettoyer les membres chargés
      setGroupMembers(prev => {
        const next = { ...prev };
        delete next[groupId];
        return next;
      });
    } catch (error) {
      console.error('Failed to delete group:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Toggle membre dans le formulaire
  const toggleMember = (athleteId: string) => {
    setFormMembers(prev => {
      if (prev.includes(athleteId)) {
        return prev.filter(id => id !== athleteId);
      } else {
        return [...prev, athleteId];
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header avec bouton créer */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Groupes d'athlètes</h3>
          <p className="text-sm text-slate-400">{groups.length} groupe{groups.length > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={startCreate}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Nouveau groupe
        </button>
      </div>

      {/* Formulaire de création/édition */}
      {showCreateForm && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-bold text-white">
              {editingGroupId ? 'Modifier le groupe' : 'Nouveau groupe'}
            </h4>
            <button
              onClick={cancelForm}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Nom */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Nom du groupe *
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ex: Débutants, Avancés, Compétition..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Description optionnelle..."
              rows={2}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Couleur */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              <Palette className="w-4 h-4 inline mr-1" />
              Couleur
            </label>
            <div className="flex flex-wrap gap-2">
              {GROUP_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setFormColor(color.value)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    formColor === color.value
                      ? 'border-white scale-110'
                      : 'border-slate-700 hover:scale-105'
                  }`}
                  style={{ backgroundColor: color.value }}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Sélection des membres */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">
              Membres ({formMembers.length})
            </label>
            <div className="bg-slate-900 border border-slate-700 rounded-lg max-h-48 overflow-y-auto">
              {athletes.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-sm">
                  Aucun athlète disponible
                </div>
              ) : (
                athletes.map((athlete) => {
                  const isSelected = formMembers.includes(athlete.id);
                  return (
                    <button
                      key={athlete.id}
                      onClick={() => toggleMember(athlete.id)}
                      className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-slate-800 transition-colors ${
                        isSelected ? 'bg-slate-800' : ''
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-500 border-blue-500'
                          : 'border-slate-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-white text-sm">
                        {athlete.firstName} {athlete.lastName}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={cancelForm}
              className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !formName.trim()}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Check className="w-4 h-4" />
              )}
              Enregistrer
            </button>
          </div>
        </div>
      )}

      {/* Liste des groupes */}
      {groups.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-12 text-center">
          <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            Aucun groupe créé. Créez un groupe pour organiser vos athlètes.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {groups.map((group) => {
            const isExpanded = expandedGroupId === group.id;
            const members = groupMembers[group.id] || [];
            const isLoading = loadingMembers === group.id;

            return (
              <div
                key={group.id}
                className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
              >
                {/* Header */}
                <div className="p-4 flex items-center justify-between">
                  <button
                    onClick={() => toggleGroup(group.id)}
                    className="flex items-center gap-3 flex-1 text-left"
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${group.color}20` }}
                    >
                      <Users 
                        className="w-5 h-5" 
                        style={{ color: group.color }}
                      />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-white">{group.name}</h4>
                      <p className="text-sm text-slate-400">
                        {group.memberCount} membre{group.memberCount > 1 ? 's' : ''}
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

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-800 p-4">
                    {group.description && (
                      <p className="text-sm text-slate-400 mb-3">
                        {group.description}
                      </p>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AthleteGroupsManager;
