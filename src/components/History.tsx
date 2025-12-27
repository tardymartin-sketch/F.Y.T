import React, { useState, useMemo, useRef, TouchEvent } from 'react';
import { SessionLog } from '../../types';
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
  Search
} from 'lucide-react';
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

  // Statistiques du mois
  const monthStats = useMemo(() => {
    const now = new Date();
    const thisMonth = history.filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    return {
      count: thisMonth.length,
      totalMinutes: thisMonth.reduce((acc, h) => acc + (h.durationMinutes || 0), 0)
    };
  }, [history]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return {
      day: d.getDate(),
      month: d.toLocaleDateString('fr-FR', { month: 'short' }),
      monthShort: d.toLocaleDateString('fr-FR', { month: 'short' }).slice(0, 3),
      year: d.getFullYear(),
      weekday: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
      weekdayShort: d.toLocaleDateString('fr-FR', { weekday: 'short' })
    };
  };

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
  };

  const handleEditClick = (e: React.MouseEvent, log: SessionLog) => {
    e.stopPropagation();
    onEdit(log);
  };

  const confirmDelete = () => {
    if (deletingId) {
      onDelete(deletingId);
      setDeletingId(null);
    }
  };

  // Swipe handlers
  const handleTouchStart = (e: TouchEvent, id: string) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: TouchEvent, id: string) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 50) {
      setSwipedId(id);
    } else if (diff < -30) {
      setSwipedId(null);
    }
  };

  const handleTouchEnd = () => {
    touchStartX.current = 0;
    touchCurrentX.current = 0;
  };

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header - compact on mobile */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-white">Historique</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-0.5">
            {monthStats.count} séances · {Math.round(monthStats.totalMinutes / 60)}h ce mois
          </p>
        </div>
      </div>

      {/* Filtres - compact row */}
      <div className="flex gap-2 sm:gap-4">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl pl-9 sm:pl-12 pr-3 py-2 sm:py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Year selector - compact */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg sm:rounded-xl px-1">
          <button
            onClick={() => setCurrentYear(currentYear - 1)}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-medium text-sm px-1">{currentYear}</span>
          <button
            onClick={() => setCurrentYear(currentYear + 1)}
            className="p-1.5 sm:p-2 text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Month selector - horizontal scroll on mobile */}
      <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
        <button
          onClick={() => setSelectedMonth(null)}
          className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
            selectedMonth === null 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          Tous
        </button>
        {months.map((month, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedMonth(idx)}
            className={`flex-shrink-0 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              selectedMonth === idx 
                ? 'bg-blue-600 text-white' 
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            {month}
          </button>
        ))}
      </div>

      {/* Liste des séances */}
      {filteredHistory.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl sm:rounded-2xl p-8 sm:p-12 text-center">
          <Dumbbell className="w-12 h-12 sm:w-16 sm:h-16 text-slate-700 mx-auto mb-3" />
          <h3 className="text-base sm:text-lg font-medium text-slate-400 mb-1">Aucune séance trouvée</h3>
          <p className="text-slate-500 text-xs sm:text-sm">
            {searchTerm ? "Essayez une autre recherche" : "Commencez à vous entraîner !"}
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-4">
          {filteredHistory.map((log) => {
            if (isStravaSession(log) && userId) {
              return (
                <StravaHistoryCard
                  key={log.id}
                  log={log}
                  onDelete={onDelete}
                  userId={userId}
                />
              );
            }

            const isExpanded = expandedId === log.id;
            const isSwiped = swipedId === log.id;
            const dateInfo = formatDate(log.date);
            const totalSets = log.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
            const completedSets = log.exercises.reduce((acc, ex) => 
              acc + ex.sets.filter(s => s.completed).length, 0
            );
            const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

            return (
              <div 
                key={log.id}
                className="relative overflow-hidden"
              >
                {/* Swipe actions background */}
                <div className="absolute inset-y-0 right-0 flex items-center gap-1 pr-2 sm:hidden">
                  <button
                    onClick={(e) => { handleEditClick(e, log); setSwipedId(null); }}
                    className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center"
                  >
                    <Edit2 className="w-4 h-4 text-white" />
                  </button>
                  <button
                    onClick={(e) => { handleDeleteClick(e, log.id); setSwipedId(null); }}
                    className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center"
                  >
                    <Trash2 className="w-4 h-4 text-white" />
                  </button>
                </div>

                <div 
                  className={`bg-slate-900 border rounded-xl sm:rounded-2xl overflow-hidden transition-all duration-200 ${
                    isExpanded ? 'border-blue-500/50' : 'border-slate-800'
                  } ${isSwiped ? '-translate-x-24' : 'translate-x-0'}`}
                  onTouchStart={(e) => handleTouchStart(e, log.id)}
                  onTouchMove={(e) => handleTouchMove(e, log.id)}
                  onTouchEnd={handleTouchEnd}
                >
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full p-3 sm:p-5 flex items-center gap-3 sm:gap-4 text-left"
                  >
                    {/* Date badge - compact */}
                    <div className="w-11 sm:w-16 text-center flex-shrink-0">
                      <div className="bg-slate-800 rounded-lg sm:rounded-xl p-2 sm:p-3">
                        <span className="text-[10px] sm:text-xs text-slate-500 uppercase block">{dateInfo.monthShort}</span>
                        <span className="text-lg sm:text-2xl font-bold text-white block">{dateInfo.day}</span>
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title + duration */}
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white text-sm sm:text-lg truncate">
                          Session {log.sessionKey.seance}
                        </h3>
                        {log.durationMinutes && (
                          <span className="flex-shrink-0 text-xs text-slate-500 sm:hidden">
                            {log.durationMinutes}min
                          </span>
                        )}
                      </div>
                      
                      {/* Meta info - single line on mobile */}
                      <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                        <span className="capitalize sm:inline hidden">{dateInfo.weekday} · </span>
                        <span className="sm:hidden">{dateInfo.weekdayShort} · </span>
                        {log.exercises.length} exos · {completedSets}/{totalSets}
                      </p>

                      {/* Progress bar - mobile only in collapsed */}
                      <div className="mt-2 sm:hidden">
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Desktop actions */}
                    <div className="hidden sm:flex items-center gap-2">
                      {log.durationMinutes && (
                        <div className="flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">
                          <Clock className="w-4 h-4" />
                          <span className="text-sm">{log.durationMinutes} min</span>
                        </div>
                      )}
                      <button
                        onClick={(e) => handleEditClick(e, log)}
                        className="p-2 text-slate-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => handleDeleteClick(e, log.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    {/* Mobile expand indicator */}
                    <div className="sm:hidden">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                  </button>

                  {/* Détails expandés */}
                  {isExpanded && (
                    <div className="px-3 pb-3 sm:px-5 sm:pb-5 border-t border-slate-800">
                      <div className="pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                        {log.exercises.map((ex, i) => (
                          <div key={i} className="bg-slate-800/50 rounded-lg sm:rounded-xl p-3 sm:p-4">
                            <h4 className="font-medium text-white text-sm sm:text-base mb-2 sm:mb-3">{ex.exerciseName}</h4>
                            
                            {/* Desktop: Grid layout */}
                            <div className="hidden sm:block">
                              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-slate-500 uppercase mb-2">
                                <span>Série</span>
                                <span>Reps</span>
                                <span>Poids</span>
                                <span>Statut</span>
                              </div>
                              {ex.sets.map((set, j) => (
                                <div key={j} className="grid grid-cols-4 gap-2 py-2 border-t border-slate-700/50 text-sm">
                                  <span className="text-slate-400">#{set.setNumber}</span>
                                  <span className="text-white font-medium">{set.reps || '—'}</span>
                                  <span className="text-white font-medium">{set.weight ? `${set.weight} kg` : '—'}</span>
                                  <span className={set.completed ? 'text-emerald-400' : 'text-slate-500'}>
                                    {set.completed ? '✓' : '—'}
                                  </span>
                                </div>
                              ))}
                            </div>

                            {/* Mobile: Vertical list */}
                            <div className="sm:hidden space-y-1.5">
                              {ex.sets.map((set, j) => (
                                <div 
                                  key={j} 
                                  className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-md ${
                                    set.completed ? 'bg-emerald-500/10' : 'bg-slate-900/50'
                                  }`}
                                >
                                  <span className="text-slate-500 font-mono">#{set.setNumber}</span>
                                  <span className="text-slate-400">→</span>
                                  <span className="text-white font-medium">{set.reps || '—'} reps</span>
                                  {set.weight && (
                                    <>
                                      <span className="text-slate-600">×</span>
                                      <span className="text-blue-400 font-medium">{set.weight}kg</span>
                                    </>
                                  )}
                                  <span className={`ml-auto ${set.completed ? 'text-emerald-400' : 'text-slate-600'}`}>
                                    {set.completed ? '✓' : '○'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}

                        {/* Mobile: Action buttons in expanded view */}
                        <div className="flex gap-2 pt-2 sm:hidden">
                          <button
                            onClick={(e) => handleEditClick(e, log)}
                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600/20 text-blue-400 py-2.5 rounded-lg text-sm font-medium"
                          >
                            <Edit2 className="w-4 h-4" />
                            Modifier
                          </button>
                          <button
                            onClick={(e) => handleDeleteClick(e, log.id)}
                            className="flex-1 flex items-center justify-center gap-2 bg-red-600/20 text-red-400 py-2.5 rounded-lg text-sm font-medium"
                          >
                            <Trash2 className="w-4 h-4" />
                            Supprimer
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmation suppression */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl sm:rounded-2xl p-5 sm:p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center mb-5">
              <div className="w-14 h-14 sm:w-16 sm:h-16 bg-red-500/20 rounded-xl sm:rounded-2xl flex items-center justify-center mb-3">
                <AlertTriangle className="w-7 h-7 sm:w-8 sm:h-8 text-red-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-white mb-1">Supprimer la séance ?</h3>
              <p className="text-slate-400 text-sm">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-bold transition-colors"
              >
                Supprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

