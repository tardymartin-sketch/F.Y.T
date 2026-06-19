// ============================================================
// F.Y.T - APP PRINCIPAL (Version V3 avec Navigation Responsive)
// App.tsx
// Fusion ancien code fonctionnel + nouveautés étapes 1-4
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase } from './src/supabaseClient';
import {
  fetchTrainingPlans,
  fetchSessionLogsFromExerciseLogs,
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
  detectSessionPRs,
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
  AthleteComment,
  PRDetected,
} from './types';

// Hooks V3
import { useDeviceDetect } from './src/hooks/useDeviceDetect';
import { useScrollPersistence } from './src/hooks/useUIState';
import { removeLocalStorageWithEvent } from './src/utils/localStorageEvents';
import { exerciseLogsToWorkoutRows } from './src/utils/workoutToExerciseLogs';

// Stores Zustand & React Query Hooks
import { useAuthStore } from './src/stores/useAuthStore';
import { useUIStore, AppView } from './src/stores/useUIStore';
import { useActiveSessionStore } from './src/stores/useActiveSessionStore';
import { useTrainingPlans, useSessionHistory, useSaveSessionMutation, useDeleteSessionMutation } from './src/hooks/useSessions';

// Theme Context
import { ThemeProvider } from './src/contexts/ThemeContext';

// ===========================================
// COMMON COMPONENTS (partagés mobile/desktop)
// ===========================================
import { Auth } from './src/components/common/Auth';
import { LoadingScreen } from './src/components/common/LoadingScreen';
import { DemoBanner } from './src/components/common/DemoBanner';
import { isDemoMode, resetDemoState } from './src/services/demoService';
import { DemoTourProvider } from './src/contexts/DemoTourContext';
import { DemoTourOverlay } from './src/components/common/DemoTourOverlay';
import { DemoTourManager } from './src/components/common/DemoTourManager';

// ===========================================
// MOBILE COMPONENTS
// ===========================================
import { BottomNav } from './src/components/mobile/BottomNav';
import { HomeMobile } from './src/components/mobile/HomeMobile';
import { AthleteHomeScreen } from './src/components/mobile/AthleteHomeScreen';
import { ActiveSessionMobile } from './src/components/mobile/ActiveSessionMobile';
// [DEAD CODE] import { AddSessionMobile } from './src/components/mobile/AddSessionMobile';
import { HistoryMobile } from './src/components/mobile/HistoryMobile';
import { CoachTab } from './src/components/mobile/CoachTab';
import { ProfileTab } from './src/components/mobile/ProfileTab';
import { PRCelebrationModal } from './src/components/mobile/PRCelebrationModal';
import { StatsPage } from './src/components/mobile/StatsPage';

// ===========================================
// DESKTOP COMPONENTS
// ===========================================
import { Sidebar } from './src/components/desktop/Sidebar';
import { HomeDesktop } from './src/components/desktop/HomeDesktop';
import { ActiveSessionDesktop } from './src/components/desktop/ActiveSessionDesktop';
import { HistoryDesktop } from './src/components/desktop/HistoryDesktop';
import { TeamView } from './src/components/desktop/TeamView';
import { AdminUsersView } from './src/components/desktop/AdminUsersView';
import { SettingsView } from './src/components/desktop/SettingsView';
import { StravaImport } from './src/components/desktop/StravaImport';
import { CoachConversationsView } from './src/components/desktop/CoachConversationsView';
import { LibraryView } from './src/components/desktop/library/LibraryView';
import { Storybook } from './src/components/Storybook';

// Icônes pour le header mobile (même icônes que BottomNav/Sidebar)
import { Home, History, BarChart3, MessageSquare, User as UserIcon, Download, Users, Settings, Library, Palette } from 'lucide-react';

// Mapping vue → icône + label pour le header mobile
const mobileViewConfig: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  home: { icon: Home, label: 'Accueil' },
  history: { icon: History, label: 'Historique' },
  stats: { icon: BarChart3, label: 'Statistiques' },
  coach: { icon: MessageSquare, label: 'Messages' },
  profile: { icon: UserIcon, label: 'Profil' },
  library: { icon: Library, label: 'Exercices et Séances' },
  import: { icon: Download, label: 'Importer' },
  team: { icon: Users, label: 'Mes Athlètes' },
  settings: { icon: Settings, label: 'Admin' },
  storybook: { icon: Palette, label: 'Storybook' },
};

const App: React.FC = () => {
  // ===========================================
  // STORES & HOOKS (Refactored Phase 1)
  // ===========================================
  const { session, currentUser, authLoading, hasLinkedAthletes, initialize } = useAuthStore();
  
  // Initialisation de l'Auth au montage
  useEffect(() => {
    initialize();
  }, [initialize]);
  const { 
    currentView, setCurrentView, 
    targetExerciseName, targetMessageId, 
    targetSessionLogId, targetHistoryExerciseName, targetHistoryDate,
    setNavigationTargets, resetNavigationTargets 
  } = useUIStore();
  const { 
    activeSessionData, editingSession, hasActiveSession, 
    setActiveSession, clearActiveSession, syncWithLocalStorage 
  } = useActiveSessionStore();

  // Proxies de compatibilité (pour éviter de modifier tous les handlers existants)
  const setActiveSessionData = (data: WorkoutRow[] | null) => setActiveSession(data, editingSession);
  const setEditingSession = (log: SessionLog | null) => setActiveSession(activeSessionData, log);
  const setHasActiveSession = (val: boolean) => { /* géré automatiquement par setActiveSession */ };
  
  const setTargetMessageId = (id: string | null) => setNavigationTargets({ targetMessageId: id });
  const setTargetSessionLogId = (id: string | null) => setNavigationTargets({ targetSessionLogId: id });
  const setTargetHistoryExerciseName = (name: string | null) => setNavigationTargets({ targetHistoryExerciseName: name });
  const setTargetHistoryDate = (date: string | null) => setNavigationTargets({ targetHistoryDate: date });
  const setTargetExerciseName = (name: string | null) => setNavigationTargets({ targetExerciseName: name });

  // server state
  const { data: trainingData = [], isLoading: plansLoading, refetch: refetchPlans } = useTrainingPlans(currentUser?.id);
  const { data: history = [], isLoading: historyLoading, refetch: refetchHistory } = useSessionHistory(currentUser?.id);
  const { mutateAsync: saveSessionMutation } = useSaveSessionMutation();
  const { mutateAsync: deleteSessionMutation } = useDeleteSessionMutation();
  const dataLoading = plansLoading || historyLoading;

  // ===========================================
  // REMAINING LOCAL STATES (To be migrated in next steps)
  // ===========================================
  const [filters, setFilters] = useState<FilterState>({
    selectedAnnee: null,
    selectedMois: null,
    selectedSemaine: null,
    selectedSeances: [],
  });

  // [TEMP] À migrer vers React Query
  const [activeWeekOrganizers, setActiveWeekOrganizers] = useState<WeekOrganizerLog[]>([]);
  const [pastWeekOrganizers, setPastWeekOrganizers] = useState<WeekOrganizerLog[]>([]);
  const [athleteComments, setAthleteComments] = useState<AthleteComment[]>([]);
  const [coachTeamComments, setCoachTeamComments] = useState<AthleteComment[]>([]);

  // ===========================================
  // UI & FEEDBACK STATES
  // ===========================================
  const [detectedPRs, setDetectedPRs] = useState<PRDetected[]>([]);
  const [showPRModal, setShowPRModal] = useState(false);
  const [demoTourStarted, setDemoTourStarted] = useState(false);
  const [showDemoSessionPreview, setShowDemoSessionPreview] = useState(false);

  // ===========================================
  // V3: DEVICE DETECTION (Étape 2)
  // ===========================================
  const { isMobile, isDesktop } = useDeviceDetect();

  // ===========================================
  // V3: VIEW VALIDATION ON LOAD
  // Corriger la vue persistée si elle n'est pas valide pour le rôle
  // ===========================================

  // ===========================================
  // V3 DESKTOP ADAPTATION: Validation des vues basée sur le DEVICE
  // ===========================================
  useEffect(() => {
    if (!currentUser) return;

    const hasCoachAssigned = !!currentUser.coachId;
    const effectiveBehavesAsAthlete = hasCoachAssigned || currentUser.role === 'athlete';
    const effectiveBehavesAsCoach = hasLinkedAthletes || ((currentUser.role === 'coach' || currentUser.role === 'admin') && !hasCoachAssigned);

    // Vues valides selon le DEVICE et le RÔLE
    // Mobile: toutes les vues de l'onglet BottomNav + vues spécifiques au rôle
    const validMobileViews = ['home', 'history', 'stats', 'coach', 'profile', 'active', 'addSession'];
    if (effectiveBehavesAsCoach) {
      validMobileViews.push('team', 'messages');
    }

    // Desktop: toutes les vues + sidebar
    const validDesktopViews = ['home', 'history', 'stats', 'coach', 'profile', 'active', 'addSession', 'settings'];
    if (effectiveBehavesAsCoach) {
      validDesktopViews.push('team', 'messages', 'import');
    }
    // Library accessible à tous les coachs/admins par rôle
    if (currentUser.role === 'coach' || currentUser.role === 'admin') {
      validDesktopViews.push('library');
    }
    if (currentUser.role === 'admin') {
      validDesktopViews.push('admin', 'storybook');
    }

    const validViews = isMobile ? validMobileViews : validDesktopViews;

    // Si la vue actuelle n'est pas valide, rediriger vers home
    if (!validViews.includes(currentView)) {
      console.log(`[App] Vue '${currentView}' invalide pour ce contexte (device: ${isMobile ? 'mobile' : 'desktop'}), redirection vers 'home'`);
      setCurrentView('home' as AppView);
    }
  }, [currentUser, hasLinkedAthletes, isMobile, currentView, setCurrentView]);

  // ===========================================
  // V3: SCROLL PERSISTENCE (via store singleton)
  // ===========================================
  useScrollPersistence(currentView);

  // ===========================================
  // PERSISTENCE DE LA SESSION EN COURS
  // ===========================================

  useEffect(() => {
    syncWithLocalStorage();
  }, [syncWithLocalStorage]);

  useEffect(() => {
    const handleStorageChange = () => {
      syncWithLocalStorage();
    };

    const interval = setInterval(handleStorageChange, 5000);

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('local-storage-change', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('local-storage-change', handleStorageChange);
      clearInterval(interval);
    };
  }, [syncWithLocalStorage]);

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
      setActiveSession(sessionData, null);
      setCurrentView('active');
    }
  };

  // V3: Handler pour démarrer depuis HomeMobile (reçoit directement les exercices)
  const handleStartSessionFromExercises = (exercises?: WorkoutRow[]) => {
    if (exercises && exercises.length > 0) {
      // Call setActiveSession directly to avoid stale closure bug
      // (setActiveSessionData + setEditingSession proxies read stale values)
      setActiveSession(exercises, null);
      setCurrentView('active');
    }
  };

  const handleResumeSession = () => {
    // Fast path: Zustand already has session data (no page refresh) — just navigate.
    if (activeSessionData !== null) {
      setCurrentView('active');
      return;
    }

    // Restore path: Zustand was reset (page refresh) — rebuild from localStorage.
    const savedSession = localStorage.getItem('F.Y.T_active_session');
    if (!savedSession) return;

    try {
      const parsed = JSON.parse(savedSession);

      // Edit mode: session exists in history (editing a past completed session).
      if (parsed.isEditMode && parsed.editingSessionId) {
        const session = history.find(s => s.id === parsed.editingSessionId);
        if (session) {
          let sessionData: WorkoutRow[] | null = null;
          if (parsed.sessionData) {
            const found = trainingData.filter(d =>
              parsed.sessionData.some((s: any) =>
                s.seance === d.seance &&
                s.annee === d.annee &&
                s.moisNum === d.moisNum &&
                s.semaine === d.semaine
              )
            );
            if (found.length > 0) sessionData = found;
          }
          setActiveSession(sessionData, session);
          setCurrentView('active');
          return;
        }
        // Not in history = new in-progress session, fall through to log-based restore.
      }

      // Normal session: reconstruct exercises from training plan.
      if (parsed.sessionData && parsed.sessionData.length > 0) {
        const sessionData = trainingData.filter(d =>
          parsed.sessionData.some((s: any) =>
            s.seance === d.seance &&
            s.annee === d.annee &&
            s.moisNum === d.moisNum &&
            s.semaine === d.semaine
          )
        );
        if (sessionData.length > 0) {
          setActiveSession(sessionData, null);
          setCurrentView('active');
          return;
        }
      }

      // Fallback: blank/template session, or training plan changed since session started.
      // Navigate with empty sessionData — ActiveSessionMobile restores logs from localStorage
      // (the empty-vs-empty sessionData comparison in its useEffect will match and restore).
      if (parsed.logs && parsed.logs.length > 0) {
        setActiveSession([], null);
        setCurrentView('active');
      }
    } catch (e) {
      console.error('Erreur reprise session:', e);
    }
  };

  const handleSaveSession = async (log: SessionLog) => {
    if (!currentUser) return;

    try {
      // Détecter les PRs AVANT la sauvegarde
      const prs = await detectSessionPRs(log, currentUser.id);

      await saveSessionMutation({ log, userId: currentUser.id });
      
      clearActiveSession();

      // Afficher le modal PR si des records ont été battus
      if (prs.length > 0) {
        setDetectedPRs(prs);
        setShowPRModal(true);
      } else {
        setCurrentView('home');
      }
    } catch (error) {
      console.error("Erreur sauvegarde session:", error);
      throw error;
    }
  };

  const handleCancelSession = () => {
    clearActiveSession();
    setCurrentView('home');
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!currentUser) return;
    try {
      await deleteSessionMutation({ logId: sessionId, userId: currentUser.id });
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
      setActiveSession(sessionData, log);
      setCurrentView('active');
    } else {
      // Fallback : exercice non trouvé dans training_plans (programme modifié)
      const minimalData: WorkoutRow[] = log.exercises.map((ex, idx) => ({
        id: idx,
        annee: log.sessionKey.annee,
        moisNom: '',
        moisNum: log.sessionKey.moisNum,
        semaine: log.sessionKey.semaine,
        seance: log.sessionKey.seance,
        ordre: idx + 1,
        exercice: ex.exerciseName,
        exerciseId: undefined,  // Pas de lien vers exercises (legacy)
        series: ex.sets.length.toString(),
        repsDuree: '',
        repos: '',
        tempoRpe: '',
        notes: '',
        video: ''
      }));
      setActiveSession(minimalData, log);
      setCurrentView('active');
    }
  };

  // ===========================================
  // [DEAD CODE] ADD SESSION HANDLERS (Séance manuelle)
  // ===========================================
  /*
  const handleOpenAddSession = () => {
    // Vérifier s'il y a une session en cours de modification dans localStorage
    try {
      const saved = localStorage.getItem('F.Y.T_add_session');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.isEditMode && data.editingSessionId) {
          // Trouver la session dans l'historique
          const session = history.find(s => s.id === data.editingSessionId);
          if (session) {
            setEditingManualSession(session);
            setCurrentView('addSession');
            return;
          }
        }
      }
    } catch (e) {
      console.error('Erreur restauration session:', e);
    }

    // Par défaut: nouvelle session
    setEditingManualSession(null);
    setCurrentView('addSession');
  };

  const handleEditManualSession = (session: SessionLog) => {
    setEditingManualSession(session);
    setCurrentView('addSession');
  };

  const handleSaveManualSession = async (log: SessionLog) => {
    try {
      await saveSessionLog(log, currentUser!.id);
      // Refresh history depuis exercise_logs
      const updatedHistory = await fetchSessionLogsFromExerciseLogs(currentUser!.id);
      setHistory(updatedHistory);
      setEditingManualSession(null);
      setCurrentView('history');
    } catch (error) {
      console.error('Erreur sauvegarde séance manuelle:', error);
      throw error;
    }
  };

  const handleCancelAddSession = () => {
    setEditingManualSession(null);
    setCurrentView('home');
  };
  */

  const handleFetchTeam = async (coachId: string) => {
    return await fetchTeamAthletes(coachId);
  };

  const handleFetchAthleteHistory = async (athleteId: string) => {
    return await fetchSessionLogsFromExerciseLogs(athleteId);
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
    // Rafraîchir le profil dans le store
    await useAuthStore.getState().loadUserProfile();
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
    removeLocalStorageWithEvent('F.Y.T_active_session');
  };

  // ===========================================
  // NAVIGATION HANDLER
  // ===========================================

  const handleViewChange = (view: AppView) => {
    if (view === ('active' as AppView) && hasActiveSession && !activeSessionData) {
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
  // DEMO TOUR HANDLERS
  // ===========================================

  // Sélectionner automatiquement "Lower 1" et "Core 1" pour la démo
  const handleDemoSelectSession = useCallback(() => {
    if (trainingData.length > 0) {
      // Chercher "Lower 1" et "Core 1" dans les séances disponibles
      const sessionsToSelect = ['Lower 1', 'Core 1'];
      const foundSessions = sessionsToSelect.filter(sessionName =>
        trainingData.some(d => d.seance === sessionName)
      );

      // Si on trouve au moins une des séances, les sélectionner
      if (foundSessions.length > 0) {
        foundSessions.forEach(sessionName => {
          window.dispatchEvent(new CustomEvent('demo-select-session', { detail: sessionName }));
        });
      } else {
        // Fallback: sélectionner la première séance disponible
        const firstSession = trainingData[0]?.seance;
        if (firstSession) {
          window.dispatchEvent(new CustomEvent('demo-select-session', { detail: firstSession }));
        }
      }
    }
  }, [trainingData]);

  // Désélectionner toutes les séances pour la démo
  const handleDemoDeselectSessions = useCallback(() => {
    window.dispatchEvent(new CustomEvent('demo-deselect-all-sessions'));
  }, []);

  // Sélectionner uniquement "Lower 1" pour la démo
  const handleDemoSelectLower1Only = useCallback(() => {
    if (trainingData.length > 0) {
      // D'abord désélectionner tout
      window.dispatchEvent(new CustomEvent('demo-deselect-all-sessions'));
      // Puis sélectionner uniquement Lower 1
      setTimeout(() => {
        const sessionName = 'Lower 1';
        if (trainingData.some(d => d.seance === sessionName)) {
          window.dispatchEvent(new CustomEvent('demo-select-session', { detail: sessionName }));
        } else {
          // Fallback: première séance disponible
          const firstSession = trainingData[0]?.seance;
          if (firstSession) {
            window.dispatchEvent(new CustomEvent('demo-select-session', { detail: firstSession }));
          }
        }
      }, 50);
    }
  }, [trainingData]);

  // Démarrer la séance de démo avec uniquement "Lower 1"
  const handleDemoStartSession = useCallback(() => {
    if (trainingData.length > 0) {
      // Trouver la semaine courante dans les données (première semaine disponible)
      const currentWeek = trainingData[0]?.semaine;
      const currentYear = trainingData[0]?.annee;
      const currentMonth = trainingData[0]?.moisNum;

      // Récupérer uniquement les exercices de "Lower 1" pour la semaine courante
      const demoExercises = trainingData.filter(d =>
        d.seance === 'Lower 1' &&
        d.semaine === currentWeek &&
        d.annee === currentYear &&
        d.moisNum === currentMonth
      );

      if (demoExercises.length > 0) {
        setShowDemoSessionPreview(false);
        setActiveSession(demoExercises, null);
        setCurrentView('active');
      } else {
        // Fallback: première séance disponible (semaine courante uniquement)
        const firstSession = trainingData[0]?.seance;
        const fallbackExercises = trainingData.filter(d =>
          d.seance === firstSession &&
          d.semaine === currentWeek &&
          d.annee === currentYear &&
          d.moisNum === currentMonth
        );
        if (fallbackExercises.length > 0) {
          setShowDemoSessionPreview(false);
          setActiveSession(fallbackExercises, null);
          setCurrentView('active');
        }
      }
    }
  }, [trainingData]);

  // Terminer/annuler la séance en cours pour revenir à l'accueil
  const handleDemoKillSession = useCallback(() => {
    setActiveSession(null, null);
  }, []);

  // Réinitialiser complètement l'état de la session pour le tour démo
  const handleDemoResetSession = useCallback(() => {
    // Utiliser la fonction du service pour nettoyer le localStorage
    resetDemoState();
    // Réinitialiser les états React
    setActiveSession(null, null);
    // [DEAD CODE] setEditingManualSession(null);
    // [DEAD CODE] setHasAddSession(false);
  }, []);

  // Replier le bloc exercice via un événement custom
  const handleDemoCollapseExercise = useCallback(() => {
    // Dispatcher un événement custom que ActiveSessionMobile écoute
    window.dispatchEvent(new CustomEvent('demo-collapse-exercise'));
  }, []);

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

  // ===========================================
  // V3 DESKTOP ADAPTATION: Navigation basée sur le DEVICE uniquement
  // - Mobile → layout mobile (BottomNav + composants athlete/)
  // - Desktop → layout desktop (Sidebar + composants adaptés)
  // Les fonctionnalités accessibles restent basées sur le rôle (behavesAsAthlete/behavesAsCoach)
  // ===========================================
  const useMobileLayout = isMobile;
  const useDesktopLayout = isDesktop;
  const showBottomNav = isMobile;
  const showSidebar = isDesktop;

  // ===========================================
  // RENDER
  // ===========================================

  return (
    <ThemeProvider>
      <DemoTourProvider>
        <div className={`bg-theme flex flex-col ${((currentView === 'history' || currentView === 'library' || currentView === 'coach' || currentView === 'messages') && isDesktop) ? 'h-screen overflow-hidden' : 'min-h-screen'}`}>
          {/* Demo Tour Manager - gère la logique du tour (mobile uniquement) */}
          {isDemoMode() && (
            <DemoTourManager
              onNavigate={handleViewChange as any}
              onSelectSession={handleDemoSelectSession}
              onStartSession={handleDemoStartSession}
              onKillSession={handleDemoKillSession}
              onResetSession={handleDemoResetSession}
              onCollapseExercise={handleDemoCollapseExercise}
              onDeselectSessions={handleDemoDeselectSessions}
              onSelectLower1Only={handleDemoSelectLower1Only}
              currentView={currentView}
              trainingDataLoaded={trainingData.length > 0}
              isMobile={isMobile}
            />
          )}

          {/* Demo Tour Overlay - affiche les tooltips (mobile uniquement, après chargement des données) */}
          {isDemoMode() && isMobile && trainingData.length > 0 && <DemoTourOverlay />}

          {/* Bannière mode démo */}
          {isDemoMode() && <DemoBanner />}

          <div className="flex flex-1 min-h-0">
            {/* Sidebar (desktop uniquement) - menus filtrés selon le rôle */}
            {showSidebar && (
              <Sidebar
                currentView={currentView as any}
                onNavigate={handleViewChange}
                coachName={`${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() || currentUser.username}
                onLogout={handleLogout}
                userRole={isAdmin ? 'admin' : isCoachByRole ? 'coach' : 'athlete'}
                userId={currentUser.id}
                hasActiveSession={hasActiveSession}
              // [DEAD CODE] hasAddSession={hasAddSession}
              />
            )}

            <main
              className={`
          flex-1 lg:ml-0
          ${((currentView === 'history' || currentView === 'library' || currentView === 'coach' || currentView === 'messages') && isDesktop) ? 'overflow-hidden' : 'overflow-y-auto'}
          ${showBottomNav ? 'pb-[calc(64px+env(safe-area-inset-bottom))]' : ''}
        `}
            >
              {/* Mobile header - icône + nom de la page sur tous les écrans mobiles */}
              {isMobile && currentView !== 'active' && currentView !== 'addSession' && mobileViewConfig[currentView] && (() => {
                const config = mobileViewConfig[currentView];
                const Icon = config.icon;
                return (
                  <div className="sticky top-0 z-30 bg-theme-secondary/95 backdrop-blur-xl border-b border-theme px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-5 h-5 text-[var(--color-primary)]" />
                      <h1 className="font-bold text-theme text-lg">{config.label}</h1>
                    </div>
                  </div>
                );
              })()}

              <div className={((currentView === 'history' || currentView === 'library' || currentView === 'coach' || currentView === 'messages') && isDesktop) ? 'h-full' : 'p-4 lg:px-8 lg:pb-8 lg:pt-4'}>
                {dataLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin w-8 h-8 border-2 border-[var(--color-primary)] border-t-transparent rounded-full" />
                  </div>
                ) : (
                  <>
                    {/* V3 DESKTOP ADAPTATION: Home basé sur le DEVICE */}
                    {currentView === 'home' && isMobile && behavesAsAthlete && (
                      <AthleteHomeScreen
                        user={currentUser}
                        history={history}
                        hasActiveSession={hasActiveSession}
                        onResumeSession={handleResumeSession}
                        onStartNewSession={(exercises, sessionData) => {
                          const today = new Date().toISOString().split('T')[0];
                          const sessionLog = {
                            id: crypto.randomUUID(),
                            userId: currentUser.id,
                            date: today,
                            sessionKey: { annee: String(new Date().getFullYear()), moisNum: '', semaine: '', seance: 'Nouvelle séance' },
                            exercises,
                            status: 'draft' as const,
                          };
                          // sessionData (WorkoutRow[]) porte la prescription (séries/reps/
                          // repos/vidéo/tempo) lue par l'active session. Vide pour une
                          // séance blanche, renseigné quand on lance depuis un programme.
                          setActiveSession(sessionData ?? [], sessionLog);
                          setCurrentView('active');
                        }}
                      />
                    )}

                    {currentView === 'home' && isMobile && !behavesAsAthlete && (
                      <HomeMobile
                        user={currentUser}
                        trainingData={trainingData}
                        history={history}
                        activeWeekOrganizers={activeWeekOrganizers}
                        onStartSession={handleStartSessionFromExercises}
                        onResumeSession={handleResumeSession}
                        hasActiveSession={hasActiveSession}
                        onViewCoachMessages={(messageId) => {
                          setTargetMessageId(messageId || null);
                          setCurrentView('coach');
                        }}
                      // [DEAD CODE] onAddSession={handleOpenAddSession}
                      // [DEAD CODE] hasAddSession={hasAddSession}
                      />
                    )}

                    {currentView === 'home' && isDesktop && (
                      <HomeDesktop
                        data={trainingData}
                        filters={filters}
                        setFilters={setFilters}
                        onStartSession={handleStartSessionFromExercises}
                        user={currentUser}
                        history={history}
                        activeWeekOrganizers={activeWeekOrganizers}
                        pastWeekOrganizers={pastWeekOrganizers}
                        hasActiveSession={hasActiveSession}
                        onResumeSession={handleResumeSession}
                      // [DEAD CODE] hasAddSession={hasAddSession}
                      // [DEAD CODE] onAddSession={handleOpenAddSession}
                      />
                    )}

                    {/* V3 DESKTOP ADAPTATION: ActiveSession basé sur le DEVICE */}
                    {currentView === 'active' && activeSessionData && isMobile && (
                      <ActiveSessionMobile
                        sessionData={activeSessionData}
                        history={history}
                        onSave={handleSaveSession}
                        onCancel={handleCancelSession}
                        initialLog={editingSession}
                        userId={currentUser.id}
                      />
                    )}

                    {currentView === 'active' && activeSessionData && isDesktop && (
                      <ActiveSessionDesktop
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
                    )}

                    {/* Historique: HistoryMobile sur mobile, HistoryDesktop sur desktop */}
                    {currentView === 'history' && isMobile && (
                      <HistoryMobile
                        history={history}
                        onDelete={handleDeleteSession}
                        onEdit={handleEditSession}
                        onRelaunch={(session) => {
                          const today = new Date().toISOString().split('T')[0];
                          const blankExercises = session.exercises.map(ex => ({
                            exerciseId: ex.exerciseId,
                            exerciseName: ex.exerciseName,
                            executionMode: ex.executionMode,
                            executionGroupId: ex.executionGroupId,
                            executionGroupPosition: ex.executionGroupPosition,
                            sets: ex.sets.map((s, i) => ({
                              setNumber: i + 1,
                              reps: '',
                              weight: '',
                              completed: false,
                            })),
                            notes: ex.notes,
                          }));
                          const sessionLog = {
                            id: crypto.randomUUID(),
                            userId: currentUser.id,
                            date: today,
                            sessionKey: {
                              annee: String(new Date().getFullYear()),
                              moisNum: '',
                              semaine: '',
                              seance: session.sessionKey.seance || 'Nouvelle séance',
                            },
                            exercises: blankExercises,
                            status: 'draft' as const,
                          };
                          // La séance relancée n'a pas de source WorkoutRow : on
                          // synthétise la prescription depuis les exercices loggés
                          // (reps = sets[0].reps, séries = sets.length) pour que
                          // l'active session affiche de vrais nombres au lieu de "?".
                          // repos/vidéo indisponibles depuis un ExerciseLog.
                          const prescription = exerciseLogsToWorkoutRows(
                            session.exercises,
                            sessionLog.sessionKey,
                          );
                          setActiveSession(prescription, sessionLog);
                          setCurrentView('active');
                        }}
                        userId={currentUser.id}
                        // [DEAD CODE] onEditManualSession={handleEditManualSession}
                        targetSessionLogId={targetSessionLogId}
                        targetExerciseName={targetHistoryExerciseName}
                        targetDate={targetHistoryDate}
                        onClearTarget={() => {
                          setTargetSessionLogId(null);
                          setTargetHistoryExerciseName(null);
                          setTargetHistoryDate(null);
                        }}
                      />
                    )}

                    {currentView === 'history' && isDesktop && (
                      <HistoryDesktop
                        history={history}
                        onDelete={handleDeleteSession}
                        onEdit={handleEditSession}
                        userId={currentUser.id}
                        // [DEAD CODE] onEditManualSession={handleEditManualSession}
                        targetSessionLogId={targetSessionLogId}
                        targetExerciseName={targetHistoryExerciseName}
                        targetDate={targetHistoryDate}
                        onClearTarget={() => {
                          setTargetSessionLogId(null);
                          setTargetHistoryExerciseName(null);
                          setTargetHistoryDate(null);
                        }}
                        workoutData={trainingData}
                      />
                    )}

                    {/* V3: Vue Stats (Data Viz) */}
                    {currentView === 'stats' && (
                      <StatsPage
                        userId={currentUser.id}
                        onViewSession={(sessionLogId, exerciseName) => {
                          setTargetSessionLogId(sessionLogId);
                          setTargetHistoryExerciseName(exerciseName);
                          setTargetHistoryDate(null);
                          setCurrentView('history');
                        }}
                        onViewDate={(date) => {
                          setTargetHistoryDate(date);
                          setTargetSessionLogId(null);
                          setTargetHistoryExerciseName(null);
                          setCurrentView('history');
                        }}
                        layout={isDesktop ? 'desktop' : 'mobile'}
                      />
                    )}

                    {/* [DEAD CODE] V3: Vue Ajout de séance manuelle */}
                    {/* currentView === 'addSession' && (
                <AddSessionMobile
                  onSave={handleSaveManualSession}
                  onCancel={handleCancelAddSession}
                  initialLog={editingManualSession}
                  userId={currentUser.id}
                />
              ) */}

                    {/* V3 DESKTOP ADAPTATION: Vue Coach - même composant pour tous les profils */}
                    {/* Mobile: CoachConversationsView pour tous */}
                    {currentView === 'coach' && isMobile && (
                      <CoachConversationsView
                        comments={behavesAsAthlete ? athleteComments : coachTeamComments}
                        currentUserId={currentUser.id}
                        onSendMessage={behavesAsAthlete
                          ? async (athleteId, exerciseName, message, sessionId) => {
                            await handleSaveAthleteComment(exerciseName, message, sessionId || '');
                          }
                          : handleCoachSendMessage
                        }
                        onMarkAsRead={handleMarkCommentsAsRead}
                        displayMode={behavesAsCoach ? 'hierarchical' : 'flat'}
                      />
                    )}

                    {/* Desktop: CoachConversationsView pour tous */}
                    {currentView === 'coach' && isDesktop && (
                      <CoachConversationsView
                        comments={behavesAsAthlete ? athleteComments : coachTeamComments}
                        currentUserId={currentUser.id}
                        onSendMessage={behavesAsAthlete
                          ? async (athleteId, exerciseName, message, sessionId) => {
                            await handleSaveAthleteComment(exerciseName, message, sessionId || '');
                          }
                          : handleCoachSendMessage
                        }
                        onMarkAsRead={handleMarkCommentsAsRead}
                        displayMode={behavesAsCoach ? 'hierarchical' : 'flat'}
                      />
                    )}

                    {/* V3 DESKTOP ADAPTATION: Vue Profil accessible sur mobile et desktop */}
                    {/* Sur mobile: toujours via BottomNav, sur desktop: via sidebar ou menu */}
                    {currentView === 'profile' && (
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

                    {/* V3: Vue Bibliothèque (Exercices et Séances) - Coach/Admin uniquement */}
                    {currentView === 'library' && isCoachByRole && (
                      <LibraryView coachId={currentUser.id} />
                    )}

                    {/* V3: Vue Messages - même composant pour tous les profils */}
                    {currentView === 'messages' && (
                      <CoachConversationsView
                        comments={behavesAsAthlete ? athleteComments : coachTeamComments}
                        currentUserId={currentUser.id}
                        onSendMessage={behavesAsAthlete
                          ? async (athleteId, exerciseName, message, sessionId) => {
                            await handleSaveAthleteComment(exerciseName, message, sessionId || '');
                          }
                          : handleCoachSendMessage
                        }
                        onMarkAsRead={handleMarkCommentsAsRead}
                        displayMode={behavesAsCoach ? 'hierarchical' : 'flat'}
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

                    {currentView === 'storybook' && isAdmin && (
                      <Storybook />
                    )}
                  </>
                )}
              </div>
            </main>

            {/* V3: Bottom Navigation Athlète (Étape 3) */}
            {showBottomNav && (
              <BottomNav
                activeTab={currentView as 'home' | 'history' | 'stats' | 'coach' | 'profile'}
                onTabChange={handleViewChange}
                userId={currentUser?.id}
              />
            )}

            {/* PR Celebration Modal */}
            {showPRModal && detectedPRs.length > 0 && (
              <PRCelebrationModal
                prs={detectedPRs}
                onClose={() => {
                  setShowPRModal(false);
                  setDetectedPRs([]);
                  setCurrentView('home');
                }}
              />
            )}

          </div>
        </div>
      </DemoTourProvider>
    </ThemeProvider>
  );
};

export default App;
