// ===========================================
// F.Y.T - UIStateStore (Singleton)
// src/stores/UIStateStore.ts
// Store global pour la persistance de l'état UI
// ===========================================

const STORAGE_KEY = 'F.Y.T_ui_state_v2';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

// ===========================================
// TYPES
// ===========================================

export interface GlobalUIState {
  // Version pour migrations futures
  version: number;

  // Navigation principale
  currentView: string;

  // Sous-écrans actifs par composant
  subScreens: Record<string, any>;

  // Positions de scroll par clé
  scrollPositions: Record<string, number>;

  // États expanded/collapsed
  expandedStates: Record<string, boolean>;

  // Données métier temporaires
  tempData: Record<string, any>;

  // Timestamp
  lastUpdated: number;
}

const DEFAULT_STATE: GlobalUIState = {
  version: 2,
  currentView: 'home',
  subScreens: {},
  scrollPositions: {},
  expandedStates: {},
  tempData: {},
  lastUpdated: Date.now()
};

// ===========================================
// STORE SINGLETON
// ===========================================

class UIStateStore {
  private state: GlobalUIState;
  private listeners: Set<() => void> = new Set();
  private saveTimeout: ReturnType<typeof setTimeout> | null = null;
  private isInitialized = false;

  constructor() {
    this.state = this.load();
    this.setupAutoSave();
    this.isInitialized = true;
  }

  // ===========================================
  // PERSISTENCE
  // ===========================================

  private load(): GlobalUIState {
    if (typeof window === 'undefined') return { ...DEFAULT_STATE };

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Vérifier que les données ne sont pas trop vieilles
        if (parsed.lastUpdated && Date.now() - parsed.lastUpdated < MAX_AGE_MS) {
          // Migration depuis version 1 ou données incomplètes
          return {
            version: parsed.version || 2,
            currentView: parsed.currentView || DEFAULT_STATE.currentView,
            subScreens: parsed.subScreens || parsed.activeThreads || {},
            scrollPositions: parsed.scrollPositions || {},
            expandedStates: parsed.expandedStates || {},
            tempData: parsed.tempData || {},
            lastUpdated: parsed.lastUpdated
          };
        }
      }
    } catch (e) {
      console.warn('[UIStateStore] Erreur lecture, reset:', e);
      // Nettoyer en cas d'erreur
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
    }

    return { ...DEFAULT_STATE };
  }

  private save(): void {
    if (typeof window === 'undefined') return;

    try {
      this.state.lastUpdated = Date.now();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.warn('[UIStateStore] Erreur écriture:', e);
    }
  }

  private setupAutoSave(): void {
    if (typeof window === 'undefined') return;

    // Sauvegarde AVANT fermeture de page
    window.addEventListener('beforeunload', () => {
      this.forceSave();
    });

    // Sauvegarde quand l'app passe en arrière-plan (mobile)
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.forceSave();
      }
    });

    // Backup périodique (filet de sécurité)
    setInterval(() => this.save(), 10000);
  }

  private notify(): void {
    // Notifier les listeners React
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (e) {
        console.warn('[UIStateStore] Erreur listener:', e);
      }
    });

    // Debounce save (100ms)
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => this.save(), 100);
  }

  // ===========================================
  // API PUBLIQUE - Subscription
  // ===========================================

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  getState(): GlobalUIState {
    return this.state;
  }

  // ===========================================
  // API PUBLIQUE - Vue courante
  // ===========================================

  setView(view: string): void {
    if (this.state.currentView !== view) {
      this.state.currentView = view;
      this.notify();
    }
  }

  getView(): string {
    return this.state.currentView;
  }

  // ===========================================
  // API PUBLIQUE - Sous-écrans (threads, détails, etc.)
  // ===========================================

  setSubScreen(key: string, value: any): void {
    if (value === null || value === undefined) {
      if (this.state.subScreens[key] !== undefined) {
        delete this.state.subScreens[key];
        this.notify();
      }
    } else {
      // Éviter les mises à jour inutiles
      const current = JSON.stringify(this.state.subScreens[key]);
      const next = JSON.stringify(value);
      if (current !== next) {
        this.state.subScreens[key] = value;
        this.notify();
      }
    }
  }

  getSubScreen<T>(key: string): T | null {
    return (this.state.subScreens[key] as T) ?? null;
  }

  clearSubScreen(key: string): void {
    if (this.state.subScreens[key] !== undefined) {
      delete this.state.subScreens[key];
      this.notify();
    }
  }

  // ===========================================
  // API PUBLIQUE - Scroll positions
  // ===========================================

  setScrollPosition(key: string, position: number): void {
    // Seuil minimal pour éviter les mises à jour inutiles
    const current = this.state.scrollPositions[key] || 0;
    if (Math.abs(current - position) > 5) {
      this.state.scrollPositions[key] = position;
      this.notify();
    }
  }

  getScrollPosition(key: string): number {
    return this.state.scrollPositions[key] ?? 0;
  }

  // ===========================================
  // API PUBLIQUE - États expanded/collapsed
  // ===========================================

  setExpanded(key: string, expanded: boolean): void {
    if (this.state.expandedStates[key] !== expanded) {
      this.state.expandedStates[key] = expanded;
      this.notify();
    }
  }

  getExpanded(key: string, defaultValue: boolean = false): boolean {
    return this.state.expandedStates[key] ?? defaultValue;
  }

  toggleExpanded(key: string, defaultValue: boolean = false): void {
    const current = this.state.expandedStates[key] ?? defaultValue;
    this.state.expandedStates[key] = !current;
    this.notify();
  }

  // ===========================================
  // API PUBLIQUE - Données métier temporaires
  // ===========================================

  setTempData(key: string, data: any): void {
    if (data === null || data === undefined) {
      if (this.state.tempData[key] !== undefined) {
        delete this.state.tempData[key];
        this.notify();
      }
    } else {
      this.state.tempData[key] = data;
      this.notify();
    }
  }

  getTempData<T>(key: string): T | null {
    return (this.state.tempData[key] as T) ?? null;
  }

  clearTempData(key: string): void {
    if (this.state.tempData[key] !== undefined) {
      delete this.state.tempData[key];
      this.notify();
    }
  }

  // ===========================================
  // API PUBLIQUE - Utilitaires
  // ===========================================

  forceSave(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
    this.save();
  }

  reset(): void {
    this.state = { ...DEFAULT_STATE, lastUpdated: Date.now() };
    this.save();
    this.notify();
  }

  // Pour le debug
  debug(): GlobalUIState {
    return { ...this.state };
  }
}

// ===========================================
// EXPORT SINGLETON
// ===========================================

export const uiStateStore = new UIStateStore();

// Export par défaut
export default uiStateStore;
