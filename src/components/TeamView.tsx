import React, { useState, useEffect } from 'react';
import { User, SessionLog } from '../../types';
import { 
  Users, 
  ChevronRight, 
  ChevronLeft,
  Search,
  Dumbbell,
  Calendar,
  Clock,
  TrendingUp,
  Mail
} from 'lucide-react';

interface Props {
  coachId: string;
  fetchTeam: (coachId: string) => Promise<User[]>;
  fetchAthleteHistory: (athleteId: string) => Promise<SessionLog[]>;
}

export const TeamView: React.FC<Props> = ({ 
  coachId, 
  fetchTeam, 
  fetchAthleteHistory
}) => {
  const [athletes, setAthletes] = useState<User[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<User | null>(null);
  const [athleteHistory, setAthleteHistory] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTeam();
  }, [coachId]);

  const loadTeam = async () => {
    setLoading(true);
    try {
      const team = await fetchTeam(coachId);
      setAthletes(team);
    } catch (e) {
      console.error("Erreur chargement équipe:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAthlete = async (athlete: User) => {
    setSelectedAthlete(athlete);
    setLoading(true);
    try {
      const history = await fetchAthleteHistory(athlete.id);
      setAthleteHistory(history);
    } catch (e) {
      console.error("Erreur chargement historique:", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredAthletes = athletes.filter(a => {
    const term = searchTerm.toLowerCase();
    return (
      a.firstName?.toLowerCase().includes(term) ||
      a.lastName?.toLowerCase().includes(term) ||
      a.username.toLowerCase().includes(term)
    );
  });

  // Stats pour un athlète
  const getAthleteStats = (history: SessionLog[]) => {
    const now = new Date();
    const thisMonth = history.filter(h => {
      const d = new Date(h.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    
    const lastSession = history.length > 0 ? new Date(history[0].date) : null;
    const daysSinceLastSession = lastSession 
      ? Math.floor((now.getTime() - lastSession.getTime()) / (1000 * 60 * 60 * 24))
      : null;
    
    return {
      totalSessions: history.length,
      monthSessions: thisMonth.length,
      daysSinceLastSession
    };
  };

  // Vue détaillée d'un athlète
  if (selectedAthlete) {
    const stats = getAthleteStats(athleteHistory);
    
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header avec retour */}
        <button 
          onClick={() => setSelectedAthlete(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Retour à l'équipe</span>
        </button>

        {/* Profil athlète */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
              {selectedAthlete.firstName?.[0]}{selectedAthlete.lastName?.[0]}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">
                {selectedAthlete.firstName} {selectedAthlete.lastName}
              </h1>
              <p className="text-slate-400">@{selectedAthlete.username}</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-white">{stats.totalSessions}</p>
              <p className="text-sm text-slate-400">Séances totales</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-emerald-400">{stats.monthSessions}</p>
              <p className="text-sm text-slate-400">Ce mois</p>
            </div>
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-blue-400">
                {stats.daysSinceLastSession !== null ? `${stats.daysSinceLastSession}j` : '—'}
              </p>
              <p className="text-sm text-slate-400">Dernière séance</p>
            </div>
          </div>
        </div>

        {/* Historique */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl">
          <div className="p-6 border-b border-slate-800">
            <h2 className="text-lg font-bold text-white">Historique des séances</h2>
          </div>
          
          {loading ? (
            <div className="p-12 text-center text-slate-500">Chargement...</div>
          ) : athleteHistory.length === 0 ? (
            <div className="p-12 text-center">
              <Dumbbell className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">Aucune séance enregistrée</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {athleteHistory.slice(0, 10).map((log) => {
                const date = new Date(log.date);
                return (
                  <div key={log.id} className="p-4 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-slate-800 rounded-xl flex flex-col items-center justify-center">
                          <span className="text-xs text-slate-500">
                            {date.toLocaleDateString('fr-FR', { month: 'short' })}
                          </span>
                          <span className="text-lg font-bold text-white">{date.getDate()}</span>
                        </div>
                        <div>
                          <p className="font-medium text-white">Session {log.sessionKey.seance}</p>
                          <p className="text-sm text-slate-400">
                            {log.exercises.length} exercices
                            {log.durationMinutes && ` • ${log.durationMinutes} min`}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Vue liste équipe
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Mon Équipe</h1>
          <p className="text-slate-400 mt-1">{athletes.length} athlètes</p>
        </div>
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
        <input
          type="text"
          placeholder="Rechercher un athlète..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Liste des athlètes */}
      {loading ? (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Chargement de l'équipe...</p>
        </div>
      ) : filteredAthletes.length === 0 ? (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
          <Users className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-400 mb-2">
            {searchTerm ? "Aucun résultat" : "Aucun athlète"}
          </h3>
          <p className="text-slate-500 text-sm">
            {searchTerm 
              ? "Essayez une autre recherche" 
              : "Invitez des athlètes à rejoindre votre équipe"
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAthletes.map((athlete) => (
            <button
              key={athlete.id}
              onClick={() => handleSelectAthlete(athlete)}
              className="bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-5 text-left transition-all duration-200 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 group-hover:from-blue-500/30 group-hover:to-emerald-500/30 rounded-xl flex items-center justify-center text-blue-400 font-bold text-lg transition-colors">
                  {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
                    {athlete.firstName} {athlete.lastName}
                  </h3>
                  <p className="text-sm text-slate-500 truncate">@{athlete.username}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
