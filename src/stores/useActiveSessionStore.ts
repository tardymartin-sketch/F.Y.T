import { create } from 'zustand';
import { WorkoutRow, SessionLog } from '../../types';
import { removeLocalStorageWithEvent } from '../utils/localStorageEvents';

interface ActiveSessionState {
  activeSessionData: WorkoutRow[] | null;
  editingSession: SessionLog | null;
  hasActiveSession: boolean;
  setActiveSession: (data: WorkoutRow[] | null, initialLog?: SessionLog | null) => void;
  clearActiveSession: () => void;
  syncWithLocalStorage: () => void;
}

export const useActiveSessionStore = create<ActiveSessionState>((set) => ({
  activeSessionData: null,
  editingSession: null,
  hasActiveSession: false,

  setActiveSession: (data, initialLog = null) => {
    set({
      activeSessionData: data,
      editingSession: initialLog,
      hasActiveSession: !!data,
    });
  },

  clearActiveSession: () => {
    removeLocalStorageWithEvent('F.Y.T_active_session');
    set({
      activeSessionData: null,
      editingSession: null,
      hasActiveSession: false,
    });
  },

  syncWithLocalStorage: () => {
    const savedSession = localStorage.getItem('F.Y.T_active_session');
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.sessionData && parsed.logs) {
          // Note: On ne met pas forcément à jour activeSessionData ici car 
          // App.tsx le gère encore au démarrage, mais on marque hasActiveSession
          set({ hasActiveSession: true });
        }
      } catch (e) {
        console.error('Erreur parsing session sauvegardée:', e);
        removeLocalStorageWithEvent('F.Y.T_active_session');
        set({ hasActiveSession: false });
      }
    } else {
      set({ hasActiveSession: false });
    }
  },
}));
