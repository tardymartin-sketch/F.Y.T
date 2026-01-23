// ============================================================
// F.Y.T - PERSONAL RECORDS LIST
// src/components/athlete/stats/PersonalRecordsList.tsx
// Liste des records personnels par exercice avec recherche et filtres
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  Dumbbell,
  TrendingUp,
  Flame,
  Loader2,
  Eye,
  Search,
  X,
  Clock,
  Repeat,
  History,
  Zap
} from 'lucide-react';

// Icône haut du corps avec traits arrondis
const UpperBodyIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Haut du corps - surligné (currentColor) */}
    {/* Tête */}
    <circle cx="12" cy="3.5" r="2.8" stroke="currentColor" />
    {/* Torse */}
    <path d="M12 6.3v7" stroke="currentColor" />
    {/* Bras gauche */}
    <path d="M12 8.5l-4.5 3.5v3.5" stroke="currentColor" />
    {/* Bras droit */}
    <path d="M12 8.5l4.5 3.5v3.5" stroke="currentColor" />

    {/* Bas du corps - grisé */}
    {/* Jambe gauche */}
    <path d="M12 13.3l-3 9" stroke="currentColor" opacity="0.25" />
    {/* Jambe droite */}
    <path d="M12 13.3l3 9" stroke="currentColor" opacity="0.25" />
  </svg>
);

// Icône bas du corps avec traits arrondis
const LowerBodyIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    {/* Haut du corps - grisé */}
    {/* Tête */}
    <circle cx="12" cy="3.5" r="2.8" stroke="currentColor" opacity="0.25" />
    {/* Torse */}
    <path d="M12 6.3v7" stroke="currentColor" opacity="0.25" />
    {/* Bras gauche */}
    <path d="M12 8.5l-4.5 3.5v3.5" stroke="currentColor" opacity="0.25" />
    {/* Bras droit */}
    <path d="M12 8.5l4.5 3.5v3.5" stroke="currentColor" opacity="0.25" />

    {/* Bas du corps - surligné (currentColor) */}
    {/* Jambe gauche */}
    <path d="M12 13.3l-3 9" stroke="currentColor" />
    {/* Jambe droite */}
    <path d="M12 13.3l3 9" stroke="currentColor" />
  </svg>
);
import { fetchPersonalRecordsEnhanced } from '../../../services/supabaseService';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
  onViewSession?: (sessionLogId: string, exerciseName: string) => void;
}

interface PRRecord {
  exerciseName: string;
  maxWeight: number;
  maxVolume: number;
  max1RM: number;
  maxReps: number;
  maxDuration: number;
  lastDate: string;
  sessionLogId: string;
  movementPattern: string | null;
  muscleGroup: string | null;
  muscleGroupId: string | null;
  categoryCode: string | null;
}

type FilterType = 'recent' | 'upper' | 'lower' | 'core' | 'saq' | null;

// ===========================================
// HELPERS
// ===========================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

function formatWeight(value: number): string {
  return `${value.toFixed(1)} kg`;
}

function formatVolume(value: number): string {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}t`;
  }
  return `${Math.round(value)} kg`;
}

function formatDuration(seconds: number): string {
  if (seconds >= 60) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}min ${remainingSeconds}s` : `${minutes}min`;
  }
  return `${seconds}s`;
}

/**
 * Normalise une chaîne pour la recherche (supprime accents, minuscules)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ===========================================
// COMPONENT
// ===========================================

export const PersonalRecordsList: React.FC<Props> = ({ userId, onViewSession }) => {
  const [records, setRecords] = useState<PRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>(null);

  // Modal state
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<PRRecord | null>(null);

  useEffect(() => {
    const loadRecords = async () => {
      try {
        setLoading(true);
        const data = await fetchPersonalRecordsEnhanced(userId);

        const recordsList: PRRecord[] = Object.entries(data).map(([name, values]) => ({
          exerciseName: name,
          maxWeight: values.maxWeight,
          maxVolume: values.maxVolume,
          max1RM: values.max1RM,
          maxReps: values.maxReps,
          maxDuration: values.maxDuration,
          lastDate: values.lastDate,
          sessionLogId: values.sessionLogId,
          movementPattern: values.movementPattern,
          muscleGroup: values.muscleGroup,
          muscleGroupId: values.muscleGroupId,
          categoryCode: values.categoryCode,
        }));

        setRecords(recordsList);
      } catch (err) {
        console.error('Error loading PRs:', err);
        setError('Erreur lors du chargement des records');
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [userId]);

  // Vérifier si des filtres sont actifs
  const hasActiveFilters = searchQuery.length > 0 || activeFilter !== null;

  // Filtrer et trier
  const filteredRecords = useMemo(() => {
    // Si aucun filtre actif → liste vide
    if (!hasActiveFilters) {
      return [];
    }

    let results = records;

    // Filtre par catégorie (utilise categoryCode de la base)
    if (activeFilter === 'upper' || activeFilter === 'lower' || activeFilter === 'core' || activeFilter === 'saq') {
      results = results.filter(r => r.categoryCode === activeFilter);
    }

    // Recherche texte (accent-insensitive, case-insensitive)
    if (searchQuery) {
      const normalizedQuery = normalizeString(searchQuery);
      const startsWithQuery = results
        .filter(r => normalizeString(r.exerciseName).startsWith(normalizedQuery))
        .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

      const containsQuery = results
        .filter(r =>
          !normalizeString(r.exerciseName).startsWith(normalizedQuery) &&
          normalizeString(r.exerciseName).includes(normalizedQuery)
        )
        .sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));

      results = [...startsWithQuery, ...containsQuery];
    } else if (activeFilter === 'recent') {
      // Tri par date décroissante pour le filtre "Récents"
      results = results
        .filter(r => r.lastDate)
        .sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());
    } else {
      // Tri alphabétique par défaut
      results = results.sort((a, b) => a.exerciseName.localeCompare(b.exerciseName));
    }

    return results;
  }, [records, searchQuery, activeFilter, hasActiveFilters]);

  const handleViewClick = (record: PRRecord) => {
    setSelectedRecord(record);
    setShowViewModal(true);
  };

  const handleConfirmView = () => {
    if (selectedRecord && onViewSession) {
      onViewSession(selectedRecord.sessionLogId, selectedRecord.exerciseName);
    }
    setShowViewModal(false);
    setSelectedRecord(null);
  };

  const handleFilterClick = (filter: FilterType) => {
    // Toggle le filtre si déjà actif
    setActiveFilter(prev => prev === filter ? null : filter);
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setActiveFilter(null);
  };

  // Catégories présentes dans les records de l'utilisateur
  // IMPORTANT: Ces hooks doivent être avant tout return conditionnel
  const userCategoryCodes = useMemo(() => {
    const codes = new Set<string>();
    records.forEach(r => {
      if (r.categoryCode) codes.add(r.categoryCode);
    });
    return codes;
  }, [records]);

  // Filtres dynamiques : "Récents" toujours visible + catégories présentes dans l'historique
  const filters = useMemo(() => {
    const allCategoryFilters: { id: FilterType; icon: React.ReactNode; title: string }[] = [
      { id: 'upper', icon: <UpperBodyIcon className="w-7 h-7" />, title: 'Haut du corps' },
      { id: 'lower', icon: <LowerBodyIcon className="w-7 h-7" />, title: 'Bas du corps' },
      { id: 'core', icon: <Flame className="w-7 h-7" strokeWidth={2.5} />, title: 'Gainage' },
      { id: 'saq', icon: <Zap className="w-7 h-7" strokeWidth={2.5} />, title: 'S.A.Q.' },
    ];

    const visibleFilters: { id: FilterType; icon: React.ReactNode; title: string }[] = [
      { id: 'recent', icon: <History className="w-7 h-7" strokeWidth={2.5} />, title: 'Récents' },
    ];

    // TODO: Remettre ce filtre après les tests
    // allCategoryFilters.forEach(filter => {
    //   if (filter.id && userCategoryCodes.has(filter.id)) {
    //     visibleFilters.push(filter);
    //   }
    // });

    // TEMPORAIRE: Afficher toutes les catégories pour les tests
    allCategoryFilters.forEach(filter => {
      visibleFilters.push(filter);
    });

    return visibleFilters;
  }, [userCategoryCodes]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-center text-red-400">
        {error}
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Aucun record pour l'instant</p>
        <p className="text-slate-500 text-sm mt-1">Complete des seances pour voir tes PRs</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Barre de recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Rechercher un exercice..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filtres icônes */}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${filters.length}, 1fr)` }}>
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => handleFilterClick(filter.id)}
            title={filter.title}
            className={`
              flex items-center justify-center py-2.5 rounded-xl transition-all
              ${activeFilter === filter.id
                ? 'bg-purple-500 text-white shadow-lg shadow-purple-500/20'
                : 'bg-slate-800/50 border border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white'
              }
            `}
          >
            {filter.icon}
          </button>
        ))}
      </div>

      {/* Affichage du filtre actif */}
      {activeFilter && (
        <div className="text-xs text-slate-400">
          {filters.find(f => f.id === activeFilter)?.title}
        </div>
      )}

      {/* Bouton clear si filtres actifs */}
      {hasActiveFilters && (
        <button
          onClick={handleClearFilters}
          className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          <X className="w-3 h-3" />
          Effacer les filtres
        </button>
      )}

      {/* Message quand aucun filtre actif */}
      {!hasActiveFilters && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
          <Search className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Utilise la recherche ou les filtres</p>
          <p className="text-slate-500 text-sm mt-1">pour voir tes records personnels</p>
        </div>
      )}

      {/* Message si filtres actifs mais aucun résultat */}
      {hasActiveFilters && filteredRecords.length === 0 && (
        <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-8 text-center">
          <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400">Aucun exercice trouvé</p>
          <p className="text-slate-500 text-sm mt-1">Essaie avec d'autres critères</p>
        </div>
      )}

      {/* Records list */}
      {filteredRecords.length > 0 && (
        <>
          <div className="space-y-3">
            {filteredRecords.map((record) => {
              // Déterminer si l'exercice a des données de poids ou non
              const hasWeightData = record.maxWeight > 0 || record.max1RM > 0;
              const isTimeExercise = record.maxDuration > 0 && record.maxReps === 0;

              return (
                <div
                  key={record.exerciseName}
                  className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 hover:bg-slate-800/70 transition-colors"
                >
                  {/* Exercise name with date and eye button */}
                  <div className="flex items-start justify-between mb-3 gap-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-white leading-tight">{record.exerciseName}</h3>
                      {record.muscleGroup && (
                        <span className="text-xs text-slate-500">{record.muscleGroup}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {formatDate(record.lastDate)}
                      </span>
                      {record.sessionLogId && onViewSession && (
                        <button
                          onClick={() => handleViewClick(record)}
                          className="p-1.5 bg-slate-700/50 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                          title="Voir la seance"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    {hasWeightData ? (
                      <>
                        {/* Max Weight */}
                        <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-amber-400 mb-1">
                            <Dumbbell className="w-3 h-3" />
                            <span className="text-xs font-medium">Poids</span>
                          </div>
                          <span className="text-white font-bold text-sm">
                            {record.maxWeight > 0 ? formatWeight(record.maxWeight) : '-'}
                          </span>
                        </div>

                        {/* Max Volume */}
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-blue-400 mb-1">
                            <TrendingUp className="w-3 h-3" />
                            <span className="text-xs font-medium">Volume</span>
                          </div>
                          <span className="text-white font-bold text-sm">
                            {record.maxVolume > 0 ? formatVolume(record.maxVolume) : '-'}
                          </span>
                        </div>

                        {/* Max 1RM */}
                        <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 text-center">
                          <div className="flex items-center justify-center gap-1 text-orange-400 mb-1">
                            <Flame className="w-3 h-3" />
                            <span className="text-xs font-medium">1RM</span>
                          </div>
                          <span className="text-white font-bold text-sm">
                            {record.max1RM > 0 ? formatWeight(record.max1RM) : '-'}
                          </span>
                        </div>
                      </>
                    ) : isTimeExercise ? (
                      <>
                        {/* Max Duration - exercice chronométré */}
                        <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 text-center col-span-3">
                          <div className="flex items-center justify-center gap-1 text-purple-400 mb-1">
                            <Clock className="w-3 h-3" />
                            <span className="text-xs font-medium">Durée max</span>
                          </div>
                          <span className="text-white font-bold text-sm">
                            {formatDuration(record.maxDuration)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Max Reps - exercice au poids du corps */}
                        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center col-span-3">
                          <div className="flex items-center justify-center gap-1 text-green-400 mb-1">
                            <Repeat className="w-3 h-3" />
                            <span className="text-xs font-medium">Reps max</span>
                          </div>
                          <span className="text-white font-bold text-sm">
                            {record.maxReps > 0 ? `${record.maxReps} reps` : '-'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-4 text-center">
            <p className="text-slate-400 text-sm">
              <span className="text-white font-medium">{filteredRecords.length}</span> exercice{filteredRecords.length > 1 ? 's' : ''} trouvé{filteredRecords.length > 1 ? 's' : ''}
            </p>
          </div>
        </>
      )}

      {/* Modal de confirmation */}
      {showViewModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Eye className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Voir la seance</h3>
                </div>
              </div>
              <button
                onClick={() => setShowViewModal(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-slate-300 mb-6">
              Voulez-vous voir la seance complete ou ce record a ete realise ?
            </p>

            <div className="bg-slate-800/50 rounded-xl p-3 mb-6">
              <p className="text-sm text-slate-400">Exercice</p>
              <p className="text-white font-medium">{selectedRecord.exerciseName}</p>
              <p className="text-xs text-slate-500 mt-1">{formatDate(selectedRecord.lastDate)}</p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowViewModal(false)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmView}
                className="flex-1 py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium transition-colors"
              >
                Voir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalRecordsList;
