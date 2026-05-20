// ============================================================
// F.Y.T - SUPERSET EXERCISE BLOCK
// Bloc d'exercice superset pour la session active (mode saisie)
// Affiche plusieurs exercices avec inputs synchronisés
// ============================================================

import React, { useState, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  RotateCcw,
  MessageSquare,
  Send,
  Video,
  Link2,
  Plus
} from 'lucide-react';
import {
  ExerciseLog,
  ExerciseLogGroup,
  SetLog,
  SetLoad,
  RPE_SCALE,
  WorkoutRow,
  EXECUTION_MODES,
  ExecutionMode
} from '../../../types.ts';
import { RpeSelector, RpeBadge } from './RpeSelector';
import { WeightInput } from './WeightInput';

// ===========================================
// TYPES
// ===========================================

interface Props {
  group: ExerciseLogGroup;
  /** Index des exercices originaux dans logs[] - pour chaque exercice du groupe */
  exerciseIndexes: number[];
  /** Données du programme pour chaque exercice */
  exercisesData: (WorkoutRow | undefined)[];
  /** Index de série actuellement affiché (synchronisé pour le groupe) */
  currentSetIndex: number;
  /** Callback pour changer l'index de série */
  onSetIndexChange: (newIndex: number) => void;
  /** Callback pour mettre à jour une série */
  onUpdateSet: (exerciseIndex: number, setIndex: number, field: 'reps' | 'weight', value: string) => void;
  /** Callback pour mettre à jour le load d'une série */
  onUpdateSetLoad: (exerciseIndex: number, setIndex: number, load: SetLoad) => void;
  /** Callback pour changer le type de charge */
  onCycleLoadType: (exerciseIndex: number, setIndex: number) => void;
  /** Callback pour valider la série (tous les exercices du groupe) */
  onValidateSet: () => void;
  /** Callback pour mettre à jour le RPE du groupe */
  onUpdateRpe: (rpe: number | undefined) => void;
  /** RPE actuel du groupe */
  groupRpe?: number;
  /** Callback pour afficher le modal d'info superset */
  onShowSupersetInfo: (e: React.MouseEvent<HTMLElement>) => void;
  /** Callback pour afficher l'historique d'un exercice */
  onShowHistory?: (exerciseIndex: number, anchorEl: HTMLElement) => void;
  /** Callback pour afficher les consignes d'un exercice */
  onShowConsignes?: (exerciseIndex: number, anchorEl: HTMLElement) => void;
  /** Callback pour afficher la vidéo d'un exercice */
  onShowVideo?: (url: string, exerciseName: string, anchorEl: HTMLElement) => void;
  /** Est-ce que le bloc est expanded (ouvert) */
  isExpanded: boolean;
  /** Callback pour toggle l'expansion */
  onToggleExpanded: () => void;
  /** Est-ce qu'on est en mode desktop */
  isDesktop?: boolean;
  /** Surligner le RPE */
  highlightRpe?: boolean;
  /** Commentaire actuel pour le groupe */
  comment?: string;
  /** Callback pour changer le commentaire */
  onCommentChange?: (comment: string) => void;
  /** Callback pour envoyer le commentaire */
  onSendComment?: () => void;
  /** Est-ce que l'envoi de commentaire est en cours */
  commentSending?: boolean;
  /** Est-ce que le commentaire a été envoyé */
  commentSent?: boolean;
}

// ===========================================
// HELPERS
// ===========================================

function parseKgLikeToNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const m = trimmed.replace(',', '.').match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function getLoadTotalKg(load: SetLoad | undefined): number | null {
  if (!load) return null;
  if (load.type === 'single' || load.type === 'machine') {
    return typeof load.weightKg === 'number' ? load.weightKg : null;
  }
  if (load.type === 'double') {
    return typeof load.weightKg === 'number' ? load.weightKg * 2 : null;
  }
  if (load.type === 'barbell') {
    const added = typeof load.addedKg === 'number' ? load.addedKg : null;
    if (typeof load.barKg !== 'number') return null;
    if (added === null) return null;
    return load.barKg + added;
  }
  if (load.type === 'assisted') {
    return typeof load.assistanceKg === 'number' ? -load.assistanceKg : null;
  }
  return null;
}

// ===========================================
// COMPONENT
// ===========================================

export const SupersetExerciseBlock: React.FC<Props> = ({
  group,
  exerciseIndexes,
  exercisesData,
  currentSetIndex,
  onSetIndexChange,
  onUpdateSet,
  onUpdateSetLoad,
  onCycleLoadType,
  onValidateSet,
  onUpdateRpe,
  groupRpe,
  onShowSupersetInfo,
  onShowHistory,
  onShowConsignes,
  onShowVideo,
  isExpanded,
  onToggleExpanded,
  isDesktop = false,
  highlightRpe = false,
  comment = '',
  onCommentChange,
  onSendComment,
  commentSending = false,
  commentSent = false
}) => {
  const modeInfo = EXECUTION_MODES[group.executionMode];

  // Vérifier si toutes les séries du groupe sont complétées pour cette série
  const allSetsCompletedForCurrentSet = group.exercises.every(ex => {
    const set = ex.sets[currentSetIndex];
    return set?.completed;
  });

  // Vérifier si toutes les séries de tous les exercices sont complétées
  const allSetsCompletedForGroup = group.exercises.every(ex =>
    ex.sets.every(s => s.completed)
  );

  // Vérifier si le groupe est terminé (toutes séries + RPE)
  const isGroupDone = allSetsCompletedForGroup && typeof groupRpe === 'number';

  // Nombre total de séries (on prend le premier exercice comme référence)
  const totalSets = group.exercises[0]?.sets.length || 0;

  // Vérifier si on peut valider la série courante
  const canValidateCurrentSet = group.exercises.every(ex => {
    const set = ex.sets[currentSetIndex];
    if (!set || set.completed) return true; // Déjà validé
    const hasReps = set.reps && set.reps !== '';
    const hasWeight = getLoadTotalKg(set.load) !== null ||
      (set.weight && set.weight !== '' && set.weight !== '-');
    return hasReps && hasWeight;
  });

  // ===========================================
  // RENDER - RECTO (minimisé)
  // ===========================================

  const renderRecto = () => (
    <button
      onClick={onToggleExpanded}
      className="w-full h-full p-4 flex flex-col text-left"
      type="button"
    >
      {/* Noms des exercices empilés */}
      <div className="flex-1">
        {group.exercises.map((ex, idx) => (
          <React.Fragment key={ex.exerciseName}>
            {idx > 0 && (
              <div className="flex items-center justify-center my-1">
                <Plus className="w-3 h-3 text-[var(--color-primary)]" />
              </div>
            )}
            <h3 className="font-bold text-theme text-lg leading-tight line-clamp-2">
              {ex.exerciseName}
            </h3>
          </React.Fragment>
        ))}
      </div>

      {/* Badges */}
      <div className="flex flex-wrap gap-2 mt-3">
        <span className="px-3 py-1.5 border border-[var(--color-success)]/40 text-[var(--color-success)] rounded-lg text-sm font-semibold">
          {totalSets}× série
        </span>
        {exercisesData[0]?.repos && (
          <span className="px-3 py-1.5 border border-theme text-theme-muted rounded-lg text-sm">
            {exercisesData[0].repos}s
          </span>
        )}
        {/* Badge superset */}
        <button
          onClick={(e) => { e.stopPropagation(); onShowSupersetInfo(e); }}
          className="p-1.5 border border-[var(--color-primary)]/40 text-[var(--color-primary)] rounded-lg hover:bg-[var(--color-primary)]/10 transition-colors"
          type="button"
          title={modeInfo.label}
        >
          <Link2 className="w-4 h-4" />
        </button>
      </div>

      {/* Progression séries */}
      <div className="mt-3">
        <div className="flex items-center gap-1">
          {Array.from({ length: totalSets }).map((_, i) => {
            const isCompleted = group.exercises.every(ex => ex.sets[i]?.completed);
            return (
              <div
                key={i}
                className={`flex-1 h-2 rounded-full ${isCompleted ? 'bg-[var(--color-success)]' : 'bg-theme-tertiary'}`}
              />
            );
          })}
        </div>
        <div className="text-sm text-theme-muted mt-1.5 text-center">
          {group.exercises[0]?.sets.filter(s => s.completed).length || 0}/{totalSets} séries
        </div>
      </div>
    </button>
  );

  // ===========================================
  // RENDER - VERSO (expanded avec inputs)
  // ===========================================

  const renderVerso = () => {
    const currentSets = group.exercises.map(ex => ex.sets[currentSetIndex]);

    return (
      <div
        className="w-full h-full p-3 flex flex-col"
        onClick={onToggleExpanded}
      >
        {/* Header: noms des exercices + icône superset */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            {group.exercises.map((ex, idx) => (
              <React.Fragment key={ex.exerciseName}>
                {idx > 0 && (
                  <div className="flex items-center my-0.5">
                    <Plus className="w-2.5 h-2.5 text-[var(--color-primary)]" />
                  </div>
                )}
                <h3 className="font-semibold text-theme text-sm leading-tight truncate">
                  {ex.exerciseName}
                </h3>
              </React.Fragment>
            ))}
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onShowSupersetInfo(e); }}
            className="p-1.5 border border-[var(--color-primary)]/40 text-[var(--color-primary)] rounded-lg flex-shrink-0"
            type="button"
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zone inputs */}
        <div className="flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
          {/* Navigation séries */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <button
              onClick={() => onSetIndexChange(Math.max(currentSetIndex - 1, 0))}
              disabled={currentSetIndex === 0}
              className="p-1 bg-theme-tertiary hover:bg-theme-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
              type="button"
            >
              <ChevronLeft className="w-4 h-4 text-theme-secondary" />
            </button>
            <span className="text-sm text-theme-secondary min-w-[3rem] text-center font-medium">
              {currentSetIndex + 1}/{totalSets}
            </span>
            <button
              onClick={() => onSetIndexChange(Math.min(currentSetIndex + 1, totalSets - 1))}
              disabled={currentSetIndex === totalSets - 1}
              className="p-1 bg-theme-tertiary hover:bg-theme-secondary disabled:opacity-30 disabled:cursor-not-allowed rounded transition-colors"
              type="button"
            >
              <ChevronRight className="w-4 h-4 text-theme-secondary" />
            </button>
          </div>

          {/* Inputs pour chaque exercice du superset */}
          <div className="space-y-3 flex-1">
            {group.exercises.map((exercise, exIdx) => {
              const set = currentSets[exIdx];
              const exerciseIndex = exerciseIndexes[exIdx];
              const exerciseData = exercisesData[exIdx];

              if (!set) return null;

              return (
                <div
                  key={exercise.exerciseName}
                  className={`p-2 rounded-lg border ${set.completed ? 'border-[var(--color-success)]/50 bg-[var(--color-success)]/5' : 'border-theme bg-theme-tertiary/50'}`}
                >
                  {/* Nom de l'exercice */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium text-theme truncate">{exercise.exerciseName}</span>
                    {set.completed && <Check className="w-3.5 h-3.5 text-[var(--color-success)]" />}
                  </div>

                  {/* Inputs Reps + Charge */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* Reps */}
                    <div>
                      <label className="text-[9px] text-theme-muted mb-0.5 block">Reps</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder={exerciseData?.repsDuree?.replace(/[^0-9]/g, '') || '8'}
                        value={set.reps}
                        onChange={(e) => onUpdateSet(exerciseIndex, currentSetIndex, 'reps', e.target.value)}
                        disabled={set.completed}
                        className="w-full bg-theme-tertiary border border-theme rounded px-2 py-1.5 text-theme text-center text-base font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
                      />
                    </div>

                    {/* Charge */}
                    <div>
                      <div className="flex items-center justify-between mb-0.5">
                        <label className="text-[9px] text-theme-muted">Charge</label>
                        <button
                          onClick={() => onCycleLoadType(exerciseIndex, currentSetIndex)}
                          disabled={set.completed}
                          className="p-0.5 text-theme-muted hover:text-theme-secondary transition-colors disabled:opacity-50"
                          type="button"
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                        </button>
                      </div>
                      {renderChargeInput(set, exerciseIndex)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bandeau bas: RPE + Message + Valider */}
          <div className="mt-3 pt-2 border-t border-theme/50 space-y-2">
            {/* RPE pour le groupe */}
            {allSetsCompletedForGroup && (
              <div className={`p-2 rounded-lg ${highlightRpe ? 'ring-2 ring-[var(--color-primary)] animate-pulse' : ''}`}>
                <label className="text-xs text-theme-muted mb-1 block">RPE du groupe</label>
                <div className="flex flex-wrap gap-1">
                  {RPE_SCALE.map(({ value, color }) => (
                    <button
                      key={value}
                      onClick={() => onUpdateRpe(groupRpe === value ? undefined : value)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        groupRpe === value
                          ? `${color} text-white ring-2 ring-offset-1 ring-offset-theme-secondary`
                          : 'bg-theme-tertiary text-theme-muted hover:bg-theme-secondary'
                      }`}
                      type="button"
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Message */}
            {onCommentChange && (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Message au coach..."
                  value={comment}
                  onChange={(e) => onCommentChange(e.target.value)}
                  className="flex-1 bg-theme-tertiary border border-theme rounded-lg px-3 py-1.5 text-sm text-theme placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                />
                <button
                  onClick={onSendComment}
                  disabled={!comment.trim() || commentSending}
                  className={`p-2 rounded-lg transition-colors ${
                    commentSent
                      ? 'bg-[var(--color-success)] text-white'
                      : 'bg-[var(--color-primary)] text-white hover:opacity-90 disabled:opacity-50'
                  }`}
                  type="button"
                >
                  {commentSent ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            )}

            {/* Bouton Valider */}
            {!allSetsCompletedForCurrentSet && (
              <button
                onClick={onValidateSet}
                disabled={!canValidateCurrentSet}
                className={`w-full py-2.5 rounded-xl font-semibold transition-all ${
                  canValidateCurrentSet
                    ? 'bg-[var(--color-success)] text-white hover:opacity-90'
                    : 'bg-theme-tertiary text-theme-muted cursor-not-allowed'
                }`}
                type="button"
              >
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Valider la série
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ===========================================
  // RENDER - INPUT CHARGE
  // ===========================================

  const renderChargeInput = (set: SetLog, exerciseIndex: number) => {
    const isCompleted = set.completed;

    if (set.load?.type === 'barbell') {
      return (
        <div className="flex gap-1">
          <WeightInput
            value={Number.isFinite(set.load.barKg) ? set.load.barKg : null}
            onChange={(n) => {
              const prev = set.load as Extract<SetLoad, { type: 'barbell' }>;
              onUpdateSetLoad(exerciseIndex, currentSetIndex, {
                type: 'barbell',
                unit: 'kg',
                barKg: n ?? 20,
                addedKg: typeof prev.addedKg === 'number' ? prev.addedKg : null,
              });
            }}
            placeholder="20"
            disabled={isCompleted}
            className="flex-1 min-w-0 bg-theme-tertiary border border-theme rounded px-1 py-1.5 text-theme text-center text-sm font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
          />
          <WeightInput
            value={typeof set.load.addedKg === 'number' ? set.load.addedKg : null}
            onChange={(n) => {
              const prev = set.load as Extract<SetLoad, { type: 'barbell' }>;
              onUpdateSetLoad(exerciseIndex, currentSetIndex, {
                type: 'barbell',
                unit: 'kg',
                barKg: prev.barKg,
                addedKg: n,
              });
            }}
            placeholder="+0"
            disabled={isCompleted}
            className="flex-1 min-w-0 bg-theme-tertiary border border-theme rounded px-1 py-1.5 text-theme text-center text-sm font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
          />
        </div>
      );
    }

    // Autres types de charge (single, double, machine, assisted, distance)
    const getNumericValue = (): number | null => {
      const load = set.load;
      if (!load) return null;
      if (load.type === 'single' || load.type === 'double' || load.type === 'machine') {
        return typeof load.weightKg === 'number' ? load.weightKg : null;
      }
      if (load.type === 'assisted') {
        return typeof load.assistanceKg === 'number' ? load.assistanceKg : null;
      }
      if (load.type === 'distance') {
        return typeof load.distanceValue === 'number' ? load.distanceValue : null;
      }
      return null;
    };

    const handleNumericChange = (n: number | null) => {
      const type = set.load?.type || 'single';
      if (type === 'assisted') {
        onUpdateSetLoad(exerciseIndex, currentSetIndex, {
          type: 'assisted',
          unit: 'kg',
          assistanceKg: n,
        });
      } else if (type === 'distance') {
        const prev = set.load as Extract<SetLoad, { type: 'distance' }>;
        onUpdateSetLoad(exerciseIndex, currentSetIndex, {
          type: 'distance',
          unit: prev?.unit || 'cm',
          distanceValue: n,
        });
      } else {
        const t = type as 'single' | 'double' | 'machine';
        onUpdateSetLoad(exerciseIndex, currentSetIndex, {
          type: t,
          unit: 'kg',
          weightKg: n,
        } as SetLoad);
      }
    };

    return (
      <WeightInput
        value={getNumericValue()}
        onChange={handleNumericChange}
        placeholder="0"
        disabled={isCompleted}
        className="w-full bg-theme-tertiary border border-theme rounded px-2 py-1.5 text-theme text-center text-base font-bold placeholder:text-theme-muted focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)] disabled:opacity-50"
      />
    );
  };

  // ===========================================
  // RENDER - MAIN
  // ===========================================

  return (
    <div className="relative">
      {/* Indicateurs done/RPE */}
      {isGroupDone && (
        <div className="absolute top-2 right-2 z-20 flex items-center gap-1.5 pointer-events-none">
          <div className="w-6 h-6 flex items-center justify-center rounded-full bg-[var(--color-success)] text-white shadow-lg">
            <Check className="w-4 h-4" />
          </div>
          {typeof groupRpe === 'number' && (
            <div className={`w-6 h-6 flex items-center justify-center rounded-lg text-white font-bold shadow-lg text-xs ${RPE_SCALE.find(r => r.value === groupRpe)?.color || 'bg-theme-tertiary'}`}>
              {groupRpe}
            </div>
          )}
        </div>
      )}

      <div
        className={`
          w-full aspect-square bg-theme-tertiary border rounded-xl overflow-hidden flex flex-col transition-all
          ${isGroupDone ? 'border-[var(--color-success)]/50 bg-[var(--color-success)]/10' : 'border-[var(--color-primary)]/30'}
          ${isExpanded ? 'ring-2 ring-[var(--color-primary)]' : 'hover:bg-theme-tertiary/70'}
        `}
      >
        {!isExpanded ? renderRecto() : renderVerso()}
      </div>
    </div>
  );
};

export default SupersetExerciseBlock;
