// ============================================================
// F.Y.T - HOME (Version avec tous les Week Organizers)
// src/components/Home.tsx
// Affichage de TOUS les messages week organizer visibles
// ============================================================

import React, { useMemo, useState } from 'react';
import { WorkoutRow, FilterState, User, SessionLog, WeekOrganizerLog } from '../../types';
import { SessionSelector } from './SessionSelector';
import { SessionPreview } from './SessionPreview';
import { 
  Play, 
  Calendar, 
  TrendingUp, 
  Clock, 
  Flame,
  Target,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Dumbbell,
  MessageSquare
} from 'lucide-react';

interface Props {
  data: WorkoutRow[];
  filters: FilterState;
  setFilters: (f: FilterState) => void;
  onStartSession: () => void;
  user: User;
  history: SessionLog[];
  activeWeekOrganizers?: WeekOrganizerLog[]; // MODIFIÉ: tableau au lieu d'un seul
  pastWeekOrganizers?: WeekOrganizerLog[];
  onNavigateToHistory?: () => void;
}

export const Home: React.FC<Props> = ({ 
  data, 
  filters, 
  setFilters, 
  onStartSession, 
  user,
  history,
  activeWeekOrganizers = [], // MODIFIÉ: tableau
  pastWeekOrganizers = [],
  onNavigateToHistory
}) => {
  const [showPastOrganizers, setShowPastOrganizers] = useState(false);
  
  // Données de la session sélectionnée
  const currentSessionData = useMemo(() => {
    return data.filter(d => 
      d.annee === filters.selectedAnnee && 
      d.moisNum === filters.selectedMois && 
      d.semaine === filters.selectedSemaine && 
      filters.selectedSeances.includes(d.seance)
    );
  }, [data, filters]);

  // Stats calculées
  const stats = useMemo(() => {
    const now = new Date();
    const thisWeek = history.filter(h => {
      const d = new Date(h.date);
      const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      return diffDays < 7;
    });

    const thisMonth = history.filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });

    const totalDuration = thisMonth.reduce((acc, h) => acc + (h.durationMinutes || 0), 0);

    return {
      weekSessions: thisWeek.length,
      monthSessions: thisMonth.length,
      totalHours: Math.round(totalDuration / 60),
      streak: calculateStreak(history),
    };
  }, [history]);

  function calculateStreak(logs: SessionLog[]): number {
    if (logs.length === 0) return 0;
    
    const sorted = [...logs].sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sorted.length; i++) {
      const logDate = new Date(sorted[i].date);
      logDate.setHours(0, 0, 0, 0);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(today.getDate() - i);
      
      const diffDays = Math.abs(Math.floor((logDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)));
      
      if (diffDays <= 1) {
        streak++;
      } else {
        break;
      }
    }
    
    return streak;
  }

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bonjour";
    if (hour < 18) return "Bon après-midi";
    return "Bonsoir";
  };

  // MODIFIÉ: Utiliser le prénom uniquement
  const getDisplayName = () => {
    if (user.firstName) {
      return user.firstName;
    }
    // Fallback: extraire le prénom du username si format nom.prenom
    if (user.username?.includes('.')) {
      const parts = user.username.split('.');
      // Prendre la dernière partie (prénom) et mettre la première lettre en majuscule
      const firstName = parts[parts.length - 1];
      return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
    }
    return user.username;
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header avec salutation - Compact sur mobile */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-slate-400 text-xs sm:text-sm mb-0.5">{getGreeting()}</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {getDisplayName()} 
            <span className="text-gradient ml-1 sm:ml-2">👋</span>
          </h1>
          <p className="text-slate-400 text-sm mt-1 hidden sm:block">Prêt à repousser vos limites aujourd'hui ?</p>
        </div>
        
        {/* Bouton démarrer - Visible uniquement sur desktop, mobile aura le bouton sticky */}
        {currentSessionData.length > 0 && (
          <button 
            onClick={onStartSession}
            className="hidden sm:flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-5 py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
              <Play className="w-4 h-4 fill-current" />
            </div>
            <span>Démarrer</span>
            <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* MODIFIÉ: Afficher TOUS les Week Organizers actifs */}
      {activeWeekOrganizers.length > 0 && (
        <div className="space-y-4">
          {activeWeekOrganizers.map((organizer, index) => (
            <div 
              key={organizer.id}
              className="bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border border-blue-500/30 rounded-2xl p-4 md:p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-5 h-5 text-blue-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-white">{organizer.title}</h3>
                    {activeWeekOrganizers.length > 1 && (
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                        {index + 1}/{activeWeekOrganizers.length}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    {new Date(organizer.startDate).toLocaleDateString('fr-FR')} - {new Date(organizer.endDate).toLocaleDateString('fr-FR')}
                  </p>
                  <div 
                    className="text-sm text-slate-300 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: organizer.message }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats rapides - Grid compact sur mobile */}
      <div className="grid grid-cols-4 gap-2 md:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg md:rounded-xl flex items-center justify-center mb-2">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white">{stats.weekSessions}</p>
          <p className="text-[10px] md:text-xs text-slate-400">Cette semaine</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/20 rounded-lg md:rounded-xl flex items-center justify-center mb-2">
            <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white">{stats.monthSessions}</p>
          <p className="text-[10px] md:text-xs text-slate-400">Ce mois</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500/20 rounded-lg md:rounded-xl flex items-center justify-center mb-2">
            <Clock className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white">{stats.totalHours}h</p>
          <p className="text-[10px] md:text-xs text-slate-400">Total mois</p>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-4">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-red-500/20 rounded-lg md:rounded-xl flex items-center justify-center mb-2">
            <Flame className="w-4 h-4 md:w-5 md:h-5 text-red-400" />
          </div>
          <p className="text-lg md:text-2xl font-bold text-white">{stats.streak}</p>
          <p className="text-[10px] md:text-xs text-slate-400">Série 🔥</p>
        </div>
      </div>

      {/* Sélecteur de session */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
        <div className="flex items-center gap-3 mb-4 md:mb-6">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Choisir une séance</h2>
            <p className="text-xs md:text-sm text-slate-400">Sélectionnez votre programme</p>
          </div>
        </div>
        
        <SessionSelector 
          data={data}
          filters={filters}
          onChange={setFilters}
        />
      </div>

      {/* Prévisualisation de la session */}
      {currentSessionData.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 md:p-6">
          <div className="flex items-center justify-between mb-4 md:mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h2 className="font-semibold text-white">
                  Session {filters.selectedSeances.join(' + ')}
                </h2>
                <p className="text-xs md:text-sm text-slate-400">
                  {currentSessionData.length} exercice{currentSessionData.length > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
          
          <SessionPreview 
            exercises={currentSessionData}
            selectedOrder={filters.selectedSeances}
          />
        </div>
      )}

      {/* Messages passés */}
      {pastWeekOrganizers.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowPastOrganizers(!showPastOrganizers)}
            className="w-full flex items-center justify-between p-4 md:p-5 hover:bg-slate-800/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-slate-400" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-white">Messages précédents</h3>
                <p className="text-xs text-slate-400">{pastWeekOrganizers.length} message{pastWeekOrganizers.length > 1 ? 's' : ''}</p>
              </div>
            </div>
            {showPastOrganizers ? (
              <ChevronUp className="w-5 h-5 text-slate-400" />
            ) : (
              <ChevronDown className="w-5 h-5 text-slate-400" />
            )}
          </button>
          
          {showPastOrganizers && (
            <div className="border-t border-slate-800 p-4 md:p-5 space-y-4">
              {pastWeekOrganizers.map((organizer) => (
                <div key={organizer.id} className="bg-slate-800/50 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-white">{organizer.title}</h4>
                    <span className="text-xs text-slate-500">
                      {new Date(organizer.startDate).toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                  <div 
                    className="text-sm text-slate-400 prose prose-invert prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: organizer.message }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bouton sticky sur mobile */}
      {currentSessionData.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent">
          <button 
            onClick={onStartSession}
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-xl font-semibold shadow-lg shadow-blue-600/25"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Démarrer la séance</span>
          </button>
        </div>
      )}
    </div>
  );
};
