import { describe, it, expect } from 'vitest';
import { groupByProgram, getCurrentWeekIndex, formatWeekLabel } from './programUtils';
import { WorkoutRow } from '../../types';

function makeRow(overrides: Partial<WorkoutRow> = {}): WorkoutRow {
  return {
    id: 1,
    annee: '2026',
    moisNom: 'janvier',
    moisNum: '1',
    semaine: '1',
    seance: 'Push A',
    ordre: 1,
    exercice: 'Bench Press',
    series: '3',
    repsDuree: '8',
    repos: '90',
    tempoRpe: '',
    notes: '',
    video: '',
    weekStartDate: '2026-01-06',
    weekEndDate: '2026-01-12',
    programName: 'Programme Force',
    ...overrides,
  };
}

// ─── groupByProgram ───────────────────────────────────────────────────────────

describe('groupByProgram', () => {
  it('returns [] for empty input', () => {
    expect(groupByProgram([])).toEqual([]);
  });

  it('groups exercises of the same session into one ProgramSession', () => {
    const rows = [
      makeRow({ exercice: 'Bench Press', ordre: 1 }),
      makeRow({ exercice: 'Squat', ordre: 2 }),
    ];
    const programs = groupByProgram(rows);
    expect(programs).toHaveLength(1);
    expect(programs[0].weeks[0].sessions[0].rows).toHaveLength(2);
  });

  it('creates separate ProgramWeek entries per weekStartDate', () => {
    const rows = [
      makeRow({ weekStartDate: '2026-01-06', weekEndDate: '2026-01-12' }),
      makeRow({ weekStartDate: '2026-01-13', weekEndDate: '2026-01-19' }),
    ];
    const programs = groupByProgram(rows);
    expect(programs[0].weeks).toHaveLength(2);
  });

  it('creates separate AthleteProgram entries per programName', () => {
    const rows = [
      makeRow({ programName: 'Programme Force' }),
      makeRow({ programName: 'Programme Cardio' }),
    ];
    const programs = groupByProgram(rows);
    expect(programs).toHaveLength(2);
  });

  it('skips rows with undefined weekStartDate', () => {
    const rows = [
      makeRow({ weekStartDate: undefined }),
      makeRow({ weekStartDate: '2026-01-06' }),
    ];
    const programs = groupByProgram(rows);
    expect(programs[0].weeks[0].sessions[0].rows).toHaveLength(1);
  });

  it('skips rows with empty seance', () => {
    const rows = [
      makeRow({ seance: '' }),
      makeRow({ seance: 'Push A' }),
    ];
    const programs = groupByProgram(rows);
    expect(programs[0].weeks[0].sessions).toHaveLength(1);
  });

  it('sorts exercises by ordre within a session', () => {
    const rows = [
      makeRow({ exercice: 'Squat', ordre: 2 }),
      makeRow({ exercice: 'Bench Press', ordre: 1 }),
    ];
    const programs = groupByProgram(rows);
    const sessionRows = programs[0].weeks[0].sessions[0].rows;
    expect(sessionRows[0].exercice).toBe('Bench Press');
    expect(sessionRows[1].exercice).toBe('Squat');
  });

  it('sorts weeks by weekStartDate ascending', () => {
    const rows = [
      makeRow({ weekStartDate: '2026-01-13' }),
      makeRow({ weekStartDate: '2026-01-06' }),
    ];
    const programs = groupByProgram(rows);
    expect(programs[0].weeks[0].weekStartDate).toBe('2026-01-06');
    expect(programs[0].weeks[1].weekStartDate).toBe('2026-01-13');
  });
});

// ─── getCurrentWeekIndex ──────────────────────────────────────────────────────

describe('getCurrentWeekIndex', () => {
  const makeWeeks = (starts: string[]) =>
    starts.map(s => ({
      weekStartDate: s,
      weekEndDate: null,
      weekLabel: s,
      sessions: [],
    }));

  it('returns 0 for empty weeks array', () => {
    expect(getCurrentWeekIndex([], new Date('2026-01-08'))).toBe(0);
  });

  it('returns index of week containing today', () => {
    const weeks = makeWeeks(['2026-01-06', '2026-01-13', '2026-01-20']);
    expect(getCurrentWeekIndex(weeks, new Date('2026-01-14'))).toBe(1);
  });

  it('returns 0 when today is before all weeks', () => {
    const weeks = makeWeeks(['2026-02-01', '2026-02-08']);
    expect(getCurrentWeekIndex(weeks, new Date('2026-01-01'))).toBe(0);
  });

  it('returns last index when today is after all weeks', () => {
    const weeks = makeWeeks(['2026-01-06', '2026-01-13']);
    expect(getCurrentWeekIndex(weeks, new Date('2026-06-01'))).toBe(1);
  });
});

// ─── formatWeekLabel ─────────────────────────────────────────────────────────

describe('formatWeekLabel', () => {
  it('formats a range when both dates present', () => {
    const label = formatWeekLabel('2026-01-06', '2026-01-12');
    expect(label).toContain('janv');
  });

  it('uses fallback label when no endDate', () => {
    const label = formatWeekLabel('2026-01-06');
    expect(label).toContain('janv');
    expect(label).toContain('Sem.');
  });
});
