// ===========================================
// F.Y.T - Hook useUIStatePersistence (DEPRECATED)
// src/hooks/useUIStatePersistence.ts
// DEPRECATED: Utilisez les hooks de useUIState.ts à la place
// Ce fichier est conservé pour compatibilité descendante
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { uiStateStore } from '../stores/UIStateStore';

// ⚠️ DEPRECATED: Ce hook est déprécié
// Utilisez plutôt:
// - useCurrentView() pour la navigation
// - useScrollPersistence(viewName) pour le scroll
// - useExpandedState(key) pour les états expanded
// - useSubScreen<T>(key) pour les sous-écrans
// - useTempData<T>(key) pour les données métier temporaires
// Tous disponibles dans '../hooks/useUIState' ou '../hooks/useSubScreen'

// ===========================================
// TYPES
// ===========================================

export interface UIState {
  currentView: string;
  scrollPositions: Record<string, number>;
  expandedStates: Record<string, boolean>;
  // V3: Persistance des sous-écrans (threads de conversation actifs)
  activeThreads: Record<string, any>;
  lastUpdated: number;
}

const STORAGE_KEY = 'F.Y.T_ui_state';
const SCROLL_THROTTLE_MS = 200;

const DEFAULT_UI_STATE: UIState = {
  currentView: 'home',
  scrollPositions: {},
  expandedStates: {},
  activeThreads: {},
  lastUpdated: Date.now()
};

// ===========================================
// HELPER: Read from localStorage
// ===========================================

function readUIState(): UIState {
  if (typeof window === 'undefined') return DEFAULT_UI_STATE;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Vérifier que les données ne sont pas trop vieilles (24h max)
      const maxAge = 24 * 60 * 60 * 1000;
      if (parsed.lastUpdated && Date.now() - parsed.lastUpdated < maxAge) {
        // Migration: s'assurer que toutes les propriétés existent (anciennes versions)
        return {
          currentView: parsed.currentView || DEFAULT_UI_STATE.currentView,
          scrollPositions: parsed.scrollPositions || {},
          expandedStates: parsed.expandedStates || {},
          activeThreads: parsed.activeThreads || {},
          lastUpdated: parsed.lastUpdated
        };
      }
    }
  } catch (e) {
    console.warn('[UIState] Erreur lecture, reset:', e);
    // En cas d'erreur, nettoyer localStorage pour éviter les boucles
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }

  return DEFAULT_UI_STATE;
}

// ===========================================
// HELPER: Write to localStorage
// ===========================================

function writeUIState(state: UIState): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...state,
      lastUpdated: Date.now()
    }));
  } catch (e) {
    console.warn('[UIState] Erreur écriture:', e);
  }
}

// ===========================================
// HOOK useUIStatePersistence (DEPRECATED)
// Redirige vers le nouveau store singleton pour compatibilité
// ===========================================

/**
 * @deprecated Utilisez les hooks spécialisés de useUIState.ts à la place
 */
export function useUIStatePersistence() {
  console.warn('[useUIStatePersistence] Ce hook est déprécié. Utilisez les hooks de useUIState.ts');

  const [state, setState] = useState<UIState>(readUIState);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRestoringScrollRef = useRef(false);

  // ===========================================
  // Sauvegarder l'état quand il change
  // ===========================================

  useEffect(() => {
    writeUIState(state);
  }, [state]);

  // ===========================================
  // Restaurer la position de scroll quand la vue change
  // ===========================================

  const restoreScrollPosition = useCallback((viewName: string) => {
    const savedPosition = state.scrollPositions[viewName];
    if (savedPosition !== undefined && savedPosition > 0) {
      isRestoringScrollRef.current = true;

      // Stratégie: essayer plusieurs fois avec des délais croissants
      // pour s'assurer que le contenu est rendu
      const attemptRestore = (attempt: number) => {
        window.scrollTo({ top: savedPosition, behavior: 'instant' });

        // Vérifier si le scroll a réussi
        if (window.scrollY < savedPosition - 10 && attempt < 5) {
          // Le contenu n'est peut-être pas encore rendu, réessayer
          setTimeout(() => attemptRestore(attempt + 1), 100 * attempt);
        } else {
          // Scroll réussi ou max attempts atteint
          setTimeout(() => {
            isRestoringScrollRef.current = false;
          }, 200);
        }
      };

      // Premier essai après un court délai pour le rendu initial
      requestAnimationFrame(() => {
        setTimeout(() => attemptRestore(1), 50);
      });
    }
  }, [state.scrollPositions]);

  // ===========================================
  // Sauvegarder la position de scroll (throttled)
  // ===========================================

  const saveScrollPosition = useCallback((viewName: string) => {
    // Ne pas sauvegarder pendant la restauration
    if (isRestoringScrollRef.current) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const scrollY = window.scrollY;
      setState(prev => ({
        ...prev,
        scrollPositions: {
          ...prev.scrollPositions,
          [viewName]: scrollY
        }
      }));
    }, SCROLL_THROTTLE_MS);
  }, []);

  // ===========================================
  // Mettre à jour la vue active
  // ===========================================

  const setCurrentView = useCallback((view: string) => {
    setState(prev => ({
      ...prev,
      currentView: view
    }));
  }, []);

  // ===========================================
  // Gérer les états expanded/collapsed
  // ===========================================

  const setExpandedState = useCallback((key: string, isExpanded: boolean) => {
    setState(prev => ({
      ...prev,
      expandedStates: {
        ...prev.expandedStates,
        [key]: isExpanded
      }
    }));
  }, []);

  const getExpandedState = useCallback((key: string, defaultValue: boolean = false): boolean => {
    return state.expandedStates[key] ?? defaultValue;
  }, [state.expandedStates]);

  const toggleExpandedState = useCallback((key: string, defaultValue: boolean = false) => {
    setState(prev => ({
      ...prev,
      expandedStates: {
        ...prev.expandedStates,
        [key]: !(prev.expandedStates[key] ?? defaultValue)
      }
    }));
  }, []);

  // ===========================================
  // Gérer les threads actifs (sous-écrans)
  // ===========================================

  const setActiveThread = useCallback((key: string, thread: any | null) => {
    setState(prev => {
      const newThreads = { ...prev.activeThreads };
      if (thread === null) {
        delete newThreads[key];
      } else {
        newThreads[key] = thread;
      }
      return {
        ...prev,
        activeThreads: newThreads
      };
    });
  }, []);

  const getActiveThread = useCallback(<T>(key: string): T | null => {
    return (state.activeThreads[key] as T) ?? null;
  }, [state.activeThreads]);

  const clearActiveThread = useCallback((key: string) => {
    setState(prev => {
      const newThreads = { ...prev.activeThreads };
      delete newThreads[key];
      return {
        ...prev,
        activeThreads: newThreads
      };
    });
  }, []);

  // ===========================================
  // Cleanup
  // ===========================================

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return {
    // État
    currentView: state.currentView,
    expandedStates: state.expandedStates,
    scrollPositions: state.scrollPositions,
    activeThreads: state.activeThreads,

    // Actions vue
    setCurrentView,

    // Actions scroll
    saveScrollPosition,
    restoreScrollPosition,

    // Actions expanded
    setExpandedState,
    getExpandedState,
    toggleExpandedState,

    // Actions threads (sous-écrans)
    setActiveThread,
    getActiveThread,
    clearActiveThread
  };
}

// ===========================================
// HOOK useScrollPersistence (DEPRECATED)
// @deprecated Utilisez useScrollPersistence de useUIState.ts
// ===========================================

export function useScrollPersistence(viewName: string) {
  console.warn('[useScrollPersistence] Ce hook est déprécié. Utilisez useScrollPersistence de useUIState.ts');
  const scrollPositionRef = useRef<number>(0);
  const isRestoringRef = useRef(false);

  // Lire la position initiale
  useEffect(() => {
    const state = readUIState();
    const savedPosition = state.scrollPositions[viewName];
    if (savedPosition !== undefined && savedPosition > 0) {
      scrollPositionRef.current = savedPosition;
      isRestoringRef.current = true;

      requestAnimationFrame(() => {
        window.scrollTo(0, savedPosition);
        setTimeout(() => {
          isRestoringRef.current = false;
        }, 100);
      });
    }
  }, [viewName]);

  // Écouter et sauvegarder le scroll
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    const handleScroll = () => {
      if (isRestoringRef.current) return;

      if (timeout) clearTimeout(timeout);

      timeout = setTimeout(() => {
        const scrollY = window.scrollY;
        scrollPositionRef.current = scrollY;

        const state = readUIState();
        writeUIState({
          ...state,
          scrollPositions: {
            ...state.scrollPositions,
            [viewName]: scrollY
          }
        });
      }, SCROLL_THROTTLE_MS);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (timeout) clearTimeout(timeout);
    };
  }, [viewName]);

  return scrollPositionRef.current;
}

// ===========================================
// HOOK useExpandedState (DEPRECATED)
// @deprecated Utilisez useExpandedState de useUIState.ts
// ===========================================

export function useExpandedState(key: string, defaultValue: boolean = false): [boolean, () => void, (value: boolean) => void] {
  console.warn('[useExpandedState] Ce hook est déprécié. Utilisez useExpandedState de useUIState.ts');
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    const state = readUIState();
    return state.expandedStates[key] ?? defaultValue;
  });

  // Sauvegarder quand l'état change
  useEffect(() => {
    const state = readUIState();
    writeUIState({
      ...state,
      expandedStates: {
        ...state.expandedStates,
        [key]: isExpanded
      }
    });
  }, [key, isExpanded]);

  const toggle = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);

  const setValue = useCallback((value: boolean) => {
    setIsExpanded(value);
  }, []);

  return [isExpanded, toggle, setValue];
}

export default useUIStatePersistence;
