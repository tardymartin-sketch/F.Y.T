// ============================================================
// F.Y.T - TEAM VIEW (Version avec noms de groupes affichés)
// src/components/TeamView.tsx
// Affiche les noms des groupes dans les encarts week organizer
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
  const [isAthleteListHovered, setIsAthleteListHovered] = useState(false);

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
    if (!fetchTeamComments) {
      console.log('[TeamView.loadComments] fetchTeamComments non défini');
      return;
    }
    console.log('[TeamView.loadComments] Chargement commentaires pour coach:', coachId, 'showAllComments:', showAllComments);
    setCommentsLoading(true);
    try {
      const data = await fetchTeamComments(coachId, !showAllComments);
      console.log('[TeamView.loadComments] Commentaires reçus:', data.length, data);
      setComments(data);
    } catch (e) {
      console.error("[TeamView.loadComments] Erreur chargement commentaires:", e);
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

  // Stats avec RPE moyen
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
      ? Math.round(sessionsWithRpe.reduce((acc, h) => acc + (h.sessionRpe || 0), 0) / sessionsWithRpe.length * 10) / 10
      : null;

    return {
      totalThisMonth: thisMonth.length,
      daysSinceLastSession,
      avgRpe,
    };
  };

  // MODIFIÉ: Helper pour obtenir les noms des groupes à partir des IDs
  const getGroupNames = (groupIds: string[] | undefined): string => {
    if (!groupIds || groupIds.length === 0) return 'Tous';
    
    const groupNames = groupIds
      .map(id => groups.find(g => g.id === id)?.name)
      .filter(Boolean);
    
    if (groupNames.length === 0) return 'Groupes inconnus';
    if (groupNames.length <= 3) return groupNames.join(', ');
    return `${groupNames.slice(0, 3).join(', ')} +${groupNames.length - 3}`;
  };

  // Helper pour obtenir le texte de visibilité
  const getVisibilityText = (log: WeekOrganizerLog): string => {
    if (!log.visibilityType || log.visibilityType === 'all') {
      return 'Tous les athlètes';
    }
    
    if (log.visibilityType === 'groups') {
      return getGroupNames(log.visibleToGroupIds);
    }
    
    if (log.visibilityType === 'athletes') {
      const count = log.visibleToAthleteIds?.length || 0;
      return `${count} athlète${count > 1 ? 's' : ''}`;
    }
    
    return 'Tous';
  };

  // Tabs component
  const renderTabs = () => (
    <div className="flex gap-1 p-1 bg-slate-800/50 rounded-xl mb-6">
      {[
        { id: 'team', label: 'Équipe', icon: Users },
        { id: 'feedbacks', label: 'Feedbacks', icon: MessageSquare },
        { id: 'organizer', label: 'Week Organizer', icon: Calendar },
        { id: 'groups', label: 'Groupes', icon: Layers },
      ].map(tab => {
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );

  // Week Organizer Tab
  const renderOrganizerTab = () => (
    <div className="space-y-6">
      {/* Add new message button */}
      <button
        onClick={() => setShowOrganizerForm(true)}
        className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-semibold transition-colors"
      >
        <Plus className="w-5 h-5" />
        Nouveau message
      </button>

      {/* Form modal */}
      {showOrganizerForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-white">Nouveau message</h3>
              <button
                onClick={() => setShowOrganizerForm(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Titre</label>
                <input
                  type="text"
                  value={organizerForm.title}
                  onChange={(e) => setOrganizerForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Semaine de récupération"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Date début</label>
                  <input
                    type="date"
                    value={organizerForm.startDate}
                    onChange={(e) => setOrganizerForm(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-2">Date fin</label>
                  <input
                    type="date"
                    value={organizerForm.endDate}
                    onChange={(e) => setOrganizerForm(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Visibility Selector */}
              <VisibilitySelector
                visibilityType={organizerForm.visibilityType}
                selectedGroupIds={organizerForm.visibleToGroupIds}
                selectedAthleteIds={organizerForm.visibleToAthleteIds}
                availableGroups={groups}
                availableAthletes={athletes}
                onChange={(visibilityType, groupIds, athleteIds) => {
                  setOrganizerForm(prev => ({
                    ...prev,
                    visibilityType,
                    visibleToGroupIds: groupIds,
                    visibleToAthleteIds: athleteIds,
                  }));
                }}
              />

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">Message</label>
                <RichTextEditor
                  content={organizerForm.message}
                  onChange={(html) => setOrganizerForm(prev => ({ ...prev, message: html }))}
                  placeholder="Écrivez votre message pour la semaine..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowOrganizerForm(false)}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSaveOrganizer}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Publier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Messages list */}
      <div className="space-y-4">
        {organizerLogs.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Aucun message programmé</p>
          </div>
        ) : (
          organizerLogs.map(log => {
            const isActive = new Date(log.startDate) <= new Date() && new Date(log.endDate) >= new Date();
            const isPast = new Date(log.endDate) < new Date();
            
            return (
              <div
                key={log.id}
                className={`bg-slate-800/50 border rounded-xl p-4 ${
                  isActive ? 'border-blue-500/50' : isPast ? 'border-slate-700 opacity-60' : 'border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-white">{log.title}</h4>
                      {isActive && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                          Actif
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">
                      {new Date(log.startDate).toLocaleDateString('fr-FR')} - {new Date(log.endDate).toLocaleDateString('fr-FR')}
                    </p>
                    {/* MODIFIÉ: Afficher les noms des groupes */}
                    <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {getVisibilityText(log)}
                    </p>
                    <div 
                      className="text-sm text-slate-300 prose prose-invert prose-sm max-w-none line-clamp-3"
                      dangerouslySetInnerHTML={{ __html: log.message }}
                    />
                  </div>
                  <button
                    onClick={() => handleDeleteOrganizer(log.id)}
                    className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  // Team Tab avec liste d'athlètes collapsible
  const renderTeamTab = () => {
    // Détermine si la liste doit être réduite (athlète sélectionné et pas de survol)
    const isCollapsed = selectedAthlete !== null && !isAthleteListHovered;
    
    return (
      <div className="flex gap-6">
        {/* Athletes list - Collapsible */}
        <div 
          className={`transition-all duration-300 ease-in-out flex-shrink-0 ${
            isCollapsed ? 'w-16' : 'w-72'
          }`}
        >
          <div className="space-y-4 sticky top-4">
            {/* Barre de recherche - visible seulement quand étendu */}
            <div className={`transition-all duration-300 overflow-hidden ${
              isCollapsed ? 'h-0 opacity-0' : 'h-auto opacity-100'
            }`}>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-12 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Liste des athlètes - hover uniquement ici */}
            <div 
              className={`space-y-2 max-h-[70vh] overflow-y-auto ${
                isCollapsed ? 'overflow-x-hidden' : ''
              }`}
              onMouseEnter={() => setIsAthleteListHovered(true)}
              onMouseLeave={() => setIsAthleteListHovered(false)}
            >
              {filteredAthletes.map(athlete => (
                <button
                  key={athlete.id}
                  onClick={() => handleSelectAthlete(athlete)}
                  className={`w-full flex items-center gap-3 rounded-xl transition-all ${
                    isCollapsed ? 'p-1.5 justify-center' : 'p-3'
                  } ${
                    selectedAthlete?.id === athlete.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800/50 hover:bg-slate-800 text-slate-300'
                  }`}
                  title={isCollapsed ? `${athlete.firstName} ${athlete.lastName}` : undefined}
                >
                  {/* Badge avec initiales - toujours visible */}
                  <div className={`flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${
                    isCollapsed ? 'w-11 h-11' : 'w-10 h-10'
                  } ${
                    selectedAthlete?.id === athlete.id
                      ? 'bg-white/20'
                      : 'bg-gradient-to-br from-blue-500 to-emerald-500 text-white'
                  }`}>
                    {athlete.firstName?.[0]}{athlete.lastName?.[0] || athlete.username[0]}
                  </div>
                  
                  {/* Nom et username - visible seulement quand étendu */}
                  <div className={`flex-1 text-left min-w-0 transition-all duration-300 ${
                    isCollapsed ? 'w-0 opacity-0 hidden' : 'opacity-100'
                  }`}>
                    <p className="font-medium truncate">
                      {athlete.firstName} {athlete.lastName}
                    </p>
                    <p className={`text-xs truncate ${
                      selectedAthlete?.id === athlete.id ? 'text-blue-200' : 'text-slate-500'
                    }`}>
                      @{athlete.username}
                    </p>
                  </div>
                  
                  {/* Chevron - visible seulement quand étendu */}
                  {!isCollapsed && (
                    <ChevronRight className="w-4 h-4 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
            
            {/* Indicateur de survol quand collapsé */}
            {isCollapsed && (
              <div className="text-center mt-2">
                <ChevronRight className="w-4 h-4 text-slate-500 mx-auto animate-pulse" />
              </div>
            )}
          </div>
        </div>

        {/* Athlete details - prend l'espace restant */}
        <div className="flex-1 min-w-0">
        {!selectedAthlete ? (
          <div className="bg-slate-800/30 border border-dashed border-slate-700 rounded-2xl p-12 text-center">
            <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Sélectionnez un athlète pour voir son historique</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Athlete header */}
            <div className="bg-slate-800/50 rounded-xl p-4 flex items-center gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-emerald-500 rounded-xl flex items-center justify-center text-white font-bold text-xl">
                {selectedAthlete.firstName?.[0]}{selectedAthlete.lastName?.[0]}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedAthlete.firstName} {selectedAthlete.lastName}
                </h3>
                <p className="text-slate-400">@{selectedAthlete.username}</p>
              </div>
            </div>

            {/* Stats */}
            {(() => {
              const stats = getAthleteStats(athleteHistory);
              return (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">{stats.totalThisMonth}</p>
                    <p className="text-xs text-slate-400">Ce mois</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-white">
                      {stats.daysSinceLastSession !== null ? `${stats.daysSinceLastSession}j` : '-'}
                    </p>
                    <p className="text-xs text-slate-400">Dernière séance</p>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                    {stats.avgRpe !== null ? (
                      <>
                        <p className={`text-2xl font-bold ${getRpeColor(stats.avgRpe)}`}>
                          {stats.avgRpe}
                        </p>
                        <p className="text-xs text-slate-400">RPE moyen</p>
                      </>
                    ) : (
                      <>
                        <p className="text-2xl font-bold text-slate-500">-</p>
                        <p className="text-xs text-slate-400">RPE moyen</p>
                      </>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* History */}
            <div className="space-y-3">
              <h4 className="font-semibold text-white flex items-center gap-2">
                <Dumbbell className="w-5 h-5 text-blue-400" />
                Historique des séances
              </h4>
              
              {athleteHistory.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Aucune séance enregistrée</p>
              ) : (
                <div className="space-y-3">
                  {athleteHistory.map(session => {
                    const isStrava = isStravaSession(session);
                    
                    // Pour les sessions Strava, utiliser directement StravaHistoryCard
                    if (isStrava && selectedAthlete) {
                      return (
                        <StravaHistoryCard
                          key={session.id}
                          log={session}
                          onDelete={() => {}}
                          userId={selectedAthlete.id}
                          readOnly={true}
                        />
                      );
                    }
                    
                    // Pour les sessions normales, même format que History.tsx
                    const isExpanded = expandedSessionId === session.id;
                    const date = new Date(session.date);
                    const totalSets = session.exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
                    const completedSets = session.exercises.reduce((acc, ex) => 
                      acc + ex.sets.filter(s => s.completed).length, 0
                    );
                    
                    return (
                      <div 
                        key={session.id} 
                        className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
                      >
                        {/* Header */}
                        <button
                          onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-800/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[50px]">
                              <span className="block text-2xl font-bold text-white">{date.getDate()}</span>
                              <span className="text-xs text-slate-400 uppercase">
                                {date.toLocaleDateString('fr-FR', { month: 'short' })}
                              </span>
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-white">
                                  Séance {session.sessionKey.seance}
                                </h3>
                                {session.sessionRpe && (
                                  <RpeBadge rpe={session.sessionRpe} size="sm" showLabel={false} />
                                )}
                              </div>
                              <div className="flex items-center gap-3 text-sm text-slate-400 mt-1">
                                <span>{session.exercises.length} exercices</span>
                                <span>•</span>
                                <span>{completedSets}/{totalSets} séries</span>
                                {session.durationMinutes && (
                                  <>
                                    <span>•</span>
                                    <span>{session.durationMinutes} min</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </button>

                        {/* Contenu expandé */}
                        {isExpanded && (
                          <div className="px-4 pb-4 space-y-3 border-t border-slate-800">
                            {/* RPE global si présent */}
                            {session.sessionRpe && (
                              <div className={`mt-4 p-3 rounded-xl ${getRpeBgColor(session.sessionRpe)} flex items-center justify-between`}>
                                <div className="flex items-center gap-2">
                                  <Gauge className={`w-5 h-5 ${getRpeColor(session.sessionRpe)}`} />
                                  <span className="text-sm font-medium text-slate-300">RPE de la séance</span>
                                </div>
                                <RpeBadge rpe={session.sessionRpe} size="md" />
                              </div>
                            )}

                            {session.exercises.map((ex, exIdx) => (
                              <div key={exIdx} className="bg-slate-800/50 rounded-lg p-3 mt-3">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-white">{ex.exerciseName}</span>
                                  <div className="flex items-center gap-2">
                                    {ex.rpe && (
                                      <RpeBadge rpe={ex.rpe} size="sm" showLabel={false} />
                                    )}
                                    <span className="text-xs text-slate-500">
                                      {ex.sets.filter(s => s.completed).length}/{ex.sets.length} séries
                                    </span>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                                  <span className="font-medium">Série</span>
                                  <span className="font-medium">Reps</span>
                                  <span className="font-medium">Poids</span>
                                  
                                  {ex.sets.map((set, setIdx) => (
                                    <React.Fragment key={setIdx}>
                                      <span className={set.completed ? 'text-emerald-400' : ''}>
                                        #{set.setNumber}
                                      </span>
                                      <span className="text-white">{set.reps || '—'}</span>
                                      <span className="text-white">{set.weight ? `${set.weight} kg` : '—'}</span>
                                    </React.Fragment>
                                  ))}
                                </div>

                                {ex.notes && (
                                  <p className="mt-2 text-xs text-slate-500 italic">{ex.notes}</p>
                                )}
                              </div>
                            ))}

                            {session.comments && (
                              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-3">
                                <p className="text-sm text-yellow-200/80">{session.comments}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
    );
  };

  // Feedbacks Tab
  const renderFeedbacksTab = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setShowAllComments(!showAllComments);
              setTimeout(loadComments, 0);
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              showAllComments
                ? 'bg-slate-700 text-white'
                : 'bg-blue-600 text-white'
            }`}
          >
            {showAllComments ? 'Tous' : 'Non lus'}
          </button>
        </div>
        
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
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
        </div>
      ) : comments.length === 0 ? (
        <div className="text-center py-12">
          <MessageSquare className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-400">
            {showAllComments ? 'Aucun commentaire' : 'Aucun commentaire non lu'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map(comment => (
            <div
              key={comment.id}
              className={`bg-slate-800/50 border rounded-xl p-4 transition-all ${
                selectedComments.has(comment.id)
                  ? 'border-blue-500 bg-blue-500/10'
                  : comment.isRead
                    ? 'border-slate-700 opacity-60'
                    : 'border-slate-700'
              }`}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => {
                    setSelectedComments(prev => {
                      const next = new Set(prev);
                      if (next.has(comment.id)) {
                        next.delete(comment.id);
                      } else {
                        next.add(comment.id);
                      }
                      return next;
                    });
                  }}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 mt-1 ${
                    selectedComments.has(comment.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-slate-600 hover:border-blue-500'
                  }`}
                >
                  {selectedComments.has(comment.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">
                      {comment.firstName} {comment.lastName}
                    </span>
                    <span className="text-xs text-slate-500">
                      {new Date(comment.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                    {!comment.isRead && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mb-2">
                    {comment.sessionName} • {comment.exerciseName}
                  </p>
                  <p className="text-sm text-slate-300">{comment.comment}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Groups Tab
  const renderGroupsTab = () => (
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
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-white">Mon Équipe</h1>
        <p className="text-slate-400 mt-1">Gérez vos athlètes et leurs entraînements</p>
      </div>

      {renderTabs()}

      {activeTab === 'team' && renderTeamTab()}
      {activeTab === 'feedbacks' && renderFeedbacksTab()}
      {activeTab === 'organizer' && renderOrganizerTab()}
      {activeTab === 'groups' && renderGroupsTab()}
    </div>
  );
};
