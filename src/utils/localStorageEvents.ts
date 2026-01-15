/**
 * Utilitaires pour gérer le localStorage avec notification d'événements
 * Permet de notifier les changements dans le même onglet via CustomEvent
 */

export function setLocalStorageWithEvent(key: string, value: string): void {
  localStorage.setItem(key, value);
  // Notifier le changement local (même onglet)
  window.dispatchEvent(new CustomEvent('local-storage-change', {
    detail: { key, value }
  }));
}

export function removeLocalStorageWithEvent(key: string): void {
  localStorage.removeItem(key);
  // Notifier le changement local (même onglet)
  window.dispatchEvent(new CustomEvent('local-storage-change', {
    detail: { key, value: null }
  }));
}
