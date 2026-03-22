import React from 'react';
import { Gauge, ChevronUp, ChevronDown, Check } from 'lucide-react';
import { RpeBadge } from '../common/RpeSelector';
import { getRpeColor, getRpeBgColor, SessionLog, ExerciseLog } from '../../../types';

// ============================================================
// SECTION : Statistiques RPE de l'athlète
// ============================================================

interface RpeStatsProps {
  history: SessionLog[];
}

export const AthleteRpeStats: React.FC<RpeStatsProps> = ({ history }) => {
  // Calculer les stats RPE des 30 derniers jours
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentSessions = history.filter(h => new Date(h.date) >= thirtyDaysAgo);
  const sessionsWithRpe = recentSessions.filter(h => h.sessionRpe !== undefined);
  
  if (sessionsWithRpe.length === 0) {
    return null;
  }

  const avgRpe = sessionsWithRpe.reduce((acc, h) => acc + (h.sessionRpe || 0), 0) / sessionsWithRpe.length;
  const roundedAvgRpe = Math.round(avgRpe * 10) / 10;
  
  // Tendance RPE (comparer les 15 premiers jours vs les 15 derniers)
  const midPoint = new Date();
  midPoint.setDate(midPoint.getDate() - 15);
  
  const firstHalf = sessionsWithRpe.filter(h => new Date(h.date) < midPoint && new Date(h.date) >= thirtyDaysAgo);
  const secondHalf = sessionsWithRpe.filter(h => new Date(h.date) >= midPoint);
  
  const firstAvg = firstHalf.length > 0 
    ? firstHalf.reduce((acc, h) => acc + (h.sessionRpe || 0), 0) / firstHalf.length 
    : null;
  const secondAvg = secondHalf.length > 0 
    ? secondHalf.reduce((acc, h) => acc + (h.sessionRpe || 0), 0) / secondHalf.length 
    : null;

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (firstAvg !== null && secondAvg !== null) {
    const diff = secondAvg - firstAvg;
    if (diff > 0.5) trend = 'up';
    else if (diff < -0.5) trend = 'down';
  }

  return (
    <div className="bg-theme-secondary/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Gauge className="w-5 h-5 text-orange-400" />
        <h4 className="font-medium text-theme">Effort ressenti (RPE)</h4>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div>
          <span className="text-xs text-theme-muted block mb-1">Moyenne 30j</span>
          <div className="flex items-baseline gap-1">
            <span className={`text-2xl font-bold ${getRpeColor(Math.round(roundedAvgRpe))}`}>
              {roundedAvgRpe}
            </span>
            <span className="text-sm text-theme-muted">/10</span>
          </div>
        </div>
        
        <div>
          <span className="text-xs text-theme-muted block mb-1">Séances notées</span>
          <span className="text-xl font-bold text-theme">
            {sessionsWithRpe.length}/{recentSessions.length}
          </span>
        </div>
        
        <div>
          <span className="text-xs text-theme-muted block mb-1">Tendance</span>
          <div className="flex items-center gap-1">
            {trend === 'up' && (
              <>
                <span className="text-orange-400">↑</span>
                <span className="text-sm text-orange-400">En hausse</span>
              </>
            )}
            {trend === 'down' && (
              <>
                <span className="text-green-400">↓</span>
                <span className="text-sm text-green-400">En baisse</span>
              </>
            )}
            {trend === 'stable' && (
              <>
                <span className="text-blue-400">→</span>
                <span className="text-sm text-blue-400">Stable</span>
              </>
            )}
          </div>
        </div>
      </div>
      
      {/* Alerte si RPE trop élevé */}
      {roundedAvgRpe >= 8 && (
        <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400">
            ⚠️ RPE moyen élevé - Surveiller les signes de surmenage
          </p>
        </div>
      )}
    </div>
  );
};

// Section header de la séance
export const SessionHeaderWithRpe: React.FC<{ log: SessionLog; isExpanded: boolean; onToggle: () => void }> = ({
  log,
  isExpanded,
  onToggle
}) => {
  const date = new Date(log.date);
  const totalSets = log.exercises.reduce((acc, ex) => acc + (ex.sets?.length || 0), 0);
  const completedSets = log.exercises.reduce((acc, ex) => 
    acc + (ex.sets?.filter(s => s.completed).length || 0)
  , 0);
  const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

  return (
    <button
      onClick={onToggle}
      className="w-full p-4 flex items-center justify-between text-left hover:bg-theme-tertiary/30 transition-colors"
    >
      <div className="flex items-center gap-4">
        <div className="text-center min-w-[50px]">
          <span className="block text-xl font-bold text-theme">{date.getDate()}</span>
          <span className="text-xs text-theme-muted uppercase">
            {date.toLocaleDateString('fr-FR', { month: 'short' })}
          </span>
        </div>
        
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-theme">
              {log.sessionKey.seance}
            </h3>
            {log.sessionRpe && (
              <RpeBadge rpe={log.sessionRpe} size="sm" showLabel={false} />
            )}
          </div>
          <div className="flex items-center gap-2 text-sm text-theme-muted mt-0.5">
            <span>{log.exercises.length} exos</span>
            <span>•</span>
            <span>{completedSets}/{totalSets} séries</span>
            {log.durationMinutes && (
              <>
                <span>•</span>
                <span>{log.durationMinutes}min</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2">
          <div className="w-24 h-2 bg-theme-tertiary rounded-full overflow-hidden">
            <div 
              className={`h-full transition-all ${
                progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${
            progress === 100 ? 'text-emerald-400' : 'text-theme-muted'
          }`}>
            {Math.round(progress)}%
          </span>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-5 h-5 text-theme-muted" />
        ) : (
          <ChevronDown className="w-5 h-5 text-theme-muted" />
        )}
      </div>
    </button>
  );
};

// Section détails de l'exercice avec RPE
export const ExerciseDetailWithRpe: React.FC<{ exercise: ExerciseLog; index: number }> = ({
  exercise,
  index
}) => {
  const exerciseCompleted = exercise.sets.filter(s => s.completed).length;
  const exerciseTotal = exercise.sets.length;
  
  return (
    <div className="bg-theme-secondary border border-theme rounded-xl p-4 mb-3 last:mb-0">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-theme">{exercise.exerciseName}</h4>
        <div className="flex items-center gap-2">
          {exercise.rpe && (
            <RpeBadge rpe={exercise.rpe} size="sm" showLabel={false} />
          )}
          <span className={`text-xs px-2 py-1 rounded-full ${
            exerciseCompleted === exerciseTotal 
              ? 'bg-emerald-500/20 text-emerald-400' 
              : 'bg-theme-tertiary text-theme-muted'
          }`}>
            {exerciseCompleted}/{exerciseTotal} séries
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2 text-xs font-medium text-theme-muted uppercase tracking-wider px-2">
          <div>Série</div>
          <div>Reps</div>
          <div>Poids</div>
          <div className="text-center">✓</div>
        </div>

        {exercise.sets.map((set, setIdx) => (
          <div 
            key={setIdx}
            className={`grid grid-cols-4 gap-2 items-center p-2 rounded-lg ${
              set.completed 
                ? 'bg-emerald-500/10' 
                : 'bg-theme-secondary/50'
            }`}
          >
            <span className="text-sm text-theme-muted">#{set.setNumber}</span>
            <span className="text-sm text-theme font-medium">{set.reps || '—'}</span>
            <span className="text-sm text-theme">{set.weight ? `${set.weight}kg` : '—'}</span>
            <div className="flex justify-center">
              {set.completed ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <span className="w-4 h-4 rounded-full border border-theme" />
              )}
            </div>
          </div>
        ))}
      </div>

      {exercise.notes && (
        <p className="mt-3 text-sm text-theme-muted italic border-t border-theme pt-3">
          {exercise.notes}
        </p>
      )}
    </div>
  );
};
