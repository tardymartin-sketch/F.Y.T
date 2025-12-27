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
  activeWeekOrganizer?: WeekOrganizerLog | null;
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
  activeWeekOrganizer,
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

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header avec salutation - Compact sur mobile */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <p className="text-slate-400 text-xs sm:text-sm mb-0.5">{getGreeting()}</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            {user.firstName || user.username} 
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
            <div className="text-left">
              <span className="block text-xs opacity-80">Démarrer</span>
              <span className="block font-bold text-sm">Ma séance</span>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Stats Band - Compact horizontal scrollable sur mobile */}
      <div 
        className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:gap-4 scrollbar-hide cursor-pointer"
        onClick={onNavigateToHistory}
      >
        <div className="flex-shrink-0 w-[130px] md:w-auto bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3 md:p-4 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-white leading-none">{stats.weekSessions}</p>
              <p className="text-slate-500 text-xs">cette sem.</p>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 w-[130px] md:w-auto bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3 md:p-4 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-white leading-none">{stats.monthSessions}</p>
              <p className="text-slate-500 text-xs">ce mois</p>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 w-[130px] md:w-auto bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3 md:p-4 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-white leading-none">{stats.totalHours}h</p>
              <p className="text-slate-500 text-xs">ce mois</p>
            </div>
          </div>
        </div>

        <div className="flex-shrink-0 w-[130px] md:w-auto bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3 md:p-4 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 md:w-10 md:h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <Flame className="w-4 h-4 md:w-5 md:h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-lg md:text-2xl font-bold text-white leading-none">{stats.streak}🔥</p>
              <p className="text-slate-500 text-xs">série</p>
            </div>
          </div>
        </div>
      </div>

      {/* Indicateur scroll stats - Mobile only */}
      <div className="flex justify-center gap-1 md:hidden -mt-1">
        <div className="w-6 h-1 bg-slate-700 rounded-full"></div>
        <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
        <div className="w-1 h-1 bg-slate-800 rounded-full"></div>
      </div>

      {/* Week Organizer Message - Compact sur mobile */}
      {activeWeekOrganizer && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-xl overflow-hidden">
          <div className="p-3 md:p-5">
            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <MessageSquare className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-white text-sm md:text-base truncate">{activeWeekOrganizer.title}</h3>
                <p className="text-xs text-slate-400">
                  {new Date(activeWeekOrganizer.startDate).toLocaleDateString('fr-FR')} — {new Date(activeWeekOrganizer.endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <div 
              className="text-slate-300 text-sm rich-text-display line-clamp-3 md:line-clamp-none"
              dangerouslySetInnerHTML={{ __html: activeWeekOrganizer.message }}
            />
          </div>
          
          {/* Past messages accordion */}
          {pastWeekOrganizers.length > 0 && (
            <div className="border-t border-slate-800">
              <button
                onClick={() => setShowPastOrganizers(!showPastOrganizers)}
                className="w-full flex items-center justify-between px-3 md:px-5 py-2 text-xs md:text-sm text-slate-400 hover:text-white transition-colors"
              >
                <span>Messages précédents ({pastWeekOrganizers.length})</span>
                {showPastOrganizers ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {showPastOrganizers && (
                <div className="px-3 md:px-5 pb-3 md:pb-4 space-y-2 md:space-y-3">
                  {pastWeekOrganizers.slice(0, 5).map((log) => (
                    <div key={log.id} className="bg-slate-900/50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1 md:mb-2">
                        <h4 className="font-medium text-white text-xs md:text-sm">{log.title}</h4>
                        <span className="text-xs text-slate-500">
                          {new Date(log.startDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div 
                        className="text-slate-400 text-xs md:text-sm rich-text-display line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: log.message }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Session Selector - Compact */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-3 md:p-5">
        <div className="flex items-center gap-2 md:gap-3 mb-3 md:mb-5">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-sm md:text-lg font-bold text-white">Planifier ma séance</h2>
            <p className="text-slate-400 text-xs hidden md:block">Sélectionnez votre programme</p>
          </div>
        </div>
        
        <SessionSelector 
          data={data} 
          filters={filters} 
          onChange={setFilters} 
        />
      </div>

      {/* Session Preview - Compact */}
      {currentSessionData.length > 0 ? (
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl overflow-hidden pb-20 md:pb-0">
          <div className="p-3 md:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <Dumbbell className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm md:text-lg font-bold text-white">Aperçu</h2>
                <p className="text-slate-400 text-xs">{currentSessionData.length} exercices</p>
              </div>
            </div>
            <button 
              onClick={onStartSession}
              className="hidden md:flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              Commencer
            </button>
          </div>
          
          <div className="p-3 md:p-5">
            <SessionPreview 
              exercises={currentSessionData}
              selectedOrder={filters.selectedSeances}
            />
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-8 md:p-12 text-center">
          <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3 md:mb-4">
            <Dumbbell className="w-6 h-6 md:w-8 md:h-8 text-slate-600" />
          </div>
          <h3 className="text-sm md:text-lg font-medium text-slate-400 mb-1 md:mb-2">Aucune séance sélectionnée</h3>
          <p className="text-slate-500 text-xs md:text-sm">Utilisez le sélecteur ci-dessus</p>
        </div>
      )}

      {/* Bouton sticky mobile pour démarrer la séance */}
      {currentSessionData.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-slate-950/95 backdrop-blur-lg border-t border-slate-800 md:hidden z-40">
          <button 
            onClick={onStartSession}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold shadow-lg shadow-blue-600/25"
          >
            <Play className="w-5 h-5 fill-current" />
            Démarrer la séance
          </button>
        </div>
      )}
    </div>
  );
};
