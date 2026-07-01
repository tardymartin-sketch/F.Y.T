import { describe, it, expect } from 'vitest';
import {
  normalizeExerciseName,
  mergeFamilyAliases,
  EXERCISE_FAMILY_ALIASES,
} from './exerciseFamily';

describe('normalizeExerciseName', () => {
  it('supprime les accents', () => {
    expect(normalizeExerciseName('Développé couché')).toBe('developpe couche');
    expect(normalizeExerciseName('Élévations latérales')).toBe('elevations laterales');
  });

  it('est insensible à la casse', () => {
    expect(normalizeExerciseName('Bench Press')).toBe('bench press');
    expect(normalizeExerciseName('SQUAT')).toBe('squat');
  });

  it('réduit ponctuation et espaces multiples à un espace simple', () => {
    expect(normalizeExerciseName('Pull-ups')).toBe('pull ups');
    expect(normalizeExerciseName('Rollout (roue abdominale)')).toBe('rollout roue abdominale');
    expect(normalizeExerciseName('  Squat   avant ')).toBe('squat avant');
  });

  it('retire le suffixe de variante " :: xxx"', () => {
    expect(normalizeExerciseName('bras de fer chinois :: Variante test')).toBe(
      'bras de fer chinois',
    );
    expect(normalizeExerciseName('Développé couché à la barre :: Prise serrée')).toBe(
      'developpe couche a la barre',
    );
  });

  it('rend identiques deux écritures du même mouvement', () => {
    expect(normalizeExerciseName('Développé couché')).toBe(
      normalizeExerciseName('developpe  COUCHE'),
    );
  });
});

describe('mergeFamilyAliases', () => {
  it('rattache les noms anglais/raccourcis non présents en base', () => {
    const map = mergeFamilyAliases({});
    expect(map[normalizeExerciseName('Bench Press')]).toBe('bench_press');
    expect(map[normalizeExerciseName('Pull-ups')]).toBe('vertical_pull');
    expect(map[normalizeExerciseName('Dips')]).toBe('tricep_extension');
    expect(map[normalizeExerciseName('Lunges')]).toBe('lunge');
    expect(map[normalizeExerciseName('Soulevé de terre')]).toBe('deadlift');
  });

  it('n’écrase pas une entrée déjà fournie par la base', () => {
    const map = mergeFamilyAliases({ dips: 'from_db' });
    expect(map['dips']).toBe('from_db');
  });

  it('mute la map en place et la retourne', () => {
    const original: Record<string, string> = {};
    const returned = mergeFamilyAliases(original);
    expect(returned).toBe(original);
    expect(Object.keys(original).length).toBeGreaterThan(0);
  });

  it('toutes les clés d’alias sont déjà normalisées', () => {
    for (const alias of Object.keys(EXERCISE_FAMILY_ALIASES)) {
      expect(alias).toBe(normalizeExerciseName(alias));
    }
  });
});

// Verrouille le comportement de matching tel que consommé par getAllExerciseHistory :
// deux exercices sont regroupés si leurs noms normalisés pointent vers la même famille.
describe('matching de famille via la map', () => {
  const map = mergeFamilyAliases({
    [normalizeExerciseName('Développé couché à la barre')]: 'bench_press',
    [normalizeExerciseName('Développé couché haltères')]: 'bench_press',
  });

  const familyOf = (name: string) => map[normalizeExerciseName(name)] ?? null;

  it('regroupe les variantes françaises de la même famille', () => {
    expect(familyOf('Développé couché à la barre')).toBe('bench_press');
    expect(familyOf('Développé couché haltères')).toBe('bench_press');
  });

  it('rattache un alias anglais à la même famille que les variantes FR', () => {
    expect(familyOf('Bench Press')).toBe('bench_press');
    expect(familyOf('Bench Press')).toBe(familyOf('Développé couché à la barre'));
  });

  it('retourne null pour un mouvement non mappé', () => {
    expect(familyOf('Mountain climbers')).toBeNull();
  });
});
