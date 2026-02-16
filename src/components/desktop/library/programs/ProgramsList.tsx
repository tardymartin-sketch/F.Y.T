import { useState, useMemo, useEffect } from 'react';
import { ChevronRight, Users, Calendar, Trash2, FolderKanban, Plus, X, Check, ChevronDown, ChevronUp, AlertCircle, Copy, Edit3, Dumbbell, Link2 } from 'lucide-react';
import { Program, SessionTemplate, User, AthleteGroupWithCount, SessionExercise, ExecutionMode, EXECUTION_MODES, groupSessionExercises, isSessionExerciseGroup } from '../../../../../types';
import { createProgram, fetchAthleteGroupWithMembers, deleteProgram } from '../../../../services/supabaseService';

interface ProgramsListProps {
  programs: Program[];
  sessions: SessionTemplate[];
  athletes: User[];
  groups: AthleteGroupWithCount[];
  coachId: string;
  onRefresh: () => Promise<void>;
  isCreatingNew?: boolean;
  onCreateNewClose?: () => void;
}

// Normalize string for grouping (case insensitive)
function normalizeString(str: string): string {
  return str.toLowerCase().trim();
}

// Format date for display (DD/MM/YY)
function formatDate(dateStr?: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

// Check if a session's dates overlap with program dates
function sessionMatchesProgramDates(
  session: SessionTemplate,
  programStartDate: string,
  programEndDate: string
): boolean {
  // If program dates are empty, show all sessions
  if (!programStartDate && !programEndDate) {
    return true;
  }

  // If session has no dates, it matches any program dates
  if (!session.startDate && !session.endDate) {
    return true;
  }

  const pStart = programStartDate ? new Date(programStartDate) : null;
  const pEnd = programEndDate ? new Date(programEndDate) : null;
  const sStart = session.startDate ? new Date(session.startDate) : null;
  const sEnd = session.endDate ? new Date(session.endDate) : null;

  // Check for overlap:
  // Session overlaps if: session.start <= program.end AND session.end >= program.start
  if (pStart && sEnd && sEnd < pStart) return false;
  if (pEnd && sStart && sStart > pEnd) return false;

  return true;
}

// Check if session dates are compatible with program dates for saving
function isSessionCompatibleWithProgram(
  session: SessionTemplate,
  programStartDate: string,
  programEndDate: string
): { compatible: boolean; reason?: string } {
  // If session has no dates, it's always compatible
  if (!session.startDate && !session.endDate) {
    return { compatible: true };
  }

  const pStart = programStartDate ? new Date(programStartDate) : null;
  const pEnd = programEndDate ? new Date(programEndDate) : null;
  const sStart = session.startDate ? new Date(session.startDate) : null;
  const sEnd = session.endDate ? new Date(session.endDate) : null;

  // Check if session dates are outside program dates
  if (pStart && sEnd && sEnd < pStart) {
    return {
      compatible: false,
      reason: `La seance "${session.seanceType}" (${formatDate(session.startDate)} - ${formatDate(session.endDate)}) se termine avant le debut du programme (${formatDate(programStartDate)})`
    };
  }

  if (pEnd && sStart && sStart > pEnd) {
    return {
      compatible: false,
      reason: `La seance "${session.seanceType}" (${formatDate(session.startDate)} - ${formatDate(session.endDate)}) commence apres la fin du programme (${formatDate(programEndDate)})`
    };
  }

  return { compatible: true };
}

// Interface for grouped sessions
interface SessionGroup {
  name: string;
  displayName: string;
  variants: SessionTemplate[];
}

// Interface for grouped programs (multiple sessions with same period/athletes)
interface ProgramGroup {
  key: string;
  programName?: string;
  startDate?: string;
  endDate?: string;
  athleteTarget: string[];
  groupTarget?: string[];
  sessions: Program[]; // Each Program represents a session (seanceType) with its exercises
}

export function ProgramsList({
  programs,
  sessions,
  athletes,
  groups,
  coachId,
  onRefresh,
  isCreatingNew = false,
  onCreateNewClose,
}: ProgramsListProps) {
  const [selectedProgramGroup, setSelectedProgramGroup] = useState<ProgramGroup | null>(null);
  const [expandedSessionIndexes, setExpandedSessionIndexes] = useState<Set<number>>(new Set());

  // Creation/Edit form state
  const [programName, setProgramName] = useState('');
  const [selectedSessions, setSelectedSessions] = useState<SessionTemplate[]>([]);
  const [selectionMode, setSelectionMode] = useState<'athletes' | 'groups'>('athletes');
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [validationError, setValidationError] = useState<string | null>(null);

  // Edit/Duplicate mode
  const [isEditing, setIsEditing] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [editingProgram, setEditingProgram] = useState<Program | null>(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [programGroupToDelete, setProgramGroupToDelete] = useState<ProgramGroup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Athletes popover
  const [athletePopoverGroup, setAthletePopoverGroup] = useState<ProgramGroup | null>(null);
  const [expandedPopoverGroups, setExpandedPopoverGroups] = useState<Set<string>>(new Set());

  // Filter sessions that match program dates
  const filteredSessions = useMemo(() => {
    return sessions.filter(session =>
      sessionMatchesProgramDates(session, startDate, endDate)
    );
  }, [sessions, startDate, endDate]);

  // Group filtered sessions by name (case insensitive)
  const sessionGroups = useMemo(() => {
    const groupsMap = new Map<string, SessionGroup>();

    filteredSessions.forEach(session => {
      const normalizedName = normalizeString(session.seanceType);
      const existing = groupsMap.get(normalizedName);

      if (existing) {
        existing.variants.push(session);
      } else {
        groupsMap.set(normalizedName, {
          name: normalizedName,
          displayName: session.seanceType,
          variants: [session],
        });
      }
    });

    // Sort groups alphabetically
    return Array.from(groupsMap.values()).sort((a, b) =>
      a.displayName.localeCompare(b.displayName, 'fr')
    );
  }, [filteredSessions]);

  // Create athlete name map for display
  const athleteNameMap = useMemo(() => {
    const map = new Map<string, string>();
    athletes.forEach(a => {
      const name = a.firstName && a.lastName
        ? `${a.firstName} ${a.lastName}`
        : a.username;
      map.set(a.id, name);
    });
    return map;
  }, [athletes]);

  // Group programs by period + athletes + programName (to show multiple sessions per program)
  const programGroups = useMemo(() => {
    const groupsMap = new Map<string, ProgramGroup>();

    programs.forEach(program => {
      // Create a key based on period + athletes + programName
      const athleteKey = [...program.athleteTarget].sort().join(',');
      const key = `${program.programName || ''}_${program.startDate || ''}_${program.endDate || ''}_${athleteKey}`;

      const existing = groupsMap.get(key);
      if (existing) {
        existing.sessions.push(program);
      } else {
        groupsMap.set(key, {
          key,
          programName: program.programName,
          startDate: program.startDate,
          endDate: program.endDate,
          athleteTarget: program.athleteTarget,
          groupTarget: program.groupTarget,
          sessions: [program],
        });
      }
    });

    // Sort sessions within each group alphabetically by seanceType
    for (const group of groupsMap.values()) {
      group.sessions.sort((a, b) => a.seanceType.localeCompare(b.seanceType, 'fr'));
    }

    // Sort groups by start date (most recent first)
    return Array.from(groupsMap.values()).sort((a, b) => {
      if (!a.startDate && !b.startDate) return 0;
      if (!a.startDate) return 1;
      if (!b.startDate) return -1;
      return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
    });
  }, [programs]);

  // Auto-select first item if none selected
  useEffect(() => {
    if (!selectedProgramGroup && programGroups.length > 0 && !isCreatingNew && !isEditing && !isDuplicating) {
      setSelectedProgramGroup(programGroups[0]);
    }
  }, [programGroups, selectedProgramGroup, isCreatingNew, isEditing, isDuplicating]);

  const getPeriodLabel = (program: Program) => {
    if (program.startDate && program.endDate) {
      return `${formatDate(program.startDate)} - ${formatDate(program.endDate)}`;
    }
    if (program.startDate) {
      return `Depuis ${formatDate(program.startDate)}`;
    }
    if (program.endDate) {
      return `Jusqu'au ${formatDate(program.endDate)}`;
    }
    // Fallback to old format
    const parts = [];
    if (program.year) parts.push(`Annee ${program.year}`);
    if (program.monthNum) parts.push(`Mois ${program.monthNum}`);
    if (program.week) parts.push(`Sem. ${program.week}`);
    return parts.length > 0 ? parts.join(' - ') : 'Sans periode';
  };

  const getAthleteName = (athleteId: string) => {
    return athleteNameMap.get(athleteId) || athleteId.slice(0, 8) + '...';
  };

  const getGroupPeriodLabel = (group: ProgramGroup) => {
    if (group.startDate && group.endDate) {
      return `${formatDate(group.startDate)} - ${formatDate(group.endDate)}`;
    }
    if (group.startDate) {
      return `Depuis ${formatDate(group.startDate)}`;
    }
    if (group.endDate) {
      return `Jusqu'au ${formatDate(group.endDate)}`;
    }
    return 'Sans periode';
  };

  // Toggle session expansion in detail view
  const toggleSessionExpansion = (index: number) => {
    setExpandedSessionIndexes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  // Toggle session group expansion
  const toggleGroupExpansion = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  // Check if a session variant is selected
  const isVariantSelected = (session: SessionTemplate) => {
    return selectedSessions.some(s =>
      normalizeString(s.seanceType) === normalizeString(session.seanceType) &&
      s.startDate === session.startDate &&
      s.endDate === session.endDate
    );
  };

  // Toggle single variant selection
  const toggleVariantSelection = (session: SessionTemplate) => {
    setSelectedSessions(prev => {
      const exists = isVariantSelected(session);
      if (exists) {
        return prev.filter(s =>
          !(normalizeString(s.seanceType) === normalizeString(session.seanceType) &&
            s.startDate === session.startDate &&
            s.endDate === session.endDate)
        );
      }
      return [...prev, session];
    });
  };

  // Handle click on a session group (NOT the expand button)
  const handleGroupClick = (group: SessionGroup) => {
    if (group.variants.length === 1) {
      // Only one variant - toggle selection directly
      toggleVariantSelection(group.variants[0]);
    } else {
      // Multiple variants - toggle expansion to show variants
      toggleGroupExpansion(group.name);
    }
  };

  // Handle athlete selection toggle
  const toggleAthleteSelection = (athleteId: string) => {
    setSelectedAthleteIds(prev => {
      if (prev.includes(athleteId)) {
        return prev.filter(id => id !== athleteId);
      }
      return [...prev, athleteId];
    });
  };

  // Handle group selection toggle
  const toggleAthleteGroupSelection = (groupId: string) => {
    setSelectedGroupIds(prev => {
      if (prev.includes(groupId)) {
        return prev.filter(id => id !== groupId);
      }
      return [...prev, groupId];
    });
  };

  // Select all athletes
  const selectAllAthletes = () => {
    if (selectedAthleteIds.length === athletes.length) {
      setSelectedAthleteIds([]);
    } else {
      setSelectedAthleteIds(athletes.map(a => a.id));
    }
  };

  // Get athlete IDs from selected groups
  const getAthleteIdsFromGroups = async (): Promise<string[]> => {
    const allAthleteIds = new Set<string>();

    for (const groupId of selectedGroupIds) {
      try {
        const members = await fetchAthleteGroupWithMembers(groupId);
        members.forEach(member => allAthleteIds.add(member.id));
      } catch (error) {
        console.error(`Erreur lors de la recuperation des membres du groupe ${groupId}:`, error);
      }
    }

    return Array.from(allAthleteIds);
  };

  // Validate form before submission
  const validateForm = (): string | null => {
    const errors: string[] = [];

    if (!startDate) {
      errors.push('La date de debut est obligatoire');
    }

    if (!endDate) {
      errors.push('La date de fin est obligatoire');
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      errors.push('La date de debut doit etre anterieure a la date de fin');
    }

    if (selectedSessions.length === 0) {
      errors.push('Vous devez selectionner au moins une seance');
    } else {
      // Check that all selected sessions have at least one exercise
      const sessionsWithoutExercises = selectedSessions.filter(s => s.exercises.length === 0);
      if (sessionsWithoutExercises.length > 0) {
        errors.push(`La seance "${sessionsWithoutExercises[0].seanceType}" ne contient aucun exercice`);
      }

      // Check date compatibility for each selected session
      if (startDate && endDate) {
        for (const session of selectedSessions) {
          const compatibility = isSessionCompatibleWithProgram(session, startDate, endDate);
          if (!compatibility.compatible && compatibility.reason) {
            errors.push(compatibility.reason);
            break; // Only show first incompatibility
          }
        }
      }
    }

    if (selectionMode === 'athletes' && selectedAthleteIds.length === 0) {
      errors.push('Vous devez selectionner au moins un athlete');
    }

    if (selectionMode === 'groups' && selectedGroupIds.length === 0) {
      errors.push('Vous devez selectionner au moins un groupe');
    }

    if (errors.length > 0) {
      return errors.join('\n');
    }

    return null;
  };

  // Handle create/update program
  const handleCreateProgram = async () => {
    const error = validateForm();
    if (error) {
      setValidationError(error);
      return;
    }

    let targetAthleteIds: string[] = [];
    let targetGroupIds: string[] | undefined = undefined;

    if (selectionMode === 'athletes') {
      targetAthleteIds = selectedAthleteIds;
    } else {
      targetAthleteIds = await getAthleteIdsFromGroups();
      targetGroupIds = selectedGroupIds; // Store the group IDs

      if (targetAthleteIds.length === 0) {
        setValidationError('Les groupes selectionnes ne contiennent aucun athlete');
        return;
      }
    }

    setIsSaving(true);
    try {
      // If editing (not duplicating), delete the old program first
      if (isEditing && editingProgram) {
        await deleteProgram(
          editingProgram.seanceType,
          editingProgram.startDate,
          editingProgram.endDate,
          editingProgram.athleteTarget,
          coachId
        );
      }

      // Calculate year from start date
      const year = new Date(startDate).getFullYear();

      // Create program for each selected session
      for (const session of selectedSessions) {
        // Create a modified session with the program dates
        const sessionWithDates: SessionTemplate = {
          ...session,
          startDate,
          endDate,
        };

        await createProgram(
          sessionWithDates,
          year,
          undefined, // week - not used anymore
          undefined, // monthNum
          targetAthleteIds,
          coachId,
          targetGroupIds,
          programName.trim() || undefined
        );
      }

      await onRefresh();

      // Reset form and states
      resetForm();
      setIsEditing(false);
      setIsDuplicating(false);
      setEditingProgram(null);

      if (onCreateNewClose) {
        onCreateNewClose();
      }
    } catch (error: any) {
      console.error('Erreur lors de la creation du programme:', error);

      // Parse error to provide specific feedback
      let errorMessage = 'Erreur lors de la création du programme';

      if (error?.code === '23505') {
        // Unique constraint violation
        errorMessage = 'Un programme avec ces mêmes paramètres (séance, dates, athlètes) existe déjà. Modifiez les dates ou les athlètes sélectionnés.';
      } else if (error?.code === '23503') {
        // Foreign key constraint violation
        errorMessage = 'Référence invalide : un athlète ou une séance sélectionné(e) n\'existe plus. Veuillez rafraîchir la page.';
      } else if (error?.code === '42501') {
        // Permission denied
        errorMessage = 'Vous n\'avez pas les permissions nécessaires pour créer ce programme.';
      } else if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
        // Authentication error
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        // Network error
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
      } else if (error?.message) {
        // Include actual error message if available
        errorMessage = `Erreur : ${error.message}`;
      }

      setValidationError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle close creation/edit panel
  const handleCloseCreation = () => {
    resetForm();
    setIsEditing(false);
    setIsDuplicating(false);
    setEditingProgram(null);
    if (onCreateNewClose) {
      onCreateNewClose();
    }
  };

  // Get variant label for display
  const getVariantLabel = (session: SessionTemplate) => {
    if (session.startDate && session.endDate) {
      return `${formatDate(session.startDate)} - ${formatDate(session.endDate)}`;
    }
    if (session.startDate) {
      return `Depuis ${formatDate(session.startDate)}`;
    }
    if (session.endDate) {
      return `Jusqu'au ${formatDate(session.endDate)}`;
    }
    return 'Sans periode';
  };

  // Panel visibility
  const showCreationPanel = isCreatingNew || isEditing || isDuplicating;
  const showDetailPanel = selectedProgramGroup && !showCreationPanel;

  // Count selected variants for a group
  const getSelectedCountForGroup = (group: SessionGroup) => {
    return group.variants.filter(v => isVariantSelected(v)).length;
  };

  // Initialize form for editing/duplicating a program group
  const initializeFormFromProgramGroup = (group: ProgramGroup, duplicate: boolean = false) => {
    // Create session templates from all sessions in the group
    const sessionsFromGroup: SessionTemplate[] = group.sessions.map((program, index) => ({
      id: program.sourceTemplateId || `temp-${Date.now()}-${index}`,
      coachId: program.coachId,
      seanceType: program.seanceType,
      exercises: program.exercises,
      startDate: program.startDate,
      endDate: program.endDate,
    }));
    setSelectedSessions(sessionsFromGroup);

    // Restore program name
    setProgramName(group.programName || '');
    setStartDate(group.startDate || '');
    setEndDate(group.endDate || '');

    // Restore athletes and groups based on how program was created
    if (group.groupTarget && group.groupTarget.length > 0) {
      setSelectionMode('groups');
      setSelectedGroupIds(group.groupTarget);
      setSelectedAthleteIds([]);
    } else {
      setSelectionMode('athletes');
      setSelectedAthleteIds(group.athleteTarget);
      setSelectedGroupIds([]);
    }

    // Use the first session as the editing reference
    setEditingProgram(group.sessions[0]);

    if (duplicate) {
      setIsDuplicating(true);
      setIsEditing(false);
    } else {
      setIsEditing(true);
      setIsDuplicating(false);
    }

    setSelectedProgramGroup(null);
    setExpandedSessionIndexes(new Set());
  };

  // Handle edit program group
  const handleEditProgramGroup = (group: ProgramGroup) => {
    initializeFormFromProgramGroup(group, false);
  };

  // Handle duplicate program group
  const handleDuplicateProgramGroup = (group: ProgramGroup) => {
    initializeFormFromProgramGroup(group, true);
  };

  // Handle delete program group (deletes all sessions in the group)
  const handleDeleteGroupClick = (group: ProgramGroup) => {
    setProgramGroupToDelete(group);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!programGroupToDelete) return;

    setIsDeleting(true);
    try {
      // Delete all sessions in the program group
      for (const program of programGroupToDelete.sessions) {
        await deleteProgram(
          program.seanceType,
          program.startDate,
          program.endDate,
          program.athleteTarget,
          coachId
        );
      }
      await onRefresh();
      setShowDeleteConfirm(false);
      setProgramGroupToDelete(null);
      setSelectedProgramGroup(null);
      setExpandedSessionIndexes(new Set());
    } catch (error: any) {
      console.error('Erreur lors de la suppression:', error);

      let errorMessage = 'Erreur lors de la suppression du programme';

      if (error?.code === '42501') {
        errorMessage = 'Vous n\'avez pas les permissions nécessaires pour supprimer ce programme.';
      } else if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
        errorMessage = 'Session expirée. Veuillez vous reconnecter.';
      } else if (error?.message?.includes('network') || error?.message?.includes('fetch')) {
        errorMessage = 'Erreur de connexion. Vérifiez votre connexion internet et réessayez.';
      } else if (error?.message) {
        errorMessage = `Erreur : ${error.message}`;
      }

      setValidationError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // Cancel edit/duplicate mode
  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsDuplicating(false);
    setEditingProgram(null);
    resetForm();
  };

  // Reset form
  const resetForm = () => {
    setProgramName('');
    setSelectedSessions([]);
    setSelectedAthleteIds([]);
    setSelectedGroupIds([]);
    setStartDate('');
    setEndDate('');
    setExpandedGroups(new Set());
  };

  return (
    <div className="flex gap-4 h-full p-4 min-h-0 overflow-hidden">
      {/* ========== ZONE LISTE - Bordure visible ========== */}
      <div className={`${showDetailPanel || showCreationPanel ? 'w-1/3' : 'w-full'} bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden`}>
        <div className="flex-1 h-0 custom-scrollbar">
        {programGroups.length === 0 && !showCreationPanel ? (
          <div className="flex flex-col items-center justify-center h-full text-theme-muted p-8">
            <FolderKanban className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">Aucun programme trouve</p>
            <p className="text-sm mt-2 text-center max-w-md">
              Cliquez sur "Nouveau" pour creer un programme en assignant des seances a vos athletes.
            </p>
          </div>
        ) : (
          <div className="p-2 space-y-2">
            {programGroups.map((group) => (
              <div
                key={group.key}
                onClick={() => {
                  if (!showCreationPanel) {
                    setSelectedProgramGroup(group);
                    setExpandedSessionIndexes(new Set());
                  }
                }}
                className={`p-4 cursor-pointer rounded-xl transition-all duration-200 ${
                  selectedProgramGroup?.key === group.key && !showCreationPanel
                    ? 'bg-blue-600/20 border-2 border-blue-500'
                    : 'bg-theme-secondary/50 border border-theme hover:bg-theme-secondary hover:border-theme'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-theme font-medium">
                      {group.programName
                        ? group.programName
                        : group.sessions.length === 1
                          ? group.sessions[0].seanceType
                          : `${group.sessions.length} seances`
                      }
                    </h3>
                    {(group.programName || group.sessions.length > 1) && (
                      <p className="text-theme-muted text-xs mt-0.5">
                        {group.sessions.map(s => s.seanceType).join(', ')}
                      </p>
                    )}
                    <div className="flex items-center gap-4 mt-1 text-sm text-theme-muted">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{getGroupPeriodLabel(group)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setAthletePopoverGroup(group);
                        }}
                        className="flex items-center gap-1 hover:text-[var(--color-primary)] transition-colors"
                      >
                        <Users className="w-3 h-3" />
                        <span className="underline decoration-dotted">
                          {group.groupTarget && group.groupTarget.length > 0
                            ? `${group.groupTarget.length} groupe${group.groupTarget.length > 1 ? 's' : ''}`
                            : `${group.athleteTarget.length} athlete${group.athleteTarget.length > 1 ? 's' : ''}`
                          }
                        </span>
                      </button>
                    </div>
                    <p className="text-theme-muted text-xs mt-1">
                      {group.sessions.reduce((acc, s) => acc + s.exercises.length, 0)} exercice{group.sessions.reduce((acc, s) => acc + s.exercises.length, 0) > 1 ? 's' : ''} au total
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-theme-muted" />
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* ========== ZONE VISUALISATION - Bordure visible ========== */}
      {showDetailPanel && selectedProgramGroup && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          {/* Header fixe avec actions */}
          <div className="flex-shrink-0 p-4 border-b border-theme">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-theme">
                {selectedProgramGroup.programName
                  ? selectedProgramGroup.programName
                  : selectedProgramGroup.sessions.length === 1
                    ? selectedProgramGroup.sessions[0].seanceType
                    : `Programme (${selectedProgramGroup.sessions.length} seances)`
                }
              </h2>
              <button
                onClick={() => {
                  setSelectedProgramGroup(null);
                  setExpandedSessionIndexes(new Set());
                }}
                className="p-1 text-theme-muted hover:text-theme rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleEditProgramGroup(selectedProgramGroup)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-theme-tertiary text-theme rounded-lg text-sm transition-colors"
              >
                <Edit3 className="w-4 h-4" />
                Modifier
              </button>
              <button
                onClick={() => handleDuplicateProgramGroup(selectedProgramGroup)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-theme-tertiary text-theme rounded-lg text-sm transition-colors"
              >
                <Copy className="w-4 h-4" />
                Dupliquer
              </button>
              <button
                onClick={() => handleDeleteGroupClick(selectedProgramGroup)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-theme-secondary hover:bg-[var(--color-danger)]/10 text-theme hover:text-[var(--color-danger)] rounded-lg text-sm transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Supprimer
              </button>
            </div>
          </div>

          <div className="flex-1 h-0 custom-scrollbar p-4 space-y-4">
            {/* Period with dates */}
            <div className="bg-theme-secondary rounded-lg p-4">
              <div className="flex items-center gap-2 text-theme-muted text-sm mb-2">
                <Calendar className="w-4 h-4" />
                <span>Periode</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-theme-muted text-xs">Date de debut</p>
                  <p className="text-theme font-medium">
                    {selectedProgramGroup.startDate ? formatDate(selectedProgramGroup.startDate) : 'Non definie'}
                  </p>
                </div>
                <div>
                  <p className="text-theme-muted text-xs">Date de fin</p>
                  <p className="text-theme font-medium">
                    {selectedProgramGroup.endDate ? formatDate(selectedProgramGroup.endDate) : 'Non definie'}
                  </p>
                </div>
              </div>
            </div>

            {/* Athletes assigned */}
            <div className="bg-theme-secondary rounded-lg p-4">
              <div className="flex items-center gap-2 text-theme-muted text-sm mb-3">
                <Users className="w-4 h-4" />
                <span>Athletes assignes ({selectedProgramGroup.athleteTarget.length})</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedProgramGroup.athleteTarget.map(athleteId => (
                  <span
                    key={athleteId}
                    className="px-2.5 py-1.5 bg-theme-tertiary text-theme text-sm rounded-lg"
                  >
                    {getAthleteName(athleteId)}
                  </span>
                ))}
              </div>
            </div>

            {/* Collapsible Sessions */}
            <div className="bg-theme-secondary rounded-lg p-4">
              <div className="flex items-center gap-2 text-theme-muted text-sm mb-3">
                <FolderKanban className="w-4 h-4" />
                <span>Seances ({selectedProgramGroup.sessions.length})</span>
              </div>
              <div className="space-y-2">
                {selectedProgramGroup.sessions.map((session, sessionIndex) => {
                  const isExpanded = expandedSessionIndexes.has(sessionIndex);
                  return (
                    <div key={`${session.seanceType}-${sessionIndex}`} className="border border-theme rounded-lg overflow-hidden">
                      {/* Session Header - Clickable to expand/collapse */}
                      <button
                        onClick={() => toggleSessionExpansion(sessionIndex)}
                        className="w-full flex items-center justify-between p-3 bg-theme-tertiary hover:bg-theme-secondary transition-colors text-left"
                      >
                        <div className="flex items-center gap-3">
                          <Dumbbell className="w-4 h-4 text-[var(--color-primary)]" />
                          <span className="text-theme font-medium">{session.seanceType}</span>
                          <span className="text-theme-muted text-xs">
                            ({session.exercises.length} exercice{session.exercises.length > 1 ? 's' : ''})
                          </span>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4 text-theme-muted" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-theme-muted" />
                        )}
                      </button>

                      {/* Exercises - Shown when expanded */}
                      {isExpanded && (
                        <div className="p-3 bg-theme-tertiary space-y-2">
                          {session.exercises.length === 0 ? (
                            <p className="text-theme-muted text-sm italic">Aucun exercice</p>
                          ) : (
                            (() => {
                              // Grouper les exercices par superset
                              const grouped = groupSessionExercises(session.exercises);
                              let displayIndex = 0;

                              return grouped.map((item, groupIdx) => {
                                if (isSessionExerciseGroup(item)) {
                                  // Bloc Superset
                                  const startIndex = displayIndex + 1;
                                  displayIndex += item.exercises.length;
                                  const modeInfo = EXECUTION_MODES[item.executionMode];

                                  return (
                                    <div
                                      key={`superset-${item.groupId}`}
                                      className="border-2 border-[var(--color-primary)] rounded-lg overflow-hidden"
                                    >
                                      {/* Header Superset */}
                                      <div className="bg-[var(--color-primary)]/10 px-3 py-2 flex items-center gap-2">
                                        <Link2 className="w-4 h-4 text-[var(--color-primary)]" />
                                        <span className="text-sm font-medium text-[var(--color-primary)]">
                                          {modeInfo.label}
                                        </span>
                                        <span className="text-xs text-theme-muted">
                                          • {item.exercises[0]?.targetSets || '?'} séries
                                        </span>
                                      </div>

                                      {/* Exercices du superset */}
                                      <div className="divide-y divide-theme/30">
                                        {item.exercises.map((ex, exIdx) => (
                                          <div
                                            key={ex.id || `${groupIdx}-${exIdx}`}
                                            className="flex items-center justify-between py-2 px-3"
                                          >
                                            <div className="flex items-center gap-3">
                                              <span className="w-6 h-6 rounded-full bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-bold flex items-center justify-center">
                                                {String.fromCharCode(65 + exIdx)}
                                              </span>
                                              <span className="text-theme">{ex.exerciseName}</span>
                                            </div>
                                            <div className="text-right">
                                              <span className="text-[var(--color-primary)] font-medium">
                                                {ex.targetReps}
                                              </span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>

                                      {/* Repos après le superset */}
                                      {item.exercises[item.exercises.length - 1]?.restTimeSec && (
                                        <div className="bg-theme-secondary/50 px-3 py-1.5 text-xs text-theme-muted text-center">
                                          {item.exercises[item.exercises.length - 1].restTimeSec}s repos entre les tours
                                        </div>
                                      )}
                                    </div>
                                  );
                                }

                                // Exercice individuel
                                const ex = item as SessionExercise;
                                displayIndex++;

                                return (
                                  <div
                                    key={ex.id || groupIdx}
                                    className="flex items-center justify-between py-2 border-b border-theme/50 last:border-0"
                                  >
                                    <div className="flex items-center gap-3">
                                      <span className="text-theme-muted text-sm w-6">{displayIndex}.</span>
                                      <span className="text-theme">{ex.exerciseName}</span>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-[var(--color-primary)] font-medium">
                                        {ex.targetSets && `${ex.targetSets}x`}{ex.targetReps}
                                      </span>
                                      {ex.restTimeSec && (
                                        <span className="text-theme-muted text-xs ml-2">
                                          ({ex.restTimeSec}s repos)
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========== ZONE VISUALISATION (Creation/Edit) - Bordure visible ========== */}
      {showCreationPanel && (
        <div className="w-2/3 bg-theme-secondary/50 border border-theme rounded-xl flex flex-col min-h-0 overflow-hidden">
          <div className="flex-shrink-0 p-4 border-b border-theme">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-theme">
                {isEditing ? 'Modifier le Programme' : isDuplicating ? 'Dupliquer le Programme' : 'Nouveau Programme'}
              </h2>
              <button
                onClick={handleCloseCreation}
                className="p-1 text-theme-muted hover:text-theme rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 h-0 custom-scrollbar p-4 space-y-6">
            {/* Program Name */}
            <div>
              <label className="block text-sm font-medium text-theme mb-2">
                Nom du programme
              </label>
              <input
                type="text"
                value={programName}
                onChange={(e) => setProgramName(e.target.value)}
                placeholder="Ex: Preparation physique Janvier"
                className="w-full px-3 py-2 bg-theme-secondary border border-theme rounded-lg text-theme placeholder-theme-muted focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
              />
              <p className="text-theme-muted text-xs mt-1">
                Optionnel - Laissez vide pour utiliser le nom des seances
              </p>
            </div>

            {/* Period Selection - Dates */}
            <div>
              <label className="block text-sm font-medium text-theme mb-2">
                Periode du programme <span className="text-[var(--color-danger)]">*</span>
              </label>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-theme-muted mb-1">Date de debut</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      // Clear sessions that no longer match
                      setSelectedSessions(prev => prev.filter(s =>
                        sessionMatchesProgramDates(s, e.target.value, endDate)
                      ));
                    }}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-theme-muted mb-1">Date de fin</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      // Clear sessions that no longer match
                      setSelectedSessions(prev => prev.filter(s =>
                        sessionMatchesProgramDates(s, startDate, e.target.value)
                      ));
                    }}
                    className="w-full px-3 py-2 bg-theme-secondary border border-theme rounded-lg text-theme focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/50"
                  />
                </div>
              </div>
              {(!startDate || !endDate) && (
                <p className="text-theme-muted text-xs mt-2">
                  Definissez les dates pour filtrer les seances disponibles
                </p>
              )}
            </div>

            {/* Session Selection */}
            <div>
              <label className="block text-sm font-medium text-theme mb-2">
                Seances a assigner <span className="text-[var(--color-danger)]">*</span>
              </label>

              {/* Dropdown for session selection */}
              <div className="relative">
                <button
                  onClick={() => setShowSessionDropdown(!showSessionDropdown)}
                  className="w-full flex items-center justify-between px-3 py-2 bg-theme-secondary border border-theme rounded-lg text-left text-theme hover:bg-theme-tertiary"
                >
                  <span className={selectedSessions.length === 0 ? 'text-theme-muted' : ''}>
                    {selectedSessions.length === 0
                      ? 'Selectionner des seances...'
                      : `${selectedSessions.length} seance${selectedSessions.length > 1 ? 's' : ''} selectionnee${selectedSessions.length > 1 ? 's' : ''}`
                    }
                  </span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showSessionDropdown ? 'rotate-180' : ''}`} />
                </button>

                {showSessionDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-theme-secondary border border-theme rounded-lg shadow-lg max-h-64 overflow-y-auto">
                    {sessionGroups.length === 0 ? (
                      <div className="px-3 py-2 text-theme-muted text-sm">
                        {startDate || endDate
                          ? 'Aucune seance disponible pour cette periode'
                          : 'Aucune seance disponible'
                        }
                      </div>
                    ) : (
                      sessionGroups.map(group => {
                        const isExpanded = expandedGroups.has(group.name);
                        const hasMultipleVariants = group.variants.length > 1;
                        const selectedCount = getSelectedCountForGroup(group);
                        const singleVariant = group.variants[0];
                        const isSingleSelected = !hasMultipleVariants && isVariantSelected(singleVariant);

                        return (
                          <div key={group.name}>
                            {/* Group header */}
                            <div className="flex items-center">
                              {hasMultipleVariants && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleGroupExpansion(group.name);
                                  }}
                                  className="p-2 text-theme-muted hover:text-theme"
                                >
                                  <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                                </button>
                              )}
                              <button
                                onClick={() => handleGroupClick(group)}
                                className={`flex-1 flex items-center gap-2 px-3 py-2 text-left hover:bg-theme-tertiary ${
                                  isSingleSelected ? 'bg-[var(--color-primary)]/10' : ''
                                } ${!hasMultipleVariants ? 'pl-10' : ''}`}
                              >
                                {!hasMultipleVariants && (
                                  <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                    isSingleSelected
                                      ? 'bg-[var(--color-primary)] border-[var(--color-primary)]'
                                      : 'border-theme-muted'
                                  }`}>
                                    {isSingleSelected && <Check className="w-3 h-3 text-white" />}
                                  </div>
                                )}
                                <span className="text-theme">{group.displayName}</span>
                                {hasMultipleVariants && (
                                  <span className="text-theme-muted text-xs ml-auto">
                                    {selectedCount > 0 && (
                                      <span className="text-[var(--color-primary)] mr-1">{selectedCount} sel.</span>
                                    )}
                                    {group.variants.length} variantes
                                  </span>
                                )}
                                {!hasMultipleVariants && (
                                  <span className="text-theme-muted text-xs ml-auto">
                                    {singleVariant.exercises.length} ex.
                                    {singleVariant.startDate && ` - ${getVariantLabel(singleVariant)}`}
                                  </span>
                                )}
                              </button>
                            </div>

                            {/* Variants (when expanded) */}
                            {hasMultipleVariants && isExpanded && (
                              <div className="pl-10 bg-theme-tertiary">
                                {group.variants.map((variant, idx) => {
                                  const isSelected = isVariantSelected(variant);
                                  return (
                                    <button
                                      key={`${variant.seanceType}-${variant.startDate}-${variant.endDate}-${idx}`}
                                      onClick={() => toggleVariantSelection(variant)}
                                      className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-theme-secondary ${
                                        isSelected ? 'bg-[var(--color-primary)]/10' : ''
                                      }`}
                                    >
                                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                        isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-theme-muted'
                                      }`}>
                                        {isSelected && <Check className="w-3 h-3 text-white" />}
                                      </div>
                                      <span className="text-theme text-sm">{getVariantLabel(variant)}</span>
                                      <span className="text-theme-muted text-xs ml-auto">
                                        {variant.exercises.length} ex.
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected sessions chips */}
              {selectedSessions.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedSessions.map((session, idx) => (
                    <span
                      key={`${session.seanceType}-${session.startDate}-${session.endDate}-${idx}`}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs rounded"
                    >
                      {session.seanceType}
                      {session.startDate && ` (${formatDate(session.startDate)})`}
                      <button
                        onClick={() => toggleVariantSelection(session)}
                        className="hover:text-[var(--color-primary-light)]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Target Selection Mode */}
            <div>
              <label className="block text-sm font-medium text-theme mb-2">
                Assigner a <span className="text-[var(--color-danger)]">*</span>
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setSelectionMode('athletes')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectionMode === 'athletes'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-theme-secondary text-theme hover:bg-theme-tertiary'
                  }`}
                >
                  <Users className="w-4 h-4 inline mr-1" />
                  Athletes
                </button>
                <button
                  onClick={() => setSelectionMode('groups')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectionMode === 'groups'
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'bg-theme-secondary text-theme hover:bg-theme-tertiary'
                  }`}
                >
                  <FolderKanban className="w-4 h-4 inline mr-1" />
                  Groupes
                </button>
              </div>

              {/* Athletes Selection */}
              {selectionMode === 'athletes' && (
                <div className="space-y-2">
                  {athletes.length === 0 ? (
                    <p className="text-theme-muted text-sm">Aucun athlete dans votre equipe</p>
                  ) : (
                    <>
                      <button
                        onClick={selectAllAthletes}
                        className="text-sm text-[var(--color-primary)] hover:text-[var(--color-primary-light)] mb-2"
                      >
                        {selectedAthleteIds.length === athletes.length ? 'Tout deselectionner' : 'Tout selectionner'}
                      </button>
                      <div className="max-h-48 overflow-y-auto space-y-1 bg-theme-tertiary rounded-lg p-2">
                        {athletes.map(athlete => {
                          const isSelected = selectedAthleteIds.includes(athlete.id);
                          const name = athlete.firstName && athlete.lastName
                            ? `${athlete.firstName} ${athlete.lastName}`
                            : athlete.username;
                          return (
                            <button
                              key={athlete.id}
                              onClick={() => toggleAthleteSelection(athlete.id)}
                              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                                isSelected ? 'bg-[var(--color-primary)]/10' : 'hover:bg-theme-secondary'
                              }`}
                            >
                              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                                isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-theme-muted'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-theme">{name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Groups Selection */}
              {selectionMode === 'groups' && (
                <div className="space-y-2">
                  {groups.length === 0 ? (
                    <p className="text-theme-muted text-sm">Aucun groupe cree</p>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1 bg-theme-tertiary rounded-lg p-2">
                      {groups.map(group => {
                        const isSelected = selectedGroupIds.includes(group.id);
                        return (
                          <button
                            key={group.id}
                            onClick={() => toggleAthleteGroupSelection(group.id)}
                            className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-colors ${
                              isSelected ? 'bg-[var(--color-primary)]/10' : 'hover:bg-theme-secondary'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                              isSelected ? 'bg-[var(--color-primary)] border-[var(--color-primary)]' : 'border-theme-muted'
                            }`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: group.color }}
                            />
                            <span className="text-theme">{group.name}</span>
                            <span className="text-theme-muted text-xs ml-auto">
                              {group.memberCount} membre{group.memberCount > 1 ? 's' : ''}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Create Button */}
          <div className="flex-shrink-0 p-4 border-t border-theme">
            <button
              onClick={handleCreateProgram}
              disabled={isSaving}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] disabled:bg-theme-secondary disabled:text-theme-muted text-white rounded-lg font-medium transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isEditing ? 'Mise a jour...' : 'Creation en cours...'}
                </>
              ) : (
                <>
                  {isEditing ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                  {isEditing ? 'Mettre a jour' : isDuplicating ? 'Creer la copie' : 'Creer le programme'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Validation Error Popup */}
      {validationError && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[var(--color-danger)]/20 rounded-full">
                <AlertCircle className="w-6 h-6 text-[var(--color-danger)]" />
              </div>
              <h3 className="text-theme font-medium">Validation du programme</h3>
            </div>

            <div className="mb-4 bg-theme rounded-lg p-3">
              <p className="text-theme text-sm whitespace-pre-line">{validationError}</p>
            </div>

            <p className="text-theme-muted text-xs mb-4">
              Pour creer un programme, vous devez renseigner :
            </p>
            <ul className="text-theme-muted text-xs mb-4 list-disc list-inside space-y-1">
              <li>Une date de debut</li>
              <li>Une date de fin</li>
              <li>Au moins une seance avec des exercices</li>
              <li>Au moins un athlete ou un groupe</li>
              <li>Les dates des seances doivent etre compatibles avec la periode du programme</li>
            </ul>

            <div className="flex justify-end">
              <button
                onClick={() => setValidationError(null)}
                className="px-4 py-2 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme text-theme"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Popup */}
      {showDeleteConfirm && programGroupToDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-[var(--color-danger)]/20 rounded-full">
                <Trash2 className="w-6 h-6 text-[var(--color-danger)]" />
              </div>
              <h3 className="text-theme font-medium">Supprimer le programme</h3>
            </div>

            <p className="text-theme text-sm mb-4">
              Etes-vous sur de vouloir supprimer ce programme
              {programGroupToDelete.sessions.length > 1
                ? ` (${programGroupToDelete.sessions.length} seances)`
                : ` "${programGroupToDelete.sessions[0]?.seanceType}"`
              } ?
            </p>

            <div className="bg-theme rounded-lg p-3 mb-4">
              <div className="text-sm space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-theme-muted">Periode:</span>
                  <span className="text-theme">{getGroupPeriodLabel(programGroupToDelete)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-theme-muted">Seances:</span>
                  <span className="text-theme">{programGroupToDelete.sessions.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-theme-muted">Athletes:</span>
                  <span className="text-theme">{programGroupToDelete.athleteTarget.length} assigne{programGroupToDelete.athleteTarget.length > 1 ? 's' : ''}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-theme-muted">Exercices:</span>
                  <span className="text-theme">{programGroupToDelete.sessions.reduce((acc, s) => acc + s.exercises.length, 0)}</span>
                </div>
              </div>
            </div>

            {programGroupToDelete.sessions.length > 1 && (
              <div className="bg-theme rounded-lg p-3 mb-4">
                <p className="text-theme-muted text-xs uppercase tracking-wider mb-2">Seances concernees</p>
                <div className="space-y-1">
                  {programGroupToDelete.sessions.map((session, idx) => (
                    <div key={idx} className="text-theme text-sm flex items-center gap-2">
                      <Dumbbell className="w-3 h-3 text-theme-muted" />
                      {session.seanceType}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[var(--color-warning)] text-xs mb-4">
              Cette action est irreversible. {programGroupToDelete.sessions.length > 1 ? 'Toutes les seances seront' : 'La seance sera'} definitivement supprimee{programGroupToDelete.sessions.length > 1 ? 's' : ''}.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setProgramGroupToDelete(null);
                }}
                className="px-4 py-2 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme text-theme"
                disabled={isDeleting}
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-4 py-2 rounded text-sm font-medium bg-[var(--color-danger)] hover:opacity-90 text-white flex items-center gap-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Suppression...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Athletes Popover */}
      {athletePopoverGroup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => {
          setAthletePopoverGroup(null);
          setExpandedPopoverGroups(new Set());
        }}>
          <div className="bg-theme-secondary rounded-lg p-4 max-w-md w-full mx-4 border border-theme" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[var(--color-primary)]" />
                <h3 className="text-theme font-medium">Athletes assignes</h3>
              </div>
              <button
                onClick={() => {
                  setAthletePopoverGroup(null);
                  setExpandedPopoverGroups(new Set());
                }}
                className="p-1 text-theme-muted hover:text-theme rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-theme-muted text-sm mb-3">
              Programme: <span className="text-theme font-medium">
                {athletePopoverGroup.programName
                  ? athletePopoverGroup.programName
                  : athletePopoverGroup.sessions.length === 1
                    ? athletePopoverGroup.sessions[0].seanceType
                    : `${athletePopoverGroup.sessions.length} seances`
                }
              </span>
            </p>

            <div className="max-h-80 overflow-y-auto space-y-3">
              {/* Show collapsible groups if available */}
              {athletePopoverGroup.groupTarget && athletePopoverGroup.groupTarget.length > 0 && (
                <div>
                  <p className="text-theme-muted text-xs uppercase tracking-wider mb-2">Groupes</p>
                  <div className="space-y-2">
                    {athletePopoverGroup.groupTarget.map(groupId => {
                      const group = groups.find(g => g.id === groupId);
                      if (!group) return null;
                      const isExpanded = expandedPopoverGroups.has(groupId);
                      // Get athletes that belong to this group (intersection with athleteTarget)
                      const groupAthleteIds = athletePopoverGroup.athleteTarget;

                      return (
                        <div key={groupId} className="bg-theme rounded-lg overflow-hidden">
                          {/* Group header - clickable to expand */}
                          <button
                            onClick={() => {
                              setExpandedPopoverGroups(prev => {
                                const newSet = new Set(prev);
                                if (newSet.has(groupId)) {
                                  newSet.delete(groupId);
                                } else {
                                  newSet.add(groupId);
                                }
                                return newSet;
                              });
                            }}
                            className="w-full flex items-center justify-between p-3 hover:bg-theme-tertiary transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: group.color }}
                              />
                              <span className="text-theme font-medium">{group.name}</span>
                              <span className="text-theme-muted text-xs">({group.memberCount} membres)</span>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-theme-muted" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-theme-muted" />
                            )}
                          </button>

                          {/* Group athletes - shown when expanded */}
                          {isExpanded && (
                            <div className="border-t border-theme p-2 bg-theme-tertiary">
                              {groupAthleteIds.length === 0 ? (
                                <p className="text-theme-muted text-sm p-2">Aucun athlete</p>
                              ) : (
                                <div className="space-y-1">
                                  {groupAthleteIds.map(athleteId => {
                                    const athlete = athletes.find(a => a.id === athleteId);
                                    const name = athlete
                                      ? (athlete.firstName && athlete.lastName
                                          ? `${athlete.firstName} ${athlete.lastName}`
                                          : athlete.username)
                                      : athleteId.slice(0, 8) + '...';
                                    return (
                                      <div
                                        key={athleteId}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                                      >
                                        <div className="w-6 h-6 rounded-full bg-theme-secondary flex items-center justify-center text-theme text-xs font-medium">
                                          {name.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-theme text-sm">{name}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Show individual athletes if no groups OR mixed mode (groups + individual athletes) */}
              {(!athletePopoverGroup.groupTarget || athletePopoverGroup.groupTarget.length === 0) && (
                <div>
                  <p className="text-theme-muted text-xs uppercase tracking-wider mb-2">Athletes</p>
                  <div className="bg-theme rounded-lg p-2 space-y-1">
                    {athletePopoverGroup.athleteTarget.length === 0 ? (
                      <p className="text-theme-muted text-sm p-2">Aucun athlete assigne</p>
                    ) : (
                      athletePopoverGroup.athleteTarget.map(athleteId => {
                        const athlete = athletes.find(a => a.id === athleteId);
                        const name = athlete
                          ? (athlete.firstName && athlete.lastName
                              ? `${athlete.firstName} ${athlete.lastName}`
                              : athlete.username)
                          : athleteId.slice(0, 8) + '...';
                        return (
                          <div
                            key={athleteId}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg"
                          >
                            <div className="w-8 h-8 rounded-full bg-theme-secondary flex items-center justify-center text-theme text-sm font-medium">
                              {name.charAt(0).toUpperCase()}
                            </div>
                            <span className="text-theme">{name}</span>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => {
                  setAthletePopoverGroup(null);
                  setExpandedPopoverGroups(new Set());
                }}
                className="px-4 py-2 rounded text-sm font-medium bg-theme-tertiary hover:bg-theme text-theme"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
