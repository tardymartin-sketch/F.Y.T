import { useState, useEffect, useMemo } from 'react';
import { Dumbbell, Calendar, FolderKanban, Search, Plus, Filter, X, Library } from 'lucide-react';
import { ExercisesList } from './exercises/ExercisesList';
import { SessionsList } from './sessions/SessionsList';
import { ProgramsList } from './programs/ProgramsList';
import {
  Exercise,
  SessionTemplate,
  Program,
  MuscleGroup,
  MovementPattern,
  ExerciseCategory,
  User,
  AthleteGroupWithCount,
  SessionExercise,
} from '../../../../types';
import {
  fetchExercisesForCoach,
  fetchSessionTemplates,
  fetchPrograms,
  fetchMuscleGroups,
  fetchMovementPatterns,
  fetchExerciseCategories,
  createMuscleGroup,
  createMovementPattern,
  fetchTeamAthletes,
  fetchAthleteGroups,
} from '../../../services/supabaseService';

type LibraryTab = 'exercises' | 'sessions' | 'programs';

interface LibraryViewProps {
  coachId: string;
}

// Normalize string for search (remove accents and lowercase)
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// Normalize exercise name for search (removes "(copie)", "(copie 2)", etc.)
function normalizeExerciseName(name: string): string {
  return name
    .replace(/\s*\(copie(?:\s+\d+)?\)\s*$/i, '')
    .toLowerCase()
    .trim();
}

// Limb type options for category filter
const limbTypeOptions = [
  { id: 'bilateral', label: 'Bilatéral' },
  { id: 'unilateral', label: 'Unilatéral' },
  { id: 'asymmetrical', label: 'Asymétrique' },
];

export function LibraryView({ coachId }: LibraryViewProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('exercises');
  const [searchTerm, setSearchTerm] = useState('');

  // Sélection secondaire dans les résultats de recherche
  const [searchSecondarySelection, setSearchSecondarySelection] = useState<{
    type: 'exercise' | 'session';
    label: string;
    items: Exercise[] | SessionExercise[];
  } | null>(null);


  // Data states
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [sessions, setSessions] = useState<SessionTemplate[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [movementPatterns, setMovementPatterns] = useState<MovementPattern[]>([]);
  const [exerciseCategories, setExerciseCategories] = useState<ExerciseCategory[]>([]);
  const [athletes, setAthletes] = useState<User[]>([]);
  const [groups, setGroups] = useState<AthleteGroupWithCount[]>([]);

  // Loading states
  const [loading, setLoading] = useState(true);

  // Filters
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<string>('');
  const [limbTypeFilter, setLimbTypeFilter] = useState<string>('');
  const [muscleGroupFilter, setMuscleGroupFilter] = useState<string>('');
  const [movementPatternFilter, setMovementPatternFilter] = useState<string>('');

  // Create new exercise state
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  useEffect(() => {
    if (!searchTerm) setSearchSecondarySelection(null);
  }, [searchTerm]);

  // Load initial data (including sessions and programs for counters)
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [exercisesData, sessionsData, programsData, muscleGroupsData, movementPatternsData, categoriesData, athletesData, groupsData] = await Promise.all([
          fetchExercisesForCoach(coachId),
          fetchSessionTemplates(coachId),
          fetchPrograms(coachId),
          fetchMuscleGroups(),
          fetchMovementPatterns(),
          fetchExerciseCategories(),
          fetchTeamAthletes(coachId),
          fetchAthleteGroups(coachId),
        ]);
        setExercises(exercisesData);
        setSessions(sessionsData);
        setPrograms(programsData);
        setMuscleGroups(muscleGroupsData);
        setMovementPatterns(movementPatternsData);
        setExerciseCategories(categoriesData);
        setAthletes(athletesData);
        setGroups(groupsData);
      } catch (error) {
        console.error('Error loading library data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [coachId]);

  // Refresh data functions
  const refreshExercises = async () => {
    const data = await fetchExercisesForCoach(coachId);
    setExercises(data);
  };

  const refreshSessions = async () => {
    const data = await fetchSessionTemplates(coachId);
    setSessions(data);
  };

  const refreshPrograms = async () => {
    const data = await fetchPrograms(coachId);
    setPrograms(data);
  };

  // Create new muscle group and add to local state
  const handleCreateMuscleGroup = async (name: string): Promise<MuscleGroup> => {
    const newMuscleGroup = await createMuscleGroup(name);
    setMuscleGroups(prev => [...prev, newMuscleGroup].sort((a, b) => a.nameFr.localeCompare(b.nameFr)));
    return newMuscleGroup;
  };

  // Create new movement pattern and add to local state
  const handleCreateMovementPattern = async (name: string): Promise<MovementPattern> => {
    const newPattern = await createMovementPattern(name);
    setMovementPatterns(prev => [...prev, newPattern].sort((a, b) => a.nameFr.localeCompare(b.nameFr)));
    return newPattern;
  };

  const globalSearchResults = useMemo(() => {
    const term = searchTerm.trim();
    if (!term) return null;
    const normalized = normalizeString(term);

    // --- Exercices ---
    // Grouper par nom de base (avant ' :: ') pour dédupliquer les variantes
    const baseNameMap = new Map<string, Exercise[]>();
    exercises.forEach(ex => {
      const base = ex.name.split(' :: ')[0].trim();
      if (!baseNameMap.has(base)) baseNameMap.set(base, []);
      baseNameMap.get(base)!.push(ex);
    });

    const matchingExerciseIds = new Set<string>();
    const exerciseResults: { baseName: string; variants: Exercise[] }[] = [];

    baseNameMap.forEach((variants, baseName) => {
      const matches = variants.some(ex => normalizeString(ex.name).includes(normalized));
      if (matches) {
        variants.forEach(ex => matchingExerciseIds.add(ex.id));
        exerciseResults.push({ baseName, variants });
      }
    });

    // --- Séances ---
    const matchingSessionIds = new Set<string>();
    const sessionResults = sessions.filter(s => {
      const directMatch = normalizeString(s.seanceType).includes(normalized);
      const containsExercise = s.exercises.some(e => matchingExerciseIds.has(e.exerciseId));
      if (directMatch || containsExercise) {
        matchingSessionIds.add(s.id);
        return true;
      }
      return false;
    });

    // --- Programmes ---
    const programResultsMap = new Map<string, Program>();
    programs.forEach(p => {
      const pId = (p as any).id;
      // Assuming program objects have a unique 'id' property, accessed via type assertion.
      if (!pId || programResultsMap.has(pId)) return;

      const directMatch =
        normalizeString(p.seanceType).includes(normalized) ||
        normalizeString(p.programName ?? '').includes(normalized);
      const containsExercise = p.exercises.some(e => matchingExerciseIds.has(e.exerciseId));
      const fromMatchingSession = p.sourceTemplateId
        ? matchingSessionIds.has(p.sourceTemplateId)
        : false;
        
      if (directMatch || containsExercise || fromMatchingSession) {
        programResultsMap.set(pId, p);
      }
    });
    const programResults = Array.from(programResultsMap.values());

    return { exercises: exerciseResults, sessions: sessionResults, programs: programResults };
  }, [searchTerm, exercises, sessions, programs]);

  // Filter exercises based on search and filters (accent-insensitive, ignoring "(copie)" suffix)
  const filteredExercises = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);

    return exercises.filter(ex => {
      // Search matches both original name and normalized name (without copy suffix)
      const normalizedName = normalizeString(normalizeExerciseName(ex.name));
      const fullNormalizedName = normalizeString(ex.name);
      const matchesSearch = !searchTerm ||
        normalizedName.includes(normalizedSearch) ||
        fullNormalizedName.includes(normalizedSearch);
      const matchesExerciseCategory = !exerciseCategoryFilter ||
        ex.categoryId === exerciseCategoryFilter;
      const matchesLimbType = !limbTypeFilter ||
        ex.limbType === limbTypeFilter;
      const matchesMuscle = !muscleGroupFilter ||
        ex.primaryMuscleGroupId === muscleGroupFilter;
      const matchesPattern = !movementPatternFilter ||
        ex.movementPatternId === movementPatternFilter;
      return matchesSearch && matchesExerciseCategory && matchesLimbType && matchesMuscle && matchesPattern;
    });
  }, [exercises, searchTerm, exerciseCategoryFilter, limbTypeFilter, muscleGroupFilter, movementPatternFilter]);

  // Get available filter options based on current filters (conditional filtering)
  const availableExerciseCategories = useMemo(() => {
    let filtered = exercises;
    if (limbTypeFilter) {
      filtered = filtered.filter(ex => ex.limbType === limbTypeFilter);
    }
    if (muscleGroupFilter) {
      filtered = filtered.filter(ex => ex.primaryMuscleGroupId === muscleGroupFilter);
    }
    if (movementPatternFilter) {
      filtered = filtered.filter(ex => ex.movementPatternId === movementPatternFilter);
    }
    const ids = new Set(filtered.map(ex => ex.categoryId).filter(Boolean));
    return exerciseCategories.filter(cat => ids.has(cat.id));
  }, [exercises, limbTypeFilter, muscleGroupFilter, movementPatternFilter, exerciseCategories]);

  const availableMuscleGroups = useMemo(() => {
    let filtered = exercises;
    if (exerciseCategoryFilter) {
      filtered = filtered.filter(ex => ex.categoryId === exerciseCategoryFilter);
    }
    if (limbTypeFilter) {
      filtered = filtered.filter(ex => ex.limbType === limbTypeFilter);
    }
    if (movementPatternFilter) {
      filtered = filtered.filter(ex => ex.movementPatternId === movementPatternFilter);
    }
    const ids = new Set(filtered.map(ex => ex.primaryMuscleGroupId).filter(Boolean));
    return muscleGroups.filter(mg => ids.has(mg.id));
  }, [exercises, exerciseCategoryFilter, limbTypeFilter, movementPatternFilter, muscleGroups]);

  const availableMovementPatterns = useMemo(() => {
    let filtered = exercises;
    if (exerciseCategoryFilter) {
      filtered = filtered.filter(ex => ex.categoryId === exerciseCategoryFilter);
    }
    if (limbTypeFilter) {
      filtered = filtered.filter(ex => ex.limbType === limbTypeFilter);
    }
    if (muscleGroupFilter) {
      filtered = filtered.filter(ex => ex.primaryMuscleGroupId === muscleGroupFilter);
    }
    const ids = new Set(filtered.map(ex => ex.movementPatternId).filter(Boolean));
    return movementPatterns.filter(mp => ids.has(mp.id));
  }, [exercises, exerciseCategoryFilter, limbTypeFilter, muscleGroupFilter, movementPatterns]);

  const availableLimbTypes = useMemo(() => {
    let filtered = exercises;
    if (exerciseCategoryFilter) {
      filtered = filtered.filter(ex => ex.categoryId === exerciseCategoryFilter);
    }
    if (muscleGroupFilter) {
      filtered = filtered.filter(ex => ex.primaryMuscleGroupId === muscleGroupFilter);
    }
    if (movementPatternFilter) {
      filtered = filtered.filter(ex => ex.movementPatternId === movementPatternFilter);
    }
    const types = new Set(filtered.map(ex => ex.limbType).filter(Boolean));
    return limbTypeOptions.filter(opt => types.has(opt.id as Exercise['limbType']));
  }, [exercises, exerciseCategoryFilter, muscleGroupFilter, movementPatternFilter]);

  // Les filtrages pour sessions et programmes se font maintenant via globalSearchResults
  const filteredSessions = sessions;
  const filteredPrograms = programs;



  const handleNewClick = () => {
    setIsCreatingNew(true);
  };

  // Check if "New" button should be shown (now enabled for all tabs)
  const showNewButton = true;

  const tabs = [
    { id: 'exercises' as const, label: 'Exercices', icon: Dumbbell, count: exercises.length },
    { id: 'sessions' as const, label: 'Séances', icon: Calendar, count: sessions.length },
    { id: 'programs' as const, label: 'Programmes', icon: FolderKanban, count: programs.length },
  ];

  return (
    <div className="h-full flex flex-col bg-theme">
      {/* ========== HEADER FIXE ========== */}
      <div className="flex-shrink-0 p-6 pl-[4.5rem] border-b border-theme">
        <div className="flex items-center gap-3">
          <Library className="w-6 h-6 text-[var(--color-primary)] flex-shrink-0" />
          <div>
            <h1 className="text-2xl font-bold text-theme mb-1">Exercices et Séances</h1>
            <p className="text-theme-muted text-sm">
              Gérez vos exercices, séances et programmes
            </p>
          </div>
        </div>
      </div>

      {/* Tabs (partie du header fixe) */}
      <div className="flex-shrink-0 flex items-center border-b border-theme">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)] bg-theme-tertiary'
                : 'text-theme-muted hover:text-theme hover:bg-theme-secondary/30'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            <span className={`px-2 py-0.5 rounded-full text-xs ${
              activeTab === tab.id
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)]'
                : 'bg-theme-tertiary text-theme-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}

        <div className="ml-auto pr-4 relative flex items-center gap-4">
          {/* Barre de recherche */}
          <div className="relative flex items-center">
            <Search className="absolute left-3 w-4 h-4 text-theme-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher exercice, séance, programme..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-56 pl-9 pr-8 py-1.5 bg-theme-secondary border border-theme rounded-lg text-sm text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 text-theme-muted hover:text-theme"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Add Button - a été supprimé avec le reste de la barre d'action, on le replace ici */}
          {showNewButton && !globalSearchResults && (
            <button
              onClick={handleNewClick}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Nouveau
            </button>
          )}
        </div>
      </div>


      {/* ========== ZONE: CONTENU (Liste Item + Visualisation Item) ========== */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
          </div>
        ) : globalSearchResults ? (
          /* VUE RECHERCHE : résultats + sélection secondaire */
          <div className="flex h-full gap-4 p-4 overflow-y-auto">
            {/* Panneau résultats */}
            <div className="w-1/2 flex flex-col gap-4">
              {/* Section Exercices */}
              {globalSearchResults.exercises.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-2">
                    Exercices ({globalSearchResults.exercises.length})
                  </h3>
                  <div className="flex flex-col gap-1">
                    {globalSearchResults.exercises.map(({ baseName, variants }) => (
                      <button
                        key={baseName}
                        onClick={() => {
                          if (variants.length > 1) {
                            setSearchSecondarySelection({ type: 'exercise', label: baseName, items: variants });
                          } else {
                            setSearchSecondarySelection(null);
                            setActiveTab('exercises');
                            setSearchTerm('');
                            // naviguer vers l'exercice : chercher comment ExercisesList sélectionne un item
                          }
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-theme-secondary text-sm text-theme flex items-center justify-between"
                      >
                        <span>{baseName}</span>
                        {variants.length > 1 && (
                          <span className="text-xs text-theme-muted">{variants.length} variantes</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Séances */}
              {globalSearchResults.sessions.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-2">
                    Séances ({globalSearchResults.sessions.length})
                  </h3>
                  <div className="flex flex-col gap-1">
                    {globalSearchResults.sessions.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          if (s.exercises.length > 0) {
                            setSearchSecondarySelection({ type: 'session', label: s.seanceType, items: s.exercises });
                          } else {
                            setSearchSecondarySelection(null);
                            setActiveTab('sessions');
                            setSearchTerm('');
                          }
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-theme-secondary text-sm text-theme flex items-center justify-between"
                      >
                        <span>{s.seanceType}</span>
                        {s.exercises.length > 0 && (
                          <span className="text-xs text-theme-muted">{s.exercises.length} exercices</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section Programmes */}
              {globalSearchResults.programs.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-2">
                    Programmes ({globalSearchResults.programs.length})
                  </h3>
                  <div className="flex flex-col gap-1">
                    {globalSearchResults.programs.map(p => (
                      <button
                        key={(p as any).id}
                        onClick={() => {
                          setSearchSecondarySelection(null);
                          setActiveTab('programs');
                          setSearchTerm('');
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-theme-secondary text-sm text-theme"
                      >
                        {p.programName || p.seanceType}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Aucun résultat */}
              {globalSearchResults.exercises.length === 0 &&
                globalSearchResults.sessions.length === 0 &&
                globalSearchResults.programs.length === 0 && (
                <div className="text-sm text-theme-muted text-center py-8">
                  Aucun résultat pour "{searchTerm}"
                </div>
              )}
            </div>

            {/* Panneau sélection secondaire */}
            {searchSecondarySelection && (
              <div className="w-1/2 bg-theme-secondary/30 rounded-xl border border-theme p-4 flex flex-col gap-2">
                <h3 className="text-xs font-semibold text-theme-muted uppercase tracking-wider mb-2">
                  {searchSecondarySelection.label}
                </h3>
                {searchSecondarySelection.type === 'exercise' &&
                  (searchSecondarySelection.items as Exercise[]).map(variant => (
                    <button
                      key={variant.id}
                      onClick={() => {
                        setSearchSecondarySelection(null);
                        setActiveTab('exercises');
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-theme-secondary text-sm text-theme"
                    >
                      {variant.name}
                    </button>
                  ))
                }
                {searchSecondarySelection.type === 'session' &&
                  (searchSecondarySelection.items as SessionExercise[]).map(ex => (
                    <button
                      key={ex.exerciseId}
                      onClick={() => {
                        setSearchSecondarySelection(null);
                        setActiveTab('exercises');
                        setSearchTerm('');
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-theme-secondary text-sm text-theme"
                    >
                      {ex.exerciseName}
                    </button>
                  ))
                }
              </div>
            )}
          </div>
        ) : (
          /* VUE NORMALE : onglet actif */
          <>
            {activeTab === 'exercises' && (
              <ExercisesList
                exercises={filteredExercises}
                muscleGroups={muscleGroups}
                movementPatterns={movementPatterns}
                exerciseCategories={exerciseCategories}
                coachId={coachId}
                onRefresh={refreshExercises}
                isCreatingNew={isCreatingNew}
                onCreateNewClose={() => setIsCreatingNew(false)}
                onCreateMuscleGroup={handleCreateMuscleGroup}
                onCreateMovementPattern={handleCreateMovementPattern}
              />
            )}
            {activeTab === 'sessions' && (
              <SessionsList
                sessions={filteredSessions}
                exercises={exercises}
                coachId={coachId}
                onRefresh={refreshSessions}
                onExercisesRefresh={refreshExercises}
                isCreatingNew={isCreatingNew}
                onCreateNewClose={() => setIsCreatingNew(false)}
              />
            )}
            {activeTab === 'programs' && (
              <ProgramsList
                programs={filteredPrograms}
                sessions={sessions}
                athletes={athletes}
                groups={groups}
                coachId={coachId}
                onRefresh={refreshPrograms}
                isCreatingNew={isCreatingNew}
                onCreateNewClose={() => setIsCreatingNew(false)}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}
