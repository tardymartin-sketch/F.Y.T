// ===========================================
// F.Y.T - Hook useUIState
// src/hooks/useUIState.ts
// Hook principal de connexion au store UI
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { uiStateStore, GlobalUIState } from '../stores/UIStateStore';

// ===========================================
// HOOK useUIState - Connexion globale au store
// ===========================================

export function useUIState() {
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // S'abonner aux changements du store
    return uiStateStore.subscribe(() => {
      forceUpdate({});
    });
  }, []);

  return {
    // État
    state: uiStateStore.getState(),
    currentView: uiStateStore.getView(),

    // Actions vue
    setView: uiStateStore.setView.bind(uiStateStore),

    // Actions sous-écrans
    setSubScreen: uiStateStore.setSubScreen.bind(uiStateStore),
    getSubScreen: uiStateStore.getSubScreen.bind(uiStateStore),
    clearSubScreen: uiStateStore.clearSubScreen.bind(uiStateStore),

    // Actions scroll
    setScrollPosition: uiStateStore.setScrollPosition.bind(uiStateStore),
    getScrollPosition: uiStateStore.getScrollPosition.bind(uiStateStore),

    // Actions expanded
    setExpanded: uiStateStore.setExpanded.bind(uiStateStore),
    getExpanded: uiStateStore.getExpanded.bind(uiStateStore),
    toggleExpanded: uiStateStore.toggleExpanded.bind(uiStateStore),

    // Actions données métier
    setTempData: uiStateStore.setTempData.bind(uiStateStore),
    getTempData: uiStateStore.getTempData.bind(uiStateStore),
    clearTempData: uiStateStore.clearTempData.bind(uiStateStore),

    // Utilitaires
    forceSave: uiStateStore.forceSave.bind(uiStateStore),
    reset: uiStateStore.reset.bind(uiStateStore)
  };
}

// ===========================================
// HOOK useCurrentView - Vue courante uniquement
// Gère aussi l'historique du navigateur pour le bouton retour mobile
// ===========================================

export function useCurrentView(): [string, (view: string) => void] {
  const [view, setViewState] = useState(() => uiStateStore.getView());
  const isPopStateNavigation = useRef(false);

  // Écouter le bouton retour du navigateur (popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.view) {
        // Retour vers une vue précédente de l'app
        isPopStateNavigation.current = true;
        uiStateStore.setView(event.state.view);
      } else {
        // Pas d'état → retour à l'accueil
        isPopStateNavigation.current = true;
        uiStateStore.setView('home');
      }
    };

    window.addEventListener('popstate', handlePopState);

    // Initialiser l'état actuel dans l'historique (sans ajouter d'entrée)
    const currentView = uiStateStore.getView();
    history.replaceState({ view: currentView }, '', `#${currentView}`);

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // S'abonner aux changements du store
  useEffect(() => {
    return uiStateStore.subscribe(() => {
      const newView = uiStateStore.getView();
      if (newView !== view) {
        setViewState(newView);
      }
    });
  }, [view]);

  const setView = useCallback((newView: string) => {
    const currentView = uiStateStore.getView();

    // Ne pas dupliquer si même vue
    if (newView !== currentView) {
      // Si c'est une navigation via popstate, ne pas re-pousser dans l'historique
      if (!isPopStateNavigation.current) {
        history.pushState({ view: newView }, '', `#${newView}`);
      }
      isPopStateNavigation.current = false;
    }

    uiStateStore.setView(newView);
  }, []);

  return [view, setView];
}

// ===========================================
// HOOK useScrollPersistence - Position de scroll
// ===========================================

export function useScrollPersistence(viewName: string) {
  const isRestoringRef = useRef(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restaurer la position au montage
  useEffect(() => {
    const savedPosition = uiStateStore.getScrollPosition(viewName);

    if (savedPosition > 0) {
      isRestoringRef.current = true;

      // Stratégie multi-essais pour s'assurer que le contenu est rendu
      const attemptRestore = (attempt: number) => {
        window.scrollTo({ top: savedPosition, behavior: 'instant' });

        // Vérifier si le scroll a réussi
        if (window.scrollY < savedPosition - 10 && attempt < 5) {
          setTimeout(() => attemptRestore(attempt + 1), 100 * attempt);
        } else {
          setTimeout(() => {
            isRestoringRef.current = false;
          }, 200);
        }
      };

      requestAnimationFrame(() => {
        setTimeout(() => attemptRestore(1), 50);
      });
    }
  }, [viewName]);

  // Écouter et sauvegarder le scroll
  useEffect(() => {
    const handleScroll = () => {
      if (isRestoringRef.current) return;

      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      scrollTimeoutRef.current = setTimeout(() => {
        uiStateStore.setScrollPosition(viewName, window.scrollY);
      }, 200);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [viewName]);

  return uiStateStore.getScrollPosition(viewName);
}

// ===========================================
// HOOK useExpandedState - État expanded/collapsed
// ===========================================

export function useExpandedState(
  key: string,
  defaultValue: boolean = false
): [boolean, () => void, (value: boolean) => void] {
  const [isExpanded, setIsExpandedState] = useState(() =>
    uiStateStore.getExpanded(key, defaultValue)
  );

  useEffect(() => {
    return uiStateStore.subscribe(() => {
      const newValue = uiStateStore.getExpanded(key, defaultValue);
      if (newValue !== isExpanded) {
        setIsExpandedState(newValue);
      }
    });
  }, [key, defaultValue, isExpanded]);

  const toggle = useCallback(() => {
    uiStateStore.toggleExpanded(key, defaultValue);
  }, [key, defaultValue]);

  const setValue = useCallback((value: boolean) => {
    uiStateStore.setExpanded(key, value);
  }, [key]);

  return [isExpanded, toggle, setValue];
}

// ===========================================
// HOOK useTempData - Données métier temporaires
// ===========================================

export function useTempData<T>(key: string): [T | null, (data: T | null) => void] {
  const [data, setDataState] = useState<T | null>(() =>
    uiStateStore.getTempData<T>(key)
  );

  useEffect(() => {
    return uiStateStore.subscribe(() => {
      const newData = uiStateStore.getTempData<T>(key);
      // Comparaison JSON pour éviter les re-renders inutiles
      if (JSON.stringify(newData) !== JSON.stringify(data)) {
        setDataState(newData);
      }
    });
  }, [key, data]);

  const setData = useCallback((newData: T | null) => {
    uiStateStore.setTempData(key, newData);
  }, [key]);

  return [data, setData];
}

// Export par défaut
export default useUIState;
