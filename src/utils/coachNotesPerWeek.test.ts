import { describe, it, expect } from 'vitest';
import { mapTrainingPlanToWorkout, TrainingPlanRow, ProgramWeek } from '../../types';
import { groupByProgram } from './programUtils';

// feat/coach-notes-per-week : les notes du coach sont des lignes training_plans
// bloc-texte (is_text_block + text_block_content), par semaine. Ces tests
// verrouillent (1) le mapping DB→app et (2) la promesse cœur : deux semaines
// réutilisant le même template ont des notes INDÉPENDANTES.

function makeRow(overrides: Partial<TrainingPlanRow> = {}): TrainingPlanRow {
  return {
    id: 1,
    year: 2026,
    week: 1,
    seance_type: 'Push A',
    exercise_name: 'Bench Press',
    exercise_id: 'uuid-bench',
    order_index: 1,
    target_sets: '3',
    target_reps: '8',
    rest_time_sec: 90,
    video_url: null,
    Month: null,
    Month_num: null,
    Tempo: null,
    'Notes/Consignes': null,
    week_start_date: '2026-01-05',
    week_end_date: '2026-01-11',
    coach_id: 'coach-1',
    athlete_target: ['athlete-1'],
    execution_mode: 'straight',
    execution_group_id: null,
    execution_group_position: null,
    program_name: 'Prog Hypertrophie',
    source_template_id: 'tpl-A',
    is_text_block: false,
    text_block_content: null,
    ...overrides,
  };
}

const noteOf = (week: ProgramWeek): string | undefined =>
  week.sessions[0]?.rows.find(r => r.isTextBlock)?.textBlockContent;

describe('mapTrainingPlanToWorkout — blocs-texte', () => {
  it('mappe une ligne exercice (is_text_block=false)', () => {
    const w = mapTrainingPlanToWorkout(makeRow());
    expect(w.isTextBlock).toBe(false);
    expect(w.textBlockContent).toBeUndefined();
    expect(w.exerciseId).toBe('uuid-bench');
  });

  it('mappe une ligne bloc-texte (is_text_block=true, exercise_id null)', () => {
    const w = mapTrainingPlanToWorkout(
      makeRow({
        is_text_block: true,
        text_block_content: '<p>Échauffement 10min</p>',
        exercise_id: null,
        exercise_name: null,
      }),
    );
    expect(w.isTextBlock).toBe(true);
    expect(w.textBlockContent).toBe('<p>Échauffement 10min</p>');
    expect(w.exerciseId).toBeUndefined();
  });

  it('text_block_content NULL → undefined (pas de crash)', () => {
    const w = mapTrainingPlanToWorkout(makeRow({ is_text_block: true, text_block_content: null }));
    expect(w.textBlockContent).toBeUndefined();
  });
});

describe('Régression — notes coach indépendantes par semaine (même template)', () => {
  it('2 semaines réutilisant tpl-A ont des notes distinctes', () => {
    const rows: TrainingPlanRow[] = [
      // Semaine 1 (tpl-A)
      makeRow({ id: 1, week_start_date: '2026-01-05', week_end_date: '2026-01-11', order_index: 1 }),
      makeRow({
        id: 2, week_start_date: '2026-01-05', week_end_date: '2026-01-11', order_index: 0,
        is_text_block: true, text_block_content: '<p>Note semaine 1</p>', exercise_id: null, exercise_name: null,
      }),
      // Semaine 2 — MÊME template (tpl-A), MÊME séance, note DIFFÉRENTE
      makeRow({ id: 3, week_start_date: '2026-01-12', week_end_date: '2026-01-18', order_index: 1 }),
      makeRow({
        id: 4, week_start_date: '2026-01-12', week_end_date: '2026-01-18', order_index: 0,
        is_text_block: true, text_block_content: '<p>Note semaine 2 (différente)</p>', exercise_id: null, exercise_name: null,
      }),
    ];

    const programs = groupByProgram(rows.map(mapTrainingPlanToWorkout));
    expect(programs).toHaveLength(1);
    const weeks = programs[0].weeks;
    expect(weeks).toHaveLength(2);

    // Même template source sur les deux semaines…
    expect(weeks[0].sessions[0].sourceTemplateId).toBe('tpl-A');
    expect(weeks[1].sessions[0].sourceTemplateId).toBe('tpl-A');
    // …mais notes INDÉPENDANTES (le lien d'unicité est cassé)
    expect(noteOf(weeks[0])).toBe('<p>Note semaine 1</p>');
    expect(noteOf(weeks[1])).toBe('<p>Note semaine 2 (différente)</p>');
  });

  it('une séance sans bloc-texte ne renvoie aucune note', () => {
    const programs = groupByProgram([makeRow({ is_text_block: false })].map(mapTrainingPlanToWorkout));
    expect(noteOf(programs[0].weeks[0])).toBeUndefined();
  });
});
