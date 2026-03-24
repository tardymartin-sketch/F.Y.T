import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stravaService } from './stravaService';
import { supabase } from '../supabaseClient';
import { syncUserBadgesProgress } from './badgeService';

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      upsert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: vi.fn().mockReturnThis(),
      select_id: vi.fn().mockReturnThis(),
    })),
  },
}));

vi.mock('./badgeService', () => ({
  syncUserBadgesProgress: vi.fn(),
}));

describe('stravaService.importToHistory Performance Baseline', () => {
  const userId = 'user-123';
  const activityIds = ['act-1', 'act-2', 'act-3'];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('measures the number of database calls (optimized)', async () => {
    const mockFrom = vi.mocked(supabase.from);

    const mockActivities = activityIds.map(id => ({
      id,
      user_id: userId,
      name: `Activity ${id}`,
      sport_type: 'Run',
      moving_time: 3600,
      start_date: '2023-01-01T08:00:00Z',
      start_date_local: '2023-01-01T09:00:00',
      distance: 10000,
      total_elevation_gain: 100,
      average_heartrate: 150,
      max_heartrate: 170,
    }));

    const mockIn = vi.fn().mockReturnThis();
    const mockEq = vi.fn().mockReturnThis();
    const mockSelect = vi.fn().mockReturnValue({
        in: mockIn,
        eq: mockEq,
        then: (resolve: any) => resolve({ data: mockActivities, error: null })
    });

    const mockInsert = vi.fn().mockResolvedValue({ error: null });
    const mockUpsert = vi.fn().mockResolvedValue({ error: null });

    mockFrom.mockImplementation((table: string) => {
        if (table === 'strava_activities') {
            return {
                select: mockSelect,
                upsert: mockUpsert,
                in: mockIn,
                eq: mockEq,
            } as any;
        }
        if (table === 'session_logs') {
            return {
                insert: mockInsert,
            } as any;
        }
        return {} as any;
    });

    const result = await stravaService.importToHistory(userId, activityIds);

    expect(result.success).toBe(3);

    // In the optimized implementation:
    // 1. select from strava_activities (batch)
    // 2. insert into session_logs (batch)
    // 3. upsert into strava_activities (batch)
    // Total: 3 calls to supabase.from()

    expect(mockFrom.mock.calls.length).toBe(3);
    expect(mockSelect).toHaveBeenCalled();
    expect(mockIn).toHaveBeenCalledWith('id', activityIds);
    expect(mockInsert).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ user_id: userId })
    ]));
    expect(mockUpsert).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ is_imported_to_history: true })
    ]));
    expect(syncUserBadgesProgress).toHaveBeenCalledTimes(1);
  });
});
