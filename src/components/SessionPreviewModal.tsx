// ============================================================
// F.Y.T - SESSION PREVIEW MODAL (ATH-NEW-001)
// src/components/SessionPreviewModal.tsx
// Modal affichant tous les exercices de la séance sélectionnée
// ============================================================

import React, { useEffect, useRef, useCallback } from 'react';
import { WorkoutRow } from '../../types';
import {
  X,
  Play,
  Clock,
  Dumbbell,
  Timer,
  FileText,
  Video,
  ChevronRight
} from 'lucide-react';

// ===========================================
// TYPES
// ===========================================

interface Props {
  isOpen: boolean;
  onClose: () => void;
  sessionName: string;
  exercises: WorkoutRow[];
  onStartSession: () => void;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function estimateSessionDuration(exercises: WorkoutRow[]): number {
  let totalMinutes = 0;
  exercises.forEach(exercise => {
    const sets = parseInt(exercise.series) || 3;
    const effortTime = sets * 0.75;
    const restSeconds = parseInt(exercise.repos) || 90;
    const restTime = (sets - 1) * (restSeconds / 60);
    const transitionTime = 1;
    totalMinutes += effortTime + restTime + transitionTime;
  });
  return Math.round(totalMinutes / 5) * 5;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `~${hours}h`;
  return `~${hours}h${mins.toString().padStart(2, '0')}`;
}

function formatRest(seconds: string): string {
  const secs = parseInt(seconds);
  if (isNaN(secs)) return seconds;
  if (secs >= 60) {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return remainingSecs > 0 ? `${mins}m${remainingSecs}s` : `${mins}m`;
  }
  return `${secs}s`;
}

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// ===========================================
// COMPONENT
// ===========================================

export const SessionPreviewModal: React.FC<Props> = ({
  isOpen,
  onClose,
  sessionName,
  exercises,
  onStartSession,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Tri des exercices par ordre
  const sortedExercises = [...exercises].sort((a, b) => a.ordre - b.ordre);

  // Calculs
  const exerciseCount = sortedExercises.length;
  const estimatedDuration = estimateSessionDuration(sortedExercises);

  // ===========================================
  // FOCUS TRAP & KEYBOARD
  // ===========================================

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }

    // Focus trap
    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      // Focus first element
      setTimeout(() => {
        firstFocusableRef.current?.focus();
      }, 100);

      return () => {
        document.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [isOpen, handleKeyDown]);

  // ===========================================
  // HANDLERS
  // ===========================================

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleStart = () => {
    onStartSession();
    onClose();
  };

  // ===========================================
  // RENDER
  // ===========================================

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-preview-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={handleOverlayClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="
          relative w-full max-w-lg bg-slate-900 border border-slate-700/50
          rounded-2xl shadow-2xl overflow-hidden
          animate-modal-in
        "
        style={{ maxHeight: '85dvh' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-slate-900 border-b border-slate-700/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0 pr-4">
              <h2
                id="session-preview-title"
                className="text-xl font-bold text-white truncate"
              >
                {sessionName}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-slate-400">
                <span className="flex items-center gap-1">
                  <Dumbbell className="w-4 h-4" />
                  {exerciseCount} exercices
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {formatDuration(estimatedDuration)}
                </span>
              </div>
            </div>
            <button
              ref={firstFocusableRef}
              onClick={onClose}
              className="
                p-2 rounded-xl bg-slate-800 text-slate-400
                hover:bg-slate-700 hover:text-white
                transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500
              "
              aria-label="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Exercise List */}
        <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 'calc(85dvh - 160px)' }}>
          {sortedExercises.map((exercise, index) => (
            <ExerciseCard
              key={`${exercise.id}-${index}`}
              exercise={exercise}
              index={index + 1}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 bg-slate-900 border-t border-slate-700/50 p-4">
          <button
            onClick={handleStart}
            className="
              w-full flex items-center justify-center gap-3
              py-4 rounded-xl font-semibold text-white
              bg-gradient-to-r from-blue-600 to-emerald-600
              hover:from-blue-500 hover:to-emerald-500
              shadow-lg shadow-blue-600/25
              transition-all duration-200
              active:scale-[0.98]
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900
            "
          >
            <Play className="w-5 h-5 fill-current" />
            Démarrer cette séance
          </button>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes modal-in {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 200ms ease-out;
        }

        .animate-modal-in {
          animation: modal-in 300ms ease-out;
        }
      `}</style>
    </div>
  );
};

// ===========================================
// EXERCISE CARD SUBCOMPONENT
// ===========================================

interface ExerciseCardProps {
  exercise: WorkoutRow;
  index: number;
}

const ExerciseCard: React.FC<ExerciseCardProps> = ({ exercise, index }) => {
  const hasNotes = exercise.notes && exercise.notes.trim().length > 0;
  const hasVideo = exercise.video && isValidUrl(exercise.video);
  const hasTempo = exercise.tempoRpe && exercise.tempoRpe.trim().length > 0;

  return (
    <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50 transition-all hover:border-slate-600/50">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Index */}
        <div className="
          w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center
          text-sm font-semibold text-slate-300 flex-shrink-0
        ">
          {index}
        </div>

        {/* Exercise Name */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">
              {exercise.exercice}
            </h3>
            {hasVideo && (
              <a
                href={exercise.video}
                target="_blank"
                rel="noopener noreferrer"
                className="
                  p-1 rounded text-blue-400 hover:text-blue-300
                  hover:bg-blue-500/10 transition-colors
                "
                aria-label={`Voir la vidéo de ${exercise.exercice}`}
              >
                <Video className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Metrics */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
            {/* Sets x Reps */}
            {exercise.series && exercise.repsDuree && (
              <span className="flex items-center gap-1">
                <Dumbbell className="w-3.5 h-3.5" />
                {exercise.series}×{exercise.repsDuree}
              </span>
            )}

            {/* Rest */}
            {exercise.repos && (
              <span className="flex items-center gap-1">
                <Timer className="w-3.5 h-3.5" />
                Repos {formatRest(exercise.repos)}
              </span>
            )}

            {/* Tempo */}
            {hasTempo && (
              <span className="flex items-center gap-1 text-blue-400">
                <ChevronRight className="w-3.5 h-3.5" />
                {exercise.tempoRpe}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Notes */}
      {hasNotes && (
        <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-200/80 leading-relaxed">
              {exercise.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionPreviewModal;
