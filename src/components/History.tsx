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
  
  const touchStartX = useRef<number>(0);
  const touchCurrentX = useRef<number>(0);

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

  const monthStats = useMemo(() => {
    const now = new Date();
    const thisMonth = history.filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const sessionsWithRpe = thisMonth.filter(h => h.sessionRpe !== undefined);
    const avgRpe = sessionsWithRpe.length > 0 
      ? Math.round((sessionsWithRpe.reduce((acc, h) => acc + (h.sessionRpe || 0), 0) / sessionsWithRpe.length) * 10) / 10
      : null;
    
    const totalDuration = thisMonth.reduce((acc, h) => acc + (h.durationMinutes || 0), 0);
    
    return {
      count: thisMonth.length,
      totalHours: Math.round(totalDuration / 60),
      avgRpe
    };
  }, [history]);

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

  const handleTouchStart = (id: string, e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (id: string, e: TouchEvent) => {
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchStartX.current - touchCurrentX.current;
    if (diff > 50) {
      setSwipedId(id);
    } else if (diff < -50) {
      setSwipedId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', { 
      weekday: 'short', 
      day: 'numeric', 
      month: 'short' 
    });
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      onDelete(id);
      setDeletingId(null);
      setSwipedId(null);
    }, 300);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700/50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-white mb-4">Ce mois-ci</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-400">{monthStats.count}</p>
            <p className="text-sm text-slate-400">séances</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-400">{monthStats.totalHours}h</p>
            <p className="text-sm text-slate-400">d'entraînement</p>
          </div>
          <div className="text-center">
            {monthStats.avgRpe ? (
              <>
                <p className={`text-3xl font-bold ${getRpeColor(Math.round(monthStats.avgRpe))}`}>
                  {monthStats.avgRpe}
                </p>
                <p className="text-sm text-slate-400">RPE moyen</p>
              </>
            ) : (
              <>
                <p className="text-3xl font-bold text-slate-500">—</p>
                <p className="text-sm text-slate-400">RPE moyen</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un exercice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Month Filter */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentYear(y => y - 1)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-white font-medium min-w-[60px] text-center">{currentYear}</span>
          <button
            onClick={() => setCurrentYear(y => y + 1)}
            className="p-2 text-slate-400 hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          
          <div className="flex-1 overflow-x-auto scrollbar-hide">
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedMonth(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedMonth === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                Tous
              </button>
              {months.map((m, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedMonth(i)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedMonth === i
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sessions List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-12">
          <Dumbbell className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <p className="text-slate-500">Aucune séance trouvée</p>
        </div>
      ) : (
        <div className="space-y-3">
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
            const isDeleting = deletingId === log.id;
            
            const totalSets = log.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
            const completedSets = log.exercises.reduce((acc, ex) => 
              acc + ex.sets.filter(s => s.completed).length, 0
            );
            const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

            return (
              <div
                key={log.id}
                className={`relative overflow-hidden rounded-2xl transition-all duration-300 ${
                  isDeleting ? 'opacity-0 scale-95' : ''
                }`}
                onTouchStart={(e) => handleTouchStart(log.id, e)}
                onTouchMove={(e) => handleTouchMove(log.id, e)}
              >
                {/* Swipe Action */}
                <div className={`absolute inset-y-0 right-0 flex items-center justify-end bg-red-600 transition-all ${
                  isSwiped ? 'w-24' : 'w-0'
                }`}>
                  <button
                    onClick={() => handleDelete(log.id)}
                    className="w-full h-full flex items-center justify-center text-white"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>

                {/* Main Card */}
                <div className={`bg-slate-900 border border-slate-800 transition-transform ${
                  isSwiped ? '-translate-x-24' : ''
                }`}>
                  {/* Header */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    className="w-full p-4 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-white font-semibold">
                            {log.sessionKey.seance}
                          </span>
                          {log.sessionRpe && (
                            <RpeBadge rpe={log.sessionRpe} size="sm" showLabel={false} />
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400">
                          <span>{formatDate(log.date)}</span>
                          {log.durationMinutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              {log.durationMinutes}min
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Progress Ring */}
                        <div className="relative w-12 h-12">
                          <svg className="w-12 h-12 -rotate-90">
                            <circle
                              cx="24" cy="24" r="20"
                              fill="none"
                              stroke="#1e293b"
                              strokeWidth="4"
                            />
                            <circle
                              cx="24" cy="24" r="20"
                              fill="none"
                              stroke={progress === 100 ? '#10b981' : '#3b82f6'}
                              strokeWidth="4"
                              strokeLinecap="round"
                              strokeDasharray={`${progress * 1.256} 125.6`}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
                            {Math.round(progress)}%
                          </span>
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-slate-800 pt-4">
                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => onEdit(log)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 text-sm font-medium transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                          Modifier
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-red-400 text-sm font-medium transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* RPE Global */}
                      {log.sessionRpe && (
                        <div className={`p-3 rounded-xl ${getRpeBgColor(log.sessionRpe)} flex items-center justify-between`}>
                          <div className="flex items-center gap-2">
                            <Gauge className={`w-5 h-5 ${getRpeColor(log.sessionRpe)}`} />
                            <span className="text-sm font-medium text-slate-300">RPE de la séance</span>
                          </div>
                          <RpeBadge rpe={log.sessionRpe} size="md" />
                        </div>
                      )}

                      {/* Exercises */}
                      <div className="space-y-3">
                        {log.exercises.map((exercise, idx) => (
                          <div key={idx} className="bg-slate-800/50 rounded-xl p-3">
                            <p className="font-medium text-white mb-2">{exercise.exerciseName}</p>
                            <div className="space-y-1">
                              {exercise.sets.map((set, setIdx) => (
                                <div
                                  key={setIdx}
                                  className={`flex items-center gap-3 text-sm p-2 rounded-lg ${
                                    set.completed ? 'bg-emerald-500/10' : 'bg-slate-800/50'
                                  }`}
                                >
                                  <span className="text-slate-500 w-8">#{set.setNumber}</span>
                                  <span className="text-white flex-1">{set.reps || '—'}</span>
                                  <span className="text-slate-400">{set.weight ? `${set.weight}kg` : '—'}</span>
                                  {set.completed && (
                                    <span className="text-emerald-400">✓</span>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Comments */}
                      {log.comments && (
                        <div className="bg-slate-800/30 rounded-xl p-3 text-sm text-slate-400 italic">
                          {log.comments}
                        </div>
                      )}
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
