import { supabase } from '../../supabaseClient';
import { User, ProfileRow } from '../../../types';

/**
 * Service pour la gestion de l'authentification et des profils
 */
export const authApi = {
  /**
   * Récupère le profil complet d'un utilisateur
   */
  async getUserProfile(userId: string): Promise<User> {
    const { data, error } = await supabase
      .from('profiles')
      .select(`
        id,
        username,
        first_name,
        last_name,
        email,
        role,
        coach_id,
        created_at
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;

    const profile = data as ProfileRow;
    return {
      id: profile.id,
      username: profile.username || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      email: profile.email || '',
      role: profile.role as 'athlete' | 'coach' | 'admin',
      coachId: profile.coach_id ?? undefined
    };
  },

  /**
   * Vérifie si un coach a des athlètes liés
   */
  async hasAthletes(coachId: string): Promise<boolean> {
    const { count, error } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('coach_id', coachId);

    if (error) throw error;
    return (count || 0) > 0;
  }
};
