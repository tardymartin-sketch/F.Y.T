// ============================================================
// F.Y.T - STRAVA IMPORT PAGE
// src/components/StravaImport.tsx
// Mobile-optimized version
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Link2, Link2Off, RefreshCw, Download, Check, CheckSquare, 
  Square, Activity, Heart, Clock, MapPin, TrendingUp,
  ChevronDown, ChevronUp, AlertCircle, Loader2, ExternalLink,
  Search, Zap, BarChart3, Filter, HelpCircle
} from 'lucide-react';
import { stravaService } from '../services/stravaService';
import { StravaActivityMap } from './StravaActivityMap';
import { StravaActivityCharts } from './StravaActivityCharts';
import type { 
  StravaConnection, 
  StravaActivityCard, 
  StravaSportType,
  StravaActivityDB
} from '../types/strava';
import { User } from '../../types';

// ============================================================
// Props & Types
// ============================================================

interface StravaImportProps {
  user: User;
}

interface FilterState {
  sportType: StravaSportType | 'all';
  showImported: boolean;
  searchQuery: string;
}

interface ExtendedActivityCard extends StravaActivityCard {
  rawData?: StravaActivityDB;
}

// ============================================================
// Sub-Components
// ============================================================

const InstructionsPanel: React.FC<{ isConnected: boolean }> = ({ isConnected }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-xl border border-slate-700/50 mb-4 overflow-hidden">
      {/* Collapsible header */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 md:p-4"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-orange-500" />
          <span className="text-sm font-medium text-white">Comment ça marche ?</span>
          {isConnected && (
            <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
              Connecté
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {/* Collapsible content */}
      {isOpen && (
        <div className="px-3 pb-3 md:px-4 md:pb-4 border-t border-slate-700/50">
          <div className="grid gap-3 md:grid-cols-3 pt-3">
            {[
              {
                num: 1,
                title: "Connecte Strava",
                desc: isConnected ? "✅ Connecté !" : "Autorise F.Y.T"
              },
              {
                num: 2,
                title: "Synchronise",
                desc: "Ta montre → Strava"
              },
              {
                num: 3,
                title: "Importe",
                desc: "Sélectionne & importe"
              }
            ].map((step) => (
              <div key={step.num} className="flex gap-2 items-start">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-bold">
                  {step.num}
                </div>
                <div className="min-w-0">
                  <h3 className="font-medium text-white text-xs">{step.title}</h3>
                  <p className="text-slate-400 text-xs truncate">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const ActivityCard: React.FC<{
  activity: ExtendedActivityCard;
  isSelected: boolean;
  onToggleSelect: () => void;
  onLoadDetails: () => Promise<void>;
  isLoadingDetails: boolean;
}> = ({ activity, isSelected, onToggleSelect, onLoadDetails, isLoadingDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const handleExpand = async () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    
    if (newExpanded && !activity.rawData?.streams_data) {
      await onLoadDetails();
    }
  };

  return (
    <div 
      className={`
        bg-slate-800/50 rounded-xl border transition-all duration-200
        ${isSelected 
          ? 'border-orange-500 ring-1 ring-orange-500/50' 
          : 'border-slate-700/50'}
        ${activity.isImported ? 'opacity-60' : ''}
      `}
    >
      {/* Compact card header - always visible */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          {/* Checkbox */}
          <button
            onClick={onToggleSelect}
            disabled={activity.isImported}
            className={`
              flex-shrink-0 transition-colors
              ${activity.isImported 
                ? 'text-slate-600 cursor-not-allowed' 
                : isSelected 
                  ? 'text-orange-500' 
                  : 'text-slate-500 hover:text-slate-300'}
            `}
          >
            {isSelected ? (
              <CheckSquare className="w-5 h-5" />
            ) : (
              <Square className="w-5 h-5" />
            )}
          </button>

          {/* Sport icon */}
          <div 
            className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base"
            style={{ backgroundColor: `${activity.sportColor}20` }}
          >
            {activity.sportIcon}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Line 1: Title + imported badge */}
            <div className="flex items-center gap-1.5">
              <h3 className="font-medium text-white text-sm truncate">{activity.name}</h3>
              {activity.isImported && (
                <span className="flex-shrink-0 px-1.5 py-0.5 text-[10px] bg-emerald-500/20 text-emerald-400 rounded">
                  ✓
                </span>
              )}
            </div>
            {/* Line 2: Date */}
            <p className="text-xs text-slate-500 truncate">{activity.dateFormatted}</p>
            {/* Line 3: Metrics */}
            <p className="text-xs text-slate-400 truncate mt-0.5">
              <span className="text-blue-400">{activity.duration}</span>
              {activity.distance && <span className="text-slate-500"> · </span>}
              {activity.distance && <span className="text-emerald-400">{activity.distance}</span>}
              {activity.elevation && <span className="text-slate-500"> · </span>}
              {activity.elevation && <span className="text-orange-400">{activity.elevation}</span>}
            </p>
          </div>

          {/* Expand button */}
          <button
            onClick={handleExpand}
            className="flex-shrink-0 p-1.5 text-slate-500 hover:text-white transition-colors rounded-lg hover:bg-slate-700/50"
          >
            {isLoadingDetails ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-slate-700/50 p-3 space-y-3">
          {/* Detailed metrics grid */}
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-slate-900/50 rounded-lg p-2 text-center">
              <Clock className="w-3 h-3 text-slate-500 mx-auto mb-0.5" />
              <p className="font-mono text-xs text-white">{activity.duration}</p>
            </div>
            {activity.distance && (
              <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                <MapPin className="w-3 h-3 text-slate-500 mx-auto mb-0.5" />
                <p className="font-mono text-xs text-white">{activity.distance}</p>
              </div>
            )}
            {activity.avgHeartrate && (
              <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                <Heart className="w-3 h-3 text-red-400 mx-auto mb-0.5" />
                <p className="font-mono text-xs text-white">{Math.round(activity.avgHeartrate)}</p>
              </div>
            )}
            {activity.elevation && (
              <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                <TrendingUp className="w-3 h-3 text-slate-500 mx-auto mb-0.5" />
                <p className="font-mono text-xs text-white">{activity.elevation}</p>
              </div>
            )}
            {(activity.pace || activity.speed) && (
              <div className="bg-slate-900/50 rounded-lg p-2 text-center">
                <Zap className="w-3 h-3 text-slate-500 mx-auto mb-0.5" />
                <p className="font-mono text-xs text-white">{activity.pace || activity.speed}</p>
              </div>
            )}
          </div>

          {/* Map/Charts toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowCharts(false)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                !showCharts ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              <MapPin className="w-3 h-3" />
              Carte
            </button>
            <button
              onClick={() => setShowCharts(true)}
              className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${
                showCharts ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300'
              }`}
            >
              <BarChart3 className="w-3 h-3" />
              Graphiques
            </button>
          </div>

          {/* Map View */}
          {!showCharts && (
            activity.hasMap && activity.polyline ? (
              <div className="h-40 md:h-48 rounded-lg overflow-hidden">
                <StravaActivityMap 
                  polyline={activity.polyline}
                  sportColor={activity.sportColor}
                />
              </div>
            ) : (
              <div className="h-24 bg-slate-900/50 rounded-lg flex items-center justify-center text-slate-500 text-xs">
                <MapPin className="w-4 h-4 mr-1.5 opacity-50" />
                Pas de tracé GPS
              </div>
            )
          )}

          {/* Charts View */}
          {showCharts && (
            <StravaActivityCharts
              streams={activity.rawData?.streams_data || null}
              segments={activity.rawData?.segment_efforts || undefined}
              sportType={activity.sportType}
              compact={true}
            />
          )}
          
          {/* Extra info badges */}
          <div className="flex flex-wrap gap-1.5">
            {activity.maxHeartrate && (
              <span className="px-2 py-0.5 bg-red-500/10 text-red-400 rounded text-[10px]">
                Max: {activity.maxHeartrate}bpm
              </span>
            )}
            {activity.rawData?.calories && (
              <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-400 rounded text-[10px]">
                {activity.rawData.calories}kcal
              </span>
            )}
            <a
              href={`https://www.strava.com/activities/${activity.stravaId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 bg-orange-500/10 text-orange-400 rounded text-[10px] flex items-center gap-1"
            >
              Strava <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Main Component
// ============================================================

export const StravaImport: React.FC<StravaImportProps> = ({ user }) => {
  const userId = user.id;
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [connection, setConnection] = useState<StravaConnection | null>(null);
  const [activities, setActivities] = useState<ExtendedActivityCard[]>([]);
  const [activitiesRaw, setActivitiesRaw] = useState<Map<string, StravaActivityDB>>(new Map());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loadingDetailsId, setLoadingDetailsId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    sportType: 'all',
    showImported: true,
    searchQuery: '',
  });

  // --------------------------------------------------------
  // Data Loading
  // --------------------------------------------------------

  const loadConnection = useCallback(async () => {
    try {
      const conn = await stravaService.getConnection(userId);
      setConnection(conn);
      return conn;
    } catch (err) {
      console.error('Failed to load Strava connection:', err);
      return null;
    }
  }, [userId]);

  const loadActivities = useCallback(async () => {
    try {
      const dbActivities = await stravaService.getActivities(userId);
      
      const rawMap = new Map<string, StravaActivityDB>();
      dbActivities.forEach(a => rawMap.set(a.id, a));
      setActivitiesRaw(rawMap);
      
      const cards: ExtendedActivityCard[] = dbActivities.map(a => ({
        ...stravaService.activityToCard(a),
        rawData: a,
      }));
      setActivities(cards);
    } catch (err) {
      console.error('Failed to load activities:', err);
      setError('Impossible de charger les activités');
    }
  }, [userId]);

  const loadActivityDetails = useCallback(async (activityId: string) => {
    const rawData = activitiesRaw.get(activityId);
    if (!rawData) return;
    
    setLoadingDetailsId(activityId);
    try {
      const updated = await stravaService.syncSingleActivity(userId, rawData.strava_activity_id);
      if (updated) {
        setActivitiesRaw(prev => {
          const newMap = new Map(prev);
          newMap.set(activityId, updated);
          return newMap;
        });
        
        setActivities(prev => prev.map(a => 
          a.id === activityId 
            ? { ...a, rawData: updated }
            : a
        ));
      }
    } catch (err) {
      console.error('Failed to load activity details:', err);
    } finally {
      setLoadingDetailsId(null);
    }
  }, [userId, activitiesRaw]);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const conn = await loadConnection();
      if (conn) {
        await loadActivities();
      }
      setIsLoading(false);
    };
    init();
  }, [loadConnection, loadActivities]);

  // --------------------------------------------------------
  // OAuth Callback Handler
  // --------------------------------------------------------

  useEffect(() => {
    const handleCallback = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get('code');
      const errorParam = urlParams.get('error');

      if (errorParam) {
        setError('Autorisation Strava refusée');
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      if (code) {
        setIsLoading(true);
        try {
          const tokens = await stravaService.exchangeCodeForTokens(code);
          const conn = await stravaService.saveConnection(userId, tokens);
          setConnection(conn);

          setIsSyncing(true);
          const count = await stravaService.syncInitialActivities(userId, true);
          
          await loadActivities();
          setSuccessMessage(`${count} activités synchronisées !`);
          
          window.history.replaceState({}, '', window.location.pathname);
        } catch (err) {
          console.error('OAuth callback error:', err);
          setError('Erreur lors de la connexion à Strava');
        } finally {
          setIsLoading(false);
          setIsSyncing(false);
        }
      }
    };

    handleCallback();
  }, [userId, loadActivities]);

  // --------------------------------------------------------
  // Actions
  // --------------------------------------------------------

  const handleConnect = () => {
    const authUrl = stravaService.getAuthorizationUrl(userId);
    window.location.href = authUrl;
  };

  const handleDisconnect = async () => {
    if (!confirm('Déconnecter Strava ?')) return;

    try {
      await stravaService.disconnect(userId);
      setConnection(null);
      setActivities([]);
      setSelectedIds(new Set());
    } catch (err) {
      setError('Erreur lors de la déconnexion');
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setError(null);
    try {
      const count = await stravaService.syncInitialActivities(userId, true);
      await loadActivities();
      setSuccessMessage(`${count} activités synchronisées !`);
    } catch (err) {
      setError('Erreur lors de la synchronisation');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    const selectableIds = filteredActivities
      .filter(a => !a.isImported)
      .map(a => a.id);
    
    if (selectedIds.size === selectableIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(selectableIds));
    }
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;

    setIsImporting(true);
    setError(null);
    try {
      const result = await stravaService.importToHistory(userId, Array.from(selectedIds));
      
      await loadActivities();
      setSelectedIds(new Set());
      
      if (result.failed > 0) {
        setSuccessMessage(`${result.success} importées (${result.failed} échecs)`);
      } else {
        setSuccessMessage(`${result.success} activités importées !`);
      }
    } catch (err) {
      setError("Erreur lors de l'import");
    } finally {
      setIsImporting(false);
    }
  };

  // --------------------------------------------------------
  // Filtering
  // --------------------------------------------------------

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      if (filters.sportType !== 'all' && activity.sportType !== filters.sportType) {
        return false;
      }
      
      if (!filters.showImported && activity.isImported) {
        return false;
      }
      
      if (filters.searchQuery) {
        const query = filters.searchQuery.toLowerCase();
        if (!activity.name.toLowerCase().includes(query)) {
          return false;
        }
      }
      
      return true;
    });
  }, [activities, filters]);

  const sportTypes = useMemo(() => {
    const types = new Set(activities.map(a => a.sportType));
    return Array.from(types);
  }, [activities]);

  const selectableCount = filteredActivities.filter(a => !a.isImported).length;
  const activeFiltersCount = [
    filters.sportType !== 'all',
    !filters.showImported,
    filters.searchQuery.length > 0
  ].filter(Boolean).length;

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-6 h-6 animate-spin text-orange-500 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header - Compact on mobile */}
      <div className="mb-4">
        <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
          <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Activity className="w-4 h-4 md:w-5 md:h-5 text-white" />
          </div>
          Importer
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Sync Strava → F.Y.T
        </p>
      </div>

      {/* Instructions - Collapsible */}
      <InstructionsPanel isConnected={!!connection} />

      {/* Alerts - Compact */}
      {error && (
        <div className="mb-3 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p className="flex-1">{error}</p>
          <button onClick={() => setError(null)} className="text-red-300 hover:text-white text-lg">×</button>
        </div>
      )}

      {successMessage && (
        <div className="mb-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          <p className="flex-1">{successMessage}</p>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-300 hover:text-white text-lg">×</button>
        </div>
      )}

      {/* Connection Status - Compact */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            {connection ? (
              <>
                <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                  <Link2 className="w-4 h-4 text-orange-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-medium truncate">
                    {connection.strava_firstname} {connection.strava_lastname}
                  </p>
                  <p className="text-xs text-slate-500">
                    {connection.last_sync_at 
                      ? `Sync: ${new Date(connection.last_sync_at).toLocaleDateString('fr-FR')}`
                      : 'Connecté'
                    }
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <Link2Off className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-slate-400 text-sm">Non connecté</p>
              </>
            )}
          </div>

          <div className="flex gap-2 flex-shrink-0">
            {connection ? (
              <>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
                  title="Actualiser"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
                <button
                  onClick={handleDisconnect}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                  title="Déconnecter"
                >
                  <Link2Off className="w-4 h-4" />
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl flex items-center gap-2 text-sm font-medium transition-all shadow-lg shadow-orange-500/25"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                </svg>
                <span className="hidden sm:inline">Connecter</span> Strava
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activities Section */}
      {connection && (
        <>
          {/* Import Action Bar - Sticky */}
          {selectedIds.size > 0 && (
            <div className="sticky top-2 z-10 mb-3 p-3 bg-orange-500/95 backdrop-blur-sm rounded-xl flex items-center justify-between shadow-lg">
              <span className="text-white text-sm font-medium">
                {selectedIds.size} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </span>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="px-3 py-1.5 bg-white text-orange-600 rounded-lg text-sm font-medium flex items-center gap-1.5 hover:bg-orange-50 transition-colors disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                {isImporting ? 'Import...' : 'Importer'}
              </button>
            </div>
          )}

          {/* Filters - Collapsible on mobile */}
          <div className="mb-3">
            {/* Mobile: Filter toggle button */}
            <div className="flex gap-2 md:hidden mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
                  className="w-full pl-8 pr-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-3 py-2 rounded-lg flex items-center gap-1.5 text-sm transition-colors ${
                  showFilters || activeFiltersCount > 0
                    ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                {activeFiltersCount > 0 && (
                  <span className="w-4 h-4 bg-orange-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {activeFiltersCount}
                  </span>
                )}
              </button>
            </div>

            {/* Mobile: Expandable filters */}
            {showFilters && (
              <div className="flex flex-wrap gap-2 p-3 bg-slate-800/30 rounded-xl mb-2 md:hidden">
                <select
                  value={filters.sportType}
                  onChange={(e) => setFilters(f => ({ ...f, sportType: e.target.value as StravaSportType | 'all' }))}
                  className="flex-1 min-w-[120px] px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white text-sm focus:outline-none"
                >
                  <option value="all">Tous sports</option>
                  {sportTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>

                <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-700">
                  <input
                    type="checkbox"
                    checked={filters.showImported}
                    onChange={(e) => setFilters(f => ({ ...f, showImported: e.target.checked }))}
                    className="rounded border-slate-600 bg-slate-800 text-orange-500 w-3.5 h-3.5"
                  />
                  Importés
                </label>

                {selectableCount > 0 && (
                  <button
                    onClick={handleSelectAll}
                    className="px-3 py-2 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-1.5"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    {selectedIds.size === selectableCount ? 'Aucune' : 'Toutes'}
                  </button>
                )}
              </div>
            )}

            {/* Desktop: Always visible filters */}
            <div className="hidden md:flex items-center gap-3 p-3 bg-slate-800/30 rounded-xl">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher une activité..."
                  value={filters.searchQuery}
                  onChange={(e) => setFilters(f => ({ ...f, searchQuery: e.target.value }))}
                  className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:border-orange-500/50"
                />
              </div>

              <select
                value={filters.sportType}
                onChange={(e) => setFilters(f => ({ ...f, sportType: e.target.value as StravaSportType | 'all' }))}
                className="px-4 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-orange-500/50"
              >
                <option value="all">Tous les sports</option>
                {sportTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>

              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.showImported}
                  onChange={(e) => setFilters(f => ({ ...f, showImported: e.target.checked }))}
                  className="rounded border-slate-600 bg-slate-800 text-orange-500 focus:ring-orange-500/50"
                />
                Afficher importés
              </label>

              {selectableCount > 0 && (
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
                >
                  <CheckSquare className="w-4 h-4" />
                  {selectedIds.size === selectableCount ? 'Désélectionner' : 'Tout sélectionner'}
                </button>
              )}
            </div>
          </div>

          {/* Activities List */}
          <div className="space-y-2">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aucune activité trouvée</p>
                {activities.length === 0 && (
                  <button
                    onClick={handleSync}
                    className="mt-3 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg inline-flex items-center gap-2 text-sm"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Synchroniser
                  </button>
                )}
              </div>
            ) : (
              filteredActivities.map(activity => (
                <ActivityCard
                  key={activity.id}
                  activity={activity}
                  isSelected={selectedIds.has(activity.id)}
                  onToggleSelect={() => handleToggleSelect(activity.id)}
                  onLoadDetails={() => loadActivityDetails(activity.id)}
                  isLoadingDetails={loadingDetailsId === activity.id}
                />
              ))
            )}
          </div>

          {/* Stats Footer - Compact */}
          {activities.length > 0 && (
            <div className="mt-4 p-3 bg-slate-800/30 rounded-xl text-center text-xs text-slate-500">
              {activities.length} synchronisée{activities.length > 1 ? 's' : ''} · {activities.filter(a => a.isImported).length} importée{activities.filter(a => a.isImported).length > 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StravaImport;
