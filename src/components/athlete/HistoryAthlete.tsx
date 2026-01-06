// ============================================================
// F.Y.T - HISTORY ATHLETE (Mobile-First)
// src/components/athlete/HistoryAthlete.tsx
// Historique des séances avec vue groupée par période
// ============================================================

import React, { useState, useMemo, useCallback } from 'react';
import { SessionLog, ExerciseLog } from '../../../types';
import { Card, CardContent } from '../shared/Card';
import {
  Calendar,
  Clock,
  Dumbbell,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  Activity
} from 'lucide-react';
import { RpeBadge } from '../RpeSelector';

// ===========================================
// TYPES
// ===========================================

interface Props {
  history: SessionLog[];
  onEdit?: (session: SessionLog) => void;
  onDelete?: (sessionId: string) => void;
}

interface GroupedSessions {
  label: string;
  sessions: SessionLog[];
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function formatDate(dateString: string): { day: string; month: string; full: string } {
  const date = new Date(dateString);
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    full: date.toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long' 
    })
  };
}

function getRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  date.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return "Hier";
  if (diffDays < 7) return `Il y a ${diffDays} jours`;
  if (diffDays < 14) return "La semaine dernière";
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function formatDuration(minutes: number): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

function getCompletionRate(exercises: ExerciseLog[]): number {
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.completed).length,
    0
  );
  return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
}

function groupSessionsByPeriod(sessions: SessionLog[]): GroupedSessions[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const today = now.getTime();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);
  
  const groups: Map<string, SessionLog[]> = new Map([
    ['today', []],
    ['thisWeek', []],
    ['lastWeek', []],
    ['older', []]
  ]);
  
  sessions.forEach(session => {
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);
    const sessionTime = sessionDate.getTime();
    
    if (sessionTime === today) {
      groups.get('today')!.push(session);
    } else if (sessionTime >= weekStart.getTime()) {
      groups.get('thisWeek')!.push(session);
    } else if (sessionTime >= lastWeekStart.getTime()) {
      groups.get('lastWeek')!.push(session);
    } else {
      groups.get('older')!.push(session);
    }
  });
  
  const result: GroupedSessions[] = [];
  
  if (groups.get('today')!.length > 0) {
    result.push({ label: "Aujourd'hui", sessions: groups.get('today')! });
  }
  if (groups.get('thisWeek')!.length > 0) {
    result.push({ label: 'Cette semaine', sessions: groups.get('thisWeek')! });
  }
  if (groups.get('lastWeek')!.length > 0) {
    result.push({ label: 'Semaine dernière', sessions: groups.get('lastWeek')! });
  }
  if (groups.get('older')!.length > 0) {
    result.push({ label: 'Plus ancien', sessions: groups.get('older')! });
  }
  
  return result;
}

// ===========================================
// COMPONENT
// ===========================================

export const HistoryAthlete: React.FC<Props> = ({
  history,
  onEdit,
  onDelete
}) => {
  // ===========================================
  // STATE
  // ===========================================
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSession, setExpandedSession] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  // ===========================================
  // COMPUTED VALUES
  // ===========================================
  
  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [history]);
  
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return sortedHistory;
    
    const query = searchQuery.toLowerCase();
    return sortedHistory.filter(session => {
      // Search in session name
      if (session.sessionKey.seance.toLowerCase().includes(query)) return true;
      // Search in exercise names
      if (session.exercises.some(ex => 
        ex.exerciseName.toLowerCase().includes(query)
      )) return true;
      return false;
    });
  }, [sortedHistory, searchQuery]);
  
  const groupedHistory = useMemo(() => {
    return groupSessionsByPeriod(filteredHistory);
  }, [filteredHistory]);
  
  // Stats globales
  const globalStats = useMemo(() => {
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);
    
    const monthSessions = history.filter(s => new Date(s.date) >= thisMonth);
    const totalMinutes = monthSessions.reduce((acc, s) => acc + (s.durationMinutes || 0), 0);
    const avgRpe = monthSessions.filter(s => s.sessionRpe).length > 0
      ? monthSessions.filter(s => s.sessionRpe).reduce((acc, s) => acc + (s.sessionRpe || 0), 0) / monthSessions.filter(s => s.sessionRpe).length
      : null;
    
    return {
      sessionsThisMonth: monthSessions.length,
      totalMinutes,
      avgRpe
    };
  }, [history]);
  
  // ===========================================
  // HANDLERS
  // ===========================================
  
  const toggleExpand = useCallback((sessionId: string) => {
    setExpandedSession(prev => prev === sessionId ? null : sessionId);
  }, []);
  
  const handleDelete = useCallback((sessionId: string) => {
    if (onDelete) {
      onDelete(sessionId);
    }
    setDeleteConfirm(null);
  }, [onDelete]);
  
  // ===========================================
  // RENDER: Session Card
  // ===========================================
  
  const renderSessionCard = (session: SessionLog) => {
    const dateInfo = formatDate(session.date);
    const isExpanded = expandedSession === session.id;
    const completionRate = getCompletionRate(session.exercises);
    
    return (
      <Card key={session.id} variant="default" className="overflow-hidden">
        {/* Main Row */}
        <button
          onClick={() => toggleExpand(session.id)}
          className="w-full text-left"
        >
          <div className="p-3 flex items-center gap-3">
            {/* Date Badge */}
            <div className="w-12 h-12 bg-slate-800 rounded-xl flex flex-col items-center justify-center flex-shrink-0">
              <span className="text-lg font-bold text-white leading-none">
                {dateInfo.day}
              </span>
              <span className="text-[10px] text-slate-400 uppercase">
                {dateInfo.month}
              </span>
            </div>
            
            {/* Content */}
            <div className="flex-1 min-w-0">
              <h3 className="font-medium text-white truncate">
                {session.sessionKey.seance.replace(/\+/g, ' + ')}
              </h3>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-sm text-slate-400 flex items-center gap-1">
                  <Dumbbell className="w-3 h-3" />
                  {session.exercises.length} exos
                </span>
                <span className="text-sm text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDuration(session.durationMinutes || 0)}
                </span>
              </div>
            </div>
            
            {/* Right Side */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {session.sessionRpe && (
                <RpeBadge rpe={session.sessionRpe} size="md" />
              )}
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-slate-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-slate-400" />
              )}
            </div>
          </div>
          
          {/* Completion Bar */}
          <div className="px-3 pb-3">
            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all"
                style={{ width: `${completionRate}%` }}
              />
            </div>
          </div>
        </button>
        
        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-slate-800">
            {/* Exercise List */}
            <div className="p-3 space-y-3">
              {session.exercises.map((exercise, index) => {
                const completedSets = exercise.sets.filter(s => s.completed);
                const lastSet = completedSets[completedSets.length - 1];
                
                return (
                  <div key={index} className="bg-slate-800/50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-white text-sm">
                        {exercise.exerciseName}
                      </h4>
                      {exercise.rpe && <RpeBadge rpe={exercise.rpe} size="sm" />}
                    </div>
                    
                    {/* Sets Summary */}
                    <div className="space-y-1">
                      {exercise.sets.map((set, setIndex) => (
                        <div 
                          key={setIndex}
                          className={`flex items-center justify-between text-sm ${
                            set.completed ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          <span>Série {set.setNumber}</span>
                          <span>
                            {set.reps || '-'} × {set.weight || '-'}
                            {set.completed && (
                              <span className="ml-2 text-emerald-400">✓</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Actions */}
            {(onEdit || onDelete) && (
              <div className="px-3 pb-3 flex gap-2">
                {onEdit && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(session);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                    Modifier
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirm(session.id);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Card>
    );
  };
  
  // ===========================================
  // RENDER
  // ===========================================
  
  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-xl flex items-center justify-center">
          <Calendar className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Historique</h1>
          <p className="text-sm text-slate-400">
            {history.length} séance{history.length > 1 ? 's' : ''} enregistrée{history.length > 1 ? 's' : ''}
          </p>
        </div>
      </div>
      
      {/* Monthly Stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card variant="default" className="p-3 text-center">
          <p className="text-2xl font-bold text-white">{globalStats.sessionsThisMonth}</p>
          <p className="text-xs text-slate-400">ce mois</p>
        </Card>
        <Card variant="default" className="p-3 text-center">
          <p className="text-2xl font-bold text-white">
            {globalStats.totalMinutes > 60 
              ? `${Math.floor(globalStats.totalMinutes / 60)}h`
              : `${globalStats.totalMinutes}m`
            }
          </p>
          <p className="text-xs text-slate-400">temps total</p>
        </Card>
        <Card variant="default" className="p-3 text-center">
          <p className={`text-2xl font-bold ${
            globalStats.avgRpe 
              ? globalStats.avgRpe <= 5 ? 'text-green-400' 
                : globalStats.avgRpe <= 7 ? 'text-yellow-400' 
                : 'text-orange-400'
              : 'text-slate-500'
          }`}>
            {globalStats.avgRpe ? globalStats.avgRpe.toFixed(1) : '-'}
          </p>
          <p className="text-xs text-slate-400">RPE moy.</p>
        </Card>
      </div>
      
      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Rechercher un exercice..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-10 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      
      {/* Sessions List */}
      {history.length === 0 ? (
        <Card variant="default" className="p-8">
          <div className="text-center">
            <Activity className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-white mb-1">
              Aucune séance enregistrée
            </h3>
            <p className="text-sm text-slate-400">
              Tes séances apparaîtront ici
            </p>
          </div>
        </Card>
      ) : filteredHistory.length === 0 ? (
        <Card variant="default" className="p-6">
          <div className="text-center">
            <p className="text-slate-400">
              Aucun résultat pour "{searchQuery}"
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {groupedHistory.map((group, groupIndex) => (
            <div key={groupIndex}>
              <h2 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {group.label}
              </h2>
              <div className="space-y-3">
                {group.sessions.map(session => renderSessionCard(session))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Supprimer ?</h3>
                <p className="text-sm text-slate-400">Cette action est irréversible</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white rounded-xl font-medium transition-colors"
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

export default HistoryAthlete;
