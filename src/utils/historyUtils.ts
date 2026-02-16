// ============================================================
// F.Y.T - HISTORY UTILITIES
// src/utils/historyUtils.ts
// Fonctions utilitaires partagées entre HistoryMobile et HistoryDesktop
// ============================================================

import { SessionLog, ExerciseLog, SetLog } from '../../types';

// ===========================================
// CONSTANTS
// ===========================================

export const MANUAL_ENTRY_MARKER = 'MANUAL_ENTRY';
export const MANUAL_ENTRY_DISPLAY = 'Séance insérée manuellement';

// ===========================================
// SESSION HELPERS
// ===========================================

/**
 * Vérifie si une session a été insérée manuellement
 */
export function isManualSession(session: SessionLog): boolean {
  return session.comments === MANUAL_ENTRY_MARKER || session.comments === 'manual_entry';
}

/**
 * Vérifie si une session est une session Strava
 */
export function isStravaSession(session: SessionLog): boolean {
  return session.sessionKey.seance.toLowerCase().includes('strava');
}

/**
 * Retourne le texte de commentaire à afficher (gère le marker manuel)
 */
export function getSessionCommentDisplay(session: SessionLog): string | null {
  if (isManualSession(session)) {
    return MANUAL_ENTRY_DISPLAY;
  }
  return session.comments || null;
}

// ===========================================
// COMPLETION RATE
// ===========================================

/**
 * Calcule le taux de complétion d'une séance (% de séries complétées)
 */
export function getCompletionRate(exercises: ExerciseLog[]): number {
  const totalSets = exercises.reduce((acc, ex) => acc + ex.sets.length, 0);
  const completedSets = exercises.reduce(
    (acc, ex) => acc + ex.sets.filter(s => s.completed).length,
    0
  );
  return totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;
}

// ===========================================
// SET WEIGHT FORMATTING
// ===========================================

/**
 * Formate le poids d'une série en fonction du type de charge
 * Gère tous les types: single, double, barbell, machine, assisted, distance
 */
export function formatSetWeight(set: SetLog): string {
  // Si pas de données JSONB (load), afficher simplement le poids
  if (!set.load) {
    const weight = set.weight || '-';
    return weight === '-' ? '-' : `${weight} kg.`;
  }

  const load = set.load;

  if (load.type === 'single') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return weightText === '-' ? '-' : `${weightText} kg.`;
    }
    return `${weight} kg. (Haltères/Kettlebell)`;
  }

  if (load.type === 'double') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return weightText === '-' ? '-' : `${weightText} kg.`;
    }
    return `2 X ${weight} kg. (2 X Haltères/Kettlebell)`;
  }

  if (load.type === 'barbell') {
    const barKg = typeof load.barKg === 'number' ? load.barKg : 20;
    const addedKg = typeof load.addedKg === 'number' ? load.addedKg : null;
    const total = addedKg !== null ? barKg + addedKg : barKg;
    if (addedKg === null) {
      return `${total} kg. (Barre: ${barKg} + Poids: 0)`;
    }
    return `${total} kg. (Barre: ${barKg} + Poids: ${addedKg})`;
  }

  if (load.type === 'machine') {
    const weight = typeof load.weightKg === 'number' ? load.weightKg : null;
    if (weight === null) {
      const weightText = set.weight || '-';
      return weightText === '-' ? '-' : `${weightText} kg.`;
    }
    return `${weight} kg. (Sur machine)`;
  }

  if (load.type === 'assisted') {
    const assistance = typeof load.assistanceKg === 'number' ? load.assistanceKg : null;
    if (assistance === null) {
      return '- (Assisté)';
    }
    return `-${assistance} kg. (Assisté)`;
  }

  if (load.type === 'distance') {
    const distance = typeof load.distanceValue === 'number' ? load.distanceValue : null;
    if (distance === null) {
      return '- (Distance)';
    }
    return `${distance} ${load.unit}`;
  }

  const weightText = set.weight || '-';
  return weightText === '-' ? '-' : `${weightText} kg.`;
}

// ===========================================
// DATE FORMATTING
// ===========================================

export interface DateDisplayShort {
  day: string;
  month: string;
}

export interface DateDisplayFull {
  day: string;
  month: string;
  full: string;
  weekday: string;
  year: number;
}

/**
 * Formate une date pour affichage court (jour + mois)
 */
export function formatDateShort(dateString: string): DateDisplayShort {
  const date = new Date(dateString);
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '')
  };
}

/**
 * Formate une date pour affichage complet
 */
export function formatDateFull(dateString: string): DateDisplayFull {
  const date = new Date(dateString);
  return {
    day: date.getDate().toString(),
    month: date.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    full: date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }),
    weekday: date.toLocaleDateString('fr-FR', { weekday: 'long' }),
    year: date.getFullYear()
  };
}

/**
 * Formate une date selon le format demandé
 */
export function formatDateDisplay(
  dateString: string,
  format: 'short' | 'full'
): DateDisplayShort | DateDisplayFull {
  if (format === 'short') {
    return formatDateShort(dateString);
  }
  return formatDateFull(dateString);
}

/**
 * Convertit une date ISO en valeur pour input[type="date"]
 */
export function toInputDateValue(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ===========================================
// DURATION FORMATTING
// ===========================================

/**
 * Formate une durée en minutes de façon lisible
 */
export function formatDuration(minutes: number | undefined | null): string {
  if (!minutes) return '-';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return `${hours}h`;
  return `${hours}h${mins.toString().padStart(2, '0')}`;
}

// ===========================================
// SESSION GROUPING
// ===========================================

export interface GroupedSessions {
  label: string;
  sessions: SessionLog[];
}

/**
 * Groupe les sessions par période (Aujourd'hui, Cette semaine, etc.)
 */
export function groupSessionsByPeriod(sessions: SessionLog[]): GroupedSessions[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const today = now.getTime();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1);
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setDate(lastWeekStart.getDate() - 7);

  const groups: Map<string, SessionLog[]> = new Map([
    ['today', []],
    ['thisWeek', []],
    ['lastWeek', []],
    ['older', []]
  ]);

  sessions.forEach(session => {
    const sessionDate = new Date(session.date);
    sessionDate.setHours(0, 0, 0, 0);
    const sessionTime = sessionDate.getTime();

    if (sessionTime === today) {
      groups.get('today')!.push(session);
    } else if (sessionTime >= weekStart.getTime()) {
      groups.get('thisWeek')!.push(session);
    } else if (sessionTime >= lastWeekStart.getTime()) {
      groups.get('lastWeek')!.push(session);
    } else {
      groups.get('older')!.push(session);
    }
  });

  const result: GroupedSessions[] = [];

  if (groups.get('today')!.length > 0) {
    result.push({ label: "Aujourd'hui", sessions: groups.get('today')! });
  }
  if (groups.get('thisWeek')!.length > 0) {
    result.push({ label: 'Cette semaine', sessions: groups.get('thisWeek')! });
  }
  if (groups.get('lastWeek')!.length > 0) {
    result.push({ label: 'Semaine dernière', sessions: groups.get('lastWeek')! });
  }
  if (groups.get('older')!.length > 0) {
    result.push({ label: 'Plus ancien', sessions: groups.get('older')! });
  }

  return result;
}
