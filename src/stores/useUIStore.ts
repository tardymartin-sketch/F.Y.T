import { create } from 'zustand';

export type AppView = 'home' | 'history' | 'stats' | 'coach' | 'profile' | 'active' | 'library' | 'import' | 'team' | 'settings' | 'admin' | 'storybook' | 'messages';

interface UIState {
  currentView: AppView;
  setCurrentView: (view: AppView) => void;
  targetExerciseName: string | null;
  targetMessageId: string | null;
  targetSessionLogId: string | null;
  targetHistoryExerciseName: string | null;
  targetHistoryDate: string | null;
  setNavigationTargets: (targets: Partial<{
    targetExerciseName: string | null,
    targetMessageId: string | null,
    targetSessionLogId: string | null,
    targetHistoryExerciseName: string | null,
    targetHistoryDate: string | null
  }>) => void;
  resetNavigationTargets: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  currentView: 'home',
  setCurrentView: (view) => set({ currentView: view }),
  
  targetExerciseName: null,
  targetMessageId: null,
  targetSessionLogId: null,
  targetHistoryExerciseName: null,
  targetHistoryDate: null,

  setNavigationTargets: (targets) => set((state) => ({ ...state, ...targets })),
  
  resetNavigationTargets: () => set({
    targetExerciseName: null,
    targetMessageId: null,
    targetSessionLogId: null,
    targetHistoryExerciseName: null,
    targetHistoryDate: null,
  }),
}));
