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
}

export const Home: React.FC<Props> = ({ 
  data, 
  filters, 
  setFilters, 
  onStartSession, 
  user,
  history,
  activeWeekOrganizer,
  pastWeekOrganizers = []
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
    <div className="space-y-8 animate-fade-in">
      {/* Header avec salutation */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-slate-400 text-sm mb-1">{getGreeting()}</p>
          <h1 className="text-3xl md:text-4xl font-bold text-white">
            {user.firstName || user.username} 
            <span className="text-gradient ml-2">👋</span>
          </h1>
          <p className="text-slate-400 mt-2">Prêt à repousser vos limites aujourd'hui ?</p>
        </div>
        
        {currentSessionData.length > 0 && (
          <button 
            onClick={onStartSession}
            className="flex items-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white px-6 py-4 rounded-2xl font-semibold shadow-lg shadow-blue-600/25 transition-all hover:scale-[1.02] active:scale-[0.98] group"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div className="text-left">
              <span className="block text-sm opacity-80">Démarrer</span>
              <span className="block font-bold">Ma séance</span>
            </div>
            <ChevronRight className="w-5 h-5 opacity-60 group-hover:translate-x-1 transition-transform" />
          </button>
        )}
      </div>

      {/* Week Organizer Message */}
      {activeWeekOrganizer && (
        <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl overflow-hidden">
          <div className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                <MessageSquare className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <h3 className="font-bold text-white">{activeWeekOrganizer.title}</h3>
                <p className="text-xs text-slate-400">
                  {new Date(activeWeekOrganizer.startDate).toLocaleDateString('fr-FR')} — {new Date(activeWeekOrganizer.endDate).toLocaleDateString('fr-FR')}
                </p>
              </div>
            </div>
            <div 
              className="text-slate-300 rich-text-display"
              dangerouslySetInnerHTML={{ __html: activeWeekOrganizer.message }}
            />
          </div>
          
          {/* Past messages accordion */}
          {pastWeekOrganizers.length > 0 && (
            <div className="border-t border-slate-800">
              <button
                onClick={() => setShowPastOrganizers(!showPastOrganizers)}
                className="w-full flex items-center justify-between px-5 py-3 text-sm text-slate-400 hover:text-white transition-colors"
              >
                <span>Messages précédents ({pastWeekOrganizers.length})</span>
                {showPastOrganizers ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
              
              {showPastOrganizers && (
                <div className="px-5 pb-4 space-y-3">
                  {pastWeekOrganizers.slice(0, 5).map((log) => (
                    <div key={log.id} className="bg-slate-900/50 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-white text-sm">{log.title}</h4>
                        <span className="text-xs text-slate-500">
                          {new Date(log.startDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <div 
                        className="text-slate-400 text-sm rich-text-display"
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <span className="text-slate-400 text-sm">Cette semaine</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.weekSessions}</p>
          <p className="text-slate-500 text-sm mt-1">séances</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
            </div>
            <span className="text-slate-400 text-sm">Ce mois</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.monthSessions}</p>
          <p className="text-slate-500 text-sm mt-1">séances</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-purple-400" />
            </div>
            <span className="text-slate-400 text-sm">Temps total</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.totalHours}h</p>
          <p className="text-slate-500 text-sm mt-1">ce mois</p>
        </div>

        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <Flame className="w-5 h-5 text-orange-400" />
            </div>
            <span className="text-slate-400 text-sm">Série</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats.streak}</p>
          <p className="text-slate-500 text-sm mt-1">jours 🔥</p>
        </div>
      </div>

      {/* Session Selector */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Planifier ma séance</h2>
            <p className="text-slate-400 text-sm">Sélectionnez votre programme d'entraînement</p>
          </div>
        </div>
        
        <SessionSelector 
          data={data} 
          filters={filters} 
          onChange={setFilters} 
        />
      </div>

      {/* Session Preview */}
      {currentSessionData.length > 0 ? (
        <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Dumbbell className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Aperçu de la séance</h2>
                <p className="text-slate-400 text-sm">{currentSessionData.length} exercices</p>
              </div>
            </div>
            <button 
              onClick={onStartSession}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-colors"
            >
              <Play className="w-4 h-4 fill-current" />
              Commencer
            </button>
          </div>
          
          <div className="p-6">
            <SessionPreview 
              exercises={currentSessionData}
              selectedOrder={filters.selectedSeances}
            />
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Dumbbell className="w-8 h-8 text-slate-600" />
          </div>
          <h3 className="text-lg font-medium text-slate-400 mb-2">Aucune séance sélectionnée</h3>
          <p className="text-slate-500 text-sm">Utilisez le sélecteur ci-dessus pour choisir votre programme</p>
        </div>
      )}
    </div>
  );
};

