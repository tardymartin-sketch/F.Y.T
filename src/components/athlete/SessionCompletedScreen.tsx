// ============================================================
// F.Y.T - SESSION COMPLETED SCREEN
// src/components/athlete/SessionCompletedScreen.tsx
// Écran de félicitations après une séance terminée
// ============================================================

import React, { useMemo } from 'react';
import { SessionLog, SetLoad } from '../../../types';
import { Card, CardContent } from '../shared/Card';
import {
  Trophy,
  Clock,
  Dumbbell,
  TrendingUp,
  Home,
  Share2,
  Flame
} from 'lucide-react';
import { RpeBadge } from '../RpeSelector';

// ===========================================
// TYPES
// ===========================================

interface Props {
  sessionLog: SessionLog;
  onGoHome: () => void;
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}min`;
}

function calculateTotalVolume(exercises: SessionLog['exercises']): number {
  const getLoadTotalKg = (load: SetLoad | undefined): number | null => {
    if (!load) return null;
    if (load.type === 'single' || load.type === 'machine') {
      return typeof load.weightKg === 'number' ? load.weightKg : null;
    }
    if (load.type === 'double') {
      return typeof load.weightKg === 'number' ? load.weightKg * 2 : null;
    }
    if (load.type === 'barbell') {
      if (typeof load.barKg !== 'number') return null;
      const added = typeof load.addedKg === 'number' ? load.addedKg : null;
      if (added === null) return null;
      return load.barKg + added;
    }
    if (load.type === 'assisted') {
      // Exercice assisté : retourne une valeur négative pour l'assistance
      return typeof load.assistanceKg === 'number' ? -load.assistanceKg : null;
    }
    if (load.type === 'distance') {
      // Distance n'a pas de poids pour le volume
      return null;
    }
    return null;
  };

  let total = 0;
  exercises.forEach(ex => {
    ex.sets.forEach(set => {
      if (!set.completed || !set.reps) return;

        const reps = parseInt(set.reps) || 0;
        const totalKgFromLoad = getLoadTotalKg(set.load);
        const weight = typeof totalKgFromLoad === 'number'
          ? totalKgFromLoad
          : (set.weight ? (parseFloat(set.weight.replace(/[^0-9.]/g, '')) || 0) : 0);
        total += reps * weight;
    });
  });
  return Math.round(total);
}

function getCompletionRate(exercises: SessionLog['exercises']): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  exercises.forEach(ex => {
    ex.sets.forEach(set => {
      total++;
      if (set.completed) completed++;
    });
  });
  return { completed, total };
}

function getMotivationalMessage(rpe?: number): string {
  if (!rpe) return "Séance enregistrée avec succès !";
  if (rpe <= 3) return "Belle séance de récupération ! 🧘";
  if (rpe <= 5) return "Bon travail, continue comme ça ! 💪";
  if (rpe <= 7) return "Excellent effort aujourd'hui ! 🔥";
  if (rpe <= 9) return "Tu t'es vraiment donné ! 🏆";
  return "Séance légendaire ! Tu as tout donné ! 🎯";
}

// ===========================================
// COMPONENT
// ===========================================

export const SessionCompletedScreen: React.FC<Props> = ({
  sessionLog,
  onGoHome
}) => {
  // ===========================================
  // COMPUTED VALUES
  // ===========================================
  
  const sessionName = useMemo(() => {
    return sessionLog.sessionKey.seance.replace(/\+/g, ' + ');
  }, [sessionLog]);

  const totalVolume = useMemo(() => {
    return calculateTotalVolume(sessionLog.exercises);
  }, [sessionLog]);

  const completion = useMemo(() => {
    return getCompletionRate(sessionLog.exercises);
  }, [sessionLog]);

  const averageExerciseRpe = useMemo(() => {
    const exercisesWithRpe = sessionLog.exercises.filter(ex => ex.rpe !== undefined);
    if (exercisesWithRpe.length === 0) return null;
    const sum = exercisesWithRpe.reduce((acc, ex) => acc + (ex.rpe || 0), 0);
    return Math.round((sum / exercisesWithRpe.length) * 10) / 10;
  }, [sessionLog]);

  const motivationalMessage = useMemo(() => {
    return getMotivationalMessage(sessionLog.sessionRpe);
  }, [sessionLog.sessionRpe]);

  // ===========================================
  // RENDER
  // ===========================================
  
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      {/* Confetti/Celebration Animation (could be enhanced with actual confetti) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-yellow-400 rounded-full animate-ping" style={{ animationDelay: '0s' }} />
        <div className="absolute top-1/3 right-1/4 w-2 h-2 bg-emerald-400 rounded-full animate-ping" style={{ animationDelay: '0.2s' }} />
        <div className="absolute top-1/2 left-1/3 w-2 h-2 bg-blue-400 rounded-full animate-ping" style={{ animationDelay: '0.4s' }} />
        <div className="absolute bottom-1/3 right-1/3 w-2 h-2 bg-purple-400 rounded-full animate-ping" style={{ animationDelay: '0.6s' }} />
      </div>

      {/* Main Content */}
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Trophy Icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full shadow-lg shadow-orange-500/30 mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Bravo ! 🎉</h1>
          <p className="text-slate-400">{motivationalMessage}</p>
        </div>

        {/* Session Summary Card */}
        <Card variant="gradient" className="overflow-hidden">
          <CardContent className="p-0">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 px-4 py-3 border-b border-slate-700/50">
              <h2 className="text-lg font-semibold text-white text-center">
                {sessionName}
              </h2>
            </div>

            {/* Stats Grid */}
            <div className="p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Duration */}
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <Clock className="w-5 h-5 text-blue-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">
                    {formatDuration(sessionLog.durationMinutes || 0)}
                  </p>
                  <p className="text-xs text-slate-400">Durée</p>
                </div>

                {/* Exercises */}
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <Dumbbell className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">
                    {sessionLog.exercises.length}
                  </p>
                  <p className="text-xs text-slate-400">Exercices</p>
                </div>

                {/* Sets Completed */}
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <TrendingUp className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">
                    {completion.completed}/{completion.total}
                  </p>
                  <p className="text-xs text-slate-400">Séries</p>
                </div>

                {/* Volume */}
                <div className="bg-slate-800/50 rounded-xl p-3 text-center">
                  <Flame className="w-5 h-5 text-orange-400 mx-auto mb-1" />
                  <p className="text-xl font-bold text-white">
                    {totalVolume > 1000 
                      ? `${(totalVolume / 1000).toFixed(1)}t`
                      : `${totalVolume}kg`
                    }
                  </p>
                  <p className="text-xs text-slate-400">Volume</p>
                </div>
              </div>

              {/* RPE Section */}
              {sessionLog.sessionRpe && (
                <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400 mb-1">Difficulté ressentie</p>
                    <p className="text-white font-medium">
                      {sessionLog.sessionRpe <= 3 && "Facile"}
                      {sessionLog.sessionRpe > 3 && sessionLog.sessionRpe <= 6 && "Modéré"}
                      {sessionLog.sessionRpe > 6 && sessionLog.sessionRpe <= 8 && "Difficile"}
                      {sessionLog.sessionRpe > 8 && "Très difficile"}
                    </p>
                  </div>
                  <RpeBadge rpe={sessionLog.sessionRpe} size="lg" />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Exercise Summary (collapsed) */}
        <Card variant="default" className="p-4">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Résumé des exercices</h3>
          <div className="space-y-2">
            {sessionLog.exercises.slice(0, 5).map((exercise, index) => {
              const completedSets = exercise.sets.filter(s => s.completed).length;
              return (
                <div key={index} className="flex items-center justify-between py-1">
                  <span className="text-white text-sm truncate flex-1">
                    {exercise.exerciseName}
                  </span>
                  <div className="flex items-center gap-2 ml-2">
                    <span className="text-slate-400 text-sm">
                      {completedSets}/{exercise.sets.length}
                    </span>
                    {exercise.rpe && <RpeBadge rpe={exercise.rpe} size="sm" />}
                  </div>
                </div>
              );
            })}
            {sessionLog.exercises.length > 5 && (
              <p className="text-xs text-slate-500 text-center pt-2">
                +{sessionLog.exercises.length - 5} autres exercices
              </p>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={onGoHome}
            className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-500 hover:to-emerald-500 text-white rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-all active:scale-[0.98]"
          >
            <Home className="w-5 h-5" />
            <span>Retour à l'accueil</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionCompletedScreen;
