import React, { useState, useEffect } from 'react';
import { User, SessionLog, AthleteComment, WeekOrganizerLog } from '../../types';
import { RichTextEditor } from './RichTextEditor';
import { 
  Users, 
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
  fetchTeamComments?: (coachId: string, onlyUnread?: boolean) => Promise<AthleteComment[]>;
  markCommentsAsRead?: (commentIds: string[]) => Promise<void>;
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
      <div className="space-y-4 animate-fade-in">
        {/* Back button */}
        <button 
          onClick={() => setSelectedAthlete(null)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors -ml-1"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm">Retour</span>
        </button>

        {/* Athlete header - compact */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
              {selectedAthlete.firstName?.[0]}{selectedAthlete.lastName?.[0]}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-white truncate">
                {selectedAthlete.firstName} {selectedAthlete.lastName}
              </h1>
              <p className="text-slate-400 text-sm">@{selectedAthlete.username}</p>
            </div>
          </div>

          {/* Stats - inline on mobile */}
          <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
            <div className="flex-1 min-w-[80px] bg-slate-800/50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-white">{stats.totalSessions}</p>
              <p className="text-xs text-slate-400">Total</p>
            </div>
            <div className="flex-1 min-w-[80px] bg-slate-800/50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-emerald-400">{stats.monthSessions}</p>
              <p className="text-xs text-slate-400">Ce mois</p>
            </div>
            <div className="flex-1 min-w-[80px] bg-slate-800/50 rounded-lg p-2 sm:p-3 text-center">
              <p className="text-xl sm:text-2xl font-bold text-blue-400">
                {stats.daysSinceLastSession !== null ? `${stats.daysSinceLastSession}j` : '—'}
              </p>
              <p className="text-xs text-slate-400">Dernier</p>
            </div>
          </div>
        </div>

        {/* History */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-slate-800">
            <h2 className="font-bold text-white">Historique</h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center text-slate-500">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Chargement...
            </div>
          ) : athleteHistory.length === 0 ? (
            <div className="p-8 text-center">
              <Dumbbell className="w-10 h-10 text-slate-700 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Aucune séance</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800">
              {athleteHistory.slice(0, 10).map((log) => {
                const date = new Date(log.date);
                return (
                  <div key={log.id} className="p-3 hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-800 rounded-lg flex flex-col items-center justify-center flex-shrink-0">
                        <span className="text-[10px] text-slate-500 uppercase">
                          {date.toLocaleDateString('fr-FR', { month: 'short' })}
                        </span>
                        <span className="text-sm font-bold text-white leading-none">{date.getDate()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white text-sm truncate">Session {log.sessionKey.seance}</p>
                        <p className="text-xs text-slate-400">
                          {log.exercises.length} exos{log.durationMinutes && ` · ${log.durationMinutes}min`}
                        </p>
                      </div>
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
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Mes Athlètes</h1>
        <p className="text-slate-400 text-sm">{athletes.length} athlète{athletes.length > 1 ? 's' : ''}</p>
      </div>

      {/* iOS-style Segmented Control */}
      <div className="bg-slate-800/50 p-1 rounded-xl flex">
        <button
          onClick={() => setActiveTab('team')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'team' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'text-slate-400'
          }`}
        >
          <Users className="w-4 h-4" />
          <span className="hidden sm:inline">Athlètes</span>
        </button>
        <button
          onClick={() => setActiveTab('feedbacks')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all relative ${
            activeTab === 'feedbacks' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'text-slate-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Feedbacks</span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 sm:static sm:ml-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('organizer')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'organizer' 
              ? 'bg-slate-900 text-white shadow-sm' 
              : 'text-slate-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Messages</span>
        </button>
      </div>

      {/* TAB: Team */}
      {activeTab === 'team' && (
        <div className="space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {loading ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Chargement...</p>
            </div>
          ) : filteredAthletes.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-8 text-center">
              <Users className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="font-medium text-slate-400 mb-1">
                {searchTerm ? "Aucun résultat" : "Aucun athlète"}
              </h3>
              <p className="text-slate-500 text-sm">
                {searchTerm ? "Essayez une autre recherche" : "Invitez des athlètes"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredAthletes.map((athlete) => (
                <button
                  key={athlete.id}
                  onClick={() => handleSelectAthlete(athlete)}
                  className="w-full bg-slate-900 border border-slate-800 hover:border-blue-500/50 rounded-xl p-3 text-left transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-emerald-500/20 group-hover:from-blue-500/30 group-hover:to-emerald-500/30 rounded-lg flex items-center justify-center text-blue-400 font-bold text-sm transition-colors flex-shrink-0">
                      {athlete.firstName?.[0]}{athlete.lastName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-white group-hover:text-blue-400 transition-colors text-sm truncate">
                        {athlete.firstName} {athlete.lastName}
                      </h3>
                      <p className="text-xs text-slate-500 truncate">@{athlete.username}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB: Feedbacks */}
      {activeTab === 'feedbacks' && (
        <div className="space-y-3">
          {/* Filter bar */}
          <div className="flex items-center justify-between gap-3">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={showAllComments}
                onChange={(e) => {
                  setShowAllComments(e.target.checked);
                  setTimeout(loadComments, 0);
                }}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
              />
              Afficher les lus
            </label>

            {selectedComments.size > 0 && (
              <button
                onClick={handleMarkAsRead}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Lu ({selectedComments.size})
              </button>
            )}
          </div>

          {commentsLoading ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Chargement...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-8 text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="font-medium text-slate-400 mb-1">Aucun feedback</h3>
              <p className="text-slate-500 text-sm">Les commentaires apparaîtront ici</p>
            </div>
          ) : (
            <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className={`bg-slate-900 border rounded-xl p-3 transition-colors ${
                    comment.isRead 
                      ? 'border-slate-800 opacity-60' 
                      : 'border-blue-500/30 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Checkbox */}
                    <button
                      onClick={() => handleToggleComment(comment.id)}
                      className={`mt-0.5 w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        selectedComments.has(comment.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-slate-600 hover:border-blue-500'
                      }`}
                    >
                      {selectedComments.has(comment.id) && <Check className="w-2.5 h-2.5" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Header */}
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-medium text-white text-sm">
                          {comment.firstName} {comment.lastName}
                        </span>
                        {!comment.isRead && (
                          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full">
                            Nouveau
                          </span>
                        )}
                      </div>
                      
                      {/* Exercise info */}
                      <p className="text-xs text-slate-400 mb-1.5">
                        <span className="text-emerald-400">{comment.exerciseName}</span>
                        {comment.sessionName && <span> · {comment.sessionName}</span>}
                      </p>
                      
                      {/* Comment */}
                      <p className="text-slate-200 text-sm">{comment.comment}</p>
                      
                      {/* Date */}
                      <p className="text-[10px] text-slate-500 mt-1.5">
                        {new Date(comment.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
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
        <div className="space-y-3">
          {/* Add button */}
          {!showOrganizerForm && (
            <button
              onClick={() => setShowOrganizerForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-400 hover:text-blue-400 rounded-xl transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              Nouveau message
            </button>
          )}

          {/* Form */}
          {showOrganizerForm && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">Nouveau message</h3>
                <button
                  onClick={() => setShowOrganizerForm(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Titre</label>
                <input
                  type="text"
                  value={organizerForm.title}
                  onChange={(e) => setOrganizerForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Programme semaine 12"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date range - compact inline layout */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Période</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={organizerForm.startDate}
                    onChange={(e) => setOrganizerForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-slate-500 text-sm">→</span>
                  <input
                    type="date"
                    value={organizerForm.endDate}
                    onChange={(e) => setOrganizerForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Message */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Message</label>
                <RichTextEditor
                  value={organizerForm.message}
                  onChange={(html) => setOrganizerForm(prev => ({ ...prev, message: html }))}
                  placeholder="Écrivez votre message..."
                />
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setShowOrganizerForm(false)}
                  className="flex-1 px-4 py-2 text-slate-400 hover:text-white text-sm transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveOrganizer}
                  disabled={organizerLoading}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  Publier
                </button>
              </div>
            </div>
          )}

          {/* Messages list */}
          {organizerLoading && organizerLogs.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-3" />
              <p className="text-slate-400 text-sm">Chargement...</p>
            </div>
          ) : organizerLogs.length === 0 && !showOrganizerForm ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-xl p-8 text-center">
              <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <h3 className="font-medium text-slate-400 mb-1">Aucun message</h3>
              <p className="text-slate-500 text-sm">Créez des messages pour vos athlètes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {organizerLogs.map((log) => {
                const isActive = new Date(log.startDate) <= new Date() && new Date(log.endDate) >= new Date();
                return (
                  <div
                    key={log.id}
                    className={`bg-slate-900 border rounded-xl overflow-hidden ${
                      isActive ? 'border-emerald-500/50' : 'border-slate-800'
                    }`}
                  >
                    <div className="p-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white text-sm truncate">{log.title}</h3>
                            {isActive && (
                              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] rounded-full flex-shrink-0">
                                Actif
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(log.startDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                            {' → '}
                            {new Date(log.endDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteOrganizer(log.id)}
                          className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      {/* Content */}
                      <div 
                        className="text-slate-300 text-sm rich-text-display"
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
