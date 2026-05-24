// ============================================================
// F.Y.T - EXERCISE PICKER (Feature 4)
// Full-screen modal. Shows:
//   1. "Most Used" section (up to 8, from exercise_usage)
//   2. Search input
//   3. Virtualized full list (react-window v2 List, 200+ items)
//
// Self-contained: fetches exercises + most-used internally.
// Parent only needs userId + onSelect.
// ============================================================

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { List, useListRef } from 'react-window';
import { Search, X, Zap, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { Exercise, MostUsedExercise } from '../../../types';
import { fetchExercises } from '../../services/supabaseService';
import { sessionsApi } from '../../services/api/sessions.api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PickedExercise {
  id: string | null;
  name: string;
  lastWeightKg?: number | null;
}

interface Props {
  userId: string;
  /** Called once with all confirmed selections when user taps "Ajouter" */
  onConfirm: (exercises: PickedExercise[]) => void;
  onClose: () => void;
}

// ─── List row types ───────────────────────────────────────────────────────────

type Row =
  | { type: 'header'; letter: string }
  | { type: 'item'; exercise: Exercise };

// Shared data passed to every row renderer via rowProps
interface RowSharedData {
  rows: Row[];
  onSelect: (ex: Exercise) => void;
  searchTerm: string;
  selectedNames: Set<string>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function normalize(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function groupByLetter(exercises: Exercise[]): { letter: string; items: Exercise[] }[] {
  const map = new Map<string, Exercise[]>();
  for (const ex of exercises) {
    const letter = ex.name[0]?.toUpperCase() ?? '#';
    if (!map.has(letter)) map.set(letter, []);
    map.get(letter)!.push(ex);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([letter, items]) => ({ letter, items }));
}

function buildRows(groups: { letter: string; items: Exercise[] }[]): Row[] {
  const rows: Row[] = [];
  for (const group of groups) {
    rows.push({ type: 'header', letter: group.letter });
    for (const ex of group.items) {
      rows.push({ type: 'item', exercise: ex });
    }
  }
  return rows;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function highlightMatch(name: string, term: string): string {
  const normName = normalize(name);
  const normTerm = normalize(term);
  const idx = normName.indexOf(normTerm);
  if (idx === -1) return escapeHtml(name);
  return (
    escapeHtml(name.slice(0, idx)) +
    `<strong style="color:var(--color-text);font-weight:600">${escapeHtml(name.slice(idx, idx + term.length))}</strong>` +
    escapeHtml(name.slice(idx + term.length))
  );
}

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#EF4444', pectoraux: '#EF4444',
  back: '#3B82F6', dos: '#3B82F6',
  legs: '#10B981', jambes: '#10B981',
  shoulders: '#8B5CF6', épaules: '#8B5CF6',
  arms: '#F59E0B', bras: '#F59E0B',
  core: '#EC4899', abs: '#EC4899',
  cardio: '#06B6D4',
};

function muscleColor(group: string): string {
  return MUSCLE_COLORS[group.toLowerCase()] ?? '#A8A29E';
}

const ROW_HEIGHT = 52;

// ─── Row component (react-window v2 style) ────────────────────────────────────

interface RowComponentInnerProps {
  ariaAttributes: { 'aria-posinset': number; 'aria-setsize': number; role: 'listitem' };
  index: number;
  style: React.CSSProperties;
}

type RowComponentProps = RowComponentInnerProps & RowSharedData;

function ExerciseRow({ ariaAttributes, index, style, rows, onSelect, searchTerm, selectedNames }: RowComponentProps) {
  const row = rows[index];

  if (row.type === 'header') {
    return (
      <div
        {...ariaAttributes}
        style={{
          ...style,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase' as const,
          color: 'var(--color-accent)',
          background: 'var(--color-surface-elevated)',
          borderBottom: '1px solid var(--color-border)',
        }}
      >
        {row.letter}
      </div>
    );
  }

  const ex = row.exercise;
  const isSelected = selectedNames.has(ex.name);
  const highlighted = searchTerm
    ? highlightMatch(ex.name, searchTerm)
    : escapeHtml(ex.name);

  return (
    <button
      {...ariaAttributes}
      style={{
        ...style,
        width: '100%',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        background: isSelected ? 'rgba(217,119,6,0.07)' : 'none',
        border: 'none',
        borderBottom: '1px solid var(--color-border)',
        cursor: 'pointer',
        textAlign: 'left',
        gap: 10,
      }}
      onClick={() => onSelect(ex)}
    >
      {/* Selection indicator / muscle dot */}
      {isSelected ? (
        <span
          style={{
            flexShrink: 0,
            width: 20,
            height: 20,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Check size={12} color="#fff" strokeWidth={3} />
        </span>
      ) : ex.muscleGroup ? (
        <span
          style={{
            flexShrink: 0,
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: muscleColor(ex.muscleGroup),
          }}
        />
      ) : null}

      <span
        style={{
          fontFamily: 'var(--font-body)',
          fontSize: 14,
          color: isSelected ? 'var(--color-accent)' : 'var(--color-text-muted)',
          fontWeight: isSelected ? 600 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
      {!isSelected && ex.muscleGroup && (
        <span
          style={{
            fontFamily: 'var(--font-body)',
            fontSize: 11,
            color: 'var(--color-text-muted)',
            flexShrink: 0,
          }}
        >
          {ex.muscleGroup}
        </span>
      )}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ExercisePicker({ userId, onConfirm, onClose }: Props) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [mostUsed, setMostUsed] = useState<MostUsedExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAllMostUsed, setShowAllMostUsed] = useState(false);
  const [pending, setPending] = useState<PickedExercise[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [listHeight, setListHeight] = useState(400);
  const listRef = useListRef();

  // Derived: set of names for O(1) lookup in row renderer
  const selectedNames = useMemo(
    () => new Set(pending.map(p => p.name)),
    [pending],
  );

  // Load exercises + most-used in parallel
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchExercises(),
      sessionsApi.getMostUsedExercises(userId).catch((): MostUsedExercise[] => []),
    ]).then(([exs, mu]) => {
      if (cancelled) return;
      setExercises(exs);
      setMostUsed(mu);
      setLoading(false);
      setTimeout(() => searchRef.current?.focus(), 50);
    });
    return () => { cancelled = true; };
  }, [userId]);

  // Measure list container height
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const h = entries[0]?.contentRect.height;
      if (h) setListHeight(h);
    });
    obs.observe(containerRef.current);
    const initial = containerRef.current.getBoundingClientRect().height;
    if (initial > 0) setListHeight(initial);
    return () => obs.disconnect();
  }, [loading]); // re-run after loading to measure real available space

  // Build rows — recherche bilingue FR + EN via alias_en
  const filteredExercises = useMemo(() => {
    if (!searchTerm.trim()) return exercises;
    const q = normalize(searchTerm);
    return exercises.filter(ex =>
      normalize(ex.name).includes(q) ||
      (ex.aliasEn ? normalize(ex.aliasEn).includes(q) : false),
    );
  }, [exercises, searchTerm]);

  const rows = useMemo<Row[]>(() => {
    if (searchTerm.trim()) {
      return filteredExercises.map(ex => ({ type: 'item', exercise: ex }));
    }
    return buildRows(groupByLetter(filteredExercises));
  }, [filteredExercises, searchTerm]);

  // Toggle an exercise in/out of pending (by name — IDs can be null)
  const togglePending = useCallback((picked: PickedExercise) => {
    setPending(prev =>
      prev.some(p => p.name === picked.name)
        ? prev.filter(p => p.name !== picked.name)
        : [...prev, picked],
    );
  }, []);

  const handleSelect = useCallback(
    (ex: Exercise) => togglePending({ id: ex.id, name: ex.name }),
    [togglePending],
  );

  const handleMostUsedSelect = useCallback(
    (mu: MostUsedExercise) => togglePending({ id: mu.exerciseId, name: mu.exerciseName, lastWeightKg: mu.lastWeightKg }),
    [togglePending],
  );

  const handleConfirm = useCallback(() => {
    if (pending.length === 0) return;
    onConfirm(pending);
    onClose();
  }, [pending, onConfirm, onClose]);

  const removePending = useCallback((name: string) => {
    setPending(prev => prev.filter(p => p.name !== name));
  }, []);

  // Reset scroll on search change
  useEffect(() => {
    listRef.current?.scrollToRow({ index: 0, behavior: 'instant' as const });
  }, [searchTerm, listRef]);

  const rowProps = useMemo<RowSharedData>(
    () => ({ rows, onSelect: handleSelect, searchTerm, selectedNames }),
    [rows, handleSelect, searchTerm, selectedNames],
  );

  const visibleMostUsed = showAllMostUsed ? mostUsed : mostUsed.slice(0, 4);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 150,
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--color-bg)',
      }}
    >
      {/* ─── Header / Search ─── */}
      <div
        style={{
          flexShrink: 0,
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-border)',
          background: 'var(--color-surface)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div style={{ position: 'relative', flex: 1 }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: 10,
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--color-text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            ref={searchRef}
            type="text"
            placeholder="Rechercher un exercice…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 36px 10px 34px',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
              color: 'var(--color-text)',
              background: 'var(--color-surface-elevated)',
              border: '1px solid var(--color-border)',
              borderRadius: 10,
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{
                position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--color-text-muted)', padding: 4, display: 'flex',
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--color-text-muted)', padding: 4, display: 'flex', flexShrink: 0,
          }}
        >
          <X size={20} />
        </button>
      </div>

      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <div style={{ width: 28, height: 28, border: '3px solid var(--color-accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-muted)' }}>Chargement…</span>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <>
          {/* ─── Most Used (hidden while searching) ─── */}
          {!searchTerm && mostUsed.length > 0 && (
            <div style={{ flexShrink: 0, background: 'var(--color-surface)', borderBottom: '1px solid var(--color-border)', padding: '10px 16px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Zap size={12} style={{ color: 'var(--color-accent)' }} />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, color: 'var(--color-accent)' }}>
                  Récemment utilisés
                </span>
              </div>

              {visibleMostUsed.map(mu => {
                const isSel = selectedNames.has(mu.exerciseName);
                return (
                  <button
                    key={mu.exerciseName}
                    onClick={() => handleMostUsedSelect(mu)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 0', background: 'none', border: 'none',
                      borderBottom: '1px solid var(--color-border)', cursor: 'pointer', width: '100%', textAlign: 'left',
                    }}
                  >
                    {isSel ? (
                      <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Check size={12} color="#fff" strokeWidth={3} />
                      </span>
                    ) : (
                      <span style={{ flexShrink: 0, width: 7, height: 7, borderRadius: '50%', background: 'var(--color-accent)', opacity: 0.4 }} />
                    )}
                    <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: isSel ? 600 : 500, color: isSel ? 'var(--color-accent)' : 'var(--color-text)', flex: 1 }}>
                      {mu.exerciseName}
                    </span>
                    {mu.lastWeightKg != null && !isSel && (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--color-text-muted)', flexShrink: 0 }}>
                        {mu.lastWeightKg} kg
                      </span>
                    )}
                  </button>
                );
              })}

              {mostUsed.length > 4 && (
                <button
                  onClick={() => setShowAllMostUsed(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '8px 0 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: 13, fontFamily: 'var(--font-body)' }}
                >
                  {showAllMostUsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  {showAllMostUsed ? 'Voir moins' : `Voir ${mostUsed.length - 4} de plus`}
                </button>
              )}
            </div>
          )}

          {/* ─── Virtualized list ─── */}
          {rows.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <span style={{ fontSize: 32 }}>🔍</span>
              <span style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--color-text-muted)' }}>
                Aucun résultat pour « {searchTerm} »
              </span>
            </div>
          ) : (
            <div ref={containerRef} style={{ flex: 1, overflow: 'hidden' }}>
              <List<RowSharedData>
                listRef={listRef as React.Ref<import('react-window').ListImperativeAPI>}
                rowCount={rows.length}
                rowHeight={ROW_HEIGHT}
                rowComponent={ExerciseRow}
                rowProps={rowProps}
                defaultHeight={listHeight}
                style={{ height: listHeight }}
                overscanCount={8}
              />
            </div>
          )}
        </>
      )}

      {/* ─── Selection tray ─── */}
      {pending.length > 0 && (
        <div
          style={{
            flexShrink: 0,
            background: 'var(--color-surface)',
            borderTop: '1px solid var(--color-border)',
            padding: '10px 16px 14px',
          }}
        >
          {/* Chips row */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              overflowX: 'auto',
              paddingBottom: 10,
              scrollbarWidth: 'none',
            }}
          >
            {pending.map(p => (
              <div
                key={p.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 8px 4px 10px',
                  background: 'rgba(217,119,6,0.1)',
                  border: '1px solid var(--color-accent)',
                  borderRadius: 20,
                  flexShrink: 0,
                }}
              >
                <span style={{ fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: 500, color: 'var(--color-accent)', whiteSpace: 'nowrap' }}>
                  {p.name}
                </span>
                <button
                  onClick={() => removePending(p.name)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-accent)', padding: 2, display: 'flex', flexShrink: 0 }}
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            style={{
              display: 'block',
              width: '100%',
              padding: '13px',
              fontFamily: 'var(--font-display)',
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              background: 'var(--color-accent)',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            Ajouter {pending.length} exercice{pending.length > 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
