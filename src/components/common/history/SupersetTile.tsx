// ============================================================
// F.Y.T - SUPERSET TILE
// src/components/common/history/SupersetTile.tsx
// Tuile pour affichage d'un superset/triset dans l'historique
// Face recto: noms des exercices + séries groupées
// Face verso: graphique tonnage avec 2 courbes superposées
// ============================================================

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ExerciseLog, ExerciseLogGroup, SessionLog, EXECUTION_MODES } from '../../../../types';
import { TrendingUp, X, Timer, Video, Info, Link2, Layers, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';
import { Popover } from '../Popover';
import { VideoModal } from '../VideoModal';
import { SupersetInfoModal } from '../SupersetInfoModal';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

// ===========================================
// TYPES
// ===========================================

interface SupersetTileProps {
  group: ExerciseLogGroup;
  /** Historique complet pour calculer l'évolution du tonnage */
  history?: SessionLog[];
  isHighlighted?: boolean;
  /** Callback pour naviguer vers une date dans l'historique */
  onViewDate?: (date: string) => void;
  /** Temps de récupération commun (ex: "90" pour 90 secondes) */
  repos?: string;
  /** URLs des vidéos par exercice */
  videoUrls?: Record<string, string>;
  /** Layout mode: 'mobile' ou 'desktop' */
  layout?: 'mobile' | 'desktop';
}

interface TonnageDataPoint {
  date: string;
  dateLabel: string;
  [key: string]: number | string | null; // tonnage par exercice + rpe
}

// ===========================================
// CONSTANTS
// ===========================================

const TILE_HEIGHT = 280; // Plus haut que ExerciseTile pour afficher plusieurs exercices
const EXERCISE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']; // Bleu, Vert, Orange, Rouge

// ===========================================
// HELPERS
// ===========================================

function calculateExerciseTonnage(exercise: ExerciseLog): number {
  let totalTonnage = 0;

  exercise.sets.forEach(set => {
    if (!set.completed) return;

    const reps = typeof set.reps === 'number' ? set.reps : parseInt(set.reps) || 0;
    let weight = 0;

    if (set.load) {
      if (set.load.type === 'single' || set.load.type === 'machine') {
        weight = typeof set.load.weightKg === 'number' ? set.load.weightKg : 0;
      } else if (set.load.type === 'double') {
        weight = typeof set.load.weightKg === 'number' ? set.load.weightKg * 2 : 0;
      } else if (set.load.type === 'barbell') {
        const bar = typeof set.load.barKg === 'number' ? set.load.barKg : 20;
        const added = typeof set.load.addedKg === 'number' ? set.load.addedKg : 0;
        weight = bar + added;
      }
    } else if (set.weight) {
      weight = parseFloat(set.weight) || 0;
    }

    totalTonnage += reps * weight;
  });

  return totalTonnage;
}

function formatTonnageCompact(tonnage: number): string {
  if (tonnage >= 1000) {
    return `${(tonnage / 1000).toFixed(1)}T`;
  }
  return `${Math.round(tonnage)}kg`;
}

function getWeightInfo(set: any): { weight: string; type: string } {
  if (!set.load) {
    const w = set.weight || '-';
    return { weight: w === '-' ? '-' : `${w} kg`, type: '' };
  }

  const load = set.load;

  if (load.type === 'single') {
    const w = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (w === null) return { weight: set.weight || '-', type: '' };
    return { weight: `${w}kg`, type: '' };
  }

  if (load.type === 'double') {
    const w = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (w === null) return { weight: set.weight || '-', type: '' };
    return { weight: `2x${w}kg`, type: '' };
  }

  if (load.type === 'barbell') {
    const barKg = typeof load.barKg === 'number' ? load.barKg : 20;
    const addedKg = typeof load.addedKg === 'number' ? load.addedKg : 0;
    const total = barKg + addedKg;
    return { weight: `${total}kg`, type: '' };
  }

  if (load.type === 'machine') {
    const w = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (w === null) return { weight: set.weight || '-', type: '' };
    return { weight: `${w}kg`, type: '' };
  }

  if (load.type === 'assisted') {
    const a = typeof load.assistanceKg === 'number' ? load.assistanceKg : null;
    if (a === null) return { weight: '-', type: '' };
    return { weight: `-${a}kg`, type: '' };
  }

  if (load.type === 'distance') {
    const d = typeof load.distanceValue === 'number' ? load.distanceValue : null;
    if (d === null) return { weight: '-', type: '' };
    return { weight: `${d}${load.unit}`, type: '' };
  }

  return { weight: set.weight || '-', type: '' };
}

function getRpeDisplayColor(rpe: number) {
  if (rpe <= 4) return 'text-green-400';
  if (rpe <= 6) return 'text-yellow-400';
  if (rpe <= 8) return 'text-orange-400';
  return 'text-red-400';
}

// Icône selon le mode d'exécution
function getExecutionModeIcon(mode: string) {
  switch (mode) {
    case 'superset':
    case 'triset':
      return <Link2 className="w-4 h-4 text-[var(--color-primary)]" />;
    case 'giant_set':
      return <Layers className="w-4 h-4 text-[var(--color-primary)]" />;
    case 'pre_fatigue':
      return <ArrowDownCircle className="w-4 h-4 text-[var(--color-warning)]" />;
    case 'post_fatigue':
      return <ArrowUpCircle className="w-4 h-4 text-[var(--color-success)]" />;
    default:
      return <Link2 className="w-4 h-4 text-[var(--color-primary)]" />;
  }
}

// ===========================================
// COMPONENT
// ===========================================

export const SupersetTile: React.FC<SupersetTileProps> = ({
  group,
  history = [],
  isHighlighted = false,
  onViewDate,
  repos,
  videoUrls = {},
  layout = 'desktop'
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showReposPopup, setShowReposPopup] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState<{ url: string; name: string } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const reposButtonRef = useRef<HTMLButtonElement>(null);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const { exercises, executionMode, avgRpe } = group;
  const modeInfo = EXECUTION_MODES[executionMode];

  // Nombre max de séries parmi les exercices
  const maxSets = Math.max(...exercises.map(ex => ex.sets.length));

  // Calculer l'historique du tonnage pour chaque exercice
  const tonnageHistory = useMemo((): TonnageDataPoint[] => {
    if (history.length === 0 || exercises.length === 0) return [];

    const exerciseNames = exercises.map(ex => ex.exerciseName.toLowerCase());
    const dataMap = new Map<string, TonnageDataPoint>();

    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedHistory.forEach(session => {
      let hasData = false;
      const date = new Date(session.date);
      const dateKey = session.date;

      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, {
          date: session.date,
          dateLabel: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        });
      }

      const point = dataMap.get(dateKey)!;

      exercises.forEach((ex, idx) => {
        const matchingExercise = session.exercises.find(
          e => e.exerciseName.toLowerCase() === exerciseNames[idx]
        );

        if (matchingExercise) {
          const tonnage = calculateExerciseTonnage(matchingExercise);
          if (tonnage > 0) {
            point[`tonnage_${idx}`] = tonnage;
            point[`rpe_${idx}`] = matchingExercise.rpe || null;
            hasData = true;
          }
        }
      });

      if (!hasData) {
        dataMap.delete(dateKey);
      }
    });

    return Array.from(dataMap.values());
  }, [history, exercises]);

  // Flip la tuile
  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
  }, []);

  // Ouvrir modal info superset
  const handleInfoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowInfoModal(true);
  }, []);

  // Ouvrir popup récupération
  const handleReposClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReposPopup(true);
  }, []);

  // Formatter le temps de repos
  const formatRepos = (seconds: string): string => {
    const secs = parseInt(seconds);
    if (isNaN(secs)) return seconds;
    if (secs >= 60) {
      const mins = Math.floor(secs / 60);
      const remainingSecs = secs % 60;
      return remainingSecs > 0 ? `${mins}min ${remainingSecs}s` : `${mins}min`;
    }
    return `${secs}s`;
  };

  return (
    <>
      <div
        ref={containerRef}
        className={`
          relative cursor-pointer
          ${isHighlighted ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-theme-secondary' : ''}
        `}
        style={{ height: TILE_HEIGHT }}
        onClick={handleFlip}
      >
        <div
          className="relative transition-transform duration-500 h-full"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* FACE RECTO */}
          <div
            className={`
              absolute inset-0 bg-theme-secondary border border-theme rounded-xl overflow-hidden flex flex-col
              hover:bg-theme-tertiary hover:border-theme transition-colors
              ${isFlipped ? 'invisible' : ''}
            `}
            style={{ backfaceVisibility: 'hidden' }}
          >
            {/* Header: noms empilés | RPE | icône mode */}
            <div className="flex items-start justify-between gap-2 px-3 py-2 bg-theme-tertiary/50 flex-shrink-0">
              <div className="flex-1 min-w-0">
                {exercises.map((ex, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    {idx > 0 && (
                      <div className="w-full border-t border-theme/30 my-0.5" />
                    )}
                    <h4 className="font-medium text-theme text-xs line-clamp-1">{ex.exerciseName}</h4>
                  </div>
                ))}
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                {typeof avgRpe === 'number' && (
                  <span className={`text-sm font-bold ${getRpeDisplayColor(avgRpe)}`}>
                    {avgRpe}
                  </span>
                )}
                <button
                  ref={infoButtonRef}
                  onClick={handleInfoClick}
                  className="p-1 hover:bg-theme-tertiary rounded transition-colors"
                  title={modeInfo.label}
                >
                  {getExecutionModeIcon(executionMode)}
                </button>
              </div>
            </div>

            {/* Contenu: séries groupées */}
            <div className="flex-1 px-2 py-1 flex flex-col min-h-0 overflow-y-auto">
              {Array.from({ length: maxSets }, (_, setIdx) => (
                <div key={setIdx} className="mb-1.5">
                  <div className="text-[10px] text-theme-muted font-medium mb-0.5">
                    Série {setIdx + 1}
                  </div>
                  <div className="bg-theme-tertiary/30 rounded-lg p-1.5 space-y-0.5">
                    {exercises.map((ex, exIdx) => {
                      const set = ex.sets[setIdx];
                      if (!set) return (
                        <div key={exIdx} className="text-xs text-theme-muted/50 pl-1">
                          -
                        </div>
                      );
                      const { weight } = getWeightInfo(set);
                      return (
                        <div
                          key={exIdx}
                          className={`flex items-center text-xs ${
                            set.completed ? '' : 'opacity-50'
                          }`}
                        >
                          <span className="text-theme font-semibold flex-1">
                            {set.reps || '-'} × {weight}
                          </span>
                          {set.completed && (
                            <span className="text-[var(--color-success)] text-[10px]">✓</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: badges */}
            <div className="px-2 pb-2 flex items-center gap-1 flex-shrink-0">
              {repos && (
                <button
                  ref={reposButtonRef}
                  onClick={handleReposClick}
                  className="px-1.5 py-1 bg-theme-tertiary/30 hover:bg-theme-tertiary/50 border border-theme/50 rounded text-theme text-[10px] font-medium transition-colors flex items-center gap-1"
                >
                  <Timer className="w-3 h-3" />
                  <span>{formatRepos(repos)}</span>
                </button>
              )}
              <div className="flex-1" />
              <TrendingUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />
            </div>
          </div>

          {/* FACE VERSO - Graphique avec 2 courbes */}
          <div
            className={`
              absolute inset-0 bg-theme-secondary border border-theme rounded-xl overflow-hidden flex flex-col
              hover:bg-theme-tertiary hover:border-theme transition-colors
              ${!isFlipped ? 'invisible' : ''}
            `}
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-1 px-2 py-2 bg-theme-tertiary/50 flex-shrink-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <TrendingUp className="w-3.5 h-3.5 text-[var(--color-primary)] flex-shrink-0" />
                <h4 className="font-medium text-theme text-xs truncate">{modeInfo.label}</h4>
              </div>
              <span className="text-[10px] text-theme-muted flex-shrink-0">← Retour</span>
            </div>

            {/* Graphique */}
            <div className="flex-1 p-2 flex flex-col min-h-0" onClick={(e) => e.stopPropagation()}>
              {tonnageHistory.length > 0 ? (
                <>
                  <div className="flex-1 relative min-h-0" style={{ minHeight: 120 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={tonnageHistory}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                      >
                        <defs>
                          {exercises.map((_, idx) => (
                            <linearGradient
                              key={idx}
                              id={`supersetGradient-${group.groupId}-${idx}`}
                              x1="0" y1="0" x2="0" y2="1"
                            >
                              <stop offset="5%" stopColor={EXERCISE_COLORS[idx]} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={EXERCISE_COLORS[idx]} stopOpacity={0} />
                            </linearGradient>
                          ))}
                        </defs>
                        <XAxis
                          dataKey="dateLabel"
                          tick={{ fill: '#94a3b8', fontSize: 8 }}
                          tickLine={{ stroke: '#475569' }}
                          axisLine={{ stroke: '#475569' }}
                          interval={tonnageHistory.length > 5 ? Math.floor(tonnageHistory.length / 3) : 'preserveStartEnd'}
                          height={18}
                          tickMargin={2}
                        />
                        <YAxis
                          tickFormatter={(v) => formatTonnageCompact(v)}
                          tick={{ fill: '#94a3b8', fontSize: 8 }}
                          tickLine={{ stroke: '#475569' }}
                          axisLine={{ stroke: '#475569' }}
                          width={35}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--color-bg-secondary)',
                            border: '1px solid var(--color-border)',
                            borderRadius: '8px',
                            fontSize: '11px'
                          }}
                          formatter={(value: number, name: string) => {
                            const idx = parseInt(name.split('_')[1]);
                            const exName = exercises[idx]?.exerciseName || '';
                            return [formatTonnageCompact(value), exName];
                          }}
                        />
                        {exercises.map((ex, idx) => (
                          <React.Fragment key={idx}>
                            <Area
                              type="monotone"
                              dataKey={`tonnage_${idx}`}
                              stroke="transparent"
                              fill={`url(#supersetGradient-${group.groupId}-${idx})`}
                              isAnimationActive={false}
                            />
                            <Line
                              type="monotone"
                              dataKey={`tonnage_${idx}`}
                              name={`tonnage_${idx}`}
                              stroke={EXERCISE_COLORS[idx]}
                              strokeWidth={2}
                              dot={{ fill: EXERCISE_COLORS[idx], strokeWidth: 0, r: 3 }}
                              activeDot={{ r: 5, fill: EXERCISE_COLORS[idx], stroke: '#fff', strokeWidth: 2 }}
                              isAnimationActive={false}
                            />
                          </React.Fragment>
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Légende */}
                  <div className="pt-1 mt-1 border-t border-theme flex flex-wrap gap-2 justify-center">
                    {exercises.map((ex, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: EXERCISE_COLORS[idx] }}
                        />
                        <span className="text-[9px] text-theme-muted truncate max-w-[80px]">
                          {ex.exerciseName}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-theme-muted text-xs text-center">
                  <div>
                    <TrendingUp className="w-6 h-6 mx-auto mb-1 opacity-50" />
                    <p className="text-[10px]">Pas encore de données</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal Info Superset */}
      {showInfoModal && (
        <SupersetInfoModal
          executionMode={executionMode}
          onClose={() => setShowInfoModal(false)}
          anchorEl={layout === 'desktop' ? infoButtonRef.current : null}
          layout={layout}
        />
      )}

      {/* Popover Récupération */}
      {showReposPopup && repos && (() => {
        const isDesktop = layout === 'desktop';
        const content = (
          <>
            <div className="flex items-center gap-3 mb-4 px-5 pt-5">
              <div className="w-10 h-10 bg-theme-tertiary/30 rounded-xl flex items-center justify-center">
                <Timer className="w-5 h-5 text-theme" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-theme">Temps de récupération</h3>
                <p className="text-sm text-theme-muted">{modeInfo.label}</p>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="bg-theme-tertiary/50 rounded-xl p-4 border border-theme text-center">
                <p className="text-3xl font-bold text-theme">{formatRepos(repos)}</p>
                <p className="text-sm text-theme-muted mt-1">après avoir fait les {exercises.length} exercices</p>
              </div>

              <button
                onClick={() => setShowReposPopup(false)}
                className="w-full mt-4 py-3 bg-theme-tertiary hover:opacity-90 text-theme rounded-xl font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </>
        );

        if (isDesktop && reposButtonRef.current) {
          return (
            <Popover
              anchorRef={reposButtonRef}
              isOpen={true}
              onClose={() => setShowReposPopup(false)}
              position="bottom-left"
              maxWidth={320}
              showCloseButton={true}
            >
              {content}
            </Popover>
          );
        }

        return createPortal(
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setShowReposPopup(false)}
          >
            <div
              className="bg-theme-secondary border border-theme rounded-2xl max-w-sm w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {content}
            </div>
          </div>,
          document.body
        );
      })()}

      {/* Modal Vidéo */}
      {showVideoModal && (
        <VideoModal
          url={showVideoModal.url}
          exerciseName={showVideoModal.name}
          onClose={() => setShowVideoModal(null)}
        />
      )}
    </>
  );
};

export default SupersetTile;
