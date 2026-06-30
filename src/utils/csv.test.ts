import { describe, it, expect } from 'vitest';
import { transformSimpleToWorkoutRows } from './csv';

describe('transformSimpleToWorkoutRows', () => {
  it('renvoie un tableau vide pour une entrée vide', () => {
    expect(transformSimpleToWorkoutRows([])).toEqual([]);
  });

  it('mappe les colonnes du format simple vers WorkoutRow', () => {
    const [row] = transformSimpleToWorkoutRows([
      { Code: 'S2', Exercise: 'Squat', Order: '3', TargetSets: '4', TargetReps: '6-8', Rest: '120', Video: 'http://v', Notes: 'go' },
    ]);
    expect(row.seance).toBe('2'); // "S2" → "2" (le S est retiré)
    expect(row.exercice).toBe('Squat');
    expect(row.ordre).toBe(3);
    expect(row.series).toBe('4');
    expect(row.repsDuree).toBe('6-8');
    expect(row.repos).toBe('120');
    expect(row.video).toBe('http://v');
    expect(row.notes).toBe('go');
  });

  it('applique les valeurs par défaut quand les champs manquent', () => {
    const [row] = transformSimpleToWorkoutRows([{ Exercise: 'Pompes' }]);
    expect(row.series).toBe('3');
    expect(row.repsDuree).toBe('10');
    expect(row.repos).toBe('60');
    expect(row.tempoRpe).toBe('2010');
    expect(row.notes).toBe('');
    expect(row.video).toBe('');
  });

  it('utilise l\'index (+1) comme ordre quand Order est absent', () => {
    const rows = transformSimpleToWorkoutRows([{ Exercise: 'A' }, { Exercise: 'B' }]);
    expect(rows[0].ordre).toBe(1);
    expect(rows[1].ordre).toBe(2);
  });

  it('génère des id uniques basés sur l\'index', () => {
    const rows = transformSimpleToWorkoutRows([{ Exercise: 'A' }, { Exercise: 'B' }]);
    expect(rows[0].id).toBe(100);
    expect(rows[1].id).toBe(101);
  });

  it('accepte aussi les champs déjà en format WorkoutRow (exercice/series…)', () => {
    const [row] = transformSimpleToWorkoutRows([{ exercice: 'Tractions', series: '5', repsDuree: '5' }]);
    expect(row.exercice).toBe('Tractions');
    expect(row.series).toBe('5');
  });

  it('seance vaut "1" par défaut si Code absent', () => {
    const [row] = transformSimpleToWorkoutRows([{ Exercise: 'A' }]);
    expect(row.seance).toBe('1');
  });
});
