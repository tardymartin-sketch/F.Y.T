// ============================================================
// F.Y.T - APP PRINCIPAL (Version V3 avec Navigation Responsive)
// App.tsx
// Fusion ancien code fonctionnel + nouveautés étapes 1-4
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
  fetchActiveWeekOrganizersForAthlete,
  fetchAthleteOwnComments,
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

// Hooks V3
import { useDeviceDetect } from './src/hooks/useDeviceDetect';
import { useCurrentView, useScrollPersistence } from './src/hooks/useUIState';

// Components existants
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

// Composants V3 Athlète
import { BottomNav } from './src/components/athlete/BottomNav';
import { HomeAthlete } from './src/components/athlete/HomeAthlete';
import { ActiveSessionAthlete } from './src/components/athlete/ActiveSessionAthlete';
import { CoachTab } from './src/components/athlete/CoachTab';
import { ProfileTab } from './src/components/athlete/ProfileTab';

// Composants V3 Coach
import { CoachConversationsView } from './src/components/coach/CoachConversationsView';


const App: React.FC = () => {
  // ===========================================
  // AUTH STATE
  // ===========================================
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // ===========================================
  // USER STATE
  // ===========================================
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // ===========================================
  // NAVIGATION (V3: avec store singleton)
  // ===========================================
  const [currentView, setCurrentView] = useCurrentView();

  // ===========================================
  // DATA STATES
  // ===========================================
  const [trainingData, setTrainingData] = useState<WorkoutRow[]>([]);
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [filters, setFilters] = useState<FilterState>({
    selectedAnnee: null,
    selectedMois: null,
    selectedSemaine: null,
    selectedSeances: [],
  });
  const [dataLoading, setDataLoading] = useState(false);

  // ===========================================
  // ACTIVE SESSION STATE
  // ===========================================
  const [activeSessionData, setActiveSessionData] = useState<WorkoutRow[] | null>(null);
  const [editingSession, setEditingSession] = useState<SessionLog | null>(null);
  const [hasActiveSession, setHasActiveSession] = useState(false);

  // ===========================================
  // WEEK ORGANIZER STATE
  // ===========================================
  const [activeWeekOrganizers, setActiveWeekOrganizers] = useState<WeekOrganizerLog[]>([]);
  const [pastWeekOrganizers, setPastWeekOrganizers] = useState<WeekOrganizerLog[]>([]);

  // ===========================================
  // V3: ATHLETE COMMENTS STATE (Étape 6A)
  // ===========================================
  const [athleteComments, setAthleteComments] = useState<AthleteComment[]>([]);

  // ===========================================
  // V3: NAVIGATION VERS COACH TAB AVEC CONVERSATION CIBLÉE
  // ===========================================
  const [targetExerciseName, setTargetExerciseName] = useState<string | null>(null);

  // ===========================================
  // V3: COACH COMMENTS STATE (pour CoachConversationsView)
  // ===========================================
  const [coachTeamComments, setCoachTeamComments] = useState<AthleteComment[]>([]);

  // ===========================================
  // V3: ROLE DETECTION STATE
  // Logique: hasCoachId → athlète, hasLinkedAthletes → coach
  // ===========================================
  const [hasLinkedAthletes, setHasLinkedAthletes] = useState<boolean>(false);

  // ===========================================
  // V3: DEVICE DETECTION (Étape 2)
  // ===========================================
  const { isMobile, isDesktop } = useDeviceDetect();

  // ===========================================
  // V3: VIEW VALIDATION ON LOAD
  // Corriger la vue persistée si elle n'est pas valide pour le rôle
  // ===========================================

  useEffect(() => {
    if (!currentUser) return;

    const hasCoachAssigned = !!currentUser.coachId;
    const effectiveBehavesAsAthlete = hasCoachAssigned || currentUser.role === 'athlete';
    const effectiveUseMobileLayout = isMobile || effectiveBehavesAsAthlete;

    // Vues valides selon le contexte
    const validAthleteViews = ['home', 'history', 'coach', 'profile', 'active'];
    const validCoachMobileViews = ['home', 'history', 'coach', 'profile', 'team', 'messages', 'active'];
    const validCoachDesktopViews = ['home', 'history', 'team', 'messages', 'import', 'settings', 'active', 'admin'];

    let validViews: string[];
    if (effectiveBehavesAsAthlete) {
      validViews = validAthleteViews;
    } else if (effectiveUseMobileLayout) {
      validViews = validCoachMobileViews;
    } else {
      validViews = validCoachDesktopViews;
    }

    // Si la vue actuelle n'est pas valide, rediriger vers home
    if (!validViews.includes(currentView)) {
      console.log(`[App] Vue '${currentView}' invalide pour ce contexte, redirection vers 'home'`);
      setCurrentView('home');
    }
  }, [currentUser, hasLinkedAthletes, isMobile]);

  // ===========================================
  // V3: SCROLL PERSISTENCE (via store singleton)
  // ===========================================
  useScrollPersistence(currentView);

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

  useEffect(() => {
    const handleStorageChange = () => {
      const savedSession = localStorage.getItem('F.Y.T_active_session');
      setHasActiveSession(!!savedSession);
    };

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

      // V3: Vérifier si l'utilisateur a des athlètes liés (pour déterminer s'il est coach)
      const athletes = await fetchTeamAthletes(session.user.id);
      setHasLinkedAthletes(athletes.length > 0);
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

  // ===========================================
  // WEEK ORGANIZERS
  // ===========================================

  useEffect(() => {
    const loadWeekOrganizers = async () => {
      if (!currentUser || !currentUser.coachId) return;

      try {
        const activeMessages = await fetchActiveWeekOrganizersForAthlete(
          currentUser.coachId,
          currentUser.id
        );
        setActiveWeekOrganizers(activeMessages);

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

    // V3: Charger les commentaires de l'athlète (pour CoachTab)
    const loadAthleteComments = async () => {
      if (!currentUser) return;

      try {
        const comments = await fetchAthleteOwnComments(currentUser.id);
        setAthleteComments(comments);
      } catch (error) {
        console.error("Erreur chargement commentaires athlète:", error);
      }
    };

    // V3: Charger les commentaires de l'équipe pour le coach
    const loadCoachTeamComments = async () => {
      if (!currentUser || (currentUser.role !== 'coach' && currentUser.role !== 'admin')) return;

      try {
        const comments = await fetchTeamComments(currentUser.id, false);
        setCoachTeamComments(comments);
      } catch (error) {
        console.error("Erreur chargement commentaires équipe:", error);
      }
    };

    loadWeekOrganizers();
    loadAthleteComments();
    loadCoachTeamComments();
  }, [currentUser]);

  // ===========================================
  // SESSION HANDLERS
  // ===========================================

  // Handler pour démarrer depuis Home (coach) avec filtres
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

  // V3: Handler pour démarrer depuis HomeAthlete (reçoit directement les exercices)
  const handleStartSessionFromExercises = (exercises: WorkoutRow[]) => {
    if (exercises.length > 0) {
      setActiveSessionData(exercises);
      setEditingSession(null);
      setCurrentView('active');
      setHasActiveSession(true);
    }
  };

  const handleResumeSession = () => {
    const savedSession = localStorage.getItem('F.Y.T_active_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
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
      userId: currentUser.id,
      sessionId,
      exerciseName,
      comment,
      isRead: false,
    });
    // Recharger les commentaires après envoi
    const comments = await fetchAthleteOwnComments(currentUser.id);
    setAthleteComments(comments);
  };

  // V3: Handler pour envoyer un message en tant que coach
  const handleCoachSendMessage = async (_athleteId: string, exerciseName: string, message: string, sessionId?: string) => {
    if (!currentUser) return;
    await saveAthleteComment({
      userId: currentUser.id,
      sessionId: sessionId || '',
      exerciseName,
      comment: message,
      isRead: false,
    });
    // Recharger les commentaires après envoi
    const comments = await fetchTeamComments(currentUser.id, false);
    setCoachTeamComments(comments);
  };

  // ===========================================
  // LOGOUT HANDLER
  // ===========================================

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('F.Y.T_active_session');
  };

  // ===========================================
  // NAVIGATION HANDLER
  // ===========================================

  const handleViewChange = (view: string) => {
    if (view === 'active' && hasActiveSession && !activeSessionData) {
      handleResumeSession();
    } else {
      setCurrentView(view);
    }
  };

  // ===========================================
  // V3: NAVIGATION VERS COACH TAB AVEC CONVERSATION CIBLÉE
  // ===========================================

  const handleNavigateToCoachTab = (exerciseName: string) => {
    setTargetExerciseName(exerciseName);
    setCurrentView('coach');
  };

  const handleClearTargetExercise = () => {
    setTargetExerciseName(null);
  };

  // ===========================================
  // RENDER GUARDS
  // ===========================================

  if (authLoading) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <Auth />;
  }

  if (!currentUser) {
    return <LoadingScreen />;
  }

  // ===========================================
  // V3: NAVIGATION LOGIC (Étapes 2-3)
  // Logique basée sur les relations, pas sur le rôle en base:
  // - Si user a un coachId → comportement athlète (voit les fonctionnalités athlète)
  // - Si user a des athlètes liés → comportement coach
  // - Si user est coach en base sans athlètes → comportement coach
  // - Sinon → utiliser le rôle en base
  // ===========================================

  const hasCoachAssigned = !!currentUser.coachId;
  const isCoachByRole = currentUser.role === 'coach' || currentUser.role === 'admin';

  // Comportement effectif:
  // - behavesAsAthlete: l'utilisateur voit les fonctionnalités athlète (CoachTab, etc.)
  // - behavesAsCoach: l'utilisateur voit les fonctionnalités coach (CoachConversationsView, etc.)
  const behavesAsAthlete = hasCoachAssigned || currentUser.role === 'athlete';
  const behavesAsCoach = hasLinkedAthletes || (isCoachByRole && !hasCoachAssigned);

  const isAdmin = currentUser.role === 'admin';

  // Navigation responsive:
  // - Si behavesAsAthlete → layout mobile (BottomNav + HomeAthlete)
  // - Si behavesAsCoach sur desktop → layout coach (Sidebar + Home)
  // - Si behavesAsCoach sur mobile → layout mobile avec fonctionnalités coach
  const useMobileLayout = isMobile || behavesAsAthlete;
  const showBottomNav = useMobileLayout;
  const showSidebar = behavesAsCoach && isDesktop && !behavesAsAthlete;

  // ===========================================
  // RENDER
  // ===========================================

  return (
    <div className="min-h-screen bg-slate-950 flex">
      {/* Sidebar Coach (desktop uniquement) */}
      {showSidebar && (
        <Sidebar
          currentView={currentView as 'home' | 'import' | 'team' | 'messages' | 'settings'}
          onNavigate={handleViewChange}
          coachName={`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username}
          onLogout={handleLogout}
        />
      )}

      <main
        className={`
          flex-1 lg:ml-0 overflow-y-auto
          ${showBottomNav ? 'pb-[calc(64px+env(safe-area-inset-bottom))]' : ''}
        `}
      >
        {/* Mobile header (si layout mobile) */}
        {useMobileLayout && (
          <div className="sticky top-0 z-30 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
            <div className="flex items-center justify-center">
              <h1 className="font-bold text-white text-lg">F.Y.T</h1>
            </div>
          </div>
        )}

        <div className="p-4 lg:p-8">
          {dataLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* V3: Home différent selon layout (mobile/athlete vs desktop/coach) */}
              {currentView === 'home' && (
                useMobileLayout ? (
                  <HomeAthlete
                    user={currentUser}
                    trainingData={trainingData}
                    history={history}
                    activeWeekOrganizers={activeWeekOrganizers}
                    onStartSession={handleStartSessionFromExercises}
                    onResumeSession={handleResumeSession}
                    hasActiveSession={hasActiveSession}
                  />
                ) : (
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
                )
              )}

              {currentView === 'active' && activeSessionData && (
                behavesAsAthlete ? (
                  <ActiveSessionAthlete
                    sessionData={activeSessionData}
                    history={history}
                    onSave={handleSaveSession}
                    onCancel={handleCancelSession}
                    initialLog={editingSession}
                    userId={currentUser.id}
                    onSaveComment={handleSaveAthleteComment}
                  />
                ) : (
                  <ActiveSession
                    sessionData={activeSessionData}
                    history={history}
                    onSave={handleSaveSession}
                    onCancel={handleCancelSession}
                    initialLog={editingSession}
                    userId={currentUser.id}
                    onSaveComment={handleSaveAthleteComment}
                    existingComments={athleteComments}
                    onMarkCommentsAsRead={handleMarkCommentsAsRead}
                    onNavigateToCoachTab={behavesAsAthlete ? handleNavigateToCoachTab : undefined}
                  />
                )
              )}

              {currentView === 'history' && (
                <History
                  history={history}
                  onDelete={handleDeleteSession}
                  onEdit={handleEditSession}
                  userId={currentUser.id}
                />
              )}

              {/* V3: Vue Coach pour athlète (Étape 6A) */}
              {currentView === 'coach' && useMobileLayout && behavesAsAthlete && (
                <CoachTab
                  userId={currentUser.id}
                  coachId={currentUser.coachId}
                  weekOrganizerMessages={activeWeekOrganizers}
                  athleteComments={athleteComments}
                  onSendMessage={async (exerciseName, message) => {
                    await handleSaveAthleteComment(exerciseName, message, '');
                  }}
                  onMarkAsRead={handleMarkCommentsAsRead}
                  initialExerciseName={targetExerciseName}
                  onClearInitialExercise={handleClearTargetExercise}
                />
              )}

              {/* V3: Vue Messages Coach en mode mobile */}
              {currentView === 'coach' && useMobileLayout && behavesAsCoach && (
                <CoachConversationsView
                  comments={coachTeamComments}
                  currentUserId={currentUser.id}
                  onSendMessage={handleCoachSendMessage}
                  onMarkAsRead={handleMarkCommentsAsRead}
                />
              )}

              {/* V3: Vue Profil Athlète (Étape 7A - ATH-008, ATH-012) */}
              {currentView === 'profile' && behavesAsAthlete && (
                <ProfileTab
                  user={currentUser}
                  onUpdateProfile={async (updates) => {
                    await handleUpdateProfile(updates);
                  }}
                  onLogout={handleLogout}
                />
              )}

              {currentView === 'team' && behavesAsCoach && (
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

              {/* V3: Vue Messages Coach avec hiérarchie athlète/séance */}
              {currentView === 'messages' && behavesAsCoach && (
                <CoachConversationsView
                  comments={coachTeamComments}
                  currentUserId={currentUser.id}
                  onSendMessage={handleCoachSendMessage}
                  onMarkAsRead={handleMarkCommentsAsRead}
                />
              )}

              {currentView === 'admin' && isAdmin && (
                <AdminUsersView
                  fetchAllUsers={handleFetchAllUsers}
                  onUpdateCoach={handleUpdateCoach}
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

      {/* V3: Bottom Navigation Athlète (Étape 3) */}
      {showBottomNav && (
        <BottomNav
          activeTab={currentView as 'home' | 'history' | 'coach' | 'profile'}
          onTabChange={handleViewChange}
        />
      )}
    </div>
  );
};

export default App;
