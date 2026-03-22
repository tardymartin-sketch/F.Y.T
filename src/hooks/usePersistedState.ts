// ===========================================
// F.Y.T - Hook usePersistedState
// src/hooks/usePersistedState.ts
// Remplacement drop-in de useState avec persistance automatique
// ===========================================

import { useState, useEffect, useCallback, useRef } from 'react';
import { uiStateStore } from '../stores/UIStateStore';

// ===========================================
// WRAPPER INTERNE
// Permet de distinguer null-comme-valeur de clé-absente
// (car UIStateStore.setTempData(key, null) supprime la clé)
// ===========================================

interface PersistedWrapper<T> {
  __p: 1;  // Marqueur (court pour économiser l'espace localStorage)
  v: T;    // La valeur réelle
}

function wrap<T>(value: T): PersistedWrapper<T> {
  return { __p: 1, v: value };
}

function isWrapped<T>(data: unknown): data is PersistedWrapper<T> {
  return (
    data !== null &&
    typeof data === 'object' &&
    (data as PersistedWrapper<T>).__p === 1 &&
    'v' in (data as PersistedWrapper<T>)
  );
}

function readFromStore<T>(key: string, defaultValue: T): T {
  const raw = uiStateStore.getTempData<PersistedWrapper<T>>(key);
  if (raw !== null && isWrapped<T>(raw)) {
    return raw.v;
  }
  return defaultValue;
}

// ===========================================
// HOOK usePersistedState
// API identique à useState, avec persistance dans UIStateStore.tempData
//
// Convention de nommage des clés : 'composant:champ'
// Exemples : 'library:activeTab', 'stats:activeSection', 'team:selectedAthleteId'
// ===========================================

export function usePersistedState<T>(
  key: string,
  defaultValue: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialiser depuis le store ou utiliser la valeur par défaut
  const [value, setValueInternal] = useState<T>(() => readFromStore(key, defaultValue));

  // Ref pour avoir toujours la valeur courante dans les callbacks
  const valueRef = useRef(value);
  valueRef.current = value;

  // Ref pour la clé (éviter les re-souscriptions inutiles)
  const keyRef = useRef(key);
  keyRef.current = key;

  // Ref pour le defaultValue
  const defaultRef = useRef(defaultValue);
  defaultRef.current = defaultValue;

  // S'abonner aux changements du store — ne re-render que si NOTRE clé change
  useEffect(() => {
    return uiStateStore.subscribe(() => {
      const storeValue = readFromStore(keyRef.current, defaultRef.current);
      // Comparaison JSON pour éviter les re-renders inutiles
      // (même pattern que useTempData dans useUIState.ts)
      const currentJson = JSON.stringify(valueRef.current);
      const storeJson = JSON.stringify(storeValue);
      if (currentJson !== storeJson) {
        setValueInternal(storeValue);
      }
    });
  }, [key]);

  // Setter compatible useState (supporte valeur directe ET functional update)
  const setValue: React.Dispatch<React.SetStateAction<T>> = useCallback(
    (action: React.SetStateAction<T>) => {
      const newValue =
        typeof action === 'function'
          ? (action as (prev: T) => T)(valueRef.current)
          : action;

      // Écrire la valeur wrappée dans le store (déclenche notify → save debounced)
      uiStateStore.setTempData(keyRef.current, wrap(newValue));
    },
    [key]
  );

  return [value, setValue];
}

// ===========================================
// UTILITAIRE - Nettoyage explicite
// ===========================================

export function clearPersistedState(key: string): void {
  uiStateStore.clearTempData(key);
}
