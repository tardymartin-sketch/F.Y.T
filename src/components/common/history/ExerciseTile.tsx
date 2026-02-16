// ============================================================
// F.Y.T - EXERCISE TILE
// src/components/common/history/ExerciseTile.tsx
// Tuile carrée pour affichage d'un exercice dans l'historique
// Face recto (par défaut): détails séries + badge consignes cliquable
// Face verso (au clic): graphique évolution tonnage (identique à Stats)
// ============================================================

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ExerciseLog, SessionLog } from '../../../../types';
import { TrendingUp, X, Timer, Video, Info } from 'lucide-react';
import { Popover } from '../Popover';
import { VideoModal } from '../VideoModal';
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip
} from 'recharts';
import { ChartTooltipOverlay, formatVolume, getRpeColor, formatRpeValue } from '../stats/ChartTooltipOverlay';

// ===========================================
// TYPES
// ===========================================

interface ExerciseTileProps {
  exercise: ExerciseLog;
  /** Historique complet pour calculer l'évolution du tonnage */
  history?: SessionLog[];
  isHighlighted?: boolean;
  /** Callback pour naviguer vers une date dans l'historique (bouton œil) */
  onViewDate?: (date: string) => void;
  /** Temps de récupération (ex: "90" pour 90 secondes) */
  repos?: string;
  /** URL de la vidéo de démonstration */
  videoUrl?: string;
  /** Layout mode: 'mobile' ou 'desktop' */
  layout?: 'mobile' | 'desktop';
}

interface TonnageDataPoint {
  date: string;
  dateLabel: string;
  tonnage: number;
  sessionName: string;
  rpe: number | null;
}

// ===========================================
// CONSTANTS
// ===========================================

const TILE_HEIGHT = 220;

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

/**
 * Extrait le poids et le type de charge d'un set
 */
function getWeightInfo(set: any): { weight: string; type: string } {
  if (!set.load) {
    const w = set.weight || '-';
    return { weight: w === '-' ? '-' : `${w} kg`, type: '' };
  }

  const load = set.load;

  if (load.type === 'single') {
    const w = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (w === null) return { weight: set.weight || '-', type: '' };
    return { weight: `${w} kg`, type: 'Haltère' };
  }

  if (load.type === 'double') {
    const w = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (w === null) return { weight: set.weight || '-', type: '' };
    return { weight: `2x${w} kg`, type: '2 Haltères' };
  }

  if (load.type === 'barbell') {
    const barKg = typeof load.barKg === 'number' ? load.barKg : 20;
    const addedKg = typeof load.addedKg === 'number' ? load.addedKg : 0;
    const total = barKg + addedKg;
    return { weight: `${total} kg`, type: `Barre ${barKg}+${addedKg}` };
  }

  if (load.type === 'machine') {
    const w = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (w === null) return { weight: set.weight || '-', type: '' };
    return { weight: `${w} kg`, type: 'Machine' };
  }

  if (load.type === 'assisted') {
    const a = typeof load.assistanceKg === 'number' ? load.assistanceKg : null;
    if (a === null) return { weight: '-', type: 'Assisté' };
    return { weight: `-${a} kg`, type: 'Assisté' };
  }

  if (load.type === 'distance') {
    const d = typeof load.distanceValue === 'number' ? load.distanceValue : null;
    if (d === null) return { weight: '-', type: '' };
    return { weight: `${d} ${load.unit}`, type: '' };
  }

  return { weight: set.weight || '-', type: '' };
}

// ===========================================
// CUSTOM HOVER TOOLTIP (identique à VolumeTrendChart)
// ===========================================

interface HoverTooltipProps {
  active?: boolean;
  payload?: any[];
  coordinate?: { x: number; y: number };
  onHoverChange?: (data: TonnageDataPoint | null, coord: { x: number; y: number } | null) => void;
}

// Ce composant ne rend rien visuellement - il notifie juste le parent des changements
const HoverTooltip: React.FC<HoverTooltipProps> = ({
  active,
  payload,
  coordinate,
  onHoverChange
}) => {
  React.useEffect(() => {
    if (active && payload && payload[0] && coordinate && onHoverChange) {
      const data = payload[0].payload as TonnageDataPoint;
      onHoverChange(data, coordinate);
    } else if (!active && onHoverChange) {
      onHoverChange(null, null);
    }
  }, [active, payload, coordinate, onHoverChange]);

  // Ne rien rendre - l'overlay sera géré par le parent
  return null;
};

// ===========================================
// COMPONENT
// ===========================================

export const ExerciseTile: React.FC<ExerciseTileProps> = ({
  exercise,
  history = [],
  isHighlighted = false,
  onViewDate,
  repos,
  videoUrl,
  layout = 'desktop'
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showNotesPopup, setShowNotesPopup] = useState(false);
  const [showReposPopup, setShowReposPopup] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);

  // Refs for Popover anchors
  const notesButtonRef = useRef<HTMLButtonElement>(null);
  const reposButtonRef = useRef<HTMLButtonElement>(null);
  const videoButtonRef = useRef<HTMLButtonElement>(null);
  const [pinnedData, setPinnedData] = useState<TonnageDataPoint | null>(null);
  const [pinnedCoordinate, setPinnedCoordinate] = useState<{ x: number; y: number } | null>(null);
  // State pour hover tooltip (affiché manuellement comme pinned)
  const [hoverData, setHoverData] = useState<TonnageDataPoint | null>(null);
  const [hoverCoordinate, setHoverCoordinate] = useState<{ x: number; y: number } | null>(null);
  const lastHoverCoordRef = useRef<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);

  // Calculer l'historique du tonnage pour cet exercice
  const tonnageHistory = useMemo((): TonnageDataPoint[] => {
    if (history.length === 0) return [];

    const exerciseName = exercise.exerciseName.toLowerCase();
    const dataPoints: TonnageDataPoint[] = [];

    const sortedHistory = [...history].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    sortedHistory.forEach(session => {
      const matchingExercise = session.exercises.find(
        ex => ex.exerciseName.toLowerCase() === exerciseName
      );

      if (matchingExercise) {
        const tonnage = calculateExerciseTonnage(matchingExercise);
        if (tonnage > 0) {
          const date = new Date(session.date);
          dataPoints.push({
            date: session.date,
            dateLabel: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
            tonnage,
            sessionName: session.sessionKey.seance,
            rpe: matchingExercise.rpe || session.sessionRpe || null
          });
        }
      }
    });

    return dataPoints;
  }, [history, exercise.exerciseName]);

  // Stats du tonnage
  const tonnageStats = useMemo(() => {
    if (tonnageHistory.length === 0) return null;

    const tonnages = tonnageHistory.map(d => d.tonnage);
    const current = tonnages[tonnages.length - 1];
    const max = Math.max(...tonnages);
    const avg = tonnages.reduce((a, b) => a + b, 0) / tonnages.length;

    return { current, max, avg };
  }, [tonnageHistory]);

  // Flip la tuile
  const handleFlip = useCallback(() => {
    setIsFlipped(prev => !prev);
    setPinnedData(null);
    setPinnedCoordinate(null);
  }, []);

  // Ouvrir popup consignes (sans flip)
  const handleNotesClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowNotesPopup(true);
  }, []);

  // Ouvrir popup récupération (sans flip)
  const handleReposClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowReposPopup(true);
  }, []);

  // Ouvrir modal vidéo (sans flip)
  const handleVideoClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowVideoModal(true);
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

  // Handler pour hover sur le graphique
  const handleHoverChange = useCallback((data: TonnageDataPoint | null, coord: { x: number; y: number } | null) => {
    if (data && coord) {
      lastHoverCoordRef.current = coord;
      setHoverData(data);
      setHoverCoordinate(coord);
    } else {
      setHoverData(null);
      setHoverCoordinate(null);
    }
  }, []);

  // Clic sur graphique pour épingler tooltip
  const handleChartClick = useCallback((chartEvent: any) => {
    // Empêcher le flip
    if (chartEvent && chartEvent.stopPropagation) {
      chartEvent.stopPropagation();
    }

    if (pinnedData) {
      setPinnedData(null);
      setPinnedCoordinate(null);
      return;
    }

    if (chartEvent && chartEvent.activePayload && chartEvent.activePayload[0] && lastHoverCoordRef.current) {
      const clickedData = chartEvent.activePayload[0].payload as TonnageDataPoint;
      setPinnedData(clickedData);
      setPinnedCoordinate({
        x: lastHoverCoordRef.current.x,
        y: lastHoverCoordRef.current.y,
      });
      // Clear hover quand on pin
      setHoverData(null);
      setHoverCoordinate(null);
    }
  }, [pinnedData]);

  // Memoize hover tooltip component
  const renderHoverTooltip = useMemo(() => {
    return (props: any) => (
      <HoverTooltip
        {...props}
        onHoverChange={handleHoverChange}
      />
    );
  }, [handleHoverChange]);

  // Toutes les séries (scrollable si overflow)
  const allSets = exercise.sets;

  // Couleur RPE
  const getRpeDisplayColor = (rpe: number) => {
    if (rpe <= 4) return 'text-green-400';
    if (rpe <= 6) return 'text-yellow-400';
    if (rpe <= 8) return 'text-orange-400';
    return 'text-red-400';
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
            {/* Header: nom | RPE (numéro seul) | icone graph */}
            <div className="flex items-center justify-between gap-1 px-2 py-2 bg-theme-tertiary/50 flex-shrink-0">
              <h4 className="font-medium text-theme text-xs flex-1 min-w-0 line-clamp-3">{exercise.exerciseName}</h4>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {typeof exercise.rpe === 'number' && (
                  <span className={`text-sm font-bold ${getRpeDisplayColor(exercise.rpe)}`}>
                    {exercise.rpe}
                  </span>
                )}
                <TrendingUp className="w-3.5 h-3.5 text-[var(--color-primary)]" />
              </div>
            </div>

            {/* Contenu: séries avec charge centrée et type en dessous */}
            <div className="flex-1 p-2 flex flex-col min-h-0">
              <div className="space-y-1 flex-1 overflow-y-auto">
                {allSets.map((set, index) => {
                  const { weight, type } = getWeightInfo(set);
                  return (
                    <div
                      key={index}
                      className={`flex items-center text-xs py-1 px-1.5 rounded ${
                        set.completed ? 'bg-theme-tertiary/50' : 'bg-theme/30 opacity-60'
                      }`}
                    >
                      {/* Numéro série */}
                      <span className="text-theme-muted w-4 text-center font-medium text-[10px]">
                        {set.setNumber}
                      </span>

                      {/* Reps x */}
                      <span className="text-theme font-semibold text-sm w-10 text-center">
                        {set.reps || '-'} x
                      </span>

                      {/* Charge centrée avec type en dessous */}
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <span className="text-theme font-semibold text-sm leading-tight">
                          {weight}
                        </span>
                        {type && (
                          <span className="text-theme-muted text-[9px] leading-tight">
                            {type}
                          </span>
                        )}
                      </div>

                      {/* Check */}
                      {set.completed ? (
                        <span className="w-4 text-center text-[var(--color-success)] text-[10px]">✓</span>
                      ) : (
                        <span className="w-4 text-center text-theme-muted/50 text-[10px]">-</span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Badges: Consignes, Récupération, Vidéo */}
              {(exercise.notes || repos || videoUrl) && (
                <div className="flex items-center gap-1 mt-1 flex-shrink-0">
                  {/* Badge Consignes */}
                  {exercise.notes && (
                    <button
                      ref={notesButtonRef}
                      onClick={handleNotesClick}
                      className="px-1.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded text-amber-400 text-[10px] font-medium transition-colors flex items-center justify-center gap-1 min-w-0"
                    >
                      <Info className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">Consignes</span>
                    </button>
                  )}

                  {/* Badge Récupération */}
                  {repos && (
                    <button
                      ref={reposButtonRef}
                      onClick={handleReposClick}
                      className="px-1.5 py-1 bg-theme-tertiary/30 hover:bg-theme-tertiary/50 border border-theme/50 rounded text-theme text-[10px] font-medium transition-colors flex items-center justify-center gap-1 min-w-0"
                    >
                      <Timer className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{formatRepos(repos)}</span>
                    </button>
                  )}

                  {/* Badge Vidéo (icône seule) */}
                  {videoUrl && (
                    <button
                      ref={videoButtonRef}
                      onClick={handleVideoClick}
                      className="p-1.5 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded text-[var(--color-primary)] transition-colors flex items-center justify-center"
                      title="Voir la vidéo"
                    >
                      <Video className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* FACE VERSO - Graphique identique à VolumeTrendChart */}
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
                <h4 className="font-medium text-theme text-xs truncate">{exercise.exerciseName}</h4>
              </div>
              <span className="text-[10px] text-theme-muted flex-shrink-0">← Retour</span>
            </div>

            {/* Graphique (ComposedChart comme VolumeTrendChart) */}
            <div className="flex-1 p-2 flex flex-col min-h-0" onClick={(e) => e.stopPropagation()}>
              {tonnageHistory.length > 0 ? (
                <>
                  <div ref={chartContainerRef} className="flex-1 relative min-h-0" style={{ minHeight: 90 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart
                        data={tonnageHistory}
                        margin={{ top: 5, right: 10, left: -20, bottom: 0 }}
                        onClick={handleChartClick}
                      >
                        <defs>
                          <linearGradient id={`tonnageGradient-${exercise.exerciseName.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
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
                        {!pinnedData && (
                          <Tooltip
                            content={renderHoverTooltip}
                            cursor={{ stroke: '#475569', strokeDasharray: '3 3' }}
                            wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
                            allowEscapeViewBox={{ x: false, y: false }}
                          />
                        )}
                        <Area
                          type="monotone"
                          dataKey="tonnage"
                          stroke="transparent"
                          fill={`url(#tonnageGradient-${exercise.exerciseName.replace(/\s/g, '-')})`}
                          isAnimationActive={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="tonnage"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={{ fill: '#3b82f6', strokeWidth: 0, r: 4 }}
                          activeDot={{ r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>

                    {/* Hover Tooltip (même structure que pinned) */}
                    {!pinnedData && hoverData && hoverCoordinate && (
                      <div className="hover-tooltip pointer-events-none">
                        <ChartTooltipOverlay
                          data={{
                            date: hoverData.date,
                            label: hoverData.sessionName,
                            primaryValue: formatVolume(hoverData.tonnage),
                            primaryColor: 'text-[var(--color-primary)]',
                            secondaryLabel: 'RPE:',
                            secondaryValue: formatRpeValue(hoverData.rpe),
                            secondaryColor: getRpeColor(hoverData.rpe),
                          }}
                          position={{
                            x: hoverCoordinate.x,
                            y: hoverCoordinate.y,
                            // Utiliser containerRef (tuile entière) pour les dimensions adaptatives
                            containerWidth: containerRef.current?.offsetWidth,
                            containerHeight: containerRef.current?.offsetHeight,
                          }}
                          onViewDate={onViewDate}
                          preferBelow={true}
                        />
                      </div>
                    )}

                    {/* Pinned Tooltip */}
                    {pinnedData && pinnedCoordinate && (
                      <div className="pinned-tooltip" onClick={(e) => e.stopPropagation()}>
                        <ChartTooltipOverlay
                          data={{
                            date: pinnedData.date,
                            label: pinnedData.sessionName,
                            primaryValue: formatVolume(pinnedData.tonnage),
                            primaryColor: 'text-[var(--color-primary)]',
                            secondaryLabel: 'RPE:',
                            secondaryValue: formatRpeValue(pinnedData.rpe),
                            secondaryColor: getRpeColor(pinnedData.rpe),
                          }}
                          position={{
                            x: pinnedCoordinate.x,
                            y: pinnedCoordinate.y,
                            // Utiliser containerRef (tuile entière) pour les dimensions adaptatives
                            containerWidth: containerRef.current?.offsetWidth,
                            containerHeight: containerRef.current?.offsetHeight,
                          }}
                          onViewDate={onViewDate}
                          preferBelow={true}
                        />
                      </div>
                    )}
                  </div>

                  {/* Stats compact */}
                  {tonnageStats && (
                    <div className="pt-1 mt-1 border-t border-theme grid grid-cols-3 gap-1 text-center flex-shrink-0">
                      <div>
                        <p className="text-[8px] text-theme-muted uppercase leading-none">Actuel</p>
                        <p className="text-[11px] font-medium text-theme">{formatTonnageCompact(tonnageStats.current)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-theme-muted uppercase leading-none">Moy</p>
                        <p className="text-[11px] font-medium text-[var(--color-primary)]">{formatTonnageCompact(tonnageStats.avg)}</p>
                      </div>
                      <div>
                        <p className="text-[8px] text-theme-muted uppercase leading-none">Max</p>
                        <p className="text-[11px] font-medium text-[var(--color-success)]">{formatTonnageCompact(tonnageStats.max)}</p>
                      </div>
                    </div>
                  )}
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

      {/* Modal/Popover Consignes */}
      {showNotesPopup && exercise.notes && (() => {
        const isDesktop = layout === 'desktop';
        const content = (
          <>
            <div className="flex items-center justify-between mb-4 px-5 pt-5">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-amber-500/20 rounded-xl flex items-center justify-center">
                  <Info className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-theme">Consignes</h3>
                  <p className="text-sm text-theme-muted">{exercise.exerciseName}</p>
                </div>
              </div>
              {!isDesktop && (
                <button
                  onClick={() => setShowNotesPopup(false)}
                  className="p-2 hover:bg-theme-tertiary rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-theme-muted" />
                </button>
              )}
            </div>

            <div className="px-5 pb-5">
              <div className="bg-theme-tertiary/50 rounded-xl p-4 border border-theme">
                <p className="text-theme-secondary whitespace-pre-wrap leading-relaxed">
                  {exercise.notes}
                </p>
              </div>

              <button
                onClick={() => setShowNotesPopup(false)}
                className="w-full mt-4 py-3 bg-theme-tertiary hover:opacity-90 text-theme rounded-xl font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </>
        );

        if (isDesktop && notesButtonRef.current) {
          return (
            <Popover
              anchorRef={notesButtonRef}
              isOpen={true}
              onClose={() => setShowNotesPopup(false)}
              position="bottom-left"
              maxWidth={380}
              showCloseButton={true}
            >
              {content}
            </Popover>
          );
        }

        return createPortal(
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setShowNotesPopup(false)}
          >
            <div
              className="bg-theme-secondary border border-theme rounded-2xl max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {content}
            </div>
          </div>,
          document.body
        );
      })()}

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
                <p className="text-sm text-theme-muted">{exercise.exerciseName}</p>
              </div>
            </div>

            <div className="px-5 pb-5">
              <div className="bg-theme-tertiary/50 rounded-xl p-4 border border-theme text-center">
                <p className="text-3xl font-bold text-theme">{formatRepos(repos)}</p>
                <p className="text-sm text-theme-muted mt-1">entre chaque série</p>
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
      {showVideoModal && videoUrl && (
        <VideoModal
          url={videoUrl}
          exerciseName={exercise.exerciseName}
          onClose={() => setShowVideoModal(false)}
          anchorRef={layout === 'desktop' ? videoButtonRef : undefined}
        />
      )}
    </>
  );
};

export const ExerciseTileExpanded = ExerciseTile;

export default ExerciseTile;
