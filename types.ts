// --- TYPES UTILISATEURS ---
export interface User {
  id?: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: 'admin' | 'coach' | 'athlete';
  coachId?: string;
  email?: string;
}

// Alias pour compatibilité
export type UserRole = 'admin' | 'coach' | 'athlete';

// --- TYPES ENTRAINEMENT (Session Active) ---
// Version simplifiée pour le MVP (compatible avec DUMMY_DATA)
export interface WorkoutRow {
  Day: string;        // ex: "Lundi"
  Code: string;       // ex: "S1"
  Exercise: string;   // ex: "Développé Couché"
  Order: string;      // ex: "1"
  TargetSets: string; // ex: "4"
  TargetReps: string; // ex: "8-10"
  Rest: string;       // ex: "90"
  Video?: string;
  Notes?: string;
}

// Version complète pour le plan d'entraînement (Google Sheets)
export interface WorkoutRowFull {
  annee: string;
  moisNom: string;
  moisNum: string;
  semaine: string;
  seance: string;
  ordre: number;
  exercice: string;
  series: string;
  repsDuree: string;
  repos: string;
  tempoRpe: string;
  notes: string;
  video: string;
  retour: string;
}

// --- TYPES FILTRES ---
export interface FilterState {
  selectedAnnee: string | null;
  selectedMois: string | null;
  selectedSemaine: string | null;
  selectedSeances: string[];
}

// --- TYPES HISTORIQUE ---
export interface ExerciseLog {
  exerciseName: string;
  originalSession?: string;
  sets: SetLog[];
  notes?: string;
}

export interface SetLog {
  setNumber: number;
  reps: string;
  weight: string;
  completed: boolean;
}

export interface SessionLog {
  id: string;
  athleteName?: string;
  date: string; // ISO format
  durationMinutes?: number;
  sessionKey: SessionKey;
  exercises: ExerciseLog[];
  comments?: string;
}

// --- TYPES UTILITAIRES ---
export interface SessionKey {
  annee: string;
  moisNum: string;
  semaine: string;
  seance: string;
  // Anciens champs pour compatibilité
  year?: number;
  week?: number;
  name?: string;
}

// --- TYPES WEEK ORGANIZER ---
export interface WeekOrganizerLog {
  id: string;
  coachId: string;
  title: string;
  startDate: string;
  endDate: string;
  message: string;
  createdAt: string;
}
