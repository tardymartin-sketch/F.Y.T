import React from 'react';
import { WorkoutRow } from '../../types';
import { Clock, Video, ExternalLink, AlertCircle, Hash } from 'lucide-react';

interface Props {
  exercises: WorkoutRow[];
  selectedOrder: string[];
}

export const SessionPreview: React.FC<Props> = ({ exercises, selectedOrder }) => {
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

  return (
    <div className="space-y-4">
      {sortedExercises.map((exercise, idx) => {
        const hasVideo = exercise.video && isValidUrl(exercise.video);
        
        return (
          <div 
            key={`${exercise.seance}-${exercise.ordre}-${idx}`}
            className="group bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 hover:border-slate-600 rounded-xl p-4 transition-all duration-200"
          >
            <div className="flex items-start gap-4">
              {/* Numéro d'ordre */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-10 h-10 bg-slate-700 group-hover:bg-blue-600/20 rounded-lg flex items-center justify-center transition-colors">
                  <span className="text-sm font-bold text-slate-300 group-hover:text-blue-400">
                    {exercise.ordre}
                  </span>
                </div>
                {isMultiSession && (
                  <span className="text-xs text-emerald-500 font-medium">S{exercise.seance}</span>
                )}
              </div>

              {/* Contenu principal */}
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-white text-lg mb-2 truncate">
                  {exercise.exercice}
                </h4>
                
                {/* Métriques */}
                <div className="flex flex-wrap gap-3 mb-3">
                  <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg">
                    <Hash className="w-3.5 h-3.5 text-blue-400" />
                    <span className="text-sm text-slate-300">
                      <span className="text-blue-400 font-medium">{exercise.series}</span> séries
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg">
                    <span className="text-sm text-slate-300">
                      <span className="text-emerald-400 font-medium">{exercise.repsDuree}</span> reps
                    </span>
                  </div>
                  
                  {exercise.repos && (
                    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span className="text-sm text-slate-300">
                        <span className="text-purple-400 font-medium">{exercise.repos}s</span> repos
                      </span>
                    </div>
                  )}

                  {exercise.tempoRpe && (
                    <div className="flex items-center gap-2 bg-slate-900/50 px-3 py-1.5 rounded-lg">
                      <span className="text-sm text-slate-300">
                        <span className="text-orange-400 font-medium">{exercise.tempoRpe}</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Notes du coach */}
                {exercise.notes && (
                  <div className="flex items-start gap-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                    <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-200/80">{exercise.notes}</p>
                  </div>
                )}
              </div>

              {/* Bouton vidéo */}
              {hasVideo && (
                <a 
                  href={exercise.video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-4 py-2 rounded-lg transition-colors flex-shrink-0"
                >
                  <Video className="w-4 h-4" />
                  <span className="text-sm font-medium hidden sm:inline">Démo</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

