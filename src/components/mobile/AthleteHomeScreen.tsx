// ============================================================
// F.Y.T - ATHLETE HOME SCREEN
// 4-tab layout: Active | Récents | Templates | Mon programme
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Play, Dumbbell, AlertCircle, RotateCcw, RefreshCw } from 'lucide-react';
import { SessionLog, User, ExerciseLog, DefaultTemplate, WorkoutRow } from '../../../types';
import { sessionsApi } from '../../services/api/sessions.api';
import { useActiveSessionStore } from '../../stores/useActiveSessionStore';
import { SetAsTemplateModal } from './SetAsTemplateModal';
import { DraftConflictModal } from './DraftConflictModal';
import { RelaunchConfirmModal } from '../common/history/RelaunchConfirmModal';
import { MyProgramTab } from './MyProgramTab';

// ─── Types ────────────────────────────────────────────────────────────────────

type HomeTab = 'active' | 'recent' | 'templates' | 'program';

interface Props {
  user: User;
  history: SessionLog[];
  hasActiveSession: boolean;
  onResumeSession?: () => void;
  /**
   * Called with the exercises to start a new session.
   * `sessionData` (WorkoutRow[]) carries the prescription metadata (séries,
   * reps, repos, vidéo, tempo) read by the active session. Omit it for blank
   * sessions that have no prescription.
   */
  onStartNewSession: (exercises: ExerciseLog[], sessionData?: WorkoutRow[]) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Aujourd'hui";
  if (days === 1) return 'Hier';
  if (days < 7) return `Il y a ${days} jours`;
  if (days < 14) return 'Il y a 1 semaine';
  return `Il y a ${Math.floor(days / 7)} semaines`;
}

function sessionEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('leg') || n.includes('squat') || n.includes('jambe')) return '🦵';
  if (n.includes('back') || n.includes('dos') || n.includes('pull')) return '🔙';
  if (n.includes('shoulder') || n.includes('épaule') || n.includes('press')) return '💪';
  if (n.includes('cardio') || n.includes('run') || n.includes('course')) return '🏃';
  if (n.includes('core') || n.includes('abs') || n.includes('gainage')) return '🧘';
  return '🏋️';
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: HomeTab; onChange: (t: HomeTab) => void }) {
  const tabs: { key: HomeTab; label: string }[] = [
    { key: 'active', label: 'Active' },
    { key: 'recent', label: 'Récents' },
    { key: 'templates', label: 'Templates' },
    { key: 'program', label: 'Programme' },
  ];
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: '1px solid var(--color-border)',
        background: 'var(--color-surface)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      {tabs.map(t => (
        <button
          key={t.key}
          onClick={() => onChange(t.key)}
          style={{
            flex: 1,
            padding: '12px 0',
            fontFamily: 'var(--font-body)',
            fontWeight: active === t.key ? 600 : 400,
            fontSize: 14,
            color: active === t.key ? 'var(--color-accent)' : 'var(--color-text-muted)',
            background: 'none',
            border: 'none',
            borderBottom: active === t.key ? '2px solid var(--color-accent)' : '2px solid transparent',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function TemplateCard({
  session,
  onClone,
  isCloning,
}: {
  session: SessionLog;
  onClone: () => void;
  isCloning: boolean;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const name = session.templateName ?? session.sessionKey.seance ?? 'Sans nom';
  const exercises = session.exercises ?? [];
  const isPinned = session.pinned;

  return (
    <div
      style={{
        background: isPinned ? 'var(--color-accent-light)' : 'var(--color-surface-2)',
        border: isExpanded
          ? '1.5px solid var(--color-accent)'
          : isPinned
            ? '1.5px solid var(--color-accent)'
            : '1px solid var(--color-border)',
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* ── Header row ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(v => !v)}
        onKeyDown={e => e.key === 'Enter' && setIsExpanded(v => !v)}
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            background: 'var(--color-surface)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {sessionEmoji(name)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {exercises.length} exercice{exercises.length !== 1 ? 's' : ''}
            {session.date ? ` · ${timeAgo(session.date)}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onClone(); }}
            disabled={isCloning}
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14,
              color: isCloning ? 'var(--color-text-muted)' : 'var(--color-accent)',
              background: 'none',
              border: 'none',
              cursor: isCloning ? 'default' : 'pointer',
              padding: '4px 4px',
              flexShrink: 0,
            }}
          >
            {isCloning ? '…' : 'Lancer'}
          </button>
          <div style={{ color: 'var(--color-text-muted)', lineHeight: 0 }}>
            {isExpanded
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            }
          </div>
        </div>
      </div>

      {/* ── Expanded: exercise list ── */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 16px 14px' }}>
          {exercises.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>
              Aucun exercice
            </p>
          ) : (
            exercises.map((ex, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: idx < exercises.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1 }}>
                  {ex.exerciseName}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 8 }}>
                  {ex.sets.length} × {ex.sets[0]?.reps || '—'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RecentSessionCard({
  session,
  onRelaunchRequest,
}: {
  session: SessionLog;
  /** Called when user clicks the relaunch icon — parent will show the confirm modal */
  onRelaunchRequest: () => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const name = session.sessionKey.seance || 'Séance';
  const exercises = session.exercises ?? [];

  return (
    <div
      style={{
        background: 'var(--color-surface)',
        border: `1px solid ${isExpanded ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* ── Header row (clickable to expand) ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(v => !v)}
        onKeyDown={e => e.key === 'Enter' && setIsExpanded(v => !v)}
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            background: 'var(--color-surface-2)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Dumbbell size={18} color="var(--color-text-muted)" />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              fontSize: 15,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {exercises.length} exercice{exercises.length !== 1 ? 's' : ''}
            {session.date ? ` · ${timeAgo(session.date)}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Relaunch icon-only button */}
          <button
            onClick={e => { e.stopPropagation(); onRelaunchRequest(); }}
            title="Relancer cette séance"
            style={{
              width: 32,
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--color-accent)',
              background: 'none',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <RefreshCw size={16} />
          </button>

          {/* Chevron */}
          <div style={{ color: 'var(--color-text-muted)', lineHeight: 0 }}>
            {isExpanded
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            }
          </div>
        </div>
      </div>

      {/* ── Expanded: exercise list ── */}
      {isExpanded && (
        <div
          style={{
            borderTop: '1px solid var(--color-border)',
            padding: '10px 16px 14px',
          }}
        >
          {exercises.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>
              Aucun exercice
            </p>
          ) : (
            exercises.map((ex, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: idx < exercises.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1 }}>
                  {ex.exerciseName}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 8 }}>
                  {ex.sets.length} × {ex.sets[0]?.reps || '—'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DefaultTemplateCard({
  template,
  onLaunch,
}: {
  template: DefaultTemplate;
  onLaunch: () => void;
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const exercises = template.exercises ?? [];

  return (
    <div
      style={{
        background: 'var(--color-surface-2)',
        border: `1px solid ${isExpanded ? 'var(--color-accent)' : 'var(--color-border)'}`,
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}
    >
      {/* ── Header row ── */}
      <div
        role="button"
        tabIndex={0}
        onClick={() => setIsExpanded(v => !v)}
        onKeyDown={e => e.key === 'Enter' && setIsExpanded(v => !v)}
        style={{
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            background: 'var(--color-surface)',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          {template.emoji}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 15,
              letterSpacing: '-0.02em',
              color: 'var(--color-text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {template.name}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {exercises.length} exercice{exercises.length !== 1 ? 's' : ''}
            {template.category ? ` · ${template.category}` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); onLaunch(); }}
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 14,
              color: 'var(--color-accent)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 4px',
              flexShrink: 0,
            }}
          >
            Lancer
          </button>
          <div style={{ color: 'var(--color-text-muted)', lineHeight: 0 }}>
            {isExpanded
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
            }
          </div>
        </div>
      </div>

      {/* ── Expanded: exercise list ── */}
      {isExpanded && (
        <div style={{ borderTop: '1px solid var(--color-border)', padding: '10px 16px 14px' }}>
          {exercises.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>
              Aucun exercice
            </p>
          ) : (
            exercises.map((ex, idx) => (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: idx < exercises.length - 1 ? '1px solid var(--color-border)' : 'none',
                }}
              >
                <span style={{ fontSize: 13, color: 'var(--color-text-primary)', flex: 1 }}>
                  {ex.exerciseName}
                </span>
                <span style={{ fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0, marginLeft: 8 }}>
                  {ex.sets.length} × {ex.sets[0]?.reps || '—'}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ message, cta, onCta }: { message: string; cta: string; onCta: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '48px 24px',
        gap: 16,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          background: 'var(--color-surface-2)',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Dumbbell size={24} color="var(--color-text-muted)" />
      </div>
      <p style={{ fontSize: 14, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>{message}</p>
      <button
        onClick={onCta}
        style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 700,
          fontSize: 15,
          color: '#fff',
          background: 'var(--color-accent)',
          border: 'none',
          borderRadius: 8,
          padding: '10px 20px',
          cursor: 'pointer',
        }}
      >
        {cta}
      </button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function AthleteHomeScreen({ user, history, hasActiveSession, onResumeSession, onStartNewSession }: Props) {
  const [tab, setTab] = useState<HomeTab>(hasActiveSession ? 'active' : 'recent');
  const [templates, setTemplates] = useState<SessionLog[]>([]);
  const [defaultTemplates, setDefaultTemplates] = useState<DefaultTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [cloningId, setCloningId] = useState<string | null>(null);
  const [showSetAsTemplate, setShowSetAsTemplate] = useState(false);
  /** Session en attente de confirmation pour "Relancer" */
  const [pendingRelaunch, setPendingRelaunch] = useState<SessionLog | null>(null);

  // No pre-session picker — session starts blank; exercises added on the go via + button

  const { isCloning, cloneError, draftVersionConflict, sessionStatus, editingSession } =
    useActiveSessionStore();
  const { cloneSession, dismissCloneError, dismissDraftConflict, setAsTemplate } =
    useActiveSessionStore();

  // Sync tab to 'active' when a session starts
  useEffect(() => {
    if (hasActiveSession || isCloning) setTab('active');
  }, [hasActiveSession, isCloning]);

  // Load templates on mount and when tab switches to 'templates'
  useEffect(() => {
    if (tab !== 'templates') return;
    setLoadingTemplates(true);
    Promise.all([
      sessionsApi.getTemplates(user.id),
      sessionsApi.getDefaultTemplates(),
    ])
      .then(([userTemplates, defTemplates]) => {
        setTemplates(userTemplates);
        setDefaultTemplates(defTemplates);
      })
      .catch(err => console.error('Failed to load templates:', err))
      .finally(() => setLoadingTemplates(false));
  }, [tab, user.id]);

  const handleClone = useCallback(
    async (templateId: string) => {
      setCloningId(templateId);
      try {
        await cloneSession(templateId, user.id);
        // Tab switches to 'active' via the useEffect above
      } finally {
        setCloningId(null);
      }
    },
    [cloneSession, user.id],
  );

  /**
   * Relaunch a historical session: same exercises, blank sets (reps/weight cleared).
   */
  const handleRelaunch = useCallback(
    (session: SessionLog) => {
      const blankExercises: ExerciseLog[] = session.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        executionMode: ex.executionMode,
        executionGroupId: ex.executionGroupId,
        executionGroupPosition: ex.executionGroupPosition,
        sets: ex.sets.map((s, i) => ({
          setNumber: i + 1,
          reps: '',
          weight: '',
          completed: false,
        })),
        notes: ex.notes,
      }));
      onStartNewSession(blankExercises);
    },
    [onStartNewSession],
  );

  /**
   * Launch a default template: exercises already blank (migration populates reps as "N" but weight is "").
   * We normalise weight to '' so the session starts fresh.
   */
  const handleLaunchDefault = useCallback(
    (template: DefaultTemplate) => {
      const blankExercises: ExerciseLog[] = template.exercises.map(ex => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.exerciseName,
        sets: ex.sets.map((s, i) => ({
          setNumber: i + 1,
          reps: s.reps,   // keep prescribed reps from the template
          weight: '',
          completed: false,
        })),
      }));
      onStartNewSession(blankExercises);
    },
    [onStartNewSession],
  );

  const handleSetAsTemplate = useCallback(
    async (name: string, pinned: boolean) => {
      if (!editingSession) return;
      await setAsTemplate(name, pinned, user.id);
      setShowSetAsTemplate(false);
      // Reload templates if we're on that tab
      if (tab === 'templates') {
        const updated = await sessionsApi.getTemplates(user.id);
        setTemplates(updated);
      }
    },
    [editingSession, setAsTemplate, user.id, tab],
  );

  // "Nouvelle séance" → blank session; athlete adds exercises via + during the session
  const openPicker = useCallback(() => {
    onStartNewSession([]);
  }, [onStartNewSession]);

  // Recent sessions (non-templates, sorted by date, max 10)
  const recentSessions = history
    .filter(s => !s.isTemplate)
    .slice(0, 10);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--color-bg)',
        fontFamily: 'var(--font-body)',
      }}
    >
      {/* ─── Header ─── */}
      <div style={{ padding: '20px 16px 0', background: 'var(--color-surface)' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 900,
            fontSize: 28,
            letterSpacing: '-0.04em',
            color: 'var(--color-text-primary)',
            marginBottom: 4,
          }}
        >
          {user.firstName ? `Salut, ${user.firstName}` : 'F.Y.T'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginBottom: 16 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      {/* ─── Tab bar ─── */}
      <TabBar active={tab} onChange={setTab} />

      {/* ─── Draft conflict modal (Feature 5) ─── */}
      {draftVersionConflict && (
        <DraftConflictModal
          onKeepCurrent={dismissDraftConflict}
          onReload={() => {
            dismissDraftConflict();
            window.location.reload();
          }}
        />
      )}

      {/* ─── Clone error banner ─── */}
      {cloneError && (
        <div
          style={{
            margin: 12,
            padding: '12px 14px',
            background: '#FEE2E2',
            borderRadius: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <AlertCircle size={16} color="#DC2626" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: '#991B1B', flex: 1 }}>{cloneError}</span>
          <button onClick={dismissCloneError} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <RotateCcw size={14} color="#991B1B" />
          </button>
        </div>
      )}

      {/* ─── Tab content ─── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 16px 100px' }}>

        {/* ACTIVE TAB */}
        {tab === 'active' && (
          <>
            {isCloning && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 12,
                  padding: '20px 16px',
                  textAlign: 'center',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    border: '3px solid var(--color-accent)',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                    margin: '0 auto 12px',
                  }}
                />
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>
                  Clonage en cours…
                </div>
                <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
                  Préchargement des derniers poids
                </div>
              </div>
            )}

            {!isCloning && hasActiveSession && (
              <div
                style={{
                  background: 'var(--color-surface)',
                  border: '1.5px solid var(--color-accent)',
                  borderRadius: 12,
                  padding: '20px 16px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    color: 'var(--color-accent)',
                    marginBottom: 8,
                  }}
                >
                  Session en cours
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontWeight: 800,
                    fontSize: 24,
                    letterSpacing: '-0.03em',
                    marginBottom: 16,
                  }}
                >
                  {editingSession?.sessionKey.seance || editingSession?.templateName || 'Séance active'}
                </div>
                <button
                  onClick={onResumeSession}
                  style={{
                    width: '100%',
                    padding: '14px',
                    fontFamily: 'var(--font-display)',
                    fontWeight: 700,
                    fontSize: 17,
                    color: '#fff',
                    background: 'var(--color-accent)',
                    border: 'none',
                    borderRadius: 10,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Play size={18} />
                  Reprendre la séance
                </button>

                {sessionStatus === 'complete' && (
                  <button
                    onClick={() => setShowSetAsTemplate(true)}
                    style={{
                      width: '100%',
                      marginTop: 10,
                      padding: '12px',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'var(--color-text-secondary)',
                      background: 'var(--color-surface-2)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      cursor: 'pointer',
                    }}
                  >
                    Sauvegarder comme template
                  </button>
                )}
              </div>
            )}

            {!isCloning && !hasActiveSession && (
              <EmptyState
                message="Aucune séance active. Lance un template ou crée une nouvelle séance."
                cta="Nouvelle séance"
                onCta={openPicker}
              />
            )}
          </>
        )}

        {/* RECENT TAB */}
        {tab === 'recent' && (
          <>
            {recentSessions.length === 0 ? (
              <EmptyState
                message="Tes séances passées apparaîtront ici. Lance ta première séance pour commencer."
                cta="Nouvelle séance"
                onCta={openPicker}
              />
            ) : (
              recentSessions.map(s => (
                <RecentSessionCard
                  key={s.id}
                  session={s}
                  onRelaunchRequest={() => setPendingRelaunch(s)}
                />
              ))
            )}
          </>
        )}

        {/* TEMPLATES TAB */}
        {tab === 'templates' && (
          <>
            {loadingTemplates ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--color-text-muted)', fontSize: 14 }}>
                Chargement…
              </div>
            ) : (
              <>
                {/* ── Mes templates (personnels) ── */}
                {templates.length > 0 && (
                  <>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--color-text-muted)',
                      marginBottom: 10,
                    }}>
                      Mes templates
                    </div>
                    {templates.map(t => (
                      <TemplateCard
                        key={t.id}
                        session={t}
                        onClone={() => handleClone(t.id)}
                        isCloning={cloningId === t.id || isCloning}
                      />
                    ))}
                  </>
                )}

                {/* ── Templates par défaut ── */}
                {defaultTemplates.length > 0 && (
                  <>
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase' as const,
                      color: 'var(--color-text-muted)',
                      marginTop: templates.length > 0 ? 20 : 0,
                      marginBottom: 10,
                    }}>
                      Templates suggérés
                    </div>
                    {defaultTemplates.map(dt => (
                      <DefaultTemplateCard
                        key={dt.id}
                        template={dt}
                        onLaunch={() => handleLaunchDefault(dt)}
                      />
                    ))}
                  </>
                )}

                {/* ── État vide (aucun template du tout) ── */}
                {templates.length === 0 && defaultTemplates.length === 0 && (
                  <EmptyState
                    message="Crée ta première séance, termine-la, puis sauvegarde-la comme template pour la réutiliser."
                    cta="Nouvelle séance"
                    onCta={openPicker}
                  />
                )}

                {/* ── Bouton nouvelle séance ── */}
                {(templates.length > 0 || defaultTemplates.length > 0) && (
                  <button
                    onClick={openPicker}
                    style={{
                      width: '100%',
                      padding: '12px',
                      fontFamily: 'var(--font-body)',
                      fontWeight: 600,
                      fontSize: 14,
                      color: 'var(--color-text-secondary)',
                      background: 'var(--color-surface)',
                      border: '1px solid var(--color-border)',
                      borderRadius: 10,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      marginTop: 12,
                    }}
                  >
                    <Plus size={15} />
                    Nouvelle séance
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* ─── Onglet Mon programme ─── */}
        {tab === 'program' && (
          <MyProgramTab
            userId={user.id}
            hasActiveSession={hasActiveSession}
            onStartNewSession={onStartNewSession}
          />
        )}
      </div>

      {/* ─── Set as template modal ─── */}
      {showSetAsTemplate && (
        <SetAsTemplateModal
          onConfirm={handleSetAsTemplate}
          onCancel={() => setShowSetAsTemplate(false)}
        />
      )}

      {/* ─── Relaunch confirm modal ─── */}
      {pendingRelaunch && (
        <RelaunchConfirmModal
          session={pendingRelaunch}
          onConfirm={() => {
            handleRelaunch(pendingRelaunch);
            setPendingRelaunch(null);
          }}
          onCancel={() => setPendingRelaunch(null)}
        />
      )}


      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
