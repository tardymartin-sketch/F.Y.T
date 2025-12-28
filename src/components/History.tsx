// ============================================================
// F.Y.T - HISTORY (Version avec RPE)
// src/components/History.tsx
// Historique des séances avec affichage des RPE
// ============================================================

import React, { useState, useMemo, useRef, TouchEvent } from 'react';
import { SessionLog, getRpeColor, getRpeBgColor, getRpeInfo } from '../../types';
import { 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Dumbbell, 
  Trash2, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Search,
  Gauge
} from 'lucide-react';
import { RpeBadge } from './RpeSelector';
import { StravaHistoryCard } from './StravaHistoryCard';

interface Props {
  history: SessionLog[];
  onDelete: (id: string) => void;
  onEdit: (log: SessionLog) => void;
  userId?: string;
}

// Helper pour détecter si une session vient de Strava
const isStravaSession = (log: SessionLog): boolean => {
  return log.sessionKey.seance.toLowerCase().includes('strava');
};

export const History: React.FC<Props> = ({ history, onDelete, onEdit, userId }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [swipedId, setSwipedId] = useState<string | null>(null);
  
  // Touch tracking for swipe
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);

  // Filtrage et tri
  const filteredHistory = useMemo(() => {
    let result = [...history];
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.exercises.some(ex => ex.exerciseName.toLowerCase().includes(term)) ||
        log.sessionKey.seance.toLowerCase().includes(term)
      );
    }
    
    if (selectedMonth !== null) {
      result = result.filter(log => {
        const d = new Date(log.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
      });
    }
    
    result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    return result;
  }, [history, searchTerm, selectedMonth, currentYear]);

  // Statistiques du mois (avec moyenne RPE)
  const monthStats = useMemo(() => {
    const now = new Date();
    const thisMonth = history.filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    // ← NOUVEAU: Calculer la moyenne des RPE du mois
    const sessionsWithRpe = thisMonth.filter(h => h.sessionRpe !== undefined);
    const avgRpe = sessionsWithRpe.length > 0 
      ? sessionsWithRpe.reduce((acc, h) => acc + (h.sessionRpe || 0), 0) / sessionsWithRpe.length
      : null;
    
    return {
      count: thisMonth.length,
      totalMinutes: thisMonth.reduce((acc, h) => acc + (h.durationMinutes || 0), 0),
      avgRpe: avgRpe ? Math.round(avgRpe * 10) / 10 : null // Arrondi à 1 décimale
    };
  }, [history]);

  const handleTouchStart = (e: TouchEvent, logId: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (logId: string) => {
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 80) {
      setSwipedId(logId);
    } else if (diff < -50) {
      setSwipedId(null);
    }
  };

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
      setSwipedId(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Historique</h1>
        <p className="text-slate-400 mt-1">{history.length} séances enregistrées</p>
      </div>

      {/* Stats du mois - MODIFIÉ pour inclure le RPE moyen */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-blue-400 mb-1">
            <Dumbbell className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Ce mois</span>
          </div>
          <span className="text-2xl font-bold text-white">{monthStats.count}</span>
          <span className="text-slate-500 text-sm ml-1">séances</span>
        </div>
        
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-emerald-400 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">Durée totale</span>
          </div>
          <span className="text-2xl font-bold text-white">
            {Math.floor(monthStats.totalMinutes / 60)}h{(monthStats.totalMinutes % 60).toString().padStart(2, '0')}
          </span>
        </div>

        {/* ← NOUVEAU: RPE Moyen du mois */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-2 text-orange-400 mb-1">
            <Gauge className="w-4 h-4" />
            <span className="text-xs font-medium uppercase">RPE Moyen</span>
          </div>
          {monthStats.avgRpe !== null ? (
            <div className="flex items-center gap-2">
              <span className={`text-2xl font-bold ${getRpeColor(Math.round(monthStats.avgRpe))}`}>
                {monthStats.avgRpe}
              </span>
              <span className="text-slate-500 text-sm">/10</span>
            </div>
          ) : (
            <span className="text-slate-500 text-sm">—</span>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="space-y-4">
        {/* Recherche */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un exercice..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Sélecteur de mois */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => setCurrentYear(y => y - 1)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold text-white">{currentYear}</span>
            <button
              onClick={() => setCurrentYear(y => y + 1)}
              disabled={currentYear >= new Date().getFullYear()}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-6 gap-1.5">
            {months.map((month, idx) => {
              const hasData = history.some(h => {
                const d = new Date(h.date);
                return d.getMonth() === idx && d.getFullYear() === currentYear;
              });
              
              return (
                <button
                  key={month}
                  onClick={() => setSelectedMonth(selectedMonth === idx ? null : idx)}
                  disabled={!hasData}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    selectedMonth === idx
                      ? 'bg-blue-600 text-white'
                      : hasData
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                  }`}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Liste des séances */}
      {filteredHistory.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Dumbbell className="w-16 h-16 text-slate-700 mb-4" />
          <h3 className="text-xl font-semibold text-slate-400 mb-2">Aucune séance trouvée</h3>
          <p className="text-slate-500">
            {searchTerm ? 'Essayez une autre recherche' : 'Commencez à vous entraîner !'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredHistory.map((log) => {
            // Affichage spécial pour les sessions Strava
            if (isStravaSession(log) && userId) {
              return (
                <StravaHistoryCard
                  key={log.id}
                  log={log}
                  onDelete={handleDelete}
                  userId={userId}
                />
              );
            }

            const isExpanded = expandedId === log.id;
            const isSwiped = swipedId === log.id;
            const date = new Date(log.date);
            const totalSets = log.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
            const completedSets = log.exercises.reduce((acc, ex) => 
              acc + ex.sets.filter(s => s.completed).length, 0
            );

            return (
              <div 
                key={log.id}
                className="relative overflow-hidden"
              >
                {/* Bouton supprimer (swipe) */}
                <div 
                  className={`absolute right-0 top-0 bottom-0 flex items-center transition-all duration-200 ${
                    isSwiped ? 'translate-x-0' : 'translate-x-full'
                  }`}
                >
                  <button
                    onClick={() => handleDelete(log.id)}
                    disabled={deletingId === log.id}
                    className="h-full px-6 bg-red-600 hover:bg-red-500 text-white flex items-center gap-2 transition-colors"
                  >
                    {deletingId === log.id ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-5 h-5" />
                        <span className="hidden sm:inline">Supprimer</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Carte principale */}
                <div
                  className={`bg-slate-900 border border-slate-800 rounded-xl overflow-hidden transition-all duration-200 ${
                    isSwiped ? '-translate-x-24 sm:-translate-x-32' : ''
                  }`}
                  onTouchStart={(e) => handleTouchStart(e, log.id)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={() => handleTouchEnd(log.id)}
                >
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center min-w-[50px]">
                        <span className="block text-2xl font-bold text-white">{date.getDate()}</span>
                        <span className="text-xs text-slate-400 uppercase">
                          {date.toLocaleDateString('fr-FR', { month: 'short' })}
                        </span>
                      </div>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white">
                            Séance {log.sessionKey.seance}
                          </h3>
                          {/* ← NOUVEAU: Badge RPE de la séance */}
                          {log.sessionRpe && (
                            <RpeBadge rpe={log.sessionRpe} size="sm" showLabel={false} />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                          <span>{log.exercises.length} exercices</span>
                          <span>•</span>
                          <span>{completedSets}/{totalSets} séries</span>
                          {log.durationMinutes && (
                            <>
                              <span>•</span>
                              <span>{log.durationMinutes} min</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(log);
                        }}
                        className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Contenu expandé */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
                      {/* ← NOUVEAU: Affichage du RPE global si présent */}
                      {log.sessionRpe && (
                        <div className={`mt-4 p-3 rounded-xl ${getRpeBgColor(log.sessionRpe)} flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <Gauge className={`w-5 h-5 ${getRpeColor(log.sessionRpe)}`} />
                            <span className="text-sm font-medium text-slate-300">RPE de la séance</span>
                          </div>
                          <RpeBadge rpe={log.sessionRpe} size="md" />
                        </div>
                      )}

                      {log.exercises.map((ex, exIdx) => (
                        <div key={exIdx} className="bg-slate-800/50 rounded-lg p-3 mt-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-white">{ex.exerciseName}</span>
                            <div className="flex items-center gap-2">
                              {/* ← NOUVEAU: Badge RPE de l'exercice */}
                              {ex.rpe && (
                                <RpeBadge rpe={ex.rpe} size="sm" showLabel={false} />
                              )}
                              <span className="text-xs text-slate-500">
                                {ex.sets.filter(s => s.completed).length}/{ex.sets.length} séries
                              </span>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                            <span className="font-medium">Série</span>
                            <span className="font-medium">Reps</span>
                            <span className="font-medium">Poids</span>
                            
                            {ex.sets.map((set, setIdx) => (
                              <React.Fragment key={setIdx}>
                                <span className={set.completed ? 'text-emerald-400' : ''}>
                                  #{set.setNumber}
                                </span>
                                <span className="text-white">{set.reps || '—'}</span>
                                <span className="text-white">{set.weight ? `${set.weight} kg` : '—'}</span>
                              </React.Fragment>
                            ))}
                          </div>

                          {ex.notes && (
                            <p className="mt-2 text-xs text-slate-500 italic">{ex.notes}</p>
                          )}
                        </div>
                      ))}

                      {log.comments && (
                        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-yellow-200/80">{log.comments}</p>
                          </div>
                        </div>
                      )}

                      {/* Bouton supprimer (desktop) */}
                      <button
                        onClick={() => handleDelete(log.id)}
                        disabled={deletingId === log.id}
                        className="w-full mt-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {deletingId === log.id ? (
                          <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <>
                            <Trash2 className="w-4 h-4" />
                            Supprimer cette séance
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default History;
