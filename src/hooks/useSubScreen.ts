// ===========================================
// F.Y.T - Hook useSubScreen
// src/hooks/useSubScreen.ts
// Hook spécialisé pour les sous-écrans (threads, détails, etc.)
// ===========================================

import { useState, useEffect, useCallback } from 'react';
import { uiStateStore } from '../stores/UIStateStore';

// ===========================================
// CLÉS STANDARDISÉES
// ===========================================

export const SUB_SCREEN_KEYS = {
  // Threads de conversation
  COACH_TAB_THREAD: 'coach-tab-thread',
  COACH_CONVERSATIONS_THREAD: 'coach-conversations-thread',

  // Sessions actives
  ACTIVE_SESSION_THREAD: 'active-session-thread',

  // Vues équipe
  TEAM_VIEW_ATHLETE: 'team-view-athlete',

  // Autres sous-écrans
  HISTORY_DETAIL: 'history-detail',
  EXERCISE_DETAIL: 'exercise-detail'
} as const;

export type SubScreenKey = typeof SUB_SCREEN_KEYS[keyof typeof SUB_SCREEN_KEYS];

// ===========================================
// HOOK useSubScreen
// Usage: const [thread, setThread] = useSubScreen<Conversation>('coach-tab-thread');
// ===========================================

export function useSubScreen<T>(key: string): [T | null, (value: T | null) => void] {
  // État local initialisé depuis le store
  const [value, setValueState] = useState<T | null>(() =>
    uiStateStore.getSubScreen<T>(key)
  );

  // S'abonner aux changements du store
  useEffect(() => {
    return uiStateStore.subscribe(() => {
      const storeValue = uiStateStore.getSubScreen<T>(key);
      // Comparaison JSON pour éviter les re-renders inutiles
      const currentJson = JSON.stringify(value);
      const storeJson = JSON.stringify(storeValue);
      if (currentJson !== storeJson) {
        setValueState(storeValue);
      }
    });
  }, [key, value]);

  // Setter qui met à jour le store
  const setValue = useCallback((newValue: T | null) => {
    uiStateStore.setSubScreen(key, newValue);
  }, [key]);

  return [value, setValue];
}

// ===========================================
// HOOK useSubScreenWithValidation
// Avec fonction de validation pour restauration sécurisée
// ===========================================

export function useSubScreenWithValidation<T>(
  key: string,
  validator: (value: any) => value is T
): [T | null, (value: T | null) => void] {
  // État local avec validation
  const [value, setValueState] = useState<T | null>(() => {
    const stored = uiStateStore.getSubScreen<T>(key);
    if (stored && validator(stored)) {
      return stored;
    }
    // Si invalide, nettoyer le store
    if (stored !== null) {
      uiStateStore.clearSubScreen(key);
    }
    return null;
  });

  // S'abonner aux changements du store
  useEffect(() => {
    return uiStateStore.subscribe(() => {
      const storeValue = uiStateStore.getSubScreen<T>(key);

      // Valider avant d'accepter
      if (storeValue === null) {
        if (value !== null) {
          setValueState(null);
        }
      } else if (validator(storeValue)) {
        const currentJson = JSON.stringify(value);
        const storeJson = JSON.stringify(storeValue);
        if (currentJson !== storeJson) {
          setValueState(storeValue);
        }
      } else {
        // Valeur invalide, nettoyer
        uiStateStore.clearSubScreen(key);
        if (value !== null) {
          setValueState(null);
        }
      }
    });
  }, [key, value, validator]);

  // Setter qui met à jour le store
  const setValue = useCallback((newValue: T | null) => {
    if (newValue === null || validator(newValue)) {
      uiStateStore.setSubScreen(key, newValue);
    }
  }, [key, validator]);

  return [value, setValue];
}

// ===========================================
// HELPER: Créer un validator typé
// ===========================================

export function createValidator<T>(
  check: (value: any) => boolean
): (value: any) => value is T {
  return (value: any): value is T => check(value);
}

// ===========================================
// VALIDATORS PRÉ-DÉFINIS
// ===========================================

// Validator pour Conversation (CoachTab)
export const isValidConversation = createValidator<{
  id: string;
  exerciseName: string;
}>((value) =>
  value &&
  typeof value === 'object' &&
  typeof value.id === 'string' &&
  typeof value.exerciseName === 'string'
);

// Validator pour PersistedThread (CoachConversationsView)
// Structure: { athlete: { oderId: string }, session: { exerciseName: string } }
export const isValidPersistedThread = createValidator<{
  athlete: { oderId: string };
  session: { exerciseName: string };
}>((value) =>
  value &&
  typeof value === 'object' &&
  value.athlete &&
  typeof value.athlete.oderId === 'string' &&
  value.session &&
  typeof value.session.exerciseName === 'string'
);

// Validator générique pour string
export const isValidString = createValidator<string>(
  (value) => typeof value === 'string' && value.length > 0
);

// Export par défaut
export default useSubScreen;
