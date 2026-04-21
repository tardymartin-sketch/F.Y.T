import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, Globe, Lock } from 'lucide-react';
import { Exercise, MuscleGroup, MovementPattern, ExerciseCategory } from '../../../../../types';
import { ExerciseDetail } from './ExerciseDetail';
import {
  createExerciseForCoach,
  updateExerciseForCoach,
  deleteExerciseForCoach,
} from '../../../../services/supabaseService';

interface ExercisesListProps {
  exercises: Exercise[];
  muscleGroups: MuscleGroup[];
  movementPatterns: MovementPattern[];
  exerciseCategories: ExerciseCategory[];
  coachId: string;
  onRefresh: () => Promise<void>;
  isCreatingNew?: boolean;
  onCreateNewClose?: () => void;
  onCreateMuscleGroup?: (name: string) => Promise<MuscleGroup>;
  onCreateMovementPattern?: (name:string) => Promise<MovementPattern>;
  selectedItemId?: string | null;
  onItemSelectionHandled?: () => void;
}

// Generate unique copy name for a duplicated exercise — canonical naming, no ::
// "Squat" → "Squat 2", "Squat 2" → "Squat 3", etc.
function generateUniqueCopyName(baseName: string, existingNames: string[]): string {
  // Strip any legacy :: suffix to get the clean canonical base
  const cleanBase = baseName.includes(' :: ')
    ? baseName.split(' :: ')[0].trim()
    : baseName.trim();

  // Find the highest existing numeric suffix: "Squat 2", "Squat 3", etc.
  const numSuffixPattern = new RegExp(`^${cleanBase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} (\\d+)$`, 'i');
  let maxNum = 1;
  existingNames.forEach(name => {
    const match = name.trim().match(numSuffixPattern);
    if (match) {
      maxNum = Math.max(maxNum, parseInt(match[1]));
    }
  });

  return `${cleanBase} ${maxNum + 1}`;
}

// Group exercises by name
interface ExerciseGroup {
  name: string;
  displayName: string; // Original name for display
  variants: Exercise[];
  hasCommon: boolean;
  hasMine: boolean;
  hasVideo: boolean;
  primaryMuscleGroupId?: string;
  movementPatternId?: string;
}

export function ExercisesList({
  exercises,
  muscleGroups,
  movementPatterns,
  exerciseCategories,
  coachId,
  onRefresh,
  isCreatingNew = false,
  onCreateNewClose,
  onCreateMuscleGroup,
  onCreateMovementPattern,
  selectedItemId,
  onItemSelectionHandled,
}: ExercisesListProps) {
  const [selectedExerciseName, setSelectedExerciseName] = useState<string | null>(null);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicatingExercise, setDuplicatingExercise] = useState<Exercise | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);

  // When creating new, duplicating, or editing, deselect any selected exercise
  const isShowingDetail = selectedExerciseName && !isCreatingNew && !isDuplicating && !isEditing;

  // Group exercises by name
  const exerciseGroups = useMemo(() => {
    const groups = new Map<string, ExerciseGroup>();

    exercises.forEach(exercise => {
      const baseName = exercise.name;
      const normalizedName = baseName.toLowerCase().trim();
      const existing = groups.get(normalizedName);

      if (existing) {
        existing.variants.push(exercise);
        if (!exercise.coachId) existing.hasCommon = true;
        if (exercise.coachId === coachId) existing.hasMine = true;
        if (exercise.videoUrl) existing.hasVideo = true;
      } else {
        // Use the base name (without variant suffix) for display
        groups.set(normalizedName, {
          name: normalizedName,
          displayName: baseName, // baseName is already clean
          variants: [exercise],
          hasCommon: !exercise.coachId,
          hasMine: exercise.coachId === coachId,
          hasVideo: !!exercise.videoUrl,
          primaryMuscleGroupId: exercise.primaryMuscleGroupId,
          movementPatternId: exercise.movementPatternId,
        });
      }
    });

    // Sort groups alphabetically by display name
    return Array.from(groups.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'fr')
    );
  }, [exercises, coachId]);

  // Auto-select based on prop
  useEffect(() => {
    if (selectedItemId && onItemSelectionHandled) {
      const foundExercise = exercises.find(ex => ex.id === selectedItemId);
      if (foundExercise) {
        handleSelectExercise(foundExercise.name);
      }
      onItemSelectionHandled();
    }
  }, [selectedItemId]);

  // Auto-select first item if none selected
  useEffect(() => {
    if (!selectedExerciseName && exerciseGroups.length > 0 && !isCreatingNew && !isDuplicating && !isEditing) {
      setSelectedExerciseName(exerciseGroups[0].displayName);
    }
  }, [exerciseGroups, selectedExerciseName, isCreatingNew, isDuplicating]);

  // Get selected group's variants (using base name for matching)
  const selectedVariants = useMemo(() => {
    if (!selectedExerciseName) return [];
    const normalizedSelected = selectedExerciseName.toLowerCase().trim();
    const group = exerciseGroups.find(g => g.name === normalizedSelected);
    return group?.variants || [];
  }, [selectedExerciseName, exerciseGroups]);

  // Get display name for selected exercise (base name)
  const selectedDisplayName = useMemo(() => {
    return selectedExerciseName || '';
  }, [selectedExerciseName]);

  // Get all existing exercise names for duplicate checking
  const allExerciseNames = useMemo(() => {
    return exercises.map(ex => ex.name);
  }, [exercises]);

  // Handle create (from duplication)
  const handleCreate = async (data: Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'> | Partial<Exercise>) => {
    try {
      await createExerciseForCoach(data as Omit<Exercise, 'id' | 'createdAt' | 'updatedAt'>, coachId);
      await onRefresh();
      setIsDuplicating(false);
      setDuplicatingExercise(null);
    } catch (error: any) {
      if (error.code === '23505') {
        alert('Un exercice avec ce nom existe déjà.');
      } else {
        console.error('Erreur lors de la création:', error);
        alert('Erreur lors de la création de l\'exercice');
      }
    }
  };

  // Handle duplicate - generate unique copy name and show panel
  const handleDuplicate = (exercise: Exercise) => {
    const newName = generateUniqueCopyName(exercise.name, allExerciseNames);
    setDuplicatingExercise({ ...exercise, name: newName, coachId });
    setSelectedExerciseName(null);
    setIsDuplicating(true);
    if (onCreateNewClose) {
      onCreateNewClose();
    }
  };

  // Handle edit - show editing panel with current exercise data
  const handleEdit = (exercise: Exercise) => {
    setEditingExercise({ ...exercise });
    setSelectedExerciseName(null);
    setIsEditing(true);
    setIsDuplicating(false);
    if (onCreateNewClose) {
      onCreateNewClose();
    }
  };

  // Handle delete
  const handleDelete = async (exercise: Exercise) => {
    if (!exercise.coachId) {
      return; // Can't delete common exercises
    }
    try {
      await deleteExerciseForCoach(exercise.id, coachId);
      await onRefresh();

      // If no more variants, close the detail panel
      const remainingVariants = selectedVariants.filter(v => v.id !== exercise.id);
      if (remainingVariants.length === 0) {
        setSelectedExerciseName(null);
      }
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);
      alert('Erreur lors de la suppression de l\'exercice');
    }
  };

  // Handle save (update or create new variant)
  const handleSave = async (exercise: Exercise, createNew: boolean) => {
    try {
      if (createNew) {
        // Create a new variant
        const { id, createdAt, updatedAt, ...data } = exercise;
        await createExerciseForCoach({ ...data, coachId }, coachId);
      } else {
        // Update existing
        await updateExerciseForCoach(exercise.id, exercise, coachId);
      }
      await onRefresh();
    } catch (error: any) {
      if (error.code === '23505') {
        alert('Un exercice avec ce nom existe déjà.');
      } else {
        console.error('Erreur lors de la sauvegarde:', error);
        alert('Erreur lors de la sauvegarde');
      }
      throw error; // Re-throw to let caller know it failed
    }
  };

  // Get muscle group name
  const getMuscleGroupName = (id?: string) => {
    if (!id) return '-';
    return muscleGroups.find(mg => mg.id === id)?.nameFr || '-';
  };

  // Get movement pattern name
  const getMovementPatternName = (id?: string) => {
    if (!id) return '-';
    return movementPatterns.find(mp => mp.id === id)?.nameFr || '-';
  };

  // Handle close when creating new, duplicating, or editing
  const handleCloseDetail = () => {
    if (isCreatingNew && onCreateNewClose) {
      onCreateNewClose();
    } else if (isDuplicating) {
      setIsDuplicating(false);
      setDuplicatingExercise(null);
    } else if (isEditing && editingExercise) {
      // Re-select the exercise to return to visualization mode
      setSelectedExerciseName(editingExercise.name);
      setIsEditing(false);
      setEditingExercise(null);
    } else {
      setSelectedExerciseName(null);
    }
  };

  // Handle exercise created/updated - select the exercise
  const handleExerciseCreated = (name: string) => {
    // Close the creation/editing panel
    if (onCreateNewClose) {
      onCreateNewClose();
    }
    setIsDuplicating(false);
    setDuplicatingExercise(null);
    setIsEditing(false);
    setEditingExercise(null);
    // Select the newly created/updated exercise
    setSelectedExerciseName(name);
  };

  // Handle selection - cancel creating new, duplicating, or editing if selecting existing
  const handleSelectExercise = (name: string) => {
    if (isCreatingNew && onCreateNewClose) {
      onCreateNewClose();
    }
    if (isDuplicating) {
      setIsDuplicating(false);
      setDuplicatingExercise(null);
    }
    if (isEditing) {
      setIsEditing(false);
      setEditingExercise(null);
    }
    setSelectedExerciseName(name);
  };

  const showDetailPanel = isShowingDetail || isCreatingNew || isDuplicating || isEditing;

  return (
    <div className="flex gap-4 h-full p-4 min-h-0 overflow-hidden">
      {/* ========== ZONE LISTE - Bordure visible ========== */}
      <div className={`${showDetailPanel ? 'w-1/3' : 'w-full'} bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden`}>
        <div className="flex-1 h-0 custom-scrollbar">
          {exerciseGroups.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-theme-muted">
              <p>Aucun exercice trouvé</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {exerciseGroups.map(group => (
                <div
                  key={group.name}
                  onClick={() => handleSelectExercise(group.displayName)}
                  className={`p-4 cursor-pointer rounded-xl transition-all duration-200 ${
                    selectedDisplayName.toLowerCase().trim() === group.name && !isCreatingNew
                      ? 'bg-blue-600/20 border-2 border-blue-500'
                      : 'bg-theme-secondary/50 border border-theme hover:bg-theme-secondary hover:border-theme'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {/* Common/Private indicator */}
                      <div className="flex items-center gap-1">
                        {group.hasCommon && (
                          <span title="Exercice commun disponible">
                            <Globe className="w-4 h-4 text-[var(--color-primary)]" />
                          </span>
                        )}
                        {group.hasMine && (
                          <span title="Ma variante">
                            <Lock className="w-4 h-4 text-[var(--color-accent)]" />
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="text-theme font-medium">{group.displayName}</h3>
                        <p className="text-sm text-theme-muted">
                          {getMuscleGroupName(group.primaryMuscleGroupId)} - {getMovementPatternName(group.movementPatternId)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Variant count */}
                      {group.variants.length > 1 && (
                        <span className="text-sm text-theme-muted">{group.variants.length}</span>
                      )}
                      <ChevronRight className="w-4 h-4 text-theme-muted" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ========== ZONE VISUALISATION - Bordure visible ========== */}
      {isShowingDetail && selectedVariants.length > 0 && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          <ExerciseDetail
            exerciseName={selectedDisplayName}
            variants={selectedVariants}
            muscleGroups={muscleGroups}
            movementPatterns={movementPatterns}
            exerciseCategories={exerciseCategories}
            coachId={coachId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onSave={handleSave}
            onClose={handleCloseDetail}
            onEdit={handleEdit}
            onCreateMuscleGroup={onCreateMuscleGroup}
            onCreateMovementPattern={onCreateMovementPattern}
            allExerciseNames={allExerciseNames}
          />
        </div>
      )}

      {/* ========== ZONE VISUALISATION (New) - Bordure visible ========== */}
      {isCreatingNew && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          <ExerciseDetail
            exerciseName=""
            variants={[]}
            muscleGroups={muscleGroups}
            movementPatterns={movementPatterns}
            exerciseCategories={exerciseCategories}
            coachId={coachId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onSave={handleSave}
            onClose={handleCloseDetail}
            isNewExercise={true}
            onExerciseCreated={handleExerciseCreated}
            onCreateMuscleGroup={onCreateMuscleGroup}
            onCreateMovementPattern={onCreateMovementPattern}
            allExerciseNames={allExerciseNames}
          />
        </div>
      )}

      {/* ========== ZONE VISUALISATION (Duplicate) - Bordure visible ========== */}
      {isDuplicating && duplicatingExercise && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          <ExerciseDetail
            exerciseName={duplicatingExercise.name}
            variants={[]}
            muscleGroups={muscleGroups}
            movementPatterns={movementPatterns}
            exerciseCategories={exerciseCategories}
            coachId={coachId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onSave={handleSave}
            onClose={handleCloseDetail}
            isDuplicating={true}
            duplicatingExercise={duplicatingExercise}
            onExerciseCreated={handleExerciseCreated}
            onCreateMuscleGroup={onCreateMuscleGroup}
            onCreateMovementPattern={onCreateMovementPattern}
            allExerciseNames={allExerciseNames}
          />
        </div>
      )}

      {/* ========== ZONE VISUALISATION (Edit) - Bordure visible ========== */}
      {isEditing && editingExercise && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          <ExerciseDetail
            exerciseName={editingExercise.name}
            variants={[]}
            muscleGroups={muscleGroups}
            movementPatterns={movementPatterns}
            exerciseCategories={exerciseCategories}
            coachId={coachId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onSave={handleSave}
            onClose={handleCloseDetail}
            isEditing={true}
            editingExercise={editingExercise}
            onExerciseCreated={handleExerciseCreated}
            onCreateMuscleGroup={onCreateMuscleGroup}
            onCreateMovementPattern={onCreateMovementPattern}
            allExerciseNames={allExerciseNames}
          />
        </div>
      )}
    </div>
  );
}
