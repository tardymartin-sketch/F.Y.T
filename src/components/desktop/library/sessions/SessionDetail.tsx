import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Save, Plus, Trash2, GripVertical, Link2, Unlink, Dumbbell, ChevronDown, Search } from 'lucide-react';
import {
  SessionTemplate,
  SessionExercise,
  Exercise,
  ExecutionMode,
  EXECUTION_MODES,
} from '../../../../../types';

interface SessionDetailProps {
  session: SessionTemplate | null;
  exercises: Exercise[];
  coachId: string;
  onSave: (session: Omit<SessionTemplate, 'coachId' | 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  onClose: () => void;
  isNewSession?: boolean;
  onSessionCreated?: (seanceType: string) => void;
}

// Get current year and week
function getCurrentYearWeek() {
  const now = new Date();
  const year = now.getFullYear();
  const startOfYear = new Date(year, 0, 1);
  const days = Math.floor((now.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
  return { year, week };
}

// Get month name in French
function getMonthName(monthNum: number): string {
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return months[monthNum - 1] || '';
}

// Normalize string for search (remove accents, lowercase)
function normalizeForSearch(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Mode d'exécution disponibles pour l'UI
const AVAILABLE_EXECUTION_MODES: ExecutionMode[] = ['straight', 'superset'];

// Icône pour chaque mode
function ExecutionModeIcon({ mode, className }: { mode: ExecutionMode; className?: string }) {
  switch (mode) {
    case 'superset':
    case 'triset':
      return <Link2 className={className} />;
    default:
      return <Dumbbell className={className} />;
  }
}

export function SessionDetail({
  session,
  exercises,
  coachId,
  onSave,
  onClose,
  isNewSession = false,
  onSessionCreated,
}: SessionDetailProps) {
  const { year: currentYear, week: currentWeek } = getCurrentYearWeek();
  const currentMonth = new Date().getMonth() + 1;

  // Form state
  const [seanceType, setSeanceType] = useState('');
  const [year, setYear] = useState<number | undefined>(currentYear);
  const [week, setWeek] = useState<number | undefined>(currentWeek);
  const [monthNum, setMonthNum] = useState<number | undefined>(currentMonth);
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exercise search (for adding new exercises)
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);

  // Superset search state (per exercise)
  const [supersetSearchIdx, setSupersetSearchIdx] = useState<number | null>(null);
  const [supersetSearch, setSupersetSearch] = useState('');
  const supersetSearchRef = useRef<HTMLInputElement>(null);

  // Mode dropdown state
  const [modeDropdownIdx, setModeDropdownIdx] = useState<number | null>(null);

  // Initialize form from session
  useEffect(() => {
    if (session) {
      setSeanceType(session.seanceType);
      setYear(session.validityYear || currentYear);
      setWeek(session.validityWeek || currentWeek);
      setMonthNum(session.validityMonth || currentMonth);
      setSessionExercises(session.exercises.map(ex => ({ ...ex })));
    } else if (isNewSession) {
      setSeanceType('');
      setYear(currentYear);
      setWeek(currentWeek);
      setMonthNum(currentMonth);
      setSessionExercises([]);
    }
    setHasChanges(false);
  }, [session, isNewSession]);

  // Focus superset search when it opens
  useEffect(() => {
    if (supersetSearchIdx !== null && supersetSearchRef.current) {
      supersetSearchRef.current.focus();
    }
  }, [supersetSearchIdx]);

  // Filter exercises for dropdown
  const filteredExercises = exercises.filter(ex =>
    ex.name.toLowerCase().includes(exerciseSearch.toLowerCase())
  );

  // Filter exercises for superset search
  const supersetSearchResults = useMemo(() => {
    if (supersetSearchIdx === null) return { matching: [], inSession: [] };

    const currentExercise = sessionExercises[supersetSearchIdx];
    const normalizedSearch = normalizeForSearch(supersetSearch);

    // Exercices déjà dans la séance (sauf l'exercice courant et ceux déjà en superset)
    const exercisesInSession = sessionExercises
      .filter((ex, idx) =>
        idx !== supersetSearchIdx &&
        !ex.executionGroupId &&
        ex.executionMode === 'straight'
      );

    // Si pas de recherche, retourner seulement les exercices de la séance
    if (!supersetSearch.trim()) {
      return {
        matching: [],
        inSession: exercisesInSession
      };
    }

    // Exercices correspondant à la recherche (pas déjà dans la séance)
    const sessionExerciseIds = new Set(sessionExercises.map(ex => ex.exerciseId));
    const matchingExercises = exercises.filter(ex => {
      if (sessionExerciseIds.has(ex.id)) return false; // Déjà dans la séance
      const normalizedName = normalizeForSearch(ex.name);
      return normalizedName.includes(normalizedSearch);
    });

    // Exercices de la séance correspondant à la recherche
    const matchingInSession = exercisesInSession.filter(ex => {
      const normalizedName = normalizeForSearch(ex.exerciseName);
      return normalizedName.includes(normalizedSearch);
    });

    return {
      matching: matchingExercises.slice(0, 5),
      inSession: matchingInSession
    };
  }, [supersetSearch, supersetSearchIdx, sessionExercises, exercises]);

  const handleAddExercise = (exercise: Exercise) => {
    const newExercise: SessionExercise = {
      id: Date.now().toString(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      position: sessionExercises.length,
      targetSets: '3',
      targetReps: '10',
      tempo: exercise.tempo,
      executionMode: 'straight',
    };
    setSessionExercises([...sessionExercises, newExercise]);
    setExerciseSearch('');
    setShowExerciseDropdown(false);
    setHasChanges(true);
  };

  // Changer le mode d'exécution d'un exercice
  const handleExecutionModeChange = (idx: number, mode: ExecutionMode) => {
    const exercise = sessionExercises[idx];

    if (mode === 'straight') {
      // Si on passe en mode normal, dissocier le superset si existant
      if (exercise.executionGroupId) {
        handleBreakSuperset(exercise.executionGroupId);
      } else {
        const updated = [...sessionExercises];
        updated[idx] = {
          ...updated[idx],
          executionMode: 'straight',
          executionGroupId: undefined,
          executionGroupPosition: undefined,
        };
        setSessionExercises(updated);
        setHasChanges(true);
      }
    } else if (mode === 'superset') {
      // Ouvrir la recherche pour le superset
      setSupersetSearchIdx(idx);
      setSupersetSearch('');
    }

    setModeDropdownIdx(null);
  };

  // Lier un exercice en superset
  const handleLinkSuperset = (primaryIdx: number, secondaryExercise: Exercise | SessionExercise) => {
    const groupId = crypto.randomUUID();
    const updated = [...sessionExercises];

    // Mettre à jour l'exercice principal
    updated[primaryIdx] = {
      ...updated[primaryIdx],
      executionMode: 'superset',
      executionGroupId: groupId,
      executionGroupPosition: 0,
    };

    // Vérifier si c'est un exercice existant dans la séance ou un nouvel exercice
    const isExistingInSession = 'id' in secondaryExercise &&
      sessionExercises.some(ex => ex.id === secondaryExercise.id);

    if (isExistingInSession) {
      // C'est un exercice existant dans la séance
      const existingEx = secondaryExercise as SessionExercise;
      const existingIdx = updated.findIndex(ex => ex.id === existingEx.id);
      if (existingIdx >= 0) {
        // Retirer l'exercice de sa position actuelle
        const [removed] = updated.splice(existingIdx, 1);

        // Trouver le nouvel index de l'exercice principal (peut avoir changé après splice)
        const newPrimaryIdx = updated.findIndex(ex => ex.executionGroupId === groupId && ex.executionGroupPosition === 0);

        // Insérer juste après l'exercice principal
        updated.splice(newPrimaryIdx + 1, 0, {
          ...removed,
          executionMode: 'superset',
          executionGroupId: groupId,
          executionGroupPosition: 1,
          targetSets: updated[newPrimaryIdx].targetSets, // Synchroniser les séries
        });
      }
    } else {
      // C'est un nouvel exercice à ajouter
      const newEx = secondaryExercise as Exercise;

      // Trouver l'index actuel de l'exercice principal
      const primaryIdxAfter = updated.findIndex(ex => ex.executionGroupId === groupId && ex.executionGroupPosition === 0);

      // Insérer le nouvel exercice juste après le principal
      updated.splice(primaryIdxAfter + 1, 0, {
        id: Date.now().toString(),
        exerciseId: newEx.id,
        exerciseName: newEx.name,
        position: primaryIdxAfter + 1,
        targetSets: updated[primaryIdxAfter].targetSets,
        targetReps: '10',
        tempo: newEx.tempo,
        executionMode: 'superset',
        executionGroupId: groupId,
        executionGroupPosition: 1,
      });
    }

    // Recalculer les positions
    updated.forEach((ex, i) => ex.position = i);

    setSessionExercises(updated);
    setSupersetSearchIdx(null);
    setSupersetSearch('');
    setHasChanges(true);
  };

  // Dissocier un superset
  const handleBreakSuperset = (groupId: string) => {
    const updated = sessionExercises.map(ex => {
      if (ex.executionGroupId === groupId) {
        return {
          ...ex,
          executionMode: 'straight' as ExecutionMode,
          executionGroupId: undefined,
          executionGroupPosition: undefined,
        };
      }
      return ex;
    });

    setSessionExercises(updated);
    setHasChanges(true);
  };

  const handleRemoveExercise = (index: number) => {
    const exercise = sessionExercises[index];

    // Si l'exercice est dans un superset, dissocier d'abord
    if (exercise.executionGroupId) {
      // Trouver l'autre exercice du superset
      const otherExercises = sessionExercises.filter(
        ex => ex.executionGroupId === exercise.executionGroupId && ex.id !== exercise.id
      );

      // Remettre les autres en mode straight
      const updated = sessionExercises.map(ex => {
        if (ex.executionGroupId === exercise.executionGroupId && ex.id !== exercise.id) {
          return {
            ...ex,
            executionMode: 'straight' as ExecutionMode,
            executionGroupId: undefined,
            executionGroupPosition: undefined,
          };
        }
        return ex;
      }).filter((_, i) => i !== index);

      updated.forEach((ex, i) => ex.position = i);
      setSessionExercises(updated);
    } else {
      const updated = sessionExercises.filter((_, i) => i !== index);
      updated.forEach((ex, i) => ex.position = i);
      setSessionExercises(updated);
    }

    setHasChanges(true);
  };

  const handleExerciseChange = (index: number, field: keyof SessionExercise, value: any) => {
    const updated = [...sessionExercises];
    updated[index] = { ...updated[index], [field]: value };

    // Si on change les séries d'un exercice en superset, synchroniser avec l'autre
    if (field === 'targetSets' && updated[index].executionGroupId) {
      updated.forEach((ex, i) => {
        if (i !== index && ex.executionGroupId === updated[index].executionGroupId) {
          ex.targetSets = value;
        }
      });
    }

    setSessionExercises(updated);
    setHasChanges(true);
  };

  const handleSave = async () => {
    setError(null);

    if (!seanceType.trim()) {
      setError('Le nom de la séance est requis');
      return;
    }

    if (sessionExercises.length === 0) {
      setError('Ajoutez au moins un exercice');
      return;
    }

    setSaving(true);
    try {
      await onSave({
        seanceType: seanceType.trim(),
        exercises: sessionExercises,
        validityYear: year,
        validityWeek: week,
        validityMonth: monthNum,
      });

      if (isNewSession && onSessionCreated) {
        onSessionCreated(seanceType.trim());
        onClose();
      }
      setHasChanges(false);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // Fermer les dropdowns au clic extérieur
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modeDropdownIdx !== null) {
        setModeDropdownIdx(null);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [modeDropdownIdx]);

  // Rendu d'un bloc exercice (seul ou en groupe)
  const renderExerciseBlock = (ex: SessionExercise, idx: number) => {
    const isInSuperset = !!(ex.executionGroupId && ex.executionMode === 'superset');

    // Si c'est le 2ème exercice d'un superset, ne pas le rendre ici (il sera rendu avec le premier)
    if (isInSuperset && ex.executionGroupPosition !== 0) {
      return null;
    }

    // Trouver l'exercice lié si c'est un superset
    const linkedExercise = isInSuperset
      ? sessionExercises.find(e => e.executionGroupId === ex.executionGroupId && e.executionGroupPosition === 1)
      : null;

    const linkedIdx = linkedExercise
      ? sessionExercises.findIndex(e => e.id === linkedExercise.id)
      : -1;

    return (
      <div
        key={ex.id}
        className={`p-3 bg-theme-secondary rounded-lg ${
          isInSuperset ? 'border-l-4 border-[var(--color-primary)]' : ''
        }`}
      >
        {/* Exercice principal */}
        {renderSingleExercise(ex, idx, isInSuperset)}

        {/* Exercice lié (si superset) */}
        {linkedExercise && (
          <>
            {/* Séparateur visuel */}
            <div className="flex items-center justify-center my-2">
              <div className="flex-1 border-t border-[var(--color-primary)]/30" />
              <Link2 className="w-4 h-4 text-[var(--color-primary)] mx-2" />
              <div className="flex-1 border-t border-[var(--color-primary)]/30" />
            </div>
            {/* Deuxième exercice */}
            {renderSingleExercise(linkedExercise, linkedIdx, true, true)}
          </>
        )}

        {/* Barre de recherche superset (si mode superset sélectionné mais pas encore lié) */}
        {supersetSearchIdx === idx && (
          <div className="mt-3 pt-3 border-t border-theme">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
              <input
                ref={supersetSearchRef}
                type="text"
                value={supersetSearch}
                onChange={(e) => setSupersetSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setSupersetSearchIdx(null);
                    setSupersetSearch('');
                    // Remettre en mode straight si on annule
                    const updated = [...sessionExercises];
                    updated[idx] = {
                      ...updated[idx],
                      executionMode: 'straight',
                    };
                    setSessionExercises(updated);
                  }
                }}
                className="w-full pl-10 pr-3 py-2 bg-theme border border-[var(--color-primary)]/50 rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
                placeholder="Rechercher l'exercice à lier..."
              />
            </div>

            {/* Résultats de recherche */}
            <div className="mt-2 max-h-48 overflow-y-auto">
              {/* Exercices correspondants (nouveaux) */}
              {supersetSearchResults.matching.length > 0 && (
                <div className="mb-2">
                  <p className="text-xs text-theme-muted px-2 py-1">Ajouter un exercice</p>
                  {supersetSearchResults.matching.map(matchEx => (
                    <button
                      key={matchEx.id}
                      onClick={() => handleLinkSuperset(idx, matchEx)}
                      className="w-full px-3 py-2 text-left text-sm text-theme hover:bg-theme-tertiary rounded flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-[var(--color-primary)]" />
                      {matchEx.name}
                    </button>
                  ))}
                </div>
              )}

              {/* Exercices de la séance */}
              {supersetSearchResults.inSession.length > 0 && (
                <div>
                  <p className="text-xs text-theme-muted px-2 py-1">Exercices de la séance</p>
                  {supersetSearchResults.inSession.map(sessionEx => (
                    <button
                      key={sessionEx.id}
                      onClick={() => handleLinkSuperset(idx, sessionEx)}
                      className="w-full px-3 py-2 text-left text-sm text-theme hover:bg-theme-tertiary rounded flex items-center gap-2"
                    >
                      <Link2 className="w-4 h-4 text-[var(--color-primary)]" />
                      {sessionEx.exerciseName}
                    </button>
                  ))}
                </div>
              )}

              {/* Aucun résultat */}
              {supersetSearchResults.matching.length === 0 && supersetSearchResults.inSession.length === 0 && supersetSearch.trim() && (
                <p className="px-3 py-2 text-sm text-theme-muted">Aucun exercice trouvé</p>
              )}

              {/* Message initial */}
              {!supersetSearch.trim() && supersetSearchResults.inSession.length === 0 && (
                <p className="px-3 py-2 text-sm text-theme-muted">Tapez pour rechercher un exercice...</p>
              )}
            </div>

            {/* Bouton annuler */}
            <button
              onClick={() => {
                setSupersetSearchIdx(null);
                setSupersetSearch('');
                // Remettre en mode straight
                const updated = [...sessionExercises];
                updated[idx] = {
                  ...updated[idx],
                  executionMode: 'straight',
                };
                setSessionExercises(updated);
              }}
              className="mt-2 text-sm text-theme-muted hover:text-[var(--color-danger)]"
            >
              Annuler
            </button>
          </div>
        )}
      </div>
    );
  };

  // Rendu d'un seul exercice (utilisé pour les exercices seuls et dans les supersets)
  const renderSingleExercise = (ex: SessionExercise, idx: number, isPartOfSuperset: boolean, isSecondary: boolean = false) => {
    return (
      <div className="flex items-start gap-2">
        <GripVertical className="w-4 h-4 text-theme-muted cursor-move mt-1 flex-shrink-0" />
        {!isPartOfSuperset && (
          <span className="text-theme-muted text-sm w-6 mt-0.5">{idx + 1}.</span>
        )}

        <div className="flex-1 min-w-0">
          {/* Ligne: Nom + Sélecteur mode */}
          <div className="flex items-center gap-2 mb-2">
            <p className="text-theme text-sm font-medium flex-1 truncate">{ex.exerciseName}</p>

            {/* Sélecteur de mode d'exécution (seulement pour l'exercice principal ou non-superset) */}
            {!isSecondary && (
              <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setModeDropdownIdx(modeDropdownIdx === idx ? null : idx)}
                  className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded border transition-colors ${
                    ex.executionMode === 'superset'
                      ? 'bg-[var(--color-primary)]/10 border-[var(--color-primary)]/30 text-[var(--color-primary)]'
                      : 'bg-theme-tertiary border-theme text-theme-muted hover:text-theme'
                  }`}
                >
                  <ExecutionModeIcon mode={ex.executionMode || 'straight'} className="w-3 h-3" />
                  <span>{EXECUTION_MODES[ex.executionMode || 'straight'].labelShort}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>

                {/* Dropdown des modes */}
                {modeDropdownIdx === idx && (
                  <div className="absolute right-0 top-full mt-1 bg-theme-secondary border border-theme rounded-lg shadow-xl z-20 min-w-[140px]">
                    {AVAILABLE_EXECUTION_MODES.map(mode => (
                      <button
                        key={mode}
                        onClick={() => handleExecutionModeChange(idx, mode)}
                        className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 hover:bg-theme-tertiary transition-colors ${
                          ex.executionMode === mode ? 'text-[var(--color-primary)]' : 'text-theme'
                        }`}
                      >
                        <ExecutionModeIcon mode={mode} className="w-4 h-4" />
                        {EXECUTION_MODES[mode].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Ligne: Paramètres */}
          <div className="flex items-center gap-4 flex-wrap">
            {/* Séries: seulement pour le premier exercice du groupe ou exercice seul */}
            {!isSecondary && (
              <div className="flex items-center gap-1">
                <input
                  type="text"
                  value={ex.targetSets || ''}
                  onChange={(e) => handleExerciseChange(idx, 'targetSets', e.target.value || undefined)}
                  className="w-12 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center"
                  placeholder="3"
                />
                <span className="text-theme-muted text-xs">séries</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={ex.targetReps || ''}
                onChange={(e) => handleExerciseChange(idx, 'targetReps', e.target.value)}
                className="w-16 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center"
                placeholder="10"
              />
              <span className="text-theme-muted text-xs">reps</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={ex.tempo || ''}
                onChange={(e) => handleExerciseChange(idx, 'tempo', e.target.value)}
                className="w-20 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center"
                placeholder="libre"
              />
              <span className="text-theme-muted text-xs">tempo</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={ex.restTimeSec || ''}
                onChange={(e) => handleExerciseChange(idx, 'restTimeSec', e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-14 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center"
                placeholder="60"
              />
              <span className="text-theme-muted text-xs">repos (s)</span>
            </div>
          </div>

          {/* Notes/Consignes */}
          {ex.notes && (
            <p className="mt-1 text-xs text-[var(--color-primary)] italic">{ex.notes}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {/* Bouton dissocier (si superset et exercice secondaire) */}
          {isPartOfSuperset && isSecondary && (
            <button
              onClick={() => handleBreakSuperset(ex.executionGroupId!)}
              className="p-1.5 text-theme-muted hover:text-[var(--color-warning)] transition-colors"
              title="Dissocier le superset"
            >
              <Unlink className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleRemoveExercise(idx)}
            className="p-1.5 text-theme-muted hover:text-[var(--color-danger)]"
            title="Supprimer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-theme">
        <h2 className="text-lg font-semibold text-theme">
          {isNewSession ? 'Nouvelle séance' : session?.seanceType || 'Modifier la séance'}
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 text-theme-muted hover:text-theme"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Save button */}
      {hasChanges && (
        <div className="p-2 bg-theme-tertiary border-b border-theme flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Sauvegarde...' : isNewSession ? 'Créer' : 'Sauvegarder'}
          </button>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {error && (
          <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg text-[var(--color-danger)] text-sm">
            {error}
          </div>
        )}

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-theme mb-1">
            Nom de la séance *
          </label>
          <input
            type="text"
            value={seanceType}
            onChange={(e) => {
              setSeanceType(e.target.value);
              setHasChanges(true);
            }}
            className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            placeholder="Ex: Haut du corps A"
          />
        </div>

        {/* Period */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Année
            </label>
            <input
              type="number"
              value={year || ''}
              onChange={(e) => {
                setYear(e.target.value ? parseInt(e.target.value) : undefined);
                setHasChanges(true);
              }}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              placeholder={currentYear.toString()}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Mois
            </label>
            <select
              value={monthNum || ''}
              onChange={(e) => {
                setMonthNum(e.target.value ? parseInt(e.target.value) : undefined);
                setHasChanges(true);
              }}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              <option value="">-</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{getMonthName(i + 1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-theme mb-1">
              Semaine
            </label>
            <input
              type="number"
              value={week || ''}
              onChange={(e) => {
                setWeek(e.target.value ? parseInt(e.target.value) : undefined);
                setHasChanges(true);
              }}
              min={1}
              max={53}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              placeholder={currentWeek.toString()}
            />
          </div>
        </div>

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-theme">
              Exercices *
            </label>
            <span className="text-xs text-theme-muted">
              {sessionExercises.length} exercice{sessionExercises.length > 1 ? 's' : ''}
            </span>
          </div>

          {/* Exercise list */}
          <div className="space-y-2 mb-3">
            {sessionExercises.map((ex, idx) => renderExerciseBlock(ex, idx))}
          </div>

          {/* Add exercise */}
          <div className="relative">
            <input
              type="text"
              value={exerciseSearch}
              onChange={(e) => {
                setExerciseSearch(e.target.value);
                setShowExerciseDropdown(true);
              }}
              onFocus={() => setShowExerciseDropdown(true)}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              placeholder="Rechercher un exercice à ajouter..."
            />
            {showExerciseDropdown && exerciseSearch && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-theme-secondary border border-theme rounded-lg shadow-xl z-10 max-h-48 overflow-y-auto">
                {filteredExercises.length === 0 ? (
                  <div className="p-3 text-theme-muted text-sm">Aucun exercice trouvé</div>
                ) : (
                  filteredExercises.slice(0, 10).map(ex => (
                    <button
                      key={ex.id}
                      onClick={() => handleAddExercise(ex)}
                      className="w-full px-3 py-2 text-left text-sm text-theme hover:bg-theme-tertiary flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4 text-[var(--color-primary)]" />
                      {ex.name}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
