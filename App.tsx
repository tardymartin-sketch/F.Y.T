// ============================================================
// F.Y.T - APP PRINCIPAL (Version avec Session en cours persistante)
// App.tsx
// Gestion de la session active avec persistence localStorage
// ============================================================

import React, { useState, useEffect } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/supabaseClient';
import {
  fetchTrainingPlans,
  fetchSessionLogs,
  saveSessionLog,
  deleteSessionLog,
  fetchTeamAthletes,
  fetchAllUsers,
  updateUserCoach,
  fetchCurrentUserProfile,
  updateUserProfile,
  fetchWeekOrganizerLogs,
  fetchActiveWeekOrganizer,
  saveWeekOrganizerLog,
  deleteWeekOrganizerLog,
  fetchTeamComments,
  saveAthleteComment,
  markCommentsAsRead,
  fetchAthleteGroups,
  createAthleteGroup,
  updateAthleteGroup,
  deleteAthleteGroup,
  updateGroupMembers,
  fetchAthleteGroupWithMembers,
  fetchAthleteGroupsForAthlete,
  fetchActiveWeekOrganizersForAthlete, // MODIFIÉ: nouvelle fonction pour obtenir tous les messages
} from './src/services/supabaseService';

import type { AthleteGroupWithCount } from './types';
import { 
  canAthleteViewMessage,
  filterVisibleMessages 
} from './types';
import { 
  WorkoutRow, 
  SessionLog, 
  User, 
  FilterState,
  ProfileRow,
  WeekOrganizerLog,
  AthleteComment
} from './types';

// Components
import { Auth } from './src/components/Auth';
import { LoadingScreen } from './src/components/LoadingScreen';
import { Sidebar } from './src/components/Sidebar';
import { Home } from './src/components/Home';
import { ActiveSession } from './src/components/ActiveSession';
import { History } from './src/components/History';
import { TeamView } from './src/components/TeamView';
import { AdminUsersView } from './src/components/AdminUsersView';
import { SettingsView } from './src/components/SettingsView';
import { StravaImport } from './src/components/StravaImport';
import { Menu } from 'lucide-react';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Navigation
  const [currentView, setCurrentView] = useState<string>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data States
  const [trainingData, setTrainingData] = useState<WorkoutRow[]>([]);
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    selectedAnnee: null,
    selectedMois: null,
    selectedSemaine: null,
    selectedSeances: [],
  });
  const [dataLoading, setDataLoading] = useState(false);
  
  // Active Session State - MODIFIÉ: Persistence via localStorage
  const [activeSessionData, setActiveSessionData] = useState<WorkoutRow[] | null>(null);
  const [editingSession, setEditingSession] = useState<SessionLog | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  // Week Organizer State - MODIFIÉ: tableau au lieu d'un seul
  const [activeWeekOrganizers, setActiveWeekOrganizers] = useState<WeekOrganizerLog[]>([]);
  const [pastWeekOrganizers, setPastWeekOrganizers] = useState<WeekOrganizerLog[]>([]);

  // ===========================================
  // AUTH EFFECTS
  // ===========================================
  
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ===========================================
  // PERSISTENCE DE LA SESSION EN COURS
  // ===========================================

  // Vérifier au chargement s'il y a une session en cours
  useEffect(() => {
    const savedSession = localStorage.getItem('F.Y.T_active_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.sessionData && parsed.logs) {
          setHasActiveSession(true);
        }
      } catch (e) {
        console.error('Erreur parsing session sauvegardée:', e);
        localStorage.removeItem('F.Y.T_active_session');
      }
    }
  }, []);

  // Observer les changements dans localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const savedSession = localStorage.getItem('F.Y.T_active_session');
      setHasActiveSession(!!savedSession);
    };

    // Vérifier périodiquement (pour les changements dans le même onglet)
    const interval = setInterval(handleStorageChange, 1000);

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // ===========================================
  // LOAD USER AND DATA
  // ===========================================

  useEffect(() => {
    if (session) {
      loadUserProfile();
    } else {
      setCurrentUser(null);
      setTrainingData([]);
      setHistory([]);
    }
  }, [session]);

  useEffect(() => {
    if (currentUser) {
      loadUserData();
    }
  }, [currentUser]);

  const loadUserProfile = async () => {
    if (!session?.user?.id) return;
    
    try {
      const profile = await fetchCurrentUserProfile(session.user.id);
      setCurrentUser(profile);
    } catch (error) {
      console.error("Erreur chargement profil:", error);
    }
  };

  const loadUserData = async () => {
    if (!currentUser) return;
    
    setDataLoading(true);
    try {
      const [plans, logs] = await Promise.all([
        fetchTrainingPlans(currentUser.id),
        fetchSessionLogs(currentUser.id)
      ]);
      
      setTrainingData(plans);
      setHistory(logs);
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // ===========================================
  // ATHLETE GROUPS HANDLERS
  // ===========================================

  const handleFetchAthleteGroups = async (coachId: string) => {
    return await fetchAthleteGroups(coachId);
  };

  const handleCreateAthleteGroup = async (name: string, description: string, color: string) => {
    if (!currentUser) return;
    await createAthleteGroup(currentUser.id, name, description, color);
  };

  const handleUpdateAthleteGroup = async (
    groupId: string, 
    name: string, 
    description: string, 
    color: string
  ) => {
    await updateAthleteGroup(groupId, name, description, color);
  };

  const handleDeleteAthleteGroup = async (groupId: string) => {
    await deleteAthleteGroup(groupId);
  };

  const handleUpdateGroupMembers = async (groupId: string, athleteIds: string[]) => {
    await updateGroupMembers(groupId, athleteIds);
  };

  const handleLoadGroupMembers = async (groupId: string) => {
    return await fetchAthleteGroupWithMembers(groupId);
  };

  // MODIFIÉ: Charger TOUS les week organizers pour les athlètes
  useEffect(() => {
    const loadWeekOrganizers = async () => {
      if (!currentUser || !currentUser.coachId) return;
      
      try {
        // Utiliser la nouvelle fonction qui retourne TOUS les messages visibles
        const activeMessages = await fetchActiveWeekOrganizersForAthlete(
          currentUser.coachId,
          currentUser.id
        );
        setActiveWeekOrganizers(activeMessages);
        
        // Charger les messages passés visibles
        const athleteGroupIds = await fetchAthleteGroupsForAthlete(currentUser.id);
        const all = await fetchWeekOrganizerLogs(currentUser.coachId);
        
        const activeIds = new Set(activeMessages.map(m => m.id));
        const visible = all.filter(log => {
          const endDate = new Date(log.endDate);
          const isVisible = canAthleteViewMessage(log, currentUser.id, athleteGroupIds);
          return endDate < new Date() && isVisible && !activeIds.has(log.id);
        });
        
        setPastWeekOrganizers(visible.slice(0, 5));
      } catch (error) {
        console.error("Erreur chargement week organizers:", error);
      }
    };

    loadWeekOrganizers();
  }, [currentUser]);

  // ===========================================
  // SESSION HANDLERS
  // ===========================================

  const handleStartSession = () => {
    const sessionData = trainingData.filter(d => 
      d.annee === filters.selectedAnnee && 
      d.moisNum === filters.selectedMois && 
      d.semaine === filters.selectedSemaine && 
      filters.selectedSeances.includes(d.seance)
    );
    
    if (sessionData.length > 0) {
      setActiveSessionData(sessionData);
      setEditingSession(null);
      setCurrentView('active');
      setHasActiveSession(true);
    }
  };

  // Reprendre une session en cours depuis localStorage
  const handleResumeSession = () => {
    const savedSession = localStorage.getItem('F.Y.T_active_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        // Reconstruire les données de session
        if (parsed.sessionData) {
          const sessionData = trainingData.filter(d => {
            return parsed.sessionData.some((s: any) => 
              s.seance === d.seance && 
              s.annee === d.annee && 
              s.moisNum === d.moisNum && 
              s.semaine === d.semaine
            );
          });
          if (sessionData.length > 0) {
            setActiveSessionData(sessionData);
            setCurrentView('active');
          }
        }
      } catch (e) {
        console.error('Erreur reprise session:', e);
      }
    }
  };

  const handleSaveSession = async (log: SessionLog) => {
    if (!currentUser) return;
    
    try {
      await saveSessionLog(log, currentUser.id);
      await loadUserData();
      setActiveSessionData(null);
      setEditingSession(null);
      setHasActiveSession(false);
      localStorage.removeItem('F.Y.T_active_session');
      setCurrentView('home');
    } catch (error) {
      console.error("Erreur sauvegarde session:", error);
      throw error;
    }
  };

  const handleCancelSession = () => {
    setActiveSessionData(null);
    setEditingSession(null);
    setHasActiveSession(false);
    localStorage.removeItem('F.Y.T_active_session');
    setCurrentView('home');
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSessionLog(sessionId);
      setHistory(prev => prev.filter(s => s.id !== sessionId));
    } catch (error) {
      console.error("Erreur suppression session:", error);
    }
  };

  const handleEditSession = (log: SessionLog) => {
    const sessionData = trainingData.filter(d =>
      d.annee === log.sessionKey.annee &&
      d.semaine === log.sessionKey.semaine &&
      log.sessionKey.seance.includes(d.seance)
    );

    if (sessionData.length > 0) {
      setActiveSessionData(sessionData);
      setEditingSession(log);
      setCurrentView('active');
    } else {
      const minimalData: WorkoutRow[] = log.exercises.map((ex, idx) => ({
        id: idx,
        annee: log.sessionKey.annee,
        moisNom: '',
        moisNum: log.sessionKey.moisNum,
        semaine: log.sessionKey.semaine,
        seance: log.sessionKey.seance,
        ordre: idx + 1,
        exercice: ex.exerciseName,
        series: ex.sets.length.toString(),
        repsDuree: '',
        repos: '',
        tempoRpe: '',
        notes: '',
        video: ''
      }));
      setActiveSessionData(minimalData);
      setEditingSession(log);
      setCurrentView('active');
    }
  };

  const handleFetchTeam = async (coachId: string) => {
    return await fetchTeamAthletes(coachId);
  };

  const handleFetchAthleteHistory = async (athleteId: string) => {
    return await fetchSessionLogs(athleteId);
  };

  const handleFetchAllUsers = async () => {
    return await fetchAllUsers();
  };

  const handleUpdateCoach = async (userId: string, coachId: string | null) => {
    await updateUserCoach(userId, coachId);
  };

  const handleUpdateProfile = async (updates: Partial<User>) => {
    if (!currentUser) return;
    
    const dbUpdates: Partial<ProfileRow> = {};
    if (updates.firstName) dbUpdates.first_name = updates.firstName;
    if (updates.lastName) dbUpdates.last_name = updates.lastName;
    
    await updateUserProfile(currentUser.id, dbUpdates);
    setCurrentUser({ ...currentUser, ...updates });
  };

  // ===========================================
  // WEEK ORGANIZER HANDLERS
  // ===========================================

  const handleFetchWeekOrganizerLogs = async (coachId: string) => {
    return await fetchWeekOrganizerLogs(coachId);
  };

  const handleSaveWeekOrganizerLog = async (log: WeekOrganizerLog) => {
    return await saveWeekOrganizerLog(log);
  };

  const handleDeleteWeekOrganizerLog = async (logId: string) => {
    await deleteWeekOrganizerLog(logId);
  };

  // ===========================================
  // ATHLETE COMMENTS HANDLERS
  // ===========================================

  const handleFetchTeamComments = async (coachId: string, onlyUnread?: boolean) => {
    return await fetchTeamComments(coachId, onlyUnread);
  };

  const handleMarkCommentsAsRead = async (commentIds: string[]) => {
    await markCommentsAsRead(commentIds);
  };

  const handleSaveAthleteComment = async (exerciseName: string, comment: string, sessionId: string) => {
    if (!currentUser) return;
    await saveAthleteComment({
      oderId: currentUser.id,
      sessionId,
      exerciseName,
      comment,
      isRead: false,
    });
  };

  // ===========================================
  // LOGOUT HANDLER
  // ===========================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('F.Y.T_active_session');
  };

  // ===========================================
  // NAVIGATION HANDLER - MODIFIÉ pour session en cours
  // ===========================================

  const handleViewChange = (view: string) => {
    // Si on clique sur "active" depuis le menu et qu'il y a une session en cours
    if (view === 'active' && hasActiveSession && !activeSessionData) {
      handleResumeSession();
    } else {
      setCurrentView(view);
    }
  };

  // ===========================================
  // RENDER
  // ===========================================

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Auth onAuth={() => {}} />;
  }

  if (!currentUser) {
    return <LoadingScreen />;
  }

  const isAdmin = currentUser.role === 'admin';
  const isCoach = currentUser.role === 'coach';

  return (
    <div className="min-h-screen bg-slate-950 flex">
      <Sidebar
        currentView={currentView}
        setCurrentView={handleViewChange}
        isAdmin={isAdmin}
        isCoach={isCoach}
        onLogout={handleLogout}
        user={currentUser}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        hasActiveSession={hasActiveSession} // NOUVEAU: passer l'état de session active
      />
      
      <main className="flex-1 lg:ml-0 overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-white">F.Y.T</h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="p-4 lg:p-8">
          {dataLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {currentView === 'home' && (
                <Home
                  data={trainingData}
                  filters={filters}
                  setFilters={setFilters}
                  onStartSession={handleStartSession}
                  user={currentUser}
                  history={history}
                  activeWeekOrganizers={activeWeekOrganizers} // MODIFIÉ: tableau
                  pastWeekOrganizers={pastWeekOrganizers}
                />
              )}

              {currentView === 'active' && activeSessionData && (
                <ActiveSession
                  sessionData={activeSessionData}
                  history={history}
                  onSave={handleSaveSession}
                  onCancel={handleCancelSession}
                  initialLog={editingSession}
                  userId={currentUser.id}
                  onSaveComment={handleSaveAthleteComment}
                />
              )}

              {currentView === 'history' && (
                <History
                  history={history}
                  onDelete={handleDeleteSession}
                  onEdit={handleEditSession}
                  userId={currentUser.id}
                />
              )}

              {currentView === 'team' && (isCoach || isAdmin) && (
                <TeamView
                  coachId={currentUser.id}
                  fetchTeam={handleFetchTeam}
                  fetchAthleteHistory={handleFetchAthleteHistory}
                  fetchTeamComments={handleFetchTeamComments}
                  markCommentsAsRead={handleMarkCommentsAsRead}
                  fetchWeekOrganizerLogs={handleFetchWeekOrganizerLogs}
                  saveWeekOrganizerLog={handleSaveWeekOrganizerLog}
                  deleteWeekOrganizerLog={handleDeleteWeekOrganizerLog}
                  fetchAthleteGroups={handleFetchAthleteGroups}
                  createAthleteGroup={handleCreateAthleteGroup}
                  updateAthleteGroup={handleUpdateAthleteGroup}
                  deleteAthleteGroup={handleDeleteAthleteGroup}
                  updateGroupMembers={handleUpdateGroupMembers}
                  loadGroupMembers={handleLoadGroupMembers}
                />
              )}

              {currentView === 'admin' && isAdmin && (
                <AdminUsersView
                  fetchAllUsers={handleFetchAllUsers}
                  updateCoach={handleUpdateCoach}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  user={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                  onLogout={handleLogout}
                />
              )}

              {currentView === 'import' && (
                <StravaImport user={currentUser} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
