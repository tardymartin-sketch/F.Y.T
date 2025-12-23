import React, { useState, useEffect } from 'react';
import { WorkoutRow, SessionLog, User } from './types';
import { Sidebar } from './src/components/Sidebar';
import { Home } from './src/components/Home';
import { ActiveSession } from './src/components/ActiveSession';
import { History } from './src/components/History';
import { SettingsView } from './src/components/SettingsView';
import { TeamView } from './src/components/TeamView';
import { AdminUsersView } from './src/components/AdminUsersView';
import { Menu } from 'lucide-react';

// --- IMPORTS SUPABASE ---
import { supabase } from './supabaseClient';
import { Auth } from './src/components/Auth';
import { Session } from '@supabase/supabase-js';

// Dummy data pour les tests
import { DUMMY_DATA } from './src/utils/csv';

// --- CONFIGURATION ---
const CONFIG_VERSION = 18; // V3.7

const App: React.FC = () => {
    // --- Gestion Session & Auth ---
    const [session, setSession] = useState<Session | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
  
    // --- États existants de l'app ---
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [currentView, setCurrentView] = useState<string>('home');
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    
    // Data States
    const [activeSession, setActiveSession] = useState<WorkoutRow[] | null>(null);
    const [activeSessionLog, setActiveSessionLog] = useState<SessionLog | null>(null);
    const [history, setHistory] = useState<SessionLog[]>([]);
  
    // --- EFFET : Initialisation & Écoute Supabase ---
    useEffect(() => {
      // 1. Vérifier la session active
      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        if (session) fetchUserProfile(session.user.id);
        else setAuthLoading(false);
      });
  
      // 2. Écouter les changements de session
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session) {
          fetchUserProfile(session.user.id);
        } else {
          setCurrentUser(null);
          setAuthLoading(false);
        }
      });
  
      return () => subscription.unsubscribe();
    }, []);
  
    // --- Fonction pour récupérer le profil utilisateur depuis la table 'profiles' ---
    const fetchUserProfile = async (userId: string) => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();
  
        if (error) throw error;
  
        if (data) {
          setCurrentUser({
            username: data.username || data.email,
            role: data.role || 'athlete',
            firstName: data.first_name || '',
          });
        }
      } catch (error) {
        console.error("Erreur chargement profil:", error);
      } finally {
        setAuthLoading(false);
      }
    };
  
    // --- Handlers ---
    const handleSignOut = async () => {
      await supabase.auth.signOut();
      setCurrentView('home');
      setIsSidebarOpen(false);
    };
  
    const getGreeting = () => {
      const hour = new Date().getHours();
      if (hour < 12) return "Bonjour";
      if (hour < 18) return "Bon après-midi";
      return "Bonsoir";
    };
  
    // --- RENDU : Protection de l'accès ---
  
    // 1. Chargement initial
    if (authLoading) {
      return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-8 w-8 bg-blue-600 rounded mb-4"></div>
            Chargement UltiPrepa...
          </div>
        </div>
      );
    }
  
    // 2. Si pas connecté -> Écran Auth
    if (!session || !currentUser) {
      return <Auth />;
    }
  
    // 3. Application Principale
    const isAdmin = currentUser.role === 'admin' || currentUser.role === 'coach';
  
    return (
      <div className="flex min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30">
        
        {/* Mobile Menu Overlay */}
        {isSidebarOpen && (
          <div 
            className="fixed inset-0 bg-black/50 z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
  
        {/* Sidebar */}
        <div className={`fixed lg:static inset-y-0 left-0 z-30 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
          <Sidebar 
            currentView={currentView}
            setCurrentView={(view) => { setCurrentView(view); setIsSidebarOpen(false); }}
            isAdmin={isAdmin}
            onLogout={handleSignOut}
            user={currentUser}
          />
        </div>
  
        {/* Main Content */}
        <div className="flex-1 flex flex-col h-screen overflow-hidden relative w-full">
          
          {/* Mobile Header */}
          <div className="lg:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white">
                  UP
               </div>
               <span className="font-bold text-white">UltiPrepa</span>
            </div>
            <button onClick={() => setIsSidebarOpen(true)} className="p-2 text-slate-400">
              <Menu size={24} />
            </button>
          </div>
  
          {/* Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Header (Greeting) */}
              {currentView === 'home' && (
                 <header className="mb-8">
                    <h1 className="text-3xl font-bold text-white mb-1">
                      {getGreeting()}, <span className="text-blue-400">{currentUser.firstName || currentUser.username}</span>
                    </h1>
                    <p className="text-slate-400">Prêt à atteindre tes objectifs aujourd'hui ?</p>
                 </header>
              )}
  
              {/* View Routing */}
              {currentView === 'home' && (
                <Home 
                   onStartSession={() => {
                      setActiveSession(DUMMY_DATA); 
                      setCurrentView('active');
                   }}
                   lastSession={null}
                   weeklyFrequency={0}
                />
              )}
  
              {currentView === 'active' && activeSession && (
                <ActiveSession 
                  sessionData={activeSession}
                  history={history}
                  onSave={async (log) => {
                     console.log("Sauvegarde locale (DB bientôt)...", log);
                     setHistory([log, ...history]);
                     setActiveSession(null);
                     setCurrentView('history');
                  }}
                  onCancel={() => {
                     setActiveSession(null);
                     setCurrentView('home');
                  }}
                  initialLog={activeSessionLog}
                />
              )}
  
              {currentView === 'history' && (
                <History 
                  history={history}
                  onDelete={(id) => console.log("Delete", id)}
                  onEdit={(log) => console.log("Edit", log)}
                />
              )}
              
              {currentView === 'team' && <TeamView />}
              
              {currentView === 'admin' && isAdmin && (
                  <AdminUsersView 
                      fetchAllUsers={async () => []}
                      onUpdateCoach={async () => {}}
                  />
              )}
              
              {currentView === 'settings' && <SettingsView user={currentUser} />}
  
            </div>
          </div>
        </div>
      </div>
    );
};
  
export default App;
