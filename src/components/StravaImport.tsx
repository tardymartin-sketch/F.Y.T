// ============================================================
// F.Y.T - STRAVA IMPORT PAGE
// src/components/StravaImport.tsx
// ============================================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Link2, Link2Off, RefreshCw, Download, Check, CheckSquare, 
  Square, Activity, Heart, Clock, MapPin, TrendingUp,
  ChevronDown, ChevronUp, AlertCircle, Loader2, ExternalLink,
  Search, Zap, BarChart3
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
// Props
// ============================================================

interface StravaImportProps {
  user: User;
}

interface FilterState {
  sportType: StravaSportType | 'all';
  showImported: boolean;
  searchQuery: string;
}

// Extended activity card with raw data for charts
interface ExtendedActivityCard extends StravaActivityCard {
  rawData?: StravaActivityDB;
}

// ============================================================
// Sub-Components
// ============================================================

const InstructionsPanel: React.FC<{ isConnected: boolean }> = ({ isConnected }) => (
  <div className="bg-gradient-to-br from-slate-800/50 to-slate-900/50 rounded-2xl p-6 border border-slate-700/50 mb-6">
    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
      <Activity className="w-5 h-5 text-orange-500" />
      Comment ça fonctionne ?
    </h2>
    
    <div className="grid gap-4 md:grid-cols-3">
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
          1
        </div>
        <div>
          <h3 className="font-medium text-white text-sm">Connecte ton compte Strava</h3>
          <p className="text-slate-400 text-xs mt-1">
            {isConnected 
              ? "✅ Ton compte Strava est connecté !" 
              : "Clique sur le bouton ci-dessous pour autoriser F.Y.T à accéder à tes activités."}
          </p>
        </div>
      </div>
      
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
          2
        </div>
        <div>
          <h3 className="font-medium text-white text-sm">Synchronise ton appareil</h3>
          <p className="text-slate-400 text-xs mt-1">
            Assure-toi que ta montre Garmin, Polar, Suunto ou autre est bien synchronisée avec Strava.
          </p>
        </div>
      </div>
      
      <div className="flex gap-3">
        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 font-bold">
          3
        </div>
        <div>
          <h3 className="font-medium text-white text-sm">Importe tes activités</h3>
          <p className="text-slate-400 text-xs mt-1">
            Sélectionne les activités que tu veux ajouter à ton historique F.Y.T.
          </p>
        </div>
      </div>
    </div>
  </div>
);

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
    
    // Charger les détails si on expand et qu'on n'a pas encore les streams
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
          : 'border-slate-700/50 hover:border-slate-600'}
        ${activity.isImported ? 'opacity-60' : ''}
      `}
    >
      <div className="p-4">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggleSelect}
            disabled={activity.isImported}
            className={`
              flex-shrink-0 mt-0.5 transition-colors
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

          <div 
            className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: `${activity.sportColor}20` }}
          >
            {activity.sportIcon}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-white truncate">{activity.name}</h3>
              {activity.isImported && (
                <span className="flex-shrink-0 px-2 py-0.5 text-xs bg-emerald-500/20 text-emerald-400 rounded-full">
                  Importé
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400 mt-0.5">
              {activity.dateFormatted}
            </p>
          </div>

          <button
            onClick={handleExpand}
            className="flex-shrink-0 p-1 text-slate-500 hover:text-white transition-colors"
          >
            {isLoadingDetails ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isExpanded ? (
              <ChevronUp className="w-5 h-5" />
            ) : (
              <ChevronDown className="w-5 h-5" />
            )}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          <div className="bg-slate-900/50 rounded-lg p-2">
            <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Durée</span>
            </div>
            <p className="font-mono text-sm text-white">{activity.duration}</p>
          </div>

          {activity.distance && (
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                <MapPin className="w-3.5 h-3.5" />
                <span>Distance</span>
              </div>
              <p className="font-mono text-sm text-white">{activity.distance}</p>
            </div>
          )}

          {(activity.pace || activity.speed) && (
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                <Zap className="w-3.5 h-3.5" />
                <span>{activity.pace ? 'Allure' : 'Vitesse'}</span>
              </div>
              <p className="font-mono text-sm text-white">
                {activity.pace || activity.speed}
              </p>
            </div>
          )}

          {activity.hasHeartrate && activity.avgHeartrate && (
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                <Heart className="w-3.5 h-3.5" />
                <span>FC moy.</span>
              </div>
              <p className="font-mono text-sm text-white">
                {Math.round(activity.avgHeartrate)} <span className="text-slate-500 text-xs">bpm</span>
              </p>
            </div>
          )}

          {activity.elevation && (
            <div className="bg-slate-900/50 rounded-lg p-2">
              <div className="flex items-center gap-1.5 text-slate-500 text-xs mb-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>D+</span>
              </div>
              <p className="font-mono text-sm text-white">{activity.elevation}</p>
            </div>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-700/50 p-4 space-y-4">
          {/* Toggle between Map and Charts */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowCharts(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                !showCharts ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Carte
            </button>
            <button
              onClick={() => setShowCharts(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${
                showCharts ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Graphiques
            </button>
          </div>

          {/* Map View */}
          {!showCharts && (
            activity.hasMap && activity.polyline ? (
              <div className="h-48 rounded-lg overflow-hidden">
                <StravaActivityMap 
                  polyline={activity.polyline}
                  sportColor={activity.sportColor}
                />
              </div>
            ) : (
              <div className="h-32 bg-slate-900/50 rounded-lg flex items-center justify-center text-slate-500 text-sm">
                <MapPin className="w-5 h-5 mr-2 opacity-50" />
                Pas de tracé GPS disponible
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
          
          <div className="flex flex-wrap gap-2">
            {activity.maxHeartrate && (
              <span className="px-2 py-1 bg-red-500/10 text-red-400 rounded text-xs">
                FC max: {activity.maxHeartrate} bpm
              </span>
            )}
            {activity.rawData?.calories && (
              <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">
                {activity.rawData.calories} kcal
              </span>
            )}
            {activity.rawData?.device_name && (
              <span className="px-2 py-1 bg-slate-500/10 text-slate-400 rounded text-xs">
                {activity.rawData.device_name}
              </span>
            )}
            <a
              href={`https://www.strava.com/activities/${activity.stravaId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 bg-orange-500/10 text-orange-400 rounded text-xs flex items-center gap-1 hover:bg-orange-500/20 transition-colors"
            >
              Voir sur Strava
              <ExternalLink className="w-3 h-3" />
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
      
      // Store raw data
      const rawMap = new Map<string, StravaActivityDB>();
      dbActivities.forEach(a => rawMap.set(a.id, a));
      setActivitiesRaw(rawMap);
      
      // Convert to cards with raw data reference
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
        // Update raw data
        setActivitiesRaw(prev => {
          const newMap = new Map(prev);
          newMap.set(activityId, updated);
          return newMap;
        });
        
        // Update activities
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
          setSuccessMessage(`${count} activités synchronisées avec succès !`);
          
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
    if (!confirm('Déconnecter ton compte Strava ? Tes activités importées resteront dans ton historique.')) {
      return;
    }

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
        setSuccessMessage(`${result.success} activités importées (${result.failed} échecs)`);
      } else {
        setSuccessMessage(`${result.success} activités importées dans ton historique !`);
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

  // --------------------------------------------------------
  // Render
  // --------------------------------------------------------

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-400">Chargement des activités...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          Importer mes activités
        </h1>
        <p className="text-slate-400 mt-2">
          Synchronise tes entraînements depuis Strava vers ton historique F.Y.T.
        </p>
      </div>

      {/* Instructions */}
      <InstructionsPanel isConnected={!!connection} />

      {/* Alerts */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>{error}</p>
          <button 
            onClick={() => setError(null)}
            className="ml-auto text-red-300 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {successMessage && (
        <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-3 text-emerald-400">
          <Check className="w-5 h-5 flex-shrink-0" />
          <p>{successMessage}</p>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="ml-auto text-emerald-300 hover:text-white"
          >
            ×
          </button>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            {connection ? (
              <>
                <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-white font-medium">
                    Connecté à Strava
                  </p>
                  <p className="text-sm text-slate-400">
                    {connection.strava_firstname} {connection.strava_lastname}
                    {connection.last_sync_at && (
                      <span className="ml-2">
                        • Sync: {new Date(connection.last_sync_at).toLocaleDateString('fr-FR')}
                      </span>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center">
                  <Link2Off className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <p className="text-white font-medium">Non connecté</p>
                  <p className="text-sm text-slate-400">
                    Connecte ton compte Strava pour synchroniser tes activités
                  </p>
                </div>
              </>
            )}
          </div>

          <div className="flex gap-2">
            {connection ? (
              <>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Sync...' : 'Actualiser'}
                </button>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg flex items-center gap-2 transition-colors"
                >
                  <Link2Off className="w-4 h-4" />
                  Déconnecter
                </button>
              </>
            ) : (
              <button
                onClick={handleConnect}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white rounded-xl flex items-center gap-2 font-medium transition-all shadow-lg shadow-orange-500/25"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169"/>
                </svg>
                Me connecter à Strava
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Activities Section */}
      {connection && (
        <>
          {/* Import Action Bar */}
          {selectedIds.size > 0 && (
            <div className="sticky top-4 z-10 mb-4 p-4 bg-orange-500/90 backdrop-blur-sm rounded-xl flex items-center justify-between shadow-lg">
              <span className="text-white font-medium">
                {selectedIds.size} activité{selectedIds.size > 1 ? 's' : ''} sélectionnée{selectedIds.size > 1 ? 's' : ''}
              </span>
              <button
                onClick={handleImport}
                disabled={isImporting}
                className="px-4 py-2 bg-white text-orange-600 rounded-lg font-medium flex items-center gap-2 hover:bg-orange-50 transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                {isImporting ? 'Import en cours...' : 'Importer dans mon historique'}
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="bg-slate-800/30 rounded-xl p-4 mb-4 flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
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
              Afficher les importés
            </label>

            {selectableCount > 0 && (
              <button
                onClick={handleSelectAll}
                className="px-3 py-2 text-sm bg-slate-700 hover:bg-slate-600 text-white rounded-lg flex items-center gap-2 transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                {selectedIds.size === selectableCount ? 'Tout désélectionner' : 'Tout sélectionner'}
              </button>
            )}
          </div>

          {/* Activities List */}
          <div className="space-y-3">
            {filteredActivities.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Aucune activité trouvée</p>
                {activities.length === 0 && (
                  <button
                    onClick={handleSync}
                    className="mt-4 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg inline-flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Synchroniser maintenant
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

          {/* Stats Footer */}
          {activities.length > 0 && (
            <div className="mt-6 p-4 bg-slate-800/30 rounded-xl text-center text-sm text-slate-400">
              {activities.length} activité{activities.length > 1 ? 's' : ''} synchronisée{activities.length > 1 ? 's' : ''}
              {' • '}
              {activities.filter(a => a.isImported).length} importée{activities.filter(a => a.isImported).length > 1 ? 's' : ''}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StravaImport;

