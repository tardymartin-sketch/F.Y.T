import { create } from 'zustand';
import { Session } from '@supabase/supabase-js';
import { User } from '../../types';
import { supabase } from '../supabaseClient';
import { authApi } from '../services/api/auth.api';

interface AuthState {
  session: Session | null;
  currentUser: User | null;
  authLoading: boolean;
  hasLinkedAthletes: boolean;
  setSession: (session: Session | null) => void;
  setAuthLoading: (loading: boolean) => void;
  loadUserProfile: () => Promise<void>;
  signOut: () => Promise<void>;
  initialize: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  currentUser: null,
  authLoading: true,
  hasLinkedAthletes: false,

  setSession: (session) => {
    set({ session });
    if (session) {
      get().loadUserProfile();
    } else {
      set({ currentUser: null, hasLinkedAthletes: false, authLoading: false });
    }
  },

  setAuthLoading: (loading) => set({ authLoading: loading }),

  loadUserProfile: async () => {
    const { session } = get();
    if (!session?.user?.id) return;

    try {
      const [profile, hasAthletes] = await Promise.all([
        authApi.getUserProfile(session.user.id),
        authApi.hasAthletes(session.user.id)
      ]);
      
      set({ 
        currentUser: profile, 
        hasLinkedAthletes: hasAthletes,
        authLoading: false 
      });
    } catch (error) {
      console.error("Erreur chargement profil:", error);
      set({ authLoading: false });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ session: null, currentUser: null, hasLinkedAthletes: false });
  },

  initialize: async () => {
    // 1. Tenter de récupérer la session initiale
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      await get().setSession(session);
    } else {
      set({ authLoading: false });
    }

    // 2. Écouter les changements futurs
    supabase.auth.onAuthStateChange((_event, session) => {
      get().setSession(session);
    });
  }
}));
