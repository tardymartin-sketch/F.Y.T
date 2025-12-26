// ============================================================
// ULTIPREPA - STRAVA TYPES
// src/types/strava.ts
// ============================================================

// ============================================================
// Types OAuth & Connexion
// ============================================================

export interface StravaTokenResponse {
  token_type: 'Bearer';
  expires_at: number;
  expires_in: number;
  refresh_token: string;
  access_token: string;
  athlete: StravaAthlete;
}

export interface StravaAthlete {
  id: number;
  username: string | null;
  resource_state: number;
  firstname: string;
  lastname: string;
  city: string | null;
  state: string | null;
  country: string | null;
  sex: 'M' | 'F' | null;
  premium: boolean;
  summit: boolean;
  created_at: string;
  updated_at: string;
  profile_medium: string;
  profile: string;
}

export interface StravaConnection {
  id: string;
  user_id: string;
  strava_athlete_id: number;
  strava_username: string | null;
  strava_firstname: string | null;
  strava_lastname: string | null;
  strava_profile_pic: string | null;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  scopes: string[];
  connected_at: string;
  last_sync_at: string | null;
  is_active: boolean;
}

// ============================================================
// Types Activités Strava
// ============================================================

export interface StravaActivity {
  id: number;
  resource_state: number;
  external_id: string | null;
  upload_id: number | null;
  athlete: { id: number; resource_state: number };
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  type: string;
  sport_type: StravaSportType;
  start_date: string;
  start_date_local: string;
  timezone: string;
  utc_offset: number;
  start_latlng: [number, number] | null;
  end_latlng: [number, number] | null;
  achievement_count: number;
  kudos_count: number;
  comment_count: number;
  athlete_count: number;
  photo_count: number;
  map: StravaMap;
  trainer: boolean;
  commute: boolean;
  manual: boolean;
  private: boolean;
  visibility: 'everyone' | 'followers_only' | 'only_me';
  flagged: boolean;
  gear_id: string | null;
  from_accepted_tag: boolean | null;
  average_speed: number;
  max_speed: number;
  has_heartrate: boolean;
  average_heartrate?: number;
  max_heartrate?: number;
  heartrate_opt_out: boolean;
  display_hide_heartrate_option: boolean;
  elev_high?: number;
  elev_low?: number;
  pr_count: number;
  total_photo_count: number;
  has_kudoed: boolean;
  workout_type?: number;
  suffer_score?: number;
  description?: string;
  calories?: number;
  device_name?: string;
  embed_token?: string;
  average_cadence?: number;
  average_watts?: number;
  max_watts?: number;
  weighted_average_watts?: number;
  kilojoules?: number;
  device_watts?: boolean;
  average_temp?: number;
}

export type StravaSportType = 
  | 'AlpineSki' | 'BackcountrySki' | 'Canoeing' | 'Crossfit' 
  | 'EBikeRide' | 'Elliptical' | 'Golf' | 'GravelRide' 
  | 'Handcycle' | 'Hike' | 'IceSkate' | 'InlineSkate' 
  | 'Kayaking' | 'Kitesurf' | 'MountainBikeRide' | 'NordicSki' 
  | 'Ride' | 'RockClimbing' | 'RollerSki' | 'Rowing' 
  | 'Run' | 'Sail' | 'Skateboard' | 'Snowboard' 
  | 'Snowshoe' | 'Soccer' | 'StairStepper' | 'StandUpPaddling' 
  | 'Surfing' | 'Swim' | 'TrailRun' | 'Velomobile' 
  | 'VirtualRide' | 'VirtualRun' | 'Walk' | 'WeightTraining' 
  | 'Wheelchair' | 'Windsurf' | 'Workout' | 'Yoga';

export interface StravaMap {
  id: string;
  polyline?: string;
  resource_state: number;
  summary_polyline?: string;
}

// ============================================================
// Types Streams (données détaillées)
// ============================================================

export interface StravaStream<T = number> {
  type: string;
  data: T[];
  series_type: 'time' | 'distance';
  original_size: number;
  resolution: 'low' | 'medium' | 'high';
}

export interface StravaStreams {
  time?: StravaStream<number>;
  distance?: StravaStream<number>;
  latlng?: StravaStream<[number, number]>;
  altitude?: StravaStream<number>;
  velocity_smooth?: StravaStream<number>;
  heartrate?: StravaStream<number>;
  cadence?: StravaStream<number>;
  watts?: StravaStream<number>;
  temp?: StravaStream<number>;
  moving?: StravaStream<boolean>;
  grade_smooth?: StravaStream<number>;
}

// ============================================================
// Types pour la base de données locale
// ============================================================

export interface StravaActivityDB {
  id: string;
  user_id: string;
  strava_activity_id: number;
  name: string;
  sport_type: string;
  activity_type: string | null;
  description: string | null;
  start_date: string;
  start_date_local: string | null;
  timezone: string | null;
  elapsed_time: number;
  moving_time: number;
  distance: number | null;
  total_elevation_gain: number | null;
  average_speed: number | null;
  max_speed: number | null;
  has_heartrate: boolean;
  average_heartrate: number | null;
  max_heartrate: number | null;
  average_cadence: number | null;
  average_watts: number | null;
  max_watts: number | null;
  weighted_average_watts: number | null;
  kilojoules: number | null;
  calories: number | null;
  start_latlng: number[] | null;
  end_latlng: number[] | null;
  summary_polyline: string | null;
  device_name: string | null;
  gear_id: string | null;
  streams_data: StravaStreams | null;
  segment_efforts: StravaSegmentEffort[] | null;
  is_imported_to_history: boolean;
  imported_at: string | null;
  session_log_id: string | null;
  synced_at: string;
  raw_data: StravaActivity | null;
}

// Type pour les segments Strava
export interface StravaSegmentEffort {
  id: number;
  name: string;
  elapsed_time: number;
  moving_time: number;
  start_index: number;
  end_index: number;
  distance: number;
  average_heartrate?: number;
  max_heartrate?: number;
  segment: {
    id: number;
    name: string;
    distance: number;
    average_grade: number;
    maximum_grade: number;
    elevation_high: number;
    elevation_low: number;
    climb_category: number;
  };
  pr_rank?: number | null;
  achievements?: { type_id: number; type: string; rank: number }[];
}

// ============================================================
// Types pour l'UI
// ============================================================

export interface StravaActivityCard {
  id: string;
  stravaId: number;
  name: string;
  sportType: StravaSportType;
  sportIcon: string;
  sportColor: string;
  date: Date;
  dateFormatted: string;
  duration: string;
  distance: string | null;
  pace: string | null;
  speed: string | null;
  elevation: string | null;
  hasHeartrate: boolean;
  avgHeartrate: number | null;
  maxHeartrate: number | null;
  hasMap: boolean;
  polyline: string | null;
  isImported: boolean;
  isSelected: boolean;
}

// ============================================================
// Config des sports
// ============================================================

export const SPORT_TYPE_CONFIG: Record<string, {
  icon: string;
  label: string;
  color: string;
  showDistance: boolean;
  showPace: boolean;
  showSpeed: boolean;
}> = {
  Run: { icon: '🏃', label: 'Course', color: '#FC4C02', showDistance: true, showPace: true, showSpeed: false },
  TrailRun: { icon: '🏔️', label: 'Trail', color: '#2D5016', showDistance: true, showPace: true, showSpeed: false },
  Walk: { icon: '🚶', label: 'Marche', color: '#8B4513', showDistance: true, showPace: true, showSpeed: false },
  Hike: { icon: '🥾', label: 'Randonnée', color: '#228B22', showDistance: true, showPace: false, showSpeed: false },
  Ride: { icon: '🚴', label: 'Vélo', color: '#1E90FF', showDistance: true, showPace: false, showSpeed: true },
  MountainBikeRide: { icon: '🚵', label: 'VTT', color: '#8B4513', showDistance: true, showPace: false, showSpeed: true },
  GravelRide: { icon: '🚴', label: 'Gravel', color: '#A0522D', showDistance: true, showPace: false, showSpeed: true },
  EBikeRide: { icon: '🔋', label: 'VAE', color: '#32CD32', showDistance: true, showPace: false, showSpeed: true },
  VirtualRide: { icon: '🖥️', label: 'Vélo virtuel', color: '#9370DB', showDistance: true, showPace: false, showSpeed: true },
  VirtualRun: { icon: '🖥️', label: 'Course virtuelle', color: '#9370DB', showDistance: true, showPace: true, showSpeed: false },
  Swim: { icon: '🏊', label: 'Natation', color: '#00CED1', showDistance: true, showPace: true, showSpeed: false },
  Rowing: { icon: '🚣', label: 'Aviron', color: '#4682B4', showDistance: true, showPace: false, showSpeed: true },
  Kayaking: { icon: '🛶', label: 'Kayak', color: '#20B2AA', showDistance: true, showPace: false, showSpeed: true },
  StandUpPaddling: { icon: '🏄', label: 'Paddle', color: '#48D1CC', showDistance: true, showPace: false, showSpeed: true },
  Surfing: { icon: '🏄', label: 'Surf', color: '#00BFFF', showDistance: false, showPace: false, showSpeed: false },
  Kitesurf: { icon: '🪁', label: 'Kitesurf', color: '#FF6347', showDistance: true, showPace: false, showSpeed: true },
  Windsurf: { icon: '🏄', label: 'Windsurf', color: '#FF4500', showDistance: true, showPace: false, showSpeed: true },
  Canoeing: { icon: '🛶', label: 'Canoë', color: '#2E8B57', showDistance: true, showPace: false, showSpeed: true },
  AlpineSki: { icon: '⛷️', label: 'Ski alpin', color: '#87CEEB', showDistance: true, showPace: false, showSpeed: true },
  BackcountrySki: { icon: '🎿', label: 'Ski de rando', color: '#4169E1', showDistance: true, showPace: false, showSpeed: true },
  NordicSki: { icon: '🎿', label: 'Ski de fond', color: '#6495ED', showDistance: true, showPace: true, showSpeed: false },
  Snowboard: { icon: '🏂', label: 'Snowboard', color: '#708090', showDistance: true, showPace: false, showSpeed: true },
  Snowshoe: { icon: '❄️', label: 'Raquettes', color: '#B0C4DE', showDistance: true, showPace: true, showSpeed: false },
  IceSkate: { icon: '⛸️', label: 'Patinage', color: '#ADD8E6', showDistance: true, showPace: false, showSpeed: true },
  InlineSkate: { icon: '🛼', label: 'Roller', color: '#FF69B4', showDistance: true, showPace: false, showSpeed: true },
  Skateboard: { icon: '🛹', label: 'Skate', color: '#FFD700', showDistance: true, showPace: false, showSpeed: true },
  RockClimbing: { icon: '🧗', label: 'Escalade', color: '#CD853F', showDistance: false, showPace: false, showSpeed: false },
  WeightTraining: { icon: '🏋️', label: 'Musculation', color: '#DC143C', showDistance: false, showPace: false, showSpeed: false },
  Crossfit: { icon: '💪', label: 'CrossFit', color: '#FF0000', showDistance: false, showPace: false, showSpeed: false },
  Yoga: { icon: '🧘', label: 'Yoga', color: '#9932CC', showDistance: false, showPace: false, showSpeed: false },
  Workout: { icon: '🏋️', label: 'Entraînement', color: '#FF6B6B', showDistance: false, showPace: false, showSpeed: false },
  Elliptical: { icon: '🏃', label: 'Elliptique', color: '#FFA07A', showDistance: true, showPace: false, showSpeed: false },
  StairStepper: { icon: '🪜', label: 'Stepper', color: '#DDA0DD', showDistance: false, showPace: false, showSpeed: false },
  Soccer: { icon: '⚽', label: 'Football', color: '#228B22', showDistance: true, showPace: false, showSpeed: false },
  Golf: { icon: '⛳', label: 'Golf', color: '#006400', showDistance: true, showPace: false, showSpeed: false },
  Handcycle: { icon: '🚴', label: 'Handbike', color: '#4682B4', showDistance: true, showPace: false, showSpeed: true },
  Velomobile: { icon: '🚴', label: 'Vélomobile', color: '#5F9EA0', showDistance: true, showPace: false, showSpeed: true },
  Wheelchair: { icon: '🦽', label: 'Fauteuil', color: '#778899', showDistance: true, showPace: false, showSpeed: true },
  RollerSki: { icon: '🎿', label: 'Ski-roues', color: '#DAA520', showDistance: true, showPace: true, showSpeed: false },
  Sail: { icon: '⛵', label: 'Voile', color: '#1E90FF', showDistance: true, showPace: false, showSpeed: true },
};

export const DEFAULT_SPORT_CONFIG = {
  icon: '🏅',
  label: 'Activité',
  color: '#808080',
  showDistance: true,
  showPace: false,
  showSpeed: false,
};
