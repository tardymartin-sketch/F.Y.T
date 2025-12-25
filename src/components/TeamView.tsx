import React, { useState, useEffect } from 'react';
import { User, SessionLog, AthleteComment, WeekOrganizerLog } from '../../types';
import { RichTextEditor } from './RichTextEditor';
import { 
  Users, 
  ChevronRight, 
  ChevronLeft,
  Search,
  Dumbbell,
  MessageSquare,
  Calendar,
  Check,
  CheckCheck,
  Plus,
  X,
  Send,
  Clock,
  Trash2
} from 'lucide-react';

interface Props {
  coachId: string;
  fetchTeam: (coachId: string) => Promise<User[]>;
  fetchAthleteHistory: (athleteId: string) => Promise<SessionLog[]>;
  // New props for feedbacks
  fetchTeamComments?: (coachId: string, onlyUnread?: boolean) => Promise<AthleteComment[]>;
  markCommentsAsRead?: (commentIds: string[]) => Promise<void>;
  // New props for week organizer
  fetchWeekOrganizerLogs?: (coachId: string) => Promise<WeekOrganizerLog[]>;
  saveWeekOrganizerLog?: (log: WeekOrganizerLog) => Promise<WeekOrganizerLog>;
  deleteWeekOrganizerLog?: (logId: string) => Promise<void>;
}

type TabType = 'team' | 'feedbacks' | 'organizer';

export const TeamView: React.FC<Props> = ({ 
  coachId, 
  fetchTeam, 
  fetchAthleteHistory,
  fetchTeamComments,
  markCommentsAsRead,
  fetchWeekOrganizerLogs,
  saveWeekOrganizerLog,
  deleteWeekOrganizerLog
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('team');

  // Team state
  const [athletes, setAthletes] = useState<User[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<User | null>(null);
  const [athleteHistory, setAthleteHistory] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Feedbacks state
  const [comments, setComments] = useState<AthleteComment[]>([]);
  const [selectedComments, setSelectedComments] = useState<Set<string>>(new Set());
  const [showAllComments, setShowAllComments] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(false);

  // Week Organizer state
  const [organizerLogs, setOrganizerLogs] = useState<WeekOrganizerLog[]>([]);
  const [showOrganizerForm, setShowOrganizerForm] = useState(false);
  const [organizerForm, setOrganizerForm] = useState({
    title: '',
    message: '',
    startDate: '',
    endDate: ''
  });
  const [organizerLoading, setOrganizerLoading] = useState(false);

  // Load team on mount
  useEffect(() => {
    loadTeam();
  }, [coachId]);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'feedbacks' && fetchTeamComments) {
      loadComments();
    } else if (activeTab === 'organizer' && fetchWeekOrganizerLogs) {
      loadOrganizerLogs();
    }
  }, [activeTab]);

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

  const loadComments = async () => {
    if (!fetchTeamComments) return;
    setCommentsLoading(true);
    try {
      const data = await fetchTeamComments(coachId, !showAllComments);
      setComments(data);
    } catch (e) {
      console.error("Erreur chargement commentaires:", e);
    } finally {
      setCommentsLoading(false);
    }
  };

  const loadOrganizerLogs = async () => {
    if (!fetchWeekOrganizerLogs) return;
    setOrganizerLoading(true);
    try {
      const data = await fetchWeekOrganizerLogs(coachId);
      setOrganizerLogs(data);
    } catch (e) {
      console.error("Erreur chargement week organizer:", e);
    } finally {
      setOrganizerLoading(false);
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

  const handleToggleComment = (commentId: string) => {
    const newSelected = new Set(selectedComments);
    if (newSelected.has(commentId)) {
      newSelected.delete(commentId);
    } else {
      newSelected.add(commentId);
    }
    setSelectedComments(newSelected);
  };

  const handleMarkAsRead = async () => {
    if (!markCommentsAsRead || selectedComments.size === 0) return;
    try {
      await markCommentsAsRead(Array.from(selectedComments));
      setComments(prev => prev.map(c => 
        selectedComments.has(c.id) ? { ...c, isRead: true } : c
      ));
      setSelectedComments(new Set());
      // Refresh if showing only unread
      if (!showAllComments) {
        loadComments();
      }
    } catch (e) {
      console.error("Erreur marquage comme lu:", e);
    }
  };

  const handleSaveOrganizer = async () => {
    if (!saveWeekOrganizerLog) return;
    if (!organizerForm.title || !organizerForm.message || !organizerForm.startDate || !organizerForm.endDate) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setOrganizerLoading(true);
    try {
      const newLog: WeekOrganizerLog = {
        id: crypto.randomUUID(),
        coachId,
        title: organizerForm.title,
        message: organizerForm.message,
        startDate: organizerForm.startDate,
        endDate: organizerForm.endDate,
        createdAt: new Date().toISOString()
      };
      
      const saved = await saveWeekOrganizerLog(newLog);
      setOrganizerLogs(prev => [saved, ...prev]);
      setOrganizerForm({ title: '', message: '', startDate: '', endDate: '' });
      setShowOrganizerForm(false);
    } catch (e) {
      console.error("Erreur sauvegarde organizer:", e);
      alert("Erreur lors de la sauvegarde");
    } finally {
      setOrganizerLoading(false);
    }
  };

  const handleDeleteOrganizer = async (logId: string) => {
    if (!deleteWeekOrganizerLog) return;
    if (!confirm("Supprimer ce message ?")) return;

    try {
      await deleteWeekOrganizerLog(logId);
      setOrganizerLogs(prev => prev.filter(l => l.id !== logId));
    } catch (e) {
      console.error("Erreur suppression organizer:", e);
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

  const unreadCount = comments.filter(c => !c.isRead).length;

  // =============================================
  // ATHLETE DETAIL VIEW
  // =============================================
  if (selectedAthlete) {
    const stats = getAthleteStats(athleteHistory);
    
    return (
      <div className="space-y-6 animate-fade-in">
        <button 
          onClick={() => setSelectedAthlete(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Retour à l'équipe</span>
        </button>

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

  // =============================================
  // MAIN VIEW WITH TABS
  // =============================================
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Mon Équipe</h1>
        <p className="text-slate-400 mt-1">{athletes.length} athlètes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('team')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'team' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          Athlètes
        </button>
        <button
          onClick={() => setActiveTab('feedbacks')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors relative ${
            activeTab === 'feedbacks' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          Feedbacks
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('organizer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'organizer' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Week Organizer
        </button>
      </div>

      {/* TAB: Team */}
      {activeTab === 'team' && (
        <>
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
        </>
      )}

      {/* TAB: Feedbacks */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-4">
          {/* Filter toggle */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={showAllComments}
                onChange={(e) => {
                  setShowAllComments(e.target.checked);
                  setTimeout(loadComments, 0);
                }}
                className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              Afficher les commentaires lus
            </label>

            {selectedComments.size > 0 && (
              <button
                onClick={handleMarkAsRead}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Marquer comme lu ({selectedComments.size})
              </button>
            )}
          </div>

          {commentsLoading ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-400">Chargement des feedbacks...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <MessageSquare className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">Aucun feedback</h3>
              <p className="text-slate-500 text-sm">
                Les commentaires de vos athlètes apparaîtront ici
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`bg-slate-900 border rounded-xl p-4 transition-colors ${
                    comment.isRead 
                      ? 'border-slate-800 opacity-60' 
                      : 'border-blue-500/30 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => handleToggleComment(comment.id)}
                      className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                        selectedComments.has(comment.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-slate-600 hover:border-blue-500'
                      }`}
                    >
                      {selectedComments.has(comment.id) && <Check className="w-3 h-3" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">
                          {comment.firstName} {comment.lastName}
                        </span>
                        <span className="text-slate-500">@{comment.username}</span>
                        {!comment.isRead && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                            Nouveau
                          </span>
                        )}
                      </div>
                      
                      <p className="text-sm text-slate-400 mb-2">
                        <span className="text-emerald-400">{comment.exerciseName}</span>
                        {comment.sessionName && (
                          <span> • Session {comment.sessionName}</span>
                        )}
                      </p>
                      
                      <p className="text-slate-200">{comment.comment}</p>
                      
                      <p className="text-xs text-slate-500 mt-2">
                        {new Date(comment.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Week Organizer */}
      {activeTab === 'organizer' && (
        <div className="space-y-4">
          {/* Add new message button */}
          {!showOrganizerForm && (
            <button
              onClick={() => setShowOrganizerForm(true)}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nouveau message
            </button>
          )}

          {/* New message form */}
          {showOrganizerForm && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-white">Nouveau message</h3>
                <button
                  onClick={() => setShowOrganizerForm(false)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Titre</label>
                <input
                  type="text"
                  value={organizerForm.title}
                  onChange={(e) => setOrganizerForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Programme semaine 12"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Date de début</label>
                  <input
                    type="date"
                    value={organizerForm.startDate}
                    onChange={(e) => setOrganizerForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Date de fin</label>
                  <input
                    type="date"
                    value={organizerForm.endDate}
                    onChange={(e) => setOrganizerForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Message</label>
                <RichTextEditor
                  value={organizerForm.message}
                  onChange={(html) => setOrganizerForm(prev => ({ ...prev, message: html }))}
                  placeholder="Écrivez votre message ici..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setShowOrganizerForm(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveOrganizer}
                  disabled={organizerLoading}
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Publier
                </button>
              </div>
            </div>
          )}

          {/* Existing messages */}
          {organizerLoading && organizerLogs.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-slate-400">Chargement...</p>
            </div>
          ) : organizerLogs.length === 0 && !showOrganizerForm ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Calendar className="w-16 h-16 text-slate-700 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-400 mb-2">Aucun message</h3>
              <p className="text-slate-500 text-sm">
                Créez des messages pour communiquer avec vos athlètes
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {organizerLogs.map((log) => {
                const isActive = new Date(log.startDate) <= new Date() && new Date(log.endDate) >= new Date();
                return (
                  <div
                    key={log.id}
                    className={`bg-slate-900 border rounded-2xl overflow-hidden ${
                      isActive ? 'border-emerald-500/50' : 'border-slate-800'
                    }`}
                  >
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-white">{log.title}</h3>
                            {isActive && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                Actif
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-1 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {new Date(log.startDate).toLocaleDateString('fr-FR')} — {new Date(log.endDate).toLocaleDateString('fr-FR')}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteOrganizer(log.id)}
                          className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div 
                        className="text-slate-300 rich-text-display"
                        dangerouslySetInnerHTML={{ __html: log.message }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
