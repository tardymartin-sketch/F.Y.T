import { describe, it, expect } from 'vitest';

// ─── Inline copy of deduplicateMostUsed (private in sessions.api.ts) ─────────
// We test the pure logic here independently of the API layer.

interface UsageRow {
  exercise_id: string | null;
  exercise_name: string;
  weight_kg: number | null;
  used_at: string;
}

interface MostUsedExercise {
  exerciseId: string | null;
  exerciseName: string;
  lastWeightKg: number | null;
  lastUsedAt: string;
}

function deduplicateMostUsed(rows: UsageRow[]): MostUsedExercise[] {
  const seen = new Set<string>();
  const result: MostUsedExercise[] = [];
  for (const row of rows) {
    const key = row.exercise_name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push({
        exerciseId: row.exercise_id,
        exerciseName: row.exercise_name,
        lastWeightKg: row.weight_kg,
        lastUsedAt: row.used_at,
      });
      if (result.length >= 8) break;
    }
  }
  return result;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeRow(name: string, daysAgo: number, weightKg: number | null = 100): UsageRow {
  const d = new Date(Date.now() - daysAgo * 86400000);
  return {
    exercise_id: `id-${name}`,
    exercise_name: name,
    weight_kg: weightKg,
    used_at: d.toISOString(),
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('deduplicateMostUsed', () => {
  it('returns empty array for empty input', () => {
    expect(deduplicateMostUsed([])).toEqual([]);
  });

  it('returns all unique exercises when fewer than 8', () => {
    const rows = [
      makeRow('Bench Press', 1),
      makeRow('Incline Press', 2),
      makeRow('Dumbbell Fly', 3),
    ];
    const result = deduplicateMostUsed(rows);
    expect(result).toHaveLength(3);
    expect(result.map(r => r.exerciseName)).toEqual(['Bench Press', 'Incline Press', 'Dumbbell Fly']);
  });

  it('deduplicates by name (case-insensitive), keeps first occurrence', () => {
    // Bench appears at 1d and 4d — should keep 1d (first in array = most recent)
    const rows = [
      makeRow('Bench Press', 1, 100),
      makeRow('Incline Press', 2, 80),
      makeRow('Bench Press', 4, 90), // duplicate, stale
      makeRow('Dumbbell Fly', 5, 30),
    ];
    const result = deduplicateMostUsed(rows);
    expect(result).toHaveLength(3);
    expect(result[0].exerciseName).toBe('Bench Press');
    expect(result[0].lastWeightKg).toBe(100); // kept most recent, not 90
  });

  it('returns at most 8 unique exercises even if input has more', () => {
    const rows = Array.from({ length: 20 }, (_, i) => makeRow(`Exercise ${i}`, i));
    const result = deduplicateMostUsed(rows);
    expect(result).toHaveLength(8);
  });

  it('handles case where user has fewer than 8 unique exercises across 20 rows', () => {
    // 3 unique exercises repeated across 20 rows
    const names = ['Bench Press', 'Incline Press', 'Dumbbell Fly'];
    const rows: UsageRow[] = [];
    for (let i = 0; i < 20; i++) {
      rows.push(makeRow(names[i % 3], i));
    }
    const result = deduplicateMostUsed(rows);
    expect(result).toHaveLength(3);
    expect(new Set(result.map(r => r.exerciseName)).size).toBe(3);
  });

  it('preserves order (most recent first)', () => {
    const rows = [
      makeRow('Tricep Pushdown', 1),
      makeRow('Bench Press', 2),
      makeRow('Squat', 3),
    ];
    const result = deduplicateMostUsed(rows);
    expect(result.map(r => r.exerciseName)).toEqual(['Tricep Pushdown', 'Bench Press', 'Squat']);
  });

  it('handles null weight_kg gracefully', () => {
    const rows = [makeRow('Bench Press', 1, null)];
    const result = deduplicateMostUsed(rows);
    expect(result[0].lastWeightKg).toBeNull();
  });

  it('treats names as case-insensitive duplicates', () => {
    const rows = [
      { exercise_id: 'a', exercise_name: 'bench press', weight_kg: 100, used_at: new Date().toISOString() },
      { exercise_id: 'b', exercise_name: 'Bench Press', weight_kg: 90, used_at: new Date(Date.now() - 86400000).toISOString() },
    ];
    const result = deduplicateMostUsed(rows);
    expect(result).toHaveLength(1);
    expect(result[0].lastWeightKg).toBe(100);
  });
});
