import React from 'react';
import { WorkoutRowFull } from '../../types';
import { Clock, Activity, Video, AlertCircle, ExternalLink } from 'lucide-react';

interface Props {
  sessionData: WorkoutRowFull[];
  selectedSessionsOrder: string[];
}

export const SessionView: React.FC<Props> = ({ sessionData, selectedSessionsOrder }) => {
  if (sessionData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-slate-500 bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
        <Activity className="w-12 h-12 mb-3 opacity-20" />
        <p>Sélectionne une ou plusieurs séances pour prévisualiser.</p>
      </div>
    );
  }

  // Tri: d'abord par ordre de sélection de la séance, puis par ordre dans la séance
  const sortedData = [...sessionData].sort((a, b) => {
    const sessionIndexA = selectedSessionsOrder.indexOf(a.seance);
    const sessionIndexB = selectedSessionsOrder.indexOf(b.seance);
    
    if (sessionIndexA !== sessionIndexB) {
      return sessionIndexA - sessionIndexB;
    }
    return a.ordre - b.ordre;
  });

  const sessionInfo = sortedData[0];
  const isMultiSession = selectedSessionsOrder.length > 1;

  const isValidUrl = (urlString: string) => {
    try { 
      const url = new URL(urlString);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch(e) { 
      return false; 
    }
  };

  return (
    <div className="animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-blue-500 mb-1 text-sm font-semibold tracking-wide uppercase">
            <span>{sessionInfo.annee}</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
            <span>{sessionInfo.moisNom}</span>
            <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
            <span>Semaine {sessionInfo.semaine}</span>
          </div>
          <h1 className="text-3xl font-bold text-white">
            {isMultiSession 
              ? `Session Combinée (${selectedSessionsOrder.join(' + ')})` 
              : `Séance ${sessionInfo.seance}`}
          </h1>
          <p className="text-slate-400 mt-1">{sortedData.length} exercices</p>
        </div>
      </div>

      {/* Liste des exercices */}
      <div className="space-y-4">
        {sortedData.map((exercise, idx) => {
          const hasValidVideo = exercise.video && isValidUrl(exercise.video);

          return (
            <div 
              key={`${exercise.seance}-${exercise.ordre}-${idx}`} 
              className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-blue-500/30 transition-all duration-300 relative"
            >
              {/* Badge d'ordre */}
              <div className="absolute top-0 left-0 bg-slate-800 text-slate-400 px-3 py-1 text-xs font-mono border-b border-r border-slate-700 rounded-br-lg group-hover:bg-blue-900/50 group-hover:text-blue-400 transition-colors flex gap-2">
                {isMultiSession && <span className="text-blue-500 font-bold">S{exercise.seance}</span>}
                <span>#{exercise.ordre}</span>
              </div>

              <div className="p-5 pt-8 md:p-6 md:pt-6 flex flex-col md:flex-row gap-6">
                {/* Infos principales */}
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-100 mb-4">{exercise.exercice}</h3>
                  
                  {/* Métriques */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                      <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wider">Séries</span>
                      <span className="font-mono text-lg text-blue-400 font-semibold">{exercise.series || '-'}</span>
                    </div>
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                      <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wider">Reps/Durée</span>
                      <span className="font-mono text-lg text-emerald-400 font-semibold">{exercise.repsDuree || '-'}</span>
                    </div>
                    <div className="bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                      <span className="text-xs text-slate-500 block mb-1 uppercase tracking-wider">Repos</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span className="font-mono text-lg text-slate-300">{exercise.repos || '-'}s</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Infos supplémentaires */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-400">
                    {exercise.tempoRpe && (
                      <div className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full">
                        <Activity className="w-4 h-4 text-orange-400" />
                        <span className="text-slate-300">
                          Tempo/RPE: <span className="text-white font-medium">{exercise.tempoRpe}</span>
                        </span>
                      </div>
                    )}
                    {hasValidVideo && (
                      <a 
                        href={exercise.video} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="flex items-center gap-2 bg-slate-800/50 px-3 py-1.5 rounded-full hover:bg-blue-900/20 hover:text-blue-400 transition-colors"
                      >
                        <Video className="w-4 h-4" />
                        <span>Voir la démo</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Notes / Feedback */}
                {(exercise.notes || exercise.retour) && (
                  <div className="md:w-1/3 border-l border-slate-800 pl-6 border-dashed flex flex-col gap-4">
                    {exercise.notes && (
                      <div className="bg-yellow-900/10 border border-yellow-900/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase mb-1">
                          <AlertCircle className="w-3 h-3" />
                          Notes Coach
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{exercise.notes}</p>
                      </div>
                    )}
                    {exercise.retour && (
                      <div className="bg-purple-900/10 border border-purple-900/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase mb-1">
                          💬 Feedback
                        </div>
                        <p className="text-sm text-slate-300 italic">"{exercise.retour}"</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
