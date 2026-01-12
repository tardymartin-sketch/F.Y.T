// ===========================================
// F.Y.T - Hook useLocalStorage
// src/hooks/useLocalStorage.ts
// Persistence localStorage avec synchronisation
// ===========================================

import { useState, useEffect, useCallback } from 'react';

// ===========================================
// TYPES
// ===========================================

type SetValue<T> = T | ((prevValue: T) => T);

// ===========================================
// HOOK useLocalStorage
// ===========================================

/**
 * Hook pour synchroniser un état avec localStorage
 * Gère la sérialisation/désérialisation JSON automatiquement
 * Se synchronise entre onglets
 * 
 * @param key - Clé de stockage dans localStorage
 * @param initialValue - Valeur par défaut si rien n'est stocké
 * @returns [value, setValue, removeValue] - Tuple avec la valeur, setter et fonction de suppression
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  // Fonction pour lire la valeur depuis localStorage
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.localStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Erreur lecture localStorage "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  // État local synchronisé avec localStorage
  const [storedValue, setStoredValue] = useState<T>(readValue);

  // Setter qui met à jour localStorage et l'état
  const setValue = useCallback(
    (value: SetValue<T>) => {
      if (typeof window === 'undefined') {
        console.warn('localStorage non disponible (SSR)');
        return;
      }

      try {
        // Permettre une fonction comme valeur (comme useState)
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;

        // Sauvegarder dans localStorage
        window.localStorage.setItem(key, JSON.stringify(valueToStore));

        // Mettre à jour l'état
        setStoredValue(valueToStore);

        // Dispatcher un event pour synchroniser les autres onglets/composants
        window.dispatchEvent(
          new StorageEvent('storage', {
            key,
            newValue: JSON.stringify(valueToStore),
          })
        );
      } catch (error) {
        console.warn(`Erreur écriture localStorage "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Fonction pour supprimer la valeur
  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return;

    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);

      window.dispatchEvent(
        new StorageEvent('storage', {
          key,
          newValue: null,
        })
      );
    } catch (error) {
      console.warn(`Erreur suppression localStorage "${key}":`, error);
    }
  }, [key, initialValue]);

  // Écouter les changements depuis d'autres onglets
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          setStoredValue(JSON.parse(event.newValue));
        } catch {
          setStoredValue(initialValue);
        }
      } else if (event.key === key && event.newValue === null) {
        setStoredValue(initialValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ===========================================
// HOOK useSessionStorage (variante session)
// ===========================================

/**
 * Même API que useLocalStorage mais avec sessionStorage
 * Les données sont perdues à la fermeture de l'onglet
 */
export function useSessionStorage<T>(
  key: string,
  initialValue: T
): [T, (value: SetValue<T>) => void, () => void] {
  const readValue = useCallback((): T => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    try {
      const item = window.sessionStorage.getItem(key);
      return item ? (JSON.parse(item) as T) : initialValue;
    } catch (error) {
      console.warn(`Erreur lecture sessionStorage "${key}":`, error);
      return initialValue;
    }
  }, [key, initialValue]);

  const [storedValue, setStoredValue] = useState<T>(readValue);

  const setValue = useCallback(
    (value: SetValue<T>) => {
      if (typeof window === 'undefined') return;

      try {
        const valueToStore =
          value instanceof Function ? value(storedValue) : value;
        window.sessionStorage.setItem(key, JSON.stringify(valueToStore));
        setStoredValue(valueToStore);
      } catch (error) {
        console.warn(`Erreur écriture sessionStorage "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  const removeValue = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(key);
    setStoredValue(initialValue);
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
}

// ===========================================
// CONSTANTES CLÉS F.Y.T
// ===========================================

export const STORAGE_KEYS = {
  ACTIVE_SESSION: 'F.Y.T_active_session',
  ACTIVE_MODE: 'F.Y.T_active_mode',
  USER_PREFERENCES: 'F.Y.T_user_preferences',
  THEME: 'F.Y.T_theme',
  LAST_VIEW: 'F.Y.T_last_view',
  ONBOARDING_COMPLETED: 'F.Y.T_onboarding_completed',
} as const;

// ===========================================
// HOOKS SPÉCIFIQUES F.Y.T
// ===========================================

export interface ActiveSessionData {
  sessionData: any[];
  logs: any;
  startTime: number;
  currentExerciseIndex: number;
}

/**
 * Hook spécifique pour la gestion de la session active
 */
export function useActiveSession() {
  return useLocalStorage<ActiveSessionData | null>(
    STORAGE_KEYS.ACTIVE_SESSION,
    null
  );
}

export interface UserPreferences {
  hapticFeedback: boolean;
  soundEffects: boolean;
  autoStartTimer: boolean;
  showTutorials: boolean;
}

const DEFAULT_PREFERENCES: UserPreferences = {
  hapticFeedback: true,
  soundEffects: false,
  autoStartTimer: true,
  showTutorials: true,
};

/**
 * Hook pour les préférences utilisateur
 */
export function useUserPreferences() {
  return useLocalStorage<UserPreferences>(
    STORAGE_KEYS.USER_PREFERENCES,
    DEFAULT_PREFERENCES
  );
}
