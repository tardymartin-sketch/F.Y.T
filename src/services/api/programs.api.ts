import { supabase } from '../../supabaseClient';
import {
  AthleteProgram,
  TrainingPlanRow,
  mapTrainingPlanToWorkout,
} from '../../../types';
import { groupByProgram } from '../../utils/programUtils';

export const programsApi = {
  /** Récupère les programmes assignés à un athlète depuis training_plans.
   *  Filtre sur athlete_target @> [userId] et program_name IS NOT NULL. */
  async getAthleteProgramSessions(userId: string): Promise<AthleteProgram[]> {
    const { data, error } = await supabase
      .from('training_plans')
      .select(`
        *,
        exercises (
          id,
          name,
          video_url,
          tempo,
          coach_instructions
        )
      `)
      .contains('athlete_target', [userId])
      .not('program_name', 'is', null)
      .order('program_name', { ascending: true })
      .order('week_start_date', { ascending: true })
      .order('order_index', { ascending: true });

    if (error) throw error;

    const rows = (data || []).map((row: any) => {
      const workout = mapTrainingPlanToWorkout(row as TrainingPlanRow);
      // Enrichissement depuis le join exercises (même pattern que training.api.ts)
      if (row.exercises) {
        workout.exercice = row.exercises.name || workout.exercice;
        workout.video = row.exercises.video_url || workout.video;
        workout.tempoRpe = row.exercises.tempo || workout.tempoRpe;
        workout.notes = row.exercises.coach_instructions || workout.notes;
      }
      return workout;
    });

    return groupByProgram(rows);
  },

  // NOTE: getSessionTextBlocks() retiré (feat/coach-notes-per-week).
  // Les notes du coach sont désormais découplées du template et stockées par
  // semaine dans training_plans (is_text_block + text_block_content). Elles
  // arrivent donc directement dans les WorkoutRow via getAthleteProgramSessions
  // ci-dessus, et sont rendues par TextBlockBanner depuis sessionData.
  // La table session_text_blocks reste en base (legacy/template) mais n'est
  // plus lue par l'app.
};
