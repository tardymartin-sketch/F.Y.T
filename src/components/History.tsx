import React, { useState, useMemo } from 'react';
import { SessionLog } from '../../types';
import { 
  Calendar, 
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
  Filter
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

  // Filtrage et tri
  const filteredHistory = useMemo(() => {
    let result = [...history];
    
    // Filtre par recherche
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(log => 
        log.exercises.some(ex => ex.exerciseName.toLowerCase().includes(term)) ||
        log.sessionKey.seance.toLowerCase().includes(term)
      );
    }
    
    // Filtre par mois
    if (selectedMonth !== null) {
      result = result.filter(log => {
        const d = new Date(log.date);
        return d.getMonth() === selectedMonth && d.getFullYear() === currentYear;
      });
    }
    
    // Tri par date décroissante
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
      year: d.getFullYear(),
      weekday: d.toLocaleDateString('fr-FR', { weekday: 'long' })
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

  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Historique</h1>
          <p className="text-slate-400 mt-1">
            {monthStats.count} séances ce mois • {Math.round(monthStats.totalMinutes / 60)}h d'entraînement
          </p>
        </div>
      </div>

      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Recherche */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            placeholder="Rechercher un exercice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filtre par mois */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            onClick={() => setCurrentYear(currentYear - 1)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-white font-medium px-2">{currentYear}</span>
          <button
            onClick={() => setCurrentYear(currentYear + 1)}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sélecteur de mois */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSelectedMonth(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Dumbbell className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">Aucune séance trouvée</h3>
          <p className="text-slate-500 text-sm">
            {searchTerm ? "Essayez une autre recherche" : "Commencez à vous entraîner !"}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((log) => {
            // Utiliser un affichage dédié pour les sessions Strava
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

            // Affichage standard pour les autres sessions
            const isExpanded = expandedId === log.id;
            const dateInfo = formatDate(log.date);
            const totalSets = log.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
            const completedSets = log.exercises.reduce((acc, ex) => 
              acc + ex.sets.filter(s => s.completed).length, 0
            );

            return (
              <div 
                key={log.id}
                className={`bg-slate-900 border rounded-2xl overflow-hidden transition-all duration-200 ${
                  isExpanded ? 'border-blue-500/50' : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
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
                      <h3 className="font-semibold text-white text-lg">
                        Session {log.sessionKey.seance}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                        <span className="capitalize">{dateInfo.weekday}</span>
                        <span className="text-slate-600">•</span>
                        <span>{log.exercises.length} exercices</span>
                        <span className="text-slate-600">•</span>
                        <span>{completedSets}/{totalSets} séries</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {log.durationMinutes && (
                      <div className="hidden sm:flex items-center gap-2 text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg">
                        <Clock className="w-4 h-4" />
                        <span className="text-sm">{log.durationMinutes} min</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
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
                  </div>
                </button>

                {/* Détails expandés */}
                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-slate-800">
                    <div className="pt-4 space-y-4">
                      {log.exercises.map((ex, i) => (
                        <div key={i} className="bg-slate-800/50 rounded-xl p-4">
                          <h4 className="font-medium text-white mb-3">{ex.exerciseName}</h4>
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
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de confirmation suppression */}
      {deletingId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Supprimer la séance ?</h3>
              <p className="text-slate-400">Cette action est irréversible.</p>
            </div>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeletingId(null)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl font-medium transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors"
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

