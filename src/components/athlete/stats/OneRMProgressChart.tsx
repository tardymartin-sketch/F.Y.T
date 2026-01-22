// ============================================================
// F.Y.T - 1RM PROGRESS CHART
// src/components/athlete/stats/OneRMProgressChart.tsx
// Graphique d'évolution du 1RM estimé par groupe musculaire
// ============================================================

import React, { useState, useEffect, useMemo } from 'react';
import { ChevronDown, Loader2, TrendingUp, Calendar, Info, X, Check } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  ZAxis,
} from 'recharts';
import { fetchUserMuscleGroupsWithExercises, fetch1RMHistoryByExercises } from '../../../services/supabaseService';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
}

interface MuscleGroupWithExercises {
  id: string;
  name: string;
  exercises: string[];
}

interface DataPoint {
  exerciseName: string;
  date: string;
  dateLabel: string;
  estimated1RM: number;
  timestamp: number;
}

// ===========================================
// CONSTANTS
// ===========================================

const EXERCISE_COLORS = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#84cc16', // lime
];

// ===========================================
// HELPERS
// ===========================================

function formatDateLabel(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
  });
}

function formatDateShort(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

// ===========================================
// CUSTOM TOOLTIP COMPONENT
// ===========================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload && payload.length > 0) {
    const data = payload[0].payload;
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium text-sm">{data.exerciseName}</p>
        <p className="text-slate-400 text-xs mt-1">{data.dateLabel}</p>
        <p className="text-green-400 font-bold mt-1">{data.estimated1RM} kg</p>
      </div>
    );
  }
  return null;
};

// ===========================================
// INFO MODAL COMPONENT
// ===========================================

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-400" />
            Qu'est-ce que le 1RM ?
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-sm text-slate-300">
          <div>
            <h4 className="font-semibold text-white mb-1">Définition</h4>
            <p>
              Le <span className="text-green-400 font-medium">1RM (One Rep Max)</span> est
              la charge maximale que tu peux soulever pour une seule répétition sur un exercice donné.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-1">Calcul estimé</h4>
            <p>
              Ton 1RM est estimé à partir de tes séries d'entraînement grâce à la formule d'Epley :
            </p>
            <div className="bg-slate-900/50 rounded-lg p-2 mt-2 text-center font-mono text-green-400">
              1RM = Poids × (1 + Reps / 30)
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-1">Période idéale d'analyse</h4>
            <p>
              Pour observer une progression significative, une période de <span className="text-amber-400 font-medium">12 semaines</span> est
              recommandée. Cela correspond à un cycle de musculation classique.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-1">Interprétation</h4>
            <ul className="list-disc list-inside space-y-1 text-slate-400">
              <li>Une courbe ascendante indique une progression</li>
              <li>Un plateau peut signifier un besoin de varier l'entraînement</li>
              <li>Une baisse peut être due à la fatigue ou au surentraînement</li>
            </ul>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-colors"
        >
          Compris
        </button>
      </div>
    </div>
  );
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export const OneRMProgressChart: React.FC<Props> = ({ userId }) => {
  // States
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroupWithExercises[]>([]);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<MuscleGroupWithExercises | null>(null);
  const [selectedExercises, setSelectedExercises] = useState<string[]>([]);
  const [rawData, setRawData] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [showMuscleDropdown, setShowMuscleDropdown] = useState(false);
  const [showExerciseDropdown, setShowExerciseDropdown] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(getTodayDate());

  // Hidden date inputs refs
  const startDateInputRef = React.useRef<HTMLInputElement>(null);
  const endDateInputRef = React.useRef<HTMLInputElement>(null);

  // Load muscle groups with exercises (filtered by dates)
  useEffect(() => {
    const loadMuscleGroups = async () => {
      try {
        setLoading(true);
        const groups = await fetchUserMuscleGroupsWithExercises(
          userId,
          startDate || undefined,
          endDate || undefined
        );
        setMuscleGroups(groups);

        // Reset selection if the current muscle group is no longer available
        if (selectedMuscleGroup) {
          const stillExists = groups.find(g => g.id === selectedMuscleGroup.id);
          if (!stillExists) {
            setSelectedMuscleGroup(null);
            setSelectedExercises([]);
          } else {
            // Update the muscle group data (exercises may have changed)
            setSelectedMuscleGroup(stillExists);
            // Filter selected exercises to only include those still available
            const validExercises = selectedExercises.filter(e => stillExists.exercises.includes(e));
            if (validExercises.length !== selectedExercises.length) {
              setSelectedExercises(validExercises);
            }
          }
        }
      } catch (err) {
        console.error('Error loading muscle groups:', err);
      } finally {
        setLoading(false);
      }
    };

    loadMuscleGroups();
  }, [userId, startDate, endDate]);

  // Auto-select single exercise when muscle group changes
  useEffect(() => {
    if (selectedMuscleGroup) {
      if (selectedMuscleGroup.exercises.length === 1) {
        setSelectedExercises(selectedMuscleGroup.exercises);
      } else {
        setSelectedExercises([]);
      }
    } else {
      setSelectedExercises([]);
    }
  }, [selectedMuscleGroup?.id]);

  // Load chart data when exercises or dates change
  useEffect(() => {
    if (selectedExercises.length === 0) {
      setRawData([]);
      return;
    }

    const loadChartData = async () => {
      try {
        setLoadingChart(true);
        const history = await fetch1RMHistoryByExercises(
          userId,
          selectedExercises,
          startDate || undefined,
          endDate || undefined
        );

        const data: DataPoint[] = history.map((h) => ({
          exerciseName: h.exerciseName,
          date: h.date,
          dateLabel: formatDateLabel(h.date),
          estimated1RM: Math.round(h.estimated1RM * 10) / 10,
          timestamp: new Date(h.date).getTime(),
        }));

        setRawData(data);
      } catch (err) {
        console.error('Error loading chart data:', err);
      } finally {
        setLoadingChart(false);
      }
    };

    loadChartData();
  }, [userId, selectedExercises, startDate, endDate]);

  // Toggle exercise selection
  const toggleExercise = (exercise: string) => {
    setSelectedExercises((prev) => {
      if (prev.includes(exercise)) {
        return prev.filter((e) => e !== exercise);
      }
      return [...prev, exercise];
    });
  };

  // Select all exercises
  const selectAllExercises = () => {
    if (selectedMuscleGroup) {
      setSelectedExercises(selectedMuscleGroup.exercises);
    }
  };

  // Clear all exercises
  const clearAllExercises = () => {
    setSelectedExercises([]);
  };

  // Group data by exercise for chart
  const { exerciseNames, chartData, colorMap } = useMemo(() => {
    const exerciseSet = new Set<string>();
    rawData.forEach((d) => exerciseSet.add(d.exerciseName));
    const names = Array.from(exerciseSet).sort();

    const colors: Record<string, string> = {};
    names.forEach((name, index) => {
      colors[name] = EXERCISE_COLORS[index % EXERCISE_COLORS.length];
    });

    return {
      exerciseNames: names,
      chartData: rawData,
      colorMap: colors,
    };
  }, [rawData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (muscleGroups.length === 0 && !startDate && !endDate) {
    return (
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center">
        <TrendingUp className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <p className="text-slate-400">Aucune donnée de 1RM disponible</p>
        <p className="text-slate-500 text-sm mt-1">Complète des séances pour voir ta progression</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Date Filters - Full width */}
      <div className="flex items-start gap-2">
        {/* Start Date */}
        <div className="flex-1 flex flex-col items-center">
          <button
            onClick={() => startDateInputRef.current?.showPicker()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
            title="Date de début"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Début</span>
          </button>
          <input
            ref={startDateInputRef}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="sr-only"
          />
          {startDate && (
            <span className="text-[10px] text-slate-500 mt-1 text-center">
              {formatDateShort(startDate)}
            </span>
          )}
        </div>

        {/* End Date */}
        <div className="flex-1 flex flex-col items-center">
          <button
            onClick={() => endDateInputRef.current?.showPicker()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
            title="Date de fin"
          >
            <Calendar className="w-5 h-5" />
            <span className="text-xs">Fin</span>
          </button>
          <input
            ref={endDateInputRef}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="sr-only"
          />
          {endDate && (
            <span className="text-[10px] text-slate-500 mt-1 text-center">
              {formatDateShort(endDate)}
            </span>
          )}
        </div>

        {/* Info Button */}
        <div className="flex flex-col items-center">
          <button
            onClick={() => setShowInfoModal(true)}
            className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-400 hover:text-blue-400 hover:border-blue-500/50 transition-colors"
            title="Informations sur le 1RM"
          >
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
        <h3 className="text-white font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-green-400" />
          Évolution 1RM Estimé
        </h3>

        {muscleGroups.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Aucune donnée pour cette période</p>
            <p className="text-xs mt-1">Modifie les dates pour voir les données</p>
          </div>
        ) : !selectedMuscleGroup ? (
          <div className="text-center py-8 text-slate-500">
            <p>Sélectionne un groupe musculaire</p>
          </div>
        ) : selectedExercises.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Sélectionne au moins un exercice</p>
          </div>
        ) : loadingChart ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>Pas de données pour cette sélection</p>
            <p className="text-xs mt-1">Modifie les filtres de dates</p>
          </div>
        ) : (
          <>
            {/* Legend */}
            <div className="flex flex-wrap gap-2 mb-4">
              {exerciseNames.map((name) => (
                <div key={name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: colorMap[name] }}
                  />
                  <span className="text-slate-400 truncate max-w-[120px]">{name}</span>
                </div>
              ))}
            </div>

            {/* Scatter Chart */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis
                    dataKey="timestamp"
                    type="number"
                    domain={['dataMin', 'dataMax']}
                    tick={{ fill: '#94a3b8', fontSize: 10 }}
                    tickLine={{ stroke: '#475569' }}
                    axisLine={{ stroke: '#475569' }}
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
                    }}
                  />
                  <YAxis
                    dataKey="estimated1RM"
                    type="number"
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickLine={{ stroke: '#475569' }}
                    axisLine={{ stroke: '#475569' }}
                    tickFormatter={(value) => `${value}kg`}
                  />
                  <ZAxis range={[60, 60]} />
                  <Tooltip content={<CustomTooltip />} />
                  {exerciseNames.map((name) => (
                    <Scatter
                      key={name}
                      name={name}
                      data={chartData.filter((d) => d.exerciseName === name)}
                      fill={colorMap[name]}
                      line={{ stroke: colorMap[name], strokeWidth: 1.5 }}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>

      {/* Filters below chart */}
      {muscleGroups.length > 0 && (
        <div className="space-y-3">
          {/* Muscle Group Selector */}
          <div>
            <button
              onClick={() => {
                setShowMuscleDropdown(!showMuscleDropdown);
                setShowExerciseDropdown(false);
              }}
              className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-left"
            >
              <span className="text-white font-medium truncate">
                {selectedMuscleGroup?.name || 'Sélectionner un groupe musculaire'}
              </span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 transition-transform ${showMuscleDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showMuscleDropdown && (
              <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
                {muscleGroups.map((group) => (
                  <button
                    key={group.id}
                    onClick={() => {
                      setSelectedMuscleGroup(group);
                      setShowMuscleDropdown(false);
                    }}
                    className={`
                      w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center justify-between
                      ${group.id === selectedMuscleGroup?.id ? 'bg-purple-500/20 text-purple-400' : 'text-white'}
                    `}
                  >
                    <span>{group.name}</span>
                    <span className="text-xs text-slate-500">{group.exercises.length} exo</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Exercise Multi-Select (only shown when muscle group is selected) */}
          {selectedMuscleGroup && (
            <div>
              <button
                onClick={() => {
                  setShowExerciseDropdown(!showExerciseDropdown);
                  setShowMuscleDropdown(false);
                }}
                className="w-full flex items-center justify-between bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-left"
              >
                <span className={`truncate ${selectedExercises.length > 0 ? 'text-white' : 'text-slate-400'}`}>
                  {selectedExercises.length === 0
                    ? 'Sélectionner les exercices'
                    : selectedExercises.length === 1
                      ? selectedExercises[0]
                      : `${selectedExercises.length} exercices sélectionnés`}
                </span>
                <ChevronDown
                  className={`w-5 h-5 text-slate-400 transition-transform ${showExerciseDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {showExerciseDropdown && (
                <div className="mt-2 bg-slate-800 border border-slate-700 rounded-xl shadow-xl">
                  {/* Actions rapides */}
                  <div className="flex border-b border-slate-700 px-2 py-2 gap-2">
                    <button
                      onClick={selectAllExercises}
                      className="flex-1 text-xs text-purple-400 hover:text-purple-300 py-1"
                    >
                      Tout sélectionner
                    </button>
                    <button
                      onClick={clearAllExercises}
                      className="flex-1 text-xs text-slate-400 hover:text-slate-300 py-1"
                    >
                      Tout effacer
                    </button>
                  </div>

                  {selectedMuscleGroup.exercises.map((exercise) => {
                    const isSelected = selectedExercises.includes(exercise);
                    return (
                      <button
                        key={exercise}
                        onClick={() => toggleExercise(exercise)}
                        className={`
                          w-full px-4 py-3 text-left hover:bg-slate-700 transition-colors flex items-center gap-3
                          ${isSelected ? 'bg-purple-500/10' : ''}
                        `}
                      >
                        <div
                          className={`
                            w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0
                            ${isSelected ? 'bg-purple-500 border-purple-500' : 'border-slate-600'}
                          `}
                        >
                          {isSelected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className={isSelected ? 'text-white' : 'text-slate-300'}>{exercise}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Info Modal */}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  );
};

export default OneRMProgressChart;
