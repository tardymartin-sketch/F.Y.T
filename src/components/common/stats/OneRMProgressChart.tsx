// ============================================================
// F.Y.T - 1RM PROGRESS CHART
// src/components/athlete/stats/OneRMProgressChart.tsx
// Graphique d'évolution du 1RM estimé par catégorie
// Filtre catégorie + légende interactive pour masquer exercices
// ============================================================

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { ChevronDown, Loader2, TrendingUp, Calendar, Info, X, Eye, EyeOff, Search } from 'lucide-react';
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
import { fetch1RMFilterHierarchy, fetch1RMHistoryByExercises, CategoryWithMuscleGroups } from '../../../services/supabaseService';
import { ChartTooltipOverlay } from './ChartTooltipOverlay';
import { Popover } from '../Popover';

// ===========================================
// TYPES
// ===========================================

interface Props {
  userId: string;
  onViewDate?: (date: string) => void;
  /** Layout : 'mobile' (vertical) ou 'desktop' (split-screen) - défaut: mobile */
  layout?: 'mobile' | 'desktop';
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

/**
 * Normalise une chaîne pour la recherche (lowercase, sans accents)
 */
function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

// ===========================================
// CUSTOM TOOLTIP COMPONENT
// ===========================================

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  coordinate?: { x: number; y: number };
  viewBox?: { width: number; height: number };
  onViewDate?: (date: string) => void;
  onCoordinateChange?: (coord: { x: number; y: number }) => void;
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, coordinate, viewBox, onViewDate, onCoordinateChange }) => {
  if (!active || !payload || !payload[0]) return null;

  const data = payload[0].payload as DataPoint;
  const x = coordinate?.x ?? payload[0].cx ?? 0;
  const y = coordinate?.y ?? payload[0].cy ?? 0;

  if (onCoordinateChange) {
    onCoordinateChange({ x, y });
  }

  return (
    <ChartTooltipOverlay
      data={{
        date: data.date,
        label: data.exerciseName,
        primaryValue: `${data.estimated1RM} kg`,
        primaryColor: 'text-[var(--color-success)]',
      }}
      position={{
        x,
        y,
        containerWidth: viewBox?.width,
        containerHeight: viewBox?.height,
      }}
      onViewDate={onViewDate}
    />
  );
};

// ===========================================
// INFO MODAL COMPONENT
// ===========================================

interface InfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ref vers le bouton déclencheur pour mode popover (desktop) */
  anchorRef?: React.RefObject<HTMLElement>;
}

const InfoModal: React.FC<InfoModalProps> = ({ isOpen, onClose, anchorRef }) => {
  if (!isOpen) return null;

  // Contenu partagé entre les deux modes
  const content = (
    <>
      <div className="flex items-center justify-between mb-4 px-5 pt-5">
        <h3 className="text-lg font-bold text-theme flex items-center gap-2">
          <Info className="w-5 h-5 text-[var(--color-primary)]" />
          Qu'est-ce que le 1RM ?
        </h3>
        {!anchorRef && (
          <button
            onClick={onClose}
            className="p-1 text-theme-muted hover:text-theme-dark transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="space-y-4 text-sm text-theme-secondary px-5">
        <div>
          <h4 className="font-semibold text-theme mb-1">Définition</h4>
          <p>
            Le <span className="text-[var(--color-success)] font-medium">1RM (One Rep Max)</span> est
            la charge maximale que tu peux soulever pour une seule répétition sur un exercice donné.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-theme mb-1">Calcul estimé</h4>
          <p>
            Ton 1RM est estimé à partir de tes séries d'entraînement grâce à la formule d'Epley :
          </p>
          <div className="bg-theme/50 rounded-lg p-2 mt-2 text-center font-mono text-[var(--color-success)]">
            1RM = Poids × (1 + Reps / 30)
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-theme mb-1">Période idéale d'analyse</h4>
          <p>
            Pour observer une progression significative, une période de <span className="text-[var(--color-warning)] font-medium">12 semaines</span> est
            recommandée. Cela correspond à un cycle de musculation classique.
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-theme mb-1">Interprétation</h4>
          <ul className="list-disc list-inside space-y-1 text-theme-muted">
            <li>Une courbe ascendante indique une progression</li>
            <li>Un plateau peut signifier un besoin de varier l'entraînement</li>
            <li>Une baisse peut être due à la fatigue ou au surentraînement</li>
          </ul>
        </div>
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={onClose}
          className="w-full mt-6 py-2.5 bg-purple-500 hover:bg-purple-600 text-theme font-medium rounded-xl transition-colors"
        >
          Compris
        </button>
      </div>
    </>
  );

  // Mode Popover (desktop avec anchorRef)
  if (anchorRef) {
    return (
      <Popover
        anchorRef={anchorRef}
        isOpen={isOpen}
        onClose={onClose}
        position="bottom-left"
        maxWidth={400}
        showCloseButton={true}
      >
        {content}
      </Popover>
    );
  }

  // Mode Modal classique (mobile ou sans anchorRef)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
      <div className="bg-theme-secondary border border-theme rounded-2xl max-w-md w-full shadow-2xl">
        {content}
      </div>
    </div>
  );
};

// ===========================================
// MAIN COMPONENT
// ===========================================

export const OneRMProgressChart: React.FC<Props> = ({ userId, onViewDate, layout = 'mobile' }) => {
  // Hierarchical data
  const [hierarchyData, setHierarchyData] = useState<CategoryWithMuscleGroups[]>([]);

  // Filter selections
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExercisesFromSearch, setSelectedExercisesFromSearch] = useState<string[]>([]);

  // Search state
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Chart data
  const [rawData, setRawData] = useState<DataPoint[]>([]);

  // UI states
  const [loading, setLoading] = useState(true);
  const [loadingChart, setLoadingChart] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Pinned tooltip state
  const [pinnedData, setPinnedData] = useState<DataPoint | null>(null);
  const [pinnedCoordinate, setPinnedCoordinate] = useState<{ x: number; y: number } | null>(null);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const lastHoverCoordRef = useRef<{ x: number; y: number } | null>(null);

  // Legend visibility state
  const [hiddenExercises, setHiddenExercises] = useState<Set<string>>(new Set());

  // Date filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>(getTodayDate());

  // Hidden date inputs refs
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  // Ref for Info button (Popover anchor)
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  // ===========================================
  // DERIVED DATA
  // ===========================================

  // Get all exercises for selected category (from all muscle groups)
  const availableExercises = useMemo((): string[] => {
    if (!selectedCategory) return [];
    const category = hierarchyData.find(c => c.categoryCode === selectedCategory);
    if (!category) return [];

    const exercises = new Set<string>();
    category.muscleGroups.forEach(mg => mg.exercises.forEach(ex => exercises.add(ex)));
    return Array.from(exercises).sort();
  }, [hierarchyData, selectedCategory]);

  // Selected category name
  const selectedCategoryName = useMemo(() => {
    const category = hierarchyData.find(c => c.categoryCode === selectedCategory);
    return category?.categoryName || null;
  }, [hierarchyData, selectedCategory]);

  // Get ALL exercises from all categories (for search)
  const allExercises = useMemo((): string[] => {
    const exercises = new Set<string>();
    hierarchyData.forEach(cat => {
      cat.muscleGroups.forEach(mg => {
        mg.exercises.forEach(ex => exercises.add(ex));
      });
    });
    return Array.from(exercises).sort();
  }, [hierarchyData]);

  // Search suggestions (filtered exercises based on search query, excluding already selected)
  const searchSuggestions = useMemo((): string[] => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const normalizedQuery = normalizeString(searchQuery);
    const selectedSet = new Set(selectedExercisesFromSearch);

    // Exercices qui commencent par la recherche (excluant ceux déjà sélectionnés)
    const startsWithQuery = allExercises
      .filter(ex => !selectedSet.has(ex) && normalizeString(ex).startsWith(normalizedQuery))
      .sort((a, b) => a.localeCompare(b));

    // Exercices qui contiennent la recherche (mais ne commencent pas par)
    const containsQuery = allExercises
      .filter(ex =>
        !selectedSet.has(ex) &&
        !normalizeString(ex).startsWith(normalizedQuery) &&
        normalizeString(ex).includes(normalizedQuery)
      )
      .sort((a, b) => a.localeCompare(b));

    return [...startsWithQuery, ...containsQuery].slice(0, 8); // Limiter à 8 suggestions
  }, [allExercises, searchQuery, selectedExercisesFromSearch]);

  // Check if we're in search mode or category mode
  const isSearchMode = selectedExercisesFromSearch.length > 0;
  const displayMode: 'none' | 'category' | 'search' = isSearchMode
    ? 'search'
    : selectedCategory
      ? 'category'
      : 'none';

  // ===========================================
  // EFFECTS
  // ===========================================

  // Load hierarchy data
  useEffect(() => {
    const loadHierarchy = async () => {
      try {
        setLoading(true);
        const data = await fetch1RMFilterHierarchy(
          userId,
          startDate || undefined,
          endDate || undefined
        );
        setHierarchyData(data);

        // Reset selections if category no longer exists
        if (selectedCategory) {
          const categoryStillExists = data.some(c => c.categoryCode === selectedCategory);
          if (!categoryStillExists) {
            setSelectedCategory(null);
          }
        } else if (data.length > 0) {
          // Présélectionner "PUSH" si disponible, sinon la première catégorie
          const pushCategory = data.find(c => c.categoryCode === 'PUSH');
          setSelectedCategory(pushCategory ? 'PUSH' : data[0].categoryCode);
        }
      } catch (err) {
        console.error('Error loading hierarchy:', err);
      } finally {
        setLoading(false);
      }
    };

    loadHierarchy();
  }, [userId, startDate, endDate]);

  // Reset hidden exercises when category changes
  useEffect(() => {
    setHiddenExercises(new Set());
  }, [selectedCategory]);

  // Load chart data when category changes (load all exercises for that category)
  useEffect(() => {
    if (availableExercises.length === 0) {
      setRawData([]);
      return;
    }

    const loadChartData = async () => {
      try {
        setLoadingChart(true);
        const history = await fetch1RMHistoryByExercises(
          userId,
          availableExercises,
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
  }, [userId, availableExercises, startDate, endDate]);

  // Load chart data when exercises are selected from search
  useEffect(() => {
    if (selectedExercisesFromSearch.length === 0) {
      return;
    }

    const loadSearchExerciseData = async () => {
      try {
        setLoadingChart(true);
        const history = await fetch1RMHistoryByExercises(
          userId,
          selectedExercisesFromSearch,
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
        console.error('Error loading search exercise data:', err);
      } finally {
        setLoadingChart(false);
      }
    };

    loadSearchExerciseData();
  }, [userId, selectedExercisesFromSearch, startDate, endDate]);

  // ===========================================
  // HANDLERS
  // ===========================================

  const handleCategorySelect = (categoryCode: string) => {
    setSelectedCategory(categoryCode);
    setSelectedExercisesFromSearch([]);
    setSearchQuery('');
    setShowCategoryDropdown(false);
  };

  const handleSearchExerciseSelect = (exerciseName: string) => {
    // Ajouter l'exercice à la liste existante
    setSelectedExercisesFromSearch(prev => [...prev, exerciseName]);
    setSelectedCategory(null);
    setSearchQuery('');
  };

  const clearAllSearchExercises = () => {
    setSelectedExercisesFromSearch([]);
    setSearchQuery('');
  };

  const removeSearchExercise = (exerciseName: string) => {
    setSelectedExercisesFromSearch(prev => prev.filter(ex => ex !== exerciseName));
  };

  const toggleExerciseVisibility = (exerciseName: string) => {
    setHiddenExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseName)) {
        newSet.delete(exerciseName);
      } else {
        newSet.add(exerciseName);
      }
      return newSet;
    });
  };

  const handleChartClick = useCallback((chartEvent: any) => {
    if (pinnedData) {
      setPinnedData(null);
      setPinnedCoordinate(null);
      return;
    }

    if (chartEvent && chartEvent.activePayload && chartEvent.activePayload[0] && lastHoverCoordRef.current) {
      const clickedData = chartEvent.activePayload[0].payload as DataPoint;
      setPinnedData(clickedData);
      setPinnedCoordinate({
        x: lastHoverCoordRef.current.x,
        y: lastHoverCoordRef.current.y,
      });
    }
  }, [pinnedData]);

  const handleContainerClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('.pinned-tooltip')) {
      return;
    }
    if (pinnedData && !target.closest('.recharts-wrapper')) {
      setPinnedData(null);
      setPinnedCoordinate(null);
    }
  }, [pinnedData]);

  const handleCoordinateChange = useCallback((coord: { x: number; y: number }) => {
    lastHoverCoordRef.current = coord;
  }, []);

  const renderHoverTooltip = useMemo(() => {
    return (props: any) => <CustomTooltip {...props} onViewDate={onViewDate} onCoordinateChange={handleCoordinateChange} />;
  }, [onViewDate, handleCoordinateChange]);

  // ===========================================
  // CHART DATA
  // ===========================================

  const { exerciseNames, chartData, colorMap, visibleChartData } = useMemo(() => {
    const exerciseSet = new Set<string>();
    rawData.forEach((d) => exerciseSet.add(d.exerciseName));
    const names = Array.from(exerciseSet).sort();

    const colors: Record<string, string> = {};
    names.forEach((name, index) => {
      colors[name] = EXERCISE_COLORS[index % EXERCISE_COLORS.length];
    });

    // Filter out hidden exercises for the chart
    const visibleData = rawData.filter(d => !hiddenExercises.has(d.exerciseName));

    return {
      exerciseNames: names,
      chartData: rawData,
      visibleChartData: visibleData,
      colorMap: colors,
    };
  }, [rawData, hiddenExercises]);

  // ===========================================
  // RENDER HELPERS
  // ===========================================

  // Search Bar Component
  const renderSearchBar = (compact = false) => (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-muted" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Rechercher un exercice..."
          className={`w-full bg-theme-secondary border border-theme rounded-xl pl-9 pr-4 text-theme placeholder-theme-muted focus:outline-none focus:border-purple-500 transition-colors ${compact ? 'py-2 text-sm' : 'py-3'}`}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-theme-muted hover:text-theme-dark"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Search Suggestions Dropdown */}
      {searchSuggestions.length > 0 && (
        <div className="absolute z-30 mt-2 w-full bg-theme-secondary border border-theme rounded-xl shadow-xl overflow-hidden">
          {searchSuggestions.map((exercise) => (
            <button
              key={exercise}
              onClick={() => handleSearchExerciseSelect(exercise)}
              className={`w-full px-4 text-left text-theme hover:bg-theme-tertiary transition-colors ${compact ? 'py-2 text-sm' : 'py-3'}`}
            >
              {exercise}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Date Filters Component
  const renderDateFilters = (options: { vertical?: boolean; showInfo?: boolean } = {}) => {
    const { vertical = false, showInfo = true } = options;
    return (
      <div className={`flex ${vertical ? 'flex-col gap-2' : 'items-start gap-2'}`}>
        <div className={`${vertical ? 'w-full' : 'flex-1'} flex flex-col items-center`}>
          <button
            onClick={() => startDateInputRef.current?.showPicker()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-theme-secondary border border-theme rounded-xl text-theme-muted hover:text-theme-dark hover:border-theme-muted transition-colors"
            title="Date de début"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Début</span>
            {startDate && (
              <span className="text-xs text-theme-secondary ml-1">
                {formatDateShort(startDate)}
              </span>
            )}
          </button>
          <input
            ref={startDateInputRef}
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="sr-only"
          />
        </div>

        <div className={`${vertical ? 'w-full' : 'flex-1'} flex flex-col items-center`}>
          <button
            onClick={() => endDateInputRef.current?.showPicker()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-theme-secondary border border-theme rounded-xl text-theme-muted hover:text-theme-dark hover:border-theme-muted transition-colors"
            title="Date de fin"
          >
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Fin</span>
            {endDate && (
              <span className="text-xs text-theme-secondary ml-1">
                {formatDateShort(endDate)}
              </span>
            )}
          </button>
          <input
            ref={endDateInputRef}
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="sr-only"
          />
        </div>

        {showInfo && !vertical && (
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShowInfoModal(true)}
              className="px-4 py-2.5 bg-theme-secondary border border-theme rounded-xl text-theme-muted hover:text-[var(--color-primary)] hover:border-blue-500/50 transition-colors"
              title="Informations sur le 1RM"
            >
              <Info className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // Selected Exercises Chips Component
  const renderSelectedChips = () => {
    if (selectedExercisesFromSearch.length === 0) return null;
    return (
      <div className="flex flex-wrap items-center gap-2">
        {selectedExercisesFromSearch.map((exercise) => (
          <div
            key={exercise}
            className="flex items-center gap-1.5 bg-purple-500/20 border border-purple-500/30 rounded-lg px-3 py-1.5"
          >
            <span className="text-purple-400 text-sm font-medium">{exercise}</span>
            <button
              onClick={() => removeSearchExercise(exercise)}
              className="p-0.5 text-purple-400 hover:text-purple-200 transition-colors"
              title="Retirer cet exercice"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {selectedExercisesFromSearch.length > 1 && (
          <button
            onClick={clearAllSearchExercises}
            className="px-3 py-1.5 bg-theme-secondary border border-theme rounded-lg text-theme-muted hover:text-theme-dark hover:border-theme-muted transition-colors text-sm"
            title="Tout effacer"
          >
            Tout effacer
          </button>
        )}
      </div>
    );
  };

  // Category Dropdown Component
  const renderCategoryDropdown = () => {
    if (hierarchyData.length === 0 || selectedExercisesFromSearch.length > 0) return null;
    return (
      <div className="relative">
        <button
          onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
          className="w-full flex items-center justify-between bg-theme-secondary border border-theme rounded-xl px-4 py-3 text-left"
        >
          <span className={`font-medium truncate ${selectedCategoryName ? 'text-theme' : 'text-theme-muted'}`}>
            {selectedCategoryName || 'Sélectionner une catégorie'}
          </span>
          <ChevronDown
            className={`w-5 h-5 text-theme-muted transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`}
          />
        </button>

        {showCategoryDropdown && (
          <div className="absolute z-20 mt-2 w-full bg-theme-secondary border border-theme rounded-xl shadow-xl overflow-hidden">
            {hierarchyData.map((category) => (
              <button
                key={category.categoryCode}
                onClick={() => handleCategorySelect(category.categoryCode)}
                className={`
                  w-full px-4 py-3 text-left hover:bg-theme-tertiary transition-colors flex items-center justify-between
                  ${category.categoryCode === selectedCategory ? 'bg-purple-500/20 text-purple-400' : 'text-theme'}
                `}
              >
                <span>{category.categoryName}</span>
                <span className="text-xs text-theme-muted">
                  {category.muscleGroups.reduce((sum, mg) => sum + mg.exercises.length, 0)} exercices
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Chart Component
  const renderChart = (heightClass = 'h-64') => (
    <div className={`${heightClass} relative`} ref={chartContainerRef} onClick={handleContainerClick}>
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart
          margin={{ top: 5, right: 5, left: -10, bottom: 5 }}
          onClick={handleChartClick}
        >
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
          {!pinnedData && (
            <Tooltip
              content={renderHoverTooltip}
              cursor={{ stroke: '#475569', strokeDasharray: '3 3' }}
              wrapperStyle={{ zIndex: 100, pointerEvents: 'none' }}
              allowEscapeViewBox={{ x: true, y: true }}
              position={{ y: 0 }}
            />
          )}
          {exerciseNames
            .filter(name => !hiddenExercises.has(name))
            .map((name) => (
              <Scatter
                key={name}
                name={name}
                data={visibleChartData.filter((d) => d.exerciseName === name)}
                fill={colorMap[name]}
                line={{ stroke: colorMap[name], strokeWidth: 1.5 }}
                isAnimationActive={false}
              />
            ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* Pinned Tooltip */}
      {pinnedData && pinnedCoordinate && (
        <div className="pinned-tooltip" onClick={(e) => e.stopPropagation()}>
          <ChartTooltipOverlay
            data={{
              date: pinnedData.date,
              label: pinnedData.exerciseName,
              primaryValue: `${pinnedData.estimated1RM} kg`,
              primaryColor: 'text-[var(--color-success)]',
            }}
            position={{
              x: pinnedCoordinate.x,
              y: pinnedCoordinate.y,
              containerWidth: chartContainerRef.current?.offsetWidth,
              containerHeight: chartContainerRef.current?.offsetHeight,
            }}
            onViewDate={onViewDate}
          />
        </div>
      )}
    </div>
  );

  // Legend Component (mode: 'toggle' for mobile eye toggle, 'remove' for desktop X removal)
  const renderLegend = (mode: 'toggle' | 'remove' = 'toggle') => (
    <div className={`${mode === 'toggle' ? 'mt-4 pt-3 border-t border-theme' : ''} space-y-2`}>
      {exerciseNames.map((name) => {
        const isHidden = hiddenExercises.has(name);
        return (
          <button
            key={name}
            onClick={() => {
              if (mode === 'remove') {
                // En mode remove: retirer l'exercice de la sélection
                removeSearchExercise(name);
              } else {
                // En mode toggle: masquer/afficher l'exercice
                toggleExerciseVisibility(name);
              }
            }}
            className={`
              w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all
              ${isHidden
                ? 'bg-theme-secondary/30 opacity-50'
                : 'bg-theme-secondary/50 hover:bg-theme-tertiary/50'
              }
            `}
          >
            <div
              className={`w-3 h-3 rounded-full flex-shrink-0 ${isHidden ? 'opacity-40' : ''}`}
              style={{ backgroundColor: colorMap[name] }}
            />
            <span className={`flex-1 text-left text-sm ${isHidden ? 'text-theme-muted' : 'text-theme-secondary'}`}>
              {name}
            </span>
            {mode === 'toggle' ? (
              isHidden ? (
                <EyeOff className="w-4 h-4 text-theme-muted flex-shrink-0" />
              ) : (
                <Eye className="w-4 h-4 text-theme-muted flex-shrink-0" />
              )
            ) : (
              <X className="w-4 h-4 text-theme-muted hover:text-red-400 flex-shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );

  // Exercises List for Desktop Left Panel (grouped by category with muscle groups)
  const renderExercisesList = () => (
    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
      {hierarchyData.map((category) => (
        <div key={category.categoryCode} className="space-y-2">
          <h4 className="text-xs font-bold text-theme-muted uppercase tracking-wider px-1">
            {category.categoryName}
          </h4>
          {category.muscleGroups.map((muscleGroup) => (
            <div key={muscleGroup.id} className="space-y-1">
              <span className="text-[10px] text-theme-muted uppercase px-2">{muscleGroup.name}</span>
              <div className="space-y-0.5">
                {muscleGroup.exercises.map((exercise) => {
                  const isSelected = selectedExercisesFromSearch.includes(exercise);
                  return (
                    <button
                      key={exercise}
                      onClick={() => {
                        if (isSelected) {
                          removeSearchExercise(exercise);
                        } else {
                          handleSearchExerciseSelect(exercise);
                        }
                      }}
                      className={`
                        w-full text-left px-2 py-1.5 rounded-lg text-sm transition-colors
                        ${isSelected
                          ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          : 'text-theme-secondary hover:bg-theme-tertiary/50 hover:text-theme-dark'
                        }
                      `}
                    >
                      {exercise}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  // ===========================================
  // RENDER
  // ===========================================

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (hierarchyData.length === 0 && !startDate && !endDate) {
    return (
      <div className="bg-theme-secondary/50 border border-theme rounded-xl p-8 text-center">
        <TrendingUp className="w-12 h-12 text-theme-muted mx-auto mb-3" />
        <p className="text-theme-muted">Aucune donnée de 1RM disponible</p>
        <p className="text-theme-muted text-sm mt-1">Complète des séances pour voir ta progression</p>
      </div>
    );
  }

  // ===========================================
  // DESKTOP LAYOUT (Split-screen)
  // ===========================================
  if (layout === 'desktop') {
    return (
      <div className="flex gap-6">
        {/* Left Panel: Filters + Exercises List */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Date Filters */}
          <div className="bg-theme-secondary/50 border border-theme rounded-xl p-4">
            <h4 className="text-sm font-medium text-theme mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-theme-muted" />
              Période
            </h4>
            {renderDateFilters({ showInfo: false })}
          </div>

          {/* Search */}
          {hierarchyData.length > 0 && (
            <div>
              {renderSearchBar(true)}
            </div>
          )}

          {/* Exercises List */}
          <div className="bg-theme-secondary/50 border border-theme rounded-xl p-4">
            <h4 className="text-sm font-medium text-theme mb-3">
              Exercices disponibles
            </h4>
            {renderExercisesList()}
          </div>
        </div>

        {/* Right Panel: Chart + Legend */}
        <div className="flex-1 space-y-4">
          {/* Chart Card */}
          <div className="bg-theme-secondary/50 border border-theme rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-theme font-medium flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
                Évolution 1RM Estimé
              </h3>
              <button
                ref={infoButtonRef}
                onClick={() => setShowInfoModal(true)}
                className="p-2 text-theme-muted hover:text-[var(--color-primary)] transition-colors"
                title="Informations sur le 1RM"
              >
                <Info className="w-5 h-5" />
              </button>
            </div>

            {hierarchyData.length === 0 ? (
              <div className="text-center py-8 text-theme-muted">
                <p>Aucune donnée pour cette période</p>
                <p className="text-xs mt-1">Modifie les dates pour voir les données</p>
              </div>
            ) : selectedExercisesFromSearch.length === 0 ? (
              <div className="text-center py-12 text-theme-muted">
                <Search className="w-10 h-10 mx-auto mb-3 text-theme-muted" />
                <p>Sélectionne des exercices dans la liste de gauche</p>
                <p className="text-xs mt-1">ou utilise la barre de recherche</p>
              </div>
            ) : loadingChart ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
              </div>
            ) : chartData.length === 0 ? (
              <div className="text-center py-8 text-theme-muted">
                <p>Pas de données pour cette sélection</p>
              </div>
            ) : (
              <>
                {renderChart('h-80')}
                {renderLegend('remove')}
              </>
            )}
          </div>
        </div>

        {/* Info Modal */}
        <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} anchorRef={infoButtonRef} />
      </div>
    );
  }

  // ===========================================
  // MOBILE LAYOUT (Original vertical layout)
  // ===========================================
  return (
    <div className="space-y-3">
      {/* Search Bar */}
      {hierarchyData.length > 0 && renderSearchBar()}

      {/* Selected Exercises from Search (chips) */}
      {renderSelectedChips()}

      {/* Category Filter - Only show when not in search mode */}
      {renderCategoryDropdown()}

      {/* Chart */}
      <div className="bg-theme-secondary/50 border border-theme rounded-xl p-4">
        <h3 className="text-theme font-medium mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-[var(--color-success)]" />
          Évolution 1RM Estimé
        </h3>

        {hierarchyData.length === 0 ? (
          <div className="text-center py-8 text-theme-muted">
            <p>Aucune donnée pour cette période</p>
            <p className="text-xs mt-1">Modifie les dates pour voir les données</p>
          </div>
        ) : !selectedCategory && selectedExercisesFromSearch.length === 0 ? (
          <div className="text-center py-8 text-theme-muted">
            <p>Recherche un exercice ou sélectionne une catégorie</p>
          </div>
        ) : loadingChart ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-purple-500 animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-8 text-theme-muted">
            <p>Pas de données pour cette sélection</p>
          </div>
        ) : (
          <>
            {renderChart()}
            {renderLegend('toggle')}
          </>
        )}
      </div>

      {/* Date Filters - Below chart */}
      {renderDateFilters()}

      {/* Info Modal */}
      <InfoModal isOpen={showInfoModal} onClose={() => setShowInfoModal(false)} />
    </div>
  );
};

export default OneRMProgressChart;
