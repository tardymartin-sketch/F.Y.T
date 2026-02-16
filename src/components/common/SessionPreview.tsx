import React, { useState, useMemo } from 'react';
import { WorkoutRow, ExecutionMode, EXECUTION_MODES } from '../../../types';
import { Video, AlertCircle, ChevronDown, Link2, Plus } from 'lucide-react';

interface Props {
  exercises: WorkoutRow[];
  selectedOrder: string[];
}

export const SessionPreview: React.FC<Props> = ({ exercises, selectedOrder }) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  const sortedExercises = useMemo(() => {
    return [...exercises].sort((a, b) => {
      const sessionIndexA = selectedOrder.indexOf(a.seance);
      const sessionIndexB = selectedOrder.indexOf(b.seance);

      if (sessionIndexA !== sessionIndexB) {
        return sessionIndexA - sessionIndexB;
      }
      return a.ordre - b.ordre;
    });
  }, [exercises, selectedOrder]);

  // Grouper les exercices par executionGroupId pour les supersets
  const groupedExercises = useMemo(() => {
    const result: (WorkoutRow | { type: 'superset'; groupId: string; exercises: WorkoutRow[]; executionMode: ExecutionMode })[] = [];
    const processedGroupIds = new Set<string>();

    sortedExercises.forEach((exercise) => {
      const mode = exercise.executionMode ?? 'straight';
      const groupId = exercise.executionGroupId;

      if (groupId && mode !== 'straight') {
        // C'est un exercice dans un groupe
        if (!processedGroupIds.has(groupId)) {
          // Trouver tous les exercices de ce groupe
          const groupExercises = sortedExercises.filter(e => e.executionGroupId === groupId)
            .sort((a, b) => (a.executionGroupPosition || 0) - (b.executionGroupPosition || 0));

          result.push({
            type: 'superset',
            groupId,
            exercises: groupExercises,
            executionMode: mode
          });
          processedGroupIds.add(groupId);
        }
      } else {
        // Exercice individuel
        result.push(exercise);
      }
    });

    return result;
  }, [sortedExercises]);

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isMultiSession = selectedOrder.length > 1;

  const toggleNotes = (key: string) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const buildMetricsString = (exercise: WorkoutRow, isSuperset = false): string => {
    const parts: string[] = [];
    if (exercise.series && exercise.repsDuree) {
      parts.push(`${exercise.series}×${exercise.repsDuree}`);
    }
    if (!isSuperset && exercise.repos) {
      parts.push(`${exercise.repos}s repos`);
    }
    if (exercise.tempoRpe) {
      parts.push(exercise.tempoRpe);
    }
    return parts.join(' • ');
  };

  // Render un exercice individuel
  const renderExercise = (exercise: WorkoutRow, idx: number, isInSuperset = false) => {
    const noteKey = `ex-${exercise.id}-${idx}`;
    const hasNotes = exercise.notes && exercise.notes.trim().length > 0;
    const hasVideo = exercise.video && isValidUrl(exercise.video);
    const isNotesExpanded = expandedNotes.has(noteKey);

    return (
      <div key={noteKey} className={isInSuperset ? 'py-2' : ''}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {!isInSuperset && <span className="text-xs text-theme-muted font-medium">#{exercise.ordre}</span>}
              <h4 className="font-medium text-theme truncate">{exercise.exercice}</h4>
              {hasVideo && (
                <a
                  href={exercise.video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-[var(--color-primary)] hover:text-[var(--color-primary-light)] hover:bg-[var(--color-primary)]/10 rounded transition-colors"
                  title="Voir la vidéo"
                >
                  <Video className="w-4 h-4" />
                </a>
              )}
            </div>

            {/* Metrics */}
            <p className="text-sm text-theme-muted mt-1">
              {buildMetricsString(exercise, isInSuperset)}
            </p>
          </div>
        </div>

        {/* Notes */}
        {hasNotes && (
          <div className="mt-2">
            <button
              onClick={() => toggleNotes(noteKey)}
              className="flex items-center gap-1 text-xs text-[var(--color-warning)] hover:text-[var(--color-warning)]/80 transition-colors"
            >
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Notes</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isNotesExpanded ? 'rotate-180' : ''}`} />
            </button>

            {isNotesExpanded && (
              <div className="mt-2 p-2 bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 rounded-lg text-sm text-[var(--color-warning)]">
                {exercise.notes}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  let currentSession = '';

  return (
    <div className="space-y-2">
      {groupedExercises.map((item, idx) => {
        // Vérifier si c'est un superset
        if ('type' in item && item.type === 'superset') {
          const group = item;
          const firstExercise = group.exercises[0];
          const showSessionHeader = isMultiSession && firstExercise.seance !== currentSession;
          currentSession = firstExercise.seance;

          return (
            <div key={`superset-${group.groupId}`}>
              {showSessionHeader && (
                <div className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm font-semibold px-3 py-2 rounded-lg mb-2 mt-4 first:mt-0">
                  {firstExercise.seance}
                </div>
              )}

              <div className="bg-theme-tertiary rounded-xl p-3 border-l-4 border-[var(--color-primary)] border border-theme">
                {/* Superset Header */}
                <div className="flex items-center gap-2 mb-2 pb-2 border-b border-theme">
                  <Link2 className="w-4 h-4 text-[var(--color-primary)]" />
                  <span className="text-sm font-medium text-[var(--color-primary)]">
                    {EXECUTION_MODES[group.executionMode].label}
                  </span>
                  <span className="text-xs text-theme-muted">
                    • {firstExercise.series} séries • {firstExercise.repos}s repos
                  </span>
                </div>

                {/* Exercices du superset */}
                <div className="space-y-1 divide-y divide-theme/50">
                  {group.exercises.map((exercise, exIdx) => (
                    <React.Fragment key={`${group.groupId}-${exercise.id}`}>
                      {exIdx > 0 && (
                        <div className="flex items-center justify-center py-1">
                          <Plus className="w-3 h-3 text-[var(--color-primary)]" />
                        </div>
                      )}
                      {renderExercise(exercise, exIdx, true)}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          );
        }

        // Exercice individuel
        const exercise = item as WorkoutRow;
        const showSessionHeader = isMultiSession && exercise.seance !== currentSession;
        currentSession = exercise.seance;

        return (
          <div key={`${exercise.id}-${idx}`}>
            {showSessionHeader && (
              <div className="bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-sm font-semibold px-3 py-2 rounded-lg mb-2 mt-4 first:mt-0">
                {exercise.seance}
              </div>
            )}

            <div className="bg-theme-tertiary rounded-xl p-3 border border-theme">
              {renderExercise(exercise, idx)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SessionPreview;
