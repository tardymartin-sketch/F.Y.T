// ============================================================
// F.Y.T - TEAM VIEW (VERSION AVEC RPE)
// src/components/TeamView.tsx
// Vue équipe avec affichage des RPE dans l'historique athlète
// ============================================================

import React, { useState, useEffect } from 'react';
import { User, SessionLog, AthleteComment, WeekOrganizerLog, getRpeColor, getRpeBgColor, getRpeInfo } from '../../types';
import type { AthleteGroupWithCount, VisibilityType } from '../../types';
import { RichTextEditor } from './RichTextEditor';
import { AthleteGroupsManager } from './AthleteGroupsManager';
import { VisibilitySelector } from './VisibilitySelector';
import { StravaHistoryCard } from './StravaHistoryCard';
import { RpeBadge } from './RpeSelector';
import { 
  Users, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown,
  ChevronUp,
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
  Trash2,
  Layers,
  Gauge
} from 'lucide-react';

// Helper pour détecter si une session vient de Strava
const isStravaSession = (log: SessionLog): boolean => {
  return log.sessionKey.seance.toLowerCase().includes('strava');
};

interface Props {
  coachId: string;
  fetchTeam: (coachId: string) => Promise<User[]>;
  fetchAthleteHistory: (athleteId: string) => Promise<SessionLog[]>;
  fetchTeamComments?: (coachId: string, onlyUnread?: boolean) => Promise<AthleteComment[]>;
  markCommentsAsRead?: (commentIds: string[]) => Promise<void>;
  fetchWeekOrganizerLogs?: (coachId: string) => Promise<WeekOrganizerLog[]>;
  saveWeekOrganizerLog?: (log: WeekOrganizerLog) => Promise<WeekOrganizerLog>;
  deleteWeekOrganizerLog?: (logId: string) => Promise<void>;
  fetchAthleteGroups?: (coachId: string) => Promise<AthleteGroupWithCount[]>;
  createAthleteGroup?: (name: string, description: string, color: string) => Promise<void>;
  updateAthleteGroup?: (groupId: string, name: string, description: string, color: string) => Promise<void>;
  deleteAthleteGroup?: (groupId: string) => Promise<void>;
  updateGroupMembers?: (groupId: string, athleteIds: string[]) => Promise<void>;
  loadGroupMembers?: (groupId: string) => Promise<User[]>;
}

type TabType = 'team' | 'feedbacks' | 'organizer' | 'groups';

export const TeamView: React.FC<Props> = ({ 
  coachId, 
  fetchTeam, 
  fetchAthleteHistory,
  fetchTeamComments,
  markCommentsAsRead,
  fetchWeekOrganizerLogs,
  saveWeekOrganizerLog,
  deleteWeekOrganizerLog,
  fetchAthleteGroups,
  createAthleteGroup,
  updateAthleteGroup,
  deleteAthleteGroup,
  updateGroupMembers,
  loadGroupMembers,
}) => {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('team');

  // Team state
  const [athletes, setAthletes] = useState<User[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<User | null>(null);
  const [athleteHistory, setAthleteHistory] = useState<SessionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

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
    startDate: '',
    endDate: '',
    message: '',
    visibilityType: 'all' as VisibilityType,
    visibleToGroupIds: [] as string[],
    visibleToAthleteIds: [] as string[],
  });

  // Groups state
  const [groups, setGroups] = useState<AthleteGroupWithCount[]>([]);

  // Load data on mount
  useEffect(() => {
    loadTeam();
    if (fetchTeamComments) loadComments();
    if (fetchWeekOrganizerLogs) loadOrganizerLogs();
    if (fetchAthleteGroups) loadGroups();
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
    try {
      const logs = await fetchWeekOrganizerLogs(coachId);
      setOrganizerLogs(logs);
    } catch (e) {
      console.error("Erreur chargement organizer:", e);
    }
  };

  const loadGroups = async () => {
    if (!fetchAthleteGroups) return;
    try {
      const data = await fetchAthleteGroups(coachId);
      setGroups(data);
    } catch (e) {
      console.error("Erreur chargement groupes:", e);
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

  const handleMarkAsRead = async () => {
    if (!markCommentsAsRead || selectedComments.size === 0) return;
    
    try {
      await markCommentsAsRead(Array.from(selectedComments));
      setComments(prev => prev.map(c => 
        selectedComments.has(c.id) ? { ...c, isRead: true } : c
      ));
      setSelectedComments(new Set());
    } catch (e) {
      console.error("Erreur marquage commentaires:", e);
    }
  };

  const handleSaveOrganizer = async () => {
    if (!saveWeekOrganizerLog) return;
    if (!organizerForm.title || !organizerForm.startDate || !organizerForm.endDate || !organizerForm.message) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    try {
      const newLog: WeekOrganizerLog = {
        id: crypto.randomUUID(),
        coachId,
        title: organizerForm.title,
        startDate: organizerForm.startDate,
        endDate: organizerForm.endDate,
        message: organizerForm.message,
        createdAt: new Date().toISOString(),
        visibilityType: organizerForm.visibilityType,
        visibleToGroupIds: organizerForm.visibilityType === 'groups' ? organizerForm.visibleToGroupIds : undefined,
        visibleToAthleteIds: organizerForm.visibilityType === 'athletes' ? organizerForm.visibleToAthleteIds : undefined,
      };

      const saved = await saveWeekOrganizerLog(newLog);
      setOrganizerLogs(prev => [saved, ...prev]);
      setShowOrganizerForm(false);
      setOrganizerForm({
        title: '',
        startDate: '',
        endDate: '',
        message: '',
        visibilityType: 'all',
        visibleToGroupIds: [],
        visibleToAthleteIds: [],
      });
    } catch (e) {
      console.error("Erreur sauvegarde organizer:", e);
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

  // Groups handlers
  const handleCreateGroup = async (name: string, description: string, color: string) => {
    if (!createAthleteGroup) return;
    await createAthleteGroup(name, description, color);
    await loadGroups();
  };

  const handleUpdateGroup = async (groupId: string, name: string, description: string, color: string) => {
    if (!updateAthleteGroup) return;
    await updateAthleteGroup(groupId, name, description, color);
    await loadGroups();
  };

  const handleDeleteGroup = async (groupId: string) => {
    if (!deleteAthleteGroup) return;
    await deleteAthleteGroup(groupId);
    await loadGroups();
  };

  const handleUpdateMembers = async (groupId: string, athleteIds: string[]) => {
    if (!updateGroupMembers) return;
    await updateGroupMembers(groupId, athleteIds);
    await loadGroups();
  };

  const handleLoadGroupMembers = async (groupId: string): Promise<User[]> => {
    if (!loadGroupMembers) return [];
    return await loadGroupMembers(groupId);
  };

  const filteredAthletes = athletes.filter(a => {
    const term = searchTerm.toLowerCase();
    return (
      a.firstName?.toLowerCase().includes(term) ||
      a.lastName?.toLowerCase().includes(term) ||
      a.username.toLowerCase().includes(term)
    );
  });

  // ← NOUVEAU: Stats avec RPE moyen
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

    // Calcul du RPE moyen sur les 30 derniers jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentSessions = history.filter(h => new Date(h.date) >= thirtyDaysAgo);
    const sessionsWithRpe = recentSessions.filter(h => h.sessionRpe !== undefined);
    const avgRpe = sessionsWithRpe.length > 0
      ? Math.round((sessionsWithRpe.reduce((acc, h) => acc + (h.sessionRpe || 0), 0) / sessionsWithRpe.length) * 10) / 10
      : null;
    
    return {
      totalSessions: history.length,
      monthSessions: thisMonth.length,
      daysSinceLastSession,
      avgRpe
    };
  };

  const unreadCount = comments.filter(c => !c.isRead).length;

  const getVisibilityLabel = (log: WeekOrganizerLog): string => {
    if (!log.visibilityType || log.visibilityType === 'all') return 'Tous les athlètes';
    if (log.visibilityType === 'groups') {
      const count = log.visibleToGroupIds?.length || 0;
      return `${count} groupe${count > 1 ? 's' : ''}`;
    }
    if (log.visibilityType === 'athletes') {
      const count = log.visibleToAthleteIds?.length || 0;
      return `${count} athlète${count > 1 ? 's' : ''}`;
    }
    return '';
  };

  // =============================================
  // ATHLETE DETAIL VIEW (avec RPE)
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

          {/* ← MODIFIÉ: Grille 4 colonnes avec RPE */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
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
            {/* ← NOUVEAU: RPE Moyen */}
            <div className="bg-slate-800/50 rounded-xl p-4 text-center">
              {stats.avgRpe !== null ? (
                <>
                  <p className={`text-3xl font-bold ${getRpeColor(Math.round(stats.avgRpe))}`}>
                    {stats.avgRpe}
                  </p>
                  <p className="text-sm text-slate-400">RPE moy. 30j</p>
                </>
              ) : (
                <>
                  <p className="text-3xl font-bold text-slate-600">—</p>
                  <p className="text-sm text-slate-400">RPE moy. 30j</p>
                </>
              )}
            </div>
          </div>

          {/* ← NOUVEAU: Alerte si RPE élevé */}
          {stats.avgRpe !== null && stats.avgRpe >= 8 && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
              <Gauge className="w-5 h-5 text-red-400" />
              <p className="text-sm text-red-400">
                ⚠️ RPE moyen élevé ({stats.avgRpe}/10) - Surveiller les signes de surmenage
              </p>
            </div>
          )}
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
                // Affichage spécial pour les sessions Strava
                if (isStravaSession(log) && selectedAthlete) {
                  return (
                    <StravaHistoryCard
                      key={log.id}
                      log={log}
                      onDelete={() => {}}
                      userId={selectedAthlete.id}
                      readOnly={true}
                    />
                  );
                }

                const date = new Date(log.date);
                const isExpanded = expandedSessionId === log.id;
                const totalSets = log.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
                const completedSets = log.exercises.reduce((acc, ex) => 
                  acc + ex.sets.filter(s => s.completed).length, 0
                );
                const progress = totalSets > 0 ? (completedSets / totalSets) * 100 : 0;

                return (
                  <div key={log.id} className="overflow-hidden">
                    {/* Header cliquable */}
                    <button
                      onClick={() => setExpandedSessionId(isExpanded ? null : log.id)}
                      className="w-full p-4 hover:bg-slate-800/50 transition-colors text-left"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-slate-800 rounded-xl flex flex-col items-center justify-center">
                            <span className="text-xs text-slate-500">
                              {date.toLocaleDateString('fr-FR', { month: 'short' })}
                            </span>
                            <span className="text-lg font-bold text-white">{date.getDate()}</span>
                          </div>
                          <div>
                            {/* ← MODIFIÉ: Ajout du badge RPE */}
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">Session {log.sessionKey.seance}</p>
                              {log.sessionRpe && (
                                <RpeBadge rpe={log.sessionRpe} size="sm" showLabel={false} />
                              )}
                            </div>
                            <p className="text-sm text-slate-400">
                              {log.exercises.length} exercices
                              {log.durationMinutes && ` • ${log.durationMinutes} min`}
                              {` • ${completedSets}/${totalSets} séries`}
                            </p>
                            {/* Barre de progression */}
                            <div className="mt-2 w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-blue-600 to-emerald-500 rounded-full transition-all"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-slate-600" />
                        )}
                      </div>
                    </button>

                    {/* Contenu expansé - Détails des exercices */}
                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-slate-800 bg-slate-800/30">
                        <div className="pt-4">
                          {/* ← NOUVEAU: Affichage RPE global de la séance */}
                          {log.sessionRpe && (
                            <div className={`mb-4 p-3 rounded-xl ${getRpeBgColor(log.sessionRpe)} flex items-center justify-between`}>
                              <div className="flex items-center gap-2">
                                <Gauge className={`w-5 h-5 ${getRpeColor(log.sessionRpe)}`} />
                                <span className="text-sm font-medium text-slate-300">RPE de la séance</span>
                              </div>
                              <RpeBadge rpe={log.sessionRpe} size="md" />
                            </div>
                          )}

                          {log.exercises.map((exercise, exIdx) => {
                            const exerciseCompleted = exercise.sets.filter(s => s.completed).length;
                            const exerciseTotal = exercise.sets.length;
                            
                            return (
                              <div 
                                key={exIdx} 
                                className="bg-slate-900 border border-slate-700 rounded-xl p-4 mb-3 last:mb-0"
                              >
                                {/* Nom de l'exercice avec RPE */}
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-white">{exercise.exerciseName}</h4>
                                  <div className="flex items-center gap-2">
                                    {/* ← NOUVEAU: Badge RPE de l'exercice */}
                                    {exercise.rpe && (
                                      <RpeBadge rpe={exercise.rpe} size="sm" showLabel={false} />
                                    )}
                                    <span className={`text-xs px-2 py-1 rounded-full ${
                                      exerciseCompleted === exerciseTotal 
                                        ? 'bg-emerald-500/20 text-emerald-400' 
                                        : 'bg-slate-700 text-slate-400'
                                    }`}>
                                      {exerciseCompleted}/{exerciseTotal} séries
                                    </span>
                                  </div>
                                </div>

                                {/* Tableau des séries */}
                                <div className="space-y-2">
                                  {/* Header du tableau */}
                                  <div className="grid grid-cols-4 gap-2 text-xs font-medium text-slate-500 uppercase tracking-wider px-2">
                                    <div>Série</div>
                                    <div>Reps</div>
                                    <div>Poids</div>
                                    <div className="text-center">✓</div>
                                  </div>

                                  {/* Lignes des séries */}
                                  {exercise.sets.map((set, setIdx) => (
                                    <div 
                                      key={setIdx}
                                      className={`grid grid-cols-4 gap-2 items-center p-2 rounded-lg ${
                                        set.completed 
                                          ? 'bg-emerald-500/10' 
                                          : 'bg-slate-800/50'
                                      }`}
                                    >
                                      <span className="text-sm text-slate-400">#{set.setNumber}</span>
                                      <span className="text-sm text-white font-medium">{set.reps || '—'}</span>
                                      <span className="text-sm text-white">{set.weight ? `${set.weight}kg` : '—'}</span>
                                      <div className="flex justify-center">
                                        {set.completed ? (
                                          <Check className="w-4 h-4 text-emerald-400" />
                                        ) : (
                                          <span className="w-4 h-4 rounded-full border border-slate-600" />
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                {/* Notes de l'exercice */}
                                {exercise.notes && (
                                  <p className="mt-3 text-sm text-slate-400 italic border-t border-slate-800 pt-3">
                                    {exercise.notes}
                                  </p>
                                )}
                              </div>
                            );
                          })}

                          {/* Commentaires de la séance */}
                          {log.comments && (
                            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 mt-3">
                              <p className="text-sm text-yellow-200/80">{log.comments}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
  // MAIN TABS VIEW
  // =============================================
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Mon Équipe</h1>
        <p className="text-slate-400 mt-1">{athletes.length} athlètes</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('team')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
            activeTab === 'team' 
              ? 'bg-blue-600 text-white' 
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4 inline mr-2" />
          Équipe
        </button>
        
        {fetchTeamComments && (
          <button
            onClick={() => { setActiveTab('feedbacks'); loadComments(); }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap relative ${
              activeTab === 'feedbacks' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 inline mr-2" />
            Feedbacks
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        )}
        
        {fetchWeekOrganizerLogs && (
          <button
            onClick={() => setActiveTab('organizer')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'organizer' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-4 h-4 inline mr-2" />
            Week Organizer
          </button>
        )}
        
        {fetchAthleteGroups && (
          <button
            onClick={() => setActiveTab('groups')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
              activeTab === 'groups' 
                ? 'bg-blue-600 text-white' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 inline mr-2" />
            Groupes
          </button>
        )}
      </div>

      {/* Tab Content: Team */}
      {activeTab === 'team' && (
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher un athlète..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>

          {/* Athletes Grid */}
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
                      <h3 className="font-semibold text-white truncate">
                        {athlete.firstName} {athlete.lastName}
                      </h3>
                      <p className="text-sm text-slate-400 truncate">@{athlete.username}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Feedbacks */}
      {activeTab === 'feedbacks' && fetchTeamComments && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => { setShowAllComments(!showAllComments); loadComments(); }}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  showAllComments 
                    ? 'bg-slate-700 text-white' 
                    : 'bg-blue-500/20 text-blue-400'
                }`}
              >
                {showAllComments ? 'Tous' : 'Non lus uniquement'}
              </button>
              {unreadCount > 0 && (
                <span className="text-sm text-slate-400">{unreadCount} non lu{unreadCount > 1 ? 's' : ''}</span>
              )}
            </div>
            
            {selectedComments.size > 0 && markCommentsAsRead && (
              <button
                onClick={handleMarkAsRead}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors"
              >
                <CheckCheck className="w-4 h-4" />
                Marquer comme lu ({selectedComments.size})
              </button>
            )}
          </div>

          {commentsLoading ? (
            <div className="text-center py-12 text-slate-500">Chargement...</div>
          ) : comments.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <MessageSquare className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">Aucun feedback</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div 
                  key={comment.id}
                  className={`bg-slate-900 border rounded-xl p-4 transition-colors ${
                    comment.isRead ? 'border-slate-800' : 'border-blue-500/50 bg-blue-500/5'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedComments.has(comment.id)}
                      onChange={(e) => {
                        const newSet = new Set(selectedComments);
                        if (e.target.checked) {
                          newSet.add(comment.id);
                        } else {
                          newSet.delete(comment.id);
                        }
                        setSelectedComments(newSet);
                      }}
                      className="mt-1 w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white">
                          {comment.firstName} {comment.lastName}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(comment.createdAt).toLocaleDateString('fr-FR')}
                        </span>
                        {!comment.isRead && (
                          <span className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">Nouveau</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-400 mb-2">
                        Exercice: <span className="text-white">{comment.exerciseName}</span>
                        {comment.sessionName && (
                          <> • Session: <span className="text-white">{comment.sessionName}</span></>
                        )}
                      </p>
                      <p className="text-slate-300">{comment.comment}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: Week Organizer */}
      {activeTab === 'organizer' && fetchWeekOrganizerLogs && (
        <div className="space-y-4">
          {!showOrganizerForm ? (
            <button
              onClick={() => setShowOrganizerForm(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nouveau message
            </button>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Nouveau message</h3>
                <button
                  onClick={() => setShowOrganizerForm(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={organizerForm.title}
                  onChange={(e) => setOrganizerForm({ ...organizerForm, title: e.target.value })}
                  placeholder="Titre du message"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder:text-slate-500"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Date début</label>
                    <input
                      type="date"
                      value={organizerForm.startDate}
                      onChange={(e) => setOrganizerForm({ ...organizerForm, startDate: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-400 mb-1">Date fin</label>
                    <input
                      type="date"
                      value={organizerForm.endDate}
                      onChange={(e) => setOrganizerForm({ ...organizerForm, endDate: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white"
                    />
                  </div>
                </div>

                <VisibilitySelector
                  visibilityType={organizerForm.visibilityType}
                  selectedGroupIds={organizerForm.visibleToGroupIds}
                  selectedAthleteIds={organizerForm.visibleToAthleteIds}
                  groups={groups}
                  athletes={athletes}
                  onChange={(type, groupIds, athleteIds) => setOrganizerForm({
                    ...organizerForm,
                    visibilityType: type,
                    visibleToGroupIds: groupIds,
                    visibleToAthleteIds: athleteIds,
                  })}
                />

                <RichTextEditor
                  value={organizerForm.message}
                  onChange={(html) => setOrganizerForm({ ...organizerForm, message: html })}
                  placeholder="Rédigez votre message..."
                />

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowOrganizerForm(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    Annuler
                  </button>
                  <button
                    onClick={handleSaveOrganizer}
                    className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-medium"
                  >
                    <Send className="w-4 h-4" />
                    Publier
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Liste des messages */}
          {organizerLogs.length === 0 ? (
            <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center">
              <Calendar className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">Aucun message publié</p>
            </div>
          ) : (
            <div className="space-y-4">
              {organizerLogs.map((log) => {
                const today = new Date().toISOString().split('T')[0];
                const isActive = log.startDate <= today && log.endDate >= today;

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
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-white">{log.title}</h3>
                            {isActive && (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">
                                Actif
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-full">
                              {getVisibilityLabel(log)}
                            </span>
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

      {/* Tab Content: Groups */}
      {activeTab === 'groups' && fetchAthleteGroups && (
        <AthleteGroupsManager
          coachId={coachId}
          athletes={athletes}
          groups={groups}
          onCreateGroup={handleCreateGroup}
          onUpdateGroup={handleUpdateGroup}
          onDeleteGroup={handleDeleteGroup}
          onUpdateMembers={handleUpdateMembers}
          onLoadGroupMembers={handleLoadGroupMembers}
        />
      )}
    </div>
  );
};

export default TeamView;
