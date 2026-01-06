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
  fetchAthleteOwnComments,
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
  filterVisibleMessages,
  canAccessCoachMode,
  canAccessAthleteMode,
} from './types';
import type { ActiveMode } from './types';
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

// NEW: Athlete Layout Components
import { AthleteLayout } from './src/layouts/AthleteLayout';
import { HomeAthlete } from './src/components/athlete/HomeAthlete';
import { ActiveSessionAthlete } from './src/components/athlete/ActiveSessionAthlete';
import { SessionCompletedScreen } from './src/components/athlete/SessionCompletedScreen';
import { HistoryAthlete } from './src/components/athlete/HistoryAthlete';
import { CoachMessages } from './src/components/athlete/CoachMessages';
import { ProfileAthlete } from './src/components/athlete/ProfileAthlete';
import type { AthleteView } from './src/components/athlete/BottomNav';
import type { SessionState } from './src/components/athlete/FloatingActionButton';

// NEW: Hooks
import { useIsMobile } from './src/hooks';

// Constante pour le stockage du mode actif
const ACTIVE_MODE_KEY = 'F.Y.T_active_mode';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // User State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Mode actif (athlete, coach, admin) - lu depuis localStorage
  const [activeMode, setActiveMode] = useState<ActiveMode | null>(null);

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
  const [completedSession, setCompletedSession] = useState<SessionLog | null>(null);

  // Week Organizer State - MODIFIÉ: tableau au lieu d'un seul
  const [activeWeekOrganizers, setActiveWeekOrganizers] = useState<WeekOrganizerLog[]>([]);
  const [pastWeekOrganizers, setPastWeekOrganizers] = useState<WeekOrganizerLog[]>([]);

  // Athlete Comments State
  const [athleteComments, setAthleteComments] = useState<AthleteComment[]>([]);

  // Coach Name (pour le profil athlète)
  const [coachName, setCoachName] = useState<string | undefined>(undefined);

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
      
      // Charger le mode actif depuis localStorage
      const storedMode = localStorage.getItem(ACTIVE_MODE_KEY) as ActiveMode | null;
      if (storedMode && ['athlete', 'coach', 'admin'].includes(storedMode)) {
        // Vérifier que l'utilisateur a bien accès à ce mode
        if (storedMode === 'athlete' && canAccessAthleteMode(currentUser)) {
          setActiveMode('athlete');
        } else if ((storedMode === 'coach' || storedMode === 'admin') && canAccessCoachMode(currentUser)) {
          setActiveMode(storedMode);
        } else {
          // Mode invalide, utiliser le rôle principal
          setActiveMode(currentUser.role);
          localStorage.setItem(ACTIVE_MODE_KEY, currentUser.role);
        }
      } else {
        // Pas de mode stocké, utiliser le rôle principal
        setActiveMode(currentUser.role);
        localStorage.setItem(ACTIVE_MODE_KEY, currentUser.role);
      }
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
    
    console.log('[loadUserData] Chargement données pour utilisateur:', currentUser.id);
    
    setDataLoading(true);
    try {
      const [plans, logs, comments] = await Promise.all([
        fetchTrainingPlans(currentUser.id),
        fetchSessionLogs(currentUser.id),
        fetchAthleteOwnComments(currentUser.id)
      ]);
      
      console.log('[loadUserData] Plans chargés:', plans.length);
      console.log('[loadUserData] Sessions chargées:', logs.length);
      console.log('[loadUserData] Commentaires chargés:', comments.length, comments);
      
      setTrainingData(plans);
      setHistory(logs);
      setAthleteComments(comments);
    } catch (error) {
      console.error("[loadUserData] Erreur chargement données:", error);
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

  // MODIFIÉ: Charger TOUS les week organizers pour les athlètes + nom du coach
  useEffect(() => {
    const loadWeekOrganizers = async () => {
      if (!currentUser || !currentUser.coachId) return;
      
      try {
        // Charger le nom du coach
        const { data: coachProfile } = await supabase
          .from('profiles')
          .select('first_name, last_name, username')
          .eq('id', currentUser.coachId)
          .single();
        
        if (coachProfile) {
          const name = coachProfile.first_name && coachProfile.last_name
            ? `${coachProfile.first_name} ${coachProfile.last_name}`
            : coachProfile.username;
          setCoachName(name);
        }
        
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
      setHasActiveSession(false);
      localStorage.removeItem('F.Y.T_active_session');
      localStorage.removeItem('F.Y.T_active_session_athlete');
      
      // Si c'est une édition, retour direct à l'accueil
      if (editingSession) {
        setEditingSession(null);
        setCurrentView('home');
      } else {
        // Nouvelle séance: afficher l'écran de félicitations
        setEditingSession(null);
        setCompletedSession(log);
        setCurrentView('completed');
      }
    } catch (error) {
      console.error("Erreur sauvegarde session:", error);
      throw error;
    }
  };

  const handleGoHomeFromCompleted = () => {
    setCompletedSession(null);
    setCurrentView('home');
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
    if (!currentUser) {
      console.error('[handleSaveAthleteComment] Pas d\'utilisateur connecté');
      return;
    }
    
    console.log('[handleSaveAthleteComment] Envoi commentaire:', {
      userId: currentUser.id,
      exerciseName,
      comment: comment.substring(0, 50),
      sessionId
    });

    try {
      const savedComment = await saveAthleteComment({
        oderId: currentUser.id,
        sessionId,
        exerciseName,
        comment,
        isRead: false,
      });
      
      console.log('[handleSaveAthleteComment] Commentaire sauvegardé:', savedComment);
      
      // Rafraîchir la liste des commentaires
      if (savedComment) {
        setAthleteComments(prev => [savedComment, ...prev]);
      }
    } catch (error) {
      console.error('[handleSaveAthleteComment] Erreur:', error);
      throw error;
    }
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
  // RENDER HELPERS
  // ===========================================

  // Convertir la view actuelle en AthleteView pour le bottom nav
  const getAthleteView = (): AthleteView => {
    switch (currentView) {
      case 'home': return 'home';
      case 'selector': return 'home'; // Le sélecteur est considéré comme partie de home
      case 'history': return 'history';
      case 'coach': return 'coach';
      case 'settings': return 'profile';
      default: return 'home';
    }
  };

  // Convertir AthleteView en view interne
  const handleAthleteViewChange = (view: AthleteView) => {
    switch (view) {
      case 'home': setCurrentView('home'); break;
      case 'history': setCurrentView('history'); break;
      case 'coach': setCurrentView('coach'); break; // Vue messages du coach
      case 'profile': setCurrentView('settings'); break;
    }
  };

  // Déterminer l'état du FAB
  const getSessionState = (): SessionState => {
    if (hasActiveSession) return 'active';
    return 'none';
  };

  // Handler pour le FAB
  const handleFabClick = () => {
    if (hasActiveSession) {
      handleResumeSession();
    } else {
      // Ouvrir le sélecteur de séance ou démarrer directement
      setCurrentView('home');
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

  if (!currentUser || !activeMode) {
    return <LoadingScreen />;
  }

  // Vérifications basées sur le rôle principal (pour les permissions)
  const isAdmin = currentUser.role === 'admin';
  const isCoach = currentUser.role === 'coach';
  
  // Vérifications basées sur le mode actif (pour l'affichage)
  const showAthleteInterface = activeMode === 'athlete';
  const showCoachInterface = activeMode === 'coach' || activeMode === 'admin';
  
  // Peut-on switcher de mode ?
  const canSwitchToCoach = canAccessCoachMode(currentUser);
  const canSwitchToAthlete = canAccessAthleteMode(currentUser);

  // Handler pour changer de mode
  const handleSwitchMode = (newMode: ActiveMode) => {
    localStorage.setItem(ACTIVE_MODE_KEY, newMode);
    window.location.reload();
  };

  // ===========================================
  // RENDER ATHLETE (Mobile-First avec Bottom Nav)
  // ===========================================
  if (showAthleteInterface) {
    // Afficher l'écran de fin de séance en plein écran
    if (currentView === 'completed' && completedSession) {
      return (
        <SessionCompletedScreen
          sessionLog={completedSession}
          onGoHome={handleGoHomeFromCompleted}
        />
      );
    }

    // Navigation toujours visible - le FAB orange indique qu'une session est en cours
    // L'utilisateur peut naviguer librement et revenir via le FAB
    const hideNavigation = false;

    return (
      <AthleteLayout
        currentView={getAthleteView()}
        onViewChange={handleAthleteViewChange}
        unreadMessages={0} // TODO: implémenter le compteur de messages non lus
        sessionState={getSessionState()}
        onFabClick={handleFabClick}
        hideNavigation={hideNavigation}
      >
        <div className="p-4">
          {dataLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {currentView === 'home' && (
                <HomeAthlete
                  user={currentUser}
                  trainingData={trainingData}
                  history={history}
                  activeWeekOrganizers={activeWeekOrganizers}
                  onStartSession={(exercises) => {
                    // Mettre à jour les filtres pour correspondre à la séance sélectionnée
                    if (exercises.length > 0) {
                      const firstExercise = exercises[0];
                      setFilters({
                        selectedAnnee: firstExercise.annee,
                        selectedMois: firstExercise.moisNum,
                        selectedSemaine: firstExercise.semaine,
                        selectedSeances: [firstExercise.seance],
                      });
                    }
                    handleStartSession();
                  }}
                  onResumeSession={handleResumeSession}
                  hasActiveSession={hasActiveSession}
                  onSelectSession={() => setCurrentView('selector')}
                />
              )}

              {/* Vue Sélecteur de séance (ancien sélecteur avec 3 dropdowns) */}
              {currentView === 'selector' && (
                <div className="space-y-4">
                  {/* Header avec bouton retour */}
                  <div className="flex items-center gap-3 pb-2">
                    <button
                      onClick={() => setCurrentView('home')}
                      className="p-2 text-slate-400 hover:text-white transition-colors -ml-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m15 18-6-6 6-6"/>
                      </svg>
                    </button>
                    <h1 className="text-xl font-bold text-white">Toutes les séances</h1>
                  </div>
                  
                  {/* Ancien sélecteur avec dropdowns */}
                  <Home
                    data={trainingData}
                    filters={filters}
                    setFilters={setFilters}
                    onStartSession={handleStartSession}
                    user={currentUser}
                    history={history}
                    activeWeekOrganizers={[]}
                    pastWeekOrganizers={[]}
                  />
                </div>
              )}

              {currentView === 'active' && activeSessionData && (
                <ActiveSessionAthlete
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
                <HistoryAthlete
                  history={history}
                  onDelete={handleDeleteSession}
                  onEdit={handleEditSession}
                />
              )}

              {/* Vue Messages Coach */}
              {currentView === 'coach' && (
                <CoachMessages
                  activeMessages={activeWeekOrganizers}
                  pastMessages={pastWeekOrganizers}
                  athleteComments={athleteComments}
                />
              )}

              {/* Vue Profil */}
              {currentView === 'profile' && (
                <ProfileAthlete
                  user={currentUser}
                  history={history}
                  coachName={coachName}
                  onOpenSettings={() => setCurrentView('settings')}
                  onLogout={handleLogout}
                />
              )}

              {currentView === 'settings' && (
                <SettingsView
                  user={currentUser}
                  onUpdateProfile={handleUpdateProfile}
                  onLogout={handleLogout}
                  activeMode={activeMode}
                  canSwitchToCoach={canSwitchToCoach}
                  canSwitchToAthlete={canSwitchToAthlete}
                  onSwitchMode={handleSwitchMode}
                />
              )}

              {currentView === 'import' && (
                <StravaImport user={currentUser} />
              )}
            </>
          )}
        </div>
      </AthleteLayout>
    );
  }

  // ===========================================
  // RENDER COACH / ADMIN (Desktop-First avec Sidebar)
  // ===========================================
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
        hasActiveSession={hasActiveSession}
      />
      
      <main className="flex-1 lg:ml-0 overflow-y-auto">
        {/* Mobile header for coach/admin */}
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
                  activeWeekOrganizers={activeWeekOrganizers}
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
                  activeMode={activeMode}
                  canSwitchToCoach={canSwitchToCoach}
                  canSwitchToAthlete={canSwitchToAthlete}
                  onSwitchMode={handleSwitchMode}
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
