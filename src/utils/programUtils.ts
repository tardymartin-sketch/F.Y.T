import { WorkoutRow, AthleteProgram, ProgramWeek, ProgramSession } from '../../types';

export function formatWeekLabel(startDate: string, endDate?: string | null): string {
  const fmt = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };
  if (!endDate) return `Sem. du ${fmt(startDate)}`;
  return `${fmt(startDate)} – ${fmt(endDate)}`;
}

/** Regroupe les rows training_plans en AthleteProgram[].
 *  Ignore les rows sans seance_type ou sans weekStartDate. */
export function groupByProgram(rows: WorkoutRow[]): AthleteProgram[] {
  // programName → weekKey → seanceType → rows
  const programMap = new Map<string, Map<string, { week: ProgramWeek; sessions: Map<string, WorkoutRow[]> }>>();

  for (const row of rows) {
    if (!row.programName) continue;
    if (!row.weekStartDate) continue;
    if (!row.seance) continue;

    if (!programMap.has(row.programName)) {
      programMap.set(row.programName, new Map());
    }
    const weekMap = programMap.get(row.programName)!;

    const weekKey = row.weekStartDate;
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, {
        week: {
          weekStartDate: row.weekStartDate,
          weekEndDate: row.weekEndDate ?? null,
          weekLabel: formatWeekLabel(row.weekStartDate, row.weekEndDate),
          sessions: [],
        },
        sessions: new Map(),
      });
    }
    const { sessions } = weekMap.get(weekKey)!;

    if (!sessions.has(row.seance)) {
      sessions.set(row.seance, []);
    }
    sessions.get(row.seance)!.push(row);
  }

  const programs: AthleteProgram[] = [];

  for (const [programName, weekMap] of programMap) {
    const weeks: ProgramWeek[] = [];

    const sortedWeekKeys = [...weekMap.keys()].sort();
    for (const weekKey of sortedWeekKeys) {
      const { week, sessions } = weekMap.get(weekKey)!;
      const builtSessions: ProgramSession[] = [];

      for (const [seanceType, sessionRows] of sessions) {
        const sorted = [...sessionRows].sort((a, b) => a.ordre - b.ordre);
        builtSessions.push({
          seanceType,
          rows: sorted,
          sourceTemplateId: sorted[0]?.sourceTemplateId,
        });
      }

      weeks.push({ ...week, sessions: builtSessions });
    }

    programs.push({ programName, weeks });
  }

  return programs;
}

/** Retourne l'index de la semaine qui contient today, ou la plus proche dans le futur.
 *  Fallback : 0 si tout est dans le futur, last index si tout est dans le passé. */
export function getCurrentWeekIndex(weeks: ProgramWeek[], today: Date): number {
  if (weeks.length === 0) return 0;

  const todayMs = today.getTime();

  for (let i = 0; i < weeks.length; i++) {
    const start = new Date(weeks[i].weekStartDate + 'T00:00:00').getTime();
    const endStr = weeks[i].weekEndDate;
    const end = endStr
      ? new Date(endStr + 'T23:59:59').getTime()
      : start + 6 * 86400000;

    if (todayMs >= start && todayMs <= end) return i;
  }

  // Today is before the first week → show first
  const firstStart = new Date(weeks[0].weekStartDate + 'T00:00:00').getTime();
  if (todayMs < firstStart) return 0;

  // Today is after the last week → show last
  return weeks.length - 1;
}
