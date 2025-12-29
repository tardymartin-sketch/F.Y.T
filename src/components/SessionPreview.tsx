import React, { useState } from 'react';
import { WorkoutRow } from '../../types';
import { Video, AlertCircle, ChevronDown } from 'lucide-react';

interface Props {
  exercises: WorkoutRow[];
  selectedOrder: string[];
}

export const SessionPreview: React.FC<Props> = ({ exercises, selectedOrder }) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const sortedExercises = [...exercises].sort((a, b) => {
    const sessionIndexA = selectedOrder.indexOf(a.seance);
    const sessionIndexB = selectedOrder.indexOf(b.seance);
    
    if (sessionIndexA !== sessionIndexB) {
      return sessionIndexA - sessionIndexB;
    }
    return a.ordre - b.ordre;
  });

  const isValidUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  };

  const isMultiSession = selectedOrder.length > 1;

  const toggleNotes = (idx: number) => {
    setExpandedNotes(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const buildMetricsString = (exercise: WorkoutRow): string => {
    const parts: string[] = [];
    if (exercise.series && exercise.repsDuree) {
      parts.push(`${exercise.series}×${exercise.repsDuree}`);
    }
    if (exercise.repos) {
      parts.push(`${exercise.repos}s repos`);
    }
    if (exercise.tempoRpe) {
      parts.push(exercise.tempoRpe);
    }
    return parts.join(' • ');
  };

  let currentSession = '';

  return (
    <div className="space-y-2">
      {sortedExercises.map((exercise, idx) => {
        const showSessionHeader = isMultiSession && exercise.seance !== currentSession;
        currentSession = exercise.seance;
        
        const hasNotes = exercise.notes && exercise.notes.trim().length > 0;
        const hasVideo = exercise.video && isValidUrl(exercise.video);
        const isNotesExpanded = expandedNotes.has(idx);

        return (
          <div key={`${exercise.id}-${idx}`}>
            {showSessionHeader && (
              <div className="bg-blue-600/20 text-blue-400 text-sm font-semibold px-3 py-2 rounded-lg mb-2 mt-4 first:mt-0">
                {exercise.seance}
              </div>
            )}
            
            <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/50">
              {/* Exercise Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-medium">#{exercise.ordre}</span>
                    <h4 className="font-medium text-white truncate">{exercise.exercice}</h4>
                    {hasVideo && (
                      <a
                        href={exercise.video}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                        title="Voir la vidéo"
                      >
                        <Video className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                  
                  {/* Metrics */}
                  <p className="text-sm text-slate-400 mt-1">
                    {buildMetricsString(exercise)}
                  </p>
                </div>
              </div>

              {/* Notes */}
              {hasNotes && (
                <div className="mt-2">
                  <button
                    onClick={() => toggleNotes(idx)}
                    className="flex items-center gap-1 text-xs text-amber-400 hover:text-amber-300 transition-colors"
                  >
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Notes</span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isNotesExpanded ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isNotesExpanded && (
                    <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-200/80">
                      {exercise.notes}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default SessionPreview;
