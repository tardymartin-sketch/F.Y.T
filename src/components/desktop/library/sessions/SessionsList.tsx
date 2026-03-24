import { useState, useMemo, useEffect } from "react";
import {
  ChevronRight,
  Globe,
  Lock,
  Copy,
  Trash2,
  X,
  Calendar,
  Save,
  Plus,
  GripVertical,
  Play,
  FileText,
  Check,
  Video,
  List,
  ChevronDown,
  Link2,
  Dumbbell,
  Unlink,
  Edit3,
} from "lucide-react";
import {
  SessionTemplate,
  SessionExercise,
  Exercise,
  parseExerciseName,
  getExerciseVariantDisplayName,
  buildExerciseName,
  ExecutionMode,
  EXECUTION_MODES,
} from "../../../../../types";
import {
  createSessionTemplate,
  updateSessionTemplate,
  deleteSessionTemplate,
  createExerciseForCoach,
  fetchExerciseByName,
} from "../../../../services/supabaseService";
import { TextBlockCard } from "../../../common/TextBlockCard";
interface SessionsListProps {
  sessions: SessionTemplate[];
  exercises: Exercise[];
  coachId: string;
  onRefresh: () => Promise<void>;
  onExercisesRefresh?: () => Promise<void>;
  isCreatingNew?: boolean;
  onCreateNewClose?: () => void;
  selectedItemId?: string | null;
  onItemSelectionHandled?: () => void;
}

// Normalize string for grouping (remove accents and lowercase)
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Format date for display (DD/MM/YY)
function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

// Get period label for a session (used in tabs)
function getPeriodLabel(session: SessionTemplate): string {
  if (session.startDate && session.endDate) {
    return `${formatDate(session.startDate)} - ${formatDate(session.endDate)}`;
  }
  if (session.startDate) {
    return `Depuis ${formatDate(session.startDate)}`;
  }
  if (session.endDate) {
    return `Jusqu'au ${formatDate(session.endDate)}`;
  }
  return "Sans période";
}

// Handle horizontal scroll on mouse wheel for variant tabs
function handleWheelScroll(e: React.WheelEvent<HTMLDivElement>) {
  if (e.deltaY !== 0) {
    e.currentTarget.scrollLeft += e.deltaY;
    e.preventDefault();
  }
}

// Interface for unmatched exercise info
interface UnmatchedExercise {
  sessionExerciseIndex: number;
  sessionExercise: SessionExercise;
  closestMatch?: Exercise;
  differences: { field: string; currentValue: string; existingValue: string }[];
}

// Check if a session exercise matches an existing exercise in the database
// Matching criteria: same exerciseId OR (same base name + video)
// Note: tempo, reps, sets, notes are session-level fields and don't affect exercise identity
function findMatchingExercise(
  sessionExercise: SessionExercise,
  allExercises: Exercise[],
  coachId: string,
): Exercise | null {
  // First, check by exerciseId - if we're using an existing exercise and haven't changed key fields
  const exerciseById = allExercises.find(
    (ex) => ex.id === sessionExercise.exerciseId,
  );
  if (exerciseById) {
    // Only video differentiates exercise variants
    const videoMatches =
      (sessionExercise.videoUrl || "") === (exerciseById.videoUrl || "");

    if (videoMatches) {
      return exerciseById;
    }
  }

  // Otherwise, look for any exercise with matching criteria
  const { baseName } = parseExerciseName(sessionExercise.exerciseName);

  for (const exercise of allExercises) {
    // Only match exercises owned by coach or public ones
    if (exercise.coachId && exercise.coachId !== coachId) continue;

    const { baseName: exBaseName } = parseExerciseName(exercise.name);
    if (normalizeString(exBaseName) !== normalizeString(baseName)) continue;

    // Only video differentiates exercise variants
    const videoMatches =
      (sessionExercise.videoUrl || "") === (exercise.videoUrl || "");

    if (videoMatches) {
      return exercise;
    }
  }

  return null;
}

// Get differences between session exercise and closest matching exercise
function getExerciseDifferences(
  sessionExercise: SessionExercise,
  existingExercise: Exercise,
): { field: string; currentValue: string; existingValue: string }[] {
  const differences: {
    field: string;
    currentValue: string;
    existingValue: string;
  }[] = [];

  if ((sessionExercise.videoUrl || "") !== (existingExercise.videoUrl || "")) {
    differences.push({
      field: "Vidéo",
      currentValue: sessionExercise.videoUrl ? "Oui" : "Non",
      existingValue: existingExercise.videoUrl ? "Oui" : "Non",
    });
  }

  return differences;
}

// Find closest matching exercise (same base name) for comparison
function findClosestExercise(
  sessionExercise: SessionExercise,
  allExercises: Exercise[],
  coachId: string,
): Exercise | undefined {
  const { baseName } = parseExerciseName(sessionExercise.exerciseName);

  // First try to find the original exercise by ID
  const original = allExercises.find(
    (ex) => ex.id === sessionExercise.exerciseId,
  );
  if (original) return original;

  // Otherwise find first exercise with same base name
  return allExercises.find((ex) => {
    if (ex.coachId && ex.coachId !== coachId) return false;
    const { baseName: exBaseName } = parseExerciseName(ex.name);
    return normalizeString(exBaseName) === normalizeString(baseName);
  });
}

// Notes popover for exercise
function NotesPopover({
  isOpen,
  onClose,
  notes,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  notes: string;
  onSave: (notes: string) => void;
}) {
  const [editedNotes, setEditedNotes] = useState(notes);

  useEffect(() => {
    setEditedNotes(notes);
  }, [notes, isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-theme font-medium mb-2">Consignes</h3>
        <textarea
          value={editedNotes}
          onChange={(e) => setEditedNotes(e.target.value)}
          className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
          rows={4}
          placeholder="Ajouter des consignes..."
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme-secondary text-theme-secondary"
          >
            Annuler
          </button>
          <button
            onClick={() => {
              onSave(editedNotes);
              onClose();
            }}
            className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white"
          >
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

// Video embed modal with URL editing
function VideoModal({
  url,
  onClose,
  onChangeUrl,
}: {
  url: string;
  onClose: () => void;
  onChangeUrl: (newUrl: string) => void;
}) {
  const [currentUrl, setCurrentUrl] = useState(url);
  const [inputUrl, setInputUrl] = useState(url);

  const getYouTubeEmbedUrl = (videoUrl: string) => {
    if (!videoUrl) return null;
    const match = videoUrl.match(
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    );
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const embedUrl = getYouTubeEmbedUrl(currentUrl);

  const handleValidateUrl = () => {
    setCurrentUrl(inputUrl);
    onChangeUrl(inputUrl);
  };

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-theme-muted"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Video embed or placeholder */}
        {embedUrl ? (
          <div className="aspect-video mb-4">
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="bg-theme-secondary rounded-lg p-8 text-center mb-4">
            <Video className="w-12 h-12 text-theme-muted mx-auto mb-4" />
            <p className="text-theme-muted mb-2">
              {currentUrl ? "Format vidéo non supporté" : "Aucune vidéo"}
            </p>
            <p className="text-theme-muted text-sm">
              Ajoutez un lien YouTube ci-dessous
            </p>
          </div>
        )}

        {/* URL input field */}
        <div className="bg-theme-secondary rounded-lg p-4">
          <label className="block text-sm font-medium text-theme-secondary mb-2">
            Lien de la vidéo
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              className="flex-1 px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
            />
            <button
              onClick={handleValidateUrl}
              disabled={inputUrl === currentUrl}
              className="px-3 py-2 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:bg-theme-tertiary disabled:text-theme-muted text-white rounded-lg transition-colors"
              title="Valider le lien"
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Session Detail Panel with tabs
function SessionDetailPanel({
  sessionName,
  variants,
  exercises,
  coachId,
  onDuplicate,
  onDelete,
  onSave,
  onClose,
  isNewSession = false,
  isDuplicating = false,
  duplicatingSession,
  isEditing = false,
  editingSession,
  onEdit,
  onSessionCreated,
}: {
  sessionName: string;
  variants: SessionTemplate[];
  exercises: Exercise[];
  coachId: string;
  onDuplicate: (session: SessionTemplate) => void;
  onDelete: (session: SessionTemplate) => Promise<void>;
  onSave: (
    session: {
      seanceType: string;
      exercises: Array<Omit<SessionExercise, "id"> & { id?: string }>;
      startDate?: string;
      endDate?: string;
      description?: string;
      category?: string;
      validityYear?: number;
      validityMonth?: number;
      validityWeek?: number;
    },
    exercisesToCreate: {
      exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">;
      sessionExerciseIndex: number;
    }[],
    shouldUpdate?: boolean,
    existingTemplate?: {
      templateId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) => Promise<void>;
  onClose: () => void;
  isNewSession?: boolean;
  isDuplicating?: boolean;
  duplicatingSession?: SessionTemplate;
  isEditing?: boolean;
  editingSession?: SessionTemplate;
  onEdit?: (session: SessionTemplate) => void;
  onSessionCreated?: (seanceType: string) => void;
}) {
  // Sort variants by date (newest first)
  const sortedVariants = [...variants].sort((a, b) => {
    const aKey = `${a.startDate || ""}`;
    const bKey = `${b.startDate || ""}`;
    return bKey.localeCompare(aKey);
  });

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [showDeletePopover, setShowDeletePopover] = useState(false);
  const [showDuplicatePopover, setShowDuplicatePopover] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Form state
  // Form state
  const [seanceType, setSeanceType] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sessionExercises, setSessionExercises] = useState<SessionExercise[]>(
    [],
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Original values for comparison
  const [originalStartDate, setOriginalStartDate] = useState("");
  const [originalEndDate, setOriginalEndDate] = useState("");
  const [originalDescription, setOriginalDescription] = useState("");
  const [originalExercises, setOriginalExercises] = useState<SessionExercise[]>(
    [],
  );

  // Exercise search
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);

  // Notes popover state
  const [notesPopoverIndex, setNotesPopoverIndex] = useState<number | null>(
    null,
  );

  // Video modal state - tracks exercise index
  const [videoModalIndex, setVideoModalIndex] = useState<number | null>(null);

  // Variant selector dropdown state
  const [variantDropdownIndex, setVariantDropdownIndex] = useState<
    number | null
  >(null);

  // Superset/Execution mode state
  const [executionModeDropdownIndex, setExecutionModeDropdownIndex] = useState<
    number | null
  >(null);
  const [supersetSearchIndex, setSupersetSearchIndex] = useState<number | null>(
    null,
  );
  const [supersetSearchQuery, setSupersetSearchQuery] = useState("");

  // NEW: Unmatched exercise flow
  const [unmatchedExercises, setUnmatchedExercises] = useState<
    UnmatchedExercise[]
  >([]);
  const [currentUnmatchedIndex, setCurrentUnmatchedIndex] = useState<
    number | null
  >(null);
  const [variantNames, setVariantNames] = useState<Map<number, string>>(
    new Map(),
  );
  const [showDateConfirmation, setShowDateConfirmation] = useState(false);
  const [showUpdateConfirmation, setShowUpdateConfirmation] = useState(false);
  const [existingSessionToUpdate, setExistingSessionToUpdate] =
    useState<SessionTemplate | null>(null);
  const [pendingExercisesToCreate, setPendingExercisesToCreate] = useState<
    {
      exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">;
      sessionExerciseIndex: number;
    }[]
  >([]);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  // Intra-superset drag: track which exercise index is being dragged within a superset
  const [supersetDragIdx, setSupersetDragIdx] = useState<number | null>(null);

  // Cancel confirmation modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCloseClick = () => {
    if (isEditingMode && hasChanges) {
      setShowCancelModal(true);
    } else {
      onClose();
    }
  };

  const handleCancelConfirm = () => {
    setShowCancelModal(false);
    setHasChanges(false);
    onClose();
  };

  const currentSession = sortedVariants[activeTabIndex];
  const isCommon = !currentSession?.coachId;
  const isMine = currentSession?.coachId === coachId;

  // Determine if we're in an editing mode (can modify fields)
  const isEditingMode = isNewSession || isDuplicating || isEditing;

  // Initialize form from current session
  // Initialize form from current session
  const initializeForm = (session: SessionTemplate | null) => {
    if (session) {
      setSeanceType(session.seanceType);
      setDescription(session.description || "");
      setStartDate(session.startDate || "");
      setEndDate(session.endDate || "");
      setOriginalStartDate(session.startDate || "");
      setOriginalEndDate(session.endDate || "");
      setOriginalDescription(session.description || "");
      const exs = session.exercises.map((ex) => ({ ...ex }));
      setSessionExercises(exs);
      // Store original exercises for modification detection
      setOriginalExercises(exs.map((ex) => ({ ...ex })));
    } else {
      setSeanceType("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setOriginalStartDate("");
      setOriginalEndDate("");
      setOriginalDescription("");
      setSessionExercises([]);
      setOriginalExercises([]);
    }
    setHasChanges(false);
    setError(null);
  };

  // Reset when session changes
  useEffect(() => {
    if (isDuplicating && duplicatingSession) {
      initializeForm(duplicatingSession);
      setHasChanges(true);
    } else if (isEditing && editingSession) {
      initializeForm(editingSession);
      setHasChanges(false);
    } else if (isNewSession) {
      initializeForm(null);
    } else if (currentSession) {
      initializeForm(currentSession);
    }
  }, [
    isDuplicating,
    duplicatingSession,
    isEditing,
    editingSession,
    isNewSession,
    currentSession?.startDate,
    currentSession?.endDate,
  ]);

  // Update form when tab changes
  const handleTabChange = (index: number) => {
    setActiveTabIndex(index);
    const session = sortedVariants[index];
    if (session) {
      initializeForm(session);
    }
  };

  // Filter exercises for dropdown
  const filteredExercises = exercises.filter((ex) =>
    normalizeString(ex.name).includes(normalizeString(exerciseSearch)),
  );

  // Get exercise video URL from exercises list
  const getExerciseVideoUrl = (exerciseId: string): string | undefined => {
    const exercise = exercises.find((ex) => ex.id === exerciseId);
    return exercise?.videoUrl;
  };

  // Get all variants of an exercise based on base name
  const getExerciseVariants = (exerciseId: string): Exercise[] => {
    const currentExercise = exercises.find((ex) => ex.id === exerciseId);
    if (!currentExercise) return [];

    const { baseName } = parseExerciseName(currentExercise.name);
    const normalizedBase = normalizeString(baseName);

    return exercises.filter((ex) => {
      const { baseName: exBaseName } = parseExerciseName(ex.name);
      return normalizeString(exBaseName) === normalizedBase;
    });
  };

  // Handle variant selection change
  const handleVariantChange = (
    exerciseIndex: number,
    newExerciseId: string,
  ) => {
    const newExercise = exercises.find((ex) => ex.id === newExerciseId);
    if (!newExercise) return;

    const updated = [...sessionExercises];
    updated[exerciseIndex] = {
      ...updated[exerciseIndex],
      exerciseId: newExerciseId,
      exerciseName: newExercise.name,
      videoUrl: newExercise.videoUrl,
      tempo: newExercise.tempo,
      notes: newExercise.coachInstructions,
    };
    setSessionExercises(updated);
    setHasChanges(true);
    setVariantDropdownIndex(null);
  };

  const handleAddExercise = (exercise: Exercise) => {
    const newExercise: SessionExercise = {
      id: Date.now().toString(),
      exerciseId: exercise.id,
      exerciseName: exercise.name,
      position: sessionExercises.length,
      targetSets: "3",
      targetReps: "10",
      tempo: exercise.tempo,
      videoUrl: exercise.videoUrl,
      notes: exercise.coachInstructions,
      executionMode: "straight",
    };
    setSessionExercises([...sessionExercises, newExercise]);
    setExerciseSearch("");
    setShowExerciseDropdown(false);
    setHasChanges(true);
    setHasChanges(true);
  };


  const handleRemoveExercise = (index: number) => {
    const updated = sessionExercises.filter((_, i) => i !== index);
    updated.forEach((ex, i) => (ex.position = i));
    setSessionExercises(updated);
    setHasChanges(true);
  };

  const handleExerciseChange = (
    index: number,
    field: keyof SessionExercise,
    value: any,
  ) => {
    const updated = [...sessionExercises];
    updated[index] = { ...updated[index], [field]: value };

    // For targetSets in a superset, sync across all linked exercises
    if (field === "targetSets" && updated[index].executionGroupId) {
      const groupId = updated[index].executionGroupId;
      updated.forEach((ex, i) => {
        if (i !== index && ex.executionGroupId === groupId) {
          updated[i] = { ...updated[i], targetSets: value };
        }
      });
    }

    setSessionExercises(updated);
    setHasChanges(true);
  };

  const handleFieldChange = () => {
    setHasChanges(true);
  };

  // Drag and drop handlers - block-level reordering (moves entire superset groups)
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    if (draggedIndex === null || draggedIndex === targetIndex) return;

    const updated = [...sessionExercises];
    const draggedEx = updated[draggedIndex];

    // Determine if dragged item is part of a superset
    const groupId = draggedEx.executionGroupId;
    if (groupId && draggedEx.executionMode === "superset") {
      // Find all indices of this superset group, sorted by current position
      const groupIndices = updated
        .map((ex, i) => ({ ex, i }))
        .filter(({ ex }) => ex.executionGroupId === groupId)
        .map(({ i }) => i)
        .sort((a, b) => a - b);

      const firstGroupIdx = groupIndices[0];
      const lastGroupIdx = groupIndices[groupIndices.length - 1];

      // Only move if target is outside the group range
      if (targetIndex >= firstGroupIdx && targetIndex <= lastGroupIdx) return;

      // Extract all group exercises (preserving their internal order)
      const groupExercises = groupIndices.map((i) => updated[i]);

      // Remove group exercises from array (from end to start to keep indices valid)
      for (let i = groupIndices.length - 1; i >= 0; i--) {
        updated.splice(groupIndices[i], 1);
      }

      // Calculate insertion point (adjust for removed items)
      let insertAt = targetIndex;
      if (targetIndex > firstGroupIdx) {
        insertAt = targetIndex - groupIndices.length + 1;
      }
      // Clamp to valid range
      insertAt = Math.max(0, Math.min(insertAt, updated.length));

      // Insert group at new position
      updated.splice(insertAt, 0, ...groupExercises);

      // Update all positions
      updated.forEach((ex, i) => (ex.position = i));

      // Find new draggedIndex (first exercise of the group)
      const newDraggedIndex = updated.findIndex(
        (ex) => ex.executionGroupId === groupId,
      );
      setSessionExercises(updated);
      setDraggedIndex(newDraggedIndex);
    } else {
      // Regular exercise: simple move
      const [draggedItem] = updated.splice(draggedIndex, 1);
      updated.splice(targetIndex, 0, draggedItem);
      updated.forEach((ex, i) => (ex.position = i));
      setSessionExercises(updated);
      setDraggedIndex(targetIndex);
    }
    setHasChanges(true);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Intra-superset drag handlers
  const handleSupersetDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation(); // Prevent parent superset block drag
    setSupersetDragIdx(index);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
    }
  };

  const handleSupersetDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = "move";
    }
    if (supersetDragIdx !== null && supersetDragIdx !== index) {
      const draggedEx = sessionExercises[supersetDragIdx];
      const targetEx = sessionExercises[index];
      // Only allow reorder within the same superset group
      if (
        draggedEx?.executionGroupId &&
        draggedEx.executionGroupId === targetEx?.executionGroupId
      ) {
        const updated = [...sessionExercises];
        // Swap the two exercises in the array
        const [draggedItem] = updated.splice(supersetDragIdx, 1);
        updated.splice(index, 0, draggedItem);
        // Update positions and executionGroupPosition within the group
        updated.forEach((ex, i) => (ex.position = i));
        const groupId = draggedEx.executionGroupId;
        let groupPos = 0;
        updated.forEach((ex, i) => {
          if (ex.executionGroupId === groupId) {
            updated[i] = { ...updated[i], executionGroupPosition: groupPos++ };
          }
        });
        setSessionExercises(updated);
        setSupersetDragIdx(index);
        setHasChanges(true);
      }
    }
  };

  const handleSupersetDragEnd = (e: React.DragEvent) => {
    e.stopPropagation();
    setSupersetDragIdx(null);
  };

  // Handle execution mode change
  const handleExecutionModeChange = (index: number, mode: ExecutionMode) => {
    if (mode === "superset") {
      // Open superset search to select second exercise
      setSupersetSearchIndex(index);
      setSupersetSearchQuery("");
    } else {
      // Set to straight mode (remove from any superset)
      const updated = [...sessionExercises];
      const currentEx = updated[index];

      // If this exercise was part of a superset, remove the link
      if (currentEx.executionGroupId) {
        const groupId = currentEx.executionGroupId;
        // Reset all exercises in this group to straight
        updated.forEach((ex, i) => {
          if (ex.executionGroupId === groupId) {
            updated[i] = {
              ...ex,
              executionMode: "straight",
              executionGroupId: undefined,
              executionGroupPosition: undefined,
            };
          }
        });
      } else {
        updated[index] = {
          ...currentEx,
          executionMode: mode,
        };
      }

      setSessionExercises(updated);
      setHasChanges(true);
    }
    setExecutionModeDropdownIndex(null);
  };

  // Create superset between two exercises
  const handleCreateSuperset = (
    firstIndex: number,
    secondExercise: Exercise,
  ) => {
    const updated = [...sessionExercises];
    const groupId = crypto.randomUUID();

    // Add second exercise to session
    const newExercise: SessionExercise = {
      id: Date.now().toString(),
      exerciseId: secondExercise.id,
      exerciseName: secondExercise.name,
      position: firstIndex + 1, // Insert right after first exercise
      targetSets: updated[firstIndex].targetSets || "3",
      targetReps: updated[firstIndex].targetReps || "10",
      tempo: secondExercise.tempo,
      videoUrl: secondExercise.videoUrl,
      notes: secondExercise.coachInstructions,
      executionMode: "superset",
      executionGroupId: groupId,
      executionGroupPosition: 1,
    };

    // Update first exercise with superset info
    updated[firstIndex] = {
      ...updated[firstIndex],
      executionMode: "superset",
      executionGroupId: groupId,
      executionGroupPosition: 0,
    };

    // Insert new exercise after first one
    updated.splice(firstIndex + 1, 0, newExercise);

    // Update positions for all exercises
    updated.forEach((ex, i) => (ex.position = i));

    setSessionExercises(updated);
    setSupersetSearchIndex(null);
    setSupersetSearchQuery("");
    setHasChanges(true);
  };

  // Break a superset
  const handleBreakSuperset = (groupId: string) => {
    const updated = sessionExercises.map((ex) => {
      if (ex.executionGroupId === groupId) {
        return {
          ...ex,
          executionMode: "straight" as ExecutionMode,
          executionGroupId: undefined,
          executionGroupPosition: undefined,
        };
      }
      return ex;
    });
    setSessionExercises(updated);
    setHasChanges(true);
  };

  // Get filtered exercises for superset search
  const getSupersetSearchResults = () => {
    if (!supersetSearchQuery.trim()) return [];

    const normalizedQuery = normalizeString(supersetSearchQuery);
    const currentExerciseIds = new Set(
      sessionExercises.map((ex) => ex.exerciseId),
    );

    // Filter exercises by search query
    const matchingExercises = exercises.filter((ex) =>
      normalizeString(ex.name).includes(normalizedQuery),
    );

    // Split into two categories: not in session (priority) vs in session
    const notInSession = matchingExercises.filter(
      (ex) => !currentExerciseIds.has(ex.id),
    );
    const inSession = matchingExercises.filter((ex) =>
      currentExerciseIds.has(ex.id),
    );

    return [...notInSession.slice(0, 5), ...inSession.slice(0, 3)];
  };

  // Check if an exercise was modified compared to its original state
  const wasExerciseModified = (sessionEx: SessionExercise): boolean => {
    // Find original exercise by ID
    const original = originalExercises.find((o) => o.id === sessionEx.id);

    if (!original) {
      // New exercise added during this session - check if it matches the DB exercise
      const dbExercise = exercises.find((ex) => ex.id === sessionEx.exerciseId);
      if (!dbExercise) return true; // No DB exercise found, needs check

      // Only video affects exercise identity (tempo, notes, reps, sets are session-level)
      const videoChanged =
        (sessionEx.videoUrl || "") !== (dbExercise.videoUrl || "");

      return videoChanged;
    }

    // Compare with original values from session load - only video affects exercise identity
    const videoChanged =
      (sessionEx.videoUrl || "") !== (original.videoUrl || "");

    return videoChanged;
  };

  // NEW: Start save flow - check exercises first
  const handleSaveClick = () => {
    setError(null);

    if (!seanceType.trim()) {
      setError("Le nom de la séance est requis");
      return;
    }

    if (sessionExercises.length === 0) {
      setError("Ajoutez au moins un exercice");
      return;
    }

    // Find exercises that were MODIFIED and don't match any existing variant
    const unmatched: UnmatchedExercise[] = [];

    sessionExercises.forEach((sessionEx, index) => {
      // Only check exercises that were actually modified
      if (!wasExerciseModified(sessionEx)) {
        return; // Skip unmodified exercises
      }

      // Check if modified values match any existing exercise variant
      const match = findMatchingExercise(sessionEx, exercises, coachId);

      if (!match) {
        // No exact match found - need to create variant
        const closest = findClosestExercise(sessionEx, exercises, coachId);
        const differences = closest
          ? getExerciseDifferences(sessionEx, closest)
          : [];

        unmatched.push({
          sessionExerciseIndex: index,
          sessionExercise: sessionEx,
          closestMatch: closest,
          differences,
        });
      }
    });

    if (unmatched.length > 0) {
      // Start unmatched exercise flow
      setUnmatchedExercises(unmatched);
      setVariantNames(new Map());
      setCurrentUnmatchedIndex(0);
    } else {
      // No unmatched exercises - check session update vs create
      checkSessionUpdateOrCreate([]);
    }
  };

  // Check if we should update existing session or create new variant
  const checkSessionUpdateOrCreate = (
    exercisesToCreate: {
      exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">;
      sessionExerciseIndex: number;
    }[],
  ) => {
    setPendingExercisesToCreate(exercisesToCreate);

    // For new sessions or duplications, always create
    if (isNewSession || isDuplicating) {
      performSave(exercisesToCreate, false);
      return;
    }

    // For editing mode, directly update the editing session (no confirmation needed)
    if (isEditing && editingSession) {
      performSave(exercisesToCreate, true, {
        templateId: editingSession.id,
        startDate: editingSession.startDate,
        endDate: editingSession.endDate,
      });
      return;
    }

    // Check if dates match the current session (UPDATE case)
    const datesMatchCurrent =
      startDate === originalStartDate && endDate === originalEndDate;

    if (datesMatchCurrent) {
      // Dates haven't changed - show update confirmation
      setExistingSessionToUpdate(currentSession);
      setShowUpdateConfirmation(true);
    } else {
      // Dates changed - check if new dates match another existing variant
      const matchingVariant = variants.find(
        (v) =>
          v !== currentSession &&
          (v.startDate || "") === startDate &&
          (v.endDate || "") === endDate,
      );

      if (matchingVariant) {
        // Another variant with same dates exists - show update confirmation for that one
        setExistingSessionToUpdate(matchingVariant);
        setShowUpdateConfirmation(true);
      } else {
        // New dates - show date confirmation to create new variant
        setShowDateConfirmation(true);
      }
    }
  };

  // Handle variant name input change
  const handleVariantNameChange = (name: string) => {
    if (currentUnmatchedIndex === null) return;
    const newNames = new Map(variantNames);
    newNames.set(currentUnmatchedIndex, name);
    setVariantNames(newNames);
  };

  // Handle create variant decision
  const handleCreateVariant = () => {
    if (currentUnmatchedIndex === null) return;

    const unmatched = unmatchedExercises[currentUnmatchedIndex];
    const variantName =
      variantNames.get(currentUnmatchedIndex) || "Ma variante";
    const { baseName } = parseExerciseName(
      unmatched.sessionExercise.exerciseName,
    );

    // Store the exercise to create
    const newExercise: Omit<Exercise, "id" | "createdAt" | "updatedAt"> = {
      name: buildExerciseName(baseName, variantName),
      coachId,
      tempo: unmatched.sessionExercise.tempo,
      videoUrl: unmatched.sessionExercise.videoUrl,
      coachInstructions: unmatched.sessionExercise.notes,
      // Copy other fields from closest match if available
      primaryMuscleGroupId: unmatched.closestMatch?.primaryMuscleGroupId,
      movementPatternId: unmatched.closestMatch?.movementPatternId,
      limbType: unmatched.closestMatch?.limbType,
      categoryId: unmatched.closestMatch?.categoryId,
    };

    const toCreate = [
      ...pendingExercisesToCreate,
      {
        exercise: newExercise,
        sessionExerciseIndex: unmatched.sessionExerciseIndex,
      },
    ];
    setPendingExercisesToCreate(toCreate);

    // Move to next unmatched or finish
    if (currentUnmatchedIndex < unmatchedExercises.length - 1) {
      setCurrentUnmatchedIndex(currentUnmatchedIndex + 1);
    } else {
      // All unmatched exercises processed - check session update vs create
      setCurrentUnmatchedIndex(null);
      checkSessionUpdateOrCreate(toCreate);
    }
  };

  // Cancel the entire save flow
  const handleCancelSaveFlow = () => {
    setUnmatchedExercises([]);
    setCurrentUnmatchedIndex(null);
    setVariantNames(new Map());
    setShowDateConfirmation(false);
    setShowUpdateConfirmation(false);
    setExistingSessionToUpdate(null);
    setPendingExercisesToCreate([]);
  };

  // Confirm dates and proceed to save (CREATE new variant)
  const handleConfirmDates = () => {
    setShowDateConfirmation(false);
    performSave(pendingExercisesToCreate, false);
  };

  // Confirm update and proceed to save (UPDATE existing)
  const handleConfirmUpdate = () => {
    if (!existingSessionToUpdate) return;
    setShowUpdateConfirmation(false);
    performSave(pendingExercisesToCreate, true, {
      templateId: existingSessionToUpdate.id,
      startDate: existingSessionToUpdate.startDate,
      endDate: existingSessionToUpdate.endDate,
    });
  };

  // Perform the actual save
  const performSave = async (
    exercisesToCreate: {
      exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">;
      sessionExerciseIndex: number;
    }[],
    shouldUpdate: boolean = false,
    existingTemplate?: {
      templateId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) => {
    setSaving(true);
    try {
      await onSave(
        {
          seanceType: seanceType.trim(),
          exercises: sessionExercises,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        exercisesToCreate,
        shouldUpdate,
        existingTemplate,
      );

      if ((isNewSession || isDuplicating || isEditing) && onSessionCreated) {
        onSessionCreated(seanceType.trim());
        onClose();
      }
      setHasChanges(false);

      // Reset save flow state
      setUnmatchedExercises([]);
      setPendingExercisesToCreate([]);
      setVariantNames(new Map());
      setShowUpdateConfirmation(false);
      setExistingSessionToUpdate(null);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!currentSession) return;
    await onDelete(currentSession);
    setShowDeletePopover(false);
  };

  const handleDuplicateConfirm = () => {
    if (!currentSession) return;
    onDuplicate(currentSession);
    setShowDuplicatePopover(false);
  };

  if (
    !isNewSession &&
    !isDuplicating &&
    !isEditing &&
    sortedVariants.length === 0
  ) {
    return (
      <div className="h-full flex items-center justify-center text-theme-muted">
        Aucune variante disponible
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ========== HEADER FIXE (panneau détail) ========== */}
      <div className="flex-shrink-0 border-b border-theme">
        {/* Close button, title, and save button */}
        <div className="flex items-center justify-between p-2 border-b border-theme/50">
          {isNewSession || isDuplicating || isEditing ? (
            <input
              type="text"
              value={seanceType}
              onChange={(e) => {
                setSeanceType(e.target.value);
                handleFieldChange();
              }}
              placeholder={
                isDuplicating
                  ? "Nom de la copie"
                  : isEditing
                    ? "Nom de la séance"
                    : "Nom de la séance"
              }
              className="text-lg font-semibold text-theme px-2 bg-transparent border-b border-theme focus:border-[var(--color-primary)] focus:outline-none flex-1"
              autoFocus
            />
          ) : (
            <h2 className="text-lg font-semibold text-theme px-2">
              {sessionName}
            </h2>
          )}
          <div className="flex items-center gap-2">
            {hasChanges && (
              <button
                onClick={handleSaveClick}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving
                  ? "Sauvegarde..."
                  : isDuplicating
                    ? "Dupliquer"
                    : isNewSession
                      ? "Créer"
                      : isEditing
                        ? "Enregistrer"
                        : "Sauvegarder"}
              </button>
            )}
            <button
              onClick={handleCloseClick}
              className="p-1.5 text-theme-muted hover:text-theme"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Variant tabs - only for existing sessions (not when creating new, duplicating, or editing) */}
        {!isNewSession && !isDuplicating && !isEditing && (
          <div
            className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-theme-muted scrollbar-track-transparent"
            onWheel={handleWheelScroll}
          >
            {sortedVariants.map((variant, index) => {
              const variantIsCommon = !variant.coachId;
              const variantIsMine = variant.coachId === coachId;

              return (
                <div
                  key={`${variant.seanceType}-${variant.startDate}-${variant.endDate}-${index}`}
                  className={`flex items-center gap-2 px-4 py-2 border-r border-theme/50 cursor-pointer whitespace-nowrap ${
                    index === activeTabIndex
                      ? "bg-theme-secondary text-theme"
                      : "text-theme-muted hover:bg-theme-tertiary hover:text-theme"
                  }`}
                  onClick={() => handleTabChange(index)}
                >
                  {variantIsCommon ? (
                    <Globe className="w-3 h-3 text-[var(--color-primary)] flex-shrink-0" />
                  ) : (
                    <Lock className="w-3 h-3 text-[var(--color-accent)] flex-shrink-0" />
                  )}
                  <span className="text-sm truncate max-w-40">
                    {getPeriodLabel(variant)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save button moved to header */}

      {/* ========== Contenu scrollable ========== */}
      <div className="flex-1 h-0 custom-scrollbar p-4 space-y-4">
        {error && (
          <div className="p-3 bg-[var(--color-danger)]/10 border border-[var(--color-danger)]/30 rounded-lg text-[var(--color-danger)] text-sm">
            {error}
          </div>
        )}

        {/* Action buttons - Replace badges */}
        {!isNewSession && !isDuplicating && !isEditing && currentSession && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(currentSession)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-theme-tertiary text-theme rounded-lg text-sm transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Modifier
            </button>
            <button
              onClick={() => setShowDuplicatePopover(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-theme-tertiary text-theme rounded-lg text-sm transition-colors"
            >
              <Copy className="w-4 h-4" />
              Dupliquer
            </button>
            {isMine && (
              <button
                onClick={() => setShowDeletePopover(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-[var(--color-danger)]/10 text-theme hover:text-[var(--color-danger)] rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            )}
          </div>
        )}

        {/* Period - Start and End dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">
              Date de début
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                handleFieldChange();
              }}
              disabled={!isEditingMode}
              className={`w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-theme-secondary mb-1">
              Date de fin
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                handleFieldChange();
              }}
              disabled={!isEditingMode}
              className={`w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
            />
          </div>
        </div>

        {/* Exercises */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-theme-secondary">
              Exercices *
            </label>
            <span className="text-xs text-theme-muted">
              {sessionExercises.length} exercice
              {sessionExercises.length > 1 ? "s" : ""}
            </span>
          </div>

          {/* Exercise list */}
          <div className="space-y-2 mb-3">
            {(() => {
              // Track which exercises have been rendered (for superset grouping)
              const renderedIndices = new Set<number>();

              return sessionExercises.map((ex, idx) => {
                // Skip if already rendered as part of a superset
                if (renderedIndices.has(idx)) return null;

                const exerciseVideoUrl =
                  ex.videoUrl || getExerciseVideoUrl(ex.exerciseId);
                const variants = getExerciseVariants(ex.exerciseId);
                const hasMultipleVariants = variants.length > 1;
                const { baseName } = parseExerciseName(ex.exerciseName);
                const isInSuperset = !!(
                  ex.executionGroupId && ex.executionMode === "superset"
                );
                const isFirstInSuperset =
                  isInSuperset && ex.executionGroupPosition === 0;

                // Find linked exercises for superset
                const linkedExercises = isFirstInSuperset
                  ? sessionExercises
                      .map((e, i) => ({ exercise: e, index: i }))
                      .filter(
                        ({ exercise }) =>
                          exercise.executionGroupId === ex.executionGroupId &&
                          exercise.id !== ex.id,
                      )
                  : [];

                // Mark linked exercises as rendered
                linkedExercises.forEach(({ index }) =>
                  renderedIndices.add(index),
                );

                // ========== SUPERSET BLOCK (fused exercises) ==========
                if (isFirstInSuperset && linkedExercises.length > 0) {
                  // Collect all exercises in this superset group, sorted by executionGroupPosition
                  const allGroupExercises = [
                    { exercise: ex, index: idx },
                    ...linkedExercises,
                  ].sort(
                    (a, b) =>
                      (a.exercise.executionGroupPosition ?? 0) -
                      (b.exercise.executionGroupPosition ?? 0),
                  );

                  // Find the first exercise (by position) to use for rest time
                  const firstGroupEx = allGroupExercises[0];

                  // Check if this superset block is currently being dragged
                  const allGroupIndices = allGroupExercises.map((g) => g.index);
                  const isSupersetDragged =
                    draggedIndex !== null &&
                    allGroupIndices.includes(draggedIndex);

                  return (
                    <div
                      key={ex.id}
                      onDragOver={(e) => {
                        // Block-level drag over (only when not doing intra-superset drag)
                        if (supersetDragIdx === null) handleDragOver(e, idx);
                      }}
                      className={`rounded-lg border-2 border-[var(--color-primary)] bg-[var(--color-primary)]/5 overflow-hidden transition-all duration-200 ${
                        isSupersetDragged
                          ? "opacity-70 shadow-lg shadow-[var(--color-primary)]/30 scale-[1.02] ring-2 ring-[var(--color-primary)]"
                          : ""
                      }`}
                    >
                      {/* Superset header - draggable for block-level reorder */}
                      <div
                        draggable={isEditingMode}
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center justify-between px-3 py-2 bg-[var(--color-primary)]/10 border-b border-[var(--color-primary)]/30 ${isEditingMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                      >
                        <div className="flex items-center gap-2">
                          {isEditingMode && (
                            <GripVertical className="w-4 h-4 text-[var(--color-primary)] opacity-60" />
                          )}
                          <Link2 className="w-4 h-4 text-[var(--color-primary)]" />
                          <span className="text-sm font-medium text-[var(--color-primary)]">
                            Superset
                          </span>
                        </div>
                        {isEditingMode && (
                          <button
                            onClick={() =>
                              handleBreakSuperset(ex.executionGroupId!)
                            }
                            className="p-1 text-theme-muted hover:text-[var(--color-danger)] rounded hover:bg-theme-tertiary flex items-center gap-1"
                            title="Dissocier le superset"
                          >
                            <Unlink className="w-3 h-3" />
                            <span className="text-xs">Dissocier</span>
                          </button>
                        )}
                      </div>

                      {/* Exercise rows - each individually draggable within the superset */}
                      {allGroupExercises.map(
                        ({ exercise: groupEx, index: groupIdx }, posIndex) => {
                          const groupVideoUrl =
                            groupEx.videoUrl ||
                            getExerciseVideoUrl(groupEx.exerciseId);
                          const groupVariants = getExerciseVariants(
                            groupEx.exerciseId,
                          );
                          const groupHasVariants = groupVariants.length > 1;
                          const { baseName: groupBaseName } = parseExerciseName(
                            groupEx.exerciseName,
                          );
                          const letter = String.fromCharCode(65 + posIndex); // A, B, C...

                          return (
                            <div
                              key={groupEx.id}
                              draggable={isEditingMode}
                              onDragStart={(e) =>
                                handleSupersetDragStart(e, groupIdx)
                              }
                              onDragOver={(e) =>
                                handleSupersetDragOver(e, groupIdx)
                              }
                              onDragEnd={handleSupersetDragEnd}
                              className={`p-3 border-b border-[var(--color-primary)]/20 last:border-b-0 transition-all duration-150 ${
                                supersetDragIdx === groupIdx
                                  ? "opacity-60 bg-[var(--color-primary)]/15 scale-[1.01]"
                                  : ""
                              } ${isEditingMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                            >
                              <div className="flex items-start gap-2">
                                {isEditingMode && (
                                  <GripVertical className="w-3.5 h-3.5 text-theme-muted cursor-move mt-1 flex-shrink-0" />
                                )}
                                <span className="text-[var(--color-primary)] text-sm font-bold w-6 mt-0.5">
                                  {letter}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2 relative">
                                      <p className="text-theme text-sm font-medium">
                                        {groupBaseName}
                                      </p>
                                      {isEditingMode && groupHasVariants && (
                                        <div className="relative">
                                          <button
                                            onClick={() =>
                                              setVariantDropdownIndex(
                                                variantDropdownIndex ===
                                                  groupIdx
                                                  ? null
                                                  : groupIdx,
                                              )
                                            }
                                            className="p-1 text-theme-muted hover:text-theme rounded hover:bg-theme-tertiary flex items-center gap-0.5"
                                            title="Choisir une variante"
                                          >
                                            <List className="w-3 h-3" />
                                            <ChevronDown className="w-3 h-3" />
                                          </button>
                                          {variantDropdownIndex ===
                                            groupIdx && (
                                            <div className="absolute top-full left-0 mt-1 bg-theme-secondary border border-theme rounded-lg shadow-xl z-20 min-w-48 max-h-48 overflow-y-auto">
                                              {groupVariants.map((variant) => {
                                                const variantDisplay =
                                                  getExerciseVariantDisplayName(
                                                    variant,
                                                    variant.coachId === coachId,
                                                  );
                                                const isSelected =
                                                  variant.id ===
                                                  groupEx.exerciseId;
                                                return (
                                                  <button
                                                    key={variant.id}
                                                    onClick={() =>
                                                      handleVariantChange(
                                                        groupIdx,
                                                        variant.id,
                                                      )
                                                    }
                                                    className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                                                      isSelected
                                                        ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                                                        : "text-theme hover:bg-theme-tertiary"
                                                    }`}
                                                  >
                                                    {variant.coachId ? (
                                                      <Lock className="w-3 h-3 text-[var(--color-accent)] flex-shrink-0" />
                                                    ) : (
                                                      <Globe className="w-3 h-3 text-[var(--color-primary)] flex-shrink-0" />
                                                    )}
                                                    <span className="truncate">
                                                      {variantDisplay}
                                                    </span>
                                                    {isSelected && (
                                                      <Check className="w-3 h-3 ml-auto flex-shrink-0" />
                                                    )}
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() =>
                                          setVideoModalIndex(groupIdx)
                                        }
                                        className={`p-1 rounded hover:bg-theme-tertiary ${groupVideoUrl ? "text-[var(--color-primary)] hover:text-[var(--color-primary-light)]" : "text-theme-muted hover:text-theme"}`}
                                        title={
                                          groupVideoUrl
                                            ? "Voir la vidéo"
                                            : "Ajouter une vidéo"
                                        }
                                      >
                                        <Play className="w-4 h-4" />
                                      </button>
                                      <button
                                        onClick={() =>
                                          setNotesPopoverIndex(groupIdx)
                                        }
                                        className={`p-1 rounded hover:bg-theme-tertiary ${groupEx.notes ? "text-[var(--color-warning)]" : "text-theme-muted hover:text-theme"}`}
                                        title="Consignes"
                                      >
                                        <FileText className="w-4 h-4" />
                                      </button>
                                      {isEditingMode && (
                                        <button
                                          onClick={() =>
                                            handleRemoveExercise(groupIdx)
                                          }
                                          className="p-1 text-theme-muted hover:text-[var(--color-danger)] rounded hover:bg-theme-tertiary"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 mt-2">
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={groupEx.targetSets || ""}
                                        onChange={(e) =>
                                          handleExerciseChange(
                                            groupIdx,
                                            "targetSets",
                                            e.target.value || undefined,
                                          )
                                        }
                                        disabled={!isEditingMode}
                                        className={`w-12 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
                                        placeholder="3"
                                      />
                                      <span className="text-theme-muted text-xs">
                                        séries
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={groupEx.targetReps || ""}
                                        onChange={(e) =>
                                          handleExerciseChange(
                                            groupIdx,
                                            "targetReps",
                                            e.target.value,
                                          )
                                        }
                                        disabled={!isEditingMode}
                                        className={`w-16 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
                                        placeholder="10"
                                      />
                                      <span className="text-theme-muted text-xs">
                                        reps
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="text"
                                        value={groupEx.tempo || ""}
                                        onChange={(e) =>
                                          handleExerciseChange(
                                            groupIdx,
                                            "tempo",
                                            e.target.value,
                                          )
                                        }
                                        disabled={!isEditingMode}
                                        className={`w-20 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
                                        placeholder="3-0-1-0"
                                      />
                                      <span className="text-theme-muted text-xs">
                                        tempo
                                      </span>
                                    </div>
                                  </div>
                                  {groupEx.notes && (
                                    <p className="mt-2 text-xs text-theme-muted italic truncate">
                                      {groupEx.notes}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        },
                      )}

                      {/* Superset rest time (shared, stored on first exercise by position) */}
                      <div className="px-3 py-2 bg-[var(--color-primary)]/5 border-t border-[var(--color-primary)]/30 flex items-center gap-2">
                        <span className="text-theme-muted text-xs">
                          Récupération :
                        </span>
                        <input
                          type="number"
                          value={firstGroupEx.exercise.restTimeSec || ""}
                          onChange={(e) =>
                            handleExerciseChange(
                              firstGroupEx.index,
                              "restTimeSec",
                              e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            )
                          }
                          disabled={!isEditingMode}
                          className={`w-14 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
                          placeholder="90"
                        />
                        <span className="text-theme-muted text-xs">sec</span>
                      </div>
                    </div>
                  );
                }

                // ========== REGULAR EXERCISE BLOCK ==========
                return (
                  <div
                    key={ex.id}
                    draggable={isEditingMode}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`p-3 bg-theme-secondary rounded-lg transition-all duration-200 ${
                      draggedIndex === idx
                        ? "opacity-70 shadow-lg shadow-[var(--color-primary)]/30 scale-[1.02] ring-2 ring-[var(--color-primary)] z-10"
                        : ""
                    } ${isEditingMode ? "cursor-grab active:cursor-grabbing" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      {isEditingMode && (
                        <GripVertical className="w-4 h-4 text-theme-muted cursor-move mt-1" />
                      )}
                      <span className="text-theme-muted text-sm w-6 mt-0.5">
                        {idx + 1}.
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 relative">
                            <p className="text-theme text-sm font-medium">
                              {baseName}
                            </p>
                            {/* Variant selector */}
                            {isEditingMode && hasMultipleVariants && (
                              <div className="relative">
                                <button
                                  onClick={() =>
                                    setVariantDropdownIndex(
                                      variantDropdownIndex === idx ? null : idx,
                                    )
                                  }
                                  className="p-1 text-theme-muted hover:text-theme rounded hover:bg-theme-tertiary flex items-center gap-0.5"
                                  title="Choisir une variante"
                                >
                                  <List className="w-3 h-3" />
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                {variantDropdownIndex === idx && (
                                  <div className="absolute top-full left-0 mt-1 bg-theme-secondary border border-theme rounded-lg shadow-xl z-20 min-w-48 max-h-48 overflow-y-auto">
                                    {variants.map((variant) => {
                                      const variantDisplay =
                                        getExerciseVariantDisplayName(
                                          variant,
                                          variant.coachId === coachId,
                                        );
                                      const isSelected =
                                        variant.id === ex.exerciseId;
                                      return (
                                        <button
                                          key={variant.id}
                                          onClick={() =>
                                            handleVariantChange(idx, variant.id)
                                          }
                                          className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                                            isSelected
                                              ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                                              : "text-theme hover:bg-theme-tertiary"
                                          }`}
                                        >
                                          {variant.coachId ? (
                                            <Lock className="w-3 h-3 text-[var(--color-accent)] flex-shrink-0" />
                                          ) : (
                                            <Globe className="w-3 h-3 text-[var(--color-primary)] flex-shrink-0" />
                                          )}
                                          <span className="truncate">
                                            {variantDisplay}
                                          </span>
                                          {isSelected && (
                                            <Check className="w-3 h-3 ml-auto flex-shrink-0" />
                                          )}
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            )}
                            {/* Execution mode selector - only in editing mode */}
                            {isEditingMode && (
                              <div className="relative ml-2">
                                <button
                                  onClick={() =>
                                    setExecutionModeDropdownIndex(
                                      executionModeDropdownIndex === idx
                                        ? null
                                        : idx,
                                    )
                                  }
                                  className={`p-1 rounded hover:bg-theme-tertiary flex items-center gap-1 ${
                                    ex.executionMode === "superset"
                                      ? "text-[var(--color-primary)]"
                                      : "text-theme-muted hover:text-theme"
                                  }`}
                                  title="Mode d'exécution"
                                >
                                  {ex.executionMode === "superset" ? (
                                    <Link2 className="w-3 h-3" />
                                  ) : (
                                    <Dumbbell className="w-3 h-3" />
                                  )}
                                  <ChevronDown className="w-3 h-3" />
                                </button>
                                {executionModeDropdownIndex === idx && (
                                  <div className="absolute top-full left-0 mt-1 bg-theme-secondary border border-theme rounded-lg shadow-xl z-20 min-w-36">
                                    <button
                                      onClick={() =>
                                        handleExecutionModeChange(
                                          idx,
                                          "straight",
                                        )
                                      }
                                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                                        ex.executionMode !== "superset"
                                          ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                                          : "text-theme hover:bg-theme-tertiary"
                                      }`}
                                    >
                                      <Dumbbell className="w-3 h-3" />
                                      <span>Classique</span>
                                      {ex.executionMode !== "superset" && (
                                        <Check className="w-3 h-3 ml-auto" />
                                      )}
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleExecutionModeChange(
                                          idx,
                                          "superset",
                                        )
                                      }
                                      className={`w-full px-3 py-2 text-left text-sm flex items-center gap-2 ${
                                        ex.executionMode === "superset"
                                          ? "bg-[var(--color-primary)]/20 text-[var(--color-primary)]"
                                          : "text-theme hover:bg-theme-tertiary"
                                      }`}
                                    >
                                      <Link2 className="w-3 h-3" />
                                      <span>Superset</span>
                                      {ex.executionMode === "superset" && (
                                        <Check className="w-3 h-3 ml-auto" />
                                      )}
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {/* Video button - always visible */}
                            <button
                              onClick={() => setVideoModalIndex(idx)}
                              className={`p-1 rounded hover:bg-theme-tertiary ${exerciseVideoUrl ? "text-[var(--color-primary)] hover:text-[var(--color-primary-light)]" : "text-theme-muted hover:text-theme"}`}
                              title={
                                exerciseVideoUrl
                                  ? "Voir la vidéo"
                                  : "Ajouter une vidéo"
                              }
                            >
                              <Play className="w-4 h-4" />
                            </button>
                            {/* Notes button */}
                            <button
                              onClick={() => setNotesPopoverIndex(idx)}
                              className={`p-1 rounded hover:bg-theme-tertiary ${ex.notes ? "text-[var(--color-warning)]" : "text-theme-muted hover:text-theme"}`}
                              title="Consignes"
                            >
                              <FileText className="w-4 h-4" />
                            </button>
                            {/* Delete button - only in editing mode */}
                            {isEditingMode && (
                              <button
                                onClick={() => handleRemoveExercise(idx)}
                                className="p-1 text-theme-muted hover:text-[var(--color-danger)] rounded hover:bg-theme-tertiary"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Superset search (shown when selecting superset mode) */}
                        {supersetSearchIndex === idx && (
                          <div className="mt-2 relative">
                            <input
                              type="text"
                              value={supersetSearchQuery}
                              onChange={(e) =>
                                setSupersetSearchQuery(e.target.value)
                              }
                              className="w-full px-3 py-2 bg-theme border border-[var(--color-primary)] rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
                              placeholder="Rechercher le 2ème exercice..."
                              autoFocus
                            />
                            <button
                              onClick={() => {
                                setSupersetSearchIndex(null);
                                setSupersetSearchQuery("");
                              }}
                              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            {supersetSearchQuery && (
                              <div className="absolute top-full left-0 right-0 mt-1 bg-theme-secondary border border-theme rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto">
                                {getSupersetSearchResults().length === 0 ? (
                                  <div className="p-3 text-theme-muted text-sm">
                                    Aucun exercice trouvé
                                  </div>
                                ) : (
                                  getSupersetSearchResults().map((searchEx) => (
                                    <button
                                      key={searchEx.id}
                                      onClick={() =>
                                        handleCreateSuperset(idx, searchEx)
                                      }
                                      className="w-full px-3 py-2 text-left text-sm text-theme hover:bg-theme-tertiary flex items-center gap-2"
                                    >
                                      <Link2 className="w-4 h-4 text-[var(--color-primary)]" />
                                      {searchEx.name}
                                    </button>
                                  ))
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Exercise parameters */}
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={ex.targetSets || ""}
                              onChange={(e) =>
                                handleExerciseChange(
                                  idx,
                                  "targetSets",
                                  e.target.value || undefined,
                                )
                              }
                              disabled={!isEditingMode}
                              className={`w-12 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
                              placeholder="3"
                            />
                            <span className="text-theme-muted text-xs">
                              séries
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={ex.targetReps || ""}
                              onChange={(e) =>
                                handleExerciseChange(
                                  idx,
                                  "targetReps",
                                  e.target.value,
                                )
                              }
                              disabled={!isEditingMode}
                              className={`w-16 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
                              placeholder="10"
                            />
                            <span className="text-theme-muted text-xs">
                              reps
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={ex.tempo || ""}
                              onChange={(e) =>
                                handleExerciseChange(
                                  idx,
                                  "tempo",
                                  e.target.value,
                                )
                              }
                              disabled={!isEditingMode}
                              className={`w-20 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
                              placeholder="3-0-1-0"
                            />
                            <span className="text-theme-muted text-xs">
                              tempo
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              value={ex.restTimeSec || ""}
                              onChange={(e) =>
                                handleExerciseChange(
                                  idx,
                                  "restTimeSec",
                                  e.target.value
                                    ? parseInt(e.target.value)
                                    : undefined,
                                )
                              }
                              disabled={!isEditingMode}
                              className={`w-14 px-2 py-1 bg-theme border border-theme rounded text-theme text-xs text-center ${!isEditingMode ? "opacity-60 cursor-not-allowed" : ""}`}
                              placeholder="90"
                            />
                            <span className="text-theme-muted text-xs">
                              repos (s)
                            </span>
                          </div>
                        </div>

                        {/* Notes preview if any */}
                        {ex.notes && (
                          <p className="mt-2 text-xs text-theme-muted italic truncate">
                            {ex.notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
          </div>

          {/* Add exercise - only in editing mode */}
          {isEditingMode && (
            <div className="relative">
              <input
                type="text"
                value={exerciseSearch}
                onChange={(e) => {
                  setExerciseSearch(e.target.value);
                }}
                onFocus={() => setShowExerciseDropdown(true)}
                className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              />
              {showExerciseDropdown && exerciseSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-theme-secondary border border-theme rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                  {filteredExercises.length === 0 ? (
                    <div className="p-3 text-theme-muted text-sm">
                      Aucun exercice trouvé
                    </div>
                  ) : (
                    filteredExercises.slice(0, 10).map((ex) => (
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
          )}
        </div>
      </div>

      {/* Notes Popover */}
      {notesPopoverIndex !== null && (
        <NotesPopover
          isOpen={true}
          onClose={() => setNotesPopoverIndex(null)}
          notes={sessionExercises[notesPopoverIndex]?.notes || ""}
          onSave={(notes) =>
            handleExerciseChange(notesPopoverIndex, "notes", notes || undefined)
          }
        />
      )}

      {/* Video Modal */}
      {videoModalIndex !== null && (
        <VideoModal
          url={
            sessionExercises[videoModalIndex]?.videoUrl ||
            getExerciseVideoUrl(
              sessionExercises[videoModalIndex]?.exerciseId,
            ) ||
            ""
          }
          onClose={() => setVideoModalIndex(null)}
          onChangeUrl={(newUrl) => {
            handleExerciseChange(
              videoModalIndex,
              "videoUrl",
              newUrl || undefined,
            );
          }}
        />
      )}

      {/* NEW: Unmatched Exercise Popup - Create Variant */}
      {currentUnmatchedIndex !== null &&
        unmatchedExercises[currentUnmatchedIndex] && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-theme font-medium">
                  Nouvel exercice détecté
                </h3>
                <span className="text-theme-muted text-sm">
                  {currentUnmatchedIndex + 1} / {unmatchedExercises.length}
                </span>
              </div>

              {(() => {
                const unmatched = unmatchedExercises[currentUnmatchedIndex];
                const { baseName } = parseExerciseName(
                  unmatched.sessionExercise.exerciseName,
                );

                return (
                  <>
                    <p className="text-[var(--color-primary)] font-medium mb-2">
                      {baseName}
                    </p>

                    <p className="text-theme-secondary text-sm mb-3">
                      Cet exercice a des caractéristiques différentes de celles
                      enregistrées. Voulez-vous créer une nouvelle variante ?
                    </p>

                    {/* Show differences */}
                    {unmatched.differences.length > 0 && (
                      <div className="mb-4 bg-theme rounded-lg p-3 max-h-32 overflow-y-auto">
                        <p className="text-theme-muted text-xs uppercase tracking-wider mb-2">
                          Différences
                        </p>
                        <div className="space-y-1">
                          {unmatched.differences.map((diff, i) => (
                            <div
                              key={i}
                              className="text-xs flex items-center gap-2"
                            >
                              <span className="text-theme-muted">
                                {diff.field}:
                              </span>
                              <span className="text-theme-muted">
                                {diff.existingValue}
                              </span>
                              <span className="text-theme-muted">→</span>
                              <span className="text-[var(--color-primary)]">
                                {diff.currentValue}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Variant name input */}
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-theme-secondary mb-1">
                        Nom de la variante
                      </label>
                      <input
                        type="text"
                        value={variantNames.get(currentUnmatchedIndex) || ""}
                        onChange={(e) =>
                          handleVariantNameChange(e.target.value)
                        }
                        placeholder="Ma variante"
                        className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme placeholder:text-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
                        autoFocus
                      />
                      <p className="text-theme-muted text-xs mt-1">
                        Sera enregistré comme : {baseName} ::{" "}
                        {variantNames.get(currentUnmatchedIndex) ||
                          "Ma variante"}
                      </p>
                    </div>
                  </>
                );
              })()}

              <div className="flex justify-end gap-2">
                <button
                  onClick={handleCancelSaveFlow}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme-secondary text-theme-secondary"
                >
                  Annuler
                </button>
                <button
                  onClick={handleCreateVariant}
                  className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white"
                >
                  Créer la variante
                </button>
              </div>
            </div>
          </div>
        )}

      {/* NEW: Date Confirmation Popup - Creating new variant */}
      {showDateConfirmation && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme">
            <h3 className="text-theme font-medium mb-2">
              Créer une nouvelle variante
            </h3>

            <p className="text-theme-secondary text-sm mb-4">
              Les dates sont différentes de la séance actuelle. Une nouvelle
              variante sera créée.
            </p>

            <div className="mb-4 bg-theme rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-theme-muted">Date de début:</span>
                <span className="text-theme">
                  {startDate ? formatDate(startDate) : "Non définie"}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-theme-muted">Date de fin:</span>
                <span className="text-theme">
                  {endDate ? formatDate(endDate) : "Non définie"}
                </span>
              </div>
            </div>

            {isCommon && (
              <p className="text-[var(--color-warning)] text-xs mb-4">
                Note: Cette séance est commune. Une nouvelle variante sera
                créée.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelSaveFlow}
                className="px-3 py-1.5 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme-secondary text-theme-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmDates}
                className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white"
              >
                Créer la variante
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Update Confirmation Popup - Updating existing session */}
      {showUpdateConfirmation && existingSessionToUpdate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme">
            <h3 className="text-theme font-medium mb-2">
              Mettre à jour la séance
            </h3>

            <p className="text-theme-secondary text-sm mb-4">
              Voulez-vous mettre à jour la séance{" "}
              <span className="text-[var(--color-primary)] font-medium">
                {seanceType}
              </span>{" "}
              du{" "}
              <span className="text-theme font-medium">
                {existingSessionToUpdate.startDate
                  ? formatDate(existingSessionToUpdate.startDate)
                  : "sans date"}
              </span>{" "}
              au{" "}
              <span className="text-theme font-medium">
                {existingSessionToUpdate.endDate
                  ? formatDate(existingSessionToUpdate.endDate)
                  : "sans date"}
              </span>{" "}
              qui existe déjà ?
            </p>

            <div className="mb-4 bg-theme rounded-lg p-3">
              <p className="text-theme-muted text-xs uppercase tracking-wider mb-2">
                Modifications
              </p>
              <div className="text-sm text-theme-secondary">
                {sessionExercises.length} exercice
                {sessionExercises.length > 1 ? "s" : ""} dans cette séance
              </div>
            </div>

            {isCommon && (
              <p className="text-[var(--color-warning)] text-xs mb-4">
                Note: Cette séance est commune. Une copie personnalisée sera
                créée.
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCancelSaveFlow}
                className="px-3 py-1.5 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme-secondary text-theme-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmUpdate}
                className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white"
              >
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Popover */}
      {showDeletePopover && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme">
            <h3 className="text-theme font-medium mb-2">
              Supprimer la variante
            </h3>
            <p className="text-theme-secondary text-sm mb-4">
              Êtes-vous sûr de vouloir supprimer cette variante de "
              {sessionName}" ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDeletePopover(false)}
                className="px-3 py-1.5 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme-secondary text-theme-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--color-danger)] hover:opacity-90 text-white"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Duplicate Popover */}
      {showDuplicatePopover && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme">
            <h3 className="text-theme font-medium mb-2">
              Dupliquer la variante
            </h3>
            <p className="text-theme-secondary text-sm mb-4">
              Voulez-vous créer une copie de cette variante de "{sessionName}" ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowDuplicatePopover(false)}
                className="px-3 py-1.5 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme-secondary text-theme-secondary"
              >
                Annuler
              </button>
              <button
                onClick={handleDuplicateConfirm}
                className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white"
              >
                Dupliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme">
            <h3 className="text-theme font-medium mb-2">
              Annuler les modifications
            </h3>
            <p className="text-theme-secondary text-sm mb-4">
              Vous avez des modifications non enregistrées. Voulez-vous les
              annuler ?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-3 py-1.5 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme-secondary text-theme-secondary"
              >
                Continuer l'édition
              </button>
              <button
                onClick={handleCancelConfirm}
                className="px-3 py-1.5 rounded text-sm font-medium bg-[var(--color-danger)] hover:opacity-90 text-white"
              >
                Annuler les modifications
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SessionsList({
  sessions,
  exercises,
  coachId,
  onRefresh,
  onExercisesRefresh,
  isCreatingNew = false,
  onCreateNewClose,
  selectedItemId,
  onItemSelectionHandled,
}: SessionsListProps) {
  const [selectedSessionName, setSelectedSessionName] = useState<string | null>(
    null,
  );
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [duplicatingSession, setDuplicatingSession] =
    useState<SessionTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingSession, setEditingSession] = useState<SessionTemplate | null>(
    null,
  );
  const [localExercises, setLocalExercises] = useState<Exercise[]>(exercises);

  // Update local exercises when prop changes
  useEffect(() => {
    setLocalExercises(exercises);
  }, [exercises]);

  // Group sessions by normalized name (case-insensitive, accent-insensitive)
  const sessionsByName = useMemo(() => {
    const groups: Record<
      string,
      { displayName: string; variants: SessionTemplate[] }
    > = {};

    sessions.forEach((session) => {
      const normalizedName = normalizeString(session.seanceType);

      if (!groups[normalizedName]) {
        groups[normalizedName] = {
          displayName: session.seanceType,
          variants: [],
        };
      }
      groups[normalizedName].variants.push(session);
    });

    // Sort variants within each group by date (newest first)
    Object.values(groups).forEach((group) => {
      group.variants.sort((a, b) => {
        const aKey = `${a.startDate || ""}`;
        const bKey = `${b.startDate || ""}`;
        return bKey.localeCompare(aKey);
      });
    });

    return groups;
  }, [sessions]);

  // Get sorted session names (alphabetically, accent-insensitive)
  const sortedSessionNames = useMemo(() => {
    return Object.entries(sessionsByName)
      .sort(([, a], [, b]) =>
        normalizeString(a.displayName).localeCompare(
          normalizeString(b.displayName),
        ),
      )
      .map(([normalizedName]) => normalizedName);
  }, [sessionsByName]);

  // Auto-select first item if none selected
  useEffect(() => {
    if (
      !selectedSessionName &&
      sortedSessionNames.length > 0 &&
      !isCreatingNew &&
      !isDuplicating &&
      !isEditing
    ) {
      setSelectedSessionName(sortedSessionNames[0]);
    }
  }, [sortedSessionNames, selectedSessionName, isCreatingNew, isDuplicating]);

  // Auto-select based on prop
  useEffect(() => {
    if (selectedItemId && onItemSelectionHandled) {
      const foundSession = sessions.find((s) => s.id === selectedItemId);
      if (foundSession) {
        const normalizedName = normalizeString(foundSession.seanceType);
        setSelectedSessionName(normalizedName);
      }
      onItemSelectionHandled();
    }
  }, [selectedItemId, sessions, onItemSelectionHandled]);

  // Get variants for selected session
  const selectedVariants = useMemo(() => {
    if (!selectedSessionName || !sessionsByName[selectedSessionName]) return [];
    return sessionsByName[selectedSessionName].variants;
  }, [selectedSessionName, sessionsByName]);

  const selectedDisplayName = selectedSessionName
    ? sessionsByName[selectedSessionName]?.displayName || ""
    : "";

  const isShowingDetail =
    selectedSessionName &&
    selectedVariants.length > 0 &&
    !isCreatingNew &&
    !isDuplicating &&
    !isEditing;

  // Handle duplicate
  const handleDuplicate = (session: SessionTemplate) => {
    setSelectedSessionName(null);
    setDuplicatingSession({ ...session, coachId });
    setIsDuplicating(true);
    setIsEditing(false);
    setEditingSession(null);
    if (onCreateNewClose) {
      onCreateNewClose();
    }
  };

  // Handle edit - show editing panel with current session data
  const handleEdit = (session: SessionTemplate) => {
    setSelectedSessionName(null);
    setEditingSession({ ...session });
    setIsEditing(true);
    setIsDuplicating(false);
    setDuplicatingSession(null);
    if (onCreateNewClose) {
      onCreateNewClose();
    }
  };

  // Handle delete
  const handleDelete = async (session: SessionTemplate) => {
    try {
      await deleteSessionTemplate(session.id, coachId);
      await onRefresh();

      // Check if there are remaining variants
      const remaining = selectedVariants.filter((v) => v.id !== session.id);
      if (remaining.length === 0) {
        setSelectedSessionName(null);
      }
    } catch (error) {
      console.error("Erreur lors de la suppression:", error);
      throw error;
    }
  };

  // Handle save - now handles exercise creation too
  const handleSave = async (
    sessionData: {
      seanceType: string;
      exercises: Array<Omit<SessionExercise, "id"> & { id?: string }>;
      startDate?: string;
      endDate?: string;
      description?: string;
      category?: string;
      validityYear?: number;
      validityMonth?: number;
      validityWeek?: number;
    },
    exercisesToCreate: {
      exercise: Omit<Exercise, "id" | "createdAt" | "updatedAt">;
      sessionExerciseIndex: number;
    }[],
    shouldUpdate: boolean = false,
    existingTemplate?: {
      templateId?: string;
      startDate?: string;
      endDate?: string;
    },
  ) => {
    try {
      // First, create any new exercise variants (or find existing ones with same name)
      const createdExercises: Map<number, Exercise> = new Map();
      let exercisesCreated = false;

      for (const { exercise, sessionExerciseIndex } of exercisesToCreate) {
        // Check if an exercise with this exact name already exists for this coach
        // The uniqueness constraint is on (name, coach_id), so we only check coach's exercises
        const existingExercise = localExercises.find(
          (ex) =>
            ex.name.toLowerCase() === exercise.name?.toLowerCase() &&
            ex.coachId === coachId,
        );

        if (existingExercise) {
          // Use existing exercise instead of creating a duplicate
          createdExercises.set(sessionExerciseIndex, existingExercise);
        } else {
          try {
            // Create new exercise
            const created = await createExerciseForCoach(exercise, coachId);
            createdExercises.set(sessionExerciseIndex, created);
            // Update local exercises to avoid duplicate attempts for same name
            setLocalExercises((prev) => [...prev, created]);
            exercisesCreated = true;
          } catch (err: any) {
            // Handle duplicate key error - exercise might exist but not in our local state
            if (err.code === "23505" && exercise.name) {
              // Fetch the existing exercise from the database
              const existingInDb = await fetchExerciseByName(
                exercise.name,
                coachId,
              );
              if (existingInDb) {
                createdExercises.set(sessionExerciseIndex, existingInDb);
                setLocalExercises((prev) => [...prev, existingInDb]);
              } else {
                throw new Error(
                  `L'exercice "${exercise.name}" existe déjà mais n'a pas pu être récupéré.`,
                );
              }
            } else {
              throw err;
            }
          }
        }
      }

      // Refresh exercises list if any were created
      if (exercisesCreated && onExercisesRefresh) {
        await onExercisesRefresh();
      }

      // Update session exercises with new exercise IDs
      const updatedExercises = sessionData.exercises.map((ex, idx) => {
        const createdExercise = createdExercises.get(idx);
        if (createdExercise) {
          return {
            ...ex,
            exerciseId: createdExercise.id,
            exerciseName: createdExercise.name,
          };
        }
        return ex;
      });

      // Prepare exercise data for save
      const exercisesForSave = updatedExercises.map((ex, index) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        position: index,
        targetSets: ex.targetSets,
        targetReps: ex.targetReps,
        tempo: ex.tempo,
        restTimeSec: ex.restTimeSec,
        notes: ex.notes,
        videoUrl: ex.videoUrl,
        executionMode: ex.executionMode,
        executionGroupId: ex.executionGroupId,
        executionGroupPosition: ex.executionGroupPosition,
      }));

      // If updating an existing template, use updateSessionTemplate
      if (shouldUpdate && existingTemplate?.templateId) {
        await updateSessionTemplate(
          existingTemplate.templateId,
          {
            seanceType: sessionData.seanceType,
            description: sessionData.description,
            category: sessionData.category,
            startDate: sessionData.startDate,
            endDate: sessionData.endDate,
          },
          exercisesForSave,
          coachId,
        );
      } else {
        // Create new template
        await createSessionTemplate(
          {
            seanceType: sessionData.seanceType,
            description: sessionData.description,
            category: sessionData.category,
            startDate: sessionData.startDate,
            endDate: sessionData.endDate,
            validityYear: sessionData.validityYear,
            validityMonth: sessionData.validityMonth,
            validityWeek: sessionData.validityWeek,
            coachId,
            exercises: exercisesForSave,
          },
          coachId,
        );
      }

      await onRefresh();
    } catch (error: any) {
      throw error;
    }
  };

  // Handle close detail panel
  const handleCloseDetail = () => {
    if (isCreatingNew && onCreateNewClose) {
      onCreateNewClose();
    } else if (isDuplicating) {
      setIsDuplicating(false);
      setDuplicatingSession(null);
    } else if (isEditing && editingSession) {
      // Return to visualization of the session
      const normalizedName = normalizeString(editingSession.seanceType);
      setSelectedSessionName(normalizedName);
      setIsEditing(false);
      setEditingSession(null);
    } else {
      setSelectedSessionName(null);
    }
  };

  // Handle session created
  const handleSessionCreated = (seanceType: string) => {
    if (onCreateNewClose) {
      onCreateNewClose();
    }
    setIsDuplicating(false);
    setDuplicatingSession(null);
    setIsEditing(false);
    setEditingSession(null);
    const normalizedName = normalizeString(seanceType);
    setSelectedSessionName(normalizedName);
  };

  const showDetailPanel =
    isShowingDetail || isCreatingNew || isDuplicating || isEditing;

  return (
    <div className="flex gap-4 h-full p-4 min-h-0 overflow-hidden">
      {/* ========== ZONE LISTE - Bordure visible ========== */}
      <div
        className={`${showDetailPanel ? "w-1/3" : "w-full"} bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden`}
      >
        <div className="flex-1 h-0 custom-scrollbar">
          {sortedSessionNames.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-theme-muted">
              <Calendar className="w-8 h-8 mb-2 opacity-50" />
              <p>Aucune séance trouvée</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {sortedSessionNames.map((normalizedName) => {
                const group = sessionsByName[normalizedName];
                const isSelected =
                  selectedSessionName === normalizedName &&
                  !isCreatingNew &&
                  !isDuplicating &&
                  !isEditing;

                return (
                  <div
                    key={normalizedName}
                    onClick={() => {
                      if (isCreatingNew && onCreateNewClose) {
                        onCreateNewClose();
                      }
                      setIsDuplicating(false);
                      setDuplicatingSession(null);
                      setIsEditing(false);
                      setEditingSession(null);
                      setSelectedSessionName(normalizedName);
                    }}
                    className={`p-4 cursor-pointer rounded-xl transition-all duration-200 ${
                      isSelected
                        ? "bg-blue-600/20 border-2 border-blue-500"
                        : "bg-theme-secondary/50 border border-theme hover:bg-theme-secondary hover:border-theme"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Calendar className="w-4 h-4 text-theme-muted flex-shrink-0" />
                        <h3 className="text-theme font-medium truncate">
                          {group.displayName}
                          <span className="ml-2 text-theme-muted text-xs font-normal">
                            ({group.variants.length})
                          </span>
                        </h3>
                      </div>
                      <ChevronRight className="w-4 h-4 text-theme-muted flex-shrink-0" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========== ZONE VISUALISATION - Bordure visible ========== */}
      {isShowingDetail && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          <SessionDetailPanel
            sessionName={selectedDisplayName}
            variants={selectedVariants}
            exercises={localExercises}
            coachId={coachId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onSave={handleSave}
            onClose={handleCloseDetail}
            onEdit={handleEdit}
          />
        </div>
      )}

      {/* ========== ZONE VISUALISATION (New) - Bordure visible ========== */}
      {isCreatingNew && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          <SessionDetailPanel
            sessionName=""
            variants={[]}
            exercises={localExercises}
            coachId={coachId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onSave={handleSave}
            onClose={handleCloseDetail}
            isNewSession={true}
            onSessionCreated={handleSessionCreated}
          />
        </div>
      )}

      {/* ========== ZONE VISUALISATION (Duplicate) - Bordure visible ========== */}
      {isDuplicating && duplicatingSession && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          <SessionDetailPanel
            sessionName={duplicatingSession.seanceType}
            variants={[]}
            exercises={localExercises}
            coachId={coachId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onSave={handleSave}
            onClose={handleCloseDetail}
            isDuplicating={true}
            duplicatingSession={duplicatingSession}
            onSessionCreated={handleSessionCreated}
          />
        </div>
      )}

      {/* ========== ZONE VISUALISATION (Edit) - Bordure visible ========== */}
      {isEditing && editingSession && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          <SessionDetailPanel
            sessionName={editingSession.seanceType}
            variants={[]}
            exercises={localExercises}
            coachId={coachId}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onSave={handleSave}
            onClose={handleCloseDetail}
            isEditing={true}
            editingSession={editingSession}
            onSessionCreated={handleSessionCreated}
          />
        </div>
      )}
    </div>
  );
}
