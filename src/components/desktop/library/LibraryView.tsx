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
  const [showFilters, setShowFilters] = useState(false);

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

  // Filter sessions based on search (accent-insensitive)
  const filteredSessions = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    return sessions.filter(s => {
      return !searchTerm ||
        normalizeString(s.seanceType).includes(normalizedSearch);
    });
  }, [sessions, searchTerm]);

  // Filter programs based on search (accent-insensitive)
  const filteredPrograms = useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);
    return programs.filter(p => {
      return !searchTerm ||
        normalizeString(p.seanceType).includes(normalizedSearch);
    });
  }, [programs, searchTerm]);

  const hasActiveFilters = exerciseCategoryFilter || limbTypeFilter || muscleGroupFilter || movementPatternFilter;

  const handleResetFilters = () => {
    setExerciseCategoryFilter('');
    setLimbTypeFilter('');
    setMuscleGroupFilter('');
    setMovementPatternFilter('');
  };

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
      <div className="flex-shrink-0 flex border-b border-theme">
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
      </div>

      {/* Search, Filters and Actions Bar (partie du header fixe) */}
      <div className="flex-shrink-0 px-4 py-3 flex items-center gap-3 border-b border-theme/50">
        {/* Search */}
        <div className="relative w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-theme-secondary border border-theme rounded-lg text-sm text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 text-theme-muted hover:text-theme"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Filters Toggle (for exercises tab) */}
        {activeTab === 'exercises' && (
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
              showFilters || hasActiveFilters
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-theme-secondary text-theme-secondary hover:bg-theme-tertiary'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filtres
            {hasActiveFilters && (
              <span className="ml-0.5 px-1.5 py-0.5 bg-white/20 rounded text-xs">
                {[exerciseCategoryFilter, limbTypeFilter, muscleGroupFilter, movementPatternFilter].filter(Boolean).length}
              </span>
            )}
          </button>
        )}

        {/* Inline Filters (exercises only, when showFilters is true) */}
        {activeTab === 'exercises' && showFilters && (
          <>
            <select
              value={exerciseCategoryFilter}
              onChange={(e) => setExerciseCategoryFilter(e.target.value)}
              className="px-2 py-1.5 bg-theme-secondary border border-theme rounded-lg text-xs text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              <option value="">Catégorie</option>
              {availableExerciseCategories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>

            <select
              value={muscleGroupFilter}
              onChange={(e) => setMuscleGroupFilter(e.target.value)}
              className="px-2 py-1.5 bg-theme-secondary border border-theme rounded-lg text-xs text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              <option value="">Muscle</option>
              {availableMuscleGroups.map(mg => (
                <option key={mg.id} value={mg.id}>{mg.nameFr}</option>
              ))}
            </select>

            <select
              value={movementPatternFilter}
              onChange={(e) => setMovementPatternFilter(e.target.value)}
              className="px-2 py-1.5 bg-theme-secondary border border-theme rounded-lg text-xs text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              <option value="">Pattern</option>
              {availableMovementPatterns.map(mp => (
                <option key={mp.id} value={mp.id}>{mp.nameFr}</option>
              ))}
            </select>

            <select
              value={limbTypeFilter}
              onChange={(e) => setLimbTypeFilter(e.target.value)}
              className="px-2 py-1.5 bg-theme-secondary border border-theme rounded-lg text-xs text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            >
              <option value="">Type</option>
              {availableLimbTypes.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </select>

            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="text-theme-muted hover:text-theme text-xs"
              >
                ✕
              </button>
            )}
          </>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Add Button - hidden for programs tab */}
        {showNewButton && (
          <button
            onClick={handleNewClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau
          </button>
        )}
      </div>

      {/* ========== ZONE: CONTENU (Liste Item + Visualisation Item) ========== */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]" />
          </div>
        ) : (
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
