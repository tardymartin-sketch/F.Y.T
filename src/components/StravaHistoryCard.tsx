// ============================================================
// F.Y.T - STRAVA HISTORY CARD
// src/components/StravaHistoryCard.tsx
// Affichage dédié pour les activités Strava dans l'historique
// Avec support du mode readOnly pour les coachs
// ============================================================

import React, { useState, useEffect } from 'react';
import { 
  Clock, MapPin, Heart, TrendingUp, Zap, ChevronDown, ChevronUp,
  Trash2, ExternalLink, Activity, BarChart3, Loader2
} from 'lucide-react';
import { SessionLog } from '../../types';
import { StravaActivityMap } from './StravaActivityMap';
import { StravaActivityCharts } from './StravaActivityCharts';
import { stravaService } from '../services/stravaService';
import type { StravaActivityDB } from '../types/strava';
import { SPORT_TYPE_CONFIG, DEFAULT_SPORT_CONFIG } from '../types/strava';

interface StravaHistoryCardProps {
  log: SessionLog;
  onDelete: (id: string) => void;
  userId: string;
  /** Mode lecture seule (pour les coachs) - ne tente pas de sync avec l'API Strava */
  readOnly?: boolean;
}

export const StravaHistoryCard: React.FC<StravaHistoryCardProps> = ({ 
  log, 
  onDelete, 
  userId,
  readOnly = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [stravaData, setStravaData] = useState<StravaActivityDB | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Guard clause - si log est undefined ou n'a pas d'exercises
  if (!log || !log.exercises || log.exercises.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center text-slate-500">
        <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Données de l'activité indisponibles</p>
      </div>
    );
  }

  // Extraire les infos de l'activité depuis les notes
  const exercise = log.exercises[0];
  const notes = exercise?.notes || '';
  const notesArray = notes.split(' • ');
  
  // Parser les infos depuis les notes
  const sportType = notesArray[0] || 'Run';
  const distance = notesArray.find(n => n.includes('km'));
  const elevation = notesArray.find(n => n.includes('+'));
  const avgHr = notesArray.find(n => n.includes('FC moy'))?.replace('FC moy: ', '');
  const maxHr = notesArray.find(n => n.includes('FC max'))?.replace('FC max: ', '');

  const sportConfig = SPORT_TYPE_CONFIG[sportType] || DEFAULT_SPORT_CONFIG;

  // Charger les données Strava complètes si on expand
  useEffect(() => {
    const loadStravaData = async () => {
      if (isExpanded && !stravaData && userId) {
        setIsLoading(true);
        try {
          // Chercher l'activité Strava liée à cette session
          const activities = await stravaService.getActivities(userId);
          const linked = activities.find(a => a.session_log_id === log.id);
          
          if (linked) {
            // En mode readOnly (coach), on ne tente pas de sync
            // On utilise simplement les données déjà stockées
            if (readOnly) {
              setStravaData(linked);
            } else {
              // Mode normal (athlète) - on peut sync si nécessaire
              if (!linked.streams_data) {
                try {
                  const updated = await stravaService.syncSingleActivity(userId, linked.strava_activity_id);
                  if (updated) {
                    setStravaData(updated);
                  } else {
                    setStravaData(linked);
                  }
                } catch (syncErr) {
                  console.warn('Could not sync activity, using cached data:', syncErr);
                  setStravaData(linked);
                }
              } else {
                setStravaData(linked);
              }
            }
          }
        } catch (err) {
          console.error('Failed to load Strava data:', err);
        } finally {
          setIsLoading(false);
        }
      }
    };

    loadStravaData();
  }, [isExpanded, stravaData, userId, log.id, readOnly]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
      year: d.getFullYear(),
      weekday: d.toLocaleDateString('fr-FR', { weekday: 'long' })
    };
  };

  const dateInfo = formatDate(log.date);

  return (
    <div 
      className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
        isExpanded ? 'border-orange-500/50' : 'border-slate-800 hover:border-slate-700'
      }`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-4">
          {/* Date badge */}
          <div className="w-16 text-center">
            <div className="bg-slate-800 rounded-xl p-3">
              <span className="text-xs text-slate-500 uppercase block">{dateInfo.month}</span>
              <span className="text-2xl font-bold text-white block">{dateInfo.day}</span>
            </div>
          </div>

          <div>
            <h3 className="font-semibold text-white text-lg flex items-center gap-2">
              {exercise?.exerciseName || log.sessionKey.seance.replace('Strava: ', '')}
              <span className="text-xl" title={sportConfig.label}>{sportConfig.icon}</span>
              <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
                Strava
              </span>
            </h3>
            <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
              <span className="capitalize">{dateInfo.weekday}</span>
              <span className="text-slate-600">•</span>
              <span style={{ color: sportConfig.color }}>{sportConfig.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Métriques clés */}
          <div className="hidden sm:flex items-center gap-3">
            {log.durationMinutes && (
              <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{log.durationMinutes} min</span>
              </div>
            )}
            {distance && (
              <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{distance}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Bouton supprimer seulement si pas readOnly */}
            {!readOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(log.id);
                }}
                className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </button>

      {/* Contenu expansible */}
      {isExpanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-800 pt-4">
          {/* Métriques mobiles */}
          <div className="sm:hidden flex flex-wrap gap-2">
            {log.durationMinutes && (
              <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg text-sm">
                <Clock className="w-4 h-4" />
                <span>{log.durationMinutes} min</span>
              </div>
            )}
            {distance && (
              <div className="flex items-center gap-1.5 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg text-sm">
                <MapPin className="w-4 h-4" />
                <span>{distance}</span>
              </div>
            )}
            {avgHr && (
              <div className="flex items-center gap-1.5 text-red-400 bg-slate-800 px-3 py-1.5 rounded-lg text-sm">
                <Heart className="w-4 h-4" />
                <span>{avgHr}</span>
              </div>
            )}
          </div>

          {/* Toggle Carte / Graphiques */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowCharts(false)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                !showCharts ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <MapPin className="w-4 h-4" />
              Carte
            </button>
            <button
              onClick={() => setShowCharts(true)}
              className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
                showCharts ? 'bg-orange-500 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Graphiques
            </button>
          </div>

          {/* Chargement */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
              <span className="ml-2 text-slate-400">Chargement des données...</span>
            </div>
          )}

          {/* Carte */}
          {!showCharts && !isLoading && (
            stravaData?.summary_polyline ? (
              <div className="h-64 rounded-xl overflow-hidden">
                <StravaActivityMap 
                  polyline={stravaData.summary_polyline}
                  sportColor={sportConfig.color}
                />
              </div>
            ) : (
              <div className="h-32 bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                <MapPin className="w-5 h-5 mr-2 opacity-50" />
                Pas de tracé GPS disponible
              </div>
            )
          )}

          {/* Graphiques */}
          {showCharts && !isLoading && (
            stravaData?.streams_data ? (
              <StravaActivityCharts
                streams={stravaData.streams_data}
                segments={stravaData?.segment_efforts || undefined}
                sportType={sportType}
                compact={false}
              />
            ) : (
              <div className="h-32 bg-slate-800/50 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                <BarChart3 className="w-5 h-5 mr-2 opacity-50" />
                Pas de données détaillées disponibles
              </div>
            )
          )}

          {/* Lien Strava */}
          {stravaData && (
            <div className="flex justify-end">
              <a
                href={`https://www.strava.com/activities/${stravaData.strava_activity_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1.5 bg-orange-500/10 text-orange-400 rounded-lg text-sm flex items-center gap-2 hover:bg-orange-500/20 transition-colors"
              >
                Voir sur Strava
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}

          {/* Commentaires */}
          {log.comments && (
            <div className="bg-slate-800/30 rounded-xl p-4">
              <p className="text-slate-400 text-sm whitespace-pre-wrap">{log.comments}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StravaHistoryCard;
