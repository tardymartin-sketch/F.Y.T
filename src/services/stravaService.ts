// ============================================================
// F.Y.T - STRAVA SERVICE
// src/services/stravaService.ts
// ============================================================

import { supabase } from '../supabaseClient';
import type {
  StravaTokenResponse,
  StravaActivity,
  StravaStreams,
  StravaConnection,
  StravaActivityDB,
  StravaSportType,
  StravaActivityCard,
} from '../types/strava';
import { SPORT_TYPE_CONFIG, DEFAULT_SPORT_CONFIG } from '../types/strava';

// ============================================================
// Configuration
// ============================================================

const STRAVA_CLIENT_ID = import.meta.env.VITE_STRAVA_CLIENT_ID;
const STRAVA_CLIENT_SECRET = import.meta.env.VITE_STRAVA_CLIENT_SECRET;
const STRAVA_REDIRECT_URI = import.meta.env.VITE_STRAVA_REDIRECT_URI || `${window.location.origin}/auth/strava/callback`;

const STRAVA_API_BASE = 'https://www.strava.com/api/v3';
const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';

// Durée de l'historique à importer (6 mois)
const HISTORY_DAYS = 180;

// ============================================================
// Helpers
// ============================================================

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}min`;
  }
  if (minutes > 0) {
    return `${minutes}min ${secs.toString().padStart(2, '0')}s`;
  }
  return `${secs}s`;
};

export const formatDistance = (meters: number | null): string | null => {
  if (meters === null || meters === undefined) return null;
  const km = meters / 1000;
  return km >= 10 ? `${km.toFixed(1)} km` : `${km.toFixed(2)} km`;
};

export const formatPace = (meters: number | null, seconds: number): string | null => {
  if (!meters || meters === 0) return null;
  const paceSeconds = seconds / (meters / 1000);
  const paceMin = Math.floor(paceSeconds / 60);
  const paceSec = Math.round(paceSeconds % 60);
  return `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
};

export const formatSpeed = (meters: number | null, seconds: number): string | null => {
  if (!meters || seconds === 0) return null;
  const speedKmh = (meters / 1000) / (seconds / 3600);
  return `${speedKmh.toFixed(1)} km/h`;
};

export const formatElevation = (meters: number | null): string | null => {
  if (meters === null || meters === undefined) return null;
  return `+${Math.round(meters)} m`;
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// ============================================================
// Service Strava
// ============================================================

class StravaService {
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  // --------------------------------------------------------
  // OAuth Flow
  // --------------------------------------------------------

  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: STRAVA_CLIENT_ID,
      redirect_uri: STRAVA_REDIRECT_URI,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'activity:read_all,profile:read_all',
      ...(state && { state }),
    });
    
    return `${STRAVA_AUTH_URL}?${params.toString()}`;
  }

  async exchangeCodeForTokens(code: string): Promise<StravaTokenResponse> {
    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to exchange code for tokens');
    }

    return response.json();
  }

  async refreshAccessToken(refreshToken: string): Promise<StravaTokenResponse> {
    const response = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: STRAVA_CLIENT_ID,
        client_secret: STRAVA_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to refresh token');
    }

    return response.json();
  }

  // --------------------------------------------------------
  // Connexion Management
  // --------------------------------------------------------

  async saveConnection(userId: string, tokenResponse: StravaTokenResponse): Promise<StravaConnection> {
    const { athlete, access_token, refresh_token, expires_at } = tokenResponse;
    
    const connectionData = {
      user_id: userId,
      strava_athlete_id: athlete.id,
      strava_username: athlete.username,
      strava_firstname: athlete.firstname,
      strava_lastname: athlete.lastname,
      strava_profile_pic: athlete.profile,
      access_token,
      refresh_token,
      token_expires_at: new Date(expires_at * 1000).toISOString(),
      scopes: ['activity:read_all', 'profile:read_all'],
      is_active: true,
    };

    const { data, error } = await supabase
      .from('strava_connections')
      .upsert(connectionData, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getConnection(userId: string): Promise<StravaConnection | null> {
    const { data, error } = await supabase
      .from('strava_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  async disconnect(userId: string): Promise<void> {
    const { error } = await supabase
      .from('strava_connections')
      .update({ is_active: false })
      .eq('user_id', userId);

    if (error) throw error;
    this.accessToken = null;
    this.tokenExpiresAt = 0;
  }

  async ensureValidToken(userId: string): Promise<string> {
    const connection = await this.getConnection(userId);
    if (!connection) throw new Error('No Strava connection found');

    const expiresAt = new Date(connection.token_expires_at).getTime();
    const now = Date.now();

    if (expiresAt - now < 5 * 60 * 1000) {
      const newTokens = await this.refreshAccessToken(connection.refresh_token);
      
      await supabase
        .from('strava_connections')
        .update({
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          token_expires_at: new Date(newTokens.expires_at * 1000).toISOString(),
        })
        .eq('user_id', userId);

      this.accessToken = newTokens.access_token;
      this.tokenExpiresAt = newTokens.expires_at * 1000;
      return newTokens.access_token;
    }

    this.accessToken = connection.access_token;
    this.tokenExpiresAt = expiresAt;
    return connection.access_token;
  }

  // --------------------------------------------------------
  // Activities API
  // --------------------------------------------------------

  async fetchActivitiesFromStrava(
    accessToken: string,
    options: {
      after?: number;
      before?: number;
      page?: number;
      perPage?: number;
    } = {}
  ): Promise<StravaActivity[]> {
    const { after, before, page = 1, perPage = 200 } = options;
    
    const params = new URLSearchParams({
      page: page.toString(),
      per_page: perPage.toString(),
      ...(after && { after: after.toString() }),
      ...(before && { before: before.toString() }),
    });

    const response = await fetch(
      `${STRAVA_API_BASE}/athlete/activities?${params.toString()}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error('Rate limit exceeded. Please wait a moment.');
      }
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch activities');
    }

    return response.json();
  }

  async fetchActivityStreams(
    accessToken: string,
    activityId: number
  ): Promise<StravaStreams> {
    const streamTypes = [
      'time', 'distance', 'latlng', 'altitude',
      'velocity_smooth', 'heartrate', 'cadence',
      'watts', 'temp', 'moving', 'grade_smooth'
    ].join(',');

    const response = await fetch(
      `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=${streamTypes}&key_by_type=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.warn(`Failed to fetch streams for activity ${activityId}`);
      return {};
    }

    return response.json();
  }

  async fetchActivityDetails(
    accessToken: string,
    activityId: number
  ): Promise<StravaActivity> {
    const response = await fetch(
      `${STRAVA_API_BASE}/activities/${activityId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to fetch activity details');
    }

    return response.json();
  }

  // --------------------------------------------------------
  // Sync & Storage
  // --------------------------------------------------------

  async syncInitialActivities(userId: string, withStreams: boolean = true): Promise<number> {
    const accessToken = await this.ensureValidToken(userId);
    
    const sixMonthsAgo = Math.floor(
      (Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000) / 1000
    );

    let allActivities: StravaActivity[] = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const activities = await this.fetchActivitiesFromStrava(accessToken, {
        after: sixMonthsAgo,
        page,
        perPage: 200,
      });

      if (activities.length === 0) {
        hasMore = false;
      } else {
        allActivities = [...allActivities, ...activities];
        page++;
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    // Sauvegarder les activités avec streams si demandé
    for (const activity of allActivities) {
      let streams = null;
      let segments = null;
      
      if (withStreams) {
        try {
          streams = await this.fetchActivityStreams(accessToken, activity.id);
          await new Promise(resolve => setTimeout(resolve, 50));
          
          const fullActivity = await this.fetchActivityDetails(accessToken, activity.id);
          segments = (fullActivity as any).segment_efforts || [];
          await new Promise(resolve => setTimeout(resolve, 50));
        } catch (err) {
          console.warn(`Could not fetch streams/segments for activity ${activity.id}:`, err);
        }
      }
      
      await this.saveActivity(userId, activity, streams, segments);
    }

    await supabase
      .from('strava_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId);

    return allActivities.length;
  }

  async syncSingleActivity(userId: string, activityId: number): Promise<StravaActivityDB | null> {
    try {
      const accessToken = await this.ensureValidToken(userId);
      
      const activity = await this.fetchActivityDetails(accessToken, activityId);
      const streams = await this.fetchActivityStreams(accessToken, activityId);
      const segments = (activity as any).segment_efforts || [];
      
      return await this.saveActivity(userId, activity, streams, segments);
    } catch (error) {
      console.error('Failed to sync single activity:', error);
      return null;
    }
  }

  async saveActivity(
    userId: string,
    activity: StravaActivity,
    streams?: StravaStreams | null,
    segments?: any[] | null
  ): Promise<StravaActivityDB> {
    const activityData: Partial<StravaActivityDB> & { segment_efforts?: any } = {
      user_id: userId,
      strava_activity_id: activity.id,
      name: activity.name,
      sport_type: activity.sport_type,
      distance: activity.distance,
      moving_time: activity.moving_time,
      elapsed_time: activity.elapsed_time,
      total_elevation_gain: activity.total_elevation_gain,
      start_date: activity.start_date,
      start_date_local: activity.start_date_local,
      timezone: activity.timezone,
      start_latlng: activity.start_latlng,
      end_latlng: activity.end_latlng,
      average_speed: activity.average_speed,
      max_speed: activity.max_speed,
      has_heartrate: activity.has_heartrate,
      average_heartrate: activity.average_heartrate,
      max_heartrate: activity.max_heartrate,
      summary_polyline: activity.map?.summary_polyline || null,
      streams_data: streams || null,
      segment_efforts: segments || null,
    };

    const { data, error } = await supabase
      .from('strava_activities')
      .upsert(activityData, {
        onConflict: 'user_id,strava_activity_id',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // --------------------------------------------------------
  // Get Activities from DB
  // --------------------------------------------------------

  async getActivities(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
      sportType?: StravaSportType;
      imported?: boolean;
    } = {}
  ): Promise<StravaActivityDB[]> {
    let query = supabase
      .from('strava_activities')
      .select('*')
      .eq('user_id', userId)
      .order('start_date', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }
    if (options.sportType) {
      query = query.eq('sport_type', options.sportType);
    }
    if (options.imported !== undefined) {
      query = query.eq('is_imported_to_history', options.imported);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  async getActivityBySessionLogId(sessionLogId: string): Promise<StravaActivityDB | null> {
    const { data, error } = await supabase
      .from('strava_activities')
      .select('*')
      .eq('session_log_id', sessionLogId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  activityToCard(activity: StravaActivityDB): StravaActivityCard {
    const sportConfig = SPORT_TYPE_CONFIG[activity.sport_type] || DEFAULT_SPORT_CONFIG;
    
    return {
      id: activity.id,
      stravaId: activity.strava_activity_id,
      name: activity.name,
      sportType: activity.sport_type as StravaSportType,
      sportIcon: sportConfig.icon,
      sportColor: sportConfig.color,
      date: new Date(activity.start_date),
      dateFormatted: formatDate(activity.start_date_local || activity.start_date),
      duration: formatDuration(activity.moving_time),
      distance: formatDistance(activity.distance),
      pace: sportConfig.showPace ? formatPace(activity.distance, activity.moving_time) : null,
      speed: sportConfig.showSpeed ? formatSpeed(activity.distance, activity.moving_time) : null,
      elevation: formatElevation(activity.total_elevation_gain),
      hasHeartrate: activity.has_heartrate,
      avgHeartrate: activity.average_heartrate,
      maxHeartrate: activity.max_heartrate,
      hasMap: !!activity.summary_polyline,
      polyline: activity.summary_polyline,
      isImported: activity.is_imported_to_history,
      isSelected: false,
    };
  }

  // --------------------------------------------------------
  // Import vers l'historique
  // --------------------------------------------------------

  async importToHistory(
    userId: string,
    activityIds: string[]
  ): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const activityId of activityIds) {
      try {
        const { data: activity, error: fetchError } = await supabase
          .from('strava_activities')
          .select('*')
          .eq('id', activityId)
          .eq('user_id', userId)
          .single();

        if (fetchError || !activity) {
          console.error('Failed to fetch activity:', fetchError);
          failed++;
          continue;
        }

        // Construire les notes détaillées
        const detailsNotes = [
          activity.sport_type,
          activity.distance ? formatDistance(activity.distance) : null,
          activity.total_elevation_gain ? formatElevation(activity.total_elevation_gain) : null,
          activity.average_heartrate ? `FC moy: ${Math.round(activity.average_heartrate)} bpm` : null,
          activity.max_heartrate ? `FC max: ${activity.max_heartrate} bpm` : null,
        ].filter(Boolean).join(' • ');

        // Créer une entrée dans session_logs avec la structure exacte attendue
        const sessionLogData = {
          id: crypto.randomUUID(),
          user_id: userId,
          date: activity.start_date_local?.split('T')[0] || activity.start_date.split('T')[0],
          duration_minutes: Math.round(activity.moving_time / 60),
          session_key_year: new Date(activity.start_date).getFullYear(),
          session_key_week: this.getWeekNumber(new Date(activity.start_date)),
          session_key_name: `Strava: ${activity.sport_type}`,
          exercises: [
            {
              exerciseName: activity.name,
              originalSession: `Strava - ${activity.sport_type}`,
              sets: [
                {
                  setNumber: 1,
                  reps: activity.distance ? `${(activity.distance / 1000).toFixed(2)} km` : formatDuration(activity.moving_time),
                  weight: '',
                  completed: true,
                }
              ],
              notes: detailsNotes,
            }
          ],
          comments: `🔸 Importé depuis Strava le ${new Date().toLocaleDateString('fr-FR')}\n📊 ${detailsNotes}`,
        };

        const { data: newLog, error: insertError } = await supabase
          .from('session_logs')
          .insert(sessionLogData)
          .select()
          .single();

        if (insertError) {
          console.error('Failed to create session log:', insertError);
          console.error('Data attempted:', sessionLogData);
          failed++;
          continue;
        }

        // Marquer l'activité Strava comme importée
        const { error: updateError } = await supabase
          .from('strava_activities')
          .update({
            is_imported_to_history: true,
            imported_at: new Date().toISOString(),
            session_log_id: newLog.id,
          })
          .eq('id', activityId);

        if (updateError) {
          console.error('Failed to update strava activity:', updateError);
        }

        success++;
      } catch (error) {
        console.error(`Failed to import activity ${activityId}:`, error);
        failed++;
      }
    }

    return { success, failed };
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // --------------------------------------------------------
  // Webhook Processing
  // --------------------------------------------------------

  async processWebhookEvent(event: {
    aspect_type: string;
    object_id: number;
    object_type: string;
    owner_id: number;
  }): Promise<void> {
    const { data: connection, error } = await supabase
      .from('strava_connections')
      .select('user_id, access_token, refresh_token, token_expires_at')
      .eq('strava_athlete_id', event.owner_id)
      .eq('is_active', true)
      .single();

    if (error || !connection) {
      console.log('No active connection for athlete:', event.owner_id);
      return;
    }

    const accessToken = await this.ensureValidToken(connection.user_id);

    switch (event.aspect_type) {
      case 'create':
        if (event.object_type === 'activity') {
          const activity = await this.fetchActivityDetails(accessToken, event.object_id);
          await this.saveActivity(connection.user_id, activity);
        }
        break;

      case 'update':
        if (event.object_type === 'activity') {
          const activity = await this.fetchActivityDetails(accessToken, event.object_id);
          await this.saveActivity(connection.user_id, activity);
        }
        break;

      case 'delete':
        if (event.object_type === 'activity') {
          await supabase
            .from('strava_activities')
            .delete()
            .eq('strava_activity_id', event.object_id)
            .eq('user_id', connection.user_id);
        }
        break;
    }
  }
}

export const stravaService = new StravaService();
export default stravaService;
