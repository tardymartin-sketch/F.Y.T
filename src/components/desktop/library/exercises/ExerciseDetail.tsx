import { useState, useEffect, useRef } from 'react';
import { X, Copy, Trash2, Play, Pencil, Check, Search, Plus, Save, Globe, Lock, Edit3 } from 'lucide-react';
import { Exercise, MuscleGroup, MovementPattern, ExerciseCategory, parseExerciseName, buildExerciseName, getExerciseVariantDisplayName, DEFAULT_VARIANT_NAME } from '../../../../../types';

interface ExerciseDetailProps {
  exerciseName: string;
  variants: Exercise[];
  muscleGroups: MuscleGroup[];
  movementPatterns: MovementPattern[];
  exerciseCategories: ExerciseCategory[];
  coachId: string;
  onDuplicate: (exercise: Exercise) => void;
  onDelete: (exercise: Exercise) => Promise<void>;
  onSave: (exercise: Exercise, createNew: boolean) => Promise<void>;
  onClose: () => void;
  onCreateMuscleGroup?: (name: string) => Promise<MuscleGroup>;
  onCreateMovementPattern?: (name: string) => Promise<MovementPattern>;
  isNewExercise?: boolean;
  isDuplicating?: boolean;
  duplicatingExercise?: Exercise;
  isEditing?: boolean;
  editingExercise?: Exercise;
  onEdit?: (exercise: Exercise) => void;
  onExerciseCreated?: (name: string) => void;
  allExerciseNames?: string[];
}

// Generate unique copy name based on existing exercises (using :: separator)
function generateUniqueCopyName(baseName: string, existingNames: string[]): string {
  // Get clean base name (without variant suffix)
  const { baseName: cleanBase } = parseExerciseName(baseName);
  const normalizedBase = cleanBase.toLowerCase().trim();

  // Pattern for variant names like "copie", "copie 2", etc.
  const copyVariantPattern = /^copie(?:\s+(\d+))?$/i;

  // Find the highest copy number for this base name
  let maxCopy = 0;
  existingNames.forEach(name => {
    const { baseName: exBase, variantName } = parseExerciseName(name);
    if (exBase.toLowerCase().trim() === normalizedBase && variantName) {
      const match = variantName.match(copyVariantPattern);
      if (match) {
        const num = match[1] ? parseInt(match[1]) : 1;
        maxCopy = Math.max(maxCopy, num);
      }
    }
  });

  // Generate the next name using :: separator
  if (maxCopy === 0) {
    return buildExerciseName(cleanBase, 'copie');
  }
  return buildExerciseName(cleanBase, `copie ${maxCopy + 1}`);
}

// Handle horizontal scroll on mouse wheel for variant tabs
function handleWheelScroll(e: React.WheelEvent<HTMLDivElement>) {
  if (e.deltaY !== 0) {
    e.currentTarget.scrollLeft += e.deltaY;
    e.preventDefault();
  }
}

// Change item interface for displaying modifications
interface ChangeItem {
  field: string;
  oldValue: string;
  newValue: string;
}

// Popover component
function Popover({
  isOpen,
  onClose,
  title,
  message,
  actions,
  changes
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  actions: { label: string; onClick: () => void; variant?: 'primary' | 'secondary' | 'danger' }[];
  changes?: ChangeItem[];
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme">
        <h3 className="text-theme font-medium mb-2">{title}</h3>
        <p className="text-theme-secondary text-sm mb-4">{message}</p>

        {/* Display changes if any */}
        {changes && changes.length > 0 && (
          <div className="mb-4 bg-theme rounded-lg p-3 max-h-48 overflow-y-auto">
            <p className="text-theme-muted text-xs uppercase tracking-wider mb-2">Modifications</p>
            <div className="space-y-2">
              {changes.map((change, i) => (
                <div key={i} className="text-sm">
                  <span className="text-theme-muted">{change.field}:</span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-[var(--color-danger)] line-through">{change.oldValue || '-'}</span>
                    <span className="text-theme-muted">→</span>
                    <span className="text-[var(--color-success)]">{change.newValue || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2">
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={action.onClick}
              className={`px-3 py-1.5 rounded text-sm font-medium ${
                action.variant === 'primary'
                  ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white'
                  : action.variant === 'danger'
                  ? 'bg-[var(--color-danger)] hover:opacity-90 text-white'
                  : 'bg-theme-tertiary hover:bg-theme-secondary text-theme-secondary'
              }`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Searchable select component
function SearchableSelect({
  value,
  options,
  onChange,
  onCreateNew,
  onClose,
  placeholder = 'Rechercher...',
  displayKey = 'nameFr',
}: {
  value: string;
  options: { id: string; [key: string]: string }[];
  onChange: (id: string) => void;
  onCreateNew?: (name: string) => Promise<{ id: string } | void>;
  onClose?: () => void;
  placeholder?: string;
  displayKey?: string;
}) {
  const [isOpen, setIsOpen] = useState(true); // Start open when editing
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = options.filter(opt =>
    opt[displayKey]?.toLowerCase().includes(search.toLowerCase())
  );

  const showCreateOption = search.trim() &&
    !filtered.some(opt => opt[displayKey]?.toLowerCase() === search.toLowerCase()) &&
    onCreateNew;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
        onClose?.();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const selectedOption = options.find(opt => opt.id === value);

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    setSearch('');
  };

  const handleCreateNew = async () => {
    if (!onCreateNew || isCreating) return;
    setIsCreating(true);
    try {
      const result = await onCreateNew(search.trim());
      if (result && result.id) {
        // Select the newly created item
        onChange(result.id);
      }
      setIsOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Erreur lors de la création:', error);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme text-left focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
      >
        {selectedOption ? selectedOption[displayKey] : 'Sélectionner...'}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-theme-secondary border border-theme rounded-lg shadow-xl z-10 max-h-60 overflow-hidden">
          <div className="p-2 border-b border-theme">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-8 pr-3 py-1.5 bg-theme border border-theme rounded text-theme text-sm focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]/50"
                autoFocus
              />
            </div>
          </div>
          <div className="max-h-40 overflow-y-auto">
            {filtered.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleSelect(opt.id)}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-theme-tertiary ${
                  opt.id === value ? 'bg-theme-tertiary text-[var(--color-primary)]' : 'text-theme'
                }`}
              >
                {opt[displayKey]}
              </button>
            ))}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreateNew}
                disabled={isCreating}
                className="w-full px-3 py-2 text-left text-sm text-[var(--color-primary)] hover:bg-theme-tertiary flex items-center gap-2 border-t border-theme disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? 'Création...' : 'Ajouter cette valeur'}
              </button>
            )}
            {filtered.length === 0 && !showCreateOption && (
              <div className="px-3 py-2 text-theme-muted text-sm">
                Aucun résultat
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Video embed player
function VideoPlayer({ url, onClose }: { url: string; onClose: () => void }) {
  // Extract video ID from YouTube URL
  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : null;
  };

  const embedUrl = getYouTubeEmbedUrl(url);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative w-full max-w-4xl mx-4" onClick={e => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-10 right-0 text-white hover:text-theme-muted"
        >
          <X className="w-6 h-6" />
        </button>
        {embedUrl ? (
          <div className="aspect-video">
            <iframe
              src={embedUrl}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="bg-theme-secondary rounded-lg p-8 text-center">
            <p className="text-theme mb-4">Format vidéo non supporté pour l'embed</p>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-primary)] hover:text-[var(--color-primary-light)]"
            >
              Ouvrir dans un nouvel onglet
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

// Editable field component - changes are saved directly when value changes
function EditableField({
  label,
  value,
  onSave,
  type = 'text',
  options,
  onCreateOption,
  displayValue,
  forceEditing = false,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  type?: 'text' | 'select' | 'textarea';
  options?: { id: string; nameFr: string }[];
  onCreateOption?: (name: string) => Promise<{ id: string } | void>;
  displayValue?: string;
  forceEditing?: boolean;
}) {
  const [isEditingLocal, setIsEditingLocal] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // For selects in forceEditing mode, use isSelectOpen to control visibility
  // For other types, use forceEditing or local editing state
  const isEditing = type === 'select' && forceEditing
    ? isSelectOpen
    : (forceEditing || isEditingLocal);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  // For select: save immediately on change
  const handleSelectChange = (newValue: string) => {
    setEditValue(newValue);
    onSave(newValue);
    if (forceEditing) {
      setIsSelectOpen(false);
    } else {
      setIsEditingLocal(false);
    }
  };

  // For text/textarea: save on blur (only exit edit mode if not forced)
  const handleBlur = () => {
    onSave(editValue);
    if (!forceEditing) setIsEditingLocal(false);
  };

  // Handle Enter key for text input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type === 'text') {
      onSave(editValue);
      if (!forceEditing) setIsEditingLocal(false);
    } else if (e.key === 'Escape' && !forceEditing) {
      setEditValue(value);
      setIsEditingLocal(false);
    }
  };

  // Determine if we should show the clickable select display (forceEditing + select + closed)
  const showSelectClickable = type === 'select' && forceEditing && !isSelectOpen;

  return (
    <div className="bg-theme-secondary rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-theme-muted text-xs uppercase tracking-wider">{label}</p>
        {!isEditing && !forceEditing && (
          <button
            onClick={() => setIsEditingLocal(true)}
            className="p-1 text-theme-muted hover:text-theme rounded"
          >
            <Pencil className="w-3 h-3" />
          </button>
        )}
      </div>

      {showSelectClickable ? (
        <button
          onClick={() => setIsSelectOpen(true)}
          className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme text-sm text-left hover:border-[var(--color-primary)] transition-colors cursor-pointer"
        >
          {displayValue || editValue || '-'}
        </button>
      ) : isEditing ? (
        <div>
          {type === 'select' && options ? (
            <SearchableSelect
              value={editValue}
              options={options}
              onChange={handleSelectChange}
              onCreateNew={onCreateOption ? async (name) => {
                const result = await onCreateOption(name);
                if (result && result.id) {
                  handleSelectChange(result.id);
                }
                return result;
              } : undefined}
              onClose={() => {
                if (forceEditing) {
                  setIsSelectOpen(false);
                } else {
                  setIsEditingLocal(false);
                }
              }}
            />
          ) : type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50 resize-none"
              rows={3}
              autoFocus
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleBlur}
              onKeyDown={handleKeyDown}
              className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              autoFocus
            />
          )}
        </div>
      ) : (
        <p className="text-theme">{displayValue || value || '-'}</p>
      )}
    </div>
  );
}

export function ExerciseDetail({
  exerciseName,
  variants,
  muscleGroups,
  movementPatterns,
  exerciseCategories,
  coachId,
  onDuplicate,
  onDelete,
  onSave,
  onClose,
  onCreateMuscleGroup,
  onCreateMovementPattern,
  isNewExercise = false,
  isDuplicating = false,
  duplicatingExercise,
  isEditing = false,
  editingExercise,
  onEdit,
  onExerciseCreated,
  allExerciseNames = [],
}: ExerciseDetailProps) {
  // Sort variants by creation date (newest first)
  const sortedVariants = [...variants].sort((a, b) => {
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [editedExercise, setEditedExercise] = useState<Exercise | null>(null);
  const [originalExercise, setOriginalExercise] = useState<Exercise | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [editingVideoUrl, setEditingVideoUrl] = useState(false);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [newExerciseName, setNewExerciseName] = useState('');
  const [originalExerciseName, setOriginalExerciseName] = useState('');

  // Cancel confirmation modal
  const [showCancelModal, setShowCancelModal] = useState(false);

  const handleCloseClick = () => {
    if ((isEditing || isNewExercise || isDuplicating) && hasChanges) {
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

  // Popovers
  const [showDeletePopover, setShowDeletePopover] = useState(false);
  const [showDuplicatePopover, setShowDuplicatePopover] = useState(false);
  const [showSavePopover, setShowSavePopover] = useState(false);
  const [deletingExercise, setDeletingExercise] = useState<Exercise | null>(null);
  const [variantToDuplicate, setVariantToDuplicate] = useState<Exercise | null>(null);

  // Variant name editing
  const [editingVariantNameIndex, setEditingVariantNameIndex] = useState<number | null>(null);
  const [variantNameInput, setVariantNameInput] = useState('');

  const currentExercise = sortedVariants[activeTabIndex];
  const isCommon = !currentExercise?.coachId;
  const isMine = currentExercise?.coachId === coachId;

  // Create empty exercise template for new exercise
  const emptyExercise: Exercise = {
    id: '',
    name: '',
    coachId: coachId,
    createdAt: '',
    updatedAt: '',
  };

  // Reset when variants change
  useEffect(() => {
    setActiveTabIndex(0);
    setEditedExercise(null);
    setHasChanges(false);
  }, [exerciseName]);

  // Initialize edited exercise and store original for comparison
  useEffect(() => {
    if (isDuplicating && duplicatingExercise) {
      setEditedExercise({ ...duplicatingExercise });
      setOriginalExercise({ ...duplicatingExercise });
      setVideoUrlInput(duplicatingExercise.videoUrl || '');
      setNewExerciseName(duplicatingExercise.name);
      setOriginalExerciseName(duplicatingExercise.name);
      setHasChanges(true); // Pre-mark as having changes since we want to save
    } else if (isEditing && editingExercise) {
      setEditedExercise({ ...editingExercise });
      setOriginalExercise({ ...editingExercise });
      setVideoUrlInput(editingExercise.videoUrl || '');
      setNewExerciseName(editingExercise.name);
      setOriginalExerciseName(editingExercise.name);
      setHasChanges(false);
    } else if (isNewExercise) {
      setEditedExercise({ ...emptyExercise });
      setOriginalExercise({ ...emptyExercise });
      setVideoUrlInput('');
      setNewExerciseName('');
      setOriginalExerciseName('');
      setHasChanges(false);
    } else if (currentExercise) {
      setEditedExercise({ ...currentExercise });
      setOriginalExercise({ ...currentExercise });
      setVideoUrlInput(currentExercise.videoUrl || '');
    }
  }, [isNewExercise, isDuplicating, duplicatingExercise?.id, isEditing, editingExercise?.id, activeTabIndex, currentExercise?.id]);

  const handleFieldChange = (field: keyof Exercise, value: string | undefined) => {
    if (!editedExercise) return;
    setEditedExercise({ ...editedExercise, [field]: value });
    setHasChanges(true);
  };

  const handleVideoUrlSave = () => {
    handleFieldChange('videoUrl', videoUrlInput || undefined);
    setEditingVideoUrl(false);
  };

  const getCategoryName = (id?: string) => {
    if (!id) return '-';
    return exerciseCategories.find(cat => cat.id === id)?.name || '-';
  };

  const getMuscleGroupName = (id?: string) => {
    if (!id) return '-';
    return muscleGroups.find(mg => mg.id === id)?.nameFr || '-';
  };

  const getMovementPatternName = (id?: string) => {
    if (!id) return '-';
    return movementPatterns.find(mp => mp.id === id)?.nameFr || '-';
  };

  const getLimbTypeLabel = (type?: string) => {
    switch (type) {
      case 'bilateral': return 'Bilatéral';
      case 'unilateral': return 'Unilatéral';
      case 'asymmetrical': return 'Asymétrique';
      default: return '-';
    }
  };

  const limbTypeOptions = [
    { id: 'bilateral', nameFr: 'Bilatéral' },
    { id: 'unilateral', nameFr: 'Unilatéral' },
    { id: 'asymmetrical', nameFr: 'Asymétrique' },
  ];

  // Calculate changes between original and edited exercise
  const calculateChanges = (): ChangeItem[] => {
    if (!editedExercise || !originalExercise) return [];

    const changes: ChangeItem[] = [];

    // Check name change (for duplication)
    if ((isDuplicating || isNewExercise) && newExerciseName !== originalExerciseName) {
      changes.push({
        field: 'Nom',
        oldValue: originalExerciseName || '',
        newValue: newExerciseName,
      });
    }

    // Check category
    if (editedExercise.categoryId !== originalExercise.categoryId) {
      changes.push({
        field: 'Catégorie',
        oldValue: getCategoryName(originalExercise.categoryId),
        newValue: getCategoryName(editedExercise.categoryId),
      });
    }

    // Check muscle group
    if (editedExercise.primaryMuscleGroupId !== originalExercise.primaryMuscleGroupId) {
      changes.push({
        field: 'Groupe musculaire',
        oldValue: getMuscleGroupName(originalExercise.primaryMuscleGroupId),
        newValue: getMuscleGroupName(editedExercise.primaryMuscleGroupId),
      });
    }

    // Check movement pattern
    if (editedExercise.movementPatternId !== originalExercise.movementPatternId) {
      changes.push({
        field: 'Pattern',
        oldValue: getMovementPatternName(originalExercise.movementPatternId),
        newValue: getMovementPatternName(editedExercise.movementPatternId),
      });
    }

    // Check limb type
    if (editedExercise.limbType !== originalExercise.limbType) {
      changes.push({
        field: 'Type',
        oldValue: getLimbTypeLabel(originalExercise.limbType),
        newValue: getLimbTypeLabel(editedExercise.limbType),
      });
    }

    // Check tempo
    if (editedExercise.tempo !== originalExercise.tempo) {
      changes.push({
        field: 'Tempo',
        oldValue: originalExercise.tempo || '',
        newValue: editedExercise.tempo || '',
      });
    }

    // Check video URL
    if (editedExercise.videoUrl !== originalExercise.videoUrl) {
      changes.push({
        field: 'Vidéo',
        oldValue: originalExercise.videoUrl || '',
        newValue: editedExercise.videoUrl || '',
      });
    }

    // Check coach instructions
    if (editedExercise.coachInstructions !== originalExercise.coachInstructions) {
      changes.push({
        field: 'Consignes',
        oldValue: originalExercise.coachInstructions?.substring(0, 50) + (originalExercise.coachInstructions && originalExercise.coachInstructions.length > 50 ? '...' : '') || '',
        newValue: editedExercise.coachInstructions?.substring(0, 50) + (editedExercise.coachInstructions && editedExercise.coachInstructions.length > 50 ? '...' : '') || '',
      });
    }

    return changes;
  };

  // Compute the name that will be used if creating a new variant
  const proposedCopyName = editedExercise
    ? generateUniqueCopyName(editedExercise.name, allExerciseNames)
    : '';

  const handleSaveClick = () => {
    setShowSavePopover(true);
  };

  const handleSaveConfirm = async (createNew: boolean) => {
    if (!editedExercise) return;

    try {
      // For new exercise or duplication, set the name and always create new
      if (isNewExercise || isDuplicating) {
        const exerciseToSave = { ...editedExercise, name: newExerciseName };
        await onSave(exerciseToSave, true);
        // Notify parent of successful creation and close panel
        setShowSavePopover(false);
        setHasChanges(false);
        onExerciseCreated?.(newExerciseName);
        onClose();
      } else if (isEditing) {
        // Editing mode: update the existing exercise with possibly changed name
        const exerciseToSave = { ...editedExercise, name: newExerciseName };
        await onSave(exerciseToSave, false);
        setShowSavePopover(false);
        setHasChanges(false);
        onExerciseCreated?.(newExerciseName);
        onClose();
      } else if (createNew) {
        // Creating a new variant from an existing exercise - generate unique copy name
        const uniqueName = generateUniqueCopyName(editedExercise.name, allExerciseNames);
        const exerciseToSave = { ...editedExercise, name: uniqueName };
        await onSave(exerciseToSave, true);
        setShowSavePopover(false);
        setHasChanges(false);
        onExerciseCreated?.(uniqueName);
      } else {
        // Update existing exercise
        await onSave(editedExercise, false);
        setShowSavePopover(false);
        setHasChanges(false);
      }
    } catch (error) {
      // Keep popover open on error, error is already displayed by handleSave
      setShowSavePopover(false);
    }
  };

  // Track changes for new exercise
  const handleNewExerciseNameChange = (name: string) => {
    setNewExerciseName(name);
    setHasChanges(true);
  };

  // Handle variant name editing
  const handleStartEditVariantName = (index: number) => {
    const variant = sortedVariants[index];
    const { variantName } = parseExerciseName(variant.name);
    setVariantNameInput(variantName || DEFAULT_VARIANT_NAME);
    setEditingVariantNameIndex(index);
  };

  const handleSaveVariantName = async () => {
    if (editingVariantNameIndex === null) return;
    const variant = sortedVariants[editingVariantNameIndex];
    if (!variant || variant.coachId !== coachId) return; // Can only edit own variants

    const { baseName } = parseExerciseName(variant.name);
    const newFullName = buildExerciseName(baseName, variantNameInput.trim() || undefined);

    if (newFullName !== variant.name) {
      const updatedExercise = { ...variant, name: newFullName };
      await onSave(updatedExercise, false);
    }

    setEditingVariantNameIndex(null);
    setVariantNameInput('');
  };

  const handleCancelEditVariantName = () => {
    setEditingVariantNameIndex(null);
    setVariantNameInput('');
  };

  const handleDeleteClick = (exercise: Exercise) => {
    setDeletingExercise(exercise);
    setShowDeletePopover(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingExercise) return;
    await onDelete(deletingExercise);
    setShowDeletePopover(false);
    setDeletingExercise(null);
  };

  const handleDuplicateClick = (exercise: Exercise) => {
    setVariantToDuplicate(exercise);
    setShowDuplicatePopover(true);
  };

  const handleDuplicateConfirm = () => {
    if (!variantToDuplicate) return;
    onDuplicate(variantToDuplicate);
    setShowDuplicatePopover(false);
    setVariantToDuplicate(null);
  };

  // Early return if editedExercise is not ready
  if (!editedExercise) {
    return (
      <div className="h-full flex items-center justify-center text-theme-muted">
        {(isNewExercise || isDuplicating || isEditing) ? 'Chargement...' : 'Aucune variante disponible'}
      </div>
    );
  }

  // For existing exercises (not new, not duplicating, not editing), also check for currentExercise
  if (!isNewExercise && !isDuplicating && !isEditing && !currentExercise) {
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
          {(isNewExercise || isDuplicating) ? (
            <input
              type="text"
              value={newExerciseName}
              onChange={(e) => handleNewExerciseNameChange(e.target.value)}
              placeholder={isDuplicating ? "Nom de la copie" : "Nom de l'exercice"}
              className="text-lg font-semibold text-theme px-2 bg-transparent border-b border-theme focus:border-[var(--color-primary)] focus:outline-none flex-1"
              autoFocus
            />
          ) : (
            <h2 className="text-lg font-semibold text-theme px-2">{isEditing ? newExerciseName : exerciseName}</h2>
          )}
          <div className="flex items-center gap-2">
            {(hasChanges || (isNewExercise && newExerciseName.trim()) || (isDuplicating && newExerciseName.trim()) || (isEditing && newExerciseName.trim())) && (
              <button
                onClick={handleSaveClick}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white rounded-lg text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                {isDuplicating ? 'Dupliquer' : isNewExercise ? 'Créer' : isEditing ? 'Enregistrer' : 'Sauvegarder'}
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

        {/* Variant tabs - only for existing exercises (not when creating new, duplicating, or editing) */}
        {!isNewExercise && !isDuplicating && !isEditing && (
          <div
            className="flex overflow-x-auto scrollbar-thin scrollbar-thumb-theme-muted scrollbar-track-transparent"
            onWheel={handleWheelScroll}
          >
            {sortedVariants.map((variant, index) => {
              const variantIsCommon = !variant.coachId;
              const variantIsMine = variant.coachId === coachId;
              const displayName = getExerciseVariantDisplayName(variant, variantIsMine);
              const isEditingThisVariant = editingVariantNameIndex === index;

              return (
                <div
                  key={variant.id}
                  className={`flex items-center gap-2 px-4 py-2 border-r border-theme/50 cursor-pointer whitespace-nowrap ${
                    index === activeTabIndex
                      ? 'bg-theme-secondary text-theme'
                      : 'text-theme-muted hover:bg-theme-tertiary hover:text-theme'
                  }`}
                  onClick={() => !isEditingThisVariant && setActiveTabIndex(index)}
                >
                  {variantIsCommon ? (
                    <Globe className="w-3 h-3 text-[var(--color-primary)] flex-shrink-0" />
                  ) : (
                    <Lock className="w-3 h-3 text-[var(--color-accent)] flex-shrink-0" />
                  )}

                  {/* Variant name - editable for own variants */}
                  {isEditingThisVariant ? (
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={variantNameInput}
                        onChange={(e) => setVariantNameInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveVariantName();
                          if (e.key === 'Escape') handleCancelEditVariantName();
                        }}
                        className="w-24 px-1 py-0.5 bg-theme border border-theme rounded text-sm text-theme focus:outline-none focus:border-[var(--color-primary)]"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveVariantName}
                        className="p-0.5 text-[var(--color-primary)] hover:text-[var(--color-primary-light)] rounded"
                        title="Valider"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={handleCancelEditVariantName}
                        className="p-0.5 text-theme-muted hover:text-theme rounded"
                        title="Annuler"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm truncate max-w-32">
                      {displayName}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Save button moved to header */}

      {/* ========== Contenu scrollable ========== */}
      <div className="flex-1 h-0 custom-scrollbar p-4 space-y-4">
        {/* Action buttons - Replace badges */}
        {!isNewExercise && !isDuplicating && !isEditing && currentExercise && (
          <div className="flex gap-2">
            <button
              onClick={() => onEdit?.(currentExercise)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-theme-tertiary text-theme rounded-lg text-sm transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Modifier
            </button>
            <button
              onClick={() => handleDuplicateClick(currentExercise)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-theme-tertiary text-theme rounded-lg text-sm transition-colors"
            >
              <Copy className="w-4 h-4" />
              Dupliquer
            </button>
            {isMine && (
              <button
                onClick={() => handleDeleteClick(currentExercise)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-[var(--color-danger)]/10 text-theme hover:text-[var(--color-danger)] rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            )}
          </div>
        )}

        {/* Details Grid - Order: Catégorie, Groupe musculaire, Pattern, Type, Tempo */}
        <div className="grid grid-cols-2 gap-4">
          <EditableField
            label="Catégorie"
            value={editedExercise.categoryId || ''}
            displayValue={getCategoryName(editedExercise.categoryId)}
            onSave={(val) => handleFieldChange('categoryId', val || undefined)}
            type="select"
            options={exerciseCategories.map(cat => ({ id: cat.id, nameFr: cat.name }))}
            forceEditing={isEditing}
          />
          <EditableField
            label="Groupe musculaire"
            value={editedExercise.primaryMuscleGroupId || ''}
            displayValue={getMuscleGroupName(editedExercise.primaryMuscleGroupId)}
            onSave={(val) => handleFieldChange('primaryMuscleGroupId', val || undefined)}
            type="select"
            options={muscleGroups}
            onCreateOption={onCreateMuscleGroup ? (name) => onCreateMuscleGroup(name) : undefined}
            forceEditing={isEditing}
          />
          <EditableField
            label="Pattern"
            value={editedExercise.movementPatternId || ''}
            displayValue={getMovementPatternName(editedExercise.movementPatternId)}
            onSave={(val) => handleFieldChange('movementPatternId', val || undefined)}
            type="select"
            options={movementPatterns}
            onCreateOption={onCreateMovementPattern ? (name) => onCreateMovementPattern(name) : undefined}
            forceEditing={isEditing}
          />
          <EditableField
            label="Type"
            value={editedExercise.limbType || ''}
            displayValue={getLimbTypeLabel(editedExercise.limbType)}
            onSave={(val) => handleFieldChange('limbType', val as Exercise['limbType'])}
            type="select"
            options={limbTypeOptions}
            forceEditing={isEditing}
          />
          <div className="col-span-2">
            <EditableField
              label="Tempo"
              value={editedExercise.tempo || ''}
              onSave={(val) => handleFieldChange('tempo', val || undefined)}
              forceEditing={isEditing}
            />
          </div>
        </div>

        {/* Video Section */}
        <div className="bg-theme-secondary rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-theme-muted text-xs uppercase tracking-wider">Vidéo</p>
            {!isEditing && !editingVideoUrl && (
              <button
                onClick={() => setEditingVideoUrl(true)}
                className="p-1 text-theme-muted hover:text-theme rounded"
              >
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </div>

          {(editingVideoUrl || isEditing) ? (
            <div className="space-y-2">
              <input
                type="url"
                value={videoUrlInput}
                onChange={(e) => {
                  setVideoUrlInput(e.target.value);
                  if (isEditing) {
                    handleFieldChange('videoUrl', e.target.value || undefined);
                  }
                }}
                onBlur={() => {
                  if (isEditing) {
                    handleFieldChange('videoUrl', videoUrlInput || undefined);
                  }
                }}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-3 py-2 bg-theme border border-theme rounded-lg text-theme text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
                autoFocus={editingVideoUrl && !isEditing}
              />
              {!isEditing && (
                <div className="flex gap-2">
                  <button
                    onClick={handleVideoUrlSave}
                    className="px-2 py-1 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white text-xs rounded flex items-center gap-1"
                  >
                    <Check className="w-3 h-3" />
                    OK
                  </button>
                  <button
                    onClick={() => {
                      setVideoUrlInput(editedExercise.videoUrl || '');
                      setEditingVideoUrl(false);
                    }}
                    className="px-2 py-1 bg-theme-tertiary hover:bg-theme-secondary text-theme text-xs rounded"
                  >
                    Annuler
                  </button>
                </div>
              )}
            </div>
          ) : editedExercise.videoUrl ? (
            <button
              onClick={() => setShowVideoPlayer(true)}
              className="flex items-center gap-2 text-[var(--color-primary)] hover:text-[var(--color-primary-light)] text-sm"
            >
              <Play className="w-4 h-4" />
              Voir la vidéo
            </button>
          ) : (
            <p className="text-theme-muted text-sm">Aucune vidéo</p>
          )}
        </div>

        {/* Instructions */}
        <EditableField
          label="Consignes"
          value={editedExercise.coachInstructions || ''}
          onSave={(val) => handleFieldChange('coachInstructions', val || undefined)}
          type="textarea"
          forceEditing={isEditing}
        />
      </div>

      {/* Video Player Modal */}
      {showVideoPlayer && editedExercise.videoUrl && (
        <VideoPlayer
          url={editedExercise.videoUrl}
          onClose={() => setShowVideoPlayer(false)}
        />
      )}

      {/* Delete Popover */}
      <Popover
        isOpen={showDeletePopover}
        onClose={() => setShowDeletePopover(false)}
        title="Supprimer la variante"
        message={`Êtes-vous sûr de vouloir supprimer cette variante de "${exerciseName}" ?`}
        actions={[
          { label: 'Annuler', onClick: () => setShowDeletePopover(false) },
          { label: 'Supprimer', onClick: handleDeleteConfirm, variant: 'danger' },
        ]}
      />

      {/* Duplicate Popover */}
      <Popover
        isOpen={showDuplicatePopover}
        onClose={() => setShowDuplicatePopover(false)}
        title="Dupliquer la variante"
        message={`Voulez-vous créer une copie de cette variante de "${exerciseName}" ?`}
        actions={[
          { label: 'Annuler', onClick: () => setShowDuplicatePopover(false) },
          { label: 'Dupliquer', onClick: handleDuplicateConfirm, variant: 'primary' },
        ]}
      />

      {/* Save Popover */}
      <Popover
        isOpen={showSavePopover}
        onClose={() => setShowSavePopover(false)}
        title={
          isDuplicating
            ? "Dupliquer l'exercice"
            : isNewExercise
            ? "Créer un nouvel exercice"
            : isEditing
            ? "Enregistrer les modifications"
            : isCommon
            ? "Exercice commun"
            : "Sauvegarder les modifications"
        }
        message={
          isDuplicating
            ? `Voulez-vous créer une copie de l'exercice sous le nom "${newExerciseName}" ?`
            : isNewExercise
            ? `Voulez-vous créer l'exercice "${newExerciseName}" ?`
            : isEditing
            ? `Voulez-vous enregistrer les modifications de l'exercice "${newExerciseName}" ?`
            : isCommon
            ? `L'exercice est commun à tous les coachs, la modification va créer une nouvelle variante "${proposedCopyName}".`
            : `Souhaitez-vous mettre à jour la variante existante ou en créer une nouvelle sous le nom "${proposedCopyName}" ?`
        }
        changes={calculateChanges()}
        actions={
          isDuplicating
            ? [
                { label: 'Annuler', onClick: () => setShowSavePopover(false) },
                { label: 'Dupliquer', onClick: () => handleSaveConfirm(true), variant: 'primary' },
              ]
            : isNewExercise
            ? [
                { label: 'Annuler', onClick: () => setShowSavePopover(false) },
                { label: 'Créer', onClick: () => handleSaveConfirm(true), variant: 'primary' },
              ]
            : isEditing
            ? [
                { label: 'Annuler', onClick: () => setShowSavePopover(false) },
                { label: 'Enregistrer', onClick: () => handleSaveConfirm(false), variant: 'primary' },
              ]
            : isCommon
            ? [
                { label: 'Annuler', onClick: () => setShowSavePopover(false) },
                { label: 'Accepter', onClick: () => handleSaveConfirm(true), variant: 'primary' },
              ]
            : [
                { label: 'Annuler', onClick: () => setShowSavePopover(false) },
                { label: 'Créer une nouvelle', onClick: () => handleSaveConfirm(true) },
                { label: 'Mettre à jour', onClick: () => handleSaveConfirm(false), variant: 'primary' },
              ]
        }
      />

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowCancelModal(false)}>
          <div className="bg-theme-secondary rounded-lg p-6 max-w-sm w-full mx-4 border border-theme" onClick={e => e.stopPropagation()}>
            <h3 className="text-theme font-semibold text-lg mb-2">Annuler les modifications ?</h3>
            <p className="text-theme-muted text-sm mb-4">
              Les modifications non enregistrées seront perdues.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-theme-tertiary hover:bg-theme-secondary text-theme"
              >
                Continuer l'édition
              </button>
              <button
                onClick={handleCancelConfirm}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-danger)] hover:bg-[var(--color-danger)]/80 text-white"
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
