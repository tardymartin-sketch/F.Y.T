import { supabase } from '../../supabaseClient';
import { WorkoutRow, mapTrainingPlanToWorkout, TrainingPlanRow } from '../../../types';

/**
 * Service pour la gestion des plans d'entraînement (training_plans)
 */
export const trainingApi = {
  /**
   * Récupère les plans d'entraînement visibles pour l'utilisateur.
   * Version Rollback : Reprise exacte de la logique originale de supabaseService.ts
   */
  async getTrainingPlans(): Promise<WorkoutRow[]> {
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
      .order('year', { ascending: false })
      .order('week', { ascending: true })
      .order('order_index', { ascending: true });

    if (error) {
      console.error('Error fetching training plans:', error);
      throw error;
    }

    // Mapping sécurisé identique à l'original
    return (data || []).map((row: any) => {
      const workout = mapTrainingPlanToWorkout(row as TrainingPlanRow);

      if (row.exercises) {
        workout.exercice = row.exercises.name || workout.exercice;
        workout.video = row.exercises.video_url || workout.video;
        workout.tempoRpe = row.exercises.tempo || workout.tempoRpe;
        workout.notes = row.exercises.coach_instructions || workout.notes;
      }

      return workout;
    });
  }
};
