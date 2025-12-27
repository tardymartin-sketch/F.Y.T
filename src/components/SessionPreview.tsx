import React, { useState } from 'react';
import { WorkoutRow } from '../../types';
import { Video, AlertCircle, ChevronDown } from 'lucide-react';

interface Props {
  exercises: WorkoutRow[];
  selectedOrder: string[];
}

export const SessionPreview: React.FC<Props> = ({ exercises, selectedOrder }) => {
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  // Tri par ordre de sélection puis par ordre dans la session
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

  // Build compact metrics string
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
    return parts.join(' · ');
  };

  return (
    <div className="space-y-2 sm:space-y-3">
      {sortedExercises.map((exercise, idx) => {
        const hasVideo = exercise.video && isValidUrl(exercise.video);
        const metricsString = buildMetricsString(exercise);
        const isNotesExpanded = expandedNotes.has(idx);
        
        return (
          <div 
            key={`${exercise.seance}-${exercise.ordre}-${idx}`}
            className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-lg sm:rounded-xl p-3 sm:p-4 transition-all duration-200"
          >
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Numéro d'ordre - compact */}
              <div className="flex flex-col items-center gap-0.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-slate-700 group-hover:bg-blue-600/20 rounded-lg flex items-center justify-center transition-colors">
                  <span className="text-xs sm:text-sm font-bold text-slate-300 group-hover:text-blue-400">
                    {exercise.ordre}
                  </span>
                </div>
                {isMultiSession && (
                  <span className="text-[10px] sm:text-xs text-emerald-500 font-medium">S{exercise.seance}</span>
                )}
              </div>

              {/* Contenu principal */}
              <div className="flex-1 min-w-0">
                {/* Titre + Vidéo sur même ligne */}
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-white text-sm sm:text-base truncate flex-1">
                    {exercise.exercice}
                  </h4>
                  {hasVideo && (
                    <a 
                      href={exercise.video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg flex items-center justify-center transition-colors"
                      title="Voir la démo"
                    >
                      <Video className="w-4 h-4" />
                    </a>
                  )}
                </div>
                
                {/* Métriques sur une ligne */}
                <p className="text-xs sm:text-sm text-slate-400">
                  <span className="text-blue-400">{exercise.series}×{exercise.repsDuree}</span>
                  {exercise.repos && (
                    <span className="text-slate-500"> · <span className="text-purple-400">{exercise.repos}s</span> repos</span>
                  )}
                  {exercise.tempoRpe && (
                    <span className="text-slate-500"> · <span className="text-orange-400">{exercise.tempoRpe}</span></span>
                  )}
                </p>

                {/* Notes du coach - collapsible on mobile */}
                {exercise.notes && (
                  <button 
                    onClick={() => toggleNotes(idx)}
                    className="mt-2 w-full text-left"
                  >
                    <div className={`flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-2 py-1.5 sm:px-3 sm:py-2 transition-all ${isNotesExpanded ? '' : 'sm:cursor-default'}`}>
                      <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                      <p className={`text-xs sm:text-sm text-yellow-200/80 flex-1 ${isNotesExpanded ? '' : 'line-clamp-1 sm:line-clamp-none'}`}>
                        {exercise.notes}
                      </p>
                      <ChevronDown className={`w-3.5 h-3.5 text-yellow-500 flex-shrink-0 sm:hidden transition-transform ${isNotesExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

