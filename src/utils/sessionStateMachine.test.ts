import { describe, it, expect, beforeEach, vi } from 'vitest';

// We test the state machine logic in isolation, without real Zustand/Supabase.
// The key invariants to protect:
//   1. draft → active only with exercises present
//   2. active → complete/abandoned only (not back to draft)
//   3. exerciseIndex clamped to exercises.length - 1

// ─── Pure state machine logic (extracted from store for testability) ──────────

type SessionStatus = 'draft' | 'active' | 'complete' | 'abandoned';

interface SessionState {
  status: SessionStatus;
  exerciseCount: number;
  exerciseIndex: number;
}

function startSession(state: SessionState): { next: SessionState; warn: string | null } {
  if (state.status !== 'draft') {
    return { next: state, warn: `startSession on status="${state.status}" is a no-op` };
  }
  if (state.exerciseCount === 0) {
    return { next: state, warn: 'startSession with no exercises is a no-op' };
  }
  return { next: { ...state, status: 'active', exerciseIndex: 0 }, warn: null };
}

function endSession(state: SessionState): { next: SessionState; warn: string | null } {
  if (state.status !== 'active') {
    return { next: state, warn: `endSession on status="${state.status}" is a no-op` };
  }
  return { next: { ...state, status: 'complete' }, warn: null };
}

function abandonSession(state: SessionState): { next: SessionState; warn: string | null } {
  if (state.status !== 'active') {
    return { next: state, warn: `abandonSession on status="${state.status}" is a no-op` };
  }
  return { next: { ...state, status: 'abandoned' }, warn: null };
}

function setExerciseIndex(state: SessionState, index: number): { next: SessionState; warn: string | null } {
  const max = Math.max(0, state.exerciseCount - 1);
  if (index > max) {
    return {
      next: { ...state, exerciseIndex: max },
      warn: `exerciseIndex ${index} clamped to ${max}`,
    };
  }
  return { next: { ...state, exerciseIndex: index }, warn: null };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('Session state machine', () => {
  let draft: SessionState;

  beforeEach(() => {
    draft = { status: 'draft', exerciseCount: 3, exerciseIndex: 0 };
  });

  // startSession

  it('draft → active when exercises present', () => {
    const { next, warn } = startSession(draft);
    expect(next.status).toBe('active');
    expect(warn).toBeNull();
  });

  it('startSession on active is no-op with warning', () => {
    const active = { ...draft, status: 'active' as SessionStatus };
    const { next, warn } = startSession(active);
    expect(next.status).toBe('active');
    expect(warn).toMatch(/no-op/);
  });

  it('startSession on complete is no-op with warning', () => {
    const complete = { ...draft, status: 'complete' as SessionStatus };
    const { next, warn } = startSession(complete);
    expect(next.status).toBe('complete');
    expect(warn).toMatch(/no-op/);
  });

  it('startSession with no exercises is no-op with warning', () => {
    const empty = { ...draft, exerciseCount: 0 };
    const { next, warn } = startSession(empty);
    expect(next.status).toBe('draft');
    expect(warn).toMatch(/no exercises/);
  });

  it('startSession resets exerciseIndex to 0', () => {
    const withIndex = { ...draft, exerciseIndex: 2 };
    const { next } = startSession(withIndex);
    expect(next.exerciseIndex).toBe(0);
  });

  // endSession

  it('active → complete', () => {
    const active = { ...draft, status: 'active' as SessionStatus };
    const { next, warn } = endSession(active);
    expect(next.status).toBe('complete');
    expect(warn).toBeNull();
  });

  it('endSession on draft is no-op with warning', () => {
    const { next, warn } = endSession(draft);
    expect(next.status).toBe('draft');
    expect(warn).toMatch(/no-op/);
  });

  // abandonSession

  it('active → abandoned', () => {
    const active = { ...draft, status: 'active' as SessionStatus };
    const { next, warn } = abandonSession(active);
    expect(next.status).toBe('abandoned');
    expect(warn).toBeNull();
  });

  it('abandonSession on draft is no-op with warning', () => {
    const { next, warn } = abandonSession(draft);
    expect(next.status).toBe('draft');
    expect(warn).toMatch(/no-op/);
  });

  // setExerciseIndex bounds

  it('setExerciseIndex within bounds passes through', () => {
    const active = { ...draft, status: 'active' as SessionStatus };
    const { next, warn } = setExerciseIndex(active, 2);
    expect(next.exerciseIndex).toBe(2);
    expect(warn).toBeNull();
  });

  it('setExerciseIndex out of bounds is clamped to max with warning', () => {
    const { next, warn } = setExerciseIndex(draft, 10);
    expect(next.exerciseIndex).toBe(2); // exerciseCount=3, max=2
    expect(warn).toMatch(/clamped/);
  });

  it('setExerciseIndex on single-exercise session clamps to 0', () => {
    const single = { ...draft, exerciseCount: 1 };
    const { next, warn } = setExerciseIndex(single, 5);
    expect(next.exerciseIndex).toBe(0);
    expect(warn).toMatch(/clamped/);
  });

  it('setExerciseIndex 0 on empty session returns 0', () => {
    const empty = { ...draft, exerciseCount: 0 };
    const { next } = setExerciseIndex(empty, 0);
    expect(next.exerciseIndex).toBe(0);
  });
});
