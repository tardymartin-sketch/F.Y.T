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
  // New imports for Week Organizer and Comments
  fetchWeekOrganizerLogs,
  fetchActiveWeekOrganizer,
  saveWeekOrganizerLog,
  deleteWeekOrganizerLog,
  fetchTeamComments,
  saveAthleteComment,
  markCommentsAsRead
} from './src/services/supabaseService';

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
  const [dataLoading, setDataLoading] = useState(false);

  // Session State
  const [activeSessionData, setActiveSessionData] = useState<WorkoutRow[] | null>(null);
  const [editingSession, setEditingSession] = useState<SessionLog | null>(null);

  // Filters
  const [filters, setFilters] = useState<FilterState>({
    selectedAnnee: null,
    selectedMois: null,
    selectedSemaine: null,
    selectedSeances: []
  });

  // Week Organizer State
  const [activeWeekOrganizer, setActiveWeekOrganizer] = useState<WeekOrganizerLog | null>(null);
  const [pastWeekOrganizers, setPastWeekOrganizers] = useState<WeekOrganizerLog[]>([]);

  // ===========================================
  // AUTHENTICATION EFFECTS
  // ===========================================

  useEffect(() => {
    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserProfile(session.user.id);
      } else {
        setAuthLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserProfile(session.user.id);
      } else {
        setCurrentUser(null);
        setAuthLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ===========================================
  // DATA LOADING
  // ===========================================

  const loadUserProfile = async (userId: string) => {
    try {
      const profile = await fetchCurrentUserProfile();
      if (profile) {
        setCurrentUser(profile);
        await loadInitialData(profile.id);
      }
    } catch (error) {
      console.error("Erreur chargement profil:", error);
    } finally {
      setAuthLoading(false);
    }
  };

  const loadInitialData = async (userId: string) => {
    setDataLoading(true);
    try {
      // Load training plans
      const plans = await fetchTrainingPlans();
      setTrainingData(plans);

      // Load user history
      const logs = await fetchSessionLogs(userId);
      setHistory(logs);
    } catch (error) {
      console.error("Erreur chargement données:", error);
    } finally {
      setDataLoading(false);
    }
  };

  // Load week organizer for athletes (when they have a coach)
  useEffect(() => {
    const loadWeekOrganizer = async () => {
      if (!currentUser || !currentUser.coachId) return;
      
      try {
        // Load active organizer
        const active = await fetchActiveWeekOrganizer(currentUser.coachId);
        setActiveWeekOrganizer(active);
        
        // Load past organizers
        const all = await fetchWeekOrganizerLogs(currentUser.coachId);
        const past = all.filter(o => {
          const endDate = new Date(o.endDate);
          return endDate < new Date() || o.id !== active?.id;
        }).slice(0, 5);
        setPastWeekOrganizers(past);
      } catch (error) {
        console.error("Erreur chargement week organizer:", error);
      }
    };
    
    loadWeekOrganizer();
  }, [currentUser]);

  // ===========================================
  // HANDLERS
  // ===========================================

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setCurrentView('home');
    setIsSidebarOpen(false);
    setTrainingData([]);
    setHistory([]);
  };

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
    }
  };

  const handleSaveSession = async (log: SessionLog) => {
    if (!currentUser) return;

    try {
      const savedLog = await saveSessionLog(log, currentUser.id);
      
      // Update local state
      setHistory(prev => {
        const filtered = prev.filter(h => h.id !== savedLog.id);
        return [savedLog, ...filtered].sort((a, b) => 
          new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });

      setActiveSessionData(null);
      setEditingSession(null);
      setCurrentView('history');
    } catch (error) {
      console.error("Erreur sauvegarde:", error);
      throw error;
    }
  };

  const handleCancelSession = () => {
    setActiveSessionData(null);
    setEditingSession(null);
    setCurrentView('home');
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSessionLog(sessionId);
      setHistory(prev => prev.filter(h => h.id !== sessionId));
    } catch (error) {
      console.error("Erreur suppression:", error);
    }
  };

  const handleEditSession = (log: SessionLog) => {
    // Reconstruct session data from training plans
    const sessionData = trainingData.filter(d =>
      d.annee === log.sessionKey.annee &&
      d.semaine === log.sessionKey.semaine &&
      log.sessionKey.seance.split('+').includes(d.seance)
    );

    if (sessionData.length > 0) {
      setActiveSessionData(sessionData);
      setEditingSession(log);
      setCurrentView('active');
    } else {
      // Fallback: create minimal session data from log
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
    await saveAthleteComment(currentUser.id, sessionId, exerciseName, comment);
  };

  // ===========================================
  // RENDER
  // ===========================================

  // Loading state
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Not authenticated
  if (!session || !currentUser) {
    return <Auth />;
  }

  // Main app
  const isAdmin = currentUser.role === 'admin';
  const isCoach = currentUser.role === 'coach';

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-200">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        setCurrentView={setCurrentView}
        isAdmin={isAdmin}
        isCoach={isCoach}
        onLogout={handleSignOut}
        user={currentUser}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-0">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 z-20 bg-slate-950/95 backdrop-blur-xl border-b border-slate-800 px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="font-bold text-white">F.Y.T</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {dataLoading && currentView === 'home' ? (
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
                    activeWeekOrganizer={activeWeekOrganizer}
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
                    onLogout={handleSignOut}
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
    </div>
  );
};

export default App;

