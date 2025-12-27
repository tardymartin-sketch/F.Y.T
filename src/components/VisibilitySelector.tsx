// ============================================================
// F.Y.T - VISIBILITY SELECTOR
// src/components/VisibilitySelector.tsx
// Sélecteur de visibilité pour les messages Week Organizer
// ============================================================

import React, { useState } from 'react';
import { Globe, Users, User, Check, ChevronDown } from 'lucide-react';
import type { VisibilityType, AthleteGroupWithCount, User as UserType } from '../../types';

interface Props {
  visibilityType: VisibilityType;
  selectedGroupIds: string[];
  selectedAthleteIds: string[];
  availableGroups: AthleteGroupWithCount[];
  availableAthletes: UserType[];
  onChange: (
    visibilityType: VisibilityType,
    groupIds: string[],
    athleteIds: string[]
  ) => void;
}

export const VisibilitySelector: React.FC<Props> = ({
  visibilityType,
  selectedGroupIds,
  selectedAthleteIds,
  availableGroups,
  availableAthletes,
  onChange,
}) => {
  const [showGroupDropdown, setShowGroupDropdown] = useState(false);
  const [showAthleteDropdown, setShowAthleteDropdown] = useState(false);

  const handleVisibilityTypeChange = (type: VisibilityType) => {
    onChange(type, [], []);
    setShowGroupDropdown(false);
    setShowAthleteDropdown(false);
  };

  const handleToggleGroup = (groupId: string) => {
    const newSelection = selectedGroupIds.includes(groupId)
      ? selectedGroupIds.filter(id => id !== groupId)
      : [...selectedGroupIds, groupId];
    onChange('groups', newSelection, []);
  };

  const handleToggleAthlete = (athleteId: string) => {
    const newSelection = selectedAthleteIds.includes(athleteId)
      ? selectedAthleteIds.filter(id => id !== athleteId)
      : [...selectedAthleteIds, athleteId];
    onChange('athletes', [], newSelection);
  };

  const selectedGroupsCount = selectedGroupIds.length;
  const selectedAthletesCount = selectedAthleteIds.length;

  return (
    <div className="space-y-4">
      {/* Type de visibilité */}
      <div>
        <label className="block text-sm font-medium text-slate-400 mb-2">
          Qui peut voir ce message ?
        </label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Tous */}
          <button
            onClick={() => handleVisibilityTypeChange('all')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              visibilityType === 'all'
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              visibilityType === 'all' ? 'bg-blue-500/20' : 'bg-slate-700'
            }`}>
              <Globe className={`w-5 h-5 ${
                visibilityType === 'all' ? 'text-blue-400' : 'text-slate-400'
              }`} />
            </div>
            <div className="text-left flex-1">
              <p className={`font-medium ${
                visibilityType === 'all' ? 'text-white' : 'text-slate-300'
              }`}>
                Tous mes athlètes
              </p>
              <p className="text-xs text-slate-500">Visible par tous</p>
            </div>
            {visibilityType === 'all' && (
              <Check className="w-5 h-5 text-blue-400" />
            )}
          </button>

          {/* Groupes */}
          <button
            onClick={() => handleVisibilityTypeChange('groups')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              visibilityType === 'groups'
                ? 'border-emerald-500 bg-emerald-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              visibilityType === 'groups' ? 'bg-emerald-500/20' : 'bg-slate-700'
            }`}>
              <Users className={`w-5 h-5 ${
                visibilityType === 'groups' ? 'text-emerald-400' : 'text-slate-400'
              }`} />
            </div>
            <div className="text-left flex-1">
              <p className={`font-medium ${
                visibilityType === 'groups' ? 'text-white' : 'text-slate-300'
              }`}>
                Groupes spécifiques
              </p>
              <p className="text-xs text-slate-500">
                {selectedGroupsCount > 0 
                  ? `${selectedGroupsCount} groupe${selectedGroupsCount > 1 ? 's' : ''}`
                  : 'Choisir des groupes'
                }
              </p>
            </div>
            {visibilityType === 'groups' && (
              <Check className="w-5 h-5 text-emerald-400" />
            )}
          </button>

          {/* Athlètes */}
          <button
            onClick={() => handleVisibilityTypeChange('athletes')}
            className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
              visibilityType === 'athletes'
                ? 'border-purple-500 bg-purple-500/10'
                : 'border-slate-700 hover:border-slate-600 bg-slate-800/50'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              visibilityType === 'athletes' ? 'bg-purple-500/20' : 'bg-slate-700'
            }`}>
              <User className={`w-5 h-5 ${
                visibilityType === 'athletes' ? 'text-purple-400' : 'text-slate-400'
              }`} />
            </div>
            <div className="text-left flex-1">
              <p className={`font-medium ${
                visibilityType === 'athletes' ? 'text-white' : 'text-slate-300'
              }`}>
                Athlètes individuels
              </p>
              <p className="text-xs text-slate-500">
                {selectedAthletesCount > 0 
                  ? `${selectedAthletesCount} athlète${selectedAthletesCount > 1 ? 's' : ''}`
                  : 'Choisir des athlètes'
                }
              </p>
            </div>
            {visibilityType === 'athletes' && (
              <Check className="w-5 h-5 text-purple-400" />
            )}
          </button>
        </div>
      </div>

      {/* Sélection des groupes */}
      {visibilityType === 'groups' && (
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Sélectionner les groupes
          </label>
          {availableGroups.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center text-slate-500 text-sm">
              Aucun groupe disponible. Créez des groupes dans l'onglet Équipe.
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-lg divide-y divide-slate-800">
              {availableGroups.map((group) => {
                const isSelected = selectedGroupIds.includes(group.id);
                return (
                  <button
                    key={group.id}
                    onClick={() => handleToggleGroup(group.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${
                      isSelected ? 'bg-slate-800' : ''
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-emerald-500 border-emerald-500'
                        : 'border-slate-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${group.color}20` }}
                    >
                      <Users className="w-4 h-4" style={{ color: group.color }} />
                    </div>
                    <div className="flex-1 text-left">
                      <p className="text-white text-sm font-medium">{group.name}</p>
                      <p className="text-slate-500 text-xs">
                        {group.memberCount} membre{group.memberCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Sélection des athlètes */}
      {visibilityType === 'athletes' && (
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-2">
            Sélectionner les athlètes
          </label>
          {availableAthletes.length === 0 ? (
            <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4 text-center text-slate-500 text-sm">
              Aucun athlète disponible
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-700 rounded-lg divide-y divide-slate-800 max-h-64 overflow-y-auto">
              {availableAthletes.map((athlete) => {
                const isSelected = selectedAthleteIds.includes(athlete.id);
                return (
                  <button
                    key={athlete.id}
                    onClick={() => handleToggleAthlete(athlete.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-800 transition-colors ${
                      isSelected ? 'bg-slate-800' : ''
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      isSelected
                        ? 'bg-purple-500 border-purple-500'
                        : 'border-slate-600'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-slate-400 text-xs font-medium">
                      {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                    </div>
                    <span className="text-white text-sm">
                      {athlete.firstName} {athlete.lastName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Résumé de la sélection */}
      {(visibilityType === 'groups' && selectedGroupsCount > 0) && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
          <p className="text-sm text-emerald-400">
            ✓ Visible par {selectedGroupsCount} groupe{selectedGroupsCount > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {(visibilityType === 'athletes' && selectedAthletesCount > 0) && (
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
          <p className="text-sm text-purple-400">
            ✓ Visible par {selectedAthletesCount} athlète{selectedAthletesCount > 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};

export default VisibilitySelector;
