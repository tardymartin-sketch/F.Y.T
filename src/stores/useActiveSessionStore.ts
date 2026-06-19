import { create } from 'zustand';
import { WorkoutRow, SessionLog, SessionStatus } from '../../types';
import { removeLocalStorageWithEvent } from '../utils/localStorageEvents';
import { sessionsApi } from '../services/api/sessions.api';

let _autoSaveTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_SAVE_DELAY_MS = 5000; // 5s draft auto-save (decided in architecture review)

// ─── Draft version tracking (Feature 5 — multi-tab conflict detection) ───────
// Each auto-save stamps a timestamp into localStorage. If another tab writes a
// newer timestamp, we detect the conflict on the next store update.
const DRAFT_VERSION_KEY = 'F.Y.T_draft_version';

function stampDraftVersion(): number {
  const ts = Date.now();
  localStorage.setItem(DRAFT_VERSION_KEY, String(ts));
  return ts;
}

function getDraftVersion(): number {
  return parseInt(localStorage.getItem(DRAFT_VERSION_KEY) ?? '0', 10);
}

// ─── Clone request deduplication (Feature 6 — retry safety) ──────────────────
// Tracks in-flight clone request IDs so that a retry on the same template
// doesn't create a second session row.
const _pendingClones = new Map<string, Promise<{ sessionId: string; exercises: any[] }>>();

interface ActiveSessionState {
  activeSessionData: WorkoutRow[] | null;
  editingSession: SessionLog | null;
  hasActiveSession: boolean;

  // Session lifecycle (Feature 8 — state machine)
  sessionStatus: SessionStatus;

  // Navigation state
  exerciseIndex: number;
  setIndex: number;
  momentumScore: number;

  // Clone state (Feature 6)
  isCloning: boolean;
  cloneError: string | null;

  // Draft conflict detection (Feature 5)
  draftVersionConflict: boolean;

  // ─── Actions ──────────────────────────────────────────────────────────────

  setActiveSession: (data: WorkoutRow[] | null, initialLog?: SessionLog | null) => void;
  clearActiveSession: () => void;
  syncWithLocalStorage: () => void;

  // State machine transitions (Feature 8)
  startSession: () => void;
  endSession: () => void;
  abandonSession: () => void;

  // Navigation setters (only valid in 'active' status)
  setExerciseIndex: (index: number) => void;
  setSetIndex: (index: number) => void;
  setMomentumScore: (score: number) => void;

  // Template actions (Feature 1)
  cloneSession: (templateId: string, userId: string) => Promise<void>;
  setAsTemplate: (templateName: string, pinned: boolean, userId: string) => Promise<void>;
  updateMostUsedCache: (userId: string) => Promise<void>;
  dismissCloneError: () => void;

  // Draft conflict (Feature 5)
  dismissDraftConflict: () => void;

  autoSaveSession: () => void;
}

export const useActiveSessionStore = create<ActiveSessionState>((set, get) => ({
  activeSessionData: null,
  editingSession: null,
  hasActiveSession: false,
  currentTemplateId: null,
  sessionStatus: 'draft',
  exerciseIndex: 0,
  setIndex: 0,
  momentumScore: 0,
  isCloning: false,
  cloneError: null,
  draftVersionConflict: false,

  setActiveSession: (data, initialLog = null) => {
    set({
      activeSessionData: data,
      editingSession: initialLog,
      hasActiveSession: !!data,
      sessionStatus: (initialLog?.status as SessionStatus) ?? 'draft',
      exerciseIndex: 0,
      setIndex: 0,
      momentumScore: 0,
    });
    get().autoSaveSession();
  },


  clearActiveSession: () => {
    removeLocalStorageWithEvent('F.Y.T_active_session');
    removeLocalStorageWithEvent('F.Y.T_momentum_autosave');
    localStorage.removeItem(DRAFT_VERSION_KEY);
    set({
      activeSessionData: null,
      editingSession: null,
      hasActiveSession: false,
        sessionStatus: 'draft',
      exerciseIndex: 0,
      setIndex: 0,
      momentumScore: 0,
      isCloning: false,
      cloneError: null,
      draftVersionConflict: false,
    });
  },

  syncWithLocalStorage: () => {
    const savedSession = localStorage.getItem('F.Y.T_active_session');
    const autoSaveState = localStorage.getItem('F.Y.T_momentum_autosave');

    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed.sessionData && parsed.logs) {
          let extraState = {
            exerciseIndex: 0,
            setIndex: 0,
            momentumScore: 0,
          };
          if (autoSaveState) {
            try {
              extraState = JSON.parse(autoSaveState);
            } catch (e) {
              console.warn('Erreur parsing momentum autosave:', e);
            }
          }

          // Clamp exerciseIndex to valid range (Feature 8 — bounds guard)
          const exercises = parsed.logs?.exercises ?? [];
          const maxIndex = Math.max(0, exercises.length - 1);
          if (extraState.exerciseIndex > maxIndex) {
            console.warn(
              `[ActiveSession] exerciseIndex ${extraState.exerciseIndex} out of bounds (max ${maxIndex}), clamping.`
            );
            extraState.exerciseIndex = maxIndex;
          }

          set({
            hasActiveSession: true,
            ...extraState,
          });
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

  // ─── State machine transitions (Feature 8) ────────────────────────────────

  startSession: () => {
    const state = get();
    if (state.sessionStatus !== 'draft') {
      console.warn(`[ActiveSession] startSession() called on status="${state.sessionStatus}". No-op.`);
      return;
    }
    const exercises = state.editingSession?.exercises ?? [];
    if (exercises.length === 0) {
      console.warn('[ActiveSession] startSession() called with no exercises. No-op.');
      return;
    }
    set({ sessionStatus: 'active', exerciseIndex: 0, setIndex: 0 });
    get().autoSaveSession();
  },

  endSession: () => {
    const { sessionStatus } = get();
    if (sessionStatus !== 'active') {
      console.warn(`[ActiveSession] endSession() called on status="${sessionStatus}". No-op.`);
      return;
    }
    set({ sessionStatus: 'complete' });
    get().autoSaveSession();
  },

  abandonSession: () => {
    const { sessionStatus } = get();
    if (sessionStatus !== 'active') {
      console.warn(`[ActiveSession] abandonSession() called on status="${sessionStatus}". No-op.`);
      return;
    }
    set({ sessionStatus: 'abandoned' });
    get().autoSaveSession();
  },

  // ─── Navigation setters ───────────────────────────────────────────────────

  setExerciseIndex: (index) => {
    const { editingSession } = get();
    const maxIndex = Math.max(0, (editingSession?.exercises?.length ?? 1) - 1);
    const clamped = Math.min(index, maxIndex);
    if (clamped !== index) {
      console.warn(`[ActiveSession] setExerciseIndex(${index}) clamped to ${clamped}.`);
    }
    set({ exerciseIndex: clamped });
    get().autoSaveSession();
  },

  setSetIndex: (index) => {
    set({ setIndex: index });
    get().autoSaveSession();
  },

  setMomentumScore: (score) => {
    set({ momentumScore: score });
    get().autoSaveSession();
  },

  // ─── Template actions (Feature 1) ─────────────────────────────────────────

  cloneSession: async (templateId, userId) => {
    // Deduplicate concurrent clone requests for the same template (Feature 6)
    if (_pendingClones.has(templateId)) {
      try {
        const { sessionId, exercises } = await _pendingClones.get(templateId)!;
        // Already in flight — optimistic state already set, just return
        return;
      } catch {
        // Previous attempt failed — fall through to retry
        _pendingClones.delete(templateId);
      }
    }

    set({ isCloning: true, cloneError: null });

    // Optimistic: set hasActiveSession immediately so UI responds
    set({ hasActiveSession: true, sessionStatus: 'draft' });

    const clonePromise = sessionsApi.cloneSession(templateId, userId, crypto.randomUUID());
    _pendingClones.set(templateId, clonePromise);

    try {
      const { sessionId, exercises } = await clonePromise;

      // Build a minimal SessionLog for the store
      const today = new Date().toISOString().split('T')[0];
      const clonedSession: SessionLog = {
        id: sessionId,
        userId,
        date: today,
        sessionKey: { annee: String(new Date().getFullYear()), moisNum: '', semaine: '', seance: '' },
        exercises,
        status: 'draft',
        isTemplate: false,
        createdFromTemplateId: templateId,
      };

      set({
        editingSession: clonedSession,
        sessionStatus: 'draft',
        exerciseIndex: 0,
        setIndex: 0,
        isCloning: false,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Clone failed';
      set({
        isCloning: false,
        cloneError: msg,
        hasActiveSession: false,
        sessionStatus: 'draft',
        editingSession: null,
      });
    } finally {
      _pendingClones.delete(templateId);
    }
  },

  setAsTemplate: async (templateName, pinned, userId) => {
    const { editingSession, sessionStatus } = get();
    if (!editingSession) {
      console.warn('[ActiveSession] setAsTemplate() called with no active session.');
      return;
    }
    if (sessionStatus !== 'complete') {
      console.warn('[ActiveSession] setAsTemplate() called on non-complete session. No-op.');
      return;
    }
    await sessionsApi.setAsTemplate(editingSession.id, userId, templateName, pinned);
    set({
      editingSession: {
        ...editingSession,
        isTemplate: true,
        templateName,
        pinned,
      },
    });
  },

  updateMostUsedCache: async (userId) => {
    const { editingSession } = get();
    if (!editingSession || editingSession.exercises.length === 0) return;
    try {
      await sessionsApi.recordExerciseUsage(editingSession.id, userId, editingSession.exercises);
    } catch (err) {
      // Non-blocking — most-used cache update is best-effort
      console.warn('[ActiveSession] updateMostUsedCache failed:', err);
    }
  },

  dismissCloneError: () => set({ cloneError: null }),

  // ─── Draft conflict detection (Feature 5) ─────────────────────────────────

  dismissDraftConflict: () => set({ draftVersionConflict: false }),

  // ─── Auto-save (5s debounce, drafts only) ─────────────────────────────────

  autoSaveSession: () => {
    if (_autoSaveTimer) clearTimeout(_autoSaveTimer);
    _autoSaveTimer = setTimeout(() => {
      const state = get();
      if (state.hasActiveSession) {
        const autoSaveData = {
          exerciseIndex: state.exerciseIndex,
          setIndex: state.setIndex,
          momentumScore: state.momentumScore,
          sessionStatus: state.sessionStatus,
        };
        localStorage.setItem('F.Y.T_momentum_autosave', JSON.stringify(autoSaveData));
        stampDraftVersion();
      }
    }, AUTO_SAVE_DELAY_MS);
  },
}));

// ─── Multi-tab conflict detection (Feature 5) ─────────────────────────────────
// Listen for localStorage changes from other tabs. If they wrote a newer
// draftVersion, surface the conflict in the store so the UI can show a modal.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== DRAFT_VERSION_KEY) return;
    const ourVersion = getDraftVersion();
    const theirVersion = parseInt(e.newValue ?? '0', 10);
    if (theirVersion > ourVersion) {
      useActiveSessionStore.setState({ draftVersionConflict: true });
    }
  });
}
