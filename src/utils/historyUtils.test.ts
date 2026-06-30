import { describe, it, expect } from 'vitest';
import {
  isManualSession,
  isStravaSession,
  getSessionCommentDisplay,
  getCompletionRate,
  formatSetWeight,
  formatDateShort,
  formatDateFull,
  formatDateDisplay,
  toInputDateValue,
  formatDuration,
  groupSessionsByPeriod,
  MANUAL_ENTRY_MARKER,
  MANUAL_ENTRY_DISPLAY,
} from './historyUtils';
import { SessionLog, ExerciseLog, SetLog, SetLoad } from '../../types';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    setNumber: 1,
    reps: '10',
    weight: '50',
    completed: false,
    ...overrides,
  };
}

function makeExercise(overrides: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    exerciseName: 'Squat',
    sets: [makeSet()],
    ...overrides,
  };
}

function makeSession(overrides: Partial<SessionLog> = {}): SessionLog {
  return {
    id: 's1',
    date: '2026-01-15T12:00:00',
    sessionKey: { annee: '2026', moisNum: '1', semaine: '3', seance: 'Push A' },
    exercises: [makeExercise()],
    ...overrides,
  };
}

/** Date locale à N jours d'aujourd'hui, à midi (évite les bascules de fuseau). */
function daysAgoLocalNoon(n: number): string {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

// ─── isManualSession ────────────────────────────────────────────────────────────

describe('isManualSession', () => {
  it('reconnaît le marker MANUAL_ENTRY', () => {
    expect(isManualSession(makeSession({ comments: MANUAL_ENTRY_MARKER }))).toBe(true);
  });

  it('reconnaît la variante historique "manual_entry"', () => {
    expect(isManualSession(makeSession({ comments: 'manual_entry' }))).toBe(true);
  });

  it('renvoie false pour un commentaire normal', () => {
    expect(isManualSession(makeSession({ comments: 'Bonne séance' }))).toBe(false);
  });

  it('renvoie false sans commentaire', () => {
    expect(isManualSession(makeSession({ comments: undefined }))).toBe(false);
  });
});

// ─── isStravaSession ────────────────────────────────────────────────────────────

describe('isStravaSession', () => {
  it('détecte "strava" quelle que soit la casse', () => {
    expect(isStravaSession(makeSession({ sessionKey: { annee: '2026', moisNum: '1', semaine: '3', seance: 'Course STRAVA' } }))).toBe(true);
  });

  it('renvoie false pour une séance classique', () => {
    expect(isStravaSession(makeSession())).toBe(false);
  });
});

// ─── getSessionCommentDisplay ───────────────────────────────────────────────────

describe('getSessionCommentDisplay', () => {
  it('remplace le marker manuel par le texte d\'affichage', () => {
    expect(getSessionCommentDisplay(makeSession({ comments: MANUAL_ENTRY_MARKER }))).toBe(MANUAL_ENTRY_DISPLAY);
  });

  it('renvoie le commentaire tel quel sinon', () => {
    expect(getSessionCommentDisplay(makeSession({ comments: 'Bien' }))).toBe('Bien');
  });

  it('renvoie null sans commentaire', () => {
    expect(getSessionCommentDisplay(makeSession({ comments: undefined }))).toBeNull();
  });
});

// ─── getCompletionRate ──────────────────────────────────────────────────────────

describe('getCompletionRate', () => {
  it('renvoie 0 sans aucune série', () => {
    expect(getCompletionRate([])).toBe(0);
    expect(getCompletionRate([makeExercise({ sets: [] })])).toBe(0);
  });

  it('renvoie 100 quand tout est complété', () => {
    const ex = makeExercise({ sets: [makeSet({ completed: true }), makeSet({ completed: true })] });
    expect(getCompletionRate([ex])).toBe(100);
  });

  it('calcule un pourcentage arrondi sur plusieurs exercices', () => {
    const ex1 = makeExercise({ sets: [makeSet({ completed: true }), makeSet({ completed: false })] });
    const ex2 = makeExercise({ sets: [makeSet({ completed: true })] });
    // 2 complétées / 3 totales = 66.67 → 67
    expect(getCompletionRate([ex1, ex2])).toBe(67);
  });

  it('renvoie 0 si rien n\'est complété', () => {
    const ex = makeExercise({ sets: [makeSet({ completed: false }), makeSet({ completed: false })] });
    expect(getCompletionRate([ex])).toBe(0);
  });
});

// ─── formatSetWeight ────────────────────────────────────────────────────────────

describe('formatSetWeight', () => {
  it('sans load : affiche le poids brut', () => {
    expect(formatSetWeight(makeSet({ weight: '80' }))).toBe('80 kg.');
  });

  it('sans load et poids vide : tiret', () => {
    expect(formatSetWeight(makeSet({ weight: '' }))).toBe('-');
    expect(formatSetWeight(makeSet({ weight: '-' }))).toBe('-');
  });

  it('load single avec poids', () => {
    const load: SetLoad = { type: 'single', unit: 'kg', weightKg: 24 };
    expect(formatSetWeight(makeSet({ load }))).toBe('24 kg. (Haltères/Kettlebell)');
  });

  it('load single sans poids : retombe sur weight brut', () => {
    const load: SetLoad = { type: 'single', unit: 'kg', weightKg: null };
    expect(formatSetWeight(makeSet({ load, weight: '20' }))).toBe('20 kg.');
    expect(formatSetWeight(makeSet({ load, weight: '' }))).toBe('-');
  });

  it('load double', () => {
    const load: SetLoad = { type: 'double', unit: 'kg', weightKg: 16 };
    expect(formatSetWeight(makeSet({ load }))).toBe('2 X 16 kg. (2 X Haltères/Kettlebell)');
  });

  it('load barbell : barre + poids ajouté', () => {
    const load: SetLoad = { type: 'barbell', unit: 'kg', barKg: 20, addedKg: 40 };
    expect(formatSetWeight(makeSet({ load }))).toBe('60 kg. (Barre: 20 + Poids: 40)');
  });

  it('load barbell sans poids ajouté : total = barre, poids 0', () => {
    const load: SetLoad = { type: 'barbell', unit: 'kg', barKg: 20, addedKg: null };
    expect(formatSetWeight(makeSet({ load }))).toBe('20 kg. (Barre: 20 + Poids: 0)');
  });

  it('load machine', () => {
    const load: SetLoad = { type: 'machine', unit: 'kg', weightKg: 50 };
    expect(formatSetWeight(makeSet({ load }))).toBe('50 kg. (Sur machine)');
  });

  it('load assisted avec assistance', () => {
    const load: SetLoad = { type: 'assisted', unit: 'kg', assistanceKg: 30 };
    expect(formatSetWeight(makeSet({ load }))).toBe('-30 kg. (Assisté)');
  });

  it('load assisted sans valeur', () => {
    const load: SetLoad = { type: 'assisted', unit: 'kg', assistanceKg: null };
    expect(formatSetWeight(makeSet({ load }))).toBe('- (Assisté)');
  });

  it('load distance', () => {
    const load: SetLoad = { type: 'distance', unit: 'm', distanceValue: 100 };
    expect(formatSetWeight(makeSet({ load }))).toBe('100 m');
  });

  it('load distance sans valeur', () => {
    const load: SetLoad = { type: 'distance', unit: 'cm', distanceValue: null };
    expect(formatSetWeight(makeSet({ load }))).toBe('- (Distance)');
  });
});

// ─── Date formatting ────────────────────────────────────────────────────────────

describe('formatDateShort', () => {
  it('extrait jour et mois court', () => {
    const r = formatDateShort('2026-01-15T12:00:00');
    expect(r.day).toBe('15');
    expect(r.month.length).toBeGreaterThan(0);
    expect(r.month).not.toContain('.'); // le point abréviatif est retiré
  });
});

describe('formatDateFull', () => {
  it('renvoie jour, mois, année et libellés non vides', () => {
    const r = formatDateFull('2026-01-15T12:00:00');
    expect(r.day).toBe('15');
    expect(r.year).toBe(2026);
    expect(r.weekday.length).toBeGreaterThan(0);
    expect(r.full.length).toBeGreaterThan(0);
  });
});

describe('formatDateDisplay', () => {
  it('délègue au format court', () => {
    expect(formatDateDisplay('2026-01-15T12:00:00', 'short')).toEqual(formatDateShort('2026-01-15T12:00:00'));
  });

  it('délègue au format complet', () => {
    expect(formatDateDisplay('2026-01-15T12:00:00', 'full')).toEqual(formatDateFull('2026-01-15T12:00:00'));
  });
});

describe('toInputDateValue', () => {
  it('convertit en AAAA-MM-JJ avec zéros de tête', () => {
    expect(toInputDateValue('2026-03-05T12:00:00')).toBe('2026-03-05');
  });
});

// ─── formatDuration ─────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('renvoie un tiret pour 0, null ou undefined', () => {
    expect(formatDuration(0)).toBe('-');
    expect(formatDuration(null)).toBe('-');
    expect(formatDuration(undefined)).toBe('-');
  });

  it('affiche les minutes sous une heure', () => {
    expect(formatDuration(45)).toBe('45 min');
  });

  it('affiche les heures pleines sans minutes', () => {
    expect(formatDuration(120)).toBe('2h');
  });

  it('affiche heures + minutes avec zéro de tête', () => {
    expect(formatDuration(90)).toBe('1h30');
    expect(formatDuration(65)).toBe('1h05');
  });
});

// ─── groupSessionsByPeriod ──────────────────────────────────────────────────────

describe('groupSessionsByPeriod', () => {
  it('renvoie un tableau vide sans sessions', () => {
    expect(groupSessionsByPeriod([])).toEqual([]);
  });

  it('classe une session du jour sous "Aujourd\'hui"', () => {
    const result = groupSessionsByPeriod([makeSession({ date: daysAgoLocalNoon(0) })]);
    expect(result[0].label).toBe("Aujourd'hui");
    expect(result[0].sessions).toHaveLength(1);
  });

  it('classe une vieille session sous "Plus ancien"', () => {
    const result = groupSessionsByPeriod([makeSession({ date: daysAgoLocalNoon(60) })]);
    const older = result.find(g => g.label === 'Plus ancien');
    expect(older).toBeDefined();
    expect(older!.sessions).toHaveLength(1);
  });

  it('ne crée que les groupes non vides', () => {
    const result = groupSessionsByPeriod([
      makeSession({ id: 'a', date: daysAgoLocalNoon(0) }),
      makeSession({ id: 'b', date: daysAgoLocalNoon(60) }),
    ]);
    const labels = result.map(g => g.label);
    expect(labels).toContain("Aujourd'hui");
    expect(labels).toContain('Plus ancien');
    // Pas de groupe vide
    result.forEach(g => expect(g.sessions.length).toBeGreaterThan(0));
  });
});
