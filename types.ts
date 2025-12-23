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
  
  // --- TYPES ENTRAINEMENT (Session Active) ---
  // Correspond à une ligne de votre plan d'entraînement (anciennement CSV)
  export interface WorkoutRow {
    Day: string;      // ex: "Monday"
    Code: string;     // ex: "S1"
    Exercise: string; // ex: "Bench Press"
    Order: string;    // ex: "1"
    TargetSets: string; // ex: "4"
    TargetReps: string; // ex: "8-12"
    Rest: string;     // ex: "90"
    Video?: string;
    Notes?: string;
  }
  
  // --- TYPES HISTORIQUE ---
  export interface ExerciseLog {
    exerciseName: string;
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
    date: string; // ISO format
    duration_minutes: number;
    session_key: {
      year: number;
      week: number;
      name: string;
    };
    exercises: ExerciseLog[];
    comments?: string;
  }
  
  // --- TYPES UTILITAIRES ---
  export interface SessionKey {
    year: number;
    week: number;
    name: string;
  }